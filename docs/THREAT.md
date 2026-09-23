# Niyyah, threat-modelled — STRIDE, 2026-09-23

## Context

Requested directly: threat-model Niyyah with STRIDE — spoofing, tampering,
repudiation, information disclosure, denial of service, elevation of
privilege — against eight attackers: a curious stranger, a malicious match,
an abusive former partner, a spam bot, a scraper, an automated attacker,
someone holding a shared code, and someone holding an old link. Map every
public endpoint and sensitive flow, rank threats by **likelihood × impact ×
ease**, sort fixes into P0 / P1 / P2, and build P0.

This product has had a great deal of deliberate security work before this
pass, and a threat model that re-proposes it, or quietly overturns a
decision the founder made with the trade-off in view, is worse than none.
So the method was: three read-only audits in parallel — every function in
`netlify/`, every client flow in `src/`, and every security decision already
recorded in `docs/HARD.md`, `RISKS.md`, `REDTEAM.md`, `LEARNING.md`,
`TIME.md`, `SCALE.md`, `CONTROL.md`, `FAIL.md` and `DEPLOY.md` — then one
design review of the P0 fixes against the code before any of it was
written. Every threat below cites the line that makes it real.

**The shape of the product, for anyone reading this cold.** No accounts. A
six-character code over a 23-symbol alphabet (`netlify/shared/code.ts`,
23⁶ ≈ 2^27.1) is the only thing that stands between a stranger and a kept
map, a couple's sheet, or a door entry; an eight-character token (≈ 2^36.2)
is the vouch link. Possession of the code *is* the authority, on purpose —
`docs/HARD.md` rows 16 and 20 and the 2026-09-12 revision record why, and
this pass does not reopen that. What it does is check that everything
around the code holds up.

## The surface

Every route is `/.netlify/functions/<name>`, same-origin, no CORS.

| Route | Who | Bound | What it gives back |
|---|---|---|---|
| `GET /keep?code=` | code holder | `restore` 600/h | **her whole map** — name, age, city, every answer, the read and the eleven about a named person, the relative's vouch, her ending advice |
| `POST /keep` | anyone | `keep` 300/h, 128 KB | a minted code; a supplied code is written only at the etag it was read at, never created |
| `DELETE /keep?code=` | code holder | `forget` 600/h | a five-store cascade: map, pair, vouch + token, door entry + contact, her own reports |
| `GET /couple?code=` | code holder | `couple-read` 600/h | the joint only, never a side |
| `POST /couple` first / second | anyone / code holder | 200/h / 600/h | freezes once answered; the second side can be answered once, by whoever holds the code first |
| `DELETE /couple?code=` | code holder | 600/h | the sheet; never a report |
| `GET /cohort?scene=` | anyone | `door` 600/h | the door's count |
| `POST /cohort` | anyone with a live map | 200/h, 2.5 KB | a place in the count; contact to its own store, returned by no route |
| `POST /safety` | couple-code holder | **was 30/h spent before the pair was checked** | nothing — append-only |
| `GET /vouch?code=or token` | code or token holder | **was uncapped** | relationship + first name |
| `POST /vouch` | anyone | 100/h, 4 KB | first vouch wins |
| `POST /progress`, `DELETE` | anyone | 1000/h, 600/h | install-id-keyed metrics |
| `POST /guide` | anyone | 300/h and 400/day, **fails closed** | a streamed model reply; the system prompt is the server's |
| every tally, `/pool`, `/export`, `GET/DELETE /safety`, `GET /guide` | founder | bearer, constant-time, **fails closed** | counts, floored at five; the report queue |
| `sweep` | the scheduler | weekly | not reachable over HTTP |
| Netlify Forms `POST /` | anyone | Netlify's own filter | the waitlist row |

**Sensitive flows.** The kept map (the whole record, keyed by a code in a
URL). The guide (the largest payload that leaves the device: identity, every
answer, her question and the thread, to Anthropic). The safety report (the
one free text about another person). Forget me (a five-store cascade on
possession of the code alone). The door join (contact PII, and a forced
keep). And `localStorage`: eight keys, all plaintext, everything she has
written.

