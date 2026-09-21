# Niyyah

**The trusted marriage platform for the Somali diaspora — guided by faith,
designed for serious people.**

A modern bridge: between tradition and technology, family and individual choice,
attraction and intention, AI and faith, Somali culture and modern reality. Not a
place for swiping — the place where a confused generation learns how to *choose*.

Not another dating app. Dating apps only answer **"who is available?"** Niyyah
starts with the questions that actually decide everything:

> Is he serious? Have we had the conversations that matter? Am I ready? How do I
> move toward marriage without making it weird?

The vibe is **"build something real,"** not **"date me."** Serious, culturally
intelligent, calm — and built so that the product is paid and measured by what
happens in a person's life, never by how long they spend on a screen.

## What's built

**The journey starts where she is.** Welcome → *who you are* → **"What's
happening right now?"** → the instrument for that stage. Someone preparing gets
the hook question and the sixteen-question map. Someone already talking to a
man goes straight to the read. Someone deciding goes to the eleven. Someone
married goes to the guide.

- **The read** — eleven questions about what he has *actually done* (told
  anyone, named marriage, moved toward family, followed through, handled hard
  things). Evidence in words, never a score on a person, and the one question
  to ask him next — word for word.
- **Before you say yes** — the eleven conversations Somali marriages break on,
  found out too late: where you'd live, his mother in the house, money home,
  work, children, deen on a Tuesday, mahr, qabiil, going back, a second wife,
  when the families disagree. Records only whether the two of you have had
  each one, and hands her the one to open this week.
- **The two-sided eleven** — she sends him a link; he answers on his own phone,
  no account; neither ever sees the other's sheet. Both see only where they
  match, and which conversation one thinks happened that the other doesn't.
- **The family vouch** — a father, brother or mother opens a link and confirms
  who she is in one sentence. The only verification this product claims.
- **The words for your family** — telling your wali you met him online, the
  first conversation with hooyo, asking him to send his people, opening mahr,
  ending it kindly.
- **The map** — sixteen questions in three chapters. Seven grounds,
  each named in a word — *thin*, *steady*, *strong* — with a note written from
  her actual answers, her non-negotiables, the honest mirror, and **one thing
  to do this week** from her thinnest ground. There is no number: a score on
  readiness was an answer key that penalised honesty, and it is gone.
- **The Guide** — five voices (Wise Auntie, Big Brother, Therapist, Islamic
  Values, Matchmaker), live on Claude through `netlify/functions/guide.ts`
  with a local matcher as the offline voice. She says what happened; the app
  routes it. Every reply ends on an action, and a script handed over becomes a
  follow-up.
- **The follow-up** — days after any instrument hands her words, Home asks
  once: *have you had it?* "We talked" writes back into her sheet. This is the
  one thing the product measures.
- **The ladder and the ledger** — what she has actually done here, as facts
  that cannot be tapped into being. The ledger is what will decide who meets
  whom. The ladder (`src/lib/rungs.ts`) is the only metric, and beside each
  rung travels what it was made of (`src/lib/facts.ts`) — in words from closed
  lists, never an answer in hers. `docs/OPERATING.md` is the loop that turns
  the readout into revisions; `docs/LEARNING.md` is what it may and may not
  learn from.
- **The door** — the real count of women and men who have kept a map and can
  be reached, against the number a pool opens at: her city, and the people in
  her country who said they would travel for the right person. Never seeded.
  `docs/SCALE.md` is why the pool, not the city, is the unit.

## What is deliberately not here

No feed, no deck, no swipe. No score on a person, hers included. No daily
check-in, streak, milestone or comeback nudge. No visible reply counter and no
"unlimited" tier. No profile before there is a room. No who-liked-you. See
`docs/STRATEGY.md` §6 for the list, and why.

## Architecture

