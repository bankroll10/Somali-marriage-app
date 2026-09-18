# The jobs — the four stages through Jobs-to-be-Done, and every feature held to a job, 2026-09-18

## Context

`docs/AUDIT.md` said what is built; `docs/RISKS.md` said which of it is at risk.
This pass asks the question underneath both: **what job does a person hire
Niyyah to do, at which moment of their life, and which features answer no
job at all?** The frame is Jobs-to-be-Done (Christensen, Moesta): a job has a
situation that triggers it, a functional outcome, an emotional outcome, a
social outcome, the alternatives already hired, the anxieties that stop the
switch, and the habit that must be displaced.

**Evidence base, stated plainly.** No one outside the founder has been
interviewed. Everything below about the person is therefore **HYPOTHESIS**,
drawn from the product's own vocabulary (the four moments, the five hardest
parts, the six hesitations, the ten reasons a courtship ends, the eleven
topics, the family scripts, the ending's three questions) and from
`docs/GAPS.md`, which already classes nearly all of it ASSUMED. That is not a
weakness to hide; it is the point. This document is the hypothesis sheet the
five sessions in `docs/RISKS.md` R1 test, and the feature table at the end is
what the sessions decide. **No feature was added, moved or removed by the pass
that wrote this.**

**The one-paragraph answer.** Niyyah's strongest jobs are all in *talking* and
*deciding*: a woman who needs to know whether he is serious before she invests
more, and a couple who need to have the eleven conversations before the
families lock the outcome. Those jobs have a sharp situation, a real emotional
stake and clear alternatives to displace. *Preparing* has the biggest
functional job in the category, finding anyone serious at all, and the product
cannot do it; what it offers there instead (a sixteen-question map and one
step a week) answers a job nobody wakes up with. *Married* is mostly the
company's job dressed as hers. Of twenty-two features, nine map to a clear
job, six are the company's jobs, and seven have no clear job today and should
be challenged.

---

## The four stages

### PREPARING — "I want to marry and I am not talking to anyone"

| | Hypothesis | Where the product already says it |
|---|---|---|
| **Situation** | An aunt asks at a wedding. A younger cousin gets engaged. A birthday passes (27, 30). A talking ended, or a marriage did. Hooyo says something at dinner. A friend posts a nikah. The trigger is almost always *someone else's* event, not a decision of her own. | Hook: "The pressure from family", "Trusting again after being hurt", "Finding anyone serious at all", "Knowing if I'm even ready" (`src/data/hook.ts`). Moment: "My family is pushing". |
| **Functional job** | Find someone serious. Handle the pressure without a fight or a lie. Know what I actually want before someone is in front of me. Get past the last one. | `finding` is the hook the product cannot serve; `family` and `ready` it can. |
| **Emotional job** | Feel less behind and less alone. Feel I am doing *something*. Feel calm when hooyo brings it up. Not feel desperate. | Welcome: "You are not behind, and being here is not an admission of anything." |
| **Social job** | To family: "I am taking it seriously, on my terms." To the community: not be seen looking. To herself: "I am choosing, not waiting." | Hesitations `seen`, `family` (`src/data/hesitation.ts`); Trust's "nothing that says 'I am looking' gets forwarded". |
| **Current alternatives** | The aunties and the family network. Mosque events. A friend's introduction. Muzz or Salams, quietly. Hinge, more quietly. Dua. Doing nothing and absorbing the pressure. | `docs/GAPS.md` "Competing alternatives": ASSUMED, no instrument. |
| **Anxiety** | Being seen here. Leaving a phone number. An empty room. "Does opening this mean something failed?" Sixteen questions before anything. Not being ready. | All six hesitations; `docs/GAPS.md` "Reasons people hesitate"; `docs/RISKS.md`: 43 taps to Home. |
| **Habit to displace** | Telling one auntie and waiting. Scrolling an app and closing it. Venting to one friend. | — |

**Reading.** The product's preparing offer (map → reflection → one step) does
not match the stage's situation. Nothing in her life triggers "assess my seven
grounds"; what triggers her is pressure, a friend's engagement or an ending.
The two jobs it *can* do here, "handle my family" and "know if I'm ready", are
answered better by the Guide's moment "My family is pushing" and the family
scripts than by the map, and both sit behind the map.

### TALKING TO SOMEONE — "someone has shown interest, or we have been talking for weeks"

