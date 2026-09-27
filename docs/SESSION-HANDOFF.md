# Session handoff — BATCH-01, Group B1: reliable evaluation outcomes

Written 2026-09-27. Three sessions on one branch so far: the one that built
Group A of `docs/BATCH-01-PLAN.md`, the one that repaired it (reviewed
through `e2e5fe8`), and this one, which built Group B1 — the evaluation
outcomes — and nothing else. Group A was not reopened. **Group B2
(documentary accuracy, outreach bookkeeping) has not been started.**

## Commits

| What | Commit |
|---|---|
| Group A and its repair, reviewed | `261d055` … `e2e5fe8` (see the previous handoff in `git log -p docs/SESSION-HANDOFF.md`) |
| Group B1: evaluation outcomes | the commit after `e2e5fe8` (see `git log`) |

Branch: `claude/hello-gr0hoz`, pushed. **No pull request was opened, nothing
was merged, nothing was deployed, no paid evaluation ran, no branch
protection was changed, no outreach was sent.** A push to this branch
triggers nothing: Netlify builds `main` only; `verify.yml` runs on pull
requests and pushes to `main`; `guide-eval.yml` runs on pull requests and by
hand; `deployed.yml` on pushes to `main`; `watch.yml` on its schedule.

## What B1 built

The full account is `docs/GUIDE-EVAL.md`, "Outcomes". In short:

1. **A shared layer, `tests/eval/`.** `outcome.ts` (pure, no imports: the
   four outcomes, the tally, `decide`, `validateOutcome`, `REQUIRES` /
   `NOT_MEASURED`, `applicability`, `verdict`); `session.ts` (every request
   counted; failures classified as auth / billing / model / transient / other;
   transient retried three attempts with backoff; fatal stops the run; keys
   redacted); `artifacts.ts` (the two outcome files on disk);
   `check.ts` (the workflow's `applicability` and `verdict` commands, run
   under plain Node before `npm ci`); `stand-in.ts` (SDK error classes for
   the tests).
2. **Both harnesses on that layer.** `tests/guide-eval/live.ts` gains
   `guideSuite` — the whole run, files included — and a report with
   `expected`, `started`, `requests`, `succeeded`, `stopped`, `errors`, and
   a `source` per case of `live` / `declined` / `unavailable` (the old
   `offline-fallback` split in two). `tests/judgment/live.ts` is new:
   `runJudgment` and `judgmentSuite`, calibration first and a stop when the
   judge fails it, then the themed cases, the held-out set and the unjudged
   scripts, `width` at a time. The two live test files are thin: with the
   `*_LIVE=1` flag and no key they record `not-evaluated` and fail.
3. **The workflow.** Runs on every PR; the first step diffs against the PR's
   base and classifies; `npm ci` and each suite run only when required; the
   judgment step reads the Guide's outcome and sends nothing after a fatal
   stop; the last step always runs and fails closed. `workflow_dispatch`
   takes `suites` (both / guide / judgment). The `grep "credit balance"` →
   `exit 0` workaround is gone, and `tests/eval/workflow.test.ts` fails if it
   comes back.
4. **Baselines.** Written only by a run that is `evaluated-pass`
   (`UPDATE_GUIDE_BASELINE=1`, `UPDATE_JUDGMENT_BASELINE=1`,
   `UPDATE_JUDGMENT_LOCK=1` likewise). No live baseline exists yet; the
   judgment baseline was never written before and is now written on the
   first pass. **No quality threshold changed.**

### Required / not-required, as built

| Changed path | Guide | Judgment |
|---|---|---|
| `.github/workflows/guide-eval.yml`, `package.json`, `tests/eval/` | required | required |
| `netlify/functions/guide.ts`, `netlify/shared/prompt.ts`, `netlify/shared/vocab.ts` | required | required |
| `src/lib/coach.ts`, `src/data/coach.ts`, `tests/voice-rules.ts` | required | required |
| `tests/guide-eval/cases.ts`, `graders.ts`, `judge.ts` | required | required |
| `tests/guide-eval-live.test.ts`; the rest of `tests/guide-eval/` | required | — |
| `tests/judgment-live.test.ts`; `tests/judgment/` | — | required |
| `src/data/read.ts`, `beforeYes.ts`, `eleven.ts`, `families.ts` | — | required |
| anything else (including `netlify/shared/{body,counter,day,founder,limit,ops,secret}.ts`, imported by the handler and never read by `guideRequest`) | not-required | not-required |

