# The board audit

*2026-09-12. The company through MJ DeMarco's principles — Need, Entry,
Control, Scale, Time, Effection, Problemology, Productocracy, Value Skew,
Consumer/Producer, Scientist, Process, Business System, Knowledge Gap,
Specialized Unit, Asymmetric Returns, Problem/Purpose, Hard/Easy, and
red-teaming — inspecting the code before the documents about it. Fifteen
questions, every claim labelled; the top ten actions ranked; what was built
from it and what is the founder's to decide.*

## How it was made, and how far it got

Thirteen lenses, one independent inspector each, told to read the code
first, treat every document claim as a claim to check, cite `file:line`, and
label every finding. Twelve completed — 153 findings. The product pre-flight
inspector and the adversarial stage (a skeptic and a board member per
finding) failed on a rate limit, twice, so the verification here is the
author's: every claim the top ten and the build list rest on was opened
against the file it cites and every number re-derived by hand. The pre-flight
of every screen was done by hand in Chromium and is recorded at the end.
Where two lenses disagreed, the ruling is stated.

**Labels.** FACT — verified in code, `git`, or a vendor API on 2026-09-12.
INFERENCE — follows from facts by arithmetic or by the documents' own rules.
HYPOTHESIS — a belief about members who do not yet exist, with the test that
settles it.

**Repository facts the board should hold while reading (FACT).** 149
commits and 21 merged pull requests between 2026-08-27 and 2026-09-11 —
sixteen days. Authors: 127 commits "Claude", 21 "Mohamed", 1 "Hafsa Abdi".
25 strategy documents, 63,200 words, against ~13,100 lines of TypeScript in
`src/data`, `src/lib` and `netlify/`. 32 screens and components; 9 Blobs
stores; 494 tests in 41 files before this pass; 30 closed vocabularies pinned
server-to-client. Zero members. The link has never been posted. The only
real-user evidence in the repository is two people who stopped partway
through an intake (`src/data/intake.ts:10-14`).

---

## The fifteen questions

### 1. What we are doing exceptionally well

- **FACT** — Per-member founder labour before a pool opens is zero, and it is
  enforced in code rather than asserted: no accounts, restore and forget by
  code, peer verification with no review queue, closed vocabularies that admit
  no free text to moderate (`netlify/functions/keep.ts`, `vouch.ts`,
  `netlify/shared/vocab.ts`).
- **FACT** — Every instrument opens from a bare link with no install, account
  or profile, and what a stranger receives is the words with the product as a
  footnote (`src/lib/entry.ts`, `src/lib/words.ts`). Muzz, Salams and Hinge
  all require an install and an account before anything is given.
- **FACT** — The two-sided eleven is a real mechanism, not copy: symmetric
  joint, write-once on both sides, no field that can carry a side
  (`netlify/functions/couple.ts`). It puts the highest-consequence questions —
  a second wife, where you would live, children — in front of a man who never
  chose the product.
- **FACT** — The read and the eleven refuse character verdicts, refuse a
  position on qabiil or a second wife, and every path ends in words she can
  say — including "kept hidden and made to feel like the problem", which is
  sent to a human, not coached (`src/data/read.ts`, `src/lib/read.ts`,
  `src/data/beforeYes.ts`).
- **FACT** — Engineering discipline is unusual for a product with no users: a
  durability test forbids model calls outside two files and asserts every
  instrument runs offline (`tests/durable.test.ts`); the Anthropic dependency
  is non-load-bearing with a client fallback; every public write is capped;
  small cells are k-floored; every record carries a schema version stamped
  while there were zero records.
- **FACT** — The charter of refusals is enforced where it matters: "an
  engagement metric cannot be recorded by this function without someone
  changing this function" (`netlify/functions/progress.ts`).
- **FACT** — The progress facts ledger is the one producer asset: written
  client-side with no human step, validated against closed vocabularies,
  versioned, aggregated on read, copied out by `/export`.

### 2. What is fundamentally weak

- **FACT** — Zero throughput. Sixteen days, 149 commits, 25 documents, nine
  strategic passes since the wedge was chosen — and no link posted.
  `docs/REDTEAM.md` (2026-09-08) closed with "the next pass should be a post,
  not a document"; within 72 hours three more documents and fourteen commits
  landed. The operating loop has never turned: every log it writes to is
  empty.
