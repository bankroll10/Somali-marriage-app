# Niyyah, audited — OWASP, 2026-09-23

## Context

This is an OWASP-oriented security audit of the whole application, with
nineteen named focus areas. The instructions were to break it before fixing
it, not to trust comments that say something is secure, and to verify the
implementation. `docs/THREAT.md`, the STRIDE pass the same day, covers the
threat model. This document covers what the code actually does.

**Method.** I read every server file end to end: ten functions, eight shared
modules and the edge gate. I also read every client path that talks to them:
keep and restore, forget, report, the entry resolver in `src/main.tsx`, and
the waitlist. Then I checked `.gitignore`, `.env.example`, both workflows and
`npm audit`. Every finding below was **written as an attack and run against
the unfixed code first**. Most live in `tests/security-audit.test.ts`. The
restore-link takeover was also reproduced in Chromium on the unfixed build.
Each was then fixed, and each guard was mutation-tested: undo the fix, watch
the test fail, restore it.

**What the reading found.** Three findings contradict comments that said the
opposite, in the files they sit in:
- keep.ts: "a reported man could erase the report about himself" — fixed, it
  said.
- couple.ts: "the sheet belongs to the side that made it".
- code.ts, with BOARD decision 12: "the read caps bound enumeration".

## Findings — ranked (likelihood × impact × ease, each 1–3)

| # | Finding | OWASP | Score | State |
|---|---|---|---|---|
| O1 | Forget me erased the victim's safety reports | A01 | **27** | Fixed |
| O2 | A restore link took over her device | A07 | **18** | Fixed |
| O3 | Type-confused bodies crashed every handler | A03 / A09 | 9 | Fixed |
| O4 | `.env` not ignored; `.env.example` said the founder key fails open | A05 | 6 | Fixed |
| O5 | The family vouch was an unmetered token oracle | A07 | 12 | Fixed |
| O6 | He could rewrite her side of the eleven | A01 | 12 | Fixed |
| O7 | No framing protection or baseline headers | A05 | 6 | Fixed |
| O8 | Six-character codes: ~14% of kept maps a year to one patient script | A07 | 12 | Fixed |
| O9 | Build-time dependency advisories (postcss, nanoid) | A06 | 3 | Fixed |
| O10 | Workflows ran with the default token scope | A05 / A08 | 2 | Fixed |
| O11 | Client install id still biased; founder compare untested | A02 | 3 | Fixed |

### O1 — forget me erased the reports filed against the person forgetting

**The comment:** `keep.ts` said the cascade takes "any report she filed — and
only hers", and that since 2026-09-17 a reported man could no longer erase
the report about himself.

**The attack:**
1. She sends him the eleven, so both of them hold couple code `C`, and she
   reports him.
2. He `POST`s `/keep` with
   `snapshot: { couple: { code: C }, identity: { gender: 'woman' } }` and
   gets a fresh map code `X`.
3. He sends `DELETE /keep?code=X`.
4. The cascade read the couple code *and the side* out of that snapshot and
   deleted `reports/C-woman-*`: every report she filed about him.

It took two requests, both far under their caps.

**Why:** a snapshot is whatever the caller wrote. The cascade used it as
authority to delete someone else's records.

**The fix:**
- The cascade no longer touches reports at all
  (`netlify/functions/keep.ts`).
- A report's id is now a ten-character token, returned to the filer as a
  **receipt** (`netlify/functions/safety.ts`).
- `DELETE /safety` without a key or an outcome is a withdrawal. It needs the
  pair, the side and the receipt, deletes exactly that report, and spends
  the probe bucket.
- Resolution is still the founder's alone.
- Her phone keeps receipts under `niyyah.reports.v1`, and forget me withdraws
  each one (`src/lib/safety.ts`, `src/lib/forget.ts`).
- Trust's Forget me sentence now names "any concern you reported from this
  phone", and names it when one did not go.

**The limit:** a report filed before today carries a six-character id and no
receipt anyone holds. The founder resolves those. A report surviving a
forget is the safe direction.

### O2 — a restore link could take over her phone

**The attack:**
1. An abusive ex keeps a throwaway map (code `X`) and sends her
   `joinniyyah.com/?map=X`.
2. `main.tsx` fetched it and wrote it straight into storage. Her answers were
   gone, irreversibly if she had never kept them.
3. `restoreDetail` also called `rememberCode(X)`, so from then on every keep,
   door join and vouch-ask on her phone wrote under a code he holds.
4. He reads all of it with `GET /keep?code=X`.

Reproduced in Chromium on the unfixed build. One tap left
`{"name":"Abdi","code":"ACDEFG"}` on a phone that had held Sagal's map under
her own code.

**The fix:**
- Fetching no longer adopts. `adoptMap` does, only on consent
  (`src/lib/keep.ts`).
