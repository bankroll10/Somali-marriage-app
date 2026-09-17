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
- **FACT** — The men's side was served by pronoun substitution, and nobody had
  read it. The read for a man asked whether *she* had asked how to approach
  *his* family — the cultural inverse of the product's own family script; two
  of five family scripts were women-only and none was men-only; and the read's
  *result* still called her "he". **Partly fixed** after the founder's own walk
  of the live site — see "What the founder's own walk found" at the end. What
  remains is the whole of it: no man has been asked what he needs.
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

## The decisions — made, 2026-09-12

The founder asked that these not be delegated back. Each is decided here and,
where it is code or a document, done in the same pass; the founder's part is
the handful of acts only an account holder can perform, listed at the end.

0. **The free-year promise is bounded** to what a member is charged: everyone
   counted before her pool opens keeps every paid feature free for a year
   after it opens. A family's payment at the nikah and a guest's gift are
   outside it. `src/data/plus.ts`; the concierge's first ten couples are now a
   permitted revenue test, in year one.
1. **The gate comes off with the first post — the quiet launch.**
   `PREVIEW_PASSWORD` is deleted and a deploy triggered; `noindex` and
   `robots.txt` stay until the first pool opens. `docs/DEPLOY.md` is the one
   description. *Founder's act.*
2. **The door promises the condition, not the number.** Every door sentence
   reads "opens when forty women and forty men here can each be introduced to
   someone — counted, reachable, and fitting at least one person on the other
   side" (`opensWhen` in `src/lib/cohort.ts`); forty is named as the first
   mark. Count-me is offered to `preparing` members only — supply is who is
   looking.
3. **The ticket to the door is the short map**: the three answers the pool
   reads — practice, children, non-negotiables — then age and a way to reach
   her, at the door's own card. The sixteen are offered afterwards, from Home.
   A man is counted on the same terms; a counted person has a Home.
   `src/data/shortMap.ts`, `src/components/ShortMap.tsx`, held to `pool.ts` by
   `tests/short-map.test.ts`; walked in Chromium.
4. **The men's instruments** are not rewritten before ten men are asked; he is
   a member (counted, decision 3), and the read's man-variant stays as it is
   until the conversations say what he needs. Question 2 of the ten.
5. **The repository goes private.** No document is public. *Founder's act.*
6. **The playbook leads with the eleven**, the read in the same week; the via
   split settles which door people use. `docs/WEDGE.md`.
7. **Twelve more cities are named** — Seattle, San Diego, Birmingham, Bristol,
   Leicester, Gothenburg, Oslo, Copenhagen, Helsinki, Amsterdam, Nairobi,
   Melbourne — so nobody is counted as `other` in a city that gets a door a
   month later. Every one reads zero, honestly.
8. **The hook has "Something else."** `none` now means only skipped, and the
   list can be tested (`docs/GAPS.md`).
9. **Accounts and recovery**: a table in `docs/CONTROL.md` for 2FA, recovery
   codes, a second person, the registrar record and the Anthropic spend
   limit, and a rotation rule — quarterly, and on any new team member or
   tool. *Founder fills it.*
10. **Trust discloses that a kept map lives with one vendor** and that the
    founder's backup does not include it — rather than building an encrypted
    dump now. The honest sentence costs nothing; the dump waits for records.
11. **The learning loop's threshold splits**: a hundred records for weights,
    `consequence` and anything that changes a reading; twenty for script
    wording, order and labels. `docs/OPERATING.md`.
12. **The code stays six characters**, the restore link keeps it in the URL
    (the link is the feature), and the header move is declined. `docs/HARD.md`.
13. **The contact lives exactly as long as the map**: the pool's sweep deletes
    it with the lapsed entry (`netlify/functions/pool.ts`), and Trust says so.
14. **The keep stays where it is** — on the Reflection screen, the moment the
    map completes (`Reflection.tsx` already offers it there); `kept / mapped`
    is read from the first ten before anything moves.
