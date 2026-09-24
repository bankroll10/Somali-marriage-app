# Niyyah — the product

What Niyyah is, who it is for, what it measures, what it may claim and sell,
and what comes next. Where this page and the code disagree, the code wins: the
ladder is `src/lib/rungs.ts` and the readout is `netlify/functions/progress.ts`.

On 2026-09-24 the product was cut to its core. There were no members and no
city pool, so the door, the pool readout and matching gate, the sample
introduction, the family vouch, Profile and Plus were removed. Git keeps all
of it, and `docs/DECISIONS.md` says where.

## 0. What Niyyah is

**The problem: finding out too late.** Somali singles in the diaspora lose
years to people who were never serious, and enter marriages that break over
things nobody said aloud. The questions that decide a marriage (where you would
live, money sent home, his family in your home, a second wife, qabiil, whether
he has ever said the word *marriage* without being asked) get answered after
the families are involved, when saying no has stopped being a private decision
and become a public cost.

**The purpose.** The conversations that decide a marriage happen before the
yes, and the one about seriousness happens in the first month, not the sixth.
Families come in by invitation, not ambush.

> **Every screen exists to move one person from finding out late to saying it
> early.**

Niyyah is a set of instruments for a relationship a person already has: a read
of what he has done, the eleven conversations before a yes, the words for the
family. Each ends in words she can say, and a few days later the product asks
whether she said them. It is a web app. It opens from a bare link with no
account, and what she tells it stays on her phone unless she keeps it on our
server under a code.

**Why anyone would open it.** A marriage product has the category's paradox:
success is churn. A daily check-in, a streak or a milestone is the dating-app
loop with softer copy. So Niyyah is opened when something happens, and it is
measured by what happened afterwards. There are two reasons to open it:

| Reason | Surface | Ends in |
|---|---|---|
| **Something happened** | The ask box and moment chips on Home, routed to the guide; the read; the eleven | Words to say, and a follow-up written down |
| **Since last time** | The follow-up on Home, or on Welcome for someone with no Home | "We talked", "not yet" or "it went differently", and the record moves |

Everything else on Home is quiet: the stage band (where she is, changed only by
her) and the doors to the instruments for her stage.

## 1. Who it is for

**Her.** A practising Somali woman in the diaspora, 24–34, is structurally
unserved. Hinge and Bumble make her a minority in a marketplace built for
casual dating. The Muslim apps are low-trust and full of men who are not
serious. The aunties have a small network and heavy judgement; the masjid has
no mechanism. Call her Hodan: 27, Columbus, a nurse, prays, wants children in
the next few years, three failed talking stages, a mother who asks every week.

**Women first, and that is not negotiable.** If she feels safe, seen and
respected, men follow. If she does not, no feature set saves the product.

**Him.** The serious diaspora man, 26–36, arrives through her: she sends him
the eleven, or a read tells her what he has not shown and he answers his own
side. He is never charged for reach. His jobs are still written in her words:
nothing yet tells a man, on the screen her link opens, why answering serves
him (§10, item 5).

**Not for** the casual dater. A serious person wants the unserious filtered
out. Under "find someone to marry" sit, in order of depth: peace over anxiety,
dignity, agency, being understood without translating, and hope with someone
beside you. Niyyah does not sell any of these. It hands over words.

**The jobs, by stage.** Jobs-to-be-Done, every cell a HYPOTHESIS until the five
sessions (R1) test it.

| Stage | The job | What answers it | Reading |
|---|---|---|---|
| Preparing | Handle the family pressure; know what I want; find anyone serious | The moment "My family is pushing", the family words, the map. Finding someone, it cannot do | The map answers the stage's weakest job: nobody's life fires "assess my seven grounds" |
| Talking | Know whether he is serious before investing more; the one thing to ask next | The read: about ninety seconds at a stable URL, ending in words | The sharpest job in the product |
| Deciding | Have the eleven conversations before the families lock the outcome | The eleven, the two-sided sheet, the family words, the printed guide | Second strongest, with a second customer: the nikah coordinator |
| Married | Pass on what worked without it sounding like advice | The Ending's one share | Mostly the company's job, and labelled so |

Welcome's second door, "Talking to someone? Get a read.", sits beside the first
because the read answers the highest-pain job, for the person who already has
someone. Verdicts that stand: **clear**, the read, the eleven, the two-sided
sheet (clear for her, unexamined for him), the printed guide, the family words,
the four moments, the guide, Report a concern, Forget me; **thin**, keep and
restore, the map, Home; **the company's**, the follow-up, the ladder and
readout, the Ending. A verdict changes only on evidence from a person, never on
a build.

### The institution rule

Nothing that would need renaming for a second community carries a community's
name. The product is Niyyah, an intention, not "the Somali app", and a
community's content (its cities, its countries, its eleven, its lines) lives in
`src/data/` as data. The brand strings live in `src/data/brand.ts`:
`vite.config.ts` fills `index.html` from it at build time, the manifest is held
equal to it, and `tests/brand.test.ts` holds every surface to it. The rule is
enforceable by test for the brand strings only. The instruments' own copy still
names the community in BeforeYes, Couple, Home and Read, as content; a second
community gets a second `src/data`, not a rename. The eyebrow and the title
name the community on purpose, because being findable is table stakes.

Why it exists: Somali-only, the business has a ceiling. There are on the order
of 20,000 Somali diaspora marriages a year (asserted, not derived; the rate
should be sourced in the conversations). Even at a fifth of them and $3,000 to
the company a marriage, that is about $12M a year. Reaching ~$100M needs a
population five to ten times larger, such as the Western Muslim diaspora at
300–400,000 marriages a year. The rule costs nothing today and keeps that
second target reachable. The endgame is the trusted relationship institution
of the diaspora, "the modern wali": Somali first, then the broader Muslim
diaspora, then other marriage-minded communities.

