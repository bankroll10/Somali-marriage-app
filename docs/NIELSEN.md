# Niyyah against Nielsen — ten heuristics, every flow on a phone, 2026-09-18

## Context

`docs/NORMAN.md` fixed twelve interface defects yesterday. This pass walks the
same product against Nielsen's ten heuristics, on a 400 px viewport, with the
functions stubbed and localStorage seeded so the *returning* states can be
reached — which is where the worst issue in this audit lives, and where none of
the previous passes looked.

**Every issue is graded on Nielsen's own scale.** 0 = not a problem. 1 =
cosmetic. 2 = minor, low priority. 3 = major, high priority. 4 = catastrophe,
must be fixed before release. The order of work followed it: the severity 4
first, then the 3s, and nothing below 2 touched while anything above it stood.
One severity 2 was taken because it is a single line in a file an N2 change was
already opening; everything else below 3 is recorded unfixed at the end.

**The headline.** One severity 4, found by seeding the state of a woman who has
already sent the eleven and then opening her own link — the single most likely
thing a person does after sending something: tap it to check it worked. The
product addresses her as him and, one tap later, has her answering the eleven
as him. Her answers become his side, the joint sheet becomes her answers
against her own, and it cannot be undone. The device already holds the code it
sent; nothing checks it.

---

## What each heuristic found

Scored per heuristic, with the issues listed after. Where a heuristic is in
good shape it says so, because four of the ten are.

| # | Heuristic | State |
|---|---|---|
| 1 | **Visibility of system status** | **Good, with one hole.** All four question flows carry "N of 11" and a progress bar; the guide streams, shows a thinking state, and warns before its budget walls rather than walling silently. The hole: when he answers her eleven — the one event the instrument exists to produce — nothing anywhere she looks says so (**N2**) |
| 2 | **Match between system and the real world** | **Strong.** The vocabulary is the community's own: hooyo, mahr, qabiil, aroos, wali, "send his people". Stages are named as a person would say them. Reading level 4.2–5.5 across the instruments. No jargon, no system words in copy after the Norman pass |
| 3 | **User control and freedom** | **Mostly good.** Back steps back one question inside the read, the eleven and the couple sheet; Forget me and Start over now both confirm. Two gaps: an abandoned instrument cannot be resumed (**N4**), and the phone's own back gesture still exits the site (carried, `docs/NORMAN.md`) |
| 4 | **Consistency and standards** | **Adequate.** One focus rule, one button primitive, one share helper, closed vocabularies held by a sync test. Residual inconsistencies are all severity 1–2 and listed below unfixed |
| 5 | **Error prevention** | **The weakest of the ten.** The severity 4 (**N1**) is here, and so is a field that accepts an address nobody can reach (**N3**) |
| 6 | **Recognition over recall** | **Good.** Nothing asks her to remember anything except the six-character code, which the product writes down for her and can send as a link. Options are always visible, never typed |
| 7 | **Flexibility and efficiency** | **Thin, deliberately.** No accelerators, no shortcuts, no saved drafts. The one that matters is resuming a part-finished instrument (**N4**) |
| 8 | **Aesthetic and minimalist design** | **Improving.** The read's result went from eight calls to action to three (`docs/VALUE.md`); Home still carries 17 buttons for the two reasons to open it, which `docs/TREE.md` item 4 holds for the sessions |
| 9 | **Error recognition, diagnosis, recovery** | **Good since yesterday.** Restore names four distinct causes, the clipboard admits refusal, Forget me reports what it could not delete, the couple sheet no longer blanks on a double tap |
| 10 | **Help and documentation** | **Absent from the product surface.** No route to a person from Home, the read or the eleven: no mailto, no "help", no "contact" (**N5**) |

---

## The issues

### N1 · SEVERITY 4 — she can answer her own eleven as him, irreversibly

- **Screen:** `?couple=CODE` → `src/components/Couple.tsx`, routed at `src/App.tsx:386`.
- **Problem.** The couple screen renders whenever the URL carries a code,
  without ever asking whether *this device is the one that sent it*. Seeded
  with the state of a woman whose `couple.code` is `HJKMNP` and pointed at
  `/?couple=HJKMNP`, the product shows her **"She's asked you to do this
  too."** and, after one tap, **"Have the two of you talked about this?"** —
  question 1 of 11, about her, for her to answer as him.
- **Why it matters.** Tapping your own link to check it works is close to
  universal, and she has just sent this one to someone she is deciding whether
  to marry. Answering it destroys the instrument's whole premise — *neither of
  you sees the other's answers, only where you match* becomes her answers
  matched against her own — and it is not recoverable: the record goes `joint`
  and every later attempt returns 409. The product already holds the code it
  sent, one field away, and does not look at it.
- **Smallest fix.** `Couple` takes a `yours` flag; `App.tsx` passes
  `n.couple?.code === n.entryCode`. When it is true, render one branch instead
  of the answer flow: this is the link you sent, here is whether he has
  answered yet, and a way back to your own eleven. No new screen, no new state.

### N2 · SEVERITY 3 — he answered, and nothing tells her

- **Screen:** Home (`src/components/Home.tsx`), after `couple.answered` is set.
- **Problem.** The hook polls for his answer and writes `couple.answered`
  (`src/hooks/useNiyyah.ts:294`). Its only reader is the analytics ladder.
  Seeded with an answered couple and opened at Home, nothing mentions it: not
  the eleven's card, not a banner, not a badge. The joint sheet exists and is
  reachable only by reopening the eleven and tapping *"see where you left it"*.
- **Why it matters.** This is the one outcome the two-sided eleven is built to
  produce, and the product's answer to "what happened?" is that she has to go
  looking on the chance that something did. Nielsen's first heuristic in its
  purest form: the system knows, and does not say.