## Who attacks what

| | S | T | R | I | D | E |
|---|---|---|---|---|---|---|
| **Curious stranger** | — | — | — | T1: guesses codes against the one unmetered read | — | — |
| **Malicious match** | T13: answers her eleven first; reports as either side | T13: deletes the pair | T15: a false report | — | **T2: buries her report under thirty junk ones** | — |
| **Abusive former partner** | holds her code | T8: overwrites or deletes her map | — | **T3, T4, T8: the phone he took, the code he saw** | T2 | — |
| **Spam bot** | — | T7: inflates the door | — | — | T5: the form quota; T16 | — |
| **Scraper** | — | — | — | T1: harvests live codes, then `GET /keep` | — | — |
| **Automated attacker** | — | — | — | T1 | **T2**, T6: the guide's day | T17: the founder key |
| **Holding a shared code** | T13 | T8, T13 | — | T8 | — | — |
| **Holding an old link** | — | — | — | T10; links before 2026-09-05 still open maps (`docs/DEPLOY.md`) | — | — |

## Ranked — likelihood × impact × ease, each 1–3

| # | Threat | L | I | E | = | |
|---|---|---|---|---|---|---|
| **T1** | **`GET /vouch` had no cap.** Every other code-gated read was metered because an unmetered read is an enumeration surface over a 27-bit secret (`docs/HARD.md` row 3); this one was missed, and a 404 against a 200 confirms a live map code as surely as `GET /keep` — which then returns the whole map, and `DELETE` destroys it. The token lookup behind it was an unmetered oracle too | 2 | 3 | 3 | **18** | **P0, built** |
| **T2** | **The safety channel could be silenced by strings.** `safety.ts` spent its 30/h global cap *before* checking the pair existed, so thirty POSTs of made-up codes — each a 404 — refused every real report for the rest of the hour. The one channel for harm, and the cheapest denial of service in the product | 2 | 3 | 3 | **18** | **P0, built** |
| **T18** | **A dropped signal led to a button that erases her data.** Found verifying this pass: offline, a lazy screen whose chunk never reached the phone rejected its import and landed on the generic error screen, whose second button — "Start completely fresh" — clears every key, the kept-map code included. The interaction of two earlier changes (`docs/PERFORMANCE.md`, `docs/LINKS.md`); no attacker needed, two taps | 2 | 3 | 3 | **18** | **P0, built** |
| **T3** | **The offline shell stored codes on disk.** `src/lib/serviceWorker.ts` keyed every response on its full URL, so opening `/?map=ACDEFG` put a live map code in Cache Storage until the next deploy — and a fix to the worker alone would not have rotated the cache, because its version hashed only the bundle | 2 | 3 | 2 | **12** | **P0, built** |
| **T4** | **Personal reads carried no cache directive.** `GET /keep` returns the whole map with none, as did the couple and vouch reads and the founder's report queue | 2 | 3 | 2 | **12** | **P0, built** |
| T5 | The waitlist form has no honeypot; Netlify's free tier counts submissions, so spam can crowd out real ones silently | 2 | 2 | 3 | 12 | P1 |
| T6 | One person can spend the guide's whole day — the per-member budget lives in `localStorage` (`src/lib/budget.ts`) and the server's caps are global. Cost bounded at ~$36/day (`docs/DEPLOY.md`) | 2 | 2 | 3 | 12 | accepted — per-identity caps declined (`netlify/shared/limit.ts`); **founder: set the Anthropic console limit**, still blank in `docs/CONTROL.md` |
| T16 | Global caps mean an attacker's enumeration also 503s real people on that route | 2 | 1 | 3 | 6 | accepted — no identity, on purpose (`limit.ts`) |
| T7 | A bot mints maps (300/h) and joins (200/h) to show a false 40/40 — against "we never pretend a city is full" | 1 | 3 | 2 | 6 | P1 |
| T8 | No revocation: whoever has seen her code keeps it. The only remedy is forget me and a new map | 2 | 3 | 1 | 6 | P1 copy; P2 feature |
| T9 | No baseline headers (`nosniff`, `frame-ancestors`, `Referrer-Policy`). No XSS sink exists anywhere in `src/` — zero `dangerouslySetInnerHTML`, `innerHTML`, `eval`; the guide's words render as text nodes — so this is defense in depth | 1 | 2 | 2 | 4 | P1 headers; P2 CSP |
| T10 | `main.tsx` strips the query only after `await restoreMap`, so a `?map=` code sits in the bar for the round trip | 1 | 2 | 2 | 4 | P1 |
| T11 | `src/lib/progress.ts` still mints install ids with `b % 23` — the bias `docs/HARD.md` row 9 says was removed everywhere | 1 | 1 | 3 | 3 | P1 |
| T12 | `founder.ts`'s constant-time comparison has no test | 1 | 3 | 1 | 3 | P1 |
| T17 | Environment values are plaintext on the free plan; the key is the whole boundary | 1 | 3 | 1 | 3 | accepted — rotation per `docs/CONTROL.md` |
| T13 | Possession is authority: answer first, vouch as anyone, delete the pair, report as either side | — | — | — | — | **by design** — `docs/HARD.md` rows 16, 20 |
| T14 | Progress records last-writer-wins on a guessed install id; `keep` accepts `[A-Z0-9]{6}` rather than the alphabet; the 18+ gate is client-only | 1 | 1 | 2 | 2 | P2 |
| T15 | No per-actor record, so a false report is indistinguishable from a true one | — | — | — | — | **by design** — a person decides (`docs/TIME.md`) |

