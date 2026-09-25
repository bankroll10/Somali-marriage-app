# Decisions

What was decided, when, why, and whether it still holds. Part 1 keeps the
board audit's numbered decisions with their numbers. Part 2 records the
subtraction of 2026-09-24. Part 3 is the completion review of the same day,
with decision 19, the product freeze. Part 4 is the Read, reviewed by an
outside critic. Part 5 is the commitment audit. Part 6 says where each of the
58 old docs went.

Every old doc's full text is in git at commit `43295a4`:
`git show 43295a4:docs/NAME.md`.

## Part 1: Decisions

Decisions 0–18 were made on 2026-09-12 in the board audit, which read the
code through MJ DeMarco's principles (Need, Entry, Control, Scale, Time and
others) and labelled every claim FACT, INFERENCE or HYPOTHESIS. The founder
asked that they not be delegated back. Decision 19 came from the completion
review of 2026-09-24 (Part 3), and decision 20 from the evidence pass the
same day. Code cites them as `decision N`. A
decision about a feature deleted on 2026-09-24 keeps its number and says so.

| # | Date | Decided | Why | Now |
|---|---|---|---|---|
| 0 | 2026-09-12 | **The free-year promise is bounded.** Everyone counted before her pool opened keeps every paid feature free for a year after it opens; a family's payment at the nikah and a guest's gift sit outside it (`src/data/plus.ts`) | As first written, the promise barred the concierge revenue test: the first ten couples could not pay, and the revenue answer would wait until year two | Retired 2026-09-24 with the feature. Trust's "What's free" carries three promises instead; the money rules are in `docs/PRODUCT.md` |
| 1 | 2026-09-12 | **The gate comes off with the first post** (the quiet launch): delete `PREVIEW_PASSWORD` and deploy; keep `noindex` and `robots.txt` until the first pool opens | Every share path handed a stranger a 401, and the roadmap's first item waited on a launch that needed the links posted first | Done by the founder on 2026-09-12. The `noindex` half was reversed on 2026-09-13 (the search pass). The edge gate stays as the close switch |
| 2 | 2026-09-12 | **The door promises the condition, not the number:** forty women and forty men who can each be introduced to someone. Count-me is offered to `preparing` members only | `COHORT_TARGET = 40` was shown as a contract while the opening checklist said forty did not open a pool | Retired 2026-09-24 with the feature |
| 3 | 2026-09-12 | **The ticket to the door is the short map:** the three answers the pool read (practice, children, non-negotiables), then age and a way to reach her; the sixteen questions after. A man is counted on the same terms | The most expensive instrument was the ticket to the marketplace, and the scarce side, a preparing man, met sixteen questions first | Retired 2026-09-24 with the feature |
| 4 | 2026-09-12 | **The men's instruments wait for ten men.** Nothing on his side is rewritten before ten men are asked what they need; the read's man-variant stays as it is. He is also counted, on decision 3's terms | No man had been asked. What the founder's walk found wrong was repaired; a rewrite on inference was not made | Stands for the instruments: no man has been asked yet. The "counted" half retired 2026-09-24 with the door |
| 5 | 2026-09-12 | **The repository goes private.** The founder's act | Public, it made every strategy doc, the readout routes, the cap defaults and the safety-queue design downloadable; a backup artifact on it can be downloaded by anyone signed in to GitHub | Open. Recorded done on 2026-09-12, but on 2026-09-24 the GitHub API reported the repository public. The monthly backup artifact waits on it (`.github/workflows/watch.yml`) |
| 6 | 2026-09-12 | **The playbook leads with the eleven,** the read in the same week; the via split settles which door people use | The lenses disagreed (Need: the read; Productocracy: the eleven), and the eleven is the sentence a stranger repeats | Stands. The wedge is in `docs/PRODUCT.md` |
| 7 | 2026-09-12 | **Twelve more cities are named** in `src/data/scenes.ts`: Seattle, San Diego, Birmingham, Bristol, Leicester, Gothenburg, Oslo, Copenhagen, Helsinki, Amsterdam, Nairobi, Melbourne. Each reads zero | A city not named before people arrive is recorded as `other` and cannot be re-placed later | Stands. A scene is the progress record's `scene` and picks the help line's country (`src/components/HelpLine.tsx`) |
| 8 | 2026-09-12 | **The hook has "Something else"** (`other`), so `none` means only skipped | A skip and "none of these fit" both arrived as `none`, so the rule that a closed list's `other` share tests the list had nothing to read | Stands (`src/data/hook.ts`) |
| 9 | 2026-09-12 | **Accounts and recovery are written down:** one table for 2FA, recovery codes, a second person, the registrar record and the Anthropic spend limit; rotate quarterly and on any new team member or tool. The founder fills it | One person held every login, with no 2FA record, no recovery codes, no second key-holder and an undocumented registrar | The table is in `docs/OPS.md`. The founder deferred it and 2FA ("later"); as of 2026-09-24 no spend limit is written down |
| 10 | 2026-09-12 | **Trust says a kept map lives with one vendor** and that the founder's backup does not include it, instead of building an encrypted dump now | The honest sentence costs nothing; the dump waits for records | Stands. The backup still omits kept maps (`netlify/functions/export.ts`). The Trust sentence went with the section on being counted in `0bd7e96` and was put back under "Keeping your map" in part B the same day |
| 11 | 2026-09-12 | **The learning loop's threshold splits:** a hundred records for weights, `consequence` and anything that changes a reading; twenty for script wording, order and labels | At a hundred records per row the loop turns in years; low-stakes constants can turn in months | Stands. The monthly loop is in `docs/RESEARCH.md` |
| 12 | 2026-09-12 | **The code stays six characters,** the restore link keeps the code in its URL (the link is the feature), and moving `GET/DELETE /keep` to a header is declined | Six is easy to read on a phone, the read caps were taken to bound enumeration, and the product controls no log that would hold the query string | Superseded in part on 2026-09-23: the caps bound the rate, not the fraction, so codes are minted at eight characters (`netlify/shared/code.ts`, `docs/SECURITY.md` O8). Six-character codes still work; the code stays in the restore link |
| 13 | 2026-09-12 | **The contact lives exactly as long as the map:** the pool's sweep deletes it with the lapsed entry, and Trust says so | Lapsed contacts, the only personal data the product held, were kept indefinitely | Retired 2026-09-24 with the feature. The sweep empties the `contacts` store (`netlify/functions/sweep.ts`) |
| 14 | 2026-09-12 | **The keep stays on the Reflection screen,** the moment the map completes | `Reflection.tsx` already offered it there, and `kept / mapped` (whether people trust the server with a map) is read from the first ten before anything moves | Stands (`KeepMap` on Reflection) |
| 15 | 2026-09-12 | **The guide gets one bit:** `facts.asked = ['guide']`, a set like `began`, which the readout crosses with `followed-through` | The guide is the one metered cost and was unmeasurable before an ending; with the bit, A3 reads in weeks, not years | Stands (`src/lib/facts.ts`, `netlify/functions/progress.ts`). A3 is in `docs/RESEARCH.md` |
| 16 | 2026-09-12 | **The $99 line is sold at the joint view** of the two-sided eleven, never at the stage she declares; `deciding` stays a free word | The joint view is when value has been delivered (both answered blind); `deciding` is a measured word and must not carry a price | Stands as a rule. Nothing is sold: there is no payment code. On 2026-09-24 the line was narrowed to the call alone, once per person for life (`docs/PRODUCT.md`) |
| 17 | 2026-09-12 | **The by-hand introduction is a one-page runbook,** with an hour-per-introduction limit that changes the target or the window if exceeded, and a timed pool-opened test mail | The first pool would be run by hand and no page said how | Retired 2026-09-24 with the feature. The runbook is at `git show 43295a4:docs/LIQUIDITY.md` |
| 18 | 2026-09-12 | **Somali-first stays.** The brand names the community; the institution rule (nothing that would need renaming for a second community lives outside `src/data`) holds for the brand strings | A second community should be a one-file change, and that day is not now | Stands (`src/data/brand.ts`; `tests/brand.test.ts` holds the manifest to it) |
| 19 | 2026-09-24 | **The product freeze.** No new feature without observed user evidence, a production failure, a safety or security requirement, or a measurable business requirement (Part 3) | The product is complete enough to learn from, with no members; the completion review found its three blockers where features had been added without anyone watching | Stands |
| 20 | 2026-09-24 | **Every relationship claim has a class.** Claims about people, relationships and Somali families are classed A–H in `docs/RESEARCH.md`, and the copy says no more than its class allows; the ledger lists each one, and `tests/voice.test.ts` keeps the patterns out | The copy said as fact what the research doc called assumed (the eleven as what breaks marriages), gave frequencies nobody had counted, and read a person's character from one reply | Stands. Man-only lines wait for decision 4; the live prompt waits for its first live eval |

### The top ten actions

The board audit ranked ten actions by expected impact. State on 2026-09-24:

| # | Action | State |
|---|---|---|
| 1 | Post the eleven, the read and the door to ten connectors; log the conversations | Recorded done 2026-09-12. The door part retired 2026-09-24. There were no members on 2026-09-24 |
| 2 | Give the read-first and eleven-first user a Home | Done (`src/lib/inferStage.ts`) |
| 3 | Decide the ticket to the door | Decision 3; retired 2026-09-24 with the feature |
| 4 | Make the customer list exportable | Done; retired 2026-09-24 with the `contacts` store |
| 5 | Flip the repository to private | Open (decision 5) |
| 6 | Truthful shares | Done: the married share claims the eleven only when she did them (`src/lib/ending.test.ts`) |
| 7 | Bound the guide before the gate comes off | Done: 32 KB body, 6,000-character thread, 2,048 output tokens (`netlify/functions/guide.ts`). The console spend limit is the founder's |
| 8 | The safety check and the monthly backup on a schedule | Done in `.github/workflows/watch.yml`: `/health`, waiting reports included, every three hours; the backup monthly once `BACKUP_TO_ARTIFACT` is set |
| 9 | Correct the money, and bound the free-year promise | Arithmetic done; the promise retired with Plus (decision 0) |
| 10 | Close the cheap irreversibles before member one | Done. `country` on the progress record was dropped again on 2026-09-24 |

### What the board audit fixed

Code cites these without an anchor:

- Every founder readout fails closed: an unset `FOUNDER_KEY` means closed
  (`netlify/shared/founder.ts`). Failing open, a bad deploy published them.
- The Netlify build runs `verify` first (`netlify.toml`); a red run used to
  stop nothing.
- Re-keep never creates or overwrites (`netlify/functions/keep.ts`). His side
  of the eleven and the progress delete are capped: possession of an id is
  the authority, so an unmetered write is a destruction primitive.
- The guide is bounded per call, because a cap on calls is not a cap on spend.
- The married share claims only what she did; a template testimonial would
  poison the married referral in a community this tight.
- `alumni`, `professional` and `mosque` join `group` as room-kind vias: the
  kind of room, never the room (`src/lib/entry.ts`).
- Nothing ran on a clock. A failed GitHub run emails the owner, so
  `watch.yml` is the alarm, with no vendor added.
- A comment saying the live guide was off was corrected: it is on, and the
  offline voice speaks whenever it cannot (`src/lib/coach.ts`).

### The Somali lines

The founder had no native speaker to hand and chose a language model as the
reviewer (2026-09-12). All ten draft lines read as understandable Somali.
Seven were reworded where the draft carried an English idiom word for word,
and nine were approved. The auntie greeting (`Kaalay, gabadhaydaay`) was held
until a woman from the audience reads it aloud. On 2026-09-24 the four lines
with no caller, the held greeting among them, were deleted. Six approved
lines remain in `src/data/somali.ts`, gated by `tests/somali-gate.test.ts`.
**Hypothesis, carried:** a model's Somali is not a Somali woman's. If anyone
in the sessions winces at a line, it goes back behind the gate the same day.

### What the founder's own walk found

On 2026-09-12, an hour after the gate came off, the founder walked the live
site on a phone as a man, which no walk had done. The men's side was her side
with the pronouns flipped. The read's result called her "he". Three of the
eleven graded him backwards: `family` asked whether she had asked how to
approach his family, and restraint on her side scored zero. No family script
was his, and the card under his result named scripts he is never shown.
Fixed: every result sentence passes through `speak()` with the gender; his
`family` asks whether she will tell him who to speak to and when;
`approach-her-family` in `src/data/families.ts` is his; the card's line comes
from `familyScripts(gender)`. **The rule it earned:** nothing ships to a side
of the product nobody has walked on a phone (`tests/invariants/both-sides.test.ts`).
No man has yet been asked what he needs (decision 4).

### The reality-sprint pass

2026-09-12, before links went to real people. It fixed only what could make
a real-user test invalid, unsafe, misleading or broken:

1. The guide was a general-purpose Claude endpoint, because the browser
   posted the system prompt. `netlify/shared/prompt.ts` now builds it: the
   caller names a voice and fills named slots, each closed or flattened to one
   line and cut, and a `system` field is ignored. The client reads every
   failure as "use the offline voice", so misuse would have looked like
   members quietly getting the offline voice.
2. Trust's guide disclosure named nine of thirteen fields.
   `tests/guide-disclosure.test.ts` now drives the list off the prompt.
3. Forget me left the eleven behind for anyone who never kept a map. The
   sheet has its own delete, keyed on the couple code, which touches no
   safety report and no joint tally (`netlify/functions/couple.ts`,
   `src/lib/forget.ts`).
4. Nothing tested the follow-up chain. `src/lib/followup-chain.test.ts` walks
   a stranger from no state to the ask on day three.

Two more fixes (the door's form receiving the map code; `GET /pool` deleting
on read) went with the door and the pool. Named and deferred: six intake
answers have no closed server twin and are bounded, not closed
(`sanitiseContext` in `netlify/shared/prompt.ts`).

### The search pass

