# Session handoff — BATCH-01, Group A and its repair

Written 2026-09-27. Two sessions on one branch: the one that built Group A
of `docs/BATCH-01-PLAN.md` (commits up to `3b987ee`), and the one that
repaired it after an independent review reproduced two failures against
`3b987ee`. Read the plan for the findings and the decisions; this file says
what was done, what was checked, and what is left. **Group B has not been
started.** The next task is review of the repair, not Group B.

## Commits

| What | Commit |
|---|---|
| Base (branch head at the start, tree-identical to `origin/main` `cdcd187`) | `261d055` |
| The consolidated plan, `docs/BATCH-01-PLAN.md` | `344fc99` |
| Group A: signup reliability, recovery, dates, adult gate, copy, address | `ed5c53e` |
| Group A handoff | `3b987ee` |
| The repair, first pass (marker authority, refused receipt, no production write) | `5dedfe3` |
| The repair, second pass (immutable dated marker keys) | the commit after `5dedfe3` (see `git log`) |

Branch: `claude/hello-gr0hoz`, pushed. **No pull request was opened, nothing
was merged, nothing was deployed, no paid evaluation ran, no outreach was
sent.** Netlify builds `main` only; `verify.yml` runs on pull requests and on
pushes to `main`; `guide-eval.yml` runs on pull requests that touch its
paths. A push to this branch therefore triggers no build, no deploy and no
paid evaluation.

## The repair (2026-09-27, after `3b987ee`)

Four items from the review, each with the failure as reproduced, the cause,
the fix, and the regression that now fails without it. `docs/BATCH-01-PLAN.md`
§6 has the same in a table; `docs/DECISIONS.md` Part 24, "Repair", records
the decisions.

1. **Signup with denied browser storage lost the receipt.** Reproduced: with
   `getItem` answering null and `setItem` throwing, `registerInterest`
   succeeded and the server held the record; `forgetMe` in the same session
   returned `intro: true` and the record stayed. Cause: `rememberIntro`
   swallowed the throw and `forgetPending` then cleared the page's only copy
   of the code, so `rememberedIntro` (which read only `localStorage`) had
   nothing to give Forget me. Fix (`src/lib/introduce.ts`, `forget.ts`,
   `Looking.tsx`, `Home.tsx`): the page keeps the receipt in memory with
   `kept: false` when storage refuses it; `rememberedIntro` falls back to
   it; `withdrawInterest`, `clearEverything` and a reload clear it; the
   receipt and Home's card say that a reload is the limit and show the
   code. Regressions: `src/lib/introduce.test.ts` (the exact reproduction,
   asserting the server record is gone) and `tests/journeys/looking.test.tsx`
   ("a browser that cannot hold the receipt…": signup, Back, through the
   door again, Trust, Forget me through the screen, the record gone).
2. **A withdrawal followed by a late write whose cleanup failed was undone.**
   Reproduced: a `DELETE` interleaved just before the request's `setJSON`,
   then the request's own `delete` of the record failing; the POST answered
   503, marker and record both stayed, the founder's `GET` showed the
   person, and the sweep would have removed the marker after two days and
   the record after 180. Fix (`netlify/functions/introduce.ts`, `sweep.ts`):
   the marker is the authority. `GET` excludes and counts (`withdrawn`) any
   record under a marker; a POST that finds a marker answers 410 and tries
   the delete again, and still answers 410 (counted in `fail.introduce`) if
   that fails; the sweep deletes any record under a marker first, on any
   run, and the marker only after; a failed record delete keeps the marker
   as evidence. `Swept` gained `withdrawn`.
   **Second pass (commit after `5dedfe3`).** The first pass kept one marker
   key per code, rewrote its day on each withdrawal, and removed it by
   reading it and then calling `deleteIfUnchanged` — a `getMetadata` and an
   unconditional `delete`, because Netlify Blobs has no conditional delete
   (`delete(key)` takes no version; verified in the installed
   `@netlify/blobs` 11.0.3). The review reproduced a withdrawal landing
   between those two calls: the sweep deleted the fresh marker and a request
   under the code then answered 200. Markers are now
   `withdrawn/<code>/<day>`, one immutable key per code per day, written
   `onlyIfNew`, never rewritten; the sweep removes a marker only by the day
   in its own key, so removing an old one cannot touch a withdrawal that
   landed meanwhile, at any point in the run; the POST's check is a `list`
   by the code's prefix on the strong store (the SDK's `list` inherits the
   store's consistency). "At least two days" is now literal: a key's day
   must be strictly more than `WITHDRAWN_DAYS` behind the run's day.
   Regressions: `tests/introduce-residue.test.ts` (the sequence; the
   founder's list; a later sweep repairing; a retry refused; a failed delete
   while processing markers; a marker never removed before its record; two
   markers under one code; a same-day repeat; a withdrawal landing before
   the sweep's list; the review's interleaving, a withdrawal landing
   immediately before the sweep's delete of an old marker; undated marker
   keys). `tests/introduce-race.test.ts` hooks the list read instead of a
   get.
3. **The production `DELETE` in `deployed.yml` is removed.** `AAAAAAAA` is a
   valid code a person could hold, and the probe wrote a withdrawal marker
   in production on every deploy. Replaced by `/health`'s `introductions`
   check: a strong-consistency HEAD of `health-probe` (not a code shape) on
   the `introductions` store, behind the founder key, read by `watch.yml`
   within three hours and by hand at any time; it fails by the SDK's own
   name (`BlobsConsistencyError`) when the platform context lacks the
   uncached URL. `tests/blobs-consistency.test.ts` runs the installed
   `@netlify/blobs` against its own `BlobsServer` to pin that a strong read
   is served with an uncached URL and refused by name without one.
   `tests/deploy-layout.test.ts` now fails if any `curl` in `deployed.yml` or
   `watch.yml` is anything but a read. `deployed.yml` and `docs/OPS.md`
   describe the workflow as post-publication monitoring: Netlify has
   published before it runs, and it cannot stop a broken release.
