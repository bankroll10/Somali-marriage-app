# BATCH-01 — the introduction path made truthful, end to end

The consolidated implementation plan for the batch that answers the external
review of `main` at `cdcd187` (2026-09-27). Section 1 is the record of what
was found; sections 2–5 are the operative decisions and the work. Where an
earlier draft of this plan said something different, the earlier text is not
reproduced here: what is written below is what is built.

Product direction, unchanged: Niyyah helps serious Somali singles meet, learn
about each other and decide about marriage. The introduction path and the
tools for people already considering someone are both kept. Minneapolis–St.
Paul is the first introduction pilot. Manual facilitation is the first
operating experiment; whether people accept it, and whether it scales, is
still to be tested. M0, M1 and M2 stand (`docs/OPS.md`). Nothing in this
batch restores matching machinery or adds payments, profiles, photos, chat,
compatibility scores or automatic pairing.

## 0. Base

| Fact | Value |
|---|---|
| Base commit | `261d055` on `claude/hello-gr0hoz`, tree-identical to `origin/main` at `cdcd187` (the merge of PR #83) |
| Production at planning time | Netlify site `getniyyah` → joinniyyah.com, deploy built from `cdcd187`, published 2026-09-27 13:51 UTC; `sweep` scheduled `@weekly` |
| Working branch | `claude/hello-gr0hoz`. Commits collect here; no pull request until the founder says "PR + merge" (`CLAUDE.md`) |
| Preserved, untouched | Local `main` (stale at `1b63c1f`), the other remote `claude/*` branches |

## 1. Findings (historical record)

Evidence kinds: **code** (read in the tree), **observed** (a tool answered),
**user evidence** (dated, from a person), **hypothesis** (unverified).

1. **Duplicate on retry — confirmed (code).** No idempotency key; the server
   minted a fresh code per POST (`introduce.ts:218` at base). A response lost
   after the write showed "nothing is saved" (`Looking.tsx:135` at base) and
   the retry it invited wrote a second record the phone could never withdraw.
   A refused `localStorage` write was swallowed; the code was gone on reload.
2. **Sweep before the phone — confirmed (code).** The sweep removed a name at
   the last Sunday in days 173–179; the phone said "Your name is down" until
   day 180, from its own clock. Founder removals were never reflected.
3. **18+ client-only — confirmed (code).** The checkbox gated the button; no
   field was sent or validated; a direct POST needed no affirmation.
4. **Held stores and the five form rows — partly confirmed.** *Code:* the
   unconditional delete of `cohort`, `contacts`, `vouches` was on `main` from
   2026-09-24 05:35 to 2026-09-27 13:49 UTC, covering the 2026-09-27 00:00
   UTC scheduled slot. *Observed:* Netlify Forms lists `niyyah-waitlist`
   with 5 submissions (created 2026-08-29, last 2026-09-22 01:13 UTC); no
   code has ever read or deleted a submission. *Unverified:* whether that
   run executed, what it deleted, the submissions' contents, and how many
   distinct people they are. Four doc lines asserted the deletion as fact
   while Part 22 said unverified (Group B).
5. **Eval run 36301150451 — confirmed (code) and observed.** The workflow
   grepped the log for "credit balance is too low" and exited 0; the run's
   two live steps both failed on that error and the job reads `success`
   with no artifacts (Group B).
6. **Copy and address — confirmed (code).** Before the button the screen
   did not name the operator, the reference step, the summary step, the
   contact-release rule or the pilot's eligibility; `?looking` was stripped
   at mount and never restored, so the bar showed `/` on the screen.
7. **Outreach ledger — confirmed (docs).** 12 of 13 rows read "sent" with no
   delivery evidence in the file; the rule that a draft counts as sent is in
   `CLAUDE.md` (Group B).

## 2. Accepted decisions (operative)

- **D1. One record per retained code.** The phone mints the record's code
  before the request and sends it. The server writes with `onlyIfNew`. A
  second POST under the same code with the same fields is answered
  `again: true` with the record's own dates. Different fields under the same
  code is `409 taken`, never an overwrite. The guarantee is *per code*: two
  codes, or two phones, are two records; when browser storage is refused the
  guarantee holds within one page only. The contact is never indexed and
  never written to the browser; the pending record is `{code, at}` alone.
- **D2. Withdrawal is durable, and the marker is the authority.** `DELETE
  ?code=` writes `withdrawn/<code>` (the day of the latest withdrawal,
  nothing else; rewritten on every withdrawal) before deleting the record.
  A POST that finds the marker answers `410 withdrawn` and deletes whatever
  is under the code if it can; if it cannot, the answer is still 410 and
  the failure is counted. A record under a marked code — left by a delete
  that failed after the withdrawal was answered — is excluded from the
  founder's `GET` and its counts (reported as `withdrawn`), refused on
  retry, and deleted by the sweep on any run before the marker. The marker
  is kept **at least two days** (`WITHDRAWN_DAYS`) and removed by the first
  weekly sweep after that, once nothing is under it and only if no
  withdrawal rewrote it since it was read: two to eight days in practice,
  longer if a run fails. Reuse of a code is prevented for the marker's
  days, not for ever; no copy says "never". (Repaired 2026-09-27, §6.)
- **D3. One removal day.** `removeOn(at)` is the Sunday 00:00 UTC on or
  before `at + 180 days` — the day the weekly sweep runs. The server, the
  founder's list and the sweep use it; the phone shows the server's copy.
  Three states are kept apart: *scheduled* (the date shown), *excluded from
  the founder's active list* (on and after that day), *physically deleted*
  (the sweep on that day; a failed run is caught by `/health` and the record
  goes the next Sunday). Copy says "scheduled to be removed", never "removed".
- **D4. Server dates on the receipt.** Every save and every `again` returns
  the record's `at` and `removeOn`. The phone stores those. A retry cannot
  extend retention because the record is never rewritten. A receipt written
  before this batch carries a phone-recorded day and is labelled as such.
  The phone never destroys a code on its own clock's say-so; withdrawal stays
  available until the person clears it or Forget me does.
- **D5. Adult affirmation on the wire.** New registrations require
  `adult: true`; the record stores the boolean and nothing about age. A body
  without it fails closed (`400 bad_adult`), including one from an old cached
  client. `DELETE` is unchanged, so every existing record stays withdrawable.
- **D6. Truthful copy, stable address.** Before the button: the operator,
  the current pilot's eligibility (as a pilot rule), the reference
  conversation the person agrees to, the approved summary, the
  contact-release rule scoped to a proposed introduction, and the scheduled
  removal. The receipt says "Your request was saved on {date}" and never
  asserts current membership from local storage. `/?looking` is held in the
  bar while on the screen; `via` is never re-added; no code enters a URL.
- **D7. Consistency.** The `introductions` store is opened with
  `consistency: 'strong'` (the installed `@netlify/blobs` 11.0.3 exposes
  `ConsistencyMode = 'eventual' | 'strong'`; the package README describes
  edge reads as eventually consistent with up to 60 s of drift). The
  conflict read, the withdrawal marker checks and the delete's existence
  check depend on the latest state, so none of them uses the eventual path.
  The in-memory test stores model conditional writes; they do not prove
  production consistency, which is why the mode is set explicitly.
  `tests/blobs-consistency.test.ts` runs the installed SDK against its own
  `BlobsServer`: a strong read is served with an uncached URL and refused by
  name (`BlobsConsistencyError`) without one. Production's context is read
  by `/health`'s `introductions` check (a HEAD of a key that cannot be a
  code, behind the founder key), never by a workflow write (§6).
