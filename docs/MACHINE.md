# Niyyah — the machine, and its weakest link

> A consumer marketplace is one machine with thirteen stages, and it runs at the
> speed of its slowest one. This file maps the thirteen as *this* product builds
> them — it has no app store, no messaging, no feed — gives every transition its
> metric, its friction and its failure, and then does the thing the map is for:
> names the one link that is broken rather than merely unmeasured, and lays out
> the plan for it. The honest state is unchanged from `docs/GAPS.md`: zero
> members, three test rows, all the founder's. Every rate below is therefore a
> readout field waiting for its first hundred records, not a number.

## The rule this file exists to enforce

Work on the weakest link, or on nothing. A feature downstream of a transition
that converts at zero has no measurable value, whatever it would be worth in a
working machine — and a feature upstream of it only pours more people into the
same hole. `docs/PROCESS.md`'s roadmap table already ranks by the same three
axes; this file supplies the argument for why the top row is the top row.

## The machine as built

The product's own vocabulary for the funnel is the ladder
(`src/lib/rungs.ts`) and the door (`netlify/functions/cohort.ts`). Read against
the thirteen stages:

| Stage | What it is here | Rung or readout |
|---|---|---|
| **Attention** | Words that travel — a script, a read, the eleven, forwarded by one person to one person; and the group posts in `docs/WEDGE.md`'s playbook | none by design |
| **Store / landing page** | `Welcome.tsx` for someone who typed the address; for everyone else, the instrument the link lands on (`src/lib/entry.ts`, `ENTRY_SCREEN` in `src/hooks/useNiyyah.ts`) | none by design |
| **Install** | There is no install. The equivalent is the first `/progress` report under a fresh install code, which happens on first render with "Count me" on — `arrived` | `rungs.arrived`, `arrivedByDay`, `vias` |
| **Onboarding** | Identity → Situation → the hook. Three taps: who you are, what is happening, what is hardest | `situated`; the door's `hooks` |
| **Profile** | The map — thirteen questions, a reflection, kept under a code with no name on it | `mapped`; `facts.began.map`; `facts.grounds` |
| **Match liquidity** | The door: forty women and forty men in one pool who have kept a map and can be reached (`COHORT_TARGET`) | `counted`; `countries[c].scenes[s].women / men`; `across`; `facts.hesitated` |
| **Match quality** | `alignment()`, one introduction at a time, the ledger deciding who meets whom — `docs/PRODUCT.md` §7. **Designed, not built**; today's only caller is the sample screen over fourteen invented people | none — designed |
| **Mutual interest** | Two yeses on one introduction. **Designed, not built** | none — designed (`docs/LEARNING.md` row 1) |
| **Conversation** | Off-platform, on purpose. The product's part is the instruments: the read, the eleven, the eleven sent to him, the words | `read`, `eleven`, `asked-him`, `he-answered`, `followed-through`; `facts.through`; the couple tally |
| **Serious progression** | Talking → deciding; the family scripts; the vouch | `deciding`, `vouched`; `facts.ended`; `through['family:*']` |
| **Monetization** | "Deciding together", paid at the nikah — `docs/EXPERIMENTS.md` A5. No price exists in the code | none — blocked by the free-for-a-year promise |
| **Success** | `married`, and the ending: who, what mattered, what here was real | `married`; `facts.ending`; `marriedBy` |
| **Referral** | The one share only she can make — `via: 'married'` from the ending — and every forwarded word | `vias.married`, `vias.words`, `vias.eleven`, `vias.couple` |

The pipeline metric, unchanged: `followed-through` per hundred `arrived`.

## The twelve transitions

Each metric below is a field that exists in `netlify/functions/progress.ts` or
`cohort.ts` today, or is marked *designed* or *no instrument*. Where a
transition is measured, the failure state is a readout the founder will
actually see; where it is not, the failure is invisible and that is said.

### 1 · Attention → Landing page

