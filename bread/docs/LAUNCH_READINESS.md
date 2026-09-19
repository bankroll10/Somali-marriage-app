# Launch readiness — audit of 2026-09-19

Branch `claude/bread-ordering-app-fujfkj`, directory `bread/`, Netlify project `bread-pickup`.
The app was inspected directly — code, schema, git history, the live project's configuration
through Netlify's API — and every claim below is backed by a command run here, an owner-observed
run against the live site, or is marked unverified. Earlier completion claims were not relied on.

## Recommendation

**Not launch-ready yet.** The code is now correct for every scenario that can be proven without
Stripe, and the audit found and fixed real defects (below). What remains is not code: a short
walk-through on the live site in **Stripe test mode** of the paths that changed, then the switch
to live mode and a first live payment observed end to end. Until that has been done and recorded,
the honest status is *ready for the final walk-through*, not *ready for the first customer*.

The list at the end is the whole gap. None of it is long.

## Three tiers of confidence

| Tier | What it means | Covers |
|---|---|---|
| **Code correctness** | Proven here by the suite: real Postgres transactions (PGlite in-process, and Postgres 16 with twelve connections for the races), the real HTTP handlers, the real Stripe SDK with its HTTP client replaced by a recorder, and a fake gateway with Stripe's idempotency and 30-minute rules. Deterministic. **Not a Stripe test.** | inventory, cutoffs, all-or-nothing carts, exactly-once payment conversion, holds, recovery, authorization, tampering, the limits, the totals |
| **Tested integration** | Run by the owner in a browser against `https://bread-pickup.netlify.app` with Stripe in **test mode**, and recorded in `BUILD_STATUS.md` with the date. This sandbox cannot reach `api.stripe.com`, `*.netlify.app` or `*.neon.tech` (its egress proxy refuses them), so nothing in this tier was run from here. | one real card payment; webhook delivery; decline then retry on one session; two browsers holding the same date |
| **Device-only** | Can only be seen on the device itself. | Apple Pay / Google Pay on Stripe's page, the sticky bar over iOS Safari's toolbar, real fonts, the `tel:` link, printing from her phone |

## What the audit found, and what was done

Every item was demonstrated before it was fixed and re-run after. "Test" names the file.

### Security

| Found | Severity | Fix | Proof |
|---|---|---|---|
| The **real admin password was committed** in two test files of a public repository (my doing, previous stage). Git history keeps it, so editing it out is not enough. | critical | Constant replaced with `test-admin-password`; a new passphrase generated here and set as `ADMIN_PASSWORD` on the Netlify project, which signs every phone out. The new one is in the chat with the owner only, never in the repo. `.env.example` now says why. | `git grep` for the old phrase → only history; `git log --all -S` for the Stripe key, webhook secret and database password → 0 commits (rechecked) |
| **No limit on reservations.** A checkout is free and holds up to a whole day's bread for 55 minutes; twelve requests kept the shop sold out. | high | Per address, inside the reservation transaction under an advisory lock (so a burst cannot slip under the count): at most **12 checkouts per 15 minutes** and **4 card orders on hold at once** → `429 too_many_reservations`, with copy on the page. Numbers leave room for several customers behind one gym Wi-Fi address. Per phone number: **one live card hold**; a new checkout supersedes the old one by ending it at Stripe first. | `launch.test.ts` "reservation abuse"; `rules.test.ts` "checkouts per address", "one live card hold per phone number"; `contention.test.ts` "a burst … cannot all slip under the hold cap" (10 concurrent → exactly 4 holds) |
| `/api/order` called Stripe on **every poll**; `last_checked_at` was written and never read. | medium | A guarded update: of a burst of polls the first stamps the row and asks Stripe; the rest within one second share its answer. Backing out and admin actions are never served a stale answer. | `stripe.test.ts` "the page polls once a second at most" — 5 polls → 1 retrieve; `contention` unchanged |
| `reconcile-stale` answered anyone with a map of live **order ids** — the bearer key to each customer's page. | medium | Counts by outcome only. | `launch.test.ts` "the scheduled reconcile answers anyone with counts only" |
| Loose UUID check admitted strings Postgres rejects → 503 and attacker text in the function log. | low | One strict v4 regex (`UUID_V4`) on every order id and key, server and page. | `launch.test.ts` "a tampered or guessed order link reaches nothing" — 7 malformed shapes → 400, unknown → 404 |
| No HSTS, no CSP, no `robots.txt`; return URLs built from the request's `Host`. | low | `netlify.toml`: HSTS, a CSP (`script-src 'self'`, `connect-src 'self'`, fonts from Google, `frame-ancestors 'none'`), `Permissions-Policy`; `public/robots.txt` disallows all; `siteOrigin` prefers Netlify's `URL`. | Built site run in Chromium with the exact CSP stapled onto every response: **0 violations** across order, cancel-return, thanks and admin pages |
| Admin sign-in global cap (20 failures / 15 min) was a cheap lock-out. | low | 50. Per-address cap of 5 unchanged. | `admin-auth.test.ts` (constants imported) |

