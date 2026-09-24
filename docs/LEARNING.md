# Niyyah — what it learns, and what it refuses to

> Imagine the platform has helped thousands of people marry. What does it know
> that a competitor arriving that day cannot have? And what must it refuse to
> know even when it easily could? This file answers both, and every store and
> function in `netlify/` is held to it.

## The one principle: decisions, not attention

Every dating app's intelligence is built on attention traces — dwell, swipes,
opens, reply latency, who messaged first. Those signals are cheap, abundant,
available to any competitor in a week, and they are the mechanism by which the
category became a slot machine: a system that learns from attention optimises
for attention.

Niyyah has no swipe, no feed, no messaging, no ranking. What it has is a small
number of **considered decisions with stated reasons**. She confirmed a
conversation happened. She moved a stage. She ended a courtship and said why,
in one of ten words. She married and said what decided it. Each is costly to
produce, each is about her life rather than about the app, and each carries a
reason from a closed list. That is the whole corpus, and it is the moat: nobody
collects considered decisions without being the place people make them, and
nobody is told the reasons without being trusted.

Corollary, and the rule everything else hangs on: **the product learns about
pairings, conversations and questions. It never learns about a person.** No
model of her, no model of him. What it revises are the constants in
`src/data/` and `src/lib/` — which non-negotiable is load-bearing, which of the
eleven predicts trouble, which script gets said — for everyone at once, on the
loop in `docs/OPERATING.md`.

## The eight questions, and what a dating app collects instead

| Question | Signal, always from a closed list | Teaches | The trap we refuse |
|---|---|---|---|
| **Characteristics of mutual interest** | On an introduction that gets two yeses: the pair's *joint* on each alignment dimension — same, near, far — never a side. *(Designed; built with the marketplace.)* | Which alignments precede mutual yes *here* | Learning what makes a **person** wanted, which is a desirability score under another name. We learn what makes a **pairing** work |
| **Stated preferences vs revealed behaviour** | Her stated non-negotiables × her decisions on people who met or missed each, aggregated over people. Today: which non-negotiable *ended* a courtship, crossed with whether she later married. | Which of the seven non-negotiables are load-bearing and which aspirational | "You say X but choose Y, so we'll show you Y." A stated non-negotiable is **never** overridden by inferred behaviour, and nobody carries an *inconsistent* flag. If a non-negotiable is aspirational, the **question** changes, for everyone |
| **Compatibility dimensions** | The eleven (couple tally); seven grounds × outcome; how-you'd-live × pair outcome *(designed)* | Which dimensions predict advancing or failing. Revises `consequence`, the read's `PRIORITY` order, the order of the eleven — orders, never a sum (`docs/ALIGNMENT.md`) | A learned per-person compatibility vector |
| **Conversation progression** | Stage transitions, to the day; follow-ups confirmed | How long *talking → deciding* takes here; which confirmed conversation most often precedes *deciding* | Message counts, reply latency, who initiated. There is no messaging; conversations happen in the world. That is a property to protect |
| **Reasons matches fail** | **`ended`**: when *talking* or *deciding* falls back to *preparing*, one of ten reasons — a non-negotiable and which, one of the eleven and which, what the read found thin, her family, his, timing, distance, he stopped, she did, rather not say | **The dataset nobody has**: why Somali courtships end, at which stage, and whether it was foreseeable. Nearly every courtship today is off-platform, so this needs no marketplace | Free text about him; his name; anything that becomes a reputation |
| **Reasons matches advance** | `ending.mattered`; *(designed)* one tap at the move to *deciding* | What actually decides, at which stage | A "success factors" model fed back as advice that pressures the next person |
| **User feedback** | Follow-up outcome *differently*; `ending.used`; *(designed)* one tap per instrument, about the product never a person | Which instruments are decoration | Ratings, NPS, surveys — feedback that becomes its own loop |
| **Successful outcomes** | `ending`; *(designed)* an introduction that reaches *married*; the first-year check | Ground truth for everything above | Inferring marriage from silence; a public success feed |

## The tiers — how close each piece of data may get to a person

