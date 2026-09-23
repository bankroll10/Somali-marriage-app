# Niyyah — matching and alignment, audited as a decision system

> Every weight, threshold, gate, scale, default and neutral score in the
> systems that decide what a person is told about herself, about someone
> else, or about whether two people could meet. For each: what evidence
> justifies it, what happens if it is wrong, whether it is shown, whether it
> could unfairly block someone, and whether it could create false confidence.
> Written 2026-09-23.

## The finding, first

**The evidence behind every number below is none.** No introduction has
been made, and no marriage has come out of this product. The literature
`docs/REDTEAM.md` #4 cites (Finkel et al. 2012; Joel et al. 2017) says no
algorithm predicts relationship success from self-reports. Every weight in
the product was editorial. That is fine for an *order*, because something
has to be read first. It is not fine for a *grade*. Several of these numbers
were graded as if they had been measured:

- a weighted "fit" chose the most flattering invented man and captioned him
  "Chosen by alignment";
- the read told a woman "{He} has shown you the things that **predict** it"
  when her own screen said he had not yet shown how he handles hard things;
- the map rated a person's faith "Thin" because she keeps it private;
- the pool treated an age band nobody stated as a gate;
- Before-you-say-yes told a couple who differed on qabiil that theirs "isn't
  the ones that carry the most weight".

So the principle, now held by `tests/alignment-audit.test.ts`:

1. **A number may order what is shown. It may never grade a person or a pair
   to them.**
2. **A gate blocks only what someone said, where the other's answer plainly
   contradicts it.** Anything our reading would have to supply is a
   question, asked by her or by the founder, never a verdict.
3. **Our assumptions are reported beside a gate, never inside it.**
4. **"Not known" is said, never scored.** An honest "unsure" or an
   unanswered question is neither the same nor different.
5. **No screen may claim predictive power.** "Predict", "chosen by
   alignment", "never introduced, however much else fits", "carry the most
   weight", "most couples never", "rarer than you would think", "Grounded and
   ready", "we'll look for someone" and "will find you someone" are banned
   from `src/` by a scan.

## The systems

| # | System | What it decides | Who sees it |
|---|---|---|---|
| 1 | `netlify/shared/gate.ts`, and its twin `gate()` in `src/lib/matching.ts` | Whether two people could ever be introduced | Her, as the block sentence; the founder, as `/pool` |
| 2 | `netlify/functions/pool.ts` (`eligible`, `AGE_GAP`, `readMember`) | Pairs, inventory, stranded: the opening checklist, and later the queue | The founder |
| 3 | `alignment()` in `src/lib/matching.ts` | The sample introduction; later, a real one | Her |
| 4 | The read: `src/lib/read.ts`, `src/data/read.ts` | What someone she is talking to has shown | Her; its band goes to the Guide and the learning facts |
| 5 | The map's grounds: `src/lib/reflection.ts`, `src/data/intake.ts` | Where she stands, the headline, the thinnest ground | Her; Home; the work card; the learning facts |
| 6 | Before-you-say-yes and the couple joint: `src/lib/beforeYes.ts`, `src/lib/couple.ts`, `src/data/eleven.ts` | Which conversation to open first, and the headline | Her, and the two of them |

## Hard gates

Hard gates decide whether two people could ever be introduced.

In each entry, **E** is the evidence, **W** what happens if it is wrong,
**S** whether it is shown, **B** whether it could unfairly block someone, and
**C** whether it could create false confidence.

### G1. faith-nn against his practice

- **Value before:** blocks `cultural` or `returning`.
- **E:** Her stated non-negotiable, "a shared commitment to faith". The step
  from those words to practice levels was ours.
- **W:** About 20% of men, the sim's `returning` share, were never introduced
  to any woman who ticked faith. Our own map tells that same man "the right
  person will meet you on that road rather than judge you".
