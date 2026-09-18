# Fresh Bread — pre-order for pickup, pay by Zelle

Customers choose bread, a quantity and a pickup date, enter a name and phone
number, and reserve it. She's paid by Zelle, outside this app — the order
page shows her Zelle details, and she confirms each payment herself in
`/admin`. She sees every order by pickup date, what to bake, and can block
days she is away. Nothing can be sold past her capacity, because the bread is
reserved the moment a customer taps *Reserve* and released automatically if
nobody pays within the hold window.

There is no payment processor and no per-transaction fee. The trade-off is
that confirming payment is manual: she has to notice the Zelle and tap **Mark
paid**. See "How an order moves" below for what that means in practice.

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
- `/thanks?order=…` — Zelle instructions while a reservation is pending, then
  the confirmed order once she's marked it paid. Stays open and updates on
  its own.
- `/admin` — her page. Asks for the admin password once per browser tab.

## How an order moves

Everything below is a transaction against Postgres (Netlify DB in production,
the same engine in-process for the tests). The full design, schema and state
machine are in [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md); what was verified
is in [`docs/BUILD_STATUS.md`](docs/BUILD_STATUS.md).

1. **Reserve.** `POST /api/checkout` validates everything on the server (a
   pickup day inside the 4-week window, before the 48-hour cutoff, known
   products, whole quantities within capacity, name, phone — browser prices
   are never read), locks that date's row, and takes the whole cart with
   guarded updates: if any line cannot be had, nothing is taken and the answer
   is *sold out* with what is actually left. A `CHECK` constraint on the
   inventory table makes overselling impossible whatever the application
   does. The browser sends a one-time key with each attempt, so a retried
   request returns the same order instead of reserving twice.
2. **Pay.** The customer sees her Zelle name, handle and the exact amount on
   `/thanks`, with the order's short code as a memo. She checks her phone
   during her shift.
3. **Confirm.** She taps **Mark paid** in `/admin`. The hold becomes a sale;
   the customer's `/thanks` tab, if still open, updates within seconds. If
   the hold had already lapsed and someone else took the bread, she is shown
   the shortfall and can still confirm, which records the extra she has
   agreed to bake for that date.
4. **Lapse.** A hold nobody confirms within `PAYMENT_HOLD_HOURS` counts as
   free from that moment (no job needs to run) and is expired on the next
   write to that date. She can also cancel a reservation herself.

Data lives in Postgres: `products`, `pickup_dates` (with date blocks),
`date_inventory` (capacity and committed units per date and product),
`orders`, `order_items` (price snapshots), `payment_references`, and a
`reservations` view. Migrations live in `netlify/database/migrations/` and
Netlify applies them on deploy.

### A trade-off worth knowing

Because Zelle has no way to tell the app a payment landed, the hold window is
the only thing standing between "reserved" and "someone else could have taken
it." Three hours (the default) is long enough she can reasonably notice
during a shift, short enough that one forgetful customer can't sit on the
day's only sourdough for the whole day. If she's regularly missing that
window, shorten it; if three hours is too tight, lengthen it — it's the one
`PAYMENT_HOLD_HOURS` constant.

## Setting it up (once)

### 1. Her Zelle details

Her Zelle handle is already set in [`shared/config.ts`](shared/config.ts) to
her phone number, `(612) 703-8698`. `ZELLE_NAME` still needs her real name as
it appears on Zelle — replace the placeholder before going live:

```ts
export const ZELLE_NAME = '<her name on Zelle>'
export const ZELLE_HANDLE = '(612) 703-8698'
```

Whatever's there ships straight to every customer's confirmation page.

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

   Trigger a deploy after saving — environment changes apply only to builds
   that start after them.
4. **The database provisions itself.** `@netlify/database` is a dependency,
   so the first deploy creates a Postgres (Netlify DB, on Neon) for the site,
   sets `NETLIFY_DB_URL`, and applies `netlify/database/migrations/`. Nothing
   to paste. Two things to check in the Netlify UI after that deploy: that
   the database appears under the site's **Database** section, and whether it
   asks to be *claimed* to a Neon account — unclaimed Netlify DB databases
   have had a 7-day expiry; claim it so the orders are not deleted.
5. Open the site, place a test order, and confirm `/admin` shows it as
   awaiting Zelle. Tap **Mark paid** and confirm the customer-facing
   `/thanks` page updates.

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
in-process (PGlite) that ran the real migration, with an injectable clock:
concurrent buyers for the last loaf, mixed carts that roll back whole,
independent dates, blocked dates, forged requests, retried requests, lapsed
holds, late confirmations, the exact 48-hour cutoff on both sides of a
daylight-saving change, and a recount of the inventory ledger after every
test. `npm run test:pg` repeats the races on a real multi-connection Postgres
(`TEST_DATABASE_URL`), where transactions genuinely overlap.
