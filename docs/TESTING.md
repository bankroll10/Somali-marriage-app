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
| A forgotten step count cannot be made again | `progress-closure`, `delete-means-deleted` | Progress `DELETE` writes no marker and `POST` never looks for one, as on production before R2 | Red (30: 28 in `progress-closure`, 2 in `delete-means-deleted`) |
| A retired feature is not a lifetime | `sweep-function`, `integrity`, `recovery` | The sweep opens `contacts` again and deletes a key (2026-09-27) | Red (3 suites) |
| A name is kept at most 180 days | `sweep-function`, `journeys/looking` | The sweep skips every introduction whatever its day (2026-09-27) | Red (5: 4 in `sweep-function`, 1 in the journey) |
| Nothing identifying before two yeses | `voice`, `journeys/looking` | Looking says "nothing about you reaches anyone before you say yes" again (2026-09-27) | Red (3: both voice scans, and the journey) |
| The old marketplace stays in git | `no-marketplace` | — | Guards file names and identifiers; `deploy-layout` guards the function list |

One mutation that the register alone does not catch, on purpose: the forget
cascade in `netlify/functions/keep.ts` leaving the couple sheet. Her phone
deletes the sheet by its own code as well (`src/lib/forget.ts`), so
`delete-means-deleted` stays green. `keep-function` and `integrity` go red (3).

What each suite holds beyond its mutation:
- **`progress-closure`.** The server half of Forget me for step counts (`docs/DECISIONS.md`, release candidate R2), against the real `progress` and `sweep` handlers over the failing, racing blobs double. It holds: a DELETE writes the marker first, with a record and with none (absent-record deletion); the marker store is opened strong; a second same-day DELETE leaves the first key as it was; the cap; every failure path (marker write, record delete, the look before and after a report's write, the compensating delete, the sweep's record delete) answers truthfully and keeps the marker; a record stranded under a marker is resolved by a retry, a refused report or the sweep; racing writes, with a DELETE landing at each step of a report and the report's own checks failing; marker retention, meaning the earliest eligible removal and a young marker kept; and the two cleaners of expired step counts (the founder's readout and the weekly sweep) running while a DELETE lands, neither of which opens the marker store. A read that misses a record is `blobs.stale`. Interleavings assert the final protected state, not a status. Before R2 a progress DELETE wrote no marker and a late report could make the record again; any description of progress that says it writes no marker describes that earlier handler. These are tests against in-memory doubles, **not** a check of the deployed store. The Forget me block's one paragraph about the marker, and its place before the controls, is held by `tests/ui/forget-me.test.tsx`.

- **`one-code-one-person`.** Two to four people each keep a map, and each
  code restores exactly that person's map. Her couple code, install id, report
  receipt and once key open nothing. A restore link opened on a stranger's
  phone fetches without adopting.
- **`private-sheets`.** Over generated pairs, no reply from any route carries
  a raw side, or her owner key after the first reply. `/safety` never reads a
  sheet.
