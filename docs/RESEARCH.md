# Research: how Niyyah learns what is true

What Niyyah does not know yet, how it finds out, and what it does when it
does. The North Star, followed-through per hundred arrived, is defined in
`docs/PRODUCT.md`. Real member evidence is zero: every rate below is a
readout field waiting for its first records.

## How a claim is classed

**KNOWN**: a source, or the code. **LIKELY**: culturally attested or reasoned
from the mechanics, unmeasured here. **ASSUMED**: stated flat, with a lot
resting on it; most of the strategy. **UNKNOWN**: not asserted, or admitted as
a gap. A claim moves one class at a time, only on a method in "How we learn".
Founder opinion is ASSUMED, dated, until behaviour or a member says otherwise.

## The open questions

Ranked by danger to the product if wrong. "The convictions" ranks the same
beliefs by danger to the company, differently; read both.

| # | If this is true… | Class | What tests it |
|---|---|---|---|
| 1 | **Men do not follow women** (the men's gap). He arrives through her read or her eleven; if he does not, the two-sided eleven has no second side | ASSUMED; the most rests on it | `sides.man` rungs, which tell "never arrive" from "arrive and leave at the read"; `he-answered` against `asked-him`; `sidesByVia.man.group` |
| 2 | **Words do not travel.** Then paid acquisition, which the strategy forbids, is the only path | ASSUMED | The one-to-one vias' share of `arrived` against `group`; followed-through per hundred arrived |
| 3 | **People will not put a map on a server** | ASSUMED | `kept / mapped`. Before the `kept` rung, built and kept were one number |
| 4 | **The instruments are not wanted** | ASSUMED | `read`, `eleven`, `followed-through` per hundred `arrived`; `ending.used` |
| 5 | **Family is a barrier, not a feature** | ASSUMED | `through['family:*']` (A4) |
| 6 | **The eleven are not what breaks marriages** | ASSUMED; central | `ended.reason`, `.which`; `/couple` `both-not-talked` per topic; `marriedBy.through` |
| 7 | **Nobody pays at the nikah.** Fatal to revenue, later in time | ASSUMED | A5; until a sale, `ending.who.family` |
| 8 | **The alternatives are good enough** | ASSUMED | The ten conversations only |
| 9 | **The seven non-negotiables are the wrong seven** | ASSUMED | `ended.which['non-negotiable']`, `marriedBy.ended['non-negotiable']` |
| 10 | **The taxonomy of harm is wrong** | ASSUMED / LIKELY | `safety` reasons and `other`'s share, as `resolved.byReason` in `/safety`. Resolving once deleted a report, which made this uncomputable; now it leaves the kind of harm and what was done, joined to nobody |

**Also classed.** Somali populations (Twin Cities ~84,000, Columbus
50–60,000, UK 176,645, Toronto ~20,000): KNOWN, census. A small city's
members are re-identifiable from their facts: KNOWN, and why every split is
floored at five (`netlify/shared/floor.ts`). Seriousness is behaviour, not
words: ASSUMED; `ending.mattered.shown`, `marriedBy`. The fear is exposure
and screenshots; the target segments; why people hesitate: ASSUMED, and only
conversations test them since age, the hesitation question and the door's
hook tally went on 2026-09-24. The hook's answer reaches no readout.

## How we learn

In order of credibility, the only order in which a claim is promoted:

1. **Behaviour already recorded.** The first hundred people are the
   experiment; the monthly hour reads them.
2. **One tap at the moment, from a closed list.** Never free text, never
   about a person. Its one instance, the hesitation question, went with the
   door.
3. **Ten conversations**, run as `docs/PROTOCOL.md`, logged under
   "Feedback". What people did, never what they would do:
   - The last time you wanted to meet someone seriously, what did you do? Who knew?
   - What have you tried before this, and what happened?
   - When something ended, how did it end, and who did you tell?
   - Who in your family knows you are looking? Who would you want to know?
   - When has anyone in your family paid a matchmaker, and what for?
   - What would you never want a screenshot of?
4. **Founder opinion.** ASSUMED, dated, never promoted without one of the
   three above.

**Lists.** Every closed list's `other` or `none` share is the test of the
list: for the hook, `none` above a third meant the five hardest parts were
the wrong five, and since "Something else" was added `none` means only
skipped (`docs/DECISIONS.md` decision 8). A list changes in the monthly
hour, one change at a time, on a hundred records.

**Declined.** "What did you try before this?" inside the app: it describes a
person, and only pairings, conversations and questions are collected
(`docs/PRIVACY.md`). A pre-order to test price: `docs/PRODUCT.md` rules out
recording willingness to pay in the app.

**Reclassification log** (date, claim, from → to, evidence):

- 2026-09-12 — *Families already pay matchmakers, at the nikah*: LIKELY →
  ASSUMED. No source in the repository. Amounts, without names, in the
  feedback log would move it back.

## Experiments

Each has a hypothesis, a measure, a decision rule written before the numbers
exist, and a status. A new one copies the shape and adds the smallest test:
no build if the data exists, one field if not. A rule that fires is
executed, not debated.

### A1 · Onboarding length and map depth

- **Hypothesis.** A serious person answers sixteen questions about herself
  before receiving anything (one optional; cut from twenty-three on two
  testers who stopped, then three "how you'd live" questions added).
- **Measure.** `rungs.mapped / facts.began.map`, and the same for `read` and
  `eleven`. His side: `rungs['he-answered'] / rungs['asked-him']`, both from
  her phone; `facts.began.couple` against `he-answered` tells "opened and
  quit" from "never opened".
- **Decision rule.** At twenty arrivals. Read under 60% → shorten the read
  first. Map under 50% → cut to one chapter, the one with the "how you'd
  live" questions. Couple under 50% → fix the two-sided flow, not the
  channel. Above those, length is not the constraint. Counter-metric:
  followed-through per hundred arrived must not fall as completion rises.
- **Status.** Built (`facts.began`). No readings.

### A2 · Verification is a family vouch

Retired with the vouch, 2026-09-24.

### A3 · The guide is worth opening the app for

- **Hypothesis.** Guidance carries the first people. It is also the only
  live cost: `netlify/functions/guide.ts` calls a model, under hourly and
  daily caps.
- **Measure.** `facts.followedThroughBy.asked.guide`: of everyone who ever
  asked the guide (one bit, `facts.asked`), how many followed through,
  against everyone who did not. Later, `facts.ending.used.guide`.
- **Decision rule.** At twenty `followed-through`: if those who asked the
  guide follow through no more often than those who did not, the live model
  goes and the local voice stays. At the first endings, fewer than one in
  five naming the guide confirms it.
- **Status.** Built (`src/lib/facts.ts`; `docs/DECISIONS.md` decision 15).
  Kept on by the founder's choice, 2026-09-10. No readings.

### A4 · Family-oriented progression

- **Hypothesis.** People want family in the room and will use written words
  to put them there.
- **Measure.** `facts.through['family:<id>']` per hundred who reached `mapped`.
- **Decision rule.** No family script confirmed as said by twenty people who
  built maps → the family path is aspiration, not product.
- **Status.** Nothing to build. No readings.

### A5 · Willingness to pay

- **Hypothesis.** Families pay a matchmaker at the nikah, as they always
  have; couples pay once for a call after the joint view. No price exists in
  code.
- **Measure.** The wedding-payment question in the ten conversations; three
  practising matchmakers on what they charge and who pays.
- **Decision rule.** The gates in `docs/PRODUCT.md`, written before any
  sale; below three in ten, conviction 7's rule. Until a sale,
  `ending.who.family`. A pre-order or a fake price is ruled out.
- **Status.** No conversation logged. No gate has passed.

### A6, A7, A8

Retired 2026-09-24: A6 (the door for men) and A7 (forty and forty is a
market) with the door and the pool; A8 (the Ending's door share) with the
door. The Ending shares the eleven alone, which was A8's own fallback.

### A9 · The eleven travels through institutions

- **Hypothesis.** A mosque's nikah packet, a counselling service or a
  resource list carries the eleven to couples, and some open the app.
- **Measure.** `vias.<via>.arrived`, `.eleven`, `.asked-him`, `.he-answered`
  for the placement's via. Not page opens. The test is
  `/guides/before-you-say-yes` and its one-page sample, sent with two pitches.
- **Decision rule.** Eight weeks after two accepted placements: five or more
  `eleven` under that via → add a `partner` via and ask for the next
  placement. Fewer than five arrivals → no more building for institutions;
  the printed page stays and outreach moves to the rooms.
- **Status.** Built. Waiting on two accepted placements.

### `began`: the denominator

Every instrument is all-or-nothing, so the ladder recorded finishing and
nothing recorded starting: a man who quit her eleven at topic five left
nothing on either phone. `facts.began` is one bit per instrument per person,
for ever; against `rungs` it is the completion rate. It is a set with a union
merge, so how often she opened something cannot be computed. It must never
be widened into a counter. Recording where she stopped was declined: a write
on every question is a behavioural stream (`docs/PRIVACY.md`).

**Results log** (date, experiment, reading, rule fired): _(none yet)_

## Feedback

One entry per session, conversation, email or comment, from outreach or the
passive channel (`CONTACT_EMAIL`, `src/lib/site.ts`). The ten sessions use
`docs/PROTOCOL.md`'s template, which keeps this shape. **No name, ever**: a
city and a stage are enough. **Paraphrase any quote that could identify
someone**: this log is committed. Every entry says what it bears on (a gap,
an experiment id, a conviction) or `new`, and a `new` gets a row before
anything else. The app's no-free-text rule governs what the app asks, not
what the founder writes about a conversation they chose to have.

```markdown
### <date> · <session | conversation | email | comment>
**Context.** <city, stage, how they found it — never a name>
**What they said.** <paraphrased, third person>
**Bears on.** <gap, A-id, conviction, or "new" — and what changed>
```

### 2026-09-12 · walk

**Context.** The founder on a phone, on the live site. Not a member.
**What they said.** Asked, at question 7 of the read as a man, whether the
answers were a bug. They were right; three things behind them were not. His
result called her "he"; three of the eleven questions graded him backwards,
the family question worst; no family script was his. Fixed: results pass
through `speak()`, `approach-her-family` exists, and
`tests/invariants/both-sides.test.ts` holds it.
**Bears on.** Gap 1, conviction 1; an answer to neither. **New rule:**
nothing ships to a side of the product nobody has walked on a phone.

## What the ladder can and cannot answer

Eleven rungs (`src/lib/rungs.ts`; `RUNGS` in `netlify/shared/vocab.ts`).
Each counts people who ever reached it, on its own: someone can be
`deciding` without a read, so a ratio of rungs is a share, not a strict
conversion.

| Stage | Here | Rung or field |
|---|---|---|
| Attention, landing | Words forwarded; posts in rooms; the instrument a link names | None, by design |
| Arrival | First report with "Tell us which steps you reach" on | `arrived`; `cohorts`; `vias`; `scenes` |
| Onboarding | Identity, Situation | `situated` |
| The map | Sixteen questions, a reflection, kept under a code | `mapped`, `kept`; `facts.began.map`, `facts.grounds` |
| Conversation | The read, the eleven, his side, the words, "did you say it?" | `read`, `eleven`, `asked-him`, `he-answered`, `followed-through`; `facts.through`; `/couple` |
| Progression | Talking to deciding; the family words | `deciding`; `facts.ended`; `through['family:*']` |
| Money | Nothing sold; no gate has passed | None |
| Success | Married; the Ending | `married`; `facts.ending`; `facts.marriedBy` |
| Referral | The Ending's eleven share (`via=married`); forwarded words | The one-to-one vias |

Match liquidity, match quality and mutual interest went with matching.

**The men's funnel.** Without gender, "men never arrive" and "men arrive and
leave at the read" read the same. `gender` on the progress record (chosen at
Identity, last told wins) gives `sides`, floored: `sides.man` is `null` until
five men arrive, the first moment a conclusion about men is worth drawing.
`facts` are never split by side; facts × gender × city would only narrow who
a record could be. `sidesByVia`: see conviction 12.

**It cannot answer:** who saw or opened a link; where she stopped inside a
questionnaire; why anyone stopped; who sent a link (a via is a kind, never a
person); time, sessions, returns; one person's timeline; which guide
conversation was had (the guide's follow-ups count toward `followed-through`
and never enter `facts.through`); facts by city, via or side; marriages
nobody reports. Any split under five reads `null`, not zero.

**Work on the weakest link, or on nothing.** The last one named, a looking
man with no link to the door, went with the door. None is named now; A1's
rates are the first candidate at twenty arrivals.

## The convictions

The case against each belief the company rests on. Evidence is a census
figure, a readout field, a code comment recording two testers or three
timed calls, or *none*; nearly all of it is *none*. A failure the company
survives ranks below one it does not. Every test waits on the first post.

| # | Conviction | What kills or validates it |
|---|---|---|
| 1 | Somali singles want a Somali-specific product | Ten conversations, three bins: *nobody there*, *could not trust who was there*, *did not understand our situation*. Fewer than four in ten in the third → specificity is a cost paid for the founder's comfort |
| 2 | The market is large enough | "Second", below |
| 3 | People will complete a detailed map | A1 |
| 4 | The eleven name what ends courtships (was "compatibility systems improve outcomes"; no matching system has been shown to predict success: Finkel et al. 2012, Joel et al. 2017) | After twenty endings, most `ended.reason` outside the eleven → conversation value, not predictive value |
| 5 | A family vouch is worth its friction | Retired with the vouch, 2026-09-24 |
| 6 | Quality over quantity: the door's honest count | Retired with the door, 2026-09-24 |
| 7 | People will pay | "Third", below |
| 8 | Money is aligned with outcomes | Paid at the rarest event, a company is pulled to claim it: the incentive audit, every release |
| 9 | Family features matter | A4. The hook names family pressure and Welcome promises "not your family"; nobody has asked which she wanted |
| 10 | AI creates meaningful value | A3. Leaving the key unset until twenty endings was proposed and declined, 2026-09-10. Unset it and the local voice answers |
| 11 | The first geography and user are right | The wedge's rule in the kill table; `scenes[city].arrived` |
| 12 | Distribution works without paid levers | "First", below |

3, 4, 9, 10 and 11 change the product's shape and it goes on. Three leave
no company:

### First · Distribution cannot bring people (12)

The model forbids paid acquisition, referral rewards, boosting and a feed,
and relies on forwarding, which says "I am looking". **Why the readout
crosses side with via:** a man who arrived through a woman's eleven is
already talking to her and says nothing about whether a room brings men.
`sides` and `vias` alone cannot tell him from a man the group link brought;
`sidesByVia.man.group` can.

- **Ten connectors.** Ask ten people who could post the group link whether
  they would, this month; log yes, no or a condition. Fewer than three
  unconditional yeses → pivot to mosque young-adult circles now. Set for
  2026-09-15; nothing logged.
- **Two weeks after the first post.** `vias.group.arrived` and the room
  kinds (`alumni`, `professional`, `mosque`) `null` → change the room. Read
  `sidesByVia.man.group` beside them; a man who leaves before choosing a
  side is `unsaid`.
- **Eight weeks.** The wedge's rule. And the five one-to-one vias (`words`,
  `eleven`, `couple`, `family`, `married`; `src/lib/entry.ts`) under a tenth
  of arrivals → "the words travel, the product is the footnote"
  (`docs/PRODUCT.md`) is demoted to ASSUMED.
