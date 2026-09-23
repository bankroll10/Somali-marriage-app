# Fresh Bread — pre-order and pay for pickup

> **Do not delete or rename the branch `claude/bread-ordering-app-fujfkj`.** It is the production
> branch of the Netlify project `bread-pickup`: pushing to it *is* deploying her live storefront.
> The name looks disposable and sits beside other `claude/*` branches in this repo, but deleting it
> takes her shop offline. The tidier arrangement — merge `bread/` into `main`, then repoint
> Netlify's production branch, in that order — was considered and deliberately not done; nothing
> about the app requires it.

Customers choose bread, a quantity and a pickup date, enter a name and phone
number, and pay by card on Stripe's hosted page (Apple Pay or Google Pay
where the device supports them). The order is confirmed the moment Stripe
confirms the payment — never by the customer landing on a success page. She
sees every order by pickup date, what to bake, can block days she is away,
and is shown any payment that does not add up. Nothing can be sold past her
capacity: the bread is reserved before the payment page opens and released
only once Stripe says the session can no longer complete.

A manual "Mark paid" remains in `/admin` for a cash or Zelle exception; it is
not the customer flow.

## Her photos, her name

The product cards show a drawn placeholder until real photos are in place, and
say so in their alt text — nothing on the page claims the drawings are her
bread. To use photos: put `sourdough.jpg` and `banana.jpg` (square-ish, at
least 400 px) in `public/bread/` and set `image: '/bread/sourdough.jpg'` on
each product in [`shared/config.ts`](shared/config.ts). The shop name,
tagline, pickup place, the "pickup spot only" sentence and the site URL are
all constants at the top of that file; the social preview image is
`public/og.png` (1200×630) and the home-screen icon `public/apple-touch-icon.png`.

## The rules, in one file

Prices, capacity, pickup days and hours, the 5 PM day-before cutoff, the hold window,
the timezone, the shop name and her Zelle details are all constants in
[`shared/config.ts`](shared/config.ts). Change one there, push, and both the
site and the server follow.

