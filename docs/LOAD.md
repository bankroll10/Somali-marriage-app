# Niyyah and cognitive load — what has to be held in the head at once, 2026-09-18

## Context

Seven audits since Monday — `docs/AUDIT.md`, `RISKS.md`, `JOBS.md`, `TREE.md`,
`VALUE.md`, `NORMAN.md`, `NIELSEN.md` — graded this product on truth, risk,
jobs, priority, time-to-value, affordances and usability. None of them asked
the question this one asks: **how much does a person have to process at once?**

That matters here more than in most products. The people using Niyyah are
anxious, usually reading on a phone at night, and the material is the most
emotionally loaded in their life. A thoughtful product that is exhausting to
read gets closed, and a closed screen teaches nothing, converts nothing, and
protects nobody. Niyyah's failure mode was never that it says too little.

**The rule this pass worked under: no word is deleted.** Every sentence on the
heavy screens matches a line of code that sends something, or a promise the
product has to keep. The burden was never the amount said; it was the amount
said *at once*. So the instrument is progressive disclosure, and the claim
being made is not "shorter" but "the same depth, in the order a person needs
it". `tests/load.test.ts` holds that claim: it fails if a disclosure is ever
quietly emptied.

**Everything below was measured in Chromium at 400 px against the built app**,
from rendered text — `<p>/<li>/<blockquote>` `innerText`, `checkVisibility()`
for controls — with the functions stubbed and localStorage seeded. Both columns
come from the same probe: `origin/main` was checked out into a worktree, built
and measured after the change, so the before and after are the same
measurement of two builds, not an estimate against a number.

Two measurements were thrown away getting here, and both are worth recording
because they are the easy ways to get this wrong:

- A **static scan of the source** reported Trust's longest paragraph as 2,735
  words. That was a docblock. Source is not what a person reads.
- `getBoundingClientRect().width > 0` **does not exclude content inside a
  closed `<details>`** in this Chromium build — the box is still laid out. A
  first pass using it reported Profile as still showing 24 buttons after four
  of them had been collapsed. `innerText` is correct (it respects rendering,
  which is why the word counts were never affected); for controls the answer is
  `checkVisibility()`.

---

## Measured: before and after

| Screen | Rendered words | Scroll px (phones) | Headings | Longest ¶ | ¶ > 60 words | Visible controls | Disclosures |
|---|---|---|---|---|---|---|---|
| **Trust** | 2,366 → **463** | 7,941 → **3,075** (9.2 → 3.6) | 5 → **6** | **562 → 64** | **11 → 2** | 4 → 4 | 0 → **9** |
| **Profile** ("What decides who you meet") | 691 → **344** | 3,249 → **2,152** (3.8 → 2.5) | **1 → 3** | **232 → 61** | 2 → **1** | 24 → **20** | 0 → **2** |
| **Philosophy** ("Why Niyyah") | 665 → **533** | 4,894 → **4,050** | 7 → 7 | 64 → 64 | 1 → 1 | 2 → 2 | 0 → **1** |
| **The guide's picker** | 107 → **49** | 1,072 → **860** | 1 → 1 | 18 → 19 | 0 → 0 | **6 → 2** | 0 → **1** |
| **The eleven's result** | 434 → **369** | 2,834 → **2,511** | **1 → 2** | 61 → 61 | 1 → 1 | **9 → 5** | 0 → **2** |
| **The read's result** | 483 → 482 | 2,595 → 2,641 | **1 → 4** | 66 → 66 | 1 → 1 | 4 → 4 | 1 → **2** |
| **The door** | 153 → 154 | 924 → 964 | 1 → 1 | **67 → 44** | **1 → 0** | 5 → 5 | 0 → 0 |
| The door's join form | 63 → 63 | 911 → 911 | 1 → 1 | 15 → 15 | 0 → 0 | 5 → 5 | 0 → 0 |
| Home (returning) | 184 | 1,806 | 1 | 21 | 0 | 15 | 0 |
| The reflection (map result) | ~928 | — | 1 + 8 section headings | — | — | — | 0 → **1** |
| Welcome | 249 | 1,580 | 1 | 50 | 0 | 4 | 0 |

**Across the three heaviest screens: 3,722 → 1,340 rendered words (−64%), and
16,084 → 9,277 px of scroll — 18.7 phone screens down to 10.8.** Trust alone
went from 2,366 words to 463, and from nine phone screens to three and a half,
without losing a sentence.

Home, Welcome and the reflection are unchanged by design — see **Not in scope**.

### Terminology, counted honestly

Word-boundary counts over `src/components/*.tsx` and `src/data/*.ts`, with
comments and `className` values stripped, so these are words the product
actually says to somebody:

**your map 96 · reach 56 · vouch 41 · the eleven 35 · kept 31 · pool 24 · the
door 18 · your space 16 · counted 16 · ground 12 · thin / steady / strong 28.**

A glossary existed and defined six of them — *your map, a reading, your ground,
the work, the mirror, your space* — and it lived on Philosophy, one screen
reached from Home's footer. It did not define **the eleven, a read, the door, a
vouch, your code, counted, or thin / steady / strong**, and it was nowhere near
any screen that uses them. A woman reading her own map could not find out what
"thin" meant without leaving the map.

Two things are *not* in the count, and it would be easy to claim them
dishonestly: **"ledger"** appears 25 times in component source and never once
in rendered copy — it is a prop name. **"instrument"** appears only in
`src/data/instruments.ts` and a test. Neither is a burden on anybody.

---

## The seven burdens, and where each one was

### 1 · Read too much — Trust, at nine phone screens

2,366 rendered words, 7,941 px, five headings, **zero disclosures**, and a
"Where your answers live" section of seven stacked paragraphs — two of them
**562 and 536 words in a single `<p>` at 0.88rem**. Eleven paragraphs were over
sixty words.

Nothing in it could be cut. Every clause matches a line of code that sends
something, and the screen is the product's whole case for being trusted. It is
also now the screen **both public tools link to** ("What leaves your phone, and
what doesn't"), so it is what a stranger from a mosque WhatsApp group gets.

Philosophy was second at 665 words over 4,894 px, also with nothing collapsed.

### 2 · Remember information

Mostly fine: the only thing to remember is the six-character code, which the
product writes down and can send as a link. The one real case was Trust —
answering "what leaves my phone?" meant holding six conditional exceptions in
memory, because they were prose rather than a list you could check off.

### 3 · Interpret terminology

Thirteen product words in live copy, six defined, and the definitions on a
different screen from every single use. See the counts above.

### 4 · Choose among too many options

- **Profile: 24 controls on one 3,249 px column.**
- **The eleven's result offered eight next actions** — copy · send to someone ·
  ask him · talk to your guide · the words for your family · now your own map ·
  send the eleven to a sister · go through it again — at the moment a person has
  just been told which marriage conversations she and he have never had.
- **The guide asked her to choose among five voices** before she could ask
  anything. Home's own copy says *"You don't pick a guide — we read what you
  said and open the right one"* (`Home.tsx:295`). `defaultModeFor` already
  computed the answer and the screen already badged one card "For you". It
  simply refused to act on it.

### 5 · Several serious decisions at once — Profile

Nine open panels: the ledger, the vouch ask, her non-negotiables, four live map
questions (whose house, work, mahr, how far she'd go), what she carries, age and
community, the sample introduction, **the price**, **an invite**, and **the
entire door join flow embedded at the bottom**. Joining a cohort, weighing a
price and inviting someone were being asked while she answered whose house she
would live in — under **one heading**, on the screen that tells her what would
decide who she marries.

### 6 · Understand internal logic

Trust's 562-word "Joining the founding cohort" paragraph is a data-flow diagram
written as prose: five stores, two retention rules, a k-anonymity floor and a
second copy at a form service, in one breath. Honest, necessary, unreadable in
that form.

### 7 · Emotionally heavy material with no hierarchy

The three heaviest value screens each arrived as one undifferentiated column
under a single heading: the read's result (483 words, **1 heading**), the
eleven's result (434 words, **1 heading**), Profile (691 words, **1 heading**).
In every case the section titles existed — as styled `<p>` eyebrows, invisible
to the document outline and to anything reading it aloud.

**The reflection was the exception, and it is the one that matters most.** ~928
words, the largest value screen in the product, and it *already had* eight
sections each with a real `<h2>`. It was not restructured for that reason. This
is recorded because the temptation in a pass like this is to find something
wrong with every screen named in the brief; the measurement said this screen was
already doing it correctly, so it got the glossary and nothing else.

---

## What was built

| # | Change | Files |
|---|---|---|
| L0 | **`<Disclose>`** — one disclosure primitive: native marker stripped, chevron rotates, closed hint. `Read.tsx` had worked this out twice by hand; now every screen opens the same way, and a test forbids a tenth hand-rolled `<details>` | `src/components/ui.tsx`, `Read.tsx` |
| L1 | **Trust: the answer, then six rows.** The opening promise stays; the six exceptions it already names become six `<Disclose>` rows whose closed hint is the *answer* ("Keeping your map — your answers, not your email"). The 562- and 536-word paragraphs are split at their own sentence seams into eight and nine. Count me's 100-word mechanics, Forget me's two honest limits and the report mechanism each move behind a row that says what they are. Eyebrows become `<h2>` | `Trust.tsx` |
| L2 | **`src/data/lexicon.ts`** — the six terms leave Philosophy and seven join them. **`<Words ids={…}>`** renders a closed glossary of only the words *that* screen uses, on the reflection, Profile, the read's result and the eleven's result. Philosophy still holds the full list, now behind one row | new `src/data/lexicon.ts`, `ui.tsx`, `Philosophy.tsx`, `Reflection.tsx`, `Profile.tsx`, `Read.tsx`, `BeforeYes.tsx` |
| L3 | **Profile: hierarchy, and one commitment at a time.** Four eyebrows become `<h2>`. The price, the invite and the embedded door collapse into "Other things you can do here" — so the four questions the screen exists to ask are what is on screen | `Profile.tsx` |
| L4 | **The two results get an outline**, and the eleven adopts the shape the read already had: one primary — her own map, or the family words once she has one — and the other five inside "More you can do here" | `Read.tsx`, `BeforeYes.tsx` |
| L5 | **The guide opens the voice it already recommended.** `defaultModeFor` is now acted on; the other four are behind "Or choose a different voice", which is what "you can switch any time" already promised | `Coach.tsx` |
| L6 | **The door's two long blocks split.** `opensWhen` becomes two sentences instead of a thirty-two-word clause chain ending in three qualifiers; the 67-word paragraph under the only button on the screen becomes what joining costs, then what it does not do | `src/lib/cohort.ts`, `Door.tsx`, `Cohort.tsx` |
| L7 | **`tests/load.test.ts`** — nine tests: the lexicon covers every id a screen asks for and defines only words the product says; Trust still names all six exceptions, still contains six clauses a person is most entitled to find, ~~and still carries at least 1,800 words of prose~~ *(replaced 2026-09-20 by a floor on each of the six rows — docs/VOICE.md)*; `<details>` is hand-rolled in exactly one file | new `tests/load.test.ts` |

### What this deliberately did *not* do

Nothing was rewritten to be shorter, and no promise, limit or mechanism was
dropped to make a screen lighter. The two places that would have been easiest —
Trust's founding-cohort paragraph and the report mechanism in "Our promise" —
are intact, word for word, on rows that name them. That is the difference
between disclosure and deletion, and it is what the word floor in
`tests/load.test.ts` exists to keep.

*2026-09-20 (docs/VOICE.md): the voice pass did what this pass declined to —
it cut what Trust said twice, and the word floor went with it. The six pinned
clauses and the six rows are still there, now floored row by row, which is
where a deletion would hide; the "no word deleted" rule was this pass's, and
the microcopy brief said the opposite.*

Philosophy is the one honest complication. Its glossary grew from six terms to
thirteen, so left open it would have taken that screen *up* from 665 words to
867 and from 4,894 px to 6,130 — measured mid-pass. Closing it is what turns a
regression into 533 words. Worth naming, because it is the shape of the trade
this whole pass is making: depth costs nothing when it is one tap away, and
costs a reader everything when it is not.

---

## Not in scope, and why

Held for the five sessions per `docs/TREE.md` items 3–4 and `docs/PROTOCOL.md`:
the 16 map questions, the 11 read and eleven questions, the front-door chain
(basics → situation → hardest part → the honest answer), the 1,400 ms pause in
`src/lib/reflection.ts`, the three chapter intros, partial-instrument resume
(`docs/BETS.md` B6), and **Home's 15 controls**. Presentation of results was
treated as in scope throughout; the instruments themselves were not.

The door's join form needed nothing: 63 words with one field per step, it is
already the best-disclosed flow in the product, and the measurement says so.

Still open from `docs/NIELSEN.md`, unchanged by this pass: `Read.tsx` has 21
interactive elements and no ARIA (severity 2, worth a pass of its own), and a
part-finished instrument still cannot be resumed (severity 3, `docs/BETS.md`
B6, held for the sessions).

## What would falsify this

A disclosure is a bet that people open the thing they need. It is the one claim
here that cannot be settled by measuring a build:

- If the five sessions show someone **wanting** to know what leaves her phone
  and not opening the row that says so, the row's hint is wrong, not the
  disclosure — and the hint is the cheapest thing on the screen to change.
- If nobody ever opens "Or choose a different voice", the four other guides are
  not a feature, and `docs/TREE.md` should say so.
- If somebody asks a question that one of the thirteen lexicon entries answers,
  `<Words>` is in the wrong place on that screen.

All three are observable in the five sessions, and all three are cheap to
reverse. Record what happens in `docs/FEEDBACK.md`.
