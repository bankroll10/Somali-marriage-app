# Launch inputs — the decisions only Biz (or the owner) can make

Everything else is done. Each item says what the site does *today* and where the answer goes.
Nothing below has been invented; where the site shows a placeholder it is labelled one.
Answered items stay in the table, marked **confirmed**, so the record of who decided what holds.

The texts to send Biz for the items still open are in [`BIZ_MESSAGES.md`](BIZ_MESSAGES.md).

## Identity and place

| Input | Today | Where it lands |
|---|---|---|
| **Business name** | ✅ **Confirmed 2026-09-19: "Fresh Bread"** — already what the site shows everywhere, so no change was needed | Nothing left in the code. One action remains for Biz: type **Fresh Bread** as the **statement descriptor** during Stripe activation (what customers see on their bank statement) — it is in her text |
| **Exact Life Time location and pickup instructions** | "Life Time — the front desk", 5–11 PM, best after 9 PM, and the sentence *Life Time is the pickup spot only — this bread is not sold by, or affiliated with, the gym.* The club's address is not shown anywhere. | `PICKUP_PLACE`, `PICKUP_PLACE_WHERE`, `PICKUP_PLACE_NOTE`, `PICKUP_START_HOUR`, `PICKUP_END_HOUR`, `PICKUP_PREFERRED_AFTER_HOUR` in `config.ts`. Confirm with the club that pickups at the front desk are acceptable to them. |
| **Business contact for customers** | None shown. The confirmation page says a person will look at flagged payments, but gives no way to reach anyone. | A line on the order and confirmation pages (`Order.tsx`, `Thanks.tsx`) and in Stripe's receipt settings (support email / phone). Decide: email, phone, or neither. |
| **Real bread photos** (optional) | Drawn placeholders, labelled as such | Two square photos ≥ 400 px into `bread/public/bread/`, then `image:` on each product in `config.ts` (README explains) |

## Rules to confirm (already built this way)

| Rule | Today | Change it in |
|---|---|---|
| Timezone | America/Chicago for every time shown and every cutoff | `TIMEZONE` |
| Cutoff interpretation | Orders close **exactly 48 hours before the shift starts** (5 PM on the pickup day → 5 PM two days earlier). Around the daylight-saving changes that lands at 4 PM (March) or 6 PM (November) on the calendar day, because it is a true 48 hours. | `ORDER_CUTOFF_HOURS`; or a rule change if "5 PM two days before, whatever the clocks did" is meant |
| Near-cutoff payment | Card checkout **closes 32 minutes before the cutoff** because Stripe's page needs 30; a session started before that ends exactly at the cutoff. Nothing can be paid after the cutoff. The alternative (a grace period past the cutoff) is described in `BUILD_PLAN.md` and not built. | `CARD_CHECKOUT_LEAD_MINUTES` |
| Booking horizon | Customers see the next **4 weeks** of Mon / Wed / Thu | `WEEKS_AHEAD`, `PICKUP_WEEKDAYS` |
| Prices and capacity | Sourdough $5 (3 per day), banana bread $3 (4 per day) | The `products` table (a `UPDATE` by the owner; the site reads it) — a capacity change applies to dates nobody has ordered on yet |

## Accounts and ownership

| Input | Today | Needed |
|---|---|---|
| **Stripe account** | Biz's account, in **test mode**; the owner's site holds its test keys | Biz completes Stripe's activation (business details, bank account for payouts, identity), then the **live** secret key and a **live** webhook endpoint (checklist) |
| **Payout setup** | Not confirmed | Stripe → Settings → Payouts: bank account, schedule (daily / weekly / monthly) |
| **Authorized admin identity** | One shared password, held by Biz and the owner; sessions last 30 days per phone | Decide who else, if anyone, gets it. There is one login; the audit trail records "admin". |
| **Hosting ownership** | Netlify project `bread-pickup` and the Neon project are on the **owner's** accounts; the GitHub repository is the owner's | Decide whether they stay there or move to an account Biz controls (Netlify: transfer site to a team she owns; Neon: transfer project; both dashboard actions) |
| **Domain** | None. The site is `bread-pickup.netlify.app` (HTTPS, free). | If she wants her own name: buy it (any registrar) and follow the domain steps in the checklist. Not required to launch. |

## Content and terms (must come from Biz — not invented)

| Input | Today | Where it lands |
|---|---|---|
| **Ingredients and allergens** for each bread | Not shown anywhere. Home-baked goods sold to the public may need an ingredient/allergen statement under Minnesota's cottage-food rules — check the current requirement. | `blurb` on each product in `config.ts` / the `products` table, or a short "Ingredients" note on the order page |
| **Approved product descriptions** | "A full loaf" / "Small loaf" | Same |
| **Cancellation and refund terms** | Nothing is written. The mechanics exist (refund in Stripe, cancel on the admin page); the policy does not. | One or two sentences on the order page and confirmation, e.g. whether a no-show is refunded, and by when a customer may cancel |
| **Sales tax** | **No tax is charged or shown.** Whether bread sold this way is taxable, and whether Biz must collect, is a question for her accountant or the Minnesota Department of Revenue. | If tax applies: either set a fixed rate in Stripe Checkout (`tax_rates` on the line items) or enable Stripe Tax — a small code change either way, plus Biz's registration |
| **Cottage-food registration / labelling** | Unknown | Her responsibility; nothing in the site depends on it |