| Rule | Where |
|---|---|
| Sourdough $5 (3 per day), banana bread $3 (4 per day) | `PRODUCTS` |
| Monday, Wednesday, Thursday | `PICKUP_WEEKDAYS` |
| 5–11 PM, "best after 9 PM" | `PICKUP_START_HOUR`, `PICKUP_END_HOUR`, `PICKUP_PREFERRED_AFTER_HOUR` |
| Orders close at 5 PM the day before pickup (Mon → Sun 5 PM, Wed → Tue 5 PM, Thu → Wed 5 PM) — Biz, 2026-09-23 | `ORDER_CUTOFF_DAYS_BEFORE`, `ORDER_CUTOFF_HOUR` |
| Pickup at Life Time Fridley, the front desk | `PICKUP_PLACE`, `PICKUP_PLACE_WHERE` |
| Ingredients shown on each product, her words | `ingredients` on each of `PRODUCTS` |
| Missed pickup: no refund, she brings it on her next shift; her number on the site | `MISSED_PICKUP`, `CONTACT_PHONE` |
| A reservation holds bread for 3 hours awaiting Zelle | `PAYMENT_HOLD_HOURS` |
| Her Zelle name and handle (manual path only) | `ZELLE_NAME` (blank until she gives it; the page then shows the handle alone), `ZELLE_HANDLE` (set to `(612) 703-8698`) |
| Card checkout closes this many minutes before the deadline | `CARD_CHECKOUT_LEAD_MINUTES` (32: Stripe's page needs 30) |
| Reservation limits per address, and how often the page may ask Stripe | `MAX_CHECKOUTS_PER_IP`, `MAX_LIVE_HOLDS_PER_IP`, `CHECKOUT_WINDOW_MINUTES`, `RECONCILE_MIN_INTERVAL_MS` |
| Customers see the next 4 weeks | `WEEKS_AHEAD` |
| Name, tagline, pickup place and the not-affiliated note | `SHOP_NAME`, `TAGLINE`, `PICKUP_PLACE`, `PICKUP_PLACE_WHERE`, `PICKUP_PLACE_NOTE` |
| All times are Chicago time | `TIMEZONE` |

## Pages

- `/` — the order page: bread and quantities with prices → a pickup day that
  can take the whole order → name and phone → review (full date, hours, the
  after-9 preference, where, the deadline) → pay on Stripe's page. A day that
  cannot take the cart is explained, with *Reduce to what fits* and *Choose
  another day* as explicit choices; nothing is ever trimmed on its own. Sold
  out means sold; bread that is merely being paid for by someone else says
  so. What they chose survives Back from Stripe.
- `/thanks?order=…` — "checking your payment" until Stripe confirms, then
  the confirmed order (reference, items, total paid, pickup date, place and
  hours). Every check is server-side; refreshing is always safe.
- `/api/health` — how the deployed site is wired: database migrated, Stripe
  mode, admin configured, when the scheduled reconcile last ran and the last
  webhook arrived, whether test data is present, which live credentials are
  staged. Nothing about any customer, and no key values.
- `/admin` → **Going live →** — everything before real payments, from a
  phone: check Biz's Stripe account, test the checkout (charges nothing),
  create the live webhook, clear practice orders, and the one-variable
  switch (`STRIPE_MODE=live`). Runs on the site itself, which can reach
  Stripe.
- `/admin` — her page, one pickup date at a time, the next one first. Asks
  for the admin password once per phone and stays signed in for a month; the
  password itself is never sent again after that. Shows, per date, what to
  bake (paid orders still owed — never holds, never cancelled orders), every
  customer with a tappable phone number, what is paid / on hold / free of
  capacity, and a printable list. From there she marks bread picked up,
  blocks and unblocks dates (nothing on the date is cancelled or refunded —
  it says who keeps their bread), and records that a paid customer will not
  be getting bread, choosing whether the units go back on sale. Refunds are
  issued in Stripe (one tap to the payment) and mirrored back onto the
  order; a refund on its own never changes what she bakes.

## How an order moves

Everything below is a transaction against Postgres (Netlify DB in production,
the same engine in-process for the tests). The full design, schema, state
machine and Stripe lifecycle are in [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md);
what was verified — and what only a machine that can reach Stripe can verify —
is in [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md).

1. **Reserve.** `POST /api/checkout` validates everything on the server (a
   pickup day inside the 4-week window, before the deadline, known products,
   whole quantities within capacity, name, phone — browser prices are never
   read), locks the caller's address, then the phone number, then that
   date's row, and takes the whole cart with guarded updates: if any line
   cannot be had, nothing is taken. A `CHECK` constraint on the inventory
   table makes overselling impossible whatever the application does. The
   browser sends a one-time key with each attempt, so a retried request
   returns the same order and the same payment page. One address may start
   at most 12 checkouts in 15 minutes and hold at most 4 card orders at
   once; one phone number holds one card order at a time — starting again
   ends the previous attempt at Stripe first, so a customer who closed the
   payment page is never locked out by their own hold.
2. **Pay.** The server creates a Stripe Checkout Session from the reservation
   and the database's prices — cards only; wallets ride on that — under an
   idempotency key that is the order id, and sends the customer to it. The
   session expires at the ordering deadline or after 45 minutes, whichever
   is sooner. Because Stripe needs at least 30 minutes, **card checkout
   closes 32 minutes before a date's deadline**; the date shows as closed.
3. **Confirm.** Stripe's webhook (signature verified on the raw body) or the
   customer's own page (which asks the server, which asks Stripe) reports the
   session paid. One function checks it is our order, our amount, our
   currency, a one-off payment in the right mode, and converts the hold into
   paid inventory exactly once. Anything that does not add up keeps the stock
   held and appears on her admin page under *Payments that need a look*.
4. **Abandon.** A card hold is never released on a timer, a closed browser or
   the cancel link. Backing out ends the session at Stripe and the bread is
   released only on Stripe's word; abandoned sessions are settled the same
   way by the customer's page, by her admin page, by Stripe's expiry
   webhook, and — as a last resort — by a scheduled function every half
   hour. A session whose
   create never came back is re-created from the database — same prices,
   the origin the customer reserved from, a fresh expiry and key once the
   old ones have gone stale — and if the deadline is by then too near for
   any session, the hold is released; one that still cannot be made is
   flagged for her.

## Running it, launching it, handing it over

- [`docs/OWNER_GUIDE.md`](docs/OWNER_GUIDE.md) — for Biz: sign in, what to bake,
  phone numbers, pickups, blocking dates, refunds, flagged payments, help;
  backups, export and restore.
- [`docs/LAUNCH_INPUTS.md`](docs/LAUNCH_INPUTS.md) — the decisions only she can
  make (place, contact, terms, tax, allergens, photos, accounts). The name is
  settled: **Fresh Bread**.
- [`docs/BIZ_MESSAGES.md`](docs/BIZ_MESSAGES.md) — plain-language texts to send
  her, one thing at a time: activate Stripe, the five questions, the admin link.
- [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md) — dashboard actions,
  variable names, the webhook, Apple Pay, costs, the cutover and the rollback.
- [`docs/LAUNCH_READINESS.md`](docs/LAUNCH_READINESS.md) — what was audited,
  fixed and proven, and what is still unverified.

Operating scripts (each needs only what it says):

| Command | Needs | Does |
|---|---|---|
| `npm run smoke -- https://<site>` | nothing (`ADMIN_PASSWORD` in the shell adds a sign-in check) | proves the deployed site: health, availability, 404/400/401s, headers, scheduled job, webhook |
| `npm run launch:preflight -- https://<site>` | nothing | go / no-go before the first real customer: live key, migrated, no test data, no holds |
| `npm run stripe:verify` | `STRIPE_SECRET_KEY` in the shell | asks **Stripe** whether the account can really take a payment: charges and payouts enabled, nothing outstanding, descriptor, and a live webhook with every required event. Two GETs, charges nothing |
| `npm run stripe:setup-webhook` | `STRIPE_SECRET_KEY` in the shell | creates the webhook endpoint with exactly the events the app acts on and prints its signing secret (Stripe shows it only at creation). `--dry-run` shows what it would do. Never makes a duplicate |
| `npm run db:export -- --from … --to …` | `DATABASE_URL` | her orders as CSV |
| `npm run db:clear-orders -- --yes` | `DATABASE_URL` | wipes practice orders before launch; refuses while a real sale exists |
| `GET /api/health` | — | the same facts as JSON, nothing about any customer |

Data lives in Postgres: `products`, `pickup_dates` (with date blocks),
`date_inventory` (capacity and committed units per date and product),
`orders`, `order_items` (price snapshots), `payment_references` (the Stripe
session and payment intent per order), `payment_exceptions`,
`webhook_events`, and a `reservations` view. Migrations live in
`db/migrations/` and are applied automatically on every deploy — not by
Netlify's own database feature (unavailable on this account's plan; see "The
database" below), but by `npm run db:migrate` running as the first step of
the build itself, against any regular Postgres.

### What Stripe's page asks for

The app's form is name and phone. Stripe's hosted Checkout additionally
asks for an **email address** (it emails the receipt there) and the card
details; it does not ask for a phone number. Apple Pay appears on Safari on
an iPhone, iPad or Mac with a card in Wallet; Google Pay on Chrome with a
saved card. Neither can be forced, and this site draws no wallet button of
its own.

## Setting it up (once)

### 1. Stripe

1. Create a Stripe account in **her** name (the money lands in her bank; the
   fee, 2.9 % + 30 ¢ per US card payment, comes out of each order — 39 ¢ on a
   $3 banana bread).
2. **Developers → API keys**: copy the *test* secret key (`sk_test_…`) for
   now.
3. **Developers → Webhooks → Add endpoint**: `https://<site>/api/stripe-webhook`,
   events `checkout.session.completed`, `checkout.session.expired`,
   `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, and for refunds to show in her
   admin, `charge.refunded`, `charge.refund.updated`, `refund.created`,
   `refund.updated`, `refund.failed`. Copy the signing secret (`whsec_…`).
4. **Settings → Payment methods**: leave cards on, Apple Pay and Google Pay
   on (they are by default), and every delayed method (bank debits, buy now
   pay later) off — the code also restricts sessions to cards.
5. Put both values in Netlify (below), place a test order with card
   `4242 4242 4242 4242`, then swap to the live keys.

Test mode and live mode are separate worlds: the signing secret from a
test-mode endpoint cannot verify live events, and the code derives which mode
it is in from the key prefix and refuses a session that disagrees. Going live
means a live key **and** a second endpoint created in live mode.

The manual path keeps her Zelle details in [`shared/config.ts`](shared/config.ts);
`ZELLE_NAME` is still a placeholder there.

### 2. The database

Netlify sells a zero-config, auto-provisioned Postgres, but it isn't
available on this account's plan — a deploy with a
`netlify/database/migrations` directory present fails outright with
`database feature not available for this account`. So this app uses a
regular Postgres instead, reached over `DATABASE_URL` like any other Node
app would. Its migrations live in `db/migrations/` (outside the path
Netlify's build scans for its own feature) and `netlify.toml`'s build
command runs `npm run db:migrate` before `npm run build`, so they still
apply automatically on every deploy — no manual step and no Netlify plan
requirement. A local or preview build with no `DATABASE_URL` skips migrating
rather than failing, so a fresh site still builds; a **production** build
without one fails instead, because a production deploy that never migrated
looks green and then answers 503 on every request.

1. Create a free Postgres project — [neon.tech](https://neon.tech) is what
   this app was built and tested against (it's also what powers Netlify's
   own database product); Supabase or Railway work the same way. Copy the
   **connection string** it gives you (starts `postgresql://…`).
2. Put it in Netlify as `DATABASE_URL` (next step covers where); the next
   deploy applies the schema on its own. To apply it by hand instead
   (useful locally), from a machine with that connection string:
   ```bash
   DATABASE_URL='postgresql://…' npm run db:migrate
   ```
   Safe to re-run any time — it only applies migrations it hasn't seen.

### 3. Netlify

A project named **bread-pickup** already exists on the team
(https://app.netlify.com/projects/bread-pickup).

1. If not already linked: open it → **Project configuration → Build & deploy
   → Link repository**, and pick this repository and the branch to deploy
   from, with **Base directory** set to `bread`.
2. **Site configuration → Environment variables**, add:

   | Key | Value |
   |---|---|
   | `ADMIN_PASSWORD` | a password only she knows; wrong guesses are rate-limited server-side |
   | `STRIPE_SECRET_KEY` | from Stripe step 2 (test first, live at launch) |
   | `STRIPE_WEBHOOK_SECRET` | from Stripe step 3 |
   | `DATABASE_URL` | from the database step above |

   Leave **"Contains secret values" unchecked** on `DATABASE_URL`. Netlify
   hands secret-marked variables to the functions but withholds them from the
   *build*, and the build is what applies the migrations — marked secret, the
   schema is never created and the site answers 503 (this happened; see
   `docs/BUILD_STATUS.md`). The trade-off is that anyone signed in to the
   Netlify account can read them; nothing is bundled into the browser either
   way.

   Trigger a deploy after saving — environment changes apply only to builds
   that start after them.
3. Open the site, place a test order with `4242 4242 4242 4242`, and confirm
   `/thanks` flips to paid and `/admin` lists it as paid. Then run the
   real-Stripe checklist in `docs/BUILD_STATUS.md`.

Share the site's URL (or a QR code of it) at the front desk. `/admin` is only
for her.

## Run locally

```bash
npm install
npm run dev        # the pages, with /api/* failing until functions run
npm run verify     # typecheck + lint + tests — run before pushing
npm run build      # what Netlify runs
```

To run the functions locally against a database, use the Netlify CLI:
`npx netlify dev` with a `.env` copied from `.env.example` (it provisions a
Netlify DB branch for you), or point `DATABASE_URL` at any Postgres and run
`npm run db:migrate` first.

### Before changing dependencies

The deploy runs `npm ci` on a clean clone. `package-lock.json` must be committed
together with `package.json`, and `netlify.toml` sets `NPM_FLAGS=--include=dev`
because every build tool here is a devDependency. `pg` and `stripe` must stay
regular dependencies: the functions import them at runtime.

## Tests

`npm test` drives the real HTTP handlers against a real Postgres running
in-process (PGlite) that ran the real migrations, with an injectable clock
and Stripe replaced by a fake with the real API's idempotency behaviour:
concurrent buyers for the last loaf, mixed carts that roll back whole,
independent dates, blocked dates, forged requests, retried requests, lapsed
holds, late confirmations, the exact 5 PM day-before cutoff on both sides of a
daylight-saving change, the Stripe lifecycle (retries under one idempotency
key, the 32-minute deadline rule, timer-immunity of card holds, webhook
signatures, duplicates and ordering, mismatched payments, reconciliation and
the expire race), and a recount of the inventory ledger after every test.
None of that touches Stripe: the real-Stripe checklist is in
`docs/BUILD_STATUS.md`. `npm run test:pg` repeats the races on a real multi-connection Postgres
(`TEST_DATABASE_URL`), where transactions genuinely overlap.
