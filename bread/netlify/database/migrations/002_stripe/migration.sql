-- Stripe Checkout on top of the existing lifecycle.
--
-- A Stripe-backed reservation is never released by time: only after Stripe
-- confirms the session cannot complete. orders.provider is what the sweep,
-- the availability query and the order page consult to know which holds are
-- protected that way.

ALTER TABLE orders
  ADD COLUMN provider text NOT NULL DEFAULT 'zelle' CHECK (provider IN ('zelle', 'stripe'));

ALTER TABLE payment_references
  ADD COLUMN session_expires_at timestamptz,
  ADD COLUMN payment_intent_id text,
  ADD COLUMN last_checked_at timestamptz,
  ADD COLUMN livemode boolean;

-- A payment Stripe reports that does not match what we sold, or arrived for
-- stock we had already released. Stock is preserved and the owner decides.
CREATE TABLE payment_exceptions (
  id          bigserial PRIMARY KEY,
  order_id    uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  session_id  text,
  kind        text NOT NULL CHECK (kind IN ('amount_mismatch', 'currency_mismatch', 'order_mismatch', 'mode_mismatch', 'livemode_mismatch', 'paid_after_release', 'duplicate_payment', 'expire_uncertain')),
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL,
  resolved_at timestamptz,
  resolved_by text
);
CREATE INDEX payment_exceptions_open ON payment_exceptions (order_id) WHERE resolved_at IS NULL;

-- A log of every verified webhook delivery. Idempotency does not depend on
-- it: finalisation and release are exactly-once on their own.
CREATE TABLE webhook_events (
  id           text PRIMARY KEY,
  type         text NOT NULL,
  received_at  timestamptz NOT NULL,
  processed_at timestamptz
);
