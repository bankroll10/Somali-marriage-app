# Niyyah — the atomic network

> Andrew Chen's *Cold Start Problem* says a network product is not valuable
> at "N registered users". It becomes valuable the moment its **atomic
> network** exists — the smallest group in which the product reliably works
> for a new arrival and which sustains itself without the founder pushing.
> Everything before that is the cold start; the job is to reach it once, in
> one place, and copy it. This file defines Niyyah's atomic network from the
> code and the documents, says what makes one healthy, ranks what most
> reduces liquidity, names the assumptions only members can settle, and
> lists the metrics that will eventually read the network's health. It ends
> with the technical work that follows. **Nothing in it is built.**

The founder's question, which this file answers: *if one serious eligible
user enters this network today, how likely are they to encounter several
genuinely compatible, active possibilities?*

Method: the code was read for what the marketplace computes
(`netlify/functions/pool.ts`, `netlify/shared/gate.ts`,
`netlify/functions/cohort.ts`); the documents for what they assume
(`docs/LIQUIDITY.md`, `docs/WEDGE.md`, `docs/SCALE.md`, `docs/BACKWARD.md`);
and the pool's own eligibility rule was simulated under stated distributions
(`docs/atomic-sim.mjs`, seeded — `node docs/atomic-sim.mjs` reproduces every
table here) to see what the number the product reports says about the number
the founder asked about. Labels as everywhere in these documents: **FACT** (in
code or a document), **INFERENCE** (arithmetic on facts), **HYPOTHESIS**
(needs members to settle).

## The short answer

Not several — not at anything the door can reach this year. At the atomic
network defined below, a new woman has about a four-in-five chance of *one*
genuinely compatible, active man, and about one in four of three. "Several"
needs sixty to a hundred *active* members a side in one metro, and whether
forty is enough depends on one number the product does not hold and only
hand-made introductions can produce. The readout the product has cannot
tell: it passes at nine a side.

## 1 · What kind of network this is

Niyyah is two products sharing one door, and only one has a network effect.

- **The instruments** — the read, the eleven, the family scripts, the guide
  — are single-player. Each works for one person with nobody else on the
  product. The two-sided eleven is a *two-player* tool: it needs the other
  half of a couple, but that counterpart is already attached. In Chen's
  words, "come for the tool": value at N = 1.
- **The door and the pool** are the network — a two-sided marketplace of
  preparing women and preparing men in one metro, where what a new arrival
  gets depends on who is already there. This is the part with a cold start,
  and the only part.

FACT — the network side is almost entirely unbuilt as software. `pool.ts`
computes a *readout* — who could be introduced to whom; nothing introduces
anyone. There is no introductions record, no notification, no pool-open flag,
no queue. The founder reads a count and mails people by hand from an exported
contacts list (`docs/LIQUIDITY.md`, `docs/OPERATING.md`). Today the "network"
is a counted list, a compatibility gate and a person.

That is the right shape for a cold start — Chen's "do things that don't
scale", the concierge phase. It means the atomic network has to be defined in
terms a **matchmaker with a readout** can serve, not a recommendation engine.

## 2 · The hard side

Every network has a hard side — the minority whose presence is worth
disproportionately much and is disproportionately hard to get — and the
atomic network is built around solving *their* problem first.

- FACT — the documents name it: **serious, unattached men** (`docs/WEDGE.md`:
  "the binding constraint is not women"). Every loop that reaches a man today
  reaches one already attached to the woman who sent him the read or the
  eleven — the opposite of supply.
- FACT — three ratios were carried across the documents (1:3, 5–6:1, 6:1);
  `docs/BACKWARD.md` needs ≤ 3:1 for the economics. None is measured.
- INFERENCE — the hard side is not "men". It is *preparing men in one metro
  who will (a) answer three questions and leave a way to be reached, (b)
  still be reachable when a woman is offered, and (c) say yes to an
  introduction to a stranger their own community will hear about.* Each
  clause loses people; the product measures only (a).
