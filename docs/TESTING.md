# The test suite, audited (2026-09-24)

The founder's ask: *hundreds of tests are useful only if they protect the
right things.* This audit sorts every test file into the nine categories they
named. It finds where the suite tested how the code was written, not what it
does, and where the journeys a member walks had no test at all. It then builds
tests around the seven things this product cannot get wrong. The measure
throughout is what the suite protects. How many tests it has is not the
measure.

**Headline**

|  | Before | After |
|---|---|---|
| Test files | 79 | 94 |
| Tests | 1,093 | 1,275 |
| Time (`npx vitest run`) | ~12 s | ~22 s |
| Files that exercise behaviour / read source text / both | not tracked | 67 / 10 / 17 |
| Tests in files that render the app | 0 | 66 (journeys, screens, links, the sample) |
| Tests over generated inputs | 1 file (exhaustive `gate-sync`) | 6 files |
| Invariants with a suite named for them | 0 of 7 | 7 of 7 |
| Real defects found by the new tests | — | 3, all fixed here |

## What the suite was

Seventy-nine files, all in vitest's node environment: no DOM, no browser, no
generated inputs.

**Where it was strong**
- **Function tests:** `keep-`, `cohort-`, `couple-`, `vouch-`, `pool-`,
  `progress-`, `safety-` and `sweep-function`. Each runs a real handler over
  its own in-memory Blobs double.
- **Pure-logic units:** the tests beside `src/lib`.
- **Contract tests:** `vocab-sync`, `gate-sync`, `guide-prompt`.
- **Failure tests:** `integrity`, 41 cases.

**Where it was weak**
- **Source text standing in for behaviour.** At least eleven files, about 200
  tests, checked source text in place of behaviour:
  - `a11y` checked that Coach's textarea has a name by grepping the `.tsx` for
    `aria-label`.
  - `fail` checked that `asked/` is claimed before `token/` by comparing two
    string offsets in `vouch.ts`, and broke on a harmless rename in the last PR.
  - `mobile`, `brand`, `durable`, `promises`, `somali-gate`, `voice`,
    `performance`, `deploy-layout`, and parts of `security-audit` and `help`
    did the same.

  Such tests pass on a UI that is broken, if the attribute sits on a branch
  that never renders. They fail on one that is correct but refactored. Some
  guard things behaviour cannot reach, such as a CSS class, a build setting
  or a file that must not exist. Most were standing in for a rendered check
  the repository had no way to make.
- **No journey tested end to end.** Keep a map, lose the phone, restore it.
  Send him the eleven, see only the joint. Forget me with the network down.
  Each step had a unit test; the journey was walked by hand in Chromium once
  and never again.
- **Nothing rendered.** No test ever saw the markup React produces, so no test
  could say a screen had a heading, a landmark or a named control. It could
  only say some file contained the string.
- **Invariants held in fragments.** The table below is the gap for each.

## The nine categories, before and after

Every file is now entered in `tests/catalog.ts` under its categories. A file
can hold more than one. `tests/catalog.test.ts` fails if a test file is missing
from it.

| Category | Files before | Files after | What changed |
|---|---|---|---|
| Unit | 40 | 41 | `both-sides` properties over the prose engines |
| Integration | 14 | 19 | Netlify in a box: the real client over the real handlers |
| Contract | 20 | 23 | Founder table discovery; the catalogue itself |
| Security | 16 | 21 | Code isolation, sheet privacy and residue, across every route |
| Property | 1 | 6 | fast-check, over the product's own vocabularies |
| End-to-end | 0 | 7 | Five journeys, the links table and the rendered sample |
| Accessibility | 3 (all source or mixed) | 4 (one rendered) | A markup audit over 26 rendered screens |
| Visual | 0 | 0 | **Deliberately absent.** See below |
| Failure-mode | 9 | 13 | Failures caused on purpose, replacing source-order regexes |

**Visual.** It is absent on purpose. Pixel snapshots need a pinned browser and
font stack in CI, which this repository does not have; without one they fail
on anti-aliasing, not on regressions. The stand-ins:
- the static style guards in `tests/mobile.test.ts`;
- the contrast arithmetic in `tests/a11y.test.ts`, computed from the real
  tokens;