- **FACT** — *The wedge user had no Home.* `/?read&via=group` and Welcome's
  second door opened the read with stage left at `preparing` and no map;
  `hasHome` reads `completed || stage !== 'preparing'`; Back returned her to
  Welcome, the next visit opened Welcome, and the follow-up her read wrote —
  the North Star's numerator — rendered only on Home. The one metric, for the
  one user, read zero by construction. **Fixed** (`src/lib/inferStage.ts`).
- **FACT** — The most expensive instrument is the ticket to the marketplace.
  Nobody is counted without a kept sixteen-question map (`cohort.ts`), while
  the pool reader needs five fields — age, stage, practice, children,
  dealbreakers (`pool.ts`). The scarce side, a preparing man, meets sixteen
  questions, a form, and "There is nothing to check back on."
- **FACT** — Every step that would produce a marriage or a dollar is a human
  step: opening a pool, queueing and making introductions, telling people a
  pool opened, resolving a report, the backup, the contacts export, every
  revenue line. The automated layer is the free layer.
- **FACT** — Nothing ran on a clock: no scheduled function, no cron, no alert.
  Every sweep, expiry and backup executed inside a GET the founder made by
  hand. **Partly fixed** — the safety check and the backup now run in
  `.github/workflows/watch.yml`; the sweeps still ride the founder's reads.
- **INFERENCE** — The moat is entirely prospective. All six "true barriers"
  (`docs/STRATEGY.md`) depend on stores holding zero records and a revisions
  log that is empty; by `docs/OPERATING.md`'s own rule (a hundred records per
  row, one revision a month) and `docs/WEDGE.md`'s pace, the learning loop
  turns in years.
- **FACT** — The men's side is served by pronoun substitution. The read for a
  man asks whether *she* has asked how to approach *his* family — the
  cultural inverse of the product's own family script; two of five family
  scripts are women-only and none is men-only (`src/data/read.ts`,
  `src/data/families.ts`).
- **FACT** — Three write paths sat outside the protections `docs/HARD.md`
  describes: `POST /keep` with a supplied code overwrote whatever was under it
  with no existence check and no etag; `POST /couple side=second` and
  `DELETE /progress` were uncapped. **Fixed.**

### 3. Which assumptions are most dangerous

Ranked by how much of the plan rests on each.

1. **HYPOTHESIS** — *Men arrive through her.* The code treats him as a
   respondent to her instruments, not a member with a problem. Three men:women
   ratios were carried across the documents — 1:3, 5–6:1, 6:1 — and
   `docs/BACKWARD.md` requires ≤ 3:1 for the economics. At 6:1, forty men
   implies 240 counted women, a third of the ~700 reachable in the metro,
   just to open. *Test:* `sidesByVia.man.*` at two weeks; ten men asked what
   they need. (The documents now carry one working ratio and one bound.)
