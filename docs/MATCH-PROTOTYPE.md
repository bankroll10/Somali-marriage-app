# MATCH-01 to MATCH-03: the member-journey prototype

Status: a prototype of how meeting someone could work, built on 2026-10-15 (MATCH-01) and revised after the founder's review the same day (MATCH-02, then MATCH-03: less to read at setup, below). **Since release R4 (2026-10-17) it is also the public demo at `/demo/`:** a clearly labelled walk-through with fictional people, built apart from the app. **It promises nothing to anyone.** Real introductions and messaging are not open (release R3), nobody can contact anyone through Niyyah, and the demo says so on every screen. The decisions that allowed it are at the end of `docs/DECISIONS.md` (MATCH-01 for the prototype, release R4 for making it public).

## Run it, and how it is published

```
npm run dev        # then open http://localhost:5173/demo/
npm run build      # the app, then the demo into the same dist/
```

`demo/index.html` is a second HTML entry, built by its own config, `vite.demo.config.ts`, after the app's build and into
the same `dist/`: the page at `/demo/` and its scripts, styles and fonts under `/demo-assets/`. `vite.config.ts` is not
touched, so the app's HTML, sitemap, `robots.txt`, service worker and version file are the app's alone, and the demo
build adds files and changes none. `tests/prototype/build.test.ts` builds the app alone and the app followed by the
demo and holds every file outside `demo/` and `demo-assets/` equal byte for byte.

**What keeps the demo from sending anything.** The page is served with its own Content-Security-Policy
(`netlify.toml`, `/demo/*`): `default-src 'none'`, scripts and styles from itself only, `connect-src 'none'`, no forms,
no `<base>`, no objects, no framing. With `connect-src 'none'` the browser refuses any request the page might try, whatever
the code does. The code is also held to it by source (`tests/prototype/isolation.test.ts`: no storage, network, beacon,
cookie, service worker or build-environment read, anywhere in the import closure) and by output (the built files are
scanned for the same, and for any evaluation or vendor name). The app's service worker neither answers nor caches
`/demo/` or `/demo-assets/` (`src/lib/serviceWorker.ts`), so the demo is never stale, never offline and never the app
shell. The page says `noindex` itself and is not in the sitemap; `netlify.toml` sends no `X-Robots-Tag`, as `docs/OPS.md`
explains.

**Evaluation work stays out.** The demo imports three modules outside its folder (`src/components/ui.tsx`,
`src/data/help.ts`, `src/hooks/useFocusHeading.ts`) and nothing under `tests/`, `netlify/` or `scripts/`. The MATCH-05
evaluation code is not in this tree, and the isolation test would fail if the demo reached any such file.

**One line of production source changed, and its output did not.** Tailwind reads every file under the project
root, so the demo's utility classes (and any class name its tests mention) would have been generated into the
app's stylesheet. `src/index.css` therefore names three paths it must not read (`@source not`): the demo's source, its
page and its tests. The demo has its own stylesheet (`src/prototype/match/prototype.css`) with its own sources
and a verbatim copy of the app's typefaces, theme and base styles; it cannot import `index.css`, because the
exclusions would come with it. `tests/prototype/build.test.ts` holds that none of the demo's files, words or classes
are in the app's output. Reloading clears everything: there is no storage and no network
(`tests/prototype/isolation.test.ts` holds this by reading the source, and the journey test runs under
spies that fail on any fetch, XHR, WebSocket, beacon, storage access or cookie write).

**The entrance (R4).** The first screen is short on purpose: one paragraph that says everyone is made up, that answers stay in
the tab and clear on reload, that nothing is sent and that real introductions and messaging aren't open; a choice of side; and
one button, "Start the demo", which starts the three-suggestion sample. The other two samples and blank answers sit under
"Try another scenario", closed until asked for, and the rules and cases left out are on "What's real here?". A review of the
first version found it read like a testing screen on a phone (several paragraphs, three scenarios and exclusion detail before
anyone had experienced anything).