- **S:** Yes: "his practice is not there yet".
- **B:** **Yes.** **C:** —
- **Verdict: narrowed.**
  - Only `cultural` ("Muslim by identity, lighter in practice") blocks. It is
    the one answer that plainly contradicts her words.
  - `returning` becomes her first question for him.
  - The block sentence quotes his answer and no longer judges his faith.

### G2. kids-nn clash

- **Value before:** want/no, no/want, no/open, open/no.
- **E:** Her stated non-negotiable, "aligned on children". "Open to it with
  the right person" against "I don't see children" is not a contradiction
  either way.
- **W:** People who might accept each other's position were never
  introduced.
- **S:** Yes. **B:** **Yes.** **C:** —
- **Verdict: narrowed.**
  - Only want↔no blocks.
  - open/no is named as a difference, and is the first thing to ask.

### G3. Age band

- **Value before:** he may be ≤ 10 years older and ≤ 3 years younger.
- **E:** None. The code called it "what most families would consider".
  Neither person stated it, and it is not symmetric.
- **W:** It swelled `stranded` and moved the decision to open a pool. Once
  the queue walks "who is eligible for him", it would have kept a woman five
  years older than him from ever meeting him.
- **S:** No, founder only. **B:** **Yes, silently.** **C:** —
- **Verdict: out of the gate.**
  - `eligible()` is what the two of them said.
  - `withinAgeGap()` is reported beside it as the `pairs.withinAgeGap`,
    `inventoryWithinAgeGap` and `strandedWithinAgeGap` columns.
  - Where the two readings disagree about someone, the founder asks her which
    ages she would consider.

### G4. Both ages required

- **E:** A hand-made introduction needs an age. Members are told this at the
  door and on Trust.
- **S:** Yes. **B:** No; it is stated and she can fix it.
- **Verdict:** Keep.

### G5. A missing `stage` read as `preparing`

- **E:** None. `docs/ATOMIC.md` T7 had already named this.
- **W:** It inflated `supply` and flattered the opening checklist.
- **S:** No. **C:** Yes, for the founder.
- **Verdict: fixed.** A missing stage is `unknown`, shown in `stages` and
  never counted in supply.

### G6. `supply` is live and `preparing`

- **E:** The product's own rule of one introduction at a time.
- **Verdict:** Keep.

### G7. `unsure` or unanswered never clashes

- **E:** An honest "I don't know" is not a mismatch.
- **Verdict:** Keep. It now holds in every system here, including the read's
  "I have not told him" (S4).

### G8. The five uncheckable non-negotiables

- **Value:** honesty, respect, no-addiction, direction and kindness gate
  nothing.
- **E:** No form can verify them.
- **S:** Yes. **C:** **Yes, before this.** Profile and the sample said
  "someone who fails one of these is never introduced". That is true of two
  of the seven.
- **Verdict:** Keep the behaviour, fix the copy. Two can be checked; the rest
  are the first things to ask.

## Soft signals

Soft signals are summaries and orderings built on editorial numbers.

### S1. `alignment().fit`

- **Value before:**
  - weights faith .26, children .16, values .16, family .13, timeline .11,
    household .08, work .05 and money .05;
  - four 1–4 scales and a `closeness` over them;
  - neutral values of 0.55 (unanswered), 0.7 (the other side off-scale) and
    2.5 ("somewhere in the middle"), and a faith-role default of 3;
  - child-pairing scores of 1, .75, .45 and .15.
- **E:** None.
- **W:** It picked which *invented* man to show: the one with the highest
  fit, meaning the most flattering one.
- **S:** Not as a number. It was shown as "Chosen by alignment", "why we
  think your lives fit", and "a real member would be read the same way".
- **C:** **Yes.**
- **Verdict: removed.**
  - There is no number anywhere in `alignment()`.
  - The sample is the first unblocked candidate in her city, in file order.
  - What she sees is literal:
    - **the same:** "you both want a family", "you both named kindness";
    - **different:** every difference, in one fixed order of conversation
      (children, faith, family, household, money, work, timeline), and never
      "the one that matters most";
    - **not known yet:** unsure or unanswered on either side.

