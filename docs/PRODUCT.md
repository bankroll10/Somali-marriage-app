# Niyyah — the product

What Niyyah is, who it is for, what it measures, claims and may sell, and what
comes next. Where this page and the code disagree, the code wins. The
marketplace (the door, the pool and matching, the sample introduction, the
family vouch, Profile, Plus) was removed on 2026-09-24 because there were no
members; git keeps it (`docs/DECISIONS.md`).

## 0. What Niyyah is

**The problem: finding out too late.** Somali singles in the diaspora lose
years to people who were never serious, and enter marriages that break over
things nobody said aloud: where you would live, money sent home, his family in
your home, a second wife, qabiil, whether he has ever said the word *marriage*
unasked. These get answered after the families are involved, when saying no
has become a public cost. **The purpose:** those conversations happen before
the yes, and the one about seriousness in the first month, not the sixth.

> **Every screen exists to move one person from finding out late to saying it
> early.**

Niyyah is a set of instruments for a relationship a person already has. Each
ends in words she can say, and days later the product asks whether she said
them. It is a web app that opens from a bare link with no account; what she
tells it stays on her phone unless she keeps it on our server under a code.

A marriage product that succeeds loses its member, so a daily check-in or a
streak would be the dating-app loop with softer copy. Niyyah is opened when
something happens, for one of two reasons, and designs for nothing else:
**something happened** (the ask box and moment chips on Home, the read, the
eleven: they end in words and a follow-up written down) and **since last
time** (the follow-up, on Home or on Welcome: "we talked", "not yet" or "it
went differently"). The rest of Home is quiet.

## 1. Who it is for

**Her**: a practising Somali woman in the diaspora, 24–34, structurally
unserved. Hinge makes her a minority in a casual marketplace, the Muslim apps
are low-trust, the aunties judge, the masjid has no mechanism. Call her Hodan:
27, a nurse in Columbus, prays, wants children soon, has a mother who asks
every week. **Women first, and not negotiable**: if she feels safe and
respected, men follow. **Him**: the serious man, 26–36, arrives through her,
answering the eleven she sends. He is never charged for reach, and nothing yet
tells him why answering serves him (§10, item 5). **Not for** the casual
dater: a serious person wants the unserious filtered out.

The jobs, by stage (Jobs-to-be-Done, every cell a HYPOTHESIS until R1's
sessions):

| Stage | The job | Reading |
|---|---|---|
| Preparing | Handle family pressure; know what I want; find anyone serious | The map answers the weakest job; finding someone, the product cannot do |
| Talking | Know whether he is serious before investing more; the next thing to ask | The read: the sharpest job in the product |
| Deciding | Have the eleven conversations before the families lock the outcome | The eleven, the two-sided sheet, the printed guide; the nikah coordinator is a second customer |
| Married | Pass on what worked without it sounding like advice | Mostly the company's job, and labelled so |

Welcome's second door, "Talking to someone? Get a read.", exists because the
read answers the highest-pain job, for the person who already has someone. A
feature's verdict (clear, thin, or the company's) changes only on evidence from
a person, never on a build.

### The institution rule

Nothing that would need renaming for a second community carries a community's
name. The product is Niyyah, an intention, not "the Somali app", and a
community's content (its cities, its eleven, its lines) lives in `src/data/` as
data. The brand strings live in `src/data/brand.ts`; `vite.config.ts` fills
`index.html` from it, and `tests/brand.test.ts` holds every surface to it. The
rule is enforceable by test for the brand strings only: BeforeYes, Couple, Home
and Read still name the community as content, and a second community gets a
second `src/data`, not a rename. The eyebrow and title name it on purpose:
being findable is table stakes.

Why: on the order of 20,000 Somali diaspora marriages a year (asserted, not
derived) caps a Somali-only company near $12M a year even at a fifth of them
and $3,000 each. ~$100M needs a population five to ten times larger, such as
the Western Muslim diaspora. The rule costs nothing and keeps that reachable;
the endgame is "the modern wali" for the diaspora. For the same reason every
stored member record carries a version `v` (`netlify/shared/record.ts`), added
while there were none to migrate, so a later change of shape is a
transcription rather than an archaeology.

## 2. The loop, and the instruments

The loop is what makes Niyyah different: a read or the eleven; the words; did
you say them?; where did you land; the two of you, blind; the Ending.

