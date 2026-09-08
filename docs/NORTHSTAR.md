# Niyyah — the problem, the purpose, and every screen against them

> Everything this company believes about why it exists is already written down
> — in two long documents, across two versions, in six different framings:
> "structurally unserved", "peace over anxiety", "success is deletion",
> "conversations found out too late", "opened when something happens", "a
> conversation they were not going to have." Every one is true. None is one
> sentence. This file says it once, and then holds every screen up to it.

## PROBLEM — the failure that deserves to disappear

**Finding out too late.**

Somali singles in the diaspora lose years to people who were never serious, and
enter marriages that break over things nobody said aloud. The questions that
decide a marriage — where you'd live, money sent home, his family in your home,
a second wife, qabiil, whether he has ever said the word *marriage* without
being asked — get answered *after* the families are involved, when saying no
has stopped being a private decision and become a public cost.

Every room that exists makes it worse in its own way. One exposes her to people
who will talk. One wastes her months on men who were never serious. One judges
her and knows forty people. None of them helps anyone find out early.

## PURPOSE — what becomes meaningfully better

People stop losing years to courtships that were never going to work, and stop
entering marriages they could have talked themselves out of. The conversations
that decide a marriage happen *before* the yes — and the one about seriousness
happens in the first month, not the sixth. Families come into the room by
invitation, not ambush. And the ones who marry, marry someone they actually
know, which is the only thing that makes the marriage after the wedding hold.

## NORTH STAR

> **Every screen exists to move one person from finding out late to saying it
> early.**

The measure is the one the product already keeps, unchanged:
**`followed-through` per hundred `arrived`** — of everyone who opened this, how
many had a conversation they were not going to have (`src/lib/rungs.ts`,
`docs/PRODUCT.md` §6). It is the right number because it is the observable
unit of the purpose: every hard thing said early is one not found out late.

The test for any screen, component or line of copy, in two questions: *does it
help someone find out earlier?* — and *does it end in something they can say?*

## Every screen, against it

| Screen | Verdict | The line that decides it |
|---|---|---|
| **Read** (`Read.tsx`) | **Core** | "Eleven questions about what he has actually *done*." Seriousness, found out in ninety seconds instead of six months. Ends in the one question to ask next |
| **Before you say yes** (`BeforeYes.tsx`) | **Core** | "The conversations most of us have too late." The eleven, recorded only as *had / not had*. The Problem statement is this screen's headline |
| **Couple** (`Couple.tsx`) | **Core** | His side of the eleven, on his own phone, no account. "That is how the scarce side of this marketplace arrives" |
| **Families** + **ScriptCard** | **Core** | The words to say to a wali, to hooyo. "A verdict she cannot act on is a horoscope" |
| **FollowUp / FollowedThrough** (`home/FollowUp.tsx`) | **Core — the North Star itself** | "Have you had it?" The one place the product asks about her life. "You had it. That is the part most people never get to" |
| **Ending / Ended** | **Core** | The exit, and why courtships end — "the dataset nobody has." Ended says first that ending is allowed |
| **Door / Cohort** | **Core (trust)** | The honest count. Refuses to fake a room |
| **Vouch / VouchRow** | **Core (trust)** | The only verification claimed |
| **Trust** | **Core (trust)** | "This is what a serious person looks like here." Rebuilt from five switches that enforced nothing |
| **ReportConcern** | **Core (safety)** | The one place a real person can be reported |
| **Situation** | **Core** | Routes by stage. Its `talking` line is the North Star in one sentence: *"Then the question isn't whether you're ready. It's whether he is."* |
| **Home** — ask box, moment chips, read card, stage band | **Core** | "Something happened?" The read card is "the one thing aimed squarely at the highest-pain problem we can actually solve today" |
| **Welcome** | **Was weak — strengthened** | See below |
| **Hook** | Aligned | Five hardest parts; the insight is the thirty-second reward. Its CTA now says "Build my map" |
| **Identity** | Aligned | Gender, name, 18+. Nothing between here and the first insight |
| **Intake** | **Was weak — strengthened** | The three marriage-breakers moved into chapter two; sixteen questions. See below |
| **Reflection** (the map) | Aligned | Grounds in words, never a number; the work card turns diagnosis into one thing to do. Eyebrow now reads "Your map" |
| **Profile** | Aligned | Rebuilt from a marketplace profile into "what decides who you meet." Still the place to change the three how-you'd-live answers, which are now first asked in the map |
| **Coach** (the guide) | Aligned | Closes, remembers outcomes, budgeted by progress. Auntie and Brother are moment-driven; the Matchmaker now says plainly there is nobody to introduce yet |
| **Plus** | Aligned | No tiers, no prices, no buy button. A promise page: "We never earn more because you're having a hard night" |
| **Philosophy** | Tolerated | A stance page reached only by "Why we're different." The lexicon earns its place |
| **SampleIntroduction** | Tolerated | One invented person, said to be invented four times. "Sharpen this read" now edits answers she first gave in the map |
| **TodaysReflection** (`home/`) | **Removed** | See below |
| **KeepMap / RestoreMap** | Infrastructure | Aligned by being invisible |