| | Hypothesis | Where the product already says it |
|---|---|---|
| **Situation** | He has gone quiet. Three months in and the word marriage has not been said. Her family asked "who is he?" She is rereading a reply for the tenth time. He asked her to keep it quiet. A friend asked "is he serious?" and she could not answer. (His side: he needs to say his intention; he needs to speak to her wali and does not know the words.) | Moments: "He's gone quiet", "I'm overthinking", "Is he serious?"; men's: "Saying my intention", "Talking to her wali" (`src/data/moments.ts`). The read's dimensions: context, intent, public, family… |
| **Functional job** | Find out whether he is serious *before* investing more months. Know the one thing to ask or say next. Decide whether and how to tell family. Stop the spiral tonight. | The read ends in "the one question to ask next, word for word"; the family scripts; the Guide's Therapist voice. |
| **Emotional job** | Certainty, or at least a clear next step. Dignity. Calm. Not to feel foolish later. | Situation copy: "the question isn't whether you're ready. It's whether he is." |
| **Social job** | To him: not desperate, not an interrogator. To family: not hiding, not premature. To herself: "I am not being played." | The read is about what he has *done*, never what she feels; the script is words she can say without it sounding like a test. |
| **Current alternatives** | Screenshots to the group chat. One friend's verdict. An older sister. TikTok advice. Testing him indirectly. Dua. Waiting. | — |
| **Anxiety** | What if it says he is not serious. Being told what to do. Someone seeing it on her phone. Feeling like a checklist person. Him finding out she "ran him through something". | Read intro: "We will not tell you what kind of person they are. We have not met them." |
| **Habit to displace** | Screenshot-to-friend. Rereading. Waiting for him to bring it up. | — |

**Reading.** This is the product's sharpest job and its strongest fit: a
ninety-second instrument at a stable URL, reachable at the moment the
situation fires, ending in words. Every alternative is slower, more exposing
or less honest. The men's two moments are real jobs with real words behind
them (the family scripts now include his side) and no instrument of their own.

### DECIDING — "the families are about to be involved, or just were"

| | Hypothesis | Where the product already says it |
|---|---|---|
| **Situation** | He said "send your people" or she asked him to. A date is being discussed. A disagreement surfaced: where they would live, money home, his mother. Someone mentioned qabiil. The families met and it went sideways. She has a doubt she cannot name. | The eleven topics (`src/data/eleven.ts`); "When the families disagree"; ended reasons `my-family`, `his-family`, `eleven`, `non-negotiable`. |
| **Functional job** | Have the eleven conversations *before* the families lock the outcome. Find where the two of them actually differ. Open mahr and living without it becoming a negotiation between fathers. Get the families to meet properly. Decide yes, or no with a reason. | BeforeYes; the two-sided sheet; "Opening mahr, and where you'd live"; "Ending it kindly". |
| **Emotional job** | Certain enough to say yes. Not blindsided later. Permission to say no. Relief that it is structured and not an accusation. | Ended: "It ended. That is allowed, and it is progress." |
| **Social job** | To him: an equal, not "difficult". To family: obedient and yet "I asked the right questions". To herself: "I chose." (His: serious enough to answer eleven questions on his own phone.) | Couple: "neither of you sees the other's answers, only where you match." |
| **Current alternatives** | The imam's premarital session. A mosque nikah class. The aunties negotiating. A married friend. Waiting for it to come up. | `docs/ASSETS.md`: the guide pitched to nikah coordinators, the institution that already owns this moment. |
| **Anxiety** | Raising qabiil or a second wife looks like accusing him. He will think she is difficult. The sheet is a test and he will refuse it. Finding out too late becomes finding out now. | Guide page: "We take no position on any of them." |
| **Habit to displace** | Letting the families handle it. Avoiding the topics. Asking sideways. | — |

**Reading.** The second strongest job, and the one with an institutional
buyer: the nikah coordinator's own job is "give couples something to work
through", which the printed guide answers with no app. The two-sided sheet has
one unexamined job: *his*. Nothing yet tells a man, on the screen where her
link opens, why answering serves him.

### MARRIED — "the wedding is done"

| | Hypothesis | Where the product already says it |
|---|---|---|
| **Situation** | The first real argument. In-laws in the house. The aunt asks about the cousin who is still single. A friend is now where she was a year ago. | Ending: "the one at the wedding who is where you were"; the first-year conversations in `plus.ts` (not built). |
| **Functional job** | Pass on what worked without it sounding like advice. Handle the first year's conversations. | Ending's shares; the eleven share "I wish someone had handed me that list." |
| **Emotional job** | Gratitude. Relief. Wanting to help the next one. | Ending: "You can delete the app." |
| **Social job** | The one who did it right. A good example, not a preacher. Not an advertiser. | Ending: "forwarding anything about it meant admitting you were looking. That is over." |
| **Current alternatives** | Telling the story at weddings. Forwarding a reel. Being the auntie. | — |
| **Anxiety** | "We are married; why would I open this?" Sharing an app looks like an ad. Nothing here is for me now. | — |
| **Habit to displace** | The auntie network, by mouth. | — |

