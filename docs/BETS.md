# Niyyah — twenty asymmetric bets, scored

> MJ DeMarco's asymmetry test: look for the change where a small, reversible
> effort could produce a disproportionate result — and refuse the one where a
> large effort produces a proportionate one. This file is that search, run
> across the whole product, with the scores written down so a bet cannot be
> promoted later by enthusiasm. The honest state is unchanged: zero members,
> three test rows, all the founder's. So every upside below is a hypothesis,
> and the axis that decides the ranking is not upside — it is what the bet
> teaches when it fails.

## What makes a bet asymmetric *here*

The constraints are permanent, and they are the reason this product can exist
at all: no photos, no free text on the server, no attention traces, no
messaging, no referral reward or invite counter, no paid acquisition, no
seeded count, no location finer than the city. A bet that needs one of them is
not a cheap bet with a caveat — it is a zero, and five of the twenty below are
scored that way on purpose, so that the next person to think of them finds the
reasoning rather than the idea.

The second filter is the machine. `docs/MACHINE.md` found the weakest link and
the last pass built for it. Anything downstream of an unopened pool — ranking,
mutual interest, the checkout — cannot be tested at any price, so its
confidence is Low however good the idea.

## How these are scored

| Axis | Scale | What it means |
|---|---|---|
| **Upside** | High / Med / Low | If it works, how much does it move the machine |
| **Cost** | S / M / L | S: an hour and one file. M: a day and a screen. L: a week or a new surface |
| **Reversibility** | Free / Costly / One-way | Free: delete the commit. One-way: it changes what the product promises |
| **Confidence** | High / Med / Low | That the mechanism does what the bet says, given what is known today |
| **Learning** | High / Med / Low | What the founder knows afterwards *even if the bet fails* |

Ranked by upside × confidence × learning ÷ cost, with reversibility as a gate:
a One-way bet must clear a much higher bar than its arithmetic.

## The twenty

### Trust and verification

**B1 · Count the vouch asks.** `netlify/functions/vouch.ts` writes an
`asked/<code>` key every time a woman asks a relative to vouch. Nothing reads
it — not one line, anywhere, except idempotence and deletion on forget. So the
product already knows how many women asked and how many relatives answered,
and has never counted either. One founder-gated readout turns the only
verification this product claims into a measured thing.
*Upside High · Cost S · Free · Confidence High · Learning High.*

**B2 · The vouch ask moves to the moment after being counted.** It lives on
Profile, which a woman who joined the door from Home may never open. The ask is
heavy — she has to tell a father she is looking — and it is currently made at
the least motivated moment. Same words, different place.
*Upside Med · Cost S · Free · Confidence Med · Learning Med.*

**B3 · The door names how many counted here are vouched.** "Twelve counted in
Minneapolis; nine have a family vouch" is the strongest sentence this product
could put on its door, and today the number is invisible to the people it
would reassure. Needs the cohort record to carry the vouch, which it does not.
*Upside High · Cost M · Free · Confidence Med · Learning Med.*

**B4 · "What a match would see."** One screen showing the exact fields an
introduction would carry, and the ones it never will. Aimed straight at
`hesitated.seen` and `.contact` — the two reasons the strategy assumes stop
people at the door, and the ones `docs/GAPS.md` ranks third-most dangerous.
*Upside High · Cost M · Free · Confidence Med · Learning High.*

### Onboarding and profile

**B5 · A `kept` rung.** `docs/GAPS.md` gap #3 says its test is "the
`mapped → kept → counted` funnel from the ladder" — and `kept` is not a rung
(`src/lib/rungs.ts`), so that funnel cannot be computed. A woman who builds a
map and never keeps it is invisible between two rungs that both exist. One enum
value, one line in `rungsFrom`, one sentence on Trust.
*Upside Med · Cost S · Free · Confidence High · Learning High.*

**B6 · Resume a partial read.** `buildRead` returns null unless all eleven are
answered, so a closed tab loses everything and the person starts over or never
returns. A1's own "considered and declined" names this as a real product change
deferred out of an instrumentation pass.
*Upside Med · Cost M · Free · Confidence High · Learning Low.*

**B7 · An age band on the door.** Deferred with a trigger in `docs/WEDGE.md`:
the founder cannot tell whether the wedge held. It is also a sixth
quasi-identifier in a key that already holds five.
*Upside Med · Cost S · Costly · Confidence Med · Learning Med.*

**B8 · A prior-marriage question.** The divorced and remarrying are the largest
unserved segment in the strategy and are served by nothing here. Deferred to
the second offer, and it must not be heard before there are marriages to stand
on. *Upside High · Cost M · One-way · Confidence Low · Learning Med.*

**B9 · The read's result offers the door.** A person who just received an
honest read is at the most motivated moment the product has, and the screen
offers the map alone. *Upside Med · Cost S · Free · Confidence Med · Learning Low.*

### Liquidity and referral

**B10 · His side of the eleven.** The couple flow runs one way: she sends, he
answers. A man who arrives through the door or the read cannot start it, so
half the wedge's primary loop is missing from his side.
*Upside High · Cost M · Free · Confidence Med · Learning Med.*