A second move made for the same reason, while it cost nothing: a version `v` on
every stored member record (`netlify/shared/record.ts`,
`tests/record-version.test.ts`), added while there were zero records to
migrate, so that any later change of shape, or a move to a real database, is a
transcription rather than an archaeology.

## 2. The loop, and the instruments

The loop is what makes Niyyah different:

1. a read, or the eleven;
2. the words;
3. did you say them?
4. where did you land;
5. the two of you, blind;
6. the Ending.

| Instrument | The job | Ends in | Where |
|---|---|---|---|
| The read | "Is he serious?": what he has done, not said. Eleven questions | The one question to ask next, word for word | `src/lib/read.ts`, `src/data/read.ts`; `/tools/is-he-serious`, `/tools/is-she-serious` |
| Before you say yes | The eleven conversations found out too late | The one to open this week, and the words | `src/lib/beforeYes.ts`, `src/data/eleven.ts`; `/tools/before-you-say-yes` |
| The two-sided eleven | He answers on his own phone, no account; neither sees the other's sheet | Where they match, and the one to open together | `netlify/functions/couple.ts` (`joint()`, symmetric by construction), `src/components/Couple.tsx` |
| The family words | The wali, hooyo, mahr, two families meeting, the in-laws after the nikah, ending it kindly | Word for word, for his side or hers | `src/data/families.ts`; `/tools/families` |
| The map | Where she stands, in words | The grounds named; it feeds the guide and her side of the eleven | `src/data/intake.ts`, `src/lib/reflection.ts` |
| The guide | The moment, in the right voice | Words, and a follow-up | `src/lib/coach.ts`, `netlify/functions/guide.ts` |
| The follow-up | "Did you say it?" | The record of what happened | `src/lib/followup.ts` |
| The Ending | Married, and leaving | Her record, one share, Forget me | `src/components/Ending.tsx` |

Beside them: Report a concern (`netlify/functions/safety.ts`, read weekly by
the founder) and a help line chosen by her country, on her phone
(`src/data/help.ts`). Nothing above is a feed, a score or a ritual.

**Getting in.** Welcome → Identity (gender, first name, 18+) → Situation
("what's happening right now") → the instrument for that stage. Preparing goes
to the Hook and the map; talking to the read; deciding to the eleven; married
to the Ending, or to the guide once she has one. Three query links (`?read`,
`?eleven`, `?families`) and four tool paths (`src/data/tools.ts`) open an
instrument directly, with no Welcome and no account. A read or an eleven
finished with nothing else said is taken as `talking` or `deciding`
(`src/lib/inferStage.ts`), so the read-first person has a Home and is asked her
follow-up; until 2026-09-12 the North Star read zero for her by construction.
The read's chooser is folded into its two start buttons, so a forwarded link
explains itself before it asks anything.

**Activation**: reached one instrument's words in the first session, and
answered one follow-up within fourteen days. The second half is the first time
the product knows something happened.

**The follow-up.** Every result writes down what it told her to do, and says so
under the words. The next time she opens Niyyah after three days, it asks once.
"Not yet" is asked once more a week later unless she puts it away. In a pair,
both phones are asked about the same conversation, the joint's: his phone
keeps the code and the joint he was shown (`couple.side = 'second'`), so his
Home knows there is a pair. `tests/invariants/the-loop-closes.test.tsx` holds
all of it.

### The map

The map was a 0–100 readiness score with a ring and numbered bars, and its
weights were an answer key: the woman who answered most honestly scored lowest.
It is now sixteen questions, one optional, and seven grounds. Four are rated in
a word, *thin*, *steady* or *strong*: intention, character, steadiness and
knowing yourself. Three are positions, faith, family and vision, described in
her words and never rated (§7, S5). Growth is a diff of her answers between
readings ("last time: still healing; now: at peace with it"), never a delta.
A retake is offered on revisits ("Something changed — answer again") and never
nudged. Nothing numeric about readiness leaves the device, and the map is built
on her phone with the network off (§4).

### The guide

- **It closes.** Every reply ends on an act. The chips are closers, not
  extenders: copy the words; "I'll say this — ask me in three days", which
  writes a follow-up; "That's enough for tonight".
- **It remembers outcomes.** Words handed over in the guide are a follow-up like
  any other.
- **It is budgeted by progress.** Fifteen replies for each rung reached and each
  follow-up answered (`src/lib/budget.ts`). No counter on screen and no
  unlimited tier. When the budget is spent, the wall points at the instruments,
  because they are what refills it.
- **Four voices:** the auntie, the brother, the therapist and the islamic voice.
  The Matchmaker went on 2026-09-24; its four real answers moved to the auntie
  and the brother.
- **On in production, deliberately (2026-09-10).** The recommendation had been
  to leave `ANTHROPIC_API_KEY` unset and make A3 argue the model on. The founder
  declined, and the guide stays on. What makes that safe: Trust names Claude and
  Anthropic, says what is sent, and offers "Keep the Guide on this device",
  which answers offline and sends nothing; and `GUIDE_DAILY_CAP` bounds the day
  as well as the hour, because an hourly cap resets 720 times a month. Both caps
  fail closed (R5). A3 still governs: if fewer than one in five who reach an
  ending name the guide, the live half goes (`docs/RESEARCH.md`).
- With no key, a cap met or the route unreachable, the local voice in
  `src/lib/coach.ts` answers. The offline and live evals are
  `docs/GUIDE-EVAL.md`.

### The Ending