**Public wording (R4).** Every screen carries the banner "Demo · Fictional people. Your demo answers and messages stay in
this tab and clear when you refresh." and a way to "What's real here?", which states five things first: it is a
demonstration with fictional people; suggestions use fixed rules and sample profiles; summaries and suggested questions are
prewritten examples and no AI model generates them; messages, photo sharing, blocking and reporting are simulated and no
person receives a message or report; and made-up answers only. Fixed text is labelled "Demo example". The panel that
stands in for the other person is "Try another scenario". The demo never says automatic matching is unbuilt (the
rules-based comparison exists and is used), and never describes a simulated report as moderation.

## What it shows

One journey, from a made-up person's side, as a woman or as a man:

1. **Answers, in eight steps.** A made-up name and age, and the ages the person would consider in a partner (see
   "Age" below); then one step for each of six points (timing,
   children, practice, city, work, household); then written answers in the person's own words. Everything is made up,
   and the screens say so. The steps are more focused than the earlier two long screens, but **setup is not shorter
   overall** (see MATCH-02 and MATCH-03 below).
2. **Requirement or preference, per point.** On each point step the person gives their own answer, then chooses
   which answers would work for them, and only then how firm that is: *requirement* (only people who fit are shown),
   *preference* (people who differ are shown, and the difference is pointed out) or *doesn't matter* (not used; the
   answers chosen above are set aside and shown as not used). Nothing is pre-sorted and there is no default: the
   kind belongs to the person, per point, never to the topic (`docs/DECISIONS.md` Part 8).
3. **A limited set of suggestions, no photos.** Eligibility runs both ways. At most three people are shown, in a
   fixed order that is not a ranking, and there is no refill. Nothing is relaxed to fill the screen. When no one
   fits, the screen says so plainly and offers two equal choices, seeing what was asked or stopping; nothing on it
   suggests changing a requirement.
4. **An explanation.** The person's own words come first. Where they differ is the person's answer against the
   answers the tester *selected as preferred* (never against the tester's own answer: a different personal answer
   can still be one that would work), worked out from the structured answers and updating when they change. One
   block carries a plain-language summary and three questions as **fixed text labelled "Prototype fixture"**,
   written for one sample scenario each; if the person's answers no longer match that scenario the text is shown as
   unavailable and never says what the answers no longer say.
5. **Private interest, which can be taken back.** Interest is recorded in the prototype and the other person is not
   told. It can be withdrawn, privately, until a conversation exists. "Not for me" is never shown to the other
   person and can be undone on the confirmation screen that follows it.
6. **A conversation, opened by mutual interest.** Either person may write first.
7. **Photos are optional, explicit and per connection.** Mutual interest never shares one, in either direction. Each
   person shares, or stops sharing, for one conversation only, and the two directions are independent. There is no
   upload and no real photo: the tiles are labelled placeholders.
8. **Disconnect, block and report are visible** wherever a person can be. The copy says what each does in this
   tab and nothing more: a disconnect describes a *simulated* notification; a report says that no one receives or
   reviews it; none claims deletion, enforcement or moderation.

## Sample scenarios and fictional people

Ten made-up people (five per side) with fictional first names, adult ages (27 to 38) and an explicit choice about the
ages they would consider (see "Age" below). Three sample answer sets for the tester give **three, one and no** suggestions, on either side, and they cover people left out by the
tester's requirement, by the other person's, and by both (`tests/prototype/suggest.test.ts`). A tester who starts
with blank answers gets honest results for whatever they enter, and no fixed text. The **Prototype controls**
disclosure stands in for the other people (choosing the tester, writing, sharing a placeholder, ending a
conversation). It has controls for the people who are shown and no list of who was left out or why: the eligibility
diagnostics (who was left out, and by whose requirement) stay in the code and its tests and are on no screen.

## Working, and simulated

| Working (real code, tested) | Simulated, and labelled in the UI |
|---|---|
| The forms; requirement, preference and doesn't-matter | The other people (ten fixtures) |
| Two-way eligibility, the limit of three, no refill | What they choose, write and share: the Prototype controls |
| Comparison of answers, from the data | **AI summary and questions: fixed text, "Prototype fixture", no model called** |
| Private interest; mutual detection; a conversation opens | Message delivery and every notification, including the one a disconnect would send |
| Writing first from either side (kept in this tab) | Photos: placeholders, no upload |
| Per-conversation, per-direction photo sharing | Identity, age checks, accounts, storage |
| Disconnect, block, report as changes to this tab | Moderation, review, enforcement, deletion: none exist |