- **Validates:** five or more men through the group link by week two.

### Second · The market is small, and specificity keeps it small (2 with 1)

The way out, the wider Muslim diaspora, is conviction 1 failing, and the
brand's first line forbids it. **The arithmetic, every fraction assumed:**
Twin Cities ~84,000 → aged 22–36 ~21,000 (25%) → unmarried ~11,500 (55%) →
looking this year ~4,600 (40%) → ~2,300 a side → ~700 a side reachable
through alumni and professional networks (30%). Across about two million
(unsourced), five percent of marriages paid once at a few hundred to a
couple of thousand is half a million to a few million a year at full reach:
a good business, not a large company.

- **This month.** Six or more in ten say *nobody there* → the need is
  density, which a product with no pool does not meet; expansion moves to now.
- **Weeks 1–8.** The sum of `cohorts[*].arrived` against ~700 a side:
  a plateau under seventy while the link is posted → the market is the
  ceiling. With a second city posted, restate it by `scenes`.
- **Validates:** six or more in ten in the third bin.

### Third · Nobody pays (7 with 8)

- **This month.** "At the last wedding in your family, was anyone paid for
  bringing the two of them together — who paid, how much, and when?"
  Amounts, never names. Fewer than three in ten name a payment → it stays
  ASSUMED, and the call after the joint view is re-examined as the first
  product rather than a fee at the nikah.
