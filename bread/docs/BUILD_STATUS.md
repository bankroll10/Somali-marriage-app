# Build status — persistent backend and ordering rules

Branch `claude/bread-ordering-app-fujfkj`, directory `bread/`. Design in
[`BUILD_PLAN.md`](BUILD_PLAN.md).

## Done

- **Postgres replaces Netlify Blobs.** One migration
  (`netlify/database/migrations/001_initial/migration.sql`) creates `products`, `pickup_dates`
  (date blocks), `date_inventory` (capacity, overflow, committed, with the capacity `CHECK`),
  `orders`, `order_items` (price snapshots), `payment_references`, and the `reservations` view.
  `@netlify/database` is the production driver (Netlify DB / Neon); `DATABASE_URL` works for any
  other Postgres, with `npm run db:migrate`.
- **Ordering rules as transactions** (`netlify/lib/inventory.ts`): per-date row lock, guarded
  per-line updates, all-or-nothing carts, lazy expiry of lapsed holds swept on the next write,
  checkout-key replay for retries, late-confirmation re-take with an explicit `force` that
  records overflow, cancel, block/unblock. Reads never lock or write.
- **Server-side validation** (`netlify/lib/validate.ts`): pickup day inside the rolling 4-week
  window (a forged out-of-window date is refused), before the 48-hour cutoff, known and active
  products, integer quantities within capacity, non-empty cart, name, 10-digit phone, v4
  checkout key. Browser prices and totals are never read; totals come from the `products` table.
- **Injectable clock** (`shared/clock.ts`), threaded through a handler factory
  (`netlify/lib/app.ts`). All time reasoning is `America/Chicago` on the server. Cutoff is 48
  elapsed hours before the 5 PM shift.
- **Payment state machine** (`reserved | paid | expired | cancelled` × payment reference
  `pending | succeeded | failed | expired`), Zelle live, Stripe contract documented in
  BUILD_PLAN — no Stripe code.
- **UI**: a one-time checkout key per attempt; availability re-fetched when the tab regains
  focus/visibility and again immediately before reserving (the cart is trimmed and the customer
  told, rather than failing at the server); admin shows lapsed and cancelled orders as still
  confirmable; new statuses throughout. Public availability carries no customer data.
- Docs: this file, `BUILD_PLAN.md`, `README.md`, `.env.example`.

## Verified here

Run on 2026-09-18 in this sandbox.

| Check | Result |
|---|---|
| `npm run typecheck` (app, functions, shared, tests, scripts) | pass |
| `npm run lint` (oxlint) | pass; 2 pre-existing `set-state-in-effect` warnings in `Order.tsx`/`Admin.tsx` (a fetch kicked off in an effect), unchanged by this work |
| `npm test` — vitest on **PGlite (Postgres 18, in-process)** | **43 passed**, 4 skipped (the real-Postgres suite, needs `TEST_DATABASE_URL`) |
| `npm run test:pg` — `tests/contention.test.ts` on a **real Postgres 16.13**, 12-connection pool | **4 passed** |
| `npm run build` (Vite) | pass |
| Root Niyyah `npm run verify` (bread excluded) | 227 passed |
| `npm run db:migrate` against the real Postgres, twice | applies once, then "up to date" |
| esbuild bundle of `checkout.ts` and `admin.ts` (`--platform=node`, as `netlify.toml` requests) | bundles; the bundled admin function answered a real request through `@netlify/database` → `pg` against the real Postgres (HTTP 200); without any database it answers 503 `database_not_configured` |

What the tests prove, specifically:

- **Concurrent purchases**: 10 simultaneous reservations of one sourdough against a capacity of 3
  → exactly 3 succeed, 7 get `sold_out`, ledger recount = 3 (PGlite). 20 simultaneous mixed carts
  over 10 real connections → exactly 3 succeed, 17 `sold_out`, no errors (real Postgres). A
  reservation genuinely **blocks** while another connection holds the date lock, then proceeds. A
  client that dies mid-transaction leaves no rows. A write that skips the lock and would exceed
  capacity is refused by the database (`23514`).
- **Mixed-cart rollback**: a cart whose sourdough line cannot be had leaves banana's `committed`
  untouched, and no order row; and the other way round.