**Revised the same day by the OWASP audit (`docs/SECURITY.md`),** which read
the implementation rather than this model. Changes to the table above:
- **T10, T11 and T12 are built:**
  - the code leaves the address bar before the round trip;
  - the install id is rejection-sampled;
  - the founder compare is tested.
- **T14's alphabet note is closed:** codes are checked against the alphabet,
  not just the length.
- **T13 was wrong about one row.** "He answers first" is possession, and
  stays by design. "He rewrites *her* side", done by claiming her gender, was
  never by design (the comment said the opposite) and is fixed (SECURITY O6).

Five findings this model did not see, all fixed there:
- **O1:** forget me read a couple code and a side out of an attacker-written
  snapshot, and erased the victim's reports.
- **O2:** a `?map=` link silently replaced her phone's map and adopted the
  sender's code.
- **O3:** type-confused bodies crashed every handler.
- **O7:** no framing protection on a two-tap "delete everything".
- **O8:** six-character codes let one patient script find about 14% of kept
  maps a year. New codes are eight characters.

**Revised again the same day by the abuse pass (`docs/ABUSE.md`),** which asked
what a bad person does with the product working as designed:
- **T5 and T7 are built:** a honeypot on the waitlist form, and a per-city
  hourly join cap.
- **T8 is built.** "Change my code" (`PUT /keep`) moves the map, the vouch,
  the door entry and the contact under a new code, and the old one opens
  nothing.
- **T2's channel had a second gag.** Either holder of a couple code could
  delete the sheet, and a report against a deleted sheet was a 404. A retired
  sheet now leaves a ninety-day reporting window (`netlify/shared/sheet.ts`).

Three more were found and fixed there:
- a `?fresh` link that wiped any phone that opened it;
- forget me withdrawing reports, so a coerced wipe erased a threat;
- reports from an already-answered sheet filed as the wrong side.

## P0 — built in this pass

1. **The fifth read bucket** (`netlify/functions/vouch.ts`). A shape check
   first, so a malformed code spends nothing — the rule `GET /keep` already
   follows — then `vouch-read` at 600/h, *before* the token is resolved,
   because the lookup is itself the oracle. `VOUCH_READ_HOURLY_CAP`.
2. **The pair is checked before the queue is spent** (`netlify/functions/safety.ts`).
   Every attempt spends `safety-probe` (600/h — the existence check is an
   oracle over a couple code); only a report against a pair that exists
   spends the thirty. Burying real reports now takes thirty live couple codes
   an hour, not thirty strings. `SAFETY_PROBE_HOURLY_CAP`.