- A `?map=` link now opens `src/components/ConfirmRestore.tsx`, a lazy
  chunk of 0.85 kB gzipped. It shows whose map it is (first name and city),
  says it replaces the map on this phone if there is one, and warns that a
  map someone else sends would keep what she writes under their code.
- "Not mine" changes nothing.
- Her own link on the phone that already holds that code does nothing at
  all: the phone is newer than the server copy.
- The code leaves the address bar *before* the round trip, which closes
  THREAT T10.
- The typed restore on Welcome adopts directly. She typed it herself.

**Verified live** (built artifact, `/keep` stubbed in Playwright):
- `?map=` of someone else's code → the confirm screen names him.
- "Not mine" → her name and code are unchanged.
- Her own `?map=` → no prompt and no fetch.
- "Yes" → restored and adopted.

### O3 — a hostile body crashed the handlers

- `JSON.parse('null')` is `null`, and every POST handler then read `body.x`
  off it.
- `{"code": 1}` hit `.toUpperCase` in safety, cohort and progress.
- `through: ["constructor:x"]` found `Object` in `THROUGH_TOPICS` and threw on
  `.has`.
- In the guide, `message: 7` or `history: {}` threw after both of the day's
  caps were spent. Any junk body also spent the guide's daily budget before
  being checked.

Each bypassed the function's own error contract, and the platform answered
in its own shape.

**The fix:**
- `netlify/shared/body.ts` `readJson(req, max)` replaces seven copies of the
  read / measure / parse block. It refuses anything that is not a plain
  object with `400 bad_json`.
- `normalise()` replaces the three hand-rolled `(x ?? '').toUpperCase()`.
- `Object.hasOwn` guards the two vocabulary lookups.
- The guide parses and validates before it spends a cap.

### O4 — secrets hygiene

- `.gitignore` ignored `.env.local` but not `.env`, so a local
  `ANTHROPIC_API_KEY` was one `git add -A` from the repository.
- `.env.example` still said "FOUNDER_KEY … Unset means open". That has been
  false since BOARD, and it is exactly the misconfiguration the founder gate
  exists to make impossible.

Both are fixed and pinned.

### O5 — the family vouch said which tokens were live

The family branch of `POST /vouch` resolved the token before validating the
body and before the cap. An unknown token answered `bad_code`, and a live
one went on to `bad_relationship`: an existence oracle at no cost. The
branch now checks shape, then fields, then spends the cap, and only then
looks the token up. A live token and a dead one get byte-identical answers
to a bad body.

### O6 — the man she sent the eleven to could rewrite her side

Re-posting `side: first` was allowed when `existing.creator === body.gender`.
That is a gender the request *states*. He holds the code, so before
answering he could post as a woman with states he chose, and the joint she
then read was his invention.

**The fix:**
- A new sheet returns an **owner key** once. The client does not re-post
  today, so it does not store it.
- Re-posting needs that key, compared in constant time with `sameSecret`
  (`netlify/shared/secret.ts`, shared with the founder gate).
- A code nobody minted is a 404 rather than being created on demand.
- Sheets from before the key keep the old check until they expire, within
  90 days.

This also corrects THREAT T13, which had filed it under "possession is
authority, by design". It was not by design; the comment claimed the
opposite.

### O7 — nothing stopped a page being framed

"Forget me → Yes, delete everything" is two taps, and any site could frame
Niyyah and put them under a member's finger. `netlify.toml` now sends these
on every path:

| Header | Value |
|---|---|
| `X-Frame-Options` | `DENY` |
| `Content-Security-Policy` | `frame-ancestors 'none'` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera, microphone, geolocation and payment all off |
| `Strict-Transport-Security` | one year |

The app frames nothing and asks for none of those permissions (checked).

### O8 — six characters let a patient script find one kept map in seven, every year

Six routes each answer "does this map code exist?", each on its own hourly
cap:

| Route | Guesses an hour |
|---|---|
| restore | 600 |
| forget | 600 |
| re-keep | 300 |
| vouch-read | 600 |
| vouch-ask | 100 |
| join | 200 |
| **Total** | **2,400** |

That is 21 million a year, against 23⁶ = 148 million. The expected hits are
0.14 × N a year, **about 14% of all kept maps at any membership size**, and
two of those routes delete or overwrite what they hit. Couple codes, across
their five routes: about 15%. BOARD decision 12 kept six characters because
"the read caps bound enumeration". They bound the rate, not the fraction.

**The founder delegated the choice. Chosen: eight characters for everything
minted from now on.**
- 23⁸ ≈ 78 billion, 512 times the space: the same script finds about 0.03% a
  year.
- Shown as two groups of four (`ACDE FGHJ`), so eight is no harder to read
  aloud than six.
- Six-character codes keep working everywhere. The code check now also
  enforces the alphabet, which closes the THREAT T14 `[A-Z0-9]{6}` note.