## State and invariants

A pure reducer over plain data (`src/prototype/match/flow.ts`). A conversation exists only while both people have
chosen; it opens when the second of the two does, in either order, with no photo shared in either direction. Photo
flags and messages are per person; an action about one person changes nothing about another. Once the tester has
chosen or passed on anyone, what they asked for is read-only until a fresh start (withdrawing or undoing back to no
decisions lifts that, as if nothing was done). People passed on stay out of the suggestions and are listed as **Passed on**
(a pass can be undone straight away, so that heading stays true while Undo is on offer); blocked people and ended
conversations are final and are listed apart as **Not shown again**; a block is never undone. Ended and blocked conversations show no thread and no photo and
are never reopened by anything. These are held by example and by random sequences of every action
(`tests/prototype/flow.test.ts`).

### Withdrawing interest and undoing "Not for me" (MATCH-02)

Per shown person: a decision (undecided, interested, passed, blocked), a conversation (none, open, ended, blocked),
and the other person's hidden choice. The tester has one pending `undo`.

| Action | Allowed when | Result |
|---|---|---|
| decide interested | undecided | interested; if the other person has chosen, the conversation opens (the second event opens it) |
| decide passed | undecided | passed; this person becomes the pending `undo` |
| `withdraw` | interested and no conversation | undecided. Nobody is told; what the other person chose is untouched |
| `undoPass` | passed, pending `undo`, no conversation | undecided. Never restores interest and never opens anything |
| the simulated person acts | | the pending `undo` is kept |
| disconnect, block, report, a safety sheet, a message, a photo | | the pending `undo` is cleared |

If mutual interest came first, `withdraw` changes nothing: the conversation is open and the ways out are Disconnect
and Block, each explicit and neither undone. If the tester withdraws first, a later choice by the other person opens
nothing, and choosing again opens it at once if they have chosen. `undo` has no timer. Which actions keep it and which
clear it is written out once for every action (`UNDO_POLICY`), so adding an action without deciding is a type error.
Focus moving, scrolling and opening a disclosure send no action, so they cannot end it. It ends on a later deliberate
decision, on leaving the screen (a `go` to the screen already shown is not leaving it), on any safety action, and on
editing. On the confirmation screen the confirmation and the Undo button follow the heading directly.

## MATCH-02: what changed after the founder's review

Four changes, nothing else: more focused setup steps with the answers that would work chosen before how firm they are
(Review lists each point, with a Change link that returns to Review; a "doesn't matter" point is shown as not used and
its set-aside selections are not shown as active); a suggestion screen that leads with their words, shows concrete
differences against what was preferred and carries one labelled simulated block; withdrawing interest and undoing
"Not for me"; and plain empty states.

**Setup simplification is unfinished.** The steps are more focused (the longest is about 1,470 px at 390 px, where the
old Ask screen was 4,264 px), but total scrolling **increased**: the six point steps and the About step come to about
9,200 px, against about 6,600 px for the old About and Ask screens, because each step repeats its header and the
always-visible hints. The shorter-setup goal was not met and should not be reported as met.

