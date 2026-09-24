# Monetization: what may be sold, and what must be true first (2026-09-24)

The rule this page keeps is `docs/STRATEGY.md` §5's: **revenue must not scale
with anxiety, time in the app, or how long someone stays single.** The company
is paid when a member moves forward. It is never paid for keeping her where she
is.

This page takes every paid product that exists in writing and asks the same
eight questions of each. It then answers the four hardest cases, says what has
to be true before any money is taken, and records the first incentive audit
`docs/PROCESS.md` asked for.

**The state today (FACT):**
- There is no payment code: no SDK, no checkout, and no way to record that
  someone would pay (`package.json`, `src/`, `netlify/`).
- The prices are a written prediction, not a price list (`docs/STRATEGY.md`
  §5, dated 2026-09-11).
- There are no real members yet, and no pool is open.
- The founder does every human job alone.
- The mailbox on the domain does not answer yet (`docs/CONTROL.md` step 5).

**No gate has passed.** Until one does, nothing here gets payment code.
`tests/monetization.test.tsx` fails if a payment SDK appears in `package.json`
while this sentence stands.

---

## A. The eight questions, product by product

**Margins** are cash after card fees: 2.9% + 30¢ on a card, nothing on a bank
transfer. Founder hours are the scarce input, so each product also gets an
hour rate. Hours are this page's **assumptions**, not measurements. The first
ten of each product replace them.

**The founder's hours** set the ceiling. `docs/TIME.md` and
`docs/LIQUIDITY.md` put the founder at 10–15 hours a fortnight on
introductions at the first pool, at one hour per introduction. Every hour a
paid product needs comes out of the same budget.

### 1. Talking it through, with a matchmaker (was "Deciding together")

| Question | Answer |
|---|---|
| **Who pays** | The couple, once. |
| **When** | After the joint view of the two-sided eleven, i.e. after he has answered (rung `he-answered`). Never at the stage she declares. `deciding` is a free, measured word (`docs/BOARD.md`, decision 16). |
| **Value already created** | Both have answered the eleven blind. They have seen where they match and where they don't. The family words are in their hands. All of it is free. |
| **What exactly they buy** | One conversation, about an hour, with a human matchmaker: the founder at first. It walks through what the joint view found. Nothing else. |
| **Earn more if she stays stuck?** | **As first written, yes.** "Once per courtship" earned again each time a courtship ended and a new one began. **Now no.** It is once per person for life, so a second courtship's conversation is free. It is also paid before the decision and is the same whatever they decide, so the person in the call has no stake in a yes. |
| **Deliverable?** | Only in small numbers. About 1.5 founder hours per sale: the call, reading the joint view first, and booking it. Ten a fortnight would be the founder's whole budget. |
| **Margins** | $99 less $3.17 in fees is $95.83, about 97% cash. That is about $64 per founder hour. Hours bind long before demand does. |
| **Support burden** | Booking and rescheduling. A refund when a call does not happen. One card dispute costs its $15 fee plus the $99. It needs the mailbox that answers. |

**The finding.** As written, this line bundled three things: the two-sided
eleven with its joint view, the family scripts, and the call. Two of the three
were already on the free list (`src/data/plus.ts`, `freeForever`;
`docs/BOARD.md` said so). It also carried the name of the free stage, so Home's
"Deciding together" card read as the thing listed under "What will cost money".

### 2. A matchmaker in your corner

