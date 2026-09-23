# Launch inputs — the decisions only Biz (or the owner) can make

Everything else is done. Each item says what the site does *today* and where the answer goes.
Nothing below has been invented; where the site shows a placeholder it is labelled one.
Answered items stay in the table, marked **confirmed**, so the record of who decided what holds.

The texts to send Biz for the items still open are in [`BIZ_MESSAGES.md`](BIZ_MESSAGES.md).

## Identity and place

| Input | Today | Where it lands |
|---|---|---|
| **Business name** | ✅ **Confirmed 2026-09-19: "Fresh Bread"** — already what the site shows everywhere, so no change was needed | Nothing left in the code. One action remains for Biz: type **Fresh Bread** as the **statement descriptor** during Stripe activation (what customers see on their bank statement) — it is in her text |
| **Exact Life Time location and pickup instructions** | ✅ **Confirmed 2026-09-23: Life Time Fridley, the front desk**, 5–11 PM, best after 9 PM | Done — `PICKUP_PLACE` |
| **Business contact for customers** | ✅ **Confirmed 2026-09-23: her number, (612) 703-8698** — on the order page and every confirmation state, as a tap-to-call link | Done — `CONTACT_PHONE` |
| **Real bread photos** (optional) | 🟡 Biz is taking them (said 2026-09-23). Drawn placeholders until then | Send them in the chat; they go in `public/bread/` and `image:` on each product |

## Rules to confirm (already built this way)

| Rule | Today | Change it in |
|---|---|---|
| Timezone | America/Chicago for every time shown and every cutoff | `TIMEZONE` |
| Cutoff interpretation | ✅ **Changed by Biz 2026-09-23: 5 PM the day before pickup** (was 48 hours). Monday closes Sunday 5 PM, Wednesday Tuesday 5 PM, Thursday Wednesday 5 PM. A wall-clock rule; with Mon/Wed/Thu pickups it is always exactly 24 h, DST included (tested across a year) | `ORDER_CUTOFF_DAYS_BEFORE`, `ORDER_CUTOFF_HOUR` |
| Near-cutoff payment | Card checkout **closes 32 minutes before the cutoff** because Stripe's page needs 30; a session started before that ends exactly at the cutoff. Nothing can be paid after the cutoff. The alternative (a grace period past the cutoff) is described in `BUILD_PLAN.md` and not built. | `CARD_CHECKOUT_LEAD_MINUTES` |
| Booking horizon | Customers see the next **4 weeks** of Mon / Wed / Thu | `WEEKS_AHEAD`, `PICKUP_WEEKDAYS` |
| Prices and capacity | Sourdough $5 (3 per day), banana bread $3 (4 per day) | The `products` table (a `UPDATE` by the owner; the site reads it) — a capacity change applies to dates nobody has ordered on yet |

## Accounts and ownership

| Input | Today | Needed |
|---|---|---|
| **Stripe account** | 🟡 **Reported complete by Biz 2026-09-23** (activation, bank account, website, business description, statement descriptor) — unconfirmed, she wasn't sure | Confirm with `npm run stripe:verify`, which asks Stripe directly and charges nothing. Then the **live** key and a **live** webhook endpoint (checklist section 2) |
| **Payout setup** | 🟡 Reported connected 2026-09-23 | `stripe:verify` reports `payouts_enabled`. She still chooses the schedule in Stripe → Settings → Payouts |
| **How the live key reaches Netlify** | Not decided | Preferably she adds the owner to her Stripe team (role Developer) so no live credential is texted; otherwise a **restricted** key. See checklist section 2, item 7 |
| **Authorized admin identity** | One shared password, held by Biz and the owner; sessions last 30 days per phone | Decide who else, if anyone, gets it. There is one login; the audit trail records "admin". |
| **Hosting ownership** | Netlify project `bread-pickup` and the Neon project are on the **owner's** accounts; the GitHub repository is the owner's | Decide whether they stay there or move to an account Biz controls (Netlify: transfer site to a team she owns; Neon: transfer project; both dashboard actions) |
| **Domain** | None. The site is `bread-pickup.netlify.app` (HTTPS, free). | If she wants her own name: buy it (any registrar) and follow the domain steps in the checklist. Not required to launch. |

## Content and terms (must come from Biz — not invented)

| Input | Today | Where it lands |
|---|---|---|
| **Ingredients and allergens** for each bread | ✅ **Ingredients confirmed 2026-09-23**, shown verbatim on each product. No separate "Contains:" allergen line yet — that asserts more than she said (the flour's grain, the oil's source); ask her before adding one | `ingredients` in `config.ts` |
| **Approved product descriptions** | "A full loaf" / "Small loaf" | Same |
| **Cancellation and refund terms** | ✅ **Confirmed 2026-09-23:** no refunds for a missed pickup; she brings it to Life Time on her next shift. Shown in the review before paying and on the confirmation. Worded about a *missed pickup* only, so it never promises no refund when she is the one who cancels | `MISSED_PICKUP` |
| **Sales tax** | **No tax is charged or shown.** Whether bread sold this way is taxable, and whether Biz must collect, is a question for her accountant or the Minnesota Department of Revenue. | If tax applies: either set a fixed rate in Stripe Checkout (`tax_rates` on the line items) or enable Stripe Tax — a small code change either way, plus Biz's registration |
| **Cottage-food registration / labelling** | Unknown | Her responsibility; nothing in the site depends on it |