- INFERENCE — the hardest side within the hard side is the man's **family**.
  The product's own scripts say his people go to hers. A man who is counted
  but whose family will not move is a name, not supply.

So the atomic network is sized by the men, and its health is read on the
men's side first.

## 3 · What the readout says about liquidity, and what it hides

`pool.ts` reports, per pool: `door`, `live` (kept map unexpired), `supply`
(live *and* preparing), `unaged`, `pairs.eligible / pairs.of`, `inventory` (a
floored histogram of eligible partners per member: `0`, `1-2`, `3-5`, `6+`)
and `stranded` (the `0` bucket). `eligible(w, m)` is:

- both aged, and he is at most ten years older or three younger
  (`AGE_GAP = { olderBy: 10, youngerBy: 3 }`), and
- neither side's **checkable** non-negotiables block the other
  (`gate.ts`): `faith-nn` against his practice being cultural or returning;
  `kids-nn` against a clash on children (want/no, no/want, no/open, open/no).

The other five non-negotiables — honesty, respect, clean living, direction,
how he treats the powerless — cannot be read from a form and gate nothing.
Nothing else gates: not the map, not relocation, not qabiil, not family, not
attraction. That is deliberate (`docs/LIQUIDITY.md`: the only preferences the
product lets fragment a pool), and right for a pool of forty. It also means
the readout's "eligible" is not "compatible".

**Layer 1 of the simulation** — `pool.ts`'s exact rule; women 24–34, men
26–36, practice 30/40/20/10 devout/consistent/returning/cultural, children
70/25/5, `faith-nn` named by 60% of women and 50% of men, `kids-nn` by 40%
and 30% — every distribution a HYPOTHESIS; 300 trials a row:

| Pool | Eligible-pair share *p* | Women with ≥ 3 eligible | Men with ≥ 3 eligible | Women in `6+` |
|---|---|---|---|---|
| 40/40, age rule only | 85% | 100% | 100% | 100% |
| 40/40, gate only | 67% | 98% | 99% | 98% |
| **40/40, as built** | **56%** | **98%** | **98%** | **97%** |
| 12/12 | 56% | 91% | 87% | 64% |
| 8/8 | 56% | 80% | 76% | 35% |
| 40/13 (3:1) | 56% | 92% | 98% | 67% |
| 40/7 (6:1) | 56% | 74% | 99% | 25% |

INFERENCE, and the central finding: **the coded gate barely fragments a
pool.** At twelve a side the readout already says nine in ten members have
three or more eligible partners; at forty a side nearly everyone has six or
more and `stranded` reads `null` under the k-floor. `docs/LIQUIDITY.md`'s
model writes eligible partners per member as `λ = other side × p` and set its
opening line at `λ ≥ 5` both sides. With *p* ≈ 0.56 that holds at **nine a
side**. The opening checklist, as it stood, measured the two things the gate
can see and none of the things that decide whether two Somali families reach
a nikah — and would have passed long before a pool was useful.

Two readout defects make it looser still (FACT, `pool.ts`):

- **`stranded` is read from the floored inventory**, so one to four people
  with nobody come back `null`, and the checklist read `null` as a pass. At
  atomic scale that is exactly the range that matters: a pool of twenty can
  carry four stranded women and read clean.
- **`unaged` counts over `live`, not `supply`**; a kept map with no `stage`
  is read as `preparing` and counted into supply; and the join itself
  (`POST /cohort`) requires neither age nor stage — only code, scene, gender
  and country. The client gates age; the server does not.

So "how many compatible options would a new arrival see" cannot be read from
`inventory`. It needs a second layer.

## 4 · The second layer — what the readout cannot see

Two hidden quantities the architecture does not hold:

- **q** — the share of *eligible* pairs where an introduction would be
  welcome on both sides once the founder makes it: the five uncheckable
  non-negotiables, the sixteen-question map, family, qabiil, relocation,
  attraction, timing. HYPOTHESIS. Serious-intent matchmaking runs well below
  open dating; three values bracket it — 0.30 generous, 0.15 plausible,
  0.08 hard.
- **a** — the share of counted members who would answer an introduction
  this fortnight. FACT: the product cannot compute this. A kept map is `live`
  for a year (`keep.ts`), there is no last-seen by design (`docs/LEARNING.md`),
  and `supply` counts a map kept eleven months ago exactly as one kept
  yesterday. Bracket: 1.0 and 0.5.

**Layer 2** — a new arrival's chance of at least one, and at least three,
genuinely compatible *and active* options (400 trials a cell; each cell is
≥ 1 / ≥ 3 for a woman; the men's figure equals it at equal sides and exceeds
it at every imbalance):

| Pool | q 0.30, a 1 | q 0.15, a 1 | q 0.08, a 1 | q 0.15, a 0.5 |
|---|---|---|---|---|
| 20/20 | 93% / 61% | 78% / 26% | 58% / 8% | 56% / 6% |
| **25/20** | 93% / 61% | **79% / 26%** | 56% / 7% | 54% / 6% |
| 40/40 | 98% / 88% | 93% / 61% | 80% / 29% | 77% / 25% |
| 60/60 | 99% / 95% | 96% / 79% | 88% / 49% | 87% / 45% |
| 100/100 | 99% / 98% | 98% / 93% | 95% / 74% | 95% / 72% |
| 40/13 (3:1) | 86% / 39% | 64% / 11% | 43% / 2% | 41% / 2% |
| 40/7 (6:1) | 68% / 12% | 45% / 2% | 27% / 0% | 25% / 0% |
| 120/40 | 98% / 89% | 92% / 61% | 79% / 28% | 77% / 25% |

INFERENCES:

1. **Forty and forty is "several options" only if q is generous.** At the
   plausible q a woman arriving at 40/40 has a coin-flip chance of three
   genuine options; at the hard q, one in four. "Several" needs sixty to a
   hundred a side, per metro, *active*.
2. **The imbalance is worse than the count.** At forty women and seven men —
   the documents' pessimistic bound — a woman has under a one-in-two chance
   of even *one* real option at the plausible q, and none of three. The men
   in that pool are drowning in choice. That is Chen's anti-network effect on
   the abundant side: women arrive, see nothing, leave, and tell the room.
3. **Activity halves everything.** If half of counted members have gone
   quiet, 40/40 behaves like 20/20 — and the door keeps saying forty.
4. **The count is not the unit.** *p* is flat across sizes; what changes with
   N is the tail — how many people have zero or one option. The atomic
   network is defined by the tail, not the total.

## 5 · What Niyyah's atomic network probably looks like

**One metro. One age band. Preparing only. Active. Introducible by hand.**