| Question | Answer |
|---|---|
| **Who pays** | The families: not the member, and not the man. |
| **When** | At the nikah, and only if there is one (rung `married`). |
| **Value already created** | Introductions made, vetted and walked through, and a marriage both chose. |
| **What exactly they buy** | A matchmaker's work, paid for after it has worked. This is how the role has always been paid. The payment buys nothing going forward. |
| **Earn more if she stays stuck?** | No. Nothing is owed if nothing comes of it. **But it earns from a yes, not from a good yes.** A success fee pays the matchmaker to see a marriage happen, which is pressure in the wrong direction at the one moment pressure does the most harm. Challenge 2 is the answer. |
| **Deliverable?** | Not yet. There is no pool, and the introductions record is designed but not built. About 10 founder hours per marriage is the assumption: five introductions at an hour each, two hours of vetting and three of follow-up. |
| **Margins** | A $1,500 fee, with the company's share half: $750 a marriage, about $75 an hour of company margin. It rises to $150 an hour while the founder is also the matchmaker. **Services margins, not software's** (`docs/BACKWARD.md`, the margins row). No card fee on a bank transfer. |
| **Support burden** | Collection months after the work, from families, by hand. Chasing an unpaid fee costs more in a word-of-mouth community than the fee is worth. The first real dispute is a reputation event, not a ticket. |

### 3. The first year married, as a gift

| Question | Answer |
|---|---|
| **Who pays** | A guest: someone who is not the couple. |
| **When** | At the wedding (rung `married`). |
| **Value already created** | The marriage. |
| **What exactly they buy** | The conversations nobody warns you about after the wedding: in-laws, money, the first real argument. **This product does not exist.** |
| **Earn more if she stays stuck?** | No. It is bought once, by someone else, before anything has gone wrong. It must never be sold on "if things get hard", or it earns from a marriage struggling. |
| **Deliverable?** | Once written, yes: a sheet like `docs/SHEET.md`'s, with no running cost. It can reach the couple as a link or a printout the guest hands over, so no one's map is involved. |
| **Margins** | $79 less $2.59 in fees is $76.41, about 97%, with near-zero hours per sale after it is written. The only software-margin line. |
| **Support burden** | Low: a lost link, or a refund. The couple never deals with us at all. |

### 4. Sponsor a place: retired

| Question | Answer |
|---|---|
| **Who pays** | A woman who has just married, at the end of the Ending screen. |
| **When** | On the screen a marriage is reported from, which is the one outcome metric (`docs/STRATEGY.md`). |
| **Value already created** | Everything, all of it free. |
| **What exactly they buy** | **Nothing that exists.** "Pay for the next woman's place", where places cost nothing. It was a donation with no stated use. |
| **Earn more if she stays stuck?** | No, but it puts an ask on the one screen that must never carry one. STRATEGY's own sentence: "the moment reporting a marriage costs money, marriages stop being reported". |
| **Deliverable?** | There was nothing to deliver. |
| **Margins** | Undefined. |
| **Support burden** | What was it spent on? Is it a charity? Is it deductible? No answer existed to any of the three. |

**Decision:** removed from `src/data/ending.ts` and `src/components/Ending.tsx`.
The Ending asks for nothing, and `tests/monetization.test.tsx` renders it to
hold that. If the auntie's part returns, it returns as something that exists,
for example paying the next couple's call. It would come with a stated use and
its own gate, and it would never go on the Ending.

### 5. Events: struck until defined

| Question | Answer |
|---|---|
| **Who pays** | Unstated. |
| **When** | Per ticket. |
| **Value already created** | None specific. |
| **What exactly they buy** | A room. |
| **Earn more if she stays stuck?** | **Yes, structurally.** A ticket per event earns most from the person who stays single and keeps coming. That is per-use pricing, which `src/data/plus.ts` rule 2 forbids. |
| **Deliverable?** | No: venues, mahram norms, the safety of strangers meeting, and liability. None of it is written. |
| **Margins** | Thin at community-event prices, before the venue. |
| **Support burden** | The highest of any line: refunds, no-shows, and incidents in a room we are responsible for. |

**Decision:** events leave the revenue list in `docs/STRATEGY.md` and
`docs/PRODUCT.md`. An event may come back only free to members, or paid once
and not per attendance, and only with its own eight answers here.

### 6. Niyyah+: retired, kept as the counter-example

A monthly, six-month or yearly plan whose one real feature was "your guide,
without a counter", with a seven-day trial to start it.

- **Who pays:** the member.
- **When:** every month.
- **What she buys:** more replies.
- **Earn more if she stays stuck?** Yes. It is paid most by the member having
  the worst night.

