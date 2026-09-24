# Niyyah — the flywheel, and where it does not yet turn

> Growth is supposed to come from outcomes: a better match makes a better
> experience, which earns trust, which produces a success story, which
> produces a referral, which brings more quality people, which is liquidity,
> which is better matching data, which makes better matches, which makes more
> success. This file inspects every one of those ten transitions against the
> code as it is, names where the wheel breaks or has no mechanism at all, and
> strengthens the one link with the most leverage. The point is that growth
> should come increasingly from superior outcomes rather than from spend —
> and this product has already forbidden the spend, so every link must turn
> on a mechanism or not turn.

## What the product already refuses

`docs/STRATEGY.md` §6 rules out the substitutes every marketplace reaches
for: paid acquisition, a referral reward, an invite counter, share-to-unlock,
a link that carries who sent it, boosting, a feed. `docs/LEARNING.md` refuses
the contact graph and any count of how a person was received. So there is no
ad budget to raise and no lever to pull when the wheel slows. That is the
right constraint — it is what makes the outcomes the only engine — and it is
why every gap below is a mechanism to build or a rule to keep, never a
campaign.

## The ten transitions, inspected

| # | Transition | Mechanism today | State |
|---|---|---|---|
| 1 | **Better match → better experience** | None. `alignment()` runs over invented people; introductions are designed (`docs/LIQUIDITY.md`) and wait on the first pool | **Dormant, substituted.** The experience today is the instruments — the read, the eleven, the words — which deliver at zero liquidity (`docs/STRATEGY.md`). The link turns through them until a pool opens |
| 2 | **Better experience → trust** | The honest door that never fakes a room; the ledger of what she has done; the family vouch; Trust enumerating every field; forget-me | **Built.** Measured by `kept / mapped` and `counted / kept` (`docs/GAPS.md` gap 3) |
| 3 | **Trust → success story** | The `married` stage opens the ending once; her record; `ending.who` | **Built.** Zero endings. A marriage never told is the failure the charter accepts rather than infers (`docs/MACHINE.md` stage 11) |
| 4 | **Success story → referral** | The ending's share: `via=married`, her line on it | **Broke, three ways** — below. **Two fixed in this pass** |
| 5 | **Referral → more quality users** | `via` first-arrival-wins; quality is the kept map and the ledger, not a badge | **Built.** `vias.married.counted / arrived` and `sidesByVia.man.married` are computable — and were not read: the monthly hour read vias by `followed-through` only. **Now read** |
| 6 | **More quality users → more liquidity** | The door, pools, `/pool` | **Built** (`docs/LIQUIDITY.md`) |
| 7 | **More liquidity → better matching data** | The introductions record and the joint-alignment tally — designed, same-commit rule (`docs/HARD.md`) | **Designed, partly substituted.** `ended.which` and `marriedBy.*` already learn what breaks a courtship and what decides one, from courtships that happen off the platform, with no marketplace at all |
| 8 | **Better matching data → better matches** | The monthly loop revises `consequence`, `WEIGHTS`, the dealbreakers question, the scripts (`docs/OPERATING.md`); `alignment`'s scales are locked until `ending.who.here > 0` | **Built — through the instruments, not the matcher.** `docs/REDTEAM.md` assumption 4: no matching system has shown it predicts marriage outcomes, so the honest form of this link is better data → better questions and conversations. Whether it ever turns through the matcher is an open question with a proxy test |
| 9 | **Better matches → more success** | `ending.who.here` | **Built.** Zero |
| 10 | **More success → success story** | The ending, again | **Built.** The wheel closes here |

## Where it breaks

Ranked by leverage — how much of the wheel each fix moves, and whether the
fix can wait.

### First · The success story never reaches the scarce side

The ending is the only screen where the cost of forwarding inverts. While
she is looking, sending anything about marriage says *I am looking*; the
moment she is married, "before we said yes, we had these conversations" is
the most credible thing anyone can say. The product built that inversion and
then pointed it at the wrong people, twice.

- **It sent the eleven.** The eleven presumes the receiver is already talking
  to someone. `docs/BETS.md` B11 named this: for most of the people she would
  tell, the door is the truer thing to send.
- **It never named a man.** The share was addressed to "a sister, a cousin,
  the girl at the wedding." The marketplace's scarce side is serious,
  unattached men (`docs/WEDGE.md`), and every loop in the product reaches a
  man already attached to the woman who sent it — the two-sided eleven, the
  read, "send him the door" from a counted woman. **A married couple is the
  one pair who can reach an unattached person through the spouse's side
  without anyone admitting they are looking.** The one screen that could
  turn the flywheel on the side that needs it sent women an instrument for
  people already in a courtship.

**Fixed.** `marriedShares` (`src/lib/ending.ts`) hands the ending two
things: the eleven — claimed as *hers* only when she did them, since
2026-09-12; before that every woman at the ending was handed "we went through
eleven conversations" (`docs/BOARD.md`) — with her line on it, for the friend
who is talking to someone; and the door — the honest count for her pool and the map
as the way in — for the person who is looking, with an ask that names the
spouse's friend in the member's own voice. Both carry `via=married` and
nothing else. `sidesByVia.man.married.arrived` — men a married couple's share
produced — becomes the flywheel's number. An ending is a one-time event: a
person who reached it before this shipped had spent her one share, so this
could not wait for a marriage to prove it mattered.

### Second · The success is invisible to anyone she does not personally tell

The door shows who is waiting and never who married, though
`docs/STRATEGY.md` §4 promised it would one day. The count is the only
testimonial the privacy thesis permits — no name, no story, no photo — and
today it does not exist. Designed below, at the trigger *the first
marriage*: the count is recomputable from progress records, so nothing is
lost by waiting, and building a "0 married" sentence onto the door before a
marriage exists would be the kind of claim the door was built not to make.