| Dimension | The atomic network | Why |
|---|---|---|
| **Geography** | One metro as one pool — Minneapolis–St Paul first (`docs/WEDGE.md`; ~84,000, the largest US concentration). Not a country pool | Marriage is local: families meet, mahr is negotiated in a room. FACT: the door's `here` is everyone in the city whatever their reach; `across` is everyone in the country whose reach is not `city`; `anywhere` counts as `country` (`cohort.ts`). `docs/LIQUIDITY.md`: `N` people over `k` pools make ~`N²p/4k` pairs — two pools of twenty hold half the pairs of one of forty. Twelve named doors at four each is twelve dead networks |
| **Gender balance** | Between 1:1 and 2:1 women to men *among active preparing members* | The 40/7 row is a broken network for women; 40/13 is marginal. The hard side sizes the network: reach the men's number and the women's follows |
| **Age ranges** | Women 24–32, men 26–36, one pool; the rule (+10 / −3) already makes almost every pair age-eligible. **Do not split by age band** below ~100 a side | Splitting is fragmentation; the rule is generous on purpose |
| **Marriage readiness** | `preparing` only. FACT: `supply` already excludes talking, deciding and married, and count-me is offered to preparing only since 2026-09-12 | A talking member is a name on the door and a possibility for nobody |
| **Compatibility overlap** | The two checkable gates pass ~56% of pairs; the real overlap *q* is unknown and is the single most important number the first pool produces | §4 |
| **Stated preferences** | Only two gate, by design; the rest are scored or asked. Keep it so below 100 a side | Every added gate shrinks *p* multiplicatively |
| **Active-user share** | Unknown, unmeasured, and the thing most likely to make a healthy-looking pool dead. Target: ≥ 70% of `supply` answer an introduction within fourteen days | §4, point 3 |
| **Willingness to relocate** | `reach` is asked (city / country / anywhere) but a country pool is not a real pool yet. Relocation is a *tie-breaker* inside a metro pool, not a way to fill one | Families do not cross a country for a first introduction |
| **Activity frequency** | Not a retention product — a member should need to return only when there is a person to consider. "Activity" is *answers an introduction*, not *opens the app* | `docs/NORTHSTAR.md` refuses engagement metrics; the right one here is response |
| **Match inventory** | For a new arrival: ≥ 1 introducible, active person of the other side within fourteen days, ≥ 3 within the first thirty | The founder's question, made a threshold — and, at the atomic size, met on the first clause and not yet the second |
| **Recommendation constraints** | None exist — the founder matches by hand, one pair at a time, from the readout. That *is* the constraint: about one introduction per founder-hour (`docs/LIQUIDITY.md`). At 40/40 the readout says ~900 eligible pairs; a person can consider perhaps twenty a fortnight | The hand is the recommendation engine, and it is the bottleneck long before N is |

**In one line:** *roughly twenty-five active preparing women and twenty
active preparing men in one metro, all within the age rule, at least seven in
ten of whom answer an introduction within two weeks, served by one founder
making ten to fifteen introductions a fortnight with a hit rate she can see.*

Smaller than the forty-and-forty that was on the door — because the door
counted people and this counts *active, introducible* people — and much
harder to assemble, because the men are. And honest about what it delivers:
at the plausible q, one real introduction inside a fortnight for four in
five newcomers, not several. Several is the growth network (§4, 60/60 and
up), and whether forty reaches it is decided by q, which only introductions
reveal.

Why not the forty? Because forty is a count, and Chen's point is that the
atomic network is the smallest **stable** network, not the largest reachable
one. Stability here means: a new woman gets an introduction within a
fortnight; a man who says yes hears back; a pair that is introduced mostly
leads somewhere. Those are the conditions in §6, and they can be true at
25/20 and false at 40/40.

## 6 · Minimum conditions for a healthy atomic network

All of these, for one metro, before the door says "open". They replace the
first five lines of `docs/LIQUIDITY.md`'s checklist as it stood on
2026-09-10; the sixth line — the safety check and the founder's judgement —
is unchanged.

1. **Men ≥ 20 active preparing, and women ≥ men.** The hard side's number is
   the gate; the abundant side is never the constraint.
2. **Every member has ≥ 1 eligible, active counterpart, and ≥ 80% have
   ≥ 3** — read from the *raw* inventory, privately (§10, T3). `stranded`
   null under the floor is not a pass below forty a side.
3. **Activity ≥ 70%:** an introduction offered is answered within fourteen
   days by seven in ten. Below that the pool is a directory, not a network.
4. **The founder can make ≥ 10 introductions a fortnight, and the first
   twenty produce ≥ 3 "we are talking".** Under one in ten, *q* is too low
   for this pool's size and the network is not atomic yet, however many are
   counted.
