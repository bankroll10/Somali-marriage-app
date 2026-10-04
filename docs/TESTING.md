# The test suite

What the suite protects, and how. Its measure is what it protects. The number
of tests is not the measure.

The first audit of the suite was on 2026-09-24. It is in git history
(`git show 43295a4:docs/TESTING.md`), with the nine categories, the catalogue and
the findings of that pass. This file is the suite as it stands after the
subtraction of the same day. The door, pool, vouch, sample introduction and
matching went, and so did their tests. The catalogue went because it cost
every new test a bookkeeping row and guarded nothing a reviewer does not.

## The shape

| Layer | Where | What it is for |
|---|---|---|
| Units | beside the code, `src/**/*.test.ts` | A pure function: the read, the eleven, the couple reading, follow-ups, storage, keep |
| Functions | `tests/*-function.test.ts` | One real handler over an in-memory Blobs |
| Invariants | `tests/invariants/` | The seven things this product cannot get wrong, one suite each |
| Journeys | `tests/journeys/` | The real `<App>`, driven by taps, over the real client and handlers |
| Screens | `tests/ui/screens.test.tsx` | Every screen a person can reach, reached the way a person reaches them, audited as rendered |
| First screen and chooser | `tests/ui/welcome.test.tsx`, `tests/ui/focus.test.tsx` | Welcome's headline, doors, scoped privacy paragraph and Talking's descriptions (tied to the scripts that exist); focus reaches a lazy screen's heading when it appears, and a heading draws no ring |
| The receipt's reminder | `tests/ui/looking-receipt-reminder.test.tsx` | The receipt says the pilot's policy and nothing about where a request is from: identical whatever the profile becomes (both directions), on a fresh load, and on legacy, past-date and unkept receipts |
| Failure | `tests/failure-modes.test.ts`, `tests/ops.test.ts` | Failures caused on purpose: a cut-off body, a store that will not open, two writes at once |
| Guards | the rest of `tests/` | What no request or rendered screen can reach: a CSS rule, a build setting, a word the product never says |

## `tests/support/`: one of each thing