- **Decided.** The price is a written prediction, dated 2026-09-11
  (`docs/PRODUCT.md`), so a sale tests a belief.
- **When endings exist.** `ending.who.family`.
- **Validates:** seven or more in ten name a payment with an amount, and a
  sale completes at the written price more than once.

## The process

Observe and measure: the weekly pulse and the monthly hour. Identify: a new
problem gets a row in "The open questions" before it gets a build.
Hypothesise: an experiment with its rule. Build: the smallest slice, one
commit. Ship: a PR against `main`, `.github/workflows/verify.yml` green. Talk:
"Feedback". Learn: the three logs. Iterate: the roadmap in `docs/PRODUCT.md`.

**Precedence.** A rule written before its build (A1's twenty arrivals, the
ten conversations, the three-in-ten thresholds) overrides the hundred-record
floor. The floor governs constants and class moves no rule names.

**The weekly pulse**, beside the safety check in `docs/OPS.md`, does two
things: acts on an open report, and notices a cliff, a number that was
moving and stopped. A cliff is a reason to look sooner, never a revision.

```bash
curl -s -H "$K" $S/progress | jq '.rungs, .sides, .sidesByVia.man, .facts.began'
```

### Release review

In front of every PR (`.github/pull_request_template.md`); CI enforces 2 and 3.

