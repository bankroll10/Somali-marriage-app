# The four product risks — value, usability, feasibility, viability, 2026-09-17

## Context

`docs/AUDIT.md` (PR #36) established what is built. This pass asks a different
question of the same inventory: for each major system, will people choose it and
get real value (VALUE); can an ordinary person use it with nobody explaining
(USABILITY); can the technology reliably deliver what the screen promises
(FEASIBILITY); and can one founder operate it given cost, safety, legal, support,
privacy and business constraints (VIABILITY). Then: the five biggest risks that
green tests and a working deploy are hiding, and the smallest intervention for
each. The interventions that were code-sized were built in the same pass; the
table at the end says which, and what remains the founder's. The frame is Marty
Cagan's four risks; the classification rule is stated before the matrix.

**Rule applied throughout: "already built" is not evidence of value.** Evidence
of value is a person, not the founder, choosing the thing and doing something
with the result. By that rule the product has none yet: zero non-founder users
in any log (`docs/FEEDBACK.md` holds one entry, the founder's own walk;
`docs/OPERATING.md:322` and `docs/EXPERIMENTS.md:301` are empty), and the
research protocol written to produce that evidence (`docs/PROTOCOL.md`) has run
zero sessions.

## What was measured for this pass (new evidence, all FACT)

Chromium at 400 px against the current build, functions stubbed:

| Path | Taps to result | Screens | Words on first screen | Words on result | Calls to action on result |
|---|---|---|---|---|---|
| `/tools/is-he-serious` | 13 | 13 | 139 | 593 | 8 |
| `/tools/is-she-serious` | 13 | 13 | 139 | 591 | 8 |
| `/tools/before-you-say-yes` | 13 | 4 | 28 | 431 | (send / ask) |
| `/` → map → Home | 43 | ~25 | 249 | Home 294 | 17 buttons on Home |

Reading level (Flesch-Kincaid over the instruments' copy): read 5.5, eleven 5.5,
family scripts 4.2, guide's offline voice 4.8, intake 7.3. All accessible.

Operations: `.github/workflows/watch.yml` has run twice, both green (dispatch
2026-09-12, schedule Monday 2026-09-14), so `FOUNDER_KEY` is set as a repo
secret and the weekly safety read works. The Anthropic console spend limit is
recorded as blank (`docs/CONTROL.md:200`). No privacy notice, terms, or
controller identity exists anywhere in `src/`, `public/`, `index.html` or the
generated pages (grep: zero hits for "privacy policy", "terms", "GDPR", "data
protection"); Trust is the de facto notice and is not linked from either public
tool. `CONTACT_EMAIL` appears on one screen (Cohort) and Trust tells a person to
"ask" for deletion without saying where. Nine of the eighteen scenes are UK/EU
cities.

## The scale

Per cell: **✔** risk addressed with evidence · **~** addressed by design or
hypothesis only, no user evidence · **✘** unaddressed or contradicted by
evidence · **—** not applicable. Classification:

- **STRONG** — every applicable risk ✔.
- **UNPROVEN** — feasibility and viability ✔, value and usability ~ (nobody
  outside the founder has used it; nothing is known to be wrong).
- **AT RISK** — at least one ✘ in a system that is live or in the path to value.
- **UNNECESSARY** — no value can accrue until something that does not exist
  exists; the system costs attention, code or risk now.

---

## The matrix

| # | System (files) | VALUE | USABILITY | FEASIBILITY | VIABILITY | Class |
|---|---|---|---|---|---|---|
| 1 | **The read** — `Read.tsx`, `lib/read.ts`, `data/read.ts`, `/tools/is-*-serious` | **~** Strong prior (the wedge, the first thing pitched), zero users. | **~** 13 taps, grade 5.5, 139-word intro. **✘ on exit:** result is 593 words with 8 calls to action; nobody but the founder has reached it. | **✔** Pure, offline, both sides tested (`mens-read.test`), static pages walked. | **✔** No cost, no PII. Caveat: band and thin topics go to `progress` by default while the intro says answers "stay on this phone". | **UNPROVEN** (usability of the result AT RISK) |
| 2 | **The eleven, interactive + two-sided** — `BeforeYes.tsx`, `Couple.tsx`, `couple.ts` | **~** The protocol's own words: "the 'Ask them' moment is the product's largest unkept promise" until one person sends it. Zero sends. | **~** 13 taps, 431-word result. The two-sided half asks a man to open a link and answer 11 on his phone; never observed. | **✔** Joint sheet, 90-day expiry, code is authority, neither sheet read back. | **✔** No cost. Report path exists from this screen. | **UNPROVEN** |
| 3 | **The printed guide + one-page sample** — `guidePages.ts`, `/guides/before-you-say-yes` | **~** In one pitch's attachment today; no reply yet. The most borrowable asset: works with no app. | **✔ (by construction)** One page, grade 5.5, marking boxes, no interaction to fail. Least usability risk in the product. | **✔** Build-time HTML, `guides.test` pins its own promises. | **✔** Records nothing. | **UNPROVEN** (closest to STRONG; cheapest to test) |
| 4 | **The map → reflection → Home** — `intake.ts`, `reflection.ts`, `Home.tsx`, `nextStep.ts` | **✘/~** 16 questions about herself before any value; nobody asked for a reading; the protocol forbids touching it until ten sessions are done, and none are. | **✘** 43 taps and ~25 screens from Welcome to Home; Welcome is 249 words; Home is 294 words with **17 buttons**; `generating` has no exit. | **✔** Pure, offline, `durable.test` proves it builds with `fetch` broken. | **~** Welcome's "no one else ever sees it" is false by default (`facts.grounds` sent when `countMe` is on). | **AT RISK** |
| 5 | **The Guide** — `Coach.tsx`, `lib/coach.ts`, `guide.ts`, `prompt.ts` | **~** A3's own rule: if nobody opens it unprompted in ten sessions, record that. Docs place it as both "weakest large thing" and "retention engine". | **~** Free text with rule-based routing; unobserved. Offline fallback means it never looks broken. | **~** Depends on a supplier; caps and fallback are sound; disclosure is the best-tested copy in the repo. | **✘** The only cost. The limiter failed open here until 2026-09-17; it **fails closed** now (`overCapOrUnknown`, R5 below), and spend over `OPS_COST_ALERT_USD` pages the founder (`docs/OPS.md`). The console limit is still recorded as unset. Free text leaves the device by default. | **AT RISK** |
| 6 | **Follow-ups + ladder + readout** — `followup.ts`, `rungs.ts`, `facts.ts`, `progress.ts` | **—/~** Value to the founder: the North Star numerator. No input yet. | **~** Renders only on Home; a read-first user reaches it via `inferStage`; earliest three days later. | **✔** Floored, versioned, capped, tested. | **~** Trust's inventory lags the payload (`country`, seventh path); five vocabularies. | **UNPROVEN** |
| 7 | **Family scripts** — `Families.tsx`, `data/families.ts` | **~** Words to say to a parent; a felt moment; unobserved. | **✔** Grade 4.2, short, one tap from the read's result. | **✔** | **✔** | **UNPROVEN** |
| 8 | **Vouch** — `Vouch.tsx`, `vouch.ts` | **✘** A ledger fact with no reader until a pool exists. | **~** Asks a family member to open a link and vouch. | **✔** Token, no map code in the link. | **~** Holds a first name and a relationship; asked bit tallied. | **UNNECESSARY** (now) |
| 9 | **Door, short map, count-me, cohort, contacts** — `Door.tsx`, `ShortMap.tsx`, `Cohort.tsx`, `cohort.ts` | **✘** The value *is* the promise ("the day someone fits your map, we write to you"), and the promise has no mechanism. | **~** Reachable only by `?door`; 3 answers + age + a contact; never observed. | **✘** No matching over kept maps, no outbound channel, no TTL on contacts, sweep by hand. | **✘** The only PII in the product, held on an unkeepable promise, expiring only if the founder remembers `?sweep=1`. | **AT RISK** (UNNECESSARY until a city) |
| 10 | **Pool readout + sample introduction + alignment** — `pool.ts`, `SampleIntroduction.tsx`, `matching.ts`, `candidates.ts` | **✘** A founder-only number about a market with no mechanism; a demo over invented people. | **—** | **~** ATOMIC T7's four defects still open. | **~** The sample promises photos and a conversation the docs forbid. | **UNNECESSARY** |
| 11 | **Plus** — `Plus.tsx`, `data/plus.ts` | **✘** Nothing to buy; A5 (willingness to pay) unrun; BACKWARD's own margin row "fails as written". | **—** | **—** | **✘** Two contradictory free-year promises on one screen; no price by design. | **UNNECESSARY** (as a screen; pricing is a discovery question) |
| 12 | **Ending / ended** — `Ending.tsx`, `Ended.tsx`, `ending.ts` | **~** The auntie-share theory; nobody has married through the product. | **✘** Unreachable from Situation "married" (`openGuide` overwrites the screen). | **✔** | **✔** | **UNNECESSARY** (now) |
| 13 | **Keep / restore / Forget me + Trust** — `keep.ts` (both), `forget.ts`, `Trust.tsx` | **✔/~** Privacy is the pitch; Trust is the most honest copy in the product; whether anyone chooses *because* of it is unmeasured. | **~** A six-character code; Trust is 355 lines of prose and is **not reachable from either public tool**. | **✘** The Forget-me cascade deletes the *other side's* safety report (`keep.ts:130-133`). | **✘** The defect; copy drift on Welcome/Read/BeforeYes; no controller identity or contact for the "ask" Trust tells people to make; UK/EU cities in scope with no notice. | **AT RISK** |
| 14 | **Safety report** — `safety.ts`, `ReportConcern.tsx` | **✔** Necessary the day two people are on a sheet. | **~** Reachable from the eleven and the couple sheet only. | **✔** Append-only, own key per report, weekly read has run green. | **✘** Erasable by the reported party via #13; the queue is one founder's Monday. | **AT RISK** |
| 15 | **Entry, links, shares, static pages, sitemap** — `entry.ts`, `links.ts`, `toolPages.ts`, `vite.config.ts` | **—** Enabler. The search fix showed it working. | **✔** URLs open, reload, tolerate a slash; walked. | **✔** Pinned by `entry`, `links`, `tools`, `guides`, `deploy-layout` tests. | **✔** No third-party origin; `via` carries no sender. | **STRONG** |
| 16 | **Guardrails, export, CI** — `limit.ts`, `founder.ts`, `record.ts`, `export.ts`, `watch.yml` | **—** | **—** | **✔** Caps, fail-closed readouts, versioned records, monthly backup gated on a var; weekly job green. | **✔** Minor: `export.ts` returns expired records. | **STRONG** |

**Reading the matrix.** Two STRONG rows, both plumbing. Zero STRONG product
rows, because zero value evidence exists for anything. Five AT RISK rows, four
of them in the path a real person would walk this week (read result → Home →
Trust → Forget me), one the only thing that costs money. Four UNNECESSARY rows
holding about 4,000 lines and the product's only PII.

---

## The five biggest risks hiding behind working code

Each has green tests, a clean deploy, and no user. Ordered by how much of the
product depends on it.

### R1 · VALUE — the product has never been chosen by anyone
- **Hiding behind:** 619 passing tests, five live URLs, four pitches sent
  today. `docs/PROTOCOL.md` wrote the decision rules on 2026-09-12 and has run
  zero sessions; the two evidence logs are empty by construction.
- **Smallest intervention (no code):** five moderated sessions this week, not
  ten, recruited from the four rooms already pitched, using PROTOCOL's script
  as written: hand over the phone at `/tools/is-he-serious` or
  `/tools/is-she-serious`, say nothing, watch, ask the after-questions, count
  on Thursday who reports a conversation. Decision rule, scaled from
  PROTOCOL's: **two or more of five** report a specific conversation → the
  read and the eleven lead every post and the door waits; **zero** → nothing
  new is built until the founder understands why the words were not said.
  Entries go in `docs/FEEDBACK.md`; nothing else in the repo changes.

### R2 · USABILITY — the result is a wall and Home is a menu
- **Hiding behind:** the read renders, the walk passes, the copy is grade 5.5.
  Then the one screen that carries the value has **593 words and eight calls
  to action** (Copy the words · Send these words · Talk it through with your
  guide · Before you say yes · The words for your family · Now the other half ·
  Send this to a friend · Take the read again). Home has **17 buttons**. Nobody
  has watched a stranger reach either.
- **Smallest intervention (code, `src/components/Read.tsx`):** the result
  keeps the band, the one question to ask, and **two** actions above the fold:
  *Send these words* (primary) and *Before you say yes* (secondary). The other
  five move under one `<details>` disclosure, "More you can do here", in the
  same order. No logic changes; the walk asserts ≤ 3 buttons before the
  disclosure. The five sessions in R1 then answer "what would you do now?" on
  a screen that can be read in one look. Home is not touched in this pass: the
  protocol forbids changing the map before ten sessions, and Home is the
  map's.

### R3 · FEASIBILITY — the product promises an outcome it has no mechanism for, and holds PII on that promise
- **Hiding behind:** the door, cohort and Trust screens work, the count is
  real, the copy is warm. "The day someone in {pool} fits your map, we write to
  {contact}" (`Cohort.tsx:166-171`, `:284-286`, `Door.tsx:188`, `Trust.tsx:144`)
  has no matching over kept maps and no outbound channel; `docs/TIME.md:37`
  calls it "the first thing that stops in her absence". "When your city opens,
  this decides who you meet" is on seven screens with nothing deciding.
  `SampleIntroduction.tsx:186` promises photos and a guided conversation, both
  forbidden by the docs. Contacts, the only PII, have no TTL and lapse only
  when the founder runs `?sweep=1`.
- **Smallest intervention (code):**
  1. Replace the promise sentences with the present-tense truth the product
     already uses elsewhere (`Trust.tsx:310-317`, `coach.ts:377`): what is
     counted, that nobody is introduced yet, that the screen will say so when
     that changes. Sites: `Cohort.tsx` (166-171, 284-286, 399-400),
     `Door.tsx:188`, `Trust.tsx` (55-56, 144-145), `Profile.tsx` (54, 108, 166),
     `SampleIntroduction.tsx` (90-94, 184-189), `Reflection.tsx:442`,
     `src/data/plus.ts:70`, `Plus.tsx:110-115` (use the bounded free-year
     sentence from `plus.ts:91`), `Ending.tsx:169-176` (gate the sentence on
     `did.eleven` as the share already is).
  2. A test, `tests/promises.test.ts`, that greps every file under
     `src/components` and `src/data` and fails on: `photos are shown`,
     `conversation opens`, `we write to`, `you will hear from us`,
     `when your city opens`, `before the public launch`, `and blocking`,
     `report-and-block`. The same mechanism `tests/brand.test.ts` uses for
     "powered by AI".
  3. **A scheduled sweep**, `netlify/functions/sweep.ts`, `export const config
     = { schedule: '@weekly' }`: for every cohort entry whose kept map is gone
     or past `expiresAt`, delete the entry, its index and its contact; delete
     kept maps past `expiresAt`. Idempotent, needs no key (its effect is what
     the founder's `?sweep=1` already does), reuses the liveness check in
     `pool.ts`. Added to `tests/deploy-layout.test.ts`'s allowlist with its own
     function test. "Lives exactly as long as your kept map" becomes true
     without a person remembering.

### R4 · VIABILITY (safety, privacy, legal) — Forget me can erase the other side's safety report, and the public tools have no notice
- **Hiding behind:** the cascade is thorough, tested, and documented as a
  privacy virtue. `netlify/functions/keep.ts:130-133` deletes every report whose
  key starts with the couple code; report keys are
  `${code}-${side}-${id}` (`safety.ts:77-78`), so the reporter's side is in the
  key. `couple.ts:198-201` states the rule and enforces it only on its own
  route. Separately: nine of eighteen scenes are UK/EU cities, there is no
  privacy notice, Trust is unreachable from the two public tools, and Trust
  tells people to "ask" for deletion with no address.
- **Smallest intervention (code):**
  1. `keep.ts`: read `snapshot.identity.gender`; list and delete only
     `${coupleCode}-${ownSide}-`. If the side is unknown, delete nothing in
     `reports`. Test in `tests/keep-function.test.ts`: a man's Forget me leaves
     her report; a woman's deletes hers and not his.
  2. One link from each public tool's intro to Trust ("What leaves your phone,
     and what never does") — `Read.tsx`, `BeforeYes.tsx`, wired through
     `App.tsx` to the existing `trust` screen; Trust's Back returns to the
     tool.
  3. One sentence on Trust naming who runs this and where to write
     (`CONTACT_EMAIL` from `src/lib/site.ts`, the setting the founder must
     point at a read address in any case), placed where Trust says "ask, and it
     is deleted by hand" (`Trust.tsx:154`). Not a policy page: a sentence that
     makes the existing screen a notice with a controller and a contact.

### R5 · VIABILITY (cost, supplier) — the only route that spends money fails open
- **Hiding behind:** the limiter is deliberate about failing open
  (`limit.ts:30`, "says so"), correct for storage writes that cost nothing.
  `guide.ts:210-218` uses the same limiter for the one route that bills per
  call, so a Blobs outage means uncapped Anthropic spend, bounded only by a
  console limit `docs/CONTROL.md:200` records as blank.
- **Smallest intervention (code):** `limit.ts` gains `capState(bucket, cap,
  period)` returning `'under' | 'over' | 'unknown'` beside the existing boolean
  (which keeps failing open for storage buckets). `guide.ts` treats `'unknown'`
  as `rateLimited()`: the member gets the offline voice, exactly as on a cap.
  Test in `tests/caps-function.test.ts`: a store that throws → guide returns
  503 and never constructs the Anthropic client. The console spend limit stays
  the founder's; `CONTROL.md:200` gets the instruction to write the number in.

---

## What the pass changed, and what is the founder's

Built 2026-09-17, in slices, each verified before the next. No change to the
map, Home, the door's number, the marketplace code, or any strategy document's
argument.

| Slice | Change | Files | Held by |
|---|---|---|---|
| A | This document | `docs/RISKS.md`; README docs index + functions line; `docs/BOARD.md` entry; `docs/AUDIT.md` rows struck for what closed here | `npm run verify` |
| B | R4.1 cascade fix | `netlify/functions/keep.ts`; `tests/keep-function.test.ts` (+2 tests) | new tests fail before, pass after |
| C | R5 guide fails closed | `netlify/shared/limit.ts` (`capState`); `netlify/functions/guide.ts`; `tests/caps-function.test.ts` (+1) | store-throws test; existing fail-open tests for other buckets still pass |
| D | R3.1–2 promises → truth + test | the 12 copy sites above; new `tests/promises.test.ts` | test fails on current copy, passes after; Chromium walk of Door, Cohort, Trust, Profile, Sample, Plus, Read result for the phrases |
| E | R3.3 scheduled sweep | new `netlify/functions/sweep.ts`; export the liveness helper from `pool.ts`; `tests/deploy-layout.test.ts` allowlist; new `tests/sweep-function.test.ts`; `docs/DEPLOY.md` function list + schedule; `docs/OPERATING.md` sweep row; `docs/TIME.md:37`; `docs/HARD.md:88` | function test: lapsed entry + contact + expired map deleted, live ones untouched, second run deletes nothing |
| F | R2 one-screen result | `src/components/Read.tsx` | walk: ≤ 3 buttons before the disclosure; all 8 actions still reachable; `read.test` unchanged |
| G | R4.2–3 Trust reachable + contact line | `Read.tsx`, `BeforeYes.tsx`, `App.tsx`, `Trust.tsx` | walk: tool intro → Trust → Back returns to the tool; `guide-disclosure.test` still passes |
| H | One PR in the template's shape | | `npm run verify && npm run build` green |

**The founder's, not code:** run the
five sessions (R1); set the Anthropic console spend limit and write the number
into `CONTROL.md:200` (R5); set `VITE_CONTACT_EMAIL` on Netlify to an address
that is read, or land the mailbox (R4).

## How it was verified
1. `npm run verify`: typecheck, lint, 53 test files, 635 tests (51 and 619
   before this pass) — the two new files are `tests/promises.test.ts` and
   `tests/sweep-function.test.ts`; `tests/keep-function.test.ts` and
   `tests/guide-function.test.ts` each carry the new case. `npm run build` green.
2. Chromium at 400 px, functions stubbed: the read's result carries 3 calls to
   action before the disclosure (8 before), every one of the eight still
   reachable behind it, 483 visible words (593 before — what remains is the
   reading itself); the Trust link opens from both tool intros and Back returns
   to the tool; the door says "nobody is introduced yet" and carries none of
   the forbidden phrases.
3. After merge, the founder's dashboard: Netlify's function list shows `sweep`
   with a weekly schedule; the next Monday `watch.yml` run stays green.

## Keeping this true
A row in the matrix changes in the commit that changes its system. A risk in
the five is struck through, never deleted, with the date it closed.
