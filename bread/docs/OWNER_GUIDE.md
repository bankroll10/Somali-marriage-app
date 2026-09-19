# Owner guide — running the bread shop from your phone

This is for Biz. Everything you do during a shift happens on one page, **`/admin`** on the
shop's website (`https://bread-pickup.netlify.app/admin` until a custom domain is set up). Add it
to your home screen: Safari → Share → *Add to Home Screen*.

Customers never see this page. They use the front page, pick bread and a day, and pay by card on
Stripe's page. The money goes to the Stripe account; the order shows up here the moment the
payment goes through.

## Signing in

1. Open `/admin`. Enter the admin password (the person who set the site up gives it to you; it
   is not written down anywhere on the site).
2. You stay signed in on that phone for **30 days**. After that, or after *Sign out*, enter it
   again.
3. Five wrong tries in a row lock that phone out for 15 minutes; the page tells you how long.
4. Lost the password? It cannot be recovered, only replaced: the site owner sets a new one in
   Netlify (the hosting), and everyone signs in again with the new one.

## Reading the page

- The strip across the top lists the coming pickup days. The next one opens first. **Past**
  shows earlier days that had orders.
- **To bake** is the whole answer: paid orders still owed for that day. Bread that someone is
  still paying for ("held") and cancelled orders are **not** in it.
- Each product line shows *paid · held · free of capacity*. "Held" means a customer is on the
  payment page right now, or left it without paying; held bread comes back on its own once
  Stripe confirms nothing was paid (usually within the hour). You never need to free it by hand.
- Each customer card shows the name, a six-letter **order code** (they have the same code on
  their confirmation), what they ordered, and the **phone number — tap it to call**.
- A line at the top says when the site last checked with Stripe automatically and when Stripe
  last sent it a message. Both should read minutes or hours, not "never".
- A yellow **TEST MODE** notice means the site is on Stripe's practice keys: orders are
  rehearsals and no real money moves. It disappears once the site is switched to live.

## Marking bread picked up

Tick the box next to the customer when you hand the bread over. Ticked customers fade down the
list and come off *To bake*. Ticked by mistake? *Undo pickup*.

**Print list** prints just that day: to bake, then every paid customer with a checkbox — for the
front desk drawer.

## Blocking a date (you are away, or full)

1. Open the day → **Block date…** → optionally say why (only you see it) → **Block date**.
2. The page tells you exactly what is already on that day before you confirm: paid customers
   keep their bread; anyone mid-payment keeps their hold and, if they finish paying, that order
   counts. **Blocking never cancels or refunds anyone.** It only stops new orders.
3. **Unblock** reopens it. Nothing else changes.

## Someone cannot have their bread after all (cancel + refund)

Money and bread are two separate steps, so nothing happens by accident.

1. **Refund the money in Stripe.** On the customer's card, tap **View in Stripe ↗** — it opens
   that payment in your Stripe Dashboard (sign in to Stripe if asked). Tap **Refund**, choose
   full or partial, confirm. Stripe sends the money back to the card in 5–10 business days.
   Stripe keeps its processing fee on a refund (see the launch checklist for the numbers).
2. Back on the shop page, the card shows *refunded* within a minute or two on its own. If it
   does not, tap **Check refund**.
3. **Take the bread off your list**: **Cancel order…** → choose whether the loaf goes **back on
   sale** for someone else (the page tells you if the day is blocked or closed, in which case
   nobody could buy it anyway) → optional note (only you see it) → confirm. The customer's card
   now reads *cancelled*.

Refunding without cancelling is allowed (the card reads *refunded* but the bread stays on your
list); cancelling without refunding is allowed too. The page never moves money.

## Someone pays cash or Zelle at the desk

Only for a customer who did **not** pay by card. Their order must exist on the page (they can
place it and back out of the card page, which leaves a hold). Tap **Mark paid**. If the day is
already full, the page says so and asks whether you will bake the extra — *Confirm anyway*
records it as over capacity.

## "Payments that need a look"

A red box at the top, rarely. Each line says what Stripe reported and what the site did about
it — for example a payment that arrived after the bread had been given back (the site took the
bread again, over capacity, so the customer gets it), or a card payment for an order you had
already marked paid by hand (a refund is probably due). Decide, act in Stripe if money is
involved, then tap **Mark resolved**. Nothing here is urgent to the customer: their order page
tells them a person is looking.

## Getting help

- **The site owner** (the person who set it up and gives you the password) — for anything
  about the site, a customer who says they paid but is not on the list, or a date that looks
  wrong. Give them the customer's six-letter order code.
- **Stripe support** (support.stripe.com, or *Help* in the Dashboard) — for money questions:
  payouts, a refund that has not landed, a dispute.
- **Netlify status** (netlifystatus.com) — if the whole site is down.

## Backups, export and restore (for the owner)

The data lives in a Neon Postgres database. The site never deletes an order on its own.

- **Export her records** (CSV, opens in Excel or Numbers; one line per loaf, with names and
  phone numbers — keep it where customer details belong, not in the repo):
  ```
  DATABASE_URL="<from Netlify → Environment variables>" npm run db:export -- --from 2026-09-01 --to 2026-12-31 > orders-2026-q4.csv
  ```
- **Full backup** with PostgreSQL's own tool (install `postgresql-client`):
  ```
  pg_dump "<DATABASE_URL>" --format=custom --file=bread-$(date +%F).dump
  ```
  Do this before any change to the database or the hosting, and monthly.
- **Restore** into an empty database (a new Neon branch or project; never straight over the
  live one while the site is up):
  ```
  pg_restore --clean --if-exists --no-owner --dbname "<NEW_DATABASE_URL>" bread-2026-09-19.dump
  ```
  then point the site at it: Netlify → Site configuration → Environment variables →
  `DATABASE_URL` → save → Deploys → *Trigger deploy*. The build re-runs the migrations, which
  is harmless on a restored database (they are recorded as already applied).
- **Neon's own restore**: the Neon console can restore a branch to any point inside its
  retention window (six hours on the Free plan as of September 2026 — check the console, the
  window is plan-dependent). For anything older, use the dump.
- **Wiping practice orders before launch** (never after): `npm run db:clear-orders -- --yes`.
  It refuses to run while any real (live-mode) sale is in the database.
