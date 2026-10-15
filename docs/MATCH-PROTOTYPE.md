# MATCH-01: the first member-journey prototype

Status: a development-only prototype of how meeting someone could work, built on 2026-10-15. **It is not part of
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

1. **Answers.** Intentions (timing, children, practice) and practical points (city, work, household), then written
   answers in the person's own words. Everything is made up, and the screens say so.
2. **Requirement or preference, per point.** Each of the six points gets one of *requirement* (only people who fit
   are shown), *preference* (people who differ are shown, and the difference is pointed out) or *doesn't matter*
   (not used), plus the answers that would work. Nothing is pre-sorted and there is no default: the kind belongs to
   the person, per point, never to the topic (`docs/DECISIONS.md` Part 8).
3. **A limited set of suggestions, no photos.** Eligibility runs both ways. At most three people are shown, in a
   fixed order that is not a ranking, and there is no refill. Nothing is relaxed to fill the screen. When no one
   fits, the person may review what they ask for, keep it as it is, or leave.
4. **An explanation.** Where answers line up and where they differ is worked out from the structured answers and
   updates when they change. A plain-language summary and three questions are **fixed text labelled "Prototype
   fixture"**, written for one sample scenario each; if the person's answers no longer match that scenario the text
   is shown as unavailable and never says what the answers no longer say.
5. **Private interest.** Interest is recorded in the prototype and the other person is not told. "Not for me" is
   never shown to the other person.
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
chosen or passed on anyone, what they asked for is read-only until a fresh start. Passed and blocked people are never
shown again; ended and blocked conversations show no thread and no photo. These are held by example and by random
sequences of every action (`tests/prototype/flow.test.ts`).

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
(decision 27) · usability testing with real participants (consent, data handling).

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