| Instrument | Ends in | Where |
|---|---|---|
| The read: what he has done, not said | The one question to ask next, word for word | `src/lib/read.ts`; `/tools/is-he-serious`, `/tools/is-she-serious` |
| Before you say yes: the eleven conversations found out too late | The one to open this week, and the words | `src/lib/beforeYes.ts`, `src/data/eleven.ts`; `/tools/before-you-say-yes` |
| The two-sided eleven: he answers on his own phone, no account, blind | Where they match, and the one to open together | `netlify/functions/couple.ts` (`joint()`, symmetric) |
| The family words: the wali, hooyo, mahr, two families meeting, the in-laws after the nikah | Word for word, for either side | `src/data/families.ts`; `/tools/families` |
| The map: where she stands | Grounds in words; it feeds the guide and her side of the eleven | `src/data/intake.ts`, `src/lib/reflection.ts` |
| The guide: the moment, in the right voice | Words, and a follow-up | `src/lib/coach.ts`, `netlify/functions/guide.ts` |
| The follow-up: "did you say it?" | The record of what happened | `src/lib/followup.ts` |
| The Ending: married, and leaving | Her record, one share, Forget me | `src/components/Ending.tsx` |

Beside them: Report a concern (`netlify/functions/safety.ts`, read weekly by
the founder) and a help line picked by her country, on her phone. Nothing here
is a feed, a score or a ritual.

**Getting in.** Welcome → Identity (gender, first name, 18+) → "what's
happening right now" → preparing to the Hook and the map, talking to the read,
deciding to the eleven, married to the Ending. `?read`, `?eleven`, `?families`
and the tool paths in `src/data/tools.ts` skip Welcome, and the read's chooser
is folded into its start buttons so a forwarded link explains itself first. A
finished read or eleven with nothing else said is taken as `talking` or
`deciding` (`src/lib/inferStage.ts`), so the read-first person has a Home and
is asked her follow-up. **Activation**: one instrument's words in the first
session, and one follow-up answered within fourteen days.

**The follow-up.** Every result writes down what it told her to do. The next
time she opens Niyyah after three days, it asks once; "not yet" is asked once
more a week later unless she puts it away. Both phones in a pair are asked
about the joint's conversation, and his phone keeps the pair
(`couple.side = 'second'`). `tests/invariants/the-loop-closes.test.tsx` holds
the loop.

**The map** was a 0–100 readiness score whose weights were an answer key. It
is now sixteen questions and seven grounds: four rated in a word (*thin*,
*steady*, *strong*), three positions described and never rated (§7, S5).
Growth is a diff of her answers, never a delta, and a retake is hers to want.

**The guide** closes: every reply ends on an act, and its chips are "copy the
words", "I'll say this — ask me in three days" (a follow-up) and "That's enough
for tonight". It is budgeted by progress: fifteen replies per rung reached and
per follow-up answered (`src/lib/budget.ts`), no counter on screen, no
unlimited tier. Four voices: auntie, brother, therapist, islamic. It is **on in
production, deliberately (2026-09-10)**: the founder declined the
recommendation to leave `ANTHROPIC_API_KEY` unset, because Trust names Claude
and Anthropic and offers "Keep the Guide on this device", and
`GUIDE_DAILY_CAP` bounds the day, since an hourly cap resets 720 times a month.
Both caps fail closed (R5). A3 still governs: if fewer than one in five who
reach an ending name the guide, the live half goes (`docs/RESEARCH.md`). The
local voice answers whenever the live one cannot (`docs/GUIDE-EVAL.md`).

**The Ending. Success is deletion.** In this order: her record, headed by the
count of conversations she had that she was not going to have; permission to
go; the one share only a married person can make (`via=married`); then,
skippable, three closed questions (who she married, what decided it, which
instruments were real) and one line for whoever is where she was; then Forget
me (`src/components/ForgetMe.tsx`), because "you can delete the app" was false
while her kept map, couple sheet and step count outlived the uninstall. The
closed answers travel with her rungs; her line never leaves the phone. A
marriage is counted only when she says so, which is free and unlocks nothing.
Married Home goes quiet, and a courtship that ends gets Ended, which says
first that ending is allowed.

## 3. The North Star, and how it is read

**`followed-through` per hundred `arrived`**: of everyone who opened this, how
many had a conversation they were not going to have. It is reach times
magnitude, and only helping a specific person say a specific hard thing moves
it.