**Success is deletion.** A member who marries is handed something worth
keeping, told plainly that she can delete the app, and able to. In this order
and no other: her record ("how you chose", built only from what she did, headed
by the count of conversations she had that she was not going to have);
permission to go; the one share only a married person can make; then,
skippable, three closed questions and one line for whoever is where she was;
then Forget me, the same component as Trust's (`src/components/ForgetMe.tsx`).
Forget me is there because "you can delete the app" was not true while the kept
map, the couple sheet and the step count outlived the uninstall.

The three questions are the only outcome data this company will have: who she
married (someone she was already talking to, someone her family or community
brought, someone met another way), what decided it, and which instruments were
real. The closed answers travel with her rungs; the line she writes never
leaves her phone. Marriages are counted only when a person says so on the way
out, and saying so is free, unlocks nothing and is never a condition. The
Ending asks for nothing (§5).

Married Home goes quiet: the words for two families and the guide for the
first year stay, Trust stays linked, and nothing is offered for sale. A
courtship that ends has its own screen, Ended, which says first that ending is
allowed.

## 3. The North Star, and how it is read

**`followed-through` per hundred `arrived`**: of everyone who opened this, how
many had a conversation they were not going to have. It is reach times
magnitude, and nothing moves it that does not help a specific person say a
specific hard thing. Every hard thing said early is one not found out late.

**How it is read.** The founder's readout (`/progress`,
`netlify/functions/progress.ts`) returns `cohorts`: for each month people
arrived, `{ arrived, followedThrough }`, where `followedThrough` counts those
who have followed through since. The North Star is `followedThrough / arrived`
on two rows, this month against last. It is whole-population, like `rungs`, so
it is never floored. It replaced a count of arrivals by day, which could not
say it: a conversation had in October by someone who came in September had no
row to be divided by. The numerator is written only by the follow-up; the
guide's own follow-ups are kept out of `facts.through`. How to pull the readout:
`docs/OPS.md`.

**The test for any screen**, in two questions: does it help someone find out
earlier, and does it end in something they can say?

| Screen | Verdict |
|---|---|
| Read, BeforeYes, Couple, Families and ScriptCard | Core: each ends in words |
| The follow-up (`home/FollowUp.tsx`) | Core: the North Star itself |
| Ending, Ended | Core: the exit, and why courtships end |
| Trust, ForgetMe, ReportConcern | Core: trust and safety |
| Situation; Home's ask box, moment chips, read card and stage band | Core: routing by stage |
| Welcome, Intake | Were weak; strengthened (below) |
| Hook, Identity, Reflection, the guide | Aligned |
| KeepMap, RestoreMap | Infrastructure, aligned by being invisible |

The decisions this test made, which the code cites:

- **Welcome's lead promises the routing, not the map.** It used to promise the
  map and put the read in a card at the bottom. It now says: say what is
  happening, and we start there, with a read, the eleven, or two minutes on
  where you stand. The pull-quote beneath it became the thing every instrument
  ends in: the thing to say next.
- **The intake's three marriage-breakers moved in.** Five of the thirteen
  questions reached no conversation, while `household`, `work` and
  `money-home`, the things Somali marriages break on, sat behind a screen she
  might never open. They moved into chapter two, "the life you want"; thirteen
  became sixteen (`src/data/intake.ts`). The eleven now shows "You told your
  map…" beside where you'd live, whether you'd work and money sent home. If A1
  fires (completion under 50% at twenty arrivals), the chapter kept is the one
  with these three in it.
- **The daily reflection card was removed** from Home, with its share-as-image.
  It helped nobody find out anything earlier and ended in nothing they could
  say, and a daily ritual is on §6's never-built list.
- **"Readiness" left every label a member reads.** It is "your map", and two
  grounds became "Steadiness" and "Knowing yourself".
- **The eleven alone, for the preparing person, was declined.** Every question
  is "have the two of you talked about this?", which a person with no "two"
  cannot answer. Her own answers on the three topics come from the map instead.

## 4. What survives a copy

> **If every competitor copied our homepage tomorrow, what would still make
> Niyyah different once someone uses it?**
>
> Copy the homepage and you copy a list of promises: Somali, serious, faithful,
> family-minded, private. Use Niyyah and it does something else. **It works on
> the relationship you already have.**
> - With no account, it tells you what he has done rather than what to feel.
> - It gives you one conversation and the exact words for it.
> - A few days later, it asks whether you had it.
> - It puts the same eleven questions to him, on his own phone, blind, and
>   shows the two of you only where you stand.
> - When you marry, it lets you go and takes itself off our server.
>
> A marketplace's unit is a match, and it is paid while you look. **Ours is a
> conversation that happened, and we are paid when you stop needing us** (§5).

Every competitor can now claim Somali-specific, marriage-first, wali and
family, verification, photo privacy, compatibility, deen filters, timelines,
relocation, qabiil-awareness and no swiping. The words can be copied in a
month: the repository is public. The mechanism can be copied only by giving up
what a marketplace runs on:

| Structural difference | Why it is hard to copy |
|---|---|
| The instruments open from a bare link, with no account and no install | An app-store funnel is an account funnel. Serving someone who never signs up is revenue lost |
| They serve a relationship that began elsewhere: a wedding, a cousin, another app | A marketplace serves its own inventory; helping her decide about a man met elsewhere sends her out of its funnel |
| The two-sided eleven reaches the man on his own phone, blind, with no account | He is not a customer and may never be one. A feature for a non-customer that reveals nothing has no growth case |
| It asks whether the conversation happened | They measure sessions, likes and matches. A conversation off the app is invisible to them |
| The Ending: "you can delete the app", and Forget me on the same screen | Subscription revenue depends on the member staying |

Each part exists elsewhere in some form. The whole loop, run on a relationship
the product did not create, does not.

