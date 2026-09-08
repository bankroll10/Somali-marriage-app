# Niyyah — five assumptions, written as experiments

> MJ DeMarco's Scientist Strategy: a product opinion is a hypothesis wearing a
> confident voice. `docs/GAPS.md` classified what this product believes about
> the *market*. This file turns the lens on the *build* — the design decisions
> already shipped, each of which is a bet nobody has settled. Every one is
> written with its decision rule fixed **in advance**, so that when the numbers
> arrive they cannot be argued away.

## A1 · Onboarding length and profile depth

- **HYPOTHESIS.** A serious person will answer thirteen questions about herself
  before receiving anything, and the depth of those answers is what makes the
  map worth having.
- **WHY WE BELIEVE IT.** Opinion — and the product contradicts itself about it.
  `src/data/intake.ts` records a cut from twenty-three questions to thirteen on
  the evidence of two testers who "stopped partway through": a conversation,
  not a measurement. `src/components/Welcome.tsx` carries the opposite belief in
  a comment — "Making her answer thirteen questions about herself first is a
  toll gate, not an onboarding, and it is where we lost Samira." Samira is a
  persona. Both are opinion; they disagree; neither has ever been checked.
- **WHAT WOULD CONFIRM IT.** Most people who begin an instrument finish it, and
  those who finish reach the next rung more often than those who do not.
- **WHAT WOULD DISPROVE IT.** A majority abandon partway, concentrated in one
  instrument.
- **METRIC.** Completion rate per instrument: `rungs.mapped / facts.began.map`,
  and the same for `read`, `eleven`, and `couple` (his side finishes by writing
  his own sheet, so his completion appears as the `eleven` rung).
- **SMALLEST CREDIBLE TEST.** Record one bit when each questionnaire is begun.
  Nothing else — the completion half is already a rung. **Built in this pass.**
- **TIME TO LEARN.** Twenty arrivals through the wedge playbook: days, not
  months, once the first group link is posted.
- **DECISION RULE.** Read completion under 60% → shorten the read before doing
  anything else with it. Intake completion under 50% → cut the map to one
  chapter and re-measure — and since `docs/NORTHSTAR.md` moved the three
  "how you'd live" questions in (thirteen became sixteen), the one chapter
  kept is the one with them in it: this rule is what polices that change. Couple completion under 50% → the eleven is too long
  for a man arriving cold, and the two-sided flow is what to fix, not the
  channel. Above those, length is not the constraint and must not be optimised
  further; the counter-metric is `followed-through` per hundred `arrived`,
  which must not fall while completion rises.

## A2 · Verification is a family vouch

- **HYPOTHESIS.** A woman will ask a male relative to vouch for her, he will do
  it, and that single act is verification enough.
- **WHY WE BELIEVE IT.** Opinion, culturally reasoned. `docs/PRODUCT.md` calls
  the vouch "the only verification we claim"; `docs/STRATEGY.md` calls the vouch
  graph "unfakeable at scale." Nobody has ever asked. The ask is heavy: she must
  tell a father or a brother that she is looking.
- **WHAT WOULD CONFIRM IT.** Vouches given per vouch asked is high, and vouched
  members reach later rungs more often.
- **WHAT WOULD DISPROVE IT.** Few ask — shame at asking; or many ask and few
  relatives finish — friction on his side. Different failures, different fixes.
- **METRIC.** `vouched` per hundred `kept`, and the missing half: vouches given
  per vouch *asked*.
- **SMALLEST CREDIBLE TEST.** **The data already existed and nothing read it.**
  `netlify/functions/vouch.ts` writes an `asked/<code>` key on every ask; that
  key was read only for idempotence and for deletion on forget. Counting those
  keys in the founder's readout is a counting change with no new collection at
  all. **Built in this pass** — `GET /vouch` with no code is the tally:
  `{maps, asked, given, byRelationship}`, and the decision rule below reads in
  one call. It ranked first in `docs/BETS.md` as B1.
- **TIME TO LEARN.** The first ten kept maps.
- **DECISION RULE.** Asks under one in four kept maps → the ask is the problem;
  rewrite it or move where it appears. Asks healthy but vouches under half →
  the relative's screen is the problem. Both healthy → the vouch is real, and
  becomes the centre of the trust claim rather than a hope inside it.

## A3 · The guide is the value at zero liquidity

- **HYPOTHESIS.** Guidance is worth opening the app for before any marketplace
  exists, and it is what carries the first hundred people.
- **WHY WE BELIEVE IT.** Reasoned from mechanics, and stated in
  `docs/STRATEGY.md` as the answer to the cold start. It is also the only live
  cost: `netlify/functions/guide.ts` calls a model, capped hourly since the
  Time pass.
- **WHAT WOULD CONFIRM IT.** People who used the guide reach later rungs more
  often, and name it at the ending.
- **WHAT WOULD DISPROVE IT.** It is opened once and never again, and
  `ending.used` rarely names it — the instruments carry everything and the
  guide is an expensive ornament.
- **METRIC.** `facts.ending.used.guide` share; `followed-through` among people
  with a guide-sourced follow-up.
- **SMALLEST CREDIBLE TEST.** No build. `ending.used` already carries `guide` as
  a closed option, and a guide follow-up can already resolve to `asked`, which
  lights `followed-through`. Read it.
- **TIME TO LEARN.** Needs endings, so months — the slowest of the five.
- **DECISION RULE.** If fewer than one in five who reach an ending name the
  guide, stop paying for the live model and keep the local voice.

## A4 · Family-oriented progression

