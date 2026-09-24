# Niyyah — the data model, audited for integrity

> Every store, every key shape, every multi-step write, and for each step the
> one question: **what happens if it fails after the ones before it
> succeeded?** Written 2026-09-24. Held by `tests/integrity.test.ts`, which
> breaks each step on purpose with a fault-injecting in-memory store
> (`tests/support/blobs.ts`).

## The constraint

Netlify Blobs has no transactions. It has three guarantees, and everything
here is built from them:

- `setJSON(key, value, { onlyIfNew: true })`, which lands only on a key that
  does not exist;
- `setJSON(key, value, { onlyIfMatch: etag })`, which lands only on the
  version you read;
- `delete(key)`, which always lands and has no condition.

So every operation that touches more than one key is a **sequence**. Any step
can fail, or be overtaken by another request, after the steps before it
landed. The design rule is that every sequence ends in one of three states:

1. **Resumable.** Running it again finishes it, because every step is safe to
   repeat.
2. **Reconciled.** What it left behind is recognisable, and the weekly sweep
   puts it right.
3. **Accepted.** What is left is harmless, and this document says so and why.

It must never leave a map nobody can reach, a contact with no map behind it,
a person counted twice or not at all, or a code that comes back after she
forgot it.

## The stores

| Store | Key | Value | Written by | Lives | Removed by | `v` |
|---|---|---|---|---|---|---|
| `maps` | `<code>` | Her kept map: snapshot, `createdAt`, `expiresAt`, `rev` | keep POST, PUT | A year from the last keep | Forget; the sweep at lapse; GET at lapse | ✓ |
| `maps` | `ended/<code>` | A tombstone: `{why: moved \| forgotten, expiresAt}` | Forget; change of code | A year | The sweep | ✓ |
| `maps` | `moving/<old>` | A journal: `{to, at}` | Change of code | Until the move ends | The move itself; the sweep after 2 days | ✓ |
| `maps` | `once/<id>` | A first keep's key: `{code, expiresAt}` | keep POST | A day | Forget; change of code; the sweep | ✓ |
| `vouches` | `<code>` | Her family's vouch | vouch POST | As long as the map | Forget; the sweep | ✓ |
| `vouches` | `asked/<code>` | The token of the link she sent | vouch ask | As long as the map | Forget; the sweep | pointer |
| `vouches` | `token/<token>` | The code the link opens | vouch ask; change of code | As long as the map | Forget; the sweep | pointer |
| `cohort` | `<country>/<scene>/<gender>/<reach>/<hook>/<code>` | Her place at the door | Join; change of code | As long as the map | Forget; the sweep; `/pool?sweep=1` | ✓ |
| `cohort` | `index/<code>` | Which of the above is hers | Join; change of code | As long as the map | Forget; the sweep | pointer |
| `contacts` | `<code>` | The way to reach her | Join | **As long as the map** | Forget; the sweep | ✓ |
| `couples` | `<code>` | The two sides of the eleven | couple POST | 90 days | Either side's DELETE; forget; the sweep | ✓ |
| `couples` | `gone/<code>` | A retired sheet's reporting window | `retire` | 90 days | The sweep | — |
| `reports` | `<couple>-<side>-<id>` | A report | safety POST | Until the founder reads it | Her receipt; the founder | ✓ |
| `reports` | `resolved/<id>` | What was done, joined to nobody | The founder | Kept | — | ✓ |
| `progress` | `<install>` | Her steps and facts | progress POST | A year, or for ever once `married` | Her forget; the sweep | ✓ |
| `tallies` | `joint` | How pairs come out | couple POST (second side) | Kept | — | — |
| `limits` | `<bucket>-<period>-<stamp>` | A counter | Every capped route | One period | Itself, on the next period | — |

## Every multi-step operation

Each row is a step. "If it fails here" describes the state after every
earlier step landed.

### Forget me: `DELETE /keep?code=` (`netlify/functions/keep.ts`)

| # | Step | If it fails here | Recovery |
|---|---|---|---|
| 1 | Tombstone `ended/<code>` = forgotten | Nothing has changed | Retry |
| 2 | Retire her couple sheet (write `gone/`, then delete) | The code already opens nothing (GET → 410) and cannot be kept again | Retry: `retire` is idempotent |
| 3 | Delete the vouch token, `asked/`, and the vouch | As above | Retry |
| 4 | Delete the door entry and its index | As above | Retry. If never retried, the sweep takes the entry (map not live) |
| 5 | Delete the contact | As above | Retry. If never retried, the sweep takes any contact whose map is not live |
| 6 | Delete the map, **last** | Everything else is gone, and the map still names her couple sheet | Retry. A retry after the map has gone, with the code closed as forgotten, runs 2–5 again and answers `{forgotten: true}` |