15. **The guide gets one bit**: `facts.asked = ['guide']`, a set like `began`,
    and the readout crosses it with `followed-through` — so A3 reads in weeks,
    not years. `docs/EXPERIMENTS.md` A3's rule is rewritten on it.
16. **The $99 line is sold at the joint view** of the two-sided eleven, never at
    the stage she declares — `deciding` stays a free word. `docs/STRATEGY.md`,
    `docs/MACHINE.md`.
17. **The by-hand introduction is a one-page runbook** in `docs/LIQUIDITY.md`,
    with the hour-per-introduction limit that changes the target or the window
    if it is exceeded, and the timed pool-opened test mail. *Founder dry-runs
    it with two testers before pool one.*
18. **Somali-first stays.** The brand names the community; the institution
    rule holds for the brand strings (`src/data/brand.ts`) so the day a second
    community is served is a one-file change, and that day is not now.

**The founder's acts, in order** (steps in the pull request): flip the
repository private → add `FOUNDER_KEY` as a GitHub Actions secret → set the
Anthropic monthly spend limit → set `BACKUP_TO_ARTIFACT` → fill the accounts
table and turn on 2FA everywhere → have a native speaker approve the ten Somali
lines → delete `PREVIEW_PASSWORD` and deploy → post the eleven, the read and
the door to the ten connectors, and write down what they say.

*Done 2026-09-12, by the founder:* private; the secret (the `watch` workflow's
first run was green); the spend limit; the backup variable; the gate off and
`main` deployed; the links posted. *Deferred by the founder:* the accounts
table and 2FA, "later" — the two logins that matter are GitHub and Netlify.

### The Somali lines

The founder had no native speaker to hand and chose a language model as the
reviewer (2026-09-12). Its reading, recorded in `src/data/somali.ts`: all ten
lines understandable; seven reworded for naturalness where the draft carried
an English idiom word for word (`Waa kuu suurtagal` → `Way kuu suurtagal
tahay`; `Guurku waa shaqo` → `Guurku wuxuu u baahan yahay dadaal`, and the
English softened from "and you chose it"); three kept as written. The founder
accepted the review and nine lines are approved and live. The auntie greeting
(`Kaalay, gabadhaydaay`) is held under `VERIFY`: the calling ending is a voice
choice the reviewer asked to have read aloud by a woman from the audience
first, and it has no caller yet, so holding it costs nothing.

**HYPOTHESIS, carried:** a model's Somali is not a Somali woman's Somali. The
test is the ten conversations — if any of the ten reads a line and winces, the
line goes back behind the gate the same day. Four of the ten keys
(`auntie.opener`, `brother.opener`, `map.warmest`, `read.eyebrow`) have no
caller in `src/components` yet; approval makes them available, not visible.

## The pre-flight

The failed product lens, done by hand in Chromium at 400 px after the changes
above, with the functions answering like an empty, healthy site. Every screen
below rendered with no page error, no console error of the product's own, and
no horizontal overflow: Welcome; the read from `/?read&via=alumni` through its
result and Back to Home; the eleven from `/?eleven`; the door from `/?door`,
and again after tapping "A man"; the family words; a restore link whose code
is gone; a couple link that is gone ("This link isn't working."); a vouch link;
Identity → Situation → Hook → the first two intake questions; Home for the
read-first user, and Home again on reload; What decides who you meet; Trust,
with the never-introduce sentence reworded and the old one absent; What is
free and what costs; Philosophy. Not walked: the remaining fourteen intake
questions and the Reflection (the walker's option-clicker could not drive the
second question's control; the intake is unchanged in this pass and covered by
`src/data/intake.test.ts`), the Ending (reachable only at `married`; its share
texts are held by `src/lib/ending.test.ts`), and the Couple screen with a live
pair.

Walked again after the decisions: the door for a man → "Count me in" →
Identity → the three questions of the short map → the door's card with the
new sentence → age and contact → "You’re counted" → "Your space" lands on
Home, and reload lands on Home; the kept map carried exactly practice,
children, non-negotiables and age, and the door's join carried the contact.
No errors, no overflow.

