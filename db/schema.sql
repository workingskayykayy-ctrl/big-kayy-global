CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  role VARCHAR(20) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id BIGSERIAL PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS email_verification_customer_created_idx
  ON email_verification_codes(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS email_verification_expiry_idx
  ON email_verification_codes(expires_at);

CREATE TABLE IF NOT EXISTS order_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  items JSONB NOT NULL,
  note VARCHAR(1000) NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'contacted', 'closed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS order_enquiries_customer_created_idx
  ON order_enquiries(customer_id, created_at DESC);


CREATE TABLE IF NOT EXISTS product_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  product_name VARCHAR(120) NOT NULL,
  period VARCHAR(10) NOT NULL CHECK (period IN ('monthly', 'yearly')),
  payment_method VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (payment_method = 'manual'),
  note VARCHAR(1000) NOT NULL DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'pending_confirmation'
    CHECK (status IN ('pending_confirmation', 'payment_instructions_sent', 'active', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS product_subscriptions_customer_created_idx
  ON product_subscriptions(customer_id, created_at DESC);