- **Metric.** *No instrument, by design.* Opens and impressions are attention
  traces, refused in `docs/LEARNING.md`. The nearest honest number is one
  stage down: arrivals by source, `vias`.
- **Friction.** A word about marriage has to be worth forwarding, by a person
  to a person, in a community where "I am looking" is the thing nobody says.
  The group post depends on one of ten connectors choosing to post it.
- **Failure state.** Nothing is forwarded. `vias.words`, `vias.eleven`,
  `vias.couple` and `vias.group` stay at zero while `vias.unsaid` carries
  whoever typed the address. `docs/GAPS.md` gap #2.
- **Dependencies.** `src/lib/words.ts`; `ScriptCard`'s send; `docs/WEDGE.md`'s
  ten connectors; the rule that no link ever carries who sent it.
- **Mechanism.** `instrumentLink(kind, via)` in `src/lib/links.ts`; the
  door's share; the ending's share.
- **Improvement.** None to build. The playbook *is* the experiment, and the
  door's weekly count posted into the same groups is the only public artifact
  the product has. Read `vias` at the monthly hour.

### 2 · Landing page → Install

- **Metric.** `rungs.arrived`, split by `vias` — how many people who opened a
  link stayed long enough for the app to render once with "Count me" on. Not
  a bounce rate: a person who opens and closes before render is, correctly,
  nobody.
- **Friction.** The screen the link lands on has to be the one the person came
  for. A `?read` link lands on "who are you reading?"; a `?eleven` link on the
  eleven; there is no link that lands on the door.
- **Failure state.** Invisible: a person who lands on the wrong screen and
  leaves is indistinguishable from one who never opened it. The readout sees
  `arrived` either way, or nothing either way.
- **Dependencies.** `src/lib/entry.ts` (`InstrumentKind`), `ENTRY_SCREEN`,
  `src/main.tsx`'s `resolveEntry`.
- **Mechanism.** The link kind picks the screen; `via` is remembered once.
- **Improvement.** A link kind for the person who is *looking*, not talking.
  This is M1 below.

### 3 · Install → Onboarding

- **Metric.** `situated` per hundred `arrived`.
- **Friction.** Two questions before anything is given — who you are and what
  is happening — and the second one is the first hard one.
- **Failure state.** `arrived` without `situated`: people who saw the front
  door and did not say what was happening.
- **Dependencies.** `Identity.tsx`, `Situation.tsx`, `chooseSituation` in
  `src/hooks/useNiyyah.ts`.
- **Mechanism.** Situation routes by stage: preparing → the hook and the map;
  talking → the read; deciding → the eleven; married → the guide.
- **Improvement.** None until the number exists. The routing already sends
  each stage to the thing built for it.

### 4 · Onboarding → Profile

- **Metric.** `rungs.mapped / facts.began.map` — the map's completion rate,
  `docs/EXPERIMENTS.md` A1. Whole-population, readable at ten people.
- **Friction.** Thirteen questions about yourself before you receive anything.
  The product holds two opposite opinions about this in its own comments
  (`src/data/intake.ts`, `Welcome.tsx`); A1 is what settles it.
- **Failure state.** `began.map` high, `mapped` low — the toll gate.
- **Dependencies.** `Hook.tsx` → `Intake.tsx`; `buildReflection`.
- **Mechanism.** The hook's instant insight is the thirty-second reward meant
  to carry a person into the intake.
- **Improvement.** A1's decision rule, already written: completion under 50%
  cuts the map to one chapter. Nothing to build until twenty arrivals.

### 5 · Profile → Match liquidity — **the weakest link**

- **Metric.** `counted` per hundred `mapped`; `facts.hesitated` by reason for
  the people who stopped at the door; and the door itself —
  `countries[c].scenes[s].women` against `.men`, per pool. The men's side of
  the first is **unreadable today**: the ladder has no gender.
- **Friction.** For her: keep the map on a server, leave a way to be reached,
  say "I am looking" to a form. For him: **no link starts him here at all.**
  Every mechanism that exists for finding a man sends him the read (see
  below).
