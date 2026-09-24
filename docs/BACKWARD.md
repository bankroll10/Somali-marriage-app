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
order of **20,000 Somali diaspora marriages a year** — asserted, not derived:
REDTEAM computes the 110,000 and stops, and 20,000 implies a crude marriage
rate of ten per thousand against a US rate near six and a UK rate near four.
At five or six per thousand every row below halves; the ten conversations
should source the rate (`docs/BOARD.md`). Then:

| Share of those marriages | Take per marriage | Revenue a year |
|---|---|---|
| 5% | $628 — the written schedule, net | $0.6M |
| 20% — dominance | $628 | $2.5M |
| 20% | $1,078 — a $3,000 fee at the nikah, half to the company, three in five | $4.3M |
| 20% | $3,000 — a fee near $9,400 at the written share and attach | $12M |
| 40% | $3,000 | $24M |

*Take* is the company's revenue, not the fee at the nikah. An earlier draft
counted the matchmaker's half of $1,500 as ours and reached ~$1,000 and a $4M
row; on the schedule's own terms — `docs/STRATEGY.md` §5, "the company's
share half" — it is $628 (`docs/BOARD.md`).

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
| **Margins** | ≥50% of revenue from software-priced lines by year three, or the multiple is a services multiple. **Fails as written:** at the schedule the software-priced share is 28% at best ($178 of $628), and 13% once the call inside "Deciding together" is priced as founder time (`docs/BOARD.md`) | The ledger of revenue by line |
| **Brand strength** | Heard as an institution: the name and the frame survive a second community without a rename; the honest door is the proof people cite | `vias.married` share; the conversations |

## The assumptions that forbid the outcome

Ranked by how hard they bind. The first is arithmetic; the rest are choices.

1. **Somali-only at $628 a marriage.** Caps revenue near $2.5M a year even at
   total dominance (the ~$1,000 and $4M first written here counted the
   matchmaker's half as ours; corrected above). Mathematical. Either the take is institution-priced or
   the population is not one community.
2. **The matchmaker as the default paid line.** A person paid at the nikah is
   a service; services carry services margins and founder hours per marriage
   (`docs/TIME.md`). Prevents a software multiple unless the software-priced
   lines carry half of revenue.
3. **Free for a year to everyone here before the public launch.** Right, and
   as first written it meant no revenue evidence until a year after the first
   pool; if the pool took two years, three years to the first dollar
   (`docs/REDTEAM.md` third). **Bounded 2026-09-12** (`src/data/plus.ts`,
   `docs/BOARD.md` decision 0): the promise is about what a *member* is
   charged — everyone counted before her pool opens keeps every paid feature
   free for a year after it opens — and what a family pays at the nikah or a
   guest gives is outside it. The concierge's first ten couples are a
   permitted test, in year one. It delays less, and it no longer starves.
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
  shape, a transcription rather than an archaeology — for values. Key layouts
  (the cohort key's segments, the indexes) carry no version; a reader of keys
  reads the value's `v` to know its key's layout, and a key change is a
  migration, named as such (`docs/HARD.md` row 18).
- **The price, written down.** `docs/ROADMAP.md`'s open BUILD NOW item.
  `docs/STRATEGY.md` §5 now carries a prediction with a date: the call with a
  matchmaker after the joint view (then "Deciding together") $99, once per
  person for life since `docs/MONETIZATION.md` (it was per courtship); a matchmaker in your corner $1,500 at the nikah,
  the company's share half; the first year married $79 as a gift. At those prices and
  three in five marriages using a matchmaker the take is about $628 — the
  $2.5M line in the table above, once the matchmaker's half is counted as his
  and not ours (`docs/BOARD.md`). **So a $3,000 *take* — a fee near $9,400 at
  the nikah at the written share, or a far larger share of a smaller fee — is
  what "a real company" requires**, and the ten conversations must find out
  whether families pay what they already pay matchmakers, and what that is. No
  price appears on a screen until launch; this is what the checkout will be
  measured against.
- **"Public launch" defined** — the day the first pool opens. Two promises
  hang on it and it had never been defined: the free year, and the day prices
  are set.
- **The institution rule.** Nothing that would need renaming for a second
  community carries a community's name; a community's content lives in
  `src/data/` as data. Not true of the code when this was written — the hero,
  a Welcome bullet, the title, the meta description and the manifest all named
  the community as literals (`docs/BOARD.md`); since 2026-09-12
  `src/data/brand.ts` holds the brand strings and `tests/brand.test.ts` holds
  the surfaces to it. The instruments' own copy still names the community in
  seven components — content, which a second community gets a second
  `src/data` of, not a rename. Zero cost; keeps the second target reachable
  without building one line toward it.

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
- `docs/PROCESS.md`: the incentive audit runs from now. First run 2026-09-24,
  `docs/MONETIZATION.md` section E: nine fails, all fixed.
- `docs/SCALE.md`: records carry `v`; `netlify/functions/export.ts`: the
  wrapper is no longer the only thing versioned.
- `README.md`: pointer.

## Revisions

- 2026-09-11 — First version. Two targets; the Somali-only ceiling at
  $10–25M; fourteen must-be-trues with readouts; seven preventers, the first
  arithmetic; the bottleneck named as an act, not a build; four optionality
  moves, one of them code.
