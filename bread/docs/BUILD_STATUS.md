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

**The deploy branch is production.** Netlify's `bread-pickup` project builds
`claude/bread-ordering-app-fujfkj` with base directory `bread`, so every push to that branch
deploys the live site — there is no merge step and `main` carries none of this. That branch must
not be deleted or renamed before Netlify's production-branch setting is changed, however
disposable its name looks next to the repo's other `claude/*` branches. Moving to `main` and
repointing Netlify (in that order, or the site has no branch to build for a moment) is the tidier
arrangement and was deliberately left undone.

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
**Now confirmed on the live site**: the TLS branch against a real managed Postgres works. Deploy
`6aade3b0530b2d0007894144` (context `production`, commit `c37d477`) built green *with the new
guard in place* — which it could not have done had `DATABASE_URL` been missing or had
`applyMigrations` thrown — and the user then loaded `/api/availability`, which returned real JSON,
and the order page, which rendered the Mon/Wed/Thu chips with per-product counts. So the build
machine and the functions both reach Neon over TLS.

Still not confirmed *from this sandbox*, and it never will be: the egress proxy blocks
`*.neon.tech` and `*.netlify.app`, so every live check above is the user's browser, not mine. An
earlier claim in this session that the Neon connection had been tested from here was wrong — that
attempt had been blocked by the proxy, not completed.

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

## Configured on the live site (2026-09-19)

Everything the app needs at runtime is now set on the `bread-pickup` Netlify project, in **Stripe
test mode**:

| Variable | Read by | State |
|---|---|---|
| `DATABASE_URL` | the build (migrations) **and** the functions | Neon, pooled, TLS |
| `STRIPE_SECRET_KEY` | functions only (`stripe/gateway.ts`) | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | functions only (`stripe/gateway.ts`) | `whsec_…`, test mode |
| `ADMIN_PASSWORD` | functions only (`lib/http.ts`) | set |

Biz created the webhook endpoint herself at `https://bread-pickup.netlify.app/api/stripe-webhook`
in test mode, subscribed to the `checkout.session.*` events. The handler ignores any event that
carries no `checkout.session` object (`lib/app.ts:263`), so extra subscriptions are harmless
no-ops that only add a row to `webhook_events`.

**Test mode must match the key.** `gateway.ts:87` derives `livemode` from whether the secret key
starts with `sk_live_`, and `payments.ts:157` refuses a session whose `livemode` disagrees. A
live-mode signing secret would also fail signature verification outright. Going live therefore
needs *both* a live key and a **second, live-mode webhook endpoint** with its own signing secret.

**None of these variables is marked "contains secret values."** That is deliberate. Netlify's API
returns nothing at all for secret-marked variables, and an unreadable configuration is exactly
what made the previous outage invisible — the deploy went green while the database was never
migrated. After two silent misconfigurations, being able to read the live state back is worth more
than masking values in a dashboard only the owner can open. `DATABASE_URL` has no choice in the
matter: the build migrates with it. Nothing is bundled into the browser either way.

## Against real Stripe (test mode)

The app has now taken a real card payment. Everything in the previous section ran against a fake
gateway and is not a Stripe test; this section is only what was executed against Stripe itself.

None of it was run from this sandbox, which cannot reach `api.stripe.com`, `*.neon.tech` or
`*.netlify.app` — its egress proxy refuses all three. Every result below was observed by the
project owner in a browser against **https://bread-pickup.netlify.app** on deploy
`6aadf52031905a0008e7f46d`, with Stripe in test mode; my own checks are limited to the Netlify
deploy and environment APIs and the local suite.

### Executed

**1. Success — passed (2026-09-19).** Ordered, paid with `4242 4242 4242 4242`. `/thanks` showed
*checking your payment* and then the confirmed order; `/admin` listed it paid and that date's
remaining count had dropped by the quantity bought. So, end to end and for the first time: a
Checkout Session created from the reservation's snapshotted prices, a real charge at Stripe,
`finalizePayment` converting the hold into paid inventory, and the confirmation page refusing to
claim anything the server had not verified.

**2. Webhook delivery — passed (2026-09-19).** The `stripe-webhook` function log in Netlify shows
invocations after the signing secret was configured, matching the test order, and **no**
`[bread] webhook: signature rejected` line. The success path logs nothing but its duration, so a
quiet invocation is a verified signature and a 200. Stripe is genuinely reaching the endpoint and
the test-mode secret matches, which settles the question below.

**What that pass did not settle by itself.** `app.ts:233-241` makes every `/thanks`
poll a server-side `reconcileOrder`, so the order would have flipped to paid whether or not
Stripe's webhook arrived. The customer-visible result is identical either way, so test 1 does not
distinguish them. It matters only for a buyer who closes the tab immediately: with the webhook
working the bread is settled at once, without it the hold stands until the ten-minute
`reconcile-stale` run. Resolved by case 2 above: the webhook is arriving, so a paid order is
settled immediately rather than waiting on the customer's page.

