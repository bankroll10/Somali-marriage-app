# The voice — every word earns its place (2026-09-20)

*What Niyyah sounds like, written down as a target and not only as a list of
prohibitions; the habits the microcopy audit found; what was changed; and the
test that keeps it. `docs/PROTOCOL.md` §"cultural failure" is the session-side
of the same rule — what participants call outsider-ish, auntie-ish,
performative, exaggerated or gender-inverted overrides anything decided here.*

---

## 1 · The target

Seven words, and what each one forbids.

| The voice is | So it does not |
|---|---|
| **Somali-aware** | explain hooyo, wali, mahr, aroos, qabiil, dugsi or deen to a Somali; make a claim about "every Somali family" it cannot defend; put "sister" in a man's screen |
| **Adult** | reassure twice; say "there's no shame here"; call a person's carefulness "what honest love looks like" |
| **Calm** | say "actually", "genuinely", "truly", "literally" — the words a sentence uses when it is not sure of itself |
| **Warm** | perform warmth: "one more honest thing", "let your auntie be honest with you", "we mean it plainly" |
| **Precise** | say "the whole road", "the single best prediction", "the most attractive thing on this whole map", "the whole point" |
| **Dignified** | use the register of a workbook ("emotional readiness", "self-awareness", "the work", "healing", "boundaries", "triggered") outside the one voice allowed it |
| **Direct** | wrap a design decision in a because-clause; announce a frame ("here's the frame"); explain what it is about to say before saying it |

Six rules that follow:

1. **One negation per paragraph.** "Not X — it's Y" is a shape, not a thought;
   forty of them in a row is a tic.
2. **A guarantee is said once per screen**, where the control it describes is.
   Trust said "turn it off and nothing is sent" twice and "never" twenty times.
3. **A Somali word is never explained to a Somali.** The gated Somali sentences
   carry an English gloss for the gate's own reason (`tests/somali-gate.test.ts`),
   and that is the only glossing there is.
4. **No verdict from a tap.** Eleven multiple-choice answers do not license
   "he is not the one" or "the single best prediction of a marriage". They
   license "one of the clearest signs", "that is your answer", "watch what he
   does next".
5. **The therapist is the only voice allowed to sound like one**, and even she
   says "this passes" rather than "your body is in alarm".
6. **The text names the side that is reading it.** A man reading the eleven
   gets a man's `why`, `words` and `tells` — not a woman's with the pronouns
   swapped, and never a woman's unswapped (`tests/mens-read.test.ts`).

## 2 · The ten lines this pass took as its model

Every one was already in the product. They are the standard the rest was held
to.

1. *"Everything else can wait. A person who is serious about you lets you exist in their life."* — the read, `public`
2. *"A month is an answer. 'Soon, inshaAllah' with nothing attached is also an answer — it is just not the one you were hoping for."* — the read, `public.tells`
3. *"Say it once, then stop starting, and watch what happens. That is your answer, and it does not require anyone to be honest with you."* — the read, `consistency.tells`
4. *"Hooyo, I've been getting to know someone, and I want you to know before anyone else does. It's early, I haven't decided anything, and I'm not asking you to."* — the family words
5. *"Hosting is honour, and it is also labour, and somebody carries it."* — the eleven, `his-family-in-home`
6. *"Agreement from six months ago is a memory, not a contract. Closer to the day, the answers move."* — the eleven, deciding
7. *"The part of your map you would rather not read. It is the reason to trust the rest of it."* — the lexicon, on the thinnest ground
8. *"It ended. That is allowed, and it is progress."* — Ended
9. *"You chose someone, and you did it in the open."* — the ending
10. *"Not a badge you tap."* — Trust

What they share: a concrete noun, a verb that does work, no adverb, one idea, and
nothing that claims to know more than eleven taps can know.

## 3 · What the audit found

Three sweeps over every user-visible string in `src/components`, `src/data`
and `src/lib`. The failures were not scattered; they were a handful of habits,
each repeated dozens of times.