5. **Replenishment ≥ exhaustion:** each fortnight's arrivals ≥ pairs that
   matched or lapsed. `docs/LIQUIDITY.md`'s arithmetic says a static 40/40
   exhausts in about nine months; the atomic network refills itself — a
   married couple's referral, a room posting weekly — or decays.
6. **The abundant side is told the truth.** The door has said the condition
   rather than a number since 2026-09-12. Women who arrive at 40/7 must not
   be told "forty" and then hear nothing.

Conditions 1 and 2 can be read today, by hand, from the maps. Conditions 3,
4 and 5 cannot be read from anything the product holds until an
introductions record exists (§10, T1) — which is why T1 is first.

## 7 · Which constraints most reduce liquidity — ranked

1. **The men, and specifically their activity.** Every ratio above 2:1
   collapses the women's inventory; every silent man collapses it further.
   The product measures neither the ratio among *active* members nor
   activity at all.
2. **Geography as a false pool.** A `country` pool merges cities whose
   families will not cross for a first meeting; `anywhere` adds nothing. The
   twelve metros named on 2026-09-12 are right as *names*; each is its own
   cold start.
3. **The hidden compatibility rate *q*.** Not something the product can
   change — it is what the community is — but the number that decides
   whether the atomic network is 25/20 or 100/100. Learnable only by making
   introductions and recording outcomes, and there is no record.
4. **The founder-hour.** One person, about an hour per introduction, no
   queue, no template mail, no outcome capture. At the atomic network this is
   ten to fifteen hours a fortnight of matchmaking; at 100/100 it is
   impossible by hand.
5. **The year-long `live`.** A map kept in January counts as supply in
   December. The readout overstates the network by the churn rate, which is
   unknown.
6. **The k-floor, applied to the founder's own gate.** Right for privacy;
   wrong as the operating instrument at atomic scale, where every cell is
   under five and `stranded` ≤ 4 reads as a pass. The founder needs the raw
   numbers for her own pool and the floored ones for everyone else.
7. **The two gates themselves** cost about 45% of pairs — acceptable, and not
   worth loosening; but every *additional* gate (a third non-negotiable, a
   qabiil filter, a relocation filter) multiplies the loss. Resist them below
   a hundred a side.

## 8 · Assumptions that need real-world validation

In order of how much of this file rests on each.

