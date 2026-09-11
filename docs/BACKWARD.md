# Niyyah — working backward from "extremely valuable"

> Imagine the company becomes extremely valuable. Do not assume it does. Work
> backward to what must be true for that to be plausible, name the assumptions
> that would mathematically or strategically prevent it, find the bottleneck
> between today and the next meaningful stage, and build now only what
> increases optionality without scaling anything prematurely. Every number
> here is an assumption until a readout replaces it, and the readout is named
> beside each one.

## Two targets, because "extremely valuable" hides an order of magnitude

| Target | Revenue a year | Worth, at marketplace multiples |
|---|---|---|
| **A real company** | ~$10M | ~$50–100M |
| **Extremely valuable** | ~$100M | ~$1B |

Revenue is *marriages the product is part of × take per marriage*, plus the
per-courtship line. `docs/REDTEAM.md`'s market arithmetic: a diaspora of
roughly two million, about 110,000 people looking in any year, so on the
order of **20,000 Somali diaspora marriages a year**. Then:

| Share of those marriages | Take per marriage | Revenue a year |
|---|---|---|
| 5% | $1,000 | $1M |
| 20% — dominance | $1,000 | $4M |
| 20% | $3,000 | $12M |
| 40% | $3,000 | $24M |

**Somali-only, the ceiling is $10–25M a year, and only at dominance with
institution pricing.** "A real company" is plausible Somali-only if two
things are both true: a fifth or more of all diaspora marriages, and about
three thousand dollars a marriage. **"Extremely valuable" is not reachable
Somali-only under any fraction.** It needs a population five to ten times
larger — the Western Muslim diaspora, on the order of 300–400,000 marriages
a year; a tenth of them at $3,000 is $100M — which `docs/REDTEAM.md`
assumption 1 says the hero's first sentence forbids, unless the brand is an
*institution* with Somali as its first community rather than its name.
`docs/STRATEGY.md`'s endgame already says "the modern wali"; this is what
that sentence costs and what it buys.

## Fourteen things that must be true

Each as a number, with the readout that will show it. Today's value of every
one is zero — the link has never been posted.

| Dimension | Must be true | Readout |
|---|---|---|
| **Addressable market** | ≥20,000 marriages a year in reach: the metro door and the country pools cover eight or more of the fourteen countries. Or a second population | `/cohort` `countries`; `arrivedByDay` against the reachable estimate |
| **User density** | ≥5 pools past the opening checklist within three years, `stranded` null in each | `/pool` |
| **Acquisition** | CAC ≈ 0 by rule, so **referral R ≥ 1**: each marriage produces at least one new counted member. Below one, growth is linear in founder effort | `vias.married.counted` per `rungs.married` |
| **Activation** | `counted` per hundred `arrived` ≥ 25; A1's completion rules hold | `rungs`, `facts.began` |
| **Retention** | Return at life events, never daily use: ≥60% of counted maps still live at twelve months; sessions fall after a rung | `/pool` `live / door`; the counter-metric |
| **Successful outcomes** | `ending.who.here` ≥ 10% of member marriages within two years of the first pool; `married` per hundred `arrived` ≥ 5. Below that the instruments are the company and the marketplace is not | `facts.ending.who`, `rungs.married` |
| **Monetisation** | Seven in ten families name a matchmaker payment with an amount; take ≥ $2,000 across the three lines; a real checkout completes at the written price in the first pool's first year | `docs/FEEDBACK.md`; the checkout |
| **Referral behaviour** | `vias.married` ≥ 20% of arrivals by year two; `sidesByVia.man.married` non-null | A8 |
| **Marketplace economics** | Scarce-side ratio ≤ 3:1 in open pools; the matchmaker paid at the nikah costs less than the company's share of it | `/pool` `supply`; the ledger of payouts |
| **Geographic expansion** | Pool two only after `ending.who.here > 0`; the UK opens as a country, not a city | `/pool?country=uk` |
| **Trust** | Zero incidents that reach the community; vouch rate ≥ 50%; `hesitated.seen` under a fifth | `/safety`, `/vouch`, `facts.hesitated` |
| **Defensibility** | ≥1,000 endings before a copier has one; the connectors' rooms are ours; the constants revised ten or more times from readouts | `docs/OPERATING.md`'s revisions log |
| **Margins** | ≥50% of revenue from software-priced lines by year three, or the multiple is a services multiple | The ledger of revenue by line |
| **Brand strength** | Heard as an institution: the name and the frame survive a second community without a rename; the honest door is the proof people cite | `vias.married` share; the conversations |

## The assumptions that forbid the outcome

Ranked by how hard they bind. The first is arithmetic; the rest are choices.

1. **Somali-only at $1,000 a marriage.** Caps revenue near $4M a year even at
   total dominance. Mathematical. Either the take is institution-priced or
   the population is not one community.