### Third · Nothing turns at 1 and 7 until a pool opens

The matcher has never run on two real people, and the pairing data that
would improve it has no writer. Both are designed to the field
(`docs/LIQUIDITY.md`) and gated by the same-commit rule. The product does not
hope past this: it substitutes. The experience is the instruments, and the
learning is about conversations and questions. That substitution is the
honest statement of what the flywheel is *today* — a wheel that turns on
outcomes from courtships the product did not arrange — and the marketplace
half joins it when a pool passes the opening checklist.

## What replaces advertising, transition by transition

| Where an ad would go | What goes there instead | Cost |
|---|---|---|
| Acquisition | The honest count, posted weekly into the rooms where both sides already stand (`docs/WEDGE.md` step 3); three links a connector posts once | Ten conversations |
| Referral incentive | The inversion: a married person can say what a looking one cannot. Two shares, no reward, no counter | Nothing |
| Retargeting the dormant | Refused. A map lapses in a year; the door falls when it does | Nothing |
| Social proof | The door's count — and, at the first marriage, the marriages on it. Never a testimonial with a name | Nothing |
| Paid reach for the scarce side | The married couple's door share, through the spouse. Never boosting, never paying a man to arrive | Nothing |
| Lifecycle mail | One notification, ever: the pool you are counted in opened (`docs/SCALE.md`) | One vendor, later |
| Funding the next cohort | Not asked for. "Sponsor a place" asked a woman who had just married for money for a place that costs nothing, with no stated use, on the screen the outcome is counted from — removed 2026-09-24 (`docs/MONETIZATION.md`). The ending asks for nothing | Nothing |

## The success story on the door — designed, at the first marriage

A running counter, keyed by scene: `tallies/married/<scene>`, holding
`{ married, here }`. Written in `netlify/functions/progress.ts` when a record
first gains the `married` rung, and `here` when `facts.ending.who` first
reads `here`; decremented on `DELETE /progress` of a record that carried
either — forget-me is a true un-count (`docs/LEARNING.md`), so the delete
must read the record before it goes. The write copies `countPair`'s
conditional loop (`netlify/functions/couple.ts`): read with metadata, write
with `onlyIfMatch` or `onlyIfNew`, three attempts, fail quietly with the
count one short rather than fail the report.

Progress records carry a scene and no country (`docs/SCALE.md` defers country
on the ladder), and `other` is not a pool that opens — so an `other` marriage
counts on no door, consistently with everything else about `other`.
`countPool` in `netlify/functions/cohort.ts` reads the counter, one extra get
per door render, and `DoorCount` gains a sentence only when the number is
above zero: *"Two members here have married since."* — and, once
`ending.who.here` reads above zero, *"One couple met here."* Public and
unfloored like the door's women and men: a wedding is public in this
community, and the count names nobody.

**Trigger: the first `rungs.married`.** The counter is a function of
`first.married` days already stored, so it can be rebuilt on the day it is
needed; waiting costs nothing, and a door that says "0 married" before anyone
has married says the wrong thing in the right voice.

## The flywheel's numbers

Added to the monthly hour (`docs/OPERATING.md`). Every one is a ratio of
things already counted.

| Number | Reads as | The rule |
|---|---|---|
| `rungs.married` per hundred `arrived` | The lagging outcome, unchanged | — |
| `facts.ending.who` | Whether the marketplace or the instruments did it | `here > 0` before pool two (`docs/SCALE.md`) |
| `vias.married.arrived` | The success story travelling at all | Zero after the first marriages is stage 12's failure state (`docs/MACHINE.md`) |
| `vias[via].counted / arrived` | The supply each kind of link brings — not only the conversations | Read beside `followed-through / arrived`; the best door for supply and the best door for conversations may differ |
| `sidesByVia.man.married.arrived` | Men the couple's share produced — **the flywheel's number** | A8: ten endings and still `null` → the door ask is rewritten once, then dropped |
| `vias.married.counted / arrived` against `vias.group` | Whether people a married couple sends are as serious as people a room sends | Read, not ruled, until a hundred records |

## Never built

- A referral reward, an invite counter, share-to-unlock, a link carrying who
  sent it (`docs/STRATEGY.md`, `docs/BETS.md` B13).
- A testimonial with a name, a success feed, a "success stories" page. The
  count on the door is the whole of it.
- A nudge to the married to share again. The ending is her last screen.
- Any count of how a person was received (`docs/LEARNING.md`).
- Her line for the next person reaching anyone but the person she sends it
  to. It rides on the eleven share by her own tap and nowhere else
  (`src/lib/facts.ts` excludes it by type).

## What this pass changed in earlier documents

- `docs/MACHINE.md`: stage 12's metric and mechanism — two shares, and the
  `married` cell on the men's side; a stale line about the door link.
- `docs/BETS.md`: B11 built, with the ask that names the spouse's friend.
- `docs/PRODUCT.md` §9: the couple it worked for is the fourth loop; four
  links open an instrument directly.
- `docs/OPERATING.md`: step 2 reads supply by via and the `married` cell.
- `docs/EXPERIMENTS.md`: A8.
- `docs/PROCESS.md`: the kill row for the door share.
- `docs/SCALE.md`: the marriage counter in the designed table, at its trigger.
- `docs/ROADMAP.md`, `README.md`: pointers.

## Revisions

- 2026-09-11 — First version. Ten transitions inspected; three breaks named;
  the first fixed — the ending's second share, the door, through the
  spouse's side, `via=married`; the second designed at the first marriage;
  the third stated as the substitution the product makes until a pool opens.
