# Niyyah — what we believe about Somali marriage that nobody has checked

> MJ DeMarco's Knowledge Gap Strategy: assume the greatest risk is something
> important you do not yet understand. For this product the finding is blunt.
> Every claim about how Somali people in the diaspora look for a spouse — what
> stops them, what they fear, who they trust, what they would pay — is stated
> flat, in the strategy, in the product notes, in the public copy. The only
> sourced facts in the repository are the diaspora sizes in `docs/WEDGE.md`.
> Real member evidence is zero: three test rows, no cohort store. That is
> where a pre-launch product stands. The failure would be to keep treating
> those claims as known.

## How to read this file

Four classes, and a claim may only move up one at a time:

- **KNOWN** — a source, or the code itself.
- **LIKELY** — culturally attested, or reasoned from the product's mechanics;
  unmeasured here.
- **ASSUMED** — stated flat and load-bearing. Most of the strategy.
- **UNKNOWN** — not even asserted, or explicitly admitted as a gap.

The rule: a claim is promoted only on one of the three methods below, in
that order of credibility. Founder opinion is recorded as ASSUMED, dated,
and stays there until behaviour or a member says otherwise.

## The map

| Area | The belief | Class | What tests it |
|---|---|---|---|
| **What prevents people** | The room is wrong, not the person; the masjid has no mechanism; anxiety is acute and weekly | ASSUMED | `cohort` `hooks` per city; the hook's `other` share is the test of the list — since 2026-09-12 the hook has a "Something else", so `none` means only "skipped" (`docs/BOARD.md` decision 8) |
| | Which of the five hardest parts dominates | UNKNOWN | same |
| **Priorities of segments** | Women 24–34, men 26–36; he arrives through her; the divorced and remarrying are the largest unserved segment | ASSUMED | door women/men; `vias.door`; conversations |
| | Only *preparing* members are marketplace supply | LIKELY (from mechanics) | `scenes[city].situated` against `read`/`eleven` |
| **Seriousness** | It is behaviour, not words; the ledger is what a serious person has done | ASSUMED | `ending.used`; `marriedBy` rows; the ledger per city |
| **Dealbreakers** | The seven non-negotiables | ASSUMED | `ended.which['non-negotiable']` |
| | Which are load-bearing | UNKNOWN | `marriedBy.ended['non-negotiable']` |
| **Trust** | Women's trust is the liquidity; men follow; the Muslim apps died of male skew | **ASSUMED — the most load-bearing unevidenced claim in the repository** | door men against women, weekly |
| **Privacy** | The fear is exposure and screenshots; nothing that says "I am looking" gets forwarded | ASSUMED | `hesitated.seen`, `.contact`; `vias.words` share |
| | A city of forty is re-identifiable from facts | KNOWN (self-admitted) | — |
| **Family involvement** | Family in the room is wanted; a father will vouch | ASSUMED | `vouched` per hundred `kept`; hook `family`; `hesitated.family` |
| **Geography** | MSP ~84,000; Columbus 50–60,000; UK 176,645; Toronto ~20,000 | KNOWN (census) | — |
| | Liquidity is local; who would relocate | LIKELY / UNKNOWN | `reach` per city; `across`; `/pool?country=` against `/pool?scene=` |
| | Forty and forty can introduce nearly everyone in it — age does not strand a side | **INFERENCE, 2026-09-12** — on the coded gate, yes: about 56% of pairs are eligible at any size and `λ ≥ 5` holds at nine a side (`docs/ATOMIC.md` §3). Which is why it was the wrong question | `/pool` `pairs`, `inventory` read raw; A7 |
| | *q* — the share of eligible pairs where an introduction is welcome both ways — is at least 0.15 | UNKNOWN — the number that decides whether the atomic network is 25/20 or 100/100 (`docs/ATOMIC.md` §4) | The yield of the first twenty introductions |
| | Counted members are still there when someone is offered — seven in ten answer within a fortnight | UNKNOWN — a kept map is live for a year and nothing reads activity | Response to the first twenty introductions, within fourteen days |
| **Why conversations fail** | The eleven are what break Somali marriages, found out after families are involved; secrecy predicts non-seriousness; "I don't know my own answer" is the most common state | ASSUMED — central to the product | `ended.reason` and `which`; couple tally `both-not-talked` per topic; `marriedBy.through`; `eleven.unknown` histogram |
| **Safety** | Players, liars, creeps; six kinds of harm; one incident can kill us | ASSUMED / LIKELY | `safety` reasons; `other`'s share |
| **Competing alternatives** | Hinge exposes her; Muzz and Salams are low-trust; aunties are limited and judging | ASSUMED — no instrument | hook `finding`; conversations |
| **Willingness to pay** | Families already pay matchmakers, at the nikah | ASSUMED — demoted 2026-09-12: attested by nobody in this repository (`docs/REDTEAM.md` assumption 7), and this file's own rule classes founder opinion as ASSUMED | the ten conversations' wedding-payment question; three practising matchmakers' fees (`docs/BOARD.md`) |
| | They will pay this product, at a price not yet set | UNKNOWN | the first pool's checkout for "Deciding together" |
| **Reasons people hesitate** | Exposure; "does opening this mean something failed"; the toll gate of thirteen questions | ASSUMED — until this pass, no instrument | `hesitated` by reason; `countedBy.hesitated`; and, for the toll gate itself, `rungs / facts.began` (`docs/EXPERIMENTS.md`) |

