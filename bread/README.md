# Fresh Bread — pre-order and pay for pickup

Customers choose bread, a quantity and a pickup date, enter a name and phone
number, pay with card or Apple Pay, and get a confirmation. She sees every
order by pickup date, what to bake, and can block days she is away. Nothing can
be sold past her capacity, because the bread is reserved the moment a customer
taps *Pay* and released the moment they walk away.

## The rules, in one file

Prices, capacity, pickup days and hours, the 48-hour cutoff, the timezone and
the shop name are all constants in [`shared/config.ts`](shared/config.ts).
Change a number there, push, and both the site and the server follow.

| Rule | Where |
|---|---|
| Sourdough $5 (3 per day), banana bread $3 (4 per day) | `PRODUCTS` |
| Monday, Wednesday, Thursday | `PICKUP_WEEKDAYS` |
| 5–11 PM, "best after 9 PM" | `PICKUP_START_HOUR`, `PICKUP_END_HOUR`, `PICKUP_PREFERRED_AFTER_HOUR` |
| Orders close 48 h before the shift starts on the pickup date | `ORDER_CUTOFF_HOURS` |
| Customers see the next 4 weeks | `WEEKS_AHEAD` |
| All times are Chicago time | `TIMEZONE` |

## Pages

- `/` — the order page.
- `/thanks?session_id=…` — where Stripe sends the customer after paying.
- `/admin` — her page. Asks for the admin password once per browser tab.

## How an order moves

1. **Reserve.** `POST /api/checkout` checks the date is open and the
   quantities fit, then writes a 32-minute *hold* on that date's record. The
   write is conditional on the record not having changed since it was read
   (Netlify Blobs' `onlyIfMatch`), so two customers racing for the last loaf
   cannot both get it — one is told *sold out* before any money moves.
2. **Pay.** The customer is sent to Stripe Checkout (card, Apple Pay, Google
   Pay, Link). The session expires after 31 minutes.
3. **Settle.** Stripe calls `POST /api/stripe-webhook`. On
   `checkout.session.completed` the hold becomes a sale and the order is
   marked paid; on `checkout.session.expired` the hold is released. Every step
   is safe to repeat, because Stripe retries.
4. **Confirm.** `/thanks` reads the order. If the webhook has not landed yet
   it asks Stripe directly and settles the order itself, so the page is never
   wrong.
5. **Back out.** If the customer taps *back* on the Stripe page they return to
   `/?canceled=<session>`, which calls `POST /api/cancel`: the Stripe session
   is expired and the bread released immediately, so their own reservation
   cannot keep them from re-ordering.

Data lives in one Netlify Blobs store called `bread`: `day:YYYY-MM-DD`
(holds, sales, blocked flag, paid order ids), `order:<id>`, and
`session:<stripe session id>` → order id.

## Setting it up (once)

### 1. Stripe

1. Create a Stripe account at stripe.com in **her** name — the money goes to
   her bank account, and Stripe's fee (2.9% + 30¢ per payment in the US) comes
   out of each order. On a $3 banana bread that is 39¢.
2. **Developers → API keys**: copy the *Secret key*. Start with the test key
   (`sk_test_…`).
3. **Developers → Webhooks → Add endpoint**:
   - URL: `https://<your-site>/api/stripe-webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`
     (optionally also `checkout.session.async_payment_succeeded` and
     `checkout.session.async_payment_failed`)
   - Copy the *Signing secret* (`whsec_…`).
4. Apple Pay and Google Pay need nothing: Stripe Checkout shows them
   automatically on devices that support them.

### 2. Netlify

1. **Add new site → Import an existing project → this repository.**
2. Set **Base directory** to `bread`. The build command and publish directory
   come from `netlify.toml`.
3. **Site configuration → Environment variables**, add:

   | Key | Value |
   |---|---|
   | `STRIPE_SECRET_KEY` | the secret key from step 1.2 |
   | `STRIPE_WEBHOOK_SECRET` | the signing secret from step 1.3 |
   | `ADMIN_PASSWORD` | a password only she knows |

   Leave "Contains secret values" unchecked (secret-scoped variables do not
   always reach functions). Trigger a deploy after saving — environment
   changes apply only to builds that start after them.
4. Open the site, place a test order with card `4242 4242 4242 4242`, any
   future expiry, any CVC. Check `/admin` shows it. Then swap the two Stripe
   values for the live ones and redeploy.

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
`npx netlify dev` with a `.env` copied from `.env.example`. For webhooks
locally, `stripe listen --forward-to localhost:8888/api/stripe-webhook` and put
the `whsec_…` it prints into `.env`.

### Before changing dependencies

The deploy runs `npm ci` on a clean clone. `package-lock.json` must be committed
together with `package.json`, and `netlify.toml` sets `NPM_FLAGS=--include=dev`
because every build tool here is a devDependency.

## Tests

`tests/` drives the real functions against an in-memory Netlify Blobs that
honours etags, so the race that matters — ten people paying for three loaves at
once — is exercised for real: exactly three get through. The webhook, the
confirmation-page fallback, the cancel path, the 48-hour cutoff and admin
authentication are covered the same way.
