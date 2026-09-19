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

## Deploy (confirmed on a real Netlify deploy, 2026-09-19)

The first real deploy of this branch to the `bread-pickup` Netlify site failed:

```
API error on "createSiteDatabase"
403 Forbidden — "database feature not available for this account"
```

This is Netlify's own zero-config auto-provisioned database (the thing `docs/BUILD_PLAN.md`
previously flagged as *unverified* — now verified, and not available). Netlify's build scans for a
`netlify/database/migrations` directory and, if present, tries to auto-provision a database for
the site before it will build; this account's plan doesn't include that feature, so the build
failed outright before the app code ever ran.

**Fixed**: migrations moved to `db/migrations/` (outside the path Netlify's build scans), the
`@netlify/database` dependency dropped, and `netlify/lib/db/client.ts` now opens a plain `pg` pool
against `DATABASE_URL` — any Postgres, the same interface as before. Nothing about the schema,
transactions, or the rest of the app changed. Confirmed after the fix, in this sandbox:

- `npm run db:migrate` applies both migrations to a brand-new database, and is idempotent on a
  second run — the same as it will behave against a fresh external Postgres.
- The bundled `admin.ts` function (esbuild, `--platform=node`, matching `netlify.toml`) answers a
  real request through the new `pg`-based client against a real Postgres (HTTP 200), and answers a
  clean 503 `database_not_configured` rather than crashing when `DATABASE_URL` is unset.
- The whole automated suite (60 PGlite tests, 4 real-Postgres contention tests) still passes
  unchanged, since `Db`/`Queryable` didn't change shape.

**Follow-up, same day**: a real database (Neon, free tier) was created and its connection string
supplied. Automatic migration-on-deploy was restored — not through Netlify's unavailable feature,
but by putting `npm run db:migrate` in `netlify.toml`'s own build command, ahead of `npm run
build`, running on Netlify's build machine (which has normal internet access, unlike this
sandbox).

Two further problems were real, and both were found only on the live site — neither could have
been caught from here, and neither failed the deploy:

**The site was building the wrong directory.** `bread-pickup.netlify.app` served the *Niyyah*
app instead: same repository, different project. The deploy records settled it — the deploy that
was live had shipped Niyyah's functions (`cohort`, `couple`, `guide`, `keep`, `progress`,
`vouch`), an edge function and a header rule, none of which exist in `bread/`. The production
branch was already correct; what was missing was the project's **Base directory**, so Netlify
built the repository root. Setting it to `bread` fixed it, and the next deploy
(`6aade145bef6985aa454e807`) shipped exactly the seven bread functions (`admin`, `availability`,
`cancel`, `checkout`, `order`, `reconcile-stale`, `stripe-webhook`), the two redirects, no edge
functions, and registered `reconcile-stale` on its ten-minute schedule.

**Netlify hides "secret" environment variables from the build.** With the right app deployed, the
order page still read *Could not load the pickup dates* — the UI's message for a failing
`GET /api/availability`. `DATABASE_URL` and `STRIPE_SECRET_KEY` had been set marked *contains
secret values*; Netlify exposes those to functions but withholds them from the build environment.
So `npm run db:migrate`, the first half of the build command, saw no `DATABASE_URL`, printed its
skip message, exited 0, and the deploy went green **against a database that had never been
migrated**. Re-set without the secret flag, both variables now read back scoped to
`builds, functions, post_processing, runtime`.

That silent-success path is now closed: `scripts/migrate.ts` still skips (exit 0) with no
`DATABASE_URL` on a local or preview build, but a **production** build (`CONTEXT=production`)
without one prints why and exits 1, failing the deploy instead of shipping a site where every
request answers 503. Covered by a test in `tests/deploy-layout.test.ts` that runs the script both
ways. The trade-off accepted for the variables themselves: anyone already signed in to the Netlify
account can read them in the dashboard. Neither is ever bundled into the browser.

Verified in this sandbox: the skip path, the new production failure, and — against a locally
spun-up Postgres reached over plain TCP (standing in for the no-SSL, `isLocal` branch) — both the
first successful run and a second, idempotent no-op run.
**Still not confirmed from here**: the TLS branch against a real managed Postgres. This sandbox's
egress proxy blocks `*.neon.tech` and `*.netlify.app`, so the Neon handshake and the live
`/api/availability` response can only be confirmed from the user's browser or the Netlify build
log, not from here. An earlier claim in this session that the Neon connection had been tested from
this sandbox was wrong — the attempt had been blocked by the proxy, not completed.

## Verified here (automated, Stripe faked)

Run on 2026-09-18 in this sandbox. **Stripe's API is unreachable from here** (`api.stripe.com`
refused by the egress proxy), so everything below runs against a fake gateway that reproduces the
real API's idempotency behaviour and session states. **None of it is a Stripe test.**

| Check | Result |
|---|---|
| `npm run typecheck`, `npm run lint`, `npm run build` | pass (2 pre-existing lint warnings, unchanged) |
| `npm test` on PGlite (Postgres 18 in-process), Stripe faked | **60 passed**, 4 skipped |
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
   (a free Neon/Supabase project — see README). `npm run db:migrate` once.
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

Also untested from here: Netlify's scheduled-function runtime for `reconcile-stale`, a real TLS
handshake against a managed Postgres (see "Deploy" above), and the pages against a live API (the
previous stage's stubbed screenshots predate the new checking/attention states). Netlify DB
provisioning/claim is no longer applicable — see "Deploy" above: it isn't available on this
account's plan, so the app no longer depends on it.

## Remaining before launch

- Her Stripe account, live keys and the webhook endpoint in Netlify; Dashboard wallet settings
  left on, delayed methods off.
- Biz's confirmation of the 32-minute checkout-start rule (or a switch to the grace period).
- `ZELLE_NAME` in `shared/config.ts` is still a placeholder (manual path only).
- Refunds are done in the Stripe Dashboard; the app records the exception but has no refund action.
