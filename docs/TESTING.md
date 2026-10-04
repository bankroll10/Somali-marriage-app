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
| Failure | `tests/failure-modes.test.ts`, `tests/ops.test.ts` | Failures caused on purpose: a cut-off body, a store that will not open, two writes at once |
| Guards | the rest of `tests/` | What no request or rendered screen can reach: a CSS rule, a build setting, a word the product never says |

## `tests/support/`: one of each thing

| Helper | What it gives a test |
|---|---|
| `blobs.ts` | An in-memory Netlify Blobs with real etags, `onlyIfNew` and `onlyIfMatch`, and ways to break it: `failOn` makes a chosen call throw, `before` runs a competing request at an exact point, `failOpen` makes a store fail to open. Its op log lets a test assert what a route *read*. |
| `memory.ts` | The plain double: each store a Map of key to the raw string, for the function tests that seed and read values directly. Nine files each had their own copy until 2026-09-24. |
| `server.ts` | Netlify in a box. `serve()` puts the real handlers behind the global `fetch`; `down()` takes the network away; `call()` makes one request. |
| `device.ts` | A phone: its own `localStorage`, `onPhone(p)` to switch phones, `reload()`, and `shareSheet()` to see what a share button handed over. |
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
| A retired feature is not a lifetime | `sweep-function`, `integrity`, `recovery` | The sweep opens `contacts` again and deletes a key (2026-09-27) | Red (3 suites) |
| A name is kept at most 180 days | `sweep-function`, `journeys/looking` | The sweep skips every introduction whatever its day (2026-09-27) | Red (5: 4 in `sweep-function`, 1 in the journey) |
| Nothing identifying before two yeses | `voice`, `journeys/looking` | Looking says "nothing about you reaches anyone before you say yes" again (2026-09-27) | Red (3: both voice scans, and the journey) |
| The old marketplace stays in git | `no-marketplace` | — | Guards file names and identifiers; `deploy-layout` guards the function list |

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
| `looking` | The two doors. Through the first, her name goes down only once the server has it, with the six fields and nothing else about her anywhere — the POST body is those fields, and no store or phone key but its own holds the code; with the server gone she is told so and her words stay; she takes it off again; Home shows it. The screen says the founder speaks with her first, that a summary may come before anything identifying, and the day her name comes off; from Columbus or the UK it says the name is kept for later, with no date. After 180 days the phone forgets the code and the sweep removes the name. Through the second, each of the three cards lands on its instrument. |
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
  demand with `npm run eval:guide` and `npm run eval:judgment`
  (`docs/GUIDE-EVAL.md`).
- **Screens no test taps its way to:** the ended flow, ReportConcern and the
  intake's chapter insight.