**Reading.** The person's job here is thin and the company's is large (the
flywheel, the learning record, the sponsor line). That is legitimate as long
as it is named: the ending is a *measurement and referral* surface, not a
value surface. It should cost her one screen, which it does, and it should be
reachable, which today it is not (`docs/AUDIT.md` §6).

---

## Every major feature, held to a job

Verdict scale: **Clear** — a stage's situation fires it and it ends the job.
**Thin** — a job exists but the situation rarely fires it, or the feature ends
short of the outcome. **Company** — the job is Niyyah's (measurement,
referral, supply), not the person's; legitimate if cheap and honest.
**No job** — no situation in any stage reaches for it today; challenged.

| Feature | Stage | The job it answers | Verdict | Challenge |
|---|---|---|---|---|
| **The read** (`Read.tsx`, `/tools/is-*-serious`) | Talking | Find out whether he is serious before investing more; the one thing to ask next | **Clear** | The strongest job in the product. Its only gap is the men's mirror: "is she serious?" exists, but his two real moments (intention, wali) route to the Guide, not to an instrument |
| **The eleven, interactive** (`BeforeYes.tsx`) | Deciding, late Talking | Surface the conversations before the families lock it | **Clear** | — |
| **The two-sided sheet** (`Couple.tsx`, `couple.ts`) | Deciding | Find where we differ without a confrontation | **Clear for her, unexamined for him** | His job at the moment her link opens is unstated. Why does answering serve *him*? Until the screen says so, the send is her hope, not his job |
| **The printed guide + sample** (`guidePages.ts`) | Deciding; the coordinator | Hers: the same. The coordinator's: "give couples something to work through" | **Clear** | The one feature with a second customer whose job is already understood and already pitched |
| **Family scripts** (`Families.tsx`) | Talking, Deciding | Tell hooyo; ask him to send his people; speak to her family; open mahr; end it kindly | **Clear** | Reached only after a read or from Home; the situation "hooyo is asking" fires on its own |
| **The Guide's four moments** (`moments.ts`) | Talking, Preparing | "He's gone quiet", "My family is pushing", "I'm overthinking", "Is he serious?" | **Clear — the best situation-to-job mapping in the product** | Hidden behind the map: the four chips render on Home, 43 taps from Welcome. The situations are the front door and are not at the front door |
| **The Guide, free text** (`Coach.tsx`, `guide.ts`) | All | Think it through with someone who will not judge or gossip | **Clear (emotional and social), unproven** | Its job is the *social* one: not telling a friend. The Matchmaker voice answers no job (nobody to introduce; it says so). The Therapist voice answers "I'm overthinking" well |
| **Report a concern** (`ReportConcern.tsx`, `safety.ts`) | Deciding | Be safe; be believed | **Clear, latent** | — |
| **Forget me** (`forget.ts`, `keep.ts`) | All | Leave no trace | **Clear** | Directly answers hesitations `seen` and `family`. Should be visible at the moment of hesitation, not three screens in |
| **Keep / restore by code** | All | Not lose my work; use another phone | **Thin** | A utility; rarely a job. Also the mechanism every company job rides on (counting, vouch, door) — which is why it is so heavily promoted on screen |
| **The map** (`intake.ts`, `reflection.ts`) | Preparing | Know what I want; know if I'm ready | **Thin** | The largest system answers the weakest situation. Nobody's life fires "assess my seven grounds"; pressure, an engagement or an ending fires "what do I do now". Its second job is the company's: the data every later system reads. Test in sessions: does anyone finish it unprompted, and can they say what it gave them? |
| **The work card / next step** (`nextStep.ts`, `WorkCard.tsx`) | Preparing | Do one thing this week | **Thin** | A habit-app job imported into a product that refuses habit loops. The situation never fires it; the product fires it |
| **Home** (`Home.tsx`) | All | "Something happened" and "since last time" | **Thin as built** | Seventeen buttons for two reasons to open (`docs/PRODUCT.md` §0). The two reasons are clear jobs; the screen answers them and fifteen other things |
| **Follow-up** (`followup.ts`, `FollowUp.tsx`) | All | Hers: be asked what happened by something that cared. Niyyah's: the North Star | **Company** | Honest and cheap. Keep as measurement; do not describe it as value |
| **The ladder, facts, readout** (`rungs.ts`, `progress.ts`) | — | Know what the product did in the world | **Company** | Legitimate |
| **Trust / the ledger** (`Trust.tsx`, `ledger.ts`) | All | Social: "be seen as serious." Also: know what leaves my phone | **Clear on privacy, No job on the ledger** | "This is what a serious person looks like here" has no one to look. The ledger's job arrives with a reader; until then it is a promise of a social job, not the job |
| **Vouch** (`Vouch.tsx`, `vouch.ts`) | Preparing, Deciding | Social: have my family behind me, visibly | **No job today** | Same: a social job with no audience. The family member's own job (why would a father tap this?) is also unstated |
| **Door / count me / cohort** (`Door.tsx`, `Cohort.tsx`) | Preparing | Find anyone serious at all | **No job the feature can do** | It addresses the biggest functional job in the category and does nothing for her; being counted is a promise substitute. Honest now (`docs/RISKS.md` R3), still not a job done |
| **Pool readout, sample introduction, alignment** | — | Niyyah's: see the shape of a pool. Hers: none | **Company / No job** | The sample answers no situation; it demonstrates a future. `docs/AUDIT.md` already lists it |
| **Plus** (`Plus.tsx`) | — | None today | **No job** | A page about a business model. The person's job it gestures at ("deciding together", a matchmaker) is real and belongs to Deciding — as a service, when a pool exists, not as a screen now |
| **Ending / ended** (`Ending.tsx`, `Ended.tsx`) | Married; a courtship that ended | Married: pass it on. Ended: make sense of it; Niyyah's: learn why | **Company, with one thin personal job each** | Fine at one screen. Ended's emotional job ("that is allowed") is real and small. Both unreachable from where they would fire (`docs/AUDIT.md` §6) |
| **Philosophy** (`Philosophy.tsx`) | First visit | Know what this is before I trust it | **Thin** | A real anxiety job, answered at 322 lines. The anxiety fires on the tool intro, not on a page two taps away |

