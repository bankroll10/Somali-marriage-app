# Where am I, and how do I get back — Niyyah's information architecture, 2026-09-20

## Context

Nine audits since Monday — `docs/AUDIT.md`, `RISKS.md`, `JOBS.md`, `TREE.md`,
`VALUE.md`, `NORMAN.md`, `NIELSEN.md`, `LOAD.md`, `FOGG.md` — have graded this
product on truth, risk, jobs, priority, time-to-value, affordances, usability,
cognitive load and behaviour. None asked the stranger's question: **standing on
this screen, having never seen Niyyah, can I answer where I am, what I can do
here, why I would, how I go back, and what happens afterward?**

All 24 destinations were scored against those five. The answers split into
three classes, and `docs/PROTOCOL.md` assigns each a different disposition.
That assignment is the spine of this pass — it is the protocol applied, not a
judgement about how bold to be.

| Class | Protocol | Disposition |
|---|---|---|
| **Bug** — "a tap that does nothing, or does the wrong thing"; "a back button that lands somewhere other than where they came from" (`PROTOCOL.md:337-353`) | *"Fix before the next session; a bug in session 3 invalidates sessions 4–10 if left."* | **Fixed here.** Seven of them. |
| **Confusion** — "the product working as built and the person not understanding it" (`PROTOCOL.md:355-358`) | *"Recorded every time; changed only if two or more people hit the same one."* | **Recorded here**, as predictions the five sessions count. |
| **Hierarchy** — Home by journey rather than feature | `LOAD.md:204` holds Home's controls; `PROTOCOL.md:524` forbids touching the door | **Designed and held.** |

`docs/FOGG.md` set the test for escaping the gate: *"a resume is invisible to
an observed session by construction."* A Home restructure fails that test by
construction — it is the first thing a participant sees. Seven missing exits
pass it, because **adding an exit cannot corrupt a session**; it can only stop
a participant being trapped in a screen while the founder watches.

---

## What the audit found first

**Every defect in the fixed class is on a link-entry screen** — `couple` and
`vouch`, the surfaces a person reaches from *someone else's phone*, plus the
guide's chat. That is not a coincidence. Nine audits walked the product from
its own front door, where every path is one a member chose. Nobody walked in
as the man who was sent a link, or the aunt asked to vouch. Those two screens
hold the product's entire two-sided loop and its only verification claim, and
between them they had **four phases with no way out at all**.

The second finding is that the app already had the correct helper. `backHome`
(`src/App.tsx:97`) is `n.hasHome ? 'home' : 'welcome'`. Both broken exits were
hand-written `setScreen('welcome')` beside it.

---

## The seven, and what each one did to a person

### 1 · "Back to your space" went to the marketing page

