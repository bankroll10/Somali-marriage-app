# Niyyah — Operating the loop

> Every constant in `src/data/` ships in the bundle. A competent team could
> copy all of them by Friday. What they could not copy is the process that
> revises those constants from what actually happened to real people — and a
> process only exists if it is written down and run. This is it. It is one
> piece of the larger loop in `docs/PROCESS.md` — this file owns *measuring*
> and *revising*; that one owns identifying a problem, forming a hypothesis,
> talking to users, and picking what comes next.

## Why this file exists

The product records, under "Count me", what its rungs were made of: which
ground read thin, how a read came out, which of the eleven got said, who she
married. It records how pairs come out on the two-sided eleven. It records
which kind of link brought each person here. None of that is worth anything
sitting in a store. It is worth something the day a number in `src/` moves
because of it, and that day has to be scheduled or it never comes.

Read the readouts **monthly**, not daily. Read daily, a readout becomes a
dashboard; a dashboard becomes a metric; a metric becomes the thing the
product optimises for. The ladder is the only metric. Everything below is
calibration.

Whether the *service* is all right — up, deployed, not failing, not
overspending, backed up — is a different question with a different page:
`docs/OPS.md`, and the health run it describes, which stays quiet until
something is wrong. It holds nothing about members and is not a readout.

One readout does not wait for the month: `GET /safety` (`netlify/functions/safety.ts`)
holds a real, named concern about a real person, and nobody is notified when
one arrives — see `docs/TIME.md`. **Check it weekly**, on its own, whatever
week it falls in relative to the monthly hour below.

```bash
curl -s -H "$K" $S/safety | jq .   # weekly — a report is a person waiting, not a metric
```

Since 2026-09-12 `.github/workflows/watch.yml` makes the same read with the
founder's key and fails — which emails the owner — when anything is open.
Since 2026-09-23 it runs **every morning**: it fails on any day an open report
says `threats` or `sexual` — **read those the day the mail comes** — and on
Mondays for everything else (`docs/ABUSE.md`). It needs `FOUNDER_KEY` as a repository secret
(`docs/DEPLOY.md`). Before the first link is posted, `DELETE /progress?id=`
each of the founder's own install ids (`installId()` in
`src/lib/progress.ts`, in that device's localStorage), so the first twenty
arrivals are strangers.

Resolving one names the report and what you did about it:

```bash
curl -s -X DELETE -H "$K" \
  "$S/safety?code=<code>&side=<woman|man>&id=<id>&outcome=<outcome>"
```

`id` comes from the report itself. `outcome` is one of `spoke-to-them`,
`told-the-family`, `never-introduce`, `not-enough`, `no-action`
(`src/data/safety.ts`). It expunges her words, per `docs/LEARNING.md`, and
leaves a stub carrying only the reason, the day and what was done — no code,
no side, nothing of hers. That stub is what makes `resolved.byReason` in the
readout possible, and it is the only reason the founder can ever answer
"is this the same kind of harm as last time?" — see `docs/HARD.md`.

Every readout fails closed since 2026-09-12 (`netlify/shared/founder.ts`);
this one first, because free text naming a person cannot be un-published.

**What a report is, and the rules around it** (`docs/ABUSE.md`):

- **It outlives the sheet.** A deleted, forgotten or expired couple sheet
  leaves `gone/<code>` in the `couples` store — a date and nothing else — and
  a report can still be made against it for ninety days
  (`netlify/shared/sheet.ts`). The man she is reporting cannot silence her by
  deleting the sheet.
- **Forget me does not withdraw it,** and the app keeps no receipt. A member
  who asks for one to be withdrawn writes in; read it, then resolve it as
  `no-action`. A withdrawal asked for under someone's eye is the case this
  exists for — if the report was a threat, read it before you resolve it.
- **One report is not a verdict.** Before `never-introduce`, hear the other
  side wherever there is a way to. A report with no way to reach anyone is
  `not-enough`, not a mark.
