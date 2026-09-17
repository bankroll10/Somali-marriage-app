# The current-state audit — what product exists, 2026-09-17

## Context

The founder asked for the truth about what PRODUCT exists today, before another
month of building. Not ideation, not strategy: an inventory, sorted by whether
each part creates value for a user, enables that value, or exists because we
reasoned we might need it. Then the seams: duplication, contradictions between
code and its promises, complexity the product has grown past, and the quality
gaps worth fixing first.

**Method.** Read every file under `src/`, `netlify/`, `tests/`, `docs/` and the
build config, with three parallel read-only explorers (frontend flows and dead
code; backend, privacy and instrumentation; every doc against the code, every
promise against a test). Every claim below is labelled **FACT** (a file and,
where useful, a line) or **INFERENCE** (my judgment, stated as such). The pass
that wrote it changed no code: the founder asked for the truth before building,
and §7 is the list to build from.

**The one-paragraph answer.** Niyyah today is two small, finished, publicly
reachable instruments (a seriousness read, and the eleven conversations,
interactive and printed) wrapped in a much larger private app (a 16-question
map, an AI guide, a progress ladder, follow-ups, family scripts, a vouch, a
door, a pool readout, a monetisation screen, an ending) that no one outside the
founder is known to have used. Roughly a third of the code is the product that
is live in someone's hands; a third is the plumbing that makes it private and
measurable; a third was built for a marketplace that does not exist yet and
cannot open under its own rules for months. The docs are nearly as large as
the product, restate the same model in five or six places, and disagree with
the code in places that touch privacy, the door's number and what the product
has sworn never to build. The backend is well guarded and well tested, and has
one security defect that must be fixed first.

## The product in numbers

