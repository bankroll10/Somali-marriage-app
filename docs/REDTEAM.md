# Niyyah — the red team: twelve convictions attacked, and the three that could end the company

> Assume intelligent founders can be confidently wrong. This file is the case
> *against* every major belief this company rests on, written as its
> strongest honest adversary would write it. It does not balance; the other
> twenty documents in this directory are the balance. Where an earlier
> document's framing is itself the problem, that document is named.

## Rules of the attack

1. **Evidence is one of four things.** A census figure; a readout field that
   exists and has never held a real number; a comment in the code recording
   two testers or three timed calls; or the word *none*. A projection, a
   cultural intuition, or a sentence in `docs/STRATEGY.md` is not evidence.
   Writing every CURRENT EVIDENCE field to that standard is most of the
   attack, because it comes out almost entirely *none*. `docs/GAPS.md` says
   so in its own preamble: "Real member evidence is zero."
2. **The company, not the product.** A conviction whose failure degrades the
   product but leaves a company standing is a product risk and is ranked
   below one whose failure leaves no company. Several of the twelve fail
   survivably; three do not.
3. **The cheapest valid test is the one that can run first.** A test blocked
   by scale, by a marketplace that does not exist, or by the company's own
   promise is written down as blocked, with the cost of not knowing.
4. **The oldest finding first.** Nine documents were written before the
   first group link was posted. Every test below waits on that post. The
   cheapest valid test of all twelve is the same act: post the link. A
   red team that did not say so would be protecting the founder.

---

## The twelve

### 1 · Somali singles want a Somali-specific product

- **CASE FOR.** The pan-Muslim apps treat "Somali" as a filter. The things
  that actually break Somali marriages — qabiil, money home, a second wife,
  where you would live, the role of the two families — are not questions
  any of them ask (`src/data/beforeYes.ts`). Aunties exist as an institution
  precisely because generic tools fail this community. The first line of the
  hero is "Built for the Somali diaspora" and the product's only durable
  asset, the eleven, is Somali to the bone.
- **CASE AGAINST.** Specificity is a *distribution* decision wearing the
  clothes of a value. The value is the eleven and the read; both could be a
  feature inside a pan-Muslim product tomorrow, and a pan-Muslim product has
  the one thing this one cannot manufacture — people in the room. The
  specificity is what makes the room small (assumption 2), and the company's
  own endgame contradicts it: `docs/STRATEGY.md` plans expansion to the
  wider Muslim diaspora, which for a brand whose first sentence names one
  people is a rebrand, not a step. Worse, "Somali-specific" may be the
  *founder's* preference projected onto the member. A woman who has tried
  Muzz did not leave because it was insufficiently Somali; she left because
  nobody serious was there or she could not trust who was. Both are density
  and trust problems. Neither is solved by narrowing.
- **CURRENT EVIDENCE.** None. Census concentrations (`docs/WEDGE.md`). Two
  testers who stopped partway through a longer intake
  (`src/data/intake.ts`). Not one Somali single has said, in any recorded
  form, that they want a Somali-specific product.
- **MISSING EVIDENCE.** Why the people who tried the alternatives stopped —
  in their words, sorted into three bins: *nobody there*, *could not trust who
  was there*, *did not understand our situation*. Only the third is a vote
  for specificity.
- **CONSEQUENCE IF WRONG.** The addressable market is a tenth of what a
  pan-Muslim product reaches, the brand cannot expand without contradicting
  its first sentence, and every hour spent on Somali-specific content was
  spent on a filter.
- **CHEAPEST VALID TEST.** Ten conversations, one question, three bins:
  "What did you try before this, and why did it stop working — nobody there,
  you couldn't trust who was there, or it didn't understand your situation?"
  Recorded in `docs/FEEDBACK.md`. Fewer than four in ten in the third bin →
  specificity is a cost the product is paying for the founder's comfort.
  Readable: the week the conversations happen. Supporting signal, weeks
  1–8: the hook's `finding` share ("Finding anyone serious at all") — a
  density complaint, not a specificity one.

### 2 · The addressable market is large enough

- **CASE FOR.** The Twin Cities hold the largest Somali population outside
  Africa; Columbus, Toronto, London, Stockholm follow. `COHORT_TARGET` is
  forty a side (`netlify/functions/cohort.ts`). A company does not need a
  large market to open one pool; it needs one dense one, and MSP is it.