**Where each thing sits.** FACT means true of the code; HYPOTHESIS, untested.
Real member evidence is zero, so every claim about users is a hypothesis.
- **Table stakes, had:** marriage-first and no swiping; no photos anywhere;
  faith and family in the frame; Somali cities (`src/data/scenes.ts`);
  timelines. **Below table stakes:** identity verification is an 18+ tap, and
  there is no family verification since the vouch went. Verification stays
  there while nobody is introduced: there is no one to verify against, and
  building it would collect identity documents with nothing to protect.
- **Differentiators, copyable:** no number on a person; the read as a
  behaviour instrument; family words as sentences rather than a "wali mode";
  the eleven's content (qabiil as "will a family raise it", money home, a
  second wife, going back); printed sheets for imams and nikah coordinators,
  one of them in Somali (`docs/ASSETS.md`); no permission prompt before value.
  The guide in four voices is the most copyable thing in the product.
- **Signature:** decision support for a relationship that began elsewhere; the
  two-sided eleven; follow-through; words to say (`src/components/ScriptCard.tsx`,
  `src/lib/words.ts`); successful deletion.
- **Compounding, none yet:** outcome-calibrated constants (the revisions log is
  empty); where pairs diverge (`tallies/joint`, zero pairs); why courtships end
  (`facts.ended`, zero endings); the married referral (`via=married`, zero
  marriages); the institutional channel (sheets sent, none answered).

**Fake complexity.** Every file in `src/data/` ships to every browser in
plaintext. The read's weights and the eleven's `consequence` numbers are
hand-set constants a copier sets for himself. The system prompt and the model
are commodities. None of it is defended.

**The moat is the monthly loop run against the readout** (`docs/RESEARCH.md`).
A copier gets the constants as they were on the day they copied them; this
product gets the next revision. So every legitimate user strengthens at least
one compounding asset, recorded as an id from a closed list, never an answer in
her words and never a name:

| Action | What reaches us | What it compounds |
|---|---|---|
| Arrives through a link | `arrived` and the kind of link | The referral network |
| Builds her map | `mapped` and each rated ground in a word | What this community is thin on |
| Takes a read | `read`, the band and the thinnest ground | What men here have typically not shown |
| Does the eleven | `eleven` and the one to open | Compatibility knowledge |
| He answers on his phone | `he-answered`; the pair's joint per topic, in a count with no pair in it | The one dataset no single member could give |
| Says "we talked" | `followed-through` and which conversation | Which words get said |
| A courtship ends | Its stage, the reason, which topic | Why courtships end |
| Marries, and leaves | `married`, who, what decided it, what was real | Successful-match history |

**What a model may do.** The need underneath the product is older than any
app: Somali singles want compatible partners and marriages that last, reached
without losing dignity, faith, time or peace. It names no model and no feed.
So the rule:

> **A model may add a layer on top of something the product already does
> completely without it. It may never be the thing that produces the map, the
> read or the eleven. With no key set, a member loses a better sentence — never
> an instrument.**

Live-model code lives in two files, `netlify/functions/guide.ts` and
`src/lib/coach.ts`, and `tests/durable.test.ts` asserts that nothing else calls
a model and that the map builds with the network off. A model behind the map
was once on the roadmap as "the last local seam"; it is declined, because the
map is computed on her device from a question set we own and must not fail when
a supplier does. "Powered by AI" is gone from every surface, and
`tests/voice.test.ts` keeps it out: it dates the product and makes a supplier
the reason to exist. Trust still names Claude and Anthropic, because telling a
member where her words go is a disclosure, not a claim. The share sheet is
named by its mechanism, `navigator.share` (`src/lib/share.ts`), not by this
year's apps: no SDK, no pixel, no vendor. Reach that was not earned can be
withdrawn by someone who has never spoken to this community, so none is bought.

What lasts: the eleven, the seven grounds, the read, the words that travel, the
Ending and the first-year sheet, the charter (no photos, no messaging, no free
text on the server, no attention traces), the learning record, and the
founder's own hands.

## 5. What may be sold

**Principle: nothing we sell may earn more when a member is doing worse.**
Revenue must not scale with anxiety, time in the app, or how long someone stays
single. The company is paid when a member moves forward, once, at a step
forward, and never for keeping her where she is. Run the test on every line:
does it earn more if she stays single longer, opens the app more often, or is
having a worse night? If yes, it does not ship.

**The state today (FACT).** There is no payment code: no SDK, no checkout, and
no way to record that someone would pay. There are no real members. The
founder does every human job alone.

**No gate has passed.** Until one does, nothing here gets payment code.
`tests/monetization.test.tsx` fails if a payment SDK appears in `package.json`,
and it reads this page for that sentence.

**What she is promised**, on Trust, and held by `tests/monetization.test.tsx`:
- "Everything here is free. Nothing that protects you is ever paid, at any
  price."
- "Nothing is priced by the reply, the message or the month, and staying single
  never earns us more."
- "We will never sell your data, and never charge you without asking first."

Free, forever: the map and every reading, the read, the eleven and the
two-sided eleven, the family words, Report a concern, Forget me, and the guide
within its budget. **Never sold:** replies, a lifted counter, reach,
visibility, who-liked-you, filters, or anything that protects her. Women may be
given more for free; nothing is sold to either side that the other is not.

### A. The lines, and the eight questions

Each line is asked who pays, when, what value already exists, what exactly is
bought, whether it earns more if she stays stuck, whether it can be delivered,
its margin and its support burden. Hours are assumptions until the first ten
of each replace them.

| Line | Who pays, and when | Earns more if she is stuck? | Delivery and margin |
|---|---|---|---|
| **Talking it through, with a matchmaker** (the call; was "Deciding together") | The couple, once per person for life, after both have seen the joint view of the two-sided eleven (rung `he-answered`). Never at the stage she declares: `deciding` is a free, measured word (`docs/DECISIONS.md` decision 16) | No. Once for life, so a second courtship's call is free; paid before the decision and the same whatever they decide | About 1.5 founder hours: the call, reading the joint view, booking. $99 less $3.17 in fees, about $64 an hour |
| **The first year married, as a gift** | A guest, at the wedding. The couple are never sold to | No. Bought once by someone else, before anything has gone wrong; never sold on "if things get hard" | A sheet with no running cost once written. $79 less $2.59. **It does not exist yet** |

