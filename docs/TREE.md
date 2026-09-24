# The opportunity solution tree — one outcome, ten opportunities, and what to subtract, 2026-09-18

## Context

Three passes established what exists (`docs/AUDIT.md`), which of it is at risk
(`docs/RISKS.md`), and what job each part answers (`docs/JOBS.md`). Each was
organised by *feature*. This pass inverts that: it puts the one outcome we care
about at the top, the person's opportunities underneath it, and only then the
solutions — so that "we have built a lot" stops being an argument for anything.

Teresa Torres's discipline, applied literally: **an outcome** is a change in
behaviour we want; **an opportunity** is the person's problem, need,
uncertainty or desired progress, stated in their words and never as a feature;
**a solution** is a thing we built or could build; **an experiment** is the
cheapest act that tells us whether a solution moves an opportunity. A roadmap
made of solutions cannot be prioritised, because nothing in it is comparable.
A roadmap made of opportunities can.

**The purpose is prioritisation and subtraction, and no new features are
proposed.** Every solution named below already exists in the repository. The
reorganised roadmap at the end contains one relocation, one experiment, four
subtraction decisions and the existing pool-gated items in their existing
order. Nothing is invented. That roadmap is now the live one: `docs/ROADMAP.md`
and `docs/PRODUCT.md` §10 both point here rather than restating it.

**The one-paragraph answer.** The product has ten opportunities and about
14,000 lines of solution code. The heaviest investment (2,623 lines) sits on
the opportunity with the weakest trigger — "I don't know if I'm ready" — which
nobody's life fires. The lightest (roughly fifty lines, no dedicated file)
sits on the opportunity `docs/GAPS.md` calls the most dangerous unevidenced
belief in the repository: a man showing he is serious. Two thousand lines sit
on "there is nobody serious to meet" and not one of them does the job. Four
solutions serve no opportunity at all. The subtraction list is four decisions;
the addition list is one relocation and one question asked of three men.

---

## OUTCOME — one, and it is already written

> **Of everyone who opened Niyyah, how many had a conversation they were not
> going to have.**
> `followed-through` per hundred `arrived` (`src/lib/rungs.ts`,
> `docs/NORTHSTAR.md`, `docs/PRODUCT.md` §6).

Why this and nothing else: it is a change in a person's behaviour, not a
product output; it is observable without asking anyone's opinion; and it is
the unit of the purpose — every hard thing said early is one not found out
late. **Current value: zero over zero.** No non-founder has arrived.

Three numbers are *not* the outcome, and this tree keeps them out of the top
box on purpose: arrivals (an input we can buy with posting), maps built (an
output we control), and the door's count (a supply figure, and the
marketplace's outcome, not the person's).

---

## OPPORTUNITY SPACE

In the person's voice. Type tags: **P**roblem · **N**eed · **U**ncertainty ·
**D**esired progress. Every quoted phrase is sourced to the product's own
vocabulary or to a ranked gap; none is invented for this document. All are
HYPOTHESIS until the sessions run — see `docs/JOBS.md`.

### O1 · "I can't tell if he's serious, and the months are passing" — U, talking
- **O1.1** I can't read his behaviour straight; I'm invested and my friends are biased. *(U)*
- **O1.2** I don't know what to say next without sounding like an interrogation. *(N)*
- **O1.3** I need to know this week, not in the sixth month. *(D)*
- Source: moments "Is he serious?", "He's gone quiet", "I'm overthinking"; the read's own dimensions; `docs/NORTHSTAR.md`'s problem statement.

### O2 · "We're heading for a yes and there are things we've never said out loud" — P, deciding
- **O2.1** I don't know which conversations we're missing. *(U)*
- **O2.2** I can't raise qabiil, a second wife or money home without it landing as an accusation. *(P)*
- **O2.3** I don't know his real answer, only what he says when I ask him directly. *(U)*
- **O2.4** I need permission, and words, to say no. *(N)*
- Source: the eleven topics; ended reasons `eleven`, `non-negotiable`, `families-disagree`; "Ending it kindly".

### O3 · "My family is in this and I don't have the words" — N, all stages
- **O3.1** I need to tell hooyo, or my wali, without a fight. *(N)*
- **O3.2** I need him to send his people, properly. *(D)*
- **O3.3** *(his)* I need to speak to her family and don't know what to say. *(N)*
- Source: the seven family scripts; moment "My family is pushing"; hook `family`; hesitation `family`.

