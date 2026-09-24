# Differentiation: what survives a copy (2026-09-24)

**Question.** Assume every competitor can already credibly claim the following:
- Somali-specific
- marriage-first
- no casual dating
- wali/family involvement
- identity verification
- photo privacy
- compatibility matching
- faith/deen filters
- marriage timelines
- relocation
- Somali culture
- qabiil-aware features
- no swiping

Those claims are commoditising. What is left?

## The answer

> **If every competitor copied our homepage tomorrow, what would still make
> Niyyah different once someone actually uses it?**
>
> Copy the homepage and you copy a list of promises: Somali, serious,
> faithful, family-minded, private. Use Niyyah and it does something else.
> **It works on the relationship you already have.**
> - With no account, it tells you what he has actually done rather than what to feel.
> - It gives you one conversation and the exact words for it.
> - A few days later, it asks whether you had it.
> - It puts the same eleven questions to him, on his own phone, blind, and
>   shows the two of you only where you stand.
> - When you marry, it lets you go and takes itself off our server.
>
> A marketplace's unit is a match, and it is paid while you look. **Ours is a
> conversation that actually happened, and we are paid when you stop needing
> us** (`docs/MONETIZATION.md`).

**What a copy can take.** The words can be copied in a month: the repository is
public (`docs/OWNED.md`). The mechanism can be copied only by giving up four
things a marketplace's business runs on:

| Structural difference | Why it is hard to copy |
|---|---|
| The instruments open from a bare link, with no account and no install (`docs/BOARD.md` §1, FACT) | An app-store funnel is an account funnel. Serving someone who never signs up is revenue lost |
| They serve a relationship that began elsewhere: a wedding, a cousin, another app (`src/components/Read.tsx`) | A marketplace serves its own inventory. Helping a woman decide about a man she met somewhere else sends her out of its funnel |
| The two-sided eleven reaches the man on his own phone, blind, with no account (`src/components/Couple.tsx`) | The man is not a member and may never become one. Building a feature for a non-customer, which reveals nothing about either side, has no growth case |
| It asks whether the conversation happened (`src/lib/followup.ts`) | They measure sessions, likes and matches. A conversation off the platform is invisible to them, and good for them only if it never happens |
| The Ending: "you can delete the app", and Forget me on the same screen (`src/components/Ending.tsx`) | Subscription revenue depends on the member staying. A designed departure only pays if the business is paid at the exit |

So the signature is **the loop**:

1. a read, or the eleven;
2. the words;
3. did you say them?
4. where did you land;
5. the two of you, blind;
6. the Ending.

Each part exists elsewhere in some form. The whole loop, run on a relationship
the product did not create, does not.

## The four tiers

Evidence labels follow `docs/BOARD.md`: **FACT** means true of the code; **INFERENCE**
means reasoned from facts; **HYPOTHESIS** means untested. Real member evidence is
still zero (`docs/WEDGE.md`), so every claim about *users* is a hypothesis.

### Table stakes: expected, and not a reason to choose us