**On the phone (`src/lib/forget.ts`).** If any delete fails, the phone is
still wiped, but one key is kept: `niyyah.forget.pending.v1`. It holds only
the codes still to delete, and none of her answers.
- The next Forget me sends those codes first.
- Every launch sends them again.
- Trust shows her the code, so a person can finish it by hand.

Before this, the phone was wiped whatever happened. The retry then had no code
to send and reported success, while the map stayed on the server for a year.

### Change my code: `PUT /keep?code=` (`netlify/functions/keep.ts`)

| # | Step | If it fails here | Recovery |
|---|---|---|---|
| 1 | Mint `to` with a copy of the map (`onlyIfNew`, never a tombstoned code), then write the journal `moving/<old>` = `{to}` (`onlyIfNew`) | The old code works. At worst there is an unjournaled copy under a code nobody was told: the one window left, the gap between two writes | Retry mints again. This window is not reconciled; see "remaining windows" |
| 2 | Copy the vouch, `asked/`, the token repoint, the door entry and index, and the contact under `to` | The old code works, and the journal names `to` | **Retry resumes the same `to`**: one copy, never two. If never retried, the sweep rolls it back after 2 days: everything under `to` is deleted, and the token points to the old code again |
| 3 | Re-read the old map; if a keep landed since step 1, copy it to `to` | As above | As above |
| 4 | Tombstone `ended/<old>` = moved | The old code is closed | Retry resumes and finishes. If never retried, the sweep rolls it forward |
| 5 | Delete the old contact, door entry, index, `asked/`, vouch and map | As above | As above |
| 6 | Delete the journal, and answer `{code: to}` | The move is done, but she was not told the new code | Retry answers the same `to`. After the sweep, the old code answers 410 moved: the phone drops it, and her next keep makes a new map from what the phone holds |

Before this, any failure after the mint left a full copy of her map, vouch,
door entry and contact under a code nobody was told. Nothing could recognise
it, and a retry minted a third copy.

### Keep: `POST /keep` (`netlify/functions/keep.ts`)

- **Re-keep under a code:** one conditional write (`onlyIfMatch`, three
  tries).
  - A code that was forgotten or moved answers **410** with which. The phone
    drops the code and never mints a replacement unless she asks.
  - A phone that sends a `rev` older than the one stored gets **409 stale**,
    and nothing is written. Two phones cannot silently overwrite each other.
  - A phone that sends no `rev`, meaning an older client or a code kept before
    revisions, is accepted as before.
- **First keep:** mint (`onlyIfNew`, never a tombstoned code), then record
  `once/<id>` → code.
  - The same `once` again is a re-keep of that code, not a second map.
  - If the `once` write fails after the mint, a retry mints again. That is
    the one duplicate window, and the client's single flight makes it rarer.
  - The map records its `once` key, so forget me and a change of code take
    `once/<id>` with them. Before 2026-09-24 they did not, and for up to a
    day after she forgot, a key on the server still named her code; the
    residue scan in `tests/invariants/delete-means-deleted.test.ts` found it
    (`docs/TESTING.md`).

### Join the door: `POST /cohort` (`netlify/functions/cohort.ts`)

| # | Step | If it fails here | Recovery |
|---|---|---|---|
| 1 | Require a live map (present, in its year, not closed) | Nothing | — |
| 2 | Write the new entry | She is counted under the old entry still | Retry |
| 3 | Write the index | She has two entries, and the index names the old one | Retry. If never retried, the sweep takes the unindexed entry once it is a day old |
| 4 | Re-read the index; if another join won, delete this entry | As above | As above |
| 5 | Delete the previous entry, if it differs | Two entries | The sweep takes the unindexed one |
| 6 | Write the contact | She is counted without it, and the response says `contactStored: false` | She joins again |

Before this, the order was delete-previous first: a failure at step 2 took her
off the door altogether. Two joins at once counted her twice, and nothing
reconciled it.

### Answer the eleven: `POST /couple` (second side)

1. A conditional write of the sheet (`onlyIfMatch`).
2. Add the pair to the joint tally (`onlyIfMatch`, three tries).

**Accepted.** A failure at step 2 leaves the pair saved and the tally one
short, and it is logged. Making it exactly-once would need pair ids inside
`tallies`, whose promise is that nothing in it names a pair.