| Habit | Live on 2026-09-20 | Example |
|---|---|---|
| "actually" | ~60 | *"a read on what he has actually done"* |
| "not X — it's Y" | 40+ | *"Family is not the obstacle — family is the proof."* |
| Text naming the wrong side | 30+ | a man reading the eleven got *"A second wife — what she believes about it for her own life"*; Trust said *"Sister"* only to women and *"him"* to everyone |
| "decide a Somali marriage" | 7 | the phrase `docs/PROTOCOL.md` gives as its **example** of an exaggerated cultural claim |
| Therapy register outside the therapist | ~40 | the guide's fallback under every voice: *"Check your own peace… that's data too"*; the map: *"Your heart leans anxious, so silence will feel like danger before it is danger"* |
| Reassurance stacked | "never" ×20 on Trust | seven "never"s in two sentences |
| Startup nouns | | *"Founding cohort"*, *"platform"*, *"your space"* ×15, a mailto subject *"I want in"* |
| Overstatement | ~15 | *"the single best prediction of a marriage"*, *"I've seen a hundred of these stories"*, *"in our families this is the whole road"* ×4, *"Most people here"* about an empty room |
| Filler | 12 city notes | *"and beyond"*, *"the whole city"*, *"The capital region"* |

Two of these were **bugs** under `docs/PROTOCOL.md` ("text that names the wrong
side"), not preferences, and shipped first.

## 4 · What changed

Five commits, one per slice; `59 files changed, 754 insertions(+), 518 deletions(-)` against `main`.

| Slice | What | Where |
|---|---|---|
| 1 · Wrong side | The eleven's `why`/`words`/`tells` get a man's version where the sentence does not invert (`work`, `second-wife`, `his-family-in-home`, `deen-daily`); Trust speaks through `speak()`; a man's *"Telling your family you met her online"* script; the pre-gender Welcome says *"they"* | `eleven.ts`, `beforeYes.ts`, `families.ts`, `Trust.tsx`, `Welcome.tsx`, `ending.ts`, `lexicon.ts`, `SampleIntroduction.tsx`, `tests/mens-read.test.ts` |
| 2 · The tics | `tests/voice.test.ts` bans the words in §5 and scans every file; 78 phrase-level drops across 27 files; the brand description, manifest and guide fallback rewritten; the mailto sent the scene **id** (`twin-cities`) to the founder — now the city | 27 files |
| 3 · Overstatement | Every claim at the size of what Niyyah has seen: *"one of the clearest signs"*, *"for most of us this step is not a formality"* once, *"many people"*, the auntie observes rather than rules; Trust's h1 *"What you have done here."*; twelve city notes name neighbourhoods or nothing | `read.ts`, `lib/read.ts`, `coach.ts`, `reflection.ts`, `beforeYes.ts`, `scenes.ts`, `BeforeYes.tsx`, `guidePages.ts`, `hook.ts`, `Ended.tsx`, `Families.tsx`, `invite.ts` |
| 4 · Therapy language | The intake asks what she does (*"When someone you care about goes quiet, what do you do?"*) and the map repeats it in her words; labels *"Steadiness"* and *"Knowing yourself"*; the therapist is plain; the Islamic voice says adab and limits | `intake.ts`, `reflection.ts`, `nextStep.ts`, `coach.ts`, `Reflection.tsx` |
| 5 · Say it once | Trust: four 84–110-word sentences become lists, the second copy is described once, seven "never"s become one list, "Our promise" loses its sincerity openers; *"Count me"* → *"Tell us which steps you reach"* (`docs/PLACE.md` C1); *"your space"* → *"Home"*; intros 4 bullets → 2; RestoreMap, ReportConcern, Profile, NotSaving each say their thing once; the Arabic blessing carries its English | `Trust.tsx`, `tests/load.test.ts`, `Home.tsx`, `Reflection.tsx`, `Coach.tsx`, `Couple.tsx`, `Door.tsx`, `App.tsx`, `lexicon.ts`, `Read.tsx`, `BeforeYes.tsx`, `RestoreMap.tsx`, `ReportConcern.tsx`, `ui.tsx`, `Profile.tsx`, `Ending.tsx`, `Ended.tsx` |

**Two earlier decisions reversed, on the brief's authority and not this
pass's taste:** `tests/load.test.ts`'s 1,800-word floor on Trust (set when the
collapse promised "no word deleted", `docs/LOAD.md`) is replaced by a floor on
each of the six rows, which is where a deletion would hide; the six pinned
clauses are unchanged. And `docs/NORTHSTAR.md`'s call to keep *"Emotional
readiness"* is reversed there, with the reason.

### Measured

Chromium at 400 px, `innerText`, every `<details>` opened so hidden prose is
counted too. The numbers that matter are the second and third columns; the
word counts fell as a side effect of saying things once.

| Screen (400 px, every row open) | Words before → after | “actually” | “never” | dashes |
|---|---|---|---|---|
| welcome | 249 → 247 | 3 → 0 | 2 → 2 | 8 → 8 |
| read intro | 234 → 215 | 2 → 0 | 3 → 3 | 2 → 2 |
| eleven intro | 188 → 170 | 1 → 0 | 3 → 2 | 5 → 5 |
| home | 240 → 236 | 0 → 0 | 0 → 0 | 5 → 5 |
| trust | 2399 → 2157 | 2 → 0 | 20 → 3 | 47 → 28 |
| reflection | 960 → 943 | 0 → 0 | 3 → 2 | 17 → 15 |
| door | 84 → 80 | 0 → 0 | 0 → 0 | 2 → 2 |
| profile | 621 → 599 | 1 → 0 | 4 → 4 | 15 → 14 |
| coach picker | 110 → 103 | 1 → 0 | 0 → 0 | 2 → 2 |
| eleven result (woman) | 481 → 462 | 1 → 0 | 3 → 2 | 6 → 5 |
| eleven result (man) | 478 → 464 | 1 → 0 | 3 → 2 | 6 → 5 |

Trust's remaining 2,000 words are the six rows, each of which still matches a
line of code that sends something; what went was what was said twice. The
"nobody" count on Trust did not move: every one is a claim ("registered to
nobody", "nobody holding it can open your map") and not a reassurance.

## 5 · What `tests/voice.test.ts` enforces

Every line of `src/components`, `src/data` and `src/lib` that is not a comment,
and every file again with its line breaks folded (JSX wraps prose at the
column, and *"decide a Somali\n marriage"* had passed the line scan):

`actually` · `genuinely` · `literally` · `truly` · `superpower` · `on purpose` ·
`deliberately` · `that is deliberate` · `the whole point` · `here's the frame` ·
`your peace` · `data too` · `nervous system` · `regulate` · `journey` ·
`healing from` · `inner work` · `performing recovery` · `founding cohort` ·
`founding member` · `platform` · `I want in` · `situationship` ·
`decide(s) a Somali marriage` · `the whole road` · `single best/most` ·
`no other app` · `load-bearing` · `I've seen a hundred`

Allowed, each with a reason in the test: *"Actually, it's something else"* (a
button in the person's own voice, correcting us); `navigator.platform` (code);
one routing regex that reads what she typed.

## 6 · Not done, and why

- **The read's and the eleven's question prompts**, beyond the wrong-side
  fixes. The sessions are the instrument for *"would you say the words"*
  (`docs/PROTOCOL.md`), and the rewrites are meant to come from participants'
  own voices.
- **The Somali gated lines.** A native speaker's call.
- **"Not X — it's Y"** was thinned, not eliminated. Some of them are the best
  lines in the product (*"The problem isn't you. It's the room."*). The rule is
  one per paragraph, not zero.
- **Cultural claims kept**: *"Many of us send money home"*, *"For most of us
  this step is not a formality"*, *"Before the aunties have a version"*, the
  family scripts' openings. Each is one the founder can defend in a room of
  Somalis; each is now said once.

## 7 · What would falsify this

`docs/PROTOCOL.md`: if fewer than half who reach a result would say the words as
written, they are rewritten from the participants' rewrites. If two participants
call a line here *outsider* or *performative*, that line goes, whatever this
pass thought of it. If the sessions show the "actually"s were doing work — that
a sentence without one reads as colder — the test's allowlist grows. Record in
`docs/FEEDBACK.md`.