- **CASE AGAINST.** Eighty-four thousand is a whole population — children,
  the married, the elderly. The arithmetic below, with every fraction marked
  as the assumption it is, lands at roughly two thousand people per side in
  the metro who are of age, unmarried and looking this year, and perhaps
  seven hundred a side reachable through the networks the wedge names. Forty
  a side is then six percent of the reachable pool — steep for a product
  nobody has heard of, and that is just to *open*. Scale the same fractions
  to the diaspora and the ceiling is a matchmaking practice with software:
  tens of thousands of marriages a year in the whole diaspora, of which any
  product touches a few percent, at a fee paid once. That is a good business.
  It is not a large company, and the only exit from the ceiling — go
  pan-Muslim — is the failure of assumption 1.
- **CURRENT EVIDENCE.** Census population figures, `docs/WEDGE.md`. Nothing
  about conversion at any stage.
- **MISSING EVIDENCE.** Every fraction in the table below. The first one
  the product can supply itself is arrivals against the reachable pool.
- **CONSEQUENCE IF WRONG.** Not fatal to the product; fatal to the company
  *as* a company. Founder time priced as a startup's is misallocated against
  a practice's revenue for years before the numbers say so.
- **CHEAPEST VALID TEST.** The arithmetic, below, done now so it cannot be
  un-known. Then, from week one of posting: cumulative `arrivedByDay` against
  the reachable pool. If arrivals plateau under a tenth of the reachable
  estimate while the link is still being posted, the pool is the constraint
  and no channel change fixes it. Readable weekly.

#### The market arithmetic

Every fraction is an assumption. Replace each with a number the day one
exists; the table is here so the shape of the ceiling is visible before then.

| Step | Minneapolis–St. Paul | Fraction | Basis |
|---|---|---|---|
| Somali population | ~84,000 | — | Census, `docs/WEDGE.md` |
| Aged 22–36 | ~21,000 | 25% | *Assumed.* A young population; the band the product targets |
| Unmarried | ~11,500 | 55% | *Assumed* |
| Looking this year | ~4,600 | 40% | *Assumed* |
| Per side | ~2,300 | 50 / 50 | *Assumed;* the sides are not balanced in practice |
| Reachable through alumni and professional networks | ~700 a side | 30% | *Assumed* — the wedge's own channel |
| `COHORT_TARGET` as a share of reachable | **~6%** a side | 40 / 700 | Just to open the first pool |

The same fractions over a diaspora of roughly two million (commonly cited;
unsourced here) give about 110,000 people looking in any year and, at a
plausible rate of forming marriages, tens of thousands of Somali diaspora
marriages a year in total. A product that is part of five percent of them and
is paid once per marriage earns, at a few hundred to a couple of thousand a
marriage, somewhere between half a million and a few million a year — at
*full* diaspora reach, after years of city-by-city opening. That is the
ceiling under assumption 1. It is worth knowing before the next pass, not
after the fifth city.

### 3 · Users will complete detailed profiles

- **CASE FOR.** A serious person answers sixteen questions about herself;
  the depth is the value; the map is what the eleven and the read are built
  on. `docs/EXPERIMENTS.md` A1 has a decision rule already written.
- **CASE AGAINST.** Sixteen questions before anything is given. The product
  argues both sides of this against itself: `src/data/intake.ts` records a
  cut from twenty-three on the strength of two people who stopped;
  `src/components/Welcome.tsx` calls the intake "a toll gate, not an
  onboarding." Then `docs/NORTHSTAR.md` moved the count *up*, thirteen to
  sixteen, on reasoning rather than a reading. The dating apps that get
  completion pay for it with photos and a feed; this product asks for
  reflection and pays with a paragraph.
- **CURRENT EVIDENCE.** Two testers. `facts.began` exists so a completion
  rate can be computed; it has never been computed.
- **MISSING EVIDENCE.** `rungs.mapped / facts.began.map`, and the same for
  the read and the eleven.
- **CONSEQUENCE IF WRONG.** Survivable. The map shrinks to one chapter; the
  learning corpus (`docs/LEARNING.md`) has fewer facts per person. The
  product continues.
- **CHEAPEST VALID TEST.** A1, as written: twenty arrivals; intake
  completion under half → one chapter. Readable within days of the first
  post. Nothing to build.

### 4 · Compatibility systems improve outcomes