**How it is read.** The readout (`/progress`, `netlify/functions/progress.ts`)
returns `cohorts`: per arrival month, `{ arrived, followedThrough }`, the
second counting those who have followed through since. The North Star is
`followedThrough / arrived` on two rows, this month against last,
whole-population and never floored. It replaced arrivals by day, which could
not say it: a conversation in October by someone who came in September had no
row to be divided by. Only the follow-up writes the numerator; the guide's own
follow-ups stay out of `facts.through`. How to pull it: `docs/OPS.md`.

**The test for any screen:** does it help someone find out earlier, and does it
end in something they can say? The read, the eleven, the couple sheet, the
family words, the follow-up and the Ending pass; Trust, Forget me and Report a
concern are core for trust and safety. What the test changed:
- **Welcome's lead promises the routing, not the map**: say what is happening
  and we start there, with a read, the eleven, or two minutes on where you
  stand. The read is in the first breath.
- **The three marriage-breakers moved into the map.** `household`, `work` and
  `money-home` sat behind a screen she might never open, while five questions
  reached no conversation. They joined chapter two, and thirteen became sixteen
  (`src/data/intake.ts`); the eleven shows "You told your map…" beside them. If
  A1 fires (completion under 50% at twenty arrivals), their chapter is kept.
- **The daily reflection card went**, with its share-as-image: it ended in
  nothing anyone could say.
- **"Readiness" left every label**: "your map", "Steadiness", "Knowing
  yourself".
- **The eleven alone, for someone with no "two", was declined**; her own
  answers on those three topics come from the map.

## 4. What survives a copy

> **If every competitor copied our homepage tomorrow, what would still make
> Niyyah different once someone uses it?** It works on the relationship you
> already have. With no account, it tells you what he has done rather than
> what to feel; gives you one conversation and the exact words; asks days later
> whether you had it; puts the same eleven to him on his own phone, blind; and
> when you marry, lets you go and takes itself off our server. A marketplace is
> paid while you look. We are paid when you stop needing us (§5).

Somali, marriage-first, wali, verification, photo privacy, compatibility, deen
filters and no swiping are claimed by everyone now, and our words can be copied
in a month: the repository is public. Welcome's three bullets, the description
and the social card (`src/data/brand.ts`) say what someone gets on the first
visit instead. What a copier must give up:

| Structural difference | Why a marketplace will not copy it |
|---|---|
| Instruments open from a bare link, no account, no install | An app-store funnel is an account funnel |
| They serve a relationship that began elsewhere | A marketplace serves its own inventory |
| The man answers on his own phone, blind, with no account | He is not a customer; there is no growth case |
| It asks whether the conversation happened | They measure sessions, likes and matches |
| The Ending: delete the app, with Forget me beside it | Subscription revenue needs the member to stay |

Below table stakes, on purpose: identity verification is an 18+ tap, and there
is no family verification since the vouch went. Nobody is introduced, so there
is no one to verify against, and it would collect documents with nothing to
protect. **Fake complexity**: every file in `src/data/` ships in plaintext, the
weights are hand-set, the model is a commodity, and the guide is the most
copyable thing here. None of it is defended.

**The moat is the monthly loop run against the readout** (`docs/RESEARCH.md`):
a copier gets the constants as they were on the day they copied them. So every
legitimate user strengthens a compounding asset, as ids from closed lists:
the kind of link she came by; the rated grounds; the read's band and thinnest
ground; the eleven's one to open; the pair's joint in `tallies/joint`, with no
pair in it; which conversation was had; why a courtship ended
(`facts.ended`); who she married and what decided it. None compounds yet.

**What a model may do.** The need is older than any app: compatible partners
and marriages that last, reached without losing dignity, faith, time or peace.

> **A model may add a layer on top of something the product already does
> completely without it. It may never be the thing that produces the map, the
> read or the eleven. With no key set, a member loses a better sentence — never
> an instrument.**

Live-model code lives in `netlify/functions/guide.ts` and `src/lib/coach.ts`
only; `tests/durable.test.ts` asserts it and builds the map with the network
off. A model behind the map, once "the last local seam", is declined: the map
is ours and must not fail when a supplier does. "Powered by AI" is gone from
every surface and `tests/voice.test.ts` keeps it out; Trust still names Claude
and Anthropic, because telling her where her words go is a disclosure, not a
claim. Sharing is named by its mechanism, `navigator.share`
(`src/lib/share.ts`): no SDK, no pixel, no vendor, and no bought reach.

