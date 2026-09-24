# Design

The rules every screen and every sentence in Niyyah is built to, and the
budgets that hold them. Each rule names the test or file that enforces it, or
says that nothing does. The passes that set them (2026-09-18 to 2026-09-23,
Chromium at 400 px, functions stubbed) are in git at commit `43295a4`. A fixed
finding keeps its id and gains a date, so a citation from code still resolves.
`docs/PROTOCOL.md` overrides all of it; the sessions go in `docs/RESEARCH.md`.

## 1 · Voice

What it never says is `tests/voice-rules.ts`, read by `tests/voice.test.ts`
(every non-comment line of `src/components`, `src/data`, `src/lib`, and again
with line breaks folded) and by the guide's tone grader. A line participants
call outsider-ish, performative, exaggerated or gender-inverted goes
(`docs/PROTOCOL.md`, "WHAT COUNTS AS A CULTURAL FAILURE").

| The voice is | So it does not |
|---|---|
| **Somali-aware** | explain hooyo, wali, mahr, aroos, qabiil or deen to a Somali; claim anything about "every Somali family"; say "sister" on a man's screen |
| **Adult** | reassure twice; say "there's no shame here" |
| **Calm** | say "actually", "genuinely", "truly", "literally" |
| **Warm** | perform warmth ("one more honest thing") |
| **Precise** | say "the whole road", "the single best prediction", "the whole point" |
| **Dignified** | use workbook register ("the work", "healing", "triggered") outside the therapist |
| **Direct** | explain a design decision to the reader, or announce a frame before the thing |

1. **One negation per paragraph.** "Not X — it's Y" is a shape, not a thought.
2. **A guarantee is said once per screen**, beside the control it describes.
3. **A Somali word is never explained to a Somali.** The gated Somali lines
   carry a gloss for the gate's reason (`tests/somali-gate.test.ts`), nothing else.
4. **No verdict from a tap.** Answers license "one of the clearest signs" or
   "watch what he does next", never "he is not the one".
5. **Only the therapist may sound like a therapist.**
6. **The text names the side reading it**: a man gets a man's `why`, `words`
   and `tells` (`tests/invariants/both-sides.test.ts`).

The banned list, each entry with its reason: the tic (`actually`,
`deliberately`), sweeping claims (`the whole road`, `single best`,
`decide a Somali marriage`), therapy outside the therapist (`your peace`,
`regulate`, `journey`) and startup nouns (`founding cohort`, `platform`).
`voice.test.ts` adds **overclaims** (`predicts`, "will find you someone") and
**promises the code cannot keep** ("we write to", blocking, "powered by AI").

The standard: *"A month is an answer."* · *"Hosting is honour, and it is also
labour, and somebody carries it."* · *"It ended. That is allowed, and it is
progress."* A concrete noun, a verb that works, no adverb, one idea. The
instruments' prompts wait for participants' own rewrites; the Somali lines are
a native speaker's call.

## 2 · Accessibility

The bar is WCAG 2.1 AA. `tests/ui/screens.test.tsx` renders every reachable
screen and audits it with `tests/support/a11y.ts`; a new screen gets a row.
`tests/a11y.test.ts` holds what a DOM without layout cannot prove.

| Rule | Where |
|---|---|
| One `<main>` and a heading per screen; on a screen change focus moves to its `<h1>` | `useFocusHeading`, `src/App.tsx` |
| Every control and field has an accessible name (a placeholder is not one); chip groups are `role="group"`/`"radiogroup"` with `aria-labelledby` | audited per screen |
| Selection is never colour alone: `role="radio"`/`"checkbox"` and `aria-checked` | `QuestionCard`, `Read`, `BeforeYes`, `Identity`, `ReportConcern` |
| A confirmation is announced (`Announce`, `sr-only` `role="status"`); a submit error is `role="status"`; a field's error uses `aria-describedby` + `aria-invalid` | `ui.tsx` |
| Contrast on cream `#f7f2e8`: `muted #706d65`, `clay #9b5d46`, `gold-ink #85682e` ≥ 4.5:1; field border `line-strong #9a8150` ≥ 3:1; `gold`/`gold-soft` only on `forest-deep` | `src/index.css`; ratios computed from the live hex |
| Focus visible: one rule, `:where(button, a, [role='switch']):focus-visible`; `fieldClass` has its own visible ring | `src/index.css`, `ui.tsx` |
| Reduced motion: a blanket CSS rule, and every JS smooth scroll through `scrollBehavior()` | `src/lib/motion.ts` |
| `lang="so"` on every Somali sentence; `src/data/somali.ts` keeps Somali and gloss as separate fields | `Situation`, `BeforeYes`, `Families`, `src/lib/guidePages.ts` |
| The crash screen is `role="alert"` | `ErrorBoundary.tsx` |