- **CASE FOR.** The eleven are the known failure points of Somali marriages;
  agreeing or differing on money home or a second wife before the families
  meet is obviously better than after. `marriedBy.through` will one day show
  whether the people who had the conversations married more.
- **CASE AGAINST.** No matching system anywhere has shown that it improves
  marriage outcomes. The review the field still cites (Finkel, Eastwick,
  Karney, Reis and Sprecher, 2012, *Psychological Science in the Public
  Interest*) found no compelling evidence that any algorithm predicts
  relationship success better than chance once two people meet, and the
  later machine-learning attempt by Joel, Eastwick and Finkel (2017) could
  not predict attraction from self-reports at all. Somali families have
  matched for centuries on family, reputation and religion, not alignment
  scores. So the eleven may carry *conversation* value — a good thing to
  talk about — and zero *matching* value, and the two are not the same
  product. `docs/LEARNING.md`'s moat assumes the second: revising `WEIGHTS`
  and `consequence` from outcomes presumes the outcomes are predictable
  from the answers, which is exactly what the literature says they are not.
- **CURRENT EVIDENCE.** None. `marriedBy.through` needs marriages; years.
- **MISSING EVIDENCE.** Whether courtships end on the eleven's topics at all.
- **CONSEQUENCE IF WRONG.** The learning moat learns nothing predictive and
  the "pairing" data is noise; "Deciding together" is priced for an outcome
  it does not change. The conversation value survives. Survivable.
- **CHEAPEST VALID TEST.** The proxy that needs no marriage: `ended.reason`
  and `ended.which`. If most endings name things outside the eleven —
  timing, distance, he stopped, she did, rather not say — the eleven is not
  what breaks courtships and the matching claim is dead before the first
  wedding. Readable after twenty endings; months, not years.

### 5 · Verification creates enough value to justify its friction

- **CASE FOR.** A father or brother vouching is culturally native,
  unfakeable at scale, and the only verification a product with no photos
  and no accounts can honestly claim. Women's trust is the liquidity.
- **CASE AGAINST.** The vouch verifies the side that does not need verifying.
  Women are asked to tell a male relative that they are looking — the
  heaviest ask in the product — while men, the side every safety concern in
  `docs/TIME.md` and `docs/HARD.md` is about, have no identity at all: a man
  who answers the eleven leaves no account to vouch for, remove or block
  (`docs/HARD.md` row 14). So the "only verification we claim" is expensive
  where it is pointless and absent where it matters, and the trust claim
  built on it is a claim about women's families.
- **CURRENT EVIDENCE.** None. `GET /vouch` returns `asked` and `given`
  (`docs/BETS.md` B1); both are zero.
- **MISSING EVIDENCE.** Asks per kept map; gives per ask; whether vouched
  women reach later rungs more often.
- **CONSEQUENCE IF WRONG.** Survivable — the product also promises no
  photos, no names and no server-side free text, which do more of the
  trust work than the vouch does. What dies is the sentence "the only
  verification we claim."
- **CHEAPEST VALID TEST.** A2 as written, on the first ten kept maps: asks
  under one in four → the ask is the problem. Readable at ten kept maps.
  Nothing to build.

### 6 · Users prefer quality over quantity

- **CASE FOR.** Every conversation about dating apps is about fatigue. "We
  never pretend a city is full" is a sentence nobody else can say. A
  marriage-minded person wants five serious people, not five hundred.
- **CASE AGAINST.** That is stated preference. Revealed preference across
  every marketplace ever built is *where the people are*, and a person who
  has said she wants quality still opens the app with more people in it. The
  honest door is honest about emptiness, and emptiness is a reason to leave:
  a woman who sees seven men and a promise of forty has been told to come
  back in six months. The product withholds *all* quantity until 40/40 —
  months of exactly zero — and calls the withholding a principle.
- **CURRENT EVIDENCE.** None. `hesitated` has a closed word for the door
  being empty; nobody has tapped it.
- **MISSING EVIDENCE.** How many who reach the door do not walk through it,
  and how many of those say it was because of the number.
- **CONSEQUENCE IF WRONG.** The door's honesty empties the room before it
  fills. Serious, because the door is the machine; survivable, because the
  fix is a different sentence on the door, not a different product.
- **CHEAPEST VALID TEST.** `hesitated` by reason among people who reached
  `mapped` and did not reach `counted`; the empty-door reason above a third
  of hesitations → honesty is losing the room, and the door's copy changes.
  Readable at twenty mapped.