- **Never confirm to anyone whether a person uses Niyyah** — not to a brother,
  a mother, a husband, or anyone else who calls. **Never send a code, a
  contact or a map to anyone** but the member herself, at her request, from
  the address she gave. The founder holds the contacts, the vouch numbers and
  every map; the founder is the target.
- **Before any change to how the Guide speaks** — the prompt, the model, an
  offline intent — run `npm run eval:guide` before and after, and put both
  summary tables in the PR (`docs/GUIDE-EVAL.md`). Run it once a month too:
  the model can change under an unchanged prompt.
- **Once a year, re-check `src/data/help.ts`** — every emergency number, helpline and
  crisis line against the service's own site — and move `HELP_CHECKED`. Sweden's
  line changed in 2025.
- **A member who has changed her code** (`PUT /keep`, "Change my code") has
  everything under the new one; the old code is gone from every store. Nothing
  to do by hand.

**The rest of the weekly pulse** rides alongside the safety check, five
minutes, and does two things only: acts on an open report (above), and
notices a cliff — a number that was moving and stopped. Nothing here is
revised at the pulse; that stays monthly, below, for the same reason a
readout stays monthly at all — read a number often enough and it becomes the
thing being optimised for rather than the thing being watched.

```bash
curl -s -H "$K" $S/progress | jq '.rungs, .sides, .sidesByVia.man, .facts.began'   # arrived, by side, the men by what brought them, and who finished what they began
curl -s -H "$K" $S/cohort   | jq '.countries'              # the door: women and men, every open pool
```

## The readouts

All four are aggregate and return no person. All four sit behind
`FOUNDER_KEY` (`netlify/shared/founder.ts`); see the README for setting it.

```bash
K="Authorization: Bearer $FOUNDER_KEY"; S=https://<your-site>/.netlify/functions
curl -s -H "$K" $S/progress | jq .     # the ladder, and the facts
curl -s -H "$K" $S/cohort   | jq .     # the door: every country and city, how far people would go, hardest parts, ledgers
curl -s -H "$K" $S/couple   | jq .     # how pairs come out on the eleven
curl -s -H "$K" $S/vouch    | jq .     # the vouch: asks made, vouches given, and who in the family gave them
curl -s -H "$K" "$S/pool?scene=twin-cities" | jq .   # the shape of a pool: live, looking, ages, eligible pairs, stranded. Reads only — `swept` says what is sweepable
curl -s -H "$K" "$S/pool?scene=twin-cities&sweep=1" | jq .   # the same, and actually takes lapsed maps off the door. Deliberate; see below
curl -s -H "$K" "$S/pool?country=us"        | jq .   # the same for a country's travellers
curl -s -H "$K" $S/guide    | jq .     # the guide's health — one live call, so rarely
curl -s -H "$K" $S/export   -o "backup-$(date +%F).json"   # the backup — save it
# The customer list — save it too. `blobs:list` prints keys and etags only, so
# each value is fetched; the one-liner that stood here saved codes and no contacts
# (docs/BOARD.md). Then open one file: it must hold an email or a phone.
d="reach-$(date +%F)"; mkdir -p "$d"
netlify blobs:list contacts --json | jq -r '.blobs[].key' \
  | while read -r k; do netlify blobs:get contacts "$k" > "$d/$k.json"; done
ls "$d" | wc -l   # must match the door's counted total
# Then delete the previous month's reach-* folder. Only the latest is kept.
```

**Save both files every time.** The backup is the only copy of the learning
record that exists outside one vendor's storage, and `reach-<date>.json` is the
only copy of how to reach the people waiting for a pool. The second one comes
from the store rather than an endpoint on purpose: nothing this product serves
will ever return a member's contact (`docs/OWNED.md`), so the founder's own
credentials are the only key to it. Use `netlify blobs:get contacts <code>` to
read one.

