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
  and the same for `read` and `eleven`. His completion is
  `rungs['he-answered'] / rungs['asked-him']`, both from her device — not the
  `eleven` rung, which mixes his couple-side completions with women's own
  (`docs/BOARD.md`); `began.couple` against `he-answered` separates "opened and
  quit" from "never opened".
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
- **METRIC.** `facts.followedThroughBy.asked.guide` — of everyone who ever
  asked the guide (one bit, `facts.asked`, since 2026-09-12), how many followed
  through on a conversation, against everyone who did not ask; and, later,
  `facts.ending.used.guide`.
- **SMALLEST CREDIBLE TEST.** One set-bit, built (`src/lib/facts.ts`,
  `netlify/functions/progress.ts`): the same shape as `began`, so it can never
  become a count of how often. Read it at twenty `followed-through`.
- **TIME TO LEARN.** Weeks, not months — the ending is now the second reading,
  not the first (`docs/BOARD.md` decision 15).
- **DECISION RULE.** At twenty `followed-through`: if followed-through per
  hundred among those who asked the guide is not above those who did not, the
  live model goes and the local voice stays. At the first endings, the old
  rule as well: fewer than one in five naming the guide confirms it.

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
- **SMALLEST CREDIBLE TEST.** Two, neither a fake price. This month, before
  any member: the wedding-payment question in the ten conversations, and three
  practising matchmakers on what they charge and who pays (`docs/BOARD.md`).
  Then the first nikah from the first pool: the family's payment to the
  matchmaker is outside the founding promise — bounded 2026-09-12 to what a
  member is charged — so the concierge's first ten couples are the test, in
  year one rather than year two. A pre-order is still ruled out.
- **TIME TO LEARN.** Quarters.
- **DECISION RULE.** Defer. The proxy until then is `ending.who.family`: if
  families are still the ones bringing people together, the role being sold is
  the right role.

## A7 · Forty and forty is a working market

- **HYPOTHESIS.** A pool at the door's target — forty women and forty men
  with kept maps — can introduce nearly everyone in it: after lapsed maps,
  people already talking to someone, the age band and the two checkable
  non-negotiables in both directions, few on either side have nobody.
- **WHY WE BELIEVE IT.** Arithmetic, not evidence. `docs/LIQUIDITY.md`'s
  model gives about twenty eligible partners each at forty and forty if half
  of all pairs clear the gates — and warns that the gates correlate, so age
  can strand a whole side at once while the door reads full.
- **WHAT WOULD CONFIRM IT.** `/pool` at forty and forty: `stranded` reads
  `null` on both sides and `pairs.eligible / pairs.of` is near a half.
- **WHAT WOULD DISPROVE IT.** `stranded` reads a number on the abundant
  side — five or more women with no eligible man — or `pairs.eligible /
  pairs.of` under a fifth. Then forty and forty is a count, not a market.
- **METRIC.** `/pool` `pairs`, `stranded`, `inventory`, `unaged`, `ages`.
- **SMALLEST CREDIBLE TEST.** **Built in this pass** — the readout, and
  nothing more, because the test needs a door near forty and there is none.
- **TIME TO LEARN.** The first pool to reach the door's target.
- **DECISION RULE.** The opening checklist in `docs/LIQUIDITY.md`, every
  line, or the pool does not open; the blocker is named by `ages` and the
  pair rate and answered with the room the link goes into, never a wider
  band.

**The age ask at the door** (2026-09-10, `docs/LIQUIDITY.md`) sits between
`mapped` and `counted` on both sides. A1's and A6's `counted` funnels read
across it, and `docs/PROCESS.md` carries the rule for a drop after that date.

## A8 · The couple it worked for reaches the side nobody else can

- **HYPOTHESIS.** A married couple will send the door to someone who is
  looking — through the spouse's side — and that is how serious, unattached
  men arrive without a woman being attached to them.
- **WHY WE BELIEVE IT.** Reasoned. Every other loop reaches a man already
  attached (`docs/WEDGE.md`); the moment she is married the cost of
  forwarding inverts (the ending's own thesis); his friends are the one room
  of unattached men she can reach. Nobody has been asked.
- **WHAT WOULD CONFIRM IT.** `sidesByVia.man.married.arrived` reads a number
  after the first endings, and its `counted / arrived` is no worse than
  `group`'s.
- **WHAT WOULD DISPROVE IT.** Ten endings and the cell still `null` — the
  couple sends the eleven or nothing, and the door ask is decoration.
- **METRIC.** `sidesByVia.man.married`; `vias.married.counted / arrived`.
- **SMALLEST CREDIBLE TEST.** **Built in this pass** — the second share
  (`docs/FLYWHEEL.md`). Nothing else.
- **TIME TO LEARN.** The first ten endings — the slowest of the eight;
  honestly, years.
- **DECISION RULE.** Ten endings and `sidesByVia.man.married.arrived` still
  `null` → the door ask is rewritten once — the copy, not the mechanism. Null
  after ten more → dropped, and the ending sends the eleven alone.

## The ranking

By learning value × business importance × whether it can run at all today.

| # | Experiment | Learning value | Business importance | Runnable now | Build |
|---|---|---|---|---|---|
| **1** | **A1 instrument completion** | **High** — answers a question no store can answer today | **High** — top of every funnel; the wedge depends on the couple side | **Yes** | **One field** |
| 2 | A2 vouch asked-vs-given | High | High — the only verification claimed | Yes | **Built** — the readout |
| 3 | A4 family scripts confirmed | Medium | Medium-high | Yes, slowly | None |
| 4 | A3 the guide's worth | Medium-high | Medium — the only live cost | Needs endings | None |
| 5 | A5 willingness to pay | High | High — the whole model | No | Blocked by a promise |
| 6 | A7 forty and forty is a market | High — the whole marketplace turns on it | Highest — the opening decision | Needs a full door | **Built** — `/pool` |
| 7 | A8 the couple reaches men | High — the only loop to the scarce side | High — the flywheel's one referral | Needs endings | **Built** — the second share |

Experiment 1 is the only one that is simultaneously high-value, wedge-critical,
and impossible to answer today. It is the one that got built.

**A6 · The door, for men** lives in `docs/MACHINE.md`, where the whole-machine
read that produced it is. Its decision rule — four weeks of `?door&via=group`,
read against `sidesByVia.man.group`, the men that link produced rather than
men who arrived through someone's eleven — is written there and mirrored in `docs/PROCESS.md`'s kill
table; its result is logged below like the others. `docs/REDTEAM.md` is why the
cell, not the side, is the number.

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