### 7 · Users will pay

- **CASE FOR.** Somali families pay matchmakers, at the nikah, out of the
  celebration. `src/data/plus.ts` says so; `docs/STRATEGY.md` calls it
  culturally native. Nobody is asked to pay for hope; they pay for the
  outcome, the way they always have.
- **CASE AGAINST.** Families pay *a person who did the work*, and the payer
  never used the app. The two things sold — "Deciding together" and a human
  matchmaker — are sold at the exact moment a couple is about to involve
  families who do this for free, and the product's own thesis says most
  courtships happen off-platform, so the nikah payment has no trigger for
  most marriages the product touched. Then the promise: everyone here before
  the public launch keeps every paid feature free for a year after it
  (`src/data/plus.ts`). The company has arranged not to know whether anyone
  will pay until at least twelve months after its first pool opens, and
  `docs/EXPERIMENTS.md` A5 records this as "Defer" — the polite word for a
  decision not to find out. "Culturally attested" in `docs/GAPS.md` is
  attested by nobody in this repository.
- **CURRENT EVIDENCE.** None. No price exists anywhere in the code.
- **MISSING EVIDENCE.** A real checkout at a real price — which the promise
  forbids for a year. Until then: who paid the matchmaker at the last
  wedding in a member's family, how much, and who decided.
- **CONSEQUENCE IF WRONG.** No revenue, discovered a year after launch, with
  a year of founder time spent on the assumption. Fatal to the company; the
  product would survive as a free tool.
- **CHEAPEST VALID TEST.** There is no valid test that keeps the promise;
  that is itself the finding, and it is written down here rather than around.
  What can be known: in the ten conversations, "at the last wedding in your
  family, was anyone paid for bringing them together — who paid, how much,
  and when?" Fewer than three in ten can name a payment → GAPS's "LIKELY
  (culturally attested)" is demoted to ASSUMED, this month. When endings
  exist, `ending.who.family` — if families are still the ones bringing
  people together, the role being sold is at least the right role. And one
  discipline that costs nothing: the price is chosen and written in
  `docs/STRATEGY.md` *before* the first pool opens, so that when it is
  finally tested it is a prediction and not a reaction.

### 8 · Our monetization is aligned with successful outcomes

- **CASE FOR.** Revenue strictly increasing in exits. No subscription, no
  boost, nothing that earns more on a worse night. Every competitor's
  incentive inverted — `docs/STRATEGY.md` §5.
- **CASE AGAINST.** A company paid only at the rarest event acquires a pull
  toward *claiming* the event: nudging couples toward "deciding" sooner,
  counting marriages generously, attributing off-platform weddings to the
  product. That pressure is the same one the product decries in aunties,
  arriving through the cash flow instead of the phone. "Productise the most
  trusted role in the community at software margins" is not true of a human
  matchmaker: concierge matchmaking has a matchmaker's margins, and the only
  way to make them software's is to have the software do the matching —
  which `docs/LEARNING.md` forbids ("never a model of a person"). And the
  one payment that would be truly aligned — the first year, after the
  wedding — is the one nobody is asked to pay for.
- **CURRENT EVIDENCE.** None. Nothing is sold.
- **MISSING EVIDENCE.** Whether any screen, once a price exists, leans on
  the reader toward the paid stage.
- **CONSEQUENCE IF WRONG.** Slow. The copy tilts a sentence at a time; the
  advice stops being trustworthy in a way no readout shows; the one property
  the strategy calls "the only arrangement under which the advice can be
  trusted" is gone before anyone notices.
- **CHEAPEST VALID TEST.** An incentive audit the day a price exists: every
  sentence on every screen that mentions the paid stage, read against
  STRATEGY's own rule — *does it earn more if she stays single longer, opens
  the app more, or is having a worse night?* Recorded in `docs/PROCESS.md`
  as a standing release check. And when the data exists: courtships that
  bought "Deciding together" and then `ended` from *deciding*, against those
  that did not buy — if the paid ones end more, the product sold a nudge.

### 9 · Family-oriented functionality matters

- **CASE FOR.** Marriage in this community is between families. The wali,
  hooyo, the two families meeting — five scripts exist for it. A product
  that leaves the family out is a dating app with a different font.
