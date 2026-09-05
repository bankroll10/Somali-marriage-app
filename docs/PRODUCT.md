# Niyyah — Product Strategy (v8, the PM lens)

> The PM's job: make Niyyah the thing this generation reaches for whenever
> something about marriage actually *moves* — and to make sure the product is
> paid, measured and designed so that its interest and the member's never point
> in different directions.

## 0. The hard question: "Why would anyone open this?"

**The trap.** Dating apps get daily opens from a slot machine — likes, matches,
notifications engineered for anxiety. A *marriage* app has the retention
paradox on top: success = churn. The tempting answer is to borrow the wellness
playbook instead: a daily check-in, a reflection of the day, a milestone on day
seven. That is the same loop with softer copy, and it optimises for the same
thing — opens — which has no relationship to marrying well.

**The reframe.** Niyyah is not opened daily. It is opened when something
happens, and it is measured by what happened afterwards. The member's life
generates the triggers: a slow reply, a family conversation looming, a man who
has not said the word marriage after three months. The product's job at that
moment is to hand her an instrument that ends in words she can say — and then,
days later, to ask whether she said them.

So there are exactly two reasons to open Niyyah, and the product designs for
both and nothing else:

| Reason | Surface | Ends in |
|---|---|---|
| **Something happened** | The ask box → the Guide, routed; the read; the eleven | Words to say, and a follow-up written down |
| **Since last time** | The follow-up card on Home | "We talked" / "not yet" / "it went differently" — and the record moves |

Everything else on Home is quiet: the work card (one thing from the map), the
stage band (where she is, changed only by her), a reflection worth reading, and
the doors to the instruments for her stage.

## 1. The instruments, and what each one is for

| Instrument | The job it does | Ends in | Goal it serves |
|---|---|---|---|
| The read | "Is he serious?" — what he has actually done | The one question to ask next | Seriousness, compatibility |
| Before you say yes | The eleven conversations found out too late | The one to open this week, and the words | Compatibility, progression |
| The two-sided eleven | He answers on his own phone; neither sees the other's sheet | Where they match, and the one to open together | Compatibility, trust |
| The family words | Telling the wali, the first talk with hooyo, opening mahr | Word for word | Progression |
| The family vouch | The only verification we claim | A father's first name and one sentence, kept | Trust, seriousness |
| The map | Where she stands, in words, and the one thing to do about it | The work card | Seriousness |
| The Guide | The moment, in the right voice | Words, and a follow-up | Progression |
| The follow-up | "Did you say it?" | The record of what actually happened | Progression — the North Star |
| The door | The honest count toward a city opening | "We'll write to you" | Trust |

Nothing above is a feed, a score, or a ritual. Each ends in an act in the world.

## 2. Onboarding & activation

**Current funnel:** Welcome → identity → *what's happening right now* → the
instrument for that stage. Preparing goes to the hook and the thirteen-question
map. Talking goes straight to the read. Deciding goes to the eleven. Married
goes to the guide.

**The aha moments:** (1) the read telling her what he has and hasn't shown, in
her situation, in ninety seconds; (2) the map naming her thinnest ground and
handing her one thing to do about it; (3) the follow-up remembering.

**Activation:** *reached one instrument's words within the first session, and
answered one follow-up within fourteen days.* Not "signed up", not "completed
the map", not "sent a message to the guide". The second half is the one that
matters: it is the first time the product knows something happened.

**The front door promises the right thing.** It used to promise "your number".
It now promises the one place she is thinnest and the one thing to do about it.

## 3. The map

The map was a 0–100 readiness score with a counting ring, seven numbered bars,
and a growth badge. The weights were an answer key: the woman who answered most
honestly — returning to her deen, still healing, anxiously attached — scored
lowest, and then read that the score decided who she meets. The screen had to
apologise for this on its own face.

The map now names each of the seven grounds in a word — *thin*, *steady*,
*strong* — and derives its headline from the pattern. Growth is a diff of her
answers between readings ("last time: still healing; now: at peace with it"),
never a delta. Nothing numeric about readiness leaves the device: the cohort
store and the waitlist form carry what she named as hardest and what she has
done here, not how "ready" a self-report said she was. A retake is offered when
her life changes — a stage change, a conversation she confirms she had, ninety
days — never because she has done N steps.

