# Vercel deployment guide — BKG Bigg Kayy Global

This repository can deploy the static storefront and its Express API together on Vercel. The `migrate-to-vercel` branch adds a serverless entry point at `api/index.js` and routes `/api/*` to it. The existing `server.js` remains the source of the API logic and still supports a conventional Node host.

## Before switching traffic

- Keep the current Render service and PostgreSQL database running until Vercel is verified.
- Vercel does not migrate your PostgreSQL data. Continue using the existing database URL initially, or migrate the database separately and verify the copy before changing `DATABASE_URL`.
- Do not commit real environment values or paste passwords, SMTP credentials, JWT secrets, or database URLs into chat.

## Deploy

1. Open https://vercel.com/new and import `workingskayykayy-ctrl/big-kayy-global` from GitHub.
2. Select the `migrate-to-vercel` branch for the first deployment.
3. Let Vercel detect the Node.js project. Use Node.js 20 or newer. No build command is required for the current plain HTML/CSS/JS storefront; the API entry point is `api/index.js`.
4. Add the environment variables below in Project Settings → Environment Variables. Add them for Preview while testing and Production when ready. Redeploy after changing variables.
5. Deploy the preview and test the checks below before attaching a production domain or changing DNS.

## Environment variables

Set these in Vercel Project Settings → Environment Variables. Values are supplied by you/your providers; do not use the placeholder values below in production.

Required for customer accounts and enquiry persistence:
- `JWT_SECRET`: a newly generated, random secret of at least 32 characters. Keep the same value across deployments that should accept the same tokens.
- `DATABASE_URL`: PostgreSQL connection URL for the existing database, including credentials. Use a provider's pooled URL if its instructions recommend one for serverless.
- `DATABASE_SSL`: set to `true` only if the database provider requires TLS and its certificate chain is trusted by the Node runtime. Confirm provider-specific instructions.

Required for email verification:
- `SMTP_HOST`: mail provider SMTP hostname.
- `SMTP_PORT`: commonly `587` for STARTTLS or `465` for implicit TLS; follow the provider's settings.
- `SMTP_USER`: SMTP username.
- `SMTP_PASS`: SMTP password or provider-issued SMTP credential.
- `SMTP_FROM`: verified sender address, optionally formatted as `BKG <verified-address@example.com>`.

Recommended:
- `FRONTEND_ORIGIN`: exact origin of the deployed site, e.g. `https://your-project.vercel.app` (no trailing slash). Set this to the actual production domain when you use a custom domain. Preview deployments use different URLs, so either test with a matching Preview environment value or use the production deployment for final verification.
- `TRUST_PROXY`: set to `true` for Vercel so rate limiting can use the forwarded client IP correctly.

Not required for deployment:
- `PORT` (Vercel manages the function port).
- `NODE_ENV` (Vercel sets the production environment automatically).
- `PAYMENT_PROVIDER`, `PAYMENT_SECRET_KEY`, `VIRTUAL_NUMBER_PROVIDER`, `VIRTUAL_NUMBER_API_KEY`: the repository deliberately disables these features until providers are selected and integrated. Adding values alone will not enable payments or virtual-number services.

## Verify the deployment

Open the deployment URL and check:
- `/` loads the storefront.
- `/api/health` returns JSON. Confirm `database` is `connected` and `emailVerificationConfigured` is `true` after the related environment values are set.
- `/api/products` returns the starter catalogue.
- Register a test account and verify the code arrives by email, then sign in.
- Submit an enquiry and confirm it appears in the database/admin flow.
- Confirm browser developer tools show no CORS errors.

The payment checkout and virtual-number routes are expected to return HTTP 503 until those integrations are implemented. Do not treat them as live services.

## Database preservation and cutover

Using the existing `DATABASE_URL` means Vercel will access the same PostgreSQL data; no database copy is required. If changing database hosts, take a backup, restore it to the new host, apply `db/schema.sql` if needed, compare record counts and test authentication/enquiries before switching the variable.

Keep Render available during the initial validation. Once the Vercel deployment and custom domain are verified, update DNS/domain assignment in Vercel and check HTTPS and account flows again. Only retire Render after you have confirmed that no remaining service or scheduled task depends on it.

## Operational notes

- Vercel serverless functions can scale to multiple instances, so PostgreSQL connection limits and SMTP provider limits matter. Monitor connections and use a managed pooler where recommended.
- API requests are subject to Vercel function duration and platform limits.
- This setup preserves the current API routes and database schema; it does not implement missing payment, virtual-number, or admin-dashboard features.