- **Failure state.** The door reads forty women and seven men for months —
  `docs/WEDGE.md`'s named risk, `docs/GAPS.md`'s gap #1 — and the readout
  cannot say whether men opened a link and bounced or never opened one.
- **Dependencies.** A completed map (`src/lib/keep.ts` `keepMap()` returns
  null without one); `netlify/functions/cohort.ts`; the waitlist form;
  the only-through-her acquisition of men.
- **Mechanism.** `Cohort.tsx` — the honest count, "Count me in", the "Not now"
  tap; the counted woman's ask to send one man the read.
- **Improvement.** M0–M3 below.

### 6 · Match liquidity → Match quality

- **Metric.** Pools open: a `scenes[s]` cell at forty on both sides.
  Introductions made — *designed*, the Tier 4 introductions record.
- **Friction.** Forty and forty in *one* pool, which no city reaches on its
  own without the country's travellers (`across`, `docs/SCALE.md`); then a
  founder's judgement to open.
- **Failure state.** A full door and nothing opens — a founder-dependency
  `docs/TIME.md` already audits.
- **Dependencies.** Everything above; `alignment()` and its frozen weights.
- **Mechanism.** `docs/PRODUCT.md` §7, one introduction at a time, the ledger
  deciding. Designed.
- **Improvement.** None until a door is full. Building the marketplace before
  its supply exists would be the feature this file argues against.

### 7 · Match quality → Mutual interest

- **Metric.** *No instrument.* Two yeses per introduction — designed; the
  joint-alignment tally in `docs/LEARNING.md` row 1 is the only measurement
  the charter permits, and it learns about the pairing, never a side.
- **Friction.** No photo, no name, no feed: a yes has to rest on how two
  lives fit and what each has done here.
- **Failure state.** Introductions with no yes from either side — and the one
  the product refuses to measure, a desirability skew, because the count
  that would reveal it is the count that would create it.
- **Dependencies.** Stage 6.
- **Mechanism.** Designed.
- **Improvement.** None. Nothing to match yet.

### 8 · Mutual interest → Conversation

- **Metric.** `read`, `eleven`, `asked-him`, `he-answered` per hundred
  `arrived`; `facts.began.couple` against `he-answered` (his completion,
  A1); the couple tally's `both-not-talked` per topic.
- **Friction.** The conversation happens in the world, not here — a property
  to protect. The eleven is long for a man arriving cold on her link.
- **Failure state.** `asked-him` without `he-answered`; `began.couple` without
  the eleven rung. Until `began`, these were invisible; now they are two
  numbers.
- **Dependencies.** `Read.tsx`, `BeforeYes.tsx`, `Couple.tsx`, `words.ts`; the
  couple store.
- **Mechanism.** The instruments, and the one question worth asking next.
- **Improvement.** A1's couple rule: completion under 50% fixes the two-sided
  flow. Waiting on data.

### 9 · Conversation → Serious progression

- **Metric.** `deciding` per hundred `read` + `eleven`; `followed-through`;
  `vouched` per hundred `counted`; `facts.ended.reason` and `.stage` for the
  ones that fell back.
- **Friction.** Family enters late and finds the eleven out after the fact;
  the vouch asks her to tell a father she is looking.
- **Failure state.** `ended` from `talking` on a non-negotiable or one of the
  eleven — foreseeable, and not foreseen. The dataset nobody has.
- **Dependencies.** Stage transitions to the day; the follow-up's three-day
  wait; `netlify/functions/vouch.ts`.
- **Mechanism.** The family scripts (A4), the vouch (A2), the guide (A3).
- **Improvement.** A2's counting change — `asked/<code>` exists and is never
  read. Next after the weakest link, not before it.

### 10 · Serious progression → Monetization

- **Metric.** Paid conversions on "Deciding together" — *none exists*.
  Proxy until then: `facts.ending.who.family`.
