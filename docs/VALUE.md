# Time to meaningful value — every entry measured, and the toll gates worth removing, 2026-09-18

## Context

`docs/TREE.md` put the outcome at the top and asked what to subtract. This pass
asks the narrower question that decides whether any of it is ever felt: **from
arrival, how much work does a person do before they receive something genuinely
useful?** Not "how many screens" — screens are free when they carry the value.
Work is what costs: decisions that need thought, fields that need composing,
words that must be read before anything is given, waits, and permissions.

**Everything below is measured, not estimated.** Chromium at 400 px against
the current build, Netlify functions stubbed, one fresh browser context per
path, with `navigator.share` and `clipboard.writeText` instrumented to catch
permission-shaped asks and every function call logged. The harness is in the
scratchpad; the counting conventions are stated before the table so every
number is reproducible.

**The one-paragraph answer.** The two direct tool links are the fastest paths
in the product and need no redesign: eleven or twelve taps, no required fields,
no permission, value in about seven seconds of machine time. The front door
adds six taps and roughly five hundred words to reach the identical value, and
on the *deciding* path a person reads 2,291 words before receiving anything.
The worst path is not the longest one: it is **married**, which routes to an
empty compose box and makes the person write free text before the product will
say anything, while the screen designed for that stage is unreachable. The
second worst is the **vouch**, where a relative doing someone a favour must
compose prose before the button turns on. Four fixes were defects or
unambiguous unnecessary work and were made in the pass that wrote this; the
rest are designed here and gated on the five sessions, because what to cut
from the front door is exactly what the sessions are for.

---

## What "meaningful value" means, per entry

Defined before measuring, from the product's own test (`docs/NORTHSTAR.md`:
*does it end in something they can say?*). The stop condition for each walk:

| Entry | Meaningful value is… | Detected by |
|---|---|---|
| `?read` link | The honest read, and the one question to ask next, word for word | the script card's title |
| `?eleven` link | The one conversation to open, and the words for it | a script card rendering |
| families link | The words for hooyo, or for a wali | a script card rendering |
| vouch link | For the relative: the vouch registered. For her: nothing here — it lands later | the thank-you screen |
| talking | Same as `?read` | as above |
| deciding | Same as `?eleven` | as above |
| preparing | The map: her seven grounds in words, and one thing to do | the reflection resolving |
| married | A reply from the guide | the thread carrying a reply |

**Counting conventions.** *Screens* are distinct body-text states, hashed, so
a shell heading that never changes cannot hide eleven question screens.
*Taps* are every click. *Decisions* are the subset that select among
semantically distinct options — an answer, a stage, a side — never a
Continue. *Required fields* are inputs that block progress; the front door's
name field is labelled optional and is excluded. *Reading burden* is the sum
of words on every distinct screen up to and including value. *Waits* are the
longest single gap between an action and the screen that answers it.
*Permissions* are share, clipboard, notification or location asks.

---

## The measurement

| Entry | Screens | Taps | Decisions | Required fields | Words read | Words at value | Longest wait | Net calls | Permissions |
|---|---|---|---|---|---|---|---|---|---|
| **`?read` link** (`/tools/is-he-serious`) | 13 | 12 | 11 | 0 | 1,066 | 483 | 0.6 s | 3 | **0** |
| **`?eleven` link** (`/tools/before-you-say-yes`) | 14 | 13 | 12 | 0 | 1,802 | 431 | 1.1 s | 4 | **0** |
| **families link** (`/?families`) | 2 | 1 | 1 | 0 | 457 | 302 | 0.6 s | 1 | **0** |
| **vouch link** (`/?vouch=…`) | 3 | 2 | 1 | **3** | 517 | 179 | 0.6 s | 3 | **0** |
| **talking** (front door) | 18 | 18 | 13 | 0 | 1,557 | 483 | 1.1 s | 5 | **0** |
| **deciding** (front door) | 18 | 18 | 13 | 0 | **2,291** | 434 | 1.1 s | 5 | **0** |
| **preparing** (front door) | 28 | **41** | **21** | 0 | 1,823 | 928 | 1.2 s | 5 | **0** |
| **married** (front door) | 8 | 7 | 2 | **1, free text** | 665 | 122 | 1.6 s | 5 | **0** |

**Two results worth stating before the criticism.** *Zero permission prompts
before value on every path* — no sign-in, no notification ask, no location, and
share and clipboard are touched only after she has something, when she chooses
to act. And *zero required text fields on five of the eight* paths. For a
product in this category that is unusual, and it is the reason the tool links
are as fast as they are.

---

## Path by path: where the work actually is

### `?read` link — 12 taps, 0 fields, the benchmark
Intro (139 words) → 11 questions → result. Eleven of twelve taps are the
instrument computing its answer, so the work-to-value ratio is near ideal:
**92% of taps are the value**. The 1,066 words read are mostly the questions
themselves, which have to be read to be answered. Nothing to remove.