| # | Assumption | Label | Cheapest test |
|---|---|---|---|
| 1 | Preparing men will be counted at all through a room post, at ≥ 1 per 2–3 women | HYPOTHESIS | `sidesByVia.man.{alumni,professional,mosque}` at two and eight weeks (`docs/WEDGE.md`'s pivot rule) |
| 2 | *q* — the share of eligible pairs where an introduction is welcome both ways — is ≥ 0.15 | HYPOTHESIS | The first twenty hand-made introductions, outcomes recorded |
| 3 | Counted members are still there when offered someone — activity ≥ 70% | HYPOTHESIS | Response rate to the first twenty introduction mails within fourteen days |
| 4 | The two coded gates are the right two; nobody refuses for a reason the gate could have caught | HYPOTHESIS | The "no" reasons from the first twenty, as a closed list |
| 5 | A metro is the right unit — families will not cross a country for a first meeting | LIKELY; untested | The first counted members (`docs/PROTOCOL.md` Q16); the `reach` distribution |
| 6 | The age rule (+10 / −3) matches what families accept | ASSUMED | Age as a stated "no" reason |
| 7 | Women keep arriving and stay counted while the men's side is short — no anti-network flight | HYPOTHESIS | `counted → lapsed` on the women's side while men < 10; `hesitated` reasons |
| 8 | A married couple refers ≥ 1 new member (R ≥ 1) | HYPOTHESIS | `vias.married` after the first endings |
| 9 | The founder can sustain ten to fifteen introductions a fortnight by hand | ASSUMED | Time the first ten (`docs/LIQUIDITY.md`, the by-hand page) |
| 10 | Forty was the right door number | ASSUMED — probably too low for a coin-flip *q* and too high as a first gate | Replaced by §6's conditions in this pass |
| 11 | ~700 reachable a side in the metro (`docs/REDTEAM.md`: 84,000 × 25% aged 22–36 × 55% unmarried × 40% looking × 50% per side × 30% reachable) | Every fraction ASSUMED; the product of five guesses | `arrivedByDay` against the estimate after the first post; a plateau under seventy means the reachable pool, not the wedge, is the ceiling |
| 12 | A pool of 40/40 exhausts in ~9 months and refills by referral | INFERENCE on an assumed *p*; R untested | The replenishment metric (§9); `vias.married` |

## 9 · Network-health metrics — what to measure, eventually

None is an engagement metric; each is a fact about the network's ability to
serve a new arrival. Per pool, founder-only, raw for the founder and floored
for anyone else.

| Metric | Definition | Reads |
|---|---|---|
| **Active supply** | `supply` ∩ answered an introduction in the last thirty days | The real N per side |
| **Active ratio** | active women : active men | The hard side, honestly |
| **New-arrival inventory** | for the most recent ten counted per side: eligible × active counterparts | The founder's question, literally |
| **Days to first introduction** | counted → first introduction offered | Whether the network works for a newcomer |
| **Introduction response** | offered → answered within fourteen days | Activity — the only kind that matters here |
| **Introduction yield** | offered → "we are talking" | *q*, revealed |
| **Refusal reasons** | closed list: age, family, practice, children, distance, other | Which gate is missing, if any |
| **Stranded, raw** | members with zero eligible active counterparts | Who the pool is failing |
| **Exhaustion** | eligible pairs remaining ÷ pairs consumed per fortnight | Months of runway |
| **Replenishment** | arrivals per fortnight ÷ (matched + lapsed) | Self-sustaining or decaying |
| **Referral coefficient** | new counted per married couple | R — the only organic growth |
| **Room yield** | counted men per room post, by room kind | Where the hard side comes from |

Not measured, on purpose: opens, sessions, time in app, messages.

## 10 · The technical plan — what follows, when the founder says build

Ordered by what the atomic network needs first. Nothing here is a
recommendation engine, and none of it is built in this pass.

**T1 · An introductions record** — the missing primitive. `docs/LIQUIDITY.md`
and `docs/SCALE.md` already design it as Tier 4: `introduce.ts`, keyed by map
codes, codes stripped from any tally. One store, `introductions`, keyed by
pool and pair of codes; fields: the day offered, each side's answer (`yes` /
`no` / `no-answer`) and its day, a closed refusal reason, the outcome
(`talking` / `ended` / `married`) — all day-precision, no free text. Written
by a founder-only endpoint from the pool readout; read back into the readout
as §9's metrics. This turns *q* and activity from hypotheses into numbers.
`docs/HARD.md` row 13 says it ships in the same commit as the pool-open flag;
the `never-introduce` outcome finally has a subject. The pacing the documents
designed — one open introduction per person, a fourteen-day window, scarce
side walked first, waited-longest first, never shown to a member — is the
record's write rule, not a new design.

**T2 · Activity, without surveillance.** Not a last-seen. A member's
introduction answers *are* their activity; a counted member with no
introduction offered yet is "unknown", not "inactive". The readout's `supply`
splits into `answered-recently` / `never-offered` / `silent`.

**T3 · The founder's raw view.** `?raw=1` on `/pool`, founder-only, returning
the unfloored `inventory` and `stranded` and the per-member eligible counts
*by code*, so the founder can pick pairs. The public and the export stay
floored. Every atomic-scale cell is under five; the floor is right for the
world and useless for the matchmaker.

**T4 · The door reads its condition from T1 and T2.** "Opens when twenty
active men and twenty active women here can each be introduced" — computed
from active supply and inventory, not from `door` keys. `COHORT_TARGET`
stops being a constant on the door. *Held with the code, on purpose:* a
sentence promising "active" members with nothing measuring activity would be
a claim the code cannot back — the class of defect the reality sprint removed
— so the door keeps its current sentence until T1 and T2 give it something
true to say.