The prices are a prediction written on 2026-09-11, so that a checkout tests a
belief rather than reacting to a room. No price appears on any screen.

- **A matchmaker in your corner**, a fixed fee paid by the families at the
  nikah, went with the marketplace on 2026-09-24: it paid for introductions,
  and nobody is introduced here. So did the free year promised to everyone
  counted before their pool opened. Git keeps both (`docs/DECISIONS.md`).
- **Sponsor a place: retired.** "Pay for the next woman's place", where places
  cost nothing: money with no stated use, on the one screen a marriage is
  reported from. Removed from `src/data/ending.ts` and
  `src/components/Ending.tsx`. If it returns, it returns as something that
  exists (paying the next couple's call), with a stated use and its own gate,
  and never on the Ending.
- **Events: struck.** A ticket per event earns most from whoever stays single
  and keeps coming. An event may return only free to members, or paid once and
  not per attendance, with its own eight answers.
- **Niyyah+: retired, kept as the counter-example.** A monthly plan whose one
  feature was "your guide, without a counter", paid most by the member having
  the worst night. Every line is checked against it.

**A payment never buys a say.** Not visibility, data, a timetable, or a claim
on what she told us, whoever pays. Nothing is prepaid.

### B. The gates: what must be true before anything is sold

**The call.** Only the call is sold, under its own name; it is offered only
after both have seen the joint view, never as a way to see it; and the person
on the call has no stake in the answer.
1. **Delivery.** The founder gives the call free to the first five couples who
   reach the joint view and ask. At least 3 of 5 say it changed what they
   talked about, no couple says it pushed them, and hours per call are written
   down.
2. **Demand.** At least 10 couples reach the joint view in one month (`/progress`
   `he-answered`).
3. **Price.** The call is offered by hand, with a hosted payment link, to ten
   couples, and at least 3 buy at the written price. This step waited for
   public launch, defined as the day the first pool opened. With no pool, no
   launch day is defined, and one must be written before this step runs.

**The gift.** The first-year sheet is written and given free to the first
married couples; at least 2 say it helped, in words the founder can quote; and
someone asks, unprompted, to give it to somebody else. Then a hosted payment
link delivers the sheet to the buyer, who hands it on. Gift code comes only
past 10 sales a month. The price waits on the same undefined launch day.

### C. Payment identity

Niyyah promises no email and no phone; a code is the only identity it holds. A
card payment carries a name, an email, an address and a card.
- Payment records stay with the processor. Nothing about a payment is written
  to Blobs, `/export` or the learning record.
- Nothing bought is delivered by her map code. A payment never asks for a code,
  and the founder never looks up a buyer's map.
- Trust gets one sentence in the commit that takes the first payment: what a
  payment reveals, and to whom.
- An entity, terms of sale, a refund policy, and a mailbox on the domain that
  answers, before the first link goes live. Tax (a merchant of record at about
  5%, or an accountant) is decided with an accountant, not on this page.

### D. No payment infrastructure: the decision, and when it changes

**Nothing is built for payments until a gate in section B passes.** A price in
a document is not a reason to build. When a gate passes, money is first taken
by hand, through a hosted payment link. Code comes only when collecting by
hand is the bottleneck, at about ten transactions a month for a line; that
commit deletes the "No gate has passed" sentence above and changes
`tests/monetization.test.tsx` in the same change. Nothing in the app asks
whether someone would pay: no "notify me when it launches", no price test, no
interest button. What someone would pay is learned in conversations
(`docs/RESEARCH.md`), where a person can say why.

### E. The incentive audit

Every sentence on every screen that names a paid stage, a price or money is
read against the test above, and checked for truth. The first run (2026-09-24)
fixed every fail it found; most were on Plus and Profile, which have since
gone, and one was the Ending's sponsor-a-place. `tests/monetization.test.tsx`
holds what remains: Trust's promises, with no price shown; the guide never
sells (no voice mentions a payment, a price or an upgrade), because the day it
says a human one costs money, the advice is a funnel; the Ending asks for no
money; and `package.json` carries no payment SDK while no gate has passed. The
audit reruns at every release that touches a paid line, a price, or a screen
that names one, and a new run adds its rows under a new date.

### F. Kill criteria, stated before the data

| Line | Killed or repriced if |
|---|---|
| The call | Fewer than 3 of the first 5 free calls change what the couple talked about. Fewer than 3 of 10 buy. Any couple says the call pushed them toward an answer. Calls average over 2.5 founder hours: repriced or stopped, not squeezed. Courtships that had the call end from `deciding` at a sharply different rate from those that did not, in either direction, and the conversations say why |
| The gift | Ten married couples use the sheet free and nobody asks to give it |

## 6. What we measure, and what we never build

Every dating app is judged on screen time, messages and swipes, and every one
of those goes up when a person is stuck. So the only measurement here is a
ladder of rungs, each a claim about a person's life rather than about her use
of an app (`src/lib/rungs.ts`): `arrived`, `situated`, `mapped`, `kept`,
`read`, `eleven`, `asked-him`, `he-answered`, `followed-through`, `deciding`,
`married`. The readout counts each rung on its own; it is not a funnel. `kept`
is its own rung because a woman who built a map and stopped, and one who kept
it, are two different failures with two different fixes; before the rung they
were the same number.

- **North Star:** `followed-through` per hundred `arrived`, by arrival month
  (§3).
- **Lagging outcome:** `married` per hundred `arrived`.
- **Distribution:** arrivals by source per hundred followed-through, from `vias`
  (§9).
- **Beside each rung, what it was made of** (`src/lib/facts.ts`): the rated
  grounds in a word, the read's band and thinnest ground, the eleven's one to
  open, which conversations were confirmed, why a courtship ended, the three
  closed answers on the way out, which questionnaires she began, and whether
  she ever asked the guide. Every value is an id from a closed list; the type
  has no field that could hold a sentence. The readout crosses them against
  whether she married (`marriedBy`).
- **The controls.** All of it travels only while Trust's "Tell us which steps
  you reach" (`countMe`) is on, under an install code that cannot be joined to
  her map code. Every split by a quasi-identifier is floored at five
  (`netlify/shared/floor.ts`); whole-population counts are not. Field by field:
  `docs/PRIVACY.md`.
- **No counter-metric is recorded.** Sessions per week should fall after a
  rung; nothing counts sessions, by the rule below.
- **Never measured:** daily or weekly active users, time in app, replies sent,
  threads opened, check-ins, match counts.

**Never built, by name.** This list is meant to outlive the codebase. Anyone
should be able to reject a proposal by pointing at a line.

- A score on a person, hers included. Grounds are named in words.
- A feed, a deck, or a swipe.
- A daily ritual, a streak, a milestone counter, a comeback nudge.
- "Who liked you", interest limits, or paid visibility.
- Filters as a paid tier.
- A counter for guide replies that the member can see, or an unlimited tier.
- Photos, and messaging between members.
- A profile before there is a room to show it in.
- Notifications about people.
- A referral reward, an invite counter, or share-to-unlock. Sending words to a
  friend earns the sender nothing, and no one is told how many they sent.
- A link that carries who sent it. Links carry what kind of thing they are.
- Any mechanic whose success is measured by its own repetition.

The dating-app mechanics are the default in this category, and they came back
into this product once already without anyone choosing them. That is why this
list exists.

## 7. What an instrument may claim

The evidence behind every number in the instruments is none. No introduction
has been made and no marriage has come out of this product, and the literature
(Finkel et al. 2012; Joel et al. 2017) says no algorithm predicts relationship
success from self-reports. Every weight is editorial. That is fine for an
order, because something has to be read first. It is not fine for a grade.

1. **A number may order what is shown. It may never grade a person or a pair
   to them.**
2. **"Not known" is said, never scored.** An honest "unsure" or an unanswered
   question is neither the same nor different.
3. **No screen claims predictive power.** `tests/voice.test.ts` scans `src/` for
   the overclaims: "predict", "carry the most weight", "most couples never",
   "rarer than you would think", "Grounded and ready", "we'll look for
   someone", "will find you someone". The guide may say that nobody can predict
   a marriage.

### S3. The read's weights and bands

Before: `WEIGHTS` public .26, intent .21, consistency .20, pressure .19, family
.14, summed into `overall`, with bands at ≥ .72 (and public ≥ .6) and ≥ .45. It
could call a man "strong" who pushed back on her non-negotiables and goes quiet
on hard things, and it told her he had shown "the things that predict it".
**Removed.** The band is read from the five states on her screen: **strong**
when being known is *shown*, nothing is *not yet*, and four of five are
*shown*; **thin** when more are *not yet* than *shown*; **mixed** otherwise.
The gap to script is the lowest state, ties broken by `PRIORITY` (public,
pressure, intent, family, consistency): an editorial order, stated as an order
(`src/lib/read.ts`). The copy says it is "a summary of your own answers — not a
verdict on {him}, and not a prediction".

### S4. The read's option weights and `stateOf`

Option weights run 0–1; `stateOf` cuts at .7 and .35; an answer counts as shown
at ≥ .7. Editorial: which answer shows more of the thing. **Kept, as an
ordering of answers**, shown as three words and her own notes. An answer that
says nothing about him, such as "I have not told {him}" (`nonneg: 'untold'`),
has weight `null` and is not scored; it used to count as 0.5, which dragged
"defensive, but comes back" under the line. The man's variants (`ManVariant`
in `src/data/read.ts`) stay, because the road is not symmetric.