### O4 · "I'm carrying this alone and telling anyone costs me" — P, all stages
- **O4.1** Telling a friend means it travels. *(P)*
- **O4.2** I spiral at night and need to be talked down. *(N)*
- **O4.3** I don't want anyone to know I'm looking. *(P)*
- Source: hesitations `seen`, `family`; moment "I'm overthinking"; `docs/GAPS.md` "Privacy".

### O5 · "There is nobody serious to meet" — P, preparing · **the largest opportunity in the category**
- **O5.1** The rooms I have expose me, or are full of people who aren't serious. *(P)*
- **O5.2** The aunties are limited, and they judge. *(P)*
- **O5.3** I can't tell whether anyone here is real. *(U)*
- Source: hook `finding` — the hardest part the product cannot serve; `docs/GAPS.md` "Competing alternatives" (ASSUMED, no instrument).

### O6 · "I don't know if I'm ready, or what I actually want" — U, preparing
- Source: hook `ready`; hook `trust` ("Trusting again after being hurt").

### O7 · "I want to be taken seriously without performing" — D, all stages
- **O7.1** I want what I've actually done to count, not how I present. *(D)*
- **O7.2** I want my family's backing to mean something to the other side. *(D)*
- Source: Trust's headline; the ledger; the vouch.

### O8 · *(his)* "I want to show I'm serious and I don't know how" — N, talking · **the most dangerous gap**
- **O8.1** I need to say my intention without it being awkward. *(N)*
- **O8.2** I want to know whether she's serious too. *(U)*
- **O8.3** I don't know what answering her eleven does for me. *(U)*
- Source: moments "Saying my intention", "Talking to her wali"; `docs/GAPS.md` gap 1 — "men do not follow women… the most load-bearing unevidenced claim in the repository".

### O9 · "It ended and I need to make sense of it" — N, after
- Source: `Ended.tsx` — "It ended. That is allowed, and it is progress"; the ten ended reasons.

### O10 · "I married, and I want to pass on what worked" — D, married
- Source: the ending's shares; `docs/FLYWHEEL.md`'s auntie inversion.

---

## SOLUTIONS, mapped to opportunities

Every solution in the repository, against the opportunity it serves. **Serves**
— it moves the opportunity today. **Partly** — it moves part of it, or moves it
only for someone already deep in the product. **Serves none** — no opportunity
in the space reaches for it.