3. **Never cached** (`keep.ts`, `couple.ts`, `vouch.ts`, `safety.ts`).
   `Cache-Control: no-store` on every code-gated read, 404s included — "not
   here" for a code is a wrong answer the day it is kept — and on the
   founder's queue.
4. **A navigation is cached by its path alone** (`src/lib/serviceWorker.ts`),
   and the offline fallback reads the shell where it is actually cached, `/`
   (it read `/index.html`, which is never a key). `vite.config.ts` now hashes
   the worker's own source into its version, so this fix rotates the cache
   and `activate` deletes what the first version wrote.
5. **A screen that never arrived is not a broken state**
   (`src/lib/chunkError.ts`, `src/components/ErrorBoundary.tsx`). A failed
   chunk load gets its own screen — *"This screen hasn't reached your phone
   yet… Nothing is lost"* — with one button, Try again. The erase button
   stays where it belongs, on a genuine render error.

## P1 — next

- A honeypot on `public/__forms.html` (`data-netlify-honeypot`), and the
  form quota noted in `docs/DEPLOY.md`.
- Baseline headers in `netlify.toml` for `/*` — `X-Content-Type-Options:
  nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Content-Security-Policy: frame-ancestors 'none'`, `Permissions-Policy` —
  walked in Chromium across the app, the guide pages and the sheets.
- A per-scene hourly cap on door joins, and "joined in the last day" on
  `/pool`, so a bot's 40/40 is visible before it is believed.
- `main.tsx`: strip the query before `await restoreMap`.
- `src/lib/progress.ts`: rejection sampling, so row 9 is true.
- A test pinning `founder.ts`'s constant-time comparison.
- Trust, in one sentence: anyone holding your code holds your map; Forget
  me is how you take it back.

## P2 — later, or with a trigger

A full CSP, with hashes for the static documents' inline style and script ·
a "new code" rotation that carries the vouch, the door entry and her reports
across (trigger: the first reported leaked code, or the first pool) ·
`keep.ts` held to the 23-symbol alphabet · `age ≥ 18` checked on join ·
`sweep.ts` refusing anything but the scheduler.

## Accepted, and why

Not fixed, on the record: possession-as-authority (T13 — no accounts is the
product); global caps with no identity (T6, T16 — a cost control must not
become a second place a person is tracked); no per-actor log (T15 — a
person reviews every report); plaintext environment values on the free plan
(T17 — rotation is the control); the code in the restore link (`docs/HARD.md`
2026-09-12 — the link is the feature). Every one of these has a documented
owner and a reason; this pass checked the reasons still hold, and they do.

## Founder actions — not code

Set the monthly spend limit in the Anthropic console (`docs/CONTROL.md`
still has it blank — the only bound on T6 outside the code). Rotate
`FOUNDER_KEY` and `ANTHROPIC_API_KEY` on the cadence `docs/CONTROL.md` sets.
Confirm the repository is private before turning on the monthly backup
artifact.

## Verification

`npm run verify` and `npm run build`. New tests: the vouch-read bucket and
the token oracle, the probe bucket and the closed oracle
(`tests/caps-function.test.ts`); `no-store` on every read
(`tests/{keep,couple,vouch,safety}-function.test.ts`); navigation keys and
the root fallback (`tests/service-worker.test.ts`); the chunk-failure screen
and its missing erase button (`tests/chunk-error.test.ts`). **Every guard
was mutation-tested** — the fix reverted, the test watched fail, the fix
restored: removing the vouch cap fails 2, moving the safety cap back fails
3, dropping `no-store` fails 1, keying navigations by full URL fails 1,
taking the worker out of the version hash fails 1, giving the chunk screen
the erase button fails 1.

Chromium, on the built artifact: `?map=`, `?couple=` and `?vouch=` links
opened with the worker in control, then Cache Storage listed — **no key
carries a code**, and the only navigation key is `/`. The server process
then killed outright: `/` renders, and so does a never-visited tool path,
now on the honest screen rather than the one with the erase button. The
cache name rotated even on a build whose main chunk hash did not move,
which is the rotation fix doing its job.
