# Session handoff — BATCH-01, Group A

Written 2026-09-27 at the end of the session that built Group A of
`docs/BATCH-01-PLAN.md`. Read that file for the plan and the findings; this
one says what was done, what was checked, and what is left.

## Commits

| What | Commit |
|---|---|
| Base (branch head at the start, tree-identical to `origin/main` `cdcd187`) | `261d055` |
| The consolidated plan, `docs/BATCH-01-PLAN.md` | `344fc99` |
| Group A: signup reliability, recovery, dates, adult gate, copy, address | `ed5c53e` |
| This handoff | the commit after `ed5c53e` (see `git log`) |

Branch: `claude/hello-gr0hoz`, pushed. **No pull request was opened, nothing
was merged, nothing was deployed.** Netlify builds `main` only; `verify.yml`
runs on pull requests and on pushes to `main`; `guide-eval.yml` runs on pull
requests that touch its paths. A push to this branch therefore triggers no
build, no deploy and no paid evaluation.

## Completed

- **Server** (`netlify/functions/introduce.ts`, `sweep.ts`): the phone's code
  is accepted and written `onlyIfNew`; the same request is answered
  `again: true` with the record's original `at` and `removeOn`; a different
  request under an existing code is refused (409), never written over;
  `DELETE` writes `withdrawn/<code>` (a day, nobody) before deleting, and a
  late POST that finds the marker refuses (410) and removes what it wrote;
  `adult: true` required and stored, a body without it fails closed;
  `removeOn` is the Sunday on or before `at + 180 d`, used by the founder's
  list and the sweep; the `introductions` store is opened
  `consistency: 'strong'`; markers are swept after two days.
- **Client** (`src/lib/introduce.ts`, `forget.ts`): the pending attempt
  (`niyyah.intro.pending.v1`: code and day, never the contact; a page mirror
  when storage refuses); the receipt with server dates; legacy receipts kept
  apart and labelled; a retry under the receipt's code when another tab was
  answered first; withdrawal as removed / nothing / failed; Forget me deletes
  the pending code too and carries it in the pending forget.
- **Screens** (`Looking.tsx`, `Home.tsx`, `Welcome.tsx`, `Trust.tsx`;
  `src/lib/entry.ts`, `App.tsx`): the disclosures before the button; the
  unsure panel that retries the same request; the "earlier try went through"
  choice; the code shown when the browser cannot hold it; the receipt ("Your
  request was saved on…", "scheduled to be removed on…"); the
  past-scheduled state that keeps the code; taking a name off by a typed
  code; `/?looking` held in the bar, `via` never re-added.
- **Deploy smoke** (`deployed.yml`): takes an unused code off the list, which
  is the strong-consistency read; a 503 there means the platform context
  lacks the uncached URL the SDK needs.
- **Docs**: `PRIVACY`, `OPS` (including "Updating an installed app"),
  `PRODUCT`, `SECURITY`, `DECISIONS` (36–38, Part 24), `TESTING`, `README`.

## Verification, as it actually ran

| Check | Result |
|---|---|
| `npm run verify` (typecheck, lint, 102 test files) | exit 0; 1397 passed, 2 skipped (the two live suites, no key) |
| `npm run build` | exit 0 |
| Chromium walk, 390×844, production build, real handlers, local `BlobsServer` with `edgeURL` = `uncachedEdgeURL`, synthetic data, isolated contexts | 23 of 23 checks passed: disclosures in order before the button; no horizontal overflow on the form, the receipt, the code field and Home; every input labelled; the checkbox toggles by keyboard; receipt with two dates and no "is down"; founder list shows one person with `removeOn` and `adult`; take-off empties the list; `/?looking` on the screen, `/` after Back, `/?looking` on a reload with `via` dropped; a code typed on another phone takes the name off and the same code again finds nothing; a browser that refuses storage is shown the code, the retry is saved once, and the receipt shows the code; Home shows the receipt |
| Strong read against a real Blobs endpoint | The local `BlobsServer` answered the strong-path `DELETE` with `{removed: false}`. Production's context is not verifiable from this session; the deploy smoke test now checks it on the first deploy of `main` |

Tests added or rewritten: `tests/introduce-race.test.ts` (six interleavings
and the strong-open check), `tests/introduce-function.test.ts`,
`tests/sweep-function.test.ts`, `tests/vocab-sync.test.ts`,
`tests/journeys/looking.test.tsx` (lost answer, retry dates, edited input,
storage denial and recovery, two tabs, delayed request vs Forget me and vs a
typed-code withdrawal, legacy receipt, past-scheduled and the sweep, Home,
the address), `src/lib/forget.test.ts`, `src/lib/links.test.ts`,
`tests/service-worker.test.ts`, the fixtures in `caps-function`,
`record-version` and `delete-means-deleted`. Test support gained
`server.lose()`, `server.hold()`, `Phone.refuse()`, `blobs.opened`, and an
`nth` for `blobs.before()`.

## Limitations that remain

- **Production strong reads are unverified until the next deploy of `main`.**
  The SDK throws `BlobsConsistencyError` if the function's
  `NETLIFY_BLOBS_CONTEXT` has no `uncachedEdgeURL`; the route would then
  answer 503 on every request. The smoke test in `deployed.yml` fails the
  deploy check if so; the rollback is in `docs/OPS.md`.
- **Cross-tab guarantee is bounded.** Two tabs share the pending code and the
  receipt through `localStorage`; when storage is refused, the guarantee
  holds within one page only, and two tabs can make two records.
- **An old cached page** sends no `adult` and is refused with a sentence it
  already had ("Something in the form did not fit"); it cannot be told more.
  The fix is to reopen the app (`docs/OPS.md`, "Updating an installed app").
- **A guessed-code DELETE writes a marker** (a day, nobody), bounded by the
  forget cap and swept after two days.
- **The phone's clock** decides only when the receipt says the scheduled day
  has passed; the code is kept until the person or Forget me clears it.
- `VITE_OPERATOR_NAME` is unset in production as far as this session can
  tell, so Looking and Trust say "its founder".
- The first walk screenshot was taken during the entry animation and is
  blank; the later screenshots show the screens. Screenshots are in the
  session scratchpad, not committed.

## Deferred: Group B (not started)

Evaluation outcomes (offline vs live, required vs not-required, stop on fatal
auth or billing errors, structured outcome, full coverage, no log grep);
operational and documentary accuracy (T20, R4, C7, the OPS "Deleted data"
row reworded to unverified; the five form rows as observed submissions; no
health counts for the held stores); outreach bookkeeping (the seven states,
historical rows kept uncertain, the `CLAUDE.md` wording only on the founder's
word). `docs/BATCH-01-PLAN.md` §4.

## Founder input still open

The held stores (the 2026-09-27 sweep log, the Blobs listing, which form rows
are tests); `VITE_OPERATOR_NAME`; whether the eval and production Anthropic
keys share an account; whether `guide-eval` is a required check; the
`CLAUDE.md` outreach wording. `docs/BATCH-01-PLAN.md` §6.

## The exact next task

Group B of `docs/BATCH-01-PLAN.md`, starting with the evaluation outcomes
(`tests/guide-eval/live.ts`, `tests/guide-eval-live.test.ts`,
`tests/judgment-live.test.ts`, `.github/workflows/guide-eval.yml`), using
deterministic stand-in clients and no paid run. Then the documentary
corrections, then the outreach ledger once the founder has answered on the
`CLAUDE.md` wording.