## The gaps, ranked by how dangerous it is if we are wrong

> Ranked here by danger to the *product*. `docs/REDTEAM.md` ranks the same
> beliefs by danger to the *company* and comes out differently — distribution,
> then market size with specificity, then payment — and says why. Read both.

1. **Men do not follow women.** If the door stays at five women to one man,
   there is no marketplace and every instrument is a hobby. *Test:* the
   door's men against women, weekly; `vias.door` (men arriving through "send
   him the read"); WEDGE.md's pivot rule at eight weeks. `docs/MACHINE.md`
   finds this gap has two causes the readout cannot tell apart — men never
   arrive, or men arrive and bounce at the read — and, after its M0, the
   ladder's `sides.man` funnel is the test that separates them. And since
   `docs/REDTEAM.md`, the cross neither split could make alone:
   `sidesByVia.man.group`. A man who arrived through her eleven is already
   talking to her; the door counted him as supply, and he never was.
   **2026-09-12:** one cause the readout could never have shown was in the
   product itself — his read graded him on her script and its result called
   the woman "he" (`docs/BOARD.md`, "What the founder's own walk found";
   `docs/FEEDBACK.md`). Fixed, and it changes nothing about this gap: a
   coherent read is not evidence that he wants one. Ten men first.
2. **Words do not travel.** If nothing about marriage gets forwarded at all,
   the distribution model has no engine and paid acquisition — which the
   strategy forbids — becomes the only path. *Test:* `vias.words`, `eleven`
   and `couple` share of `arrived`, against `group` and `unsaid`;
   `followed-through` per hundred `arrived`.
3. **People will not put a map on a server or leave a way to be reached.**
   *Test:* the `mapped → kept → counted` funnel — computable since
   `docs/ROADMAP.md` made `kept` a rung of its own, so the two halves are
   separate numbers rather than one — and why they stopped: `hesitated` by
   reason. The halves fail differently: `kept / mapped` is whether they
   trust us with the map, `counted / kept` is whether they will be reached.
4. **The instruments are not wanted without a marketplace.** *Test:* `read`,
   `eleven`, `followed-through` per hundred `arrived`; `ending.used`.
5. **Family is a barrier, not a feature.** *Test:* `vouched` per hundred
   `kept`; the hook's `family` share; `hesitated.family`. And, since
   `docs/BETS.md` B1, the half that separates shame at asking from friction on
   his side: `/vouch`'s `asked` against `given`.
6. **The eleven are not what breaks marriages.** *Test:* `ended.reason` and
   `which`; the couple tally's `both-not-talked` per topic; `marriedBy.through`.
7. **Nobody pays at the nikah.** Fatal to revenue, not to the marketplace,
   and later in time. *Test:* the first pool's checkout for "Deciding
   together"; until then `ending.who.family` as the signal that families
   remain central to the decision.