- **CASE AGAINST.** The product's own hook lists "the pressure from family"
  as one of the five hardest parts (`src/data/hook.ts`), and its hero
  promises that "no one else ever sees it — not your family." The diaspora
  user may want this product *because* it is private from family: a place
  to think before the aunties are involved. Both can be true — a private map
  and a family-involved courtship — but the product has never asked which
  its member wanted, and five scripts exist because the founder believes in
  family, not because a member asked for one.
- **CURRENT EVIDENCE.** The hook's `family` option and five scripts. A4 is
  instrumented (`facts.through['family:<id>']`); no readings.
- **MISSING EVIDENCE.** Whether a family script is ever confirmed as said.
- **CONSEQUENCE IF WRONG.** Survivable. Family becomes an option rather than
  a path; the vouch is where family effort goes, or nowhere. Privacy-first
  survives untouched.
- **CHEAPEST VALID TEST.** A4 as written: no family script confirmed as said
  by twenty people who built maps → aspiration, not product. Plus the hook:
  if `family` is the largest hardest-part, family is the *problem* the
  member brought, and the scripts should be for surviving it, not staging it.

### 10 · AI creates meaningful value

- **CASE FOR.** A guide that answers at 1am in the member's own situation,
  at zero marginal cost, with the map in its context. A3 has a rule.
- **CASE AGAINST.** It is the only live cost in the product, its quality was
  judged on three timed calls by the engineer who wrote it
  (`netlify/functions/guide.ts`), it falls back silently to a local voice so
  its absence is invisible, and its best use case — the 1am spiral — is the
  one the company has ruled it will never sell. A model giving fiqh-adjacent
  marriage advice to a Somali Muslim woman with no human review is a
  liability surface with no upside the deterministic instruments do not
  already carry. `docs/DURABLE.md` already calls the model a supplier and
  guidance the durable part. The red team goes one further: the AI in this product is
  a feature the founder likes.
- **CURRENT EVIDENCE.** Three calls.
- **MISSING EVIDENCE.** `ending.used.guide` — whether anyone who reaches an
  ending names the guide. Nothing faster exists, by design: the charter keeps
  the guide's follow-ups on the device and out of `facts.through`
  (`src/lib/facts.ts`, `docs/LEARNING.md`).
- **CONSEQUENCE IF WRONG.** Cost and liability with no return — and
  survivable in an afternoon: unset the key and the local voice answers.
- **CHEAPEST VALID TEST.** None faster than A3, and that is the finding: the
  only live cost is the one feature whose value the charter — rightly —
  makes unmeasurable before an ending. So the honest move is not a test but
  a default: leave the key unset until twenty endings exist, and let A3 argue
  for turning the model *on*, instead of running an unmeasurable cost and
  waiting for A3 to argue it off. The local voice is already what every
  member gets when the key is absent (`netlify/functions/guide.ts`).
- **OUTCOME — 2026-09-10.** Put to the founder and **declined**: the guide
  stays on. The attack above stands as written; only its status changed. What
  changed with it is the exposure — the hourly cap bounded an hour and not a
  month, so `GUIDE_DAILY_CAP` now bounds one (`docs/ROADMAP.md`). A3 remains
  the kill rule, unaltered.

### 11 · Our initial geography and target user are correct

- **CASE FOR.** MSP is the largest concentration in the diaspora, with a
  student association of five hundred and a professional network with
  chapters; Columbus second. Women 24–34 arrive first and men follow. The
  eight-week pivot rule is already written (`docs/WEDGE.md`).
- **CASE AGAINST.** MSP is where the *alternatives are strongest* — the
  densest family networks, mosques and aunties in the diaspora. The unmet
  need is in the thin places, Seattle and Nashville and Stockholm and a
  small English town, where there is nobody — and density is impossible
  there. So the wedge picks the one city where the problem it solves is
  smallest. On the user: women 24–34 are the most-served segment the
  community has; `docs/WEDGE.md` itself names the divorced and remarrying in
  their thirties and forties as "the highest unmet pain in the community,
  served by nobody" — and defers them until after the first marriages.
- **CURRENT EVIDENCE.** Census and the chapter map. Zero members.
- **MISSING EVIDENCE.** Where the people who arrive actually are, and how
  far they said they would go.
- **CONSEQUENCE IF WRONG.** Eight weeks, by the pivot rule. Survivable
  because the rule exists; expensive if the rule is not obeyed.
- **CHEAPEST VALID TEST.** WEDGE's eight-week rule, tightened this pass to
  five men *via the group link*. And, from week one, the door's `across` —
  the people in her country who said they would travel — against the metro's
  own count: if the country pool fills faster than the metro, the need is in
  the thin places and the unit is the country, not the city.

