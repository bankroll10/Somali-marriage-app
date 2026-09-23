# Niyyah — the hard choices, and the ones that were still easy

> MJ DeMarco's Choose Hard, Live Easy: find where the easy decision now buys an
> expensive problem later, and pay while the cost is still small. This codebase
> had already done much of that on purpose — `docs/SCALE.md` carries dated
> triggers for a dozen infrastructure inversions, `docs/CONTROL.md` ranks every
> supplier, `docs/OWNED.md` moved the address and the customer list from rented
> to owned. So the useful question was narrower: **where is the later cost not
> expensive but *irreversible*, and where does a promise already exist that no
> mechanism keeps?**
>
> Two audits of the functions found five of each. The sharpest were all cheap
> today and impossible to fix afterwards.

## The two that could not have been fixed later

**A minted code could land on somebody.** `keep.ts` wrote a freshly minted
six-character code with a bare `setJSON(code, kept)` — no uniqueness check, no
conditional write, no retry. Twenty-three symbols to the sixth is about 148
million, so two members drawing the same one is a birthday problem: roughly
0.3% at a thousand kept maps, 29% at ten thousand, an even chance by 14,300.
The loser's map is the only server copy of thirteen honest answers and every
reading she ever had; the winner's replaces it silently; both restore the same
data afterwards and nothing anywhere records that it happened. At founding
scale it is invisible. At five figures it is undiagnosable, unrecoverable, and
already done. `onlyIfNew` was in this codebase twice before anyone reached for
it here.

**The accused could erase the accusation.** Each safety report was written to
`` `${code}-${side}` `` with a plain `setJSON`, and nothing in that function can
validate that the caller *is* the side they claim — the couple code is shared
with the other person by design, because she texts him the link. So the
reported man held the exact key needed to POST as her and overwrite her report
with a blank one. The everyday version needed no malice at all: she reports him
twice and the first is destroyed, escalation and all. `docs/STRATEGY.md` calls
reputation the growth engine and the kill switch; this was the kill switch with
the safety catch off.

## Every inversion found, ranked by future consequence