1. It helps someone find out earlier, and ends in something they can say.
2. `npm run verify` is green: typecheck, lint, the suite.
3. `npm run build` succeeds.
4. A new value the server accepts is a closed id in `netlify/shared/vocab.ts`
   with its `src/` twin (`tests/vocab-sync.test.ts`). Old records keep old
   ids; stored records are never migrated.
5. A new `netlify/functions/` file joins `tests/deploy-layout.test.ts`'s
   allowlist; a founder readout, `tests/invariants/founder-routes-fail-closed.test.ts`;
   a link kind, `tests/invariants/links-open-the-right-thing.test.tsx`; a
   screen, `tests/ui/screens.test.tsx` (`docs/TESTING.md`).
6. Trust copy moves in the same commit as the payload it describes.
7. A new closed list or readout field is documented in `docs/PRIVACY.md`.
8. A hypothesis bigger than a copy fix has an experiment here, rule written.
9. Nothing ships to a side nobody has walked on a phone.
10. One commit per logical slice.
11. The incentive audit: each sentence naming a paid stage, a price or money
    — does it earn more if she stays single longer, opens the app more, or
    is having a worse night? First run 2026-09-24, in `docs/PRODUCT.md`.

**What comes next** is judged on learning value (does it answer a gap?),
business importance, runnable now, durable (would it matter without the
model supplier?), and recorded-or-lost: a feature jumps the queue only if it
records a vote otherwise lost for ever. No numeric score: it would claim
precision over questions classed ASSUMED.