| Tier | Where | Holds | Readable by | Joinable to |
|---|---|---|---|---|
| **1 · The device** | localStorage | Her answers and sheets, guide threads and the follow-ups it handed her, the advice line, the way to reach her, any name | Her — and, once she is counted, `/pool` reads five fields of her kept map (age, stage, practice, children, non-negotiables) into floored counts over a pool with no code on them (`docs/LIQUIDITY.md`) | Nothing, unless she keeps her map |
| **2 · The install code** | `progress` | Rungs, dated to the day; facts — grounds, read, eleven counts, conversations confirmed, ending, ended. Closed ids only | Founder, as distributions never records | **Not by key.** Not by name. See *honest limits* below |
| **3 · No code at all** | `tallies` | How pairs come out on the eleven | Founder | Nothing — there is no id |
| **3 · No code at all** | `ops` | How the service did each day: server errors by route, caps that refused by kind, the guide's calls and tokens, crashes phones reported; and once a day how many records each store holds, to notice a store that was lost. A closed list of signals, a day each, kept thirty-five days (`docs/OPS.md`, `docs/RECOVERY.md`) | Founder, through `/health` | Nothing — no id, no city, no time; it describes the service, never a person |
| **4 · Human-read** | `vouches` sentence and phone; **`contacts` — the way to reach her, with her city** (the waitlist form carries only a city and a day since 2026-09-23, `docs/PRIVACY.md`); *(designed)* the introductions record | What a human matchmaker needs — who vouched, how to reach her, who was introduced to whom | Founder, in the store, with her own credentials. **No endpoint returns any of it** — not the tallies, not the backup. The one exception is a founder-gated count of vouch *asks and gives*, which returns no sentence, phone, name or code (`docs/BETS.md` B1) | The map code, because you cannot introduce two people without knowing who they are. **Never fed to learning**, which reads only a stripped tally |

The kept map sits in Tier 1 by her choice: she keeps it, under a code
registered to nobody, and it holds what brings her back — and not her contact,
not the guide, not its follow-ups. `src/lib/keep.ts` `KeptSnapshot` is the
type that guarantees it and `netlify/functions/keep.ts` strips the same fields
from an older client.

## Collected, and deliberately not collected

**Collected** — as an id from a closed list in `netlify/shared/vocab.ts`,
described on the Trust screen in the same commit, gated by "Count me":

- Where each of the seven grounds read, in a word
- How a read came out and which dimension it found thinnest
- Counts of the eleven and the one to open
- Which conversation she confirmed she had, by source and topic
- Which stage she is in and the day it changed
- **That she kept her map on the server** — one rung, the day she did it, and nothing about the map itself. It is the only rung about trusting us rather than about her courtship, and it exists so that *built a map and stopped* can be told from *kept it and did not walk through the door* (`docs/GAPS.md` gap 3, `docs/ROADMAP.md`)
- **That a courtship ended, from which stage, and — only if she taps one — one of ten reasons and which**
- **If she reaches the door and taps "not now" — only if she says why — one of six words about the door**, never about her (`src/data/hesitation.ts`, `docs/GAPS.md`)
- **Which of the four questionnaires she began** — the map, a read, the eleven, or the eleven someone sent her. One bit each, for ever, so that a completion rate can exist at all (`src/data/instruments.ts`, `docs/EXPERIMENTS.md`)
- Who she married, what decided it, which instruments were real
- What kind of link brought her here, never who sent it
- Her city and country, how far she said she would go for the right person, who she is seeking, the hardest part she named, what she has done here
- **Which side of the door she is on — woman or man — beside the rungs**, so the men's funnel can be read apart from the women's. The one split `docs/MACHINE.md` found the ladder could not make; floored like every other split by a quasi-identifier, crossed once with the kind of link that brought her — so the men who arrived through someone's eleven, already talking, can be told from the men the network channel produced (`docs/REDTEAM.md`) — and never crossed with the facts
- How pairs come out on each of the eleven, with no pair in it

**Deliberately not collected**, and why — so the next engineer does not "just
add it":

- **Anything she or he typed about the other person.** Not the advice line, not the guide, not a box on the ending or the ended screen. Free text is where reputation leaks in, and this is a tight community. The one carve-out: a safety report, Tier 4, founder-read, never tallied beside anyone, and **expunged on resolution** — her words are deleted the moment the founder acts, and what survives is a stub holding the reason, the day and what was done, joined to nobody. That stub is the only way the taxonomy of harm above can ever be read, and it carries no code, no side and nothing she wrote (`docs/HARD.md`). Forget-me takes any report she filed
- **His name, ever.** The read never asks it. Nothing else does
- **Attention traces.** Dwell, scroll, opens, session counts, reply latency, time in app, days since last open. PRODUCT §6 says sessions should *fall*; a system that collected them would optimise them within a quarter
- **Message content.** There is no messaging. If one is ever built, its content is Tier 1 by construction
- **Photos or any appearance signal**
- **How many yeses or nos a person has received.** A desirability count is how every marketplace becomes a ladder where the rich get richer and the rest are quietly buried. The ledger — what she has *done* — decides who meets whom; how others responded to her does not, and no tally shape can compute it
- **Clan.** Qabiil is one of the eleven — a conversation, recorded only as had or not, agree or differ. The product does not know anyone's clan, cannot match on it, and cannot be asked to. This line is drawn on purpose
- **Age as a learned feature.** Age is on the profile for eligibility; the system never learns "women over N receive fewer yeses"
- **Location finer than the city**
- **The contact graph.** A vouch is a relationship type and a first name, not an edge to another member
- **Inferred traits.** No personality from text, no sentiment, no embedding of a person
- **Anything from the guide.** Threads and the follow-ups it hands her are Tier 1
- **Precise time.** Every stored date is a day — `netlify/shared/day.ts`
- **Her contact next to her answers.** The way to reach her lives in the `contacts` store, keyed by her code, with her city and country beside it and nothing else — never in the store that gets listed and tallied, never returned by any route, and deleted by forget-me rather than by hand. It is kept at all so that the list of people waiting for a pool belongs to Niyyah rather than to a form provider (`docs/OWNED.md`)
- **Decision latency, A/B assignment, push tokens, profile completeness, matches per member** — the year-two temptations, refused in advance. *Matches per member* is a count on a person: how many she was shown, or how many responded. `/pool`'s `inventory` is a different object and must stay one — a floored histogram over a pool of how many eligible partners its members have, from stated non-negotiables and the age band, computed on read and never written (`netlify/functions/pool.ts`, `docs/LIQUIDITY.md`)
- **How often, how far, or how long.** `began` says *that* a questionnaire was started, once, for ever — never how many times it was opened, how far through she got, or how long she stayed. It is a set with a union merge precisely so a counter cannot be derived from it, and it must never be widened into one (`docs/EXPERIMENTS.md`)

