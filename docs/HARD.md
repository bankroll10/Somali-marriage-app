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
| **3** | Cap writes, leave reads unmetered | `DELETE /keep?code=` was an unauthenticated, unmetered destruction primitive cascading across five stores — and it takes the *other* person's couple record with it. `GET /keep` was an enumeration surface over a 27-bit secret: at a hundred requests a second against fifty thousand members, a stranger's whole map roughly every thirty seconds | **Chose Hard** — four read buckets |
| **4** | Refresh the record's year on every report | The refresh is **anti-correlated with the data's value**: marrying ends the reporting, so the one success outcome left every readout at day 366 while the blob persisted for ever | **Chose Hard** — married never expires, the year is swept |
| **5** | Resolution is deletion | "Resolved" and "never happened" were the same byte. `docs/GAPS.md`'s own harm-taxonomy test was permanently uncomputable | **Chose Hard** — an anonymous stub survives |
| **6** | Safety fails open with no founder key, like every readout | One misconfigured deploy publishes free text naming alleged harm — and unlike a tally it cannot be un-published | **Chose Hard** — `requireFounder`, one route |
| **7** | Forget-me skips the `reports` store | The strongest privacy promise is false in the one place free text exists | **Chose Hard** — the cascade takes it |
| **8** | Sell "reporting or **blocking** anyone, instantly" | There is no blocking of any kind in this repository — no store, no field, no code path | **Chose Hard** — the copy is true now |
| **9** | `b % 23` in four copied generators | A, C and D came up 9% more often than every other symbol, in the only secret this product has | **Chose Hard** — rejection sampling, one generator |
| **10** | Parse the body, then measure it | `keep.ts` fully parsed an arbitrarily large body before the guard that exists to refuse it | **Chose Hard** — measured first, like the other four |
| **11** | `src/lib/analytics.ts` signposts PostHog/Amplitude | `docs/LEARNING.md` forbids exactly that. The easy path was written into the file that would implement it | **Chose Hard** — the comment says what is permitted |
| **12** | Cohort entries never expire and are never re-checked against `maps` | The door's count — the trust claim the product is staked on — only ever rises, and will one day open a pool of people whose maps lapsed a year ago | **Hard, deferred** |
| **13** | No introductions record; `introduce.ts` triggered "at the first pool" | Retroactively impossible, exactly like the customer list. Mutual interest, the waited-longest queue, and *refusing to introduce someone again* all read from a store with no writer | **Hard, deferred — trigger tightened** |
| **14** | No schema version on any record | Five shapes already disambiguated by heuristics: segment count, field presence, a ten-character date prefix. `export.ts` stamps `version: 2` on the wrapper and nothing on the records inside it, which is exactly backwards | **Hard, deferred** |
| **15** | The vouch token is eight characters, minted without `onlyIfNew` | 23⁸ ≈ 78 billion, so an even chance of collision at ~330,000 tokens — beyond this product's horizon, and a collision would point a family member's link at the wrong map | **Live Easy, with a trigger** |
| **16** | The man answering the eleven has no identity — `createCouple(picked, gender)` never passes the map code | The person most likely to be reported is unidentifiable and unblockable by construction | **Live Easy** — see below |

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
| **Cohort reconcile** — the door's count re-checked against live maps | The first pool reaching 40/40, or the first orphan found in the yearly listing | Re-reading `maps` on every count is O(n) on a public route. It belongs in the same pass as the running pool counters `docs/SCALE.md` already designs |
| **Schema versions on stored records** | The next shape change to any record — it carries `v` and every reader learns to branch on it | Retrofitting a version onto existing records is a migration in itself; the honest moment is the next change, and this is the note that makes it happen then |
| **The vouch token minted with `onlyIfNew`** | Any store past ~50,000 keys, alongside `docs/SCALE.md`'s database trigger | 78 billion is a different order of risk from 148 million. Recorded so it is a decision rather than an oversight |

## What this pass changed

- `netlify/shared/code.ts` — one unbiased generator, and `mint`, which writes
  with `onlyIfNew` and returns null rather than overwrite. `keep.ts` and
  `couple.ts` mint through it; `vouch.ts` draws from it.
- Four read buckets: `restore`, `forget`, `couple-read`, `door`.
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
