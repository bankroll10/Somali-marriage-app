# Launch checklist — from test mode to the first real customer

For the owner. Every step is a dashboard action or a command; none needs a secret pasted
anywhere but the dashboard field it belongs in. **No step here enables live charging on its
own**: that happens only at the cutover, and only when Biz has said so.

Site: Netlify project **bread-pickup** → `https://bread-pickup.netlify.app`. Database: Neon.
Payments: Stripe. Code: branch `claude/bread-ordering-app-fujfkj`, directory `bread/` (pushing
to it deploys).

## 0. What is already in place (verified 2026-09-19)

| Piece | State | How it was verified |
|---|---|---|
| Hosting, HTTPS, security headers | Netlify serves the site over HTTPS only; HSTS, CSP, `X-Frame-Options`, `nosniff`, `Permissions-Policy` in `netlify.toml` | Netlify deploy record: 6 header rules processed; CSP checked in Chromium |
| Database and migrations | Neon Postgres; migrations run inside every build (`npm run db:migrate && npm run build`), a production build without a database **fails** rather than deploying | deploy `6aaecb53…` green with migration `004`; `005_ops` follows the same path |
| Environment variables (names) | `DATABASE_URL`, `STRIPE_SECRET_KEY` (test), `STRIPE_WEBHOOK_SECRET` (test), `ADMIN_PASSWORD` — all contexts, all scopes | read back through Netlify's API |
| Admin | one password, rotated 2026-09-19; 30-day sessions; 5 tries / address, 50 overall per 15 min | `tests/admin-auth.test.ts`; owner signed in on the live site earlier |
| Stripe test webhook | endpoint `https://bread-pickup.netlify.app/api/stripe-webhook` created by Biz in **test** mode, `checkout.session.*` events | invocations seen in the function log on 2026-09-19 |
| Scheduled reconcile | `reconcile-stale`, **every 30 minutes**, registered on each deploy | deploy record lists the schedule; **whether it runs and does work is now visible** at `/api/health` (`lastReconcileAt`) and on `/admin` ("Automatic check ran … ago") |
| CI | GitHub Actions on every push to `bread/**`: typecheck, lint, both test suites (Postgres 16 service) | first run green |

### What could not be verified from the build sandbox
The sandbox cannot reach the live site, Neon or Stripe. Everything marked **owner** below is a
check you run; the two scripts exist so it takes minutes.

## 1. Environment variables (names only — values go in Netlify → Site configuration → Environment variables)

| Name | Used by | Test today → live at cutover | Mark "contains secret values"? |
|---|---|---|---|
| `DATABASE_URL` | build (migrations) **and** functions | same database (after wiping test orders) | **No** — a secret-marked variable is withheld from the build, and the build must migrate |
| `STRIPE_SECRET_KEY` | functions | the **test** key, and it stays that way | no change |
| `STRIPE_WEBHOOK_SECRET` | functions | the **test** endpoint's secret, and it stays that way | no change |
| `STRIPE_LIVE_SECRET_KEY` | functions | Biz's restricted live key — **staged 2026-09-23**, unused until the switch | stays readable so it can be checked |
| `STRIPE_LIVE_WEBHOOK_SECRET` | functions | the live endpoint's secret, saved by the owner from the Going live panel (step 3) | as above |
| `STRIPE_MODE` | functions | **absent = test.** `live` = the switch | — |

**Scopes on this Netlify plan:** a variable created with a *functions-only* scope was accepted
by the API ("upserted") and then **silently not saved** — observed 2026-09-23 when staging
`STRIPE_LIVE_SECRET_KEY`. Create every variable with **all scopes**, as the existing four are,
and read it back afterwards. Also: functions read variables **when they are deployed**, so any
new or changed variable needs *Deploys → Trigger deploy* before the site sees it.

Going live is **adding one variable**, `STRIPE_MODE=live`, and redeploying. Nothing is pasted
over anything. In live mode, if either live value is missing, or the "live" key isn't a live
key, the site refuses card payments with "payments not configured" and does **not** fall back
to test keys.
| `ADMIN_PASSWORD` | functions | unchanged | Yes, if you like — the API then cannot read it back |

