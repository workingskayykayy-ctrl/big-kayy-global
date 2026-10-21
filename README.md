# BKG — Bigg Kayy Global

A responsive Teal & Graphite storefront for gadget enquiries and planned digital services.

## Project files

- `index.html`, `style.css`, `app.js`: storefront, account dialog and browser interactions.
- `server.js`: Express API and static frontend server.
- `db/schema.sql`: PostgreSQL tables for customers, verification codes and enquiries.
- `.env.example`: safe environment configuration template; contains no real credentials.

## Implemented API routes

- `GET /api/health` — API and configuration status.
- `GET /api/products` — starter catalogue.
- `POST /api/auth/register` — create customer account and send a six-digit email code.
- `POST /api/auth/verify-email` — verify code and issue a short-lived JWT.
- `POST /api/auth/login` — sign in only after email verification.
- `GET /api/auth/me` — read the signed-in customer's profile.
- `POST /api/orders/enquiry` — save a gadget enquiry for an authenticated customer; this is not a paid order.
- `POST /api/payments/checkout` — deliberately disabled until a payment provider is selected and configured.
- `GET /api/virtual-numbers/catalog`, `POST /api/virtual-numbers/orders` — deliberately disabled until an authorized provider is integrated.

## Local setup

Requirements: Node.js 20+ and PostgreSQL.

1. Create a PostgreSQL database.
2. Run `db/schema.sql` against that database.
3. Copy `.env.example` to `.env`. Set a random `JWT_SECRET` (at least 32 characters), `DATABASE_URL`, SMTP credentials and `SMTP_FROM`. Set `FRONTEND_ORIGIN` to your exact frontend origin if the frontend and API are on separate domains.
4. Install dependencies with `npm install`.
5. Start the server with `npm start`.
6. Open `http://localhost:3000` and check `http://localhost:3000/api/health`.

Do not commit `.env` or expose secrets in browser JavaScript. Use HTTPS, managed PostgreSQL, backups, monitoring, and a correctly configured CORS origin for production. Configure email delivery before testing registration.

## Still required before real transactions

- Choose and integrate a payment gateway, with verified signed webhooks, payment status reconciliation, refund/error handling, and test-mode coverage.
- Choose an authorized virtual-number/SMS provider and integrate its documented API, country/service availability, pricing, order status and refund rules.
- Build a protected admin dashboard and role-based admin access.
- Add production tests, privacy/terms, support details, order fulfilment, and operational monitoring.
- Confirm actual product stock, prices, delivery, tax and return policies.

The app does not currently charge customers or provide live virtual numbers/SMS. Payment and virtual-number routes return an explicit unavailable response until configured. The starter gadget list is an enquiry list, not a checkout cart. No news section is included.
