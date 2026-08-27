# Niyyah — Product Strategy (v7, the PM lens)

> The PM's job: make Niyyah the default place this generation goes whenever
> *anything* about marriage is on their mind — and to do it without the dopamine
> tricks the brand exists to reject.

## 0. The hard question: "Why open this every day?"

**The trap.** Dating apps get daily opens from a slot machine — likes, matches,
notifications engineered for anxiety. We rejected that. Worse, a *marriage* app
has the retention paradox: **success = churn** (find someone → leave), and match
events are infrequent. So we cannot pin daily engagement on matching.

**The reframe.** Niyyah is not a match feed you check; it's a **relationship
companion you turn to.** The honest target isn't maximal DAU (forcing daily opens
on a sacred process would cheapen it and bleed trust). The target is **share of
mind**: when she's anxious about a slow reply, when he doesn't know what to say to
her brother, when the aunties are pressuring — Niyyah is the reflex.

So we design three reasons to return, at three cadences:

| Cadence | Reason to open | Surface |
|---|---|---|
| **Daily** | A 60-second calming ritual + check-in | Today's reflection, "How's your heart?" |
| **Event-triggered** (the engine) | A real moment needs wisdom | The Guide (6 modes) |
| **Weekly** | Progress: new introductions, a reply, your map evolving | Discovery, Connections |

The companion habit (daily + event) is the moat. The marketplace (weekly) is why
they joined. Both matter; the companion is what keeps them when matching is slow
or done.

## 1. Retention architecture (the loops)

**Loop A — Daily ritual** *(habit)*
Trigger: morning / a gentle nudge ("Today's reflection is ready") → Action: read
the reflection, tap a one-word check-in ("How's your heart today?") → Reward:
calm, an identity-affirming thought, a sense of being known → Investment: the
check-in log personalizes tomorrow's reflection and primes the Guide.
*Build state: reflection ✓; daily check-in + continuity = NEXT.*

**Loop B — Guidance** *(the killer, event-triggered)*
Trigger: a real-life relationship moment, or a nudge when a conversation stalls →
Action: ask the Guide → Reward: relief, a genuinely useful answer, a suggested
reply → Investment: the Guide remembers your situation; your map deepens.
*Build state: Guide ✓ (local); needs live Claude + memory to be magic.*

**Loop C — Connection** *(weekly)*
Trigger: new introductions in your scene, a match's reply → Action: review intros
/ continue a guided conversation → Reward: alignment, a meaningful exchange →
Investment: profile, expressed interest, conversation history.
*Build state: discovery + guided conversation ✓; needs real liquidity + backend.*

**Loop D — Lifecycle** *(the years-long moat)*
The product follows single → talking → engaged → married (coaching). Retention
measured in life stages, not days. *Build state: future.*

**Notifications doctrine (a brand-defining PM decision).** Sparse, dignified,
never thirsty. ✅ "Your guide is here if today felt heavy." "A new introduction in
the Twin Cities." "Today's reflection." ❌ "5 people liked you!" "Don't miss out!"
Every notification must respect the user or it erodes the one thing we sell: trust.

## 2. Onboarding & activation

**Current funnel:** Welcome → identity + scene → ~23-question intake → readiness
map (first payoff) → Home.

**The aha moments:** (1) the readiness map ("this *gets* me"), (2) the Guide's
first genuinely useful answer.

**PM critique & moves:**
- **Time-to-value is too long.** 23 questions before *any* payoff risks drop-off.
  Fixes: tease a micro-insight after chapter 1; let users ask the Guide one
  burning question early ("what's on your mind right now?") *before* finishing the
  full map; treat the full intake as **progressive profiling** (finish over days).
- **Activation metric (define it, instrument it):** *completed the readiness map
  AND had ≥1 Guide exchange within 48h.* That user retains; optimize the funnel to
  this, not to signup.
- **Keep the intake feeling like a conversation, not a survey** (it largely does)
  — progress, skippable depth, warm copy.

## 3. Core features by job-to-be-done