### S5. The map's grounds

Before: weights on practice, faith's role, family's role, children and
timeline, and headlines such as "Grounded and ready". These answers are
positions, not readiness. It told a Muslim whose faith is private that faith
was her thinnest ground: a religious and cultural verdict the guide is
forbidden to give. **Removed for positions: a position is described, never
rated.** Faith, family and vision have no state. They read "Your position", in
her words, and their options carry no weight; timeline carries none. The four
rated grounds alone decide the headline ("On steady ground", "Steady, with
clarity to gain", "Building your foundation", "Early, and honest about it") and
which ground is thinnest, and the learning facts record no state for a
position (`src/lib/reflection.ts`, `src/data/intake.ts`, `src/lib/facts.ts`).

### S6. Before-you-say-yes and the couple joint

Each topic's `consequence` (.6–.95) and `STATE_URGENCY` order which
conversation to open first, shown as "the one to open this week". Editorial:
`ended.which` exists to find out which topics bear weight. **The order is
kept, because something has to be opened first. No difference is light.** A
top tier at .8 used to tell a couple who differed on qabiil (.7) or going back
(.65) that theirs "isn't the ones that carry the most weight". A difference is
now counted in words ("One conversation doesn't line up yet"), whichever topic
it is (`src/lib/beforeYes.ts`).

**Gone with matching on 2026-09-24:** the gate's rules G1–G8, the weighted fit
and its thresholds S1–S2, and the pool's assumptions U1–U4 and U6. Git keeps
them (`docs/DECISIONS.md`). **Still standing:** U5, `K_FLOOR` 5
(`netlify/shared/floor.ts`), a privacy control rather than a claim; and U7, the
read's per-answer weights, the weights on the four rated grounds, and
`consequence`, editorial orderings labelled as such, never summed across
dimensions and never shown as numbers.

**What would earn authority back.** Nothing here learns on its own. After
twenty endings, `ended.which` shows which of the eleven courtships end on; then
`consequence` can be revised by hand, and a headline may one day say which
conversation matters more, citing that count. A community line on the joint
view ("of the N pairs who answered here…") waits the same way: at one pair it
is that pair's own joint, and the tally is not floored. Conversation prompts
claim nothing about outcome, and all of them stay: the read's scripts, the
eleven's open-first and scripts, "open with a place your answers differ".

## 8. The risk register

Every system was held against Marty Cagan's four risks (value, usability,
feasibility, viability) on 2026-09-17. The rule: "already built" is not
evidence of value. Evidence is a person, not the founder, choosing the thing
and doing something with the result, and by that rule the product has none
yet. No product system rated STRONG. Of the systems rated UNNECESSARY, the
vouch, the pool readout with the sample introduction, and Plus were deleted on
2026-09-24 with the door, which was rated AT RISK; the Ending stayed, as the
loop's last step.

