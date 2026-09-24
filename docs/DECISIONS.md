# Decisions

What was decided, when, why, and whether it still holds. Part 1 keeps the
board audit's numbered decisions with their numbers. Part 2 records the
subtraction of 2026-09-24. Part 3 says where each of the 58 old docs went.

Every old doc's full text is in git at commit `43295a4`:
`git show 43295a4:docs/NAME.md`.

## Part 1: Decisions

Decisions 0–18 were made on 2026-09-12 in the board audit, which read the
code through MJ DeMarco's principles (Need, Entry, Control, Scale, Time and
others) and labelled every claim FACT, INFERENCE or HYPOTHESIS. The founder
asked that they not be delegated back. Code cites them as `decision N`. A
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
| 10 | 2026-09-12 | **Trust says a kept map lives with one vendor** and that the founder's backup does not include it, instead of building an encrypted dump now | The honest sentence costs nothing; the dump waits for records | The backup still omits kept maps (`netlify/functions/export.ts`). The Trust sentence sat in the section on being counted and went with it on 2026-09-24 (`0bd7e96`); Trust no longer says it |
| 11 | 2026-09-12 | **The learning loop's threshold splits:** a hundred records for weights, `consequence` and anything that changes a reading; twenty for script wording, order and labels | At a hundred records per row the loop turns in years; low-stakes constants can turn in months | Stands. The monthly loop is in `docs/RESEARCH.md` |
| 12 | 2026-09-12 | **The code stays six characters,** the restore link keeps the code in its URL (the link is the feature), and moving `GET/DELETE /keep` to a header is declined | Six is easy to read on a phone, the read caps were taken to bound enumeration, and the product controls no log that would hold the query string | Superseded in part on 2026-09-23: the caps bound the rate, not the fraction, so codes are minted at eight characters (`netlify/shared/code.ts`, `docs/SECURITY.md` O8). Six-character codes still work; the code stays in the restore link |
| 13 | 2026-09-12 | **The contact lives exactly as long as the map:** the pool's sweep deletes it with the lapsed entry, and Trust says so | Lapsed contacts, the only personal data the product held, were kept indefinitely | Retired 2026-09-24 with the feature. The sweep empties the `contacts` store (`netlify/functions/sweep.ts`) |
| 14 | 2026-09-12 | **The keep stays on the Reflection screen,** the moment the map completes | `Reflection.tsx` already offered it there, and `kept / mapped` (whether people trust the server with a map) is read from the first ten before anything moves | Stands (`KeepMap` on Reflection) |
| 15 | 2026-09-12 | **The guide gets one bit:** `facts.asked = ['guide']`, a set like `began`, which the readout crosses with `followed-through` | The guide is the one metered cost and was unmeasurable before an ending; with the bit, A3 reads in weeks, not years | Stands (`src/lib/facts.ts`, `netlify/functions/progress.ts`). A3 is in `docs/RESEARCH.md` |
| 16 | 2026-09-12 | **The $99 line is sold at the joint view** of the two-sided eleven, never at the stage she declares; `deciding` stays a free word | The joint view is when value has been delivered (both answered blind); `deciding` is a measured word and must not carry a price | Stands as a rule. Nothing is sold: there is no payment code. On 2026-09-24 the line was narrowed to the call alone, once per person for life (`docs/PRODUCT.md`) |
| 17 | 2026-09-12 | **The by-hand introduction is a one-page runbook,** with an hour-per-introduction limit that changes the target or the window if exceeded, and a timed pool-opened test mail | The first pool would be run by hand and no page said how | Retired 2026-09-24 with the feature. The runbook is at `git show 43295a4:docs/LIQUIDITY.md` |
| 18 | 2026-09-12 | **Somali-first stays.** The brand names the community; the institution rule (nothing that would need renaming for a second community lives outside `src/data`) holds for the brand strings | A second community should be a one-file change, and that day is not now | Stands (`src/data/brand.ts`; `tests/brand.test.ts` holds the manifest to it) |

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
explained. It shipped as five commits, `0bd7e96` to `d41f879`.

### Why

- There are no members and no city pool. `netlify/shared/record.ts` notes
  three test rows, all the founder's own. About a third of the product served
  introductions that do not exist.
- The loop that makes Niyyah different depends on none of it: the read or the
  eleven, then the words, then "did you say it?", then the two-sided eleven,
  then the Ending.
- Earlier audits had asked for most of this, and it had not happened: see
  (AUDIT) and (TREE) below.
- `docs/PROTOCOL.md`'s freeze on the door, the map and matching binds during
  the ten-session sprint, which had not started. Cutting first means the
  sessions test the product that will exist.

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

## Part 3: Where every old doc went

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
gate passed about 56% of pairs at any size. Its six conditions are the bar
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