- **Friction.** The free-for-a-year promise to everyone here before launch;
  no price anywhere in the code (`src/data/plus.ts`).
- **Failure state.** People reach the nikah and nobody pays — fatal to
  revenue, not to the marketplace, and later in time.
- **Dependencies.** An open pool, a real checkout, a real price.
- **Mechanism.** A5. Deferred by rule.
- **Improvement.** None permitted. A fake price would be the one lie this
  product cannot tell.

### 11 · Monetization → Success

- **Metric.** `married`; `facts.ending.who`, `.mattered`, `.used`; the
  `marriedBy` cross-tabs — the first outcome table the product has.
- **Friction.** The ending is asked of someone who has, by definition, left.
- **Failure state.** Marriages that happen and are never told — and the
  charter refuses to infer them from silence.
- **Dependencies.** `Ending.tsx`; the `married` stage.
- **Mechanism.** The ending screen, and the one share only she can make.
- **Improvement.** None. This transition does not depend on the one above it
  — a marriage costs nothing here — which is why the order is a business
  system's, not this product's.

### 12 · Success → Referral

- **Metric.** `vias.married` as a share of `arrived`; `vias.words`.
- **Friction.** No referral reward, no invite counter, no link that carries
  who sent it — by rule, forever. A married woman has no reason to open the
  app again; the ending is her last screen.
- **Failure state.** `vias.married` at zero after the first marriages.
- **Dependencies.** Stage 11.
- **Mechanism.** The auntie inversion — `via: 'married'` from the ending.
- **Improvement.** None until a marriage. Then read it.

## The weakest link

**Profile → Match liquidity, on the men's side.** Not the least measured
transition — attention and mutual interest have no instrument at all, on
purpose — but the one that is *structurally* broken: the product has a path
for a preparing man, and no link that starts him on it.

The evidence, in the code:

- The door opens at forty women **and forty men** in one pool
  (`COHORT_TARGET` in `netlify/functions/cohort.ts`). Being counted requires
  a completed map (`src/lib/keep.ts` `keepMap()` returns null without one).
- The path a preparing man can walk exists: Welcome → *Start where you are*
  → Identity → Situation ("not talking to anyone") → the hook → thirteen
  questions → Home → the door card → *Count me in*. It begins at the front
  door, `Welcome.tsx`, which no acquisition link sends anyone to.
- Every mechanism for *finding* a man sends him somewhere else:
  - A counted woman's only ask, `src/components/Cohort.tsx` `sendTheRead()`:
    "If you know one serious man, send him this" → `instrumentLink('read',
    'door')`.
  - The wedge playbook's only link, `docs/WEDGE.md` §How to acquire it, step 2:
    `joinniyyah.com/?read&via=group`; step 4, the same ask again.
  - Both land on `src/components/Read.tsx` — "Before we start — who are you
    reading?" A man who came because he is *looking* cannot answer it. His
    only ways forward are eleven questions about a woman he is not seeing, or
    the back button.
- There is no link kind for the door: `src/lib/entry.ts` `InstrumentKind` is
  `'read' | 'eleven' | 'families'`; `ENTRY_SCREEN` in `src/hooks/useNiyyah.ts`
  has no `door`.
- And the failure cannot be seen. `ProgressRecord` in
  `netlify/functions/progress.ts` carries scene, via and facts — no gender.
  The readout can show `vias.group` and `vias.door` but cannot split either by
  side, so *men opened the group link and bounced at the read* and *no man
  ever opened it* produce the same readout. The only men's number anywhere
  is the door's final count, and by the time it says seven, the eight weeks
  `docs/WEDGE.md`'s pivot rule gives have been spent on the wrong diagnosis.

Two causes, opposite fixes, currently indistinguishable — the same shape as
the finding that built `began`. If men are not arriving, the channel is wrong
and the playbook pivots. If men arrive and bounce, the product is wrong and
the channel is fine. Today the founder would pivot the channel either way.

## Why this, and not a feature

