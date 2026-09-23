# Niyyah, abused — the worst people on a marriage platform, walked through the product (2026-09-23)

## Context

The request: think like the worst people who could use a marriage platform.
Generate realistic abuse cases for fourteen kinds of harm:

- harassment
- impersonation
- stalking
- coercion
- catfishing
- married people posing as single
- blackmail
- screenshots
- ban evasion
- malicious family involvement
- false reports
- spam
- romance scams
- social engineering

Walk each one through the actual product. Decide what Niyyah can **prevent,
detect, respond to, or cannot reasonably solve yet**. Then strengthen the
safety architecture **without turning the product into surveillance**.

The method had three parts:

1. **Three read-only explorations.** They covered every surface where one
   person's action reaches another (the two-sided eleven, the vouch, the
   restore link, the shares, the read), the whole safety path, and the door
   and the pool.
2. **A walk of each case.** Each was walked through those surfaces, with the
   file and line that makes it real.
3. **Red tests for every hole found, then a fix.** Each test was written to
   fail against the code as it stood, and each guard was mutation-checked:
   revert the fix, watch the test fail, restore it.

`docs/THREAT.md` (STRIDE) and `docs/SECURITY.md` (OWASP) came first and are
not repeated here. This pass asks a different question: not "can the system
be broken?" but "what does a bad person do with it when it works as
designed?"

## What Niyyah is, to someone who means harm

Most of what makes a dating app dangerous is not here:

- no accounts
- no profiles to browse
- no photos
- no messaging
- no free text from one member to another
- no location
- no introductions yet (they will be made by hand, by the founder)

What remains is narrow, and every piece of it runs on one rule: **whoever
holds a code has the authority it grants** (`docs/HARD.md`, rows 16 and 20).

| What travels | Who holds it | What it grants |
|---|---|---|
| **Couple link** `?couple=` | Both people, and anyone either forwards it to | Answer once; read the joint; delete the sheet; file a report as either side |
| **Map code** (on screen, in `?map=`) | Her, and anyone who sees it | Read, overwrite or delete the whole map; vouch as her relative; replace her contact on the door |
| **Vouch link** `?vouch=` | Her relative, and anyone it is forwarded to | Vouch once, first vouch wins; read the voucher's first name |
| **Shares** | Whoever she sends them to | Fixed text only. Her own words travel only in "Keep this" and the married share, and she sends those herself |
| **A report** | Either holder of a couple code | A message to the founder only |

So the abuse surface is:

- codes that leak;
- links that are sent to the wrong person, or on purpose;
- the one channel for harm (the report);
- the founder, who holds the contacts;
- whatever happens off the platform, which Niyyah can only speak to.

## The cases

Each case names the person, walks the product, and ends with a verdict:
**P** (prevent), **D** (detect), **R** (respond), **C** (cannot yet).

### 1. Harassment

**The person.** He answered her eleven. She stopped replying, and he keeps
contacting her. She goes to report him.

**The walk.**
- Her report needs the couple sheet to exist (`netlify/functions/safety.ts`).
- He holds the same code, and `DELETE /couple` takes one request.
- So a man who expects a report can make every report she tries a 404, shown
  to her as "Didn't send — try again". Nothing tells her why.
- Her own Forget me takes the sheet too.
- The sweep takes every sheet at ninety days, which is about when a
  frightened person decides to say something.
- **Built:** a sheet that goes leaves `gone/<code>`, holding only the day its
  reporting window closes. A report can still be filed for ninety days
  (`netlify/shared/sheet.ts`).
- There is no harassment channel *inside* Niyyah. No message, no free text,
  and no share carries his words to her.

**Verdict.**
- **P:** no channel exists inside the app.
- **D:** the `harassment` reason.
- **R:** a report survives the sheet. The founder reads it within the week,
  and the help line is on the screen (case 4).
- **C:** contact off the platform. Niyyah never had his number and does not
  want it.

### 2. Impersonation

