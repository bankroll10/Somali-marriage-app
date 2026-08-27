# Niyyah — Demo Script

**Setup (before the meeting):** run the dev server, open two browser tabs:

| Tab | URL | State |
|---|---|---|
| 1 — "New user" | `http://localhost:5173/?fresh` | Clean Welcome screen |
| 2 — "Member" | `http://localhost:5173/?demo` | Hodan: onboarded, verified, full readiness map |

Reloading a `?demo` tab resets it to the same known state — safe to re-run mid-demo.
(`?fresh` and `?demo` overwrite local data; don't use them in a browser profile whose
Niyyah state you care about.)

**The one-liner to open with:**
> "The trusted marriage platform for the Somali diaspora — powered by AI, guided by
> faith, designed for serious people. Dating apps answer 'who is available?' We answer
> the questions that actually decide a marriage: am I ready, are they serious, are we
> aligned — and we stay with people all the way to the nikah."

---

## Act 1 — The first 60 seconds (Tab 1, ~2 min)

1. **Welcome.** Let the headline land: *"What's **actually** in your way?"* — then the
   `??` ring beside it. *Say: "Our wedge user is a 24–34 diaspora woman. In a marriage
   marketplace, women's trust IS the liquidity — everything you'll see is built for her
   first. Note what the headline does NOT ask: whether she's ready. The fear she already
   carries is that she's the reason none of this has worked, and we're not selling
   against that. We point at the obstacle, not at her."*
   Point at the quiet line under the ring: *"You are not behind, and being here is not
   an admission of anything."* — the objection that actually stops her tapping.
2. Tap **Show me what’s in my way** → identity (gender first, ~10 seconds; pick woman,
   type a name, pick Minneapolis).
3. **The hook:** "What's the hardest part for you right now?" → tap *"Knowing if
   someone is actually serious."* The instant, personalized insight appears.
   *Say: "Value in 30 seconds — before we've asked for anything. Every answer from
   here deepens her private readiness map."*
4. Tap **Build my readiness map**, answer 2–3 questions of Chapter 1 to show the
   question quality, then say: *"Six chapters, about three minutes — let me show you
   an established member instead of clicking through it live."* → **switch to Tab 2.**

## Act 2 — The companion (Tab 2, ~4 min)

5. **Home.** *"This is what she opens every day — not a feed."* The hero is
   **Your work**: one thing, drawn from the thinnest ground on her map. Today it's
   emotional readiness — *"Next time you want to go quiet on someone, say 'I need a
   moment, I'm not disappearing' instead."*
   *Say: "This is the whole product in one card. Every other app in this category is
   a matching engine. We're the only one that tells you what to actually go do, and
   then keeps the receipt."*
6. **Tap "I did this."** The card turns into the acknowledgment — *"You stayed in
   the room instead of going quiet. That's the whole skill."*
   *Say: "No points, no streak, no score change. Doing the work changes her answers,
   and her answers are the map. That honesty is the reason people trust it."*
7. **Tap a check-in mood** (e.g. Steady) — warm acknowledgment appears live.
8. **"Talk it through with Therapist"** on the work card → **the Guide**, opened
   straight into the voice suited to that ground.
9. **Six guides** — open **Wise Auntie**, tap *"He only texts me late at night."*
   Read the answer aloud; it's the demo's best moment:
   *"…a man who only appears after midnight is not courting you — he is comforting
   himself. Good intentions keep daytime hours."*
   *Say: "This is the retention engine. Real life generates these moments weekly —
   this build runs on a local engine; the production guide is Claude with her
   readiness map as context."*