Five risks hid behind green tests and a working deploy. A risk is struck
through, never deleted, with the date it closed.

| Id | Risk | The rule in the code that answers it |
|---|---|---|
| **R1 · Value** | The product has never been chosen by anyone | No code. Five moderated sessions on `docs/PROTOCOL.md`'s script: hand over the phone at `/tools/is-he-serious` or `/tools/is-she-serious`, say nothing, watch, ask the after-questions, and count three days later who reports a conversation. Two or more of five report a specific conversation: the read and the eleven lead every post. Zero: nothing new is built until the founder understands why the words were not said. Entries go in `docs/RESEARCH.md` |
| **R2 · Usability** | The result is a wall and Home is a menu: the read's result had 593 words and eight calls to action | `src/components/Read.tsx`: the result keeps the band, the one question and two actions (the words to send, and the eleven, or the family words after a caution); the rest sit behind one disclosure, "More you can do here". Home's stage band no longer repeats the cards above it |
| **R3 · Feasibility** | Screens promised an outcome the code had no mechanism for ("the day someone fits your map, we write to you") and held the only personal data on that promise | The promises became the present-tense truth, and `tests/voice.test.ts` fails on them ("we write to", "you will hear from us", "when your city opens", photos shown, "conversation opens", "and blocking"). The weekly sweep, `netlify/functions/sweep.ts`, makes every stated lifetime true without a person remembering: kept maps past their year, couple sheets past ninety days, step counts past their year unless `married`; and it empties the retired `cohort`, `contacts` and `vouches` stores |
| **R4 · Viability: safety, privacy, legal** | Forget me could erase the other side's safety report, and the public tools had no notice | Forget me touches no report: a report stays until the founder resolves it (`netlify/functions/keep.ts`, `docs/SECURITY.md` O1). The own-side filter first built for R4 read the side from what the caller sent, so the reported man could still erase her report. Trust is one tap from both public tools, and Back returns to the tool (`Read.tsx`, `BeforeYes.tsx`, `src/hooks/useNiyyah.ts`). `CONTACT_EMAIL` (`src/lib/site.ts`) is on Home and in Forget me |
| **R5 · Viability: cost, supplier** | The only route that spends money failed open | `overCapOrUnknown` in `netlify/shared/limit.ts`: the guide checks the day, then the hour, and a count that cannot be read is a refusal. The member gets the offline voice either way. Storage routes still fail open. The Anthropic console spend limit is the founder's, and its row in `docs/OPS.md` is blank until it is set |

**Standing risks.**
- **Reputation.** One safety incident in a tight community can end this;
  reputation is both the growth engine and the kill switch. Safety is a
  first-class product. The dormant close switch,
  `netlify/edge-functions/gate.ts`, shuts every route within one deploy.
- **Monetising something sacred.** Get the tone wrong and Niyyah becomes the
  "corny Muslim app" it defines itself against.
- **Drift** back to the category's mechanics (§6).
- **Gender balance.** Over-index on women's trust, always.
- **Re-identification.** People who know each other can recognise each other in
  their facts. No photo, no name and no free text on the server, and the
  k-floor, are the mitigation; the founder says plainly to early members that
  they may know each other.

The founder's, not code: run the five sessions; set the console spend limit
and write it down; point `VITE_CONTACT_EMAIL` at an address someone reads, or
land the mailbox on the domain.

## 9. How it spreads

Assume advertising is expensive and growth cannot be brute-forced. In this
community, nothing that says "I am looking" gets forwarded: a profile, a
match, a map. What gets said to a friend is about *him*, about a
*conversation*, or about a *couple*. So the product's outputs, words a person
can say, are the thing that travels, and the product is the footnote. Every
invitation follows that rule (`src/data/invite.ts`): it is about the
instrument and the friend, never the sender's own use of a marriage product.
What travels is text; the image-of-the-product path (`card.ts`,
`shareImage()`) had no importers and was deleted.

Four loops, strongest first:
1. **"I said the words, and something happened."** When a follow-up resolves to
   "we talked", Home keeps the card one more beat and offers one thing: send the
   words to a friend who is talking to someone. Every script card carries the
   same send.
2. **The two-sided eleven.** Every use puts a man on his own phone with no
   account, and his screen offers the eleven to a friend.
3. **The family words**, across generations: the aunties are the existing
   matchmaking network.
4. **The couple it worked for**: the Ending's share, `via=married`, which says it
   did the eleven only when she did.