Nothing else is configurable by variable. Names, place, hours, prices, capacity, horizon and
the Zelle handle are constants in `bread/shared/config.ts` and the `products` table
(`LAUNCH_INPUTS.md`).

## 2. Stripe Dashboard — do these now, in **live** mode, without taking a payment

> **Reported done by Biz on 2026-09-23** — items 1, 2 and 3 below ("bank account is connected,
> verification is complete, and I updated the website, business description, and statement
> descriptor"). She wasn't certain, and neither of us can see her dashboard, so it is
> **unconfirmed until `npm run stripe:verify` passes** (step 0 of the cutover). That command asks
> Stripe directly and charges nothing.

1. **Activate the account** (Settings → Business → Activate): legal details, bank account for
   payouts, identity. Until this is complete Stripe will not let live charges through.
2. **Payouts** (Settings → Payouts): confirm the bank account and the schedule.
3. **Public details / statement descriptor**: the business name as it should appear on card
   statements; support email or phone if Biz wants one shown.
4. **Payment methods** (Settings → Payments → Payment methods): **Cards on; Apple Pay and Google
   Pay on**; turn **off** every delayed method (ACH, Cash App Pay, Klarna, Affirm, Afterpay,
   bank redirects). The code already asks Stripe for cards only — this keeps the Dashboard in
   agreement so nobody re-enables one later by accident.
5. **Customer emails** (Settings → Business → Customer emails): *Email customers about
   successful payments* **on** if she wants Stripe to send receipts; the confirmation page says
   "if Stripe sends a receipt" either way. *Email customers about refunds* on.
6. **Live webhook endpoint** — **do not build this by hand.** Run
   `STRIPE_SECRET_KEY=<her key> npm run stripe:setup-webhook`: it creates the endpoint with
   exactly the right events and prints the signing secret, which Stripe returns only at
   creation. That keeps the secret off SMS entirely and makes a missed event impossible. Run it
   twice and it will not make a duplicate. For reference, what it creates (Developers → Webhooks
   → Add endpoint, mode toggle on **Live**, if ever done by hand):
   - URL: `https://bread-pickup.netlify.app/api/stripe-webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`,
     `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
     `charge.refunded`, `charge.refund.updated`, `refund.created`, `refund.updated` — this list
     is `REQUIRED_WEBHOOK_EVENTS` in `bread/netlify/lib/stripe/gateway.ts`, and
     `npm run stripe:verify` checks the live endpoint against it and names anything missing
   - Its **signing secret** goes straight into Netlify as `STRIPE_WEBHOOK_SECRET` at cutover
     (step 5). Until then the test endpoint stays wired.
   - Also add the four refund events to the existing **test** endpoint so refunds show on the
     admin page during rehearsal without pressing *Check refund*.
7. **Live secret key** (Developers → API keys, mode **Live**): it will be pasted into Netlify as
   `STRIPE_SECRET_KEY` at cutover, nowhere else.

   **How the key should travel.** It is Biz's Stripe account, and so far credentials have come
   by text — fine for a test key, not for a live one, which can create charges, issue refunds
   and read every customer record. In order of preference:

   **Chosen route (2026-09-23): a restricted key.** Adding the owner to her Stripe team was
   considered and dropped as a bigger ask than it is worth. She creates one restricted key
   (Developers → API keys → *Create restricted key*) with **Checkout Sessions: Write**,
   **Refunds: Read**, **Webhook Endpoints: Write** and **Account: Read** — the exact walkthrough
   to send her is in [`BIZ_MESSAGES.md`](BIZ_MESSAGES.md) §1b. If that key ever leaked it could
   not move her money, refund anyone or read her customer list.

   The signing secret never travels at all: `npm run stripe:setup-webhook` creates the endpoint
   and prints the secret on the machine that will paste it into Netlify. This matters — whoever
   holds that secret can forge a `checkout.session.completed` and mark an order paid that nobody
   paid for.

   **Never** text an unrestricted `sk_live_` key: it is full access to her money.

   **Received 2026-09-23** and staged in Netlify as `STRIPE_LIVE_SECRET_KEY` (not in the
   repository, which is public). Optional hardening after the webhook exists: the key no longer
   needs **Webhook Endpoints: Write** — Biz can set that to None in Stripe → Developers → API
   keys → the key → Edit, and the site loses nothing.
8. **Apple Pay**: on Stripe's hosted Checkout page no domain registration is needed (the page is
   on Stripe's domain). The on-device check is in section 7.
9. **Radar** (default rules) and **Disputes** need nothing.

## 3. Netlify — nothing to change before cutover

- Production branch `claude/bread-ordering-app-fujfkj`, base directory `bread` — **do not rename
  or delete that branch**.
- Build command `npm run db:migrate && npm run build` (in `netlify.toml`); functions bundle with
  esbuild; `reconcile-stale` is scheduled by the code (`*/30 * * * *` — see the Neon row in
  section 8 for why half-hourly and not more often).
- Deploy previews and branch deploys: leave **off** (they would share the production database).
- Optional, later — a permanent test copy: a second Netlify site linked to a `staging` branch,
  its own Neon branch as `DATABASE_URL`, test keys; not needed to launch.

## 4. Custom domain (optional, owner)

1. Buy the name at any registrar (not done; none chosen — `LAUNCH_INPUTS.md`).
2. Netlify → Domain management → *Add a domain* → follow the DNS instructions (Netlify DNS or a
   CNAME to `bread-pickup.netlify.app`). HTTPS certificate is issued automatically (Let's
   Encrypt) once DNS resolves; nothing to buy.
3. Then in the code: `SITE_URL` in `bread/shared/config.ts` and the `og:url` / `og:image` /
   `twitter:image` URLs in `bread/index.html`; push. The Stripe webhook URL can stay on the
   `netlify.app` address (it keeps working), or be moved and the secret re-copied.
4. HSTS is sent with `includeSubDomains`: put nothing on a subdomain that must serve plain HTTP.

## 5. Cutover — test mode → live (about 20 minutes, from a phone)

**Everything up to the switch is on the admin page now: `/admin` → Going live →.** The steps
run on the deployed site, which can reach Stripe, so no computer is needed. The command-line
scripts below remain for anyone with a terminal; the panel runs the same checks.

1. **Going live → 1. Check Biz's Stripe account.** Every row ✓ except the two webhook rows.
2. **Going live → 2. Test the checkout.** Makes the real Checkout Session and cancels it at
   once; charges nothing. Do it **before** step 3.
3. **Going live → 3. Create the live webhook.** Copy the secret it shows once into Netlify as
   `STRIPE_LIVE_WEBHOOK_SECRET`.
4. The test-mode rehearsal in section 7, if not already done.
5. **Going live → 4. Clear practice orders** (type CLEAR). Refuses if any real sale exists.
6. **The switch — with Biz's go-ahead only:** Netlify → Environment variables → add
   `STRIPE_MODE` = `live` → Deploys → Trigger deploy. Then `/admin` no longer says TEST MODE
   and `/api/health` reads `"stripeMode":"live","livemode":true`.

**Rollback:** delete `STRIPE_MODE` → Trigger deploy. Both sets of keys stay where they are.
Payments already taken stay in Stripe and orders stay in the database; see section 6.

### The same cutover by command line (optional)

Only with Biz's explicit go-ahead. Pick a moment with no customer mid-checkout (`/api/health`
→ `liveHolds: 0`).

0. **Ask Stripe whether she is actually ready** — with her live key in your shell:
   `STRIPE_SECRET_KEY=... npm run stripe:verify`. Every row must PASS: live key, charges
   enabled, payouts enabled, nothing still owed to Stripe, statement descriptor set, business
   URL right, and a live webhook endpoint at our URL carrying all eight required events. Any
   FAIL names exactly what her dashboard still needs. **Nothing is charged by this.**
1. **Rehearsal done** — section 7's test-mode walk-through has been completed and the owner
   guide read.
2. **Back up**: `pg_dump "<DATABASE_URL>" --format=custom --file=bread-pre-launch.dump`
   (`OWNER_GUIDE.md`, backups).
3. **Wipe the practice orders**: `DATABASE_URL="<…>" npm run db:clear-orders -- --yes`. It
   prints the counts before and after and refuses if any live-mode sale exists.
4. **Create the live webhook endpoint and get its secret**:
   `STRIPE_SECRET_KEY=<her key> npm run stripe:setup-webhook`. Then **Netlify → Environment
   variables**: `STRIPE_SECRET_KEY` to her restricted live key and `STRIPE_WEBHOOK_SECRET` to the
   secret it just printed; mark both secret; leave `DATABASE_URL` unmarked.
5. **Deploys → Trigger deploy → Deploy site.** Wait for *Published*.
6. **Preflight**: `npm run launch:preflight -- https://bread-pickup.netlify.app` — every row
   must read PASS (live key, migrated, admin set, no test data, no holds, reconcile alive within
   70 minutes; if it just deployed, wait half an hour for the schedule and run it again).
7. **Smoke**: `npm run smoke -- https://bread-pickup.netlify.app` — all PASS; with
   `ADMIN_PASSWORD` exported in your shell it also proves sign-in and the day list.
8. **`/admin` on Biz's phone**: no TEST MODE notice; "Automatic check ran N min ago".
9. **First real order** — only if Biz authorizes spending: the owner orders one banana bread
   ($3) with a real card; `/thanks` shows *Order confirmed*; `/admin` lists it paid; the Stripe
   Dashboard shows the payment and the webhook delivery (Developers → Webhooks → the live
   endpoint → *Succeeded*); then refund it from *View in Stripe*, and see *refunded* on the card
   after *Check refund* (or within a minute). Cost of this test: Stripe keeps about $0.39 (see
   section 8).
10. Announce.

## 6. Rollback — live → test, or last known good

- **Payments misbehave after cutover**: in Netlify delete `STRIPE_MODE` → *Trigger deploy*.
  The test keys were never touched, so the site is instantly back on them. Customers can then place
  orders but no real money moves (the TEST MODE notice returns on `/admin`); nothing already paid
  is lost — payments live in Stripe, orders in the database, and a deploy touches neither.
- **A bad code deploy**: Netlify → Deploys → pick the previous *Published* deploy → *Publish
  deploy*. Instant, no build. The database is not rolled back by this (migrations only ever add).
- **An order taken during a bad window**: it is still in the database and in Stripe. Settle it by
  hand from `/admin` (mark paid / cancel / refund in Stripe), never by editing the database.
- **Data**: restore from the pre-launch dump per `OWNER_GUIDE.md` only if the database itself
  is damaged; a wrong key or a bad deploy never needs a data restore.

## 7. Manual verification that remains (owner, on the live site, **still in test mode**)

Each is a minute. Test card `4242 4242 4242 4242`, any future date, any CVC.

- [ ] `npm run smoke -- https://bread-pickup.netlify.app` — all PASS, "Stripe mode: TEST".
- [ ] `/admin` shows the TEST MODE notice and "Automatic check ran N min ago" with N ≤ 30 —
      this is the proof the scheduled function runs on Netlify (it never had been observed
      doing work before). Straight after a deploy it may read "never"; wait half an hour.
- [ ] Order, pay, land on `/thanks` → confirmed; `/admin` shows it paid; smoke now reports
      "Stripe webhook has reached the site".
- [ ] Order, then use **Stripe's own back link** on its page → the front page says *checking…*
      then *no payment was made and your bread has been released*; `/admin` shows no hold.
- [ ] Order, close the tab, order again with the **same phone** → `/admin` shows one hold; the
      first reads *payment page closed*.
- [ ] Decline card `4000 0000 0000 0002` → stays on Stripe's page, hold kept; pay with 4242 on
      the same page → the same order turns paid.
- [ ] 3-D Secure card `4000 0025 0000 3155` → complete the challenge → paid.
- [ ] Refund that test order in Stripe → *refunded* on `/admin`; *Cancel order…* with restock →
      free count rises.
- [ ] Block a date with an order on it → the order stays; unblock.
- [ ] Wrong password five times → lock-out message; correct one afterwards works.
- [ ] **Apple Pay** (device-only): on an iPhone, Safari, a card in Wallet → the Apple Pay
      button appears above the card form on Stripe's page. In test mode Apple Pay works with a
      real card in Wallet and creates a test payment — nothing is charged. Note which devices
      showed it. **Google Pay**: Chrome on Android with a saved card. If neither appears,
      check section 2 item 4.
- [ ] Print the day list from Biz's phone.

## 8. Costs

### Recurring services (verified 2026-09-19 against provider pricing as reported by third-party
pricing trackers — the sandbox could not open netlify.com, neon.com or stripe.com directly;
**confirm on each provider's pricing page before relying on a number**)

| Service | Plan in use | Price | Included | What this site uses | Watch |
|---|---|---|---|---|---|
| Netlify | Free (team `nf_team_dev`) | $0, no card on file | 300 credits/month ≈ 100 GB bandwidth, 300 build minutes, 125,000 function invocations, 10 GB storage | ~4,500 scheduled invocations/month + a few hundred customer requests; one build per push (~1 min) | Over the limit the site is **suspended for the rest of the month** until upgraded. Personal $9/mo, Pro $20/user/mo. Sources: [Netlify Free plan](https://www.netlify.com/blog/introducing-netlify-free-plan/), [pricing guides](https://toolchase.com/blog/netlify-pricing-guide/) |
| Neon | Free | $0 | ~100 compute-hours/month at 0.25 CU minimum, 0.5 GB storage, 10 branches, 6-hour restore window; compute suspends after 5 idle minutes | **Settled 2026-09-19.** Every scheduled run wakes the database, which then stays up 5 minutes. At the original 10-minute schedule that was ~half the month awake, about **90 CU-hours** — close to the allowance before a single customer. The schedule is now **every 30 minutes**: ~25–30 CU-hours, a 3× margin. | Nothing to do. Look at the Neon console's usage page after two weeks to confirm the estimate against reality. If it ever does approach 100, the next step is **Launch** (usage-based, on the order of **$5–15/month** at this size) — not a smaller schedule, which is already as long as it should be. Sources: [Neon plans](https://neon.com/docs/introduction/plans), [Neon pricing](https://neon.com/pricing), [2026 breakdown](https://vela.run/articles/neon-serverless-postgres-pricing-2026/) |
| GitHub | Free | $0 | Actions minutes for public repos are free | one ~3-minute run per push | — |
| Domain (optional) | — | typically $10–20/year at a registrar | — | — | not chosen |
| Stripe | Standard | **$0/month** | pay per transaction (next section) | — | — |

Expected recurring cost at launch: **$0/month**, and after the schedule change nothing is close
to a limit. Neither Netlify nor Neon Free requires a card, so an overage stops service rather
than billing — for Neon that would mean the site answering *Could not check what's available*
until the month resets, which is exactly why the compute margin was widened rather than left to
chance. The owner should still look at both dashboards' usage pages after the first two weeks.

### Payment processing (Stripe, per transaction — separate from the above)

Standard US pricing as reported for 2026: **2.9% + 30¢ per successful card payment**, the same
for Apple Pay and Google Pay; no monthly fee; +1.5% for international cards, +1% for currency
conversion. Sources: [Stripe fee guides](https://checkoutpage.com/blog/stripe-processing-fees),
[2026 breakdown](https://flexprice.io/blog/stripe-pricing-breakdown-2026). Confirm in Stripe →
Settings → Pricing.

| Order | Charged | Stripe keeps | Biz receives |
|---|---|---|---|
| 1 banana bread | $3.00 | $0.39 (13%) | $2.61 |
| 1 sourdough | $5.00 | $0.45 (9%) | $4.55 |
| 1 sourdough + 2 banana | $11.00 | $0.62 (5.6%) | $10.38 |
| 3 sourdough + 4 banana (a full day) | $27.00 | $1.08 (4%) | $25.92 |

- **Refunds**: the customer gets the full amount back; **Stripe does not return its processing
  fee** on a refund (its policy since 2021 — confirm on the pricing page). Refunding a $3 loaf
  costs Biz $0.39.
- **Disputes / chargebacks**: $15 per dispute, returned if Biz wins.
- Payouts to her bank: no fee on the standard schedule; instant payouts cost extra.
- Sales tax, if it applies, is on top and is Biz's decision (`LAUNCH_INPUTS.md`); Stripe Tax
  would add its own per-transaction fee.

## 9. After launch, monthly

- Look at Neon usage and Netlify usage.
- `npm run db:export` for her records; `pg_dump` for a backup.
- Rotate `ADMIN_PASSWORD` if a phone is lost (Netlify → variable → save → *Trigger deploy*;
  everyone signs in again).