### 12 · Our distribution strategy can create sufficient marketplace density

- **CASE FOR.** The instruments travel: a friend sends a friend the exact
  question that worked. The door is a collective goal with a real number.
  Mixed-gender alumni and professional networks bring men in without paying
  for them. Word of mouth is the only channel nobody can take away
  (`docs/CONTROL.md`).
- **CASE AGAINST.** The model has forbidden every lever every marketplace in
  history has used to reach density — paid acquisition, referral bonuses,
  boosting, a feed — and replaced them with forwarding. Forwarding something
  about marriage says *I am looking*, and the product's own privacy thesis
  is that nothing which says "I am looking" gets forwarded in this
  community. The strategy's strongest belief is the case against its own
  distribution. The network channel is one connector's willingness to post
  a link in a group, once, and it has not been asked. And until this pass
  the readout could not tell whether the one channel that produces supply
  produced anything: a man who arrived through a woman's eleven is already
  talking to her and was counted as supply alongside men the group brought.
- **CURRENT EVIDENCE.** `vias` and `sides` exist; `sidesByVia` exists since
  this pass. All zero. No link has been posted.
- **MISSING EVIDENCE.** Whether anyone will post; whether anyone arrives
  through what is posted; whether anything travels one-to-one at all.
- **CONSEQUENCE IF WRONG.** No marketplace, ever. `docs/GAPS.md` says it
  plainly: "every instrument is a hobby." Fatal to the company; the product
  survives as a well-made tool three hundred people use.
- **CHEAPEST VALID TEST.** Below, as the first of the three.

---

## The three that could end the company

The twelve sort into two piles. If 3, 4, 5, 6, 9, 10 or 11 fails, the
product changes shape — a shorter intake, the eleven as conversation rather
than matching, family as an option, the local voice — and continues; each
already has an instrument and a decision rule. Those are product risks. If
12, 2-with-1 or 7-with-8 fails, there is no company. In order of when the
answer can arrive:

### First · Distribution cannot create density (12)

`docs/GAPS.md` ranks its version of this first too, but as mechanics — *do
men follow women?* The red team's version is structural. The company has
forbidden the levers; the loop it relies on contradicts its own privacy
thesis; and the instrument that would show whether the one supply channel
works did not exist until today.

**Kill test, this week (by 2026-09-15), before any link is posted.** Name ten
people who could post the door link in a room of the kind `docs/WEDGE.md`
describes. Ask each whether they would, this month. Record yes, no or a
condition in `docs/FEEDBACK.md`. *Fewer than three unconditional yeses* →
the network channel does not exist and the pivot happens now, not at week
eight: mosque young-adult circles first, or a paid-free channel the strategy
has not yet imagined. Cost: ten messages.

**Kill test, two weeks after the first post.** `sidesByVia.man.group.arrived`
reads `null`. The floor is five, so a null cell two weeks after a posted link
*is* the reading: the channel produced fewer than five men. Change the room.

**Kill test, eight weeks.** WEDGE's pivot rule, as tightened this pass: fewer
than twenty women counted in the metro, or fewer than five men who arrived
through a group link, changes the channel first and the city second.

**The shame test, alongside.** After eight weeks, the one-to-one vias
together — `words`, `eleven`, `couple`, `door` — under a tenth of arrivals →
nothing about marriage travels one-to-one here, only rooms work, and the
rule in `docs/STRATEGY.md` — "the words travel, the product is the
footnote" — is demoted to ASSUMED.

**What validates it.** Five or more men through the group link by week two;
twenty or more `counted` men through it by week eight while women's
`counted` per hundred `arrived` does not fall. Then the channel is real and
the next weakest link is the vouch.

### Second · The market is small, and specificity keeps it small (2 with 1)

Linked because the escape from a small market — serve the wider Muslim
diaspora — is the failure of the Somali-specific thesis, and the hero's first
sentence forbids it. The arithmetic above is the finding; nothing about it
needs a member to arrive. What needs members is knowing whether the people
who come are here for the specificity or for the room.

**Kill test, this month.** Ten conversations, the three-bin question from
assumption 1. *Six or more in ten say "nobody there"* → the need is density,
which a bigger room serves better; specificity is a cost the company is
paying for the founder's comfort, and the expansion question moves from year
three to now.

