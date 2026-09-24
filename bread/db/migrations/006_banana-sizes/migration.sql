-- Banana bread in two sizes (Biz, 2026-09-24): small $3, at most 4 a pickup
-- day; large $7, at most 1.
--
-- The small loaf keeps its id 'banana', price and capacity: every order
-- placed before today was for it, and order_items points at that id, so only
-- its display name changes. The large loaf is a new product. Dates already
-- touched have no date_inventory row for it yet; ensureInventory adds one
-- under the date lock on the next reservation, and until then availability
-- reads its daily_capacity, so nothing needs backfilling.

UPDATE products SET name = 'Small banana bread' WHERE id = 'banana';

INSERT INTO products (id, name, blurb, price_cents, daily_capacity, sort_order) VALUES
  ('banana_large', 'Large banana bread', 'Large loaf', 700, 1, 3);