| What | Here | Status |
|---|---|---|
| Marriage-first, no casual dating, no swiping | The whole product | Have it. Commodity |
| Photo privacy | No photos exist anywhere | Have it, by absence. Commodity |
| Faith and family in the frame | Deen and family on the map, the wali in the scripts, the vouch | Have it. Commodity |
| Somali cities and texture | `src/data/scenes.ts`: 17 cities with neighbourhood notes | Have it. Commodity |
| A city waitlist and relocation | The door, the country pool, reach | Have it. Commodity |
| Compatibility gates | `netlify/shared/gate.ts`: blocks only plain contradictions; no percentage | Have it. Commodity |
| Timelines | The map's timeline question | Have it. Commodity |
| **Identity verification** | An 18+ tap (`Identity.tsx`) | **Below table stakes.** Competitors check a selfie or an ID |
| **Family verification** | The vouch: a relative confirms through a link, unverified, for one side only | **Below table stakes** (`docs/REDTEAM.md` #5) |

**Decision.** Verification stays below table stakes until a pool opens. Nobody
is introduced before then, so there is no one to verify against, and building
it now would collect identity documents with nothing to protect. The gate is
the same as the matchmaker's (`docs/MONETIZATION.md`, challenge 2).

### Differentiators: copyable, but nobody emphasises them

| What | Where | Label |
|---|---|---|
| The honest door count: never seeded, "we never pretend a city is full" | `netlify/functions/cohort.ts`; `Cohort.tsx` | FACT that it exists. HYPOTHESIS that anyone cares (`docs/REDTEAM.md` #6) |
| No number on a person, and none on a match | `src/lib/read.ts`; `src/lib/matching.ts` | FACT |
| The read as a behaviour instrument, ending in one question, word for word | `src/lib/read.ts`; `src/data/read.ts` | FACT. BOARD §5 calls it "generic relationship coaching with one community-specific weight" |
| Family scripts as sentences, not a "wali mode" | `src/data/families.ts` | FACT. Seven per side since this change |
| The eleven's content: qabiil as "will a family raise it", money home, a second wife, going back | `src/data/eleven.ts` | FACT (BOARD §4). The content is copyable |
| Printed sheets for imams and nikah coordinators, including a Somali one | `public/…-sheet-so.html`; `docs/SHEET.md` | FACT. An institutional channel no app has |
| Zero permission prompts before value | `docs/VALUE.md` | FACT, measured |
| The guide, in five voices | `src/data/coach.ts` | The **most** copyable thing in the product (`docs/STRATEGY.md`: "fake complexity") |

### Signature product: a different experience in use

| What | Why it is different in use | Where |
|---|---|---|
| **Decision support for a relationship that began elsewhere** | Opens on a link a friend forwards. No account. The read, the eleven, the family words, all before any intake | `src/lib/entry.ts`; `/tools/*` |
| **The two-sided eleven** | He answers on his own phone. Neither sees the other's sheet. Both see only where they match, and which conversation one thinks happened that the other doesn't | `netlify/functions/couple.ts` (`joint()`, symmetric by construction) |
| **Follow-through** | Every result writes down what it told her to do, and days later asks whether she did it. "We talked" is the North Star numerator | `src/lib/followup.ts`; `src/lib/rungs.ts` |
| **Words to say** | Every instrument ends in a ScriptCard: why, the words, and what the answer tells you. The words travel to a friend with the product as a footnote | `src/components/ScriptCard.tsx`; `src/lib/words.ts` |
| **Successful deletion** | The Ending gives her record and says she can delete the app, and Forget me is on the same screen | `src/components/Ending.tsx`; `src/components/ForgetMe.tsx` |

### Compounding assets: honest status, none compound yet

| Candidate | What makes it compound | At zero, today |
|---|---|---|
| Outcome-calibrated constants | The monthly readout revises one constant at a time. The revisions log records why, with a count and a date (`docs/OPERATING.md`). The lineage is what a copier cannot have | The log is empty, and `docs/CONSTANTS.md` does not exist. Every constant is a founder opinion in a literal |
| Where pairs diverge | `tallies/joint`: which of the eleven couples most often think they have talked about when they have not. Kept for ever, with no code | Zero pairs |
| Why courtships end | `facts.ended`: stage, reason, which topic. "The dataset nobody has" (`docs/LEARNING.md`). It needs no marketplace | Zero endings. A rolling one-year window; only married records are kept for ever |
| The married referral | `via=married`: the one share only a married person can make | Zero marriages |
| The institutional channel | Sheets in mosques and with nikah coordinators, forwarding the `mosque` and `group` vias | Placements sent, none answered (`docs/ASSETS.md`) |

**The rule.** The moat is `docs/OPERATING.md` run every month, not the contents
of `src/data`. The loop fixes below matter here too:
- a follow-up asked on the wrong side, or about a different conversation to
  each half of a pair, makes `through` and the couple tally wrong;
- a follow-up never asked (a stranger with no Home, a "not yet" closed for
  good) makes `through` short.

## The loop audit: where the signature was broken, and what changed

Each break was found by walking the instruments in code (2026-09-24), and each
is fixed in this change.

### The read

| Break | Fix |
|---|---|
| A man's follow-up looked the words up in her table: three days later he was asked whether he had put "How would you want to approach **my** family?" to a woman | `scriptFor(topic, gender)` (`src/lib/followup.ts`) |
| After "Send nothing more…" or "Tell one person…", the primary card invited her to send him the eleven | After a caution, the primary card is the words for her family, and nothing on the screen is for sending to him |
| The guide was told every caution was "being kept hidden", including a money request | `readSummary` names the money request (`concern`) |
| Only the thinnest gap got words | "Words for the other gaps", one question each |
| A retake overwrote the last read, so "has anything changed?" was asked and never answered | The result shows what moved since the last read. The record stays on the phone (`read.previous`, left out of the kept map) |
| A forwarded `?read` opened on "who are you reading?" before any explanation | The chooser is folded into two start buttons |

### The two-sided eleven

| Break | Fix |
|---|---|
| His phone kept no pair: his Home never showed "Where the two of you stand", and his result asked him to start a second, crossed sheet | His phone keeps the code and the joint he was shown (`couple.side = 'second'`). GET by code returns only that symmetric joint, so nothing new is revealed |
| His follow-up was his individual "one to open", hers was the joint's: the pair could be asked about two different conversations | His follow-up is the joint's too |
| After ninety days her screen said "We couldn't check… that is us" while Home said "He answered" | The joint is cached when first seen. It cannot change after he answers |
| A joint where one side "doesn't know their own answer" got the topic's words | It gets the own-answer-first words |
| The owner key was dropped: redoing her sheet before he answered left him compared against the old one | The key is kept on her phone. A redo updates her side through the existing owner-key path |
| At "talking", which is where a read-first person lands, Home never showed the eleven again, and "Waiting for him" never appeared on Home | The eleven card shows at "talking" once she has done it or sent it, with a "Waiting for {him}" state |

### Follow-through

| Break | Fix |
|---|---|
| "Not yet" closed the question for good, against its own docblock ("closes nothing") | Asked once more a week later, unless she puts it away |
| Labels read as broken English: "talk to them about the question you were going to ask", also on the Ending's record | Each label is a phrase that reads after "about" |
| A stranger who took family words had no Home, so the question was never asked | Asked on Welcome |
| After "we talked" on a read, "what the answer tells you" was never shown again | It is shown in the "you had it" card |
| Results never said the product would come back to it | One line under the words: the next time you open Niyyah after three days, it asks once |

### Words to say

| Break | Fix |
|---|---|
| `/tools/families` defaulted to her side, so a man was handed "Telling your wali you met him online" | It asks whose side the words are for |
| "Words for two families meeting" was promised free, and married Home promised in-law words; neither existed | Two scripts: before the two families sit down, and when the families pull after the nikah |

### Successful deletion

| Break | Fix |
|---|---|
| The Ending said "You can delete the app", but deleting it left the kept map (a year), the couple sheet (ninety days) and a married progress record (no expiry) on our server | Forget me at the bottom of the Ending, the same component as Trust's (`src/components/ForgetMe.tsx`) |
| Married Home hid Profile, the only route to Trust | Married Home links to Trust |

**Held by `tests/invariants/the-loop-closes.test.tsx`**, a new invariant: every
result ends in words, and a few days later asks whether they were said, on the
right side, for both people in a pair.

## Positioning: the first screens

Every string a search result or a group chat showed was on the commodity list:
- the eyebrow;
- the title;
- the description;
- the social card, which also promised "find someone serious", a marketplace
  with no pool open.

Welcome's three bullets were written against a dating app. The only door for
the person in the most pain, someone already talking to a man, was a card below
the fold.

**Changed:**
- **The description and the social card** say what someone gets on the first
  visit (`src/data/brand.ts`, `public/manifest.webmanifest`).
- **Welcome's bullets**, by the sentence test in `Situation.tsx` ("something no
  alternative in the category would think to say"):
  - it works on the relationship you already have;
  - he answers the same eleven on his own phone;
  - we ask whether the conversation happened, and let you go when you marry.
- **"Talking to someone? Get a read."** is a button beside "Start where you are".
- **The marketplace line is gone.** "We never pretend a city is full" is no
  longer 45% opacity.
- **The README** opens on what is different.

**Kept on purpose:**
- **The eyebrow and the title still name the community.** Being findable is
  table stakes too, and the institution rule keeps the name in
  `src/data/brand.ts`.
- **The guide stays the first thing on Home.** Its routing is the fastest path
  to words, and the loop fixes surface the read and the eleven beside it.

## Considered, and not built

- **A community line on the joint view** ("of the N pairs who answered here…").
  At one pair it is that pair's own joint, and the tally is not floored. It
  arrives as a dated constant through the revisions log, once there are pairs,
  and never live (`docs/ALIGNMENT.md`).
- **Collecting "not yet" and "differently" per topic.** Their share is roughly
  `eleven.open` less `through`, which is already counted. No new collection.
- **Social proof.** Nothing is invented to make a city look full. The married
  count on the door is designed (`docs/FLYWHEEL.md`) and waits for a marriage.
- **Verification.** It stays below table stakes until a pool opens, as above.