- **Everything downstream is dead until it moves.** Match quality, mutual
  interest, the introductions record, the concierge, the checkout — stages 6
  through 10 run at exactly zero until one pool has forty men.
  `docs/PROCESS.md`'s roadmap already blocks items 5 and 6 on it. A feature
  built for any of those stages has no measurable value now, and no way to
  acquire one.
- **Everything upstream pours into it.** Better words, a shorter read, a
  kinder hook — each brings more people to a door that men are not shown.
  `docs/WEDGE.md`'s hypothesis to beat is one man per three counted women;
  at that ratio the first pool needs a hundred and twenty women, and every
  upstream improvement is spent three-to-one.
- **It is `docs/GAPS.md`'s gap #1.** "Men do not follow women" is ranked the
  most dangerous belief in the repository. The fix here is also the
  instrument that tests it.
- **The cost is asymmetric.** The fix is a link kind, a screen that shows a
  number the server already computes, and one field on a record — against a
  marketplace, which is what the next-largest idea costs.
- **The counter-case, stated so it can fire.** If, after twenty arrivals,
  `facts.began.read` against `rungs.read` shows the read itself is abandoned
  by most who begin it, then A1 is the weakest link and fires first — a man
  routed to the door instead of the read would only be routed past a broken
  instrument. Read A1 before building M1.

## The runner-up links, and why they wait

| Link | Why not first |
|---|---|
| Attention → Landing | Unknown, but the playbook is the test and nothing needs building. `docs/GAPS.md` gap #2 is read at the monthly hour |
| Onboarding → Profile (A1) | Instrumented last pass; waiting on twenty arrivals. Its decision rule is written and will fire on its own |
| Conversation → Serious progression (A2) | A counting change with real learning value. Next — it needs kept maps, which need the door |
| Serious progression → Monetization (A5) | Blocked by a promise the product will keep |
| Match liquidity → Match quality | Nothing to match. Building it now is the feature this file argues against |

## The implementation plan

Four slices, one commit each, `npm run verify` green on each, in the order
below. M0 first because a fix without its instrument is a hope.

### M0 · Gender on the ladder

The one field that makes the men's funnel readable.

- `netlify/functions/progress.ts`: `ProgressRecord.gender?: string`,
  validated against `GENDERS` — already in `netlify/shared/vocab.ts` — and
  refused otherwise, like `scene`. Last-told-wins, like `scene`: Identity is
  where it is chosen and it may be corrected.
- `src/lib/progress.ts` `reportRungs` sends `identity.gender` beside `scene`;
  the signature includes it so a change posts once.
- The tally gains `sides: { woman: {rung: n}, man: {rung: n} }`, through
  `floorRows` — gender is a quasi-identifier and `docs/LEARNING.md`'s floor
  rule applies to every split by one. Stated plainly: `sides.man.*` reads
  `null` until five men have arrived, which is also the first moment a
  conclusion about men is worth drawing. The door's own per-city count stays
  the unfloored number for `counted`, as it already is.
- Same commit: `Trust.tsx`'s ladder paragraph names it ("whether you said you
  are a woman or a man"); `docs/LEARNING.md`'s collected list gains the line;
  `docs/OPERATING.md`'s field table gains `sides` and the weekly pulse reads
  `.sides.man`.
- Tests: `tests/progress-function.test.ts` — accepts `'man'`, refuses
  `'other'`, a later report overwrites, tallies by side, floors under five.
- Must not: split `facts` by side. The rungs are enough for this question,
  and `facts × gender × scene` is a re-identification surface for nothing.

### M1 · The `door` link

A link that lands a person who is *looking* on the number, not on a question
about someone they are not seeing.

- `src/lib/entry.ts`: `InstrumentKind` gains `'door'`; `entryFromUrl` reads
  `?door` like `?read`. `ENTRY_SCREEN.door = 'door'`; `Screen` gains
  `'door'`; `src/main.tsx`'s comment lists `/?door`.
