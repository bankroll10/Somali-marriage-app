-- The admin she runs during her shift.
--
-- Payment state and fulfilment state come apart here. orders.status keeps
-- saying what happened to the money and the reservation (reserved, paid,
-- expired, cancelled-before-paying); orders.fulfillment says what happened
-- to the bread once it was paid for: still owed, picked up, or cancelled by
-- her as a deliberate decision. "Bread to make" counts paid orders that are
-- not fulfilment-cancelled, and nothing else.
--
-- A refund at Stripe changes neither. It is mirrored onto the payment
-- reference so she can see it; whether the bread goes back into the pool is
-- her separate, recorded call (restocked_at).

ALTER TABLE orders
  ADD COLUMN fulfillment            text NOT NULL DEFAULT 'owed' CHECK (fulfillment IN ('owed', 'picked_up', 'cancelled')),
  ADD COLUMN fulfillment_changed_at timestamptz,
  ADD COLUMN fulfillment_changed_by text,
  ADD COLUMN fulfillment_note       text,
  -- Set when a fulfilment-cancelled paid order's units were returned to the
  -- pool. Absent, the units stay committed: she chose not to resell them.
  ADD COLUMN restocked_at           timestamptz;

UPDATE orders SET fulfillment = 'picked_up', fulfillment_changed_at = picked_up_at WHERE picked_up_at IS NOT NULL;

ALTER TABLE pickup_dates
  ADD COLUMN blocked_by text;

-- Refunds as Stripe reports them, mirrored. Succeeded refunds and ones still
-- pending are kept apart so a partial or in-flight refund reads honestly.
ALTER TABLE payment_references
  ADD COLUMN refunded_cents       integer NOT NULL DEFAULT 0 CHECK (refunded_cents >= 0),
  ADD COLUMN refund_pending_cents integer NOT NULL DEFAULT 0 CHECK (refund_pending_cents >= 0),
  ADD COLUMN refund_checked_at    timestamptz;

-- Every sign-in attempt, so guessing the password is rate-limited across
-- every function instance, not per process. Pruned as it goes.
CREATE TABLE admin_sign_ins (
  id  bigserial PRIMARY KEY,
  at  timestamptz NOT NULL,
  ip  text,
  ok  boolean NOT NULL
);
CREATE INDEX admin_sign_ins_at ON admin_sign_ins (at);

-- Every admin write, so a decision about someone's bread is on the record.
CREATE TABLE admin_actions (
  id        bigserial PRIMARY KEY,
  at        timestamptz NOT NULL,
  actor     text NOT NULL,
  action    text NOT NULL,
  order_id  uuid REFERENCES orders (id) ON DELETE SET NULL,
  date      date,
  detail    jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX admin_actions_order ON admin_actions (order_id);
CREATE INDEX admin_actions_date ON admin_actions (date);