### Correctness

| Found | Severity | Fix | Proof |
|---|---|---|---|
| **Stranded stock after a failed session create.** The re-create path re-sent the stored `expires_at`, which Stripe refuses once it is under 30 minutes out, and built the return URLs from whichever request happened to retry (scheduler, webhook, admin) → `idempotency_error`. Either way the hold was never released, admin cancel was refused, and no exception was recorded. Stock stayed held until someone opened `psql`. | critical | `payment_references.return_origin` fixed at reservation; a stale expiry is recomputed and the idempotency key moved on (`<order>:2`, `:3`…), both persisted before the attempt; Stripe's idempotency refusal is retried once under a fresh key; if the cutoff is too near for any honest session the hold is **released** (nobody was ever handed a page); a recovery that still fails past the hold's time records `session_unrecoverable` for her, and she may cancel an order that never had a session; Stripe returning clears the flag itself. | `stripe.test.ts` "recovering a session that never reached the database" — six cases |
| Batch reconcile ordered by `hold_expires_at` with `LIMIT 50`: one permanently failing order at the head starved the rest. | medium | Ordered by `last_checked_at NULLS FIRST`; every attempt stamps it. | same suite, scheduler runs asserted by outcome counts |
| Replay lookup ran after the `blocked` check: a retry on a just-blocked date got `409 blocked` instead of its own order. | low | Replay first. | `rules.test.ts` "a retry on a date she has since blocked gets its own order back" |
| `open` (availability) and `closing_soon` (checkout) disagreed at exactly cutoff − 32:00.000. | low | One `cardCheckoutOpen()` used by the list, her page and the checkout. | `launch.test.ts` S8: −1 ms open everywhere, 0 ms closed everywhere, cutoff → `closed` |
| `livemode` derived from `sk_live_` only: a restricted `rk_live_` key would refuse every live payment as a mode mismatch. | low | Any `_live_` key. | `gateway.test.ts` |
| Cancel-return banner said "No payment was made" before the server had answered. | low | "Checking with Stripe…" → server's word: released / paid (→ `/thanks`) / could not confirm (with a link to the order). | Browser pass: paid → navigated to `/thanks?order=…`; unsure → link shown |
| `/thanks` promised a Stripe receipt that only arrives if the Dashboard toggle is on. | low | Copy: "if Stripe sends a receipt…"; toggle added to the launch list. | Browser pass |
| The order page priced from `shared/config.ts` while the server charges from the database. | low | Prices, capacities and totals from `/api/availability`'s `products` (config only until it loads). | Browser pass with the mock selling sourdough at $5.50: page shows $5.50, total $11.50 |
| `ZELLE_NAME = '<her name on Zelle>'` rode in every checkout and order response. | low | Zelle details only on a Zelle order; name empty and the page shows the handle alone. | `rules.test.ts` "what a card order says about Zelle"; browser pass |

## The fourteen scenarios

PASSED = proven here in code (tier 1). LIVE = also observed by the owner against Stripe test mode
(tier 2), with the date. UNVERIFIED = not yet observed where it can only be observed.

