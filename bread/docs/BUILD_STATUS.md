# Build status — Stripe Checkout on the inventory lifecycle

Branch `claude/bread-ordering-app-fujfkj`, directory `bread/`. Design in
[`BUILD_PLAN.md`](BUILD_PLAN.md). Earlier stages (database, ordering rules) remain as recorded
there; this file is the current state.

## Done

- **Stripe-hosted Checkout** is the customer payment: cards, with Apple Pay / Google Pay offered
  by Stripe's page where the device is eligible; `payment_method_types: ['card']` keeps every
  delayed-settlement method out. No wallet button is drawn by this site. Test keys are all that is
  required for development; the code refuses nothing in test mode and flags a live/test mix as an
  exception.
- **Sessions are built on the server** from the validated reservation and the database's
  snapshotted prices, under an idempotency key that is the order id, so retries and double-clicks
  produce one order and one session. Secret keys are server-only; card data never touches the app.
- **Expiry is coordinated with the hold**: the session expires at the ordering deadline or after
  45 minutes; the hold is only a reminder of when to ask Stripe. A card hold is **never released by
  a timer, a closed browser or the cancel URL** — only after Stripe reports the session expired (or
  after we expire it and Stripe confirms), and then exactly once. Abandoned and uncertain sessions
  are reconciled from the customer's page, the admin page, the webhook and a scheduled function.
- **Strict deadline rule** implemented: card checkout closes 32 minutes before the displayed
  deadline; sessions never outlive the deadline; a late order cannot be accepted. The rule and the
  unbuilt grace-period alternative are written up in BUILD_PLAN for Biz's confirmation.
- **Webhook** verifies the signature on the raw body, logs each event id, and tolerates
  duplicates, delays and reordering. Payment status, amount, currency, mode, livemode and order
  association are checked in **one shared idempotent `finalizePayment`**, used by the webhook, the
  customer's page (server-side; a success URL alone never marks anything paid) and reconciliation.
  A payment that does not add up keeps the stock held and shows on the admin page under *Payments
  that need a look*; a payment completed while the app or webhook endpoint was down is recovered
  by any later poll, admin load or scheduled run.
- **Confirmation page** shows *checking your payment* (server-verified polls, safe to refresh,
  capped), then order reference, items, quantities, total paid, pickup date, Life Time, and
  "5–11 PM; after 9 PM preferred". Orders are addressed by their v4 UUID; the public summary
  carries no phone number and reveals no other order.
- **The app's form stays name and phone.** Stripe's hosted page additionally requires an **email
  address** (Stripe emails the receipt there); it does not ask for a phone. No SMS is sent or
  claimed.
- Manual "Mark paid" (cash / Zelle) remains in admin and, on a card order, ends the Stripe session
  first; a card payment arriving afterwards is flagged as a duplicate, never double-counted.

## Verified here (automated, Stripe faked)

Run on 2026-09-18 in this sandbox. **Stripe's API is unreachable from here** (`api.stripe.com`
refused by the egress proxy), so everything below runs against a fake gateway that reproduces the
real API's idempotency behaviour and session states. **None of it is a Stripe test.**

| Check | Result |
|---|---|
| `npm run typecheck`, `npm run lint`, `npm run build` | pass (2 pre-existing lint warnings, unchanged) |
| `npm test` on PGlite (Postgres 18 in-process), Stripe faked | **58 passed**, 4 skipped |
| `npm run test:pg` on a real Postgres 16.13, 12 connections | **4 passed** |
| `npm run db:migrate` (both migrations) against the real Postgres | applies, then "up to date" |
| Root Niyyah suite, bread excluded | 227 passed |

What the Stripe suite (`tests/stripe.test.ts`) proves about the app's side:

- Session parameters are identical across retries and price changes (one create, one session);
  a failed create leaves the reservation standing and the retry or the page recovers the session
  under the same key; a session id that never reached the database is recovered.