| Measure | Value | Source |
|---|---|---|
| Age of repo | 22 days (2026-08-27 → 2026-09-17), 196 commits, 35 PRs | `git log` |
| Product code | ~21k lines TS/TSX (`src/` 12,056 in lib+data+hooks, 8,175 in components; `netlify/` 3,726) | `wc -l` |
| Tests | 51 files, 619 tests, ~7.9k lines; Node env only, zero component or browser tests | `npm run verify` |
| Docs | 30 markdown files, 8,823 lines; `docs/BOARD.md` alone is 1,054; 13 files have no dated-revision discipline | `wc -l` |
| Screens | 24 (`Screen` union, `src/hooks/useNiyyah.ts:54-78`) in one 844-line hook, no router | FACT |
| Backend | 9 Netlify Functions, 9 Blob stores (`limits, maps, couples, vouches, cohort, contacts, reports, tallies, progress`), 1 edge function | `netlify/` |
| Runtime dependencies | 4: `@anthropic-ai/sdk`, `@netlify/blobs`, `react`, `tailwindcss`; no third-party origin in shipped HTML | `package.json`, `tests/deploy-layout.test.ts` |
| Live URLs a stranger can open | 5: `/tools/is-he-serious`, `/tools/is-she-serious`, `/tools/before-you-say-yes`, `/guides/before-you-say-yes`, `/guides/before-you-say-yes/sample` | `docs/ASSETS.md` |
| Known non-founder users | **0 in evidence**; `docs/FEEDBACK.md` has one entry (the founder's own walk); the results logs in OPERATING and EXPERIMENTS are empty | FACT (logs), INFERENCE (users) |
| Money paths a user can execute | 0 | FACT, §3 |
| Live cost | 1: Anthropic key behind `netlify/functions/guide.ts` (400/day, 300/hour caps) | FACT |
| Screens that say "when your city opens" | 7 | `grep`, §5.2 |

---

## 1. CORE PRODUCT — what actually creates user value

**What "value" means here.** Something a real person can reach without the
founder, finish, and leave with words they can use. By that test the core is
smaller than the app.

### 1a. The seriousness read — *Is he serious? / Is she serious?*
- **FACT** `src/components/Read.tsx` (594), `src/lib/read.ts` (282),
  `src/data/read.ts` (500). Eleven questions about what the other person has
  *done*, read into a band with one question to ask next, in the reader's
  gender voice via `speak()`; works for either side (`tests/mens-read.test.ts`).
- **FACT** Live at `/tools/is-he-serious` and `/tools/is-she-serious`
  (`src/data/tools.ts`, build-time HTML from `src/lib/toolPages.ts`),
  shareable as a link that carries only `?via=<kind of room>`.
- **FACT** It is the wedge the strategy was rewritten around
  (`docs/WEDGE.md`, `docs/PRODUCT.md §1`) and the asset in every pitch sent.
- **INFERENCE** The one thing in the repo that already works as a product for
  a stranger: no account, ninety seconds, a result in words, a share. Treat it
  as the centre of gravity.

### 1b. The eleven conversations — *Before you say yes*
- **FACT** Content in `src/data/eleven.ts` (279, import-free, single source);
  interactive at `src/components/BeforeYes.tsx` (512) and `src/lib/beforeYes.ts`;
  printed guide and one-page sample generated at build by
  `src/lib/guidePages.ts` (309) with print-only marking boxes.
- **FACT** Two-sided: `createCouple` / joint sheet through
  `netlify/functions/couple.ts` (303), 90-day TTL, code-is-authority, neither
  side sees the other's sheet, read by `src/components/Couple.tsx` (237).
- **FACT** Live at `/tools/before-you-say-yes`, `/guides/before-you-say-yes`
  and `/sample`. The guide is the artefact attached to the Masjid Al-Israa pitch.
- **INFERENCE** Second centre of gravity. The printed guide is the most
  "borrowable" thing we have: a nikah coordinator can hand it out with no app.

### 1c. The map and its reflection (the original product)
- **FACT** `src/data/intake.ts` (356, 16 questions in three chapters),
  `src/lib/reflection.ts` (567, seven grounds → thin/steady/strong),
  `Intake.tsx`, `Reflection.tsx` (476), `Home.tsx` (535) with
  `home/WorkCard.tsx`, one doable next step per ground from `src/data/nextStep.ts`.
  Builds with `fetch` stubbed to throw (`tests/durable.test.ts:134-153`).
- **FACT** Reachable only through the front door (Welcome → Identity →
  Situation → Hook → Intake → Generating → Reflection → Home); no stable URL.
- **INFERENCE** Real value for the person who finishes it, but it is 10+
  minutes behind onboarding and has never been put in front of anyone by a
  link. Core by design, *unproven* by use. Its 16 questions are the source of
  nearly every downstream system (facts, rungs, ledger, snapshot, alignment),
  so the app cannot be simplified without deciding what the map is for.

### 1d. The Guide (AI)
- **FACT** `src/components/Coach.tsx` (635), `src/lib/coach.ts` (267, live
  call with local-matcher fallback), `src/data/coach.ts` (455, the offline
  voice), `src/lib/route.ts`, `src/data/moments.ts` (four one-tap moments),
  `src/lib/budget.ts` (replies refill by progress), server
  `netlify/functions/guide.ts` (353) + `netlify/shared/prompt.ts` (237),
  rate-limited, key present in production. Five voices, pinned.
- **FACT** The only component with a running cost, and the only place a
  user's free text leaves the device by default (`trust.guideOnDevice` false).
  Its disclosure is the best-tested copy in the repo
  (`tests/guide-disclosure.test.ts` pins 16 prompt slots to Trust's sentences).
- **FACT** The docs place it three incompatible ways: "the weakest large
  thing in the product" (`docs/ROADMAP.md:90-101`, recommends the key stay
  unset), "the retention engine" (`docs/PRODUCT.md:103-105`), one of exactly
  two reasons to open the app (`docs/PRODUCT.md:30-33`). The founder's
  2026-09-10 decision to keep it on sits beside the recommendation it overruled,
  neither marked superseded.
- **INFERENCE** High per-use value, zero measured use, and the only part of
  the product whose quality depends on something we do not control.

### 1e. Follow-ups — the outcome question
- **FACT** `src/lib/followup.ts` (199, `MIN_AGE_DAYS = 3`), `home/FollowUp.tsx`;
  after a read or the eleven the product asks once what happened. That answer
  is the North Star numerator (`docs/NORTHSTAR.md`), recorded as rungs.
- **INFERENCE** Smallest system with the biggest claim on the strategy.
  Renders only on Home, so a read-first user sees it only because of the
  `inferStage` patch (`src/lib/inferStage.ts`).

### 1f. Family tools and the vouch
- **FACT** `Families.tsx` (89) + `src/data/families.ts` (154): family scripts.
  `Vouch.tsx` (192) + `netlify/functions/vouch.ts` (255): a family member
  vouches through a token link that carries no map code.
- **INFERENCE** Family scripts create value (words to say to a parent). The
  vouch creates value only when a pool exists to read it; today it is a ledger
  fact with no reader. Core-adjacent, not core.

**What is *not* core** (and is often described as if it were): the door,
count-me, the pool, Plus, the ending, the sample introduction, the philosophy
page. See §3.

---

## 2. SUPPORTING SYSTEMS — what enables that value

| System | Files | What it enables | State |
|---|---|---|---|
| Entry & links | `src/lib/entry.ts`, `links.ts`, `words.ts`, `src/data/invite.ts`, `src/data/tools.ts`, `App.tsx` URL mirror | Stable tool URLs, `?via` room-kind attribution (closed set, sender never carried), shares that carry words not codes | Solid; pinned by `entry.test`, `links.test`, `tools.test`; **three link builders overlap** (§4) |
| Persistence & privacy controls | `src/lib/storage.ts`, `keep.ts` / `netlify/functions/keep.ts` (kept map, 1-year TTL, Forget-me cascade), `forget.ts`, `RestoreMap.tsx`, `Trust.tsx` (355) | No account; keep/restore by code; one-tap deletion | Works; **the cascade has a security defect** (§5.1); `storage.ts` and five of Trust's six privacy paragraphs untested (§5.6) |
| Progress ladder & readout | `src/lib/rungs.ts`, `facts.ts`, `ledger.ts`, `progress.ts`; `netlify/functions/progress.ts` (626); `netlify/shared/floor.ts` (k=5) | The only measurement: claims about a life, floored, founder-gated, by via, side and country | Works; rung vocabulary pinned against engagement words (`rungs.test.ts:92-95`); **five vocabularies for one idea** (§4) |
| Guardrails | `netlify/shared/limit.ts` (fails open, says so), `founder.ts` (fails closed), `gate.ts` twin, `vocab.ts` + `tests/vocab-sync.test.ts` (20 lists), `record.ts` (`v` on every record), `code.ts` (`onlyIfNew` mint) | Caps on every public write; readouts need `FOUNDER_KEY`; server and app cannot drift on a closed word | Solid, well tested (`caps-function`, `record-version`, `gate-sync`, `vocab-sync`) |
| Safety | `netlify/functions/safety.ts` (198), `ReportConcern.tsx` | Report a concern from the eleven or a couple sheet; append-only; founder queue | Built; **deleteable by the reported party; byReason/byOutcome unfloored** (§5, §7) |
| Build-time pages | `vite.config.ts` plugin, `toolPages.ts`, `guidePages.ts`, `sitemapXml`, `robots.txt` | Search-visible static HTML for every tool and the guide, one voice | Solid; `guides.test` pins the page's own promises about itself |
| CI / deploy | `netlify.toml` (`verify && build`), `.github/workflows/watch.yml` (weekly safety, monthly export) | Nothing red ships | Works; **no sweep job exists** although four docs say one does (§5.5); safety job fails on any report rather than reading it |
| Tests | 51 files, 619 tests; function tests spin the handlers in Node | Refactors are safe on logic; several *promises* are mechanised: guide disclosure, brand literals, Somali gate, durability rule, deploy layout, form fields vs privacy list, vocab sync, floor | **Zero render/browser tests**; the largest privacy enumerations are prose only (§5.6) |
| Asset catalog & ledger | `docs/ASSETS.md`, test that every `TOOLS` slug is catalogued | Distribution can only pitch URLs that exist | New; the one doc with a test |
| Demo | `src/lib/demo.ts` (`?demo`, `?fresh`) | Founder can show the app seeded as "Hodan" | Works; untested; `docs/DEMO.md` is the most stale doc against the code (§6) |

---

## 3. SPECULATIVE SYSTEMS — built because we reasoned we might need them

Ordered by size. **FACT** for what exists; **INFERENCE** that none has been
reached by a non-founder user (no evidence in repo, logs or conversation; the
founder can confirm in one call to `?readout` with the key).

1. **The door, the short map, count-me, the cohort** —
   `Door.tsx` (240), `ShortMap.tsx`, `Cohort.tsx` (513), `src/lib/cohort.ts`
   (167), `src/data/shortMap.ts`, `hesitation.ts`, `reach.ts`, `countries.ts`,
   `scenes.ts` (18 scenes / 12 metros), `netlify/functions/cohort.ts` (341),
   `contacts` + `cohort` stores. ~1,700 lines to count people toward a
   `COHORT_TARGET = 40` per side that `docs/ATOMIC.md §6` has since replaced
   with "20 active men, women ≥ men". Reachable only via `?door` (§6). It
   collects the only contact details the product holds, and it is where the
   product makes the promise it cannot keep ("we write to you", §5.2).
2. **The pool readout** — `netlify/functions/pool.ts` (298): `eligible(w,m)`
   by age band and block, a founder-only count. No introductions store, no
   pool flag, no notification, no queue, no outbound channel. `docs/ATOMIC.md`
   T7 lists four defects in it that are still unfixed: `stranded` is read from
   the *floored* inventory; `unaged` is counted over live not supply; a map
   with no `stage` is read as `preparing`; `POST /cohort` never validates age
   or stage (`cohort.ts:270-283`).
3. **The sample introduction and alignment engine** —
   `SampleIntroduction.tsx` (210), `src/lib/matching.ts` (240),
   `src/data/candidates.ts` (355 lines of invented people), `HowYoudLive.tsx`.
   `alignment()` has exactly one caller: the sample. It also carries the one
   sentence in the product that promises two things the docs swear never to
   build (§5.3).
4. **Plus / monetisation** — `Plus.tsx` (132), `src/data/plus.ts`,
   `docs/BACKWARD.md`. No price, checkout or vendor; `PAY_IT_FORWARD` has no
   button; BACKWARD's own margin row says the schedule "fails as written" and
   no document resolves it; `docs/BETS.md` scores no pricing bet at all. A
   screen that describes a business model, with two different free-year
   promises on it (§5.3).
5. **The ending and the ended** — `Ending.tsx` (294), `Ended.tsx` (123),
   `src/lib/ending.ts` (246), `src/data/ending.ts`, `ended.ts`; `via=married`
   shares. The state the product is "designed to reach", reachable in code
   only through paths that mostly do not connect (§6).
6. **Export / backup** — `netlify/functions/export.ts` (161), monthly cron.
   Right in principle; returns expired records (§7); exports a learning record
   that today holds the founder's test rows.
7. **Waitlist transport** — `src/lib/waitlist.ts` (185): Netlify Forms /
   `VITE_WAITLIST_URL` JSON post, queue-and-flush. `netlify.toml` sets only
   `VITE_WAITLIST_FORM`; it coexists with `joinCohort` in one component (§4.9).
8. **The close switch** — `netlify/edge-functions/gate.ts`: a password gate
   with no password set. Kept deliberately; costs nothing; correctly documented
   since 2026-09-17 after five days of being described wrongly in six places.
9. **Analytics ring buffer** — `src/lib/analytics.ts`: 28 call sites, 30
   event names, millisecond timestamps, a 300-event buffer in `niyyah.events.v1`,
   read by nothing but `window.niyyahEvents()`. Never leaves the device, so
   `docs/LEARNING.md`'s refusal of session/time measures is not violated; the
   product still computes locally the shape of the thing it refuses.
10. **Philosophy page** — `Philosophy.tsx` (322). Brand, not product; and the
    one hero literal that names the community (§5.3).
11. **Stages** — `src/data/stages.ts`, `home/StageBand.tsx`. Real as a frame;
    as code it changes one band on Home, gates the door card to `preparing`
    (`Home.tsx:434`) and gates the ending.

**INFERENCE on the whole.** Items 1–5 are one bet ("a marketplace will open
and we should be ready"). Together they are roughly 4,000 lines of product
code, three Blob stores, four functions and eleven documents. They are
internally consistent and tested, and they are also the main reason the app has
24 screens, five progress vocabularies and an 844-line hook. They are not
wrong; they are early, and `docs/ATOMIC.md` already showed the door cannot
open under the 40/40 rule in any city for a long time. Every "designed, not
built" item in SCALE, LIQUIDITY, ATOMIC, HARD and BETS was checked and is
genuinely absent from code (introductions record, pool flag, queue, mail,
payments, matchmaker tooling, running counters); the ledger of built-vs-designed
is honest, with the six stale exceptions listed in §5.5.

---

## 4. DUPLICATION — several systems solving substantially the same problem

**In code**
1. **Five vocabularies for "what has she done".** `LedgerId` (7,
   `src/lib/ledger.ts`), `RungId` (13, `rungs.ts`), `Facts` (9 fields,
   `facts.ts`), analytics event names (30, `analytics.ts`), follow-up sources
   (5, `followup.ts`). Same facts, different spellings: `map` vs `mapped`,
   `beforeYes` vs `eleven`. `vocab.ts` mirrors two; the sync test covers those two. — **FACT**
2. **`Instrument` declared twice** with different members
   (`src/data/instruments.ts` vs `InstrumentKind` in `src/lib/entry.ts`). — **FACT**
3. **Four pronoun systems.** `speak()`/`VOICES` (`src/data/read.ts`),
   `neutral()` (`guidePages.ts`), a private helper in `src/data/hook.ts`, and
   ~15 inline `gender === 'woman' ? … : …` ternaries in components. — **FACT**
4. **Two engines select `ALL_AGREED`** (`src/lib/beforeYes.ts` and `src/lib/couple.ts`). — **FACT**
5. **Two gates that are one rule.** `blocked()` in `pool.ts` /
   `netlify/shared/gate.ts` and `alignment().gate` in `matching.ts`; kept in
   step only by `tests/gate-sync.test.ts`. `pool.eligible` and `alignment()`
   both answer "could these two be introduced" with different inputs. — **FACT**
6. **Two maps.** The 16-question map (`intake.ts`) and the 3-question short
   map (`shortMap.ts`) feed different stores and screens; a person can hold
   both with no relation between them. — **FACT**
7. **Three link builders**: `toolLink` (`links.ts`), `inviteLink`
   (`invite.ts`), the share builders in `words.ts`/`ending.ts`. — **FACT**
8. **Byte-identical copy in different constants**: `FOOTNOTE.read ≡ guide`,
   `FOOTNOTE.eleven ≡ couple` (`words.ts`); invite `TEXT.profile ≡ read`;
   `DURATION_NOTE` repeats option notes (`intake.ts`); `MODE_VOICE` and
   `STAGE_FOCUS` mirror each other (`coach.ts`). — **FACT**
9. **Two ways to leave a contact at the door**: `joinWaitlist` and
   `joinCohort`, both imported into `Cohort.tsx:7-8`. — **FACT**
10. **`COHORT_TARGET = 40` in two files** (`src/lib/cohort.ts:25`,
    `netlify/functions/cohort.ts:78`), against ATOMIC's 20-active rule. — **FACT**

**In documents** (30 files, 8,823 lines; `docs/ROADMAP.md:160-161` itself
records "166 distinct proposals across 21 documents were inventoried")
- **A. Positioning**, 995 lines, three canonical claimants: `STRATEGY.md`
  (v7, 431), `PRODUCT.md` (v8, 329), `NORTHSTAR.md` (235). Each carries a
  monetisation section, a metrics section, a never-built list and a roadmap.
  `PRODUCT.md` is not in README's docs index at all. — **FACT**
- **B. The pool**, 997 lines, three overlapping models: `SCALE.md`,
  `LIQUIDITY.md`, `ATOMIC.md`; each has a stage table and a designed-vs-built
  list describing the same two unbuilt artefacts (pool flag, introductions
  record) at three levels of detail. — **FACT**
- **C. Risk and unknowns**, 1,073 lines, four registers: `GAPS.md`,
  `REDTEAM.md`, `EXPERIMENTS.md`, `PROTOCOL.md`. Genuine division of labour,
  with the gender ratio in all four at different numbers (§5.4) and
  willingness-to-pay tracked in all four with its own threshold each. — **FACT**
- **D. Roadmaps**, 943 lines, five orderings, four superseded: `ROADMAP.md`,
  `BETS.md`, `MACHINE.md` M0–M3, `DURABLE.md:94-116` (self-marked superseded),
  `PROCESS.md:162-196`; the live order is in a sixth file, `PRODUCT.md §10`. — **FACT**
- **E. Operations**, 1,412 lines, five files with a stated but leaky split:
  `OPERATING`, `TIME`, `PROCESS`, `CONTROL`, `DEPLOY`; the readouts are listed
  in OPERATING and README and the two disagree on how many there are and
  whether all are aggregates. — **FACT**
- **F. Distribution**: `ASSETS.md` vs `WEDGE.md:117-127` vs `DEPLOY.md:300-323`;
  WEDGE's operational playbook still names `?read&via=` forms that are not in
  the ASSETS table DEPLOY says is the only source for a pitch. — **FACT**
- **INFERENCE** Each document was correct when written. The same fact (the
  door condition, the ratio, the price, the sweep) now lives in 5–8 places with
  2–3 values, and this, more than any code issue, is why the truth had to be
  re-established by audit.

---

## 5. CONTRADICTIONS — where code, docs, product promises, or strategy disagree

### 5.1 A security defect, stated first
- **FACT** `netlify/functions/keep.ts:130-133`: the Forget-me cascade deletes
  every report whose key starts with the couple code. `couple.ts:198-201`
  states the rule "a man must never be able to erase a safety report about
  himself by tapping forget me" and enforces it only on the couple DELETE
  route. `createCouple` (`src/lib/couple.ts:35`) accepts `gender: 'man'`, the
  sender's side stores the couple code, and `keptSnapshot`
  (`src/lib/keep.ts:39-47`) carries it. **A man who sent the eleven, kept his
  map, and was reported can delete her report by tapping Forget me.**
- **INFERENCE** Highest-priority fix in the codebase: cascade only the reports
  the *reporter* filed, plus a test.

### 5.2 Privacy and outcome promises the code does not keep
| Promise (where) | What the code does | Label |
|---|---|---|
| "No one else ever sees it — not your family, not a match, not us" (`Welcome.tsx:88`) | `facts.grounds` (all seven ground states, `facts.ts:102-104`) goes to `progress` by default (`countMe` true, `src/types.ts:108`); a kept map is readable by the founder. Trust says so; Welcome, the first screen, does not | FACT |
| "Your answers stay on this phone unless you keep your map" (`Read.tsx:178`, `BeforeYes.tsx:146`) | Read band and thin topics, and eleven state counts, go to `progress` by default | FACT |
| Trust: "six things" ever leave the phone (`Trust.tsx:111-118`) | A seventh path exists: the safety report's free text | FACT |
| Trust's ladder paragraph | Omits `country`, which the progress record carries | FACT |
| Trust's kept-map paragraph | Omits `guide.replies`, `trust`, `stage`, `situated`, `completed`, and that the snapshot includes `answers['working-on']`, `ending.advice` free text and `firstName` | FACT |
| Forget me copy | Does not say it deletes reports; `forget.ts:74` reports progress deleted when there is no install id | FACT |
| Contacts "live exactly as long as your kept map" (Trust, Cohort) | `contacts` has no TTL; true only if the founder runs `?sweep=1`; `pool.ts:52` comment says the opposite | FACT |
| Cohort disclosure "only your city" (`Cohort.tsx:398`) | `ContactRecord` holds country and a day timestamp | FACT |
| **"The day someone in {pool} fits your map, we write to {contact}… you will hear from us"** (`Cohort.tsx:166-171`, `:284-286`, `Door.tsx:188`, `Trust.tsx:144-145`) | No matching over kept maps, no outbound channel anywhere. `docs/TIME.md:37` admits it is "the founder reading the contacts store and mailing by hand… the first thing that stops in her absence" | FACT |
| **"When your city opens, this decides who you meet"** — 7 screens (`Trust.tsx:55`, `Profile.tsx:54,108,166`, `SampleIntroduction.tsx:90`, `Cohort.tsx:399`, `Reflection.tsx:442`, `plus.ts:70`) | Nothing decides. `alignment()` reads only invented candidates; the gate serves a readout. `docs/SCALE.md:213` claims this pass replaced the phrase; it changed STRATEGY and nothing on screen | FACT |
| "{contact} — we read every one" (`Cohort.tsx:415`) | `CONTACT_EMAIL` defaults to `salaam@joinniyyah.com` (`src/lib/site.ts:51`); `netlify.toml` sets no `VITE_CONTACT_EMAIL`; `docs/CONTROL.md:97` says that mailbox is "the one step still open". Unless the Netlify dashboard overrides it, the live site shows an address nobody reads | FACT (code), INFERENCE (dashboard) |
| "Minneapolis opens first" (`Welcome.tsx:169`) | A plan; code treats 18 scenes identically | FACT |
| `couples` "kept ninety days" | TTL is enforced delete-on-read only; nothing sweeps | FACT |

### 5.3 What the product swears never to build, and where copy builds it anyway
- **FACT** `SampleIntroduction.tsx:186-187`: "If it's mutual, **photos are
  shown to each other and a guided conversation opens**." Photos: "Declined,
  permanently. It is the product" (`docs/BETS.md:159-160`, `STRATEGY.md:297`,
  README). Messaging: "Off-platform, on purpose" (`MACHINE.md:36`,
  `LEARNING.md:86`). The two strongest refusals in the corpus are promised in
  one sentence of live copy, and no test forbids the words.
- **FACT** "Reporting **and blocking**" (`docs/STRATEGY.md:214-215`),
  "report-and-block" (`src/data/plus.ts:11`). `docs/HARD.md:50`: "There is no
  blocking of any kind in this repository… the copy is true now." It is not,
  in two places.
- **FACT** Two free-year promises on one screen: `Plus.tsx:110-115` "Everyone
  here **before the public launch** keeps every paid feature free for a full
  year" (the unbounded wording `plus.ts:83-85` says was replaced) vs
  `plus.ts:91` "Everyone **counted before their pool opens**."
- **FACT** `Ending.tsx:169-176` tells every married member "'Before we said
  yes, we had these eleven conversations' is a thing a married woman can say";
  the share text is gated on having done the eleven (`ending.ts:233-236`), the
  sentence above the button is not.
- **FACT** `Philosophy.tsx:132-139` names "the Somali diaspora" in a hero
  literal, against the institution rule (`STRATEGY.md:203-211`,
  `BACKWARD.md:155-164`); `tests/brand.test.ts` pins `brand.ts`, `index.html`,
  the manifest and Welcome, not Philosophy. `Philosophy.tsx:246-253` still
  speaks of invented content in the plural ("some of what you see") when it is
  one screen reachable only from Profile.

### 5.4 Strategy vs strategy, and strategy vs code
- **The door's number.** Code says 40 and 40: `opensWhen()`
  (`src/lib/cohort.ts:38-40`, spoken on Door, Cohort and in the married share),
  `Cohort.tsx:181` "needs 40 on each side", `Door.tsx:46`, `Cohort.tsx:54`,
  `pool.ts:13,17`, `cohort.ts:78` docstring. `docs/ATOMIC.md:241` says 20
  active men, women ≥ men, asymmetric. Twelve doc locations still state 40/40
  as the gate (`SCALE.md:75,87,104`, `HARD.md:88`, `PRODUCT.md:168-170`,
  `PROCESS.md:185`, `REDTEAM.md:128,229,501`, `EXPERIMENTS.md` A7 title,
  `DEMO.md:79,139` — a sentence the founder is told to read aloud that the code
  no longer contains — and `TIME.md:138`). On screen, `DoorCount` says "40
  each is the first mark" in the sentence after `opensWhen()` says "opens
  when 40 women and 40 men…" (`Cohort.tsx:271-280`, `Door.tsx:104-113`). The
  one honest hold is "active": ATOMIC T4 explains the sentence cannot claim
  activity until something measures it. — **FACT**
- **The gender ratio**, never measured, carried at five values: 1:3 hypothesis
  and 5–6:1 bound (`WEDGE.md:160-195`), "likely six women to one man"
  (`SCALE.md:108`), 3:1 "the honest one to expect" (`LIQUIDITY.md:87`),
  **≤ 3:1 required** for the economics (`BACKWARD.md:67`), 1:1–2:1 target with
  "every ratio above 2:1 collapses the women's inventory" (`ATOMIC.md:203,266`).
  SCALE's likely case is worse than BACKWARD's hard requirement and three times
  ATOMIC's ceiling; nothing says which governs. — **FACT**
- **The primary hypothesis**, three ways: the decision layer between "we're
  talking" and "we're getting married" (`PROTOCOL.md:8-11`); *preparing* as the
  only supply, talking/deciding served by the tools (`WEDGE.md:63-76`);
  stage-neutral (`NORTHSTAR.md:36-43`). `ATOMIC.md:39-51` ("two products
  sharing one door") describes the split without choosing. The code splits it
  too: the door card shows only to `preparing` (`Home.tsx:434`), while
  `inferStage` routes a read-first arrival to `talking`. PROTOCOL makes it
  testable and has not been run (zero sessions, `FEEDBACK.md:82-83`). — **FACT**
- **Monetisation.** `STRATEGY.md:173-178` prices the schedule; `BACKWARD.md:71`
  says the software-priced share is 28% at best against a ≥50% must-be-true,
  "fails as written"; `ROADMAP` and `PRODUCT §10` keep Concierge as the
  flagship revenue test anyway. Code has no price, correctly
  (`MACHINE.md:199-210`: "a fake price would be the one lie this product
  cannot tell"). — **FACT**
- **The age gate.** `MIN_AGE = 18` is required at Identity
  (`Identity.tsx:80-126`), but `ENTRY_SCREEN` (`useNiyyah.ts:83-90`) sends
  `read`, `eleven`, `couple`, `vouch`, `families` and `door` straight to their
  screens with no adult confirmation, and the `/tools/…` and `/guides/…` pages
  are public and indexed. The gate binds only on a server write tied to a place
  (`useNiyyah.ts:476,491`). No document states this asymmetry. — **FACT**
- **The roadmap's "BUILD NOW" item 3, mail on the domain, is still open**
  (`CONTROL.md:97`, `OWNED.md:84`) while the code's default already shows the
  owned address (§5.2). — **FACT**

### 5.5 Documents describing a product that no longer exists
| Where | Says | Reality |
|---|---|---|
| `README.md:86` | `data/daily.ts` in the architecture | File deleted with the daily ritual (`NORTHSTAR.md:170,207`) |
| `README.md:142` | `gate.ts` "Founding-preview password gate" | The close switch since 2026-09-12 |
| `README.md:257-288` | "Seven routes return aggregates and nothing else" | Three sentences later: "The backup returns whole progress records." `BOARD.md:496` marked this corrected; it survives |
| `README.md:97` | `data/beforeYes.ts` holds the eleven | Content moved to `eleven.ts` 2026-09-17; `beforeYes.ts` re-exports |
| `README.md` docs index | 27 entries | Omits `PRODUCT.md` (the v8 product strategy) and `DEMO.md` |
| `MACHINE.md:129-131,252-253,430-432` | "Being counted requires a completed map (`keepMap()` returns null without one)" | `src/lib/keep.ts:105-107` has no completion check; the ticket is the short map (`HARD.md:127-132`) |
| `MACHINE.md:32,255`, `EXPERIMENTS.md:12,16,19`, `GAPS.md:52`, `PROCESS.md:210` | "thirteen questions" | Sixteen; `Welcome.tsx:176-178` says sixteen |
| `HARD.md:88,112`, `SCALE.md:197`, `LIQUIDITY.md:40,121`, `OPERATING.md:125-126,133` | The `/pool` sweep runs on every read | Opt-in via `?sweep=1` only (`pool.ts:180-212`); `OPERATING.md:244` has it right, so OPERATING contradicts itself 111 lines apart |
| `OPERATING.md:136` | Swept entries' "`contacts` rows stay — lapsed is not forgotten" | `pool.ts:211` deletes the contact and quotes this sentence as the thing it replaced |
| `OPERATING.md:75` | "All four are aggregate… behind `FOUNDER_KEY`" | Seven routes listed beneath it; `/export` returns whole records |
| `MACHINE.md:416` ↔ `EXPERIMENTS.md:251` | Each says A6 lives in the other | A6 exists in neither |
| `LIQUIDITY.md:178` | `p_gate` "from `/pool`" | No such field; derived in `OPERATING.md:139` |
| `DURABLE.md:90` | The only mention of TikTok in the repo | `DEMO.md:145` is a TikTok section |
| `REDTEAM.md:443` | "Kill test, this week (by 2026-09-15)" | Passed with no result recorded |
| `PRODUCT.md:283-284`, `WEDGE.md:117-127`, `PROTOCOL.md:85`, `MACHINE.md:263` | `?read&via=` / `?eleven&via=` as the links to send | Still work, but `DEPLOY.md:304-307` says only an `ASSETS.md` row may go in a pitch, and these are not rows |
| `tests/edge-functions/gate.test.ts:22` | `describe('the founding-preview gate')` | Cosmetic; the suite name outlived the thing |
| Stale code comments | `guide.ts:163-165` "as open as it always was"; `pool.ts:52` contacts retention | Both assert the previous state |

### 5.6 Promises with a test, and promises without one
**Pinned (FACT):** the guide's disclosure, slot by slot; no "Somali" or
"powered by AI" literal in brand surfaces; no Somali sentence unapproved; live
model code confined to two files and eight instruments network-free; the form
registry matches what `waitlist.ts` sends; nine handlers and no more; 20 closed
vocabularies in sync; the printed guide's own promises; three tools with
catalogued URLs; the read never grades a man on the step it gives him; k-floor
never returns a small number; every record versioned; every public write capped;
rung ids never engagement words; follow-ups never guilt.

**Unpinned (FACT):** five of Trust's six privacy paragraphs (`Trust.tsx:119-242`);
the Cohort join disclosure list (`Cohort.tsx:388-404`, whose own comment says
it "must never drift from the code it describes"); `opensWhen()`'s number
(`ending.test.ts:119` checks only the substring "your city opens when", so 40→20
passes either way); both free-year sentences; "photos"/"conversation" anywhere in
copy; the sample's "invented" labels; `Welcome.tsx:88`; every "we write to you";
the eleven "never built" items in `STRATEGY.md:295-310` except two; all six in
`LIQUIDITY.md:241-242`; all eight in `ATOMIC.md:391-394`.

**INFERENCE** The repo already knows how to mechanise a promise
(`tests/guide-disclosure.test.ts` is the model). The largest privacy
enumerations and the two permanent refusals are the ones left in prose, which
is why they are the ones that drifted.

---

## 6. ORPHANED COMPLEXITY — things the product has grown past

**Unreachable or near-unreachable screens (FACT, from the hook's transitions)**
- `door → shortMap → count` is an island: reachable only by `?door` in the URL
  since the "quiet the door" pass.
- `ending` is unreachable from Situation "married": `openGuide` overwrites the
  screen `setStage` set (`useNiyyah.ts`).
- `generating` has no user exit if the reflection never resolves.
- `trust` has one caller and one return; `sample` only from Profile; `plus`
  only from Home's menu.

**Dead exports and constants (FACT, zero references)**
- `INSTRUMENT_LABEL`; `Tool.share` (three strings never read at runtime);
  `codeFromUrl`; exported `ledgerDone` (recomputed inline); `READ_QUESTION_COUNT`;
  client `SAFETY_OUTCOMES`; `ui.tsx` `InitialAvatar`, `RingGlyph`, `EyeOffGlyph`;
  approved Somali strings never called (`brother.opener`, `map.warmest`,
  `read.eyebrow`); `relationshipOptions(_memberGender)` ignores its parameter.

**Systems whose reason has moved on (INFERENCE, with FACT anchors)**
- `analytics.ts`: built before the ladder became "the only thing this product
  is allowed to measure" (`rungs.ts` docblock). Nothing reads it.
- `waitlist.ts`: built when there was no server; `joinCohort` replaced it;
  both remain wired into `Cohort.tsx`.
- `candidates.ts` + `matching.ts`: built to demonstrate an introduction before
  there was a pool rule; `pool.eligible` is now the rule and the sample is the
  only caller of `alignment()`.
- `budget.ts`: a progress-refilled budget presumes daily users; at zero users
  the caps in `guide.ts` are the real limit.
- `demo.ts` "Hodan" and `docs/DEMO.md`: the demo predates the read-first wedge
  and its script reads aloud a door sentence the code removed; a demo today
  would start at `/tools/is-he-serious`.
- Five roadmaps (§4 D), four self-marked superseded and kept "as the record of
  why", so the live one is the hardest to find.
- `docs/BOARD.md` (1,054): a changelog that became the place decisions live,
  so every doc points at it and it points at everything.
- The two evidence logs (`OPERATING.md:322`, `EXPERIMENTS.md:301`) are empty
  by construction: `BOARD.md:497` names it — "its Observe step has never had
  an input."

---

## 7. HIGHEST-LEVERAGE QUALITY GAPS (ranked)

1. **The report-deletion defect (§5.1).** One condition in `keep.ts`, one
   test. Nothing else here matters if a reported man can erase the report.
2. **Make the privacy sentences true.** `Welcome.tsx:88`, `Read.tsx:178`,
   `BeforeYes.tsx:146` become accurate, or `countMe` stops sending
   `facts.grounds`/band/thin by default for instrument-only users. Trust's
   inventory gains the seventh path, `country`, and the snapshot's real fields.
   Then **pin it**: extend the guide-disclosure pattern to Trust's other five
   paragraphs and to the Cohort join list, so the copy moves with the payload.
3. **Delete the promises the code cannot keep.** The "we write to you"
   sentences on Door, Cohort and Trust; the seven "when your city opens"
   lines; the photos-and-conversation sentence in `SampleIntroduction.tsx:186`;
   "and blocking" in STRATEGY and `plus.ts:11`; the unbounded free-year hero on
   `Plus.tsx:110-115`; the ungated eleven sentence on `Ending.tsx:169-176`.
   Replace each with the form `Trust.tsx:310-317` and `coach.ts:377` already
   use: say the limit on the face of the screen. Add a test that forbids
   "photo" and "conversation opens" in component copy.
4. **A TTL on `contacts`** (or a scheduled sweep by cron, not by hand), and
   fix `pool.ts:52`. The only PII the product holds should not depend on the
   founder remembering `?sweep=1`. Set `VITE_CONTACT_EMAIL` on Netlify to an
   address that is read, or land the mailbox, before another pitch goes out.
5. **One door condition, one owner.** Either wire the door back in under
   ATOMIC's rule with a single `COHORT_TARGET` and an `opensWhen()` that says
   what `DoorCount` says, and fix the twelve doc locations — or remove
   `?door`, `ShortMap`, `Cohort`, `hesitation`, `reach`, the `cohort`/`contacts`
   stores and the waitlist transport until there is a city. Half-present is
   the worst state: it holds PII and speaks two numbers in one paragraph.
6. **One progress vocabulary.** Collapse `LedgerId`/`RungId`/`Facts` spellings
   into `vocab.ts` and let the sync test cover all of them. Precondition for
   trusting the readout.
7. **One "what is built" document** (`docs/AUDIT.md` from this pass, kept
   current) and a rule that strategy docs cite it rather than restate it. Give
   the ratio, the price and the door condition one owner each; fix the §5.5
   rows in README, MACHINE, OPERATING, HARD, SCALE, LIQUIDITY, DEMO; date every
   doc; archive the four superseded roadmaps.
8. **Decide the age gate for public tools.** Either the tool pages and
   instrument entries confirm 18+ once, or a document states why a read and a
   printed guide need no gate. Today the asymmetry is unstated.
9. **Render tests for the five live URLs.** One Playwright job in CI that
   opens each catalogued asset at phone width, checks the headline and the
   share, and prints the sample to one page. Today that is a scratchpad script
   the founder cannot run.
10. **Tests for `storage.ts`** (load/migrate/save and `keptSnapshot`), because
    that file defines what a kept map contains, which is a privacy promise.
11. **The four `pool.ts`/`cohort.ts` defects ATOMIC T7 already lists**, plus
    floor `safety.ts` byReason/byOutcome and `tallies`, `export.ts` skipping
    expired records, and `watch.yml`'s safety job reporting rather than failing.
12. **Hygiene, one commit each:** the three broken transitions (§6), `startFresh`
    clearing the kept code, client install-id bias (`progress.ts:56-59`, use
    the rejection sampling `code.ts` has), `vouch.ts` `RELATIONSHIPS` into
    `vocab.ts`, `KeepMap`/`Ending` "Keep this" through `shareOrCopy`, delete
    the dead exports in §6, rename the gate test suite.

**INFERENCE on order.** Items 1–4 are days and are about being honest to the
people the pitches are now reaching. Items 5–8 decide whether the next month is
spent on a smaller, truer product or on more of the marketplace. Items 9–12 are
hygiene, each under a day.

---

## Keeping this true

This file is the one place that says what is built. When a system in §1–§3
changes, its row changes in the same commit; a strategy document cites the row
rather than restating it. A finding in §5 or §7 is struck through with the PR
that closed it, never deleted, so the record of what was wrong stays readable.

## Verification of this audit itself
- Every FACT row names a file; a reviewer can open each in under a minute.
- The zero-users inference is checkable in one call: `?readout` on the
  progress function with `FOUNDER_KEY` — if any `began` count is above the
  floor for a `via` other than the founder's own tests, §1 and §3 change.
- The contact-email inference is checkable in the Netlify dashboard: if
  `VITE_CONTACT_EMAIL` is set there, strike that row from §5.2.
- `npm run verify` and `npm run build` must stay green after the doc lands
  (the guides test imports the asset catalog; no other test reads docs).
