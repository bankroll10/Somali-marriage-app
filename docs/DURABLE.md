# Niyyah — what survives when the hype leaves

> MJ DeMarco's Cinderella Principle: assume the coach turns back into a
> pumpkin. The AI hype is gone tomorrow. Dating-app fashions have moved on —
> whatever replaced swiping has itself been replaced. No platform is handing
> out reach any more. Then ask the only question that matters: does this still
> solve something enduring?
>
> **Somali singles want compatible partners and successful marriages, and want
> to reach them without losing dignity, faith, time or peace.** That sentence
> was true before any of this existed and will be true after all of it. It
> contains no model, no feed, no platform. Everything below is sorted by how
> close it sits to that sentence.

## The finding, before any opinion

The product is already built the way this principle demands, and one item on
its own roadmap would have undone it.

**Already durable.** Live-model code exists in exactly two files —
`netlify/functions/guide.ts` and `src/lib/coach.ts`. `coach.ts` says it in its
own words: *"The local matcher is therefore not scaffolding — it is the
offline voice, and the only one that speaks until an `ANTHROPIC_API_KEY` is
set."* `docs/CONTROL.md` row 7 scores Anthropic disappearing entirely as
**"Nothing breaks."** Every instrument — the read, the eleven, the map, the
ledger, the ladder, the door, the words — is pure, local, and ours. As of this
pass `tests/durable.test.ts` asserts all of that, so it cannot quietly stop
being true.

**The one regression, now declined.** `docs/PRODUCT.md` §10 item 3 was *"Live
Claude behind the map — `generateReflection` is the last local seam,"* and
`src/lib/reflection.ts` carried the same intent in a comment. The map is the
product's central durable asset: it is what gets matched, it is computed on
her own device from a question set we own, and it works with the network off.
Putting a model behind it would trade a permanent asset for a rented one and
make the core artifact fail when a supplier does. It is not a low priority.
It is a durability regression, and it gets a rule instead of a slot.

## The rule this pass leaves behind

> **A model may add a layer on top of something the product already does
> completely without it. It may never be the thing that produces the map, the
> read, the eleven, the match or the door. With no key set, a member loses a
> better sentence — never an instrument.**

Enforced by `tests/durable.test.ts`, not by memory.

## DURABLE VALUE

The test for this column: *is it a question about a marriage, or a mechanic of
an app?* Only the first kind survives.

| What | Why it survives |
|---|---|
| **The eleven conversations before a yes** | Money, family, where you'll live, children, deen, clan. These broke marriages a century ago and will break them a century from now. No technology in the list |
| **The seven grounds of the map** | A description of where a person actually stands. The questions are ours, the synthesis is local, and the whole thing works offline |
| **The read** — *what has he actually done* | Judging intention by behaviour rather than words is older than every app that ever existed |
| **The family vouch** | A wali or a mother putting a name to someone. The oldest verification in this community, and the only one this product claims |
| **The honest door** | A real count, and the refusal to fake one. Trust earned by not lying about how many people are in the room — permanently scarce, and permanently valuable |
| **The ledger deciding who meets whom** | What someone has *done* here, not how others responded to them. Immune to fashion because it measures effort, not popularity |
| **The words that travel** | One person sending one person the exact sentence that worked. The oldest distribution there is, and the only one nobody can switch off |
| **The ending, and the first-year sheet** | The marriage after the wedding, which no product in this category serves at all |
| **The charter** — no photos, no messaging, no free text, no attention traces | Constraints, not features. They cannot be copied by anyone whose revenue depends on time-on-app, and they are why this can be trusted with a marriage |
| **The learning record** | Why Somali courtships end, at which stage, and whether it was foreseeable. The dataset nobody has, it needs no marketplace, and it compounds |
| **The founder's own hands** | Ten named connectors, one room, conversations with the first ten members (`docs/WEDGE.md`, `docs/GAPS.md`). Distribution that no algorithm grants and none can revoke |

## TEMPORARY NOVELTY

Not worthless — *not the reason to exist*. Each of these could disappear and
the product would still solve the enduring need.

