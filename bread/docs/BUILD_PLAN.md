# Build plan — persistent backend and ordering rules

This is the design the code in `bread/` implements. `BUILD_STATUS.md` says
what of it is done, what the tests proved, and what could not be exercised
from here.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Payment | **Stripe-hosted Checkout** (card, Apple Pay/Google Pay where eligible) is the customer flow. Zelle, confirmed by hand in `/admin`, remains as a manual fallback. | See "Stripe Checkout (built)" below for the full lifecycle. |
| Database | **Any Postgres** via `DATABASE_URL` (this app is set up against a free Neon project). | Netlify also sells a zero-config auto-provisioned database, but it isn't available on this account's plan — a deploy fails outright if it detects `netlify/database/migrations`. Migrations live in `db/migrations/` instead and are applied by hand with `npm run db:migrate`. |
| Tests | **PGlite** (Postgres 18, in-process) runs the real migration; a real multi-connection Postgres runs the contention suite when `TEST_DATABASE_URL` is set. | Same engine as production; nothing mocked below the SQL. |
| Time | An injectable `Clock`; every rule takes `nowMs`. All wall-clock reasoning is `America/Chicago` on the server. The browser's clock decides nothing. | Cutoff, DST and hold-expiry tests pin exact instants. |
| Cutoff | 48 **elapsed** hours before the 5 PM shift start on the pickup date. | The literal reading of "48 hours before". Across the Nov 1 fall-back this puts Monday's cutoff at 6 PM CDT on Saturday, not 5 PM; a test pins it. |
| Hold | 3 h (`PAYMENT_HOLD_HOURS`), elapsed. | Long enough she can notice during a shift, short enough one no-show can't sit on the day's only sourdough all day. |
| Window | Rolling 4 weeks of Mon/Wed/Thu from today in Chicago (`WEEKS_AHEAD`). | A date outside it is not a date the API accepts at all. |
| Prices | `products` table is the authority; the UI's `PRODUCTS` copy is checked against the seed by a test. | The browser displays; the server decides. |

## Schema (`db/migrations/001_initial/migration.sql`)

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
- `payment_references` — `provider (zelle|stripe)`, `external_id` (the Stripe session id),
  `idempotency_key`, status `pending | succeeded | failed | expired`, `amount_cents`,
  `confirmed_by`, `session_expires_at`, `payment_intent_id`, `last_checked_at`, `livemode`. Partial
  unique indexes: at most one pending and one succeeded per order. `UNIQUE (provider, external_id)`.
- `orders.provider` (`zelle | stripe`) — which lifecycle a reservation follows.
- `payment_exceptions` — a Stripe payment that does not match what was sold, or arrived for stock
  already released; stock is preserved until the owner resolves it.
- `webhook_events` — a log of verified deliveries (idempotency does not depend on it).
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

## Stripe Checkout (built)

Facts this stage relies on, read from the Stripe SDK's embedded API reference (stripe 22.6.2,
OpenAPI v2442; docs.stripe.com is unreachable from the build sandbox): a Checkout Session's
`expires_at` must be 30 minutes to 24 hours after creation; `payment_method_types: ['card']`
restricts the session to cards, with Apple Pay and Google Pay offered on that where the browser is
eligible, and keeps every delayed-settlement method out; Checkout asks the customer for an email
unless one is prefilled; phone collection is off unless requested; `sessions.expire()` succeeds
only while the session is `open`, after which the customer cannot complete it;
`client_reference_id` and `metadata` carry our order id; `webhooks.constructEventAsync(rawBody,
signature, secret)` verifies deliveries.