| Solution (files) | Opportunity | Verdict |
|---|---|---|
| The read (`Read.tsx`, `lib/read.ts`, `data/read.ts`) | **O1.1, O1.2, O1.3** | Serves — the tightest fit in the product |
| Its two tool pages (`toolPages.ts`, `data/tools.ts`) | **O1** + O8.2 | Serves — and they are the only doors a stranger can open |
| The eleven, interactive (`BeforeYes.tsx`, `lib/beforeYes.ts`, `data/eleven.ts`) | **O2.1, O2.2** | Serves |
| The two-sided sheet (`Couple.tsx`, `lib/couple.ts`, `couple.ts`) | **O2.3** for her, **O8.3** for him | Serves her; **unserved for him** |
| The printed guide and sample (`guidePages.ts`) | **O2.1** + the coordinator's own job | Serves — the only solution with a second customer |
| `ScriptCard` | O1.2, O2.2, O3 | Serves — the delivery mechanism for every "words" opportunity |
| Family scripts (`Families.tsx`, `data/families.ts`) | **O3.1, O3.2, O3.3** | Serves — cheapest solution in the repo per opportunity |
| The Guide: free text, five voices (`Coach.tsx`, `data/coach.ts`, `guide.ts`) | **O4.1, O4.2** | Partly — real fit, zero evidence, the only running cost |
| The four moments (`data/moments.ts`) | **O1, O3.1, O4.2, O8.1, O8.2** | Serves — the best situation-to-opportunity mapping, five sub-opportunities in four chips |
| Forget me (`forget.ts`, `keep.ts` DELETE) | **O4.3** | Serves |
| Trust, privacy half (`Trust.tsx`) | **O4.3** | Serves |
| Report a concern (`ReportConcern.tsx`, `safety.ts`) | O2 safety | Serves, latent |
| The map: intake + reflection (`intake.ts`, `reflection.ts`, `Reflection.tsx`) | **O6** | Partly — the opportunity is real, its trigger is not |
| Work card / next step (`nextStep.ts`, `WorkCard.tsx`) | O6 | Partly — the product fires it, not her life |
| Hook (`Hook.tsx`, `data/hook.ts`) | Names **O1, O3, O5, O6** | Serves as routing; answers none itself |
| Home (`Home.tsx`) | All, as a hallway | Partly — 17 buttons for two reasons to open |
| Keep / restore (`keep.ts`, `RestoreMap.tsx`) | Utility under everything | Infrastructure |
| Follow-up (`followup.ts`, `FollowUp.tsx`) | — | **The outcome's instrument.** Not a solution to an opportunity; the measurement |
| Ladder, facts, readout (`rungs.ts`, `progress.ts`) | — | Measurement |
| The ledger as social proof (`ledger.ts`, Trust's headline) | **O7.1** | **Serves none today** — the audience does not exist |
| Vouch (`Vouch.tsx`, `vouch.ts`) | **O7.2** | **Serves none today** — same, plus the relative's own reason is unstated |
| Door, short map, count-me, cohort, contacts (`Door.tsx`, `Cohort.tsx`, `cohort.ts`) | Addresses **O5** | **Serves none** — it counts the opportunity; it does not move it |
| Waitlist transport (`waitlist.ts`) | O5 | Serves none — unconfigured, duplicated by `joinCohort` |
| Pool readout (`pool.ts`) | — | Measurement, founder-only |
| Sample introduction + alignment (`SampleIntroduction.tsx`, `matching.ts`, `candidates.ts`) | Gestures at **O5.3** | **Serves none** — demonstrates a future over invented people |
| Plus (`Plus.tsx`, `data/plus.ts`) | — | **Serves none** — a page about a business model |
| Philosophy (`Philosophy.tsx`) | O4.3 anxiety, partly | Partly — 322 lines, two taps from where the anxiety fires |
| Ending / ended (`Ending.tsx`, `Ended.tsx`) | **O9** (thin), **O10** (thin) + the flywheel | Partly — and unreachable from where they'd fire |

---

## The three diagnostics

### 1 · Where several solutions serve one opportunity

| Opportunity | Solutions on it | Read |
|---|---|---|
| **O2** the eleven | 5 (interactive, two-sided, printed guide, printed sample, ScriptCard) | **Justified.** Each reaches a different person in a different room: her phone, his phone, a nikah packet, a coordinator's hand. Not duplication — distribution. |
| **O4** carrying it alone | 4 (Guide free text, five voices, four moments, Forget me + Trust) | **Partly justified.** Five voices on one opportunity with zero evidence is the widest unhedged bet in the product; A3 already exists to test it. |
| **O1** is he serious | 3 (the read, two tool pages, one moment chip) | **Justified**, and the tool pages are what make the read reachable at all. |
| **O6** am I ready | 6 (intake, reflection, next step, work card, Profile, HowYoudLive) | **Not justified.** Six solutions, one weak trigger, and four of them only reachable after the other two. |
| **O5** nobody to meet | 6 systems, none of which serves it | **Not duplication — absence.** Six ways to *count* the opportunity, zero to move it. |
| **O7** seen as serious | 4 (ledger, vouch, Trust's headline, the door's ledger field) | **Not justified yet.** Four promises of a social outcome with nobody to observe it. |

### 2 · Investment against importance

Lines of solution code per opportunity (measured, `wc -l`), against the
importance the repository's own documents already assign.

| Opportunity | Lines | Rank by investment | Rank by evidence of importance | Verdict |
|---|---|---|---|---|
| **O6** am I ready / what I want | 2,623 | **1** | 8 | **Over-invested.** Most code, weakest trigger |
| **O2** the eleven | 2,151 | 2 | 2 | **Matched** |
| **O4** carrying it alone | 2,136 | 3 | 6 | Over-invested, and unhedged |
| **O5** nobody to meet | 2,011 | 4 | 4 | **Mis-invested** — infrastructure, not solution |
| **O1** is he serious | 1,644 | 5 | **1** | **Under-invested relative to its rank** |
| **O7** seen as serious | 1,086 | 6 | 7 | Matched, both low; audience missing |
| O10 pass it on | 656 | 7 | 9 | Matched |
| **O3** family words | 243 | 8 | 5 | **Under-invested** — and the cheapest to serve |
| O9 it ended | 202 | 9 | 10 | Matched |
| **O8** his side | ~50, no dedicated file | **10** | **3** | **The gap.** Two moment chips, one script, one tool row |
| *(no opportunity)* Plus, sample, alignment, Philosophy | 1,354 | — | — | **Subtract or gate** |

**The answer to "are we heavily invested in solutions while major
opportunities remain underserved" is yes, and specifically:** 2,623 lines on
"am I ready" against ~50 on "how does a man show he is serious", when the
repository's own ranked gaps put the second first and the first eighth. The
map is not wrong; it is disproportionate. And O5 is the clearest case of all —
2,011 lines that count an opportunity nobody has moved.

### 3 · Opportunities with no solution at all

| Opportunity | Why nothing serves it | Cheapest honest response |
|---|---|---|
| **O5** nobody serious to meet | Requires a pool; `docs/ATOMIC.md` §6 says months at best | Keep saying so plainly (done, `docs/RISKS.md` R3). Do not build more counting |
| **O8.3** what answering her eleven does for him | Never asked a man | **Ask three men.** An experiment, not a build |
| **O2.4** permission to say no | Only "Ending it kindly" touches it, one script deep | Nothing this pass; a session finding |
| **O7** seen as serious | Needs an audience | Gate on the pool with everything else |

---

## EXPERIMENTS, mapped to opportunities

Every experiment already written. This tree changes none of them; it says which
opportunity each one is evidence *about*, which is what was missing.

| Experiment | Opportunity it tests | State |
|---|---|---|
| **The five sessions** (`docs/RISKS.md` R1, `docs/PROTOCOL.md`) | **O1, O2, O3, O6** — and question 4 fills the alternatives column for all ten | Written, unrun. **The gate on everything below** |
| **A1** instrument completion | **O6** — will anyone answer sixteen questions about herself | Written, unrun; ranked 1 |
| **A2** vouch asked vs given | **O7.2** | Readout built, unrun |
| **A3** the guide's worth | **O4.1, O4.2** | Written, needs endings |
| **A4** family scripts confirmed | **O3** | Written, runs slowly |
| **A5** willingness to pay | Neither — a business question | Gated in `docs/MONETIZATION.md`; the bounded free-year promise no longer blocks it |
| **A6** the door, for men | **O8** | In `docs/MACHINE.md`; the one experiment on the most dangerous gap |
| **A7** forty and forty | **O5** | `/pool` built; needs a full door |
| **A8** the couple reaches men | **O8** + O10 | Second share built; needs endings |
| **A9** the eleven through institutions | **O2** + the coordinator | Guide and sample built; two placements pending |

**What this reveals about the experiment set.** Nine experiments, and the two
on the most dangerous opportunity (A6, A8) both wait on traffic that has not
arrived. The one experiment that can run this week without any traffic is the
sessions — which is exactly why it is item 1 below.

---

## THE REORGANISED ROADMAP

By opportunity, not by feature. Every item is an existing solution, an existing
experiment, or a subtraction. **No new features.**

| # | Item | Layer | Opportunity | Gate |
|---|---|---|---|---|
| **0** | **Post the link.** Ten connectors; the five catalogued URLs with a room-kind `via` (`docs/ASSETS.md`, `docs/WEDGE.md` steps 1–4) | Experiment | Evidence for all ten | Nothing. Unblocked since 2026-09-12 |
| **1** | **The five sessions**, read against `docs/JOBS.md` | Experiment | O1, O2, O3, O6 + alternatives | Nothing but recruiting |
| **2** | **Before strangers arrive:** mail on the domain; the Anthropic spend limit written into `docs/CONTROL.md`; `VITE_CONTACT_EMAIL` at a read address (`docs/RISKS.md` R4, R5) | Solution, founder-side | O4.3 trust | Nothing; none of it retrofits onto traffic already gone |
| **3** | **Subtract.** The four decisions below | Subtraction | Frees attention from O5, O7 | Item 1, per `docs/PROTOCOL.md`'s rule against touching the door or the map mid-sprint |
| **4** | **The situations become the front door.** The four moments and five hardest parts move ahead of the map; **no new component** — `data/moments.ts` and `data/hook.ts` already exist and render 43 taps in. Carries three measured toll gates from `docs/VALUE.md`: Identity asked before Situation (4 taps and 63 words on all four front-door paths), the 1,400 ms deliberate pause arriving after twenty-one decisions rather than at the start, and the three chapter intros that are screens rather than headers | Solution, relocation | O1, O3.1, O4.2, O8.1 | Item 1 |
| **5** | **Ask three men what the sheet does for them** (A6/A8's unrun half, inside item 1's sessions) | Experiment | **O8.3** | Item 1 |
| **6** | **Read what comes back.** A1, A2, A4 at their thresholds; A6 at four weeks; `docs/REDTEAM.md`'s three; then `docs/OPERATING.md`'s monthly loop | Experiment | O3, O6, O7, O8 | Items 0–1 |
| **7** | **The first pool opens.** Minneapolis, one introduction at a time, introductions record in the same commit | Solution | **O5** — the first time anything moves it | `docs/ATOMIC.md` §6 |
| **8** | **Concierge, by hand** — the founder matchmaking the first ten | Service | O5 | Item 7 |
| **9** | **The first-year sheet** — the eleven's engine over a second topic list | Solution | O10, and the married stage's only real job | The first marriage |
| **10** | **Your record**; **real backend** | Solution | O4.3; none | A member asking; ~50k keys |

**Item 4 gained a second half, 2026-09-20.** `docs/PLACE.md` audited all 24
destinations against the stranger's five questions — where am I, what can I do,
why, how do I go back, what happens afterward — and found Home's hierarchy is
this repository's feature list rather than the person's journey: `read` reachable
from three controls on Home alone, `coach` from two, and a section headed "Your
space" holding four unrelated features. The restructure is designed there and
held here, with the `door`/`count` merge and one-label-per-destination, because
`docs/LOAD.md:204` holds Home's controls for the sessions and this item already
commits to not moving the front door on inference. The seven *bugs* that audit
found — four phases with no way out, two backs landing somewhere other than
where the person came from — were fixed at once under `docs/PROTOCOL.md`'s bug
rule, which requires it before the next session.

**What changed from the roadmap this replaces.** Old items 0–2 survive as 0, 2
and 6. Old items 3–7 survive as 7–10, in order, all still pool-gated. Two
items are new *in kind and not in code*: subtraction (item 3), which no
previous roadmap contained at all, and the relocation (item 4), which moves
existing components rather than adding any. One item is promoted: the sessions
were buried inside "read what comes back" and are now item 1, because they are
the only experiment that runs with zero traffic.

---

## THE SUBTRACTION LIST — item 3, in full

Four decisions. Each names what goes, what stays, and what would bring it back.
None is executed by this pass; the sessions gate them (`docs/PROTOCOL.md`).

1. **Plus** (`Plus.tsx`, `data/plus.ts`, 1,354 lines with the sample) — serves
   no opportunity, has no price, and its own margin table "fails as written"
   (`docs/BACKWARD.md`). **Decision: remove the screen; keep `data/plus.ts`'s
   promises as the pricing record they are.** Returns when there is something
   to buy — item 8.
2. **The sample introduction and the alignment engine**
   (`SampleIntroduction.tsx`, `matching.ts`, `candidates.ts`) — demonstrates a
   future over fourteen invented people; `alignment()` has one caller, itself.
   **Decision: remove the screen and the invented people; keep `matching.ts`,
   which `tests/gate-sync.test.ts` holds as the twin of the server's gate.**
   Returns with item 7.
3. **The door's counting apparatus** (`ShortMap.tsx`, `Cohort.tsx`'s join
   flow, `contacts`, `waitlist.ts`) — 2,011 lines that count O5 without moving
   it, holding the only PII in the product. **Decision: keep the honest count,
   retire the join flow and the contact collection until `docs/ATOMIC.md` §6 is
   within one quarter's reach; delete `waitlist.ts`, which `joinCohort`
   replaced.** This is the largest single subtraction available and the one the
   protocol most firmly forbids before the sessions.
