# Session handoff — BATCH-01 complete on the branch, release paused; BATCH-02 done; BATCH-03 repairs 1–3 done; BATCH-04 done; BATCH-05 done; BATCH-06 done; BATCH-07A done; BATCH-07B done; BATCH-07C done; BATCH-07D done (Forget me's introduction deletes repaired); BATCH-07E done (the map, the step count and the eleven too); BATCH-07F done (deletion recovery protected from older app versions); the first-screen release (R1, PR #84) is LIVE on production and merged into this branch

## Status as of the latest session (2026-10-04, release R1 live; main integrated into this branch)

- **LIVE on joinniyyah.com: release candidate R1, PR #84, merge commit `b53429e`** (`docs/DECISIONS.md`,
  "Release candidate R1"). It is the smallest extract of BATCH-02A plus one BATCH-04 line, 13 files:
  Welcome's headline, scoping sentence, named door actions and the scoped privacy paragraph (with the
  step-count qualification), the Talking chooser's plain descriptions (including the accurate family-script
  invitation), the larger restore-entry target, and the focus fixes (no ring on a focused heading; focus
  reaches a lazy screen's heading when it appears). `verify` and `deployed` passed on `main`;
  `/version.json` named `b53429e` (the previous serving commit was `cdcd187`); preview and production were
  checked at 390 and 320 wide with backend requests intercepted and nothing submitted. `guide-eval` was not
  triggered and no paid call was made. **Not live:** everything else on this branch.
- **Integration (this session):** `main` (`b53429e`) was merged into `claude/hello-gr0hoz` (`a2b71fc`) by a
  normal merge (no rebase, reset or force). Five conflicts, resolved by keeping both: `Welcome.tsx` (the
  released step-count sentence), `useFocusHeading.ts` (the branch's `onlyIfLost` version: the released
  arrival fix plus the option `FocusStep` and `Looking` use; `App.tsx` calls it unchanged),
  `welcome.test.tsx` (the released file is a strict superset; both sets of tests kept), `DECISIONS.md` and
  `PRODUCT.md` (both histories kept; Part 25 and the R1 entry now say they describe the same shipped work,
  and what was held is listed). No product change was made. The outreach ledger, workflows and evaluation
  rules are not in the merge.
- **What is still held (not released):** BATCH-01 and 02C (the introduction path and its signup), 02B (the
  social card), 03 to 07F, the evaluation harness, and every server change.
- **Release blockers that remain, unchanged:** (1) the **cross-tab progress recovery loss** (Part 35,
  "Ordering check": sequence numbers are per page, so another tab's older success can remove the key this
  tab's newer failure wrote; progress writes no marker, so the record can exist again) is demonstrated and
  **not fixed**; (2) **receipt-location finding B** is undecided; (3) the accumulated branch **requires both
  live evaluations** (workflow, `package.json` and `tests/eval/*` are in its range) and both are unfunded
  and **have not run**: a skipped or missing evaluation is not a pass; (4) the older-build residue and
  loss-before-capture limits (Part 35); (5) the server-side races in Part 34. **The branch is not
  release-ready and the release remains paused.** No PR, merge to main, deployment, outreach or
  participant-data access happened in this integration.
- **Next:** receipt-location finding B (a founder decision), then the cross-tab recovery question.

## Previous status (2026-10-04, BATCH-07F)

- **BATCH-07F (`docs/DECISIONS.md` Part 35): deletion recovery is protected from older app versions.** One
  key per unresolved code, `niyyah.forget.recovery.v1.<kind>.<CODE>` = `1`; the older single record
  `niyyah.forget.pending.v1` is **read-only** to this build (never written, rewritten or removed). The
  07E "open release constraint" is closed for codes this build has captured; **not** for codes an older
  build lost before capture (single-slot overwrite, a base build erasing an `intros`-only record).
- **Repeated legacy retries are accepted and documented:** the older record stays after its codes are
  confirmed, and a code it still names can be imported and asked again at a later launch, for as long as it
  stays (a repeat request, not a loss). Not claimed: exactly one request across tabs or interleavings.
- **One visible wording correction:** "This phone keeps only what it needs to finish" became "This phone
  keeps only codes" (the old sentence could be false with preserved older content on the phone). New
  sentence only when the phone cannot list its storage: "We could not check whether anything from an
  earlier attempt is still waiting on this phone."; the page is not replaced then.
- **Ordering check (same day):** `settle()` removed a code's key whatever newer requests were unresolved. For
  the progress endpoint (no marker; a report in flight recreates the record) that lost a recovery that
  mattered, reproduced with the real handlers. Corrected in `settle()` only (`askedAt`): an older success does
  not settle a code a newer request has not confirmed; a newer confirmation still resolves older failures, in
  either order, and with storage denied. Other kinds pay one redundant request. Two G2 expectations were
  updated on purpose. **Cross-tab: not solved** (per-page sequences); a limitation test records it.
- **Evidence:** hybrid tests (old `forget.ts` over current helpers) for `261d055` and `69f8b92`; mutations;
  and the **real old bundles** in a browser (below, `docs/DECISIONS.md` Part 35).
- **Verification:** `npm run verify > log 2>&1; echo $?` exit 0 (126 files, 1942 passed, 2 skipped; after the ordering correction 127 files, 1951 passed, 2 skipped);
  `npm run build` exit 0; classifier on the slice's 24 files: guide **not required**, judgment **not
  required** (the accumulated branch still requires both); `GUIDE_EVAL_LIVE`, `JUDGMENT_LIVE` unset, no API
  key. **Real old bundles in a browser** (`261d055`, `69f8b92`, 390 and 320 wide): recovery keys unchanged
  through the old build's false confirmation and "Start completely fresh"; the control with the `05d50aa`
  build lost the codes and the server kept the data. Introduction paths are hybrid-test evidence only.
- **Still open:** loss before capture; the older record remains as residue; storage events reach only open
  pages; browser-level clearing; receipt-location finding B is the next, separate item. **The branch is
  not release-ready and the release remains paused.**

## Previous status (2026-10-02, BATCH-07E)

- **BATCH-07E (`docs/DECISIONS.md` Part 34): Forget me confirms the map, the step count and the eleven only
  by an answer their handlers give.** keep and progress `200 {forgotten: true}`, couple `200 {ok: true}`, and
  for all three `404 {error: 'not_found'}`; everything else is *unconfirmed* and the code is kept. The three
  DELETE sources are byte-identical between `261d055` and HEAD; that is repository equivalence, **not** a
  statement about what is deployed (no function was called; `health.ts`, `introduce.ts` and `sweep.ts` do
  differ from `261d055`).
- **Reproduced on `69f8b92` first** (scratch, real handlers over the in-memory store, deleted): D1 15 of 15
  (every success-looking answer with the handler not run was confirmed, the page would be replaced, the record
  stayed); D2 3 of 3 (a second unresolved forget replaced the first's code for the map, the step id and the
  couple code); D3 3 of 3 (refused storage lost the code and the next tap sent nothing). No prediction was
  dropped. The built-app control (the previous build, same harness): 18 of 18 failed.
- **One primitive:** `sendRead` (`src/lib/net.ts`): one deadline over the response and the body, abort,
  settle at the deadline, never read a response that arrives after it, timer cleared. All four deletes use it;
  `confirmWithdrawal` is `sendRead` with its own reader; `send()` untouched; `tests/fail.test.ts` is
  tighter (the `introduce.ts` raw-`fetch` exception is gone).
- **Four lists** (`maps`, `installs`, `pairs`, `intros`): a Forget me adds, a retry removes only what it
  confirmed, an older failed completion does not re-add what a newer one confirmed (a page-memory ledger).
  **Page-memory recovery for all four kinds** when storage refuses. **Stored codes are validated, not
  cleaned** (`isStoredCode`): `isCode` still cleans typed input.
- **On disk:** same key; a kind's first code in the old slot, a second and later in `moreCodes` / `moreIds`
  / `morePairs`; one code of each kind is byte-identical to 07D's file.
- **Copy:** "We could not confirm that … was deleted. It may have been, or it may not."; no "still held", no
  "that is us, not you"; no email hand-off and no visible install id or couple code when only those remain.
- **OPEN RELEASE CONSTRAINT, needs a founder decision before merge** (*updated 2026-10-04: addressed by BATCH-07F, `docs/DECISIONS.md` Part 35, for codes this build has captured; see the latest status*): an older build (07D or earlier: an old
  tab left open, a cached shell, a rollback) overwrites fields it does not know **even when its deletion
  fails**, so a record with two or more unresolved codes of one kind loses them. Demonstrated with 07D's
  reader/writer as a fixture (`forget-pending-compat`). Options: (a) accept and release 07D+07E together, no
  rollback planned; (b) put the overflow in a second key older builds never rewrite; (c) wait for old tabs.
  Not chosen here. The network-first service worker is no evidence older clients cannot run.
- **Evidence:** 2 new invariant files and a fixture; `forget.test.ts` 19 → 100, `forget-bound.test.ts` 9 →
  17, the UI file 14 → 20; 124 of 177 targeted tests fail against `69f8b92`'s sources. **23 mutations, 22
  failed a test, one survived and is equivalent** (removed). **Built app** (headless Chromium, 390 and 320
  wide, the real handlers over an in-memory store, faults on the wire): 18 of 18 passed, no overflow, codes in
  full, only the pending record on the phone; local-handler evidence, not the deployed functions. Focus
  after the failed tap is on `BODY`; **no screen reader was used**.
- **Verification:** `npm run verify > log 2>&1; echo $?` exit 0 (125 files, 1908 passed, 2 skipped);
  `npm run build` exit 0; `GUIDE_EVAL_LIVE`, `JUDGMENT_LIVE` unset and no API key. **Classifier:** the
  slice's 19 files: guide **not required**, judgment **not required**. The accumulated branch (108 files)
  still requires both (workflow, `package.json`, `tests/eval/`); **the lockfile is not in that diff**, which
  corrects the claim made in Parts 32, 33 and below. Both live suites are unfunded.
- **NOT repaired:** server races and policy (a report in flight can recreate a progress record; a keep 404
  runs no cascade), a code nobody confirms retried silently at every launch, finding B, the shared
  body-timeout concern for other `send()` callers, focus on `BODY`. **The branch is not release-ready and the
  release remains paused.** No PR, merge, deployment, paid call, outreach or participant-data access.

## Previous status (2026-10-02, BATCH-07D)


- **BATCH-07D (`docs/DECISIONS.md` Part 33): Forget me's two introduction deletes now use the Part 32
  contract.** `confirmWithdrawal(code)` (`src/lib/introduce.ts`) sends the DELETE and classifies the
  answer with no local side effects; `withdrawInterest` is that plus its clearing (unchanged); Forget me
  calls the helper. Only an answer the protocol gives confirms (exactly 200 with a boolean `removed`, or the
  legacy 404 `not_found`); a malformed, cut, empty, other-2xx, other-404, 5xx or missing answer is
  *unconfirmed*, the code is kept, `intro` is false, the page is not replaced, and the codes are shown. The
  launch retry and the tap share `deleteAll`, so they are the same contract by construction.
- **Four gaps were reproduced on `8807b10` first** (scratch test, deleted; synthetic, real handler): the
  blocker (`intro: true`, no record, the server record remained); **G4**, a second unresolved forget
  *replaced* the first's code in the single `intro` slot (A lost, both records on the server); **G2**, a
  launch retry settling after a Forget me wrote new codes deleted the key and the new codes with it; **G1**,
  with storage refused an unresolved introduction code survived nowhere, and the next tap reported success
  having sent nothing. **G3** (a body that never ends holding Forget me before the wipe) cannot occur on
  `8807b10` and is a hazard of reading a body; held by tests and a mutation.
- **Schema, within the existing key:** `niyyah.forget.pending.v1` keeps `code`, `id`, `pair` and now
  `intros: string[]`. An earlier build's `intro` / `introPending` are read and folded in, and the record is
  rewritten in the new shape the next time it is saved. Only codes; no new key, no contact, name, answer,
  day or receipt. Not downgrade-safe (an earlier build ignores `intros`).
- **Retry subtracts, it does not overwrite** (G2); **Forget me unions** (G4); both tested separately. The
  unresolved introduction codes are held in the page when storage refuses (G1), through a second
  unconfirmed tap and "Start completely fresh", lost on a reload, and the message says so.
- **Local bound:** `confirmWithdrawal` owns one deadline (`TIMEOUT_MS`) over the response *and* the body,
  aborts where supported, always clears its timer, and ignores a late answer. `net.ts` untouched.
  `withdrawInterest` shares the bound as a consequence. `forgetMe` waits at most two rounds (the retry, then
  its own), held by a test; no copy gives a time. `tests/fail.test.ts` now allows a second raw `fetch`, in
  `introduce.ts`, deliberately.
- **Copy:** Forget me says "We could not confirm that your name came off the introduction list. It may have,
  or it may not."; the recovery sentence no longer says "every time" or implies only introduction codes;
  "not saving anything" is "could not save {this recovery code / these recovery codes}"; "it goes by hand" is
  "to ask for help removing it"; the receipt's suffix separates asking from confirming and no longer
  implies Forget me retries a receipt by itself; "Nothing was under that code any more." lost its marker
  sentence. All in Part 33's table.
- **Evidence:** 52 new tests (invariant 21, bound 9, UI 14, unit +8) plus assertions changed on purpose;
  the matrix of answers is not repeated (Part 32's stands). **Eighteen mutations: seventeen failed a test
  at once; one survived** (the wipe clearing the page copy), a test was added, it now fails two. **Built
  app** (scratch build, headless Chromium, 390×844 and 320×568, real handler over an in-memory store, faults
  on the wire): 12 runs, 12 passed; the previous build failed all 12. Codes inside the viewport, no
  horizontal overflow, only the pending record and only codes on the phone, one DELETE per tap and no
  extra POST, Forget me back and tappable, typed-code recovery in three taps, one ask on a wrong-answer
  reload and a finish on the next, the refused-storage page-memory path and its reload. **Local-handler
  evidence, not the deployed functions.** Focus after the tap was `BODY`; no screen reader was used.
- **Verification:** `npm run verify > log 2>&1; echo $?` exit 0 (123 files, 1777 passed, 2 skipped: the
  live blocks); `npm run build` exit 0; `GUIDE_EVAL_LIVE`, `JUDGMENT_LIVE` unset and no API key in the
  environment (`ANTHROPIC_BASE_URL` is set by the session's proxy). **Classifier** (`tests/eval/check.ts
  applicability`, on the actual diff, 19 files): guide **not required**, judgment **not required**. The
  accumulated branch (`261d055..HEAD`, 103 files with this slice) still requires both live suites (workflow, `package.json`, lockfile,
  `tests/eval/`); they are unfunded. This is not measured Guide or read behaviour.
- **NOT repaired, stated plainly:** **Forget me is not fully verified.** The map, the step count and the
  eleven are still deleted by `del()` (`res.ok || 404`): a bare 200 from a broken route still reads as
  deleted for those three. The **map code** is still lost under refused storage. **Receipt-location
  finding B** (a founder decision) and the **shared body-timeout concern** for every other `send()` caller
  are untouched. **Trust's presentation after a reload is unchanged**: nothing held is shown unprompted;
  recovery is Trust → Forget me → "Yes, delete everything" (which asks again and shows the codes) or the
  typed-code box. A code nobody confirms is retried silently at every launch. **A legacy 404 writes no
  marker**: if the deployed handler is still the legacy one when this ships, a late request for an
  unanswered attempt could land after a forget; ship order, not a client fix, and not verified (no
  deployed function was called). **The branch is not release-ready and the release remains paused.**
- **Limitations:** one browser (headless Chromium); Firefox and Safari not run; the cut and HTML answers
  are what a test server made, not what Netlify does. **Still unknown:** whether the production sweep ran,
  whether any real records were deleted, and whether the live evaluation harness passes. No PR, merge,
  deployment, paid evaluation, outreach or participant-data access. Running the classifier rewrites the
  git-ignored `tests/*/results/outcome.json`; the last write is the accumulated-branch answer.

## Previous status (2026-10-01, BATCH-07C)

- **BATCH-07C (`docs/DECISIONS.md` Part 32), finding F and the shared withdrawal failure wording
  repaired.** `withdrawInterest` (`src/lib/introduce.ts`) now confirms a withdrawal only from a
  response the protocol gives: **exactly 200 with a JSON object whose `removed` is a boolean** (`true`
  → `removed`, `false` → `nothing`), or the **legacy 404 with a JSON object whose `error` is
  `not_found`** (→ `nothing`). Everything else (a body that is cut, empty, HTML, not JSON, an array,
  `null`, or without a boolean `removed`; another 2xx; a 404 with another body; any other status; no
  answer) is `failed`, which now means *unconfirmed* and keeps the receipt, the pending record and the
  page's own copies. Records are cleared only after a recognized answer, and only those holding the
  code asked about. No new result type. The legacy 404 confirms absence under the legacy contract; it
  is not evidence that the current handler's withdrawal marker was written, and the current handler
  never sends it. The server, tombstones, request identity and retention are unchanged.
- **Wording:** `withdrawnLine.failed` (shared by the receipt and "I have a code") is now "We could
  not confirm that your name came off the list. It may have, or it may not. Try again in a moment:
  asking again with the same code is safe." The old "that is us, not you. Nothing has changed" is
  gone. The note's own wording is unchanged. One existing assertion
  (`tests/ui/looking-arrival.test.tsx`) was changed for it, not kept green.
- **Reproduced first** (a scratch test outside the repository, synthetic state, the real handler over
  the in-memory store): an unreadable or unexpected 200 returned `nothing` and cleared the receipt or
  pending code in 14 of 14 cases, with the record still on the server when the handler had not run.
- **Evidence:** `src/lib/introduce.test.ts` (84 new, 90 in the file; 69 fail against the previous
  helper, 21 are guards), `tests/ui/looking-withdraw.test.tsx` (new, 11 tests, all fail against the
  previous helper and wording), `tests/support/answers.ts` (new, the shared answers and interceptor).
  Both situations are covered: the deletion happened and its confirmation was unreadable, and an
  invalid success-looking answer arrived with nothing deleted; in both the code is kept and a later
  valid answer resolves it. Storage-refused (page-memory) copies are covered. Eight mutations each
  fail a test (one, any 2xx instead of exactly 200, survived the first set and led to the 202 case).
  **Built app** (scratch build, headless Chromium, 390×844 and 320×568, 12 runs: receipt, note and typed
  code × both situations): the **real handler over an in-memory store** behind a local HTTP server,
  faults injected on the wire (status then a socket destroyed mid-body after the real handler ran; the
  app's own HTML as a 200 with the handler not run). No false-claim phrase, the code still in
  `localStorage`, one DELETE and no POST per tap, no horizontal overflow, and one later real answer
  resolved each. The previous build fails all 12. This is local-handler evidence in a real browser,
  **not** the deployed functions.
- **Verification:** `npm run verify > log 2>&1; echo $?` exit 0 (120 files, 1725 passed, 2 skipped:
  the live blocks); `npm run build` exit 0; `GUIDE_EVAL_LIVE`, `JUDGMENT_LIVE` unset and no API key in
  the environment. **Classifier** (`tests/eval/check.ts applicability`, on the actual diff: `introduce.ts`,
  `Looking.tsx`, `introduce.test.ts`, `tests/support/answers.ts`, two UI test files, `DECISIONS.md`,
  this file): guide **not required**, judgment **not required**. The accumulated branch (`261d055..HEAD`,
  98 files with this slice) still requires both live suites (workflow, `package.json`, lockfile,
  `tests/eval/`); they are unfunded. This is not measured Guide or read behavior.
- **RELEASE BLOCKER (repaired for introduction codes in BATCH-07D, above): Forget me confirms an introduction deletion falsely.** `forgetMe`
  does not use `withdrawInterest`; `del` in `src/lib/forget.ts` (91–95) counts `res.ok || 404` as
  landed. *Reproduction* (scratch test, synthetic state, the real handler, the introduction DELETE
  answered `200 text/html` with the handler not run), for a saved receipt and for a pending-only
  attempt: `forgetMe().intro` is `true`, the local receipt, pending record and page copies are gone,
  `pendingForget()` is `null`, and **the record is still in the store**; the app then replaces the
  page. The affected state is exactly the introduction receipt code and pending-attempt code, the only
  things that could take the record off from this phone. **Forget me is not a verified fallback for a
  malformed withdrawal response**, and the receipt's failure line still mentions it ("Forget me on
  Trust takes it off … the next time it can"), which that finding calls into question; not changed in
  this slice. The next slice examines a targeted introduction-delete confirmation repair in that path.
  A broad endpoint audit is **not** authorized.
- **Still open, not touched:** **B** (the receipt's "kept for later" notice is read from the saved
  profile, not the request; a founder decision). **Body stall, source-read only, unverified:**
  `send()` clears its timer when headers arrive, so a body that never finishes may not be bounded; this
  slice does not change `send` and does not claim to fix request-body timeouts. Focus on `BODY` after
  the receipt's tap and after a typed-code withdrawal (measured again, unrepaired). **Not claimed:** that
  deletion confirmation is repaired throughout the app. One helper and one sentence are.
- **Limitations:** no screen reader was used; one browser (headless Chromium); Firefox and Safari not
  run; the cut and HTML answers are what a test server made, not what Netlify does. **Still unknown:**
  whether the production sweep ran, whether any real records were deleted, and whether the live
  evaluation harness passes. No PR, merge, deployment, paid evaluation, outreach or participant-data
  access; the release remains paused. Running the classifier rewrites the git-ignored
  `tests/*/results/outcome.json`; the last write is the accumulated-branch answer.

## Previous status (2026-10-01, BATCH-07B)

- **BATCH-07B (`docs/DECISIONS.md` Part 31), findings C, D and E repaired** in
  `src/components/Looking.tsx` only. `pendingIntro()` stays the one owner of the pending
  record (`{code, at}`); `Looking` caches its answer (`pending`, read at mount, re-read after
  every submit outcome, the note's withdrawal and a typed-code withdrawal) and the old
  `attempt` state is gone. A note, first in the form's screen, says an earlier try "may have
  reached us" (no receipt, no queue, no membership claim), or, after a 409, that it "was saved
  with different details"; says whether the browser keeps the recovery code or could not (then
  it shows the code and what Back-and-return and a reload do to it); and has one button that
  takes the earlier try off by the held code with no submission and no Forget me. No dismiss
  and no expiry: the code is cleared only where it always was (receipt saved, 410, `removed` or
  `nothing`, Forget me). A failed withdrawal says so in its own words and keeps the code, the
  note and the same focused button for a direct retry. A `busy` ref makes the guard real in
  both directions (`aria-disabled` stops nothing). No change to `introduce.ts`, `forget.ts`,
  `App.tsx`, the focus helpers, the server, request identity, tombstones, retention or policy.
- **Deliberate change to BATCH-07A's arrival rule:** the first uncertain result and a newly
  entered conflict now scroll to the top and focus the note's heading (the existing `Arrival`),
  because the note is at the top and the tap was at the bottom. The same outcome again does not.
  The two 07A successes (saved, then the receipt's name taken off) are unchanged. Focus is
  handled by where it actually is: lost to `<body>`, the heading takes it; still on the control
  the tap came from with no move since, it is released (a `focusin` listener records any other
  focus while the request is out); moved by the person elsewhere, including another field in the
  same form, it stays. See the follow-up bullet below.
- **Follow-up correction (same day, Part 31):** (1) the first version blurred any focus inside
  the form, taking it from a field the person had focused on purpose while the request was out;
  now only the submission-origin control, and only if focus never moved, is released. (2) While a
  submission is in flight the earlier-try button now has `aria-disabled="true"` and the faded
  state, with its words unchanged (never "Taking it off…" during a POST), still not `disabled`;
  the `busy` guard is the same. New tests: four delayed-response cases (other field then
  uncertain; other field then 409; Back; focus lost) and the origin-released guard in
  `looking-arrival.test.tsx` (the two field cases fail against the first version; the others
  hold on both), and aria-disabled assertions for both overlap directions in
  `looking-pending.test.tsx` (one mutation, dropping `|| submitting`, fails). Chromium, built
  app, 390×844 and 320×568, no `tabindex` or heading focus set by the driver: focus lost and
  Enter-in-a-field both end with the heading focused at `scrollY` 0; another field or Back keeps
  focus (uncertain and 409); the button is `aria-disabled` true at 0.6 opacity during a POST and
  sends no DELETE when tapped. Observed, not changed: during a re-submission after a conflict the
  note's heading briefly shows the uncertain wording while `state` is `sending`.
  **Classifier on the follow-up's own diff** (`Looking.tsx`, the two test files, `docs/DECISIONS.md`,
  this file): guide **not required**, judgment **not required**; the accumulated branch (96 files)
  still requires both, unchanged. `npm run verify` and `npm run build` exit 0 on the follow-up.
- **Wording that changed, explicitly:** the 409 line no longer says "a code this phone holds"
  (finding C), and the old memory-only "this is the only record of it" is replaced by the
  note's. One journey assertion and one 07A arrival test were changed for this, not kept green.
- **Evidence:** `tests/ui/looking-pending.test.tsx` (new, 13 tests) and one unit test in
  `src/lib/introduce.test.ts`. Against the previous `Looking.tsx`, 13 tests fail (11 new, the
  rewritten arrival test, the journey with the replaced wording); two new tests hold on both.
  Four mutations each fail a test. Built-app measurements (390×844 and 320×568, keyboard and
  pointer, a local fake of the handler; browser-stub evidence, not the deployed functions):
  after the first uncertain result `scrollY` 0 with focus on the note; the withdrawal sends one
  DELETE and no POST; in progress the button stays focused with `aria-disabled` true; after a
  failure the same button stays focused and the code stays in view; no horizontal overflow;
  the button is 44px. At 320 the longer states (memory-only 666px, conflict 646px) put the
  button 95–115px below the first screen (the first Tab brings it in); the heading and the code
  are in view.
- **Verification:** `npm run verify > log 2>&1; echo $?` exit 0 (119 files, 1624 passed, 2
  skipped: the live blocks; after the same-day follow-up, 1630 passed); `npm run build` exit 0; `GUIDE_EVAL_LIVE`, `JUDGMENT_LIVE` and any
  API key were unset. **Classifier** (`tests/eval/outcome.ts` `applicability()`, on the actual
  diff: `Looking.tsx`, three test files, `src/lib/introduce.test.ts`, `docs/DECISIONS.md`, this
  file): guide **not required**, judgment **not required**. This is not measured Guide or read
  behavior and does not change the accumulated branch (`261d055..HEAD`, 96 files with this slice),
  which still requires both live suites (workflow, `package.json`, lockfile, `tests/eval/`); they
  are unfunded.
- **Update (BATCH-07C, above): F and the receipt's "Nothing has changed" are repaired.**
- **Still open, not touched:** **B** (the receipt's "kept for later" notice is read from the saved
  profile, not the request; a founder decision). **F** (`withdrawInterest` maps a 200 whose body
  cannot be read to `nothing`, and then clears the receipt and the pending code, so an unreadable
  200 does not preserve the pending state, and a 200 alone is not shown to prove a removal or an
  absence; the note inherits this unchanged). **New to record:** the receipt's own withdrawal
  failure still says "Nothing has changed", an unverified status claim of the same kind as the one
  the note avoids; deliberately not bundled into this change. Also not repaired: focus on `BODY`
  after a repeated identical outcome (the disabled submit button) and after a typed-code
  withdrawal. This does not say the journey is free of defects.
- **Limitations:** no screen reader (VoiceOver, TalkBack, NVDA, JAWS) was used, so what is
  announced for the note's heading or its status line is unverified; one browser (headless
  Chromium) against a stub, happy-dom for DOM focus and `scrollTo` calls; Firefox and Safari not
  run; not a usability test. **Still unknown:** whether the production sweep ran, whether any real
  records were deleted, and whether the live evaluation harness passes. No PR, merge, deployment,
  paid evaluation, outreach or participant-data access; the release remains paused.

## Previous status (2026-10-01, BATCH-07 review and BATCH-07A)

- **BATCH-07, review of the introduction journey** (read-only; Welcome → Looking →
  submission → receipt → recovery → withdrawal; scratch build, headless Chromium at
  390×844 and 320×568, a local in-memory fake of the handler, synthetic contacts, no
  deployed store, no participant data). Existing handler and journey tests (8 files, 82
  tests) passed and are what establish backend behavior; the browser stub does not. Found
  no defect that stops requesting, recovering or withdrawing. Welcome and `/?looking`
  arrival, the payload against the "What goes" list, lost-answer retry under one code,
  Forget me with a receipt or only a pending attempt, withdrawal failure and retry, and
  the outside-pilot "kept for later" disclosure in the form all behaved; no horizontal
  overflow at either width in any state measured.
- **BATCH-07A (`docs/DECISIONS.md` Part 30), finding A repaired:** the receipt and the
  withdrawal result were not in view and focus sat on `BODY`. Cause: both swaps happen
  inside the one `looking` screen, so `App`'s scroll and heading focus (on screen
  change only) never ran. **Repair** (`src/components/Looking.tsx` only): an `Arrival`
  component mounted only by the two successes (request saved; name taken off from the
  receipt), doing two separate things on mount: `window.scrollTo(0, 0)` before paint, and
  the shared `FocusHeading onlyIfLost` after the new content mounts. No timer, no smooth
  scroll, no second action on first arrival through `App`; shared focus helpers and `App`
  untouched. No wording, payload, request identity, retry, deletion, retention or policy
  change.
- **Evidence:** `tests/ui/looking-arrival.test.tsx` (new, 8 tests; 4 fail against the
  previous `Looking.tsx`, 4 are guards that hold on both). Built-app measurements, form
  scrolled to its bottom first, keyboard and pointer identical: after save `scrollY` 0,
  focus on the receipt heading, headline at 146px and dates at 238px (390) or 278px (320),
  all in view; after withdrawal `scrollY` 0, focus on the form heading, confirmation at
  117px and heading at 235px, in view; first Tab reaches a control with a 2px outline;
  put down again arrives the same way; overflow 0 (before: headline 649px/1,355px and
  confirmation 678px/1,384px above the view, focus on `BODY`).
- **Verification:** `npm run verify > log 2>&1; echo $?` exit 0 (118 files, 1610 passed,
  2 skipped: the live blocks); `npm run build` exit 0; `GUIDE_EVAL_LIVE`,
  `JUDGMENT_LIVE` and any API key were unset for every run. **Classifier**
  (`tests/eval/check.ts applicability`, on the actual diff: `Looking.tsx`, the new test,
  `docs/DECISIONS.md`, this file): guide **not required**, judgment **not required**.
  This is not measured Guide or read behavior, and it does not change the accumulated
  branch, which still requires both live suites (workflow, `package.json`, lockfile,
  `tests/eval/`); they are unfunded.
- **Findings from the review that stay open, not touched (conditions in Part 30):**
  **B** the receipt's "kept for later" notice is read from the saved profile, not from the
  request (London request loses it after "Not sure? Start where you are"; a Minneapolis
  request shows it after choosing London in Situation); needs a founder decision (store
  the city, or change copy). **C** storage refused, then a lost answer, changed details
  (409): the code panel is hidden and the text says "this phone holds" it; a reload loses
  the code (the documented limit). **D** a pending attempt is not shown after a reload;
  resubmitting the same details reuses the code; Forget me sends it; nothing says so.
  **E** a failed "Take the earlier name off" shows the submission's "could not tell"
  text and drops its button. **F** source-read only, not reproduced: an unreadable 200 on
  withdrawal reads as "nothing under that code". Also not repaired: focus on `BODY` after
  a failed submit (disabled button) and after a typed-code withdrawal. None is called a
  proven regression: no earlier build was run, and the in-place swap is in the base
  `261d055`. This does not say the journey is free of defects.
  **Update (BATCH-07B, Part 31): C, D and E are repaired; B and F stay open.**
- **Limitations:** no screen reader (VoiceOver, TalkBack, NVDA, JAWS) was used, so the
  announcement of the new heading focus and of the `role="status"` confirmation is
  unverified; one browser (headless Chromium) against a stub, happy-dom for DOM focus
  and `scrollTo` calls; Firefox and Safari not run. **Still unknown:** whether the
  production sweep ran, whether any real records were deleted, and whether the live
  evaluation harness passes. No PR, merge, deployment, paid evaluation, outreach or
  participant-data access; the release remains paused.

## Previous status (2026-10-01, BATCH-06)

- **BATCH-06, one country question for the Guide's two support lines**
  (`docs/DECISIONS.md` Part 29; resolves the limit Part 26 recorded, which stays
  as written with a dated note beside it). **Reproduced** in the built app
  (headless Chromium, 390×844 and 320×568, service workers blocked, functions
  stubbed to 503, synthetic seeded state, no live model, no participant data):
  in the Guide's foot ("Not safe, or not okay?") choosing a country changed the
  abuse block and left the crisis block on its generic fallback. **Cause:** `picked`
  was `useState` in each `HelpLine`, and only the abuse one could ask. **Repair**
  (`HelpLine.tsx`, `Coach.tsx`): a `withCrisis` prop, so one `HelpLine` renders both
  blocks from the one choice and draws one selector after them; the floor is
  `<HelpLine urgent withCrisis />`. The choice stays component-local: not stored,
  not sent, not on her identity; closing the disclosure, switching voice or leaving
  the Guide discards it. Unsupported choice: every earlier service name and link is
  gone from both blocks, the abuse block says "We don’t have a local support line
  listed for this location." once, the crisis block keeps its existing
  country-qualified fallback; clearing restores the saved-country or default state.
  No wording, service, number, advice or `aria-live` was added; `src/data/*`, the
  voice, engines, storage, backend, workflow and classifier are untouched. Standalone
  callers, the thread's own blocks (each with its own question) and a standalone
  crisis line (never asks) are unchanged.
- **Evidence:** `tests/ui/help-country.test.tsx` (+8 characterization tests of
  standalone behaviour, passed on the old code first), `tests/ui/help-pair.test.tsx`
  (new, 8), `tests/ui/guide-floor.test.tsx` (+3). Against the old `HelpLine`/`Coach`,
  8 of the new tests fail (7 + 1, the last on the Part 26 limit itself); the rest are
  guards that hold on both. `npm run verify > log 2>&1; echo $?` exit 0 (117 files,
  1602 passed, 2 skipped: the live blocks); `npm run build` exit 0;
  `GUIDE_EVAL_LIVE`, `JUDGMENT_LIVE` and any API key were unset for every run.
- **Measured in the rebuilt app** (no country saved; empty, uk, so, us, other, dk,
  ke, ae, empty): at 390×844 and 320×568 the support text, every `tel:` link, the
  select, the textarea and Send were fully in view for every selection, with no page
  scroll and no horizontal overflow. The select stayed 44px tall and did not move
  (top 684px at 390, 408px at 320). The open floor was 340–383px at 390 and
  360–424px at 320 (worst state, an unlisted country, is unchanged at 424 of 568; the
  rest are the same or shorter). Tab order link, link, link, select, textarea; typing a
  country or an arrow key changed both blocks with focus on the select; Enter on the
  summary closed and reopened the floor and the question started empty. Storage keys
  and values were identical and no request was made over the selection window.
- **Evaluation applicability for this slice** (the repository's classifier,
  `tests/eval/check.ts applicability`, on the actual diff: `HelpLine.tsx`, `Coach.tsx`,
  three test files, `docs/DECISIONS.md`, this file): guide **not required**, judgment
  **not required**. It would have required both had `src/lib/coach.ts` been touched.
  This is **not** measured Guide behaviour: the model, prompt, offline voice and the
  triggers that decide when a line shows are untouched; the floor is what
  `tests/judgment/guide.test.ts` already says no grade counts. Run on the accumulated
  branch (`261d055` through this slice, 94 files) it still says **required** for both,
  from the workflow, `package.json`, the lockfile and `tests/eval/`; the live suites are
  unfunded and the release remains paused. No PR, merge, deployment, paid evaluation,
  outreach or participant-data access.
- **Limitations:** all checks are automated, DOM focus in happy-dom and one browser
  (headless Chromium); **no screen reader** (VoiceOver, TalkBack, NVDA, JAWS) was used,
  so what one announces is unverified, and **changed support text has not been
  verified with a screen reader**: the blocks have no live region and a screen-reader
  user changing the country may not hear the lines change (adding one was decided
  against for this slice). Firefox and Safari were not run. The select has Chromium's
  default focus ring, not the app's 2px gold ring (styled for buttons and links only);
  the inline telephone links are 16px tall; at 320×568 the open floor leaves the
  thread 4–68px tall (the same or smaller before). Thread blocks and the floor still
  ask separately, and a standalone crisis line still never asks. No real `HELP` row has
  differing availability; that case is tested with a synthetic table.

## Previous status (2026-10-01, BATCH-05)

- **BATCH-05, keyboard focus in the two-person eleven** (`docs/DECISIONS.md`
  Part 28; BATCH-03's deferred "same gap on his side"). **Reproduced** in the
  built app (headless Chromium, keyboard only, service workers blocked, backend
  stubbed, synthetic fixtures; the delayed GET and POST were confirmed
  intercepted): on `Couple.tsx` every change left focus on `BODY` — the record
  arriving (intro, dead link, unreachable, already answered), Start, each of
  the eleven questions, Back, the result, a 409 or 404 on the send, and a send
  that failed. **Cause:** `App` focuses the heading once, when the screen mounts;
  Couple mounts in `loading`, which has no heading, and every later phase or
  question replaces the control that had focus in place. **Repair**
  (`src/components/Couple.tsx` only): each phase and question is a `FocusStep`
  (unchanged, Part 26's), so a heading takes lost focus when it appears and a
  surviving control is left alone; Back moved out of the keyed question step so
  it is the same button and keeps focus (page height and Back position
  identical at 390px and 320px); and after a failed send focus returns to the
  answer he gave, only if focus was lost and he has not moved. No timer, no
  eager import, no new dependency. `FocusStep.tsx`, `useFocusHeading.ts` and
  `ElevenChoices.tsx` are untouched. No wording, answer, scoring, comparison,
  payload, sharing, consent, storage, request, retry, backend or `src/data/*`
  change.
- **Evidence:** `tests/ui/couple-focus.test.tsx` (new, 14 tests): 11 fail
  against the previous `Couple.tsx`, 3 are guards that hold on both. Built-app
  walk after the repair at 390px and 320px, eight scenarios (full flow with a
  delayed record and a delayed send, Back with the answer kept, 503 on the send,
  409, 404, dead link, unreachable, already answered, Back while sending): focus
  on the right heading each time, Back keeps focus, the first Tab after arrival
  reaches the first control after the heading (the first answer on a question,
  "Copy the words" on the result), no horizontal overflow, the same 2px ring on
  the answers and Back. `npm run verify > log 2>&1; echo $?` exit 0 (116 files,
  1583 passed, 2 skipped: the live blocks); `npm run build` exit 0;
  `GUIDE_EVAL_LIVE`, `JUDGMENT_LIVE` and any API key were unset for every run.
- **Evaluation applicability for this slice** (the repository's classifier,
  `tests/eval/check.ts applicability`, on the actual diff: `Couple.tsx`, the new
  test, `docs/DECISIONS.md`, this file): guide **not required**, judgment **not
  required**. Run on the accumulated branch (`261d055` through this slice, 91
  files) it still says **required** for both, from the workflow, `package.json`
  and `tests/eval/`; the live suites are unfunded and the release remains
  paused. No PR, merge, deployment, paid evaluation, outreach or
  participant-data access.
- **Limitations:** automated DOM focus checks in happy-dom and one browser
  (headless Chromium); no screen reader (VoiceOver, TalkBack, NVDA, JAWS) was
  used, so what one announces is unverified, and Firefox and Safari were not run.
  While the eleventh answer sends, focus is on `BODY` in Chromium (a disabled
  button cannot keep it); the fix would be `aria-disabled` in the shared
  `ElevenChoices`, outside this slice. The loading phase has no heading and no
  live region. A response landing after he stepped Back during the send still
  shows the result (state flow unchanged). The review is not user research.

## Previous status (2026-10-01, BATCH-04)

- **BATCH-04, the family words' entry and the caution hand-off** (`docs/DECISIONS.md`
  Part 27; BATCH-03's deferred finding 4). A read result with `caution` or
  `careful` no longer offers the family words: the result-specific card is removed
  (the eleven was already absent there), and the family words are not blocked
  anywhere else (Home, Talking and their own address are as they were). Reason:
  they open the same way after every read and include words for the other person
  and for advancing family involvement. Nothing replaced the card, and no script or
  guidance was added; the caution or careful box and its support line, the words
  card with its BATCH-03 title and preface, the guide, the map, the invitation and
  the retake are unchanged. The disclosure hint is "Your guide, a friend" on those
  results and unchanged on ordinary ones. Talking's third card keeps its title and
  now says "Word-for-word sentences to say aloud — to your own family, to the other
  person, and for when the families meet." Ordinary results are unchanged.
  Files: `src/components/Read.tsx`, `src/components/Talking.tsx`,
  `tests/ui/families-handoff.test.tsx` (new), `tests/invariants/the-loop-closes.test.tsx`
  (one assertion deliberately corrected), `docs/DECISIONS.md`, this file. No
  `src/data/*`, `Families.tsx`, engine, helpline, storage, backend or workflow
  change.
- **Evaluation applicability for this slice** (the repository's classifier, on the
  actual diff, six files): guide **not required**, judgment **not required**. It
  would have required the judgment suite had `src/data/families.ts` been touched.
  This does not change the accumulated branch: `261d055..HEAD` still requires both
  live suites (workflow, `package.json`, lockfile, `tests/eval/`), they are
  unfunded, and the release remains paused. No PR, merge, deployment, paid
  evaluation or outreach.
- **Limitations:** a headless-browser review, not user research; no screen reader
  was used, so what one announces is unverified. A money or hidden-without-careful
  caution still has no words of its own for "tell one person" (content, deferred).
  Ordinary "thin" results still name "asking him to send his people" in the
  disclosure line (a founder decision). The same "The words for your family" title
  remains on Home and BeforeYes, and Home still asks later whether a taken family
  script was used.

## Previous status (2026-10-01, BATCH-03)

- **BATCH-03, the "already talking to someone" tools** (`docs/DECISIONS.md`
  Part 26). A read-only review (built app, headless Chromium, synthetic answers,
  live AI off) found five things; the founder authorised three, now built:
  (1) the urgent abuse line asks where she is when no helpline is known and
  then shows that country's line (`HelpLine.tsx`, component-local state only);
  (2) a caution whose words are `CAREFUL_SCRIPT` is titled "The words for one
  person who knows you" with "These are not for {him}." (`Read.tsx`); (3) focus
  follows each question and each result inside the read and the eleven, and the
  family words' side chooser (`FocusStep.tsx`, `useFocusHeading.ts`), only when
  focus was lost. **Deferred and unchanged:** the family words' entry text and
  caution hand-off, and the read's missing "hasn't come up yet" answer; the
  same focus gap on his side of the two-sided eleven. Nothing in `src/data/*`,
  the engines, storage, consent, sharing or the Guide changed. No screen reader
  was used; the review is not user research.
- **BATCH-03 correction (same day):** the helpline selector now offers every
  existing country, Somalia and "somewhere else" included, starts empty, is
  labelled "Choose your country to see available support." and says "We don’t
  have a local support line listed for this location." where `HELP` lists no
  abuse line (the prior service and its telephone link are removed when the
  choice changes). `HELP`, its numbers, focus and script framing are untouched;
  still component-local, no storage or requests. Checked at 390px and 320px.
- **Release remains paused.** Evaluation applicability for this slice, from the
  repository's classifier, is recorded below; it does not remove the branch's
  existing requirements (both live suites, unfunded).

## Previous status (2026-09-30 to 2026-10-01, BATCH-02A–C)

- **Direction changed by the founder:** interviews and recruitment are
  **deferred** (not completed, not invalidated; `docs/PILOT-RESEARCH-01.md`
  stays, still no interview held and nobody contacted). Product development
  continues. This supersedes "the next task is founder review of the packet
  and recruitment" below. It does not change the matchmaking pilot or
  authorize a release.
- **BATCH-02A, a clearer first screen** (`docs/DECISIONS.md` Part 25):
  Welcome has a marriage-focused headline and one scoping sentence; both doors
  stay, each naming its action; "two minutes away", "No one else sees it" and
  "Private to you" are gone, replaced by a sentence the code supports; the
  Talking chooser no longer needs "the read" or "the eleven" as prior
  knowledge; Looking changed in size, contrast and spacing only. No storage,
  consent, sharing, Guide, evaluation or workflow file was touched.
- **Evidence:** `npm run verify > log 2>&1; echo $?` exit 0 (108 files before,
  109 with `tests/ui/welcome.test.tsx`; 2 live blocks skipped); `npm run build`
  exit 0; live evaluation disabled (`GUIDE_EVAL_LIVE`, `JUDGMENT_LIVE` unset, no
  key). Built app inspected in headless Chromium at 390×844, 320 and 1280
  wide, before and after, on synthetic (empty) state with the functions
  stubbed to 503: no horizontal overflow on Welcome, Talking or Looking; Tab
  order is the two cards, "Not sure?", then the restore link, each with a 2px
  ring. Screenshots were inspected, not committed.
- **Navigation-accessibility repair (same batch, follow-up session):** the
  keyboard transition that left `document.activeElement` on `BODY` is fixed.
  Cause: `App` focused the new screen's heading from an effect *outside* the
  Suspense boundary; on a cold load the lazy chunk was still in flight, so the
  effect found only the blank fallback and never ran again. Fix: the focusing
  is now `<FocusHeading/>` *inside* the boundary (`src/hooks/useFocusHeading.ts`),
  whose mount effect runs when the screen actually appears; no timers, no
  eager imports, once per screen, and it leaves focus alone if something in the
  screen already has it. Details and evidence: `docs/DECISIONS.md` Part 25.
  `tests/ui/focus.test.tsx` holds a destination chunk back and proves focus
  reaches its heading. **Limitation:** all focus checks are automated (DOM
  focus in happy-dom and headless Chromium); no screen reader (VoiceOver,
  TalkBack, NVDA, JAWS) was used, so what they announce is unverified.
- **BATCH-02B, social preview and metadata (2026-10-01):** the stale card is
  replaced by `public/og-pilot.png`, rendered from `scripts/og/og.html` with
  `npm run og`; title, descriptions, social titles, manifest and `OG_ALT` align
  with the homepage (`src/data/brand.ts`, `docs/DECISIONS.md` Part 25). All
  metadata names `og-pilot.png`. `public/og.png` is kept as a byte-identical
  copy of the **new** card (never the old artwork), written by the same render;
  the render is checked (clean exit, new file, 1200×630 PNG) before either file
  is written, so a failed render cannot copy a stale output, and
  `tests/brand.test.ts` holds the two files byte-identical. The built HTML
  (home, a tool page, the guide) was checked: every image URL is
  `og-pilot.png`, tool titles and canonicals are unchanged. **Limitation:** the
  new filename does not clear third-party preview caches. After deployment the
  old address, `/og.png`, serves the updated card, but chat apps and crawlers
  may keep showing content they cached earlier, from either address, until
  those caches refresh. Card inspected at full size and at 375px wide, no
  clipping.
- **BATCH-02C, introduction signup readability (2026-10-01, revised once):**
  `Looking.tsx` presentation and copy only (`docs/DECISIONS.md` Part 25): short
  intro with one non-guarantee, five always-visible disclosure rows with run-in
  labels, a compact three-line data block, grouped fields with short helper
  text, recovery by code under its own card heading. Reliability behaviour,
  pilot rules, fields, consent, receipt, withdrawal, routing and focus are
  untouched. First version was taller than the baseline; the revision measures
  2,802px fresh at 390px vs 2,913px before 02C (3,380 vs 3,432 at 320px) and
  327 prose words vs 344. A **usability hypothesis only**, never validated with
  users. `tests/ui/looking-signup.test.tsx` holds disclosure meaning and
  visibility, no outcome promises, the field list, no reset on validation and
  recovery outside the signup form; the journey tests pass unchanged. No screen
  reader was used.
- **Left for later:** nothing from this batch beyond the above.
- **Release remains paused** exactly as below: no pull request, merge,
  deployment or paid evaluation; both live suites still need funding.

Earlier status (BATCH-01 paused; packet prepared), now superseded where it
says recruitment is next:

- **BATCH-01 release remains paused pending funded live evaluation.** Opening
  the pull request runs `guide-eval.yml` on the whole batch, and both live
  suites would be required (release check 1 below). The batch stays on
  `claude/hello-gr0hoz`.
- **`docs/PILOT-RESEARCH-01.md` is prepared**: six recent-behaviour
  conversations, a recruitment message, a script, concept cards, consent
  questions, an evidence template and a decision guide. It reports no finding.

The B2 handoff follows, unchanged.

---

Written 2026-09-27. Five sessions on one branch: Group A of
`docs/BATCH-01-PLAN.md`, its repair (reviewed through `e2e5fe8`), Group B1
(`551b62e`), B1's repair (`e903363`, reviewed and accepted), and this one,
Group B2 — historical accuracy and outreach bookkeeping. Group A and B1 were
not touched by B2. **The next task is the final review of the whole batch,
not more building.**

## Commits and branch

| What | Commit |
|---|---|
| Base: branch head at the start of the batch, tree-identical to `origin/main` at `cdcd187` (the merge of PR #83) | `261d055` |
| The plan | `344fc99` |
| Group A | `ed5c53e`, handoff `3b987ee` |
| Group A repair | `5dedfe3`, `e2e5fe8` |
| Group B1: evaluation outcomes | `551b62e` |
| Group B1 repair | `e903363` |
| Group B2: historical accuracy and outreach bookkeeping | the commit after `e903363` (see `git log`) |

Branch `claude/hello-gr0hoz`, pushed; base `origin/main` at `cdcd187`.
**No pull request was opened, nothing was merged, nothing was deployed, no
paid evaluation ran, no branch protection was changed, no participant record
was read, no store was touched, nobody was contacted.** A push to this branch
triggers nothing: Netlify builds `main` only; `verify.yml` runs on pull
requests and pushes to `main`; `guide-eval.yml` on pull requests and by hand.

## Group B2, as built

### 1. The held stores: what is established, and what is not

The current documentation said, in five places, that the 2026-09-27 sweep
*happened* and *took* the two real signups, while `docs/DECISIONS.md` Part 22
itself recorded the same fact as unverified. The evidence, and only the
evidence, is now what every current document says:

- **Code:** the sweep at `911654a` deleted every key in `cohort`, `contacts`
  and `vouches` on each run.
- **Deployment window:** that code was on `main` from 2026-09-24 05:35 UTC
  (PR #70 merged) to 2026-09-27 13:49 UTC (PR #83 merged; deploy published
  13:51), which contains one `@weekly` slot, 2026-09-27 00:00 UTC.
- **Unverified:** whether that slot executed; what, if anything, it deleted;
  whether the two women's store copies existed at the time. No session has
  read the function's log or any of the three stores, and an empty store now
  would not prove a deletion then. No log-retention deadline is asserted.
- **The form rows:** Netlify listed `niyyah-waitlist` with five submissions
  on 2026-09-27, as metadata (created 2026-08-29, last 2026-09-22 01:13
  UTC). Contents, recoverability and the number of distinct people are
  unread. Kept as the dated observation, never a fresh count.
- **Kept apart:** the `introductions` store (decision 32) was never opened
  by that sweep; nothing in this incident is about it.

Corrected: `docs/PRIVACY.md` (the held-stores row, the sweep paragraph, C7,
R1, R4, the "two copies" note); `docs/SECURITY.md` (the summary and T20,
which said "Happened 2026-09-27 00:00 UTC"); `docs/OPS.md` (the recovery
table's `introductions` row no longer claims the contacts incident, the
held-stores row carries it with the window and the unverified run, the
workflow row); the comments in `netlify/functions/sweep.ts` and
`netlify/functions/introduce.ts` (wording only; `npm run verify` proves no
behaviour changed). `docs/DECISIONS.md` keeps its dated text and gains a
correction beside decision 21, beside the Part 22 finding row, and a
"Correction, 2026-09-27 (BATCH-01 Group B2)" paragraph after Part 22's
table. Commit messages from the day (`d7b08e4`) say "its first run was";
they are history and are not rewritten.

### 2. The outreach rule

`CLAUDE.md`'s "Outreach drafts count as sent" is replaced, on the founder's
B2 instruction: a draft is **drafted**; **sent (founder-reported, date)**
only when the founder explicitly reports sending, with the report's date;
**sent (confirmed)**, **replied** and **placed** each on evidence of its own
kind; evidence of sending is not evidence of delivery or placement. The same
rule is in `docs/ASSETS.md`, "Who keeps it". The authorisation changed the
rule; it confirmed no particular historical message.

### 3. The ledger, reconciled

`docs/ASSETS.md`'s placement ledger has an **Evidence / source** column and
the statuses above (plus **historical sent claim; source unverified**,
**declined**, **no response**). Provenance was taken from the file's commit
history:

| Rows | Status now | Why |
|---|---|---|
| The six changed in `4e773e7` (Abubakar, The Somali American, KALY-LP, Naperville, MCC East Bay, St. Cloud) | sent (founder-reported 2026-09-26), awaiting reply | That commit records "the founder reports every drafted email went out"; the send dates were not recorded and are not invented; delivery unconfirmed |
| Before the Nikah | replied | Founder-reported send 2026-09-25; her same-day reply is in `docs/RESEARCH.md` Feedback 2026-09-25 (`498d4de`), the evidence the pitch arrived |
| The four 2026-09-17 rows (Al-Ansar, ICSA / Dar Al-Hijrah, FYI, Masjid Al-Israa) | historical sent claim; source unverified | Logged as sent when the ledger was created (`48329ec`); the record does not say whether from a founder report |
| WardheerNews (2026-09-19) | historical sent claim; source unverified | `ec937a7` logged the send with a date; the report's source is not named |
| The Rahma Center (2026-09-24) | historical sent claim; source unverified | `c7d56c7` logged it as sent; the source is not named |

No row was downgraded to "never sent", no report date was manufactured, and
no older row was relabelled founder-reported on the strength of the old
draft-equals-sent rule. No parser and no ledger test: nothing in the
application reads the table (`tests/guides.test.ts` reads the asset URLs
only).

## Verification, as it actually ran (B2 session)

| Check | Result |
|---|---|
| `npm run verify > log 2>&1; echo $?` | exit 0; 108 test files, 1500 passed, 2 skipped (the two live blocks) |
| `npm run build` | exit 0 |
| Live evaluation | disabled: `GUIDE_EVAL_LIVE` and `JUDGMENT_LIVE` unset, no `ANTHROPIC_API_KEY` in the environment; the two live blocks skipped |
| Diff review | prose and comments only in B2; no runtime change; no participant data; every date in the corrections is one already in the record (`docs/BATCH-01-PLAN.md` finding 4, Part 22, the ledger's commits) |

## Outstanding release checks, before "PR + merge"

1. **Opening the pull request runs `guide-eval.yml` on the whole batch's
   diff.** The batch changes the workflow, both harnesses, `package.json`,
   `package-lock.json` and `tests/guide-eval/`, so both live suites will be
   **required** (`tests/eval/outcome.ts`, `REQUIRES`). With an
   `ANTHROPIC_API_KEY` repository secret and credit, that run **spends
   money** (about $4 for the Guide suite; relationship judgment also judges
   every script the lock marks unjudged, currently 98). Without them the
   check is red as `not-evaluated`. Decide before opening the PR whether to
   add the secret and allow the spend, or to open it knowing the check is
   red.
2. **No live run has validated the repaired harness.** Every outcome so far
   is from stand-ins. The first real run is the first evidence that the
   session, the outcome files and the verdict behave against the API.
3. **Branch protection on `main` is unknown.** These sessions cannot read
   it, and it was not changed. Whether a red `guide-eval / live` check blocks
   the merge is therefore unknown; the docs say so.
4. `verify.yml` runs on the PR: `npm run verify` and `npm run build`, both
   exit 0 on this branch at every commit of the batch.
5. The held stores and the form rows are the founder's to read and decide
   (below); nothing in the batch depends on it.
6. Nothing is deployed until `main` moves; Netlify builds `main` only.

## Founder input still open

1. Whether the 2026-09-27 00:00 UTC sweep slot ran (Netlify → Functions →
   `sweep` → Logs); what `cohort`, `contacts`, `vouches` hold now (Blobs);
   which of the five form rows are tests. The docs say "unverified" until
   then, and nothing here decides retention (decision 21).
2. `VITE_OPERATOR_NAME`: unset, Looking and Trust say "its founder".
3. Whether the eval and production Anthropic keys share an account or a
   spend limit; whether `guide-eval / live` is a required status check.
4. Whether any "historical sent claim; source unverified" row in
   `docs/ASSETS.md` should become founder-reported, on the founder's word.

## Limitations that remain

- Everything in §1 above that is marked unverified stays unverified until
  the founder reads the two places named; the documentation states the
  uncertainty rather than resolving it.
- B1's limitations stand (`git log -p docs/SESSION-HANDOFF.md` for the B1
  handoff): the report is recounted, not re-graded; every PR runs the
  classify step; any lockfile change requires both paid suites; a red check
  is information until branch protection says otherwise.
- `docs/DECISIONS.md` Parts 22–24 keep their original wording with
  corrections beside it, so a reader sees both what was believed on the day
  and what is established.

## The exact next task

*Superseded by "Status as of the latest session" at the top: the release is
paused until a live evaluation can be funded, and the next task is founder
review of `docs/PILOT-RESEARCH-01.md` and recruitment.* When the release
resumes: final review of the complete batch (`261d055..HEAD`). Then, on the
founder's "PR + merge": decide item 1 of the release checks first, open one
pull request for the whole batch, wait for `verify` (and `guide-eval`, if the
spend is allowed) and merge.
