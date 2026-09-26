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
your home, a second wife, qabiil. These get answered after the families are
involved, when saying no has become a public cost. **The purpose:** those
conversations happen before the yes, and the one about seriousness in the
first month, not the sixth. The problem is the bet, not a finding: which
conversations break marriages is class F, and how many have them too late is
unknown (`docs/RESEARCH.md`, L5 and open question 6).

> **Every screen exists to move one person from finding out late to saying it
> early.**

Niyyah is a web app of instruments for a relationship a person already has,
opened from a bare link with no account; what she tells it stays on her phone
unless she keeps it on our server under a code. Each instrument ends in words
she can say, and days later it asks whether she said them. A marriage product
that succeeds loses its member, so it is not built for daily opens: it is
opened when **something happened** (the ask box and moment chips on Home, the
read, the eleven) or **since last time** (the follow-up).

## 1. Who it is for

**Her**: a practising Somali woman in the diaspora, 24–34, structurally
unserved: a minority on Hinge, wary of the low-trust Muslim apps, judged by the
aunties. Call her Hodan: 27, a nurse in Columbus, prays, wants children soon,
has a mother who asks every week. **Women first, and not negotiable**: if she
feels safe and respected, men follow. **Him**: the serious man, 26–36, arrives
through her, answering the eleven she sends. He is never charged for reach, and
nothing yet tells him why answering serves him (§10, item 5). **Not for** the
casual dater.