Every interactive element is a native `<button>`, `<a>`, `<select>` or
`<input>`. Chip selectors (~30 px) clear WCAG 2.5.8's 24 px. **Open:**
`TypingDots` has no accessible name; the guide's `role="log"` reply grows in
place and may re-announce; no screen-reader or keyboard-only walk yet.

## 3 · Mobile

| Rule | How | Held by |
|---|---|---|
| **Safe areas** — `index.html` is standalone (`viewport-fit=cover`, `black-translucent`) | `pt-safe`, `pt-safe-6`, `pt-safe-8`, `pt-safe-sticky`, `pb-safe-bar` in `src/index.css`, each falling back to `0px`; no component writes `env(safe-area-inset…)` itself | `tests/mobile.test.ts` |
| **16 px field floor** — iOS zooms on focus below it | no `input`, `select` or `textarea` under `1rem`; the printed sheets too | `tests/mobile.test.ts`, `tests/sheet.test.ts` |
| **Pinch-zoom allowed** (WCAG 1.4.4) | no `maximum-scale`; a dark-mode `theme-color` | `tests/mobile.test.ts` |
| **Touch targets 44 px** | `BackButton` `h-11 w-11`; `TextButton` adds `min-h-11 px-2` and nothing visible; Trust's toggle takes the tap on the whole row | review |
| **Forms** | `inputMode` fits the field; `autoCapitalize="words"` on names; `enterKeyHint`; textareas capped so a keyboard cannot push Continue off screen | review |
| **Async buttons say what they are doing** | a `Spinner` and a verb: "Sending…", "Checking…" | review |

The composer is `flex h-dvh`, not `position: fixed`; no copy is truncated; no
modals, no landscape layout. **Needs a real iPhone:** insets in a tab versus
standalone, the keyboard resizing the composer, whether 16 px stops the zoom.

## 4 · Performance budget

Optimise what a number shows. Sizes from `npm run build`; timings from
Chromium against `vite preview` at 390×844, 4× CPU, 150 ms, 1.5 Mbps down.

| Budget | Measured | Held by |
|---|---|---|
| Every screen but Welcome loads behind `lazy()`, inside one `<Suspense>` whose full-height fallback cannot shift layout | 15 lazy screens in `src/App.tsx` | `tests/performance.test.ts` |
| Initial JS under ~400 KB raw / ~130 KB gzip | 2026-09-24: entry chunk 302.41 KB (98.90 gzip); with the ten modulepreloaded chunks, 360.4 KB (119.9 gzip). Was one 611.63 KB chunk before the split | build output; Vite warns at 500 KB |
| A stream writes state at most once per frame, and flushes once more at the end | `Coach.tsx` coalesces every `text_delta` through `requestAnimationFrame` | `tests/performance.test.ts`, mutation-tested |
| No blanket idle-prefetch | tried twice: FCP 1,940–1,960 ms became 2,164–2,204 ms (~12% slower) | this row |
| CLS under 0.1 | 0.0127 on Welcome (2026-09-20); no raster images; fonts self-hosted, `unicode-range`, `font-display: swap` | re-measure before adding either |
| One render-blocking resource | the stylesheet, 48.73 KB (9.01 gzip); no third-party script | review |

Largest lazy chunk: `Coach`, 22.74 KB (8.06 gzip). Server SDKs are imported
only under `netlify/` and `tests/`. `saveProgress` is debounced 250 ms. No fix
without the number that justifies it.

## 5 · Links