- Vouch tokens, report receipts and owner keys are ten characters, so no
  token can ever be mistaken for a code.
- A vouch link minted when tokens were eight still resolves:
  `resolve()` looks for a token before taking eight characters as a code.

Every one of those behaviours has a test.

### O9–O11

- **O9:** `npm audit` flagged `postcss ≤ 8.5.22` (high) and `nanoid`, both
  reached only through `vite` at build time. Neither ships to a browser or a
  function. `npm audit fix` changed only the lockfile, and it now reports 0.
- **O10:** both workflows now run with `permissions: contents: read`.
  Neither writes to the repository, and the artifact upload does not need
  the token.
- **O11:** `src/lib/progress.ts` still minted install ids with
  `ALPHABET[b % 23]`, the bias HARD row 9 said was removed everywhere. It is
  now rejection-sampled, with a test that feeds it the three biased bytes.
  The founder comparison, untested since it shipped (THREAT T12), now has
  near-miss tests and a shape pin: no early return, every byte compared.

## The nineteen focus areas

| Area | Verdict | Evidence |
|---|---|---|
| Input validation | **Was broken (O3); fixed.** Every value the server keeps is a closed id from `netlify/shared/vocab.ts` or a bounded, trimmed string | `shared/body.ts`, `progress.ts parseFacts`, `tests/vocab-sync.test.ts` |
| Authorization | **Two breaks (O1, O6); fixed.** Possession of a code is the authority by design (no accounts). What was wrong was authority taken from *attacker-written* data: a snapshot, a stated gender | keep.ts cascade, couple.ts `owner` |
| Founder-only endpoints | **Sound.** All six founder readouts go through `isFounder`. It fails closed with no key, compares in constant time and accepts only `Bearer`. No route answers a founder read without it (read each). `/pool?sweep=1` deletes on GET, but only behind the key | `shared/founder.ts`; tests in each function file and O11 |
| Code/token entropy | **Was weak (O8); fixed.** Server generation is rejection-sampled from `crypto.getRandomValues`; the client's is now too (O11) | `shared/code.ts`, `src/lib/progress.ts` |
| Enumeration | **Was 14% a year (O8), and one oracle was unmetered (O5); fixed.** Every code-gated route validates shape first, then spends a bucket, then looks up | `tests/caps-function.test.ts`, O5 tests |
| Rate limiting | **Sound, and global by design.** No identity, so an attacker's loop also 503s real users of that route (THREAT T16, accepted). Everything fails open except the guide, which spends money and fails closed | `shared/limit.ts` |
| Injection | **None found.** No SQL, no shell, no `eval` or `new Function`. Blob keys are built only from validated codes and closed ids | grep over `netlify/` and `src/` |
| Prompt injection | **Contained, by construction.** The server owns the system prompt. Context fields pass closed sets or are control-stripped and cut to 60–200 characters. No other person's text ever reaches the prompt: her read and the joint arrive as her own client's words. The model has no tools. A member can steer her own session, including forged `coach` turns in the history, and nothing else. Cost is bounded by caps that fail closed | `shared/prompt.ts`, `guide.ts` |
| Request size | **Sound.** Every body is measured before parsing, with limits from 2 kB to 128 kB. The platform caps a function body at 6 MB, which bounds the buffer. A `Content-Length` pre-check would refuse sooner (P2) | `shared/body.ts` |
| Cross-site scripting | **None found.** No `innerHTML`, `dangerouslySetInnerHTML`, `eval`, `javascript:` or URL-built `href` outside one fixed `mailto:`. React escapes everything a member or a stranger can write. Static pages are built from repo data at build time. A full `script-src` CSP is defence in depth (P2) | grep; `src/lib/guidePages.ts` |
| CSRF | **Not applicable, checked.** There are no cookies and no ambient credentials. The founder key is a header a cross-site page cannot set. Public routes carry their authority in the request (a code), so a forged request can do only what that code already allows. The dormant edge gate uses Basic auth, which is ambient, but it only gates viewing | `shared/founder.ts`, `edge-functions/gate.ts` |
| CORS | **Sound.** No function sends `Access-Control-Allow-Origin`, so another origin cannot read a response. A cross-origin write has exactly the power of `curl` | grep |
| Sensitive information exposure | **Sound, with O2 fixed.** Contact details and a relative's sentence and phone are returned by no route. Personal reads are `no-store` (THREAT T4). Codes are stripped from the bar before any round trip (O2 / T10) and are never cached on disk (T3). The waitlist form carries no code | `cohort.ts`, `vouch.ts publicView`, `src/lib/waitlist.ts` |
| Secrets | **Was sloppy (O4); fixed.** No key is in the repository or the browser bundle: only `VITE_*` settings reach the client, and none is a secret. The founder key has no length floor (P2: warn under 32) | `.gitignore`, `.env.example`, `grep import.meta.env` |
| Dependency vulnerabilities | **Was 2 high, build-time only (O9); now 0** | `npm audit` |
| Logging | **Sound.** Logs carry route names and error objects, never a body, a contact, a message or a guide turn. Blob errors can name a key (a code) in the site's own function log, which only the founder can read | `console.error` sites |
| Error leakage | **Was leaking through crashes (O3); fixed.** Every handled error is a fixed id (`bad_code`, `unavailable`, …). The founder-only health check returns 300 characters of the upstream error, behind the key | every handler, `guide.ts GET` |
| Replay | **Bounded.** Re-sending a request is idempotent or bounded everywhere, listed below. There is no nonce because there is no session to replay into; a replayed write needs the same code, which is the authority anyway | — |
| Idempotency | **Sound.** Keep and couple use etag-conditional writes. Vouch is first-wins (`onlyIfNew`). His answer lands once. A door join replaces. Progress only adds. A report is append-only. Mints use `onlyIfNew` with retry, and a collision is a 503, never an overwrite | `tests/fail.test.ts` "a write that matters is conditional" |