- **D8. A receipt the browser refuses is still the page's.** When
  `localStorage` refuses the receipt, `src/lib/introduce.ts` keeps it in
  memory with `kept: false`; `rememberedIntro` answers from there, so Home,
  "Take my name off" and Forget me work within the page; `clearEverything`
  and a reload clear it. The screen shows the code once and says a reload
  is the limit. No contact is ever in the page copy. (Repaired 2026-09-27,
  §7.)

## 3. Group A — built in this batch

Commit order, each leaving `npm run verify` green:

1. **Server.** `netlify/functions/introduce.ts`: `removeOn`; optional client
   `code`; `adult` required and stored; `withdrawn/` markers; strong reads;
   `at` and `removeOn` in every save. `netlify/functions/sweep.ts`: removes a
   name on and after `removeOn`; records under a marker on any run, then the
   marker once at least two days old (D2). Tests: `introduce-function`,
   `sweep-function`, `vocab-sync`, `introduce-residue`.
2. **Client library.** `src/lib/introduce.ts`: pending code held before the
   request (storage best-effort, module mirror for the session), receipt with
   server dates, legacy receipt kept apart, `withdrawInterest` reporting
   removed / nothing / failed / unreachable; `src/lib/forget.ts`: the pending
   code deleted too and carried in the pending forget.
