require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { Pool } = require("pg");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    })
  : null;

app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || !FRONTEND_ORIGIN || origin === FRONTEND_ORIGIN) return callback(null, true);
    return callback(new Error("Origin not allowed by BKG CORS policy"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "20kb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false }));

const products = [
  { id: "phones", name: "Smartphones", category: "Mobile", description: "Smartphones for everyday life, work and play", enquiryOnly: true },
  { id: "laptops", name: "Laptops", category: "Computing", description: "Devices for work, school and business", enquiryOnly: true },
  { id: "audio", name: "Speakers & Audio", category: "Audio", description: "Speakers and audio accessories", enquiryOnly: true },
  { id: "accessories", name: "Gadget Accessories", category: "Accessories", description: "Chargers, cables, earphones and more", enquiryOnly: true }
];

function apiError(res, status, message) {
  return res.status(status).json({ success: false, message });
}
function requireDatabase(res) {
  if (!pool) {
    apiError(res, 503, "Backend setup is incomplete. Configure DATABASE_URL and run db/schema.sql.");
    return false;
  }
  return true;
}
function getMailer() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}
function createToken(user) {
  if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error("JWT_SECRET must be configured with at least 32 characters.");
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "2h", issuer: "bkg-api", audience: "bkg-web" });
}
function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return apiError(res, 401, "Please sign in to continue.");
  try {
    req.user = jwt.verify(token, JWT_SECRET, { issuer: "bkg-api", audience: "bkg-web" });
    return next();
  } catch (_) {
    return apiError(res, 401, "Your session is invalid or expired. Please sign in again.");
  }
}
function validEmail(value) {
  return typeof value === "string" && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

app.get("/api/health", async (_req, res) => {
  let database = "not_configured";
  if (pool) {
    try { await pool.query("SELECT 1"); database = "connected"; }
    catch (_) { database = "unavailable"; }
  }
  res.status(200).json({
    success: true,
    business: "BIGG KAYY GLOBAL",
    status: "online",
    database,
    emailVerificationConfigured: Boolean(getMailer()),
    paymentsConfigured: Boolean(process.env.PAYMENT_PROVIDER && process.env.PAYMENT_SECRET_KEY),
    virtualNumberProviderConfigured: Boolean(process.env.VIRTUAL_NUMBER_PROVIDER && process.env.VIRTUAL_NUMBER_API_KEY)
  });
});

app.get("/api/products", (_req, res) => res.json({ success: true, products }));

app.post("/api/auth/register", async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim().slice(0, 100) : "";
    if (!fullName) return apiError(res, 400, "Enter your full name.");
    if (!validEmail(email)) return apiError(res, 400, "Enter a valid email address.");
    if (typeof password !== "string" || password.length < 10 || password.length > 128) {
      return apiError(res, 400, "Password must be between 10 and 128 characters.");
    }
    if (!getMailer()) return apiError(res, 503, "Email verification is not configured yet. Contact the site administrator.");
    const existing = await pool.query("SELECT id FROM customers WHERE email = $1", [email]);
    if (existing.rowCount) return apiError(res, 409, "An account already exists for this email. Try signing in or contact support.");
    const passwordHash = await bcrypt.hash(password, 12);
    const inserted = await pool.query(
      "INSERT INTO customers (full_name, email, password_hash, email_verified) VALUES ($1, $2, $3, FALSE) RETURNING id, full_name, email",
      [fullName, email, passwordHash]
    );
    const customer = inserted.rows[0];
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    try {
      await getMailer().sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: "Your BKG email verification code",
        text: "Your BKG verification code is " + code + ". It expires in 10 minutes. If you did not request this, you can ignore this email.",
        html: "<p>Your BKG verification code is:</p><p style=\"font-size:28px;font-weight:bold;letter-spacing:8px\">" + code + "</p><p>This code expires in 10 minutes. If you did not request this, ignore this email.</p>"
      });
      await pool.query(
        "INSERT INTO email_verification_codes (customer_id, code_hash, expires_at) VALUES ($1, $2, $3)",
        [customer.id, codeHash, expiresAt]
      );
    } catch (emailError) {
      req.logError = emailError;
      return apiError(res, 503, "Your account was created but the verification email could not be sent. Ask the administrator to configure email and request a new code.");
    }
    return res.status(201).json({ success: true, message: "Account created. Check your email for a verification code that expires in 10 minutes.", email: customer.email });
  } catch (error) {
    if (error.code === "23505") return apiError(res, 409, "An account already exists for this email.");
    return next(error);
  }
});