- a Chromium walk before release.

`VISUAL_ABSENT` in the catalogue says so, and the catalogue test fails if a
visual test appears without that line being rewritten.

## The architecture: four layers and one guardrail

### 1. `tests/support/`: one of each thing, shared

There used to be a Blobs double per file, thirteen of them. Now there is one
of each helper:

| Helper | What it gives a test |
|---|---|
| `blobs.ts` | An in-memory Netlify Blobs with real etags, `onlyIfNew` and `onlyIfMatch`, plus hooks to break it: `failOn` makes a chosen call throw; `before` runs a competing request at an exact point; `failOpen` makes a store fail to open. It keeps an **op log**, so a test can assert what a route *read*, not only what it returned. |
| `server.ts` | **Netlify in a box.** `serve()` puts the real handlers behind the global `fetch`, so the real client code and the real server code run in one test. `down()` takes the network away. `call()` makes one direct request. |
| `device.ts` | **A phone.** Its own `localStorage`. `onPhone(p)` switches phones mid-test, `reload()` clears what a page reload clears, and `shareSheet()` records what the share button handed over. |
| `arbitrary.ts` | fast-check inputs built from the product's own lists: intake, read and eleven answers, genders, codes and needles. A new option is generated the day it ships. |
| `residue.ts` | `residue(needles, phones)`: every store (keys and values) and every phone, searched for anything of hers. |
| `a11y.ts` | An audit of rendered markup. It checks that every control and field has a name; that `aria-labelledby`, `aria-describedby` and `aria-controls` resolve; that no id repeats; that `aria-checked` sits on a checkable role; that every group has a name; one `main`; and a heading. It is not axe, which needs layout, but these are the checks that decide whether a screen-reader user can use the screen. |
| `render.tsx` | `mount(<App/>)` under happy-dom. The returned object has `press(name)` (by accessible name, listing what *is* on screen when nothing matches), `type(label, value)`, `settle()` and `until(check)`. |

Rendered tests start with `// @vitest-environment happy-dom`. There is no
testing library beyond React's own `act`.

### 2. `tests/invariants/`: the register

There is one suite per invariant, named for it. Each states the invariant in
its header and runs through Netlify in a box, so both the client and the
server are real. Each uses generated inputs where the input space is large.
Every invariant also has a second file behind it (`tests/catalog.test.ts`
enforces both).

| Invariant | Suite | Mutation applied | New suite | Old suite alone |
|---|---|---|---|---|
| One code never restores another person's data | `one-code-one-person` | Restore reads another code's map | Red (2 of 4) | Red (2) |
| A non-negotiable is never silently ignored | `non-negotiables-are-never-ignored` | A new dealbreaker option that nothing gates or asks about | Red (1) | Red (1) |
| One side never sees the other's sheet | `private-sheets` | The couple view carries her side (`first`) | Red (1) | Red (1) |
| Delete means deleted | `delete-means-deleted` | Forget me leaves the contact | Red (2 of 2) | Red (11) |
| Founder routes fail closed | `founder-routes-fail-closed` | Progress GET loses its gate | Red (8) | Red (3) |
| Links open the correct instrument | `links-open-the-right-thing` | `ENTRY_SCREEN` sends `read` to the eleven | Red (5) | **Green: missed** |
| Male and female paths stay semantically correct | `both-sides` | `speak()` gives a man the woman's voice | Red (5) | Red (13) |

Each mutation was applied by hand, run against the suite and reverted.
`npx vitest run` on the tree checked in is green.

**What the table says, read honestly.** These mutations are blunt, and the
old suite caught six of the seven. The difference is in what it could not
express at all:
- a screen as rendered;
- a map crossing from one phone to another;
- an answer generated rather than chosen;
- a link followed to the screen it opens. The missed row is this one.

The three defects below are what that difference was worth. The old suite
could not have found any of them.

What each suite adds beyond its mutation:

- **`one-code-one-person`.** A property: two to four people on their own
  phones each keep a map, and restoring each code returns exactly that
  person's map, with no other person's name in the reply.
  - None of these ever opens a map: her couple code, her vouch token, her
    install id, a report receipt, or her once key.
  - A restore link fetched on a stranger's phone adopts nothing.
- **`non-negotiables-are-never-ignored`:**
  - Every dealbreaker option is either a gate that trips for some pair or the
    first thing she is told to ask.
  - The client gate and the server gate agree over 500 generated pairs.
  - A blocked pair is never eligible.
  - Profile shows every non-negotiable she chose.
  - A rendered sample introduction never shows a blocked candidate.
- **`private-sheets`.** Over generated pairs of sheets:
  - No reply from any route carries either raw side, or her owner key after
    the first reply. The routes are create, view, answer, both GETs, the
    founder tally and the export.
  - The op log shows `/safety` never reads a sheet.
- **`delete-means-deleted`.** One person uses everything: keep, vouch asked
  and given, the door with a contact, the eleven sent and answered, steps
  recorded, a report filed. Then Forget me.
  - `residue()` must find her code, name, contact, vouch sentence and answers
    nowhere but the tombstone.
  - Her phone must hold nothing.
  - The same again with the server down mid-forget, then back up.
- **`founder-routes-fail-closed`.** A discovery test counts every
  `isFounder` / `requireFounder` in `netlify/functions`. A gated route with
  no row fails, so a new readout cannot ship untested.
  - Every row is refused under seven near-miss credentials and an unset key,
    with nothing seeded appearing in the refusal.
  - Every row succeeds with the right key, so the table is not vacuous.
- **`links-open-the-right-thing`.** Every link the share buttons build is
  followed through the parser and into the rendered App. Each must land on
  its instrument, for the right reader: a man sent `/tools/is-she-serious` is
  asked about her.
  - A property over 1,000 mangled queries: a link never opens an instrument
    its own query does not name.
- **`both-sides`.** Over generated answers for each gender, none of the
  following refers to the other person with the reader's own pronouns:
  - the read, and its line for the guide;
  - Before you say yes, with every note, headline and script;
  - the couple reading;
  - the sample introduction's alignment, including every gate and ask;
  - every script on both sides.

  This generalises `mens-read`, which swept fixed answers, and keeps its
  allowlist ("her mother", "her side").

### 3. `tests/journeys/`: the app, driven by taps

The real `<App>`, happy-dom, the real client and the real handlers. A person's
steps, in order, each identified by what the button says:

| Journey | What it holds |
|---|---|
| `keep-and-restore` | Keep the map on one phone, type the code shown into Welcome on a new one: her map, word for word. A wrong code says which thing is wrong and adopts nothing. |
| `tool-link-read` | A man opens `/tools/is-she-serious`, taps through twelve questions about *her*, and gets the band the engine gives what he tapped. His phone keeps his answers, and keeps him as a man. Three generated walks. |
| `eleven-two-phones` | She answers and taps *Ask him*. He opens only the link her share sheet got. Both see the same joint, and neither sees the other's note on any topic where they differ. Each Home card opens where it says: *where you left it* opens her result, and *He answered* opens the joint, first. Two generated pairs. |
| `forget-offline` | Keep, open Trust from the profile, Forget me with the network down. Trust names what is still held and shows the code. The phone keeps only the pending codes, **even after the app's autosave has had a reason to run**. The next launch finishes it: nothing left but the tombstone. |
| `door` | Count me in: one woman in her city. She says she would travel, the join is sent twice, and she moves to Columbus. Each time she is moved, never added. |

Real-browser Playwright stays a manual pre-release check, because CI has no
pinned browser image, which is the same reason Visual is absent.

### 4. `tests/ui/screens.test.tsx`: every screen, audited as rendered

Twenty-six screens are reached the way a person reaches them, by a link or by
the taps from Welcome or Home. Each is identified by words only it has and
run through the `a11y.ts` audit. A negative control proves the audit finds
each thing it claims to.

The file also has rendered checks for what a generic audit cannot know:
- single-choice cards say which option is chosen;
- the restore field is told its own error;
- Somali lines are marked `lang="so"`.