- **Reservations**: lapse is honoured on read with no sweep having run; the next write sweeps;
  a lapsed-but-unswept order can be confirmed with no capacity check (its units were never given
  away); a swept order is confirmed if it still fits, refused with the remaining counts if not,
  and `force` records the shortfall as that date's overflow without ever raising public
  availability; cancel frees at once; double cancel/double confirm are no-ops; a paid order has
  exactly one succeeded payment reference.
- **Independent dates**: filling Monday leaves Wednesday and Thursday whole.
- **Blocked dates**: refuse new reservations; orders already on the date stay listed and paid.
- **Forged requests**: 18 cases (out-of-window and past dates, non-pickup weekday, unknown and
  inactive products, zero/negative/fractional/string/over-capacity quantities, array cart,
  empty cart, bad name/phone/key, client-supplied price and total) → 4xx and zero rows written.
- **Retries**: the same checkout key twice returns the same order, `replayed: true`, no second
  reservation.
- **Cutoff/DST**: exact 48-hour boundary on both sides (1 ms before open, at it closed); Mon
  2026-11-02 cutoff = Sat Oct 31 **6 PM CDT** (48 elapsed hours across the fall-back); Mon
  2027-03-15 cutoff = Sat Mar 13 4 PM CST; window starts from today in Chicago, not UTC; month
  and year ends; last in-window date accepted and the next refused; past dates refused; the
  pickup day itself closed; a hold reserved before the fall-back expires 3 elapsed hours later.
- **Price snapshots**: an order keeps its price after the product's price changes.
- **Ledger**: after every rules and concurrency test, `committed` equals a recount from
  `orders`/`order_items` and never exceeds `capacity + overflow`.

## Not exercised from here (external behaviour)

This sandbox cannot deploy (Netlify's upload proxy refused it earlier) and cannot reach
Netlify's documentation site. The following are therefore **untested** and are the first-deploy
checklist:

1. **Netlify DB provisioning** — that installing `@netlify/database` and deploying provisions
   the database and sets `NETLIFY_DB_URL`, per Netlify's own guidance. Confirm the database
   appears in the site's Database section after the first deploy.
2. **Claiming** — I recall unclaimed Netlify DB databases expire after 7 days; unverified.
   Claim it to a Neon account if the UI offers to, so orders are not deleted.
3. **Automatic migrations** — that Netlify applies `netlify/database/migrations/001_initial/`
   on deploy. If it does not, `DATABASE_URL=<NETLIFY_DB_URL> npm run db:migrate` applies it.
4. **Netlify's bundler** — esbuild bundled the functions here; Netlify's own build (Node 22,
   `NPM_FLAGS=--include=dev`) has not run on this code.
5. **Neon specifics** — the serverless (WebSocket) driver `@netlify/database` selects inside
   Netlify Functions, its pooler's handling of `SET LOCAL lock_timeout` /
   `idle_in_transaction_session_timeout`, connection limits under a burst of customers, and
   cold-start latency. The transactions were verified on a plain Postgres 16 over TCP/socket.
6. **`netlify dev`** locally with a Netlify DB branch.
7. The customer and admin pages against the live API (only stubbed API screenshots were taken in
   an earlier stage; the components changed modestly since).

## Remaining dependency on Stripe

None for the Zelle flow. To add Stripe later, per the contract in BUILD_PLAN: her Stripe account
and secret key + webhook signing secret in Netlify env; the `stripe` SDK; a session-create call
after `reserve` commits (idempotency key = order id) and the `external_id` write; a webhook
function mapping `completed` → `markPaid(force)` and `expired` → `cancel`, with a
`webhook_events` table for deduplication; hold expiry ≥ session expiry + margin. No schema
change is expected.

## Known limits / follow-ups

- `date_inventory.capacity` is copied from the product when a date is first touched; changing
  `daily_capacity` later does not alter dates already created (an admin "set capacity for a
  date" action would).
- A refund of a paid order is not modelled (`paid` is terminal); it would need to subtract from
  `committed`/`overflow`.
- `ZELLE_NAME` in `shared/config.ts` is still a placeholder; `ZELLE_HANDLE` is set.