**Keep one `reach-` folder, the latest, and delete the one before it.** This
used to say keep them all "as the history", and a folder of them was the one
copy of a way to reach someone that neither Forget me nor a lapsed map could
ever touch (docs/PRIVACY.md, R4). The store is the list. The export exists
only so that losing one vendor does not lose the people waiting; last month's
copy adds nothing to that and keeps everyone who has since left.

The Netlify form (`niyyah-waitlist`) no longer holds anyone's contact. Each
row is a city and a day, a notice that someone was counted. The way to reach
them is only in the store (docs/PRIVACY.md, C7). Rows from before 2026-09-23
still carry a contact. Export them into the store's folder once, then delete
them from the form.

**Save the backup every time.** It is the last line of the monthly hour, and
it is the only copy of the learning record that exists outside one vendor's
storage. Keep the files; they are small, and a folder of them is the history.
It holds step counts only: no map, no contact. Since 2026-09-23 it also leaves
out any count past its year (docs/PRIVACY.md, R3).
What is in it and what is deliberately not is documented in
`netlify/functions/export.ts` and `docs/CONTROL.md`.

What `/vouch` means — four numbers, and `docs/EXPERIMENTS.md` A2 reads in one
call. `asked` counts the women who asked a relative; `given` counts the
relatives who answered. Two failures look identical without both:

| Field | Reads as |
|---|---|
| `maps` | Kept maps. The denominator: `asked / maps` is the ask rate, and A2's rule fires under one in four |
| `asked` | Maps whose owner asked a family member to vouch. Asking twice is one ask — the token is reused |
| `given` | Vouches actually given. `given / asked` under a half means the relative's screen is the problem, not the ask |
| `byRelationship[rel]` | Who in the family vouched — father, brother, uncle, mother, aunt, other. Floored, like every split by a quasi-identifier |

What `/pool` means — the number the door cannot give, read before any pool is
opened and never by anyone but the founder (`docs/LIQUIDITY.md`). `?scene=` is
a city, every reach; `?country=` is the country's travellers. Reading it
changes nothing; `?sweep=1` takes door entries whose map is gone or lapsed, and
`netlify/functions/sweep.ts` does the same for every pool weekly on Netlify's
scheduler, so the door falls as well as rises. Whole numbers are the door's own and the checklist's denominators;
everything finer is floored, and the subtraction caveat below applies.

| Field | Reads as |
|---|---|
| `door` | Women and men on the door, from keys — what the public count says |
| `live` | Of those, how many have a map that is present and not past its year. `door − live` is what a sweep would take |
| `supply` | Of those, how many are *preparing* as of their last keep — the people an introduction could go to. `talking` is not supply: she is in one, and the rule is one at a time |
| `unaged` | Live members with no age. An introduction cannot be made to one; before this pass nobody was asked |
| `swept` | Entries a sweep would remove, by side — removed only with `?sweep=1`, and weekly by `netlify/functions/sweep.ts`. Their `contacts` rows go with them: the way to reach someone lives exactly as long as her map (`docs/BOARD.md` decision 13) |
| `stages[side][stage]` | The live members by stage, and `unknown` for a map kept with no stage — never counted as supply (`docs/ALIGNMENT.md` G5). Floored |
| `ages[side][band]` | The live members by age band — 18–24, 25–29, 30–34, 35–39, 40+. Floored. The one split the door could never show, and the one that strands people |
| `pairs` | `{eligible, withinAgeGap, of}` over supply: `of` is every woman against every man; `eligible` is the pairs where both have an age and neither's answers plainly contradict the other's checkable non-negotiables (`netlify/shared/gate.ts`) — what they said, nothing we assumed; `withinAgeGap` is the same pairs with our age band applied on top. `eligible / of` is `p_gate`, the number every worked example in `docs/LIQUIDITY.md` assumed and this replaces |
| `inventory[side][bucket]` | How many members have 0, 1–2, 3–5 or 6+ eligible partners in the pool. Floored, computed on read, never stored — a histogram over the pool, not a count on a person |
| `stranded[side]` | `inventory[side]['0']` under its own name: the members the pool could not introduce to anyone. `null` means fewer than five — which is **not** a pass below forty a side (`docs/ATOMIC.md` §3: up to four people with nobody read as `null`); until the raw view exists, read the maps by hand. A number is the checklist's fail and names the side |
| `inventoryWithinAgeGap`, `strandedWithinAgeGap` | The same histogram and its zero bucket, with our age band applied. Someone stranded here and not in `stranded` has partners by what she said and none by what we assumed: ask her which ages she would consider, by hand, before reading her as stranded (`docs/ALIGNMENT.md` G3) |
| `assumptions.ageGap` | Our age band: he may be older by `olderBy`, younger by `youngerBy`, and `gates` says it gates nothing. An assumption, revised only by hand |