**3. Database TLS — found and corrected (2026-09-19).** Reading that same function log turned up a
warning on every cold start: `pg` announcing that `sslmode=require` is currently treated as
`verify-full` and will stop being, in `pg` 9. Following it up showed the app had been passing
`ssl: { rejectUnauthorized: false }` beside the connection string and that option was **never in
effect** — `pg`'s ConnectionParameters does `Object.assign({}, config, parse(
config.connectionString))`, so `sslmode` in the URL wins. The database connection was therefore
fully verified, by accident rather than intent, and a later dependency bump would have silently
downgraded it to unverified. `poolConfig()` in `netlify/lib/db/client.ts` now settles SSL inside
the connection string — `verify-full` for a managed Postgres, off for localhost — and
`tests/db-ssl.test.ts` asserts what `pg` *resolves*, not what we hand it.

**4. Decline, then retry on the same session — passed (2026-09-19).** Ordered a banana bread on a
date with all 4 free, paid with `4000 0000 0000 0002`. Stripe refused the card and kept the
customer on its page. `/admin` then showed, with nothing else touched:

- the order listed under that date as a card order, amber, not paid, with the copy *"The customer
  is on Stripe's page or has left it"*;
- **3 banana bread left, not 4** — the declined payment did **not** hand the bread back while a
  customer was still standing at the till trying to buy it. This is the failure that oversells a
  date, and it did not happen;
- *To bake: nothing yet* — the bake list counts paid orders only, so a hold never puts flour on
  her counter.

Paying again with `4242 4242 4242 4242` on that same Stripe page then completed it, and `/admin`
showed **the same order reference**, now paid, with the date **still reading 3 left** and *to
bake: 1 banana bread*. So the retry reused one session and one order rather than creating a
second, the hold converted into a sale rather than decrementing twice, and the bake list picked it
up only once paid. A neighbouring Thursday stayed at its full 3 and 4 throughout, which is
per-date capacity holding independently on live data.

**5. Capacity held across separate browsers — passed (2026-09-19).** Two orders were started for
Thursday Sep 24 from two different browsers, the second in a private window with no shared cookies
or storage. The second browser's order page read *"Only 2 left for Thu, Sep 24"* — that date's
capacity of 4 minus the two live holds — and `/admin` agreed: two reserved card orders, 2 left,
nothing in the bake list. This is the requirement the whole app exists for, that two strangers on
two devices cannot buy the same loaf, holding on live data rather than in the suite.

### Not executed yet

Run against the same site, Stripe Dashboard in test mode. Cases 5 and 6 need the Stripe CLI
(`stripe listen`, `stripe events resend`) and are easier locally: copy `.env.example` to `.env`
with the same four variables, `npm run db:migrate`, then `npx netlify dev`.

1. **Cancel URL**: use **Stripe's own back link on its page** → session shows expired in the
   Dashboard, bread released. The complement of case 4: that proved stock is not released when it
   must not be, this proves it *is* released when it should be, so capacity cannot leak.

   The browser's back button is **not** this test, and neither is closing the tab. Only Stripe's
   link navigates to `cancel_url` (`app.ts:112`, `/?canceled=<order id>`), which is the parameter
   `Order.tsx:26` looks for before calling `cancelCheckout`. Going back through history lands on
   `/` with no parameter, nothing fires, and the hold correctly stands — which already produced one
   false negative when this was attempted. The confirmation that the path ran is the banner on the
   order page: *"No payment was made. Your reservation is being released."* Without that banner,
   the test did not happen.
2. **Duplicate submission**: double-tap Pay / reload the order page mid-submit → one order, one
   session in the Dashboard, one charge.
3. **3-D Secure**: `4000 0025 0000 3155`, complete the challenge → paid.
4. **Abandoned session**: close Stripe's page; confirm the bread stays held; wait for
   `checkout.session.expired` (or `stripe trigger`) → released once; admin load and the scheduled
   function on an old session behave the same.
5. **Webhook down**: stop `stripe listen`, pay, restart → `/thanks` polling recovers the paid
   state; the replayed webhook is a no-op.
6. **Delayed/repeated webhooks**: `stripe events resend <evt>` twice → no change.
7. **Deadline**: with the clock 31 minutes before a date's cutoff, checkout answers
    `closing_soon`; at 33 minutes the session expires at the cutoff.
8. **Apple Pay**: on Safari with a Wallet card, confirm the button appears on Stripe's page; note
    the devices it did not appear on.

Also untested: Netlify's scheduled-function runtime for `reconcile-stale` (the schedule is
registered on the deploy, but no run has been observed doing work), and the `/thanks` and `/admin`
pages against a live API — the previous stage's stubbed screenshots predate the new
checking/attention states. Netlify DB
provisioning/claim is no longer applicable — see "Deploy" above: it isn't available on this
account's plan, so the app no longer depends on it.

## Remaining before launch

- **Clear the test orders.** Testing has placed real rows on real pickup dates (Sep 21, 23 and 24
  so far), which occupy capacity. Left in place, Biz opens with phantom sales and fewer loaves to
  sell than she has. Delete them, or reset the database, before she takes a first customer.
- **Finish the checklist above.** Success, webhook delivery and decline-then-retry passed against
  real Stripe. Cancel, duplicate submission, 3-D Secure, abandonment and Apple Pay have not run.
- **Switch to live mode**: her live secret key *and* a second webhook endpoint created in live
  mode with its own signing secret. The test-mode `whsec_` will not verify live events.
- Dashboard payment methods: cards plus Apple Pay / Google Pay on, every delayed-settlement
  method off.
- Biz's confirmation of the 32-minute checkout-start rule (or a switch to the grace period).
- `ZELLE_NAME` in `shared/config.ts` is still a placeholder (manual path only).
- `ADMIN_PASSWORD` is currently a guessable phrase chosen by the owner. `lib/auth.ts` compares it
  in constant time and `/admin` fails closed without it, but **there is no rate limiting** on
  `/api/admin`, so that password is the only thing protecting customer names and phone numbers.
  Worth either a high-entropy passphrase or an attempt limit before this handles real orders.
- Refunds are done in the Stripe Dashboard; the app records the exception but has no refund action.