4. **The ledger as social proof, and the vouch** (Trust's headline, `Vouch.tsx`,
   `vouch.ts`) — promises about being *seen* with no observer. **Decision: keep
   both, gate the claim.** The vouch is cheap, already honest since
   `docs/RISKS.md` R3, and A2's readout is built. This one is a hold, not a cut,
   and it is listed so that it is a decision rather than an omission.

**Not subtracted, and why.** The map (2,623 lines, over-invested) stays until
A1 runs: `docs/PROTOCOL.md` forbids touching it before the sessions, A1's
decision rule is already written, and its data feeds every later system. The
Guide (2,136 lines, unhedged) stays: A3 is written, the offline voice costs
nothing, and the founder already declined to switch it off (2026-09-10). Both
are on probation with a rule, which is the honest state.

---

## Keeping this true

An opportunity changes when a session or a readout says the person's problem is
not what this file claims. A solution's row changes in the commit that changes
the solution. A subtraction decision is struck through when it is carried out,
with the date, never deleted — the record of what was cut is worth more than
the tidy list.

## How this was verified
- The line counts reproduce from the `wc -l` groups named in each row of the
  investment table.
- Every solution in `docs/AUDIT.md` §1–§3 appears exactly once in the solution
  table; every experiment in `docs/EXPERIMENTS.md` appears exactly once in the
  experiment table.
- The reorganised roadmap's items 7–10 match the previous roadmap's items 3–7
  in content and order, so nothing pool-gated was quietly dropped.
- `npm run verify` and `npm run build` green; no code changed.
