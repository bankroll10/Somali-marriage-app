# Security and abuse

What protects a member of Niyyah, from whom, and where that protection stops:
the one rule everything rests on (a code is the authority), the hard choices
that keep it from being turned against her (rows), the threat model (T-ids),
the audit findings and their fixes (O-ids), and the abuse cases, what a bad
person does with the product working as designed. Where this and the code
disagree, the code is right.

## What changed on 2026-09-24

The marketplace was deleted (`docs/DECISIONS.md`). Rows, threats and cases
about what went are cut to one line, so their ids still resolve.
- **The family vouch, the door, the waitlist and contacts are gone,** with
  their routes and caps (`vouch-read`, `vouch-ask`, `door`,
  `door-city-<scene>`). The sweep empties the `cohort`, `contacts` and
  `vouches` stores, so relatives' phone numbers do not outlive the feature.
- **Reports have no withdrawal route and no receipt.** Filing answers
  `{received: true}`. Only the founder resolves a report, legacy six-character
  report ids included. Forget me clears old receipts (`niyyah.reports.v1`).
- **A couple sheet made before owner keys cannot be changed at all.** Its
  fallback, claiming the creator's gender, was the O6 hole.
- **No introductions, no `never-introduce`.** The founder's outcomes are
  `spoke-to-them`, `told-the-family`, `not-enough`, `no-action`.
  **`told-the-family` is the reporter's own family, at the reporter's request,
  after the founder has spoken to the reporter.** No family is contacted on
  the strength of a report alone, whatever it names: the couple code is shared
  (T13), so a report can come from the person it accuses, and a family told is
  the one thing here that cannot be untold (`docs/DECISIONS.md` Part 16).

## The principle: possession of a code is the only authority

No accounts, passwords or required email. A code is the whole credential, on
purpose: the cheapest way to keep a privacy promise is to hold little, and the
man who answers her eleven arrives through her with nothing to sign up for.

| What | Who holds it | What it grants |
|---|---|---|
| **Map code** (8; 6 if kept before 2026-09-23), on the Keep card and in `?map=` | Her, and anyone who sees it | Read, overwrite, move or delete her whole kept map |
| **Couple code**, in `?couple=` | Both people, and anyone either forwards it to | Answer once, read the joint, retire the sheet, report as either side |
| **Owner key** (10) | Her phone only, never the kept map | Change her side before he answers |
| **Install id** (8) | Her phone | Add to, or delete, her step count |
| **`FOUNDER_KEY`** | The founder | Every readout; the report queue; resolving a report |

So the work is keeping codes secret and bounded: eight characters from a
23-symbol alphabet with no look-alikes (O8); never on disk (T3), never cached
(T4), out of the address bar before any round trip (O2, T10); shape-checked,
then capped, then looked up on every route (row 3); "Niyyah will never ask you
for it" on the Keep card; "Change my code" when someone has seen it (T8).

**What it never grants:** authority read from data the caller wrote. Both
authorisation breaks the audit found were this, a snapshot (O1) and a stated
gender (O6). Only the code in the request, or a key the server minted, may
authorise anything.

**The limit.** The man who answers the eleven leaves no account, install id or
map code (row 16), so no block list can reach him. A report about him yields a
couple code and a side; the levers are social, and Trust says so.

## The hard choices

Where an easy decision would have bought an irreversible problem, or a promise
had no mechanism. First pass 2026-09-08; rows 17–21 from the board audit.