Removed before this audit (`src/components/Plus.tsx`'s header). It is the
shape every line above is checked against.

---

## B. The four challenges, and what decides each

### Challenge 1: Deciding Together

**Challenged:** it sold the free things, earned again from each ended
courtship, and shared a name with a free stage.

**Decided, and built:**
- **Only the call is sold**, under its own name: "Talking it through, with a
  matchmaker". The joint view and the family words stay free and are no part
  of it.
- **The price is once per person, for life.** If this courtship ends, the next
  one's conversation is free. A couple pays once, and a member who has had one
  never pays again.
- **It is offered only after both have seen the joint view.** It is never a way
  to see it, and never offered at the stage she declares.
- **The person on the call has no stake in the answer.** The call is paid
  before the decision and is the same whatever they decide. A couple
  introduced by a matchmaker who is owed a fee at their nikah gets this
  conversation from someone else, or for free as part of that fee. The one
  person who must never run it is someone paid only if they say yes.

**What must be true before it is sold:**
1. **Delivery, before launch.** The founder gives the call **free** to the
   first five couples who reach the joint view and ask for it. At least 3 of
   the 5 say it changed what they talked about. No couple says it pushed them.
   Hours per call are written down.
2. **Demand.** At least 10 couples reach the joint view in one month
   (`/progress` `he-answered`).
3. **Price, at launch.** Once a pool opens, the call is offered by hand, with a
   hosted payment link, to the next ten couples who are not founding members.
   At least 3 buy at the written price.

Founding members keep it free for their year (`src/data/plus.ts`), and that
free year is paid for in founder hours. The ten conversations in
`docs/FEEDBACK.md` ask about it; nothing in the app records it.

### Challenge 2: human matchmaking

**Challenged:** it has no pool, no record, and no founder hours spare. It
collects months late, by hand. And a success fee earns from a yes, not from a
good yes.

**Decided (the rules, now on the Plus screen):**
- **The fee is agreed before the first introduction**, in writing, with both
  families. It is never raised, never negotiated at the wedding, and never
  asked of the member.
- **The fee is fixed.** It does not grow with time, introductions or effort.
  Nothing is prepaid, so no one pays to be introduced.
- **Nothing is owed without a nikah** both spouses chose.
- **Paying gives a family no say** and none of her data, and never more
  introductions.
- **The joint view comes before any nikah the matchmaker is paid for.** A
  success fee is only acceptable after the couple have been through the
  eleven, blind, on their own phones. That is the check against pressure.

**What must be true before it is built:**
1. A pool is open on `docs/LIQUIDITY.md`'s checklist.
2. The introductions record exists (`docs/LIQUIDITY.md`), because a fee needs a
   record of who introduced whom.
3. At least 3 in 10 families in the ten conversations, and 3 practising
   matchmakers, name a payment and an amount. `docs/REDTEAM.md` #7 set this
   kill threshold. The amount they name replaces the $1,500 prediction.
4. The founder can carry at least 10 introductions a fortnight alongside
   everything else (`docs/TIME.md`).

**Collection** is by invoice and bank transfer. There is no payment code for
this line at any stage before a second matchmaker exists (`docs/SCALE.md`).

### Challenge 3: post-marriage products

**Challenged:** a product sold to a couple who have just paid for a wedding,
or one that earns if a marriage struggles, fails the rule outright.

**Decided:**
- The only post-marriage line is the **guest's gift**. The couple are never
  sold to.
- Nothing is sold that is framed on things going wrong.
- It is renamed **"The first year married, as a gift"**, so it is not
  confused with the free year for everyone counted before their pool opens.

**What must be true before it is sold:**
1. The first-year sheet is written and given **free** to the first married
   couples.
2. At least 2 of them say it helped, in words the founder can quote.
3. Someone asks to give it to somebody else, unprompted.
4. A pool has opened: prices are set at launch, not before.

**Mechanism:** a hosted payment link that delivers the sheet to the buyer, who
hands it on. Gift code is built only past 10 sales a month.

### Challenge 4: family-paid outcomes

**Challenged:** a payer becomes the customer. A family that pays can come to
believe it has bought a say: screening, pressure to marry, a claim on what she
told us.

**Decided:**
- A family may pay only two things:
  - a matchmaker's fixed success fee at a nikah;
  - a guest's gift.
- A payment never buys visibility, data, introductions, a say or a
  timetable. The member's promise stands: she is charged nothing (the bounded
  promise in `src/data/plus.ts`).
