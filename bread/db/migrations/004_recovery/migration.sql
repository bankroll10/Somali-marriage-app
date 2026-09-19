-- Launch-readiness repairs.
--
-- return_origin: the site the customer was on when they reserved, so a
-- Checkout Session re-created later by the scheduler, the webhook or the
-- admin page carries the same success and cancel URLs as the one the
-- customer's own request would have made. Stripe's idempotency key covers
-- the parameters, so a recovery that guessed a different origin could never
-- have succeeded.
ALTER TABLE payment_references
  ADD COLUMN return_origin text;

-- A session that could not be re-created at all — Stripe refusing the
-- create after a retry with fresh parameters — is a case for her, not a
-- hold to leave silently in place.
ALTER TABLE payment_exceptions DROP CONSTRAINT payment_exceptions_kind_check;
ALTER TABLE payment_exceptions
  ADD CONSTRAINT payment_exceptions_kind_check CHECK (kind IN (
    'amount_mismatch', 'currency_mismatch', 'order_mismatch', 'mode_mismatch', 'livemode_mismatch',
    'paid_after_release', 'duplicate_payment', 'expire_uncertain', 'session_unrecoverable'));

-- Every checkout that reached the reservation step, by address, so one
-- client cannot hold the shop's stock with free requests: a cap on checkouts
-- per window and on live holds per address, counted here rather than in
-- memory a function instance would not share. Pruned as it goes.
CREATE TABLE checkout_attempts (
  id       bigserial PRIMARY KEY,
  at       timestamptz NOT NULL,
  ip       text,
  order_id uuid REFERENCES orders (id) ON DELETE SET NULL
);
CREATE INDEX checkout_attempts_at ON checkout_attempts (at);
CREATE INDEX checkout_attempts_ip ON checkout_attempts (ip, at);