### `?eleven` link — 13 taps, but the first is a toll gate
The first screen is *"Before we start — who are you deciding about?"* — a
blocking question asked **before the page has said what it is**. The read
solved this exact problem: a tool path carries the side (`READER_OF` in
`src/data/tools.ts`) and, when it cannot know, the read presets and offers a
one-tap correction. The eleven's URL carries no side, so it asks first and
explains second. That is one screen and one decision spent before any reason
to care. **Unnecessary.**

### families link — 1 tap, the cheapest value in the product
Arrive on five script titles (155 words), tap one, get the words (302 words).
One decision, and it is a real one. Nothing to remove — and worth noting as
the shape every other path should envy.

### vouch link — 3 required fields, on the path with the least motivation
A relative arrives on 169 words explaining what is being asked, taps who they
are, and then must fill **two text fields** — a first name and *a sentence in
their own words* — before the button enables (`ready` in
`src/components/Vouch.tsx` requires all three). This is the only place in the
product that requires composed prose from someone doing a favour, on a phone,
probably at their daughter's request. **The sentence is unnecessary work**: the
record already carries who vouched and when, and `phone` is already optional.
A father who taps "brother" and types his name has attested.

Also measured here, and not a user-facing gate: **arriving on a vouch link
posts a progress record**, so a relative who was never a candidate is counted
in `arrived` — the denominator of the one number the product keeps
(`src/lib/rungs.ts`, `src/lib/progress.ts`). A measurement toll gate.

### talking — the front door costs 6 taps and 491 words for identical value
Welcome (249) → Identity (63) → Situation (57) → the stage's line (61) →
then the same read as the direct link. Every tap after the sixth is the read.
So the front door's entire contribution to this path is: a gender, an age
checkbox, a stage, and four mechanical Continues. The gender is genuinely
needed; the read asks for it itself when it does not have it.

### deciding — 2,291 words before anything, the heaviest reading in the product
Same six front-door taps, then the eleven's intro on top of Welcome's 249 and
Situation's two screens. It reads more than any other path and delivers the
same value as the direct `?eleven` link, which reads 489 words fewer.