- **Smallest fix.** Home already has a card for the eleven whose title and
  subtitle change once she has taken it. Add a third state: when he has
  answered, the card says so and opens the same screen. Two strings and one
  prop.

### N3 · SEVERITY 3 — an address nobody can reach, accepted and confirmed

- **Screen:** the door's join form (`src/components/Cohort.tsx:355`).
- **Problem.** The contact field is `type="text"` with validation
  `!contact.trim()`. `sagal@gmial`, `sagal`, or a phone number missing three
  digits all pass. She is then shown the confirmation panel with her own typo
  echoed back to her as proof she is reachable.
- **Why it matters.** The way to reach her is the only thing the door collects
  and the only reason joining it means anything. A silent failure here is
  invisible to her *and* to us: she believes she is on the list, and the one
  route to her is dead. Nielsen ranks preventing an error above reporting one,
  and this error is undetectable afterwards.
- **Smallest fix.** A shared `looksReachable()` beside `src/lib/age.ts`, which
  is the precedent — a tiny validator with one rule, used by the one screen
  that asks. An email needs an `@` and a dot after it; a phone needs seven
  digits. Anything else keeps the button off and says which of the two it was
  reading.

### N4 · SEVERITY 3 — a part-finished instrument cannot be resumed

- **Screen:** the read and the eleven, on returning.
- **Problem.** Answers are component state and are only persisted on
  completion; `buildRead` returns null unless every question is answered
  (`src/lib/read.ts:133`). So a phone call at question nine costs all nine
  answers, and the next visit opens the intro as though nothing happened.
- **Why it matters.** The instrument is ninety seconds, but the moment it is
  taken in is not a calm one, and losing work silently is the classic
  severity-3 failure of both control and efficiency.
- **Smallest fix.** Persist the in-progress answers under the existing
  `niyyah.intake.v1` shape and open at the first unanswered question, exactly
  as the intake's `resume` already does (`src/hooks/useNiyyah.ts:448`).
- **Not implemented in this pass, and why.** This is `docs/BETS.md` B6, scored
  and deliberately deferred, and it changes the behaviour of the two
  instruments the five sessions are about to observe. Every pass since
  `docs/TREE.md` has held instrument changes for the sessions; doing it here
  would break that for a fix the sessions may re-scope. It stays a named
  severity 3 with its fix written down.

### N5 · SEVERITY 2 — no route to a person from any main screen

- **Screen:** Home, the read, the eleven.
- **Problem.** No mailto, no "help", no "contact", nothing. The address exists
  in `src/lib/site.ts` and appears on exactly two surfaces: the door's join
  form, and Trust — which is at least one tap from both public tools since
  yesterday.
- **Why it matters.** The product is being handed to strangers by mosques.
  Someone confused, or upset by what a read told her, has nowhere to go.
- **Smallest fix.** One line in Home's footer, beside "Why Niyyah", using the
  existing `CONTACT_EMAIL`. Graded 2, and implemented only because it is one
  line and shares a file with an N2 change — not as polish ahead of the 3s.

### Severity 2 and below, recorded and not touched

Listed so the next pass has them, and explicitly not worked on while the above
stands. The door's Count-me-in disables on six conditions with no message. The
age field accepts letters. `?couple=`, `?vouch=`, `?door` and `?families`
cannot be reloaded. The same arrow glyph means "navigate" and "expand". Static
gold pills look like interactive chips. "Skip" sits in the primary slot on two
screens. About fifteen touch targets are 31–39 px. The guide falls back to its
offline voice silently. `Read.tsx` has 21 interactive elements and no ARIA — the
largest of these, and the one worth a pass of its own.

---

## What changed

| # | Sev | Fix | Files |
|---|---|---|---|
| N1 | **4** | Her own couple link says it is hers and cannot be answered; his phone is untouched | `src/components/Couple.tsx`, `src/App.tsx` |
| N2 | **3** | Home's eleven card becomes the news: *He answered · Where the two of you stand*, and it renders whatever her stage | `src/components/Home.tsx`, `src/App.tsx` |
| N3 | **3** | A contact that cannot be reached is refused, in the terms she typed in | new `src/lib/contact.ts` + test, `src/components/Cohort.tsx` |
| N5 | 2 | One route to a person in Home's footer | `src/components/Home.tsx` |

**N4 stays a named severity 3**, with its smallest fix written, held for the
sessions with every other instrument change.

On N1's shape: the block is needed only while he has not answered. Once he has,
the server returns the sheet as answered and that is the same sheet both of
them see, so her own link lands her exactly where she should be with no special
case. The fix is one condition and one branch.

## How it was verified
1. `npm run verify` — 54 test files, 645 tests (53 and 641 before; the new file
   is `src/lib/contact.test.ts`). `npm run build` green.
2. Chromium at 400 px with localStorage seeded, sixteen assertions:
   - her own link says it is hers, offers no way to answer, and tells her he
     has not answered yet;
   - his phone still gets *"She's asked you to do this too"* and can still
     answer all eleven;
   - when he has answered, her own link shows the joint sheet rather than a
     block;
   - Home says *He answered*, names what she gets, and the card opens the
     eleven;
   - the door names a domain typo, keeps Count me in off, names a short number
     as short, names "neither yet" as neither, and clears on a real address;
   - Home carries a mailto.
   The door's form renders only when the waitlist form is configured, so that
   part was verified against a build carrying `VITE_WAITLIST_FORM`, as
   production does.

## Keeping this true
A fixed issue is struck through with the date, never deleted. The severity 2
list at the end is the next pass's queue, in that order.