What each field in `/progress` means:

| Field | Reads as |
|---|---|
| `rungs[id]` | People who ever reached this rung. `followed-through / arrived` is the North Star |
| `rungs.mapped`, `rungs.kept`, `rungs.counted` | The trust funnel, and the test of `docs/GAPS.md` gap 3. `kept / mapped` is how many trusted the server with the map; `counted / kept` is how many then left a way to be reached. A product that scores well on the first and badly on the second has a door problem, not a privacy problem — and before the `kept` rung the two were one number |
| `scenes[city][rung]`, `vias[via][rung]` | The same, by city and by what kind of link brought them. `alumni`, `professional` and `mosque` are kinds of room — the split the eight-week pivot rule reads. `press` is in the same tally and is **not** a room kind: a publication that printed the link, never which publication. It is outside the pivot rule on purpose, so an article's readers cannot decide a question about the wedge channel (`src/lib/entry.ts`, `docs/WEDGE.md`) |
| `countries[country][rung]` | The same, by country — the North Star for the nine countries with no named city (`docs/BOARD.md`). Floored |
| `sides[woman\|man][rung]` | The same, by side. `sides.man.counted / sides.man.arrived` is the men's funnel — the question `docs/MACHINE.md` found the ladder could not answer. Floored, so `sides.man` reads `null` until five men have arrived |
| `sidesByVia[side][via][rung]` | Side crossed with the kind of link, once. A man who arrived through a woman's eleven — `couple`, or `eleven` — is already talking to someone and is not supply for anyone else; `door` is the men a member sent, some looking and some not. `sidesByVia.man.group` is the men the network channel actually produced — the one cell that counts only men nobody here was already talking to (`docs/REDTEAM.md`). Floored per cell |
| `arrivedByDay` | The denominator over time, so a cohort can be followed. Every date in every store is a day, never a moment — see `netlify/shared/day.ts` |
| `facts.grounds[dim][state]` | How many maps read thin / steady / strong on each ground |
| `facts.read.band[band]`, `facts.read.thin[dim]` | How reads come out; which ground men here most often have not shown |
| `facts.eleven.open[topic]` | Which of the eleven the product most often told someone to open first |
| `facts.eleven.{agree,differ,notTalked,unknown}[n]` | How many people had *n* topics in that state |
| `facts.through["source:topic"]`, `facts.throughByTopic[topic]` | Which conversations were actually confirmed as had |
| `facts.ending.{who,mattered,used}[id]` | Who they married, what decided it, what here was real |
| `facts.ended.reason[id]`, `.stage[id]`, `.which[reason][id]` | Why courtships end, from which stage, and which non-negotiable, topic or ground did it — the dataset nobody else has, and it needs no marketplace |
| `facts.marriedBy.ended[reason]` | `{ended, married}`: of people who ended a courtship over this, how many later married. The first evidence the non-negotiables gate is worth its cost |
| `facts.marriedBy.through[topic]` | `{through, married}`: of people who confirmed this conversation, how many went on to marry |
| `facts.marriedBy.readThin[dim]` | `{read, married}`: of people whose read found this ground thinnest, how many married |
| `facts.marriedBy.open[topic]` | `{eleven, married}`: of people told to open this topic first, how many married |
| `facts.began[instrument]` | Who began each questionnaire — the map, a read, the eleven, his side of it. Against `rungs`, which counts who finished, this is the completion rate: `rungs.read / facts.began.read`. Both are whole-population counts, so both stay numbers. See `docs/EXPERIMENTS.md` |
| `facts.hesitated[reason]` | Why people reached the door and did not walk through — the one no this product records, one word from `src/data/hesitation.ts`. Its `other` share is the test of the list |
| `facts.countedBy.hesitated[reason]` | `{hesitated, counted}`: of people who stopped for this reason, how many were counted after all. Floored |

