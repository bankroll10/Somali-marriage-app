# Niyyah

**The trusted marriage platform for the Somali diaspora — powered by AI, guided
by faith, designed for serious people.**

A modern bridge: between tradition and technology, family and individual choice,
attraction and intention, AI and faith, Somali culture and modern reality. Not a
place for swiping — the place where a confused generation learns how to *choose*.

Not another dating app. Dating apps only answer **“who is available?”** Niyyah starts
with the questions that actually decide everything:

> Am I ready? Are we aligned? Can I trust them? How do I move toward marriage
> without making it weird?

The vibe is **“build something real,”** not **“date me.”** Serious, culturally
intelligent, calm — depth over dopamine. No swiping.

## What's built

**The promise:** *Find someone serious — without losing your dignity, faith,
time, or peace.* Not another dating app — a culturally specific ecosystem that
already understands Somali parents, Muslim values, marriage pressure, diaspora
identity, and the scenes (Twin Cities, Toronto, London, Columbus, Stockholm).

**The journey:** Welcome → *who you are + your scene* → **"What's the hardest
part for you right now?"** (an instant personal insight — the 30-second aha) →
a guided intake that builds a **marriage-readiness map** → your **Home** (the
place you return to),
with your **AI Guide**, your **trust** controls, a **daily reflection**, your
**profile**, and **"people in your scene"** — alignment-ranked, trust-gated
discovery that is deliberately *not* a swipe deck.

- **Welcome** — sets the tone and frames what this is (and isn't).
- **Identity** — *"I am a woman / man"* + optional first name. This makes the
  whole experience (especially the Guide) speak to *you*.
- **Guided intake** — 6 chapters, one question at a time, with interstitials:
  *Niyyah (intention) · Deen (faith) · Family & Roots · Life & Vision ·
  Character · Heart (emotional readiness + honest mirror).* Four input types
  (single, multi, scale, free text), including the thing Hinge never asks —
  healing, attachment, and what communication makes you feel safe. Progress
  saves to `localStorage`.
- **Marriage-readiness map** — an overall reading, per-dimension scores (incl.
  emotional readiness) with human notes, your core values, non-negotiables, an
  honest-mirror growth note, and *what alignment looks like for you*.
- **The AI Guide — six modes** *(the secret weapon)* — pick the voice you need:
  - **Wise Auntie** — warm, direct, culturally aware. *"Don't confuse late-night texting with intention."*
  - **Big Brother** — straight talk for the brothers. *"Stop flirting in circles. State your intention."*
  - **Therapist** — attachment, overthinking, regulation, healing.
  - **Islamic Values** — niyyah, modesty, boundaries, family, respect.
  - **Matchmaker** — alignment over looks; reads your readiness map.
  - **Profile Coach** — present your best, honest self (no lying).
  Each mode is its own voice with its own greeting, starters, and wisdom.
  Hand-authored today; a clean Claude seam to go live (`src/lib/coach.ts`).
- **Trust & safety layer** *(trust is the product)* — identity verification,
  serious-intention badge, wali-friendly, blur-photos-until-mutual, and a
  privacy shield for sisters, with a live trust score. Because in this community,
  women's trust determines whether the whole thing works.

## Architecture

```
src/
  data/intake.ts      The intake schema — the soul of the app (edited prose, not generated)
  data/coach.ts       The AI Guide's wisdom — six GuidanceModes, each a distinct voice
  data/daily.ts       Daily rotating reflections — the reason to return
  data/scenes.ts      Diaspora scenes (belonging, not just a location field)
  lib/reflection.ts   Reflection engine. Local synthesis + marked Claude seam.
  lib/coach.ts        Guide engine — mode-aware intent matching + Claude seam (askCoach)
  lib/storage.ts      localStorage persistence (answers + identity + trust)
  data/candidates.ts  Mock serious candidates (depth-first) for discovery
  data/conversation.ts Guided-conversation prompts + candidate reply engine
  data/checkin.ts     Daily "How's your heart?" check-in (no streaks — being known is the reward)
  hooks/useNiyyah.ts  Single source of truth: state, actions, debounced persistence
  lib/id.ts           The one id generator
  components/ui.tsx   Shared primitives (Button, ScreenHeader, BackButton, InitialAvatar, …)
  components/ErrorBoundary.tsx  Branded crash recovery (reload / start fresh)
  lib/matching.ts     Alignment engine (alignment-over-looks) + Claude seam
  components/         Welcome, Philosophy (positioning/the bridge), Identity (+ scene),
                      Intake, QuestionCard, Reflection (readiness map), Home (the hub),
                      Coach (modes + chat), Trust, Profile, Discovery, Connections,
                      Conversation (guided chat), ui
  types.ts            Domain types (Question, Answers, Reflection, Identity, CoachMessage)
```

### The Claude seam (two of them)

Both AI surfaces are local today and built to go live without UI changes:
- `generateReflection(answers)` in `lib/reflection.ts` — async, returns the
  `Reflection` shape. Swap the body for a Claude (claude-opus-4-8) call.
- `askCoach(message, ctx)` in `lib/coach.ts` — async, returns the guide's reply.
  Swap the body for a Claude call prompted as this same warm, gender-aware guide,
  passing the readiness map + recent messages as context.
In both, the local version stays as baseline + offline fallback.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build
```

## Next slices (roadmap)

1. ~~AI readiness + values intake~~ ✓
2. ~~Identity + emotional readiness + the AI Guide~~ ✓
3. ~~Six guidance modes + the trust & safety layer~~ ✓
4. ~~Home hub + daily reflection + your scene + the promise (stickiness)~~ ✓
5. ~~Positioning — the Philosophy screen / "modern bridge"~~ ✓
6. ~~Profile of real depth + aligned discovery ("people in your scene"),
   trust-gated, alignment-not-looks~~ ✓
7. ~~Guided connection — mutual match → photo reveal → guided conversation with
   value-based prompts, the guide on standby, and the wali-friendly path~~ ✓
8. **Live Claude** — wire the seams (`generateReflection`, `askCoach`, the
   matching "why you align" reason, and guided-conversation suggestions) to the
   API, with the readiness map as shared context.
9. **Real backend** — auth, persistence (matches/conversations), real
   verification, and moderation/reporting (safety is first-class; see
   `docs/STRATEGY.md`).

## Collecting real people

Until an endpoint is configured, Niyyah cannot reach anyone who closes the tab —
no email, no account, no server. That is the single biggest thing standing
between this and real users.

1. Make an endpoint that accepts a JSON POST (Formspree takes ~2 minutes).
2. `cp .env.example .env.local` and paste the URL into `VITE_WAITLIST_URL`.
3. Rebuild. Signups now arrive as `{ email, scene, gender, overall, at }`.

`scene` is the city signal: it tells you which city has enough serious people
to open first. A failed POST is queued in localStorage and retried on the
member's next visit, so one bad connection never costs a real person.

With no URL set, the signup card falls back to a mailto instead of pretending
someone joined a list that does not exist.