| Row | Easy | Expensive or irreversible later | Now |
|---|---|---|---|
| 1 | Mint a code and write | Silent overwrite of a member's map: at six characters, an even chance of a collision by ~14,300 kept maps | `mint` / `mintFree` write `onlyIfNew` and retry; five collisions are a 503 (`netlify/shared/code.ts`) |
| 2 | One overwritable report per `${code}-${side}` | The accused holds the code and overwrites the accusation; her second report destroys her first | Append-only: every report has its own id and key |
| 3 | Cap writes, leave reads unmetered | `DELETE /keep` was an unmetered destruction primitive; `GET /keep` an enumeration surface, a stranger's map every ~30 s at 100 requests a second against 50,000 members | Every code-gated read and delete has a bucket, spent after the shape check: `restore`, `forget`, `couple-read`, `couple-answer`, `couple-forget`, `safety-probe`, `progress-forget`. `vouch-read` (T1) went with the vouch |
| 4 | Refresh the progress record's year on every report | Marrying ends the reporting, so the success outcome left every readout at day 366 | A record that reached `married` never expires; the rest are swept at a year |
| 5 | Resolution is deletion | "Resolved" and "never happened" were the same byte | Resolving leaves `resolved/<id>`: reason, day, outcome; no code, side or words |
| 6 | Safety fails open with no founder key, like every readout | One misconfigured deploy publishes free text naming alleged harm, and it cannot be un-published | `requireFounder`; since row 21 every readout fails closed |
| 7 | Forget me skips the `reports` store | Its promise false where free text exists | Reversed 2026-09-23: taking reports was the attack (O1) and let a coerced wipe erase a threat (Coercion). Her words go when the founder resolves the report |
| 8 | Sell "reporting or **blocking** anyone" | There is no blocking of any kind in this repository | The copy is true; `tests/voice.test.ts` keeps the word out |
| 9 | `b % 23` in four copied generators | A, C and D 9% more likely, in the only secret | Rejection sampling, one generator per side (O11) |
| 10 | Parse the body, then measure it | `keep.ts` parsed any size before refusing it | `readJson` measures first (`netlify/shared/body.ts`) |
| 11 | `analytics.ts` signposted PostHog | — | `analytics.ts` deleted 2026-09-24 |
| 12 | Door entries never re-checked | — | The door went 2026-09-24 |
| 13 | No introductions record | — | No introductions exist; went 2026-09-24 |
| 14 | No schema version on any record | `export.ts` versioned the wrapper and nothing inside it, exactly backwards | Every member record carries `v`, stamped last (`netlify/shared/record.ts`), since 2026-09-11; the backup wrapper is version 3 |
| 15 | Vouch token of eight, no `onlyIfNew` | — | The vouch went 2026-09-24; report ids and owner keys are ten, report ids written `onlyIfNew` |
| 16 | The man answering the eleven has no identity | Unidentifiable and unblockable by construction | **Live Easy**, on purpose: the scarce side arrives through her, and anonymity is what makes that work |
| 17 | `POST /keep` with a supplied code wrote whatever the body carried | A code created on demand; a guessed code overwrote a stranger's map | Nothing under the code is a 404; something under it is written at the etag read, and never over a revision the phone has not seen |
| 18 | Key layouts carry no version | A positional parse breaks silently | **Live Easy, with a rule:** a reader of keys reads the value's `v`; a key change is a named migration |
| 19 | `couple side=second` and `DELETE /progress` uncapped | A guessed couple code froze her sheet and polluted the joint tally | Their own buckets, at the read-cap shape |
| 20 | The `never-introduce` stub named nobody | — | The outcome went with introductions 2026-09-24 |
| 21 | Every readout but `/safety` failed open | `/export` returns whole progress records | `isFounder` fails closed everywhere (`netlify/shared/founder.ts`) |

The restore link keeps the code in its URL because the link is the feature; a
header was declined because this product controls no log that would hold the
query string (`docs/DECISIONS.md` decision 12). Its six characters fell to O8.

## Threat model

STRIDE, 2026-09-23, against eight attackers: a curious stranger, a malicious
match, an abusive former partner, a spam bot, a scraper, an automated attacker,
someone holding a shared code or an old link. Ranked likelihood × impact ×
ease, each 1–3. Routes are `/.netlify/functions/<name>`, same-origin, no CORS.

