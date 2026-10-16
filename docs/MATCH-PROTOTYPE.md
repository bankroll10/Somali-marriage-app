# MATCH-01 to MATCH-03: the member-journey prototype

Status: a development-only prototype of how meeting someone could work, built on 2026-10-15 (MATCH-01) and revised after the founder's review the same day (MATCH-02, then MATCH-03: less to read at setup, below). **It is not part of
the app, is not built or deployed, and promises nothing to anyone.** Introductions in the live app stay closed
(release R3). The exception that allowed it is recorded at the end of `docs/DECISIONS.md`.

## Run it

```
npm run dev        # then open http://localhost:5173/match.html
```

`match.html` is a second HTML entry. `vite.config.ts` sets no build `input`, so `vite build` bundles `index.html`'s
module graph only and neither the page nor `src/prototype/` reaches `dist/`. Nothing in the app, the build, the
deploy config or the package scripts refers to it.

**One line of production source changed, and its output did not.** Tailwind reads every file under the project
root, so the prototype's utility classes (and any class name its tests mention) would have been generated into the
app's stylesheet. `src/index.css` therefore names three paths it must not read (`@source not`): the prototype, its
page and its tests. The prototype has its own stylesheet (`src/prototype/match/prototype.css`) with its own sources
and a verbatim copy of the app's typefaces, theme and base styles; it cannot import `index.css`, because the
exclusions would come with it. A build of this branch is **byte-identical to a build of `main` at `3eb7f64`**
(`diff -r` of the two `dist/` folders, including the stylesheet hash and the service worker's cache name), and
`tests/prototype/build.test.ts` builds the app and the prototype's page and holds that none of the prototype's
files, words or classes are in the app's output. Reloading clears everything: there is no storage and no
network (`tests/prototype/isolation.test.ts` holds this by reading the source, and the journey test runs under
spies that fail on any fetch, XHR, WebSocket, beacon, storage access or cookie write).

## What it shows

One journey, from a made-up person's side, as a woman or as a man:

1. **Answers, in eight steps.** A made-up name and age; then one step for each of six points (timing,
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

Ten made-up people (five per side) with fictional first names and adult ages (27 to 38). Three sample answer sets
for the tester give **three, one and no** suggestions, on either side, and they cover people left out by the
tester's requirement, by the other person's, and by both (`tests/prototype/suggest.test.ts`). A tester who starts
with blank answers gets honest results for whatever they enter, and no fixed text. The **Prototype controls**
disclosure stands in for the other people (choosing the tester, writing, sharing a placeholder, ending a
conversation) and lists why made-up people were left out; it says that a product would never show that list.

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

## What is not covered

- **Age is shown and not used.** Age preferences are not built in this slice, so the eligibility checks do not cover
  every requirement a real product would need.
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
  AI"). The prototype is outside those directories by being outside the app, so those promises stay enforced for
  the app. `tests/prototype/copy.test.ts` holds the prototype's own copy to the same voice list and to its own rules.
- `tests/prototype/styles.test.ts` holds the copied theme, base styles and typefaces equal to the app's, so the
  prototype keeps looking like the app, and holds the three exclusions in `src/index.css`.
- `tests/forget-keys.test.ts` requires every `niyyah.*.vN` storage key to be named by Forget me. The prototype
  writes none, because it writes nothing.

## Verification

`npm run verify` and `npm run build` by exit code; the build with and without the prototype produces identical
`dist/`; Chromium against `npm run dev` at 390px and 320px, keyboard only and by pointer, with application traffic
(none) reported apart from development tooling (module requests and Vite's HMR socket). No live evaluation exists
because no model is called: the AI output is simulated.