`src/App.tsx:404` passed `onHome={() => n.setScreen('welcome')}`. A woman who
opens **her own** eleven link on **her own** phone — to check that the link
works, which is exactly what the screen is for (`Couple.tsx:137`, *"This is
the link you sent"*) — reads **"Back to your space"** and lands on the front
door that sells Niyyah to strangers. She has a Home. The label names it.

Two failures in one control: the destination is wrong, and the label is false.

**Built:** `onHome={backHome}`. Verified in Chromium: the tap now lands on
*"Salaam, Sagal."*

### 2 · The same hard-coding on the vouch screen

`src/App.tsx:411`. A Niyyah member who vouches for her sister is ejected to
the marketing page. **Built:** `onDone={backHome}`, which still yields
`welcome` for the relative who has never been here — the common case is
unchanged.

### 3 · His intro asked for eleven answers and offered no way to decline

`Couple.tsx` — a man arrives on a link someone sent him, is told *"{sender}'s
asked you to do this too"*, and is shown one control: **Start**. There is no
route out of a screen about his own marriage.

**Built:** the `What Niyyah is` exit this file already used on its dead
branch, beside Start. Measured at 400 px: y=519.

### 4 · Question one committed him

Back rendered only from question two (`{index > 0 && …}`). So Start was a
one-way door: eleven questions with no route back to the explanation he had
just been given. `Read.tsx` has stepped question one back to its intro all
along; `Couple.tsx` simply never did.

**Found by walking, not by reading** — it is invisible in source review and
obvious the moment you tap Start. **Built:** Back always renders; at index 0
it returns to the intro.

### 5 · Answered already, no joint sheet: no control of any kind

`Couple.tsx` — the branch that fires on a second tap or a second device
rendered an eyebrow, a heading, and a paragraph ending *"Nothing more to do
here."* That sentence was literally true: there was nothing. No button.

`docs/NORMAN.md` had already found this branch rendering **nothing at all**
and gave it words. The words are good. It still had no way out. **Built:** the
same exit. y=332.

### 6 · The vouch form trapped the relative

`Vouch.tsx` asks a family member for their relationship, their first name, a
sentence about the person, and their phone number — then ends at its submit
button. Its three *terminal* phases each carry `What Niyyah is`. The one phase
where a person might want to say no did not.

**Built:** the same exit, below the disclosure paragraph rather than beside
the submit — a way out should not compete with the ask it follows. y=1295,
which is past the fold on an 860 px screen and is the right place for it: a
person who has decided not to vouch is already scrolling.

### 7 · The guide could not be left in a tap

`Coach.tsx` — the header's left chevron had `aria-label="Switch guide"` and
returned to the mode picker. Leaving the guide took two taps through a screen
inside a screen. Named in `docs/NORMAN.md` and not fixed.

The reason it is a bug rather than a preference: a left chevron in a header is
Back on every other screen in this product (`ui.tsx:131`), and here it was the
**third** control doing Switch — the pill beside the label and the inline link
under the routing note already did it. One duplicated affordance, three times;
the one thing the screen did not offer was a way out.

**Built:** the chevron is Back, to Home. Switch keeps its two existing
controls. This removes a duplicate rather than adding an affordance, which is
why it does not put anything new in front of a session.

### Measured, before and after

Chromium at 400×860, `checkVisibility()` — not `getBoundingClientRect()`,
which does not exclude closed `<details>` content in this build
(`docs/LOAD.md`). Zero page errors on every walk.

| Screen · phase | Exits before | Exits after |
|---|---|---|
| `couple` · dead link | 1 | 1 |
| `couple` · her own link | 1, landing on `welcome` | 1, landing on **Home** |
| `couple` · his intro | **0** | 1 · y=519 |
| `couple` · his question 1 | **0** | 1 · Back → intro |
| `couple` · answered, no joint | **0** | 1 · y=332 |
| `vouch` · the form | **0** | 1 · y=1295 |
| `vouch` · done / already / dead | 3, landing on `welcome` | 3, landing via `backHome` |
| `coach` · chat | **0** (the chevron switched voice) | 1 · y=19, one tap to Home |

---

## The five questions, scored

YES/NO against the rendered screen. Quotes are verbatim.

| Destination | Where am I | What can I do | Why | How back | What next |
|---|---|---|---|---|---|
| `welcome` | **NO** — H1 is *"What's actually in your way?"*; nothing names the place | YES | YES | n/a (root) | YES — *"The one thing to say next is two minutes away."* |
| `identity` | YES — *"First, the basics"* | YES | YES | YES | YES — *"Ten seconds — then your first insight."* |
| `situation` | YES — *"Where you are"* | YES | YES | YES | YES |
| `hook` | YES — *"Before anything else"* | YES | PARTIAL | YES | **NO** |
| `intake` | **NO** — a progress bar; `Chapter n of n` only | YES | PARTIAL — chapter intros | YES | YES at chapter breaks, **NO** at question level |
| `generating` | YES — *"Drawing your map…"* | n/a | n/a | **NO** | **NO** — acceptable for a 1.4 s interstitial |
| `reflection` | YES — *"Your map"* | YES | YES | **PARTIAL** — none on first reveal | YES — the strongest in the product |
| `home` | **NO** — H1 is *"Salaam, {name}."*; *"Your space"* is a section label over three cards | YES | PARTIAL — per-card subtitles | n/a (hub) | n/a |
| `coach` · picker | YES — *"Your guide"* | YES | YES | YES | **NO** |
| `coach` · chat | PARTIAL — mode label; the word "guide" is absent | YES | PARTIAL | **YES — fixed this pass** | YES |
| `trust` | PARTIAL — a 0.75 rem *"Trust"* micro-label | YES | YES | PARTIAL — unlabelled, three possible destinations | **NO** |
| `profile` | YES — *"What decides who you meet"* | YES | YES | YES | YES |
| `door` | YES — *"The door"* | YES | YES | YES | YES |
| `shortMap` | YES — *"Being counted"* | YES | YES | YES | YES |
| `count` | YES — *"Being counted"* | YES | YES | YES | YES |
| `read` · intro | YES | YES | YES | YES | YES — *"…the one question worth asking next, word for word."* |
| `read` · asking | **NO** — the title is only `{i} of {n}` | YES | YES | YES | PARTIAL |
| `read` · result | YES — *"Your read"* | YES | YES | PARTIAL — Back exits the tool entirely | **NO** — the closer is a limitation, not a next step |
| `beforeYes` · intro | YES | YES | YES | YES | YES |
| `beforeYes` · asking | **NO** — `{i} of {n}` | YES | YES | YES | PARTIAL |
| `beforeYes` · result | YES | YES | YES | PARTIAL | PARTIAL |
| `couple` | YES | YES | YES | **YES — fixed this pass** | YES |
| `vouch` | YES — *"A family request"* | YES | YES | **YES — fixed this pass** | YES — exemplary: *"nothing more will be asked of you afterward"* |
| `families` | YES — *"Bringing the families in"* | YES | YES | YES | **NO** — the closer is a disclaimer |
| `sample` | YES | PARTIAL — read-only | YES | YES | YES |
| `plus` | YES | **NO** — no controls at all | YES | YES | YES |
| `philosophy` | YES — *"Our philosophy"* | PARTIAL | YES | YES | **NO** |
| `ended` | YES | YES | YES | PARTIAL — a `Skip` text link | YES |
| `ending` | YES | YES | YES | PARTIAL — a `Close` text link | **NO** |

**Ten destinations do not say what happens afterward.** The two instrument
results are the expensive ones: both close on a limitation (*"It cannot read a
heart"*) where a next step belongs. That is a real finding and it is **not**
fixed here, because it is copy on the two screens the public tools land on.

---

## Recorded, not changed: seven predicted confusions

`docs/PROTOCOL.md:357` — *"changed only if two or more people hit the same
one."* The one person inferring these is me, from source. They are written as
predictions with the exact screen and the exact word so the five sessions can
**count to two** rather than re-derive them. Log hits in `docs/FEEDBACK.md`.

**C1 · "counted" means three different things in live UI.** `Count me` is an
analytics toggle (`Trust.tsx:102`). `Count me in` joins the founding cohort
and submits contact details (`Cohort.tsx:423`). `Being counted` is a screen
header (`ShortMap.tsx:36`). `lexicon.ts` defines **only the analytics sense** —
and `Profile.tsx:396` renders that definition on the same screen as a
`Count me in` button. Someone who opens "The words on this page" to find out
what the button does is told it means anonymous step counting.
*Watch for:* anyone asking whether being counted is the same as being counted.

**C2 · "the eleven" is the name of a thing no button says.** Trust, Coach and
Plus all use the bare noun; the destination calls itself *"Before you say
yes"*. It is defined at point of use only on the two *result* screens — after
the person has already done it.
*Watch for:* a participant reading Trust and asking which part is "the eleven".

**C3 · "Send the door" is unguessable.** `Cohort.tsx:195`. The door screen
never defines "door", and its own eyebrow says *"Founding cohort"*.

**C4 · "your space" is never the name of anything on screen.** Home's H1 is
*"Salaam, {name}."*; *"Your space"* is a section eyebrow over three cards
inside it. Six screens say *"Back to your space"*.

**C5 · "guide" has no lexicon entry at all.** `TermId` has 13 terms and none of
them is `guide`, so *"Every word we use, defined"* does not define the
product's most-used noun.

**C6 · Trust defines nothing.** It is the densest vocabulary screen in the
product — map, reading, ground, thin, vouch, door, counted, code, eleven,
read, Guide — and the screen both public tools link to, and it renders no
`<Words>` block.

**C7 · "reading" collides with itself on Trust.** `Trust.tsx:242` — *"the same
reading takes it off the door"* means a server-side sweep. The lexicon says a
reading is *"one dated map"*. Someone who learned the term mis-parses the
sentence.

---

## Designed and held: the hierarchy

What the brief most directly asks for, and the one thing the protocol most
firmly holds.

**The diagnosis.** Home's hierarchy is the repository's feature list, not the
person's journey. `read` is reachable from **three** controls on Home alone —
the moment chip, the card, and the StageBand door. `coach` from **two** — the
compose box and a card labelled "Talk to your guide". Below them sits a
section headed *"Your space"* containing the guide (again), the cohort, the
profile and the map: four things with nothing in common except that they are
each a feature. Across the app one destination carries many labels —
`families` two, `read` four, `coach` four, `beginMap` four.

**The shape it should take**, when the gate lifts: Home ordered by *where she
is tonight* — the live problem, the instrument for her stage, the work, and
everything else behind one door; one label per destination; `door` and `count`
merged, since they render the same `DoorCount` under the same eyebrow with the
same button and a verbatim-duplicated hesitation block.

**Why not now.** `docs/LOAD.md:204` names **Home's 15 controls** among the
things held for the five sessions. `docs/PROTOCOL.md:524` forbids touching
*"the door, the map, matching, or the marketplace"* mid-sprint.
`docs/PROTOCOL.md:523` forbids mid-sprint copy changes, which is what
one-label-per-destination is. And `docs/TREE.md` item 4 already commits to
moving the front door **after** the sessions, precisely so the sessions can be
watched for this question. Shipping it now would mean the five sessions test a
Home that did not exist when the roadmap was written.

---

## Not in scope, and why

Held for the five sessions per `docs/TREE.md` items 3–4 and
`docs/PROTOCOL.md`: Home's controls and their order, the `door`/`count` merge,
every label change, the ten missing "what happens afterward" sentences, the
`<Words>` block Trust needs, and Reflection's missing back on first reveal
(`PROTOCOL.md:524` — it is the map).

Held for its own pass: `?couple=`, `?vouch=`, `?door` and `?families` cannot
be reloaded, because the query is stripped before React mounts. It is on
`docs/NIELSEN.md`'s severity-2 queue, it needs a new storage key — which
`tests/fogg.test.ts` requires `LOCAL_KEYS` to name — and it touches the
instruments' entry path.

Not done, and worth saying plainly: **this pass did not restructure anything.**
It fixed seven ways of being stuck and wrote down what the structure should
become. The audit is the deliverable the brief asked for; the restructure is
designed above and gated.

---

## How this was verified

1. `npm run verify` — 58 files, 673 tests. `tests/wayout.test.ts` is new and
   holds all seven fixes by reading the source, since this repository has no
   jsdom and no component tests.
2. `npm run build`.
3. Chromium at 400×860 against `vite preview`, functions stubbed, using
   `checkVisibility()`. Every phase of `couple` and `vouch` reached by stubbing
   the function's own responses — `{status:'open'}` for his intro, a 409 on the
   POST for answered-already, a 503 for the vouch form. The exit table above is
   that walk. Zero page errors.
4. Two taps confirmed end to end: her own couple link → **"Salaam, Sagal."**,
   and the guide's chevron → **"Salaam, Sagal."**

## What would falsify this

If participants reach the couple or vouch screens and leave without
hesitating, these were not bugs worth a pass. If **two** participants hit the
same confusion on the C1–C7 list, that item ships the same night under
`docs/PROTOCOL.md:357`. If **none** of the seven fires across five sessions,
the vocabulary is doing better than this audit predicts and the held
restructure should be scoped down rather than up — the duplicated labels would
be costing nobody anything. Record what happens in `docs/FEEDBACK.md`.
