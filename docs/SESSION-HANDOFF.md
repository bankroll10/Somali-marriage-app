# Session handoff — BATCH-01 complete on the branch, release paused; BATCH-02A first-screen pass done

## Status as of the latest session (2026-09-30, BATCH-02A)

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
- **Left for later:** `public/og.png` still carries "What's in your way?" (so
  `OG_ALT` still matches it); the social card needs a new image.
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