| What | The durable thing underneath it |
|---|---|
| **The live model behind the guide** | *Guidance* is durable; the model answering is a supplier. Five voices, the prompt and the framework answers are ours and are already the only voice until a key is set. `docs/EXPERIMENTS.md` A3 has the decision rule that would drop the live half |
| **Generated prose in the map** | The *reading* is durable — where she stands on seven grounds, in a word each. Which sentences say it is decoration. Declined for exactly this reason |
| **"Powered by AI" as a claim** | Found once, on `Philosophy.tsx`. It dates the product the way "Powered by Web 2.0" dates a page, and it makes the model the reason to exist. **Removed in this pass** |
| **"AI" paired against "Faith"** in the philosophy list | Every other row of that list pairs two enduring things. A supplier does not belong beside faith. **Rewritten as "Smart guidance"** |

**What stays, and why.** `src/components/Trust.tsx` names Claude and Anthropic
to a member — *"It goes to Claude, made by Anthropic, which writes the reply"*
— and that stays exactly as it is. It is a privacy disclosure, not a claim:
the member is told where her words go, and told in the next sentence how to
stop them going. Naming a supplier to be honest is durable. Naming one to
sound modern is not.

## TREND-DEPENDENT

| What | Its durable form |
|---|---|
| **The share sheet** | The mechanism (`navigator.share`) is a browser API that works with whatever apps a person has — durable. The *framing* was not: `src/lib/share.ts` described itself as "Share the Gen-Z way (Instagram, iMessage, TikTok, WhatsApp…)", the only mention of TikTok anywhere in the repository. **The comment now names the mechanism, not the apps** |
| **Group posts as the first channel** | `docs/WEDGE.md` posts into alumni and professional groups. Durable *because* it is ten people who were asked by name, not an algorithm that chose to show it. If every platform closed tomorrow, the channel is a phone and a room |
| **Any future dependence on one platform's reach** | Refused in advance. `docs/STRATEGY.md` already forbids paid acquisition; this file adds the reason: reach you did not earn can be withdrawn by someone who has never spoken to this community |

## The reprioritised roadmap

Sorted by closeness to the enduring need, then by what unblocks the rest.

> **Superseded, and kept as the record of why this pass moved things.**
> `docs/ROADMAP.md`'s Fastlane audit reordered the list again and found the
> defect this table could not: every item below waits on posting the first
> link, which was in no version of the roadmap. The live order is in
> `docs/PRODUCT.md` §10. Durability was the right axis and was not the only
> one — an item can be perfectly durable and still be queued behind an act
> nobody has scheduled.

| Now | Was | Why it moved |
|---|---|---|
| **0 · Run the loop** | 0 | Unchanged. The process is the moat, and it depends on nothing |
| **1 · The door, for men** | 7 | The weakest link (`docs/MACHINE.md`). It is a room, not a feature |
| **2 · The first pool opens** | 5 | The enduring need itself, made real. Everything else is preparation for it |
| **3 · Concierge** | 6 | A human matchmaker is the oldest durable form of this business, and the one families already pay |
| **4 · The first-year sheet** | 2 | The marriage after the wedding. Nobody serves it, and it cannot go out of fashion |
| **5 · Your record** | 1 | A trust promise with no supplier behind it. Durable, and quiet |
| **6 · Real backend** | 4 | Infrastructure. Blocked by scale (`docs/SCALE.md`), and it buys durability rather than value |
| **— · Live Claude behind the map** | 3 | **Declined**, with the rule above. The map stays local |

## Considered and declined

- **Dropping the guide entirely.** Guidance at zero liquidity is the answer to
  the cold start (`docs/STRATEGY.md`), and the local voice costs nothing to
  keep. A3's decision rule already governs the live half; this file does not
  pre-empt it.
- **Rewriting the guide as a rules engine to remove the supplier.** The
  fallback *is* that engine, and it already runs. Spending weeks to make the
  live half unnecessary buys durability the product already has, at the cost
  of worse answers.
- **Naming AI in public copy for credibility.** It is credibility borrowed from
  a trend, repayable on demand. What this product can say instead is what it
  actually does, which will still be true in ten years.
- **Removing Anthropic's name from Trust.** The opposite of the principle: a
  member should know where her words go.

## Revisions

_Dated, one line each: what moved between the three columns, and why._

- 2026-09-07 — First pass. "Powered by AI" removed from `Philosophy.tsx`; the
  "AI / Faith" pair rewritten; `share.ts`'s comment de-trended; the map's
  Claude seam declined and replaced with the rule; the roadmap reordered.