The test for any future field: *does this describe a person, or a pairing, a
conversation, or a question?* Only the last three are collected.

## What she sees and controls

1. **Trust enumerates every field**, in plain words, and the copy moves in the
   same commit as the payload. That is a standing rule of this repository.
2. **"Count me" gates the call itself.** Off means nothing is sent. It is *on
   by default*, and the first report — one `arrived` — is posted on first
   render, before Trust is ever opened: one open per install is recorded
   unless she turns it off. The honest word is opt-out, not consent
   (`docs/BOARD.md`); the men's kill tests depend on that denominator.
3. **Told at the moment, not in a policy.** The ended screen says on its face
   that nothing about him is recorded and that the reason reaches us as one of
   ten words and never reaches him.
4. **Forget me.** One action, behind a second tap: deletes her kept map and
   everything chained to it — the eleven she sent him, her family's vouch and
   the token that pointed at it, her place on the door — then the count of her
   steps, then every key on the phone. Deleting the install record is a true
   un-count, because the readout is computed from records on every read. Trust
   names the one thing that stays: a pair already counted, under no code.
5. *(Designed, next)* **Your record**: everything this phone has sent, in the
   words Trust uses, with a retract on each item.

## Honest limits

Written down so nobody has to discover them.

- **The two codes are unjoinable by key and by name, not by content.** The
  facts are deterministic functions of the kept map's answers. Anyone holding
  both stores can recompute the facts from each map and match them to a
  progress record within the same city — in a city of forty, often uniquely.
  Trust says "nothing links the two by name," which is true, rather than "no
  way to put the two together," which was not. The facts stay: they are the
  asset. The dates are days, which removes the easiest join.
- **The floor protects against a leaked key, not against the founder.** Every
  cell in a split by city, door or `marriedBy` row under five reads `null`.
  The founder holds the stores and can count by hand. A `null` beside an
  unfloored total is recoverable by subtraction when every other cell shows.
  `netlify/shared/floor.ts`.
- **Secret variables are not available on this plan.** Every key on the
  Netlify site is readable by anyone on the team. `docs/DEPLOY.md`.
- **Links sent before 2026-09-05 carried the map code.** They still vouch, and
  they still open the map. `docs/DEPLOY.md` says what to tell their holders.
- **The founder reads maps to count a pool.** `/pool` opens every counted
  member's kept map to say whether a pool could introduce anyone — the first
  reading of a map for any purpose but handing it back, permitted because
  matching is the job she kept it for. It returns counts of five or more and
  cannot be asked for one member; the founder holds the store and could
  count by hand anyway. Trust says so (`docs/LIQUIDITY.md`).

## Where each piece lives

| Piece | Code |
|---|---|
| Every closed set the server accepts | `netlify/shared/vocab.ts`, pinned to `src/` by `tests/vocab-sync.test.ts` |
| The facts, derived on the device | `src/lib/facts.ts` |
| Validation, merge rules, the readout | `netlify/functions/progress.ts` |
| Why courtships end | `src/data/ended.ts`, `src/components/Ended.tsx` |
| How pairs come out | `netlify/functions/couple.ts` |
| What the kept map may hold | `src/lib/keep.ts` `KeptSnapshot` |
| The vouch token | `netlify/functions/vouch.ts` |
| The day, never the moment | `netlify/shared/day.ts` |
| The floor | `netlify/shared/floor.ts` |
| Forget me | `src/lib/forget.ts`, `DELETE` on `keep` and `progress` |
| The shape of a pool | `netlify/functions/pool.ts`; the gate twin `netlify/shared/gate.ts` |
| What she is told | `src/components/Trust.tsx` |
| What the readout revises | `docs/OPERATING.md` |

## The lifecycle, field by field

Every field and event this product collects is mapped in `docs/PRIVACY.md`.
For each one it answers: why, when, where it is stored, who reads it, how long
it lives, how it is deleted, and whether the same value is possible without
it. This file is the charter; that one is the ledger that holds the charter to
the code.

