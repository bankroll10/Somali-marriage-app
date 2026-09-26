# Privacy: what leaves her phone, what the server keeps, and how it goes

What stays on her phone, what leaves it and when, what each server store
holds and for how long, how deletion works when a step fails, and what each
founder readout field is. `src/components/Trust.tsx` is the promise; this
file holds the code to it. Who could take the data is `docs/SECURITY.md`.
**"The founder"** is one person holding Netlify credentials: she can open
every store, but not the phone or Anthropic. "No endpoint returns it" means
no URL returns it.

## Standing rules

- **Minimize before encrypting; simplify before adding another privacy
  explanation.** Collect less, keep it for less time, or let Trust say less.
- **Trust moves in the same commit as the payload**; a new closed list or
  readout field joins "Collected" and the field table below.
- **Every value the server learns from is a closed id** in
  `netlify/shared/vocab.ts`, with a `src/` twin (`tests/vocab-sync.test.ts`).
- **Every stored date about a member is a day, never a moment**
  (`netlify/shared/day.ts`): moments let two stores be lined up by the clock.

## What it learns, and what it refuses to

**Decisions, not attention.** A system that learns from dwell, swipes and
reply latency optimises for attention. Niyyah has no swipe, feed, messaging
or ranking; it has a few considered decisions, each with a reason from a
closed list. **It learns about pairings, conversations and questions, never
about a person.** What it revises are the constants in `src/data/` and
`src/lib/`, for everyone at once, on the monthly loop in `docs/RESEARCH.md`.
The traps refused: a stated non-negotiable overridden by inferred behaviour
(if one proves aspirational, the **question** changes, for everyone); a
per-person compatibility vector or sum; message counts or reply latency;
ratings and surveys; a "success factors" model fed back as pressure;
inferring marriage from silence.

### The tiers: how close each piece of data may get to a person

| Tier | Where | Holds | Readable by | Joinable to |
|---|---|---|---|---|
| **Tier 1 · The device** | `localStorage` | Her answers and sheets, guide threads and the follow-ups it handed her, the advice line, her first name | Her | Nothing, unless she keeps her map |
| **Tier 2 · The install code** | `progress` | Rungs, dated to the day; facts as closed ids | Founder, as distributions; the backup holds records | Not by key, not by name (see "Linkability and honest limits") |
| **Tier 3 · No code at all** | `tallies` | How pairs come out on the eleven | Founder | Nothing: there is no id |
| **Tier 3 · No code at all** | `ops` | A number per signal per day: errors by route, caps that refused, the guide's calls and tokens, crashes phones reported; once a day, how many records `maps`, `progress` and `reports` hold. 35 days | Founder, through `/health` | Nothing: no id, city or time; it describes the service |
| **Tier 4 · Human-read** | `reports` | A safety report: couple code, side, reason id, up to 500 characters of her words | Founder, through `GET /safety` | The couple code only. Never beside a tally, never a signal to `progress` or `couple`, never joined to a map or install id |

The kept map is Tier 1 by her choice, under a code registered to nobody;
`KeptSnapshot` (`src/lib/keep.ts`) and `keep.ts` keep the guide out of it.

### Collected

Only while "Tell us which steps you reach" is on, under the install code:

- `arrived` once, then each rung the first time, with its day: situated,
  mapped, **kept** (the one rung about trusting us), read, eleven, asked him,
  he answered, followed through, deciding, married
- how each of the seven grounds read; how a read came out and the dimension
  it found thinnest; each conversation she confirmed, as `source:topic`
- **which of the eleven it told her to open, and nothing else from her
  sheet.** The eleven's state histograms (agreed, differed, not talked,
  unknown) are no longer kept: nothing read them. An older client's counts
  are accepted and dropped before the write
- that a courtship ended, from which stage, and, only if she taps one, one of
  ten reasons and which, with one bit set on her phone when it ended: whether
  she had already had a conversation here (never when); on the way out, who
  she married, what decided it, what here she used
- which questionnaires she **began**, and that she **asked** the guide: one
  bit each, sets merged as unions, so no count can be derived
