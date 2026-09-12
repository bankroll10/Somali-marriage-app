# Niyyah — the first forty

> MJ DeMarco's Specialized Unit says: do not enter the market, enter a unit of
> it small enough to dominate, and expand from the inside. "Somali singles" is
> already a specialisation, and the strategy already narrows it further —
> women first, Minneapolis first, forty per side before anything opens. This
> document asks whether an even narrower *initial* unit would reach forty and
> forty, and the word of mouth that follows, faster; and it answers with one
> wedge, the evidence for it, and the hypotheses it rests on, kept apart.

## Two facts that shape everything below

**Real member evidence is zero.** The waitlist form holds three rows, all the
founder's own tests within ten minutes of one day. No `cohort` store exists on
the live site, so nobody has ever been counted on the door. Everything here
about *people* is a hypothesis with a named test; everything about *the
diaspora* is external evidence with a source.

**The binding constraint is not women. It is serious, unattached men in the
same pool.** Both of the product's loops for reaching men — the two-sided
eleven, and the door's "send him the read" — recruit a man who is already
attached to the woman who sent it. That is exactly right for the instruments
and exactly wrong for a marketplace, which needs men who are not. So the wedge
cannot be a demographic label. It has to be a *room* where serious women and
serious men already stand together.

## Evidence, and what it is evidence of