| Stage | The job (Jobs-to-be-Done; HYPOTHESIS until R1's sessions) | Reading |
|---|---|---|
| Preparing | Handle family pressure; know what I want; find anyone serious | The map answers the weakest job; finding someone, the product cannot do |
| Talking | Know whether he is serious before investing more; the next thing to ask | The read: the sharpest job in the product |
| Deciding | Have the eleven conversations before the families lock the outcome | The eleven, the two-sided sheet, the printed guide; the nikah coordinator is a second customer |
| Married | Pass on what worked without it sounding like advice | Mostly the company's job, and labelled so |

Welcome's second door, "Talking to someone? Get a read.", exists because the
read answers the highest-pain job, for the person who already has someone. A
verdict changes only on evidence from a person, never on a build.

### The institution rule

Nothing that would need renaming for a second community carries a community's
name. The product is Niyyah, an intention, not "the Somali app", and a
community's content (its cities, its eleven, its lines) lives in `src/data/` as
data. The brand strings live in `src/data/brand.ts`; `vite.config.ts` fills
`index.html` from it, and `tests/brand.test.ts` holds every surface to it. The
rule is enforceable by test for the brand strings only: the eleven
(`src/data/eleven.ts`) still names the community as content, and a second community gets a
second `src/data`, not a rename.

Why: some 20,000 Somali diaspora marriages a year (asserted, not derived) cap a
Somali-only company near $12M a year even at a fifth of them and $3,000 each.
For the same reason every stored member record carries a version `v`
(`netlify/shared/record.ts`), added while there were none to migrate, so a
later change of shape is a transcription rather than an archaeology.

## 2. The loop, and the instruments

The loop is what makes Niyyah different: a read or the eleven; the words; did
you say them?; where did you land; the two of you, blind; the Ending.

| Instrument | Ends in | Where |
|---|---|---|
| The read: what he has done, not said | The one question to ask next, word for word | `src/lib/read.ts`; `/tools/is-he-serious`, `/tools/is-she-serious` |
| Before you say yes: the eleven conversations found out too late | The one to open this week, and the words | `src/lib/beforeYes.ts`, `src/data/eleven.ts`; `/tools/before-you-say-yes` |
| The two-sided eleven: he answers on his own phone, no account, blind | Where they match, and the one to open together | `netlify/functions/couple.ts` (`joint()`, symmetric) |
| The family words: the wali, hooyo, mahr, two families meeting, the in-laws after the nikah | Word for word, for either side | `src/data/families.ts`; `/tools/families` |
| The map: where she stands, in sixteen questions and seven grounds (§7, S5) | Grounds in words; it feeds the guide and her side of the eleven | `src/data/intake.ts`, `src/lib/reflection.ts` |
| The guide: the moment, in the right voice | Words, and a follow-up | `src/lib/coach.ts`, `netlify/functions/guide.ts` |
| The follow-up: "did you say it?" | The record of what happened | `src/lib/followup.ts` |
| The Ending: married, and leaving | Her record, one share, Forget me | `src/components/Ending.tsx` |

Beside them: Report a concern (`netlify/functions/safety.ts`, read weekly by
the founder) and a help line picked by her country. None of it is a feed, a
score or a ritual.

**Getting in.** Welcome → Identity (gender, first name, 18+) → "what's
happening right now" → by stage, the Hook and the map, the read, the eleven or
the Ending. `?read`, `?eleven`, `?families` and the tool paths in
`src/data/tools.ts` skip Welcome, and the read's chooser is folded into its
start buttons. A read or eleven finished with nothing else said is taken as
`talking` (`src/lib/inferStage.ts`), so the read-first person gets a Home and a
follow-up. Nothing is ever inferred past `talking`: `deciding` and `married` are
only said, so the `deciding` rung counts a decision, not a tool used. **Activation**: one instrument's words in the
first session, and one follow-up answered within fourteen days.

**The follow-up.** Every result writes down what it told her to do. After three
days the next open asks once, on Home, or on Welcome for someone with no Home;
"not yet" is asked once more a week later unless she puts it away. Both phones
in a pair are asked about the joint's conversation, and his keeps the pair
(`couple.side = 'second'`). `tests/invariants/the-loop-closes.test.tsx` holds
the loop.

**The guide** closes every reply on an act ("I'll say this — ask me in three
days" writes a follow-up) and is budgeted by progress: fifteen replies per rung
she reaches by doing something and per follow-up answered (`src/lib/budget.ts`);
a stage she says, `deciding` or `married`, neither buys nor costs replies
(`docs/DECISIONS.md` Part 14), no visible counter, no
unlimited tier. Four voices: auntie, brother, therapist, islamic. It is **on in
production, deliberately (2026-09-10)**: the founder declined leaving
`ANTHROPIC_API_KEY` unset. It is safe because Trust names Claude and Anthropic
and offers "Keep the Guide on this device", and `GUIDE_DAILY_CAP` bounds the
day (an hourly cap resets 720 times a month); both caps fail closed (R5). A3
governs: if fewer than one in five who reach an ending name the guide, the live
half goes (`docs/RESEARCH.md`). Else the local voice answers
(`docs/GUIDE-EVAL.md`).

**The Ending. Success is deletion.** Her record, headed by the conversations
she had that she was not going to have; permission to go; the one share only a
married person can make (`via=married`); then, skippable, three closed
questions (who she married, what decided it, what was real) and a line for
whoever is where she was; then Forget me (`src/components/ForgetMe.tsx`),
because "you can delete the app" was false while her map, couple sheet and step
count outlived the uninstall. A marriage is counted only when she says so, for
free. A courtship that ends gets Ended: ending is allowed.

## 3. The North Star, and how it is read

**`followed-through` per hundred `arrived`**: of everyone who opened this, how
many had a conversation they were not going to have. Only helping a specific
person say a specific hard thing moves it.

**How it is read.** The readout (`/progress`, `netlify/functions/progress.ts`)
returns `cohorts`: per arrival month, `{ arrived, followedThrough }`. The North
Star is `followedThrough / arrived` on two rows, this month against last,
whole-population and never floored. Arrivals by day, which it replaced, could
not say it: a conversation in October by someone who came in September had no
row to be divided by. Only the follow-up writes the numerator; the guide's own
follow-ups stay out of `facts.through`. How to pull it: `docs/OPS.md`.

**What it proves, and what it does not** (audited 2026-09-26, `docs/DECISIONS.md`
Part 15). It is kept: it measures how people decide, not which way.
- *It proves* that, of those counted, a share later told us they had a specific
  conversation Niyyah gave them words for. It is a behaviour, not a feeling or
  an open. Keeping someone stuck cannot raise it, and neither can a marriage. It
  counts a conversation however it went: "It went differently", then "I said
  it", counts; only "I couldn't say it" does not.
- *It does not prove* that Niyyah caused the conversation (nobody saw the
  version where she had no words); that it was honest, safe or good; that the
  decision after it was good; anything about a marriage; anything about those
  with "Tell us which steps you reach" off. It is her report, one conversation
  counts the same as eleven, and "We talked about it" is the filled button.
- *What we eventually need beside it.* Cause: `docs/PROTOCOL.md`'s outcome
  question, in sessions. Decision quality: `facts.decisions` (reported
  decisions made after a conversation here, married and ended alike), the share
  of endings that were `ended:seen`, and `facts.seenAt`, early against late.
  Corroboration: `/couple`'s `one-thinks-talked`, the two-sided check on "we
  talked". Harm: safety reports, and how often "I couldn't say it" is picked.
- *Never*: whether a marriage lasts. Nothing follows a marriage.

**The test for any screen:** does it help someone find out earlier, and does it
end in something they can say? What it changed:
- **Welcome's lead promises the routing, not the map**: a read, the eleven, or
  two minutes on where you stand. The read is in the first breath.
- **The three marriage-breakers moved into the map**: `household`, `work` and
  `money-home` joined chapter two, and thirteen questions became sixteen
  (`src/data/intake.ts`); the eleven shows "You told your map…" beside them. If
  A1 fires (completion under 50% at twenty arrivals), their chapter is kept.
- **The daily reflection card went**: it ended in nothing anyone could say.
  "Readiness" left every result label; the hook's "Knowing if I'm even
  ready" and the timeline's "Ready now" keep the word as a person's own. An
  eleven for someone with no "two" was declined.

## 4. What survives a copy

> **If every competitor copied our homepage tomorrow, what would still make
> Niyyah different once someone uses it?** It works on the relationship you
> already have. It tells you what he has done; gives you one conversation and
> the words; asks days later whether you had it; puts the same eleven to him,
> blind; and when you marry, lets you go. A marketplace is paid while you look.
> We are paid when you stop needing us (§5).

Somali, marriage-first, wali, verification, photo privacy, compatibility, deen
filters and no swiping are everyone's claims now, so Welcome's bullets and the
description (`src/data/brand.ts`) say what someone gets on the first visit.
The words can be copied in a month; the mechanism costs a copier these:

| Structural difference | Why a marketplace will not copy it |
|---|---|
| Instruments open from a bare link, no account, no install | An app-store funnel is an account funnel |
| They serve a relationship that began elsewhere | A marketplace serves its own inventory |
| The man answers on his own phone, blind, with no account | He is not a customer; there is no growth case |
| It asks whether the conversation happened | They measure sessions, likes and matches |
| The Ending: delete the app, with Forget me beside it | Subscription revenue needs the member to stay |

Verification stays below table stakes (an 18+ tap; no family check since the
vouch went): nobody is introduced, so it would hold documents with nothing to
protect. `src/data/` ships in plaintext and the guide is the most copyable
thing here; none of it is defended. **The moat is the monthly loop run against
the readout** (`docs/RESEARCH.md`): a copier gets the constants as they were on
the day they copied them. Every user adds ids from closed lists: the grounds,
the read's band, which conversation was had, the pair's joint in
`tallies/joint` (no pair in it), why a courtship ended, who she married.

> **A model may add a layer on top of something the product already does
> completely without it. It may never be the thing that produces the map, the
> read or the eleven. With no key set, a member loses a better sentence — never
> an instrument.**

Live-model code lives only in `netlify/functions/guide.ts` and
`src/lib/coach.ts`; `tests/durable.test.ts` asserts it and builds the map
offline. A model behind the map ("the last local seam") is declined. "Powered
by AI" is gone, and `tests/voice.test.ts` keeps it out; Trust still names
Claude and Anthropic, as a disclosure, not a claim. Sharing is named by its
mechanism, `navigator.share` (`src/lib/share.ts`): no SDK, no pixel, no vendor.

## 5. What may be sold

**Principle: nothing we sell may earn more when a member is doing worse.** The
test for every line and sentence: does it earn more if she stays single longer,
opens the app more often, or is having a worse night? If yes, it does not ship.

**No gate has passed.** Until one does, nothing here gets payment code: no SDK,
no checkout, no record of who would pay. `tests/monetization.test.tsx` fails if
a payment SDK appears in `package.json`, and reads this page for that sentence.

Trust promises: "Everything here is free. Nothing that protects you is ever
paid, at any price." "Nothing is priced by the reply, the message or the month,
and staying single never earns us more." "We will never sell your data, and
never charge you without asking first." **Never sold**: replies, reach,
visibility, filters, or anything that protects her. A payment never buys a say,
data or a timetable.

### A. The lines

Each is asked who pays, when, after what value, for what, whether it earns more
if she is stuck, whether it can be delivered, its margin and its support
burden. Prices are a prediction written on 2026-09-11; none is on a screen.

| Line | Who pays, and when | Earns more if she is stuck? | Delivery, margin |
|---|---|---|---|
| **Talking it through, with a matchmaker** (the call; was "Deciding together") | The couple, once per person for life, after the joint view (`he-answered`). Never at a declared stage: `deciding` is a free word (`docs/DECISIONS.md` decision 16) | No: once for life, paid before the decision, the same whatever they decide | About 1.5 founder hours; $99, about $64 an hour after fees |
| **The first year married, as a gift** | A guest, at the wedding; the couple are never sold to | No: bought once, by someone else, never on "if things get hard" | A sheet, not yet written; $79 |

Retired: **a matchmaker in your corner** (the families' fee at the nikah) and
the free year for those counted before their pool opened, with the
marketplace. **Sponsor a place**, removed from `src/data/ending.ts` and
`src/components/Ending.tsx`: money for a place that costs nothing, on the
screen a marriage is reported from; if it returns, it has a stated use and its
own gate, never on the Ending. **Events**: a ticket earns most from whoever
stays single. **Niyyah+**, a monthly unlimited guide, is the counter-example.

### B. The gates

**The call** is sold under its own name, only after both have seen the joint
view, by someone with no stake in the answer. (1) Given free to the first five
couples who ask: at least 3 say it changed what they talked about, none says it
pushed them, hours are written down. (2) At least 10 couples reach the joint
view in a month (`/progress` `he-answered`). (3) Offered by hand, with a hosted
link, to ten couples: at least 3 buy. Step 3 waited for public launch, the day
the first pool opened; with no pool, a launch day must be written first. **The
gift**: the sheet is written and given free to the first married couples, 2 say
it helped, and someone asks unprompted to give it.

### C. Payment identity

A code is the only identity Niyyah holds. Payment records stay with the
processor, never in Blobs, `/export` or the learning record; nothing bought is
delivered by her map code. First: an entity, terms, refunds, a mailbox that
answers, a tax decision, and a line on Trust saying what a payment reveals.

### D. No payment infrastructure: the decision, and when it changes

**Nothing is built for payments until a gate in section B passes.** Then money
is taken by hand, through a hosted payment link, and code comes only at about
ten transactions a month on a line; that commit deletes "No gate has passed"
above and changes `tests/monetization.test.tsx`. Nothing in the app asks
whether someone would pay; that is learned in conversations
(`docs/RESEARCH.md`).

### E. The incentive audit

Every sentence that names a paid stage, a price or money is read against the
test above and checked for truth, at every release that touches one, under a
new date. The first run (2026-09-24) fixed every fail; most were on Plus and
Profile, since gone, and one was the Ending's sponsor-a-place.
`tests/monetization.test.tsx` holds the rest: Trust's promises, with no price;
the guide never sells, because the day it says a human one costs money the
advice is a funnel; the Ending asks for no money; no payment SDK.

### F. Kill criteria, stated before the data

**The call**: fewer than 3 of 5 free calls change what the couple talked about;
fewer than 3 of 10 buy; any couple says it pushed them; calls average over 2.5
founder hours (repriced or stopped, not squeezed); couples who had it end from
`deciding` at a sharply different rate and the conversations say the call made
the trouble rather than found it. A higher ending rate over something they
found is not a kill: it may be the call working (`docs/DECISIONS.md` Part 15). **The
gift**: ten married couples use the sheet free and nobody asks to give it.

## 6. What we measure, and what we never build

Screen time, messages and swipes rise when a person is stuck, so the only
measurement is a ladder of rungs, each a claim about her life
(`src/lib/rungs.ts`): `arrived`, `situated`, `mapped`, `kept`, `read`,
`eleven`, `asked-him`, `he-answered`, `followed-through`, `deciding`,
`married`, each counted on its own. `kept` is apart from `mapped` because a map
dropped and a map kept are different failures. Lagging outcome: decisions made
after a conversation here per hundred `arrived`, married and ended alike
(`facts.decisions.open`); `married` per hundred is a count, never a grade; distribution: arrivals by source per hundred
followed-through (§9).

Beside each rung, what it was made of (`src/lib/facts.ts`): ids from closed
lists, never a sentence (the rated grounds, the read's band, the eleven's one
to open, conversations confirmed, why a courtship ended, the three answers on
the way out, questionnaires begun, whether she asked the guide), crossed
against how the decision was made in the readout (`facts.decisions`), with
marriage as a description, never a grade. It travels only while Trust's "Tell us which
steps you reach" (`countMe`) is on, under an install code that cannot be joined
to her map code, and every split by a quasi-identifier is floored at five
(`netlify/shared/floor.ts`). Field by field: `docs/PRIVACY.md`. **Never
measured**: active users, time in app, replies sent, check-ins, sessions.

**Never built, by name.** Anyone should be able to reject a proposal by
pointing at a line; these mechanics came back once without anyone choosing
them.
- A score on a person, hers included. A feed, a deck, a swipe.
- A daily ritual, a streak, a milestone counter, a comeback nudge.
- "Who liked you", interest limits, paid visibility, filters as a paid tier.
- A guide-reply counter she can see, or an unlimited tier.
- Photos, messaging between members, or a profile before there is a room.
- Notifications about people. A referral reward, an invite counter,
  share-to-unlock, or a link that carries who sent it.
- Any mechanic whose success is measured by its own repetition.
- Anything that follows a marriage: a check-in, an anniversary message, "are
  you still married?", a question about how it is going. A marriage is not
  proof the reasoning here was good, and watching one to find out is
  surveillance (`docs/DECISIONS.md` Part 15).

## 7. What an instrument may claim

No introduction has been made, no marriage has come out of this product, and
the literature gives no algorithm that predicts relationship success from
self-reports: matching sites have shown no evidence (Finkel et al. 2012),
desire for a particular person could not be predicted before meeting (Joel
et al. 2017), and within a relationship, change over time was largely
unpredictable (Joel et al. 2020). Every weight here is
editorial: fine for an order, never for a grade. **A number may order what is
shown, never grade a person or a pair to them; "not known" is said, never
scored; no screen claims predictive power.** `tests/voice.test.ts` scans `src/`
for the overclaims ("predict", "carry the most weight", "most couples never",
"Grounded and ready", "will find you someone"). What any sentence may claim
about people, relationships or Somali families is capped by its class in
`docs/RESEARCH.md`'s evidence ledger.

### S3. The read's weights and bands

Weights (public .26, intent .21, consistency .20, pressure .19, family .14)
summed into a band could call a man "strong" who goes quiet on hard things.
**Removed.** The band is read from the five states on her screen: **strong** if
being known is *shown*, nothing is *not yet* and four of five are *shown*;
**thin** if more are *not yet* than *shown*; **mixed** otherwise. Ties break by
`PRIORITY` (public, pressure, intent, family, consistency), an order stated as
an order. The copy says "not a verdict on {him}, and not a prediction"
(`src/lib/read.ts`).

### S4. The read's option weights and `stateOf`

Option weights 0–1 and `stateOf` at .7 and .35: editorial, which answer shows
more of the thing. **Kept, as an ordering of answers**, shown as three words
and her own notes. An answer that says nothing about him ("I have not told
{him}", `nonneg: 'untold'`) is `null`, not scored as half. The man's variants
(`ManVariant`, `src/data/read.ts`) stay: the road is not symmetric.

### S5. The map's grounds

Faith, family, children and timeline were weighted as readiness, and a Muslim
whose faith is private was told it was her thinnest ground. **Positions are
described, never rated.** Faith, family and vision read "Your position", in her
words, with no state and no weight. Only the four rated grounds (intention,
character, steadiness, knowing yourself) decide the headline and the thinnest
ground (`src/lib/reflection.ts`, `src/data/intake.ts`).

### S6. Before-you-say-yes and the couple joint

Each topic's `consequence` (.6–.95) and `STATE_URGENCY` pick "the one to open
this week". **The order stays, because something has to be opened first. No
difference is light.** A top tier once told a couple who differed on qabiil
that theirs "isn't the ones that carry the most weight". A difference is now
counted in words ("One conversation is still open between you"), whichever
topic it is (`src/lib/beforeYes.ts`).

**No difference is a verdict, either** (`docs/DECISIONS.md` Part 8). Not
agreeing is an answer: a difference is still open, worked out (`settled`, an
arrangement both keep), or a line for her. Which kind is hers to say, per
difference, never the topic's: no topic is pre-sorted as negotiable or as
non-negotiable. An arranged difference is not reopened ahead of anything
unsaid, and a line is never handed back to her as the conversation to
work on. Nothing says a difference "doesn't line up yet", or that the two
of them "match".

G1–G8 (the gate), S1–S2 (the weighted fit), U1–U4 and U6 (the pool) went
with matching on 2026-09-24 (`docs/DECISIONS.md`). U5, `K_FLOOR` 5, is a
privacy control. U7: per-answer weights, rated-ground weights and
`consequence` are editorial orderings, never summed or shown as numbers.
Authority is earned back by hand: after twenty endings, `ended.which` may
revise `consequence`, citing the count.

## 8. The risk register

Every system was held against Cagan's four risks on 2026-09-17, by one rule:
"already built" is not evidence of value; a person other than the founder
choosing it is. Nothing had that. The systems rated UNNECESSARY (the vouch, the
pool and sample, Plus) and the AT RISK door went on 2026-09-24. A closed risk
is struck through with its date, never deleted.

| Id | Risk | The rule in the code that answers it |
|---|---|---|
| **R1 · Value** | Never chosen by anyone | No code: five sessions on `docs/PROTOCOL.md`'s script at `/tools/is-he-serious` or `/tools/is-she-serious`; three days later, count who reports a conversation. Two or more of five: the read and the eleven lead every post. Zero: nothing new is built until the founder knows why. Entries in `docs/RESEARCH.md` |
| **R2 · Usability** | The read's result was a wall: 593 words, eight calls to action | `src/components/Read.tsx`: the band, the one question and two actions; the rest behind "More you can do here". Home's stage band no longer repeats its cards |
| **R3 · Feasibility** | Screens promised what the code could not do ("we write to you") and held personal data on the promise | The promises became the present tense, and `tests/voice.test.ts` fails on them. `netlify/functions/sweep.ts`, weekly, makes every stated lifetime true: kept maps after a year, couple sheets after ninety days, step counts after a year unless `married`; and it empties the retired `cohort`, `contacts` and `vouches` stores |
| **R4 · Viability: safety, privacy, legal** | Forget me could erase the other side's safety report; the public tools had no notice | Forget me touches no report; a report stays until the founder resolves it (`netlify/functions/keep.ts`, `docs/SECURITY.md` O1). Trust is one tap from both public tools and Back returns there (`Read.tsx`, `BeforeYes.tsx`, `src/hooks/useNiyyah.ts`); `CONTACT_EMAIL` is on Home and in Forget me |
| **R5 · Viability: cost, supplier** | The one route that spends money failed open | `overCapOrUnknown` (`netlify/shared/limit.ts`): the guide checks the day, then the hour, and a count it cannot read is a refusal; the offline voice answers. The console spend limit is the founder's; its row in `docs/OPS.md` stays blank until set |

**Standing risks.** One safety incident in a tight community can end this;
the dormant close switch (`netlify/edge-functions/gate.ts`) shuts every route
in one deploy. The wrong tone makes this the "corny Muslim app". Drift (§6).
Over-index on women's trust. People who know each other can recognise each
other's facts: no photo, name or free text on the server, and the k-floor.
**The founder's, not code**: the sessions, the spend limit, and a read address
for `VITE_CONTACT_EMAIL`.

## 9. How it spreads

In this community, nothing that says "I am looking" gets forwarded: a profile,
a match, a map (class F: `docs/RESEARCH.md`, open question 2). What gets said to a friend is about *him*, a *conversation* or
a *couple*. So the words travel and the product is the footnote: every
invitation (`src/data/invite.ts`) is about the instrument and the friend, never
the sender's own use of a marriage product, and what travels is text (the
image path, `card.ts` and `shareImage()`, had no importers and was deleted).
The loops: "I said the words, and something happened"; the two-sided eleven;
the family words, across generations; the couple it worked for.

Every link opens the instrument it describes (`src/lib/entry.ts`); only
`docs/ASSETS.md` declares a URL live. A link may carry `via=`, the kind of
thing that carried it: `words`, `eleven`, `couple`, `family`, `married`; a kind
of room, `group`, `alumni`, `professional`, `mosque`; or `press`. Never who
sent it, never which room; first arrival wins (`netlify/shared/vocab.ts`).

### The wedge

A channel, not a brand. The first forty are found in the **Twin Cities, aged
twenty-five to thirty-four, through the alumni and young-professional networks
where women and men already mix** (SSA-UMN alumni, the SNABPI Minneapolis
chapter), with the mosques' young-adult circles second. No copy says "alumni"
or "professional". The metro holds the largest Somali community in North
America (about 84,000), 25–34 is where family pressure turns weekly, and these
networks run on group chats. Columbus is second, Toronto third, the UK later.

**How to acquire it**, inside §6: (1) ten connectors, by name (the SSA-UMN
alumni board, SNABPI chapter leads, the networking-night organisers, two imams
with young-adult programmes), one ask each: post the link; (2) the eleven
first, `/?eleven&via=alumni` (or `professional`, `mosque`), then the read, as
"he answered the same eleven on his own phone" is what a stranger repeats
(`docs/DECISIONS.md` decision 6); (3) one "before you say yes" evening with a
chapter; (4) the room-kind rows of `vias` and `sidesByVia`, weekly.

**The eight-week rule.** After eight weeks, fewer than five men who arrived
through a room link (`sidesByVia.man.group.arrived` and its `alumni`,
`professional`, `mosque` siblings) means change the channel first, the city
second (Columbus). A man who came through someone's eleven is already talking
to her, and `press` asked nobody by name; neither counts (`src/lib/entry.ts`).
The rule's other half, twenty women counted, read the door, which is gone.

## 10. What is next

**The product freeze (decision 19).** No new feature enters the build without
one of:
1. observed user evidence, as a dated entry in `docs/RESEARCH.md`;
2. a production failure;
3. a safety or security requirement, as a `docs/SECURITY.md` or `docs/PRIVACY.md` id, or a legal duty;
4. a measurable business requirement, as an experiment id in `docs/RESEARCH.md` with its decision rule already written.

A feature is a new screen, instrument, route, store, stored field, setting, or
outbound flow of data. Fixing what is broken or untrue, deleting, security
updates, tests and docs are not features. The older rule, "records a vote that
would otherwise be lost", is now case 4. Every PR names its case. The list
below is gated by the same rule.

**Definition of done for this version.** It is ready for real use when:
1. The three blockers of the completion review are merged (`docs/DECISIONS.md`, Part 3). `npm run verify` and `npm run build` pass, and the deploy smoke check is green.
2. On a real iPhone, in Safari and as an installed app:
   - a tool link, then the read, then "Now the other half of it", then Back, lands on "Enter Niyyah";
   - "Ask him" opens the share sheet on the first tap;
   - a second phone answers, and the first sees where they stand;
   - the guide gives two live answers;
   - "he threatened me" and "I want to die" on Home each show a help line.
3. The founder's facts:
   - `VITE_OPERATOR_NAME` is set in Netlify, redeployed, and shown on Trust;
   - a test email to the contact address arrives;
   - the Anthropic console's monthly spend limit is set and written into `docs/OPS.md`.
4. `npm run eval:guide` has run once and its hard gates pass.
5. The first 3-hourly `/health` run is green, GitHub's failed-workflow email is on, and `curl -sI` on the site shows the CSP and `frame-ancestors` headers.

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
