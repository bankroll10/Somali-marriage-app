# Niyyah — what breaks at a hundred thousand, and what to build now

> MJ DeMarco's Commandment of Scale asks whether a business can grow without
> its founder growing with it. For a marriage marketplace the question has a
> sharper edge: a hundred thousand registered people can feel empty to every
> one of them, because what a person experiences is not the register — it is
> the number of people who are eligible for her, compatible with her, *and
> reachable*. The Somali diaspora is the hard case for that. It is thick in
> five or six metros and thin in two hundred others, across fifteen countries.

## The honest ceiling, first

This architecture — Netlify Functions over Netlify Blobs, on a free plan, with
listing-by-prefix as the only query — ends somewhere around a hundred thousand
members. It is written down here so nobody is surprised: Blobs has no
secondary index and no transactions, every founder readout rebuilds itself
from every record, and the door counts a country by walking its keys. Those
are the right choices for a product with a few hundred members and a founder
who reads the readout monthly. They stop being right at an order of magnitude
this product has not reached, and `docs/PRODUCT.md`'s roadmap already names
the replacement (item 4, a real backend). Everything below says *when*.

What does not end at any scale is the design: the pool as the unit, decisions
not attention (`docs/LEARNING.md`), the founder's labor growing with pools and
escalations rather than with members. That is what this pass builds and
protects.

## The unit of liquidity is a pool, not a city

Until this pass the product modelled geography as six flat ids
(`src/data/scenes.ts`), one of which — `other`, "Somewhere else" — was a
single worldwide bucket that counted a woman in Bristol and a man in Nairobi
toward the same 40/40 door as if they could meet. No country existed anywhere
in the code. Nothing asked whether she would move. And the door's threshold,
`COHORT_TARGET = 40`, was rendered on every card and compared to nothing:
"open" had no representation at all.

**A pool is the smallest geography in which both sides clear the target, given
each member's stated reach.** Two closed ids now sit on every cohort record
(`netlify/functions/cohort.ts`):

- **`country`** — fourteen ids in `src/data/countries.ts`, mirrored in
  `netlify/shared/vocab.ts`. Derived from a named city; asked with one tap
  only when she is somewhere else. Coarser than the city, so `docs/LEARNING.md`'s
  refusal of "location finer than the city" stands untouched.
- **`reach`** — `city | country | anywhere`: *"How far would you go for the
  right person?"* (`src/data/reach.ts`). A stated preference, like her
  non-negotiables and how she'd live. Never inferred, never learned about her.
  Absent means her city: the product never assumes anyone would move.

**Reach is mutual by construction.** A is in B's pool exactly when B is in
A's: the same city, always; the same country, if both would travel within
it; across countries, if both said anywhere. The alternative — "he would come
to her" — counts more pairs but makes the reachable set depend on who is
looking, and "a pool opened" stops meaning anything.

**`other` is not a city.** Two people at `uk/other` may be Bristol and
Aberdeen. Someone there is in her country's pool if she would travel, and in
no pool at all if she would not — counted, seen by the founder, and told so
plainly. That is the repair of what `other` used to be.

**What the door says now** is two sentences, from one list under the country
(`countPool` in `cohort.ts`): *"London today: 3 women, one man. It opens at 40
each."* and always *"Across the UK, 31 women and 12 men would travel for the
right person."* The second sentence is the whole answer to "many registered,
still empty". A woman in a city of nine used to see nine. She now sees the
nine, the thirty-one across the country who would come to her, and one tap
puts her among them. The `anywhere` pool is counted in the founder's tally
and never rendered — a worldwide sentence on the door would be expansion by
another name, and `docs/STRATEGY.md` is density-first.

