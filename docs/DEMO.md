# Niyyah — Demo Script

**Setup (before the meeting):** run the dev server, open two browser tabs:

| Tab | URL | State |
|---|---|---|
| 1 — "New user" | `http://localhost:5173/?fresh` | Clean Welcome screen |
| 2 — "Member" | `http://localhost:5173/?demo` | Hodan: preparing, map built, two readings, work in progress |

Reloading a `?demo` tab resets it to the same known state — safe to re-run mid-demo.
(`?fresh` and `?demo` overwrite local data; don't use them in a browser profile whose
Niyyah state you care about.)

**The one-liner to open with:**
> "The trusted marriage platform for the Somali diaspora — powered by AI, guided by
> faith, designed for serious people. Dating apps answer 'who is available?' We answer
> the questions that actually decide a marriage: is he serious, have we had the
> conversations that matter, am I ready — and we stay with people to the nikah and
> through the first year. And we are paid and measured by what happens in her life,
> never by how long she spends on a screen."

---

## Act 1 — The first ninety seconds (Tab 1, ~3 min)

1. **Welcome.** Let the headline land: *"What's **actually** in your way?"* Point at
   the second door: *"Already talking to someone? Start with a read on them instead."*
   *Say: "Our wedge user is a 24–34 diaspora woman. In a marriage marketplace, women's
   trust IS the liquidity. Note what this page does not promise: a number. It promises
   the one place she's thinnest, in words."*
2. Tap **Is he serious?** → **the read.** Eleven questions about what he has actually
   *done* — told anyone, named marriage, moved toward family, followed through. Answer
   them as a real situation (two months in, nobody in his life knows about her, no
   timeline).
3. **The result.** Five things in words — shown, partly, not yet — never a score on a
   person. Then the dark card: **the one question to ask him next**, word for word, and
   what the answer tells her. *Say: "Every instrument here ends in something she can go
   and say. A verdict she can't act on is a horoscope."*
4. Scroll: **Before you say yes** is offered, with the line that he can answer his own
   side on his own phone and neither sees the other's sheet. *Say: "That's how the scarce
   side of this marketplace arrives — through the side we already have."*
5. Tap **Talk it through with your guide.** The question is already asked; the voice is
   already chosen. Read the reply. Under it: **"I'll say this — ask me in three days"** and
   **"That's enough for tonight."** *Say: "The guide closes. There's no 'is this a red
   flag?' chip to keep her in the thread. When she takes the words, the app writes it
   down — and in three days her space asks whether she said them."*

## Act 2 — The companion (Tab 2, ~4 min)

6. **Home.** *"This is what she opens when something happens — not a feed, not a daily
   ritual. There is no check-in, no streak, no milestone."* The ask box first: say what
   happened, the app picks the voice.
7. **Your work** — one thing, drawn from the thinnest ground on her map. Tap **I did
   this.** The card turns into the acknowledgment. *Say: "No points, no score change.
   Doing the work changes her answers, and her answers are the map."*
8. **Your map.** Seven grounds, each a word — thin, steady, strong — with a note written
   from the answer she actually gave. At the top: **what changed since her last reading**,
   in her own words: *"Then: something recent still aches. Now: still healing, and I know
   it."* *Say: "There used to be a ring counting up to 88 here, and a gold +14 badge. The
   weights were an answer key that punished honesty. It's gone. Growth is a diff of her
   answers, not a delta."*
9. **The door.** One sentence: *"Minneapolis today: N women, N men. It opens at forty
   each."* *Say: "We never show an invented crowd. And it's a sentence, not a progress
   bar — there's nothing here to come back and watch."*
10. **How an introduction will look.** Labelled a sample in the first line. Reasons, the
    one place they differ, the first thing to ask. *Say: "No percentage, no band. Her
    non-negotiables are checked first — anyone who fails one is never shown. One person
    at a time; a considered no is progress, not a swipe."*