2. **HYPOTHESIS** — *People come for the Somali specificity* rather than for
   density and trust (`docs/REDTEAM.md` #1). If wrong, the copier is a
   pan-Muslim incumbent adding the eleven as a feature. The eleven may
   themselves be Muslim-diaspora-generic with Somali vocabulary; only qabiil is
   arguably community-specific. *Test:* the ten conversations, three bins, and
   one more question — which of the eleven would a Pakistani or Arab friend
   also need.
3. **INFERENCE** — *The take per marriage is ~$1,000 and the ceiling ~$4M.*
   At the written prices the expected take is **$628** (99 + 0.6 × 750 + 79);
   the "$4M at dominance" row is ~$2.5M. The stated remedy — "$3,000 and up
   at the nikah" — conflated the fee with the take: at half share and 3/5
   attach it yields $1,078; a $3,000 *take* needs a ~$9,400 fee. The
   software-priced share is 28% at best and 13% once the call inside the $99
   line is priced as founder time, failing `docs/BACKWARD.md`'s own ≥ 50%
   must-be-true. The 20,000 marriages/year denominator is asserted: it implies
   a crude marriage rate of 10 per 1,000 (US ≈ 6, UK ≈ 4). **Corrected in the
   documents; prices untouched.**
4. **HYPOTHESIS** — *The problem ranking.* "Is he serious" first, family
   fourth, "am I ready" sixteenth of eighteen — the ranking that shapes the
   front door, the invitation copy and the Home layout — cites a "Problemology
   audit" that exists nowhere in the repository. "Samira", cited in two code
   comments as the user "we lost", is a persona. **The comments now say n = 2.**
5. **HYPOTHESIS** — *People return unprompted when life moves.* The loop the
   documents rank strongest fires only when a follow-up ripens days later on a
   device that came back with no notification of any kind.
6. **HYPOTHESIS** — *The outcome data will exist.* The ending's four questions
   are asked when a married woman reopens an app that has just told her there
   is nothing here for her.
7. **INFERENCE** — *Self-report compatibility predicts outcomes.*
   `docs/REDTEAM.md` #4 concedes it may not; if so, barrier #1 is content, and
   content is copyable.
8. **FACT** — *"The tests run before `main` deploys."* They ran alongside it:
   the same push started both, and a red run stopped nothing. **Fixed** —
   `netlify.toml` runs `verify` first.
9. **FACT** — *The free-year promise permits the concierge revenue test.*
   `plus.ts` promises everyone here before the public launch every paid
   feature free for a year after it; the matchmaker is a paid feature; launch
   is the day the first pool opens. So the first ten couples — the test
   `docs/ROADMAP.md` calls "the only honest test of willingness to pay" — are
   pre-launch members whose nikah payment the promise bars. The company has
   arranged not to learn its revenue answer until year two. **The founder's
   decision, below.**
10. **INFERENCE** — *A6 is runnable.* Its second and third branches read a
    ratio from cells floored at five and were undecidable below seventeen
    arrivals; the kill tests read a cell a man only enters by tapping his
    side. **The rules now say so.**

### 4. Where genuine user Need is strongest

- **FACT** — In the read and the eleven: the two instruments written from a
  named failure, that ask only about behaviour or what has been said, and hand
  her words at the end of every path. The eleven names failure points no
  pan-Muslim product asks about.
- **INFERENCE** — Need is strongest at the two moments with a live
  counterpart — "is he serious, tonight" and "before we say yes" — and weakest
  at "am I ready", by the product's own reasoning and by the two abandoned
  intakes.
- **FACT** — The hook is the only place the product asks her what her problem
  is, it is asked only on the map route, and it has no "something else"
  (`src/data/hook.ts`), so `none` at the door means skipped, none-fit or
  never-reached alike.
- **HYPOTHESIS** — Whether anyone wants either instrument. Zero non-founder
  users. *Test:* the via split in the first fortnight after the post.

### 5. Our strongest potential Value Skew

- **INFERENCE** — **The two-sided eleven**: "he answered the same eleven on
  his own phone, neither of us saw the other's answers, only where we
  matched." Community-specific content plus a both-blind mechanism that
  neither an incumbent nor an auntie can offer. The read, by contrast, is
  generic relationship coaching with one community-specific weight.
- **FACT** — The skew sits where the price does not. Every instrument is free
  forever (`src/data/plus.ts`); "Deciding together" at $99 bundles two things
  already listed free plus one call with a human.
- **FACT** — The claimed cultural-depth skew does not ship: all ten Somali
  lines are `approved: false` and every caller falls back to English.
- **INFERENCE** — The honest door is a skew only once its number is
  non-trivially positive; at zero and zero it is `docs/REDTEAM.md` #6's reason
  to leave.

### 6. What could become a durable moat

- **INFERENCE** — Not the content (constants in the browser), not the matcher
  (`alignment()` has one caller, the sample introduction over invented
  people, and takes an invented `Candidate` no kept map can supply), and not
  the vouch "graph": a vouch is a self-declared relationship id, a first name
  and a sentence, written by whoever holds the token, with no edge and no
  verification.
- **INFERENCE** — The candidates are trust-and-time assets: the owned contacts
  list (empty, and until this pass un-exportable), the ten connectors' rooms
  (named, none asked), and the married-referral graph — which one false
  sentence would poison in a community this tight (Q8).
- **INFERENCE** — The charter of refusals is a structural barrier against
  incumbents whose revenue depends on time-on-app, not against a fresh copier.
- **INFERENCE** — The learning loop becomes a moat only after revisions
  exist. At a hundred records per row it turns in years; a lower threshold for
  low-stakes constants would let it turn in months.
- **HYPOTHESIS** — Being first into ten rooms in one metro with an honest
  count is the only defensible position available this year.

### 7. Where we violate NECST

| Commandment | Verdict |
|---|---|
| **Need** | **Violated at the door.** The ticket to being counted is the low-need instrument; the men's side is served from her need, not his. |
| **Entry** | **Not violated by fake complexity** — the documents concede the content is copyable. **Violated by publication:** the repository is public, so the 25 documents, the operating runbook with every readout route, the cap defaults and the safety-queue design are downloadable by anyone (FACT — GitHub API: `visibility: public`). |
| **Control** | **Was violated in six cheap places.** (a) The monthly "customer list" export saved **no contacts** — `netlify blobs:list` prints keys and etags only. *Fixed in the runbook.* (b) The backup omits every record a member would need restored, undisclosed on Trust. *The founder's decision.* (c) `guide.ts` was an open model proxy: client-supplied system prompt, no body cap, 8,192 output tokens, a daily cap on calls not spend — ~$1,900/day in the abuse case. *Bounded: 32 KB body, 6,000-character thread, 2,048 tokens; the prompt is still the client's — at the gate-off trigger.* (d) The founder gate failed open for every readout but `/safety`, though `/export` returns whole records and `/pool` deletes on read. *Fails closed everywhere.* (e) Free plan: plaintext secrets, no rotation trigger. *The founder's.* (f) CI did not gate deploys. *Fixed.* |
| **Scale** | **Met in labour before a pool** (zero per member, verified). **Violated architecturally** at ~10³ records: every founder readout rebuilds with one list plus one GET per record; the sweeps live inside those tallies; `docs/SCALE.md` said ~100,000 while its own table said ~1,000. *Documented.* **Violated in labour at the first pool:** ~30 introductions a fortnight by hand, from a record that does not exist; `docs/SCALE.md` omitted the term. *Documented.* **Violated in the arithmetic** (Q3 #3). *Corrected.* |
| **Time** | **Violated.** Nothing ran on a clock; Trust promised "every week and no later" with no mechanism; the only notification the product promises is hand-mailed from an export that yielded no contacts. *The weekly check and the monthly backup now run in GitHub Actions; the pool-opened mail stays founder labour by design and `docs/TIME.md` now says so.* |

### 8. What prevents Productocracy

- **FACT** — **The gate.** Every share path hands a stranger a link to a site
  that returns 401 while `PREVIEW_PASSWORD` is set; the playbook posts links
  into groups of 500 with no mention of a password; `docs/ROADMAP.md` item 0
  "waited on nothing" while "public launch" was defined as the day the first
  pool opens, which needs forty and forty, which needs the links posted.
  Circular. *The decision is now written in `docs/DEPLOY.md` and is the
  founder's; item 0 says it waits on it.*
- **FACT** — The founder can never see a send, only an arrival: every send
  event lives in a localStorage ring buffer. "Nobody sends" and "people send,
  nobody opens" produce the same readout.
- **FACT** — The read-first and eleven-first paths had no Home (Q2). *Fixed.*
- **FACT** — The product's most credible referral was a template.
  `marriedShares` handed every woman who reached the ending "Before we said
  yes, we went through eleven conversations" and "We married this year",
  regardless of whether she opened the eleven or when she married. *Fixed.*
- **FACT** — One share text said "I've been using Niyyah" — "I am looking", in
  this community — in violation of the product's own rule. *Fixed.* The
  sample introduction wore a "Vouched by family" pill on an invented person,
  the only vouch badge in the product. *Removed.*
- **FACT** — The public forty is a guess promised as a contract.
  `COHORT_TARGET = 40` is rendered in every door sentence and share, while
  `docs/LIQUIDITY.md`'s checklist says the door reading forty does not open
  the pool. A member can watch the door reach the number she was promised and
  be told it is not open. Count-me is also offered to `talking` members whom
  `/pool` excludes from supply. *The founder's decision.*
- **FACT** — `via=group` recorded the kind of room and could not tell alumni
  from professional from mosque rooms, so the eight-week "channel first"
  pivot could not be read from the readout. *Three room-kind vias added.*
- **INFERENCE** — The share paths have been redesigned repeatedly without one
  observed send.

### 9. What prevents Scale

- **INFERENCE** — The arithmetic (Q3 #3).
- **FACT** — The readout ceiling ~10³, reached around the first pool rather
  than after it, because the progress store is keyed by arrivals not members.
- **FACT** — The public door count is O(members-in-country) per view behind
  one global counter capped at 600/hour for everyone, fetched on every card
  show; one post into a 500-member chat can exceed it, after which every
  visitor reads "the count isn't reachable". *`docs/DEPLOY.md` now names the
  first post as a day to raise the cap.*
- **FACT** — `GET /safety` awaits one blob per key sequentially and every
  resolution writes a stub that is never deleted.
- **INFERENCE** — A 40/40 pool exhausts in ≈ 9 months while replenishment by
  rule is referral per marriage or the founder's posting rate.
- **FACT** — Reach is capped by construction: five named cities for fourteen
  countries; `other` is permanent; `anywhere` was offered as a preference the
  product could not honour. *The chip now says what it does.*
- **FACT** — The North Star could not be read per country: the progress
  record carried a scene and no country. *Fixed — `country` on the record.*

### 10. Easy decisions today that create expensive problems tomorrow

Ranked by future consequence; those closed in this pass are marked.

1. **FACT** — The public repository. *Founder's.*
2. **FACT** — The export that saved no contacts. *Fixed.*
3. **FACT** — The founder gate failing open. *Fixed.*
4. **FACT** — The guide's bounds. *Fixed (code); the console spend limit is
   the founder's.*
5. **FACT** — Fields missing before member one: `country` on the progress
   record (*fixed*); room kinds in `via` (*fixed*); `other` members permanently
   un-placeable (*founder's — the metro list*); no introductions record
   (`docs/HARD.md` row 13, at its trigger); the `never-introduce` outcome
   whose stub carries no code (*Trust now says it is a note*).
6. **FACT** — "Weekly" promised on Trust with no mechanism. *Fixed.*
7. **FACT** — The Netlify build not running `verify`. *Fixed.*
8. **INFERENCE** — Netlify Forms as a second PII copy with no honeypot and a
   ~100/month allowance. *Founder's.*
9. **INFERENCE** — One person's logins for everything; no 2FA record, no
   recovery codes, no second key-holder; registrar undocumented. *Founder's.*
10. **FACT** — A backup that omits every record a member would need,
    undisclosed on Trust. *Founder's.*
11. **FACT** — The free-year promise with no mechanism and no boundary.
    *Founder's — the first decision below.*
12. **FACT** — The institution rule declared true and violated in six places;
    "powered by AI" surviving on three surfaces after being recorded removed.
    *Fixed for the brand strings; the instruments' copy still names the
    community, as content.*
13. **FACT** — Lapsed contacts kept indefinitely. *Founder's — a retention
    rule.*
14. **FACT** — Three regex copies of the code and a hardcoded segment count.
    *Fixed.* The six-character code and the secret in restore URLs. *Founder's.*

### 11. What we should stop building

- **Strategy documents.** Freeze until twenty counted in one metro
  (`docs/WEDGE.md`'s eight-week rule). Sixty-three thousand words is the
  barrier a copier reads for free. This document is the last until then.
- **Anything under the share paths** until the first via-attributed arrival
  exists in `/progress`.
- **Marketplace surfaces** — `matching.ts`, `candidates.ts`, the sample
  introduction, alignment scales — until two real maps exist.
- **The guide.** No additions until A3 has a denominator. **Philosophy**: hold.
- **Hardening around unverified needs.** Keep the suite green; do not grow it.
- **Content polish in `src/data` described as moat.**

### 12. What we should build immediately

**Built in this pass** (high confidence — each a defect, a broken promise, a
document contradicting the code, or a vote that would otherwise be lost):

1. The read-first user's Home — `src/lib/inferStage.ts`.
2. Truthful shares — `marriedShares` conditioned on the eleven, no year; the
   Profile invitation in the third person; the sample's vouch pill removed.
3. The guide's bounds — body, thread, tokens.
4. The three write paths — re-keep never creates or overwrites; the second
   side and the forget capped.
5. Every readout fails closed.
6. `country` on the progress record; room-kind vias.
7. The customer-list export that exports; the weekly safety check and the
   monthly backup on GitHub Actions; `verify` before deploy.
8. Promises reworded to what the code does — the never-introduce mark, the
   sponsor ask, the `anywhere` chip; the brand strings in one file; "powered
   by AI" gone.
9. Every document contradiction in the table below.

**The founder's hands, this week:** post the links to the ten connectors and
log the conversations (`docs/ROADMAP.md` item 0); decide the gate in one
commit (`docs/DEPLOY.md`); flip the repository to private; set a monthly
spend limit in the Anthropic console; add `FOUNDER_KEY` as a GitHub Actions
secret; write the sealed recovery record and hand a copy to one person; turn
on 2FA everywhere; record registrar, expiry, auto-renew and lock in
`docs/CONTROL.md`; have a native speaker approve or rewrite the ten Somali
lines.

**Decide, then build before the first post:** make counting require the five
fields `pool.ts` reads plus a contact, and offer the full map afterwards; name
the second-tier metros for the countries the door already lists, or add an
optional free city to the contact record; "something else" on the hook; raise
`DOOR_HOURLY_CAP` the day of the first post; the guide's system prompt built
server-side from a mode id.

**At the first pool:** the introductions record and the `never-introduce`
identifier in the same commit as the pool-open flag; sweeps on a schedule;
"your pool opened" as a founder-triggered function over the contacts store.

### 13. What we need to learn from real users

Behaviour-anchored conversations (`docs/GAPS.md` method 3), logged in
`docs/FEEDBACK.md`, before any further build.

1. The three-bin question (`docs/REDTEAM.md`): did it understand our
   situation, or was it a room, or neither?
2. Ten men: what does he need; is he a member or a respondent; what would he
   use alone while preparing.
3. Did you send anything, to whom, did they open it — no readout can tell.
4. Would you open this again in three days with nothing prompting you.
5. Who paid the matchmaker at the last family wedding, how much, when. And the
   supply side no document asked: three practising Minneapolis matchmakers on
   what they charge, who pays, and whether they would work a case at $750
   success-only.
6. Which of the eleven would a Pakistani or Arab friend also need.
7. How many raise data privacy unprompted versus "who else is on it" and "who
   is behind it".
8. From the readouts, weeks after the post: counted per hundred arrived
   (≥ 25 is `docs/BACKWARD.md`'s threshold); `sidesByVia.man.*` by room kind;
   the reach mix per country; the eligible-pair share `p`; the via split.
9. The first twenty `ended.reason` / `ended.which` records: inside or outside
   the eleven.
10. One six-month outcome email to counted members is inside the Cohort
    promise and is the primary outcome source.

### 14. What could cause this company to fail

1. **INFERENCE** — The link is never posted, or is posted behind a password.
2. **HYPOTHESIS** — Men do not come: the door reads 40/7 for months; the
   scarce side meets a sixteen-question toll; the ratio is 6:1 not 3:1.
3. **HYPOTHESIS** — Specificity is not why people come, and a pan-Muslim
   incumbent adds the eleven as a feature.
4. **INFERENCE** — A services business run by one person: $628 a marriage
   with 60% from hand matchmaking, ~30 introductions a fortnight at the first
   pool, growth linear in founder posting, and a free-year promise pushing the
   first paid signal a year past the first pool.
5. **FACT-rooted INFERENCE** — A trust failure in a tight community: a
   testimonial sentence false for the woman sending it (now fixed); a plaintext
   key leaked from a free plan; a customer list that turned out to be codes
   (now fixed); a safety report unread under the word "weekly" (now watched).
6. **INFERENCE** — The founder as the single point of failure: one login for
   everything, no successor, no second key-holder.

### 15. What could make this company extraordinary

- **INFERENCE** — If the two-sided eleven is the sentence people repeat, the
  product has a distribution mechanism that reaches the scarce side through a
  woman already attached to him, with nobody admitting they are looking — the
  one path no incumbent's model allows.
- **INFERENCE** — If the honest count in one metro crosses the point where
  emptiness becomes proof, the door becomes the community's own artifact and
  the ten rooms become a position no copier can buy.
- **INFERENCE** — The facts ledger compounds with zero labour. Ten revisions
  from readouts is a real defensibility if the threshold is set so the loop
  turns in months rather than years.
- **HYPOTHESIS** — The institution: a marriage-decision institution paid at
  the nikah where the community already pays, holding the only
  outcome-calibrated record of what Somali diaspora marriages break on.
  Requires the ratio ≤ 3:1, attach ≥ 3/5 and a nikah fee families accept —
  all three untested.

---

## The top ten actions, ranked by expected impact

| # | Action | Whose hands | State |
|---|---|---|---|
| 1 | **Post `/?eleven&via=alumni`, `/?read&via=…` and the door to the ten connectors this week; log the ten conversations.** Decide the gate in the same commit | Founder | `docs/DEPLOY.md` holds the decision; `docs/ROADMAP.md` item 0 waits on it |
| 2 | **Give the read-first and eleven-first user a Home** | — | **Done** |
| 3 | **Decide the ticket to the door: the five fields `pool.ts` reads plus a contact, the map offered after.** Also decides whether a man is a member or a respondent | Founder | Recommendation: yes, and count the man on the same terms |
| 4 | **Make the customer list exportable** | — | **Done** in the runbook; run it once against the three founder rows |
| 5 | **Flip the repository to private** | Founder | One click |
| 6 | **Truthful shares** | — | **Done** |
| 7 | **Bound the guide before the gate comes off** | — / Founder | **Done** in code; the console spend limit is the founder's |
| 8 | **The weekly safety check and monthly backup on a schedule** | — / Founder | **Done**; needs `FOUNDER_KEY` as a repository secret, and `BACKUP_TO_ARTIFACT` once private |
| 9 | **Correct the money, and bound the free-year promise** | — / Founder | Arithmetic **done**; the promise's boundary is the founder's first decision |
| 10 | **Close the cheap irreversibles before member one** — re-keep, the caps, `country`, room kinds, fail-closed, `verify` before deploy, the brand strings, the document contradictions | — | **Done** |

Below the ten, in order: second-tier metros; the ten Somali lines; "something
else" on the hook; raise `DOOR_HOURLY_CAP` the week of the first post;
server-side system prompt at gate-off; sweeps on a schedule and the
introductions record at the first pool; the second key-holder, 2FA and
registrar record; Netlify Forms honeypot or retirement; Trust disclosing that
a kept map lives with one vendor.

## The documents that were wrong against the code — all corrected

| Document | Said | Code |
|---|---|---|
| `docs/CONTROL.md` row 3, `docs/OWNED.md` §2 | The customer list leaves monthly | `blobs:list` prints keys; no contact left |
| `docs/CONTROL.md` | "all six data stores" | nine |
| `docs/CONTROL.md` | "The tests run before `main` deploys" | alongside |
| `docs/DEPLOY.md`, `docs/TIME.md` | `DELETE /safety?code=&side=` "deletes it" | requires `id` and `outcome`; writes a resolved stub |
| `docs/TIME.md` table | Notifications "N/A"; cohort/vouch/couple "no rate limit"; alerts need a vendor | the pool-opened mail is founder labour; every write is capped; GitHub Actions is the channel |
| `docs/STRATEGY.md` §5 | "at software margins"; ~$1,000 take; "does not yet own its own domain"; institution rule "already true" | a matchmaker's margins; $628; owned; violated in six places |
| `docs/BACKWARD.md` | ~$1,000 take, $4M row, $3,000 fee reaches $12M; 20,000 "from REDTEAM's arithmetic"; margins row met; institution rule true; `v` covers every shape change | $628, ~$2.5M, $1,078; asserted; fails at 28%; violated; values only |
| `docs/SCALE.md` | cross-country pool if both said anywhere; ceiling ~100,000; founder hours O(pools) | `anywhere` ≡ `country`; readouts ~1,000; plus O(introductions) |
| `docs/WEDGE.md`, `docs/SCALE.md`, `docs/LIQUIDITY.md` | 1:3, 5–6:1, 6:1 | one hypothesis, one bound, one table row |
| `docs/PRODUCT.md` §2, `docs/DEMO.md` | Welcome promises "the one place she is thinnest"; activation includes a follow-up | "the one thing to say next"; unreachable for the read-first path until this pass |
| `docs/DEMO.md` close | "The build from here: Claude behind the map" | declined |
| `docs/PRODUCT.md` §9, `public/robots.txt`, `docs/DEPLOY.md` | disagreed on the gate's state | one description, in `docs/DEPLOY.md` |
| `docs/ROADMAP.md` item 0 | "Waits on nothing" | waits on the gate decision |
| `docs/ROADMAP.md` | the men-arrived cell "fixed"; `alignment()` dormant and re-aimable | partly; takes an invented `Candidate` |
| `docs/FLYWHEEL.md` | the eleven share "the most credible thing anyone can say" | was emitted to women who never did the eleven |
| `docs/GAPS.md` | willingness to pay LIKELY, "culturally attested" | attested by nobody; ASSUMED |
| `docs/LEARNING.md` | "opens" refused; Count me gates the call | one open per install recorded by default |
| `docs/REDTEAM.md` | plateau test with a metro denominator; null = fewer than five men | global numerator; null also = men who did not tap |
| `docs/MACHINE.md`, `docs/PROCESS.md` | A6 "now runnable"; "Deciding together" paid at the nikah | first branch only; at the move to deciding |
| `docs/EXPERIMENTS.md` A1 | his completion readable from the eleven rung | `he-answered / asked-him` |
| `docs/OPERATING.md` vs `EXPERIMENTS.md` vs `GAPS.md` | three thresholds, no precedence | a rule written before its build overrides the floor |
| `docs/BETS.md` | B10 unbuilt; B2 on Profile only | built; also under the door card on the map screen |
| `docs/DURABLE.md` | the charter uncopyable; "Powered by AI" removed | against incumbents only; survived on three surfaces |
| `docs/OWNED.md` | the documents an asset a competitor lacks | the repository is public |
| `docs/PROCESS.md` | "most of that loop already exists" | its Observe step has never had an input |
| `netlify/shared/founder.ts`, `README.md` | every readout aggregate | `/export` returns per-record data |
| `netlify/shared/code.ts` | the regex copies consolidated | three remained |
| `src/components/Trust.tsx` | the founder can mark a person never to be introduced | no store retains the subject |
| `src/data/ending.ts` | "we will write to you once" | no contact collected, no channel |
| `src/lib/coach.ts`; six comments | the live guide off; "thirteen questions"; "where we lost Samira" | on; sixteen; a persona, n = 2 |

## Where the lenses disagreed, and the ruling

- **CI gates deploys** (Time) vs **does not** (Control). Control was right;
  the Netlify build now runs `verify` first, which makes Time's sentence true.
- **"$250 an unattended month"** (Time) vs **"~$1,900/day"** (Control). Both:
  the ordinary case and the abuse case. The guide is now bounded per call.
- **Lead the first post with the read** (Need; `docs/WEDGE.md`) vs **with the
  eleven** (Productocracy). Ruling: post both in the first week, the eleven
  first — it is the sentence a stranger repeats — and let the via split
  settle it. A playbook change; the founder's, with this recommendation.
- **The charter is the one real barrier** (Entry) — narrowed: real against
  time-on-app incumbents, not against a new copier. `docs/DURABLE.md` says so.
- **"Stop building"** (Need, System) vs the items built here. Every item is a
  defect, a broken promise, a document contradicting the code, or a field
  before member one — none is a feature.

## What did not survive, and what could not be verified

- Refuted: Time's "CI runs the full verify before `main` deploys"; Time's
  "an unattended month cannot exceed roughly $250" (in part); `docs/BETS.md`
  B10.
- Could not be verified from the sandbox and are labelled accordingly: the
  production state of `PREVIEW_PASSWORD` (the host returns 403 through the
  proxy; `docs/DEPLOY.md` and the README say the gate is on); the registrar,
  expiry and lock of the domain; Netlify Forms' free allowance; national crude
  marriage rates (external figures, cited as approximate).
- The adversarial skeptics never ran. Every claim in the top ten and the
  build list was opened against its file; the remaining findings are carried
  above with their inspector's label.

## What is put to the founder — decisions, not made

0. **The free-year promise's boundary** (`src/data/plus.ts`). Member, family,
   or gift-giver — which payments at the first pool's nikahs are inside it.
   Recommendation: "everyone counted before the pool opens keeps every paid
   feature free for a year", with a family's payment at the nikah and a
   guest's gift outside it. Zero members means it costs nothing today.
1. **The gate**: off the day the first link is posted with `noindex` kept, or
   the password in the posts. Recommendation: off.
2. **The door's forty as a contract**: the door sentence becomes the condition
   ("opens when forty on each side can be introduced"), or the checklist is
   published. Recommendation: the condition. And whether `talking` members may
   be counted; recommendation: no — supply is `preparing`.
3. **The ticket to the door**: five fields plus a contact, the map afterwards.
4. **The men's instruments**: write from his side, or state that he is a
   respondent. Recommendation: ask ten men first.
5. **The repository's visibility** and which documents, if any, are public.
6. **The playbook's order**: the eleven first.
7. **Second-tier metros**: the list, for the countries the door already lists.
8. **"Something else" on the hook.**
9. **The Anthropic spend limit; the GitHub secret; 2FA and the recovery
   record; the registrar record; a key-rotation trigger.**
10. **Trust disclosing that a kept map lives with one vendor**, or a
    founder-key encrypted dump of maps and vouches in the monthly hour.
11. **The learning-loop threshold** for low-stakes constants, or the constants
    loop labelled a year-two process.
12. **The code**: keep six characters and the restore link; move `GET/DELETE
    /keep` to a header. Recommendation: keep six.
13. **A retention rule for lapsed contacts** (recommendation: one year after
    `at`, written on Trust), and the Trust sentence "never stored next to your
    answers" made precise.
14. **Offer the keep when the map completes**; read `kept / mapped` first.
15. **A one-bit "asked the guide, ever" fact**, or accept the guide runs
    unmeasured for years.
16. **Decouple the $99 line from the `deciding` declaration.**
17. **The by-hand introduction runbook**, dry-run with two testers; one
    "your pool opened" test mail, timed.
18. **The brand question**: strip the community's name from title, meta and
    hero (institution) or delete the rule (Somali-first). `src/data/brand.ts`
    makes either a one-file change.

## The pre-flight

_The failed product lens, done by hand in Chromium at phone width after the
changes above. Filled below._
