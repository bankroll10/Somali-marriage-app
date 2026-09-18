# Build plan — persistent backend and ordering rules

This is the design the code in `bread/` implements. `BUILD_STATUS.md` says
what of it is done, what the tests proved, and what could not be exercised
from here.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Payment | **Zelle, confirmed by hand** in `/admin`. No processor. | Her choice; no fee on a $3 loaf. Zelle has no merchant API, so the app can never *know* a payment landed. |
| Stripe | **Not now**, but the schema and state machine are built so a Stripe stage adds a provider and a webhook, not tables. | See "Stripe contract" below. |
| Database | **Netlify DB** (Postgres on Neon) via `@netlify/database`; any Postgres works through `DATABASE_URL`. | Provisioned on first deploy, migrations applied by Netlify. Fewest moving parts for her. |
| Tests | **PGlite** (Postgres 18, in-process) runs the real migration; a real multi-connection Postgres runs the contention suite when `TEST_DATABASE_URL` is set. | Same engine as production; nothing mocked below the SQL. |
| Time | An injectable `Clock`; every rule takes `nowMs`. All wall-clock reasoning is `America/Chicago` on the server. The browser's clock decides nothing. | Cutoff, DST and hold-expiry tests pin exact instants. |
| Cutoff | 48 **elapsed** hours before the 5 PM shift start on the pickup date. | The literal reading of "48 hours before". Across the Nov 1 fall-back this puts Monday's cutoff at 6 PM CDT on Saturday, not 5 PM; a test pins it. |
| Hold | 3 h (`PAYMENT_HOLD_HOURS`), elapsed. | Long enough she can notice during a shift, short enough one no-show can't sit on the day's only sourdough all day. |
| Window | Rolling 4 weeks of Mon/Wed/Thu from today in Chicago (`WEEKS_AHEAD`). | A date outside it is not a date the API accepts at all. |
| Prices | `products` table is the authority; the UI's `PRODUCTS` copy is checked against the seed by a test. | The browser displays; the server decides. |

## Schema (`netlify/database/migrations/001_initial/migration.sql`)

- `products` — id, name, blurb, `price_cents > 0`, `daily_capacity >= 0`, active. Seeded: sourdough 500/3, banana 300/4.
- `pickup_dates` — one row per date ever touched; `blocked_at` for date blocks. **The per-date lock row.**
- `date_inventory (date, product_id)` — `capacity`, `overflow`, `committed`, with
  `CHECK (committed >= 0 AND committed <= capacity + overflow)`. `committed` is the units of that
  date's orders that are `reserved` or `paid`. **This CHECK is the database's own guarantee that
  capacity is never exceeded, whatever the application does.** `overflow` is the owner's recorded
  "I'll bake extra" for one date.
- `orders` — status `reserved | paid | expired | cancelled`, name, 10-digit phone, `total_cents`,
  `hold_expires_at`, `checkout_key UNIQUE` (a browser-made v4 UUID per attempt; a retry replays),
  `forced`, `seq` for arrival order.
- `order_items` — quantity and `unit_price_cents` **snapshotted** at reservation.
- `payment_references` — `provider (zelle|stripe)`, `external_id`, `idempotency_key`, status
  `pending | succeeded | failed | expired`, `amount_cents`, `confirmed_by`. Partial unique indexes: at
  most one pending and one succeeded per order. `UNIQUE (provider, external_id)`.
- `reservations` — a **view** over `orders WHERE status = 'reserved'`: the temporary reservation as
  its own entity, with no second table that could drift.

## Transactions (`netlify/lib/inventory.ts`)

Every write that touches a date's stock: `INSERT pickup_dates … ON CONFLICT DO NOTHING`, then
`SELECT … FOR UPDATE` on that row. On a real Postgres this serialises writers per date; the CHECK
holds even if a caller forgot. Reads never lock and never write. Production sets
`lock_timeout = 4s` (→ HTTP 503 `busy`) and `idle_in_transaction_session_timeout = 10s`.

**sweep(date)** — inside a caller's transaction: expire this date's `reserved` orders whose hold
has passed, and subtract their units from `committed`, in one statement. Running twice is a no-op.

1. **reserve** — validate with no DB (`netlify/lib/validate.ts`: pickup day inside the window,
   before cutoff, known active products, integer quantities within capacity, non-empty, name,
   phone, v4 checkout key; browser prices/totals never read). Lock date; blocked → 409. Checkout
   key already used → return that order (`replayed: true`). Sweep. Ensure `date_inventory` rows.
   Snapshot remaining. Per line, product-ordered: `UPDATE … SET committed = committed + q WHERE …
   AND committed + q <= capacity RETURNING` — no row on any line rolls the whole cart back with
   `sold_out` + the snapshot. Insert order (total from `products`), items (price snapshot), a
   pending `zelle` reference. Commit.
