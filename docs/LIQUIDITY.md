# Niyyah — liquidity, treated as the thing that kills matchmaking products

> A marriage marketplace can hold a hundred thousand registered people and
> feel empty to every one of them, because what a person experiences is not
> the register. It is the number of people who are eligible for her, still
> looking, and reachable — in the one pool she is in. This file treats that
> number as existential: it says what fragments it, models how it behaves as
> the product grows, names what the product does about it on purpose, and
> separates what was built now from what waits at a trigger. It is the design
> the first pool opens on.

## The claim

**Registration is not liquidity.** Liquidity is *eligible, live, reachable
pairs per member of the scarce side, in one pool* — and a member experiences
it as two numbers she never sees: how long she waits between introductions,
and how many people the other side has left to be introduced to. A pool can
fail on either. It can fail on the second while the door still reads full.

The product already had the right unit and the right refusals. The pool —
a city, or a country's travellers, reach mutual by construction, `other`
never opening — is the unit (`docs/SCALE.md`). No feed, no boosting, no paid
reach, no desirability count, no notification about a person are the refusals
(`docs/STRATEGY.md`, `docs/LEARNING.md`). What it did not have was any way to
tell whether a pool that reached forty and forty could introduce anyone. That
is what this pass built, and everything else here is designed around it.

## What the product knew, and what it could not see

Nine dimensions, each of which can split a pool into people who can and
cannot meet.