- Nothing a family pays is prepaid, so no family pays to produce a match.
- How the fee is split between the two families is theirs to decide, as
  custom has it, and is written in the agreement.

**What must be true before it is built:** everything in challenge 2, plus a
one-page family agreement written in plain words. One practising matchmaker
and one imam or community elder must read it before the first family signs
it. It says what the fee is, when it is owed, that it buys nothing else, and
what happens if the families disagree.

---

## C. Payment identity: what must be true before any money is taken

Niyyah promises no email and no phone, and a code is the only identity it
holds. A card payment carries a name, an email, a billing address and a card.
Joining the two would undo the work in `docs/PRIVACY.md`.

- **Payment records stay with the processor.** Nothing about a payment is ever
  written to Blobs, `/export` or the learning record.
- **Nothing a buyer bought is delivered by her map code.** Either the call is
  booked by email, out of band, or the sheet is a link sent to the buyer. The
  founder never looks up a buyer's map, and a payment never asks for a code.
- **Trust gets one sentence**, in the commit that takes the first payment:
  what a payment reveals, and to whom.
- **An entity, terms of sale and a refund policy exist**, and the mailbox on
  the domain answers (`docs/CONTROL.md` step 5).
- **Tax is someone's job.** The UK and the EU tax a foreign seller's first
  consumer sale of digital services, and US states vary. Whether that means a
  merchant of record at about 5%, or an accountant, is decided before the
  first link goes live. That is a question for the accountant, not for this
  page.

---

## D. No payment infrastructure: the decision, and when it changes

**Nothing is built for payments until a gate in section B passes.** Pricing
existing in a document is not a reason to build.

When a gate passes, money is first taken **by hand**:
- an invoice and a bank transfer for the matchmaker's fee;
- a hosted payment link for the call and the gift.

**Code comes only when collecting by hand is the bottleneck**, at about ten
transactions a month for a line. The code change deletes this page's "No gate
has passed" sentence and changes `tests/monetization.test.tsx` in the same
commit.

**Nothing in the app asks whether someone would pay**: no "notify me when it
launches", no price test, no interest button. What someone would pay is learned
in the ten conversations, where a person can say why, and is not tracked.

---

## E. The incentive audit: the first run (2026-09-24)

Every sentence on every screen that names a paid stage, a price or money was
read against one question: **does it earn more if she stays single longer,
opens the app more often, or is having a worse night?** It was also checked for
truth. Each line got a verdict, and every fail was fixed in this change.

