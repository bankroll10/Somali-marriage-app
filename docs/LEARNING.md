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
| **Compatibility dimensions** | The eleven (couple tally); seven grounds × outcome; how-you'd-live × pair outcome *(designed)* | Which dimensions predict advancing or failing. Revises `consequence`, `WEIGHTS`, the order of the eleven | A learned per-person compatibility vector |
| **Conversation progression** | Stage transitions, to the day; follow-ups confirmed | How long *talking → deciding* takes here; which confirmed conversation most often precedes *deciding* | Message counts, reply latency, who initiated. There is no messaging; conversations happen in the world. That is a property to protect |
| **Reasons matches fail** | **`ended`**: when *talking* or *deciding* falls back to *preparing*, one of ten reasons — a non-negotiable and which, one of the eleven and which, what the read found thin, her family, his, timing, distance, he stopped, she did, rather not say | **The dataset nobody has**: why Somali courtships end, at which stage, and whether it was foreseeable. Nearly every courtship today is off-platform, so this needs no marketplace | Free text about him; his name; anything that becomes a reputation |
| **Reasons matches advance** | `ending.mattered`; *(designed)* one tap at the move to *deciding* | What actually decides, at which stage | A "success factors" model fed back as advice that pressures the next person |
| **User feedback** | Follow-up outcome *differently*; `ending.used`; *(designed)* one tap per instrument, about the product never a person | Which instruments are decoration | Ratings, NPS, surveys — feedback that becomes its own loop |
| **Successful outcomes** | `ending`; *(designed)* an introduction that reaches *married*; the first-year check | Ground truth for everything above | Inferring marriage from silence; a public success feed |

## The tiers — how close each piece of data may get to a person

| Tier | Where | Holds | Readable by | Joinable to |
|---|---|---|---|---|
| **1 · The device** | localStorage | Her answers and sheets, guide threads and the follow-ups it handed her, the advice line, the way to reach her, any name | Her | Nothing, unless she keeps her map |
| **2 · The install code** | `progress` | Rungs, dated to the day; facts — grounds, read, eleven counts, conversations confirmed, ending, ended. Closed ids only | Founder, as distributions never records | **Not by key.** Not by name. See *honest limits* below |
| **3 · No code at all** | `tallies` | How pairs come out on the eleven | Founder | Nothing — there is no id |
| **4 · Human-read** | `vouches` sentence and phone; the waitlist form; *(designed)* the introductions record | What a human matchmaker needs — who vouched, how to reach her, who was introduced to whom | Founder, by hand | The map code, because you cannot introduce two people without knowing who they are. **Never fed to learning**, which reads only a stripped tally |

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
- **That a courtship ended, from which stage, and — only if she taps one — one of ten reasons and which**
- Who she married, what decided it, which instruments were real
- What kind of link brought her here, never who sent it
- Her city, who she is seeking, the hardest part she named, what she has done here
- How pairs come out on each of the eleven, with no pair in it

**Deliberately not collected**, and why — so the next engineer does not "just
add it":

- **Anything she or he typed about the other person.** Not the advice line, not the guide, not a box on the ending or the ended screen. Free text is where reputation leaks in, and this is a tight community. The one carve-out, designed and not built: a safety report, Tier 4, founder-read, never tallied, expunged on resolution — because Trust promises "players, liars and creeps removed," and a report is free text about a named person
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
- **Her contact next to her answers.** The way to reach her goes to the founder's form alone
- **Decision latency, A/B assignment, push tokens, profile completeness, matches per member** — the year-two temptations, refused in advance

The test for any future field: *does this describe a person, or a pairing, a
conversation, or a question?* Only the last three are collected.

## What she sees and controls

1. **Trust enumerates every field**, in plain words, and the copy moves in the
   same commit as the payload. That is a standing rule of this repository.
2. **"Count me" gates the call itself.** Off means nothing is sent.
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
| What she is told | `src/components/Trust.tsx` |
| What the readout revises | `docs/OPERATING.md` |