| # | Scenario | Status | Where |
|---|---|---|---|
| 1 | 1 sourdough + 2 banana = **$11**, no tax: response, database, Stripe line items (real SDK), the confirmation | PASSED | `launch.test.ts` S1; `gateway.test.ts` (line items sum to 1100, no tax/shipping/tip key on the wire) — **LIVE** for a different cart (2026-09-19: $-amount not recorded; totals matched) |
| 2 | 3 **paid** sourdough sell Wednesday's sourdough out; a 4th refused with `remaining {0, 4}`; banana still sells | PASSED | `launch.test.ts` S2 |
| 3 | 4 paid banana sell out independently; then the day; capacity fixed at first touch | PASSED | `launch.test.ts` S3 |
| 4 | Separate dates; blocked date refuses before Stripe; replay on a blocked date | PASSED | `launch.test.ts` S4; `rules.test.ts`; `admin.test.ts` |
| 5 | Competing buyers for the last loaf; mixed cart all-or-nothing; 20 buyers on 10 connections | PASSED | `launch.test.ts` S5; `contention.test.ts` (Postgres 16) — **LIVE** two browsers, one date (2026-09-19) |
| 6 | Repeated events, refresh, retries, double-clicks → no duplicate payment or allocation | PASSED | `stripe.test.ts` (duplicate webhooks, page+webhook together, page then webhook → `already: true`); `contention.test.ts` (same key on 2 connections → 1 order; same paid session on 6 concurrent finalizations → 1 conversion) — **LIVE** one session reused across decline and retry (2026-09-19) |
| 7 | Declined / abandoned / expired / uncertain recover without premature release | PASSED | `stripe.test.ts` (decline keeps the hold; abandoned past its time expired by reconciliation; Stripe refusing → held + `expire_uncertain`; unreachable → nothing changes) — **LIVE** decline kept the loaf held (2026-09-19) |
| 8 | Cutoff −1 ms / 0 / +1 ms; both 2026 DST changes; sessions near the cutoff end at the cutoff | PASSED | `launch.test.ts` S8 (Mar 9 and Nov 2 pickups: cutoff exactly 48 h before 5 PM, 4 PM CST / 6 PM CDT on the calendar; fake enforces Stripe's 30-minute rule) |
| 9 | Payment completed while the webhook is down → reconciled exactly once by the page; the late webhook is a no-op | PASSED | `stripe.test.ts` "the webhook and the page, in either order, exactly once" — **LIVE** webhook delivery confirmed in function logs (2026-09-19); the down-then-replayed case has not been run live |
| 10 | Blocking during checkout preserves commitments; the held customer can still pay | PASSED | `admin.test.ts`; `contention.test.ts` (block waits behind the date lock) |
| 11 | Unauthorized cannot read orders, mutate inventory, or learn ids | PASSED | `admin-auth.test.ts`; `launch.test.ts` S11 |
| 12 | Success-page URL tampering: nothing is marked paid by landing; unknown → 404; malformed → 400; summary carries no phone, `cs_`, `pi_`, `sk_` | PASSED | `launch.test.ts` S12; `rules.test.ts` |
| 13 | Totals consistent through pickup, refund, cancel without restock, cancel with restock, a released hold | PASSED | `launch.test.ts` S13; ledger recount after every test in every suite |
| 14 | Flows on a small phone | PASSED in Chromium at 390×844 with the production CSP; **UNVERIFIED on a real phone** | Browser pass (below); the owner's walk-through |

## Commands and results

Run here on 2026-09-19 after the fixes.

| Command | Result |
|---|---|
| `npm run verify` (typecheck, oxlint, vitest on PGlite) | **129 passed, 8 skipped** (the skipped are the real-Postgres suite without `TEST_DATABASE_URL`); 0 lint errors, 3 `react/set-state-in-effect` warnings (style, pre-existing pattern) |
| `TEST_DATABASE_URL=… npm run test:pg` on Postgres 16, 12 connections | **8 passed** — the five earlier races plus concurrent finalize, same-phone / same-key on two connections, and the address burst |
| `tests/gateway.test.ts` (inside `verify`) | real `stripe` SDK v22 with a recording HTTP client: card-only, `mode=payment`, amounts, metadata, description, `expires_at`, `Idempotency-Key`, no tax; retrieve / expire / refunds endpoints; **signature verification with Stripe's own `generateTestHeaderString`** — valid passes, wrong secret and tampered body rejected; live-mode detection |
| Migration `004_recovery` applied incrementally on a database already at 003 | `['004_recovery']`, then `[]` on a second run; an unknown exception kind refused (`23514`); the constraint swap kept existing rows |
| `npm run db:clear-orders` / `-- --yes` on that database | refuses without the flag (exit 1); with it: orders 1 → 0, references and events 0, pickup dates and blocks kept |
| `npm run build` + Chromium 390×844 (2×, touch) and 1280×900 with the production CSP, HSTS and `X-Frame-Options` stapled onto every response, API mocked in the server's shapes | 8 states, **0 CSP violations, 0 px horizontal overflow, 0 page errors**: cancel-return *released* / *could not confirm* (with link) / *paid* → navigated to `/thanks?order=…`; server prices ($5.50) and total ($11.50) on the page; `429` copy; paid confirmation with the new receipt wording; Zelle page with no name; admin sign-in |
| `git log --all -S<secret>` for the Stripe key, webhook secret, Neon password | 0 commits, each |

What the sandbox could **not** run: anything against `api.stripe.com`, the live site or Neon
(egress refused). After the push: the CI workflow at `.github/workflows/bread.yml` ran for the
first time on commit `ea11892` and **passed** (both suites, Postgres 16 service); Netlify deploy
`6aaecb53d999d60009fc64ad` built green in production context — which means `npm run db:migrate`
applied `004_recovery` to Neon, since a failing migration fails the build — with 8 functions, 6
header rules and the ten-minute schedule registered. The site itself was still not opened from
here.

## Server-side checks, in one place

- **Validation**: every checkout field is validated on the server before any database write
  (`validate.ts`); browser prices and totals are never read; dates must be pickup days inside the
  window and before the cutoff; quantities are whole, non-negative and within daily capacity;
  keys and ids must be v4 UUIDs. Bodies over 8 KB are refused unread.
- **Secrets**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DATABASE_URL`, `ADMIN_PASSWORD` are
  read only in server code; nothing under `src/` or `shared/` reads `process.env`. None appears
  in git history. Card data never touches the app (Stripe-hosted page). The database connection
  is `sslmode=verify-full`.
- **Authorization**: every admin read and write checks a signed session token derived from the
  password; a missing password locks the admin (503), never opens it; the customer endpoints
  address orders only by unguessable v4 UUIDs and return no phone number or Stripe id; the
  scheduled reconcile returns counts only.
- **Rate limits**: sign-in 5 failures / address and 50 overall per 15 min; checkout 12 / address
  per 15 min and 4 live holds / address, atomic under a lock; one live hold per phone; Stripe
  polls from the customer's page at most once a second per order. Residual: a determined
  attacker with many addresses can still hold bread for free for up to 55 minutes at a time —
  the price of a free reservation; mitigated by the caps, the per-phone rule and the ten-minute
  reconcile, not eliminated. Customers on Life Time's Wi-Fi share one address; the caps are set
  so four of them can be mid-payment at once.
- **Logs and caches**: function logs carry order ids and Stripe session ids on failures (needed to
  investigate), never names, phones or key material; `console.error` on database failures prints
  the driver's message, which contains no parameters. Every API response is `Cache-Control:
  no-store` (asserted); `/thanks*` and `/admin*` are `no-store` at the CDN; there is no service
  worker. The browser keeps quantities, date and name in `sessionStorage` — never the phone —
  and the admin token in `localStorage`.

## Update, deployment preparation (later on 2026-09-19)

The handoff stage added `GET /api/health`, a record of every scheduled reconcile run shown on
`/admin` ("Automatic check ran … ago") and a TEST MODE notice there, `npm run smoke` and
`npm run launch:preflight` so the *deployed* site can be checked without log access, a CSV
export, and a guard that stops `db:clear-orders` from wiping real sales. The ordered launch
procedure, cutover and rollback now live in [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md); the
list below is kept for the record.

## Remaining before the first customer

In order. Items 1–3 are the owner's; 4–6 are Biz's in the Stripe Dashboard; 7–8 are checks.

1. **Give Biz the new admin password** (in the chat, not here). The old one is retired; every
   phone is signed out.
2. **Wipe the test orders** once testing on the live site is finished, so real dates open at full
   capacity: `DATABASE_URL=<Neon> npm run db:clear-orders -- --yes` from any machine with the
   repo. It refuses to run without the flag and prints counts before and after.
3. **Walk through the changed paths on the live site, still in test mode** (each takes a minute):
   - start a checkout, use **Stripe's own back link** → the banner should read *checking… → no
     payment was made and your bread has been released*, and `/admin` should show the hold gone;
   - start a checkout, close the tab, start another with the **same phone number** → `/admin`
     should show one hold, the first expired;
   - sign in to `/admin` with the new password; a wrong password five times → the lock-out
     message;
   - one more paid order with `4242…`, then `/thanks` → the new receipt wording.
4. **Live mode**: her live secret key as `STRIPE_SECRET_KEY`, and a **second webhook endpoint
   created in live mode** (`https://bread-pickup.netlify.app/api/stripe-webhook`, events
   `checkout.session.*`, `charge.refunded`, `charge.refund.updated`, `refund.*`) whose signing
   secret replaces `STRIPE_WEBHOOK_SECRET`. The test-mode secret will not verify live events.
5. **Dashboard settings**: payment methods = cards, with Apple Pay and Google Pay on, every
   delayed-settlement method off; *Settings → Business → Customer emails → "Email customers
   about successful payments"* on, if she wants Stripe to send receipts (the page no longer
   promises one).
6. **One real payment in live mode**, small, refunded afterwards from the Dashboard: confirm
   `/thanks` shows paid, `/admin` shows the order and then *$x refunded*, and the function log
   shows no `signature rejected` line.
7. **Biz's sign-off on the 32-minute rule** (card checkout closes 32 minutes before a date's
   deadline, because Stripe's page needs 30). The alternative — a grace period past the deadline
   — is written up in `BUILD_PLAN.md` and not built.
8. Optional, any time: her photos into `public/bread/` (README); `ZELLE_NAME` in
   `shared/config.ts` for the manual path (blank shows the handle alone, which is fine).

Device-only, on her phone and one customer's: Apple Pay appears on Stripe's page (Safari with a
Wallet card); the sticky *Pay* bar clears iOS Safari's bottom toolbar; the `tel:` links dial;
printing the day sheet.

When 1–7 are done, this document should be updated with the dates, and the recommendation
changed. Not before.