8. **The alternatives are good enough.** *Test:* the hook's `finding` share —
   people who cannot find anyone at all — and the conversations below.
9. **The wrong seven non-negotiables.** *Test:* `ended.which['non-negotiable']`
   and `marriedBy.ended`; stated dealbreakers as a fact, at introductions.
10. **The wrong taxonomy of harm.** *Test:* `safety` reasons, and `other`'s
    share — readable since `docs/HARD.md`, as `resolved.byReason` in the
    `/safety` readout. Resolving a report used to delete it outright, which
    made this test permanently uncomputable; what survives now is the kind of
    harm and what was done about it, joined to nobody.

## The learning method

In order of credibility, and the only order in which a claim may be promoted:

1. **Behaviour already recorded.** Nine of the ten gaps above have a readout
   field today. The first hundred people through `docs/WEDGE.md`'s playbook
   *are* the experiment, and `docs/OPERATING.md`'s monthly hour reads them.
   Nothing new to build; something new to read.
2. **A decision at the moment, one tap, a closed list.** Where behaviour is
   silent — the person who reaches the door and does not walk through — the
   product asks why, once, as a choice from a list we wrote, under the same
   code as the rungs. Never free text, never about a person. Built in this
   pass: `src/data/hesitation.ts`, carried as `facts.hesitated`.
3. **Ten conversations, behaviour-anchored.** With the first ten counted
   members. Recorded in `docs/FEEDBACK.md`, tagged back to the row here they
   bear on. Questions about what they *did*, never what they *would*:

   - The last time you wanted to meet someone seriously — what did you
     actually do? Who knew?
   - What have you tried before this, and what happened?
   - When something ended, how did it end, and who did you tell?
   - Who in your family knows you are looking? Who would you want to know?
   - When has anyone in your family paid a matchmaker, and what for?
   - What would you never want a screenshot of?

   Recorded as the founder's notes, never in a store. These are the only
   credible source for the two areas no instrument can reach — the
   alternatives and the price — and the check on every closed list: does
   what people say match the `other` share?
4. **Founder opinion.** Written here as ASSUMED, dated, and never promoted
   without one of the three above.

Two rules about lists: every closed list's `other` or `none` share is the
test of the list itself — a hook `none` above a third means the five hardest
parts are the wrong five — and a list is revised in the monthly hour like any
other constant, one change at a time, on a hundred records.

## Considered and declined

- **"What did you try before this?" as a question in the product.** A fact
  about a person collected for the founder's curiosity, not for her — the
  test in `docs/LEARNING.md` fails. It stays a conversation.
- **A pre-order or reservation to test price.** It contradicts the promise
  that everyone here before launch keeps every paid feature free for a year.
  The first pool's checkout is the test.
- **A "saw the door" rung.** An attention trace, refused by LEARNING. `mapped`
  against `counted` is the honest funnel; `hesitated` says why.
- **An age band on the door.** Still deferred as a key segment, per
  `docs/WEDGE.md`; age itself is asked at the door and read back by `/pool`,
  floored, since `docs/LIQUIDITY.md`.

## Reclassification log

_Dated, one line each: the claim, the class it moved from and to, and the
evidence. A claim moves one class at a time._

- 2026-09-12 — *Families already pay matchmakers, at the nikah*: LIKELY →
  ASSUMED. No source in the repository; `docs/REDTEAM.md` proposed the
  demotion on 2026-09-08 and `docs/BOARD.md` executed it. The evidence that
  would move it back: amounts, without names, in `docs/FEEDBACK.md`.

- 2026-09-12 — *Forty and forty can introduce nearly everyone in it*:
  ASSUMED → INFERENCE. `docs/ATOMIC.md` simulated `pool.ts`'s own
  `eligible()` under stated distributions: true on the coded gate at any
  size, and so not the question. The two claims it hid — the hidden
  compatibility rate and activity — enter as UNKNOWN with the introductions
  record as their instrument.

- _(no member evidence yet — the first hundred records are not in)_