### 5. `tests/failure-modes.test.ts`: failure, caused

This replaces the source-order checks in `fail.test.ts` by making each
failure happen:
- a body cut off mid-upload, against every route that takes one;
- a limiter whose store will not open, against every capped route;
- the vouch ask interrupted between its two writes;
- two family members' vouches landing together;
- two answers to the eleven landing together.

Each was checked by reintroducing its defect: the store opened outside the
try, an unguarded body read, the token written first, an unconditional
vouch write, an unconditional couple write. All went red.

Since 2026-09-24 `tests/ops.test.ts` holds the operations counts and
`/health` to the same standard (`docs/OPS.md`): each of the nine things the
founder is alarmed about is caused, and `/health` must say so on the cadence
it promises. Eight mutations were each shown to turn it red: a route that
stops counting its failures, a cap that stops counting refusals, a city in a
cap's signal, a signal outside the closed list, a report's code in the reply,
a sweep or a backup that stops marking itself, and a guide that stops counting
tokens.

Since 2026-09-24 `tests/monetization.test.tsx` holds what may be sold, to
whom and when (`docs/MONETIZATION.md`). Seven mutations were each shown to
turn it red: a paid line priced per month, the family scripts back inside the
paid call, "once per courtship" restored, the sponsor ask back on the
rendered Ending, the guide's Matchmaker voice pointing at a paid matchmaker,
the paid call renamed to the free stage's name, and `stripe` in
`package.json`.

### The guardrail: `tests/catalog.ts`

It maps every file to its categories, to its **kind** (behaviour, source or
mixed) and to the invariants it holds. `tests/catalog.test.ts` checks that:
- every test file is catalogued, and nothing catalogued is missing;
- every category is real;
- every category but Visual is present;
- every invariant has a suite in `tests/invariants/` and a second file
  behind it;
- the number of files that test **source text** is at most
  `SOURCE_FILES_AT_MOST` (10).

That number may only fall. Raising it is a decision made in a diff someone
reads.

**When to write which.**
- A pure function gets a unit test beside it.
- A route gets an integration test over `blobs`.
- Anything that crosses client and server, or two phones, goes through
  `serve()`.
- A rule stated over "any answer" is a property.
- A new screen is a row in `screens.test.tsx`; a new link kind, a row in the
  links table; a new founder readout, a row in the founder table, which fails
  until it has one.
- A source regex needs a reason no behaviour can reach what it checks.

## Findings

### Real defects the new tests found, fixed in this PR

1. **A restore undone by the app's own autosave.** RestoreMap adopts the
   fetched map into storage and then reloads the page.
   - Until the reload lands, the page still holds the map it started with,
     which on a new phone is an empty one. `useNiyyah`'s debounced autosave
     could write that back over the map she had just restored. She would be
     left with her code remembered and her map gone.
   - **Fix:** `holdUntilReload()` in `src/lib/storage.ts` stops the page
     saving once it has handed storage to a newer map.
   - Found by `journeys/keep-and-restore`. The journey goes red with the fix
     removed.
2. **A once key outliving Forget me.**
   - `maps:once/<id>` pointed at her code for up to a day after she forgot
     it, and after a change of code too.
   - **Fix:** the map now records its once key, and forget and move delete
     it (`docs/INTEGRITY.md`).
   - Found by the residue scan in `invariants/delete-means-deleted`.
3. **An intake with no `main`.**
   - The longest flow in the product had no main landmark on any of its
     questions, so "jump to main" landed nowhere.
   - The old regex test listed the files it knew about, and the intake was
     not one of them.
   - **Fix:** the question area is `<main>`.
   - Found by `ui/screens`.

### Found by the journeys, fixed after (2026-09-24)

- **Two Home cards landed one tap short of what they said.**
  - *He answered — Where the two of you stand* opened the front page of
    Before you say yes. She then had to tap *See where you left it*, and
    scroll past her own result, to reach the joint.
  - *Before you say yes — where you left it* also opened the front page.

  Now each opens where it says:
  - *He answered* opens her result with the joint at the top, and its
    headline is the screen's first heading.
  - *Where you left it* opens her result.

  How: `openBeforeYes('front' | 'result' | 'joint')` in `useNiyyah`, and
  `opensAt` on BeforeYes. It falls back to the front page if she has no saved
  result to open onto.

  Held by `journeys/eleven-two-phones`, which goes red when the card is wired
  back to the front page.