## 5. What may be sold

**Principle: nothing we sell may earn more when a member is doing worse.**
Revenue must not scale with anxiety, time in the app, or how long someone stays
single. The test for every line and every sentence: does it earn more if she
stays single longer, opens the app more often, or is having a worse night? If
yes, it does not ship.

**No gate has passed.** Until one does, nothing here gets payment code. There
is no SDK, no checkout and no way to record that someone would pay;
`tests/monetization.test.tsx` fails if a payment SDK appears in `package.json`,
and reads this page for that sentence.

Trust promises, and the same test holds: "Everything here is free. Nothing that
protects you is ever paid, at any price." "Nothing is priced by the reply, the
message or the month, and staying single never earns us more." "We will never
sell your data, and never charge you without asking first." **Never sold**:
replies, a lifted counter, reach, visibility, filters, or anything that
protects her. A payment never buys a say, data or a timetable.

### A. The lines

Each is asked who pays, when, after what value, for what, whether it earns more
if she is stuck, whether it can be delivered, its margin and its support
burden. The prices are a prediction written on 2026-09-11; none is on a screen.

| Line | Who pays, and when | Earns more if she is stuck? | Delivery, margin |
|---|---|---|---|
| **Talking it through, with a matchmaker** (the call; was "Deciding together") | The couple, once per person for life, after the joint view (`he-answered`). Never at a declared stage: `deciding` is a free word (`docs/DECISIONS.md` decision 16) | No: once for life, paid before the decision, the same whatever they decide | About 1.5 founder hours; $99, about $64 an hour after fees |
| **The first year married, as a gift** | A guest, at the wedding; the couple are never sold to | No: bought once, by someone else, never on "if things get hard" | A sheet, not yet written; $79 |