| # | Easy now | Expensive — or irreversible — later | Verdict |
|---|---|---|---|
| **1** | Mint a code and write | Silent, irreversible overwrite of a member's map | **Chose Hard** — `netlify/shared/code.ts` |
| **2** | One overwritable report, keyed by a code both parties hold | The accused deletes the accusation; repeat reports destroy each other | **Chose Hard** — append-only |
| **3** | Cap writes, leave reads unmetered | `DELETE /keep?code=` was an unauthenticated, unmetered destruction primitive cascading across five stores — and it takes the *other* person's couple record with it. `GET /keep` was an enumeration surface over a 27-bit secret: at a hundred requests a second against fifty thousand members, a stranger's whole map roughly every thirty seconds | **Chose Hard** — four read buckets, five since 2026-09-23 (`vouch-read`, `docs/THREAT.md`) |
| **4** | Refresh the record's year on every report | The refresh is **anti-correlated with the data's value**: marrying ends the reporting, so the one success outcome left every readout at day 366 while the blob persisted for ever | **Chose Hard** — married never expires, the year is swept |
| **5** | Resolution is deletion | "Resolved" and "never happened" were the same byte. `docs/GAPS.md`'s own harm-taxonomy test was permanently uncomputable | **Chose Hard** — an anonymous stub survives |
| **6** | Safety fails open with no founder key, like every readout | One misconfigured deploy publishes free text naming alleged harm — and unlike a tally it cannot be un-published | **Chose Hard** — `requireFounder`, one route; every route since 2026-09-12 (row 21) |
| **7** | Forget-me skips the `reports` store | The strongest privacy promise is false in the one place free text exists | **Chose Hard** — the cascade takes it |
| **8** | Sell "reporting or **blocking** anyone, instantly" | There is no blocking of any kind in this repository — no store, no field, no code path | **Chose Hard** — the copy is true now; two stragglers (`docs/STRATEGY.md` §6 and a comment in `src/data/plus.ts`) were caught 2026-09-17, and `tests/promises.test.ts` keeps the word out |
| **9** | `b % 23` in four copied generators | A, C and D came up 9% more often than every other symbol, in the only secret this product has | **Chose Hard** — rejection sampling, one generator |
| **10** | Parse the body, then measure it | `keep.ts` fully parsed an arbitrarily large body before the guard that exists to refuse it | **Chose Hard** — measured first, like the other four |
| **11** | `src/lib/analytics.ts` signposts PostHog/Amplitude | `docs/LEARNING.md` forbids exactly that. The easy path was written into the file that would implement it | **Chose Hard** — the comment says what is permitted |
| **12** | Cohort entries never expire and are never re-checked against `maps` | The door's count — the trust claim the product is staked on — only ever rises, and will one day open a pool of people whose maps lapsed a year ago | **Hard, built** — `/pool?sweep=1` re-checks and sweeps, and since 2026-09-17 `netlify/functions/sweep.ts` does so weekly on a schedule (`docs/RISKS.md` R3); the public route still trusts its keys, now honest to within a week |
| **13** | No introductions record; `introduce.ts` triggered "at the first pool" | Retroactively impossible, exactly like the customer list. Mutual interest, the waited-longest queue, and *refusing to introduce someone again* all read from a store with no writer | **Hard, deferred — trigger tightened** |
| **14** | No schema version on any record | Five shapes already disambiguated by heuristics: segment count, field presence, a ten-character date prefix. `export.ts` stamps `version: 2` on the wrapper and nothing on the records inside it, which is exactly backwards | **Chose Hard, 2026-09-11** — `netlify/shared/record.ts`: every member record carries `v`, stamped last; done while there were zero records, so the migration this row feared cost nothing (`docs/BACKWARD.md`) |
| **15** | The vouch token is eight characters, minted without `onlyIfNew` | 23⁸ ≈ 78 billion, so an even chance of collision at ~330,000 tokens — beyond this product's horizon, and a collision would point a family member's link at the wrong map | **Live Easy, with a trigger** |
| **16** | The man answering the eleven has no identity — `createCouple(picked, gender)` never passes the map code | The person most likely to be reported is unidentifiable and unblockable by construction | **Live Easy** — see below |
| **17** | `POST /keep` with a supplied code wrote whatever the body carried | A code nobody minted was created on demand, skipping `mint`'s `onlyIfNew`; a guessed code overwrote a stranger's map as surely as row 3's DELETE destroyed one | **Chose Hard, 2026-09-12** — nothing under the code is a 404 and the client mints fresh; something under it is written with the etag it was read at (`docs/BOARD.md`) |
| **18** | Key layouts carry no version | `v` (row 14) versions values; the cohort key's six segments and the safety and vouch indexes are parsed positionally, and `export.ts` hardcoded the six | **Live Easy, with a rule** — a reader of keys reads the value's `v` to know its key's layout; a key change is a migration and is named as one. The literal became `SEGMENTS` |
| **19** | `couple side=second` and `DELETE /progress` outside the caps | A guessed live couple code froze her sheet for ever and polluted the joint tally; the one unmetered public write deleted over a 27-bit secret | **Chose Hard, 2026-09-12** — their own buckets, at the read-cap shape |
| **20** | The `never-introduce` stub carries no code and no side | The one outcome that needs a subject erases it; Trust promised "mark that they are never to be introduced" about nobody | **Live Easy, honestly** — Trust says the decision is a note in the queue until introductions exist; row 13's record decides where a mark lives, and row 16 says how far it can reach |
| **21** | Every readout but `/safety` failed open with no key | `/export` returns whole progress records and `/pool` deletes on read; a misconfigured deploy published silently | **Chose Hard, 2026-09-12** — `isFounder` fails closed everywhere; row 6's exception became the rule |

## The limit nobody should paper over

**A man who answers the eleven has no identity at all.** He arrives on a link,
answers eleven questions, and leaves nothing behind — no account, no install
id, no map code. That is deliberate and it is right: `docs/MACHINE.md` found
that the scarce side arrives through her, and anonymity is what makes that work.

But it means the arithmetic of safety is this: **no block list can ever reach
him.** A report about him yields a couple code and a side, and the trail ends
there. What the product *can* do is refuse to introduce someone — which is why
`never-introduce` is one of the five outcomes, and why the introductions record
below is the thing that turns it from a note into a mechanism. Until then the
levers are social, exactly as `docs/TIME.md` says: a conversation, and a word
to the family who vouched.

Trust now says this on its own face rather than promising removal from a list
that does not exist.

## Deferred, with triggers

