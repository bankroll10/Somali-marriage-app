# Niyyah

**For the person you are already talking to: what they have done, the
conversation to have next, and the words for it — then it asks whether you had
it. For the Somali diaspora.**

Dating apps answer **"who is available?"** Niyyah starts with the questions
to answer before a marriage:

> Is he serious? Have we had the conversations that matter? Am I ready? How do I
> move toward marriage without making it weird?

It works on a relationship that began anywhere — a wedding, a cousin, another
app — with no account. It puts the same eleven questions to him on his own
phone, blind, and shows the two of them only where they stand. A few days after
it hands her words, it asks whether she said them. When she marries, it lets
her go and takes itself off our server (`docs/PRODUCT.md`).

## What's built

- **The read** — twelve questions about what he has done: told anyone, named
  marriage, moved toward family, followed through, handled hard things.
  Evidence in words, never a score on a person, and the one question to ask
  him next, word for word. At `/tools/is-he-serious` and
  `/tools/is-she-serious`.
- **Before you say yes** — the eleven conversations to have before the families do:
  where you'd live, his mother in the house, money home, work, children, deen
  on a Tuesday, mahr, qabiil, going back, a second wife, when the families
  disagree. It records only whether the two of you have had each one, and
  hands her the one to open this week. At `/tools/before-you-say-yes`.
- **The two-sided eleven** — she sends him a link; he answers on his own phone,
  with no account. Neither ever sees the other's sheet; both see only where
  they stand.
- **The words for your family** — telling your wali you met him online, the
  first conversation with hooyo, asking him to send his people, opening mahr,
  ending it kindly. At `/tools/families`.
- **The follow-up** — days after any instrument hands her words, it asks once:
  *have you had it?* This is the one thing the product measures.
- **The map** — sixteen questions in three chapters, read back as grounds in
  words (*thin*, *steady*, *strong*) with notes from her own answers. No
  number.
- **The guide** — four voices (Wise Auntie, Big Brother, Therapist, Islamic
  Values), live on Claude through `netlify/functions/guide.ts`, with a local
  voice when it is off. She says what happened; the app picks the voice. Every
  reply ends on an action.
- **The Ending** — when she marries: how she chose, the words to pass on, and
  Forget me.
- **Keep, restore, Trust, Forget me, Report a concern** — a map kept under a
  code and brought back on any phone; what leaves the phone and what never
  does; one tap that deletes her from our server; a report the founder reads.
- **The money-conversation sheets and the guide pages** — printable, offline,
  in English and Somali (`docs/ASSETS.md`).

## What is not here

No feed, no deck, no swipe. No score on a person, hers included. No daily
check-in, streak or comeback nudge. No visible reply counter and no paid tier.
No introductions: there is no pool of members, so nothing is built for one
(`docs/DECISIONS.md` has what was removed on 2026-09-24, and where git keeps
it).

## Layout

```
src/data/        What the product says: questions, scripts, voices, stages, tools, brand
src/lib/         Engines and clients: read, beforeYes, couple, followup, keep, forget, progress, coach
src/hooks/       useNiyyah — state, actions, persistence
src/components/  One file per screen; home/ holds Home's cards
netlify/functions/  guide · keep · couple · progress · safety · export · health · sweep
netlify/shared/  founder key, closed vocabularies, caps, the k-floor, the guide's prompt
netlify/edge-functions/gate.ts  The close switch (dormant)
tests/           Invariants, journeys, screens, functions (docs/TESTING.md)
```

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
npm run verify   # typecheck + lint + tests — run before pushing
```

Node 20+ (the deploy pins 22). The deploy runs `npm ci` on a clean clone, so
commit `package-lock.json` with `package.json`; `docs/OPS.md` has the
reproduction.

For a demo: `?fresh` clears the phone and opens Welcome; `?demo` seeds a whole
member ("Hodan") and opens Home. The live site ignores both on a phone that
already holds anything.

## Settings

| Variable | What it does |
|---|---|
| `FOUNDER_KEY` | Opens the founder's readouts. Unset means every readout answers 401. |
| `ANTHROPIC_API_KEY` | Turns the live guide on. Unset, the local voice answers. |
| `PREVIEW_PASSWORD` | The close switch: set, the whole site asks for a password at the edge. Unset is normal. |
| `VITE_SITE_HOST`, `VITE_CONTACT_EMAIL` | The domain and the contact address, if they ever move. |

The caps, the readouts, the backup, the health run and every runbook are in
`docs/OPS.md`.

## Docs

```
docs/PRODUCT.md     What Niyyah is, who it is for, the loop, the North Star, what may be sold
docs/DECISIONS.md   Every numbered decision, the subtraction, and where each old doc went
docs/RESEARCH.md    Open questions, experiments, feedback, the monthly loop, kill criteria
docs/PROTOCOL.md    The ten-session research protocol
docs/DESIGN.md      The voice, accessibility, mobile, performance, links, failure states
docs/PRIVACY.md     What leaves the phone, what the server holds, how deletion works
docs/SECURITY.md    Threats, findings and abuse cases, and what answers each
docs/OPS.md         Accounts, deploy, readouts, health, recovery, schedules, scale
docs/ASSETS.md      Every public asset and its live address; the sheets' rules
docs/GUIDE-EVAL.md  How the guide is measured
docs/TESTING.md     What the suite protects
```