### S2. The reason and difference thresholds

- **Value before:** reasons at ≥ .8 and ≥ .9; "differs" below .7.
- **Verdict: removed** with S1.
- **The one tolerance kept:** how central faith should be is a 1–5
  self-rating. It reads "the same" only when both are at 4 or above, and
  "different" only at 2 or more points apart, because a one-point gap on a
  slider is not a difference anyone could name.

### S3. The read's weights and bands

- **Value before:**
  - `WEIGHTS` public .26, intent .21, consistency .20, pressure .19,
    family .14;
  - `overall`;
  - the bands strong (≥ .72 with public ≥ .6) and mixed (≥ .45);
  - the thin dimension chosen as argmax (1 − s)·w.
- **E:** None.
- **W:** "Strong" for a man who pushed back on her non-negotiables and goes
  quiet on hard things, because the other four summed high.
- **S:** Yes, as the band headline. It also went to the Guide and the
  learning facts.
- **C:** **Yes:** "the things that predict it"; "not what someone passing
  time produces" (our own money branch says the scammer is often the most
  attentive man she has met); "rarer than you would think".
- **Verdict: removed.**
  - The band is read from the five states on her screen:
    - **strong:** being known is *shown*, nothing is *not yet*, and four of
      five are *shown*;
    - **thin:** more *not yet* than *shown*;
    - **mixed:** everything else.
  - The gap to script is the lowest state, with ties broken by `PRIORITY`
    (public, pressure, intent, family, consistency). That is an editorial
    order, stated as an order.
  - The copy says "a summary of your own answers — not a verdict on {him},
    and not a prediction".

### S4. The read's option weights and `stateOf`

- **Value:** option weights 0–1; `stateOf` at .7 and .35; an answer shown at
  ≥ .7 and missing at ≤ .3.
- **E:** Editorial: which answer shows more of the thing.
- **S:** As three words and her own notes.
- **Verdict:** Keep, as an ordering of answers.
  - `nonneg: 'untold'` is no longer scored. It used to count as 0.5, which
    dragged "defensive, but comes back" under the line.
  - The man's variants for `secret` and `initiative` stay. They encode that
    the road is not symmetric (`ManVariant` in `src/data/read.ts`).

### S5. The map's grounds

- **Value before:**
  - intake weights on practice (devout 1 … cultural .5), faith-role (a
    slider), family-role (guided 1 … private .6), children (want 1 … unsure
    .6) and timeline (within a year 1 … three-plus .65);
  - thresholds of .75 and .5;
  - shapes "Grounded and ready" and "Ready, with clarity to gain".
- **E:** None. These answers are *positions*, not readiness.
- **W:** It told a Muslim whose faith is private that faith was her "Thin"
  ground ("Thinnest right now: faith"). Anyone who wanted family informed
  rather than central, had no children in view, or had a longer timeline read
  as less ready. That is a religious and cultural verdict the Guide is
  forbidden to give.