| Item | Trigger | Why not now |
|---|---|---|
| **The introductions record** (`introduce.ts`, Tier 4 per `docs/LEARNING.md`) | **Ships in the same commit as the pool-open flag, never after.** Tightened from `docs/SCALE.md`'s "at the first pool is opened" | A list is only ever owned from the first row — the lesson of `docs/OWNED.md` move 2. But introductions cannot happen before a pool opens, and opening one is a founder action she controls, so the trigger is reliable if it is enforced as *the same commit* |
| **Cohort reconcile** — the door's count re-checked against live maps | **Built for the founder's read** (`netlify/functions/pool.ts`, `docs/LIQUIDITY.md`): `/pool?sweep=1` sweeps entries whose map is gone or lapsed, the lapsed blob with them, and since 2026-09-17 `netlify/functions/sweep.ts` does it weekly for every pool (`docs/RISKS.md` R3). The public count still trusts its keys; that half keeps its trigger — the first pool reaching 40/40 | Re-reading `maps` on every public count is O(n) on a public route. It belongs in the same pass as the running pool counters `docs/SCALE.md` already designs |
| **Schema versions on stored records** | **Built 2026-09-11**, ahead of its trigger: at zero records the retrofit is free, and it is never free again. The next shape change branches on `v` (`tests/record-version.test.ts` holds every writer to it) | The "why not now" — a migration — was true of a store with records in it and false of this one; `docs/BACKWARD.md` names the rule: build what is cheaper today than on any later day |
| **The vouch token minted with `onlyIfNew`** | Any store past ~50,000 keys, alongside `docs/SCALE.md`'s database trigger | 78 billion is a different order of risk from 148 million. Recorded so it is a decision rather than an oversight |

## What this pass changed

- `netlify/shared/code.ts` — one unbiased generator, and `mint`, which writes
  with `onlyIfNew` and returns null rather than overwrite. `keep.ts` and
  `couple.ts` mint through it; `vouch.ts` draws from it.
- Four read buckets: `restore`, `forget`, `couple-read`, `door` — and a fifth,
  `vouch-read`, added 2026-09-23 when the STRIDE pass found the vouch lookup
  was the one public read left unmetered (`docs/THREAT.md` T1).
- `safety.ts` — append-only reports, resolution that leaves an anonymous stub,
  and `requireFounder`, the one route in the product that fails closed.
- `keep.ts` — the forget cascade takes her reports; the body is measured before
  it is parsed.
- `progress.ts` — a married record never expires; everything else is swept.
- Copy: `src/data/plus.ts`, `src/components/Trust.tsx`,
  `src/components/ReportConcern.tsx`, `src/lib/analytics.ts`.

## Revisions

_Dated, one line each: an inversion found or a trigger fired._

- 2026-09-08 — First pass. Eleven chosen hard, four deferred with triggers, one
  accepted as the price of the loop that brings men in.
- 2026-09-10 — #12 partially built: the founder's `/pool` read re-checks the
  door against live maps and sweeps what lapsed (`docs/LIQUIDITY.md`). The
  door can fall now. The public route is unchanged.
- 2026-09-11 — #14 built ahead of its trigger: `v` on every member record,
  stamped last, while there were none to migrate (`docs/BACKWARD.md`). The
  contacts record gained a named type on the way; the backup's wrapper is no
  longer the only thing versioned.
- 2026-09-12 — The board audit (`docs/BOARD.md`) found five more: #17, #19 and
  #21 chosen hard; #18 and #20 lived easy with a rule and an honest sentence.
  Row 6's one fail-closed route became every route.
- 2026-09-12 — The code stays six characters (`docs/BOARD.md` decision 12):
  the phone-readability trade was deliberate, the read caps bound enumeration,
  and the restore link keeps the code in its URL because the link *is* the
  feature. Moving `GET/DELETE /keep` to a header is declined: this product
  controls no log that would hold the query string. Live Easy, on purpose.
- 2026-09-12 — The ticket to the door became the short map — the three answers
  the pool reads — instead of the sixteen (`src/data/shortMap.ts`,
  `docs/BOARD.md` decision 3). Hard, because it had to be decided before the
  first man met the door: a person counted under a sixteen-question toll and
  one counted under three are the same record, but the funnel that produced
  them is not, and the kill tests read the funnel.
- 2026-09-23 — The STRIDE pass (`docs/THREAT.md`) found row 3 incomplete:
  `GET /vouch` answered "does this map code exist" with no bucket. Capped
  (`vouch-read`). The safety route spent its 30-an-hour reporting cap before
  checking the pair existed, so junk could bury a real report; it now spends
  a probe bucket first and the reporting cap only on a live pair.