app.post("/api/auth/verify-email", async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    if (!validEmail(email) || !/^\d{6}$/.test(code)) return apiError(res, 400, "Enter your email and the six-digit verification code.");
    const result = await pool.query(
      "SELECT c.id, c.email, c.full_name, v.id AS verification_id, v.code_hash FROM customers c JOIN email_verification_codes v ON v.customer_id = c.id WHERE c.email = $1 AND c.email_verified = FALSE AND v.consumed_at IS NULL AND v.expires_at > NOW() ORDER BY v.created_at DESC LIMIT 1",
      [email]
    );
    if (!result.rowCount) return apiError(res, 400, "That code is invalid or expired. Request a new verification code.");
    const row = result.rows[0];
    if (!(await bcrypt.compare(code, row.code_hash))) return apiError(res, 400, "That code is invalid or expired. Request a new verification code.");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE customers SET email_verified = TRUE, updated_at = NOW() WHERE id = $1", [row.id]);
      await client.query("UPDATE email_verification_codes SET consumed_at = NOW() WHERE customer_id = $1 AND consumed_at IS NULL", [row.id]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    const token = createToken({ id: row.id, email: row.email });
    return res.json({ success: true, message: "Email verified. You are now signed in.", token, customer: { id: row.id, fullName: row.full_name, email: row.email } });
  } catch (error) { return next(error); }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;
    if (!validEmail(email) || typeof password !== "string" || password.length > 128) return apiError(res, 400, "Enter a valid email and password.");
    const result = await pool.query("SELECT id, full_name, email, password_hash, email_verified FROM customers WHERE email = $1", [email]);
    if (!result.rowCount || !(await bcrypt.compare(password, result.rows[0].password_hash))) return apiError(res, 401, "Email or password is incorrect.");
    const customer = result.rows[0];
    if (!customer.email_verified) return apiError(res, 403, "Verify your email before signing in.");
    const token = createToken(customer);
    return res.json({ success: true, token, customer: { id: customer.id, fullName: customer.full_name, email: customer.email } });
  } catch (error) { return next(error); }
});

app.get("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const result = await pool.query("SELECT id, full_name, email, email_verified, created_at FROM customers WHERE id = $1", [req.user.sub]);
    if (!result.rowCount) return apiError(res, 404, "Customer account not found.");
    const c = result.rows[0];
    return res.json({ success: true, customer: { id: c.id, fullName: c.full_name, email: c.email, emailVerified: c.email_verified, createdAt: c.created_at } });
  } catch (error) { return next(error); }
});

app.post("/api/orders/enquiry", requireAuth, async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const items = req.body.items;
    const note = typeof req.body.note === "string" ? req.body.note.trim().slice(0, 1000) : "";
    if (!Array.isArray(items) || items.length < 1 || items.length > 30) return apiError(res, 400, "Include between 1 and 30 enquiry items.");
    const safeItems = items.map((item) => ({
      name: typeof item.name === "string" ? item.name.trim().slice(0, 120) : "",
      quantity: Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 100 ? item.quantity : 1
    }));
    if (safeItems.some((item) => !item.name)) return apiError(res, 400, "Each item must have a name.");
    const result = await pool.query(
      "INSERT INTO order_enquiries (customer_id, items, note, status) VALUES ($1, $2::jsonb, $3, 'pending') RETURNING id, status, created_at",
      [req.user.sub, JSON.stringify(safeItems), note]
    );
    return res.status(201).json({ success: true, message: "Your enquiry was saved. It is not a paid order.", enquiry: result.rows[0] });
  } catch (error) { return next(error); }
});

async function requireAdmin(req, res, next) {
  try {
    if (!requireDatabase(res)) return;
    const result = await pool.query("SELECT role FROM customers WHERE id = $1", [req.user.sub]);
    if (!result.rowCount || result.rows[0].role !== "admin") return apiError(res, 403, "Administrator access is required.");
    return next();
  } catch (error) { return next(error); }
}

app.get("/api/admin/enquiries", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const result = await pool.query(
      "SELECT e.id, e.items, e.note, e.status, e.created_at, c.full_name, c.email FROM order_enquiries e JOIN customers c ON c.id = e.customer_id ORDER BY e.created_at DESC LIMIT 100"
    );
    return res.json({ success: true, enquiries: result.rows });
  } catch (error) { return next(error); }
});