What a replay does, route by route:
- **keep re-keep:** writes the same snapshot again.
- **mint:** a new code, bounded by the keep cap.
- **couple second:** 409 on the second attempt.
- **vouch:** 409 on the second attempt.
- **join:** replaces the same entry.
- **progress:** adds nothing new.
- **report:** a second report, bounded by the reporting cap, and noise the
  founder sees beside the real one rather than instead of it.

## Accepted, and why

- **Possession is authority.** There are no accounts. Anyone holding a map
  code can read, overwrite and delete that map. Anyone holding a couple code
  can answer first, read the joint and delete the sheet. Anyone holding a
  vouch token can vouch. See HARD rows 16 and 20, and THREAT T13 with O6 now
  carved out. The mitigation is keeping codes secret: eight characters (O8),
  never on disk (T3), never in the bar (O2), never in a form (waitlist).
- **Global caps.** An attacker's loop costs legitimate users that route for
  the hour (THREAT T16). The alternative is per-identity limits, and identity
  is exactly what this product declines to hold.
- **Guide self-injection.** A member can talk her own session into anything
  a model will say. Nothing she can make it say reaches anyone else, and it
  has nothing to act with.

## P2 — later, or with a trigger

- **A full CSP.** `script-src 'self'`, with a hash for the guide pages' one
  inline script and their inline styles. Trigger: any feature that renders
  text from one person to another.
- **A `Content-Length` pre-check** before `req.text()`.
- **A founder-key strength check.** Warn once in the log when `FOUNDER_KEY`
  is shorter than 32 characters.
- **Pin workflow actions by SHA** rather than tag.
- **Mixed-length era.** Maps kept at six stay at six until they lapse.
  Re-keeping could move one to eight, but it would need her to learn a new
  code, so it is not done silently. Trigger: the first 500 kept maps.

## Founder actions — not code

- Set a spend limit in the Anthropic console (THREAT, still open).
- Use a `FOUNDER_KEY` of 32 or more random characters, and rotate it per
  `docs/CONTROL.md`.
- If a local `.env` ever held a real key before today, rotate that key.

## Verification

- `npm run verify` passes: 69 files and 910 tests, including
  `tests/security-audit.test.ts` (the attacks), `tests/restore-link.test.ts`
  and the updated function suites. `npm run build` passes, and the main
  bundle is within `docs/PERFORMANCE.md`'s budget; the confirm screen is its
  own chunk.
- **Red, then green.** O1, O2, O3, O5 and O6 were each run against the
  unfixed code and watched to succeed before the fix. O2 was also run in
  Chromium against a build of `main`.
- **Mutation-tested:**
  - restoring the prefix delete in the cascade fails three tests;
  - dropping the plain-object check in `readJson` fails seven;
  - dropping `Object.hasOwn` fails one;
  - reverting the owner-key check to the gender check fails one.
- **Live:** the Chromium walk of `?map=` (someone else's link, her own link,
  "Yes") against the built artifact, with 6- and 8-character codes.
- **What the tests missed, and a re-read caught.** After the length change
  the suite was green, but a final grep for hard-coded lengths found
  `src/lib/vouch.ts` still accepting only an eight-character token. Every
  new "ask a relative" would have come back as "try again". It now accepts
  ten or eight, and has a test. The server's and client's tests each mocked
  the other side, so neither could see the contract move. That is the lesson
  for the next length change: grep, don't trust the suite.
- **Not checkable from here:** the response headers on the deploy preview.
  The sandbox proxy refuses the preview host. The pin test holds
  `netlify.toml`, and Netlify's own "Header rules" check validates it on
  deploy.