- `src/components/Door.tsx`, new: a city select (and a country select when
  "somewhere else"), reusing `scenes` and `countries`; the two-sentence
  count from `cohortCount(scene, country)` — export the count sentence from
  `Cohort.tsx` rather than write it twice; one button, **Count me in**, which
  sets the scene and calls `beginMap()` — the existing Identity → hook →
  intake path with `identityNext = 'hook'` — landing on Home, where the door
  card is; and the existing "Not now" chips (`hesitationOptions`,
  `saveHesitation`), which already work before a map because facts ride
  under the install code.
- No `began` bit: the door is not a questionnaire. No new server surface: the
  count is already public and already capped.
- Tests: `src/lib/entry.test.ts` — `?door`, `?door&via=group`, and that a
  coded kind still wins when both are present.

### M2 · Two asks on the door, and the playbook

- `Cohort.tsx`'s joined state: "If you know one serious man, send him this"
  becomes two asks. *Already talking to someone* → the read, unchanged.
  *Looking* → `instrumentLink('door', 'door')`, with a text that names the
  count and says what it costs: no account, no photos — a map and a way to
  reach you. `one` / `them` already make the copy read right from either
  side. `track('door_sent')` stays one event with the kind as a property; no
  count of recipients, anywhere.
- `docs/WEDGE.md`: step 2 posts `/?door&via=group` beside the read; step 4
  becomes "send him the door, or the read if he is seeing someone."

### M3 · Reads right for a man

A checklist walked once on `npm run dev` with `gender: 'man'` on the `?door`
path: Identity → the hook (`person(g)` already flips) → the intake
(`src/data/intake.ts` has no gendered placeholder — verified) → the
reflection → Home → the door card. Anything on that path that speaks to *her*
alone is fixed in this commit. `Welcome.tsx` is out of scope: the hero is
written to her by design, and the door link bypasses it.

### Measure, and the decision rule

The weekly pulse reads `sides.man` beside the door. After four weeks of
posting `?door&via=group`:

- `sides.man.arrived` under five → **the channel, not the product.**
  `docs/WEDGE.md`'s pivot rule fires: change the channel first, the city
  second.
- Five or more arrived and fewer than one in four reach `mapped` → **the map
  is the toll gate for men.** A1's "cut to one chapter" fires for the men's
  path first, before any change to the women's.
- One in four or better `counted` → **the link was the bottleneck.** Keep
  posting; read the door; the next weakest link is A2.
- Counter-metric: women's `counted` per hundred `arrived` must not fall while
  the men's rises. If it does, the second ask on the door is costing her the
  first, and M2 reverts to one ask.

This rule is logged as A6 in `docs/EXPERIMENTS.md` and sits in
`docs/PROCESS.md`'s kill table, so that when the numbers arrive they are
executed rather than debated.

## Considered and declined

- **Boosting, seeding, or paying for men.** `docs/STRATEGY.md` forbids all
  three; the honest door is the product.
- **A men-only landing page, or any "for men" copy.** A wedge word in public
  copy — declined in `docs/WEDGE.md` and again here. The `door` link is
  gender-neutral; who opens it decides what it is for.
- **Rewriting Welcome's "Is he serious?"** The hero is written to her because
  women's trust is the liquidity (ASSUMED, `docs/GAPS.md`). The door link
  bypasses Welcome, so the fix does not need it.
- **Counting someone at the door without a map.** The map is what gets
  matched (`docs/SCALE.md`); a count of people with nothing to match is the
  seeded number the strategy refuses.
- **A "saw the door" rung.** An attention trace, already declined in
  `docs/GAPS.md`. `arrived` on a `door` via, against `mapped` and `counted`,
  is the honest funnel; `hesitated` says why.
- **Splitting `facts` by gender.** See M0. The rungs answer the question;
  the cross-tab would only narrow who a record could be.

## Revisions

_Dated, one line each: a transition whose metric, friction or failure changed,
or a new weakest link — and the readout that showed it._

- _(none yet — the machine has not run)_