### Pruned: source regexes replaced by behaviour

Coverage was moved, not dropped. Each deleted test names the test that now
holds the line.

| Deleted from | Test | Replaced by |
|---|---|---|
| `a11y.test.ts` | Every previously mainless screen has `<main>` (by string) | `ui/screens`: one `main` on every rendered screen, which found the intake |
| `a11y.test.ts` | Identity's gender chooser has a group label (by id) | `ui/screens`: the chosen card sits in a named group; the audit names every group |
| `a11y.test.ts` | RestoreMap's field has an id-linked error and `aria-invalid` (by regex) | `ui/screens`: a bad code is typed, and the field is `aria-invalid`, described by a `role=status` that says what is wrong |
| `a11y.test.ts` | Somali spans are `lang="so"` at three sites (by regex) | `ui/screens`: the rendered Somali lines are inside `lang="so"`, and their English glosses are not |
| `a11y.test.ts` | Headings on Coach and Reflection (by string) | `ui/screens`: every rendered screen has a heading. The ShortMap and intake-insight rows stay; no rendered test reaches them yet |
| `a11y.test.ts` | Read, BeforeYes and Identity cards carry `role=radio` and `aria-checked` (by string) | `ui/screens`: on the rendered read, eleven and identity, every option is a radio with `aria-checked`, and choosing one sets it. ReportConcern and QuestionCard stay as source |
| `fail.test.ts` | The limiter opens its store inside the `try` (string offsets) | `failure-modes`: the limits store fails to open, and every capped route still answers in JSON |
| `fail.test.ts` | No `await req.text()` without a `try` in the 200 characters before it | `failure-modes`: a body cut off mid-upload is a 4xx on every route |
| `fail.test.ts` | The couple write is `onlyIfMatch` (regex count) | `failure-modes`: two answers land together, and exactly one gets 409 |
| `fail.test.ts` | The first vouch is `onlyIfNew`, and `asked/` comes before `token/` (string offsets) | `failure-modes`: the ask fails between its writes and leaves no token; two vouches land together and one gets 409 |
| `fail.test.ts` | The autosave stops after forget me (regex on the hook) | `journeys/forget-offline`: after a partial forget, a setting is changed, the autosave window passes, and her phone still holds nothing of hers |

`a11y.test.ts` went from 29 tests to 25 and `fail.test.ts` from 11 to 7.
What stays in them is what no request or rendered screen can reach:
- contrast computed from the palette;
- the reduced-motion helper;
- the crash screen;
- which helper every call goes through;
- the few components no rendered screen shows yet.

## How to run

```sh
npm test                                   # everything, ~22 s
npx vitest run tests/invariants            # the register
npx vitest run tests/journeys tests/ui     # the rendered app
npx vitest run tests/catalog.test.ts       # the map is true
npm run verify                             # typecheck, lint, the suite: what CI runs
```

A rendered test that cannot find a button fails with the names of every
control that *is* on screen, so a copy change reads as one.

## What this does not cover, and why

- **Pixels.** See Visual, above.
- **A real browser.** happy-dom has no layout, no focus ring, no service
  worker and no real navigation. A reload in these tests is a remount, via
  `reload()`, and that is exactly how the autosave defect above was found and
  proved. Playwright in Chromium remains the manual check before a release,
  as in `docs/PROCESS.md`.
- **Netlify Blobs' own consistency.** The double is strongly consistent. The
  platform's eventual consistency, where it applies, is named in
  `docs/INTEGRITY.md` and not simulated.
- **The live model.** The guide's words are graded offline on every PR, and
  live on demand with `npm run eval:guide` (`docs/GUIDE-EVAL.md`).
- **Screens a test cannot tap its way to yet:** the crash screen, the ending,
  the ended flow, ReportConcern and the intake's chapter insight. They keep
  their source checks until a journey reaches them.