**The two gates, resolved.** The docs held two definitions of "open" that
could disagree: 40 per side (`cohort.ts`) and `ending.who.here > 0`
(`docs/OPERATING.md`, step 5). They are different gates, on different pools.
*40/40 of reachable members, and the founder's judgement, opens the first
pool.* *`ending.who.here > 0` in a pool that has opened is the gate on opening
the next one* — a pool has to produce a marriage before a second is opened,
which is "density before expansion" with a number on it (`docs/WEDGE.md`).
An earlier draft of this paragraph put the marriage gate on the first pool,
which is circular: nobody can marry someone met here before anything has
opened. Later pools flip on count once the flag exists (below). Fragmentation
is survived the same way: you do not open Bristol; you open the UK, for the
people who would travel.

## Five stages, twelve categories

Each cell is a verdict against the code as it is. "—" means nothing new
breaks at that stage.

| | 100 (today) | 1,000 | 10,000 | 100,000 | 1,000,000 |
|---|---|---|---|---|---|
| **Match liquidity** | Nothing to break: no pool can open; the instruments are the product. `/pool` says how far the nearest is, and on which side (`docs/LIQUIDITY.md`) | The first pool clears 40/40 — a metro, or a country's travellers — and then the opening checklist, read from `/pool`: live, still looking, aged, nobody stranded. Without country and reach, about half of everyone would sit in `other` and no pool would exist for them | 5–15 pools. Pairing by hand is impossible: 10,000 people × one introduction a month is the founder's whole life. Candidates are computed; matchmakers approve | Metro pools of thousands. Liquidity stops being the constraint; matchmaker throughput is | Same. Pools never split below the city (LEARNING); the waited-longest queue keeps a pool of 20,000 fair |
| **Geographic discovery** | Six ids and a worldwide `other`. **Fixed now** | `other`-per-country in the readout names the next metro to add — a two-file vocab change, pinned by `tests/vocab-sync.test.ts` | ~30 metros in vocab; country pools carry everyone else | Per-country readouts. The question of per-region constants opens (LEARNING: revised "for everyone at once") | Regions inside a country would be "finer than the city" — refused. Country → metro is the whole hierarchy, ever |
| **User density** | Door at 0 each, honestly | The door shows the metro *and* the country's travellers | Pools open on count: an `open` flag per pool; auto-open after the first | — | — |
| **Recommendations** | `alignment()` over fourteen invented people (`src/lib/matching.ts`), geography-blind | `introduce.ts` per LEARNING's design, founder by hand; order is who has waited longest, never who is most wanted | The matchmaker's tool computes the next pair for one person — O(pool) — and a human says yes. Nothing ranks by past yeses; LEARNING says no tally shape may | `alignment` revised from `marriedBy`, monthly, ≥100 records per row (OPERATING); per-country split *visible*, constants still global | Same loop, more rows. Still no model of a person |
| **Gender balance** | 40/40 symmetric; likely six women to one man; shown as it is | The scarce side sets the pace. The only lever is hers — send him the read, send him the eleven. Never boost, never pay for reach (STRATEGY) | Men's share per pool in the monthly hour (PRODUCT's guardrail). A pool at 400/40 is "open" and she waits ten times longer; the queue makes the wait fair, not short | — | — |
| **Moderation** | `/safety`, weekly, one inbox (`docs/TIME.md`) | Same, oldest first | Reports carry the pool; the pool's matchmaker is first line, the founder is escalations; a matchmaker key beside the founder key | Real backend with identity — "removed" becomes a button rather than a phone call | — |
| **Verification** | The vouch, peer to peer, no review | Calling the vouching family at *join* would be O(members) — call at *introduction* | The matchmaker calls at introduction; a vouch phone reused across many maps is visible in Tier 4, by hand | Identity verification — `docs/PRODUCT.md` §10's *real backend* | — |
| **Support** | `mailto:`, "we read every one" | A FAQ from the inbox (TIME's trigger) | The matchmaker is first line for their pool | A shared inbox; a person who is not the founder | — |
| **Fraud prevention** | Kept-map requirement; no cap on any public write. **Fixed now** | The founder tally shows implausible shapes: a city of forty with one hardest part, one reach | Duplicates are undetectable without identity, by design; the matchmaker is the check | Accounts | — |
| **Infrastructure** | Fine | `progress.tally()` fires 1,000 concurrent gets in one invocation and `export.ts` does it twice — the first function timeout; `/pool` reads one map per counted member and meets the same ceiling at the same size. Door `list('uk/')` fine. Cohort entries begin outliving lapsed maps until a `/pool` read sweeps them | Pre-aggregate on write (`tallies/progress` on `couple`'s etag pattern, decrement on forget, monthly recompute as repair); running pool counters with a founder `recount`; a scheduled sweep; a paid plan for secrets and timeouts. `couple`'s single tally key only hot past ~10 answers a second | Blobs list-as-query ends: no secondary index, no transactions. Real database — `docs/PRODUCT.md` §10's *real backend*; export paged by prefix | Multi-region, data residency (EU/UK). Nothing here survives, and that is fine |
| **Notifications** | None | "Your pool opened": the founder exports the form CSV, filters by country, city and reach, sends by hand. O(pools opening), not O(members). The form carries those fields **now** or even this is impossible | Automated through a transactional vendor — a new dependency, through CONTROL's six questions | Same. Still the only notification ever (STRATEGY) | — |
| **Payments** | None | A checkout link for "Deciding together" at the first pool; the matchmaker is the founder, paid at the nikah directly | Matchmaker payouts — real marketplace infrastructure | Disputes, refunds, tax by country. Never inside an app-store binary (CONTROL) | — |

Seven of the twelve are quiet until ten thousand, and three never break at
all, because of decisions made earlier: no accounts, no messaging, no feed,
peer verification instead of a review queue, self-serve recovery by code. The
exposure concentrates in four places — liquidity across fragmented geography,
the labor of introducing people, the readouts that rebuild themselves, and
the one notification the product allows itself — and that is where this pass
spends.

## Founder labor, by stage

The commandment's test is whether the founder's hours grow with members.
Here is where they go instead:

- **O(1) throughout** — the monthly hour (`docs/OPERATING.md`), the weekly
  safety check (`docs/TIME.md`), the backup.
- **O(pools) from 1,000 to 10,000** — vet one matchmaker per pool. A
  matchmaker is the role the community already pays, at the nikah
  (`src/data/plus.ts`); the product supplies the queue and the computed
  candidates, and the founder supplies the trust. Opening a pool is the
  founder's decision until the flag automates it, then it is a review.
- **O(escalations) after** — a metro pool of tens of thousands cannot be
  split below the city (LEARNING), so several matchmakers share one pool's
  queue and the founder holds only what they cannot: a report that needs
  more than a word, a matchmaker who needs replacing, the loop.

Two rules keep this honest. **Matchmakers see identity; learning never
does.** The introductions record is Tier 4 (`docs/LEARNING.md`) — the
aunties have always kept the notebook — and what it teaches is copied into
the stripped tally, never the other way. **Sequencing is a queue, not a
count.** The next introduction goes to whoever in the pool has waited longest
since their last, read from the Tier-4 record by hand or by the matchmaker's
tool. It is never "matches per member", which LEARNING refuses by name,
because a per-person count of anything is a desirability score waiting to
happen.

## Now versus wait

The test for "now": it cannot be retrofitted, or it makes a public number
honest. A cohort record has no TTL and no re-ask path — a member joins once
and never posts again unless she moves — so a field missing from it today is
missing forever. A progress record expires in a year, so anything added
there is fully present within one. The waitlist form is the only contact
list and nothing reads it back; if it did not carry country, city and reach,
the founder could not segment the first "your pool opened" mail even by hand.

**Built in this pass:**

- **Country and reach, and the pooled door** (`netlify/functions/cohort.ts`,
  `src/components/Cohort.tsx`, the form registry, Trust's "Joining the
  founding cohort" paragraph in the same commit).
- **An hourly cap on every public write** (`netlify/shared/limit.ts`,
  `overHourlyCap`). `docs/TIME.md` deferred this with a trigger; this pass
  supersedes it for a reason that audit did not have. The door is now the
  unit that opens a marketplace, and a door whose writes are unbounded can
  be walked toward forty by a script; a `keep` loop is the cheapest way to
  spend the free plan's storage, a `progress` loop the cheapest way to time
  out the founder's readout. A cap does not stop a patient script — the
  kept-map requirement and the founder's judgement do — but it makes
  inflation slow and visible, and bounds every write against limits nobody
  can see. One counter per route per hour with no identity attached; refused
  with the same quiet 503 every client already treats as "try later"; the
  limiter sweeps its own old hours. `docs/DEPLOY.md` names the variables and
  the one time to raise them.

**Designed here, built at the trigger:**

| Item | Trigger |
|---|---|
| Running pool counters, updated on join with `couple.ts`'s etag pattern, and a founder `recount` that rebuilds them from keys | any country past ~2,000 cohort keys, or a door render over a second |
| An `open` flag per pool; the first flipped by hand on forty-and-forty; a second only once an open pool shows `ending.who.here > 0`; later ones on count; the founder may close one | the first pool clears 40/40 |
| `introduce.ts` per `docs/LEARNING.md` (Tier 4, keyed by map codes, codes stripped from the tally), the waited-longest queue, and a matchmaker key beside the founder key | the first pool is opened |
| "Your pool opened", by hand: export the form, filter by country / city / reach, one mail through a vendor. Then automated | the first pool opens; then more than one pool a month |
| A pre-aggregated `/progress` readout, written on report and decremented on forget, with today's recompute kept as the monthly repair | `/progress` past ~2,000 records, or its first 503 |
| A scheduled sweep: expired progress records, orphan vouches — and the half of the cohort sweep a founder never reads. **Cohort entries whose map is gone or lapsed are swept on every founder `/pool` read of that pool** since `docs/LIQUIDITY.md`; the public count still trusts its keys | the first orphan found in the yearly listing (`docs/OPERATING.md`) |
| Support: a FAQ → the matchmaker as first line → a shared inbox | a handful of support mails in a week (`docs/TIME.md`) |
| Payments: a checkout link for "Deciding together" → payouts to matchmakers | the first pool; then the first matchmaker who is not the founder |
| Country on the ladder (`/progress` split by country) | `scenes.other` in `/progress` exceeds any named city |
| Marriages on the door: a running `tallies/married/<scene>` counter written on the first `married` rung and the first `ending.who = here`, decremented on forget, read by `countPool`, rendered only above zero (`docs/FLYWHEEL.md`) | the first `rungs.married` — recomputable from `first.married` days, so waiting loses nothing |
| A real database, per `docs/PRODUCT.md` §10's *real backend*. Every member record already carries `v` (`netlify/shared/record.ts`, since 2026-09-11), so the move branches on a number rather than on a key's segment count or a field's presence | any store past ~50,000 keys |

**Considered and declined.** *OR reach semantics* — viewer-dependent pools.
*A worldwide sentence on the door* — expansion by another name. *Per-person
introduction counts for sequencing* — LEARNING. *A second host or an
abstraction over Blobs* — still `docs/CONTROL.md`'s answer: the control move
is a backup, and the migration, when it comes, is a few hundred lines
against six methods. *Splitting a metro below the city* — ever.

## What this pass changed in earlier documents

- `docs/STRATEGY.md`: "your city opened" is now "the pool you're counted in
  opened"; the density rule names pools.
- `docs/PRODUCT.md`: §7 and §10's *first pool opens* speak of the first pool.
- `docs/LEARNING.md`: the collected list gains her country and how far she
  said she would go.
- `docs/OPERATING.md`: the `/cohort` readout's new shape; a housekeeping line
  for legacy door keys and for entries whose map has lapsed.
- `docs/TIME.md`: the deferred rate limit is marked built, with the reason.
- `docs/DEPLOY.md`: the six new `*_HOURLY_CAP` variables.