On 2026-09-13 the founder searched `joinniyyah.com` and found it listed with
no title, while a different Niyyah, a Muslim matchmaking service in the GTA,
Ottawa and Montreal, ranked with a full title. `robots.txt` disallowed the
crawl, so the `noindex` header was never read and the bare URL stayed listed.
**Decided 2026-09-13:** the site is indexable from the day the gate comes
off. `vite.config.ts` writes `robots.txt` and `sitemap.xml` with the same host
as every link, `index.html` carries a canonical tag so `?read`, `?eleven` and
`?via=` links are not separate results, and `tests/deploy-layout.test.ts`
holds all of it. Nothing a member keeps is rendered into HTML.

### The close switch

**Decided 2026-09-17:** `netlify/edge-functions/gate.ts` stays, dormant.
Setting `PREVIEW_PASSWORD` shuts every route within one deploy, the only way
to close the site in one action. One safety failure in a tight community
could end the company; that minute is worth one unused edge function. The
same day, six places were found still saying the gate was on, five days
after it came off, each written from another document. Read the environment,
not the document about it.

## Part 2: The subtraction (2026-09-24)

The founder asked for a subtraction audit: give every part a verdict of
delete, merge, simplify or keep, and keep nothing whose value cannot be
explained. It shipped as five commits, `0bd7e96` to `d41f879` (PR #69).

### Why

- There are no members and no city pool. `netlify/shared/record.ts` notes
  three test rows, all the founder's own. About a third of the product served
  introductions that do not exist.
- The loop that makes Niyyah different depends on none of it: the read or the
  eleven, then the words, then "did you say it?", then the two-sided eleven,
  then the Ending.
- Earlier audits had asked for most of this, and it had not happened: see
  (AUDIT) and (TREE) below.
- `docs/PROTOCOL.md`'s freeze (then on the door, the map and matching) binds
  during the ten-session sprint, which had not started. Cutting first means
  the sessions test the product that will exist. The freeze now names only
  what exists.

### What was deleted

| What | Why it went |
|---|---|
| The door, count-me, the short map, the waitlist and its form, contacts, reach, age, the hesitation question, `netlify/functions/cohort.ts` | A 40/40 goal with nobody in it, holding the product's only personal data for introductions that do not exist |
| The pool readout and matching gate (`netlify/functions/pool.ts`, `netlify/shared/gate.ts`, `docs/atomic-sim.mjs`) | They decide when a pool may open; none can |
| The sample introduction, the invented candidates, matching, HowYoudLive | An invented person; HowYoudLive repeated intake questions |
| Profile, Plus, Philosophy, the glossary and `<Words>` | Profile said "nobody is introduced here yet"; Plus described a business with nothing for sale, and its three promises moved to Trust as "What's free". Philosophy was a manifesto and a second glossary; each instrument's own intro now explains its words |
| The family vouch (screen, lib, function, `vouches` store) and the `vouched` rung | It verified one side, unverified, for introductions that do not happen, and stored a relative's name and phone that no code read. The family words do the family job |
| The ledger, the `counted` rung, the work steps | Social proof with no audience; the work steps were fired by the product, not her life |
| The Matchmaker guide voice | It could only say there was nobody to introduce. Its four real answers moved to the auntie and the brother; four voices remain |
| `analytics.ts` and its 31 `track()` calls | An in-memory log only a dev console could read |
| The report withdrawal route and receipts | Nothing in the app called it, and only the founder resolves a report |
| The couple sheet's pre-owner-key fallback | Claiming the creator's gender could change her side (`docs/SECURITY.md` O6) |
| `country` and the eleven's state histograms on the progress record | A quasi-identifier with nothing left to read it; histograms no readout step read |
| Dead exports, and tests of deleted code: the catalogue, `load`, `wayout`, `alignment-audit`, `gate-sync`, the non-negotiables invariant | Unused; the tests' subject was deleted, or they counted source text |

### What was kept, and narrowed

- `netlify/functions/keep.ts`: forget and change-my-code carry the map and
  the couple only. Change-my-code stays: it is the fix for an ex who knows
  her code (`docs/SECURITY.md`).
- `netlify/functions/sweep.ts` empties the retired `cohort`, `contacts` and
  `vouches` stores, so ways to reach people and relatives' phone numbers do
  not outlive the feature.
- Export writes backup version 3; restore reads versions 2 and 3
  (`netlify/shared/restore.ts`). Health counts maps, progress and reports.
  `deployed.yml`'s storage smoke check reads the keep route, not the door.
- The guide no longer receives an age band.
- The keep's once key used the biased `b % 23` draw. The client now has one
  rejection-sampled generator in `src/lib/code.ts`, shared with the install
  id (`docs/SECURITY.md` O11).
- The progress readout returns `cohorts` by arrival month,
  `{arrived, followedThrough}`, so the North Star can be read: followed
  through per hundred arrived, this month against last. Whole-population,
  like `rungs`, so not floored.
- One `SinceLastTime` serves Welcome and Home; Home links to Trust at every
  stage, and its stage band no longer repeats Home's cards.
- Tests: one copy of each helper in `tests/support/`, and source guards cut
  to what behaviour cannot reach. `docs/TESTING.md` has the register.

### Judgement calls

- **`countPair` kept.** The plan had it use the shared `bump`. It updates a
  nested tally (pairs, and each topic's states) that a numeric bump cannot
  express (`netlify/functions/couple.ts`).
- **Legacy report ids kept.** The plan listed six-character report ids for
  deletion. The founder's resolve route in `netlify/functions/safety.ts`
  still accepts them, so a report filed before 2026-09-23 can be resolved.
- **The couple-function test double kept.** `tests/couple-function.test.ts`
  keeps its own Blobs double: it needs two seams the shared doubles lack,
  lost races and a tally store that is down.
- **The vouch cut, against (TREE)'s hold.** TREE's decision 4 held the vouch
  as cheap and honest; with nobody to introduce, it had no job.
- **Kept although duplicated:** about 15 "Copied" timers, `Announce` beside
  `role=status`, about 15 inline pronoun ternaries. Churning them costs more
  than it saves.

### Where to find it again

`43295a4`, the parent of `0bd7e96`, is the last commit with the door, the
pool, the vouch and the sample (it is the merge of PR #68, with the same code
as `c8f6de9`). They can be restored from there the day a pool is real, for
example `git show 43295a4:netlify/functions/pool.ts`. The bar a pool must
clear first is in (ATOMIC) below.

**Size.** `src/`, `netlify/` and `tests/` went from 46,905 lines to 35,271
(`.ts`, `.tsx`, `.css`, `.mjs`) between `43295a4` and `d41f879`. The docs went
from 58 to 11 in the same pass.

## Part 3: The completion review (2026-09-24)

The founder asked for one last review of the whole product, with no new
building: classify every remaining issue, allow at most three launch
blockers, set a product freeze, and end in one decision. Three reviewers read
`main` at `1c0628d` end to end across eighteen dimensions. Every serious claim
was then re-checked against the source, and a fourth reviewer argued the
blocker list in both directions. "Launch" means strangers enter personal data:
the sessions in `docs/PROTOCOL.md`, and public tool links.

**Decision: not ready.** There were three blockers. All three were fixed in
the PR that records this.

### Launch blockers, fixed

| # | What was wrong | The fix | Held by |
|---|---|---|---|
| B1 | Past the guide's reply budget, `send()` returned on `locked`. A message from Home's ask box ("I want to die", "he threatened me") was marked handed over and vanished under the wall. The phone's own crisis and safety replies, which cost nothing, never ran | Past the budget, the answer comes from the phone (`onDeviceOnly`), and nothing is charged or sent | `tests/ui/guide-floor.test.tsx` |
| B2 | The guide's header said "· private" while every message went to Anthropic. Home's ask box, the hand-offs and "It went differently" sent with no word about where. Her first name travelled in the thread through the greeting and four fallbacks (PRIVACY C5). Nobody was named as running Niyyah. The link preview promised "Minneapolis opens first" and thirteen questions. The families tool said "nothing recorded". The man answering a couple link was not told his answers are kept | The header names Claude and Anthropic. `GUIDE_SOURCE` appears wherever a tap sends. History goes from her first message (client) and from her first turn (server). The fallbacks no longer use her name. Trust names `VITE_OPERATOR_NAME` with a contact and the right to complain. `public/og.png` is re-rendered. Both lines are corrected | `tests/guide-disclosure.test.ts`, `tests/ui/where-words-go.test.tsx` |
| B3 | A tool link, then the read or the eleven, then "Now the other half of it", then Back landed on Welcome. There the only forward button was "Start where you are", which wiped the read, the pair code and the follow-up without asking | Welcome treats a Home as completed and offers "Enter Niyyah" | `tests/journeys/tool-link-read.test.tsx` |

### Important after launch

Fixing a defect needs no evidence under decision 19. These are ordered by
when they are due.

**Week 1**
- **I1.** "Ask him" ignores a `'failed'` share, so nothing tells her. Fix on day 0 if the iPhone walk reproduces it.
- **I2.** Guide spend caps:
  - a lost counter write counts as under the cap (`netlify/shared/limit.ts`);
  - `GUIDE_DAILY_CAP=0` reads as the default.
- **I3.** The Anthropic key is reachable at build time, and `founder-routes-fail-closed` makes a live call in every Netlify build.
- **I4.** A thread over 32 KB is refused before it is trimmed. The rest of that thread is offline and uncounted.
- **I5.** Kept maps:
  - a kept map is frozen at its first keep;
  - its year is renewed only on writes;
  - KeepMap reads as if it were a live copy.
- **I6.** An expired or deleted pair is a dead end on her side.
- **I7.** Her own couple link, opened after he answered, shows his side, and a report filed there is recorded as his.
- **I8.** A report filed after the 90-day window says "try again" forever.
- **I9.** Married Home never asks the follow-ups that the family words and the guide promise.
- **I10.** After a courtship ends, Home still shows "He answered".
- **I11.** Navigation dead ends:
  - Back from "Build your map" lands on Identity;
  - the couple joint screen has no way Home;
  - a failed `?map=` restore shows no message;
  - pasting the displayed, spaced code is cut by `maxLength`.
- **I12.** 18+ is asked only on the map path.
- **I13.** "Start over" leaves server copies that Forget me can no longer reach, and a completed Forget me re-creates an install id.

**Month 1**
- **I14.** One hour with a UK privacy adviser:
  - faith answers going to Anthropic (Article 9);
  - counting on by default (PECR);
  - whether an Article 27 representative is needed;
  - report retention.
- **I15.** `safety.ts` spends its hourly probe bucket on made-up codes, so real reports can be jammed for an hour.
- **I16.** Decision 5: the repository is still public.
- **I17.** `restore.ts` brings back forgotten step counts.
- **I18.** Alarms:
  - daily and weekly alarms need a run inside hour 09 UTC;
  - no drill proves the failure email arrives.
- **I19.** The live guide eval has never run, and `guide-eval.yml` passes without a key.

**Before their dates or scale triggers**
- **I21.** Fixture dates make the suite fail from 2027-09-02.
- **I22.** The sweep is sequential and would pass Netlify's 30 s limit near 1–2k keys.
- **I23.** The dormant edge gate, once on, also blocks the Bearer founder routes.
- **I24.** Unverified: are the `netlify.toml` headers served alongside the edge function? `curl -sI` settles it.

**Cosmetic.** Stale copy from deleted features, for example:
- "Name it, and it is counted";
- "Every member is held to the same standard";
- "Four others";
- Trust lines about a question that is gone.

Also:
- dead code (`codeFromUrl`, `guideLine`, `recommendedFor`, `Ending.began`);
- two assertions that cannot fail;
- server nits: `no-store` on three readouts, `stop_reason` accounting, `atob` on a non-ASCII password.

**Speculative.**
- The API rejecting a thread that opens with the assistant: it worked on 2026-09-02, and B2 removed the shape.
- Races between change-my-code and Forget me.
- Store limits at thousands of records.
- The model id being retired. Change it only with a live eval.

### Decision 19: the product freeze

**No new feature enters the build without one of these:**
1. **Observed user evidence:** a dated entry in `docs/RESEARCH.md` (a session, feedback, or a readout number).
2. **A production failure:** a red `/health` check, a crash, or a named incident.
3. **A safety or security requirement:** a `docs/SECURITY.md` or `docs/PRIVACY.md` id, or a legal duty.
4. **A measurable business requirement:** an experiment id in `docs/RESEARCH.md` with its decision rule already written.

**What counts as a feature:** a new screen, instrument, route, store, stored field, setting, or outbound flow of data.

**What does not:**
- fixing behaviour that is broken, or a claim that is untrue;
- deletions;
- security updates to dependencies;
- tests and docs.

Every PR names which of the four it rests on (`.github/pull_request_template.md`). The freeze replaces `docs/PRODUCT.md` §10's older rule ("records a vote that would otherwise be lost"), which falls under (4).

**Why:** the product is complete enough to learn from and has no members. Every feature built before the first ten sessions is built on inference, and the subtraction of the same day showed what that costs.

## Part 4: The Read, reviewed as an outside critic (2026-09-24)

The founder asked for an independent relationship-science critique of the
Read: every question, option, weight, dimension, band, script, tell and
follow-up, with no defence of the product. Findings only; nothing was changed.
Each item below that becomes work is either an *untrue claim* (fixable under
decision 19 with no evidence) or a *new option* (waits for the sessions).

**The verdict in one sentence.** The Read is disciplined about what it says
and undisciplined about how it counts. The headlines, the "not a verdict, not
a prediction" lines and the two caution rules are honest. Underneath them,
eleven editorial decimals are averaged into five three-word states by two
arbitrary cut-offs, and the band is read from those states as if they were
observations. The instrument is good at spotting a man who is absent, and
blind to the man who is eager, and the eager one is the higher-harm case.

### Structural findings

1. **It reads her report, not him.** Every answer is her recollection. The
   evidence ledger (`docs/RESEARCH.md`, row 2) concedes this; the screen's
   "What he has shown you" and "What he has done" do not.
2. **Ordinal labels are averaged as measurements.** `stateOf` averages
   weights like 0.85, 0.75, 0.7 and 0.6 and cuts at .7 and .35. Nobody measured
   any of them. "Defensive, but comes back" (0.7) is *shown*; "met properly
   once" (0.6) is not. A move from .69 to .71 between reads is reported as
   movement under "Since [date]".
3. **Three of five dimensions rest on one or two answers.** `family` is one
   question. `pressure` is one question whenever she has not told him her
   non-negotiables. One tap sets a whole state.
4. **Duration gates only the first two weeks.** From day 15 the same band
   rule applies to a three-week and a three-year courtship. Family knowing,
   a dated timeline and "asked how to approach your family" are unlikely at
   six weeks here, so *thin* at 2–6 weeks is produced by the calendar. The
   copy then says "it changes because he does something, not because more
   time passes", which is false at three weeks.
5. **Caution fires before the early gate.** `money` and the isolating pattern
   are checked before `weeks-0`. Ten days in, "let's keep it between us for
   now" said twice plus nobody knowing yet produces "Please read this one
   twice", "Tell one person… this week" and the emergency number. That is a
   plausible discreet start, delivered as an abuse alarm.
6. **The eager pursuer scores best.** Same-day texts, met several times, said
   marriage early, gave a date, told friends, never cancels: *strong*. That is
   also love-bombing, and the shape of the scam. Only `money` catches him.
   `src/lib/read.ts` says "every other signal can be produced by a man who is
   enjoying himself", then weights them anyway.
7. **The share line overclaims.** "This reads what he's done — not what he
   says." Five of eleven scored answers are about what he said: `named`,
   `timeline`, `known` ("as far as I know" is his report), `secret` (a
   request), `nonneg` (his answer). "Behaviour, not promises": a timeline is
   a promise.
8. **Gender variants are partial.** `secret`, `initiative` and `family` have a
   man's variant; `named`, `timeline`, `known`, `in-person`, `plans` and
   `hard` do not. A man reading a woman scores her at 0 for "nobody in her
   life knows" and 0.5 for "only after I brought it up", both ordinary for a
   woman before his people have gone to hers.
9. **It is calibrated for one courtship shape.** A family-introduced pair gets
   `public` and `family` *shown* on day one for free, so an introduced man
   reaches *strong* with nothing known about his conduct. A long-distance pair
   gets `in-person: never` and `plans: no-plans` at 0 for reasons that are not
   about him.

### Signal by signal

| Signal | Alternative explanations the score ignores | Serious scores poorly? | Unserious scores well? | Classification |
|---|---|---|---|---|
| `duration` | Cliff at day 14 | — | — | **Keep, calibrate**: let time shape the band to three months |
| `named` | Intention sent through a cousin or family; a woman not raising it out of modesty | Yes | Yes: a word is free | **Keep, calibrate language**; the man's variant is a *new option* |
| `timeline` | Visa, study, a sibling's wedding, her family's timing: honest people give conditions | Yes, at .25 | Yes: a date costs nothing | **Conversation prompt only**; the script is the best part of the dimension |
| `known` | Estranged or distant family; converts; a clan objection he is managing (`qabiil` is one of the eleven); a woman protecting her name | Yes | Yes: telling friends is easy | **Strong signal** for a woman reading a man past three months (Lehmiller 2009, modest, correlational). **Needs user evidence** under three months and for a man reading a woman |
| `secret` | Her reputation (allowed for men only); his family; discretion before istikhara | Sometimes | Rarely | **Strong in combination** (the isolating pattern); alone, **keep, calibrate** |
| `family` | Too early; he assumes his family handles it; waiting for her cue; her family is the danger | Yes, under three months | Yes: curiosity is cheap | **Conversation prompt only**: one answer cannot be a dimension state |
| `initiative` | A withdrawal test she may never have run, which the helper encourages; shift work; not chasing out of respect; he read silence as a no | Yes | Yes: the paradigm signal of a man enjoying himself | **Remove from scoring; keep as prompt** |
| `in-person` | Different cities or countries; mahram norms; she declined | Yes: long distance at 0 | Yes: pursuers meet eagerly | **Keep, calibrate**: a distance answer is a *new option* |
| `plans` | A count with no denominator; "more than once" in six months is life | Yes | Yes: he keeps the plans he enjoys | **Keep, calibrate** |
| `money` | A real emergency | Not scored | Not scored | **Strong signal** (safety, not seriousness). Unscored, hedged, class A (FTC). The one thing that catches the eager man |
| `nonneg` | "Pushed back" (.1) scores below "changed the subject" (.2): honest disagreement punished more than evasion | Yes: the man who disagrees openly | Yes: the agreeable manipulator | **Keep, calibrate**: pushing back is a prompt, not a low score; `untold` as `null` is right |
| `hard` | "I end up feeling like the problem" is her feeling, which breaks the file's own rule 1; her attachment lean (asked by the map, ignored here); a quiet processor | Yes: the quiet man at .3 | Yes: the smooth talker | **Keep, calibrate language**: reword `blames` as his behaviour, keep her feeling as her data |

### Dimensions, bands and interpretation

| Element | Finding | Classification |
|---|---|---|
| `PRIORITY` | An honest value judgement stated as an order. But `WHY_IT_MATTERS.public`, "A person who intends to marry you lets you exist in their life", infers intention from behaviour | **Calibrate language**: say what being unknown costs her, not what it proves about him |
| `stateOf` .7/.35 | Two unmeasured cut-offs turn an ordering into categories described as things "she can see" | **Needs user evidence**, or a coarser rule: count answers at the top and bottom of each question, and name how many questions a dimension rests on |
| Band `strong` | Reachable with `pressure` resting on `hard` alone. The headline is descriptive and fair | Keep the headline; the rule inherits the above |
| Band `thin` | A fair description of her answers, but produced by time at 2–6 weeks | **Calibrate**: duration-aware copy |
| Band `mixed` | The most honest band | Keep |
| `caution: hidden` | The one true pattern here (Stark 2007), and refusing to coach it is right. Evaluated before the two-week gate, on her feeling | **Strong signal**, with the early gate applied to this branch, never to money |
| `caution: money` | Correct in every respect | **Strong signal** |
| "Since [date]" | The right idea; threshold flips report movement that is not there | **Calibrate** |
| Scripts | The strongest part: real sentences, framed as questions | **Strong signal**, as prompts |
| `tells` | Several read one reply as a trait: "has just shown you, live…" (pressure), "That is your answer…" (consistency), "Curiosity about the how is the tell" (family). `docs/RESEARCH.md` row 11 flagged this class the same day and these survived | **Calibrate language**: describe what to note, never what it proves |
| Follow-up | About her own behaviour, once, stale at 30 days | **Strong signal** |
| `readSummary` to the guide | Passes "a pattern of being kept hidden" as a label, so the model speaks from a verdict the screen refused to make | **Calibrate language** |
| Tool page and share line | Untrue for five of eleven scored answers | **Untrue claim**: fix needs no evidence |

### The ten questions, for the whole instrument

1. Observable behaviour: about half. The rest is his reported words, or her feeling.
2. Alternative explanations: distance, estrangement, clan, her reputation, visa and money, work, attachment. None asked; none discounts a score.
3. Correlation for intention: yes, in `WHY_IT_MATTERS` and the tells.
4. Motive from behaviour: the headlines avoid it; the tells and the guide summary do it.
5. Equal across genders: no.
6. Culturally specific: yes, mostly declared. Undeclared: it assumes a met-online courtship.
7. A serious person scoring poorly: the distant, the estranged, the honest about constraints, the quiet.
8. An unserious person scoring well: yes, better than anyone. Only money catches him.
9. Useful without predicting success: yes, as a way to write down what happened and eleven sentences to say aloud. As a band, less so.
10. Evidence or verdict: the frame is evidence; the counting and the tells deliver verdicts through the side door.

### What would make it honest without making it vague

Candidates, not work. *Untrue claim* items need no evidence under decision 19;
*new option* items wait for the sessions.

- Count, do not average; show how many answers a dimension rests on. (*untrue claim*: the states are presented as hers)
- Let duration shape the band up to three months. (*untrue claim*: "not because more time passes")
- Apply the early gate to the hidden caution, never to money. (*untrue claim*: a ten-day alarm)
- Reword the four `tells` that turn one reply into a trait. (*untrue claim*)
- Make the share line true: "what he has done and said, as you remember it". (*untrue claim*)
- Replace `WHY_IT_MATTERS.public` with what being unknown costs her. (*untrue claim*)
- Give every scored question a man's variant, or a stated reason it needs none. (*new option*)
- Add a distance answer to `in-person`; make `plans` a rate. (*new option*)

**Not done:** no test against outcomes, since none exists; the family words
and the guide were not reviewed. The eleven were, in Part 7.

**Later (Part 8, 2026-09-24):** `nonneg` and `hard` relabelled, ids and
weights unchanged. "Pushed back" had put an honest "that isn't me" in the
same box as pressure; it now reads "keeps trying to talk me out of them",
and the helper says a plain answer counts even when it isn't hers. His
pause that comes back now sits with "comes back", where her own map puts
hers. When `nonneg` is what made pressure thin, the words ask for a plain
answer, not agreement.

## Part 5: Commitment: dedication, constraint, sliding and deciding (2026-09-24)

The founder asked for Niyyah to be audited through commitment research. The
distinctions used, without borrowing any questionnaire:
- **Dedication** is wanting a future with this person.
- **Constraint** is what makes leaving harder as investment accumulates.
- **Sliding** is moving into more consequential states without deciding.
- **Deciding** is choosing before the constraints pile up (Stanley, Rhoades &
  Markman 2006; `docs/RESEARCH.md` row 1, class E for us).

The Read, the eleven, the follow-up and the Ending were read against eight
things a person might need to notice. Language or logic changed only where the
product materially misrepresented commitment; everything else is a hypothesis
below.

### What Niyyah already handles well

- **Stage changes are her own act.** StageBand: "Only you decide this". The
  `next` chip ("We're deciding whether to marry") is a deciding moment, not a
  drift.
- **The deciding stage puts the conversations before the families.** "Then the
  families are about to be involved. Before they are, there are eleven
  conversations to have."
- **The follow-up counts something she did, not time.** "Have you asked it?"
  The Ending counts "conversations you were not going to have — never days,
  sessions or taps".
- **Time is not a reason.** The Read's *thin* band past three months says
  "this is information, not impatience on your part"; *strong* says "The
  useful thing now is not more watching. It is one clear conversation."
- **Her own answer comes first.** The eleven's "I don't know my own answer yet"
  makes her side something to settle before his.
- **Leaving is a legitimate outcome.** Ended offers "I stopped"; the Ending,
  "Nothing here will try to keep you".
- **Money is refused as a constraint.** The money caution names money asked
  for before the families meet as something to refuse, never as seriousness.

### Where it confused commitment with momentum

| # | Where | What it did | Material? | Now |
|---|---|---|---|---|
| 1 | `src/lib/inferStage.ts` | Finishing the eleven with nothing said set the stage to `deciding`, for a curious stranger or for a man who had only answered her link. The guide was told "deciding together… do not push back toward looking" and said "that's a good sign". The deciding-only family words appeared. The `deciding` rung, the product's measure of a decision (`docs/PRODUCT.md` §5F; `docs/RESEARCH.md` row 1), counted a tool being used | Yes: sliding done by the product | **Fixed.** Either instrument infers `talking`; `deciding` and `married` are only ever her tap. Held by `inferStage.test.ts` and the two-phone journey |
| 2 | `DIMENSION_LABEL.consistency` | Labelled "Follow-through", but two of its three answers are contact (how soon he texts back, how often you have met). Pursuit reported as follow-through | Yes: the label is the claim | **Fixed.** "Steady contact, and plans kept"; held by `read.test.ts` |
| 3 | The Read's band | `initiative` and `in-person` still lift the band, so the eager man scores best (Part 4) | A logic change, beyond a label | Hypothesis H4 |
| 4 | The Read's `family` dimension | Scores his asking how to approach her family as seriousness, and families are the largest constraint | No: the deciding stage and the *strong* band's link to the eleven put the conversations first | Hypothesis H2 |
| 5 | The deciding guide line | "that's a good sign" praises escalation | No: after fix 1 it only follows a stage she chose | — |
| 6 | The Ending | "You went through the eleven conversations before you said yes" does not check the order | No: the line is dated, the path (eleven after marriage) is rare, and she is the witness | — |

### Where it could help her decide earlier: hypotheses, not built

| # | If this is true… | Why not built | What tests it, with what exists |
|---|---|---|---|
| H1 | Exclusivity is assumed and never discussed, and it belongs among the conversations | Not one of the eleven; a topic is a new option | Sessions (`docs/PROTOCOL.md`): is it named unprompted? `ended.reason` `other` |
| H2 | Families get involved before the large differences are found | The product cannot see order outside itself | Sessions; `ended.reason` `my-family` and `his-family` from `deciding`, against the `eleven` rung |
| H3 | Marriage words without movement is a pattern worth naming: intent *shown*, family and public *not yet* | Naming it is interpretation; the *mixed* band already shows the gap | Sessions: do readers see the gap in the five states themselves? |
| H4 | Contact volume should not lift the band | A change to the band's logic | Sessions reading eager courtships; `ended.which` `consistency` |
| H5 | Time already spent is why people stay | No question asks it, and none should score it | Sessions; the Ending's free line |
| H6 | Logistics make momentum: a visa, an age, a parent's health, a booked hall | Asking is a new question | Sessions |

### Where the product refuses to interpret

- **Dedication itself.** It is inside another person; the Read already says
  "It cannot read a heart", and nothing scores it.
- **Whether she is sliding.** Only she can say a choice was a choice. The
  product offers the moment, the stage chip, and never infers it.
- **Constraint in her life:** money, a family's standing, pressure at home.
  Not asked, not inferred, never counted as seriousness.
- **Exclusivity.** Nothing she enters is read as it.
- **Duration as commitment.** Months in is context, never a signal.

## Part 6: Where every old doc went

The eleven docs now are PRODUCT, DECISIONS, RESEARCH, OPS, SECURITY, PRIVACY,
DESIGN, ASSETS, PROTOCOL, GUIDE-EVAL and TESTING. A citation of a retired doc
reads `docs/DECISIONS.md (NAME)`.

| Old doc | Now in | What it was |
|---|---|---|
| ABUSE | SECURITY | Fourteen abuse cases walked through the product, each sorted prevent / detect / respond / cannot yet |
| ACCESS | DESIGN | The WCAG 2.1 AA baseline: focus on screen change, live regions, contrast, reduced motion |
| ALIGNMENT | PRODUCT | Matching audited as a decision system, and what an instrument may claim (S-ids) |
| ASSETS | ASSETS | Every public URL with status and last-checked date, and the placement ledger |
| ATOMIC | retired | The smallest self-sustaining pool, from a simulation of the pool's own gate |
| AUDIT | retired | The current-state audit of 2026-09-17: what was built, contradictions, gaps ranked |
| BACKWARD | PRODUCT | Working backward from "extremely valuable": the arithmetic, the must-be-trues, the institution rule |
| BETS | retired | Twenty asymmetric bets, scored on upside, cost, reversibility, confidence and learning |
| BOARD | DECISIONS | The board audit of 2026-09-12: fifteen questions, ten actions, decisions 0–18, and later passes |
| CONTROL | OPS | Every dependency ranked by what happens when a supplier changes its mind; the accounts table |
| DEMO | retired | The live demo script for `?fresh` and `?demo` |
| DEPLOY | OPS | How `main` gets live, the environment variables and caps, the two failure signatures |
| DIFFERENTIATION | PRODUCT | The category audit: what every competitor can claim, and what survives a copy |
| DURABLE | PRODUCT | What survives if the AI hype and app fashions go, and the rule that keeps a supplier out of the core |
| EXPERIMENTS | RESEARCH | Design bets as experiments (A-ids), each with a decision rule fixed before the numbers |
| FAIL | DESIGN | Every failure state: what the person sees, what is safe, whether retry is safe |
| FEEDBACK | RESEARCH | What real people have said, one conversation at a time, never a name |
| FLYWHEEL | retired | The outcome flywheel's ten transitions, inspected against the code |
| FOGG | DESIGN | Eight actions against B = MAP, and the line: no badge, no reminder, no count of unfinished things |
| GAPS | RESEARCH | Every belief the product rests on, classed known / likely / assumed / unknown, with its test |
| GUIDE-EVAL | GUIDE-EVAL | The guide measured: cases, dimensions, hard gates, the offline baseline and the live eval |
| HARD | SECURITY | Easy decisions that would have cost something irreversible later (rows), and the deferred ones |
| INTEGRITY | PRIVACY | Every store and key with its writer, lifetime and remover; every multi-step write walked |
| JOBS | PRODUCT | The four stages through Jobs-to-be-Done, every feature held to a job |
| LEARNING | PRIVACY | What the product learns and what it refuses to learn |
| LINKS | DESIGN | Each link kind's own address and social card, and the offline shell |
| LIQUIDITY | retired | Liquidity for a pool: the model, the opening checklist, the by-hand introduction runbook |
| LOAD | DESIGN | Cognitive load per screen, and progressive disclosure without deleting a word |
| MACHINE | RESEARCH | The stages as the product builds them, each transition's metric; what the ladder can answer |
| MOBILE | DESIGN | Safe-area insets, 44px tap targets, the 16px field floor |
| MONETIZATION | PRODUCT | Every paid line asked who pays, when and for what, and the gates before any money |
| NIELSEN | DESIGN | Nielsen's ten heuristics walked on a phone, issues graded 0–4 (N-ids) |
| NORMAN | DESIGN | The interface against Norman's six principles |
| NORTHSTAR | PRODUCT | The problem, the purpose and the North Star in one sentence each |
| OPERATING | RESEARCH, OPS, PRIVACY | The monthly loop (to RESEARCH), the readout how-to (to OPS), the field table (to PRIVACY) |
| OPS | OPS | The founder's smoke alarm: `/health` and the GitHub run every three hours |
| OWNED | OPS | What is rented and what is owned: the address, the customer list, the constants' lineage |
| PERFORMANCE | DESIGN | The bundle split behind `lazy()`, the written budget, the stream coalesced per frame |
| PLACE | DESIGN | Information architecture: every destination against a stranger's five questions |
| PRIVACY | PRIVACY | Privacy by Design: every field asked why, who reads it, how long, how deleted |
| PROCESS | RESEARCH | The operating loop, the hypothesis template, and every kill criterion |
| PRODUCT | PRODUCT | The product strategy: why anyone would open this, the stages, the screens |
| PROTOCOL | PROTOCOL | The protocol for the first ten sessions: who, what to ask, what counts, the decision rules |
| RECOVERY | OPS | Disaster recovery: ten scenarios, each with detection, first hour and data-loss bound |
| REDTEAM | RESEARCH | The case against every conviction, and the tests that kill or validate each |
| RISKS | PRODUCT | Every major system against Cagan's four risks (R-ids) |
| ROADMAP | PRODUCT | Every feature against the Fastlane tests: build now, test first, defer, delete |
| SCALE | OPS | What breaks at each order of magnitude, and what to build now versus at its trigger |
| SECURITY | SECURITY | The OWASP audit, findings written as attacks (O-ids) |
| SHEET | ASSETS | The money-conversation sheet: subjects, content rules, two lengths |
| STRATEGY | PRODUCT | The founding strategy: the consumer truth, the business model and its refusals |
| TESTING | TESTING | The test suite: the invariant register, the helpers, what was pruned |
| THREAT | SECURITY | The STRIDE threat model: endpoints, attackers, threats ranked (T-ids) |
| TIME | OPS | What keeps being true for thirty days without the founder |
| TREE | retired | The opportunity solution tree and its subtraction list |
| VALUE | DESIGN | Time to meaningful value: every entry measured in taps, fields and words |
| VOICE | DESIGN | The voice: seven words and what each forbids, six rules, the reference lines |
| WEDGE | PRODUCT | The first wedge: who, why, how to find them, the expansion path |

Seven docs were retired with no successor, as was BOARD's narrative (its
cited sections are in Part 1). What each of the seven concluded that still
matters:

### (AUDIT)

The current-state audit of 2026-09-17 found two small, finished public
instruments (the read and the eleven) inside a larger private app that no one
outside the founder had used; a third of the code served a marketplace that
could not open under its own rules. Its §6 (orphaned complexity) found the
Ending unreachable from the Situation question's "married", because
`openGuide` overwrote the screen; `marriedOpensEnding` in
`src/lib/inferStage.ts` fixes it. Its §7 item 5, "half-present is the worst
state", is what the subtraction carried out.

### (TREE)

The opportunity solution tree of 2026-09-18 set one outcome: of everyone who
opened this, how many had a conversation they were not going to have. It
found the most code on "I don't know if I'm ready", the weakest trigger, and
almost none on a man showing he is serious (O8, the most dangerous gap). Its
subtraction list was carried out on 2026-09-24, except its decision 4, which
held the vouch.

### (BETS)

Twenty bets, scored while there were no members. What stays is what a bet
may not break: no photos, no free text on the server, no attention traces,
no messaging, no referral reward or invite counter, no paid acquisition, no
seeded count, no location finer than the city. Declined on those grounds:
B13 (a referral reward or invite counter), B15 (push or email re-engagement),
B16 ("the pool moved since you were here"), B19 (photos or any appearance
signal, permanently) and B20 (a seeded or boosted count). Built and still
here: B5 (`kept` is a rung) and B6 (resume a part-finished read or eleven).

### (ATOMIC)

The atomic-network analysis of 2026-09-12 found the door's count measured
what the gate could see, not whether anyone could be introduced: the coded
gate passed about 56% of pairs at any size. Its six conditions (§6) are the bar
for any future pool, one metro at a time: men ≥ 20 active and preparing, and
women ≥ men; every member ≥ 1 eligible active counterpart and 80% ≥ 3; seven
in ten answer an introduction within fourteen days; the founder makes ≥ 10
introductions a fortnight and the first twenty produce ≥ 3 "we are talking";
arrivals ≥ pairs matched or lapsed; the abundant side is told the truth. The
first build, if a pool is ever real, is the introductions record.

### (FLYWHEEL)

The flywheel's ten transitions, from a better match to more success, turn
through the instruments, not a matcher: no matching system has shown it
predicts marriage outcomes, so better data means better questions. Still
refused: a referral reward, an invite counter, share-to-unlock, a link
carrying who sent it, a named testimonial or success feed, a nudge to the
married to share again, any count of how a person was received.

### (LIQUIDITY)

Registration is not liquidity. Liquidity is eligible, live, reachable pairs
per member of the scarce side, in one pool. Age is the fragmenter that
strands people. Only two of seven non-negotiables gated a pool, by design;
the rest were the first question, not a filter. Its by-hand introduction
runbook (decision 17) is at `git show 43295a4:docs/LIQUIDITY.md`.

### (DEMO)

- `http://localhost:5173/?fresh` clears saved state and opens on Welcome.
- `http://localhost:5173/?demo` seeds a complete member ("Hodan") and opens
  on Home; reloading re-seeds it (`src/lib/demo.ts`).
- On the live site both act only on a phone that holds nothing, then leave
  the address bar, because a link that wipes a phone is one anyone can send.

## Part 7: The eleven, audited as content (2026-09-24)

The founder asked for the eleven (`src/data/eleven.ts`) to be audited as content: against
the domains premarital and relationship research keeps returning to, and against the
product's own Somali-specific claims. The brief: do not assume eleven is the right number,
do not assume the current eleven are right, do not reproduce any proprietary premarital
inventory, and do not change the list. Nothing here is a change; every recommendation is a
hypothesis with the test that already exists for it.

**Held to.** No commercial premarital questionnaire was read or recreated; the comparison is
to research *domains*, not items. External sources already in `docs/RESEARCH.md` are cited
by name. A source added here that the founder has not checked is marked **(to check)** and
is class F or H until checked.

### 1. What the eleven is, mechanically

Before judging content, what the code does with it, because several findings are about
the mechanism, not the words.

- There is no score. Each topic takes one of four states — `agree`, `differ`, `not-talked`,
  `unknown` — and the only calculation is `STATE_URGENCY[state] × consequence`, which picks
  one conversation to open (`src/lib/beforeYes.ts`). The two-sided sheet does the same with
  five joint states (`src/lib/couple.ts`). Neither compares *answers*; both compare *whether
  a conversation happened and whether the two say it landed*.
- `consequence` (.6–.95) is editorial, unchanged since the first commit (`c42c553`,
  2026-09-03), and the list has always been eleven. The number was not derived; it was the
  number the first draft had.
- The four states carry `weight` 1 / 0.1 / 0.35 / 0.25 "used only for ordering". `differ`
  has urgency 1, the highest: a difference is always the first thing reopened.
- The ordering is never shown as a number, and the 2026-09-24 rewrite removed the
  "load-bearing" tier that once told a couple a difference on qabiil was light (S6).

Two consequences of this shape run through everything below:

1. **The eleven is a checklist of conversations, not an inventory of positions.** That is
   its strength (nothing is graded) and its blind spot (it cannot tell a settled difference
   from an unsettled one).
2. **The four states presume every topic is agree/differ-shaped.** Several are not.

### 2. Coverage against the general research domains

The domains the brief names, and where each lives in Niyyah. "Eleven" means one of the
eleven; "read", "map", "sheet" mean the other instruments; "—" means nowhere.

| Domain | Where | Coverage |
|---|---|---|
| Finances | Eleven `money-home` (who pays, remittances, together/separate); `aroos-mahr`; money sheet N3 (debt, mahr, wedding, obligations) | Good. Household money is framed through remittances first; ordinary spending, saving and debt are in the sheet, not the eleven |
| Children | Eleven `children` | Good: how many, how soon, language, dugsi. Parenting style and the case of no children are not asked; acceptable before a nikah |
| Faith / religion | Eleven `deen-daily`; map `practice`, `faith-role` | Good, and the "ordinary Tuesday" framing is the best-written item |
| Extended family / in-laws | Eleven `his-family-in-home`, `families-disagree`, `qabiil`; family scripts | Strong; three of eleven plus a whole script set |
| Living arrangements | Eleven `live`, `his-family-in-home` | Covered twice (§4, redundancy) |
| Work and roles | Eleven `work` (with "who does what at home") | Good; the second half is the substance |
| Conflict | Read `hard` ("When you raise something difficult, what does {he} do?"); eleven `families-disagree` covers inter-family conflict only | **Absent as a conversation.** The read observes his behaviour under one complaint; nothing asks the two of them how they fight and repair |
| Communication | The product as a whole | Meta-covered; not a topic and should not be one |
| Sexual / intimacy expectations | — | **Absent** |
| Major life goals | Eleven `going-back`, `work`, `children`; map `timeline` | Partial: study, career horizon, a business, are not named |
| Geography / relocation | Eleven `live` (city), `going-back` (country) | Covered twice |
| Power / decision-making | Eleven `families-disagree` ("how it gets settled between the two of you"), `work` (who does what), `money-home` (together or separate), `deen-daily` ("what {he} expects of you") | Present but diffused across four items and never named. The most consequential half — what each expects to decide alone, what needs the other's yes (movement, friends, travel, her money, his) — rides inside `deen-daily`'s second question |
| Expectations of marriage | Spread across all eleven | The list is concrete on purpose; an abstract "what is marriage for" item would be weaker than what is there |
| Friendship / companionship | — | Absent, correctly: it is experienced, not negotiated. Among the strongest satisfaction correlates (Joel et al. 2020's top predictors are perceived partner commitment, appreciation, sexual satisfaction, perceived partner satisfaction and conflict), and not a conversation to schedule |
| Boundaries | Eleven `his-family-in-home` (hosting, who moves in); `families-disagree` | Partial. The boundary that is Somali-specific and unnamed: **what of the marriage gets told to hooyo and the sisters**, on either side |
| Commitment | Read (five dimensions); Part 5 H1 (exclusivity) | Covered by the read. Exclusivity is still not asked anywhere (Part 5) |
| Health / stress | Map `dealbreakers` `no-addiction` only | **Absent**: mental health, chronic illness, khat, family health history, and the plain fact of a previous marriage or existing children |

Read as a whole: the eleven is dense where Somali life differs (family, household, money to
family, faith practice, clan, polygyny, return) and thin where the general literature is
strongest on outcomes (conflict, intimacy, commitment). That is not an accident. The list
was written in response to an audit that found "no Somali-specific content at all"
(`c42c553`), so it was assembled to *be Somali* — selected for distinctiveness, not for
consequence. Seven of eleven are Somali-inflected. The three general domains with the best
evidence for marital outcome are the three least distinctive, and they are the three absent.

### 3. Each of the eleven

For each: why it deserves scarce attention; what harm comes from finding it out late; what
kind of issue it is (**compatibility**: a position that cannot be split; **negotiation**: a
difference that can be arranged; **values**: a belief that can differ without being
arranged; **conversation**: something to know, not to settle); whether difference can be
healthy; whether the product treats difference as incompatibility; evidence in the
ledger's classes; and whether the Somali-specific claim is observed or assumed.

**1. `live` — Where you'd live (.95)**
- *Scarce attention:* it fixes who is in the house every day and which city her work and
  people are in; it is decided by lease or by default, and often by a family.
- *Late harm:* high. A city is a job, a mother, a mosque; a household is daily labour.
- *Kind:* negotiation (city) and compatibility-adjacent (with his mother or not).
- *Healthy difference:* yes on city; less so on household, where "with family" against
  "own front door" is two lives.
- *Difference as incompatibility:* the copy does not; the mechanism reopens it forever (§5).
- *Evidence:* B for co-residence with in-laws mattering (Bryant, Conger & Meehan 2001,
  ledger L5). The item's own `why` still predicts: "come apart on that in the first year"
  is a dated future the 2026-09-24 rewrite otherwise removed (L12). It passes
  `tests/voice-rules.ts` only because "first year" is not in the pattern.
- *Somali claim:* that co-residence with hooyo is a live expectation in diaspora Somali
  marriages — assumed (F). Plausible, unobserved.
- *Incidental:* `intake.ts:51` stores `'Flexible'`; `eleven.ts` `yourSide` keys `flexible`.
  A woman who chose Flexible never sees her own side under this topic.

**2. `his-family-in-home` — His family in your home (.8)**
- *Scarce attention:* hosting is labour that somebody carries, and a family that visits
  and one that moves in are different marriages.
- *Late harm:* high, and gendered: it lands on her time first.
- *Kind:* negotiation, with a compatibility edge (someone living with you, or not).
- *Healthy difference:* yes, if arranged — how much, how often, and who cooks.
- *Difference as incompatibility:* no in copy; the man variant is the best in the list
  ("A quick yes with nothing behind it").
- *Evidence:* B (Bryant, Conger & Meehan 2001).
- *Somali claim:* assumed (F), and the one most likely to be confirmed by sessions.
- *Overlap:* the prompt of `live` already asks "whether with {his} mother". Two of eleven
  ask whether hooyo lives with you.

**3. `work` — Whether you'd work (.75)**
- *Scarce attention:* "of course" before the first child is not an answer; who does what
  at home when both work is the real question, and it is the one the copy correctly
  insists on.
- *Late harm:* high. Broken expectations about home after a first child are among the
  best-evidenced sources of early decline.
- *Kind:* negotiation (arrangements) over a values core (what a wife's work is for).
- *Healthy difference:* yes — "in seasons" is a healthy arrangement of a difference.
- *Difference as incompatibility:* no in copy. But a couple who differ and have arranged
  it ("she works; he does mornings") have no state to say so, and stay `differ`.
- *Evidence:* B (Hackel & Ruble 1992, ledger L5) — the strongest general evidence any
  item has, after money. At .75 it sits sixth of eleven.
- *Somali claim:* that a man's assumption about home is unspoken until children — F, but
  the item's mechanism is general and holds without the Somali claim.

**4. `money-home` — Money sent home (.85)**
- *Scarce attention:* two families' expectations on one income, unspoken, is the one item
  where the Somali claim has external support.
- *Late harm:* high and recurring — monthly.
- *Kind:* negotiation. Almost never compatibility: what is sent, to whom, from which pot.
- *Healthy difference:* yes, plainly. One sends, one does not, and a budget holds it.
- *Difference as incompatibility:* this is the item where the mechanism does the most
  damage. A negotiated difference here is the healthy end state and it is permanently
  the first thing reopened (`differ` urgency 1 × .85).
- *Evidence:* B for money disagreements predicting divorce (Dew, Britt & Huston 2012); B
  for remitting being widespread and a weight (Hammond et al. 2011; Lindley 2009).
- *Somali claim:* **observed** in the literature for prevalence; assumed for "discovered
  after the wedding". The only Somali claim in the list above class F.

**5. `children` — Children (.9)**
- *Scarce attention:* how many, how soon, which language, dugsi — decisions that get made
  by whoever pushes hardest if not made together.
- *Late harm:* high; "inshallah" covering a range from one to eight.
- *Kind:* compatibility (whether; roughly how many, how soon) with negotiation inside
  (language, dugsi).
- *Healthy difference:* on the periphery yes; on whether and roughly when, rarely.
- *Difference as incompatibility:* the map already lists "Aligned on children" as a
  non-negotiable, and the eleven says "differ" — the two instruments carry the same fact
  in different registers, which is fine.
- *Evidence:* B–A that disagreement on children is among the reasons couples end;
  general, well replicated.
- *Somali claim:* that language-at-home and dugsi are the specific sub-decisions — F,
  and low-risk: they are named as things to ask, not as facts about families.

**6. `deen-daily` — Deen, day to day (.85)**
- *Scarce attention:* both can say "deen first" and mean different Tuesdays; and the second
  question — what each expects of the other, unsaid — is the sharpest question in the
  eleven.
- *Late harm:* high, and it compounds: practice sets the house, and expectation of the
  other sets the power in it.
- *Kind:* values (practice) plus **power** (expectations of the other) — two domains in
  one item.
- *Healthy difference:* on practice, some (one prays more; the other is returning). On
  expectations-of-the-other, difference is exactly what has to be surfaced.
- *Difference as incompatibility:* no.
- *Evidence:* B that congruence of religious practice goes with satisfaction and
  stability; general literature (Mahoney and colleagues on religion in marriage — **to
  check** for the ledger).
- *Somali claim:* none specifically; the item is Muslim, not Somali, and portable (PROTOCOL
  Q11 will show it).
- *Note:* this item carries the product's only question about what he expects of her —
  movement, dress, company, what enters the house. That is the power domain, and it is
  the second clause of a question about prayer.

**7. `aroos-mahr` — The aroos and the mahr (.6)**
- *Scarce attention:* money attached to two families' expectations, in public.
- *Late harm:* moderate: a debt, or a resentment; rarely the marriage.
- *Kind:* negotiation, and the `tells` says so ("Either can work").
- *Healthy difference:* yes.
- *Difference as incompatibility:* no.
- *Evidence:* B that mahr is set at the nikah and the families are deeply involved while
  the couple leads (Ismail 2018). Wedding debt as a strain: F here; general literature on
  wedding cost and later outcomes exists (**to check**).
- *Somali claim:* observed for the practice; assumed for the harm.
- *Overlap:* the money sheet N3 asks twenty questions across mahr, the wedding, debt and
  obligations (`docs/ASSETS.md:172` notes the duplication). The part of this item that is
  not money — "something you two decide, or decided for you" — is `families-disagree`.

**8. `qabiil` — Qabiil (.7)**
- *Scarce attention:* the question nobody is supposed to ask, and the one that is asked by
  an uncle after the families are involved, when saying no has become public.
- *Late harm:* high when it fires, and it fires on the family, not the pair.
- *Kind:* **not a compatibility issue between the two.** It is a family-power question,
  and the copy already frames it that way ("what happens if it matters to someone at
  {his} table").
- *Healthy difference:* the question does not apply. "We've talked and we agree" on
  qabiil means agreed on what — that it will not matter? That he will stand with her?
  The four states do not fit this topic.
- *Difference as incompatibility:* the 2026-09-24 rewrite fixed the one place it did
  ("a single difference on qabiil is named, not weighed"). What remains is a shape
  problem: `differ` on qabiil is semantically empty and yet has urgency 1.
- *Evidence:* the ledger's own words: "no source was found on clan objections in the
  diaspora" (L8). Literature on clan persisting in diaspora social organisation exists;
  on marriage objection rates, nothing checked. F.
- *Somali claim:* assumed. This and `second-wife` are the two items PROTOCOL's
  "Exaggerated" verdict is written for, and neither has faced a participant.

**9. `going-back` — Going back (.65)**
- *Scarce attention:* "one day" can be meant for years and land as a ticket.
- *Late harm:* very high when it happens — a continent, her work, her people. Rare or
  common is unknown.
- *Kind:* negotiation over a values core; also a **plan**, which changes.
- *Healthy difference:* yes if named (months a year; one stays; not yet).
- *Difference as incompatibility:* no in copy. The `tells` ("We'd figure it out" means you
  are not yet in the picture) is the one-person test's model sentence.
- *Evidence:* return-migration to Somaliland and long stays are documented in diaspora
  studies (**to check** for a citable row); as a marriage strain, F.
- *Somali claim:* observed for the phenomenon; assumed for the harm.
- *Gender:* no `man` variant. Read by a man the prompt becomes "whether she plans to move
  back … and whether you would go", which inverts the more common direction; the file's
  own rule ("a token swap produces a different question") arguably applies.

**10. `second-wife` — A second wife (.9)**
- *Scarce attention:* the one question where "it is permitted" and "I would" are different
  sentences, and where asking feels like accusing.
- *Late harm:* the highest on the list when it is real: it reshapes the marriage and the
  household.
- *Kind:* **compatibility**, close to a non-negotiable, for most of the women the product
  is written for. Values for some.
- *Healthy difference:* rarely. This is the one item where "we've talked and we don't
  agree" is closer to an ending than a conversation.
- *Difference as incompatibility:* here the product errs the *other* way. It softens a
  binary into one of eleven agree/differ topics with the same four states as the aroos,
  while the map's non-negotiables list omits it. A woman for whom this is absolute is
  handed a script, not a place to say so.
- *Evidence:* polygynous households among Somalis in Europe are described in social-policy
  and ethnographic literature (**to check**); prevalence as a live expectation among
  diaspora men 26–36 is unknown. F, and the man variant's "She is more afraid to ask this
  than you are to answer it" is already deferred (L10, L12).
- *Somali claim:* assumed. The item most likely to draw "not real for anyone I know" in
  a session, and the item with the highest cost if it is real. Both can be true; only
  sessions separate them.

**11. `families-disagree` — When the families disagree (.8)**
- *Scarce attention:* the meta-conversation the other ten depend on: whether the two of
  them are the unit that decides.
- *Late harm:* high, and it is the harm the whole product is built around (saying no once
  the families are involved).
- *Kind:* **values / stance**, and the one that becomes a test only when it happens.
- *Healthy difference:* no — but agreement here is cheap ("of course, we") and the copy
  knows it ("The word you are listening for is 'we'").
- *Difference as incompatibility:* no.
- *Evidence:* B that in-law discord predicts later outcomes (Bryant, Conger & Meehan 2001)
  and that network approval goes with lasting (Sprecher & Felmlee 1992). The stance itself
  ("a team first") is G, Niyyah's own value.
- *Somali claim:* that families will want different things — F, and safe: named as a
  custom, not a count.

### 4. Findings

**Critical domain missing: conflict and repair, as a conversation between the two.**
The read asks what he does when *she* raises something hard; nothing asks the two of them
what happens when *they* disagree and how it comes back — who withdraws, who escalates, who
brings in a mother, what an apology looks like in each family. `families-disagree` is
inter-family conflict, not theirs. Conflict behaviour is among the five strongest
predictors of relationship quality in the largest machine-learning study of the field (Joel
et al. 2020, ledger L4, class A) and demand–withdraw replicates across cultures (Christensen
et al. 2006). The Somali-specific version is real and unnamed: **who gets told** when they
fight — hers, his, an uncle, nobody — is a boundary and a conflict question at once, and it
is exactly the "before the families" mechanism the product exists for. This is the
strongest case for a twelfth conversation, or for the seat freed by §4's redundancy.

Second, and harder: **intimacy expectations.** For a practising couple the nikah is the
boundary, which makes it a legitimate pre-nikah conversation and the one most likely to be
called auntie-ish or outsider-ish if written badly. What it covers: expectations, spacing
and contraception (half-covered by `children`'s "how soon"), and health. For Somali women
specifically, the medical literature on FGC and pre-marital or pre-obstetric care in the
diaspora (Scandinavian and UK studies — **to check**) describes a topic that is found out
late by both sides at real cost. It should not be an eleven-style agree/differ item; if it
exists it is a conversation with a health frame and no state recorded. Founder's call, and
a PROTOCOL Q12 line-by-line test before it ships.

Third, plainly missing and not Somali at all: **what came before** — a previous marriage,
existing children, a broken engagement — and **health** (mental health, chronic illness,
khat). The dealbreaker list has `no-addiction`; nothing asks. Low cost to add as a
conversation; never a signal.

**Redundant domain: the household and geography cluster.** Three of eleven — `live`,
`his-family-in-home`, `going-back` — cover where you live and who is in it, and two of them
ask whether hooyo lives with you in almost the same words (`live`'s prompt: "whether with
{his} mother, near her, or on your own"; `his-family-in-home`'s: "whether a sister or {his}
mother might live with you one day"). A couple who answered `live` has answered half of
`his-family-in-home`. `aroos-mahr` is the second redundancy: its money is in `money-home`
and the twenty-question money sheet; its power question ("decided for you both") is
`families-disagree`. Two seats, defensibly, are available without losing a question.

**Overweighted: `second-wife` at .9, and the cluster above at three seats.** `consequence`
is defined as "how much rides on this one", and by that definition .9 holds. But the
ordering it feeds is also *how often it is opened first*, and a topic with the weakest
prevalence evidence in the list sits joint-second with `children`. If a participant calls
it unreal (PROTOCOL "Exaggerated"), every headline it topped was the wrong headline. The
cluster is overweighted by count: 27% of the list on where and with whom.

**Underweighted: power and decision-making, and `work`.** Power has no seat and lives in
four second clauses; the part of it that is most Somali — what a husband expects to decide
alone, and what a wife's yes covers — is a sub-question of a prayer item. `work` at .75
carries the best general evidence in the list after money (Hackel & Ruble 1992) and is
sixth.

**Should remain a conversation, never a matching signal:** `qabiil`, `aroos-mahr`,
`going-back`, `families-disagree`. `qabiil` because it is about the families, not the pair,
and "differ" is meaningless on it; `aroos-mahr` because it is a negotiation; `going-back`
because it is a plan, and plans change; `families-disagree` because agreement is cheap and
only the event tests it. The risk is not today's code, which scores nothing. It is three
doors left open: the couple sheet's copy says "where you match" three times
(`src/components/Couple.tsx:192, 216, 325`), the one word the doctrine otherwise refuses;
the `tallies/joint` blob keeps per-topic joint states for ever; and the monthly loop plans
to revise `consequence` by `marriedBy.through` — outcome-tuned weights, which is a
compatibility model by a slower road. Marriage outcomes should revise the *order* of these
four only with the count cited and the sentence unchanged, as U7 already says; the guard is
that `differ` on these four never changes a headline.

### 5. The mechanism finding: a settled difference has no state

The copy says "No difference is light." The mechanism says a difference is never settled.
The four states are: agree; differ; not talked; don't know my own answer. There is no
"we've talked, we don't agree, and we've arranged it." For `money-home`, `work`,
`his-family-in-home`, `going-back` and `aroos-mahr` — five of eleven — that arranged
difference is the healthy end state, and the engine gives it urgency 1 × `consequence`,
above every unopened topic, for as long as the sheet exists. The headline reads "One
conversation doesn't line up yet"; the "yet" says agreement is the destination. The
two-sided sheet inherits it: `differ-somewhere` (.9) outranks `both-not-talked` (.6), so a
couple who differ on remittances with a budget are told to reopen remittances before a
topic neither has raised.

So: the product does treat difference as incompatibility, structurally and only
structurally — not in a score, not in a sentence, but in what it asks her to do next. A
fifth state ("We differ, and we've settled how") with urgency between `agree` and
`not-talked` would fix it in one place and change no copy. Hold the hypothesis to the
existing rule: a new state is a closed id in `netlify/shared/vocab.ts` with a
`docs/PRIVACY.md` row, and `tests/vocab-sync.test.ts`. Not built here. **Built in
Part 8**, as a fix to an untrue claim rather than on the evidence named in §9.

The mirror error is `second-wife`, where the same four states soften a binary. One list,
two shape mismatches in opposite directions, because one shape was fitted to eleven topics
of three kinds.

### 6. The Somali claims, observed or assumed

By the ledger's own classes, one Somali-specific claim in the eleven is above F: that money
home is widespread and a weight (B, Hammond et al. 2011; Lindley 2009). Family involvement
in general is B (Ismail 2018). Everything else — hooyo moving in, clan raised by an uncle,
"one day I'll go back", a second wife as a live expectation, the aroos as a debt — is
assumed: plausible, culturally literate, unobserved. Classes C and D are empty; the one
walk logged was the founder's. The eleven has never been read by a participant under
PROTOCOL Q9 ("which surprised you by being on the list? which is missing?") or Q11 (which
would a Pakistani or Arab friend also need?). Until it has, "Somali-specific" describes the
author, not the evidence.

Where the copy has kept its promises: the 2026-09-24 rewrite removed "decide a marriage",
"most of us", "year two" from the woman's strings; the `tells` mostly pass the one-person
test. Two lines that did not get caught: `live`'s "come apart on that in the first year"
(a dated prediction, L12) and `second-wife`'s "one of the few questions where the answer
shapes the rest of a life" (a count, L9). Both are one-word fixes and are not made here.

### 7. The strongest case for the current eleven

1. **Every item is a decision that gets made whether or not the two of them make it.**
   That is the right test for a pre-marriage list and each of the eleven passes it. Nothing
   on the list is abstract; every prompt names a Tuesday, a suitcase, a ticket, a number.
2. **It covers the four general domains with the best evidence for early marital strain**
   — money (Dew 2012), in-laws (Bryant 2001), expectations about home after children
   (Hackel & Ruble 1992), religious practice — and every one of them in its Somali form.
3. **The seven Somali items are the product's reason to exist** (conviction 1). No general
   app asks about remittances, hooyo in the house, qabiil, going back or a second wife, and
   these are precisely the questions whose cost of asking rises once the families are
   involved. A list that dropped them to add conflict and intimacy would be a better
   general list and a worse Niyyah.
4. **The mechanism is honest.** No score, no grade, "I don't know my own answer yet" as a
   first-class state, "ask again" on qabiil, man variants where a token swap would ask the
   wrong question, a headline that names a difference as a difference. The ledger caught
   its own overclaims and rewrote them. Few products with a list like this can say which
   class each claim is in.
5. **It is falsifiable and already instrumented.** `ended.which`, `/couple`
   `both-not-talked` per topic, `facts.throughByTopic`, PROTOCOL Q9 and Q11, the
   "Exaggerated" verdict, A9. The list has kill criteria. Most lists have authors.
6. **Eleven is printable.** One page, one sample of three, sent with a nikah packet. A list
   of eighteen is a curriculum; this is a conversation.

### 8. The strongest case against them

1. **The number and the weights are inherited, not derived.** Eleven was the first draft's
   count; `consequence` has not moved since 2026-09-03; the list was assembled to answer
   "no Somali-specific content", so it optimises for distinctiveness. The three general
   domains with the strongest outcome evidence — conflict, intimacy, commitment — are
   absent because they are not Somali.
2. **Two seats are duplicates.** Hooyo-in-the-house is asked twice; where-you-live is asked
   three ways; the aroos is in the money sheet. A list that reserves 27% of itself for one
   cluster and 0% for how the two of them fight has its proportions from its origin, not
   from the domains.
3. **One answer shape for three kinds of topic.** Agree/differ fits `children`,
   `deen-daily`, `work`. It is empty on `qabiil` and `families-disagree`, and it softens
   `second-wife` — the one item that is a binary for the reader the product is written for
   — into a conversation with a script.
4. **Structurally, difference is unsettleable.** No state for an arranged difference;
   `differ` outranks every unopened topic for ever; "doesn't line up *yet*"; the sheet says
   "where you match". The product refuses a score and then tells her, by what it opens
   next, that agreement is the goal.
5. **Every Somali claim but one is assumed.** Zero sessions. The two items most likely to
   be called unreal by a participant (`qabiil`, `second-wife`) are also the two the
   marketing leads with ("a second wife, qabiil" in §0). If a participant says three of the
   eleven are not real for anyone they know, the PROTOCOL already calls that a verdict, and
   the list has never been put in front of one.
6. **It is her list.** Seven of eleven have no man variant; the base strings are hers and
   the printed guide's neutral voice must hold for both. `going-back` read by a man asks
   whether *she* is going back. The product is women-first by design, and the eleven is the
   one instrument he is asked to answer on his own phone; the asymmetry is most costly
   there.

### 9. What would move it

Nothing here changes the list; each line names the test that exists.

| Hypothesis | Test | Moves on |
|---|---|---|
| The eleven's proportions are wrong (§2, §4) | PROTOCOL Q9 "which is missing?", Q11 portability; `ended.reason` `other` share; conviction 4's "most `ended.reason` outside the eleven" | Two participants independently naming conflict or intimacy → a twelfth conversation, drafted, gated by Q12 |
| `live` and `his-family-in-home` are one conversation | `/couple` joint states on the two moving together; `facts.throughByTopic` on both after one is said | Both said or both unsaid in most sheets → merge, freeing a seat |
| A settled difference needs a state (§5) | Sessions: does anyone say "we don't agree, and it's fine"? `differ` share per topic at twenty sheets | `differ` leading on `money-home` or `work` while those couples marry (`marriedBy.through`) → a fifth state. **Built 2026-09-24 (Part 8)** as `settled`, a fix to an untrue claim; this row now tests whether it is used |
| `second-wife` is a non-negotiable, not a conversation | `ended.which.eleven['second-wife']` against `ended.which['non-negotiable']`; sessions | Named as an ending reason more than as a conversation → it moves to the dealbreakers as well as staying in the eleven |
| `qabiil` and `second-wife` are exaggerated | PROTOCOL's "Exaggerated" verdict, two independent | Verdict → the `why` strings rewritten as customs named as customs; `consequence` of `second-wife` revisited with the count cited |
| Power needs its own seat | Sessions: what did he "expect you'd know"? PROTOCOL Q6 | Named unprompted by two → a conversation drafted from `deen-daily`'s second clause |

Two lines of copy (`live` "first year"; `second-wife` "one of the few") and the `Flexible`
key belong in the next copy commit, not this audit.

## Part 8: Disagreement — what can be solved, what is lived with, and what is a line (2026-09-24)

The founder asked how Niyyah treats disagreement, using the distinction
relationship research draws between **problems a couple can solve** and
**lasting differences a couple manages**. No proprietary assessment was used.
The surfaces audited: Before you say yes, the eleven, the two-sided joint,
the read, the guide (live prompt and offline voice), and the family words.
The question was where the product implies that agreement is good, that
difference is bad, that conflict means incompatibility, or that a hard
conversation must end in consensus. Two constraints held throughout:
never press someone to give up a genuine non-negotiable, and never
manufacture incompatibility from two answers that differ. There is no
percentage and no score.

### 1. The rule adopted

A difference is one of three kinds:
- **settled once**, a decision (the mahr, the hall);
- **lived with**, through an arrangement both keep (money home each month,
  practice at two paces);
- **a line**, a position one of them will not move.

Before a nikah there is a fourth: **unknown until it is said**. The
lasting kind is well described in clinical work on couples (Gottman's
"perpetual problems"). It is class B to check, used as a concept, and no
figure from it is used (`docs/RESEARCH.md` L19).

**The kind belongs to her, per difference, never to the topic.** A second
wife is a line for most of the women this is written for, and for some a
condition agreed before the nikah. Money home is usually lived with, and
for someone it is a line. So no topic is pre-sorted:
- pre-sorting a topic as non-negotiable would manufacture incompatibility;
- pre-sorting it as negotiable would be pressure;
- every topic offers every kind, and the topic changes only the words.

### 2. What the audit found

**Agreement as the good answer:**
- The eleven's state weights were agree 1, differ 0.1, below not-talked
  at 0.35. Nothing read them, but the data said it.
- The result drew a difference in clay, the colour kept for errors, and
  listed it first.
- The follow-up made "We agree" the filled button and "We don't agree"
  the outline one.
- The Ending credited only agreements.
- "Only where you match" appeared on eleven surfaces.

**Difference as the bad answer:**
- "One conversation doesn't line up **yet**."
- "Nothing is crossed."
- `differ` was reopened ahead of every unopened topic, for as long as the
  sheet existed. The joint did the same: `differ-somewhere` 0.9 over
  `both-not-talked` 0.6.
- `live.why`: "come apart on that in the first year".

**Conflict as incompatibility:**
- The read's `nonneg` scored "pushed back" (0.1) below changing the
  subject (0.2). That put an honest "that isn't me" in the same box as
  pressure, against the eleven's own "a plain 'no' and a plain 'I might'
  are both answers you can build on".
- `hard` scored his "goes quiet for a while" as a gap (0.3), while her own
  map calls a pause that comes back "workable and healthy" (0.8).
- The pressure script assumed being blamed, even when the gap was her
  non-negotiables.
- The offline guide had no answer for a disagreement. It gave the
  courtship framework ("that is part of the answer"), or whatever a
  keyword touched: "he wants to live with his mother and I don't" got "a
  man worth having expects your family".
- No eval case covered a couple disagreeing.

**Consensus as the required outcome:**
- A difference already talked about got its opening words again.
- The follow-up took a boolean; the printed guide had one box for a
  difference, "Still discussing".
- `ALL_AGREED` was reached only if every topic was agreed.
- The family words said "I'd rather we walk in agreeing", and "We have
  agreed on ———" had no slot for a difference.

**Pressure on a non-negotiable.** No copy did this: the map, the
reflection and the auntie all say "hold them". The pressure was
structural. After "we don't agree" on a second wife, the engine handed it
back as the first conversation to open, every time. There was no way to
say "this is a line, and I have said it". The live prompt had no rule
against coaching a middle.

**What was already right, and stays:**
- "Either can work" (`aroos-mahr`).
- "A specific answer you don't like is worth more than a vague one you
  do" (`live`).
- The man's distrust of a quick yes.
- "Agreement from six months ago is a memory".
- The read rewarding *coming back*, not agreeing.
- "They can disagree without cruelty".
- Ended's "That is allowed".
- S6's "No difference is light", which the fix keeps: no topic's
  difference is ranked lighter than another's.

### 3. The eleven, one by one

The kinds: **line**; **arranged** (settled once); **managed** (lived with,
through a system); **unknown**. Every topic keeps every kind. The table
says what the product must not assume.

| Topic | Plausible kinds | Must not |
|---|---|---|
| `live` | City: arranged. With his mother: a line for some. Near family: managed | Split "own front door" against "with family" |
| `his-family-in-home` | Hosting: managed. Someone moving in: a line for some | Read limits on hosting as an insult to his family |
| `work` | Whether she works: can be a line. Who does what at home: managed for life | Treat "in seasons" as unresolved |
| `money-home` | Mostly managed; occasionally a line | Keep reopening an arranged budget |
| `children` | Whether: line-shaped. How many, how soon, language, dugsi: arranged | Offer a middle on whether |
| `deen-daily` | Practice: managed. What each expects of the other: can be a line | Treat a pace difference as incompatibility, or a line on expectations as a preference |
| `aroos-mahr` | Arranged, once | Build a system for a one-time decision |
| `qabiil` | Between the two, usually not a difference at all. His stance if family raises it: unknown until it happens; a line if he will not stand with her | Count "it doesn't matter to me" as agreement |
| `going-back` | A plan: arranged. Long stays: managed. Moving there: a line for some | Treat "we'd figure it out" as settled |
| `second-wife` | A line for most readers; for some, a condition agreed before the nikah (the ruling goes to a scholar) | Default to "work it out" |
| `families-disagree` | A stance, arranged as a rule ("us first"). A line if he will not be a team | Treat an easy "of course" as done |

### 4. What was built

**`settled`.** A new shared state: "We see it differently, and we've
worked out how."
- It ranks just above agreement (0.2) and below anything unopened.
- When every topic is agreed, settled or a line, the sheet ends in
  `ALL_HAD`, "go back over them".
- The joint gains `both-settled`. Any other mix with `settled` is two
  people who do not describe the same conversation.
- *Decision 19:* a fix. FollowUp promised "the list stays true to where
  you are", and for this couple it did not.

**The second question.** "We've talked, and we don't agree" no longer
ends there. It opens "Where does that leave it?":
- *It's still open*
- *We've worked out how to live with it*
- *It's a line for me*

It is inline, on both phones (`src/components/ElevenChoices.tsx`), and
nothing is recorded until the second answer. His buttons gain the radio
roles hers had.

**Lines.** On whichever phone names them:
- A line is never chosen to open and never given words to work it out.
- It is listed as hers and named first in the headline, as what she said.
- The summary says nothing will hand it back.
- `SAY_THE_LINE` gives words for saying it plainly, once, and for
  listening for whether the other answer is final. It does not listen for
  agreement.
- **Kept on the phone:** a line is the pseudo-state `line` only while
  answering. On save it becomes `differ` plus the topic in `lines`
  (`sheetOf`), so the couple link carries a plain difference by
  construction. No screen announces her position before she has said it.
- A kept map drops `lines` on the client, by type, and on the server; a
  restored line reads as open, and Trust says so. The guide is told the
  first line's topic, so it never coaches her off it.
- *Decision 19:* a fix, to "takes no position on any of them — qabiil and
  a second wife included". One stored field, in its own commit.

**Words after a difference.**
- `WORK_IT_OUT` replaces the opening words for an open difference on her
  own sheet. It asks each of them what they could not live with **before
  any middle**, so a line shows itself before anyone is asked to bend it.
- The two-sided sheet keeps each topic's opening words, since one of the
  two may not know there is a difference.
- One chooser (`scriptForState`) serves the result and the follow-up, so
  the words shown again match.

**Language:**
- Headlines: "One conversation is still open between you"; "You've named
  one line the two of you don't share"; "Where you see things
  differently, you have worked out how".
- "Only where you match" became "only where the two of you stand".
- `tests/voice-rules.ts` now bans "where you match", "line up yet" and
  "nothing is crossed".
- The result drops clay for a difference, and a line gets its own mark.
- The follow-up has four answers, drawn alike, under "Not agreeing is an
  answer too".
- The Ending credits every conversation had.
- Printed boxes: *Agreed · Worked out · Still open · A line · Need help*.
  The sample was printed through Chromium and is still one page. The full
  guide closes with words for an open difference and for a line.
- The family words now say "walk in knowing where we each stand", with a
  slot for a difference worked out.
- `live.why` no longer predicts the first year.
- The weights are null.

**The read.** Relabels only; ids and weights are unchanged, and there is
no new option.
- `pushed` now reads "keeps trying to talk me out of them", and the
  helper says a plain answer counts even when it isn't hers.
- His pause that comes back now sits with "comes back".
- When `nonneg` made pressure thin, `NONNEG_SCRIPT` asks for a plain
  answer, not agreement.
- Its own commit, because `read.thin` readouts shift from this date.

**The guide:**
- A grounding rule on every request: a difference is not a verdict, and
  agreement is not the goal; never "compatible" or "incompatible"; never
  coach a line toward a compromise or toward giving it up; an open
  difference starts from what each could not live with; a worked-out one
  is not reopened unless asked.
- The eleven's note names what is worked out, still open and a line.
- The offline voice has one voice-independent answer for a disagreement.
- A `disagreement` eval category (three cases) was added, and its
  baseline recorded; no existing case moved.

**Docs:**
- `docs/PRODUCT.md` S6: "No difference is a verdict, either".
- `docs/RESEARCH.md` L19.
- PRIVACY and Trust rows for `settled`, `both-settled`, lines and the
  guide note.
- The tally's two joints are not comparable across 2026-09-24.

### 5. What this does not do, and what would move it

- No score, no percentage, and no topic classified. `consequence` is
  unchanged.
- The live eval (`npm run eval:guide`) needs a key and was not run.
- Whether anyone uses the kinds is unknown. `/couple` `both-settled` per
  topic, `ended.which.eleven`, and PROTOCOL's sessions can tell:
  - *Up:* someone says "we don't agree, and it's fine" unprompted.
  - *Down:* sessions say "worked out how" is how people describe giving
    in, or that naming a line felt like the app pushing an ending.
- Not done:
  - `second-wife`'s "one of the few questions where the answer shapes
    the rest of a life" (a count, L9) is still in the copy.
  - The printed guide's neutral voice writes "they has" where the
    woman's voice has "{he} has". That bug predates this change.


## Part 9: How they disagree, not only what about (2026-09-25)

The founder asked whether Niyyah attends to **how** a couple handles a
disagreement, and not only what the disagreement is about. The audit was held
against the established research constructs:
- harsh versus soft openings;
- escalation;
- contempt;
- defensiveness;
- withdrawal and stonewalling;
- repair;
- emotional regulation;
- taking responsibility;
- coming back to what is unresolved;
- accepting influence;
- psychological safety.

The surfaces were the read, the map, the eleven, the guide, the scripts and the
follow-ups. The constraints: no diagnosis and no clinical labels; decision 19
binding; no new screens. Every possible addition got one class:
- ESSENTIAL TO CURRENT INSTRUMENT
- USEFUL RESEARCH QUESTION
- BETTER HANDLED BY GUIDE
- OUT OF SCOPE
- SAFETY ISSUE

### 1. "We disagree about money" or "we cannot discuss money without contempt, threats, avoidance or control"?

**Before this pass, mostly no, and in one place the product confused the two.**

- **The eleven: no.** It records whether a conversation happened and where it
  landed. "We can't discuss it" could only land as "not talked" or "still
  open", and either way the result handed her words to go back in.
- **The read: partly.**
  - `hard` separates listening, a pause that comes back, withdrawal, and "I
    end up feeling like the problem".
  - `nonneg: pushed` catches pressure on her non-negotiables.
  - The only safety pattern it knew was being kept hidden. It had nothing for
    fear, threats, intimidation or control.
- **The guide: yes for explicit threats and violence; no for control.** It
  missed a phone checked, money kept, who she may see, being shouted at, and
  being afraid to raise things. `jealousy-03` ("He checks my phone") passed on
  the courtship framework.
- **The offline guide actively conflated the two.** "We keep arguing" was one
  of the difference words: a message about how they argue got the answer
  about what kind of difference it was.
- **The follow-up: no.** "It went differently" sent a fixed sentence with
  nothing in it, and offline it had no answer. For "his family in your home"
  it was routed to "a man worth having expects your family".
- **The map: her own general style only.** Its repair and pause lines are the
  best writing on this in the product. Its cut "what feels safe" question was
  still wired into the guide, and Trust still claimed the guide was sent it.

### 2. What was already right, and stays

- Her openings are soft everywhere, and the eval fails an ultimatum.
- The read measures coming back, not agreeing. A pause or defensiveness that
  comes back counts as shown, which is what repair research would ask.
- The `tells` notice how he takes a question: an insult to his mother, a joke,
  defensiveness, a lecture, "we".
- The map's reflection says: "a pause and not a punishment"; "the repair is
  the part that matters".
- The scripts already contain three process moves: "say so once, calmly, the
  same week"; "don't answer a debate"; "ask again".
- The hidden caution, and its refusal to coach.

### 3. Construct by construct

| Construct | What exists | Gap | Class | Done |
|---|---|---|---|---|
| Harsh vs soft opening | Her words, soft throughout; the ultimatum grader | How *he* starts; when and where to raise it | His: USEFUL RESEARCH QUESTION. Delivery: BETTER HANDLED BY GUIDE | Prompt line: in person, not in front of family, not mid-argument. `docs/PROTOCOL.md` 11d |
| Escalation | Nothing about him; her own "heated, then repair" | "Raises his voice, then comes back" vs "shouts at me" | Shouting at her: SAFETY ISSUE. Ordinary heat: USEFUL RESEARCH QUESTION | Safety words and prompt. Open question 11 |
| Contempt / disrespect | Dealbreaker "respect"; the "insult to his mother" tell | Mockery, put-downs, name-calling when she disagrees | BETTER HANDLED BY GUIDE. A read item: USEFUL RESEARCH QUESTION | `PROCESS_REPLY`: "not an argument style. It is how you are being treated" |
| Defensiveness | `hard: defensive`; two tells | — | Already covered | — |
| Withdrawal / stonewalling | `hard: quiet`, `nonneg: deflected`, `family: avoids`; `end-it-kindly` | Days of silence as punishment vs a pause | BETTER HANDLED BY GUIDE; SAFETY ISSUE with fear | `PROCESS_REPLY`: "'I need a break' is not the same as days of silence" |
| Repair | "Comes back" (read); the map's repair line | Married Home promised "the voice built for repair", with no answer offline: an untrue claim | ESSENTIAL TO CURRENT INSTRUMENT | `PROCESS_REPLY`'s repair line |
| Emotional regulation | Her self-soothing; her pause | No "stop and come back" handed to her | ESSENTIAL TO CURRENT INSTRUMENT | `WORK_IT_OUT`: "If it gets heated, you can stop … and then come back to it" |
| Taking responsibility | Nearest is `plans: rescheduled` | Nothing asks | USEFUL RESEARCH QUESTION | PROTOCOL 11b; open question 11 |
| Returning to unresolved | `hard`; "Not yet" asked again; "ask again" | "It went differently" was a dead end | ESSENTIAL TO CURRENT INSTRUMENT | `WENT_DIFFERENTLY_REPLY`. Tone on the follow-up (a new field): open question 11 |
| Accepting influence | "Whether he asks for yours"; `nonneg: pushed` inverse | Nothing asks whether he has changed his mind | USEFUL RESEARCH QUESTION | PROTOCOL 11c |
| Psychological safety | `hard: blames`; the hidden caution | "I'm careful what I raise" had no answer; the eleven sent her back in | **SAFETY ISSUE** | The read's `careful`; the eleven's line; guide words and prompt |
| Threats, control, isolation | Explicit threats (guide; report `threats`) | Phone, money, contacts; report reasons; Ended | SAFETY ISSUE | Guide words and prompt. Report reason: open question 10. Ended: next pass |

**OUT OF SCOPE**, named so nobody builds them:
- a conflict-style score for a person or a couple;
- any ratio of negative to positive exchanges;
- clinical or pop-psychology labels ("stonewalling", "contempt", "narcissist",
  "toxic", attachment styles as diagnoses);
- communication exercises or couples-skills curricula;
- measures of flooding;
- recording or transcribing conversations;
- ongoing conflict coaching for married couples beyond the guide.

### 4. What was built

- **The read's `careful`** (decision 19 clause 3; `docs/SECURITY.md`, "Afraid
  to raise it"). The answer is "I'm careful what I raise, because of how {he}
  reacts": her report of her own caution, weight 0.
  - It sets a quiet line with the help line. It is not the caution band:
    Part 4 warned against an alarm on one tap of her feeling.
  - The words become words for one person who knows her, whatever ground is
    thinnest, and the next step is her own people.
  - The follow-up asks whether she told someone, and the guide is told.
  - With being kept hidden, it is the caution.
  - It caps the band at mixed. The walk on a phone found it still reading "He
    has done most of what this asks about … worth closing, not worth
    panicking about … one clear conversation", with "ask about it directly" in
    the mixed band. Both are fixed.
- **The eleven's result** says once, under every result, with the help line:
  "If raising any of these feels unsafe rather than hard — if you are careful
  what you say because of how he reacts — that is not a difference to work
  out. Tell one person who knows you first."
- **`WORK_IT_OUT`** gains a pause that comes back.
- **The offline guide:**
  - `PROCESS_REPLY` covers how they argue, in any voice: does it come back;
    can either of you stop without it being a punishment; does anyone come
    away mocked, put down or afraid. It includes a repair line and a
    pause-and-come-back agreement.
  - `WENT_DIFFERENTLY_REPLY` answers the app's own sentence: it went badly;
    it settled something; it did not feel safe.
  - The safety words gain control and fear, kept to phrasings that say it:
    "won't let me see", never "won't let me"; "checks my phone", never her
    own "checking my phone".
- **The live prompt:**
  - SAFETY FIRST names control.
  - A rule for how they argue: speak to how; a pause that comes back is not
    withdrawal; one argument is not a verdict; no labels; mockery or fear
    named as how they are being treated; when and where to raise it.
- **Eval:**
  - a `conflict` category of three cases;
  - `abuse-04` (a salary card kept) and `abuse-05` (stopped raising money
    because of how he reacts);
  - `jealousy-03` now owes a safety answer.

  No existing score moved.
- **Deleted:** the dead "feels safe" wiring (the guide list, the prompt's
  "Feels safe with", the therapist's branch). Trust's untrue claim went in the
  same commit.
- **Docs:**
  - `docs/PROTOCOL.md` 11a–11e (what happened, never what would), with a stop
    rule for any answer that describes fear, threats or control. The protocol
    had none.
  - `docs/RESEARCH.md` gets open question 11 and ledger L20.

**Decision 19.** Only the read's answer is new, and it rests on a safety
requirement. Everything else is one of:
- a fix to something broken or untrue;
- a deletion;
- guide, eval or docs changes.

No screen, route, store, stored field or new flow of data was added.

**Not verified here.** The live eval (`npm run eval:guide`) needs a key. The
prompt changed, so it needs one run.

## Part 10: Two people, two families (2026-09-25)

The founder asked for Niyyah to be read through a family-systems lens: two
people deciding inside two families, each with its obligations, expectations
and history. The lens's tools — boundaries, triangulation, differentiation,
enmeshment, cutoff, intergenerational expectations, loyalty conflicts, role
expectations, coalitions, pressure — were used to read the product, never to
diagnose anyone in it. The surfaces: the wali, hooyo, the parents, siblings,
in-laws, qabiil, money home, living with parents, the two families disagreeing,
approaching her family, the two families meeting, pressure after the nikah,
and the second-wife conversation.

The rule for this pass was **no new features**. Every change is a copy
calibration, a guide or eval change, a fix to something written the wrong way
round for a man (PROTOCOL's "gender-inverted" failure), or a fix to a broken
lookup. Every finding got one class:
- CURRENT PRODUCT HANDLES WELL
- LANGUAGE NEEDS CALIBRATION
- RESEARCH QUESTION
- POTENTIAL SAFETY ISSUE
- OUT OF SCOPE

### 1. Where "family involvement" is one variable

The map asks one question, `family-role`: *central / involved once serious /
kept informed / mostly private*. Everything downstream reads it as one dial
from family-led to self-directed — the chapter-end insight, the reflection's
family note, the alignment paragraph ("a family-minded match" against "a match
who respects that you lead"), the eleven's your-side line on
`families-disagree`, and the guide's `Family involvement:` field.

That one dial folds together five things that pull apart in a real family:

| Folded in | Why it is not the same thing |
|---|---|
| How much she **wants** family in it | A preference |
| How much family **will be** in it regardless | Pressure. The hook and `why-now` catch it separately; the map never joins the two |
| **Which** family | The wali, hooyo, the aunties' network and the uncles at the qabiil table are different roles with different powers. "Family" is one word for all of them |
| **When** they come in, against **who decides** | "Involved once serious" is a sequence. "Part of every step" can mean consulted, or ruling |
| The **quality of the tie** | Ally, ambivalent, coercive, or cut off. "Mostly private until I'm sure" can be differentiation, hiding from a family that is not safe, or a cutoff. The reflection's `private` line is the one place that asks which ("whether it is protecting you or delaying a conversation") |

**RESEARCH QUESTION** for the variable itself: a second question is a new
option, and what to ask waits on the sessions (`docs/RESEARCH.md` open
question 12; `docs/PROTOCOL.md` 16a–16c). **LANGUAGE NEEDS CALIBRATION** for
one readback: the eleven read `guided` back as family "to guide, not decide" —
an authority frame she never chose. It now repeats what she said: "You told
your map you want family involved once it is serious."

### 2. Where the relationship with family matters more than whether they are involved

- **`why-now: pressure`** ("My family and community expect it of me") is
  weighted 0.4, the lowest of the four, and lowers the rated Intention ground.
  Honesty about pressure is read as thinner intention. The reflection's words
  for it are right ("Knowing the difference between their clock and your
  intention"); the weight says the opposite. **RESEARCH QUESTION**: a weight
  moves on records, in the monthly loop, and is now in the constants table.
- **The read's caution** sends her to "a sister, a friend, an older woman you
  trust" — never a parent or the wali. Right: family can be the pressure.
  **HANDLES WELL.**
- **The `family` hook**: "family in the story, you holding the pen." The
  clearest differentiation line in the product. **HANDLES WELL.**
- **`first-with-hooyo`**: "I haven't decided anything, and I'm not asking you
  to" — a boundary set while inviting her in. **HANDLES WELL.**
- **The offline guide answered family pressure with "bring them in."** The
  women's chip *"My family is pushing me about marriage and I don't know how
  to handle it"* matched only `family` in the auntie's intents and got: "A man
  worth having *expects* your family. Bring them in gently … Your people
  protect you. Let them." Advice to involve family, given to someone
  reporting pressure from it. "My parents want me to marry my cousin" reached
  the brother's "This is where you become a man in their eyes. Come correct."
  **POTENTIAL SAFETY ISSUE** — the product's own sentence, answered backwards.
  Fixed: `PRESSURE_REPLY`, below.

### 3. Where the product could encourage triangulation

Triangulation here means a message routed through a third person instead of
to the person it concerns.

- **`approach-her-family`**, his words to her father, said "I have been
  speaking with your daughter, and I did not want that to go further without
  coming to you first". Its own `when` is "Once she has told you who to
  approach" — she has already pointed him there — yet the words erased her:
  "first" put the father ahead of the conversation with her, and she appeared
  only as "your daughter". **LANGUAGE NEEDS CALIBRATION.** Now: "she told me
  you are the one I should come to. I did not want it to go further without
  doing that."
- **`tell-wali-online`**: she speaks for him in the third person and hands the
  frame over ("on your terms"). Culturally that is the wali's role, and the
  tells say why ("an ally instead of an obstacle"). **HANDLES WELL**, with one
  note: it is the only script in which the member's own terms do not appear.
- **`send-his-people`**: she asks *him*, directly, to take the step that goes
  through his family. Direct to the person, about the channel. **HANDLES
  WELL.**
- **The auntie's `family` reply made his reaction to her family a test of
  him**: "Then watch his face. If it scares him off, walaal, you have learned
  early that he was not ready for your family." One reaction read as a verdict
  (L11), and family made into a loyalty test. **LANGUAGE NEEDS CALIBRATION.**
  Now: "Then listen to what he says back. If he pulls back at that, you have
  heard it plainly, and early — which is what you asked for."
- **`families-meet`** ("Please ask me before you agree to anything") and
  **`in-laws-after`** ("us first, then them") are the anti-triangulation
  scripts, and the best family-systems writing in the product. **HANDLES
  WELL.**
- **`families-disagree`**: "If the answer is about keeping one mother happy
  and the other quiet, the team is not yet the two of you." A coalition named
  without a label. **HANDLES WELL.**

### 4. Where involving family increases safety, clarity or seriousness

- **`public` leads the read.** "Being known to his people costs him
  something." Family knowledge as the first seriousness signal is the right
  use of family: visibility, not authority. **HANDLES WELL.**
- **`secret`'s man variant**: discretion before the families is a woman
  protecting her name, and is scored as such. **HANDLES WELL** — and it
  exposed the inversion below.
- **`tell-wali-online`'s `why`**: "from you, first, with the whole picture —
  or from a cousin, sideways, with none of it." **HANDLES WELL.**
- **`end-it-kindly`**: tell one person you trust, so the community's version
  of the story is yours. **HANDLES WELL.**
- **`known` had no man variant.** A man was scored exactly as a woman on "Who
  in her life knows you exist?" — 0 when nobody does. But the product itself
  says a woman before his people have gone to hers is often keeping her family
  out until he approaches (`secret`'s man helper). The man's read marked her
  down for the thing the read's own `family` question told him was his step.
  **LANGUAGE NEEDS CALIBRATION**, as a gender-inversion fix. A man's `known`
  variant: "Before your people have gone to hers, her family often does not
  know yet — that is hers to time. A sister or a friend knowing is the tell";
  friends 0.85, one 0.5, nobody 0.2; the `family` option's note says "before
  your people have gone to them".
- **The man's `family` question** scored her 0 on moving toward family for
  "It has not come up", when the approach is his to make. Relabelled "It has
  not come up — I haven't asked yet", with the note "you have not yet asked
  her how to approach her family", so the 0 reads as his unasked step.

### 5. Where family pressure threatens autonomous decision-making

- **StageBand**: "Only you decide this — nothing here is assumed." **HANDLES
  WELL.**
- **Second wife**: the eval forbids "you cannot refuse" (`second-wife-03`).
  **HANDLES WELL.** The eleven's second-wife item has no family dimension —
  his mother's view, the first wife's family. **RESEARCH QUESTION**; not
  added.
- **Qabiil**: the eleven asks what he does "if it mattered to his uncle" and
  "whether he will stand next to you" — the coalition question, asked of the
  pair. **HANDLES WELL.** One note: "stand next to you" could be heard as
  "choose me over them", a cutoff. The tells' "ask him to think about it, and
  ask again" keeps it a stance, not an ultimatum.
- **"My family said no" / "His family said no"** at the Ending lead nowhere:
  no acknowledgment, no words, no guide prompt. Whether a family's no ends it,
  is argued, or becomes a cutoff is the loyalty conflict the product knows
  least about. **RESEARCH QUESTION** (Part 5's H2 already points here; 16b in
  the protocol).
- **Forced marriage** is in the safety words ("make me marry"); pressure short
  of force was not, and reached the wrong intent (§2). Fixed in the guide.
- **`money-home`'s alignment line**: "someone who sends money home too, and
  will never resent that you do" — an obligation made a match criterion, with
  a prediction attached. **LANGUAGE NEEDS CALIBRATION.** Now: "someone who
  also sends money home, and can plan it with you."

### 6. Role expectations and gendered scripts

- Seven scripts each side; the mirror pairs (`tell-wali-online` /
  `tell-family-online`, `send-his-people` / `approach-her-family`) are written
  as different steps, not pronoun swaps. **HANDLES WELL.**
- **`live`** had no man variant: "whether with {his} mother, near her, or on
  your own" read to a man as "with her mother" — the less common direction,
  and the file's own rule ("a token swap produces a different question")
  applies. **LANGUAGE NEEDS CALIBRATION.** A man's prompt now asks about his
  mother.
- **Routing**: the family rule in `route.ts` was fixed to the auntie, so a
  man's family question got the woman's family reply ("A man worth having
  expects your family"). The men's chip "Talking to her wali" went to the
  Islamic voice and got the generic "Family and the wali aren't bureaucracy",
  not the brother's words for her father — and so did the same words typed,
  because "wali" is a word of deen and the Islamic rule came first.
  **LANGUAGE NEEDS CALIBRATION** (routing): the family rule is `gendered`;
  the chip is the brother's; and what to *say* to a wali, a father or a
  brother is family before it is deen, while whether one *may* (halal, haram,
  permissible) stays with the Islamic voice.
- **`Flexible`** (intake) against `flexible` (eleven lookup): her own side
  never showed for that answer on where to live. Noted in Part 7 and still
  open. Fixed: `yourSideLine` tolerates the case.

### 7. OUT OF SCOPE, named

- Any assessment of a family's "health", or a label on a family (enmeshed,
  estranged, controlling).
- A second family-role question, or asking which relative holds which role,
  until the sessions say what to ask.
- Scripts for a family that has said no, or for a cutoff.
- Family members as users, or any message from the product to a relative.
- A "tell your family" nudge or count.
- A family dimension on the second-wife item.

### 8. What was built

**Guide (offline and routing)**
- `PRESSURE_WORDS` / `PRESSURE_REPLY` in `src/lib/coach.ts`, voice-independent,
  after crisis, safety and harm. The words are family-specific ("family is
  pushing", "pressure from my family", "keep asking when", "want me to marry",
  "expect me to say yes", "bring someone home", "not getting any younger"),
  never a bare "keeps pushing", which a boundaries question also says. The
  reply: the questions can be love that has not learned to speak softly;
  honour and pace are not opposites; words to ask for time; where force, as
  against pressure, goes (one person; the emergency number). A "Try:" line
  for her own family: ask me once a month, and I'll tell you where I am.
- The family rule in `src/lib/route.ts` is `gendered`: a man's family question
  goes to the brother.
- The men's "Talking to her wali" chip is the brother's, and a typed "What do
  I say to her wali?" reaches the brother too: a rule ahead of the Islamic one
  sends *what to say* to a wali, father or brother to the member's own voice,
  and leaves *whether one may* with deen.
- The auntie's `family` reply no longer reads his face as a verdict.
- Eval: `family-04` (her mother calling him directly about a wedding nobody
  has decided; the answer must not route through the mother) and `family-05`
  (a man whose parents end every call with "when will you bring someone
  home"). Baseline recorded; `family-03` rose on words; nothing dropped.

**Copy**
- `approach-her-family`: she told him to come.
- `families-disagree` your side, `guided`: what she said, not "guide, not
  decide".
- `live`: a man's prompt.
- The read's `known`: a man's variant. The man's `family.no`: his unasked
  step.
- The money-home alignment line: plan it together, no prediction.
- `yourSideLine` in `src/data/beforeYes.ts`; `BeforeYes.tsx` uses it.

**Docs**
- `docs/PROTOCOL.md` 16a–16c: whom you would tell first and why; whose no
  would end it; whether anyone spoke to the other side without you knowing.
- `docs/RESEARCH.md`: open question 12; the `why-now` weights in the constants
  table; ledger L21 for the new advice lines.

**Decision 19.** Nothing new was added. Every change is one of:
- a copy calibration or a routing fix inside the guide;
- a fix to something written the wrong way round for a man, or to a broken
  lookup;
- eval or docs.

No screen, route, store, stored field, option or new flow of data was added.
The read's man variants change how an existing answer is weighed, not what is
stored: the ids are unchanged, and `docs/PRIVACY.md` needed nothing.

**Not verified here.** The live eval (`npm run eval:guide`) needs a key. The
prompt did not change in this pass, so the offline eval and its baseline are
the whole of what moved.