## Act 3 — Trust and the business (Tab 2, ~2 min)

11. **What decides who you meet** (from Home). *Say: "This used to be a profile with a
    'No photo yet' badge. What actually decides who meets whom is here: what she's done,
    what she won't compromise on, how she'd live, and whether her family vouched."*
12. **What you've done here** → Trust. The ledger, which cannot be tapped; the two
    controls that gate real calls; and the exact account of what leaves the device.
13. **What's free, and what isn't.** Read the rule aloud: *"We never earn more because
    you're having a hard night."* *Say: "The guide is free and its budget refills by
    progress — fifteen replies for every step on the ladder and every follow-up answered.
    There's no counter and nothing to buy. What we'll sell is bought once: a stage, or a
    person."*
14. **Stage band → "We're married, alhamdulillah."** Home goes quiet: the ask box, the
    work, the map, the introductions and the upsell disappear. What stays is the words
    for two families and the guide for the first year. *Say: "Success has a screen.
    Retention past the outcome is a design, not a default."* (Switch the stage back
    before the next run.)

## Close (~1 min)

> "Everything you saw runs end to end, with no invented people. The one number this
> company watches is followed-through per hundred arrived — how many people had a
> conversation they weren't going to have. Sessions per week should fall after every
> rung. The build from here: Claude behind the map, the first-year sheet for married
> members, real verification and backend, then Minneapolis opens — one introduction at
> a time."

**If asked "what's real?"** — honest answer: every instrument is real and working; the
guide runs on Claude when the key is set and on a local voice otherwise; the sample
introduction is invented and says so; the family vouch, the two-sided eleven and the
door are live functions; nothing is verified beyond the vouch. Strategy docs:
`docs/STRATEGY.md`, `docs/PRODUCT.md`.

**Do not demo:** restarting onboarding on Tab 2 (wipes the seed — just reload `?demo`),
or typing free-form gibberish at the guide with no key set (the local voice is graceful
but generic; the read and the one-tap moments show it best).

---

## Launch-video shot list (phone frame, 375×812)

| # | Screen | How to get there | The line on screen / voiceover |
|---|---|---|---|
| 1 | **Welcome** | `/?fresh` | "What's *actually* in your way?" — and "Already talking to someone?" |
| 2 | **The read, result** | Is he serious? → answer eleven | Five things in words, and the one question to ask him. |
| 3 | **The script card** | (same screen) | "Copy the words." |
| 4 | **The guide closing** | Talk it through → reply | "I'll say this — ask me in three days." |
| 5 | **Home, "Since last time"** | `/?demo` after a follow-up ripens | "Have you asked it?" — We talked / Not yet / It went differently. |
| 6 | **Your work** | Home | One thing from her map, and "I did this." |
| 7 | **The map** | Home → Your map | Seven grounds in words; what changed since last time, in hers. |
| 8 | **The door** | Home → founding cohort | "Minneapolis today: 3 women, 1 man. It opens at forty each." |
| 9 | **Married** | Stage band → married | "We're done looking. What's left is the building." |

**Best three stills:** #2 (the read), #4 (the guide closing), #9 (married). They tell the
whole story: what he's shown, what she'll say, and where it ends.

## The 20-second TikTok cut

| Beat | ~sec | Screen | On camera | Voiceover beat |
|---|---|---|---|---|
| 1 | 0–4 | The read, result | Five words appear: shown, partly, not yet | "This app told me what he's actually done — not what he says" |
| 2 | 4–8 | The script card | "Copy the words" | "…and gave me the exact question to ask him" |
| 3 | 8–12 | The guide closing | "I'll say this — ask me in three days" | "It doesn't keep me talking. It asks if I said it" |
| 4 | 12–16 | Home, "Since last time" | We talked / Not yet | "Three days later: did you?" |
| 5 | 16–20 | Married card | "We're done looking." | "And when it works, it lets you go. Bismillah." |