2. **availability** — one SELECT over the window's dates × products: `remaining = max(0, capacity −
   committed + lapsed-but-unswept units)`. Never customer data; includes the product list.
3. **markPaid(force)** — read date; lock date; lock order. `paid` → no-op. `reserved` (even lapsed:
   its units are still committed, nobody could have taken them) → paid. `expired | cancelled` →
   sweep, guarded re-take (`<= capacity + overflow`); refused without `force` → 409 with remaining;
   with `force` → `overflow += shortfall`, re-take, `forced = true`. Pending reference → succeeded;
   none → a fresh succeeded one (`zelle:<id>:n`). Public availability never rises because of
   overflow, so a later cancel on an over-committed day reveals no phantom slot.
4. **cancel** — lock; `reserved` only → `cancelled`, units subtracted, pending reference → expired.
5. **order (customer page)** — pure read; a lapsed `reserved` order is reported as `expired`.
6. **admin day** — pure read; every order for the date (lapsed and cancelled too, so a late Zelle
   can still be confirmed); to-bake = paid units; remaining as (2).
7. **block / unblock** — upsert `blocked_at`. Refuses new reservations only; orders already on
   the date are untouched and still listed.

## State machine

```
orders  reserved ──sweep (next write to that date)──▶ expired ──markPaid, guarded | forced──▶ paid
        reserved ──admin cancel──▶ cancelled ──markPaid, guarded | forced──▶ paid
        reserved ──markPaid──▶ paid                         paid is terminal; picked_up_at is a flag on it
refs    pending ──▶ succeeded | failed | expired            ≤1 pending, ≤1 succeeded per order
invariants  paid ⇔ ∃ succeeded ref · committed(d,p) = Σ qty of orders(d) in {reserved, paid} · committed ≤ capacity + overflow
```

## Stripe contract (for the next stage; nothing here is built)

- `reserve` also writes `payment_references(stripe, external_id NULL, idempotency_key = order id,
  pending)`. **After commit**, the function creates a Checkout Session with that idempotency key,
  `expires_at = hold_expires_at − 15 min`, `metadata.order_id`, then writes `external_id`.
- Any failure or crash between the commit and that write leaves the order `reserved` with its
  stock held. Recovery is not a lookup: the "pay" button re-issues the identical create with the
  same idempotency key and Stripe replays the same session (24 h). A retry after a *failed* create
  opens a new reference with key `<id>:2`; the partial index keeps one pending per order.
- Hold expiry ≥ session expiry + margin, so stock is never released while a session can succeed.
- Webhook `checkout.session.completed` → `markPaid(force = true)` (money was taken), deduplicated
  by a `webhook_events(id PRIMARY KEY)` table; `checkout.session.expired` → reference `expired` +
  `cancel`. Both are existing transitions.
- Needs from her: a Stripe account, secret key and webhook signing secret in Netlify env, and the
  ~2.9 % + 30 ¢ fee accepted.

## Tests (`tests/`)

- `rules.test.ts` — the HTTP handlers on PGlite: availability (no customer data), reserve,
  price snapshots, every forged-request case, exact cutoff, sold-out, blocked, mixed-cart
  rollback, independent dates, checkout-key replay, lapse without sweep, hold across fall-back,
  admin auth, markPaid (idempotent, lapsed-unswept, swept-and-fits, refused, forced + overflow +
  no phantom slot + CHECK refuses a raw write), cancel, one succeeded reference per paid order,
  listing/pickup, block keeps existing orders. `assertLedger()` recounts after every test.
- `concurrency.test.ts` — 10 buyers / 3 loaves; 10 mixed carts; contested last loaf through HTTP.
- `contention.test.ts` — the same on a real Postgres over 10 connections (`TEST_DATABASE_URL`):
  20 parallel buyers; a reservation blocks on the held date lock then proceeds; a client that dies
  mid-transaction leaves nothing; the CHECK refuses a write that skips the lock.
- `schedule.test.ts` / `zoned.test.ts` — pickup days, 48-hour cutoff, DST fall-back/spring-forward
  cutoffs, window start in Chicago not UTC, month/year ends, exact window bounds, past dates.
- `deploy-layout.test.ts` — functions dir holds only handlers; migrations follow Netlify's naming;
  the UI's `PRODUCTS` equals the seed.