| Fact | Source | What it supports |
|---|---|---|
| Minneapolis–St. Paul holds the largest Somali community in North America: roughly 84,000 in the metro, about 50,000 in Hennepin County; Minnesota over 86,000 | US Census / ACS via [KTTC](https://www.kttc.com/2025/12/04/by-numbers-minnesotas-somali-population-according-census-data/), [ctsomali.ca](https://ctsomali.ca/somali-population-in-usa-2025/), [factually.co](https://factually.co/fact-checks/society/minnesota-largest-somali-communities-2025-a42794) | Minneapolis first — the smallest share of the whole reaches forty |
| Columbus is the second US hub at 50–60,000; Seattle and San Diego (6,500–15,000) a tier below | [factually.co](https://factually.co/fact-checks/society/largest-somali-populations-us-states-metropolitan-areas-2025-74071f), [Neilsberg](https://www.neilsberg.com/insights/lists/somali-population-in-united-states-by-city/) | Columbus second in the expansion path |
| The UK's 2021 census counted 176,645 self-identified Somalis — the largest in Europe, spread across London, Birmingham, Bristol, Leicester | ONS Census 2021 | London later; the UK is the first place the *country* pool matters more than any metro |
| Toronto holds roughly 20,000 Somalis | Statistics Canada, via the usual secondary sources | Toronto third |
| The Somali Student Association at the University of Minnesota reports over 500 members | ssaumn.org | A mixed-gender network of the right age exists and is organised |
| SNABPI, the Somali professionals' association, reports thousands of members and chapters in Minneapolis, Columbus and Toronto | snabpi.org | A mixed-gender, 25–35, serious network exists in three of the five cities in `src/data/scenes.ts` |
| Divorce and single motherhood are rising across the diaspora — the UK, the US, Norway, Finland — in qualitative studies; no reliable rate exists | [Landinfo 2018](https://landinfo.no/wp-content/uploads/2018/09/Report-Somalia-Marriage-and-divorce-14062018-2.pdf), [openDemocracy](https://www.opendemocracy.net/en/article_692jsp/), [Finnish study](https://www.researchgate.net/publication/319487813_Divorce_among_Transnational_Finnish_Somalis_Gender_Religion_and_Agency) | A real second segment exists; its size is unknown |

**Evidence from the code** (what the founder can already see, per city): women
and men on the door; how far people would go; their hardest part and what they
have done here, floored at five; which kind of link brought them; every rung by
city. Age reaches no aggregate. Prior marriage, children as a fact, profession
and university are asked nowhere. Every share is one-to-one. Until any per-city
cell passes five people, the only numbers visible per city are women and men.

**Hypotheses** — each with the readout that would confirm or refute it:

| Hypothesis | Test |
|---|---|
| People 25–34 convert from "opened a link" to "counted" better than older or younger | Not testable until age reaches an aggregate — see "deferred" |
| Alumni and professional networks hold unattached serious men in numbers | `countries.us.scenes['twin-cities'].men` against `.women`, week over week, once the playbook runs |
| A link shared into a group produces arrivals who follow through at least as well as a one-to-one send | `vias.group['followed-through'] / vias.group.arrived` against `vias.words` |
| Men counted per woman counted is better through a mixed network than through the one-to-one loops | `men / women` on the door, against the one-per-three the loops alone would suggest |
| Forty and forty in one metro is reachable in a quarter | The door, weekly |

## The eight wedges, judged

| Wedge | Strongest form | Verdict |
|---|---|---|
| **Geography** | Minneapolis–St. Paul | **In.** Largest metro, the standing commitment, the founder's peers |
| **Age / life stage** | 25–34, never married | **In.** Where family pressure peaks; the founder's own circle; the persona the strategy already names |
| **Marriage readiness** | Stage *preparing* — not seeing anyone | **In, as the count that matters.** People who are *talking* or *deciding* are served by the read and the eleven and recruit their own man; only *preparing* members are supply |
| **Professional status** | SNABPI, the Somali professionals' networks | **In as a channel, never as brand.** Mixed-gender, right age, serious, already organised. "For professionals" in copy would contradict Trust's "every member held to the same standard" |
| **University communities** | Current students | **Out** — dense and reachable, but many not marriage-ready, men least of all. **Alumni of the last ten years are in**: same network, right age, still in the group chats |
| **Divorced / widowed** | 30s–40s, often with children | **Not first; the second offer.** The highest unmet pain and no competitor serves it — but nothing in the product asks about it, the men's side is uncertain, and it would change what the brand is *heard as* |
| **Relocation willingness** | reach = country / anywhere | **A pooling mechanism, not a beachhead.** Already built (`docs/SCALE.md`); there is no community of people-who-would-move to walk into |
| **Diaspora concentrations** | MSP > Columbus > Toronto / Seattle; the UK largest in Europe | **Confirms Minneapolis first, Columbus second**; the SNABPI chapter map is the expansion path |

## INITIAL WEDGE

**Twin Cities, twenty-five to thirty-four, not currently seeing anyone —
reached through the alumni and young-professional networks where women and men
already mix:** SSA-UMN alumni, the SNABPI Minneapolis chapter and the Twin
Cities Somali professionals' events, with the mosques' young-adult circles as
the second ring.

This is a *channel* wedge. The public brand does not move: Niyyah is for
Somali singles, and the door already says "Minneapolis–St. Paul opens at 40
each." Nothing in copy says "alumni" or "professional", and nothing ever will
— the ledger, not the résumé, decides who meets whom.

## WHY IT WORKS

- **It is the only wedge that puts both sides in one room.** Every other cut
  finds women; this one finds the men the marketplace cannot otherwise reach,
  because they are already at the same events and in the same chats.
- **The pain is acute here and the founder has peers, not strangers.** 25–34
  is where "when are you getting married" becomes weekly; the founder's own
  circle sits in it, which is the one unfair advantage a founder with no
  community position has.
- **It is the largest metro, so forty is the smallest share of the whole.**
  Forty women and forty men is well under one percent of the Somalis of
  marrying age in the Twin Cities.
- **The instruments work at zero liquidity.** A read and the eleven are useful
  to a network before any marketplace exists — the strategy's own answer to
  the cold start. The room gets value first and a marketplace second.
- **Alumni and professional networks already run on group chats.** That is
  the medium "words that travel" was designed for, and it needs no reward, no
  counter and no link that carries who sent it.

## HOW TO ACQUIRE IT

Inside the rules the strategy calls "never built": no referral reward, no
invite counter, no link that carries who sent it, no paid acquisition, no
seeded count.

**The thirty-day playbook.**

1. **Ten connectors, by name.** The SSA-UMN alumni board, the SNABPI
   Minneapolis chapter leads, the organisers of the Somali networking nights,
   two imams who run young-adult programmes, and whoever the founder's own
   circle says is the person everyone asks. In person where possible, a
   direct message where not. One ask each: post the read into the group.
2. **Lead with the instruments, not the marketplace.** The link is
   `joinniyyah.com/?read&via=alumni` — `professional` or `mosque` for the
   other kinds of room — the read, opened directly, no Welcome, no account.
   The via is the kind of room, never which room: three kinds, so the pivot
   rule below can be read from the readout, which a single `group` cell could
   not tell (`docs/BOARD.md`; `group` stays for any other room). A week
   later, the eleven the same way: `/?eleven&via=alumni`. And in the same
   post, the door: `joinniyyah.com/?door&via=alumni` — the honest number, for
   the man who is looking rather than talking. The read presumes someone on
   the other side; a single man sent only the read had nowhere to land, and
   that was the machine's weakest link (`docs/MACHINE.md`).
3. **The door is the public artifact.** Post its honest count into the same
   groups weekly: "Minneapolis today: 12 women, 3 men." The number is public
   by design and a zero is allowed to be a zero.
4. **Women first, then one man each.** Every counted woman is asked the
   door's question — if you know one serious man who is looking, send him the
   door; if he is already seeing someone, send him the read.
5. **One room, once.** A "before you say yes" evening co-hosted with an alumni
   or SNABPI chapter, where the eleven is the room's exercise and men are
   present because it is their network too. Not a launch party; a
   conversation people were not going to have.
6. **Read the two numbers weekly**, and nothing else weekly: women and men on
   the Minneapolis door.

## DENSITY NEEDED

Forty women and forty men with kept maps in the Minneapolis–St. Paul metro
pool — `COHORT_TARGET`, unchanged, in `netlify/functions/cohort.ts`. That is
the door's promise. What opens the pool is the checklist in
`docs/LIQUIDITY.md`, read from `/pool`: forty and forty *live*, thirty a side
still preparing, an age for everyone, and fewer than five on either side with
nobody eligible — because forty and forty on the door can be a room where a
quarter of the women have no man in their band, and the door cannot show it.

The funnel between "opened a link" and "counted" is unknown and must be
measured rather than assumed. The hypothesis to beat — **the one working
ratio**; `docs/SCALE.md` and the risk below carry six to one as the
pessimistic bound, and `docs/LIQUIDITY.md` works both (`docs/BOARD.md`):
through the one-to-one loops alone, men arrive at about one per three counted
women, so forty men would need a hundred and twenty women. The network channel is the bet that
changes that ratio, and the men's count on the door is the whole test of it —
read as `sidesByVia.man.group` in the ladder's readout, not as men on the
door, because a man who arrived through a woman's eleven is already talking
to her and was never supply for anyone else (`docs/REDTEAM.md`).

Until any per-city cell passes five people, the founder will see exactly two
numbers for the Twin Cities — women and men. They are the two that matter.

## EXPANSION PATH

**Geographic**, in the order the concentrations and the SNABPI chapters
suggest: the Minneapolis metro → the US travellers' pool (reach, already
built: the people elsewhere in the country who said they would move) →
Columbus, the second-largest hub, with a chapter → Toronto, with a chapter →
London, where the country pool matters more than any metro → Stockholm.

**By life stage**, after the first marriages: the divorced and the remarrying,
30s–40s, as a second offer — the highest unmet pain in the community, served
by nobody. It needs a question the product does not ask yet, and it must not
be heard before the brand has a first cohort of marriages to stand on.

**The gate on opening pool two is pool one producing a marriage.** In the
readout: `ending.who.here > 0` in an open pool. This is "density before
expansion" with a number on it — and it corrects a defect in `docs/SCALE.md`'s
first draft, which put that gate on the *first* pool, where it is circular:
nobody can marry someone met here before anything has opened.

## RISKS

- **Men stall.** Women arrive at five or six to one — the pessimistic bound
  on the 1:3 hypothesis above — and the door reads 40/7 for months. The mixed-network entry is the mitigation; the honest door
  is what makes the stall visible rather than hidden behind a feed. Never
  boost, never pay a man for reach.
- **The channel is heard as elitist.** "Alumni" and "professional" stay out
  of every screen; the ledger decides who meets whom; Trust's "every member
  held to the same standard" is the sentence that has to stay true.
- **A tight network amplifies a safety failure.** Reputation is the growth
  engine and the kill switch. `netlify/functions/safety.ts` and its weekly
  check (`docs/TIME.md`) exist for this; the first forty is where they earn
  their place.
- **Forty people who know each other are re-identifiable from their facts.**
  `docs/LEARNING.md` already says so for a city of forty. No photo, no name
  and no free text on the server are the mitigation; the founder should say
  plainly to the first forty that they may know each other.
- **Every funnel number is a guess.** So a pivot rule, decided now rather
  than under pressure: after eight weeks of the playbook, fewer than twenty
  women counted in the metro, or fewer than five men who arrived through a
  group link (`sidesByVia.man.group.arrived` — a man who came through
  someone's eleven is already talking to her and does not count,
  `docs/REDTEAM.md`), means change the channel first (mosque young-adult
  circles), the city second (Columbus).

## Deferred, with triggers

- **An age band on the door.** A real measurement gap: the founder cannot
  tell whether the wedge held. `docs/LEARNING.md` forbids age only as a
  *learned* feature. But it is one more quasi-identifier in a key that already
  holds five, and it reads `null` under five people anyway. *Trigger: the
  metro passes twenty per side and the founder cannot tell from the room.*
  Since `docs/LIQUIDITY.md`, age is asked at the door and goes into the kept
  map, and `/pool` reads it back as a floored histogram per side — so the
  founder *can* tell whether the wedge held, from the maps. What stays
  deferred, with this trigger, is the band as a segment of the door's key.
- **A prior-marriage question.** *Trigger: the second offer.*
- **Any wedge word in public copy.** Never. The channel is the wedge; the
  brand is not.