## 4. The Guide

The Guide is the retention engine every doc used to name, and it is where the
category's incentives were most quietly present. Three changes:

- **It closes.** Every reply ends on a concrete action. The chips underneath are
  closers, not extenders: *copy the words*, *I'll say this — ask me in three
  days* (which writes a follow-up), *that's enough for tonight*.
- **It remembers outcomes.** A script handed over in the guide is a follow-up
  like any other. The product asks, days later, whether she said it.
- **It is budgeted by progress.** Replies refill when a rung is reached — a
  read, a follow-up answered, a stage change, a couple code, a vouch. There is
  no visible counter and no unlimited tier. When the budget is spent, the wall
  points at the instruments, not at a price.

## 5. Monetisation

**Principle: nothing we sell may earn more when a member is doing worse.**

**Free, forever:** the map and every reading, the work, the read, the eleven,
the two-sided eleven, the family words, the vouch, reporting and blocking,
being introduced, replying to anyone serious, and the guide within its budget.

**Bought once, ends on its own:**

1. **Deciding together** — per courtship: the joint conversation guide over the
   two-sided eleven, the family scripts, one call with a human matchmaker.
2. **Concierge matchmaking** — when a city opens. AI + a vetted human, the role
   our families already pay for.
3. **Events** — vetted, halal, family-friendly.

Founding members keep everything free for a year after launch. Prices are set
at launch; the mechanism is decided now and written into `src/data/plus.ts`.

**Never sold:** replies, a lifted counter, reach, visibility, who-liked-you,
filters, more introductions, or anything that protects her.

## 6. Metrics — what goes on the wall

Defined in `src/lib/rungs.ts`; the code wins over this document.

- **North Star: followed-through per hundred arrived.** How many people had a
  conversation they were not going to have.
- **Per city:** each rung reached — situated, mapped, read, eleven, asked him,
  he answered, vouched, counted, deciding, married.
- **Lagging outcome:** married per hundred arrived.
- **Counter-metric:** sessions per week, expected to *fall* after a rung.
- **Trust guardrails:** reported-safety incidents (near zero; reputation is the
  kill switch), vouch rate, women's share of the door.
- **Explicitly not measured:** DAU/WAU, time in app, replies sent, check-ins,
  introductions viewed, match count.
- **Beside each rung, what it was made of** (`src/lib/facts.ts`): the grounds
  in a word, the read's band and thinnest ground, counts of the eleven and
  the one to open, which conversation was confirmed, the three closed answers
  on the way out — every one an id from a closed list, never an answer in her
  words. The readout crosses each against whether she married. How those
  tables move the constants is `docs/OPERATING.md`.

## 7. When a city opens

The marketplace, when it exists, obeys the same rules as the instruments:

- **One introduction at a time.** The next arrives only after a yes or a no
  *with a reason*. A considered no is progress and is recorded; it is not a
  swipe.
- **Non-negotiables gate before anything is scored.** What she said she will
  not compromise on is checked first; the rest becomes "the first thing to ask
  him".
- **No percentage, no bands.** Three reasons, one place you differ, one
  question to open with.
- **What decides who meets whom:** the ledger (what she has actually done
  here), her non-negotiables, and how she'd live. Never a readiness number.
- **Never:** who liked you, interest limits, paid visibility, notifications
  about people.

## 8. The ending — the state this product is designed to reach

**Success is deletion.** Not churn dressed up: the actual designed destination
is a member who marries, is handed something worth keeping, is told plainly
that she can delete the app, and does. Every screen before it is built to get
her there sooner, and the ending is the only screen that exists to be the last
one anybody sees.

Worked backward, here is what had to happen and where each piece lives:

| What had to happen | Where it happens | What it leaves behind |
|---|---|---|
| Something hurt enough to open this | Welcome, the second door ("Is he serious?") | `arrived` |
| She said what was actually happening | Situation | `situated` |
| She got clear about herself | The map, the work | `mapped` |
| She saw what he had *done*, not said | The read | `read`, and a question to ask |
| Incompatibilities surfaced before the families | The eleven; the two-sided eleven | `eleven`, `asked-him`, `he-answered` |
| The trust barrier with her family came down | The family words; the vouch | `vouched` |
| The conversations actually happened | The follow-up | `followed-through` — the North Star |
| They decided | Stage: deciding | `deciding` |
| She married, and left | **The ending** | `married`, her record, four answers, one link |

**What the ending gives her, in this order and no other:** her record first
("how you chose", built only from things she really did, headed by the count
of conversations she had that she was not going to have); then permission to
go, said plainly; then the one thing only she can send; then, below all of it
and skippable, the four questions; then the optional ask, last.

**What the ending gives us — the only outcome data that will ever exist:**
- **Who she married.** Someone she was already talking to, someone her family
  brought, someone we introduced, or someone else. This single answer decides
  where the next year of work goes: it separates a marketplace that worked
  from instruments that helped a relationship that already existed. Today the
  honest expectation is that most marriages come from the second, which is
  exactly why the read and the eleven are the centre of the product and the
  marketplace is not.
- **What actually decided it** — seeing what he had done, one of the eleven,
  the families meeting, or getting clear about herself.
- **Which instruments were real** and which were decoration.
- **One line for the next person**, in her words.

Marriages are counted only when a person says so on the way out. Saying so is
free, unlocks nothing, and is never a condition of anything — the moment it
costs something, it stops being said, and the metric dies. The three closed
answers reach us under "Count me", beside her rungs; the line she writes for
the next person never does.

## 9. How it spreads

Assume advertising is expensive, founder hype is gone, and growth cannot be
brute-forced. In this community, nothing that says "I am looking" gets
forwarded — a profile, a match, a map. What gets said to a friend is about
*him*, about a *conversation*, or about a *couple*. So the product's outputs,
which are words a person can say, are the thing that travels, and the product
is the footnote.

Three loops, in order of strength:

1. **"I said the words, and something happened."** The moment a follow-up
   resolves to "we talked" is the moment worth telling someone. Home keeps the
   card for one more beat and offers one thing: send the words she just used
   to a friend who is talking to someone. Every script card carries the same
   send.
2. **The two-sided eleven.** Every use recruits a man onto his own phone with
   no account; the joint result is something a couple talks about with other
   couples, and his screen offers to send the eleven to a friend who is about
   to get engaged.
3. **The family words and the vouch.** Cross-generational: the aunties are the
   existing matchmaking network, and the vouch puts the product on a father's
   phone.

Three links open an instrument directly — `?read`, `?eleven`, `?families` —
with no Welcome and no account. Any link may carry `&via=` naming what kind of
link it was (words, eleven, couple, door, family, or married — a link from
someone this worked for) and never who sent it; it is the only attribution
recorded, first arrival wins, and the founder's readout splits every rung by
it. The two-sided eleven also adds each answered pair to a count of how pairs
come out per topic, with no pair in it, and a family vouch now lives exactly as
long as the map it was given about. The metric is **arrivals by source per hundred
followed-through**. Until the founding-preview gate comes off, every shared
link returns 401 to anyone without the password.

## 10. Roadmap

0. **Run the loop** — `docs/OPERATING.md`, monthly, from the first hundred
   records, within what `docs/LEARNING.md` allows. The moat is the process,
   not the constants.
1. **Your record** — everything this phone has sent, in Trust's words, with a
   retract on each item. The visibility half of Forget me.
2. **The first-year sheet** — the one instrument the married stage is still
   missing, and the thing the wedding gift sells. The eleven's engine over a
   second topic list.
3. **Live Claude behind the map** — `generateReflection` is the last local
   seam; the guide's function is the pattern.
4. **Real backend** — auth, persistence, real verification, moderation and
   reporting (safety is first-class).
5. **The city opens** — one introduction at a time, per §7, Minneapolis first,
   on the dormant introductions store `docs/LEARNING.md` designs.
6. **Concierge** — the human matchmaker, priced per person.