**Decisions.** Stripe-hosted Checkout; test mode throughout development; customers pay by card
(wallets where eligible; no wallet button of our own); Zelle stays only as the admin's manual
"Mark paid"; the strict deadline rule below. Apple Pay on Stripe-hosted Checkout needs no domain
registration (it is Stripe's domain); it appears on Safari on iOS/macOS with a card in Wallet and
the wallet enabled under Dashboard → Payment methods, and it cannot be forced.

**Deadline rule — for Biz's confirmation before launch.** Payment must be complete by the
displayed ordering deadline (48 elapsed hours before the 5 PM shift). Stripe cannot make a session
shorter than 30 minutes, so **card checkout must start at least 32 minutes before the deadline**
(`CARD_CHECKOUT_LEAD_MINUTES`; the extra two absorb clock skew), and the session is set to expire
at the deadline or after 45 minutes, whichever is sooner (`SESSION_MINUTES`, floor
`SESSION_MIN_MINUTES = 31`). Inside the last 32 minutes the date shows as closed and `checkout`
answers `closing_soon`. No late order can be accepted, because Stripe itself refuses the session
after its expiry. *Alternative not built:* a grace period in which a session started before the
deadline runs its full 30 minutes, so a payment could land up to 30 minutes after the displayed
deadline. Biz chose the strict rule; the grace period is one constant away if she prefers it.

### Lifecycle (`netlify/lib/stripe/payments.ts`, gateway in `stripe/gateway.ts`)

1. **checkout** — validate; `closing_soon` per the rule above; `reserve(provider: 'stripe')` writes
   a pending `payment_references` row with `idempotency_key = order id`, `session_expires_at`, and
   `hold_expires_at = session expiry + 10 min` (a hint of when to ask Stripe, never a release
   time); commit. Then `ensureSession`: the Checkout Session is built **only from database rows**
   (snapshotted `unit_price_cents`, stored expiry, order id) so every retry sends Stripe the same
   create under the same key and gets the same session; `mode: 'payment'`,
   `payment_method_types: ['card']`, `client_reference_id`, `metadata.order_id`,
   `customer_creation: 'if_required'`, success `/thanks?order=<id>`, cancel `/?canceled=<id>`.
   The session id is stored in `external_id`. A create failure leaves the order reserved with no
   id (503 `payment_unavailable`); the customer's retry, a `checkout_key` replay or reconciliation
   re-issues the same create.
2. **Never released by time.** `sweep()`, the availability query and the order page all leave a
   `provider = 'stripe'` reservation alone, however old. Release happens only in `releaseStripe`,
   exactly once (guarded `UPDATE … WHERE status = 'reserved' AND provider = 'stripe'`), after Stripe
   has shown the session `expired` (or `complete` but unpaid).
3. **finalizePayment(session)** — the one way a card order becomes paid. Under the date lock and
   the order row lock: already succeeded for this session → no-op. Verify `payment_status = paid`,
   `mode = payment`, `livemode` matches the key in use, `currency = usd`, `amount_total =
   total_cents`, `metadata.order_id` / `client_reference_id` = this order, and the stored session
   id. Any failure → a `payment_exceptions` row, stock kept, reference left pending. Order
   `reserved` → `paid`. Order `expired`/`cancelled` (released by a race) → units taken again, over
   capacity if it must be, plus a `paid_after_release` exception. Order already `paid` another way
   → `duplicate_payment` exception. Reference → `succeeded` with the payment intent id.
4. **reconcileOrder** — retrieve the session (re-create under the same key if the id was never
   stored): `complete`+`paid` → finalize; `expired` or `complete`+unpaid → release; `open` and not
   yet past its time → leave it; `open` and past `hold_expires_at`, or asked to end it (customer
   backed out, admin cancelled) → `expire()`, then **re-retrieve and believe only that**: a payment
   that slipped in first is finalized, an expired session is released, anything else stays held
   with an `expire_uncertain` exception. Stripe unreachable → nothing changes. Triggers: the
   webhook, every poll of the customer's page, the cancel URL, admin page load (that date's stale
   card orders), and `reconcile-stale` on a Netlify schedule every 10 minutes.
5. **Webhook** — raw body via `req.text()`; signature verified; event id logged in
   `webhook_events`; `checkout.session.completed` / `async_payment_succeeded` with
   `payment_status = paid` → finalize from the event; anything else → reconcile with a fresh
   retrieve. Duplicates, delays and reordering are safe because finalize and release are
   status-guarded and exactly-once.
6. **Admin** — cancelling or hand-confirming a card order still with Stripe ends its session and
   settles it first; if the customer had paid, admin is told `already_paid`. Open exceptions are
   listed under *Payments that need a look* with a resolve button; refunds are done in the Stripe
   Dashboard.
7. **Order page** — `/thanks?order=<uuid v4>` (122 random bits; no second token). Shows *checking
   your payment* while the server verifies with Stripe on each poll (safe to refresh, capped, then
   asks the customer to refresh), the confirmation (reference, items, quantities, total paid,
   pickup date, place, "5–11 PM; after 9 PM preferred"), *expired*/*cancelled*, or *attention*
   when an exception is open. The public summary carries no phone number.

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