- `closing_soon` at 32 minutes before the deadline, a session that ends exactly at the deadline
  when started 33 minutes out, and `payments_not_configured` when Stripe is absent.
- A card hold survives 24 hours of timers, the availability query, the order page and another
  buyer's sweep while its session is open and Stripe is unreachable.
- Release happens exactly once on Stripe's `expired`; backing out ends the session at Stripe first;
  a payment landing during our expire wins; an abandoned session past its time is expired by
  reconciliation, and when Stripe refuses, the stock stays held with an `expire_uncertain` flag.
- Webhook: bad signature → 400 and nothing changes; the same event twice → once; `expired` after
  `completed` → no change; a stale "completed, unpaid" snapshot → reconciled from the live session;
  a payment for already-released stock → honoured over capacity and flagged; amount, currency,
  order, mode and livemode mismatches → stock kept, one exception each, no pile-up on repeats; a
  decline leaves the session open and the bread held; webhook and page arriving together → one
  paid order, one succeeded reference.
- Admin cancel on a card order ends the session first and reports `already_paid` if the customer
  had paid; a hand "Mark paid" on a card order closes its session and records a manual reference.
- The inventory ledger recount holds after every test.

## Not executed: real Stripe (needs credentials and a machine that can reach Stripe)

The following **have not been run against Stripe** in any mode. Missing here: a Stripe test
secret key and webhook signing secret, and network access to `api.stripe.com`. Run this on a
laptop with her test keys and paste the results into this section (with event ids from the
Dashboard):

1. `cp .env.example .env`; set `STRIPE_SECRET_KEY=sk_test_…`, `ADMIN_PASSWORD`, and `DATABASE_URL`
   (or `netlify dev` for a Netlify DB branch). `npm run db:migrate` if using your own Postgres.
2. `stripe listen --forward-to localhost:8888/api/stripe-webhook`; put its `whsec_…` in `.env`;
   `npx netlify dev`.
3. **Success**: order, pay with `4242 4242 4242 4242` → `/thanks` shows *checking* then *paid*;
   `/admin` lists it paid; Dashboard amount equals the order total.
4. **3-D Secure**: `4000 0025 0000 3155`, complete the challenge → paid.
5. **Decline**: `4000 0000 0000 0002` → session stays open, order stays reserved and held in
   `/admin`; then pay with 4242 on the same page → paid.
6. **Duplicate submission**: double-tap Pay / reload the order page mid-submit → one order, one
   session in the Dashboard, one charge.
7. **Abandoned session**: close Stripe's page; confirm the bread stays held; wait for
   `checkout.session.expired` (or `stripe trigger`) → released once; admin load and the scheduled
   function on an old session behave the same.
8. **Cancel URL**: tap back on Stripe's page → session shows expired in the Dashboard, bread
   released; pay from a stale tab is refused by Stripe.
9. **Webhook down**: stop `stripe listen`, pay, restart → `/thanks` polling recovers the paid
   state; the replayed webhook is a no-op.
10. **Delayed/repeated webhooks**: `stripe events resend <evt>` twice → no change.
11. **Deadline**: with the clock 31 minutes before a date's cutoff, checkout answers
    `closing_soon`; at 33 minutes the session expires at the cutoff.
12. **Apple Pay**: on Safari with a Wallet card, confirm the button appears on Stripe's page; note
    the devices it did not appear on.

Also untested from here, as before: Netlify DB provisioning/claim, automatic migrations on deploy,
Netlify's bundler and scheduled-function runtime for `reconcile-stale`, Neon's pooler behaviour,
and the pages against a live API (the previous stage's stubbed screenshots predate the new
checking/attention states).

## Remaining before launch

- Her Stripe account, live keys and the webhook endpoint in Netlify; Dashboard wallet settings
  left on, delayed methods off.
- Biz's confirmation of the 32-minute checkout-start rule (or a switch to the grace period).
- `ZELLE_NAME` in `shared/config.ts` is still a placeholder (manual path only).
- Refunds are done in the Stripe Dashboard; the app records the exception but has no refund action.