app.post("/api/admin/enquiries/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const allowed = new Set(["pending", "contacted", "closed", "cancelled"]);
    const status = req.body.status;
    if (!allowed.has(status)) return apiError(res, 400, "Choose a valid enquiry status.");
    const result = await pool.query(
      "UPDATE order_enquiries SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status, updated_at",
      [status, req.params.id]
    );
    if (!result.rowCount) return apiError(res, 404, "Enquiry not found.");
    return res.json({ success: true, enquiry: result.rows[0] });
  } catch (error) { return next(error); }
});


async function ensureProductSubscriptionsTable() {
  await pool.query("CREATE TABLE IF NOT EXISTS product_subscriptions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT, product_name VARCHAR(120) NOT NULL, period VARCHAR(10) NOT NULL CHECK (period IN ('monthly','yearly')), payment_method VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (payment_method = 'manual'), note VARCHAR(1000) NOT NULL DEFAULT '', status VARCHAR(30) NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation','payment_instructions_sent','active','cancelled')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await pool.query("CREATE INDEX IF NOT EXISTS product_subscriptions_customer_created_idx ON product_subscriptions(customer_id, created_at DESC)");
}

app.post("/api/subscriptions/request", requireAuth, async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const productName = typeof req.body.productName === "string" ? req.body.productName.trim().slice(0, 120) : "";
    const period = req.body.period;
    const note = typeof req.body.note === "string" ? req.body.note.trim().slice(0, 1000) : "";
    if (!productName) return apiError(res, 400, "Choose a product for your subscription request.");
    if (!["monthly", "yearly"].includes(period)) return apiError(res, 400, "Choose a monthly or yearly billing period.");
    await ensureProductSubscriptionsTable();
    const result = await pool.query("INSERT INTO product_subscriptions (customer_id, product_name, period, payment_method, note, status) VALUES ($1, $2, $3, 'manual', $4, 'pending_confirmation') RETURNING id, product_name, period, payment_method, status, created_at", [req.user.sub, productName, period, note]);
    return res.status(201).json({ success: true, message: "Request received. BKG will confirm availability, price and verified payment instructions before you pay.", subscription: result.rows[0] });
  } catch (error) { return next(error); }
});

app.get("/api/admin/subscriptions", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    await ensureProductSubscriptionsTable();
    const result = await pool.query("SELECT s.id, s.product_name, s.period, s.payment_method, s.note, s.status, s.created_at, c.full_name, c.email FROM product_subscriptions s JOIN customers c ON c.id = s.customer_id ORDER BY s.created_at DESC LIMIT 100");
    return res.json({ success: true, subscriptions: result.rows });
  } catch (error) { return next(error); }
});

app.post("/api/admin/subscriptions/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!requireDatabase(res)) return;
    const allowed = new Set(["pending_confirmation", "payment_instructions_sent", "active", "cancelled"]);
    if (!allowed.has(req.body.status)) return apiError(res, 400, "Choose a valid subscription status.");
    await ensureProductSubscriptionsTable();
    const result = await pool.query("UPDATE product_subscriptions SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status, updated_at", [req.body.status, req.params.id]);
    if (!result.rowCount) return apiError(res, 404, "Subscription request not found.");
    return res.json({ success: true, subscription: result.rows[0] });
  } catch (error) { return next(error); }
});

app.get("/api/bills/status", (_req, res) => {
  const providerConfigured = Boolean(
    process.env.VTPASS_API_KEY &&
    process.env.VTPASS_PUBLIC_KEY &&
    process.env.VTPASS_SECRET_KEY &&
    ["sandbox", "live"].includes(String(process.env.VTPASS_ENV || "").toLowerCase())
  );
  return res.json({
    success: true,
    provider: "VTpass",
    providerConfigured,
    transactionsEnabled: providerConfigured && String(process.env.VTPASS_ENV || "").toLowerCase() === "sandbox",
    sandboxOnly: true,
    message: providerConfigured
      ? "VTpass Sandbox airtime testing is enabled. Live purchases remain disabled."
      : "VTpass API credentials are not configured."
  });
});

// Sandbox-only airtime test endpoint. It never uses the live VTpass host.
function lagosRequestId() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(new Date()).reduce((out, part) => {
    if (part.type !== "literal") out[part.type] = part.value;
    return out;
  }, {});
  return parts.year + parts.month + parts.day + parts.hour + parts.minute +
    crypto.randomBytes(3).toString("hex").toUpperCase();
}