Retired. **A matchmaker in your corner** (the families' fee at the nikah) and
the free year for everyone counted before their pool opened went with the
marketplace: nobody is introduced here. **Sponsor a place** was removed from
`src/data/ending.ts` and `src/components/Ending.tsx`: money for a place that
costs nothing, on the screen a marriage is reported from. If it returns, it has
a stated use and its own gate, and is never on the Ending. **Events** are
struck: a ticket earns most from whoever stays single. **Niyyah+**, a monthly
plan for "your guide, without a counter", is the counter-example.

### B. The gates

**The call** is sold under its own name, only after both have seen the joint
view, by someone with no stake in the answer. (1) The founder gives it free to
the first five couples who ask; at least 3 say it changed what they talked
about, none says it pushed them, and hours are written down. (2) At least 10
couples reach the joint view in a month (`/progress` `he-answered`). (3) Ten
couples are offered it by hand with a hosted link, and at least 3 buy. Step 3
waited for public launch, defined as the day the first pool opened; with no
pool, a launch day must be written before it runs. **The gift**: the sheet is
written and given free to the first married couples, at least 2 say it helped,
and someone asks unprompted to give it. Gift code only past 10 sales a month.

### C. Payment identity

A code is the only identity Niyyah holds; a card carries a name, an email and
an address. Payment records stay with the processor, never in Blobs, `/export`
or the learning record. Nothing bought is delivered by her map code, and the
founder never looks up a buyer's map. Trust gains one sentence, in the commit
that takes the first payment, on what a payment reveals and to whom. An entity,
terms, a refund policy, a mailbox on the domain that answers, and a tax
decision made with an accountant come first.

### D. No payment infrastructure: the decision, and when it changes

**Nothing is built for payments until a gate in section B passes.** Then money
is taken by hand, through a hosted payment link. Code comes only when that is
the bottleneck, at about ten transactions a month on a line; that commit
deletes "No gate has passed" above and changes `tests/monetization.test.tsx`.
Nothing in the app asks whether someone would pay: no "notify me", no price
test. That is learned in conversations (`docs/RESEARCH.md`).

### E. The incentive audit

Every sentence that names a paid stage, a price or money is read against the
test above and checked for truth. The first run (2026-09-24) fixed every fail
it found; most were on Plus and Profile, since gone, and one was the Ending's
sponsor-a-place. `tests/monetization.test.tsx` holds the rest: Trust's promises
with no price shown; the guide never sells, because the day it says a human one
costs money the advice is a funnel; the Ending asks for no money; no payment
SDK. The audit reruns at every release that touches a paid line, a price or a
screen naming one, under a new date.

### F. Kill criteria, stated before the data

- **The call**: fewer than 3 of the first 5 free calls change what the couple
  talked about; fewer than 3 of 10 buy; any couple says it pushed them; calls
  average over 2.5 founder hours (repriced or stopped, not squeezed); couples
  who had it end from `deciding` at a sharply different rate, and the
  conversations say why.
- **The gift**: ten married couples use the sheet free and nobody asks to give
  it.

## 6. What we measure, and what we never build

Screen time, messages and swipes all rise when a person is stuck. So the only
measurement is a ladder of rungs, each a claim about her life
(`src/lib/rungs.ts`): `arrived`, `situated`, `mapped`, `kept`, `read`,
`eleven`, `asked-him`, `he-answered`, `followed-through`, `deciding`,
`married`, each counted on its own. `kept` is apart from `mapped` because a map
built and dropped and a map kept are different failures; before the rung they
were one number. The North Star is §3; the lagging outcome is `married` per
hundred `arrived`; distribution is arrivals by source per hundred
followed-through (§9).

Beside each rung, what it was made of (`src/lib/facts.ts`): the rated grounds,
the read's band and thinnest ground, the eleven's one to open, conversations
confirmed, why a courtship ended, the three closed answers on the way out,
which questionnaires she began, whether she asked the guide. Ids from closed
lists only; the type has no field for a sentence. The readout crosses them
against marriage (`marriedBy`). All of it travels only while Trust's "Tell us
which steps you reach" (`countMe`) is on, under an install code that cannot be
joined to her map code, and every split by a quasi-identifier is floored at
five (`netlify/shared/floor.ts`). Field by field: `docs/PRIVACY.md`.

**Never measured:** active users, time in app, replies sent, threads opened,
check-ins, match counts, sessions. Sessions per week should fall after a rung;
nothing counts them.

**Never built, by name.** Anyone should be able to reject a proposal by
pointing at a line:
- A score on a person, hers included. Grounds are named in words.
- A feed, a deck, or a swipe.
- A daily ritual, a streak, a milestone counter, a comeback nudge.
- "Who liked you", interest limits, paid visibility, or filters as a paid tier.
- A guide-reply counter she can see, or an unlimited tier.
- Photos, or messaging between members.
- A profile before there is a room to show it in.
- Notifications about people.
- A referral reward, an invite counter, or share-to-unlock.
- A link that carries who sent it.
- Any mechanic whose success is measured by its own repetition.

These mechanics are the category's default, and they came back into this
product once without anyone choosing them.

## 7. What an instrument may claim

No introduction has been made and no marriage has come out of this product,
and the literature (Finkel et al. 2012; Joel et al. 2017) says no algorithm
predicts relationship success from self-reports. Every weight here is
editorial: fine for an order, never for a grade. So **a number may order what
is shown, never grade a person or a pair to them; "not known" is said, never
scored; and no screen claims predictive power.** `tests/voice.test.ts` scans
`src/` for the overclaims ("predict", "carry the most weight", "most couples
never", "rarer than you would think", "Grounded and ready", "will find you
someone").

### S3. The read's weights and bands

Before: public .26, intent .21, consistency .20, pressure .19, family .14,
summed into `overall` and banded. It could call a man "strong" who goes quiet
on hard things, and said he had shown "the things that predict it".
**Removed.** The band is read from the five states on her screen: **strong** if
being known is *shown*, nothing is *not yet* and four of five are *shown*;
**thin** if more are *not yet* than *shown*; **mixed** otherwise. The gap to
script is the lowest state, ties broken by `PRIORITY` (public, pressure,
intent, family, consistency), an order stated as an order. The copy says "a
summary of your own answers — not a verdict on {him}, and not a prediction"
(`src/lib/read.ts`).

### S4. The read's option weights and `stateOf`

Option weights 0–1 and `stateOf` at .7 and .35: editorial, which answer shows
more of the thing. **Kept, as an ordering of answers**, shown as three words
and her own notes. An answer that says nothing about him ("I have not told
{him}", `nonneg: 'untold'`) is `null`, not scored as half. The man's variants
(`ManVariant`, `src/data/read.ts`) stay: the road is not symmetric.

### S5. The map's grounds

Faith, family, children and timeline were weighted as readiness, and a Muslim
whose faith is private was told faith was her thinnest ground: a religious
verdict the guide is forbidden to give. **Positions are described, never
rated.** Faith, family and vision read "Your position", in her words, with no
state and no weight. The four rated grounds (intention, character, steadiness,
knowing yourself) alone decide the headline, from "On steady ground" to
"Early, and honest about it", and the thinnest ground; the learning facts
record no state for a position (`src/lib/reflection.ts`, `src/data/intake.ts`).

### S6. Before-you-say-yes and the couple joint

Each topic's `consequence` (.6–.95) and `STATE_URGENCY` pick "the one to open
this week". **The order stays, because something has to be opened first. No
difference is light.** A top tier once told a couple who differed on qabiil or
going back that theirs "isn't the ones that carry the most weight". A
difference is now counted in words ("One conversation doesn't line up yet"),
whichever topic it is (`src/lib/beforeYes.ts`).

G1–G8 (the matching gate), S1–S2 (the weighted fit) and U1–U4 and U6 (the
pool's assumptions) went with matching on 2026-09-24 (`docs/DECISIONS.md`). U5,
`K_FLOOR` 5, is a privacy control, not a claim. U7: the read's per-answer
weights, the rated grounds' weights and `consequence` are editorial orderings,
never summed across dimensions, never shown as numbers. **Authority is earned
back by hand**: after twenty endings, `ended.which` shows which of the eleven
courtships end on, and only then may `consequence` be revised, or a headline
say one conversation matters more, citing the count.

## 8. The risk register

Every system was held against Cagan's four risks (value, usability,
feasibility, viability) on 2026-09-17, by one rule: "already built" is not
evidence of value; a person other than the founder choosing it is. Nothing had
that. The systems rated UNNECESSARY (the vouch, the pool and sample, Plus) and
the AT RISK door went on 2026-09-24. A risk is struck through, never deleted,
with the date it closed.

| Id | Risk | The rule in the code that answers it |
|---|---|---|
| **R1 · Value** | Never chosen by anyone | No code: five sessions on `docs/PROTOCOL.md`'s script at `/tools/is-he-serious` or `/tools/is-she-serious`; three days later, count who reports a conversation. Two or more of five: the read and the eleven lead every post. Zero: nothing new is built until the founder knows why. Entries in `docs/RESEARCH.md` |
| **R2 · Usability** | The read's result was a wall: 593 words, eight calls to action | `src/components/Read.tsx`: the band, the one question and two actions; the rest behind "More you can do here". Home's stage band no longer repeats its cards |
| **R3 · Feasibility** | Screens promised what the code could not do ("we write to you") and held personal data on the promise | The promises became the present tense, and `tests/voice.test.ts` fails on them. `netlify/functions/sweep.ts`, weekly, makes every stated lifetime true: kept maps after a year, couple sheets after ninety days, step counts after a year unless `married`; and it empties the retired `cohort`, `contacts` and `vouches` stores |
| **R4 · Viability: safety, privacy, legal** | Forget me could erase the other side's safety report; the public tools had no notice | Forget me touches no report; a report stays until the founder resolves it (`netlify/functions/keep.ts`, `docs/SECURITY.md` O1). Trust is one tap from both public tools and Back returns there (`Read.tsx`, `BeforeYes.tsx`, `src/hooks/useNiyyah.ts`); `CONTACT_EMAIL` is on Home and in Forget me |
| **R5 · Viability: cost, supplier** | The one route that spends money failed open | `overCapOrUnknown` (`netlify/shared/limit.ts`): the guide checks the day, then the hour, and a count it cannot read is a refusal; the offline voice answers. The console spend limit is the founder's; its row in `docs/OPS.md` stays blank until set |

**Standing risks.** Reputation: one safety incident in a tight community can
end this, so safety is first-class, and the dormant close switch
(`netlify/edge-functions/gate.ts`) shuts every route in one deploy. Tone:
monetise something sacred badly and this becomes the "corny Muslim app". Drift
(§6). Gender balance: over-index on women's trust. Re-identification: people
who know each other can recognise each other's facts; no photo, name or free
text on the server, and the k-floor, answer it. **The founder's, not code**:
the sessions, the spend limit, and `VITE_CONTACT_EMAIL` at an address someone
reads.

## 9. How it spreads

In this community, nothing that says "I am looking" gets forwarded: a profile,
a match, a map. What gets said to a friend is about *him*, a *conversation* or
a *couple*. So the words travel and the product is the footnote. Every
invitation (`src/data/invite.ts`) is about the instrument and the friend, never
the sender's own use of a marriage product. What travels is text; the
image-of-the-product path (`card.ts`, `shareImage()`) had no importers and was
deleted. The loops, strongest first: "I said the words, and something
happened" (after "we talked", Home offers to send those words to a friend); the
two-sided eleven, which puts a man on his own phone; the family words, across
generations; and the couple it worked for (`via=married`).

Every link opens the instrument it describes (`src/lib/entry.ts`), and
`docs/ASSETS.md` is the only place a URL is declared live. A link may carry
`via=`, the kind of thing that carried it: `words`, `eleven`, `couple`,
`family`, `married`; `group`, `alumni`, `professional`, `mosque` for a kind of
room; `press` for a publication. Never who sent it, never which room; first
arrival wins (`netlify/shared/vocab.ts`).

### The wedge

A channel, not a brand. The first forty are found here: **Twin Cities,
twenty-five to thirty-four, reached through the alumni and young-professional
networks where women and men already mix**: SSA-UMN alumni, the SNABPI
Minneapolis chapter, the Somali professionals' events, and the mosques'
young-adult circles as the second ring. No copy says "alumni" or
"professional". Minneapolis–St. Paul holds the largest Somali community in
North America (about 84,000 in the metro); 25–34 is where family pressure turns
weekly and where the founder's own circle is; these networks run on group
chats, the medium the words were built for. Columbus is second, Toronto third,
the UK later. A tight network also amplifies a safety failure (§8).

**How to acquire it**, inside §6 (no reward, no counter, no paid acquisition):
1. **Ten connectors, by name**: the SSA-UMN alumni board, SNABPI chapter leads,
   the networking-night organisers, two imams with young-adult programmes, and
   whoever everyone asks. One ask each: post the link.
2. **The eleven first**, `/?eleven&via=alumni` (or `professional`, `mosque`),
   then the read the same week: "he answered the same eleven on his own phone
   and neither of us saw the other's answers" is the sentence a stranger
   repeats (`docs/DECISIONS.md` decision 6).
3. **One room, once**: a "before you say yes" evening with a chapter, the eleven
   as its exercise.
4. **Read the room-kind rows of `vias` and `sidesByVia` weekly.**

**The eight-week rule.** After eight weeks, fewer than five men who arrived
through a room link (`sidesByVia.man.group.arrived` and its `alumni`,
`professional`, `mosque` siblings) means change the channel first, the city
second (Columbus). A man who came through someone's eleven is already talking
to her and does not count; nor does `press`, since nobody asked him by name
(`src/lib/entry.ts`). The rule's other half, twenty women counted, read the
door, which is gone. The divorced and remarrying are a later second offer,
after the first marriages.

## 10. What is next

No feature here has been chosen by a stranger. Until one is, **a feature may be
built now only if it records a vote that would otherwise be lost for ever**:
the `kept` rung, the room-kind vias and `press`, and `v` on every record were
built under this rule.

| # | Item | Gate |
|---|---|---|
| **0** | **Post the link**: ten connectors; the URLs in `docs/ASSETS.md` with a room-kind `via` (§9) | Nothing. Everything below waits on it |
| **1** | **The five sessions** (R1), on `docs/PROTOCOL.md`'s script, read against §1's jobs | Recruiting only |
| **2** | **Before strangers arrive**: mail on the domain; the spend limit written into `docs/OPS.md`; `VITE_CONTACT_EMAIL` read by someone | Nothing; none of it retrofits |
| **3** | **Subtract**: done on 2026-09-24, wider than planned (`docs/DECISIONS.md`) | Done |
| **4** | **The situations become the front door**: the four moments and the five hardest parts (`src/data/moments.ts`, `src/data/hook.ts`) move ahead of the map; no new component | Item 1 |
| **5** | **Ask three men what answering her eleven does for them**, in item 1's sessions | Item 1 |
| **6** | **Read what comes back**: A1, A3, A4 and the red team's convictions, then the monthly loop (`docs/RESEARCH.md`) | Items 0–1 |
| **7** | **The first-year sheet**: the eleven's engine over a second list, for the marriage after the wedding; the gift's first gate | The first marriage |
| **8** | **Your record**, then **real backend** | The first member who asks; a store past ~50,000 keys (`docs/OPS.md`) |

The first pool, concierge matchmaking and the introductions record left with
the marketplace. Live Claude behind the map stays declined (§4).