**Kill test, weeks 1–8.** Cumulative `arrivedByDay` against the reachable
estimate (~700 a side). Arrivals plateau under seventy while the link is
still being posted → the reachable pool is the ceiling; the wedge is not the
constraint, the market is.

**Kill test, weeks 1–8.** The door's `across` against the metro's own count.
If a large share of arrivals say they would travel for the right person, the
market is national, not metropolitan, and the metro door is the wrong unit —
which `docs/SCALE.md` already allows for: the pool is the unit, and country
pools exist.

**What validates it.** Six or more in ten in the third bin — *it did not
understand our situation* — and the metro door reaches 40/40 within six
months of the first post. Then the specificity is what they came for and the
ceiling is a price worth paying.

### Third · Nobody pays, and the company has arranged not to find out (7 with 8)

The latest of the three to resolve and the only one where the obstacle to
knowing is the company's own promise. The promise is right — a fake price is
the one lie this product cannot tell — so the cost of keeping it should be
written down rather than around: **the company will not know whether anyone
pays until at least a year after the first pool opens.** Every plan in this
directory that assumes revenue is a plan on that timeline.

**What can be known now, this month.** In the ten conversations: "at the last
wedding in your family, was anyone paid for bringing the two of them
together — who paid, how much, and when?" Amounts, never names, into
`docs/FEEDBACK.md`. *Fewer than three in ten can name a payment* → GAPS's
"LIKELY (culturally attested)" becomes ASSUMED, and "Deciding together" is
re-examined as the first product rather than the matchmaker.

**What can be decided now.** The price, in `docs/STRATEGY.md`, before the
first pool opens — a prediction with a date, so the eventual checkout tests
a belief rather than reacting to a room.

**What can be checked when endings exist.** `ending.who.family`. If families
are still bringing people together, the role being sold is the right role,
whatever its price turns out to be.

**The alignment check, the day a price exists.** Every sentence about the
paid stage, on every screen, against STRATEGY's own rule. Recorded as a
release check in `docs/PROCESS.md`, because the tilt this attack predicts is
a sentence at a time and no readout will show it.

**What validates it.** Seven or more in ten name a payment at a wedding in
their family, with an amount; and, a year after the first pool, a real
checkout completes at the written price more than once.

---

## Where the earlier documents are wrong, or soft

- **`docs/GAPS.md` ranks by mechanics.** Its first gap is "men do not follow
  women" — a question about a funnel. The company-level version is that the
  distribution model forbids every lever and contradicts its own privacy
  thesis. GAPS's ranking is right about the *product*; this file's is about
  the company, and the two should be read together.
- **`docs/WEDGE.md` counted the wrong men.** "The men's count on the door is
  the whole test" counted a man who arrived through a woman's eleven — already
  talking to her — as supply. Fixed this pass: the test reads
  `sidesByVia.man.group`, and the pivot rule names it.
- **`docs/MACHINE.md`'s A6 rule read the side, not the cell.** Same defect,
  same fix.
- **`docs/EXPERIMENTS.md` A5 says "Defer."** It is a decision not to know
  the company's revenue answer for a year after launch, taken to keep a
  promise. The promise is right. The word should say what it costs.
- **`docs/GAPS.md` classes willingness to pay as LIKELY, "culturally
  attested."** Attested by nobody in this repository. Demotion to ASSUMED is
  proposed above, on a number, this month.
- **`docs/STRATEGY.md` promises "software margins" on a human matchmaker.**
  A matchmaker has a matchmaker's margins. The sentence should either name
  what the software does that the matchmaker did, or drop the margins.
- **`src/components/Welcome.tsx` promises "not your family" above a
  family-oriented product.** Both can hold — a private map, a family-involved
  courtship — but the tension is unexamined and the hook's `family` option
  names family as a *problem*. The member has never been asked which she
  wanted.
- **Twenty-one documents, zero members.** The strongest attack on the company is
  the one this file could not have made without becoming an example of it:
  nine passes of analysis have been written since the wedge was chosen and
  the first link has not been posted. Every test above waits on one act. The
  next pass should be a post, not a document.

## Revisions

- 2026-09-08 — First version. Twelve convictions, three named as fatal:
  distribution, market-with-specificity, payment. `sidesByVia` built as the
  one instrument the first kill test needed. Ten conversations named as the
  only credible source for three of the six fields on seven of the twelve.
