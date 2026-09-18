# Fresh Bread — pre-order and pay for pickup

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

## The rules, in one file

Prices, capacity, pickup days and hours, the 48-hour cutoff, the hold window,
the timezone, the shop name and her Zelle details are all constants in
[`shared/config.ts`](shared/config.ts). Change one there, push, and both the
site and the server follow.

| Rule | Where |
|---|---|
| Sourdough $5 (3 per day), banana bread $3 (4 per day) | `PRODUCTS` |
| Monday, Wednesday, Thursday | `PICKUP_WEEKDAYS` |
| 5–11 PM, "best after 9 PM" | `PICKUP_START_HOUR`, `PICKUP_END_HOUR`, `PICKUP_PREFERRED_AFTER_HOUR` |
| Orders close 48 h before the shift starts on the pickup date | `ORDER_CUTOFF_HOURS` |
| A reservation holds bread for 3 hours awaiting Zelle | `PAYMENT_HOLD_HOURS` |
| Her Zelle name and handle | `ZELLE_NAME` (**placeholder — still needs her name**), `ZELLE_HANDLE` (set to `(612) 703-8698`) |
| Customers see the next 4 weeks | `WEEKS_AHEAD` |
| All times are Chicago time | `TIMEZONE` |

## Pages

- `/` — the order page.
- `/thanks?order=…` — "checking your payment" until Stripe confirms, then
  the confirmed order (reference, items, total paid, pickup date, place and
  hours). Every check is server-side; refreshing is always safe.
- `/admin` — her page. Asks for the admin password once per browser tab.

## How an order moves

Everything below is a transaction against Postgres (Netlify DB in production,
the same engine in-process for the tests). The full design, schema, state
machine and Stripe lifecycle are in [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md);
what was verified — and what only a machine that can reach Stripe can verify —
is in [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md).

1. **Reserve.** `POST /api/checkout` validates everything on the server (a
   pickup day inside the 4-week window, before the deadline, known products,
   whole quantities within capacity, name, phone — browser prices are never
   read), locks that date's row, and takes the whole cart with guarded
   updates: if any line cannot be had, nothing is taken. A `CHECK` constraint
   on the inventory table makes overselling impossible whatever the
   application does. The browser sends a one-time key with each attempt, so a
   retried request returns the same order and the same payment page.
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
   webhook, and by a scheduled function every ten minutes.

Data lives in Postgres: `products`, `pickup_dates` (with date blocks),
`date_inventory` (capacity and committed units per date and product),
`orders`, `order_items` (price snapshots), `payment_references` (the Stripe
session and payment intent per order), `payment_exceptions`,
`webhook_events`, and a `reservations` view. Migrations live in
`netlify/database/migrations/` and Netlify applies them on deploy.

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
   `checkout.session.async_payment_failed`. Copy the signing secret
   (`whsec_…`).
4. **Settings → Payment methods**: leave cards on, Apple Pay and Google Pay
   on (they are by default), and every delayed method (bank debits, buy now
   pay later) off — the code also restricts sessions to cards.
5. Put both values in Netlify (below), place a test order with card
   `4242 4242 4242 4242`, then swap to the live keys.

The manual path keeps her Zelle details in [`shared/config.ts`](shared/config.ts);
`ZELLE_NAME` is still a placeholder there.

### 2. Netlify

A project named **bread-pickup** already exists on the team
(https://app.netlify.com/projects/bread-pickup) with nothing deployed to it.

1. Open it → **Project configuration → Build & deploy → Link repository**, and
   pick this repository and the branch to deploy from.
2. Set **Base directory** to `bread`. The build command and publish directory
   come from `netlify.toml`.
3. **Site configuration → Environment variables**, add:

   | Key | Value |
   |---|---|
   | `ADMIN_PASSWORD` | a password only she knows |
   | `STRIPE_SECRET_KEY` | from Stripe step 2 (test first, live at launch) |
   | `STRIPE_WEBHOOK_SECRET` | from Stripe step 3 |

   Trigger a deploy after saving — environment changes apply only to builds
   that start after them.
4. **The database provisions itself.** `@netlify/database` is a dependency,
   so the first deploy creates a Postgres (Netlify DB, on Neon) for the site,
   sets `NETLIFY_DB_URL`, and applies `netlify/database/migrations/`. Nothing
   to paste. Two things to check in the Netlify UI after that deploy: that
   the database appears under the site's **Database** section, and whether it
   asks to be *claimed* to a Neon account — unclaimed Netlify DB databases
   have had a 7-day expiry; claim it so the orders are not deleted.
5. Open the site, place a test order with `4242 4242 4242 4242`, and confirm
   `/thanks` flips to paid and `/admin` lists it as paid. Then run the
   real-Stripe checklist in `docs/BUILD_STATUS.md`.

If Netlify DB is ever unsuitable, any Postgres works: set `DATABASE_URL` in
Netlify, run `npm run db:migrate` against it once, and redeploy.

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
because every build tool here is a devDependency. `@netlify/database` must stay
a regular dependency: the functions import it at runtime.

## Tests

`npm test` drives the real HTTP handlers against a real Postgres running
in-process (PGlite) that ran the real migrations, with an injectable clock
and Stripe replaced by a fake with the real API's idempotency behaviour:
concurrent buyers for the last loaf, mixed carts that roll back whole,
independent dates, blocked dates, forged requests, retried requests, lapsed
holds, late confirmations, the exact 48-hour cutoff on both sides of a
daylight-saving change, the Stripe lifecycle (retries under one idempotency
key, the 32-minute deadline rule, timer-immunity of card holds, webhook
signatures, duplicates and ordering, mismatched payments, reconciliation and
the expire race), and a recount of the inventory ledger after every test.
None of that touches Stripe: the real-Stripe checklist is in
`docs/BUILD_STATUS.md`. `npm run test:pg` repeats the races on a real multi-connection Postgres
(`TEST_DATABASE_URL`), where transactions genuinely overlap.
