require("dotenv").config();

const express = require("express");
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
app.use(helmet());
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
    await pool.query("BEGIN");
    try {
      await pool.query("UPDATE customers SET email_verified = TRUE, updated_at = NOW() WHERE id = $1", [row.id]);
      await pool.query("UPDATE email_verification_codes SET consumed_at = NOW() WHERE customer_id = $1 AND consumed_at IS NULL", [row.id]);
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
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

app.post("/api/payments/checkout", requireAuth, (_req, res) => {
  return apiError(res, 503, "Online checkout is not enabled. The payment provider must be selected, configured and tested before BKG can accept payments.");
});

app.get("/api/virtual-numbers/catalog", (_req, res) => {
  return apiError(res, 503, "Live virtual-number availability is not connected yet. No numbers or SMS delivery are being offered until an authorized provider is integrated.");
});

app.post("/api/virtual-numbers/orders", requireAuth, (_req, res) => {
  return apiError(res, 503, "Virtual-number ordering is not enabled yet. Configure an authorized provider and validate its permitted uses before enabling purchases.");
});

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
