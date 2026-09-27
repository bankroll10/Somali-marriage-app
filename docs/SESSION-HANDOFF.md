# Session handoff — BATCH-01, Group B1: reliable evaluation outcomes, and its repair

Written 2026-09-27. Four sessions on one branch so far: the one that built
Group A of `docs/BATCH-01-PLAN.md`, the one that repaired it (reviewed
through `e2e5fe8`), the one that built Group B1 — the evaluation outcomes —
at `551b62e`, and this one, which repaired B1 after an independent review.
Group A was not reopened. **Group B2 (documentary accuracy, outreach
bookkeeping) has not been started.**

## Commits

| What | Commit |
|---|---|
| Group A and its repair, reviewed | `261d055` … `e2e5fe8` (see the earlier handoff in `git log -p docs/SESSION-HANDOFF.md`) |
| Group B1: evaluation outcomes | `551b62e` |
| The repair of B1 | the commit after `551b62e` (see `git log`) |

Branch: `claude/hello-gr0hoz`, pushed. **No pull request was opened, nothing
was merged, nothing was deployed, no paid evaluation ran, no branch
protection was changed, no outreach was sent.** A push to this branch
triggers nothing: Netlify builds `main` only; `verify.yml` runs on pull
requests and pushes to `main`; `guide-eval.yml` runs on pull requests and by
hand; `deployed.yml` on pushes to `main`; `watch.yml` on its schedule.

## The repair (2026-09-27, after `551b62e`)

The review ran the deterministic suites (86 passed, two live tests skipped)
and reproduced three gaps. Each with the cause, the fix and the regression
that now fails without it (`docs/GUIDE-EVAL.md`, "Outcomes").

1. **A contradictory tally earned a pass.** `{ expected: 10, started: 10,
   completed: 10, answered: 0, judged: 10, requests: 1, succeeded: 1 }` was
   `evaluated-pass` from `outcomeOf` and accepted by `validateOutcome`. Cause:
   `decide` only looked for known kinds of incompleteness (a stop, cases
   never started, unavailable, unjudged), so "nothing answered" and "ten
   judgements on one response" fell through to the pass branch. Fix
   (`tests/eval/outcome.ts`): the pass conditions are stated positively in
   `incompleteness` — started, completed, answered and judged all equal to
   expected, no unavailable, no stop — and the tally gains
   `responses: { needed, accounted }`, filled by each harness with its own
   arithmetic (Guide: two per case; judgment: two per calibration pair, two
   per Guide text, one per script; a judge-only text that is judged counts
   as answered). A pass needs `accounted === needed`, and `validateOutcome`
   refuses `accounted > succeeded`, `answered > succeeded` and
   `judged > succeeded` outright. A catch-all names the fields that disagree
   when no branch above described the tally. Regression: "regression (review
   of 551b62e)…" in `tests/eval/outcome.test.ts`, with the exact tally, plus
   "every pass condition is stated positively…" which flips each field of a
   complete run in turn.
2. **A pass needed no report.** A full passing tally with `report: null`
   validated, and `verdict` said ok. Fix: `Outcome.report` is the report's
   file name (`live-<time>.json`, matched by `REPORT_NAME`, never a path), an
   `evaluated-pass` must name one, `not-required` may not, and a run that
   started nothing may not. At the filesystem boundary `readOutcome`
   (`tests/eval/artifacts.ts`) resolves the name inside the suite's own
   results directory and requires the file to exist, parse, carry
   `suite` and the outcome's `at`, and recount row by row (`recount`, the
   same function the harnesses now use to write the tally in the first
   place) to the recorded numbers; any difference is named. `verdict` also
   refuses a required pass with no report. Both reports gained `suite`;
   the judgment report gained `intended: { pairs, guide, scripts }` so its
   response arithmetic can be recomputed; the outcome's `at` is the
   report's. Regressions: `tests/eval/workflow.test.ts` ("a pass is believed
   only with its report behind it…": missing, not JSON, another suite's,
   another run's, a row dropped, a count changed, a malformed row list, a
   path in place of a name, `report: null`; both suites' arithmetic),
   `tests/eval/outcome.test.ts` (the validation branches), and a real
   stand-in run read back through `readOutcome` with its report then
   tampered (`tests/guide-eval-live.test.ts`).
3. **`package-lock.json` required neither suite.** Fix: it requires both,
   conservatively (`REQUIRES`, via the shared list). Regression: the
   applicability tests name it among the paths that require both.

## What B1 built (unchanged by the repair except as noted above)

The full account is `docs/GUIDE-EVAL.md`, "Outcomes". In short:

1. **A shared layer, `tests/eval/`.** `outcome.ts` (pure, no imports: the
   four outcomes, the tally, `decide`, `recount`, `validateOutcome`,
   `REQUIRES` / `NOT_MEASURED`, `applicability`, `verdict`); `session.ts`
   (every request counted; failures classified as auth / billing / model /
   transient / other; transient retried three attempts with backoff; fatal
   stops the run; keys redacted); `artifacts.ts` (the two outcome files on
   disk, and the report behind each); `check.ts` (the workflow's
   `applicability` and `verdict` commands, run under plain Node before
   `npm ci`); `stand-in.ts` (SDK error classes for the tests).
2. **Both harnesses on that layer.** `tests/guide-eval/live.ts` has
   `guideSuite` — the whole run, files included — and a report with
   `expected`, `started`, `requests`, `succeeded`, `stopped`, `errors`, and
   a `source` per case of `live` / `declined` / `unavailable`.
   `tests/judgment/live.ts`: `runJudgment` and `judgmentSuite`, calibration
   first and a stop when the judge fails it, then the themed cases, the
   held-out set and the unjudged scripts, `width` at a time. The two live
   test files are thin: with the `*_LIVE=1` flag and no key they record
   `not-evaluated` and fail.
3. **The workflow.** Runs on every PR; the first step diffs against the PR's
   base and classifies; `npm ci` and each suite run only when required; the
   judgment step reads the Guide's outcome and sends nothing after a fatal
   stop; the last step always runs and fails closed. `workflow_dispatch`
   takes `suites` (both / guide / judgment). The `grep "credit balance"` →
   `exit 0` workaround is gone, and `tests/eval/workflow.test.ts` fails if it
   comes back.
4. **Baselines.** Written only by a run that is `evaluated-pass`
   (`UPDATE_GUIDE_BASELINE=1`, `UPDATE_JUDGMENT_BASELINE=1`,
   `UPDATE_JUDGMENT_LOCK=1` likewise). No live baseline exists yet. **No
   quality threshold changed.**

### Required / not-required, as built

| Changed path | Guide | Judgment |
|---|---|---|
| `.github/workflows/guide-eval.yml`, `package.json`, `package-lock.json`, `tests/eval/` | required | required |
| `netlify/functions/guide.ts`, `netlify/shared/prompt.ts`, `netlify/shared/vocab.ts` | required | required |
| `src/lib/coach.ts`, `src/data/coach.ts`, `tests/voice-rules.ts` | required | required |
| `tests/guide-eval/cases.ts`, `graders.ts`, `judge.ts` | required | required |
| `tests/guide-eval-live.test.ts`; the rest of `tests/guide-eval/` | required | — |
| `tests/judgment-live.test.ts`; `tests/judgment/` | — | required |
| `src/data/read.ts`, `beforeYes.ts`, `eleven.ts`, `families.ts` | — | required |
| anything else (including `netlify/shared/{body,counter,day,founder,limit,ops,secret}.ts`, imported by the handler and never read by `guideRequest`) | not-required | not-required |

A manual run is required for the suites chosen. The rules are held to the
suites' real import graphs by `tests/eval/outcome.test.ts`.

## Verification, as it actually ran (repair session)

| Check | Result |
|---|---|
| `npm run verify > log 2>&1; echo $?` | exit 0; 108 test files, 1500 passed, 2 skipped (the two live blocks) |
| `npm run build` | exit 0 |
| Deterministic eval tests (`tests/eval/*.test.ts`, the stand-in blocks of both live test files) | 91 passed, 2 skipped (the live blocks: `GUIDE_EVAL_LIVE` and `JUDGMENT_LIVE` unset, no key in the session) |
| Paid evaluation | **none**. No `ANTHROPIC_API_KEY` in the environment; the live blocks skip without the `*_LIVE=1` flags; the stand-in tests never construct an SDK client |
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
- **The report is recounted, not re-graded.** The check proves the outcome's
  numbers are the report's numbers; it does not re-run the graders or the
  regression comparison over the report's answers. A harness that graded
  wrongly would still be believed on its gates.
- **Every PR now runs the classify step** (checkout, setup-node, a diff, no
  install): a runner minute or so per PR on unrelated changes, in exchange
  for a check that exists for every PR.
- **A PR touching the Guide with no key is red**, where it used to be green
  with a warning. That is the design: `not-evaluated` is not a pass.
- **Any lockfile change requires both paid suites**, an SDK bump or not.
  That is the conservative rule chosen over a diff reader.
- **A transient failure that persists spends up to three attempts per
  request** and lets the run continue on other cases; a whole outage is
  therefore a run of `unavailable` cases rather than an early stop. Only
  auth, billing and an unknown model stop the run outright.
- **The two suites share one key and one account** (or not — founder input
  still open); the second suite reads the first's fatal stop and sends
  nothing, but a billing failure that begins during the second suite is
  found by the second suite's own first request.
- `docs/DECISIONS.md` and `docs/SECURITY.md` were not touched.

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