4. **Retention and claims corrected.** A marker is kept at least two days
   (`WITHDRAWN_DAYS`) and removed by the first weekly sweep after that: two
   to eight days in practice, longer if a run fails or a record is still
   under it. "Nothing can be put under this code now" and "for two days" are
   gone from `Looking.tsx`, `Trust.tsx`, `introduce.ts`, `sweep.ts`,
   `PRIVACY`, `OPS`, `SECURITY`; the wording for a refused late request no
   longer claims the record is physically gone. A 503 on the POST is now
   `unsure` on the phone, since the write may have landed, and the pending
   code is kept for the retry.

## Completed in Group A (unchanged by the repair)

- **Server** (`netlify/functions/introduce.ts`, `sweep.ts`): the phone's code
  is accepted and written `onlyIfNew`; the same request is answered
  `again: true` with the record's original `at` and `removeOn`; a different
  request under an existing code is refused (409), never written over;
  `adult: true` required and stored, a body without it fails closed;
  `removeOn` is the Sunday on or before `at + 180 d`, used by the founder's
  list and the sweep; the `introductions` store is opened
  `consistency: 'strong'`.
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
- **Docs**: `PRIVACY`, `OPS` (including "Updating an installed app"),
  `PRODUCT`, `SECURITY`, `DECISIONS` (36–38, Part 24), `TESTING`, `README`.

## Verification, as it actually ran (repair session)

| Check | Result |
|---|---|
| `npm run verify > log 2>&1; echo $?` (typecheck, lint, 105 test files) | First pass: exit 0; 1417 passed, 2 skipped. Second pass: exit 0; 1420 passed, 2 skipped (the two live suites, no key). Three new files: `tests/introduce-residue.test.ts`, `tests/blobs-consistency.test.ts`, `src/lib/introduce.test.ts` |
| `npm run build` | exit 0, both passes |
| Immutable marker keys against the real Blobs server | The second pass's walk wrote `withdrawn/<code>/<day>` keys through the installed SDK to the package's own `BlobsServer`; nested keys are accepted and listed by prefix |
| Chromium, 390×844, production build, real handlers, local `BlobsServer` with `edgeURL` = `uncachedEdgeURL`, synthetic data, isolated contexts | 11 of 11 on both passes: with `setItem` refusing `niyyah.intro*`, the receipt shows the code and names the limit ("closed or reloaded"), nothing is in storage, no horizontal overflow, the founder list holds one; Back and through the door again shows the receipt; Trust → Forget me → "Yes, delete everything" empties the founder list and the code then finds nothing; a typed code on another phone takes a name off and the same code again gives the bounded wording, no overflow; `/health` with the key reports the `introductions` strong read ok |
| Strong read against a real Blobs endpoint | `tests/blobs-consistency.test.ts`, against the package's own server, in every `verify`. Production's context is still not verifiable from a session; `/health`'s `introductions` check is what reads it |

## Limitations that remain

- **Production strong reads are unverified from a session.** The
  `introductions` check on `/health` reads them; `watch.yml` runs it every
  three hours, and the founder can run it by hand with the key after a
  deploy of `main`. A red check means every request to `/introduce` is a
  503; the rollback is in `docs/OPS.md`.
- **A refused browser loses the receipt on reload.** The page holds it until
  then; the screen shows the code and says so. There is no way around this
  without storage, and no claim is made otherwise.
- **Cross-tab guarantee is bounded.** Two tabs share the pending code and the
  receipt through `localStorage`; when storage is refused, the guarantee
  holds within one page only, and two tabs can make two records.
- **Code reuse is prevented for the marker's days, not for ever.** After the
  last marker under a code is swept, a request under the same code would be
  a new record; the phone forgets a withdrawn pending code on 410, so this
  needs a person to send the same code again days later.
- **`deleteIfUnchanged` is not atomic** and is not described as such: a
  `getMetadata` then an unconditional `delete`, with the gap its own comment
  names. The maps sweep still uses it and accepts that gap for lapsed maps.
  The introduction list no longer uses it anywhere.
- **An old cached page** sends no `adult` and is refused with a sentence it
  already had ("Something in the form did not fit"); it cannot be told more.
  The fix is to reopen the app (`docs/OPS.md`, "Updating an installed app").
- **A guessed-code DELETE writes a marker** (a day, nobody), bounded by the
  forget cap and swept with the rest.
- **The phone's clock** decides only when the receipt says the scheduled day
  has passed; the code is kept until the person or Forget me clears it.
- `VITE_OPERATOR_NAME` is unset in production as far as this session can
  tell, so Looking and Trust say "its founder".

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
`CLAUDE.md` outreach wording. `docs/BATCH-01-PLAN.md` §7.

## The exact next task

Review of this repair. Then, if accepted, Group B of
`docs/BATCH-01-PLAN.md`, starting with the evaluation outcomes
(`tests/guide-eval/live.ts`, `tests/guide-eval-live.test.ts`,
`tests/judgment-live.test.ts`, `.github/workflows/guide-eval.yml`), using
deterministic stand-in clients and no paid run.