| Where | Sentence | Verdict | Fix |
|---|---|---|---|
| Plus, hero | "What we will sell is bought once — for a stage, or for a person" | Pass on incentive; **fail** on truth, since two of the three lines are not bought by her | "paid once, after something real has already happened" |
| Plus, paid lines | A "Bought once" badge on all three | **Fail**: the matchmaker is a family's fee at a wedding, and the gift is a guest's | Each line says who pays, when and after what, rendered from `src/data/plus.ts` |
| Plus, paid lines | "Deciding together … the two-sided eleven, the family scripts, and one call" | **Fail**: it sold two free things | The call alone |
| Plus, paid lines | "Bought once, for one courtship" | **Fail**: it earned again each time a courtship ended | Once per person, for life |
| Plus, paid lines and Home | The same name, "Deciding together", for the free stage and the paid line | **Fail**: the free stage read as a product | Paid line renamed |
| Plus, footnote | "If Niyyah does its job you will stop paying us" | **Fail**: it implies she is paying now | "you will stop needing us" |
| Plus, free-year box | Labelled "The first year", like the paid "The first year, as a gift" | **Fail**: one name for two things | "A free year, if you were counted early"; the gift renamed |
| Plus, promises | "If you stay single, we earn nothing from you" | **Fail** on truth: false for a member who bought the call and whose courtship ended | "…paid once in your life, so staying single never earns us more" |
| Plus, promises | "Nothing here is priced by the reply, the message, or the hour" | Pass | — |
| Plus, guide budget | "There is no counter on the screen and no way to buy more" | Pass | — |
| Ending | "Sponsor a place for someone else … pay for the next woman's place" | **Fail**: money for a free thing, with no use, on the outcome screen | Removed |
| Profile | "What's free, and what isn't — Almost everything, forever. Nothing here is priced by the reply or the month." | Pass | — |
| Profile | "The door, the price, an invite" | **Fail** on truth: there is no price | "The door, what's free, an invite" |
| Home | The deciding card | Pass: it opens the free eleven or the joint view, and names no price | — |
| Guide | The "Matchmaker" voice: "there is nobody for me to introduce you to yet" | Pass: no voice names a payment, a price or a paid line | Now held by test |
| Cohort (the door) | No money copy | Pass | — |

**Held by `tests/monetization.test.tsx` from now on:**
- every paid line has a payer, a moment and a rung;
- nothing is priced by time or use;
- no paid line sells a free thing;
- no paid line uses a stage's name;
- the guide never sells;
- the promises keep the member out of every payment;
- the rendered Plus shows who pays and no price;
- the rendered Ending asks for no money;
- `package.json` carries no payment SDK while no gate has passed.

The audit reruns at every release that touches a paid line, a price or a
screen that names one (`docs/PROCESS.md` item 9). A new run adds its rows
under a new date.

---

## F. Kill criteria, stated before the data

Written down now so the data cannot argue with them later
(`docs/EXPERIMENTS.md`'s form).

| Product | Killed, or repriced, if |
|---|---|
| The call | Fewer than 3 of the first 5 free calls change what the couple talked about. Fewer than 3 of 10 buy at launch. Any couple says the call pushed them toward an answer. Calls average over 2.5 founder hours, in which case it is repriced or stopped, not squeezed. Courtships that had the call end from `deciding` at a sharply different rate from those that did not, in either direction, and the conversations say why. |
| The matchmaker | Fewer than 3 in 10 families, or fewer than 3 matchmakers, name a payment. A family's payment is ever used to ask for her data or a say, and was not refused. A member reports pressure from a matchmaker: that matchmaker stops. More than 1 in 3 fees go unpaid after a nikah: stop and learn why, and never chase. |
| The gift | Ten married couples use the sheet free and nobody asks to give it. |
| Family-paid | Everything in the matchmaker row, and the elder or imam will not put their name to the agreement. |

---

## What must be true, in one table

| Product | Built now | Deserves implementation when | First mechanism |
|---|---|---|---|
| The call | Copy only: the line, its terms, its badge | 3 of 5 free calls help; 10 couples a month reach the joint view; a pool opens; 3 of 10 buy | A hosted payment link, booked by email |
| The matchmaker | Copy only: the rules | A pool opens; the introductions record exists; 3/10 families and 3 matchmakers name an amount; the founder has the hours | Invoice and bank transfer |
| The gift | Copy only: the name | The sheet exists and is used free; 2 say it helped; someone asks to give it; a pool opens | A hosted payment link to the guest |
| Family-paid | The rule that payment buys nothing | The matchmaker's gate, plus the agreement read by a matchmaker and an elder | The same invoice |
| Sponsor a place | Removed | A stated use, its own eight answers, and never on the Ending | — |
| Events | Struck | Free to members or paid once, with its own eight answers | — |
| Any payment code | None | About 10 transactions a month on a line whose gate passed, plus section C | Whatever section C allows |