**The person.** An ex wants her phone to write under a code he holds. He keeps
a map of his own, puts *her* first name and city in it, and sends her
`?map=HIS-CODE`: "your map, restored".

**The walk.**
- The restore link asks before replacing anything (`docs/SECURITY.md` O2).
- But the name it shows comes from the snapshot, which he wrote, so it reads
  "for Hodan, in Minneapolis–St. Paul".
- **Built:** when the phone already keeps its own map, the screen names that
  map's code. That is the one fact the sender cannot write: "This phone
  already keeps its own map, under HJKM 47QR. Your own link would carry that
  code — this one is someone else's" (`src/components/ConfirmRestore.tsx`).
- On a new phone there is nothing to compare against, so the "Only bring it
  here if it is yours" line is what stands.

Other forms:
- **Answering a couple link that was meant for someone else.** The link is
  the authority. Whoever holds it answers once and reads only the joint.
- **Vouching as "her father".** Anyone with the vouch link, or with her map
  code, can do this. The founder's call before any introduction is the check
  (see "At the first introduction").
- **Posing as Niyyah.** See case 14.

**Verdict.**
- **P:** on a phone that holds a map, the restore check now uses a fact the
  sender cannot fake.
- **D:** the `impersonation` reason.
- **R:** the founder's call to the voucher.
- **C:** who is holding a link. That is the no-accounts trade, chosen on
  purpose.

### 3. Stalking

**The person.** Her ex saw her map code: over her shoulder, in a screenshot of
the Keep screen, or from her phone.

**The walk.**
- With the code he can `GET /keep` her whole map: her stage, her read on the
  new man, the eleven's states, her city.
- He can `POST /cohort` with her code and **replace her contact with his own
  number** (`netlify/functions/cohort.ts`). The first introduction mail would
  then reach him.
- He can pre-empt her family's vouch.
- Until now her only remedy was Forget me, which erased the map, the vouch
  and her place at the door (`docs/THREAT.md` T8).
- **Built: "Change my code"** (`PUT /keep`). It mints a new code and moves
  everything to it: the map, the vouch and its `asked/` and `token/`
  pointers, the door entry and its index, and the contact. Only then is the
  old code deleted, so the old code and every link carrying it open nothing.
  Her phone keeps its answers. The button is on the kept-map card: "Has
  someone else seen this code? Change it."
- The public door count (`GET /cohort?scene=`) is unfloored. Someone
  refreshing it could see a +1 on the day she joined. That is accepted: the
  count is the door's honesty, and a +1 names nobody without outside
  knowledge.

**Verdict.**
- **P:** "Niyyah will never ask you for this code" and "anyone with it can
  [reach it]" are now on the Keep card.
- **R:** changing the code.
- **C:** someone holding her unlocked phone. Every key is plaintext in
  `localStorage`, as in any web app with no lock. A lock is deferred (see
  "Not built").

### 4. Coercion

**The person.** Her husband-to-be, or a relative, stands over her: "Delete that
app. Now."

**The walk.**
- Forget me used to send every report receipt the phone held and withdraw
  each report (`src/lib/forget.ts`). A coerced wipe therefore erased the only
  record of a threat, and the man standing over her never had to know there
  was one.
- **Built:** Forget me leaves reports with the founder. A report is a message
  to a person: sent is sent. It stays until the founder reads it, and then
  only the kind of harm and what was done remain.
- The app no longer keeps receipts. A receipt on the phone was a way for
  whoever held the phone to take the report back.
- Trust says so in one sentence: "A concern you reported stays with the
  founder until she has read it."
- **Built: the help line.** There was no emergency number or helpline
  anywhere in the app. It sat on a screen whose second reason is "Threatened
  me, or someone I know", and under a read whose caution band said "not a
  question for an app" and gave no number.
  - `src/data/help.ts` lists, per country the door counts, the emergency
    number and one national, free, round-the-clock domestic-abuse line. Each
    was checked against the service's own site on 2026-09-23.
  - Somalia gets the generic line: its numbers differ by region and by
    source, and a number that may ring nowhere is worse than none.
  - `HelpLine` shows it on the report screen (both lines for `threats` and
    `sexual`), on the read's caution card, and under any guide answer to a
    threat, force or a request for money.