**Every link opens the right instrument for the right reader, and nobody needs
to understand the product first.** Recognised in `src/lib/entry.ts`; minted in
`src/lib/links.ts`, `words.ts`, `src/data/invite.ts`, `couple.ts`, `keep.ts`
and `ending.ts`; held by `tests/invariants/links-open-the-right-thing.test.tsx`
(every builder's link, mounted, lands on its instrument about the right person)
and `tests/tools.test.ts`.

| Kind | Form | Opens |
|---|---|---|
| `read` | `/tools/is-he-serious`, `/tools/is-she-serious`; `/?read` | the read about that side; the query form asks who |
| `eleven` | `/tools/before-you-say-yes`; `/?eleven` | Before you say yes |
| `families` | `/tools/families`; `/?families` | the family words |
| `couple` | `/?couple=CODE` | his side of the eleven she sent; her own link on her own phone says so (N1) |
| `map` | `/?map=CODE` | a kept map for herself, asked on `ConfirmRestore` before anything is replaced (`docs/SECURITY.md` O2) |

`?via=` names what carried a link (`words`, `eleven`, `couple`, `family`,
`married`, `group`, `alumni`, `professional`, `mosque`, `press`), never who.
`?demo` and `?fresh` are developer switches, not links anyone is sent.

- **A tool has its own address and preview.** `vite.config.ts` writes a
  static page per row of `src/data/tools.ts`, because messaging crawlers run
  no JavaScript; `pathFor` keeps the bar on the path, so a reload lands there.
- **An unambiguous target mints the path.** Two sites still mint the query:
  `words.ts`'s `read`/`guide` case (a script carries no side), and
  `invite.ts`'s couple invitation (`/?eleven&via=couple`), which could carry
  the path and does not.
- **The query is stripped before any round trip** (`src/main.tsx`), so no code
  sits in the bar, history or a screenshot; Share mints a fresh link. A
  `couple` link survives a reload for 24 hours (`rememberEntry`).
- **Failure is a no-op**: a bad code or no network renders the app she would
  have seen. **Back**: `App.tsx` only calls `replaceState`, so the browser's
  Back leaves the site; the in-app Back navigates inside a tool.
- **Offline shell** (`src/lib/serviceWorker.ts`, `tests/service-worker.test.ts`):
  network first; never `/.netlify/*`, never a write; navigations cached by path
  alone, so no code lands on disk (`docs/SECURITY.md` T3); `/sw.js` is `no-cache`.

## 6 · Failure states

**No important failure leaves her wondering whether something happened.** Most
of what broke had one cause: a timeout, an offline phone, a 404, a lapse, a 409
and a 503 all became one `null`, and a screen holding a `null` can only guess.
So every call goes through `send()` in `src/lib/net.ts`, with a clock, and a
failure keeps its reason as a `Why`: `unreachable`, `refused`, `not-a-code`,
`not-found`, `expired`, `taken`, `garbled` — the guide's stream in
`src/lib/coach.ts` is the one exception (`tests/fail.test.ts`). Every route
answers a failure with a status and JSON (`tests/failure-modes.test.ts`).

### Every failure state, and what it costs

| Failure | What she sees | Safe | Retry |
|---|---|---|---|
| **No signal on open** | The app, from the offline shell; a screen whose code never arrived says "This screen hasn’t reached your phone yet", Try again only (`docs/SECURITY.md` T18) | everything on the phone | n/a |
| **Network unavailable** | The reason, per screen, never a guess | everything | yes |
| **API unavailable** (503) | "that is us, not you", with the action still offered | everything | yes |
| **Claude unavailable** | "We couldn’t reach the guide just now, so that answer came from this phone. It cost you nothing." | the thread | yes, free |
| **Claude drops mid-answer** | The words that arrived stay: "That answer was cut off." | the partial answer | yes |
| **Storage unavailable** | `NotSaving` on the read, the eleven, the couple sheet, the intake and Home | the session, until the tab closes | n/a |
| **Restore code** | One sentence per reason: not a code, nothing under it, moved, forgotten, lapsed, or "that is us, not your code" | the phone's own map | only if unreachable |
| **Expired couple link** | "they last ninety days", only when the server says so | her answers | no |
| **Failed keep** | "That didn’t save — nothing is lost." The old code is dropped only once a new one exists | map, answers, code | yes |
| **Failed couple answer** | "That didn’t send — the link is fine and your answers are still here." | his answers, in the draft | yes |
| **"Has he answered?" fails** | "We couldn’t check whether he has answered", and Check again | everything | yes |
| **Refresh on `?couple=`, closed tab** | Back at the question he left; the read and the eleven resume too (`src/lib/draft.ts`) | answers | n/a |
| **Forget me, server unreachable** | The phone is cleared; the screen names what is still held and the code; the delete finishes when Niyyah next opens | only `niyyah.forget.pending.v1` | automatic |
| **Timeout** | 10 s per call (`net.ts`), 8 s on the progress post, 20 s to the guide's first character | everything | yes |
| **Rate limit** | The same as an outage, deliberately (`netlify/shared/limit.ts`) | everything | yes |
| **Duplicate action** | Every write is guarded and shows it; keep and couple writes are conditional (`onlyIfMatch`/`onlyIfNew`) | — | yes |
| **Unsupported state** | A map that will not rebuild still redirects silently to Welcome; `buildRead` returning null renders blank. Named | — | — |
| **Stale data** | A re-opened read shows no date of its own. Named | — | — |

### The four that mattered most

1. **The guide deleted an answer it had given** and charged a reply for it.
   `CoachReply` carries `live`: arrived words stay; only a live answer costs.
2. **She was told it worked when nobody could reach her.** Never say a write
   worked unless the server said so.
3. **The link was blamed for the network**, and his answers thrown away.
   `Couple.tsx` tells not-found, expired and not-a-code from unreachable.
4. **The limiter could take down what it protects**: a Blobs hiccup was a 500
   on every capped endpoint. Its store now opens inside its `try`.

### The line

**A check is not a poll**: "has he answered?" retries once, twenty seconds
later (`RECHECK_MS`), then waits for her next visit. **Failure is not loud**: a
rate limit reads as an outage, and the guide's fallback note is one grey line.
**Nothing is written back after forget me**: `forgotten` is set before the
first await and stops the autosave, and the crash screen calls
`clearEverything()` (`tests/journeys/forget-offline.test.tsx`,
`tests/fail.test.ts`). There is no server-side timeout in `netlify/`; that
wants its own decision in `docs/OPS.md`.

## 7 · Fogg: remove obstacles, never nudge

A behaviour happens when motivation, ability and a prompt meet. Raising
motivation is the one move Niyyah must not make, so the model is read one way:
**find where she had already decided and the product got in the way.** **The
eight, scored:** four sound (asking the difficult question, sending the
eleven, involving family, deleting data), four fixed below; joining the pool
went with the door on 2026-09-24.

### The four defects

1. **Nine answers, and then the phone rang.** `src/lib/draft.ts` keeps a
   part-finished read, eleven or couple sheet, offered above the intro.
2. **The map asked for the expensive thing first.** `KeepMap` sits right after
   the grounds on `Reflection.tsx`: one tap, no account, no email.
3. **A dead button** on the door (gone). The rule stays: a disabled button
   names what it is waiting for, as `Identity.tsx` does.
4. **A promise with no route.** Trust renders Report a concern whenever a
   couple code exists, under the paragraph that promises it.

**The guard:** Forget me's "this phone is cleared" is worth what `LOCAL_KEYS`
(`src/lib/forget.ts`) is; `tests/forget-keys.test.ts` fails on any
`niyyah.*.vN` key it misses. **Prompts wait:** the follow-up asks after three
days (`MIN_AGE_DAYS`), once, and takes "not yet" as an answer; a read is
re-offered after thirty (`READ_STALE_DAYS`); the guide is never pushed.

### The line

**No badge, no streak, no count of unfinished things**: a draft is read on the
way into its instrument and nowhere else; rungs cannot be named for sessions,
time or streaks (`src/lib/rungs.test.ts`); follow-ups never say "come back"
(`src/lib/followup.test.ts`). **No re-engagement**: no reminder, no
notification. **Drafts expire after thirty days** and never leave the device.
**Nothing raises motivation.** If drafts are made often and resumed rarely,
the instruments are too long: `docs/RESEARCH.md` A1.

## 8 · Load: how much a screen asks at once

People read this anxious, on a phone, at night. The burden is how much is said
**at once**. Check each screen against seven: (1) reading too much,
(2) remembering, (3) product words, (4) too many options, (5) several serious
decisions at once, (6) internal logic, (7) heavy material with no hierarchy.

- **One disclosure primitive**, `<Disclose>` in `ui.tsx`; `<details>` is written
  by hand nowhere else. The closed hint is the *answer* ("Your answers, under a
  code only you have"), so most people never open it.
- **One primary action at a result**; the rest in "More you can do here".
- **Section titles are headings**, not styled `<p>`s.
- **Don't ask a choice the product can make**: the guide opens the voice
  `defaultModeFor` recommends, the others behind "Or choose a different voice".
- **Measure what renders**: `innerText` for words, `checkVisibility()` for
  controls (`getBoundingClientRect()` still lays out closed `<details>`).

Current from the load pass: **L0** `<Disclose>`, **L1** Trust as the answer
then one row per thing that leaves the phone (four rows now), **L4** the
results' outline, **L5** the guide's recommended voice. Gone on 2026-09-24:
**L2** the lexicon and `<Words>`, **L3** Profile, **L6** the door's blocks,
**L7** `tests/load.test.ts`. Held for the sessions: the intake's questions,
the 1,400 ms pause and Home's controls.

## 9 · Norman: every tap answers

**Rules.** Every tap gets a visible response. An error says what is wrong. The
irreversible asks first (Forget me, Start over, a `?map=` link). What looks
disabled is disabled. Targets 44 px (§3); focus visible (§2); scroll resets
before paint (`App.tsx`). **Conceptual model:** a kept map, the couple sheet,
the steps and the guide can each leave the phone, and Trust lists each; the
model is *nothing leaves unless you tap something that says it will*.

| # | Fix | Principle | Where |
|---|---|---|---|
| 1 | The code field takes only what a code can be (`ALPHABET`, 8 characters, 6 still accepted); a real placeholder; no round trip on a bad shape; a sentence per reason | signifier, constraint, feedback | `src/lib/code.ts`, `RestoreMap.tsx`, `tests/vocab-sync.test.ts` |
| 2 | "Copied" only when something was (`shareOrCopy` returns `'failed'`) | feedback | `share.ts`, `Coach.tsx` |
| 3 | A refused clipboard says so | feedback | `ScriptCard.tsx` |
| 4 | Transient confirmations announce themselves | feedback | `Announce` |
| 5 | The not-saving warning shows in the intake, while answers are given | feedback | `Intake.tsx` |
| 6 | Forget me replaces the page only when every delete landed | feedback | `useNiyyah.ts`, `ForgetMe.tsx` |
| 7 | Start over asks, and forgets the code so it cannot overwrite a real map | constraint | `Home.tsx`, `useNiyyah.ts` |
| 8 | An option that looks disabled is refused, `aria-disabled` | constraint | `QuestionCard.tsx` |
| 9 | His eleventh answer cannot be sent twice; "already answered" renders | constraint | `Couple.tsx` |
| 10 | Disclosures carry a chevron | signifier | `Disclose` |
| 11 | Text fields have a visible focus ring | signifier | `fieldClass` |
| 12 | Back is 44 px | affordance | `BackButton` |

**Named, not fixed:** `ArrowRight` means both "go" and "expand"; "Skip for
now" on the hook starts the intake; Home's stage picker uses `aria-pressed`
like a filter. **Mapping:** `App.tsx` never pushes history, so the phone's
Back leaves Niyyah from any screen — a considered trade, since an
eleven-question flow cannot be half-lost to a stray Back.

## 10 · Nielsen: the heuristics and their N-ids

Severity 0–4 (none, cosmetic, minor, major, catastrophe); worked in that
order. A fixed issue keeps its id and gains a date.

| # | Heuristic | State |
|---|---|---|
| 1 | Visibility of system status | "N of M" on every question flow; the guide streams and warns before its budget runs out; N2 |
| 2 | Match with the real world | the community's words; stages named as a person says them |
| 3 | User control and freedom | Back one question at a time; destructive actions confirm; drafts (N4) |
| 4 | Consistency and standards | one focus rule, one `Button`, one share helper; `tests/vocab-sync.test.ts` |
| 5 | Error prevention | N1, N3 |
| 6 | Recognition over recall | only the code is remembered, and the product writes it down |
| 7 | Flexibility and efficiency | no accelerators; drafts (N4) |
| 8 | Aesthetic and minimalist design | §8 |
| 9 | Recognise, diagnose, recover | restore names each reason; Forget me says what it could not delete |
| 10 | Help and documentation | N5; crisis lines by country (`src/data/help.ts`) |

- **N1 · Severity 4 — she could answer her own eleven as him**, irreversibly,
  by opening her own `?couple=` link. Fixed 2026-09-18: `App.tsx` passes
  `yours` when the code is this phone's own and not the second side, and
  `Couple.tsx` says it is her link and whether he has answered.
- **N2 · Severity 3 — he answered, and nothing told her.** Fixed 2026-09-18:
  Home's eleven card says *He answered*; since 2026-09-24 it opens the joint.
- **N3 · Severity 3 — an address nobody could reach**, on the door's contact
  field. Fixed 2026-09-18; went with the door on 2026-09-24.
- **N4 · Severity 3 — a part-finished instrument could not be resumed.** Fixed
  2026-09-19 by `src/lib/draft.ts` (§7).
- **N5 · Severity 2 — no route to a person from any main screen.** Fixed
  2026-09-18: Home's footer mails `CONTACT_EMAIL` ("Something wrong, or a
  question? Write to us").

## 11 · Place: where am I, what can I do, how do I go back

Every screen answers a stranger's five questions: where am I, what can I do,
why would I, how do I go back, what happens afterward. Walk in as the person
sent a link: every screen that trapped someone was reached from another
person's phone. Leaving goes through `backHome` (`App.tsx`), never a hard-coded
Welcome. Per `docs/PROTOCOL.md`, a bug is fixed before the next session; a
confusion changes only when two people hit it.

**Seven ways to be stuck, fixed 2026-09-20:** (1) her own eleven link's Back
went to Welcome — now `backHome`; (2) the vouch screen, the same — gone with
the vouch; (3) his intro offered only Start — "What Niyyah is" sits beside
it; (4) question one committed him — Back returns to the intro; (5) "already
answered" had no control — the same exit; (6) the vouch form — gone with the
vouch; (7) the guide's header chevron switched voice — it is Back, to Home.

**Still open:** Welcome's `<h1>` ("What’s in your way?") and Home's ("Salaam,
{name}.") do not name the place; question screens are titled only
"{i} of {n}".

**Predicted confusions:** **C1** "counted" meant three things — resolved
2026-09-20 ("Tell us which steps you reach"). **C2** "the eleven" is a name no
button says; the screen is "Before you say yes" — open. **C3** "Send the door"
— gone with the door. **C4** "your space" named nothing — resolved, "Home".
**C5** "guide" had no lexicon entry and **C6** Trust defined none of its words
— both gone with the glossary. **C7** "reading" collided on Trust — gone with
the door.

**Designed and held:** Home ordered by where she is tonight, one label per
destination, held because Home is the first thing a participant sees. On
2026-09-24 the stage band stopped repeating the cards above it.

## 12 · Value: time to the first useful thing

Work before value is what costs — decisions, composed fields, words read,
waits, permissions; screens carry no cost when they carry the value. Value is
the read and its next question (**talking**), the conversation to open and its
words (**deciding**), the family words, the map (**preparing**), the Ending
(**married**).

**Measured 2026-09-18** (re-measure before quoting): no path asks a permission
before value; the read's link was the benchmark, nearly every tap an answer;
the front door added six taps and ~500 words for the same read; **deciding**
read 2,291 words first; **preparing** took 41 taps and 21 decisions.

A gate stays when the value cannot be computed without it, when what comes
next needs it, or when removing it would make a promise untrue.

| # | Toll gate | Status |
|---|---|---|
| 1 | Married routed to an empty compose box | Removed 2026-09-18: the Ending first (`marriedOpensEnding`, `src/lib/inferStage.ts`) |
| 2 | The vouch's required sentence | Removed 2026-09-18; gone with the vouch |
| 3 | The eleven asked the side before saying what it is | Removed 2026-09-18: intro, then "Start — about him" / "about her" |
| 4 | A vouching relative counted as `arrived` | Removed 2026-09-18; gone with the vouch |
| 5 | Identity before Situation | Held for the sessions (18 taps would become 14) |
| 6 | The 1,400 ms pause after the intake (`src/lib/reflection.ts`) | Held |
| 7 | Welcome's copy on a path already chosen | Held |