`marriedBy` is the first outcome table this product has. Every row in the
next section is a way of reading it.

**Reading `null`.** Every cell in a split by city, by door, or in a
`marriedBy` row that is under five reads as `null` — not zero, not missing:
somewhere from zero to four. Whole-population counts are never floored, so a
lone `ending.who.here: 1` still shows. Two honest caveats. A `null` beside an
unfloored total can be recovered by subtraction when every other cell in its
row is shown, so the floor removes the easy read and no more. And the floor
does not protect against the founder, who holds the stores; it protects
against a leaked key. The day-precision dates and the sentence on Trust do the
heavier lifting. See `netlify/shared/floor.ts`.

## The loop: readout → constant

Each row is one question the founder asks the readout, the constant it may
move, and the rule of thumb for moving it. A revision is a commit whose
message cites the readout row and the month.

| Constant | File | Revised by | Rule of thumb |
|---|---|---|---|
| `consequence` per topic | `src/data/beforeYes.ts` | `eleven.open` × `throughByTopic` × `marriedBy.through` | A topic often opened, rarely confirmed as said, and under-represented among the married carries more than its number says. Raise it |
| The read's per-answer weights and `PRIORITY` order | `src/data/read.ts`, `src/lib/read.ts` | `read.thin` × `marriedBy.readThin` | A dimension that reads thinnest as often for people who marry as for people who do not is placed too early. Move it down the order. The five-dimension `WEIGHTS` and their sum are gone (`docs/ALIGNMENT.md` S3); do not bring a sum back |
| `stateOf` thresholds (0.75 / 0.5) | `src/lib/reflection.ts` | `grounds[dim]`, rated grounds only | If one ground reads thin for most of the community, the threshold is measuring the community, not the person. Move it. Faith, family and vision are positions and are never rated (`docs/ALIGNMENT.md` S5) |
| Step order | `src/data/nextStep.ts` | `grounds[dim]` | The most common thin ground gets the best-written step |
| Scripts | `src/data/read.ts` `SCRIPTS`, `src/data/beforeYes.ts` `script`, `src/data/families.ts` | `through["source:topic"]` against how often that script was handed out (`eleven.open`, `read.thin`) | Words handed out often and said rarely get rewritten. Words never once confirmed get cut |
| Joint `URGENCY` | `src/lib/couple.ts` | `/couple` `topics[topic][joint]` | The joint state pairs most often land in for a topic is the one that topic's line should name |
| `alignment` | `src/lib/matching.ts` | nothing — it has no numbers | Removed 2026-09-23: it compares answers literally (`docs/ALIGNMENT.md` S1). A weight may come back only as a reason the introductions record's both-yes rate supports, never as a sum |
| `AGE_GAP` (reported, gates nothing) | `netlify/functions/pool.ts` | only by hand, from the introductions record's `age` no-reason *(designed)*, on a hundred introductions | An assumption about what families consider, never a learned one — `docs/LEARNING.md` forbids learning age. If `age` leads the reasons people say no, the question in `docs/LIQUIDITY.md`'s deferred list ships; the band itself moves only by the founder's judgement |
| The `dealbreakers` question and its gate | `src/data/intake.ts`, `matching.ts` `gate()` | `ended.which['non-negotiable']` × `marriedBy.ended['non-negotiable']` | A non-negotiable that ends courtships and precedes marriage is load-bearing; one that ends nothing is aspirational, and the question — never her gate — is what changes |
| The order of the four questions on the ending | `src/data/ending.ts` | `ending.*` answer rates against `rungs.married` | A question skipped by most is asked last, or dropped |