| Route | Who | Bound | Gives back |
|---|---|---|---|
| `GET /keep?code=` | code holder | `restore` 600/h | her whole map, `no-store` |
| `POST /keep` | anyone | `keep` 300/h, 128 kB | a minted code, or a re-keep at the etag and revision read |
| `PUT` / `DELETE /keep?code=` | code holder | `forget` 600/h | change my code / forget: map, once key, her couple sheet retired; never a report |
| `GET /couple?code=` | code holder | `couple-read` 600/h | the joint and `answerFor`, never a side, `no-store` |
| `POST /couple` first / second | anyone / code holder | 200/h / 600/h, 8 kB | a code and owner key, once / the joint, once |
| `DELETE /couple?code=` | code holder | `couple-forget` 600/h | the sheet retired, a 90-day reporting window left |
| `POST /safety` | couple-code holder | `safety-probe` 600/h, then `safety` 30/h, 2 kB | `{received: true}` |
| `POST` / `DELETE /progress` | install-id holder | 1000/h, 4 kB / 600/h | nothing; no route returns one record |
| `POST /guide` | anyone | 400/day, 300/h, 32 kB, **fails closed** | a streamed reply; the system prompt is the server's |
| `POST /health` | anyone | 60/h, 256 bytes | a crash or chunk count |
| `GET /health`, `/couple` (no code), `/guide`, `/export`, `/progress`; `GET`/`DELETE /safety` | founder | bearer, constant-time, **fails closed** | counts (split cells floored at five), the report queue, the backup |
| `sweep` | the scheduler | weekly | not reachable over HTTP |

Sensitive flows: the kept map; the guide (identity, answers and the thread go
to Anthropic); the safety report (the one free text about another person);
Forget me; and `localStorage`, everything she wrote, in plaintext.

| # | Threat | L·I·E | State |
|---|---|---|---|
| T1 | `GET /vouch` had no cap: an existence oracle over map codes | 18 | Capped 2026-09-23; the route went with the vouch |
| **T2** | **Strings could silence the safety channel:** the 30/h reporting cap was spent before the pair was checked, so thirty made-up codes refused every real report for the hour | **18** | **Built:** every valid `POST /safety` spends `safety-probe` (600/h; the existence check is an oracle) first, and only a live pair, or a retired sheet in its window, spends the thirty. Burying reports takes thirty live couple codes an hour |
| **T18** | **A dropped signal led to a button that erases her data:** a lazy screen whose chunk never arrived fell to the error screen, whose "Start completely fresh" clears every key, the kept-map code included | **18** | **Built:** a failed chunk load gets its own screen, "This screen hasn't reached your phone yet… Nothing is lost", with one button, Try again (`src/lib/chunkError.ts`). The erase button stays on a real render error |
| **T3** | **The offline shell stored codes on disk:** responses keyed on the full URL left `?map=` codes in Cache Storage | **12** | **Built:** a navigation is cached by its path alone; the offline fallback reads `/`; `vite.config.ts` hashes the worker's source into its version, so the fix rotated the cache and `activate` deleted the old keys |
| **T4** | **Personal reads carried no cache directive:** the whole map, the joint and the founder's queue | **12** | **Built:** `Cache-Control: no-store` on `GET /keep` and `GET /couple`, 404s and 410s included ("not here" is wrong the day a code is kept), and on the founder's queue |
| T5 | The waitlist form had no honeypot | 12 | Added 2026-09-23; the form went 2026-09-24 |
| T6 | One person can spend the guide's day: its budget is per phone and the server's caps are global. Worst day ~$36 | 12 | Accepted; **founder: set the Anthropic console spend limit** |
| T16 | An attacker's loop also 503s real people on that route | 6 | Accepted: no identity, on purpose |
| T7 | A bot inflating the door's count | 6 | A per-city cap 2026-09-23; the door went 2026-09-24 |
| **T8** | **No revocation:** whoever saw her code keeps it; the only remedy was Forget me, which cost her the map | 6 | **Built:** "Change my code" (Stalking) |
| T9 | No baseline headers | 4 | Built as O7 |
| T10 | The query was stripped only after the restore fetch, so a code sat in the bar | 4 | Built: `src/main.tsx` strips it before any round trip |
| T11 | Client install ids drawn with `b % 23` | 3 | Built (O11) |
| T12 | The founder key's constant-time compare had no test | 3 | Built (O11) |
| T17 | Environment values are plaintext on the free plan | 3 | Accepted; rotation per `docs/OPS.md` |
| T13 | Possession is authority: answer first, delete the pair, report as either side | — | **By design** (row 16); rewriting *her* side was not, and is fixed (O6) |
| T14 | A guessed install id can add rungs to, or change the city and side on, a step count; `keep` accepted `[A-Z0-9]{6}`; the 18+ gate was client-only | 2 | P2. Alphabet closed (O8); age went 2026-09-24 |
| T15 | No per-actor record, so a false report looks like a true one | — | **By design:** a person reads every report |