### Kill criteria

A feature with no rule is an opinion running in production.

| Feature | Kill or change when | Where |
|---|---|---|
| The live guide | A3's rule | A3 |
| Family words as the path | A4's rule | A4 |
| Onboarding length | A1's thresholds, by instrument | A1 |
| The eleven through institutions | A9's rule | A9 |
| The wedge channel | Eight weeks and fewer than five men through a group link (`sidesByVia.man.group.arrived`; `press` excluded, an article is not a room) → channel first (mosque young-adult circles), city second (Columbus). Its women's half read `counted`, gone with the door | `docs/PRODUCT.md` |
| Support as one inbox | More than a handful of emails in a week | `docs/OPS.md` |
| The safety queue, one reader | A second reader needed, or a report waits over a week | `docs/SECURITY.md` |
| Any dependence on a live model | An instrument cannot run without a key (`tests/durable.test.ts`) | `docs/PRODUCT.md` |
| The company | The three kill tests above; when one resolves, rerun the convictions before the next roadmap pick | Above |

**Declined.** A member-facing feedback form: it would need an account or a
code to route a reply. A weekly revision cadence: reading often is fine;
deciding often is what the monthly hour prevents.

## The monthly loop

The constants in `src/data/` ship in the bundle and can be copied; the
process that revises them from what happened cannot, and exists only if it
runs. Read monthly: read daily, a readout becomes a dashboard, then a
metric, then what the product optimises for. The ladder is the only metric;
everything else is calibration. `docs/OPS.md` says how to reach each
readout; `docs/PRIVACY.md` says what each field means.