3. **Screens.** `Looking.tsx`: disclosures before the button, the uncertain
   panel (retry the same submission, or take it off), the "earlier attempt
   went through with different details" panel, the storage-refused code
   display, the receipt, the past-scheduled-removal state, the code-entry
   withdrawal; `Home.tsx` card; `Welcome.tsx` door line; `Trust.tsx`
   disclosure; `src/lib/entry.ts` + `App.tsx` for `/?looking`.
4. **Journeys and UI tests** (`tests/journeys/looking.test.tsx`,
   `tests/ui/screens.test.tsx`, `tests/invariants/*`): the list in §5.
5. **Docs** in the same commits as the code they describe.

### Acceptance criteria

- **P1 signup:** two submits of one unchanged form, under any failure order,
  leave one record with one `at`; an ambiguous answer leaves the form filled
  and offers the same submission again under the same code; an edited form
  after an ambiguous answer never overwrites a landed record (409 → a choice,
  not a write); a refused `localStorage` shows the code when an attempt may
  have saved; no contact in browser storage; no code in logs, URLs or
  committed fixtures.
- **P2 dates:** the receipt shows the server's `at` and `removeOn`; `again`
  returns the original dates; phone, founder list and sweep agree on
  `removeOn`; a legacy receipt is labelled as the phone's own record; a code
  is never discarded on the device clock alone.
- **P3 withdrawal:** two concurrent POSTs under one code leave one record and
  both answers carry the same dates; a DELETE that runs before a delayed POST
  lands leaves no record afterwards; Forget me with a pending code leaves
  nothing under it; a record left under a marker by a failed delete is off
  the founder's list and counts, refused on retry, and removed by the sweep
  before the marker; a failed sweep delete keeps the marker; a repeated
  withdrawal refreshes the marker and is never undone by an older read.
- **P8 refused storage:** with `setItem` throwing, a saved request's receipt
  is held by the page; Forget me in the same session removes the server
  record; a reload loses the page copy and the screen has said so.
- **P9 no production writes from monitoring:** every `curl` in
  `deployed.yml` and `watch.yml` is a read; `/health` reads the introduction
  list strong for a key that cannot be a code and writes nothing.
- **P4 adult:** a body without `adult: true` stores nothing (legacy shape
  included); `DELETE` works for records with and without `adult`.
- **P5 copy and address:** the disclosures appear before the button in order;
  `location.search === '?looking'` on the screen, `''` after Back; reload on
  `/?looking` lands on the form; every pinned link still opens the same thing;
  no banned phrase (`tests/voice.test.ts`).

## 4. Group B — deferred, not started

- Evaluation outcomes: separate offline verification from live evaluation;
  required vs not-required live runs; stop on fatal auth or billing errors,
  keep partial results, always write a structured outcome; pass only on full
  coverage including judging; no log grep; deterministic stand-ins.
- Operational and documentary accuracy: reword `docs/SECURITY.md` T20,
  `docs/PRIVACY.md` R4 and C7, `docs/OPS.md` ("Deleted data") to unverified;
  the five form rows as observed submissions; no health counts for the held
  stores.