- **Built: urgent reports don't wait for Monday.** `.github/workflows/watch.yml`
  now runs daily. It fails, which emails the founder, whenever an open report
  says `threats` or `sexual`, and on Mondays for everything else.

**Verdict.**
- **P:** a coerced wipe no longer erases a report.
- **D:** an urgent report reaches the founder within the day.
- **R:** the help line, in her country's numbers.
- **C:** coercion inside a family. See case 10.

### 5. Catfishing

**The person.** A fake identity, a borrowed story, someone who is not who they
claim.

**The walk.**
- Niyyah has nothing to catfish with: no profiles, no photos, no bios, no
  browsing.
- The two-sided eleven goes to someone she already knows. The read is about
  him, and he never sees it.
- The only identity claim the product makes is the family vouch, and the
  vouch is a relative's word, not verification (`docs/REDTEAM.md`: "the vouch
  verifies the side that does not need verifying").
- The real exposure is off-platform: she met him on Instagram, and Niyyah is
  where she tries to judge him.
- The read already names the pattern that matters most: nobody in his life
  knows she exists, and he has asked her to keep it hidden
  (`src/lib/read.ts`, caution).

**Verdict.**
- **P:** nothing on the platform to fake.
- **D:** the read's hidden-life pattern.
- **R:** the founder's call before any introduction.
- **C:** identity. There is no ID check, by choice (see "Not built").

### 6. A married man, posing as single

**The person.** He is married or engaged. He answers her eleven, and she thinks
it is going somewhere.

**The walk.**
- The eleven's second-wife conversation asks what he *believes*, not whether
  he is married (`src/data/eleven.ts`).
- There is no marital-status field. The prior-marriage question (B8) is
  deferred, for reasons of its own about the divorced and remarrying
  (`docs/BETS.md`).
- The read catches the shape: hidden from everyone, nobody in his life
  knowing her.
- The `already-married` reason exists for after the fact.

**Verdict.**
- **D:** the read's caution; the `already-married` report reason.
- **R:** at the first introduction, both sides are asked in writing, "Are you
  married now, or engaged?" (see "At the first introduction"). A lie on the
  record is grounds for never-introduce and a call to the family.
- **C:** proof of marital status. No registry spans the diaspora, and a
  document check would be the identity system this product refuses.

### 7. Blackmail

**The person.** "Send me more, or I send your family the pictures, or tell
them you're on a marriage app."

**The walk.**
- Nothing on Niyyah proves she used it except her own phone.
- There is no public presence, and nothing is sent to her family unless she
  sends it.
- The threat itself happens off-platform.
- What Niyyah can do is answer well when she brings it here:
  - The guide's prompt now treats "someone holding intimate pictures or
    messages over them" as a safety matter first: take it seriously, tell one
    trusted person today, get real-world help (`netlify/shared/prompt.ts`).
  - The offline voice, which answers when the live guide declines (and a
    message like this is the kind that gets declined), gives the same answer
    in every voice: do not pay, do not send more, keep what they sent, tell
    someone (`SAFETY_REPLY` in `src/lib/coach.ts`).
  - The help line sits beneath it.

**Verdict.**
- **P:** nothing inside the app to hold over her.
- **R:** the guide's answer and the help line.
- **C:** anything that happens outside the app.

### 8. Screenshots

**The person.** He screenshots what Niyyah showed him and passes it round the
community.

**The walk.** What he can capture:
- **The joint.** "One of you thinks you've talked about a second wife; the
  other doesn't." No names and no beliefs; the eleven never asks either side
  what they believe, only whether it has been discussed.
- **The couple link page.** The same joint.
- **His own read.** About her, answered by him.