Defects found by the walks: none beyond those the audit had already named and
fixed above. The copy that a member reads first — the door's "Being counted
takes a map — sixteen questions about you… your age, and a way to reach you"
— is true of the code as it stands; whether the map should be the ticket is
the founder's decision 3.

## What the founder's own walk found

The pre-flight above was done in Chromium against intercepted functions. On
2026-09-12, an hour after `PREVIEW_PASSWORD` came off, the founder walked the
deployed site on a phone — as a man, which no walk had done — and reached
question 7 of the read. The pronouns were right. Three things behind them
were not, and all three are the same defect: **the men's side was her side
with the pronouns flipped, and nobody had read it.**

| # | What a man met | Label | Fixed |
|---|---|---|---|
| 1 | The read's *result* called her "he" — nine strings and two dimension labels. The caution band told him this was "the shape that leaves women without anyone to compare notes with" and to tell "an older woman you trust", about the woman he is deciding on | FACT, printed from `buildRead(answers, 'man')` | Every sentence a result returns passes through `speak()`; `readSummary` takes the gender; `tests/mens-read.test.ts` reads all five bands from both sides |
| 2 | Three of the eleven graded him backwards. `family` asked whether *she* had asked how to approach *his* family — full marks for yes, zero for no — while `src/data/families.ts` tells a woman that a serious man asks how to approach *hers* and that she should ask him to send his people. `initiative` scored her never texting first at zero; `secret` scored her asking for discretion at zero | FACT (the inversion); INFERENCE (that restraint is ordinary on her side, from the product's own family scripts) | His `family` asks whether she will tell him who to speak to and when; restraint is no longer zero. Variants merge by option id, so a read kept from either side stays readable and `read.ts`'s named cases still mean what they mean |
| 3 | A man who reached the family ask had no words behind it: two scripts were women-only, none was his | FACT | `approach-her-family` — what to say standing in front of her father or her brother |
| 4 | Found by walking the fixed read, not by reading it. The card under his result advertised "telling your wali, the first conversation with hooyo, asking her to send her people" — two scripts a man is never shown, and his own step backwards; and the invite row offered the read to "a sister" | FACT, walked in Chromium at 400 px | The card's line is derived from `familyScripts(gender)`, so it cannot name what is not behind it; the friend is the sender's own side |

**The eight questions that transfer** were left alone. `named`, `timeline`,
`known`, `in-person`, `plans`, `nonneg`, `hard` and `duration` read the same
from either side once the pronouns resolve, and changing them would have been
a rewrite rather than a repair.

**What this does not settle.** The audit's men's-side finding was that the
read is written from her vantage; three questions of eleven were, and are not
now. It is still true that no man has been asked what he needs, that the door
counts him as supply on her instruments, and that `docs/GAPS.md`'s men's-side
row is ASSUMED. Ten men, before anything else is built for him.

**The rule this walk earns:** nothing ships to a side of the product nobody
has walked on a phone. The Chromium pre-flight covered every screen and
missed all three of these, because it walked as a woman.

**Still the founder's hands:** the "Powered by Netlify" badge. It is not in
our code — Netlify turns it on by default for Free-plan projects created on
or after 2026-08-19, and the API does not expose the switch. Netlify →
`getniyyah` → Project configuration → General → "Powered by Netlify badge" →
off. No redeploy needed. It tells every visitor the site is on a free plan,
on a product whose front door is trust.

## The reality sprint — one launch-hardening pass

*2026-09-12, after the founder's walk and before the links go to real people.*
The strategy phase is over. This pass fixed only what could make a real-user
test **invalid, unsafe, misleading, broken, or harder to trust than it needs
to be**. Everything else is in the deferred list below and was left alone.

| # | Problem | Why it could corrupt the sprint | The fix | The test |
|---|---|---|---|---|
| 1 | **The Guide was a general-purpose Claude endpoint.** The browser built the whole system prompt and posted it; `guide.ts` checked only that it was not empty | The hourly and daily caps are global. Anyone using our key eats the same 400/day the testers draw from, and when it empties every member silently gets the offline voice — the client reads every failure as a fallback, by design. We would have spent a fortnight measuring the local matcher believing it was the live guide | The prompt is built in `netlify/shared/prompt.ts`. The caller names one of five voices and fills named slots; a `system` in the body is ignored (not refused, so a cached client still works). Every slot is checked against a closed set where one exists, and otherwise flattened to one line and cut | `tests/guide-prompt.test.ts`, `tests/guide-function.test.ts` — an injected prompt never reaches the model; an unknown mode is a 400 before it; a value carrying newlines cannot start a line, and every rule in this prompt is a line |
| 2 | **Trust's guide disclosure said "exactly what it sends" and named nine of thirteen.** The age, the side, the attachment lean and what someone feels safe with went unlisted, as did the earlier turns of the thread | Trust is the one screen whose whole job is being believed. A tester who reads it and then learns what actually leaves has been misled by it, and in a community this tight one person saying that out loud ends the test | The sentence names all of it | `tests/guide-disclosure.test.ts` drives the list off the prompt itself: add a field to the prompt and the disclosure fails until it is named |
| 3 | **The door's signup posted the map code to the form service.** A six-character code is the sole authenticator for reading a map *and* for the cascading delete, and it sat in a third party's row beside the way to reach her — while Trust said it "is registered to nobody" and the contact was "ours to hold rather than a form company's" | The most sensitive claim, at the moment of collection, on the most sensitive data | The code no longer travels there. The second copy is named on Trust and in the fine print under the form, and so is the fact that Forget me cannot reach it | `src/lib/waitlist.test.ts` pins that no `code` field is sent |
| 4 | **Forget me left the eleven behind for anyone who never kept a map.** `createCouple` needs no map code, and the cascade finds the couple code inside a kept snapshot | The eleven is what the sprint asks people to try, and Trust says forgetting deletes it with no condition attached. Told it was done; both sheets stayed for ninety days | The sheet has its own delete, keyed on the couple code that both of them hold. It touches nothing else — never a safety report, so a man cannot erase one about himself, and never the joint tally, which has no code in it to find | `tests/couple-function.test.ts`, `src/lib/forget.test.ts` |
| 5 | **Reading a pool deleted from it.** Every `GET /pool` swept: anyone whose map read as absent lost their place on the door and the only way to reach them, permanently, inside the readout — which reported a count and never a code | The readout is the instrument. The founder reads it every few days, and a test of twenty to forty cannot absorb a silent loss or detect one. A map reads as absent when it lapses, when it is forgotten, and for a moment when the store does not answer | Sweeping is `?sweep=1`. A plain read counts what it would take and says whether it took it | `tests/pool-function.test.ts` — a read leaves the entry, the index and the contact in place, however many times it runs |
| 6 | **Nothing tested the follow-up chain**, though every link was unit-tested alone. The last time it broke, no test noticed | "Did they actually say the words" is the sprint's outcome measure. Broken again, every number comes back zero and reads as "nobody followed through" rather than "nobody was asked" | No product change — the chain holds | `src/lib/followup-chain.test.ts` walks a stranger on `?read` and `?eleven`, both genders, from no state to the ask ripening on day three |

**Walked**, Chromium at 400 px, store cleared between runs: `?read` and
`?eleven`, each as a woman and as a man, all eleven questions to the result and
its script; the send-to-them screen; the guide live and with the function
refusing. No page errors, no wrong-side words, nothing broken. The one defect
the walk turned up was in the walker.

**Deferred, and untouched.** Forged `coach` turns in the history — a real
vector, but against a server-owned prompt it yields a constrained Niyyah reply,
not a proxy. Per-member guide caps. The limiter failing open, which is
deliberate. Cutting `attachment` and `comm-safety` from the prompt — a product
decision, after the sprint. Closed vocabularies for the six intake answers that
have no server twin; the length cap and the flattening shut the slot. The
`?fresh` / `?demo` params, which no posted link can carry. `GET /progress`
deleting year-stale records, when nothing is a year old. A follow-up written by
`?families` or a guide commitment for someone with no Home: written, and never
askable — out of scope because `?read` and `?eleven` are what is being posted,
and recorded in `src/lib/followup-chain.test.ts` so that number is read as "not
asked" rather than "did not follow through".

## The atomic network — the analysis, and no build

Written 2026-09-12 as `docs/ATOMIC.md`, on Andrew Chen's Cold Start frame:
a network product is valuable the moment its smallest self-sustaining network
exists, not at a count. The founder's question was whether one serious
person entering today would meet several compatible, active possibilities.

**What it found.** FACT: the network half of the product is a readout and a
person — nothing introduces anyone, and there is no record of an
introduction. INFERENCE, from simulating `pool.ts`'s own `eligible()`: the
coded gate passes about 56% of pairs at *any* pool size, so the opening
checklist's `λ ≥ 5` held at nine a side and its `stranded` line — floored —
read `null` with four people stranded. Forty and forty on the door measured
the two things the gate can see. What decides a pool is two numbers the
architecture does not hold: the share of eligible pairs where an
introduction is welcome both ways, and the share of counted members still
there to answer. At the plausible value of the first, a woman arriving at
forty and forty has a coin-flip chance of three real options; at forty women
and seven men, under one in two of even one.

**The determinations.** The atomic network is about twenty-five active
preparing women and twenty active preparing men in one metro, all within the
age rule, seven in ten answering an introduction within a fortnight, served
by one founder making ten to fifteen introductions a fortnight. Six
conditions replace forty and forty (`docs/ATOMIC.md` §6). The constraint that
most reduces liquidity is the men's activity, then geography as a false
pool, then the hidden compatibility rate. Twelve assumptions carry tests;
twelve metrics read the network's health, none of them engagement.

**Decisions.** The analysis is a document and the checklist is rewritten in
every document that carried the old lines. The code — an introductions
record, activity from answers, the founder's raw view, the door reading its
condition from them, a pool state, refusal reasons as vocabulary, four
readout corrections (T1–T7) — is planned and **held**, because the founder
said plan first. The door's sentence stays as it is until T1 and T2 exist:
promising "active" members with nothing measuring activity would be a claim
the code cannot back, which is the class of defect the reality sprint
removed. The first build, when it comes, is the introductions record — every
introduction made without one is the one number this plan is missing, thrown
away.

## The search pass — why the domain read as broken

The founder searched `joinniyyah.com` on 2026-09-13 and found the domain
listed with no title and the line "No information is available for this page",
under an AI summary saying the domain "does not currently host an active or
widely recognized public website". Below it, ranking with a full title and
description: `niyyahmatch.com`, a private Muslim matchmaking service in the
GTA, Ottawa and Montreal.

**Nothing was broken.** Two settings told crawlers to stay away, both
deliberate (decision 1, the quiet launch): `X-Robots-Tag: noindex, nofollow`
on every path in `netlify.toml`, and `public/robots.txt` disallowing
everything.

**But they cancelled each other, and the result was the worst of both.**
Getting a page *out* of Google requires the opposite of what it looks like:
the crawler has to be let in so it can read the `noindex`. A disallowed crawl
never reads anything, so a URL Google has seen linked stays listed — with
nothing under it. So the configuration did not hide the site. It published a
result that reads, to anyone who does not know better, as a site that is
defunct or hiding something.

**Two facts changed the decision.** First, that cost lands at exactly the
wrong moment: the playbook's next act is handing links to strangers
(`docs/ROADMAP.md` item 0), and a cautious woman asked to trust a marriage
site with her contact details will search the name first. Second, another
Niyyah holds that search. Toronto is third on the expansion path
(`docs/WEDGE.md`).

**Decided, 2026-09-13: the site is indexable from the day the gate comes off,
not from the day the first pool opens.** Both blocks are removed;
`robots.txt` and `sitemap.xml` are written by `vite.config.ts` so they carry
the same host as every link (`src/lib/site.ts`); `index.html` gained a
canonical tag so the `?read`, `?eleven` and `?via=` links posted into group
chats do not become separate thin results. `tests/deploy-layout.test.ts` holds
all four in place, because the way back is a one-line "just while we test"
that nobody remembers to remove.

**What this does not risk.** Nothing a member keeps is rendered into HTML: a
map lives under a code nobody can guess, the door's counts are floored, and
the functions are disallowed as the API they are. There is no marketplace to
flood and no member to expose. A stranger who arrives early meets a door that
says plainly it is not open and introduces nobody — which is what the
reality-sprint pass made true.

**Still the founder's.** Search Console is a DNS record and three clicks;
`docs/DEPLOY.md` has the steps. None of it works while `PREVIEW_PASSWORD` is
set, so the gate comes off first. And the brand collision has no technical
fix — links from places Google trusts are what move it, which is the room
playbook, not a tag.

## The tools at their own addresses — the sharing pass

Written 2026-09-17, on the founder's brief: make the existing seriousness tool
directly shareable. During inspection every route kept the address at the
homepage — `src/main.tsx` read `?read` once, stripped the query, and the bar
never moved again. So a reload landed on Welcome, the bar copied into a chat
sent the homepage, and a shared link previewed as the homepage.

**Built.** Three paths, defined once in `src/data/tools.ts`:
`/tools/is-he-serious` (the read, reader preset as a woman),
`/tools/is-she-serious` (the read, reader a man), `/tools/before-you-say-yes`
(the eleven, asking as before). `entryFromUrl` reads the path; the bar mirrors
the tool by `replaceState` only — no history is manufactured, so Back behaves
as it always has and an eleven-question flow cannot be half-lost to a Back tap.
The preset side is committed to identity when she starts, never on load, and
never over a side she has already given; when the address guessed, the intro
says so and flips in one tap. The intro gained the sentence the brief asked for
and the code supports — no account, answers stay on this phone unless you keep
your map — and an example result built by the real engine from a fixed set of
made-up answers, labelled as an example, pinned to the middle band by test so
a weight change can never turn the landing example into a warning. "Share this
tool" is the invitation row already on the result, pointed at the tool's
address for the friend's side; the link carries the path and a via the ladder
already knows, and nothing else. The build writes one HTML document per tool
with its own title, description, social card and canonical, and the sitemap
lists all four pages.

**Not built, and why.** No new via: `words` and `eleven` already mean "a
friend handed you the instrument", and splitting a young channel under the
k-floor makes both halves read null for longer. No `next_conversation_open` or
`return_visit` events: the first is an attention trace on a screen the result
already occupies, the second is refused by `docs/LEARNING.md`; everything else
the brief named already exists as a rung or fact. No age gate on the read or
the eleven: none existed, the brief said preserve, and the tools write nothing
to a server on their own — recorded here as the open question it is. Query
weights, questions and results untouched.

**Walked**, Chromium at 400 px, a fresh context per check, forty-three
checks: each route direct, on reload, with a trailing slash and with a via;
the switch line; the eleven's chooser; a full read by the path and by `?read`
giving the same result; reload returning to the intro with the past read
offered; in-app Back returning the bar to `/`; the share text ending in the
blank link and opening blank elsewhere with nothing of the sender arriving;
every request body free of answer ids and the progress body carrying only its
coarse keys; Welcome's own button reaching the same address; the older links
untouched.

**Still the founder's.** `PREVIEW_PASSWORD` gates every route until it is
deleted. After the first deploy, the one `curl` in `docs/DEPLOY.md` for a
Pretty-URLs redirect. The follow-on backlog: N2 (the eleven as a standalone
page and printable cards) builds on `/tools/before-you-say-yes`; A2 and A3
name `/standard` and Altomic and belong to a different project, not this
repository.