### Ask for a vouch: `POST /vouch` `side: ask`

1. Claim `asked/<code>` (`onlyIfNew`).
2. Point `token/<token>` → code (`onlyIfNew`). On a collision, a fresh token,
   and `asked/` is rewritten.

A failure after step 1 is repaired by the next ask, which finds `asked/` and
rewrites a missing pointer. A token can never re-point another family's link.

### Report and resolve: `/safety`

- **File:** one write, `onlyIfNew` on a fresh id. A collision can never
  overwrite another report.
- **Resolve:** write the stub, then delete the report. A failure between them
  leaves both, and resolving again is idempotent.

### Retire a sheet: `netlify/shared/sheet.ts` `retire`

Write `gone/`, then delete the sheet. Either order of failure leaves the pair
reportable. It is idempotent.

**Minting a new couple code** treats a code with `gone/` as taken. A new pair
never inherits another pair's reports or reporting window.

### Record a step: `POST /progress`

One conditional write (`onlyIfMatch`, or `onlyIfNew`; three tries). Before
this, two tabs reporting at once lost a rung, and this record only ever adds.

### The sweep: `netlify/functions/sweep.ts`, weekly

In order, each record its own step. A record it cannot read or delete is
counted in `swept.errors` and tried again next week. **One bad blob no longer
stops the sweep.**

1. **Journals older than 2 days** are rolled back (no tombstone) or forward
   (tombstone).
2. **Door entries whose map is not live** go, with their index (when it
   names them) and their contact.
3. **Reconciliation:**
   - an index naming nothing goes;
   - an entry its index does not name goes, but only once it is a day old, so
     a join caught between its two writes is never taken.
4. **Contacts whose map is not live** go, however they were orphaned. Before
   this, a contact went only with a door entry, so an orphan stayed for ever.
5. **Maps, tombstones and once keys past `expiresAt`** go, and only if
   unchanged since read (`deleteIfUnchanged`). A map renewed by its owner
   while the sweep ran stays.
6. **Vouches, sheets and step counts,** as before.

## The primitives: `netlify/shared/integrity.ts`

- **`liveMap`:** the one definition of a map that can still be acted on:
  present, in its year, not closed. Used by the join, the vouch and the
  sweep. The door used to count a lapsed map, and a vouch on one was still
  shown.
- **`deleteIfUnchanged`:** re-read the version, then delete only if it still
  matches.
- **`tombstone` / `ended`:** a closed code, with why.
- **`movingKey` / `Journal`:** a move in flight.
- **`onceKey`:** a first keep's key.
- **`mintFree`:** `mint`, treating any code a tombstone names as taken.

## Remaining windows, named

- **`deleteIfUnchanged`** closes the renewal race down to the gap between its
  read and its delete. Blobs offers no conditional delete.
- **Change-of-code step 1:** a mint that lands, followed by a journal write
  that fails, leaves one unjournaled copy that nothing can recognise. The
  window is one request wide.
- **A keep during a change of code**, landing between step 3's re-read and
  step 4's tombstone, is lost with the old code. The next keep from that phone
  gets 410 moved, so it is not lost silently.
- **A vouch** landing mid-change of code, in the same window. The family can
  vouch again.
- **A first keep** whose `once` write fails after its mint: one duplicate map.

## Schema evolution

Every member record carries `v` (`netlify/shared/record.ts`), and
`RECORD_VERSION` is still 1. The rule:
- **Add a field:** the reader defaults it. A missing `rev` reads as 0; a
  missing `owner` keeps a sheet's old check. No version bump.
- **Change what a field means, or require a new one:** bump `v`, and the
  reader branches on the number.
- **Bookkeeping keys** (tombstones, journals, once keys) sit under their own
  prefixes. `isBookkeeping` tells them apart from maps, and the sweep counts
  only maps as maps.

`tests/integrity.test.ts` proves every legacy shape is still read and is
upgraded on its next write:
- a six-character map with no `v` or `rev`;
- a progress record with no `v`;
- a door entry and a vouch with no `v`.

**A rollback deploy** would write maps without `rev`. The next keep reads
that as 0 and moves on, which is safe.

## What this does not cover

- **The backup (`/export`)** has no import path. It is a document to be
  loaded somewhere else, not something restored here.
- **The limits store** is counters only, and sweeps itself.
- **A phone's own storage** (`niyyah.intake.v1`) migrates by defaulting each
  field on read (`src/lib/storage.ts`). It has one reader and one writer.