A manual run is required for the suites chosen. The rules are held to the
suites' real import graphs by `tests/eval/outcome.test.ts`.

## Verification, as it actually ran

| Check | Result |
|---|---|
| `npm run verify > log 2>&1; echo $?` | exit 0; 108 test files, 1495 passed, 2 skipped (the two live blocks: `GUIDE_EVAL_LIVE` and `JUDGMENT_LIVE` unset, and no key in the session) |
| `npm run build` | exit 0 |
| New deterministic tests | `tests/eval/outcome.test.ts` (25), `session.test.ts` (10), `workflow.test.ts` (12); the end-to-end blocks in `tests/guide-eval-live.test.ts` (16) and `tests/judgment-live.test.ts` (12); all with stand-in clients throwing the SDK's own error classes |
| Scenarios covered | complete passing and failing runs; missing credentials; billing and auth failure before the first case (one request, nothing else scheduled; with width 4, the four in flight recorded as sent and two as never started); failure after partial completion (partial report kept, no baseline); a transient 500 and a lost connection (retried, waited on, recorded, run passes); a case that keeps failing (`unavailable`, offline voice graded, not judged, run fails); a decline (coverage) versus an empty response (not); a malformed judge answer and a failing judge call (unjudged, run fails); a judge that fails calibration (stops after calibration, nothing further spent); an empty case set (fail); a fatal stop carried from the earlier suite (nothing sent); missing, non-JSON, malformed and self-contradictory outcome files (refused); required versus not-required for pull requests, manual runs and unknown inputs; `check.ts` under plain Node |
| Paid evaluation | **none**. The environment had no `ANTHROPIC_API_KEY`; the live blocks skip without the `*_LIVE=1` flags, and the stand-in tests never construct an SDK client |
| Pushing this branch | builds nothing on Netlify, runs no workflow |

## Limitations that remain

- **No live run has produced an outcome yet.** Everything above is proven
  against stand-ins. The first real run will be the first `outcome.json`
  from the model; if it is `evaluated-pass` it writes the first live
  baselines.
- **A red check does not block a merge today.** Branch protection on `main`
  does not require `guide-eval / live` as far as this session can tell (it
  cannot read branch protection); the docs say so and nothing here changed
  it. Until the founder sets it, a red check is information.
- **Every PR now runs the classify step** (checkout, setup-node, a diff, no
  install): a runner minute or so per PR on unrelated changes, in exchange
  for a check that exists for every PR.
- **A PR touching the Guide with no key is red**, where it used to be green
  with a warning. That is the design: `not-evaluated` is not a pass.
- **`package-lock.json` is not a trigger.** An SDK bump made only in the
  lockfile does not require a run; the range in `package.json` does.
- **A transient failure that persists spends up to three attempts per
  request** and lets the run continue on other cases; a whole outage is
  therefore a run of `unavailable` cases rather than an early stop. Only
  auth, billing and an unknown model stop the run outright.
- **The two suites share one key and one account** (or not — founder input
  still open); the second suite reads the first's fatal stop and sends
  nothing, but a billing failure that begins during the second suite is
  found by the second suite's own first request.
- The lockfile, `docs/DECISIONS.md` and `docs/SECURITY.md` were not touched.

## Deferred: Group B2 (not started)

Operational and documentary accuracy (`docs/SECURITY.md` T20,
`docs/PRIVACY.md` R4 and C7, the `docs/OPS.md` "Deleted data" row reworded to
unverified; the five form rows as observed submissions; no health counts for
the held stores); outreach bookkeeping (the seven states, historical rows kept
uncertain, the `CLAUDE.md` wording only on the founder's word).
`docs/BATCH-01-PLAN.md` §4.

## Founder input still open

The held stores (the 2026-09-27 sweep log, the Blobs listing, which form rows
are tests); `VITE_OPERATOR_NAME`; whether the eval and production Anthropic
keys share an account; **whether `guide-eval / live` should be a required
status check** — now the one setting that decides whether a red outcome
blocks a merge; the `CLAUDE.md` outreach wording. `docs/BATCH-01-PLAN.md` §7.

## The exact next task

Review of Group B1. Then, if accepted, Group B2 of `docs/BATCH-01-PLAN.md`.
When credit returns: Actions → guide-eval → Run workflow → `both`, read the
two `outcome.json` blocks in the log, and proceed only from `evaluated-pass`.