10. (Optional) Show **Switch** → Therapist / Big Brother (the men's side) / Matchmaker
    (it reads her map back to her).

## Act 3 — The marketplace (Tab 2, ~3 min)

11. Back to Home → **Readiness map** (the ring draws in; dimensions, non-negotiables,
    honest mirror). Scroll to **"Where to put your effort"** and **"What you've
    done"** — three finished pieces of work, dated. *"This powers matching, and it's
    the retention engine: the map names the ground, she does the thing, the record
    accumulates, and when enough has changed the map asks her to reflect again. It's
    private — depth, not a public score."*
12. **Your profile → Protections & privacy.** *"In this community, trust is the
    entire product: verification, blur-until-mutual, wali-friendly, privacy shield.
    Reports remove people."* (Trust is managed from the profile.)
13. **Profile → Niyyah+** — the business model, if asked. Scroll it in order:
    what's free forever, then what Plus adds, then the price (58% down the page).
    *Say: "Nothing that protects her is ever paid — verification, blocking, and
    replying to someone serious are free at any price. We charge for the guide,
    which costs us money per reply, and for the lifecycle after the match. The
    plan we recommend is six months, not the year, and the page says out loud
    that if this works you won't need a year. The trial takes no card."*
    (The wall itself is in the guide: send 20 replies and it appears *under* the
    conversation, never over it.)
14. **People in your scene.** *"A few introductions a day, ranked by how lives fit —
    no feed, no swiping, photos private until mutual."* Open **Yusuf** — show *Why
    you align* and the prompts.
15. **Express serious interest** → "Interest sent" (calm, no chasing). Reciprocation
    lands after ~6–9 seconds — keep talking over it (*"and if it's mutual, they're
    introduced…"*) until the mutual card appears → **Start the conversation.** Show:
    photo revealed, his opener, **"Niyyah suggests asking"** value prompts, and tap
    **Involve family** — the wali joins, the connection becomes family-aware. *"No
    other product in the world has this button."* (Note: Omar/Hani deliberately never
    respond — realism; express interest in Yusuf.)

## Close (~1 min)

> "Everything you saw is the single-player and first-social loop, working end to end.
> The build plan from here: Claude behind the guide, real verification and backend,
> then city-by-city launch — Minneapolis first, the largest Somali community in North
> America. The moat isn't the AI — it's trust, cultural depth, and the full lifecycle
> from 'am I ready' to married coaching."

**If asked "what's real?"** — honest answer: all product surfaces are real and working;
the guide runs on a hand-authored local engine (Claude integration is a marked seam),
candidates are curated mock profiles, verification is simulated. Strategy docs:
`docs/STRATEGY.md`, `docs/PRODUCT.md`.

**Do not demo:** restarting onboarding on Tab 2 (wipes the seed — just reload `?demo`),
or typing free-form gibberish at the guide repeatedly (the local fallback is graceful
but generic; starters show it best).

---

## Launch-video shot list (phone frame, 375×812)

Record in a mobile viewport (or a real phone with the app added to the home screen —
the manifest + apple-mobile-web-app meta make it run full-screen, chrome-free). Each
shot is a clean, screenshot-worthy screen; hold ~2–3s.

| # | Screen | How to get there | The line on screen / voiceover |
|---|---|---|---|
| 1 | **Welcome** | `/?fresh` | "What’s *actually* in your way?" + the ?? ring — the result, withheld. |
| 2 | **The hook insight** | tap through identity → pick "Knowing if someone is actually serious" | A personal answer in 30 seconds — value before signup. |
| 3 | **A question** | Build my readiness map → Q1 | Depth-first, one calm question at a time. |
| 4 | **Generating** | finish intake | Staged: "Reading what you shared… Drawing your map…" |
| 5 | **Readiness map** | (auto) | The score ring draws in; dimensions, non-negotiables, honest mirror. |
| 6 | **Home** (`/?demo`) | reload as member | "Salaam, Hodan." → **Your work**: one thing from her map, and "I did this". |
| 7 | **The guide** | Talk to your guide → Wise Auntie → "late at night" | The answer + a **"Words you could use"** copyable script. |
| 8 | **People in your scene** | Home → discovery | "Today's introduction," alignment not looks, photos blurred. |
| 9 | **Guided conversation** | Yusuf → interest → mutual → start | Photo revealed, opener, **Involve family**. |
| 10 | **Trust & safety** | Profile → Manage protections | Verified · serious-intention · wali-friendly · blur · privacy shield. |
| 11 | **Niyyah+** | Profile → Niyyah+ | Free-forever list first, price at 58% down the page, "most people" = six months. |

**Best three stills for the App Store screenshots:** #1 (Welcome), #5 (Readiness
map), #7 (the guide with the script card) — they tell the whole story in three frames.

**The one-screenshot seller is #5.** The map's dark hero card is self-contained:
wordmark in the header, "Hodan · your marriage-readiness map," the gold ring
counting to 88, the verdict in serif, and the promise line — "Readiness first,
profiles later — that's how Niyyah chooses who you meet. No one sees this map
but you." What it does, why it matters, who it's for, in one frame.

---

## The 20-second TikTok cut

Five beats, phone frame, no dead frames. The hook is the **map drawing itself** —
lead with the payoff, then explain. Record at 375×812; every beat starts at the
top of its screen (no mid-scroll cuts).

| Beat | ~sec | Screen | On camera | Voiceover beat |
|---|---|---|---|---|
| 1 | 0–3 | Readiness map (reload it) | Ring counts 0→88, seven bars fill in a wave | "This app told me if I'm actually ready to get married" |
| 2 | 3–7 | Home → **Your work** card | Tap "I did this" → the card turns into the acknowledgment | "…then it gives you ONE thing to actually go do about it" |
| 3 | 7–11 | Welcome → hook question | "What's the hardest part for you right now?" | "It starts by asking what you're really struggling with" |
| 4 | 11–16 | Wise Auntie + script card | Reply + "Words you could use" | "There's a wise auntie who gives you the exact words to say" |
| 5 | 16–20 | Discovery card, blurred avatar | Lock badge, "why you align", no photos | "And no one sees your photos until you're both serious. Bismillah." |

Cut notes:
- Beat 1 is the thumbnail/loop frame — the map animates on every visit, so just
  re-open it from Home to re-trigger the draw.
- Express-interest reciprocation lands after 6–9s by design; never wait for it
  on camera — cut away and come back if the mutual moment is needed.
- The demo member scores **88** with a 78–100 spread and a real growth edge —
  don't "fix" her answers back to perfect; a flawless profile reads fake on video.