On the suggestion screen the line naming the points that suit the person reads "Fits what you asked for on: …",
because a different personal answer can still be one the person said would work. The individual-answer disclosure
and the simulated summary keep those differences visible (for example, a person's practice is steadier than the
tester's own, and it fits what the tester asked for). The list screen no longer names which requirements left people out. Messaging,
per-connection photo consent and the safety row are unchanged and have regression tests.

**How the simulated text is checked, and what that does not prove.** Each hand-written summary carries structured
`facts` (what it claims is the same, what differs but would work, what differs outside what was preferred). Tests
hold those facts against the comparison for every scenario and both sides, hold the points named in the prose
against the points claimed, and pin each specific claim in the prose (for example "one to two years, where you said
within a year") to the answers. That catches a text drifting from the data it was written for. **It is metadata
consistency, not proof that the prose is accurate**: each sentence was also read against the scenario's answers when
checked, and that reading found them accurate. A reworded or new text needs the same reading.

## MATCH-03: less to read at setup, and whose answer it is

Three things changed on the setup steps and on Review, and one label on the suggestion screen. The reducer, the
eligibility rules, the option ids and order, the suggestion profiles, withdrawing, undoing, mutual interest, messaging,
photo consent and the safety row are unchanged.

- **Whose answer it is.** Each point step names its three groups in the first line of each legend: *About you*,
  *What would work for you in a partner*, and *How firm is this?* The partner group uses partner wording ("A partner
  who plans to work", not "I plan to work"). Each option has a second display label (`partner`) beside its first-person
  `label`; eligibility still runs on the option id. Where a partner-side answer is shown, it uses the partner label:
  the setup group, Review, and the "You preferred" line on the suggestion screen. The person's own answer, and another
  person's answer ("Liban's answer"), keep the first-person labels, which are theirs. When "Doesn't matter" sets the
  group aside, the group keeps its name and says "Set aside while this does not matter to you." beneath it.
- **The three firmness choices are explained once, in full, at first use.** Timing, the first point, shows each
  definition in full and a sentence that requirements work both ways. Later points keep a short definition in view
  inside each choice ("People who do not fit are left out." / "People who differ are still shown." / "Not used for this
  topic.") and a native disclosure, "What these three mean", that reopens the same full text. Both texts live in one place
  (`FIRMNESS`, `BOTH_WAYS` in `criteria.ts`). Every point still needs an explicit choice; nothing is chosen, defaulted or
  inferred, opening the explanation changes nothing, and the earlier "Not sure? A preference still shows you the
  difference." is gone because it steered toward one choice. The full "Doesn't matter" text says the person's own answer
  is still shown and can be checked against the other person's requirements, and that the partner selections are kept
  but not used.
- **Review states whose answer each line is.** Each point is three lines, *About you*, *In a partner* and *How firm*,
  with its Change control on the heading line (a wrapping row, still a 44 px target). A "Doesn't matter" point shows
  "Not used: this does not matter to you." and none of the set-aside selections. A line under the list repeats that
  requirements work both ways.
- **Less repeated text and spacing, with the same controls.** The step line sits under the heading; the three groups
  are separated by a hairline rather than boxes; the empty status line no longer reserves height, and its message sits
  below Continue so the button does not move when a message appears. Choices keep their 44 px targets and text size.

**Measured, and what that does and does not show.** At 390 px (320 px in brackets), from the same script on the MATCH-02
tree and this one: a later point step is 1,275 px against 1,377 (1,348 against 1,477), about 7% to 9% shorter, and
about 100 words against about 140. Timing, the first use, is *longer*: 1,613 against 1,469 (1,734 against 1,552), by
design, because it carries the full explanation. Review is *longer*: 2,024 against 1,745 (2,083 against 1,826),
because every point now says whose answer each line is. About plus the six points come to 8,832 against 9,200
(9,328 against 9,794). Across the whole setup path including Words and Review the height is **about the same**
(12,049 against 12,142 at 390 px, under 1% less). **The shorter-setup goal is still not met.** These are page heights
and word counts, which describe reading and scrolling burden; they are not evidence that people understand the screens or
finish setup sooner, and no participant, screen reader or real person was involved. The decision about pairing points
into fewer steps, or leaving eight short ones, has not been made and is better made on a person's experience than on
these numbers.

## MATCH-04: the profile after mutual interest, and what the fixed text is based on

Prompted by a review of the suggestion screens (the three-, one- and zero-suggestion scenarios, on both sides). Setup,
eligibility, interest, withdrawing, undoing, photo consent and messaging behave as before, apart from the navigation
state listed below.

- **The profile stays reachable once there is a conversation.** Before this, the screen with the person's words, the
  differences, the summary and the questions could not be reopened after mutual interest. Now **View profile of Name**
  is on each open conversation and beside "Open conversation with Name" on Your people. Back from the profile returns to
  the screen that opened it (**Back to conversation**, **Back to your people**, or Back to the list), and the thread and
  an unsent draft are kept. Viewing changes no choice, reopens nothing and shows no photo. A blocked person, and a
  conversation that has ended, offer no profile and cannot be opened by navigation.
- **What the fixed text is based on, on request.** Under the summary and the three questions (now a numbered list),
  one native disclosure, **What this is based on**, is closed by default. It says whether the summary uses structured
  answers only (all four do: "It does not use anything either of you wrote"), and for each question lists the answers
  it cites, resolved from the data for the right person ("Work. You: "I plan to work". Liban: "I plan to be at home""),
  with a person's written answer quoted in full under the prompt it answers. A question that draws on no answer of
  either person is marked **General question.** in view and in the disclosure; two are (Abdi's second, Yusuf's first),
  and they were left as written. The block is still the one labelled "Prototype fixture", with no model called.
- **Wording corrected where it presumed or drifted.** Yusuf's city question no longer asks what a person would "give up"; his
  household question quotes his answer ("With family") and the tester's, where it had said "family nearby"; Hassan's
  timeline question quotes his own words ("a pace that suits both of us") where it had asked what would make a longer
  timeline "feel right" for two people who chose the same one. Both practice summaries said a person "describes" a
  practice that they had selected; they now say they chose it. Yusuf's third written answer, shown under "Families",
  answered something else; it now speaks of family, using the idea already in his first answer and his household answer.
  Nothing else about any fixture person changed. A review then reworded five more questions to invite clarification and
  drop what the answers do not say (Abdi 1 and 3, Liban 1 and 2, Hassan 2), with their references updated.
- **One target made full size.** "Name's answers on each point" (MATCH-02) is now a 44 px minimum target. It is still a
  native disclosure with the browser's own keyboard focus.
- **State changes (not just wording).** `Session.origin` records the screen that opened the profile. `go` to a profile is
  refused for a blocked person or an ended conversation. Ending a conversation (disconnect, or the simulated person
  ending it) now leaves the profile for Your people, as a block already did; before, it left only the conversation
  screen. Back from a profile opened from Your people now returns there; it used to go to the list, where a person
  already chosen no longer appears. A draft is held by the page, for each person, not in the reducer, and is cleared by
  Start again.

**What the reference checks are, and are not.** Tests check that every cited answer exists, belongs to the person it is
attributed to and is what is on screen, that a written answer cited is the other person's and never the tester's, and
that every quotation in a summary or a question is a label of a cited answer or an exact piece of a cited written
answer. They do **not** show that a question follows from what it cites, that it invents no problem or motive, or that
the prose is accurate.

**Read by hand, as the meaning check** (one reviewer; a reading, not a measure). Each question against what it cites:

| Question (about) | Cites | Reading |
|---|---|---|
| Abdi 1, prayer in an ordinary week | practice, both | Follows; invents nothing. |
| Abdi 2, what to settle | none | General. |
| Abdi 3, "Abdi wrote about families knowing you both while leaving daily decisions to the couple…" | his Families answer | Follows: it restates his own words under his name, and "involvement" is the word the prompt uses. |
| Liban 1, "Liban chose "I plan to be at home"…" | his work answer | Follows; quotes his label exactly, under his name. |
| Liban 2, "You chose different marriage timelines that fit what you each asked for…" | timing, both | Follows, and the sentence is true wherever it renders (tested: the timelines differ, and each fits what the other asked for). "agree on timing" treats timing as something to settle together, not as a problem. |
| Liban 3, what to decide together about children | children, both | Follows; "decide together" is in his own answer. |
| Yusuf 1, which difference first | none | General. |
| Yusuf 2, how each sees where to live | city, both | Follows; the cities differ. |
| Yusuf 3, what each pictures at first | household, both | Follows; quotes both answers exactly. |
| Hassan 1, practice in an ordinary week | his practice, his second written answer | Follows. |
| Hassan 2, what each would want a partner to understand about their practice | practice, both | Follows; invents nothing. |
| Hassan 3, a good pace | timing both, his first written answer | Follows; the quotation is exact; no problem is assumed. |

One thing this does not settle: Yusuf's new third answer is my paraphrase of the idea in his first ("includes them
without being run by them"), so his first and third now say much the same (kept as delivered). The summaries were re-read
sentence by sentence, as before.

## Age: requirements and preferences (demo age preferences)

Until this change the demo displayed age and ignored it ("Age is shown and not used"). Age is now part of the same two-way
requirements and preferences system, with fictional data only. Nothing else about setup, interest, messaging, photos or the
safety row changed.

- **Two separate things, on the About step.** The tester's own age ("A made-up age (18 to 99)") and the ages they would
  consider in a partner: a youngest and an oldest age, both included, and an explicit **Requirement / Preference / Doesn't
  matter** with nothing pre-selected for someone starting blank. It stays one About screen (no extra step; the setup is still
  "Step n of 8"); About is taller than before (page heights of about 1,475 px against 897 at 320 px, 1,412 against 833 at 390 px, measured on the built page and measured
  again on 2026-10-27 against main at `75097bf`), still shorter than the Timing step. The three firmness meanings are one tap away ("What these three
  mean"); the full text at first use is still on Timing.
- **Rules.** A *requirement* leaves out anyone outside the range, and applies independently in both directions: the tester's
  range against the person's age, and the person's range against the tester's own age. A *preference* never leaves anyone out;
  a person outside the range is shown with the difference ("Age: 27, where you preferred 28 to 34", and first under "Where you
  differ" on the profile). *Doesn't matter* ignores the tester's range (kept in the form, not used), and the tester's own age is
  still checked against the other person's requirement. Nothing is relaxed to fill the suggestions.
- **What is never shown.** Another person's range and firmness, and which of their requirements left the tester out, are not on
  any screen the tester uses. The "Try another scenario" panel simulates the people who are shown and nothing more: its
  "Why these made-up people are not shown" subsection, rows and footnote are gone, so it lists nobody who was left out and gives
  no reason for anyone, for age or for the six points. Tests hold this for both sides, all three samples and tester ages 18
  and 41, and that the controls for shown people remain (`tests/prototype/age-journey.test.tsx`). The diagnostics in
  `suggest.ts` (`evaluate`, `byYou`, `byThem`) are unchanged and are tested where they always were. The tester's own range is
  shown to them on About, Review and the profile.
- **Bounds (demo constraints, not launch policy).** Whole years, **18 to 99**, for the tester's own age, both ends of the
  range and every made-up person (`src/prototype/match/age.ts`: `AGE_MIN`, `AGE_MAX`, `parseAge`). They keep every made-up age
  an adult age; they are not a statement of who a real service would introduce, how age would be verified, or whether a gap
  between two people would be allowed. The 99 was already the upper bound of the old own-age check. Invalid, fractional
  (`30.5`), signed, exponent, leading-zero, non-ASCII-digit, blank, incomplete or reversed (`40` to `34`) input is refused with a
  message naming what to fix; nothing is approximated or clipped into range. A range of one age (`31` to `31`) is valid. The age
  fields no longer strip non-digits as the old own-age field did, which silently turned `30.5` into `30`.
- **Editing.** Under the existing rules: editable until the tester has chosen or passed on someone, read-only after (the whole
  About group except the name), lifted again if that is undone. The tester's own age is now read-only with the asks, because it
  is an input to eligibility (before, it stayed editable and did nothing). Review shows an **Age** block first (About you / In a
  partner / How firm) with **Change age**, and says the ages the tester would consider are not shown to anyone.
- **Fictional people and samples.** Each person has an explicit choice: Abdi requirement 27 to 35, Liban preference 28 to 32,
  Yusuf doesn't matter, Hassan requirement 30 to 40, Said requirement 33 to 45 (and the same on the other side). The samples:
  three (30) preference 28 to 34; one (35) requirement 32 to 40; none (33) doesn't matter. Counts are still **three, one and none**
  on both sides, and who is left out by whom is unchanged. Age adds a reason only to people already left out for another
  reason: Said, by his or her own requirement, in the three-suggestion sample (the tester is 30, outside 33 to 45), and the
  three people aged 27 to 31 in the one-suggestion sample (outside the tester's 32 to 40). In the other places the tester's age
  sits exactly on the end of a range and is not left out (35 on Abdi's, 33 on Said's, 30 on Hassan's), which is the inclusive
  boundary on show.
- **The fixed text.** The three-suggestion sample now shows an age difference: Yusuf is 27, outside the 28 to 34 preferred.
  His summary was the only one that listed the differences exhaustively, so it now names age ("differs from your preferences on
  age, practice, city, work and household: he is 27, outside the 28 to 34 you preferred, and lives in Toronto, where you do
  not") and its facts list `age`. Every other summary and question is unchanged and still true: nobody else in any sample is
  outside the tester's preferred ages, and the one summary that says "the one difference you marked as a preference is work"
  (Liban) is still the only one. The fingerprint that decides whether fixed text applies now includes the ages the tester would
  consider (not their own age, which no text mentions), so editing the range shows the text as unavailable rather than saying
  what the answers no longer say. Tests hold each `facts.differs` against the comparison including age, and pin the new
  sentence. As before this is metadata consistency; the new sentence was also read against the data.
- **Not decided here:** whether a real product would allow age as a requirement at all, what range limits it would use, and
  whether a real product would show a person why someone is not shown (the demo shows no one a reason).

## What is not covered

- Eligibility reads age and the six points only (see "Age" below), so it does not cover every requirement a real
  product would need. Age is not verified.
- The six points are **provisional prototype choices, not launch policy.** Clan, mahr, plans to move back and how
  families would disagree are left out because the research ledger keeps them as conversations that never become a
  matching signal.
- Choosing the first three eligible people in a fixed order is not a selection policy.
- Photos are placeholders: nothing about real photo handling is tested.

## Launch questions (recorded, not answered here)

Identity, age verification, duplicate and fake profiles · retention and deletion of profiles, messages, photos,
reports and blocks, and Forget me and server-deletion confirmation for them · moderation operations (who reviews,
how fast, what is kept, safeguarding, ban evasion, requests from authorities) · photo handling (storage, vetting,
revocation, modesty and guardian norms) · AI vendor terms (data use, retention, region, cost, refusals, evaluation
credit and the evaluation gates) · legal review under decision 34 (matchmaking, cross-border, religion as sensitive
data, minors) · admission size, gender and city balance, bootstrapping · a real selection policy, refill cadence,
expiry of interest and conversations · notifications · wali and family involvement · which criteria are admissible,
and in which languages · how members return without an account · whether any pool-size disclosure is acceptable
(decision 27) · usability testing with real participants (consent, data handling) · withdrawing interest while the other
person's choice arrives at the same moment (a product with a server would have to treat that as a race and tell the
person which came first; here the reducer applies whichever arrives first).

## What the existing guards protect, and how this stays inside them

- `tests/invariants/no-marketplace.test.ts` holds 22 retired file paths absent and forbids five identifiers
  (`COHORT_TARGET`, `candidates =`, `fitScore`, `compatibilityScore`, `matchScore`) in `src/` and `netlify/`. The
  prototype uses none: its people are `Person`, its list is `shown`, and nothing is scored. The test is unchanged and
  no exception to it was needed. What it cannot see is intent, so the decision entry carries that.
- `tests/voice.test.ts` scans `src/components`, `src/data` and `src/lib` for the product's voice, overclaims and
  promises that the production code cannot keep (for example "photos are shown", "conversation opens", "powered by
  AI"). The demo is outside those directories, and its promises are different by design: it shows simulated
  messaging, photos, blocking and reporting, each labelled as simulated. `tests/prototype/copy.test.ts` holds its copy to
  the same voice list and to its own rules, including that it claims no real members, no open introductions, no working
  AI (AI is mentioned only to say no model is involved) and no live messaging.
- `tests/prototype/styles.test.ts` holds the copied theme, base styles and typefaces equal to the app's, so the
  prototype keeps looking like the app, and holds the three exclusions in `src/index.css`.
- `tests/forget-keys.test.ts` requires every `niyyah.*.vN` storage key to be named by Forget me. The prototype
  writes none, because it writes nothing.

## Verification

`npm run verify` and `npm run build` by exit code; the build with and without the demo produces the same app files,
byte for byte; Chromium against the **built** demo, served with the headers from `netlify.toml` actually applied
(a plain static server cannot show Content-Security-Policy compliance), at 390px and 320px, keyboard only and by
pointer, with every request counted, every CSP violation reported, and stored data compared before and after;
and a profile that already holds the previous service worker, as well as a fresh one. No live evaluation exists because
no model is called: the AI output is simulated.