- Outreach bookkeeping: drafted / sent (founder-reported, date) / sent
  (confirmed) / replied / placed / declined / no response; historical rows
  keep their uncertainty; `CLAUDE.md` wording changes only on the founder's
  word; no Markdown-ledger test.

## 5. Verification

- `npm run verify > log 2>&1; echo $?` → 0 before every commit.
- `npm run build` → 0; a Chromium walk at 390×844 over the production build
  with the real handlers on the in-memory store and synthetic data.
- Journeys: response lost after a successful write; retry returning the
  original record and dates; edited input after an ambiguous result; storage
  denial and usable recovery; simultaneous requests under one code and the
  cross-tab case; a delayed signup racing withdrawal and Forget me; legacy
  receipts and legacy request bodies; expiry boundaries; the Looking
  address on reload and navigation.
- No paid evaluation runs. Nothing is deployed. Pushing this branch builds
  nothing on Netlify (only `main` deploys) and triggers `guide-eval.yml`
  only on a pull request touching its paths, which this batch does not open.

## 6. Repair of 2026-09-27 (before Group B)

An independent review of `3b987ee` reproduced two failures with
`tests/support/blobs.ts` and a refusing `localStorage`, and named two
untrue claims. All four are fixed on the branch; Group B is still not
started.

| # | Reproduced | Cause | Fix | Regression |
|---|---|---|---|---|
| 1 | Storage refused; `registerInterest` saved; `forgetMe` returned `intro: true`; the record stayed | `rememberIntro` swallowed the `setItem` throw and `forgetPending` cleared the page's copy, so nothing held the code | D8: the page keeps the receipt (`kept: false`); `rememberedIntro` falls back to it; `clearEverything` and a reload clear it; the screen names the limit | `src/lib/introduce.test.ts`; `tests/journeys/looking.test.tsx` ("a browser that cannot hold the receipt…") — the server record is asserted gone |
| 2 | `DELETE` just before the request's `setJSON`, then the request's cleanup `delete` fails: 503, marker and record both stay, `GET` showed the person, the sweep kept the record 180 days | The marker was a race guard, not an authority: `GET` skipped only marker keys; the sweep judged records by their own `at` and removed markers first | D2 as repaired: `GET` excludes and counts records under a marker; the request answers 410 and retries the delete; `DELETE` rewrites the marker's day; the sweep deletes the record first and the marker after, only if unchanged | `tests/introduce-residue.test.ts` (the sequence, the later sweep, a failed delete while processing markers, repeated withdrawal near cleanup, a withdrawal racing the sweep's read) |
| 3 | `deployed.yml` sent `DELETE /introduce?code=AAAAAAAA` to production | A valid, unreserved code shape; a marker written on every deploy | Removed. `/health` `introductions` check (strong HEAD of `health-probe`, founder-keyed, read by `watch.yml`); `tests/blobs-consistency.test.ts` pins the SDK; `deployed.yml` described as post-publication monitoring | `tests/deploy-layout.test.ts` (no `-X DELETE/POST/PUT` in either workflow); `tests/ops.test.ts` (the check reads one key and writes nothing; fails by name) |
| 4 | "Markers live two days"; "nothing can be put under this code now" | The sweep is weekly; reuse is prevented only while the marker stands | Retention stated as at least two days, removed by the first weekly sweep after (two to eight days; longer on failure); absolute wording removed from `Looking.tsx`, `Trust.tsx`, `introduce.ts`, `PRIVACY`, `OPS`, `SECURITY` | — (copy; `tests/voice.test.ts` unchanged) |

Remaining limitation: production's Blobs context is still unverified from a
session; the `introductions` health check is the read that verifies it, on
the first `watch.yml` run after a deploy of `main`, or by hand with the key.

## 7. Founder input still open

1. The held stores: the 2026-09-27 sweep log, the Blobs listing, which form
   rows are tests. Nothing here decides their retention (decision 21).
2. `VITE_OPERATOR_NAME`: unset, Looking and Trust say "its founder".
3. Whether the eval and production Anthropic keys share an account or a
   spend limit; whether `guide-eval` is a required status check.
4. The `CLAUDE.md` outreach wording and the relabelling of historical rows.