app.post("/api/bills/purchase", async (req, res) => {
  if (String(process.env.VTPASS_ENV || "").toLowerCase() !== "sandbox") {
    return apiError(res, 503, "Only VTpass Sandbox testing is enabled. Live purchases are disabled.");
  }
  const { VTPASS_API_KEY, VTPASS_SECRET_KEY } = process.env;
  if (!VTPASS_API_KEY || !VTPASS_SECRET_KEY) {
    return apiError(res, 503, "VTpass Sandbox API key or secret key is missing from server environment variables.");
  }
  const service = String(req.body && req.body.service || "");
  const provider = String(req.body && req.body.provider || "").toLowerCase();
  const phone = String(req.body && req.body.phone || "").replace(/[\s()-]/g, "");
  const amount = Number(req.body && req.body.amount);
  const serviceIds = { mtn: "mtn", airtel: "airtel", glo: "glo", "9mobile": "9mobile", etisalat: "9mobile" };
  if (service !== "Airtime") return apiError(res, 400, "For this first step, only airtime can be tested. Data, TV and electricity are not connected yet.");
  const serviceID = serviceIds[provider];
  if (!serviceID) return apiError(res, 400, "Choose a supported mobile network.");
  if (!/^0\d{10}$/.test(phone)) return apiError(res, 400, "Enter a valid 11-digit Nigerian phone number.");
  if (!Number.isInteger(amount) || amount < 50 || amount > 100000) return apiError(res, 400, "Enter an airtime amount between ₦50 and ₦100,000.");
  const request_id = lagosRequestId();
  try {
    const upstream = await fetch("https://sandbox.vtpass.com/api/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": VTPASS_API_KEY,
        "secret-key": VTPASS_SECRET_KEY
      },
      body: JSON.stringify({ request_id, serviceID, amount, phone }),
      signal: AbortSignal.timeout(20000)
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok || !data || typeof data !== "object") {
      return res.status(502).json({ success: false, message: "VTpass Sandbox did not return a usable response. Check the Sandbox API credentials and dashboard." });
    }
    const code = String(data.code || "");
    const transaction = data.content && data.content.transactions || {};
    const delivered = code === "000" || /successful/i.test(String(data.response_description || ""));
    const pending = /pending|processing/i.test(String(transaction.status || data.response_description || ""));
    return res.status(200).json({
      success: delivered,
      pending,
      sandbox: true,
      requestId: request_id,
      status: String(transaction.status || data.response_description || "unknown"),
      message: delivered
        ? "VTpass Sandbox reports a successful test response. This is not a live airtime purchase."
        : pending
          ? "VTpass Sandbox reports that the test is pending. Check transaction status before retrying."
          : String(data.response_description || "VTpass Sandbox did not confirm success. No live purchase was made."),
      providerResponseCode: code || null
    });
  } catch (error) {
    return apiError(res, 502, error && error.name === "TimeoutError"
      ? "VTpass Sandbox timed out. Do not retry repeatedly; check the transaction status first."
      : "Could not reach VTpass Sandbox. Check the deployment and Sandbox credentials.");
  }
});

app.post("/api/payments/checkout", requireAuth, (_req, res) => {
  return apiError(res, 503, "Online checkout is not enabled. The payment provider must be selected, configured and tested before BKG can accept payments.");
});

app.get("/api/virtual-numbers/catalog", (_req, res) => {
  return apiError(res, 503, "Live virtual-number availability is not connected yet. No numbers or SMS delivery are being offered until an authorized provider is integrated.");
});

app.post("/api/virtual-numbers/orders", requireAuth, (_req, res) => {
  return apiError(res, 503, "Virtual-number ordering is not enabled yet. Configure an authorized provider and validate its permitted uses before enabling purchases.");
});

// Keep source/configuration files out of the public static file surface.
app.use((req, res, next) => {
  const path = req.path || "/";
  if (
    path === "/server.js" ||
    path === "/package.json" ||
    path === "/package-lock.json" ||
    path === "/README.md" ||
    path === "/.gitignore" ||
    path.startsWith("/db/") ||
    path.startsWith("/.github/") ||
    path.startsWith("/node_modules/")
  ) return res.sendStatus(404);
  return next();
});
// Serve the storefront from the same Node service when deployed as a single application.
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"], index: "index.html", dotfiles: "deny" }));

app.use((error, _req, res, _next) => {
  console.error("[BKG API]", error && error.message ? error.message : "Unknown error");
  if (res.headersSent) return;
  if (error && error.message === "Origin not allowed by BKG CORS policy") return apiError(res, 403, "This website origin is not allowed.");
  return apiError(res, 500, "Something went wrong. Please try again later.");
});

if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => console.log("BKG API listening on port " + PORT));
}
module.exports = app;