Rules for the loop itself:

- **One revision per readout.** If three constants look wrong, move one, wait
  a month, look again. Two moves at once cannot be told apart.
- **Never move a weight, a `consequence` or anything that changes a reading
  on fewer than a hundred records** for the row in question. Below that the
  readout is anecdote. **Low-stakes constants move at twenty** — script
  wording, the order of steps or questions, a label — so the loop turns in
  months rather than years, which is the only timescale on which it is a moat
  (`docs/BOARD.md`, decision 11).
- **The ladder decides, not the facts.** A constant that makes a fact look
  better while `followed-through / arrived` falls is wrong.
- **A decision rule written before its build overrides the hundred-record
  floor.** A1's twenty arrivals, `docs/GAPS.md`'s ten conversations and
  `docs/REDTEAM.md`'s three-in-ten are rules; the floor governs calibration
  constants and class moves no rule names (`docs/PROCESS.md`).
- **Nothing here ever becomes a score on a person.** The tables are about
  the community and the product. The rule on the read and the map stands.

## Keeping the vocabularies in sync

Every set the server validates against lives in one file,
`netlify/shared/vocab.ts`, and each set has a twin in `src/`.
`tests/vocab-sync.test.ts` fails the moment either moves without the other.

Renaming or adding an id — a topic, a family script, an ending option — is
therefore a two-file change: the `src/data` file and `vocab.ts`. Old records
keep the old id; the tally shows both until they age out, and that is fine.
Do not migrate stored records.

## Housekeeping (rarely)

**Since 2026-09-24 the weekly sweep also puts right what a failed step left
behind** (`docs/INTEGRITY.md`). Its log line and response carry three new
counts:
- `reconciled`: second door entries, and indexes that pointed at nothing;
- `journals`: changes of code abandoned part-way, rolled back or finished;
- `errors`: records it could not read or remove, tried again next week.

A non-zero `errors` for two weeks running is a record to look at by hand. The
key is in the function log.

Three kinds of blob outlive their purpose and have no sweep:

- **Vouches for maps that lapsed.** Swept weekly since 2026-09-23, with their
  ask and token, by `netlify/functions/sweep.ts` — listed here only because
  this list used to say they had no sweep.
- **Door entries for maps that lapsed.** Swept on a `/pool?...&sweep=1` read
  of that pool, and weekly for every pool by `netlify/functions/sweep.ts` since
  2026-09-17 (`docs/RISKS.md` R3): the member key and its index go, a lapsed map's blob goes with
  them, and her `contacts` row goes too — the way to reach someone lives
  exactly as long as her map, which is what Trust says (`docs/BOARD.md`,
  decision 13). **A plain `/pool` read deletes nothing**; `swept` tells you
  what a sweep would take and `sweptForReal` says whether one happened. The
  readout used to sweep on every read, so looking at a pool changed it — and
  during a test that is a participant, and the only way to reach them, gone
  with no code in the readout to say who (`docs/BOARD.md`, the reality-sprint
  pass). Sweep when a sprint is over, not while one is running. The yearly
  pass remains for pools never read: list `cohort`, and delete any
  `index/<code>` and the member key it points at when `<code>` has no map.
  And once, by hand, the
  handful of four-segment keys written before countries existed
  (`docs/SCALE.md`) — every read ignores them, but they are clutter.