**The number.** Open `/progress` and read `cohorts`: per arrival month,
`{arrived, followedThrough}`. Compute `100 × followedThrough / arrived` for
this month's row and last month's.

```bash
curl -s -H "$K" $S/progress | jq '.cohorts | to_entries | sort_by(.key) | .[-2:]
  | map({month: .key, arrived: .value.arrived,
         perHundred: (if .value.arrived > 0 then (100 * .value.followedThrough / .value.arrived | floor) else null end)})'
```

Whole-population, never floored. A row keeps growing as its people follow
through later, so the newest has had least time: log each month's figure
when read. Only people with "Tell us which steps you reach" on are in it. A
record past its year is deleted on read unless it reached `married`.

**The decision it feeds.** Flat → nothing below matters yet. Fallen after
last month's revision → that revision is the first suspect: a constant that
makes a fact look better while this number falls is wrong. It is also A1's
counter-metric.

**The hour, in order:**

1. **Is anyone being helped?** The number. `scenes[city]` gives it by city, all time.
2. **Which link brings people who follow through?** `followed-through / arrived` per via; `group` against `words`.
3. **Which conversations get had, not only handed out?** `facts.eleven.open` against `facts.throughByTopic`.
4. **What do couples miss?** `/couple` topics where `one-thinks-talked` and `both-not-talked` lead.
5. **Who did they marry, and what was real?** `facts.ending.who`, `.used`.
6. **One revision**: the clearest row below; move its constant; log it.
7. **Save the backup** (`docs/OPS.md`).
8. **Do people finish what they open?** A1's ratios.
9. **Reread "The open questions".** At most one claim, one class, on a hundred records.
10. **Check every rule on the books**: the kill table. A rule that fires is executed.

| Constant | File | Revised by | Rule of thumb |
|---|---|---|---|
| `consequence` per topic | `src/data/eleven.ts` | `eleven.open` × `throughByTopic` × `marriedBy.through` | Often opened, rarely said, rare among the married: raise it |
| The read's `PRIORITY` | `src/lib/read.ts` | `read.thin` × `marriedBy.readThin` | Thinnest as often for those who marry as for those who do not: move it down. No summed weights return (`docs/PRODUCT.md` S3) |
| `stateOf` (0.75 / 0.5) | `src/lib/reflection.ts` | `grounds[dim]`, rated grounds | Thin for most of the community: the threshold measures the community; move it. Faith, family, vision are never rated (S5) |
| Scripts | `src/data/read.ts`, `eleven.ts`, `families.ts` | `through["source:topic"]` against how often handed out | Often handed out, rarely said: rewrite. Never confirmed: cut |
| Joint `URGENCY` | `src/lib/couple.ts` | `/couple` `topics[topic][joint]` | The joint state pairs most land in is the one the line names |
| The `dealbreakers` question | `src/data/intake.ts` | `ended.which['non-negotiable']` × `marriedBy.ended` | Ends nothing: aspirational; the question changes |
| The Ending's question order | `src/data/ending.ts` | `ending.*` answer rates against `married` | Skipped by most: asked last, or dropped |

**Rules.** One revision a month: two moves at once cannot be told apart. A
hundred records for a weight, a `consequence` or anything that changes a
reading; twenty for wording, order or a label (`docs/DECISIONS.md` decision
11). The ladder decides, not the facts. A rule written before its build
overrides the floor. Nothing here becomes a score on a person.

**Revisions log** (month, readout row, constant, move, the month's number):
_(none yet)_