- **HYPOTHESIS.** People want family *in* the room, and will use written words
  to put them there — the wali, hooyo, two families meeting.
- **WHY WE BELIEVE IT.** Opinion, stated throughout: "You want your family in
  the room — not managing you from outside it." Five scripts exist for it.
- **WHAT WOULD CONFIRM IT.** Family scripts are taken and later confirmed as
  said, at a rate comparable to the read's question and the eleven's.
- **WHAT WOULD DISPROVE IT.** Scripts are opened and never taken, or taken and
  never confirmed — family stays a thing to be managed, not invited.
- **METRIC.** `facts.through['family:<id>']` per hundred who reached `mapped`.
- **SMALLEST CREDIBLE TEST.** No build. The follow-up asks "Did you have that
  conversation?" three days later, and an `asked` outcome already travels.
- **TIME TO LEARN.** Weeks — the follow-up waits three days by design.
- **DECISION RULE.** If no family script is confirmed as said by twenty people
  who built maps, the family path is aspiration rather than product, and the
  vouch — not the scripts — is where family effort should go.

## A5 · Willingness to pay at the nikah

- **HYPOTHESIS.** Families will pay a matchmaker at the wedding, out of the
  celebration, the way they always have — and will pay this product that way.
- **WHY WE BELIEVE IT.** The cultural half is attested. The product half is
  untested, and no price exists anywhere in the code: `src/data/plus.ts` says
  prices "are set at launch, not here."
- **WHAT WOULD CONFIRM IT.** A real checkout completes at a real price.
- **WHAT WOULD DISPROVE IT.** People reach the point of sale and do not buy.
- **METRIC.** Paid conversions on "Deciding together" at the first pool.
- **SMALLEST CREDIBLE TEST.** Blocked, deliberately. The promise that everyone
  here before launch keeps every paid feature free for a year rules out a
  pre-order, and a fake price would be the one lie this product cannot tell.
  The first honest test is a real checkout when the first pool opens.
- **TIME TO LEARN.** Quarters.
- **DECISION RULE.** Defer. The proxy until then is `ending.who.family`: if
  families are still the ones bringing people together, the role being sold is
  the right role.

## The ranking

By learning value × business importance × whether it can run at all today.

| # | Experiment | Learning value | Business importance | Runnable now | Build |
|---|---|---|---|---|---|
| **1** | **A1 instrument completion** | **High** — answers a question no store can answer today | **High** — top of every funnel; the wedge depends on the couple side | **Yes** | **One field** |
| 2 | A2 vouch asked-vs-given | High | High — the only verification claimed | Yes | **Built** — the readout |
| 3 | A4 family scripts confirmed | Medium | Medium-high | Yes, slowly | None |
| 4 | A3 the guide's worth | Medium-high | Medium — the only live cost | Needs endings | None |
| 5 | A5 willingness to pay | High | High — the whole model | No | Blocked by a promise |

Experiment 1 is the only one that is simultaneously high-value, wedge-critical,
and impossible to answer today. It is the one that got built.

**A6 · The door, for men** lives in `docs/MACHINE.md`, where the whole-machine
read that produced it is. Its decision rule — four weeks of `?door&via=group`,
read against `sides.man` — is written there and mirrored in `docs/PROCESS.md`'s
kill table; its result is logged below like the others.

## What was missing, and what `began` fixes

Every instrument here is all-or-nothing: `buildRead` and `buildBeforeYes`
return null unless every question is answered, and the map exists only when the
intake completes. So the ladder recorded finishing and nothing recorded
starting. A six-of-eleven read and a zero-of-eleven read were byte-identical in
every store, local and remote. The intake had no start signal of any kind.
Worst of all, on the couple side — the one the wedge depends on — a man who
opened her link and quit at topic five left **nothing on either device**: her
phone could not tell that from his never having opened it.

That last case is why this ranked first. If men open the eleven and abandon it,
the readout would say *words do not travel* when the truth is *the eleven is
too long for a man arriving cold*. Opposite diagnoses, opposite fixes, and
until now indistinguishable.

`facts.began` is the denominator: one bit per instrument per person, for ever.
Against `rungs`, which counts who finished, it is the completion rate — and
both are whole-population counts, so both stay readable numbers at founding
scale where a floored split would read `null` and say nothing.

**The line this walks.** `docs/LEARNING.md` refuses attention traces and names
"opens" among them. This is not that, and the difference has to hold or the
field should not exist: `began` is a **set, not a counter**. The merge is a
union, so "how many times she opened it" is structurally uncomputable — the
same way the tally shapes elsewhere make a desirability count uncomputable.
There is no time, no session, no return. Its purpose is to learn whether a
questionnaire is too long, which is a fact about the questionnaire. It must
never be widened into a counter; if a future engineer wants that, the answer
is no, and this paragraph is why.

**Considered and declined.** *Recording where she stopped* — far more
informative, and rejected: it would need a write on every question, which is a
behavioural stream and exactly what the charter refuses. The completion rate
answers the decision rule without it. *A tab-close listener* — literal
surveillance of leaving. *Resuming a partial read* — a real improvement and a
separate change; it belongs to a product pass, not an instrumentation one.

## Results log

_Dated, one line each: the experiment, what the readout showed, and which
decision rule fired. A rule that fires is executed, not debated._

- _(none yet — no instrument has been begun by anyone but the founder)_

## Talking to users about these

Two of the five — A2's ask-vs-shame split and A5's willingness to pay —
cannot be settled by any readout. `docs/GAPS.md`'s ten behaviour-anchored
questions are the method; `docs/FEEDBACK.md` is where the answers go, each
one tagged back to the experiment id above it bears on.