- **Maps kept before the guide's threads were left out.** Each re-keep
  overwrites the blob, so these age out on their own. If you want them gone
  sooner, list `maps` and re-write any blob whose snapshot has a
  `coachThreads` key without it.

```bash
netlify blobs:list maps --json | jq -r '.[].key' > /tmp/maps
netlify blobs:list vouches --json | jq -r '.[].key' | grep -vxFf /tmp/maps   # orphaned vouches
```

## The monthly hour

In this order, because each question only means something after the last:

1. **Is anyone being helped?** `followed-through` per hundred `arrived`, this
   month against last, by city. If this is flat, nothing below matters yet.
2. **Which door brings people who follow through?** `vias[via]` — the ratio
   of `followed-through` to `arrived` per via. The best door is the share the
   product should offer first. `group` is a link shared into a community's
   chat — the channel the first forty are found through (`docs/WEDGE.md`) —
   and its ratio against `words` is the first test of that wedge. Read
   `sidesByVia.man.group` beside it: the men that channel produced, as
   against the men who arrived through someone's eleven, who were never
   anyone else's to meet. Read `counted` per hundred `arrived` by via as
   well — the supply a kind of link brings, not only the conversations; the
   best door for each may differ. And once there are endings, read
   `sidesByVia.man.married` beside `group`: the men a married couple's share
   produced, the flywheel's number (`docs/FLYWHEEL.md`).
3. **Which conversations get had, and which only get handed out?**
   `eleven.open` against `throughByTopic`. The gap is the next script to
   rewrite.
4. **What do couples miss?** `/couple` `topics` — the topics where
   `one-thinks-talked` and `both-not-talked` lead.
5. **Who did they marry?** `ending.who`. The first pool opens when one metro
   meets `docs/ATOMIC.md` §6's conditions, by the founder's hand. Until `here` is more than zero in a pool that
   has opened, that pool has not yet done what a marketplace is for — and no
   second pool opens until one has. That is "density before expansion" with a
   number on it (`docs/WEDGE.md`, `docs/SCALE.md`). **And before any pool
   opens: is it honestly near?** Read `/pool` for the one nearest twenty
   active men —
   `live`, `supply`, `unaged`, `pairs`, `stranded` — against the opening
   checklist in `docs/LIQUIDITY.md`, every line, or it does not open. A
   number in `stranded` names a side to find, never a band to widen.
6. **One revision.** Pick the single row above with the clearest signal, move
   its constant, and write the line below.
7. **Save the backup.** One curl, one file, kept somewhere that is not Netlify.
   Since 2026-09-12 `.github/workflows/watch.yml` saves it monthly as a 35-day
   artifact once the repository is private and `BACKUP_TO_ARTIFACT` is set;
   this step is then a check that last month's artifact exists. Either way,
   `/health`'s backup check says how many days it has been (`docs/OPS.md`).
8. **Do people finish what they open?** `rungs.read / facts.began.read`, and
   the same for the map, the eleven and the couple side. `docs/EXPERIMENTS.md`
   holds the decision rule for each, fixed in advance — if one fires, act on it
   rather than reasoning about it.
9. **Reread `docs/GAPS.md` against what you just read.** Every belief the
   product rests on is classed there — known, likely, assumed, unknown — with
   the readout field that tests it. Move at most one claim one class, on a
   hundred records, and write the line in its log. The door's `hesitated`
   row is the first place to look: it is the only no this product hears.
10. **Check every decision rule already on the books.** `docs/PROCESS.md`'s
    kill-list table names every threshold this product has already committed
    to, gathered from `docs/EXPERIMENTS.md` and `docs/WEDGE.md`. A rule that
    fires is executed at the hour it fires, not debated.

## Revisions

_Dated, one line each: the month, the readout row, the constant, the move._

- _(none yet — the first hundred records are not in)_