| Helper | What it gives a test |
|---|---|
| `blobs.ts` | An in-memory Netlify Blobs with real etags, `onlyIfNew` and `onlyIfMatch`, and ways to break it: `failOn` makes a chosen call throw (with an error of the test's choosing, so a named SDK error can be staged), `before` runs a competing request at an exact point (the nth matching call, if asked), `failOpen` makes a store fail to open. Its op log lets a test assert what a route *read* and in what order it *deleted*; `opened` records the options each store was opened with, so a test can hold that a route asked for strong reads. It is a double: `tests/blobs-consistency.test.ts` runs the installed SDK against its own local server for the two facts a double cannot prove. |
| `memory.ts` | The plain double: each store a Map of key to the raw string, for the function tests that seed and read values directly. Nine files each had their own copy until 2026-09-24. |
| `server.ts` | Netlify in a box. `serve()` puts the real handlers behind the global `fetch`; `down()` takes the network away; `lose()` runs the handler and loses the answer — a timeout after the write landed; `hold()` keeps a request in flight until released; `call()` makes one request. |
| `device.ts` | A phone: its own `localStorage`, `onPhone(p)` to switch phones, `refuse(keys)` to make it a browser that is not saving those keys, `reload()`, and `shareSheet()` to see what a share button handed over. |
| `arbitrary.ts` | fast-check inputs built from the product's own lists, so a new option is generated the day it ships. |
| `residue.ts` | Every store and every phone, searched for anything of hers. |
| `a11y.ts` | An audit of rendered markup: names, labels, resolving ARIA references, unique ids, one `main`, a heading. |
| `render.tsx` | `mount()` under happy-dom, with `press(name)`, `type(label, value)`, `settle()` and `until(check)`. |

`tests/couple-function.test.ts` keeps its own double on purpose. It needs two
seams, lost races and a tally that is down, that neither shared double has.

Rendered tests start with `// @vitest-environment happy-dom`.

## The register

One suite per invariant, named for it, each run through Netlify in a box.
Every mutation in the table was applied by hand, run, and reverted. The ones
dated 2026-09-24 were re-run after the subtraction, to show that deleting
their neighbours had not hollowed them out.

| Invariant | Suite | Mutation | Result |
|---|---|---|---|
| One code never opens another person's map | `one-code-one-person` | Restore reads another code's map | Red (2 of 4) |
| One side never sees the other's sheet | `private-sheets` | The couple view carries her side | Red |
| Delete means deleted | `delete-means-deleted` | Forget me leaves the kept map (2026-09-24) | Red (3) |
| Founder routes fail closed | `founder-routes-fail-closed` | Progress GET loses its gate (2026-09-24) | Red (9) |
| | | The reports queue loses its gate (2026-09-24) | Red (8) |
| Links open the right instrument | `links-open-the-right-thing` | `read` links open the eleven | Red (5) |
| Both sides stay semantically correct | `both-sides` | `speak()` gives a man the woman's voice | Red (5) |
| The loop closes | `the-loop-closes` | A man's read follow-up takes her script (2026-09-24) | Red (1) |
| Relationship judgment | `tests/judgment/` | Careful no longer caps the read at mixed (2026-09-26) | Red (2) |
| | | The money caution waits until after the early band (2026-09-26) | Red (2) |
| | | Strong no longer needs being known (2026-09-26) | Green at first: sampling rarely reached it. An enumeration was added; Red (1) |
| | | A worked-out difference ranks with an open one (settled 0.9) (2026-09-26) | Red (4) |
| | | "I don't know my own answer" gets the topic's question for him (2026-09-26) | Red (2) |
| | | The Guide's line reply removed (2026-09-26) | Red (1) |
| | | "not allowed to refuse him" removed from the force words (2026-09-26) | Red (1) |
| | | A held-out phrase added to a crisis word list (2026-09-26) | Red (2): the guard, and the gap ledger |
| Delete means deleted | `delete-means-deleted` | Forget me leaves her name on the introduction list (2026-09-27) | Red |
| Forget me confirms an introduction deletion only by the protocol's answer | `forget-introduction`, `forget-bound`, `forget`, `ui/forget-introduction` | The introduction delete goes back through `del()`, any 2xx or 404 (2026-10-02) | Red (27 across the targeted files) |
| | | Every introduction answer counts as confirmed | Red (34) |
| | | One confirmed code clears every introduction code | Red (2) |
| | | The same code is sent twice | Red (1) |
| | | A retry writes back the record it started with (G2) | Red (3) |
| | | Forget me replaces an earlier forget's introduction code (G4) | Red (5) |
| | | Clearing the phone clears the page's copy of the codes | Survived the first set; a second unconfirmed tap without storage added, then Red (2) |
| | | No deadline over the confirmation; timer never cleared; request not aborted; a late answer read | Red (8; 1; 1; 8) |
| | | The earlier build's `intro` / `introPending` not read; the page copy not read | Red (5; 4) |
| | | `intro` always true; `introHeld` omitted; the kept flag always true; the introduction named in "could not reach" | Red (21; 19; 3; 2) |
| | | `withdrawInterest` clears whatever the answer | Red (90) |
| Forget me confirms the map, the step count and the eleven only by their handlers' answers | `forget-confirmation`, `forget-pending-compat`, `forget-recovery-store`, `forget-ordering`, `forget-bound`, `forget`, `ui/forget-introduction` | Any 2xx counts as removed | Red (49) |
| | | Any 404 counts as nothing; a 404 without its body; a 202 accepted | Red (9; 6; 3) |
| | | The eleven read by keep's field | Red (15) |
| | | The body read outside the deadline; timer never cleared; no abort; the reader called for a late response | Red (8; 3; 2; 1) |
| | | Forget me replaces an earlier code (D2); a retry writes back its starting record | Red (19; 9) |
| | | No page copy when storage refuses; the wipe clears it | Red (9; 5) |
| | | Confirmed codes not remembered (an older failed completion puts one back) | Red (3) |
| | | Stored values cleaned into codes instead of validated | Red (169) |
| | | The first code not in the slot an older build reads; the overflow not read | Red (32; 4) |
| | | The step id offered by hand; `kept` always true; no per-kind dedupe; introduction confirmation not through `sendRead` | Red (3; 7; 3; 8) |
| | | A guard in `sendRead` after the reader returns | Survived: equivalent (the race has already settled); removed |
| A retired feature is not a lifetime | `sweep-function`, `integrity`, `recovery` | The sweep opens `contacts` again and deletes a key (2026-09-27) | Red (3 suites) |
| A name is kept at most 180 days | `sweep-function`, `journeys/looking` | The sweep skips every introduction whatever its day (2026-09-27) | Red (5: 4 in `sweep-function`, 1 in the journey) |
| Nothing identifying before two yeses | `voice`, `journeys/looking` | Looking says "nothing about you reaches anyone before you say yes" again (2026-09-27) | Red (3: both voice scans, and the journey) |
| The old marketplace stays in git | `no-marketplace` | — | Guards file names and identifiers; `deploy-layout` guards the function list |
| One record per retained code | `introduce-function`, `introduce-race`, `journeys/looking` | A retry under the same code mints a new one (2026-09-27) | Red (5) |
| A late request never lands after a withdrawal | `introduce-race`, `journeys/looking` | The POST skips its second look at the marker (2026-09-27) | Red (3) |
| One removal day for phone, list and sweep | `sweep-function`, `vocab-sync`, `introduce-function` | The sweep looks a week ahead again (2026-09-27) | Red (4) |
| The affirmation is required on the wire | `introduce-function`, `caps-function`, `journeys/looking` | `adult` accepted when absent (2026-09-27) | Red (3) |
| The withdrawal marker is the authority | `introduce-residue`, `introduce-function` | The founder's `GET` shows a record under a marker again; the sweep removes a marker before the record under it (2026-09-27) | Red (5) |
| Cleaning an old marker cannot undo a fresh withdrawal | `introduce-residue`, `introduce-race` | Markers back to one rewritten key per code, removed by read-then-delete (2026-09-27, the review's interleaving: a withdrawal immediately before the sweep's delete) | Red (2) |
| A receipt the browser refuses is still the page's | `lib/introduce`, `journeys/looking` | `rememberIntro` drops the receipt on a `setItem` throw, so Forget me finds no code (2026-09-27) | Red (3) |
| No workflow writes to production | `deploy-layout`, `ops` | A `-X DELETE` returns to `deployed.yml`; `/health` writes or deletes on the introduction list (2026-09-27) | Red (1 each) |
| The SDK refuses strong reads by name without an uncached URL | `blobs-consistency` | — | Runs the installed `@netlify/blobs` against its own `BlobsServer`; not a double |

One mutation that the register alone does not catch, on purpose: the forget
cascade in `netlify/functions/keep.ts` leaving the couple sheet. Her phone
deletes the sheet by its own code as well (`src/lib/forget.ts`), so
`delete-means-deleted` stays green. `keep-function` and `integrity` go red (3).

What each suite holds beyond its mutation:

- **`one-code-one-person`.** Two to four people each keep a map, and each
  code restores exactly that person's map. Her couple code, install id, report
  receipt and once key open nothing. A restore link opened on a stranger's
  phone fetches without adopting.
- **`private-sheets`.** Over generated pairs, no reply from any route carries
  a raw side, or her owner key after the first reply. `/safety` never reads a
  sheet.
- **`delete-means-deleted`.** She keeps, sends the eleven and he answers, is
  counted on the ladder, reports a concern, and taps Forget me. Every store
  and her phone are searched. Only three things remain, each named: the
  tombstone, her report and the joint tally. The same again with the server
  down mid-forget.
- **`forget-introduction`.** Forget me's introduction deletes, against the
  real handler over the in-memory store with only the DELETE's answer
  replaced: an answer that was cut after the real deletion, and an invalid
  success-looking answer with the handler never run, for a saved receipt and
  for a pending-only attempt. The local things are gone, only the codes are
  kept, a later valid answer resolves it with one marker. Two codes are
  confirmed independently; one code under both names is sent once; an earlier
  forget's code is not replaced by the next (G4); a browser that cannot save
  keeps the codes in the page, through a second unconfirmed tap, and loses
  them on a reload. `src/lib/forget.test.ts` holds the same by stub, with the
  retry that must not overwrite (G2); `src/lib/forget-bound.test.ts` the
  deadline, a body that never ends, a late answer and the two-round total;
  `tests/ui/forget-introduction.test.tsx` the message, the page-replacement
  condition and the launch retry.
- **`forget-confirmation`.** The same, for the map, the step count and the eleven, one `describe.each`
  over the three: both situations, a mixed result, A-then-B (each kind keeps both), overlapping retry and
  foreground operations (an older completion neither removes what it did not confirm nor re-adds what a
  newer one did), a browser that cannot save (page copy, second tap, "Start completely fresh", reload) and a
  reload. The classifier's answers are one table in `src/lib/forget.test.ts`.
- **`forget-pending-compat`.** **Hybrid tests** (docs/DECISIONS.md Part 35). The two builds before this one
  (`261d055` and `69f8b92`) have their `src/lib/forget.ts` vendored verbatim in
  `tests/support/old-builds/` (only the import specifiers changed; a hash guard holds the text) and run over
  *today's* helper modules. They prove what the old `forget.ts` reads, writes, removes and spreads on
  storage and its own permissive confirmation; they do **not** prove anything through the old
  introduction module or the old screens, which only the real old bundles do (the browser check, not part
  of `npm test`). They show the recovery keys unchanged through a failed forget, a falsely confirmed retry,
  the old wipe and a rewrite, and assert as limitations what an older build loses before this build has
  captured it.
- **`forget-ordering`.** An older request that succeeds late against a newer one for the same code that is
  unresolved, with the real progress and keep handlers over the in-memory store (progress writes no marker, so
  a report can recreate the record; keep's tombstone answers 410): both response orders, a newer launch
  retry, a newer confirmation resolving older failures in both orders, storage-denied page memory, and, as a
  stated limitation, a second tab whose sequence numbers are separate.
- **`forget-recovery-store`.** The store on the new build alone: an older tab rewriting the record during
  an import, the `storage` event (old and new value, a clear, another key), the older key left after a
  confirmed deletion (zero repeat requests on the same page; one per launch after a reload), a confirmed
  code followed by a genuinely new failed attempt (kept) against an old mention (not asked again), two tabs
  over one storage, a scan shaken by another tab and a scan that never settles or is refused (unknown, not
  empty), `kept` over every unresolved code, and an older key never converted, rewritten or removed.
- **`founder-routes-fail-closed`.** Every founder check in
  `netlify/functions` must have a row. Each row is refused under seven
  near-miss credentials and an unset key, and answers with the right key.
- **`links-open-the-right-thing`.** Every link the share buttons build is
  followed into the rendered App, and 1,000 mangled queries never open an
  instrument their query does not name.
- **`both-sides`.** Generated answers for each gender through the read, the
  eleven, the couple reading and every script. The fixed answer sets that
  reach every band of the read live in `src/lib/read.test.ts`.
- **`the-loop-closes`.** Words, then "did you say them?" days later, on the
  right side, for both phones of a pair, and Forget me on the Ending.
- **Relationship judgment** (`tests/judgment/`, `docs/GUIDE-EVAL.md`).
  Properties, not answers, over the Read, the Eleven, every script and the
  Guide: personas and fast-check properties for the engines; calibrated
  detectors for the words; held-out messages, transforms and counterfactual
  pairs for the Guide; a content lock. Its own seeded regressions are
  `mutations.test.ts`, which runs every time.

## The journeys

| Journey | What it holds |
|---|---|
| `keep-and-restore` | Keep on one phone, type the code into a new one: her map, word for word. A wrong code says what is wrong and adopts nothing. |
| `tool-link-read` | A man opens `/tools/is-she-serious`, answers about her, and gets the band his answers earn. Back from "Now the other half of it" offers "Enter Niyyah", never a fresh start over his read. |
| `eleven-two-phones` | She sends the eleven; he opens only the link her share sheet got. Both see the joint; neither sees the other's note. *He answered* opens the joint. |
| `forget-offline` | Forget me with the network down. The phone keeps only the pending codes, even after the autosave has had a reason to run, and the next launch finishes it. |
| `netlify-down` | Every function unreachable from the first tap. A stranger still takes a whole read; a member opens her space and a failed keep loses nothing. |
| `looking` | The two doors. Through the first, the disclosures come before the button in order (the operator, the pilot's rule, the conversation first, the approved description and the release rule, the scheduled removal); she is handed a receipt only once the server has it, with the named fields and the affirmation under the code her phone minted, and nothing else about her anywhere. An answer lost after the write: she is told it is unsure, the same request goes again under the same code, and it is saved once. Changed her mind after that: the earlier record is never written over, and she chooses. A browser that cannot hold the code: she is shown it, and it takes the name off from any phone. Two tabs on one phone: one record. A request still in flight when she taps Forget me, or takes the name off by its code: it cannot land afterwards. A receipt from before the server gave dates is the phone's own record; past the scheduled day the code is kept and the truth said, and the sweep removes the record. Home shows the receipt. The bar holds `/?looking`. Through the second, each of the three cards lands on its instrument. |
| `runbook` (`tests/runbook.test.ts`) | The introduction pilot runbook in `docs/OPS.md` still says each thing decision 33 requires before introduction 1, and the eligibility, log, consent, 180-day, milestone, legal and drill rules. The drill itself is the founder's |

## Guards: what stays as source text, and why

A source check passes on a broken screen if the attribute sits on a branch
that never renders, and fails on a correct refactor. So one stays only when no
behaviour can reach what it checks:

- `voice` — the words the product has stopped saying, the claims it has not
  earned, and the promises the code cannot keep, scanned across every
  component, data file and library file, comments skipped. `voice-rules.ts`
  is shared with the guide's tone grader.
- `mobile`, `a11y` — safe-area fallbacks, the 16px field floor, the viewport,
  contrast computed from the real palette, reduced motion.
- `fail` — every server call goes through `send()`; the crash screen clears
  everything; a network blip on the eleven is not called a broken link.
- `restore-link` — the `?map=` flow in `src/main.tsx` runs before React
  mounts. The confirm screen's warning is checked by rendering it.
- `forget-keys` — every `niyyah.*` key in `src/` is one Forget me clears.
- `performance`, `durable`, `deploy-layout`, `brand`, `tools`, `guides`,
  `sheet`, `sheet-so`, `somali-gate`, `service-worker` — build wiring and
  static files.

Pruned on 2026-09-24, with where the line went:

| Deleted | Why | Now held by |
|---|---|---|
| `catalog.ts`, `catalog.test.ts` | A bookkeeping row for every file; its source-file cap was met by labelling files "mixed" | The register above |
| `promises.test.ts` | A second copy of the voice scanner | `voice.test.ts` (`PROMISES`) |
| `brand.test.ts`'s "powered by AI" scan | The same scanner again | `voice.test.ts` |
| `mens-read.test.ts` | Its pronoun sweeps are what `both-sides` generalised | `src/lib/read.test.ts` and `beforeYes.test.ts`, which keep its fixed bands, his questions, his family scripts and the second wife |
| `fogg.test.ts`'s draft checks | Drafts live under their own key; the kept snapshot never reads it | `forget-keys.test.ts` keeps the key scan |
| Four of `restore-link`'s six source pins | `keep.test.ts` already proves a fetch adopts nothing | Two tests, one rendered |
| The exact print millimetres in `sheet.test.ts` | Set by rendering; a number read back out of CSS proves nothing about the page | The structural print rules stay |
| Doc-row pins in `sheet`, `sheet-so`, `guides`, `somali-gate` | They tested a document's wording | `guides.test.ts` keeps one check that every tool has a live URL in `docs/ASSETS.md` |
| `wayout`, `load`, `gate-sync`, `alignment-audit`, the door, pool, cohort, vouch, matching and ledger tests | Their subject was deleted, or they counted occurrences of a prop | — |

## When to write which

- A pure function gets a unit test beside it.
- A route gets a function test over `memory` or `blobs`.
- Anything that crosses client and server, or two phones, goes through
  `serve()`.
- A rule stated over "any answer" is a property.
- A new screen is a row in `screens.test.tsx`; a new link kind, a row in the
  links table; a new founder readout, a row in the founder table, which fails
  until it has one.
- A source regex needs a reason no behaviour can reach what it checks.

## How to run

```sh
npm test                                   # everything
npx vitest run tests/invariants            # the register
npx vitest run tests/journeys tests/ui     # the rendered app
npm run verify                             # typecheck, lint, the suite: what CI runs
```

A rendered test that cannot find a button fails with the names of every
control that *is* on screen, so a copy change reads as one.

## What this does not cover, and why

- **Pixels.** Snapshots need a pinned browser and font stack in CI, which this
  repository does not have. The stand-ins are the style guards, the contrast
  arithmetic and a Chromium walk before release.
- **A real browser.** happy-dom has no layout, focus ring, service worker or
  real navigation. Playwright in Chromium is the manual check before a
  release.
- **Netlify Blobs' own consistency.** The doubles are strongly consistent.
  The platform's eventual consistency is named in `docs/PRIVACY.md`.
- **The live model.** The guide is graded offline on every PR, and live on
  demand with `npm run eval:guide` and `npm run eval:judgment`, or in
  `guide-eval.yml` when a PR touches what a suite measures. A live run ends
  in one of four written outcomes, and only `evaluated-pass` is a pass; the
  harness, the session and the outcome logic are themselves tested here
  with stand-in clients and no key (`docs/GUIDE-EVAL.md`, "Outcomes").
- **Screens no test taps its way to:** the ended flow, ReportConcern and the
  intake's chapter insight.
