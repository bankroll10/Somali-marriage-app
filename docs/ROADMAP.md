# Niyyah — the roadmap, audited against the nine, and reorganised around the one act that unblocks it

> A Fastlane audit: every shipped and proposed feature against Need, Value
> Skew, Productocracy, Effection, Entry, Control, Scale, Time and Learning.
> Nothing scores well for sounding impressive. The result is not a better
> ordering of the same queue — it is the discovery that the queue's first
> item waits on something the queue does not contain.

## The three findings that produced this file

**1. The roadmap's first item assumes traffic that no roadmap item
produces.** `docs/PRODUCT.md` §10 used to open with *"Run the loop — from
the first hundred records."* There are three founder test rows. The act
that produces records — ten connectors by name, and the posting of
`/?read&via=group`, `/?eleven&via=group` and `/?door&via=group` — lives in
`docs/WEDGE.md`'s playbook and **was not a roadmap item at all**. Seven
build items queued behind a non-build act that no document treated as work.
It is now item 0.

**2. Productocracy is zero, everywhere, without a single exception.** Not
one feature here has been chosen by a stranger. DeMarco's test is that the
market is the arbiter; this market has never spoken. So no shipped feature
has earned its place, and no proposed feature can be justified by anything
except reasoning — which is what nine passes of documents have been doing.
`docs/REDTEAM.md` hit the same wall: *"twenty-one documents, zero
members."* An audit that answered by proposing more features would be a
worked example of the failure it is auditing.

**3. Most "measurement" never leaves the device.** `src/lib/analytics.ts`'s
`track()` — 28 call sites — is a localStorage ring buffer, deliberately and
correctly (`docs/LEARNING.md` forbids the alternative). So the
business-visible surface is only: twelve rungs, the facts, `began`'s four
bits, the door count, the couple tally, and vouch asked-versus-given.
Measured against *that*, the guide stack (1,390 lines, the only paid
dependency) records **nothing**; the sample introduction (806 lines) records
**nothing**; the work card's steps record **nothing**. Three of the largest
things in the product cannot be voted on either way.

## The nine tests, defined for this product

So that a score means the same thing in every row.

| Test | The question asked of every feature |
|---|---|
| **Need** | Does a real person feel this *this week* — or does the founder feel it? |
| **Value Skew** | Does it make us asymmetrically better than Muzz, Salams, Hinge and the aunties, on the axis that decides? |
| **Productocracy** | Has the market voted? Today, nowhere. So scored as: *can it ever be voted on* — is it instrumented at all? |
| **Effection** | Reach × magnitude. Many people, or few people profoundly? |
| **Entry** | Does it raise the barrier for a copycat, or could a competent team ship it in a week? |
| **Control** | Ours, or a supplier's? (`docs/CONTROL.md`, `docs/OWNED.md`) |
| **Scale** | Can it serve ten thousand without linear founder cost? |
| **Time** | Does it detach value from the founder's hours? |
| **Learning** | Does it settle a row in `docs/GAPS.md` or `docs/REDTEAM.md`? |

● passes · ◐ partly · ○ fails

**The one rule for building before the votes come in.** A feature may be
built now only if it **records a vote that would otherwise be lost for
ever**. A funnel cannot be recovered from traffic that has already passed
through. That is the same argument that justified the customer list
(`docs/OWNED.md`) and the introductions record's same-commit trigger
(`docs/HARD.md`), and it is the only exception to finding 2. Everything else
waits for a number.

## Shipped, scored