**Links.** Every link this product hands out opens the instrument it describes
(`src/lib/entry.ts`, `src/lib/links.ts`), and `docs/ASSETS.md` is the only place
a URL is declared live. Any link may carry `via=`, the kind of thing that
carried it: `words`, `eleven`, `couple`, `family`, `married`; `group`,
`alumni`, `professional` or `mosque` for a link posted into a kind of room;
`press` for a publication. Never who sent it, and never which room. First
arrival wins, and it is the only attribution recorded
(`netlify/shared/vocab.ts`). A via cannot be retrofitted onto a link already
minted, which is why the room kinds and `press` were added before the first
post.

### The wedge

A channel, not a brand. Real member evidence is zero.

**Twin Cities, twenty-five to thirty-four, reached through the alumni and
young-professional networks where women and men already mix:** SSA-UMN alumni,
the SNABPI Minneapolis chapter and the Twin Cities Somali professionals'
events, with the mosques' young-adult circles as the second ring. Nothing in
copy says "alumni" or "professional", and nothing will.

Why: Minneapolis–St. Paul holds the largest Somali community in North America,
roughly 84,000 in the metro (US Census and ACS). Twenty-five to thirty-four is
where "when are you getting married" becomes weekly, and the founder's own
circle sits in it. These networks run on group chats, the medium the words
were designed for, and they reach men as well as women. The instruments are
useful to a room before anyone else is here. Columbus (50–60,000) is second,
Toronto (about 20,000) third, and the UK (176,645 in the 2021 census) later.

**How to acquire it**, inside §6: no reward, no counter, no link that carries
who sent it, no paid acquisition.
1. **Ten connectors, by name**: the SSA-UMN alumni board, the SNABPI Minneapolis
   chapter leads, the organisers of the Somali networking nights, two imams who
   run young-adult programmes, and whoever the founder's own circle says
   everyone asks. One ask each: post the link into the group.
2. **Lead with the eleven**: `joinniyyah.com/?eleven&via=alumni` (or
   `professional`, `mosque`), then the read the same week,
   `/?read&via=alumni`. The eleven leads because it is the sentence a stranger
   repeats: "he answered the same eleven on his own phone and neither of us saw
   the other's answers." The via split settles which door people use
   (`docs/DECISIONS.md` decision 6).
3. **One room, once**: a "before you say yes" evening co-hosted with an alumni or
   SNABPI chapter, where the eleven is the room's exercise. Not a launch party.
4. **Read the room-kind rows weekly**, in `vias` and `sidesByVia`.

**The eight-week rule.** After eight weeks of posting, fewer than five men who
arrived through a room link (`sidesByVia.man.group.arrived`, with its siblings
`alumni`, `professional` and `mosque`) means change the channel first (the
mosques' young-adult circles), the city second (Columbus). A man who came
through someone's eleven is already talking to her and does not count. `press`
is excluded for the same reason: nobody asked him by name, and an article can
make the number look healthy while the wedge is dead (`src/lib/entry.ts`). The
rule's other half, twenty women counted in the metro, read the door's count,
which went with the door.

Still open: whether a link shared into a group produces arrivals who follow
through at least as well as a one-to-one send (`vias.group['followed-through']
/ vias.group.arrived` against `vias.words`). Later, as a second offer and only
after the first marriages: the divorced and remarrying, in their 30s and 40s,
the highest unmet pain in the community. It needs a question the product does
not ask yet.

## 10. What is next

Productocracy is zero: no feature here has been chosen by a stranger. So one
rule governs building before the votes come in: **a feature may be built now
only if it records a vote that would otherwise be lost for ever.** The `kept`
rung, the room-kind vias and `press`, and `v` on every record were built under
it. Everything else waits for a number.

| # | Item | Layer | Gate |
|---|---|---|---|
| **0** | **Post the link.** Ten connectors by name; the tool and guide URLs catalogued in `docs/ASSETS.md`, each with a room-kind `via` (§9, the wedge's steps 1–2) | Experiment | Nothing. Every line below waits on it |
| **1** | **The five sessions** (R1), on `docs/PROTOCOL.md`'s script, read against §1's jobs | Experiment | Recruiting only. The one experiment that runs with zero traffic |
| **2** | **What must be true before strangers arrive.** Mail on the domain; the Anthropic spend limit written into `docs/OPS.md`; `VITE_CONTACT_EMAIL` at an address someone reads | Solution, founder-side | Nothing. None of it retrofits onto traffic that has already come |
| **3** | **Subtract.** Done on 2026-09-24, wider than planned: the whole marketplace went (`docs/DECISIONS.md`) | Subtraction | Done |
| **4** | **The situations become the front door.** The four moments (`src/data/moments.ts`) and the five hardest parts (`src/data/hook.ts`) move ahead of the map. No new component: they exist, and on 2026-09-17 rendered 43 taps in | Solution, relocation | Item 1 |
| **5** | **Ask three men what answering her eleven does for them**, inside item 1's sessions: the most dangerous unevidenced belief in `docs/RESEARCH.md` | Experiment | Item 1 |
| **6** | **Read what comes back.** A1, A3 and A4 at their thresholds; the red team's convictions at their dates; then the monthly loop (`docs/RESEARCH.md`) | Experiment | Items 0–1 |
| **7** | **The first-year sheet**: the eleven's engine over a second topic list. Nobody serves the marriage after the wedding, and it is the married stage's one job that is hers. It is also the gift's first gate (§5 B) | Solution | The first marriage |
| **8** | **Your record**, then **real backend** (auth, persistence, moderation). Both buy durability rather than value | Solution | The first member who asks; any store past about 50,000 keys (`docs/OPS.md`) |

**Left with the marketplace on 2026-09-24:** the first pool, concierge
matchmaking by hand, the introductions record, and the door for men.
**Declined:** live Claude behind the map (§4), held by `tests/durable.test.ts`.