```
src/
  data/intake.ts       The map's schema — sixteen questions in three chapters, the three how-you'd-live
  data/read.ts         The read — eleven behavioural questions, scripts, pronoun voices
  data/beforeYes.ts    The eleven conversations, each with its script
  data/families.ts     The words for your family
  data/coach.ts        The Guide's five voices — greeting, starters, local intents
  data/daily.ts        Reflections, weighted to the person (no return hook)
  data/stages.ts       Preparing → talking → deciding → married
  data/nextStep.ts     One honest thing per ground — the work card
  data/hook.ts         "What's the hardest part?" and its instant insight
  data/scenes.ts       Diaspora cities, each in a country
  data/countries.ts    The countries the diaspora lives in — the pool above the city
  data/reach.ts        How far she would go for the right person
  data/somali.ts       Every Somali line, gated until the founder approves it
  data/plus.ts         What is free forever, and what is bought once
  lib/reflection.ts    Map engine — grounds in words, notes from her answers
  lib/read.ts          Read engine — evidence, the thin ground, the script
  lib/beforeYes.ts     Which of the eleven to open next
  lib/couple.ts        Client half of the two-sided eleven
  lib/followup.ts      "Did you say it?" — the second half of every instrument
  lib/rungs.ts         The ladder — the only measurement
  lib/ledger.ts        What she has done here
  lib/coach.ts         Guide engine — live Claude + local voice, the system prompt
  lib/route.ts         Say what happened; the app picks the voice
  lib/matching.ts      Alignment — non-negotiables gate, then reasons; never a percentage
  lib/keep.ts          Keep the map under a code; restore it on any phone
  lib/cohort.ts        The door — count and join
  lib/vouch.ts         Client half of the family vouch
  lib/progress.ts      Report rungs, under a code that is not the map's
  lib/facts.ts         What the rungs were made of — ids from closed lists, never a sentence
  lib/waitlist.ts      The one line out — how the founder reaches her
  lib/storage.ts       localStorage persistence
  hooks/useNiyyah.ts   Single source of truth: state, actions, persistence
  components/          One file per screen; home/ holds Home's cards
netlify/functions/     guide · keep · cohort · couple · vouch · progress · safety · export · pool · sweep (weekly, scheduled) (Netlify Blobs)
netlify/shared/        founder — the bearer key on every readout; vocab — every closed set the functions accept; limit — the hourly cap on every public write; gate — the two non-negotiables a form can check, twin of lib/matching.ts
docs/OPERATING.md      The monthly loop: readout field → constant it revises
docs/LEARNING.md       What it learns and what it refuses to — the tiers, the two lists, the honest limits
docs/SCALE.md          What breaks at each order of magnitude, the pool as the unit, and what to build now versus at its trigger
docs/WEDGE.md          The first forty: the initial wedge, why, how to find it, the density it needs, the expansion path, the risks — evidence kept apart from hypothesis
docs/GAPS.md           Every belief the product rests on, classed known / likely / assumed / unknown, ranked by the danger of being wrong, with the readout that tests it
docs/EXPERIMENTS.md    Five design bets as formal experiments — hypothesis, metric, smallest credible test, and a decision rule fixed before the numbers arrive
docs/PROCESS.md        The operating loop this whole thing runs on — weekly pulse vs monthly hour, the hypothesis template, feedback, roadmap priority, and every kill criterion in one table
docs/FEEDBACK.md       What real people have said, one conversation at a time — never a name
docs/PROTOCOL.md       The reality sprint's research protocol for the first ten sessions: who, the 25 minutes, what to ask and observe, what counts, and the decision rules written before the results
docs/MACHINE.md        The thirteen stages as this product builds them, every transition's metric and failure, the weakest link, and the plan for it
docs/BETS.md           Twenty asymmetric bets, scored on upside, cost, reversibility, confidence and learning — and the one that got built
docs/DURABLE.md        What survives if the AI hype, the app fashions and the platforms all disappear — durable value, temporary novelty, trend-dependent, and the rule that keeps a supplier out of the core
docs/NORTHSTAR.md      The problem, the purpose and the North Star in one sentence each — and every screen held against them: core, weak, distraction, missed
docs/OWNED.md          What we rent and what we produce, and the three moves from renter to owner — the address, the customer list, the constants' lineage
docs/HARD.md           Where an easy decision now would have cost something irreversible later — the collision, the erasable report, the unmetered delete — and the four deferred with triggers
docs/REDTEAM.md        The case against every conviction the company rests on — twelve attacked, three named as fatal, and the tests that kill or validate each; the market arithmetic
docs/ASSETS.md         Every public asset with its verified URL, status and last-checked date, the placement ledger, and why attribution names the kind of room and never the room — the one place a link is declared live
docs/ATOMIC.md         The atomic network: the smallest self-sustaining pool, from the code and a simulation of its own gate — the hard side, six conditions that replace forty and forty, seven constraints ranked, twelve assumptions with tests, twelve health metrics, and the technical plan held for the founder's go-ahead
docs/LIQUIDITY.md      Liquidity as the thing that kills matchmaking products — nine dimensions, the model with three worked doors, ten systems classed, the opening checklist, what the founder monitors, and the pool and introductions record designed
docs/FLYWHEEL.md       The outcome flywheel, ten transitions inspected against the code — where it turns, where it is substituted until a pool opens, the break at the ending fixed, marriages on the door designed, and what replaces advertising at every link
docs/BACKWARD.md       Working backward from "extremely valuable": the arithmetic and the Somali-only ceiling, fourteen must-be-trues with their readouts, the seven assumptions that forbid the outcome, the bottleneck that is an act rather than a build, and four optionality moves
docs/ROADMAP.md        Every shipped and proposed feature against the nine Fastlane tests — build now, test first, defer, delete — and why the reordered roadmap's first item is not code
docs/FAIL.md           Failure states: what the user sees, what data is safe, what can be recovered, what to do and whether retry is safe — for every way this product can fail; the seven places it said something untrue, the guide answer it used to delete, and the 500 a blob hiccup caused on every capped endpoint at once
docs/FOGG.md           The eight actions against B = MAP — motivation, ability, prompt for each; the four that were sound, the four that were not, and the line this product will not cross with the model (no badge, no reminder, no count of unfinished things — enforced by a test)
docs/LOAD.md           Cognitive load: how much a person must process at once — every screen measured in Chromium at 400 px before and after, the seven burdens, and progressive disclosure applied without deleting a word (Trust: 2,366 rendered words to 463, nine phone screens to three and a half)
docs/VOICE.md          The voice: seven words and what each forbids, six rules, the ten lines already in the product that the rest was held to; the nine habits the audit found ("actually" ×60, wrong-side text ×30, "never" ×20 on Trust), what changed in five slices, eleven screens measured before and after, and the thirty phrases tests/voice.test.ts bans
docs/MOBILE.md         Mobile craft: safe-area insets added where nothing used env() before, ~26 tap targets brought to 44px behind one shared primitive, nine form fields fixed for the 16px zoom floor, four textareas capped, and why primary-CTA placement and a landscape layout were deliberately left alone
docs/PERFORMANCE.md    A measured performance pass: the 611KB single bundle split behind lazy() (328KB after, headroom to a written budget), a blanket idle-prefetch tried and reverted after it measured 12% slower FCP, an unthrottled Claude stream now coalesced to one render per frame, and six other audited categories (images, fonts, deps, API waterfalls, render-blocking, localStorage) that measured out with nothing to fix
docs/LINKS.md           Niyyah as a linked-to product, measured: two instrument kinds (door, families) confirmed showing the generic homepage's Open Graph card and given their own address like read/eleven already had; an offline shell added after a home-screen launch with no signal was confirmed to fail at the browser's own error page; browser back, refresh and installability confirmed already working, with the live checks to show it
docs/ACCESS.md         A strong accessibility baseline against WCAG 2.1 AA: focus moved on every screen change, selection state exposed on the app's most-used interactive pattern, five silent confirmations given a live region, five WCAG-AA contrast failures fixed (including a second gold shade for light backgrounds), reduced motion reaching JS scrollTo, and Somali marked lang="so"
docs/SHEET.md          N3, the money conversation sheet: why a gate written on 2026-09-17 opened, the four subjects kept apart on purpose, the content rules (no ruling, no figure, no outcome claim, no advice) and where each one is pinned as a test, why it ships as two lengths (four pages vs one), the half-page facilitator note (N3-note) that answers how to hand it out, and the Somali translation (N3-so, N3-1page-so) — reviewed and approved by the founder, retuned to hold the same page counts once translated
docs/NIELSEN.md        The ten usability heuristics, walked on a phone with returning states seeded — every issue graded 0–4 with screen, problem, why it matters and smallest fix; the severity 4 and the 3s fixed, the 2s queued
docs/PLACE.md          Information architecture: all 24 destinations scored against the stranger's five questions — where am I, what can I do, why, how do I go back, what happens afterward; the seven ways you could get stuck (four phases with no exit at all, every one on a screen reached from someone else's phone) and the seven predicted confusions the sessions count to two on
docs/NORMAN.md         The interface against Don Norman's six — affordances, signifiers, mapping, feedback, constraints, conceptual model; what was already right, the twelve things fixed, and the mapping findings held for the sessions
docs/VALUE.md          Time to meaningful value: every entry — the four stages, the read and eleven links, the family and vouch links — measured from arrival to the first useful thing, in screens, taps, decisions, required fields, words read, waits and permissions; the toll gates that earn their place and the ones that do not
docs/TREE.md           The opportunity solution tree — one outcome, ten opportunities in the person's voice, every solution mapped to one, the investment-against-importance table, and the four subtraction decisions; the live roadmap
docs/JOBS.md           The four stages through Jobs-to-be-Done — situation, functional, emotional and social job, alternatives, anxiety, habit — every feature held to a job and classed clear / thin / company's / no job; the hypothesis sheet the sessions test
docs/RISKS.md          Every major system against Cagan's four risks — value, usability, feasibility, viability — classed strong / at risk / unproven / unnecessary; the five risks hiding behind working code, the smallest intervention for each, and which were built
docs/AUDIT.md          The current-state audit, 2026-09-17: what product actually exists — core, supporting and speculative systems, duplication, contradictions between code and its promises, orphaned complexity, and the quality gaps ranked; every claim FACT or INFERENCE with a file — the one place that says what is built
docs/BOARD.md          The board-level audit: fifteen questions answered with every claim labelled FACT / INFERENCE / HYPOTHESIS, the top ten actions ranked, what was built from it and what is the founder's to decide
docs/CONTROL.md        Every dependency, ranked: what happens when a supplier changes their mind
docs/DEPLOY.md         How main gets live, and the two failure signatures
.github/pull_request_template.md   The release-review checklist, in front of every PR
netlify/edge-functions/gate.ts   Founding-preview password gate
```

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
npm run verify   # typecheck + lint + tests — run before pushing
```

Node 20+ (the deploy pins 22).

### Before changing dependencies

The deploy runs **`npm ci` on a clean clone**, not `npm install` in a warm tree,
and it may run with `NODE_ENV=production`. Two consequences:

- `package-lock.json` must be committed in the same change as `package.json`, or
  `npm ci` fails outright.
- Every build tool here is a devDependency, so `netlify.toml` sets
  `NPM_FLAGS = "--include=dev"`. Without it `npm ci` prunes them and the build
  dies on "cannot find module" — while Netlify quietly keeps serving the last
  deploy that worked, so the site looks fine and is silently stale.

To reproduce the deploy build exactly before pushing:

```bash
git clone . /tmp/cibuild && cd /tmp/cibuild
NODE_ENV=production npm ci --include=dev && npm run build
```

## The tools at their own addresses

The read and the eleven have paths of their own — `/tools/is-he-serious`,
`/tools/is-she-serious`, `/tools/before-you-say-yes` — defined once in
`src/data/tools.ts`, recognised in `src/lib/entry.ts`, minted in
`src/lib/links.ts`, mirrored into the address bar by `src/App.tsx` (always
`replaceState`, never `pushState`: no history is manufactured), and written as
one HTML document each by `vite.config.ts` so a reload, a fresh visit and a
chat preview all read the tool's own title. A route about a man presets the
reader as a woman and skips the "who are you reading?" question; she can flip
it in one tap, and the side is committed to identity only when she starts. The
older `?read` and `?eleven` links still work. `docs/DEPLOY.md` says how to link
them in public placements.

## The guide, and its one-page sample

The eleven also exist as a plain page — `/guides/before-you-say-yes` — and a
one-page sample of three of them at `/guides/before-you-say-yes/sample`, both
written from `src/data/eleven.ts` at build time by `src/lib/guidePages.ts` in a
voice for two readers, with what the page is and is not on page one. No app
runs on them; the only script forwards a `?via=` onto the links into the app.
`docs/DEPLOY.md` says how to hand them to a mosque or a counselling service,
and A9 in `docs/EXPERIMENTS.md` says what would show it worked.

## Collecting real people

A signup has to reach a server or the person is lost the moment they close the
tab. `src/lib/waitlist.ts` supports three transports, in order:

1. **Netlify Forms** (what the deploy uses) — `VITE_WAITLIST_FORM` names the
   form, set in `netlify.toml`. `public/__forms.html` carries the hidden form
   Netlify scans at build time to register it; submissions POST to `/`.
2. **Any JSON endpoint** — set `VITE_WAITLIST_URL` (`cp .env.example .env.local`)
   and signups POST as JSON.
3. **Neither** — the card falls back to a mailto rather than pretending someone
   joined a list that does not exist.

`scene` is the city signal, and `country` and `reach` beside it say which pool
she is counted in — her city, or her country if she would travel within it.
Together they tell you which pool has enough serious people to open first,
and they are what let the founder write to exactly those people when it does.
A failed POST is queued in localStorage and retried on the member's next
visit, so one bad connection never costs a real person.

## The close switch

**The site is open.** `PREVIEW_PASSWORD` was deleted on 2026-09-12 and the
founding preview ended that day (`docs/DEPLOY.md`, the one place the gate's
state is described). `netlify/edge-functions/gate.ts` stays, dormant: setting
that variable again password-protects the whole site at the edge within one
deploy, so a visitor never receives the app's HTML. It is the only way to
close this site in a single action, which is worth keeping for the day
`docs/TIME.md` names.

To close it, in Netlify (Site configuration → Environment variables) add:

| Field | Value |
|---|---|
| **Key** | `PREVIEW_PASSWORD` — exactly this, it is the name the code looks up |
| **Value** | the password itself |
| Contains secret values | **unchecked** |

Leave "Contains secret values" unchecked. Secret-scoped variables do not reach
Edge Functions. Non-secret only means readable by someone already signed in to
the Netlify account; it is still never bundled and never in this repository.
Any username is accepted; only the password is checked, in constant time.

**Unset means no gate — the normal state.** After setting it, confirm a bare
request is refused; after deleting it, confirm the same request answers 200:

```bash
curl -sI https://<your-site>/ | head -1     # closed: HTTP/2 401 · open: HTTP/2 200
```

The `noindex` header and the disallowing `robots.txt` are gone as
of 2026-09-13 — they cancelled each other and left the domain in Google as a
bare URL with no title. `robots.txt` and `sitemap.xml` are written by the
build so they carry the same host as every link; `docs/DEPLOY.md` has the
Search Console steps, which are the founder's.

## The founder's readout

Seven routes return aggregates and nothing else: the ladder
(`/.netlify/functions/progress`), the door's full tally (`/cohort` with no
`scene`), how pairs come out on the eleven (`/couple` with no `code`), the
vouch's asks and gives (`/vouch` with no `code`), the shape of a pool —
live, looking, ages, eligible pairs, stranded (`/pool?scene=` or
`?country=`, `docs/LIQUIDITY.md`) — the backup (`/export`), and the guide's
health check (`/guide`). The backup returns whole progress records, so none of
them is public: every one refuses with a 401 until `FOUNDER_KEY` is set —
fails closed, since 2026-09-12 (`netlify/shared/founder.ts`, `docs/BOARD.md`).
They are the one thing here a second team could not build for itself, and the
health check spends Anthropic credit on every call, so all seven sit behind
that one bearer token.

| Field | Value |
|---|---|
| **Key** | `FOUNDER_KEY` |
| **Value** | a long random string — `openssl rand -base64 32` |
| Contains secret values | checked is fine — Node functions receive secret-scoped variables, unlike edge functions |

**Unset means closed** — every readout answers 401 until the key is set
(`netlify/shared/founder.ts`, since 2026-09-12); tests set their own. After
setting it:

```bash
curl -sI https://<your-site>/.netlify/functions/progress | head -1     # expect: HTTP/2 401
curl -s -H "Authorization: Bearer $FOUNDER_KEY" https://<your-site>/.netlify/functions/progress
curl -s -H "Authorization: Bearer $FOUNDER_KEY" https://<your-site>/.netlify/functions/cohort
curl -s -H "Authorization: Bearer $FOUNDER_KEY" https://<your-site>/.netlify/functions/couple
curl -s -H "Authorization: Bearer $FOUNDER_KEY" https://<your-site>/.netlify/functions/vouch
curl -s -H "Authorization: Bearer $FOUNDER_KEY" "https://<your-site>/.netlify/functions/pool?scene=twin-cities"
curl -s -H "Authorization: Bearer $FOUNDER_KEY" https://<your-site>/.netlify/functions/guide
```

The door's own count (`/cohort?scene=…`, plus `&country=` for somewhere-else)
stays public: it is the number on the door, and the door is a promise made in
public. Reporting a rung, keeping a map, answering the eleven and vouching
never need the key — each is bounded by an hourly cap instead
(`netlify/shared/limit.ts`; the variables are in `docs/DEPLOY.md`).

## The AI Guide

`askCoach` (`src/lib/coach.ts`) calls `netlify/functions/guide.ts`, which prompts
Claude (`claude-opus-5`) with `guideSystemPrompt` — the mode's persona, the
member's map, where she is in the arc, and grounding rules that defer fiqh to a
scholar, forbid inventing people, and end every reply on a concrete action.
The thread's recent turns go along, so the guide remembers mid-conversation.
`generateReflection` in `src/lib/reflection.ts` is the one remaining local seam.

**It is dormant until `ANTHROPIC_API_KEY` is set** as a Netlify environment
variable. Without it the function returns 503 and the local intent matcher
answers. A GET on the function is a health check openable from a phone.

The Trust screen describes exactly what the live guide sends and lets her keep
it on the device. That copy must move in the same commit as anything that
changes what is sent.