| Feature | N | VS | P | Ef | En | C | S | T | L | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| **The read** — has he actually done anything | ● | ● | ● | ● | ◐ | ● | ● | ● | ● | **TEST FIRST** |
| **The eleven** (`BeforeYes`) | ● | ● | ● | ● | ● | ● | ● | ● | ● | **TEST FIRST** |
| **His side of the eleven** (`Couple`) | ● | ● | ● | ● | ● | ● | ● | ● | ● | **TEST FIRST** |
| **The map** (intake + reflection) | ◐ | ● | ● | ● | ◐ | ● | ● | ● | ● | **TEST FIRST** — A1 is written and unrun |
| **The follow-up** — *did you have it?* | ● | ● | ● | ● | ● | ● | ● | ● | ● | **TEST FIRST** — the North Star metric lives here |
| **The door / cohort** | ● | ● | ● | ● | ● | ● | ● | ● | ● | **TEST FIRST** — and see the defect below |
| **The family vouch** | ◐ | ● | ● | ◐ | ● | ● | ● | ◐ | ● | **TEST FIRST** — A2, unrun |
| **The ending, and *ended*** | ● | ● | ● | ◐ | ● | ● | ● | ● | ● | **TEST FIRST** — the dataset nobody has |
| **Keeping the map** | ● | ◐ | ○→● | ● | ◐ | ● | ● | ● | ○→● | **BUILD NOW — done this pass.** See below |
| **Family scripts** | ◐ | ● | ● | ◐ | ● | ● | ● | ● | ● | **TEST FIRST** — A4, unrun |
| **Report a concern** | ● | ● | ◐ | ◐ | ● | ● | ○ | ○ | ◐ | **TEST FIRST** — human by design (`docs/TIME.md`) |
| **The guide** (1,390 lines) | ◐ | ◐ | ○ | ● | ○ | ○ | ◐ | ● | ○ | **TEST FIRST**, default off. See below |
| **Sample introduction** (806 lines) | ○ | ◐ | ○ | ○ | ○ | ● | ● | ● | ○ | **DELETE its Home card — done this pass** |
| **Trust** | ● | ● | ○ | ● | ● | ● | ● | ● | ○ | **DEFER, untouched** — a promise, not a funnel step |
| **Plus** | ◐ | ● | ○ | ◐ | ● | ● | ● | ● | ○ | **DEFER, untouched** |
| **Philosophy** | ○ | ● | ○ | ○ | ◐ | ● | ● | ● | ○ | **DEFER, untouched** — positioning, and it costs nothing to hold |
| **Profile** | ◐ | ● | ○ | ◐ | ● | ● | ● | ● | ○ | **DEFER** — and it gained the sample |
| **`card.ts` + `shareImage`** | ○ | ○ | ○ | ○ | ○ | ● | ● | ● | ○ | **DELETE — done this pass.** Zero importers |

### The three shipped verdicts worth arguing with

**The guide is the weakest large thing in the product.** It is the only paid
dependency, the only supplier in a core surface, the easiest thing here for
anyone to copy — wrapping a model is a week's work — and it is *unmeasurable
by construction*: `src/lib/facts.ts` deliberately keeps its follow-ups out
of `facts.through`, so nothing it does reaches a readout before an ending
exists. Its best use, the 1am spiral, is the one thing `docs/STRATEGY.md`
has ruled it will never sell. `docs/DURABLE.md` already calls the model a
supplier and the guidance ours; `docs/REDTEAM.md` proposed inverting the
default. This audit agreed: **leave `ANTHROPIC_API_KEY` unset and make A3
argue the model *on*, rather than paying for it while waiting for A3 to
argue it off.** The local voice is already what every member gets without a
key.