**B11 · The ending's share carries the door.** The one share only a married
woman can make sends the eleven. For most of the people she would tell, the
door is the truer thing to send.
*Upside Med · Cost S · Free · Confidence Med · Learning Low.*

**B12 · The waitlist confirmation names the two numbers.** She is counted, and
the screen says so; it does not say what she just moved. Copy only.
*Upside Low · Cost S · Free · Confidence Med · Learning Low.*

**B13 · A referral reward, or an invite counter.** **Declined.** Both are named
as never-built in `docs/STRATEGY.md`, and a link that carries who sent it is
the contact graph `docs/LEARNING.md` refuses. *Scored zero.*

### Notification and return

**B14 · The follow-up as a calendar file.** The guide's three-day follow-up
lives inside the app, so it fires only if she happens to come back — a reminder
that depends on the thing it is reminding her to do. A one-tap `.ics` download
is a real reminder with no push, no email, no account, no token, no server and
no attention trace: the file is written on her device and the calendar is hers.
The highest-upside bet that costs a component rather than a surface.
*Upside High · Cost M · Free · Confidence Med · Learning Med.*

**B15 · Push or email re-engagement.** **Declined.** No infrastructure, a new
dependency in `docs/CONTROL.md`'s terms, and the wrong direction: PRODUCT §6
says sessions should *fall*. *Scored zero.*

**B16 · "The pool moved since you were here."** **Declined.** It needs a
last-seen, which is an attention trace by another name.
*Scored zero.*

### Ranking and safety

**B17 · Block-before-introduction.** A member names someone they must never be
introduced to. Necessary the day the first pool opens, and the safety story is
what makes the first forty possible in a tight community — but there is nothing
to block yet. *Upside High · Cost M · Free · Confidence Low (no marketplace) ·
Learning Low.*

**B18 · A ranking rule against repeat-thin reads.** Nothing to rank.
*Upside Med · Cost M · Free · Confidence Low · Learning Low.*

**B19 · Photos, or any appearance signal.** **Declined, permanently.** It is
the product. *Scored zero.*

**B20 · A seeded or boosted count.** **Declined.** The honest zero is the
door's whole argument. *Scored zero.*

## The ranking

| # | Bet | Upside | Cost | Rev. | Conf. | Learning |
|---|---|---|---|---|---|---|
| **1** | **B1 Count the vouch asks** | **High** | **S** | **Free** | **High** | **High** |
| 2 | B5 A `kept` rung | Med | S | Free | High | High |
| 3 | B4 "What a match would see" | High | M | Free | Med | High |
| 4 | B14 The follow-up as a calendar file | High | M | Free | Med | Med |
| 5 | B2 The vouch ask, better placed | Med | S | Free | Med | Med |
| 6 | B10 His side of the eleven | High | M | Free | Med | Med |
| 7 | B3 The door names the vouched | High | M | Free | Med | Med |
| 8 | B9 The read's result offers the door | Med | S | Free | Med | Low |
| 9 | B11 The ending's share carries the door | Med | S | Free | Med | Low |
| 10 | B6 Resume a partial read | Med | M | Free | High | Low |
| 11 | B7 An age band on the door | Med | S | Costly | Med | Med |
| 12 | B12 The confirmation names the numbers | Low | S | Free | Med | Low |
| 13 | B17 Block-before-introduction | High | M | Free | Low | Low |
| 14 | B8 A prior-marriage question | High | M | One-way | Low | Med |
| 15 | B18 A ranking rule | Med | M | Free | Low | Low |
| 16–20 | B13 · B15 · B16 · B19 · B20 | — | — | One-way | — | — |

B1 wins on every axis at once, which is what an asymmetric bet looks like when
you find a real one: **the data has already been collected and paid for, and
nothing reads it.** There is no new collection, no new screen, no new value the
server accepts, and no new promise on the Trust page — the cost is a counting
function, and the return is the first evidence about the claim at the centre of
the product.

## What B1 settles

`docs/EXPERIMENTS.md` A2's decision rule, written before the numbers and now
runnable in one call:

- **Asks under one in four kept maps** → the ask is the problem. She will not
  tell a father she is looking, and the fix is where and how it is asked (B2),
  not the relative's screen.
- **Asks healthy, vouches under half** → his screen is the problem. The friction
  is on the family's side, and that is a different fix entirely.
- **Both healthy** → the vouch is real, and it becomes the centre of the trust
  claim rather than a hope inside it — which is what makes B3 worth building.

Two failures that look identical in every store today, and would have been
argued about instead of read.

## Results log

_Dated, one line each: the bet, what shipped, and what the numbers said._

- 2026-09-07 — B1 built: the vouch readout. No numbers yet; nobody has asked.
- 2026-09-08 — B5 built: `kept` is a rung. `docs/ROADMAP.md`'s Fastlane audit promoted it on the one ground that outranks its rank here — a funnel cannot be recovered from traffic that has already passed through, so an instrument the first cohort needs must exist before the first cohort does. No numbers yet; nobody has kept a map but the founder.