2. **The matchmaker as the default paid line.** A person paid at the nikah is
   a service; services carry services margins and founder hours per marriage
   (`docs/TIME.md`). Prevents a software multiple unless the software-priced
   lines carry half of revenue.
3. **Free for a year to everyone here before the public launch.** Right, and
   it means no revenue evidence until a year after the first pool; if the
   pool takes two years, three years to the first dollar (`docs/REDTEAM.md`
   third). It delays, and it can starve.
4. **No paid acquisition, ever.** Right, and it makes referral R the whole
   growth rate. R below one forbids scale; nothing else is allowed to.
5. **"Built for the Somali diaspora" as the first sentence.** Forbids the one
   population that reaches the second target — unless the institution
   framing is built from now, which costs nothing (below).
6. **One founder posting links, opening pools and matchmaking.** Forbids the
   timeline, not the outcome. The connectors are the company's first hires
   in all but name; the matchmaker is the second.
7. **Blobs on a free plan.** A ceiling with a trigger (`docs/SCALE.md`), not a
   preventer.

Stated to close the question: **the privacy charter is not a preventer.** No
photos, no feed, no messaging forbid engagement monetisation, which the
company never wanted, and they are the trust asset the whole table above
rests on. A company that added them to grow would lose the thing it was
growing.

## The bottleneck

**Not a build.** Zero members. The link has never been posted. The ten
connectors have not been asked, and the red team's first kill test is dated
2026-09-15. Twenty-six documents, six decision rules, three kill tests and
every readout in this directory are waiting on one act by one person.

The next meaningful stage is **twenty counted in one metro** — `docs/WEDGE.md`'s
eight-week rule — and after it, the first pool on `docs/LIQUIDITY.md`'s
checklist. Between the first stage and the second the bottleneck becomes the
scarce side: men who are not already attached to the woman who sent them.
`docs/FLYWHEEL.md`'s door share at the ending and the group link exist for
exactly that, and neither has been used.

## Build now — optionality without scaling

The rule: build only what is cheaper today than on any later day and
forecloses nothing. Four things pass; one is code.

- **A version on every stored record.** `docs/HARD.md` row 14 deferred this
  to "the next shape change" because retrofitting a version onto existing
  records is a migration. There are zero records; the migration is free today
  and never again. Built: `netlify/shared/record.ts`, `v` on every member
  record, stamped last, held by `tests/record-version.test.ts`. It is what
  makes `docs/SCALE.md`'s move to a real database, and every later change of
  shape, a transcription rather than an archaeology.
- **The price, written down.** `docs/ROADMAP.md`'s open BUILD NOW item.
  `docs/STRATEGY.md` §5 now carries a prediction with a date: Deciding
  together $99 a courtship; a matchmaker in your corner $1,500 at the nikah,
  the company's share half; the first year $79 as a gift. At those prices and
  three in five marriages using a matchmaker the take is about $1,000 — the
  $4M line in the table above. **So the institution price, $3,000 and up at
  the nikah, is what "a real company" requires**, and the ten conversations
  must find out whether families pay what they already pay matchmakers. No
  price appears on a screen until launch; this is what the checkout will be
  measured against.
- **"Public launch" defined** — the day the first pool opens. Two promises
  hang on it and it had never been defined: the free year, and the day prices
  are set.
- **The institution rule.** Nothing that would need renaming for a second
  community carries a community's name; a community's content lives in
  `src/data/` as data. Already true of the code — the product is Niyyah, an
  intention — and now a rule, so it stays true. Zero cost; keeps the second
  target reachable without building one line toward it.

**Not now, by name:** payments, a database, the matchmaker's tool, the
introductions record (same-commit rule), a second community's content, more
readouts, a hire. Each has a trigger written elsewhere, and none is cheaper
today than at its trigger.

## What this pass changed in earlier documents

- `docs/HARD.md`: row 14 chosen hard; the deferred row rewritten.
- `docs/STRATEGY.md` §5: the price as a prediction, public launch defined, the
  institution rule; the endgame points here for what its first sentence costs.
- `docs/ROADMAP.md`: BUILD NOW item 4 done.
- `docs/REDTEAM.md`: the third finding's "what can be decided now" — decided.
- `docs/PROCESS.md`: the incentive audit runs from now.
- `docs/SCALE.md`: records carry `v`; `netlify/functions/export.ts`: the
  wrapper is no longer the only thing versioned.
- `README.md`: pointer.

## Revisions

- 2026-09-11 — First version. Two targets; the Somali-only ceiling at
  $10–25M; fourteen must-be-trues with readouts; seven preventers, the first
  arithmetic; the bottleneck named as an act, not a build; four optionality
  moves, one of them code.