- her city if given; woman or man (floored, crossed once with via, never with
  the facts); the kind of link that first brought her, never who or which
- under no code, how pairs come out on the eleven, once he answers

**Country is no longer on the progress record**: a quasi-identifier nothing
read. It picks her help line on the phone (`src/data/help.ts`, re-checked
yearly against each service's own site). An older client's country is not
kept. It reaches the server only inside a kept map ("where you said you are").

### Deliberately not collected

- **Anything she or he typed about the other person**; the ended screen says
  so at the moment. Free text is where reputation leaks in, in a tight
  community. **The one carve-out is a safety report** (Tier 4): founder-read,
  never tallied, and **expunged on resolution**, leaving a stub of reason,
  days and outcome, joined to nobody, so the kinds of harm can be counted.
- **His name**, or anyone's. **Clan:** qabiil is one of the eleven, a
  conversation only. **Age:** not asked beyond the 18+ confirmation.
- **Attention traces**; there is no event log anywhere. **Message content**,
  **photos**, **inferred traits**, **anything from the guide**.
- **Location finer than the city; precise time; a contact graph, phone or
  email; how often, how far or how long; decision latency, A/B assignment,
  push tokens, profile completeness, a count of yeses a person received.**

The test for any future field: *does this describe a person, or a pairing, a
conversation, or a question?* Only the last three are collected.

**What she controls.** The steps switch gates the call itself; it is **on by
default**, says "On unless you turn it off", and `arrived` posts on first
render: opt-out, not consent, because the men's kill tests (`docs/RESEARCH.md`)
need every arrival in the denominator. "Keep the Guide on this device" stops
every guide call. Forget me is on Trust and the married Ending.

## On her phone

Plaintext `localStorage`, this browser only; every key is in `LOCAL_KEYS`,
`src/lib/forget.ts`.

| Key | Holds | Lives | Cleared by |
|---|---|---|---|
| `niyyah.intake.v1` | Identity (first name, optional; woman or man; 18+; city; country only when the city is "other"); answers (`working-on` is free text); last 12 readings; latest read and the one before; the eleven, with the topics she named as a line for her (`lines`, the pseudo-state `line` in a half-finished run); couple code and day, plus on this phone only its owner key, cached joint and side; the ending with her advice line; last 8 ended courtships; follow-ups; guide replies spent; the two switches; stage; `updatedAt` | Until cleared | Forget me; Start over; the browser |
| `coachThreads` (in it) | Guide conversations, both sides' words | **Last 40 per voice** (R6); the guide reads 10 | Forget me; Start over |
| `niyyah.keep.code.v1`, `.rev.v1`, `.once.v1` | Her map code; the revision last seen; a first keep's key until its code comes back | Until forget | Forget me; Start over (code, revision) |
| `niyyah.install.v1`, `niyyah.via.v1` | The random id her steps go under, not her map code; one word for the link that first brought her | From the first report / `?via=` link | Forget me |
| `niyyah.draft.v1`; `niyyah.entry.v1` | A half-finished read or eleven, as ids; a `?couple=` link part-way through | 30 days; 24 hours | Finishing or leaving; Start over; Forget me |
| `niyyah.forget.pending.v1` | Only the codes a failed Forget me still has to delete | Until they land | Itself |
| `niyyah.events.v1`, `.reports.v1`, `.waitlist.queue.v1` | Nothing writes them: an old event diary (C6), old report receipts, a door ping | Older phones | Forget me |
| Service worker cache | The app shell, for offline | Until the next deploy | A deploy. Never a code or a `/.netlify/*` response (`docs/SECURITY.md` T3) |

## What leaves the phone

Trust: "Everything you answer stays on this phone. It leaves only for the
things below." One row per thing.

| When | Route | What goes | Kept in |
|---|---|---|---|
| She taps Keep this map | `POST /keep` | The snapshot: `niyyah.intake.v1` minus the guide's threads and follow-ups, the advice line, `updatedAt`, the earlier read, her eleven's `lines` (each stays a plain `differ`; `keep.ts` deletes them too, for an older client), and the couple's key, joint and side, every moment cut to its day (C1–C3); her code and revision, or a once key | `maps` |
| She restores, or changes her code | `GET`, `PUT /keep?code=` | The code | — |
| She sends him the eleven | `POST /couple` | Eleven closed states and her side (a line she named goes as `differ`: `sheetOf`, `src/data/beforeYes.ts`); later her owner key, to change them, and the code alone (`GET`) to see whether he answered | `couples` |
| He answers | `POST /couple` | The code and his eleven states. Only the joint comes back | `couples`, `tallies` |
| The steps switch is on | `POST /progress` | Install id, rung ids, city, via, side, facts; 4 KB at most | `progress` |
| She asks the live guide | `POST /guide` → Anthropic | The voice; her message; up to 10 earlier turns from her first message on (6,000 characters); woman or man; city; eight answers (timeline, practice, faith's role, family's role, children, closeness, non-negotiables, hardest part; "what feels safe" went on 2026-09-25 — its question had been cut and nothing collected it); stage; a line each for a read and the eleven (C4, C5) — the read's says, if she chose it, that she is careful what she raises with him — the eleven's counts the topics she says they agree on and the ones not had yet (a count only, from 2026-09-26: `docs/DECISIONS.md` Part 14), names the topic still open and, if she named any, the first topic that is a line for her, so the guide does not coach her off it | Not stored by us; Anthropic's retention is under its API terms |
| She reports a concern | `POST /safety` | Couple code, her side, reason id, up to 500 characters | `reports` |
| The app crashes | `POST /health` | `crash` or `chunk`, once per page load; no stack, screen, code or id | `ops`, a day's total |
| She taps Forget me | `DELETE` keep, progress, couple | Her three codes | — |

Links carry `?map=` or `?couple=` (a code) and `?via=` (a kind), cleaned from
the address bar before any request (`docs/SECURITY.md` O2). Logs hold route
names and errors, never a body. Fonts are self-hosted (`src/index.css`).

## What the server holds, and for how long

`v` marks a record stamped with its version.

| Store | Key | Holds | Written by | Lives | Removed by | `v` |
|---|---|---|---|---|---|---|
| `maps` | `<code>` | Snapshot, `createdAt`, `expiresAt`, `rev`, `once` | keep `POST`, `PUT` | A year from the last keep | Forget (last step); sweep; `GET` after lapse | ✓ |
| `maps` | `ended/<code>` | Tombstone `{why: moved \| forgotten, expiresAt}` | Forget; change of code | A year | Sweep | ✓ |
| `maps` | `moving/<old>` | Journal `{to, at}` | Change of code | Until the move ends | The move; sweep after 2 days | ✓ |
| `maps` | `once/<id>` | `{code, expiresAt}` | First keep | A day | Forget; change of code; sweep | ✓ |
| `couples` | `<code>` | Creator side, owner key, each side's states, days | couple `POST` | 90 days from her last write | Retired by either side's `DELETE`, Forget me, a `GET` after expiry, sweep | ✓ |
| `couples` | `gone/<code>` | The end of the reporting window, nothing else | `retire` | 90 days | Sweep | — |
| `reports` | `<couple>-<side>-<id>` | A report | safety `POST` | Until resolved | The founder's resolution only | ✓ |
| `reports` | `resolved/<id>` | Reason, day filed, day resolved, outcome | The founder | Kept | — (no code, side or words) | ✓ |
| `progress` | `<install>` | `first` (rung → day), `scene`, `via`, `gender`, `facts`, `expiresAt` | progress `POST` | A year from the last step; **kept once `married`** | Her Forget me; sweep; the readout as it walks | ✓ |
| `tallies` | `joint` | `{pairs, topics}` | The second side's answer | Kept | — (no code) | — |
| `limits` | `<bucket>-<h\|d>-<stamp>` | A counter, no identity | Every capped route | One period | The next period's first write | — |
| `ops` | `day/…`, `sizes/…`, `last/…` | Numbers | Routes; `/health`; export; sweep | 35 days; `last/…` is overwritten | Sweep | — |
| `cohort`, `contacts`, `vouches` | any | Retired 2026-09-24: door entries, ways to reach people, relatives' names and phones | Nothing | Until the next sweep | Sweep empties every key | — |

`gone/<code>` stores its window's end as a full timestamp: the one stored
moment finer than a day, on a key that says nothing about either person.

## How deletion works

### Forget me

**On the phone (`src/lib/forget.ts`).** Any pending forget goes first. Then
three deletes in parallel: the map by her code, the step count by her install
id, the eleven by the couple code on the phone (she may have sent it without
keeping a map); a 404 counts as done. Then every key in `LOCAL_KEYS` goes. If
a delete failed, **one key is kept**, `niyyah.forget.pending.v1`, holding only
the codes still to delete: sent on every launch and before the next Forget
me, while the screen shows her the map code so she can write in. Before this,
a retry had no code to send and the map stayed for a year.

**On the server (`DELETE /keep?code=`),** ordered so a retry finishes:

| # | Step | If it fails here |
|---|---|---|
| 1 | Tombstone `ended/<code>` = forgotten | Nothing changed; retry |
| 2 | Retire her couple sheet: write `gone/`, then delete | The code already opens nothing and cannot be kept again; `retire` is idempotent |
| 3 | Delete `once/<id>`, then the map, **last**: it names her couple sheet | A retry after the map has gone, with the code closed as forgotten, answers `{forgotten: true}` |

**Tombstones.** A forgotten or moved code answers **410** with which, from
`GET`, `POST` and `PUT`, even if the map is still there, and never names a
new code. `mintFree` treats a tombstoned code, or a couple code with a
`gone/` window, as taken. **What stays**, checked by
`tests/invariants/delete-means-deleted.test.ts`: the tombstone; her report,
since a withdrawal under someone's eye is the case this exists for
(`docs/SECURITY.md` O1); the joint tally, with no code (Trust: "The one thing
it cannot reach"); the sheet's `gone/` window, a date.

### The weekly sweep (`netlify/functions/sweep.ts`, `@weekly`)

Each record is its own step; one it cannot read or delete is counted in
`errors` and tried next week. In order: (1) journals older than 2 days,
rolled back if no tombstone yet, else finished; (2) maps, tombstones and once
keys past `expiresAt`, only if unchanged since read (`deleteIfUnchanged`);
(3) couple sheets past 90 days, retired, and ended `gone/` windows; (4) step
counts past their year, unless `married`; (5) every key in `cohort`,
`contacts` and `vouches`, so ways to reach people and relatives' phone
numbers do not outlive the feature; (6) `ops` counts past 35 days. It answers
`{swept: {maps, couples, progress, journals, retired, errors}, at}`, never
touches reports, tallies or limits, and needs no key.

## Integrity: every write over more than one key

Netlify Blobs has no transactions: only `onlyIfNew`, `onlyIfMatch: etag` and
an unconditional `delete`. So every multi-key operation must end
**resumable** (a retry finishes it), **reconciled** (the sweep does) or
**accepted** (harmless, named here), never leaving a map nobody can reach, a
person counted twice or not at all, or a code that returns after she forgot
it. `tests/integrity.test.ts` breaks each step with `tests/support/blobs.ts`;
the primitives are in `netlify/shared/integrity.ts`.

**Keep.** A re-keep is one conditional write, three tries. A closed code
answers 410 and the phone drops it, never minting a replacement unless she
asks. A `rev` older than the stored one gets **409 stale** and nothing is
written; no `rev` (an older client) is accepted. **Once keys:** a first keep
carries a key made on the phone, reused until a code comes back; the server
mints, then writes `once/<id>` → code (`onlyIfNew`). The same key again is a
re-keep, and the map records it so Forget me and a move take it along.

**Change my code (`PUT /keep`),** journaled:

| # | Step | If it fails here | Recovery |
|---|---|---|---|
| 1 | Mint `to` with a copy (never a tombstoned code), then write `moving/<old>` = `{to}` (`onlyIfNew`) | The old code works; at worst an unjournaled copy | Retry mints again (a remaining window) |
| 2 | Re-read the old map; copy a keep that landed since | The old code works; the journal names `to` | **Retry resumes the same `to`**; the sweep rolls back after 2 days |
| 3 | Tombstone `ended/<old>` = moved; delete the old once key, map, then journal | The old code is closed | Retry finishes and answers `to`; the sweep rolls forward |
| 4 | Answer `{code: to, rev}` | The move is done; only the answer is lost | A retry answers 410 moved; the phone drops the old code and her next keep makes a new map |

Forgotten mid-move, forgetting wins and the copy goes; the couple sheet and
reports do not move. **Other sequences.** *He answers:* the sheet, then the
joint tally. **Accepted:** a failure leaves the tally one short, logged;
exactly-once would need pair ids in `tallies`. *A report:* `onlyIfNew` on a
fresh id. *Resolve:* the stub, then the delete; idempotent. *Retire:*
`gone/`, then the delete. *A step:* one conditional write.

**Remaining windows:** `deleteIfUnchanged` leaves the gap between its read
and delete (Blobs has no conditional delete). A mint that lands before a
failed journal write leaves an unjournaled copy. A keep between a move's
re-read and tombstone is lost with the old code; that phone's next keep gets
410 moved. A finished move whose answer is lost leaves `to` unreachable until
its year ends. A once write failing after its mint makes a duplicate map.

### Versions on stored records

Every member record carries `v` (`netlify/shared/record.ts`, `RECORD_VERSION`
1), stamped last before a write, at the top level: maps and their tombstones,
journals and once keys; progress; couple sheets; reports and stubs. Not
`gone/`, the joint tally, counters or `ops`.

**Add a field:** the reader defaults it (a missing `rev` reads as 0; a sheet
with no `owner`, from before 2026-09-23, can no longer be changed). **Change
what a field means:** bump `v`; readers branch on it. `isBookkeeping` keeps
tombstones, journals and once keys out of every count of maps. The backup
writes version 3; `netlify/shared/restore.ts` reads 2 and 3. The phone's
`niyyah.intake.v1` defaults each field on read. A six-character map with no
`v` or `rev` still opens and is upgraded on its next keep.

### Strong and eventual consistency

A Netlify Blobs read is eventually consistent, drifting up to 60 seconds per
the package README, unless the store is opened `consistency: 'strong'`: here
`limits`, `ops` (the health probe reads back what it wrote) and the joint
tally's read-modify-write. `maps`, `couples`, `progress`, `reports` and every
readout read eventually. A conditional write is checked against the stored
version, so a stale read costs a retry or a 409, never a write over something
newer; but a map restored on a second phone just after a keep can come back
one revision old (its next keep is told `stale`), and a code forgotten a
moment ago can still open from an edge that has not seen the tombstone. The
test doubles (`tests/support/memory.ts`, `blobs.ts`) are strongly consistent.

## The readouts, field by field

All sit behind `FOUNDER_KEY` and fail closed when it is unset
(`netlify/shared/founder.ts`). `/progress` and `/couple` return aggregates,
never one record; the safety queue and the backup return records. How and
when to read them is `docs/OPS.md`.

### `GET /progress`: `rungs, scenes, vias, sides, sidesByVia, cohorts, facts`

Computed from every record on each read (a forget is an un-count); a record
past its year that never reached `married` is deleted as the tally walks.

| Field | What it is | Why |
|---|---|---|
| `rungs[id]` | People who ever reached this rung | The ladder. `followed-through / arrived` is the North Star; `kept / mapped` is how many trusted the server with a map |
| `scenes[city][rung]`, `sides[woman\|man][rung]` | The same by city (`unsaid` if none) and by side. Floored: `sides.man` is `null` until five men arrive | Which cities move; the men's funnel |
| `vias[via][rung]` | The same by kind of first link: `words`, `eleven`, `couple`, `family`, `married`, `group`, `alumni`, `professional`, `mosque`, `press`. Floored | Which link brings people who follow through. `press` is a publication, never which, outside the room kinds on purpose |
| `sidesByVia[side][via][rung]` | Side × via, once; floored per cell; never crossed with facts | A man who came through a woman's eleven is already talking to someone; `sidesByVia.man.group` is the men the network channel produced |
| `cohorts[YYYY-MM]` | `{arrived, followedThrough}` for those who arrived that month. Not floored | The North Star: followed-through per hundred arrived, this month against last |
| `facts.grounds[dim][state]` | Maps reading thin / steady / strong per ground | What this community is thin on |
| `facts.read.band[band]`, `.thin[dim]` | How reads come out; the ground most often thinnest | Where men here have not shown themselves |
| `facts.eleven.open[topic]` | Which of the eleven it most often said to open | The only eleven fact kept |
| `facts.through["source:topic"]`, `facts.throughByTopic[topic]` | Conversations confirmed as had | Which scripts get said, against how often handed out |
| `facts.ending.{who,mattered,used}[id]` | Who they married, what decided it (non-tool answers `ready` and `family-wish` first), what was real | Ground truth |
| `facts.ended.reason[id]`, `.stage[id]`, `.which[reason][id]` | Why courtships end, from which stage, and which non-negotiable, topic or ground. Each ending's `talked` bit is not tallied on its own; it only places the ending in `facts.decisions` | Why Somali courtships end; needs no marketplace |
| `facts.began[instrument]`, `facts.asked[id]` | Who began the map, a read, the eleven, his side; who ever asked the guide | Completion (`rungs.read / facts.began.read`); the one metered cost |
| `facts.followedThroughBy.asked[id]` | `{asked, followedThrough}`. Floored | Whether asking the guide goes with the conversation (`docs/RESEARCH.md` A3) |
| `facts.marriedBy.{ended,through,readThin,open}[id]` | `{ended\|through\|read\|eleven, married}`: of people with this fact, how many married. Floored | Descriptive only, read beside `facts.decisions` and never alone: a marriage is not proof the reasoning was good (`docs/DECISIONS.md` Part 15) |
| `facts.decisions.{open,closed}` | Reported decisions: `married` once per person, `ended:{seen,families,circumstance,stopped,unsaid}` once per ending; `open` if she confirmed a conversation here. Floored | How decisions were made, married and ended alike: the outcome table |
| `facts.seenAt.{talking,deciding}` | Endings over something she found, by stage | Early against late (`docs/RESEARCH.md` L1) |

Gone on 2026-09-24, with what fed them: `countries`, `arrivedByDay` (replaced
by `cohorts`), the `counted` and `vouched` rungs, the eleven's state
histograms, `facts.hesitated`, `facts.countedBy`.

### Reading `null`: the k-floor

Every cell of a split by a quasi-identifier (city, via, side, side × via) and
of a `marriedBy`, `followedThroughBy` or `decisions` row under five (`K_FLOOR`,
`netlify/shared/floor.ts`) reads `null`, never omitted. Whole-population
counts (`rungs`, `cohorts`, the other facts) are never floored, so a lone
`ending.who.brought: 1` shows. A `null` beside an unfloored total can be
recovered by subtraction when the rest of its row shows, and the floor
protects against a leaked key, not against the founder, who holds the stores.

### The other readouts

| Readout | Fields | Comes from | Why |
|---|---|---|---|
| `GET /couple` (no code) | `pairs`; `topics[topic][joint]`, joint one of `both-agree`, `both-settled`, `both-not-talked`, `one-thinks-talked`, `differ-somewhere`, `unknown-somewhere` | `tallies/joint`, added to when the second side answers. Not floored: no pair, code or side. From 2026-09-24 a side may say `settled` ("we see it differently, and we've worked out how"): a pair who both say so count as `both-settled`, where before that day they could only say `differ` and counted as `differ-somewhere`; tallies either side of the date are not comparable on those two joints (docs/DECISIONS.md Part 8) | Which conversations couples here most often miss |
| `GET /safety` | `reports[]` open, oldest first, each `{id, code, side, reason, details, at}`; `resolved.byReason`, `resolved.byOutcome` | `reports` and its stubs; outcomes `spoke-to-them`, `told-the-family`, `not-enough`, `no-action` | A person may be waiting. Never cached; `/health` sees only counts |
| `GET /export` | `at`, `version` (3), `progress` (install id → record), `joint`, `omitted`, `skipped` | Every progress record in its year or married; the joint tally | The learning record survives one vendor. Never a map, sheet, report or `ops` |

## Linkability and honest limits

- **Kept map ↔ couple sheet ↔ reports.** The map names her couple code, and
  reports sit under it; they cannot be deleted through that link
  (`docs/SECURITY.md` O1), and the founder can follow it in storage.
- **The two codes are unjoinable by key and name, not by content.** The facts
  are functions of the kept map's answers, so anyone with both stores can
  match a progress record within a city, in a small one often uniquely. Trust
  says only what is true: "a random code that is not your map code".
- **The kept map is the most sensitive record** (first name, city, answers
  with `working-on` in her words, couple code, read, eleven, ended
  courtships), still readable by the founder, and it has one server copy:
  the backup leaves it out, so a lost `maps` store loses it (Trust says so;
  her phone keeps its own). **The guide's context** goes to a third party
  with her message about a man, without name or age (C5).
- **Backups outlive a forget:** the artifact up to 35 days (R5), a hand-saved
  copy while kept, and `restore.ts` writes what is missing, so restoring one
  would bring a forgotten step count back. **No secret variables on this
  plan:** anyone on the Netlify team can read every site key (`docs/OPS.md`).
- **Two copies the sweep cannot reach:** Netlify Form rows from before
  2026-09-23 carry a contact (C7), and a `reach-<date>/` export may sit on the
  founder's machine (R4). Both go by hand.

## Minimization record

| # | Unnecessary collection | Now |
|---|---|---|
| C1 | `updatedAt` (ms) in every kept map: a last-seen time under another name | Stripped, client and server |
| C2 | Millisecond timestamps across the kept map, and follow-up ids built from them | Cut to the day; ids renumbered. Closes the clock join of `couple.at` with the sheet's `createdAt` |
| C3 | `ending.advice` in the kept map, while the Ending promised it never leaves | Stays on the phone |
| C4 | The guide's request carried the whole identity and every answer, free text too | Two identity fields and the nine answers the prompt reads |
| C5 | Her first name and exact age, to Anthropic, on every message | Neither goes: the name went, the age became a range, and the range went with age on 2026-09-24. The name still travelled inside the thread (the greeting and the offline fallbacks carry it); since the completion review the history starts at her first message, on the phone and on the server, and no fallback uses her name |
| C6 | A 300-event local diary with ms timestamps, read by nothing | Gone with `analytics.ts` on 2026-09-24; an old one is cleared by Forget me |
| C7 | A second copy of each contact at Netlify Forms | Gone with the door and its form on 2026-09-24 |

| # | Unnecessary retention | Now |
|---|---|---|
| R1 | A lapsed map's vouch: a relative's name, sentence and phone, for ever | Gone with the vouch on 2026-09-24; the sweep empties `vouches` |
| R2 | Couple sheets past 90 days, unless someone opened one | Swept weekly |
| R3 | Step counts past their year, unless the founder opened the readout; backed up regardless | Swept weekly; `/export` skips them |
| R4 | Every monthly contacts export, "kept as the history" | Only the latest; the sweep empties `contacts` since the door went |
| R5 | The backup artifact: 90 days of step counts | 35 days (`.github/workflows/watch.yml`) |
| R6 | Guide threads on the phone, unbounded | Last 40 per voice (`THREAD_LIMIT`) |
| R7 | Three code comments promising the opposite of the code | Corrected |

## Next: encryption, after minimization (P2)

The kept map is the one record the founder can read whole. Encrypt it in the
browser (AES-GCM) under a key carried only in the restore link's `#fragment`,
which browsers never send; the server keeps ciphertext under the code, and
Forget me, lapse and the sweep are unchanged. **Trigger:** 100 kept maps. It
waits because it changes the restore flow, and minimizing shrinks it first.

**Held by** `src/lib/{keep,coach,storage,forget}.test.ts`, and in `tests/`:
`keep-function`, `guide-prompt`, `guide-disclosure`, `forget-keys`,
`invariants/delete-means-deleted`, `integrity`, `sweep-function`,
`export-function` and `floor`.
