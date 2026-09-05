# Niyyah

**The trusted marriage platform for the Somali diaspora — powered by AI, guided
by faith, designed for serious people.**

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
the hook question and the thirteen-question map. Someone already talking to a
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
- **The readiness map** — thirteen questions in three chapters. Seven grounds,
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
  the readout into revisions.
- **The door** — the real count of women and men in her city who have kept a
  map and can be reached, against the number the city opens at. Never seeded.

## What is deliberately not here

No feed, no deck, no swipe. No score on a person, hers included. No daily
check-in, streak, milestone or comeback nudge. No visible reply counter and no
"unlimited" tier. No profile before there is a room. No who-liked-you. See
`docs/STRATEGY.md` §6 for the list, and why.

## Architecture

```
src/
  data/intake.ts       The map's schema — thirteen questions, three chapters, plus how-you'd-live
  data/read.ts         The read — eleven behavioural questions, scripts, pronoun voices
  data/beforeYes.ts    The eleven conversations, each with its script
  data/families.ts     The words for your family
  data/coach.ts        The Guide's five voices — greeting, starters, local intents
  data/daily.ts        Reflections, weighted to the person (no return hook)
  data/stages.ts       Preparing → talking → deciding → married
  data/nextStep.ts     One honest thing per ground — the work card
  data/hook.ts         "What's the hardest part?" and its instant insight
  data/scenes.ts       Diaspora cities
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
netlify/functions/     guide · keep · cohort · couple · vouch · progress (Netlify Blobs)
netlify/shared/        founder — the bearer key on every readout; vocab — every closed set the functions accept
docs/OPERATING.md      The monthly loop: readout field → constant it revises
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

`scene` is the city signal: it tells you which city has enough serious people
to open first. A failed POST is queued in localStorage and retried on the
member's next visit, so one bad connection never costs a real person.

## The founding-preview gate

`netlify/edge-functions/gate.ts` password-protects the whole site at the edge, so
an unauthenticated visitor never receives the app's HTML.

In Netlify (Site configuration → Environment variables) add:

| Field | Value |
|---|---|
| **Key** | `PREVIEW_PASSWORD` — exactly this, it is the name the code looks up |
| **Value** | the password itself |
| Contains secret values | **unchecked** |

Leave "Contains secret values" unchecked. Secret-scoped variables do not reach
Edge Functions. Non-secret only means readable by someone already signed in to
the Netlify account; it is still never bundled and never in this repository.
Any username is accepted; only the password is checked, in constant time.

**Unset means no gate.** After setting it, confirm a bare request is refused:

```bash
curl -sI https://<your-site>/ | head -1     # expect: HTTP/2 401
```

At real launch, remove three things together: the `[[headers]]` block in
`netlify.toml`, `public/robots.txt`, and this gate.

## The founder's readout

Four routes return aggregates and nothing else: the ladder
(`/.netlify/functions/progress`), the door's full tally (`/cohort` with no
`scene`), how pairs come out on the eleven (`/couple` with no `code`), and the
guide's health check (`/guide`). None returns a person. They are still the one
thing here a second team could not build for itself, and the health check
spends Anthropic credit on every call, so all four sit behind one bearer token
read from `FOUNDER_KEY` (`netlify/shared/founder.ts`).

| Field | Value |
|---|---|
| **Key** | `FOUNDER_KEY` |
| **Value** | a long random string — `openssl rand -base64 32` |
| Contains secret values | checked is fine — Node functions receive secret-scoped variables, unlike edge functions |

**Unset means open**, the same convention as the gate, so local runs and tests
behave as before. After setting it:

```bash
curl -sI https://<your-site>/.netlify/functions/progress | head -1     # expect: HTTP/2 401
curl -s -H "Authorization: Bearer $FOUNDER_KEY" https://<your-site>/.netlify/functions/progress
curl -s -H "Authorization: Bearer $FOUNDER_KEY" https://<your-site>/.netlify/functions/cohort
curl -s -H "Authorization: Bearer $FOUNDER_KEY" https://<your-site>/.netlify/functions/couple
curl -s -H "Authorization: Bearer $FOUNDER_KEY" https://<your-site>/.netlify/functions/guide
```

The per-city count (`/cohort?scene=…`) stays public: it is the number on the
door, and the door is a promise made in public. Reporting a rung, keeping a
map, answering the eleven and vouching never need the key.

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