- **`delete-means-deleted`.** She keeps, sends the eleven and he answers, is
  counted on the ladder, reports a concern, and taps Forget me. Every store
  and her phone are searched. Only four things remain, each named: the
  tombstone, her report, the joint tally and the step count's closure marker
  (a day under her install code; no record). The same again with the server
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
| `looking` | Introductions, since new requests were closed (R3, 2026-10-13). A stranger is offered the tools and a closed state with the way to manage an earlier request, and nothing is sent to the introduction route by looking. A phone holding a code sees a receipt that states the closure and the 180-day rule and guarantees no day; it takes the request off on the server's documented confirmation only, keeps its code when that cannot be confirmed, and reports a code with nothing under it as nothing found. A code typed on another phone does the same, tolerates a pasted "QRTW XY34", and a code that is too short or too long is refused as typed (never cut down to a valid one) with no DELETE sent. After 180 days the phone stops offering the code and the sweep removes the record. The second door's three cards land on their instruments. Unit cover for every withdrawal classification is `src/lib/introduce.test.ts`; Trust's wording is `tests/ui/trust-earlier-request.test.tsx`; the refusal is `tests/introduce-function.test.ts`. The R3 amendment (2026-10-14) adds keyboard and announcement cover to the journey: the control that was pressed stays mounted, focused and focusable while a request is out and after its result; one activation, however many arrive, sends one request; results land in a status region mounted beforehand; focus moves to the closed screen's heading only when the receipt it sat in is removed, and not when she moved elsewhere while waiting. happy-dom has no keyboard or screen reader, so the same behaviour was checked in Chromium and no screen reader was run. |
| `prototype` (`tests/prototype/`) | The MATCH-01 prototype (`docs/MATCH-PROTOTYPE.md`), a development-only entry that is never built. `suggest`: eligibility in both directions, the limit of three, the three sample scenarios giving three, one and no suggestions on either side with nothing relaxed, the comparison, preferences compared with the answers the tester accepted (not their own answer), and fixed pair text available only while the answers equal its scenario, with its structured facts held against the comparison (metadata consistency, not proof that the prose is accurate). `flow`: the state machine by example and by random sequences of every action, including withdraw and undo (a pass undone only by `undoPass`, interest withdrawn only by `withdraw`, an ended or blocked conversation never reopened, the undo ended only by the explicit policy; a conversation only on mutual interest; no photo from mutual interest; per-conversation, per-direction photo flags; one person's action never changes another's; the shown people fixed and never refilled). `journey` (happy-dom): the brief in order, as a woman and as a man, the eight setup steps (answers that would work before how firm, entered answers kept going back and forward, Review's Change links, a "doesn't matter" point shown as not used), the three named groups on each step (about you, in a partner, how firm) with partner wording, the full firmness explanation at first use and the short definitions with a reopenable one after it (opening it chooses nothing), Review's three labelled lines, the suggestion screen's order and its concrete differences, withdrawing interest and undoing "Not for me" (including focus, and Undo surviving focus, scrolling, disclosures and the simulated person), the empty states, under spies that fail on any network, storage or cookie use, with two simultaneous conversations proving a photo shared with one is never shared with the other. `isolation`: the import closure (three shared modules and the stylesheet), nothing in it touches storage or the network, nothing outside refers to it, no build input. `copy`: the product's voice list, no score, percentage or feed, no moderation claim, fixed text only through the labelled component, every partner-side label worded as "a partner" with the option ids, order and first-person labels pinned, and each firmness defined once without steering. MATCH-04: the profile of someone with an open conversation (origin remembered, nothing about interest, the thread, photos or the other person's choices changed, refused for a blocked person or an ended conversation, left when one ends from it), a draft kept per person through a profile visit, the basis disclosure (closed, keyboard-native, structured-only statement, answers resolved from the data for the right person, quotations exact, general questions marked), and reference checks on every pair text, which show a cited answer exists and belongs to the right person, not that a question follows from it. |
| `match-eval` (`tests/prototype/match-eval.test.ts`, `tests/prototype/match-eval/`) | MATCH-05 Stage 0 (`docs/MATCH-EVAL.md`): the offline machinery for comparing rules only, rules plus verbatim answers, and AI-assisted observations. It calls no model and has only a fake provider. The 22 frozen synthetic cases (counts per category, all eligible both ways, four gate pairs never sent, no contact pattern, inputs apart from the expected-result notes, which only tests and scoring import), the input and output contract, the mechanical checks (schema, forbidden fields, references that are missing or blank, inexact quotations, quotations in the other person's answer, H2 language with quoted text exempt only when verified against the cited answer, soft flags that do not reject), 46 hand-written exemplars including reviewer-only failures that the checks pass on purpose, arms A and C (deterministic, one rules block, embedded instructions kept as literal data), the review export (viewer's asks and statuses beside both answers, no expectations, no arm names, framed quotations), the rubric's N/A rules, eligibility before any call, malformed replies not retried, and budget accounting (reserve before send, settle, hold on timeout or missing usage, refuse a plan that does not fit instead of reducing it, verified pricing). The reference checks show a cited answer exists and a quotation is exact; they cannot see a valid reference under a sentence about the wrong person. The correction pass (`tests/prototype/match-eval-corrections.test.ts`): `cases.ts` byte for byte, the version 1 expectations kept as an unedited baseline, every difference in version 2 recorded with old wording, new wording and reason (S14, S19), the additions labels defined over both people's answers with all 22 audited, exemplars that say what their sources say, question quality scored for arms A and C and added value weighed across statements, uncertainties and questions, one neutral fixed question per topic shared by A and C, and the ledger rejecting anything that is not a finite non-negative safe integer, keeping the full reservation on invalid usage, and ignoring unknown or settled reservation ids. It is not a live spending guarantee. |
| `match-eval-live` (`tests/prototype/match-eval-live-*.test.ts`, `tests/prototype/match-eval/live/`) | MATCH-05 Stage 1a (`docs/MATCH-EVAL.md`, "Stage 1a"): the code for a future live run of arm B, built and tested against fakes only (no network, no credential, no environment read, no token count, no model call, no spending). The exact generation and counting bodies and headers, serialized and compared byte for byte, with the counting body carrying only the fields that endpoint documents; a transport that is injected, guarded to exactly the two intended Anthropic endpoints for its scope, with no retries, no redirects and an enforced timeout, and whose errors never carry a header; separate count and paid-run approvals with three pending gates (model, prompt, spending), no circular dependence, and a count report that is immutable and consumed without recounting; an estimated per-request input allowance checked on every response apart from dollar cost, a first-call tripwire, and an output-ceiling check; size probes for the provisional ceiling, with what their counts can and cannot establish; a write-ahead hash-chained journal, raw responses saved before parsing (including bodies that are not JSON), exclusive creation, failed writes that stop the run and keep the charge, and crash recovery that refuses the next start until a person reconciles; and a review packet that keeps all 66 slots, never replaces an invalid sample 1, and keeps hostile reply text inside the quotation frame. A guard keeps the live folder a fixed list, away from the SDK, the network modules and the environment, and unreachable from the Stage 0 modules and tests. The conservative retention assumption and both official sources are carried in the approval. The correction pass (`match-eval-live-fixes-*`): the review packet frames every model-authored and provider-derived value (accepted multiline JSON, rejected replies, stop reasons, headers, block types, transport errors) without changing any verdict; a count run id is durably single-use through a flushed start record written before the credential is requested, with partial runs visibly incomplete and simultaneous starts losing; reconciliation of unmatched reservations and held charges appends and never mutates, refuses unknown and repeated calls, and keeps pending apart from reconciled; an injectable dispatcher whose credential getter asks for one named variable only after approval validation and a durable start, with separate count and paid scopes and a scrubbed key; the paid approval's binding of the expectations file, rubric and preregistered analysis, kept out of every request; and a self-contained fake evidence packet whose every reference resolves and verifies. Nothing here is approved or run. |
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