- **S:** Yes. **C:** Yes. **B:** No; it blocks nothing.
- **Verdict: removed for positions.**
  - Faith, family and vision have no state. They read "Your position",
    described in her words.
  - Their options carry no weight.
  - Timeline carries none; intention rests on why-now.
  - The four rated grounds are intention, character, steadiness and knowing
    yourself. Only they decide the headline ("On steady ground", "Steady,
    with clarity to gain", "Building your foundation", "Early, and honest
    about it") and which ground is thinnest.
  - The work on the positions is still offered, after the rated grounds'.
  - The learning facts no longer record a state for them.

### S6. Before-you-say-yes and the couple joint

- **Value:** `consequence` .6–.95 per topic; `LOAD_BEARING` .8 (before);
  `STATE_URGENCY`; `URGENCY`.
- **E:** Editorial. `ended.which` exists to find out which topics bear
  weight.
- **S:** The ordering is shown as "the one to open this week". The
  load-bearing tier was shown in the headline.
- **C:** **Yes:** "where you don't, it isn't the ones that carry the most
  weight", said to a couple who differ on qabiil (.7) or going back (.65);
  "You two have done the work most couples never do".
- **Verdict:**
  - Keep the order, because something has to be opened first.
  - Remove the tier. A difference is counted in words ("One conversation
    doesn't line up yet"), whichever topic it is.

## Conversation prompts

These are what the product has earned, and all of them stay:
- the five uncheckable non-negotiables as first questions (`ASK_FOR`);
- the new G1 and G2 questions;
- "open with a place your answers differ";
- the Tuesday-evening question;
- the read's scripts;
- the eleven's open-first and scripts.

They claim nothing about outcome. They hand over words.

## Unvalidated assumptions

These are named and measured, but not decided on.

| # | Assumption | Where | Status |
|---|---|---|---|
| U1 | `COHORT_TARGET` 40 | `cohort.ts`; the door | 40 stays as "the first mark" on the count. The sentence that says when a pool opens no longer names a number the founder does not use: the operative checklist opens on ≥ 20 active preparing men with women at least as many (`docs/ATOMIC.md` §6). "Fitting" now means what each said they won't compromise on |
| U2 | The opening checklist: 20; ≥ 1 for all and ≥ 3 for 80%; 70% activity; 10 introductions a fortnight | `docs/LIQUIDITY.md` | Founder heuristics, never shown. Revised by the introductions record, not by argument |
| U3 | The gate's pass rate | `docs/atomic-sim.mjs` | Re-run: ~56% → **~86%** of pairs (~73% with the age band). Layer 2 at 25/20, q .15: 79% / 26% → 87% / 37%. The §6 conditions stand |
| U4 | "The three things Somali marriages actually break on"; "we'll look for someone…"; "that honesty will find you someone"; "you're matched on what lasts"; "conflict predicts more than how we love" | `matching.ts`, `intake.ts`, `hook.ts`, `coach.ts` | Reworded to what is true: introductions are by hand, from answers |
| U5 | `K_FLOOR` 5 | `floor.ts` | A privacy control, not a matching one. Out of scope |
| U6 | `AGE_GAP` +10 / −3 | `pool.ts` | Reported, never gated (G3). Revised by the founder's hand from the introductions record's `age` reason, never from a tally (`docs/LEARNING.md`) |
| U7 | The read's per-answer weights; the map's weights on the rated grounds; `consequence` | `src/data/read.ts`, `intake.ts`, `eleven.ts` | Editorial orderings, kept and labelled as such. Never summed across dimensions, never shown as numbers |

## What would earn authority back

Nothing here learns on its own (`docs/LEARNING.md`). Authority is earned by
evidence, read by the founder, and written back by hand:

- **The introductions record's no reasons.** If `age` leads, "which ages
  you'd consider" ships as her own stated range, and G3's column becomes her
  preference instead of ours.
- **`ended.which` after twenty endings.** It shows which of the eleven
  courtships actually end on. Then `consequence` can be revised, and a
  headline may one day say which conversation matters more, citing that
  count.
- **Both-yes rate by what the two maps had in common.** Only then could any
  "same" line be called a reason. Until then it is a fact about two answers.

## Tests

- `tests/alignment-audit.test.ts` was written red against `main` first:
  fifteen of seventeen failed. It holds every verdict above and the banned
  phrases.
- `tests/gate-sync.test.ts` still walks all 320 combinations of the two
  gates, so the client and server twins cannot drift.
- `tests/pool-function.test.ts` covers the age column and the unknown stage.
- `src/lib/matching.test.ts`, `read.test.ts`, `reflection.test.ts` and
  `beforeYes.test.ts` were rewritten to the new behaviour, with each test's
  intent kept.