| Feature | The job it does | Loop it serves | Priority |
|---|---|---|---|
| Readiness map | "Am I ready? Who fits me?" | Activation aha + profile fuel | P0 ✓ |
| The Guide (6 modes) | "Help me navigate this moment" | **Retention (B)** | P0 ✓ |
| Daily reflection | "Ground me, see me" | **Habit (A)** | P0 ✓ |
| Trust & verification | "Keep me safe; prove I'm serious" | Liquidity/safety gate | P0 ✓ |
| Profile | "Show who I really am" | Connection fuel | P0 ✓ |
| Discovery (alignment) | "Find someone serious, not looks" | Connection (C) | P0 ✓ |
| Guided conversation | "Move toward marriage, with help" | Connection + retention | P0 ✓ |
| Daily check-in | "A reason + ritual to return" | Habit (A) | **P1 — next** |
| Who's interested in you | "Am I wanted?" | Connection + monetization | P1 |
| Concierge matchmaking | "Do it for me, the trusted way" | Monetization (high ARPU) | P2 |

## 4. Monetization flow

**Principle: retention before revenue. Gate acceleration and reach — never
dignity, safety, or the daily ritual.** Those drive the habit and liquidity that
make the marketplace worth paying for.

**Free (acquisition + liquidity):** full onboarding, readiness map, daily
reflection, verification, profile, browse a few introductions, and the Guide with
limits (e.g., a daily message cap; default mode free). Women get more headroom
free — women's trust = liquidity.

**Niyyah+ paywall placed at peak-intent moments (soft, value-first):**
1. **Mid-spiral guide cap** — she's anxious at 1am, hits the free Guide limit. The
   single highest willingness-to-pay moment. → Unlimited guidance + all 6 modes.
2. **Express interest beyond the daily limit** / **see who's already interested in
   you.** Classic high-intent conversion.
3. **More introductions + advanced alignment filters.**
4. **Concierge matchmaking** (AI + human) as a premium tier — culturally native
   (families already pay aunties).

**Pricing:** price the *outcome* — a "Serious about marriage" 3-month plan beats a
monthly toggle; the commitment frame fits the product. Target ~$25–40/mo
equivalent, higher for concierge. (See `docs/STRATEGY.md` for the model.)

## 5. Metrics — what I'd put on the wall

**North Star: weekly Meaningful Sessions per active user** — a session containing
a Guide exchange, a guided-conversation message, or a completed daily reflection.
It captures the *companion* value, not vanity time-in-app.

- **Activation:** % reaching map + first Guide exchange in 48h.
- **Retention:** W1/W4 return curves, split by loop (ritual vs guidance vs
  connection) to see what actually holds people.
- **Connection quality:** mutual interests → conversations with ≥N value-based
  exchanges (not just "matches").
- **Trust guardrails (counter-metrics):** reported-safety incidents (keep near
  zero — reputation is the kill switch), verified-rate, women's W4 retention
  (the liquidity bellwether).
- **The true (lagging) outcome:** serious engagements / marriages started.
- **Explicitly NOT optimized:** swipes, raw time-in-app, match count.

## 6. Roadmap — what gets built next (and why)

Sequencing logic: the core question is "why open daily," and the answer is the
**companion** (Loops A + B). That needs the Guide to be *real* and to *remember*,
plus a daily ritual mechanic. Monetization waits until retention is proven.

1. **Daily engagement loop** *(P1, buildable now)* — a "Today" check-in ("How's
   your heart?") that feeds the Guide and tomorrow's reflection, light continuity
   ("your guide remembers"), and dignified re-engagement nudges. *This is the
   literal answer to "why open every day," and it ships in the prototype today.*
2. **Live Claude + memory** — make the Guide genuinely smart and continuous across
   sessions (the retention engine). Seams already shaped: `generateReflection`,
   `askCoach`, matching reasons, conversation suggestions.
3. **Real backend** — auth, persistence (matches/conversations/check-ins), real
   verification, and moderation/reporting (safety is first-class).
4. **Monetization** — instrument the paywall at the peak-intent moments above,
   *after* the retention curve is healthy.
5. **Lifecycle expansion** — engaged/married coaching (Loop D), the years-long
   moat.

**My call for the immediate next build: #1, the daily engagement loop** — highest
leverage on the core question, and the only one fully buildable in the prototype
right now.