## Weak alignment, and what was done

### Welcome's lead sold the map — **strengthened in this pass**

The headline was right and stage-neutral: *"What's actually in your way?"* The
lead underneath promised *"thirteen questions, about two minutes… the one place
you're thinnest"* — the map — and demoted the read to a card at the bottom.
The flow behind the button already routed by stage; only the person not
talking to anyone ever reached the map first. So the front door promised the
least-aligned instrument and the code beneath it said so five times over:

- `Welcome.tsx`: *"The map answers 'am I ready' — which ranks near the bottom of
  what actually hurts… a toll gate, not an onboarding, and it is where we lost
  Samira."*
- `Situation.tsx`: *"that toll gate is where Samira quit."*
- `Read.tsx`: *"the toll gate this product kept mistaking for an onboarding."*
- `Home.tsx`: *"the one thing aimed squarely at the highest-pain problem we can
  actually solve today."*
- `data/moments.ts`: *"'Is he serious?' is the highest-pain question we can
  answer."*

The lead now promises the routing that exists — *say what's happening, and we
start there: a read on what he has actually done, the eleven conversations most
of us have too late, or two minutes on where you stand.* The read is in the
first breath. Headline, bullets and the second door are unchanged. It is the
single highest-leverage alignment fix in the product, because it is the
sentence every person reads before deciding whether to tap.

### The intake's composition was inverted — **decided: the three moved in**

Thirteen questions, cut from twenty-three on the evidence of two testers who
did not finish. The *cap* is right. The *composition* is not: five of the
thirteen (`conflict`, `healing`, `attachment`, `pattern`, `working-on`) reach
neither the alignment engine nor any conversation — they feed the reflection's
prose about her, and `alignment()` never reads them. Meanwhile the three
questions `intake.ts` itself calls *"the things Somali marriages actually break
on that no app asks"* — `household`, `work`, `money-home` — are exiled to
Profile and the sample screen, which the code describes as *"a screen she may
never open."* The map asks about her attachment style and defers whose house
they would live in.

**The call.** The three moved into chapter two, where the intake already says
"the life you want." Thirteen became sixteen, one optional. The evidence behind
the cap was two testers who did not finish twenty-three; it says nothing about
sixteen, and A1 (`docs/EXPERIMENTS.md`) now measures completion, so the cap is
policed by a number rather than a memory. Chapter three stays whole — the
seven grounds are the map, and gutting two of them to make room would have
traded one misalignment for another. If A1 fires (completion under 50% at
twenty arrivals), the one chapter kept is the one with the marriage-breakers
in it.

### "Readiness" survived as the map's name — **renamed**

`docs/PRODUCT.md` §3 rebuilt the map away from a readiness score. The word
survives in five UI sites — the Hook's CTA ("Build my readiness map"),
Reflection's eyebrow, Philosophy, the Matchmaker's greeting, and the `ready`
hook insight. The word frames the map as "am I ready" — the question the code
ranks near the bottom. **Done:** "your map" in every place a member reads it.
The emotional ground keeps "Emotional readiness" — there the word names a real
thing she is being read on, not the frame around the whole instrument.

### The Matchmaker voice presumed a marketplace — **re-aimed**

*"I've read your readiness map, and I'm looking for…"* — for whom? Nobody is
here. Its starters are generic ("What kind of person actually fits me?") where
Auntie's and Brother's are moment-driven ("He only texts me late at night";
"What do I say to her wali?"). The code already admits it *"used to rank
invented people by name."* **Done:** it now opens by saying there is nobody to
introduce yet and that it will not pretend otherwise — and that what it can do
is get her clear on what has to be true of the person before she meets anyone,
so that she finds out early rather than late. Removing the voice was
considered and declined: "what should I look for first" is a real question a
preparing person has, and A3 governs the guide as a whole.

### Two things that were simply wrong — **fixed in this pass**

