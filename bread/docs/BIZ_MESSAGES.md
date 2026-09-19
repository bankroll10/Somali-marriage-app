# Messages to send Biz

Plain-language texts, ready to copy. She is not technical and is doing this around a shift, so
each one asks for **one** thing at a time. Send #1 now and #2 a day later; do not send both at
once.

Never ask her to send a password, a Social Security number, bank details or a Stripe key by
text — the only place any of those belong is the dashboard they came from.

---

## 1 — Activate Stripe (send first; it blocks everything else)

This is the only launch step nobody but Biz can do: until Stripe has her business and bank
details, real card payments cannot reach her account.

> Hey! The bread site is basically done. One thing only you can do: finish setting up your Stripe
> account so money can actually reach your bank. Takes about 15 minutes.
>
> Have ready: your address, date of birth, Social Security number (Stripe has to ask — it's an
> IRS thing for anyone taking card payments), and your bank routing + account number.
>
> 1. Go to dashboard.stripe.com and sign in
> 2. Click the "Activate payments" / "Complete your profile" banner at the top
> 3. Business type: Individual / sole proprietor
> 4. What you sell: Homemade bread, ordered online and picked up in person
> 5. Website: https://bread-pickup.netlify.app
> 6. Where there's a box for what shows on customers' bank statements, put: Fresh Bread
> 7. Add your bank account for payouts, then submit
>
> Stripe usually approves within a day. Only ever type that info on stripe.com — don't send your
> SSN or bank numbers to me or anyone else, and don't text me any of the keys from that site.
> Tell me when it's approved and I'll do the rest.

**When she says it's approved:** that unlocks steps 4–7 of
[`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) — the live key, the live webhook endpoint, and the
cutover. Nothing about the site changes until then; it stays in test mode.

---

## 2 — The five questions (send a day later)

Everything here is content the site needs but cannot invent. Each answer is a sentence.

> Few quick things for the site, whenever you get a sec — a sentence each is plenty:
>
> 1. Which Life Time, and where exactly should people pick up? Right now it says "the front desk."
> 2. What's in each bread? Just the ingredient list for the sourdough and the banana bread — it
>    goes on the site so anyone with an allergy can see it.
> 3. If someone can't make it or changes their mind, do you refund them? Up to when?
> 4. Want a phone number or email on the site for customers with a problem? Totally fine to say no.
> 5. Any photos of your bread you want to use? Two decent phone pics is all it takes. The site has
>    drawings until then.
>
> One more thing to confirm: orders close 48 hours before pickup — so for a Monday pickup,
> ordering closes Saturday at 5pm. Sound right?

**Where each answer goes:**

| Her answer | Lands in |
|---|---|
| 1. Club and pickup spot | `PICKUP_PLACE`, `PICKUP_PLACE_WHERE` in `bread/shared/config.ts` |
| 2. Ingredients | each product's `blurb` (`config.ts` and the `products` table), or a short ingredients line on the order page |
| 3. Refund terms | copy on the order and confirmation pages (`Order.tsx`, `Thanks.tsx`) |
| 4. Contact | the same two pages, and Stripe's receipt settings |
| 5. Photos | `bread/public/bread/`, then `image:` on each product — see the README |
| 6. The 48-hour rule | `ORDER_CUTOFF_HOURS` — only if she says it is wrong |

---

## 3 — Once she's signed in to the admin (send at cutover)

> The orders page is https://bread-pickup.netlify.app/admin — I'll text you the password
> separately. Add it to your home screen (Share → Add to Home Screen) so it's one tap.
>
> Everything you need is on it: what to bake that day, who's coming, their phone numbers, a
> checkbox to tick when you hand bread over, and a button to close a day you're away. There's a
> short guide too if you want it.

Send the password in its own message, never in the same one as the link. The guide is
[`OWNER_GUIDE.md`](OWNER_GUIDE.md) — worth sending as a screenshot or a printout rather than a
file she has to open.

---

## Not to raise by text — for the owner

- **Sales tax.** Whether she must collect it on home-baked goods in Minnesota is a question for
  whoever does her taxes, not a text-message question. No tax is charged or shown today, and the
  answer changes what gets built (a fixed rate, or Stripe Tax, on the checkout).
- **Cottage-food registration and labelling.** Hers to check. Nothing in the site depends on it,
  but the ingredient list from question 2 may be legally required on the product itself anyway.
- **Who else gets the admin password.** There is one login and one password; the audit trail
  records every action as "admin" without distinguishing people.