What the product exposes:
- The joint can be inverted. Answer "we agree" on every topic and it tells
  you the other person's state on each one. That state is about a
  conversation they were both in, which is exactly what the tool exists to
  surface between them. It is accepted, and it is not a belief or a name.
- Her own screens hold far more, but reaching them needs her phone (case 3).
- "Keep this" copies her name, map headlines and vouch to *her* clipboard.

**Verdict.**
- **P:** nothing screenshot-able names anyone or states a belief.
- **C:** a screenshot of her own phone, taken by someone holding it.

### 9. Ban evasion

**The person.** Reported and marked never-introduce, he comes back.

**The walk.**
- There are no accounts, so there is nothing to ban. That is the design
  (`docs/HARD.md` row 8: "There is no blocking of any kind in this
  repository"). The founder's `never-introduce` outcome is a note, not a mark
  on a person, and Trust says so.
- Where would evasion matter? The eleven is not a discovery surface: she
  sends it to a man she already knows. So a reported man coming back gains
  nothing there.
- Evasion only matters at introductions, which do not exist yet.

**Verdict.**
- **P:** no discovery surface to come back to.
- **R:** at the first introduction, a never-introduce record keyed in a way
  that names nobody (see below).
- **C:** a determined man with a new phone number and an accomplice to vouch.
  Only the family call, and the community's own memory, catch him.

### 10. Malicious family

**The person.** A family pressing her to marry someone. A relative who vouches
falsely. A brother reading her phone.

**The walk.**
- The vouch needs a relative's cooperation, so a family can vouch for a man
  who is married, or vouch for her against her will. The founder's call
  reaches the family, which may itself be the problem.
- On her phone, every answer is plaintext: qabiil, second wife, money sent
  home. Anyone holding it can read them.
- The product already knows this. "Someone might see you here" is one of the
  reasons she can give for hesitating at the door (`seen`).
- **Built:** the guide now names force or pressure to marry as a safety
  matter. It does not argue fiqh, points to real-world help, and the
  help-line numbers sit beneath its answer.

**Verdict.**
- **R:** the guide and the help line.
- **C:** family pressure itself, and a family member holding her phone. A
  quick exit is deferred until the `seen` reason says members need one (see
  "Not built").

### 11. False reports

**The person.** An ex reports a man out of spite, or a man files a
counter-report against the woman who reported him. Both hold the couple code.

**The walk.**
- `side` on a report is unverified, and either holder can file as either side
  (`docs/THREAT.md` T13, by design).
- A false report looks exactly like a true one. There is no per-actor record,
  on purpose (T15).
- **Built:** reports from the answered-already screen were filed as `man`
  whoever filed them, because the screen never learned which side answered.
  The joint now carries `answerFor` (`netlify/functions/couple.ts`), so a
  woman who answered a man's eleven no longer reports herself.
- Damage today is small. The only outcomes are notes, and there are no
  introductions to withhold.

**Verdict.**
- **D:** the founder sees both reports side by side.
- **R:** a runbook rule. Before `never-introduce`, hear the other side where
  there is a way to. One report with no way to reach anyone is `not-enough`.
- **C:** knowing who is telling the truth.

### 12. Spam

**The person.** A script.

**The walk.**
- The waitlist form had no honeypot (`docs/THREAT.md` T5), and a bot could
  fill the free tier's submission quota silently.
- The door's only bound was a site-wide 200 joins an hour. That is enough to
  show one city a false 40/40 before anyone looked, against the door's own
  promise that "we never pretend a city is full" (T7).
- Report flooding was closed in the STRIDE pass (T2).
- **Built:** `data-netlify-honeypot="bot-field"` on `public/__forms.html`.
  The app never sends the field.
- **Built:** a per-city hourly join cap, `door-city-<scene>`, default 30,
  set with `DOOR_CITY_HOURLY_CAP`. Its counter names a city (the door's
  public count already does) and never a person.

**Verdict.**
- **P:** the honeypot, the per-city cap, and the kept-map requirement on
  every join.
- **C:** a patient script that stays under every cap. The founder reads the
  pool before any introduction, and that is where it would show.

### 13. Romance scams

**The person.** The most attentive person she has ever met. Then a bill, a
ticket, a sick mother back home, an investment. It happens to men too, from
fake women.

**The walk.**
- The read had eleven questions, and none could see money. Neither could the
  guide's offline voice.
- In a diaspora where sending money home is normal and right, "help my
  family" is the easiest request to make.
- **Built:** the read's twelfth question: "Has {he} asked you for money — a
  loan, a bill, a ticket, an investment? Before your families have met."
  - It is weighted as nothing, because a scammer can look like the most
    serious man she has met.
  - "Yes" gets its own caution, whatever else he has shown: "that is the
    shape romance scams take… Send nothing more until your families have met…
    If he is serious, the families meeting first costs him nothing."
  - It works for both sides, and the help line sits under it.
  - A read kept before the question existed is still whole
    (`ADDED_LATER` in `src/lib/read.ts`).
- **Built:** the guide's prompt names the pattern, and the offline safety
  reply catches "asked me for money", "loan", "invest", "crypto", "gift card"
  and "western union".

**Verdict.**
- **D:** the read's money question and the guide.
- **R:** the caution and the help line.
- **C:** money already sent.

### 14. Social engineering

**The person.**
- **Posing as family:** "I'm her brother. She's missing. What's her number?"
- **Posing as Niyyah:** "Niyyah support here. Send your code so we can
  restore your map."

**The walk.**
- The founder holds the contacts, the vouch phone numbers and every map. The
  founder is the most valuable target in the product.
- A member has never been told that Niyyah will not ask for her code.
- **Built:** the Keep card now says it: "Niyyah will never ask you for it."
- **Runbook (`docs/OPERATING.md`):**
  - The founder never confirms to anyone whether a person uses Niyyah.
  - The founder never sends a code, a contact or a map to anyone, except to
    the member herself, at her own request, from her own address.

**Verdict.**
- **P:** the line on the Keep card and the runbook rule.
- **C:** a convincing caller who reaches her, not the founder.

### Found on the way: one link that wiped a phone

`?fresh` and `?demo` are the founder's presentation switches. They ran on any
phone, from any link.

- `joinniyyah.com/?fresh`, sent by anyone, cleared everything she had written.
- It left the kept code behind, so her next save wrote the emptied map over
  her kept one. The parameter stayed in the address bar, so every reload did
  it again.
- `docs/BOARD.md` had called these "params, which no posted link can carry".
- This was reproduced on `main` in Chromium: the map was gone, the code
  remained, and `?fresh` was still in the bar.
- **Built:** on the live site they act only on a phone that holds nothing,
  and they always leave the address bar (`src/lib/demo.ts`). On `localhost`
  they run as `docs/DEMO.md` describes.

**Revised 2026-09-24 by the Guide's evaluation (`docs/GUIDE-EVAL.md`).** Its
first run found that none of the fourteen cases above had covered **self-harm**:
"I want to die" got the relationship framework, and there was no crisis line
anywhere. Crisis lines per country, a crisis reply that comes before anything
else, and a prompt rule now meet it. The same run found the offline voice
giving ordinary advice to requests to guilt, deceive, track or hide — the
manipulation half of cases 3, 6 and 14 — and it now declines them.

## The verdicts together

| Case | Prevent | Detect | Respond | Cannot yet |
|---|---|---|---|---|
| Harassment | No channel between members | `harassment` reason | Report outlives the sheet; help line | Off-platform contact |
| Impersonation | Restore check by the phone's own code | `impersonation` reason | Founder's call to the voucher | Who holds a link |
| Stalking | "Never ask for your code"; the Keep card says what the code grants | — | **Change my code** | Someone holding her unlocked phone |
| Coercion | Forget me leaves reports standing | Urgent reasons alert the same day | Help lines; guide rules | Coercion inside the family |
| Catfishing | Nothing to fake | Read's hidden-life caution | Founder's call before introductions | Identity, by choice |
| Married, posing single | — | Read's caution; `already-married` | Written "married now, or engaged?" at introduction | Proof of status |
| Blackmail | Nothing on the platform to hold | — | Guide's answer; help line | Anything off-platform |
| Screenshots | No names or beliefs to capture | — | — | Her own phone in his hand |
| Ban evasion | No discovery surface | — | Never-introduce record at introductions | New phone plus accomplice |
| Malicious family | — | — | Guide; help line | The pressure itself |
| False reports | Report cap needs live codes | Founder sees both | Hear both sides first | The truth |
| Spam | Honeypot; per-city cap; kept map required | — | — | A patient script |
| Romance scams | — | Read's money question; guide | Caution; help line | Money already sent |
| Social engineering | Keep-card line; founder rule | — | — | A convincing caller |
| **Sabotage link** | Inert on a phone with a map | — | — | — |

## What was built

| # | What | Where | Tests |
|---|---|---|---|
| B1 | `?fresh`/`?demo` inert on a phone with anything on it, and stripped | `src/lib/demo.ts` | `src/lib/demo.test.ts` |
| B2 | A report outlives the sheet by ninety days | `netlify/shared/sheet.ts`, `couple.ts`, `keep.ts`, `sweep.ts`, `safety.ts` | `tests/abuse.test.ts` |
| B3 | A report is filed as the side that answered | `couple.ts` `view()`, `src/lib/couple.ts`, `Couple.tsx` | `tests/abuse.test.ts` |
| B4 | The help line, per country, checked | `src/data/help.ts`, `HelpLine.tsx`, `ReportConcern.tsx`, `Read.tsx`, `Coach.tsx` | `tests/help.test.ts` |
| B5 | The guide knows the patterns, and never states a number | `netlify/shared/prompt.ts`, `src/lib/coach.ts` | `tests/help.test.ts` |
| B6 | Urgent reports alert the same day | `.github/workflows/watch.yml` | `tests/abuse.test.ts` |
| B7 | Change my code | `PUT` in `netlify/functions/keep.ts`, `rotateCode` in `src/lib/keep.ts`, `KeepMap.tsx` | `tests/abuse.test.ts`, `src/lib/keep.test.ts` |
| B8 | Forget me leaves reports; no receipts kept | `src/lib/forget.ts`, `src/lib/safety.ts`, `Trust.tsx` | `src/lib/forget.test.ts` |
| B9 | The restore check names the phone's own code | `ConfirmRestore.tsx`, `src/main.tsx` | `tests/restore-link.test.ts` |
| B10 | The read's money question | `src/data/read.ts`, `src/lib/read.ts` | `src/lib/read.test.ts`, `tests/mens-read.test.ts` |
| B11 | Honeypot; per-city join cap | `public/__forms.html`, `netlify/functions/cohort.ts` | `tests/abuse.test.ts` |

Copy that counted the read's questions ("Eleven questions") now says
"Twelve", in `Welcome.tsx`, `Read.tsx`, `src/data/lexicon.ts` and
`src/data/tools.ts`.

## Not built, on purpose

Each item below would make one of these cases easier to catch, and each would
make Niyyah a place where people are watched. The product refuses them, and
the refusal is part of the safety architecture: a woman whose family must not
know she is here is safer on a platform that holds nothing about her.

- **Identity or ID verification.** It would catch catfish and prove marital
  status. It needs an identity system, which is the thing `docs/HARD.md` row
  16 and the no-accounts design refuse; a document store in a tight community
  is itself a target.
- **Reading or scanning anything she writes.** The safety words in
  `src/lib/coach.ts` are matched on her own phone, only to put a help line on
  the screen. Nothing is sent, kept or counted because of them.
- **Photos.** Declined permanently (`docs/BETS.md` B19). There is nothing to
  catfish with and nothing to screenshot.
- **Location, device fingerprints, IP logs.** They would catch ban evasion
  and false reporters. They would also make every member trackable, and the
  caps are deliberately identity-free (`netlify/shared/limit.ts`).
- **A per-actor record of reports.** It would tell true reports from false
  ones by history. A person decides instead (`docs/THREAT.md` T15).
- **A contact graph.** It would catch the man vouched for by his own
  accomplice. `docs/LEARNING.md` refuses it.
- **A lock or PIN on the app.** It would protect her from someone holding her
  phone, at the cost of friction for everyone, and it is only as strong as a
  PIN he can demand. *Trigger: the first member who asks.*
- **A quick-exit control.** Domestic-abuse sites have one. *Trigger: the
  `seen` hesitation ("someone might see you here") chosen by five or more
  people in the ladder.*

## At the first introduction

Written now, built in the same commit that opens the first pool (the
same-commit rule, `docs/HARD.md` rows 13 and 20). None of this exists yet;
the by-hand page (`docs/LIQUIDITY.md`) carries the steps.

1. **The voucher is called before any introduction.** Nobody is introduced on
   a vouch nobody has confirmed. A voucher phone that appears on more than one
   map is a flag (`docs/SCALE.md`).
2. **Both mails ask, in writing: "Are you married now, or engaged?"** This is
   not the deferred prior-marriage question (B8), which is about the divorced
   and remarrying. It is a safety question, and an answer on the record is
   what makes a lie actionable.
3. **The never-introduce record holds no name.** It is keyed by
   `HMAC(FOUNDER_KEY-derived secret, normalised contact)`, plus the same for
   the voucher's phone. It is checked before every introduction, and it is
   written only when the founder resolves a report as `never-introduce` about
   someone whose contact is known. It stops the easy return; case 9 names the
   one it cannot stop.
4. **Before `never-introduce`, hear the other side** wherever there is a way
   to.

## The founder's rules

These are in `docs/OPERATING.md`:

- Never confirm to anyone whether a person uses Niyyah. Not to a brother, a
  mother, a husband, or anyone else who calls.
- Never send a code, a contact or a map to anyone, except to the member
  herself, at her request, from the address she gave.
- An urgent report (`threats`, `sexual`) is read the day the alert fires.
- Re-check `src/data/help.ts` every year, against each service's own site.
- A member who asks for a report to be withdrawn is answered by hand. Resolve
  it as `no-action`, after reading it.

## Verification

- `npm run verify` and `npm run build` pass. The suite went from 926 tests to
  962 across this pass.
- **Mutation-checked** (revert the guard, watch the test fail, restore it):

  | Guard reverted | Tests that fail |
  |---|---|
  | `reportable` without the tombstone | 3 |
  | Couple DELETE without `retire` | 2 |
  | `retire` writing for codes that never held a sheet | 1 |
  | The joint without `answerFor` | 1 |
  | Demo params without the empty-phone check | 2 |
  | The safety intent removed from `askCoach` | 1 |
  | Rotation not deleting the old map | 2 |
  | Rotation not moving the token | 1 |
  | Rotation not moving the contact | 1 |
  | The money caution | 3 |
  | The per-city cap | 1 |

- **Chromium, on the built artifact, served from a non-local address:**
  - `?fresh` on `main` wiped a phone holding a map (the code survived, the
    parameter stayed in the bar). On this branch the map survives and the
    bar is clean.
  - The read runs to twelve questions, and money "Yes" gives the scam caution
    with the help line.
  - A `?map=` link dressed in her name on a phone with its own map shows
    "already keeps its own map, under HJKM 47QR… this one is someone else's".
  - The guide, offline, answers "he asked me for money… pictures of me" with
    the safety reply and London's 999 and 0808 2000 247 beneath it.
- **Not walked live.** The functions behind the report tombstone, the code
  change and the city cap need Netlify's runtime; their behaviour is pinned
  by `tests/abuse.test.ts` against the in-memory store every function test
  uses. The daily alert runs on the next 09:00 UTC.