- The guide picker read *"Six guides. One you."* There are five.
- The family member's vouch form said *"Her father"* to every father, including
  a man's. That screen opens from a token that resolves to a code and nothing
  else, so it cannot know who sent it. The labels are neutral now.

## Distractions

- **TodaysReflection — removed.** A daily rotating content card on Home with a
  share-as-image whose text read *"From Niyyah, the marriage platform built
  for the Somali diaspora."* It did no North Star work — it helped nobody find
  out anything earlier and it ended in nothing they could say. `docs/STRATEGY.md`
  §6 names "a daily ritual" as never built; its own comment had already removed
  the "Tomorrow · Patience" tease as "a comeback hook." What remained was a
  vitamin on a painkiller's home screen, and a share whose message was the
  product rather than a conversation — the inverse of `docs/PRODUCT.md` §9's
  rule that the words travel and the product is the footnote. `docs/PRODUCT.md`
  §0 had kept it as "a reflection worth reading"; that line moved with it.
  Gone with `src/data/daily.ts` and `src/lib/personalize.ts`, which nothing
  else used.
- **`alignment()` has one production caller** — the sample screen. Two hundred
  lines of matching engine whose only consumer is a demo of an invented person.
  Not wrong: it is the designed-not-built marketplace, waiting for a room.
  Worth knowing, so nobody mistakes it for a feature that is running.
- **`docs/STRATEGY.md`'s epigraph** still read *"powered by AI, guided by faith,
  designed for serious people"* — the tagline `docs/DURABLE.md` removed from
  the product and never from the founding document. **Fixed in this pass.**

## Missed opportunities

- **The eleven, alone, for the preparing person — declined, and delivered
  another way.** The idea: *"I don't know my own answer yet"* is already a
  state, so a woman not talking to anyone could learn her own answers on
  money home and a second wife before there is anyone to ask. Declined as a
  separate instrument: every question in the eleven is framed *"have the two of
  you talked about this?"*, which a person with no "two" cannot answer, and a
  second framing of the same eleven would be a new instrument, not a routing
  change. What it was *for* is delivered by the intake decision above — she
  now gives her own answers on the three highest-consequence topics inside
  the map she is already routed to — and by one more wiring: the eleven now
  shows *"You told your map…"* beside "Where you'd live", "Whether you'd work"
  and "Money sent home", so six of the eleven carry her side instead of three.
  When she does the eleven with him, her own answer is already on the screen.
- **The three marriage-breakers belonged in the map, not behind a demo.** Done,
  above.

## What this pass changed

- `src/components/Welcome.tsx` — the lead promises the routing, not the map; the
  pull-quote beneath it ("the one place you're thinnest is two minutes away")
  becomes the one thing every instrument ends in — the thing to say next.
- `src/data/intake.ts` — `household`, `work`, `money-home` move into chapter
  two; thirteen becomes sixteen. `src/data/beforeYes.ts` — those three topics
  now show her side from the map. `src/lib/reflection.ts` — a snapshot carries
  them, so the next reading can say whose house changed.
- `src/components/Home.tsx` — TodaysReflection removed, with `src/data/daily.ts`
  and `src/lib/personalize.ts`; `Philosophy.tsx`'s lexicon entry for "Your
  space" no longer promises "a thought worth carrying."
- "Readiness map" → "your map": `Reflection.tsx`, `Hook.tsx`, `Philosophy.tsx`,
  `data/hook.ts`, `lib/coach.ts`, `docs/STRATEGY.md`, `README.md`.
- `src/data/coach.ts` — the Matchmaker's greeting.
- `src/components/Coach.tsx`, `src/lib/coach.ts` — five, not six.
- `src/data/vouch.ts`, `src/components/Vouch.tsx` — neutral relationship labels.
- `docs/STRATEGY.md` — the epigraph, and a pointer here; `docs/PRODUCT.md` — a
  pointer here, so the six framings resolve to one place; `docs/DEMO.md` — the
  same tagline, in the founder's opening line.

## Revisions

_Dated, one line each: a screen whose verdict changed, and the readout or
decision that changed it._

- 2026-09-08 — First pass. Welcome's lead moved from weak to aligned; two bugs
  fixed; the intake, the Matchmaker voice, TodaysReflection and the eleven for
  the preparing person recorded as decisions with rules, not as changes.
- 2026-09-08 — The four calls made, same day. Intake: weak → strengthened (the
  three moved in; sixteen). TodaysReflection: distraction → removed. "Readiness"
  renamed; the Matchmaker re-aimed. The solo eleven declined and its purpose
  delivered through the map and six "your side" lines.