**T5 · A pool state.** `docs/LIQUIDITY.md`'s designed `pools` store, keyed
`<country>/<scene>` or `<country>/across`, holding `{ state, openedAt,
checklist }` with `forming → open → paused → closed` and the §6 reading kept
on the day it opened. Set by the founder, read by the door and by the "your
pool opened" runbook. Same commit as T1, as `docs/HARD.md` row 13 requires.

**T6 · Refusal reasons as a closed vocabulary** in `netlify/shared/vocab.ts`
with a `src/` twin, so §9's "which gate is missing" is readable.

**T7 · The readout tells the truth at small N.** `stranded` computed from the
raw inventory for the founder, floored only in what leaves; `unaged` over
`supply`; a kept map with no `stage` read as unknown and excluded from
`supply` rather than assumed `preparing`; the join requiring an age
server-side, as the client already does. Four small corrections to `pool.ts`
and `cohort.ts`, each with a test, so the checklist measures what it says.

**Explicitly not built:** matching, scoring, ranking, recommendations,
cross-city pools, a third gate, any per-member notification, any engagement
loop. The founder's hand is the matcher until the first hundred introductions
say what the algorithm should be.

## 11 · Sequence

1. **This pass — documents only.** §6's conditions replace "forty and forty"
   in `docs/LIQUIDITY.md`, `docs/WEDGE.md`, `docs/SCALE.md`, `docs/PROCESS.md`,
   `docs/OPERATING.md`, `docs/ROADMAP.md`, `docs/MACHINE.md`, `docs/GAPS.md`
   and `docs/EXPERIMENTS.md`. No code.
2. Run the research protocol (`docs/PROTOCOL.md`) — it already asks the
   questions that price assumptions 5, 6 and 7.
3. Build T1–T3 and T7 before the first room post, because introductions made
   without a record are *q* thrown away. T4–T6 with them or at the first
   pool.
4. Post into one metro's rooms; read the men's cells at two weeks.
5. At twenty active men, make the first twenty introductions by hand with T1
   recording each. That fortnight produces *q*, activity and the refusal
   reasons — the three numbers this whole file is missing.
6. Only then decide whether the atomic network is 25/20, 40/40 or 100/100 —
   from the yield, not from the door.

## What this pass changed in earlier documents

- `docs/LIQUIDITY.md`: the opening checklist is §6; the monitor table reads
  `stranded` raw, not floored; the density-thresholds row; the by-hand page
  sized to ten to fifteen a fortnight; a revision entry.
- `docs/WEDGE.md`: the door's promise as it now reads; the hypothesis and
  the density needed restated as §6.
- `docs/SCALE.md`, `docs/ROADMAP.md`, `docs/PROCESS.md`, `docs/OPERATING.md`,
  `docs/MACHINE.md`: every "forty and forty" gate points here.
- `docs/EXPERIMENTS.md`: A7's confirm and disprove read from the introductions
  record, because the readout passes at nine a side.
- `docs/GAPS.md`: the forty-and-forty row reclassified; *q* and activity
  added as the two unknowns that decide the atomic network.
- `docs/BOARD.md`: the pass recorded, and the decision to hold T4 with the
  code.
- `README.md`: this file in the index.

## Revisions

- 2026-09-12 — First version. Two products, one network; the hard side is
  preparing men's *activity*; the coded gate passes 56% of pairs regardless
  of size and the checklist's λ ≥ 5 held at nine a side; the second layer
  (*q*, *a*) is what decides; the atomic network is ~25 active women and ~20
  active men in one metro under six conditions; seven constraints ranked;
  twelve assumptions with tests; twelve metrics; T1–T7 planned and held.
  Documents only.
