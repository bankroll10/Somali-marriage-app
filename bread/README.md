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
| Her Zelle name and handle | `ZELLE_NAME`, `ZELLE_HANDLE` — **placeholders, must be filled in before launch** |
| Customers see the next 4 weeks | `WEEKS_AHEAD` |
| All times are Chicago time | `TIMEZONE` |

## Pages

- `/` — the order page.
- `/thanks?order=…` — Zelle instructions while a reservation is pending, then
  the confirmed order once she's marked it paid. Stays open and updates on
  its own.
- `/admin` — her page. Asks for the admin password once per browser tab.

## How an order moves

1. **Reserve.** `POST /api/checkout` checks the date is open and the
   quantities fit, then writes a hold on that date's record for
   `PAYMENT_HOLD_HOURS`. The write is conditional on the record not having
   changed since it was read (Netlify Blobs' `onlyIfMatch`), so two customers
   racing for the last loaf cannot both get it — one is told *sold out*
   before either has sent a dollar.
2. **Pay.** The customer sees her Zelle name, handle and the exact amount on
   `/thanks`, with the order's short code as a memo so payments are easy to
   match. She checks her phone during her shift.
3. **Confirm.** She taps **Mark paid** in `/admin`. The hold becomes a sale,
   and the customer's own `/thanks` tab (if still open) updates within
   seconds. If she checks in after a hold has already lapsed, confirming is
   still allowed as long as there's room; if it would push a product past its
   daily capacity, she's shown a warning and has to explicitly confirm
   anyway.
4. **Lapse.** If nobody pays within the hold window, the reservation is
   released automatically — no cron job or cleanup needed, the same
   conditional-write logic simply stops counting an expired hold. The
   customer's `/thanks` page reflects this as "expired" the next time it's
   read, and she can also cancel a pending order herself from `/admin` at any
   time (a no-show, or a customer who asked to).

Data lives in one Netlify Blobs store called `bread`: `day:YYYY-MM-DD`
(holds, sales, blocked flag, paid order ids), and `order:<id>`.

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

Open [`shared/config.ts`](shared/config.ts) and replace the two placeholders:

```ts
export const ZELLE_NAME = '<her name on Zelle>'
export const ZELLE_HANDLE = '<the email or phone her Zelle is registered to>'
```

Whatever's there ships straight to every customer's confirmation page, so get
these right before going live.

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
4. Open the site, place a test order, and confirm `/admin` shows it as
   awaiting Zelle. Tap **Mark paid** and confirm the customer-facing
   `/thanks` page updates.

Share the site's URL (or a QR code of it) at the front desk. `/admin` is only
for her.

## Run locally

```bash
npm install
npm run dev        # the pages, with /api/* failing until functions run
npm run verify     # typecheck + lint + tests — run before pushing
npm run build      # what Netlify runs
```

To run the functions and a sandboxed blob store locally, use the Netlify CLI:
`npx netlify dev` with a `.env` copied from `.env.example`.

### Before changing dependencies

The deploy runs `npm ci` on a clean clone. `package-lock.json` must be committed
together with `package.json`, and `netlify.toml` sets `NPM_FLAGS=--include=dev`
because every build tool here is a devDependency.

## Tests

`tests/` drives the real functions against an in-memory Netlify Blobs that
honours etags, so the race that matters — ten people reserving three loaves at
once — is exercised for real: exactly three get through. Marking an order
paid (including a late confirmation after a hold has lapsed, and the
capacity-exceeded warning), cancelling a reservation, the confirmation
page's self-healing, the 48-hour cutoff and admin authentication are covered
the same way.