> **Raised, and declined by the founder — 2026-09-10.** The guide stays on.
> The reasoning above is left standing rather than edited away, because a
> recommendation that loses is still the record of what was weighed: the guide
> remains the only paid dependency, the only supplier in a core surface, and
> unmeasurable before an ending.
>
> Two things make the decision safe rather than merely made. **Trust already
> earned it**: the screen names Claude and Anthropic, states exactly what is
> sent, and offers *"Keep the Guide on this device"*, which answers offline and
> sends nothing — so the promise `netlify/functions/guide.ts` said must be
> rewritten before switching this on had already been rewritten. And **the
> month now has a ceiling**: `GUIDE_DAILY_CAP`, because the hourly cap bounded
> an hour and nothing longer (`docs/DEPLOY.md`).
>
> **A3 is untouched and still governs.** Fewer than one in five who reach an
> ending name the guide, and the live half goes
> (`docs/EXPERIMENTS.md`, `docs/PROCESS.md`'s kill table). Declining the
> default-off recommendation is not declining the measurement.

**The sample introduction sold an invented person from the home screen.**
Labelled honestly, four times — and still the wrong screen. Home is for the
woman with a live problem tonight; a preview of a marketplace that does not
exist is not that, and this product's stated difference is that it never
pretends a city is full. It moved to *What decides who you meet*, which is
already about how the choosing works. The engine stays: it is the pool's,
dormant by design — and not yet re-aimable: `alignment()` takes an invented `Candidate`, and no adapter from a kept map exists (`docs/BOARD.md`).

**Keeping the map was the one hole traffic would have made permanent.**
`docs/GAPS.md` ranks *"people will not put a map on a server or leave a way
to be reached"* third most dangerous and names `mapped → kept → counted` as
its test — but `kept` was a device-only ledger id, not a rung. A woman who
built a map and stopped, and one who kept it and never walked through the
door, arrived as the same number. Two failures, two different fixes, one
statistic. Built this pass under the rule above, because a funnel is not
recoverable afterwards.

## The defect the pre-flight found

The three playbook links were walked in Chromium before recommending that
anybody post them. All three land on their instrument, strip the query and
report `via: 'group'`. But **the door never asked which side the visitor was
on**, and `arrived` fires the moment the page loads. So a man who read the
number and left was recorded `unsaid`.

That is precisely the cell two decision rules read: `docs/MACHINE.md`'s A6
at four weeks and `docs/REDTEAM.md`'s second kill test at two weeks both
test `sidesByVia.man.group.arrived`. Both would have been reading *men who
went on to start a map*, not *men who arrived* — collapsing the two
possibilities A6 exists to separate, **the channel failing and the map
turning men away**. A channel that worked could have been killed by its own
instrument, on the strength of a number that was never measuring it.

Fixed this pass: one tap on the door, above the city, asked only when the
side is not already known, pre-filling Identity so nobody answers twice.

## Proposed — the four buckets

166 distinct proposals across 21 documents were inventoried. Collapsed to
their real items and scored, they fall out like this.

### BUILD NOW — four, and three are not features

| # | Item | Why it survives the rule |
|---|---|---|
| 1 | **Post the link** — ten connectors by name, this week; then the three URLs | It is the only act that produces a vote. No code |
| 2 | **The `kept` rung** | Records a vote that is otherwise lost for ever. **Done this pass** |
| 3 | **Mail on `joinniyyah.com`** (`docs/CONTROL.md` step 5, `docs/OWNED.md`) | The playbook is about to send strangers to a site whose contact address is rented. An afternoon; founder-side |
| 4 | **Write the price into `docs/STRATEGY.md`** before the pool opens | Costs nothing, and makes the eventual checkout a prediction rather than a reaction (`docs/REDTEAM.md`). **Done 2026-09-11** (`docs/BACKWARD.md`): a dated prediction, and public launch defined as the day the first pool opens |

The door's side question joined this list when the pre-flight found it.

### TEST FIRST — the entire current product

A1 (intake length), A2 (the vouch), A3 (the guide), A4 (family scripts), A6
(the door for men), and `docs/REDTEAM.md`'s three. **Six decision rules,
every one written before its build, and not one has ever been run.** This is
the whole shipped surface. The correct next act on all of it is to read it.

Nothing in this bucket needs another line of code. That sentence is the
audit's main finding about engineering effort.

### DEFER — the pool-gated majority

The introductions record (same-commit rule holds), match quality, mutual
interest, block-before-introduction, the joint alignment tally, the
pool-open flag, running counters, "your pool opened" mail, payments and the
checkout, events, the first-year sheet, the age band, the prior-marriage
question, real backend, schema versions, per-country readouts, the
matchmaker's tooling, the safety alert. Their triggers are already written
and correct. Nothing about them changes but their position. The cohort
reconcile left this list in `docs/LIQUIDITY.md`, built as the founder-read
half; the age question left it half-way — asked, into the map, never a key.

Two move *down*, against their own documents:

- **"Your record"** — `docs/PROCESS.md` marks it runnable now, and it is.
  But nobody has ever asked for it, and Forget-me already delivers the
  substance. *Trigger: the first member who asks, or the first pool.*
- **`docs/CONSTANTS.md`, started empty** — `docs/OWNED.md` says "now", to
  record the first revision rather than remember it. There will be no
  revision until a hundred records. *Trigger: the first hundred records.*

### DELETE — four

- **`src/lib/card.ts` and `shareImage()`** — zero importers. *Done.*
- **The sample introduction's Home card.** *Done.*
- **Concierge as a software roadmap item.** It fails **Scale** and **Time**
  outright: founder hours per member, a job wearing a product's clothes.
  `docs/STRATEGY.md` calls it "productising the most trusted role in the
  community at software margins" — a human matchmaker has a matchmaker's
  margins, as `docs/REDTEAM.md` said. It is deleted as a thing to *build*
  and kept as a thing to *do*: the founder matchmaking the first ten
  couples by hand, which is also the only honest test of willingness to pay —
  and since 2026-09-12 one the free-year promise plainly permits: the promise
  is about what a member is charged, not what her family pays at the nikah
  (`docs/BOARD.md` decision 0).
- **The `contacts` store's founder-gated route.** `docs/OWNED.md`'s own
  prose refuses it — *"an endpoint that returns every member's email and
  phone is a honeypot behind a key the free plan cannot even mark as
  secret"* — while its foundations table still listed it. Struck.

## The roadmap, reorganised — by opportunity

> Reorganised again on 2026-09-18, by `docs/TREE.md`: an outcome at the top,
> the person's opportunities under it, and solutions only beneath those. The
> feature-scored table above is how this file got here and stays as the record;
> **this is the live order**, and `docs/PRODUCT.md` §10 mirrors it. Each item
> names its layer — an experiment, a solution, or a subtraction — because a
> list that mixes them cannot be prioritised.

| # | Item | Layer | Opportunity it serves | Gate |
|---|---|---|---|---|
| **0** | **Post the link.** Ten connectors by name; the five catalogued URLs with a room-kind `via` (`docs/ASSETS.md` is the only place a URL is declared live), the door's honest count weekly. `docs/WEDGE.md` steps 1–4 | Experiment | Evidence for every opportunity | **Nothing.** Unblocked since 2026-09-12; the tools and guide have had their own addresses since 2026-09-17. Every line below waits on it |
| **1** | **The five sessions**, read against `docs/JOBS.md`, on `docs/PROTOCOL.md`'s script | Experiment | O1, O2, O3, O6 — and question 4 fills the alternatives column for all ten | Recruiting only. The one experiment that runs with zero traffic (`docs/RISKS.md` R1) |
| **2** | **What must be true before strangers arrive.** Mail on the domain; the Anthropic spend limit written into `docs/CONTROL.md`; `VITE_CONTACT_EMAIL` at an address someone reads | Solution, founder-side | O4.3 — her trust | Nothing. None of it retrofits onto traffic that has already come |
| **3** | **Subtract.** The four decisions in `docs/TREE.md` — Plus, the sample and its invented people, the door's counting apparatus, and the ledger-as-social-proof hold | Subtraction | Frees attention from O5 and O7 | Item 1. `docs/PROTOCOL.md` forbids touching the door or the map mid-sprint |
| **4** | **The situations become the front door.** The four moments and five hardest parts move ahead of the map. **No new component** — `src/data/moments.ts` and `src/data/hook.ts` already exist and render 43 taps in | Solution, relocation | O1, O3.1, O4.2, O8.1 | Item 1 |
| **5** | **Ask three men what answering her eleven does for them** — A6 and A8's unrun half, inside item 1's sessions | Experiment | **O8.3**, the most dangerous gap (`docs/GAPS.md` gap 1) | Item 1 |
| **6** | **Read what comes back.** A1, A2, A4 at their thresholds; A6 at four weeks; `docs/REDTEAM.md`'s three at their dates; then `docs/OPERATING.md`'s monthly loop | Experiment | O3, O6, O7, O8 | Items 0–1. Six rules already written, waiting only for numbers |
| **7** | **The first pool opens.** Minneapolis, one introduction at a time, introductions record in the same commit (`docs/HARD.md`) | Solution | **O5** — the first time anything moves it | *`docs/ATOMIC.md` §6 — twenty active men and at least as many women, everyone with someone eligible and active, seven in ten answering, three of the first twenty introductions talking — read from `/pool` and the introductions record, and the founder's judgement* |
| **8** | **Concierge, by hand** — the founder matchmaking the first ten | Service, deliberately not a build | O5 | Item 7 |
| **9** | **The first-year sheet** — the eleven's engine over a second topic list | Solution | O10, and the married stage's only real job | The first marriage |
| **10** | **Your record**; then **real backend** | Solution | O4.3; none | The first member who asks; any store past ~50,000 keys (`docs/SCALE.md`) |

**What moved on 2026-09-18, and what did not.** The previous items 0, 1 and 2
are now 0, 2 and 6; the previous 3–7 are now 7–10 in the same order, still
pool-gated, nothing dropped. Two items are new *in kind and not in code*:
**subtraction**, which no roadmap here has ever carried, and the
**relocation**, which moves components that already exist. One item was
promoted out of "read what comes back": the sessions, because they are the
only experiment that needs no traffic, and every ranked gap in `docs/GAPS.md`
waits on them.

**What left the roadmap earlier.** *"The door, for men"* was item 1; M0–M3 are
shipped, so it is no longer a build — it is A6, now item 5's other half.
*"Run the loop"* was item 0 and is now item 6, because a loop with nothing in
it is not a first step. *Concierge* left as software and stayed as a service.
*Live Claude behind the map* remains declined and test-enforced
(`tests/durable.test.ts`).

## What this audit says about itself

This is the twenty-second document written before the first link was
posted. Its own top item is therefore not a document, and the honest test of
whether it was worth writing is whether the next thing that happens here is
a post rather than a pass.

The engineering it produced was: two deletions, one instrument that had to
exist before traffic, one defect found by opening the product in a browser
and looking. That ratio — four small changes out of 166 proposals — is the
finding, not a shortfall.

## Revisions

- 2026-09-18 — `docs/TREE.md`. The roadmap reorganised a second time, by
  opportunity rather than by feature: one outcome, ten opportunities, solutions
  only beneath them. No code, no new features. It found 2,623 lines on "am I
  ready" against roughly fifty on how a man shows he is serious, four solutions
  serving no opportunity at all, and 2,011 lines that count "there is nobody to
  meet" without moving it. Subtraction entered the roadmap as an item for the
  first time, gated on the sessions.
- 2026-09-08 — First version. Nine tests defined; ~40 shipped features and
  166 proposals scored; the roadmap reorganised around posting the link.
  `card.ts` and the Home sample card deleted, the `kept` rung built, the
  door's missing side question found by pre-flight and fixed — partly: a man
  who reads the door and leaves without tapping his side is `unsaid`, so read
  `vias.group.arrived` beside `sidesByVia.man.group.arrived` before killing a
  room (`docs/BOARD.md`). Concierge
  reclassified from software to service. The guide's default recommended
  off, and left to the founder.
- 2026-09-10 — `docs/LIQUIDITY.md`. Three builds, each under a named clause
  of the rule: the re-keep on join and `/pool` with its sweep (an honest
  public number), age at the door (cannot be retrofitted). The cohort
  reconcile left DEFER; item 3's gate is the opening checklist.
- 2026-09-11 — `docs/FLYWHEEL.md`. Ten transitions inspected; one build,
  under the cannot-be-retrofitted clause: the ending's door share, through
  the spouse's side (B11, sharpened). Marriages on the door designed at the
  first marriage.
- 2026-09-11 — `docs/BACKWARD.md`. BUILD NOW item 4 done; a version on every
  record, built ahead of its trigger while there were none to migrate; public
  launch defined. The bottleneck named as the unposted link, not a build.