**Count.** Clear: 9 (read, eleven, two-sided, printed guide, family scripts,
moments, guide free text, report, forget me). Thin: 5 (keep, map, work card,
Home, philosophy). Company: 4 (follow-up, ladder, pool/sample, ending).
No job today: 4 (ledger-as-social-proof, vouch, door, Plus).

---

## What the jobs say about the product's shape

1. **The situations are the front door, and they are not at the front door.**
   The four moments and the five hardest parts are the sharpest job
   statements in the repo. They render on Home, behind Welcome, Identity,
   Situation, Hook and sixteen questions. A person reaching for help reaches
   at the moment "he's gone quiet", and the product's first question is her
   name.
2. **Preparing is served by the wrong instrument.** Its real jobs are "handle
   my family", "know if I'm ready" and "find anyone". The first two are
   answered by a moment and a script; the third the product cannot do. The map
   is the product's answer and the stage's weakest job.
3. **Every social-proof feature is waiting for an audience.** Ledger, vouch,
   Trust's "what a serious person looks like", the door: each promises how
   she will be *seen*, and no one sees. They are not wrong; they are early,
   and while early they cost taps and trust.
4. **His jobs are stated in her words.** The two-sided sheet, the vouch
   request and the men's read all ask a second person to act, and none tells
   that person what the act does for *them*. The three men in the protocol's
   sample are the first chance to hear it.
5. **The company's jobs are honest and should stay labelled.** Follow-up,
   ladder, ending, pool: none pretends to be value, except where copy has
   drifted, and `docs/RISKS.md` R3 fixed the drift.

**What this does not do.** It adds nothing, moves nothing, and removes
nothing. The five sessions decide the Thin and No-job rows: the questions to
ask are already in `docs/PROTOCOL.md`: question 4 ("what have you used, or
tried… what happened, and why did it stop working") fills the *alternatives*
column that `docs/GAPS.md` says has no instrument; question 7 ("would you say
the words") and question 15 ("did you trust it") test the functional and the
social jobs; the three-day text is the outcome.

---

## Keeping this true

Each stage's table is a set of hypotheses; a session that confirms or refutes
a cell changes that cell, with the session's id from `docs/FEEDBACK.md`. A
feature's verdict changes only on evidence from a person, never on a build.