### preparing — 41 taps, 21 decisions, 28 screens, and a deliberate pause
Six front-door taps, the hardest-part question, then sixteen intake questions
across three chapters with an intro screen each, then a **1,400 ms intentional
pause** (`src/lib/reflection.ts`: *"this moment should feel considered, not
instant"*), then the map at 928 words. Twenty-one decisions, every one about
herself, before the product says anything about her. This is the path
`docs/TREE.md` found to be the most over-invested and `docs/JOBS.md` found to
have the weakest trigger, and the measurement agrees: **it asks the most work
for the value with the least evidence behind it.**

### married — the shortest path to the emptiest screen
Two decisions, then an empty compose box. `chooseSituation` routes married to
`openGuide`, and the guide gives nothing until she writes free text — the only
required free-text field standing between any user and value. Meanwhile the
ending, the screen built for exactly this moment, is unreachable from here:
`openGuide` overwrites the screen `setStage` set (`docs/AUDIT.md` §6, now
measured). **A defect, not a trade-off.**

---

## Toll gates: the ones that earn their place, and the ones that do not

**The rule.** A gate is necessary when the value cannot be computed without
it, when it is required for what happens next, or when removing it would make
a promise untrue. Everything else is unnecessary work.

**Necessary, and staying.** The read's eleven answers and the eleven's eleven
topics — they *are* the value. The vouch's relationship and first name — an
anonymous vouch attests nothing. The gender, wherever the words change with
it. The 18+ confirmation on any path that writes a place to a server.

**Unnecessary, ranked by work removed:**

| # | Toll gate | Cost | Why it is not earning it |
|---|---|---|---|
| 1 | **Married routes to an empty compose box** | The whole stage's value | The stage's own screen exists and is unreachable. A defect |
| 2 | **The vouch's required sentence** | 1 composed field, on the least motivated path | The record is complete without it; `phone` is already optional |
| 3 | **The eleven's side question before its intro** | 1 screen, 1 decision, pre-value | The read already solved this; the same product does it two ways |
| 4 | **A vouching relative counted as `arrived`** | Distorts the one number | He was never offered a conversation |
| 5 | **Identity before Situation** | 4 taps, 63 words, on all four front-door paths | The instruments ask for gender themselves; the 18+ gate is absent on the tool links, so it is inconsistent rather than protective |
| 6 | **The 1,400 ms deliberate pause** | 1.4 s, after 21 decisions | Considered-feeling is worth paying for at second one, not at minute three |
| 7 | **Welcome's 249 words on a path that has already chosen** | ~250 words × 4 paths | Someone who arrives knowing what they want reads a manifesto first |

Gates 1–4 are implemented in this pass. Gates 5–7 are designed below and
**gated on the five sessions**, because they change what a session participant
is being shown, and `docs/TREE.md` item 3 already commits to not moving the
front door on inference. Naming them now means the sessions can be watched for
exactly this.

---

## The redesign, per entry

Optimising for less unnecessary work, not fewer screens. Where a screen earns
its place it stays, even when it could be merged.

**`?read` link — unchanged.** 12 taps, 11 of them the instrument. The
benchmark the others are measured against.

**`?eleven` link — the intro comes first, the side question becomes the start.**
The 164-word intro renders first, and where "Start" is today there are two
buttons: *Start — about him* / *Start — about her*. The question is preserved
(no guessing at anyone's situation), one blocking screen disappears, and the
person reads what it is before being asked anything. Same pattern as the
read's chooser, moved behind the explanation. `src/components/BeforeYes.tsx`.

**families link — unchanged.** One tap to the words.

**vouch link — two required fields, not three.** The sentence becomes optional
with its placeholder unchanged, so a relative who wants to write one still
does. `ready` drops `sentence`. A relative who taps *brother* and types
*Cabdi* has vouched. `src/components/Vouch.tsx`.

**vouch link, measurement — a relative is not an arrival.** A device whose
entry was a vouch link and which holds no map of its own does not report
rungs, so `arrived` counts candidates. `src/hooks/useNiyyah.ts`,
`src/lib/progress.ts`.

**married — the ending, not the compose box.** `chooseSituation('married')`
opens `ending` when there is no ending record yet, and the guide after that.
The stage gets the screen built for it: a record of what happened, the shares
only a married person can make, and the four questions. The guide remains one
tap away, as every stage has it. `src/hooks/useNiyyah.ts`.

**talking and deciding — designed, gated on the sessions.** Situation comes
before Identity, and the instrument asks for gender itself (both already do
when it is unknown). The 18+ confirmation moves to the first screen that
writes a place to a server — which is also where `docs/RISKS.md` found the
gate inconsistent — so the tool links and the front door finally treat age the
same way. Net effect on both paths: **18 taps to 14**, two screens fewer, and
the person answers "what's happening" before "who are you".

**preparing — designed, gated on the sessions.** Two changes, neither of them
a cut to the sixteen questions, which A1 exists to judge. First, the
deliberate pause moves from after the sixteenth question to the moment she
starts, where a considered feeling is cheap. Second, the three chapter intros
become headers on the first question of each chapter rather than screens of
their own: three screens and three taps removed with no words lost. **41 taps
to 38, 28 screens to 25** — and the real question, whether sixteen questions
should be asked at all, stays with the sessions where it belongs.

---

## What was changed, and what was left alone

Four changes. Each was a defect or unambiguous unnecessary work, and none
alters what the five sessions are measuring.

| # | Change | Files | Held by |
|---|---|---|---|
| A | Married opens the ending, then the guide | `src/hooks/useNiyyah.ts`, `marriedOpensEnding` in `src/lib/inferStage.ts` | 2 unit tests; Chromium: married reaches the ending, no compose box first |
| B | The vouch's sentence stopped blocking | `src/components/Vouch.tsx` | Chromium: relationship + name enables the button, and it sends |
| C | A vouch-only arrival is not an `arrived` | `src/hooks/useNiyyah.ts`, `countsAsArrival` in `src/lib/inferStage.ts` | 3 unit tests; Chromium: no progress write on a vouch entry |
| D | The eleven explains itself before asking the side | `src/components/BeforeYes.tsx` | Chromium: intro first, both start buttons set the side, pronouns right, **13 taps → 12** |

Both new rules live in `src/lib/inferStage.ts`, which already exists to hold
the hook's decisions as pure, testable functions rather than as branches
nobody can assert on.

**Left alone, by decision:** the front-door reordering, the deliberate pause,
and the chapter-intro merge — gates 5, 6 and 7. All three are designed above,
all three change what a session participant sees, and `docs/TREE.md` item 3
already commits to not moving the front door on inference. They are named in
`docs/TREE.md` item 4 so the sessions can be watched for exactly them.

## The result

| Entry | Taps before | Taps after | What changed |
|---|---|---|---|
| `?read` link | 12 | 12 | Unchanged — the benchmark |
| `?eleven` link | 13 | **12** | The side question folded into starting |
| families link | 1 | 1 | Unchanged |
| vouch link | 2 taps, 3 required fields | 2 taps, **2 required fields** | No composed prose for a favour |
| talking | 18 | 18 | Gated on the sessions |
| deciding | 18 | 18 | Gated on the sessions |
| preparing | 41 | 41 | Gated on the sessions |
| married | 7, ending unreachable | 6, **the ending** | The stage reaches the screen built for it |

## How it was verified
1. `npm run verify`: 53 test files, 640 tests (635 before — five new on the two
   extracted rules). `npm run build` green.
2. Chromium at 400 px, functions stubbed, eleven assertions: married lands on
   the ending with no compose box; the vouch enables and sends on two inputs;
   the vouch writes no progress record; the eleven leads with its intro, still
   asks the side as the start, reads neutrally until told, resolves pronouns
   correctly from either button, and reaches the words in twelve taps; the
   read is unchanged at twelve.

## Keeping this true
A path's row changes in the commit that changes the path. A gate moves from
unnecessary to removed with the date it went, never by being deleted from the
table — the record of what was charged for is worth keeping.