## Findings O1–O11

An OWASP audit, 2026-09-23, that read the implementation rather than its
comments; three findings contradicted the comments beside them. Each was run
as an attack against the unfixed code (`tests/security-audit.test.ts`), fixed,
then mutation-tested: undo the fix, watch the test fail, restore it.

| # | Finding | OWASP | Score | Fix |
|---|---|---|---|---|
| O1 | Forget me erased the victim's safety reports | A01 | **27** | Below |
| O2 | A restore link took over her device | A07 | **18** | Below |
| O3 | Type-confused bodies crashed every handler: `JSON.parse('null')`, `{"code": 1}`, `through: ["constructor:x"]`; the guide spent its caps before validating | A03 / A09 | 9 | `readJson` (`netlify/shared/body.ts`) refuses anything but a plain object with `400 bad_json`; `normalise()` takes any type; `Object.hasOwn` guards vocabulary lookups; the guide validates before it spends a cap |
| O4 | `.env` not ignored; `.env.example` said an unset founder key fails open | A05 | 6 | `.gitignore` ignores `.env` and every `.env.*` except the example, which now says unset means closed. Rotate any key a local `.env` held before 2026-09-23 |
| O5 | The family vouch looked a token up before checking the body or spending the cap: a free existence oracle | A07 | 12 | Fixed 2026-09-23 (shape, cap, then lookup, the rule on every route); the route went 2026-09-24 |
| O6 | He could rewrite her side of the eleven | A01 | 12 | Below |
| O7 | Nothing stopped a page being framed, and "Forget me → Yes, delete everything" is two taps | A05 | 6 | `netlify.toml` on `/*`: `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `strict-origin-when-cross-origin`, camera, microphone, geolocation and payment off, one year of HSTS |
| O8 | Six-character codes: ~14% of kept maps a year to one patient script | A07 | 12 | Below |
| O9 | `postcss ≤ 8.5.22` (high) and `nanoid`, reached only through `vite` at build time | A06 | 3 | `npm audit fix`, lockfile only |
| O10 | Workflows ran with the default token scope | A05 / A08 | 2 | Every workflow runs with `permissions: contents: read`; none writes to the repository |
| O11 | Client install ids still drawn with `b % 23`, the bias row 9 had removed; the founder compare untested | A02 | 3 | One rejection-sampled client generator, `src/lib/code.ts`, tested with the three biased bytes (the once key drew the same way until 2026-09-24); the compare has near-miss tests and a pin: no early return, every byte compared |

**O1 — Forget me erased the reports filed against the person forgetting.** She
sends him the eleven and reports him. He keeps a throwaway map whose snapshot
names her couple code and `gender: 'woman'`, then forgets it; the cascade read
code and side from that snapshot and deleted her reports. The cascade in
`netlify/functions/keep.ts` now never touches reports. It reads only the couple
code, to retire a sheet anyone holding that code can retire anyway, and
`retire` refuses a code that never held one. The first fix (receipts, a
withdrawal route) went on 2026-09-24: a receipt is held by whoever holds the
phone (Coercion).

**O2 — a restore link could take over her phone.** An ex sent her `?map=X` for
a map of his own; the app wrote it over hers and adopted `X`, so everything she
kept afterwards he could read. Fetching no longer adopts: `adoptMap` does, on
consent (`src/lib/keep.ts`). The link opens `src/components/ConfirmRestore.tsx`,
which names whose map it is, says it replaces this phone's and cannot be
undone, and warns that someone else's map keeps what she writes under their
code. "Not mine" changes nothing; her own link on her own phone does nothing. A
code typed on Welcome adopts directly: she typed it. See Impersonation.

**O6 — the man she sent the eleven to could rewrite her side.** Re-posting
`side: first` was allowed for a gender the request stated. A new sheet now
returns an owner key once; her phone keeps it, and re-posting needs it,
compared with `sameSecret` (`netlify/shared/secret.ts`). A code nobody minted
is a 404; a sheet from before the key cannot be changed.

**O8 — six characters let a patient script find one kept map in seven, every
year.** Six routes answered "does this map code exist?" on their own caps,
2,400 guesses an hour, 21 million a year against 23⁶ ≈ 148 million: about 14%
of all kept maps a year at any size, and two of those routes destructive
(couple codes: about 15%). The caps bound the rate, not the fraction. **Chosen:
eight characters for everything minted from 2026-09-23**: 23⁸ ≈ 78 billion,
about 0.03% a year, shown as two groups of four (`ACDE FGHJ`). Six still works;
`CODE` enforces the alphabet. Tokens (report ids, owner keys, once keys) are
ten, never mistaken for a code. Three map-code buckets remain since 2026-09-24
(restore, forget, keep: 1,500 an hour), so these figures are an upper bound.

**The nineteen focus areas.** Fixed above: input validation (O3),
authorisation (O1, O6), entropy and enumeration (O5, O8, O11), secrets (O4),
dependencies (O9), error leakage through crashes (O3). Sound: founder routes
(six, all through `isFounder`); rate limiting (global by design, T16);
request size (measured before parsing, 256 bytes to 128 kB); CORS (no
`Access-Control-Allow-Origin`); logging (route names and errors, never a body
or a guide turn); sensitive data (T3, T4, T10). None found: injection (no SQL,
shell, `eval` or `new Function`; blob keys only from validated codes and closed
ids) and cross-site scripting (no `innerHTML`, `dangerouslySetInnerHTML` or
`javascript:` URL). Not applicable: CSRF (no cookies; the founder key is a
header; the dormant edge gate's Basic auth only gates viewing). Prompt
injection is contained by construction: the server owns the prompt, context is
closed sets or control-stripped and cut to 60–200 characters, no other
person's text reaches it, and the model has no tools. Replay is bounded and
writes are idempotent: etag-conditional keep and couple, one answer, progress
only adds, reports append-only, mints `onlyIfNew`.

## Abuse cases

Fourteen kinds of harm, walked through the product (2026-09-23): **P**
prevent, **D** detect, **R** respond, **C** cannot yet. There are no accounts,
profiles, photos, messages or location; what is left is codes that leak, links
sent wrongly or on purpose, the report, the founder, and life outside the app.

### Harassment

He answered her eleven and will not stop contacting her. He holds the couple
code, and one `DELETE /couple` made every report she tried a 404. **Built:** a
sheet that goes (either side, Forget me, the sweep) leaves `gone/<code>`, a
date and nothing else, and a report can be filed for ninety days
(`netlify/shared/sheet.ts`). **P** no channel between members. **R** the report
outlives the sheet; the help line. **C** contact outside the app.

### Impersonation: the restore screen

An ex keeps a map with *her* name and city in it and sends `?map=HIS-CODE`. The
O2 screen's name is his to write. **Built:** when the phone keeps a map, the
screen names its code, the one fact he cannot fake: "This phone already keeps
its own map, under HJKM 47QR. Your own link would carry that code — this one
is someone else's, whatever name it shows." On a new phone, "Only bring it here
if it is yours" stands. **D** `impersonation`. **C** who is holding a link.

### Stalking: an ex who knows her code

With her map code he can read her stage, her read on the new man, the eleven's
states and her city, and write over them. **Built: "Change my code"**
(`PUT /keep`; the Keep card: "Has someone else seen this code? Change it."). It
mints a new code, copies the map, re-reads the old one so a save made meanwhile
is carried, closes the old code as `moved` (410), then answers; the sweep
finishes or rolls back a move abandoned part-way. The couple sheet and reports
keep their own code. **C** her unlocked phone in his hand.

### Coercion

A husband-to-be or a relative stands over her: "Delete that app. Now." Forget
me used to withdraw every report the phone held a receipt for, so a coerced
wipe erased the only record of a threat. **Built:** Forget me never takes
reports (`src/lib/forget.ts`), the app keeps no receipt (`src/lib/safety.ts`),
and there is no withdrawal route. Sent is sent: "A concern you reported stays
with the founder until she has read it." A member who wants one dropped writes
in; the founder reads it first. **D** an urgent report fails the next 09:00
health run. **R** the help line. **C** coercion inside a family.

### The other cases

- **Catfishing, a married man posing as single:** nothing on Niyyah can be
  faked, and the eleven goes to someone she knows. The read's caution names
  the pattern: nobody in his life knows she exists (`src/lib/read.ts`). **D**
  that caution, `already-married`. **C** identity and marital status, by choice.
- **Blackmail:** the prompt treats pictures or messages held over her as a
  safety matter first; the offline `SAFETY_REPLY` says do not pay, do not send
  more, keep what they sent, tell someone (`src/lib/coach.ts`).
- **Screenshots:** the joint names nobody and states no belief. Answering "we
  agree" everywhere reveals the other's state per topic, a fact about a
  conversation both were in; accepted.
- **Ban evasion:** nothing to ban (row 8), and no discovery surface.
- **Malicious family:** answers on her phone are plaintext. The guide names
  force or pressure to marry as a safety matter and argues no fiqh.
- **False reports:** either holder files as either side (T13), and a false
  report looks true (T15). The joint carries `answerFor`, so a report from the
  answered-already screen is filed as the side that answered. **R** where
  there is a way to, hear the other side; one report with no way to reach
  anyone is `not-enough`.
- **Spam:** report flooding is closed (T2) and every public write is capped.
  **C** a patient script under every cap.

### Romance scams: money asked before the families meet

**Built:** the read's twelfth question, "Has {he} asked you for money — a loan,
a bill, a ticket, an investment? Before your families have met."
(`src/data/read.ts`). Weighted as nothing, because a scammer can look like the
most serious man she has met; "Yes" gets its own caution whatever else he has
shown: "that is the shape romance scams take… Send nothing more until your
families have met." It works for both sides, and a read kept before it is
still whole (`ADDED_LATER`). The prompt names the pattern; the offline voice
catches "loan", "invest", "crypto", "gift card", "western union". **C** money
already sent.

### Social engineering: the never-ask line

"I'm her brother; what's her number?" "Niyyah support: send your code." The
founder holds every map and is the target. The Keep card: "Niyyah will never
ask you for it." **The founder's rules:** never confirm to anyone whether a
person uses Niyyah; never send a code or a map to anyone but the member, at her
request, from the address she gave. **C** a caller who reaches her.

### Sabotage: a link that wiped a phone

`?fresh`, sent by anyone, cleared a phone but left the kept code, so the next
save wrote the emptied map over the kept one, and stayed in the bar to repeat.
**Built** (`src/lib/demo.ts`): on the live site `?fresh` and `?demo` act only
on a phone that holds nothing, and always leave the bar.

### Self-harm

The guide's evaluation (`docs/GUIDE-EVAL.md`) found none of the fourteen
covered it. A crisis reply now comes first in every voice, the crisis line
beneath; the prompt has the same rule. The offline voice also declines requests
to guilt, deceive, track or hide.

### Afraid to raise it

Found by the audit of how a couple disagrees (`docs/DECISIONS.md` Part 9,
2026-09-25). Nothing could hear the difference between "we disagree about
money" and "I can't bring money up because of how he reacts". The read had
no answer for it: "I end up feeling like the problem" reached "tell one
person" only alongside being kept hidden. The eleven handed her words to go
back into the conversation she could not safely have. The guide's safety
words had threats and violence, but not control: a phone checked, money
kept, who she sees, being shouted at, being afraid to raise things.

**Built:**
- The read's `hard` gains "I'm careful what I raise, because of how {he}
  reacts". It is her report of her own caution, never a claim about him. It
  sets a quiet line with the help line beneath, and words for one person who
  knows her in place of a question for him. With being kept hidden, it is the
  caution. It is not an alarm on one tap (Part 4). This is the decision 19
  clause 3 basis for a new answer.
- The eleven's result says that raising something unsafe is not a difference
  to work out, with the help line.
- The guide's safety words and prompt name control and fear.

**D** the eval cases `jealousy-03`, `abuse-04` and `abuse-05`. **R** the help
line. **C** anything she does not tell us; a report reason for control
(open question 10).

### Being made to marry

Her family and his have agreed; she is told she may not refuse. The people
applying the pressure are the ones every other reply here would send her to,
so "tell your mother" is the wrong sentence. **Built** (2026-09-26, Part 16):
`FORCE_WORDS` and `FORCED_REPLY` in `src/lib/coach.ts`, answered before the
safety reply and in every voice: her consent is hers; tell one person outside
the household today; the help line beneath; nothing decided for her.
Phrasings name the marriage ("not allowed to refuse him", "married off",
"against my will"), so a question about polygamy that says "not allowed to
refuse it" is not read as force. The eval's `abuse-06` requires the safety
answer. **P** none: the product cannot stop it. **D** the eval. **R** the
reply and the line. **C** the live Guide, until a before-and-after run.

### A report turned on a family

He holds the couple code, files a report as her, and names her father's
number in the free text. Trust used to say the founder "can speak to them,
or to their family". **Built** (Part 16): Trust says nobody's family is
contacted on the other side's word, and the rule above binds the outcome
`told-the-family` to the reporter's own family, at the reporter's request.
**P** the rule. **D** a person reads every report (T15). **C** a report that
is true and names a family the founder cannot reach.

## Help lines

`src/data/help.ts` lists, per country in the client's list, the emergency
number, one free round-the-clock line for abuse in a relationship, and a crisis
line, each checked against the service's own site (`HELP_CHECKED`). Somalia
gets the generic line: its numbers differ by region and source, and a number
that may ring nowhere is worse than none. `HelpLine` shows on the report screen
(both lines for `threats` and `sexual`), on the read's caution, and under any
guide answer about a threat, force, money or a crisis; the answerer on a couple
link, whose country is unknown, gets the diaspora's numbers. The guide never
states a number. Nothing is sent or logged. Re-check every entry once a year.

## Reports and the founder queue

- **Filing.** Either holder of a couple code, about the other side: the only
  pointer to a person the route accepts. A closed reason (`harassment`,
  `threats`, `sexual`, `already-married`, `impersonation`, `other`) and up to
  500 characters. Stored as `<code>-<side>-<id>`, id ten characters,
  `onlyIfNew`; never joined to a map, an install id or a tally. The screen says
  it is read within the week, not an emergency line.
- **Only the founder removes it.** No withdrawal, no receipt, untouched by
  Forget me and the sweep. `DELETE /safety` needs the key and an outcome, and
  takes a ten-character id or a legacy six.
- **Resolving** expunges her words and leaves `resolved/<id>`. The queue shows
  open reports in full, oldest first, and resolved ones as counts.
- **Alerts.** `watch.yml` reads `/health` every three hours. An open `threats`
  or `sexual` report fails the 09:00 run each day; a report open more than
  seven days fails Monday's.
- **Rules:** read an urgent report the day the alert fires; hear the other
  side before acting where you can; read a report before dropping it.

## Rate limits and caps

One counter per bucket per hour, with no identity, not even an IP
(`netlify/shared/limit.ts`): a circuit breaker on a script, not a limit on a
person. Each reads `<BUCKET>_HOURLY_CAP` per call (hyphens become underscores).
A refusal is `503 rate_limited`, counted as `cap.<bucket>`; an unreadable
counter lets the call through, except on the guide.

| Bucket | Route | Per hour |
|---|---|---|
| `keep` / `restore` / `forget` | `POST` / `GET` / `DELETE` and `PUT /keep` | 300 / 600 / 600 |
| `couple` / `couple-answer` | `POST /couple` first / second | 200 / 600 |
| `couple-read` / `couple-forget` | `GET` / `DELETE /couple` | 600 / 600 |
| `safety-probe` / `safety` | `POST /safety`: every valid attempt / a live pair | 600 / 30 |
| `progress` / `progress-forget` | `POST` / `DELETE /progress` | 1000 / 600 |
| `health` | `POST /health` | 60 |
| `guide` | `POST /guide`, the day first; **fails closed** | 300, and 400 a day |

## Not built, on purpose

Each would catch a case above and make Niyyah a place where people are
watched; a woman whose family must not know she is here is safer where nothing
is held about her. **Identity checks** (the system row 16 refuses; a document
store in a tight community is a target). **Reading what she writes** (the
safety words in `src/lib/coach.ts` are matched on her phone only to show a help
line). **Photos** (declined permanently, `docs/DECISIONS.md` (BETS), B19).
**Location, fingerprints, IP logs, a contact graph, a per-actor report record**
(`docs/PRIVACY.md`). **A lock or PIN**, only as strong as a PIN he can demand;
trigger: the first member who asks. **A quick exit**: its trigger, the door's
"someone might see you here" answer, went on 2026-09-24; it has none now.

## Accepted, later, and the founder's part

**Accepted:** possession as authority (T13); global caps (T6, T16); no
per-actor record (T15); plaintext environment values (T17); the code in the
restore link (decision 12); a member steering her own guide session.
**P2:** a full CSP (`script-src 'self'` with hashes for the guide pages' inline
script and styles; trigger: any feature that shows one person's text to
another); a `Content-Length` pre-check; a warning when `FOUNDER_KEY` is under
32 characters; workflow actions pinned by SHA; six-character maps moved to
eight only with her consent (trigger: the first 500 kept maps).
**Founder, not code:** set the Anthropic console spend limit (still unset in
`docs/OPS.md`); a `FOUNDER_KEY` of 32+ random characters, rotated with
`ANTHROPIC_API_KEY` as `docs/OPS.md` sets; make the repository private before
turning on the monthly backup artifact.

## Verification

The attacks are tests: `tests/security-audit.test.ts` (O1, O3, O4, O6, O7, O8,
O11), `tests/restore-link.test.tsx` (O2, Impersonation),
`tests/caps-function.test.ts` (T2, the caps), the keep, couple and safety
function tests (T4), `tests/service-worker.test.ts` (T3),
`tests/chunk-error.test.ts` (T18), `tests/abuse.test.ts`,
`src/lib/forget.test.ts` (Coercion), `src/lib/demo.test.ts` (Sabotage),
`tests/help.test.ts`, `src/lib/read.test.ts` (Romance scams). Each guard was
mutation-tested when built. **When a length changes, grep; do not trust the
suite:** after codes went to eight the suite was green, but one client still
took only the old token length, because each side's tests mocked the other.