| Dimension | What splits a pool | Known today | Refused, on purpose | What it costs when unmanaged | The mechanism |
|---|---|---|---|---|---|
| **Geography** | A hundred small pockets across fifteen countries; a city is where she can meet someone this week, a country is where she would move | City, country and reach on every `cohort` key; the door's `here` and `across` | Location finer than the city; a viewer-dependent pool; a worldwide sentence on the door | Bristol and Aberdeen counted toward one door that can never open | The pool as the unit; `reach` asked once and mutual; "I'd travel within the UK" re-joins on one tap (`src/components/Cohort.tsx`); `/pool?country=` reads the travellers |
| **Age** | The age each family would consider; a 24-year-old and a 45-year-old counted as liquidity for each other | In the kept map — and, until this pass, optional, asked only behind "Add your age" on Profile | Age as a learned feature; an age band as a segment of the door's key (`docs/WEDGE.md`) | **The fragmenter the door cannot see, and the one that strands people** — a woman outside the men's band has nobody, whatever the door says | Age required at the door, into the map, never onto the door; `/pool` `ages` per side, floored; `AGE_GAP` as a stated assumption, gating nothing |
| **Gender balance** | Women arrive first; men arrive through them, already attached | The door's women and men; `sides`, `sidesByVia.man.group` | Boosting, seeding, paying a man for reach | The scarce side bounds throughput: at 120/40 she waits three times as long as at 40/40 | The honest door; the two asks; the queue walks the scarce side first (below) |
| **Stated preferences** | Seven non-negotiables, three values | All in the map; only `faith-nn` and `kids-nn` can be checked against another map | A stated non-negotiable overridden by inferred behaviour; an "inconsistent" flag | Only two of seven fragment a pool — **by design**; the other five become the first question, not a filter | `netlify/shared/gate.ts`, the twin of `matching.ts` `gate()`, both directions |
| **Marriage readiness** | Preparing, talking, deciding, married; the timeline; what she has done here | Stage in the map as of the last keep; the ledger on the door | Attention traces as a readiness proxy | A woman getting to know someone is on the door and is not supply | `/pool` `supply` (live and preparing) beside `stages`; one introduction at a time |
| **Active vs inactive** | People who kept a map and left | No last-seen, by design; a map lapses a year after its last keep | Last-seen, days since open, a nudge, "the pool moved since you were here" (`docs/BETS.md` B15, B16) | The door only ever rose (`docs/HARD.md` #12) | The sweep on every `/pool` read; designed: the reply to "your pool opened" as confirmation, `no-answer` as a closed outcome, two in a row → paused and told |
| **Match eligibility** | Whether *this* woman and *this* man could be introduced | Nothing computed, anywhere, until this pass | Percentages, bands, a rank | Forty and forty that cannot introduce anyone | `eligible()` in `netlify/functions/pool.ts`: both aged, within the band, neither fails the other's checkable non-negotiables; `pairs`, `inventory`, `stranded` |
| **Cultural and value compatibility** | Practice, how central faith is, family's role, whose house, work, money home, the eleven — qabiil, a second wife, going back | All in the map and the eleven | **Clan, as a field** — qabiil is a conversation, recorded as had or not, never matched on | A courtship that ends at the families on qabiil ends there, not in a filter — and `ended.which` is where the product learns which of the eleven is load-bearing | Scored and asked, never gated (`docs/PRODUCT.md` §7); `docs/REDTEAM.md` assumption 4 is the honest limit on how much any of it predicts |
| **Relocation willingness** | Who would move, and how far | `reach`: city, country, anywhere; `across` on the door | "He would come to her" — a reach that depends on who is looking | `other` on its own is nobody's pool | Country pools; `anywhere` counted in the founder's tally and never rendered |

**The five fragmenters.** Of everything the product asks, five things decide
whether two counted people could meet: geography (through reach), side, age,
a shared commitment to faith against practice, and being aligned on children.
Everything else is scored or asked. That is a deliberate design — most
preferences must not be allowed to fragment liquidity, and the first question
is a better place for them than a gate — and it has one consequence the door
could not show: **age is the fragmenter that strands people**, because it is
the one where a whole side can sit outside a member's band at once.

## The model

Write `W` and `M` for the door, `W_s` and `M_s` for supply — live, preparing,
aged — and `p` for the share of woman–man pairs in supply that are eligible.
`/pool` reads `p` as `pairs.eligible / pairs.of`; every number below that
rests on it is an assumption until that read exists.

- **Eligible partners per member.** `λ_w = M_s × p`, `λ_m = W_s × p`. The
  stranded share is about `e^(−λ)` if the gates were independent — and they
  are not: a woman of thirty-eight fails the band against every man of
  twenty-six to thirty-four at once, and a woman naming `faith-nn` fails every
  cultural man at once. So the mean hides a two-humped distribution, and
  `stranded` is read from the histogram, never inferred from `λ`.
- **Pacing.** One open introduction per person and a fourteen-day window
  (`D`) give at most `min(W_s, M_s)` introductions per window. The abundant
  side waits about `(abundant / scarce) × D` days between introductions. The
  scarce side's inventory lasts about `λ_scarce × D` days before every
  eligible partner has been met — and the door still reads full that day.
- **Fragmentation.** `N` people spread evenly over `k` pools make about
  `N²p / 4k` pairs: two pools of twenty and twenty hold half the pairs of one
  pool of forty and forty. That is the arithmetic behind "density before
  expansion", and behind opening a country for its travellers rather than a
  city for its nine.
- **Balance.** With `W + M` fixed, pairs scale as `r / (1 + r)²` for a ratio
  `r`; five to one gives five ninths of balanced. Skew costs pairs less than
  fragmentation does — but skew is what bounds throughput, because the scarce
  side sets the pace (`docs/SCALE.md`).

Three doors, taking supply as the door for the shape of it and `p = 0.5`:

| Door | `λ_w` / `λ_m` | Stranded | Introductions a fortnight | She waits | His inventory lasts | Reads as |
|---|---|---|---|---|---|---|
| **40 / 40** | 20 / 20 | ≈ 0 | 40 | 14 days | ≈ 9 months | A market |
| **120 / 40** | 20 / 60 | ≈ 0 | 40 | 42 days | years | A market with a queue; the honest one to expect, since `docs/WEDGE.md`'s hypothesis is one man per three women |
| **240 / 40** | 20 / 120 | ≈ 0 | 40 | 84 days | years | The pessimistic bound — `docs/WEDGE.md`'s six-to-one risk: a third of `docs/REDTEAM.md`'s ~700 reachable women in the metro, just to open (`docs/BOARD.md`) |
| **40 / 8** | 4 / 20 | 2% if independent; **a quarter or more** once age correlates | 8 | 70 days | ≈ 9 months, then nothing | **Not a market, and the door cannot tell** |

The gender ratio, not the count, bounds throughput. Two failure modes,
named: **wait**, on the abundant side, which she feels; and **exhaustion**, on
the scarce side, which nobody feels until the introductions stop — every man
has met every eligible woman while the door still says forty and eight.
Remaining inventory, from the introductions record, is the only instrument
for the second (designed, below).

## Liquidity by stage

In `docs/SCALE.md`'s idiom — what breaks in liquidity specifically, and
nothing else.

| | 100 | 1,000 | 10,000 | 100,000 |
|---|---|---|---|---|
| **The pool** | None can open. `/pool` says how far the nearest one is and on which side | The first opens — a metro, or a country's travellers — on the checklist below, not on the door alone | Five to fifteen. A city may exhaust while its country has inventory: the country pool is the relief, never a wider band | Metros of thousands. Liquidity stops being the constraint; matchmaker throughput is |
| **The queue** | By hand, from the founder's notebook | By hand, from the introductions record; the scarce side walked first | Computed: the next pair for one person is `O(pool)`, a human says yes | Several matchmakers share one pool's queue; never split below the city |
| **Exhaustion** | — | Visible in `inventory` before anyone feels it | The trigger for "your country's travellers" as a second pool for the same people | Same |
| **`/pool` itself** | One list, one map read per member | Fine; it meets `progress.tally()`'s ceiling at the same point — a thousand concurrent gets in one invocation | Pre-aggregated, like the running counters `docs/SCALE.md` designs | A real database, per `docs/PRODUCT.md` §10 |

## The ten systems

| System | Status | Where, or the trigger |
|---|---|---|
| **Geographic launch sequencing** | Built; refined here | Minneapolis → the US travellers → Columbus → Toronto → London → Stockholm (`docs/WEDGE.md`). Refined: the order is the checklist's, not the census's — the pool that passes first opens first, and for the UK that will be the country, not London. A second pool waits on `ending.who.here > 0` in the first (`docs/SCALE.md`) |
| **Waitlists** | Built | The door and the `contacts` store. **No position, no queue number, no estimate — ever.** A position is a scarcity meter a person comes back to watch (`src/components/Cohort.tsx`) |
| **Invitations** | Built | "Send the door" and "send the read" from the counted card; `via` names the kind of link. No reward, no counter, no link that carries who sent it (`docs/STRATEGY.md`) |
| **Density thresholds** | The door says its condition, not a number (2026-09-12); **the opening checklist below, rewritten 2026-09-12 as `docs/ATOMIC.md` §6** | Forty was a count. What opens a pool is the atomic network — twenty active preparing men and at least as many women, each introducible, seven in ten answering — read from `/pool` and, once it exists, the introductions record |
| **Match pacing** | Designed | One open introduction per person; a fourteen-day window; the scarce side walked first; whoever has waited longest since the last, never-introduced first. Trigger: the pool-open flag (`docs/HARD.md`: the introductions record ships in the same commit) |
| **Radius expansion** | Built | "I'd travel within the UK" on the counted card re-joins on one tap; the door always shows the country's travellers beside the city. A timed prompt to widen is refused: it is a nudge |
| **Relocation preferences** | Built | `reach`, asked once, mutual by construction; `anywhere` counted and never rendered (`docs/SCALE.md`) |
| **Dormant-user handling** | **The sweep, this pass**; the rest designed | A lapsed map leaves the door on the founder's read, and since 2026-09-12 its contact goes with it — the way to reach her lives exactly as long as her map (`docs/BOARD.md` decision 13). Designed: the reply to "your pool opened" is the confirmation that puts a member in the queue; an introduction unanswered at the window closes as `no-answer`; two in a row pause her, and she is told and can undo it by replying. Refused: last-seen, a nudge, an expiry shorter than the map's year |
| **Recommendation inventory** | **Built this pass as a floored histogram**, founder-only | `/pool` `inventory` and `stranded` — eligible partners per member, as buckets over the pool, computed on read and never stored. Designed: *remaining* inventory from the introductions record, for the matchmaker's tool. **Never shown to her** — "N people match you" is a number on a person |
| **Marketplace health metrics** | **This pass** | The table below, and `docs/OPERATING.md`'s field table |

## The opening checklist

Every number here is an assumption until a pool has opened on it. A rule
that fires is executed, not debated (`docs/PROCESS.md`).

**Rewritten 2026-09-12.** The first version's lines were forty and forty on
the door, forty and forty `live`, thirty a side in `supply`, nobody unaged,
and `λ ≥ 5` with `stranded` null. `docs/ATOMIC.md` simulated this pool's own
`eligible()` and found the coded gate passes about 56% of pairs at *any*
size, so `λ ≥ 5` held at nine a side and `stranded` — read from the floored
histogram — returned `null` with up to four people stranded. The checklist
measured what the gate can see and none of what decides whether two families
reach a nikah. It is now the atomic network's six conditions, one metro at a
time:

1. **Men ≥ 20 active preparing, and women ≥ men.** The hard side's number is
   the gate; the abundant side is never the constraint. `live` and `supply`
   are read after `/pool?sweep=1`; a lapsed map is not a person who can be
   introduced, and `supply` still excludes anyone not preparing.
2. **Every member has ≥ 1 eligible, active counterpart, and ≥ 80% have ≥ 3**
   — from the *raw* inventory, by hand from the maps until the founder's raw
   view exists (`docs/ATOMIC.md` T3). `stranded` null under the floor is not
   a pass below forty a side. And nobody unaged among supply.
3. **Activity ≥ 70%:** an introduction offered is answered within fourteen
   days by seven in ten. Below that the pool is a directory.
4. **Ten or more introductions a fortnight by hand, and the first twenty
   produce three or more "we are talking".** Under one in ten, the hidden
   compatibility rate is too low for a pool this size, however many are
   counted.
5. **Replenishment ≥ exhaustion:** each fortnight's arrivals at least match
   the pairs that matched or lapsed.
6. **The weekly safety check is clean** (`docs/OPERATING.md`), and the
   founder's judgement — unchanged from `docs/SCALE.md`.

Conditions 1 and 2 can be read today. Conditions 3, 4 and 5 cannot be read
from anything the product holds until the introductions record exists
(`docs/ATOMIC.md` T1), which is why it is the first build. A pool that meets
1 and fails 2 has its blocker named by `ages` and `p_gate`: the men are in
one band and the women in another, or half the women name `faith-nn` and
half the men are cultural. The answer is the room — which chats the link
goes into — never a wider band. A city may fail while its country passes;
then the country opens, for the people who said they would travel
(`docs/SCALE.md`) — with `docs/ATOMIC.md`'s caution that a country is not
yet a real pool for a first meeting.

## What the founder monitors

| Metric | Where | Cadence | The rule |
|---|---|---|---|
| Women and men on the door, per pool | `/cohort` `countries` | Weekly | Unchanged (`docs/OPERATING.md`) |
| Men the network channel produced | `/progress` `sidesByVia.man.group.arrived` | Weekly | A6 at four weeks; the pivot at eight (`docs/WEDGE.md`) |
| `live`, `supply`, `unaged`, `swept` | `/pool` | Monthly, and before any opening | Checklist lines 2–4 |
| `ages` per side; `stages` | `/pool` | Monthly | Names the blocker when line 5 fails |
| `p_gate`, `inventory`, `stranded` | `/pool` | Monthly | **Anyone stranded on either side, read raw → do not open.** `null` is floored and is not a pass below forty a side (`docs/ATOMIC.md` §3); until T3, read the maps by hand |
| `across` against `here` | `/cohort`, `/pool?country=` | Monthly | `across` outgrows `here` for eight weeks → the unit is the country (`docs/REDTEAM.md` assumption 11) |
| The reach mix | `/cohort` `reach` | Monthly | Tells whether the travellers' pool is real |
| Introductions opened and closed, by outcome | The introductions record *(designed)* | Monthly, once open | `no-answer` above three in ten in the first month → the "opened" mail was not a confirmation; require the reply before queueing |
| Both-yes rate; the no reasons | The introductions record *(designed)* | Monthly, once open | `age` leading the no reasons → the deferred "ages you'd consider" question ships |
| Remaining inventory; exhausted share | The introductions record *(designed)* | Monthly, once open | **Scarce side's median remaining under two → pause the queue; back to the playbook for supply, never a wider gate** |
| `never-introduce` count | The introductions record *(designed)* | With the safety check | Each one is a decision already made (`docs/HARD.md`) |
| `ending.who.here` | `/progress` | Monthly | `> 0` before a second pool opens — unchanged |
| Women's `counted` per hundred `arrived`, before and after the age ask | `/progress` | Monthly | Falls by a quarter → age becomes optional at the door and required at the first introduction instead |

## The architecture, designed

What the flag and the introductions record look like, so the commit that
ships them is a transcription. None of it is built; all of it is decided.

**The pool as an object.** A `pools` store keyed `<country>/<scene>` or
`<country>/across`, holding `{ state, openedAt?, checklist? }` where `state`
is `forming → open → paused → closed` and `checklist` is `/pool`'s reading on
the day it opened, kept so the decision can be read back. This is
`docs/SCALE.md`'s open flag; the founder flips the first, and later ones flip
on the checklist. `/pool` is the reading; `pools` is the state; the two live
in one function.

**The introductions record.** Tier 4 (`docs/LEARNING.md`): keyed by map
codes, because you cannot introduce two people without knowing who they are;
founder-read; never exported; never fed to learning. An `introductions`
store: `<pool>/<day>-<id>` → `{ pool, woman, man, openedAt, window: 14,
closedAt?, outcome, reason?, which? }`. Beside it, `member/<code>` →
`{ lastIntroducedAt, open?, paused?, confirmed?, never? }` — a day, never a
moment; **no counter in it**; "two consecutive no-answers" is derived by
walking her introductions at the moment of the decision, never stored;
`paused` is told to her and undone by replying; `never` is where safety's
`never-introduce` finally lands (`docs/HARD.md`).

**The closed vocabulary**, added to `netlify/shared/vocab.ts` with `src/`
twins when built: `INTRO_OUTCOMES` — `both-yes`, `she-no`, `he-no`,
`both-no`, `no-answer`, `withdrawn`; `INTRO_NO_REASONS` — `age`,
`non-negotiable` (+ which, from `DEALBREAKERS`), `distance`, `timeline`,
`family`, `how-wed-live` (+ which of `household`, `work`, `money-home`),
`rather-not`, mirroring `ENDED_WHICH`. `no-answer` is a closed outcome
written at the window's close — not days until she answered, which
`docs/LEARNING.md` refuses by name.

**What reaches the tally** (Tier 3): both-yes against not; the distribution
of no reasons; the joint-alignment tally `docs/LEARNING.md` row 1 designs —
same, near, far on each dimension for a pair that said yes twice. **Never
`she-no` or `he-no` per person**: a per-person no-count is the desirability
score by another route.

**The queue.** Eligible (`pool.ts`'s rule), confirmed, not paused, no open
introduction. Never-introduced first, then longest since the last. The
scarce side is walked first: for each man in queue order, the first woman in
queue order who is eligible for him and has not met him. One open
introduction per person, on both sides. The window closes as `no-answer`.
By hand from the record at the first pool; the matchmaker's tool computes
it once there is more than one open pool.

**What she is shown.** `docs/PRODUCT.md` §7, unchanged: three reasons, one
place they differ, one question to open with — `alignment()` re-aimed at two
maps instead of a map and an invented person. No percentage, no band, no
count.

**Never built.** A visible wait or position. "N people match you." A ranking
by yeses received. An age filter she sets that becomes a ranking. Boosting
the scarce side. A nudge to the dormant. A wider band to make a pool pass.

**Deferred, with triggers.** *"Ages you'd consider"*, one tap at the door —
trigger: `age` leads `INTRO_NO_REASONS`. *The matchmaker's tool* — trigger:
more than one open pool. *Automated "your pool opened"* — `docs/SCALE.md`'s
trigger, unchanged. *An age band as a door key segment* — `docs/WEDGE.md`'s
trigger, unchanged; `/pool` reads the band from the maps and the key never
carries it.

## Build now versus later

`docs/ROADMAP.md`'s rule: before the market votes, build only what records a
vote otherwise lost, makes a public number honest, or cannot be retrofitted.
Three things passed, and the record says which clause:

| Built | The clause |
|---|---|
| The map is re-kept when she is counted (`src/lib/cohort.ts`) | An honest public number: the pool opens on the map the server holds, not the one she kept first |
| Age is asked at the door, into the map (`src/components/Cohort.tsx`, `src/lib/age.ts`) | Cannot be retrofitted: a member who joins unaged and never returns is unaged for ever. The weakest of the three, and dated in `docs/MACHINE.md` so a drop in `counted` per hundred `arrived` after it can be attributed |
| `/pool`, the gate twin, and the sweep (`netlify/functions/pool.ts`, `netlify/shared/gate.ts`) | An honest public number: the door falls when a map lapses; and the opening decision has an instrument before the first pool reaches it, which is the only time one can be useful |

Everything in *the architecture, designed* waits: the pool-open flag and the
introductions record in one commit at the first pool that passes the
checklist (`docs/HARD.md`); pacing, dormancy after open and remaining
inventory with them; the matchmaker's tool at the second open pool; the age
question at its no-reason; the running counters and the automated mail at
`docs/SCALE.md`'s triggers.

## What this pass changed in earlier documents

- `docs/OPERATING.md`: the `/pool` command and field table; the monthly
  hour asks whether any pool is honestly near opening; the door's sweep.
- `docs/SCALE.md`, `docs/HARD.md`: the cohort reconcile is built as the
  founder-read half; the door falls as well as rises.
- `docs/WEDGE.md`, `docs/BETS.md`: density needed is the checklist; the age
  band on the door is read from the maps, and the key segment stays deferred.
- `docs/MACHINE.md`: stage 6's metric; the age ask dated.
- `docs/ROADMAP.md`: item 3's gate; which clause each build passed.
- `docs/GAPS.md`: age as the unseen fragmenter, ASSUMED, with its test.
- `docs/LEARNING.md`: the new use of a kept map, and the carve-out that
  separates a floored histogram over a pool from a count on a person.
- `docs/EXPERIMENTS.md`: A7, forty and forty is a working market.
- `docs/PROCESS.md`: the liquidity rules in the kill table.
- `docs/TIME.md`: opening a pool as a founder decision with an instrument.
- `docs/PRODUCT.md` §7, `docs/REDTEAM.md`, `README.md`: pointers.
- `src/components/Trust.tsx`, `src/components/Cohort.tsx`: what a kept map is
  now read for, in her words.

## Revisions

- 2026-09-10 — First version. Nine dimensions, the model with three worked
  doors, ten systems classed, the opening checklist, the monitor table, the
  pool and introductions record designed. Built: the re-keep on join, age at
  the door, `/pool` with the sweep, the gate twin. The finding: age is the
  fragmenter the door cannot see, and the door's forty and forty could not
  say whether anyone could be introduced.
- 2026-09-12 — The opening checklist rewritten as `docs/ATOMIC.md` §6's six
  conditions, after that file simulated `eligible()` and found the first
  version's lines held at nine a side. The monitor table reads `stranded`
  raw; the density row and the by-hand page resized to the atomic network.
  Documents only; the code that reads conditions 3–5 is T1–T3 there.

## The by-hand introduction, one page

Written 2026-09-12 because the first pool is run by hand and no page said
how (`docs/BOARD.md`, decision 17). Dry-run it with two consenting testers
before the first pool opens, and time it: **if one introduction costs more
than an hour, the ten to fifteen a fortnight the atomic network needs
(`docs/ATOMIC.md` §6) is the founder's whole fortnight, and the window or
the hand changes** — not the founder's sleep.

1. **Read the pool.** `GET /pool?scene=twin-cities` (`docs/OPERATING.md`):
   `live`, `supply`, `ages`, `pairs.eligible`, `stranded`. Conditions 1 and 2
   of the checklist above must hold before any introduction is made; 3 to 5
   are what the first twenty introductions measure.
2. **List both sides.** `netlify blobs:list cohort --json | jq -r '.blobs[].key'
   | grep '^us/twin-cities/'` — women and men, by key; the `at` day in each
   record is who has waited longest, and the queue is that order and nothing
   else (`docs/LEARNING.md`: never who is most wanted).
3. **Read the two maps.** `netlify blobs:get maps <code>` for her and for each
   candidate; apply `eligible()` by hand exactly as `pool.ts` does — age band,
   both sides' checkable non-negotiables — and nothing it does not: no photo,
   no essay, no preference the map does not carry.
4. **Write to both, from the owned address**, two mails, no name exchanged: who
   is on the other side in the map's own words (age, city, practice, children,
   what they will not compromise on), and one question — *would you like to be
   introduced?* — with a day to answer by. A reply of yes from both is the
   introduction; one no, or the day passing, closes it as `no-answer` and
   nobody is told why.
5. **Record it** in the introductions record the moment it exists
   (`docs/HARD.md` row 13); until then in the founder's notebook: date, the two
   codes, outcome. Never the mails.
6. **Send one "your pool opened" test mail** from the owned domain to a test
   contact read out of the `contacts` store, and time that too. If the loop
   cannot close in an hour by hand, the counted card's sentence is softened to
   what is true before the pool opens.
