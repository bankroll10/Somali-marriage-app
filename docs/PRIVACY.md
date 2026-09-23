# Niyyah, by design — the data lifecycle, 2026-09-23

## How to read this

Every field and every event Niyyah collects, with the seven questions asked
of each:

- **Why** do we need it?
- **When** do we need it?
- **Where** is it stored?
- **Who** can read it?
- **How long** does it exist?
- **How** is it deleted?
- **Without it?** Could we create the same value without it?

Each row ends in a verdict:
- **keep**: needed as it is;
- **minimized**: kept, but less of it;
- **removed**: no longer collected;
- **retention fixed**: its stated lifetime is now enforced.

The rule for this pass was **minimize before encrypting; simplify before
adding another privacy explanation.** So every change below either collects
less, keeps it for less time, or lets Trust say less. No caveat was added
where the data could be removed instead.

`docs/LEARNING.md` is the charter: what may be learned, in four tiers. This
file is the ledger that holds that charter to the code. `docs/SECURITY.md`
and `docs/THREAT.md` cover who could take it.

**"The founder"** means one person holding Netlify credentials. In Netlify's
storage she can read every store except the device and Anthropic. "No
endpoint returns it" means no *URL* returns it; she can still open the store.
That is the honest limit of every row marked founder.

---

## 1. On her phone (`localStorage`, plaintext, this browser only)

| Field / key | Why | When | Who reads | How long | Deleted by | Without it? | Verdict |
|---|---|---|---|---|---|---|---|
| `identity.firstName` (free text, optional) | Addresses her on her own screens; she recognises her own map at a restore | Identity screen | Her | Until she clears it | Forget me, Start over, clearing the browser | Yes, and it is optional | keep |
| `identity.age` | An introduction needs an age | Asked at the door or on Profile | Her | Same | Same | No: the pool counts by age band | keep |
| `identity.gender / scene / country / reach` | Pronouns; which door; which pool | Identity, Situation, door | Her | Same | Same | No | keep |
| `answers` (fixed ids; `working-on` is free text) | The map itself | Intake | Her | Same | Same | No | keep |
| `mapHistory` (12 past maps) | "How your map changed" | Each retake | Her | Last 12 | Same | Partly, but it is hers and local | keep |
| `read`, `beforeYes` (ids, ISO time) | Her read of someone; her eleven | Those instruments | Her | Same | Same | No | keep |
| `couple`, `vouch`, `ending`, `endings`, `hesitated`, `began`, `followups`, `steps`, `guide.replies`, `trust`, `stage`, `situated`, `completed` | Each drives a screen | As used | Her | Same | Same | No | keep |
| `ending.advice` (free text) | Goes into a message she sends herself | The ending | Her | Same | Same | n/a | keep, **now phone-only** (C3) |
| `coachThreads` (free text, both sides) | Continuity with the guide | Each message | Her | **Last 40 per voice** (was unbounded) | Forget me, Start over | The guide reads 10 | **retention fixed** (R6) |
| `updatedAt` (ms) | Local bookkeeping | Every save | Her | Same | Same | Yes for the server: no longer sent (C1) | minimized |
| `niyyah.keep.code.v1` | Her map code, so she isn't asked for it | After a keep or an *adopted* restore | Her | Until forget | Forget me, Start over | No | keep |
| `niyyah.install.v1` | The random id her step counts sit under | First counted step, only if Count me is on | Her | Until forget | Forget me | No, if counting is on | keep |
| `niyyah.via.v1` | What kind of link brought her (one closed word) | Opening a link with `?via=` | Her; sent only inside step counts | Until forget | Forget me | Yes if Count me is off; harmless | keep |
| `niyyah.draft.v1` (ids only) | A half-finished read survives a reload | Each answer | Her | 30 days, then cleared | Finishing; Start over; Forget me | No | keep |
| `niyyah.entry.v1` | A couple or vouch link survives a reload | Opening one | Her | 24 hours | Leaving the screen; **Start over now too**; Forget me | No | keep |
| `niyyah.reports.v1` | Nothing, since 2026-09-23: a receipt on her phone let whoever held the phone withdraw her report (`docs/ABUSE.md`, coercion) | No longer written | — | Cleared from older phones | Forget me | **Yes** | **removed** |
| `niyyah.waitlist.queue.v1` | Retries a failed signup ping | A failed ping | Her | Until sent | Sending; Forget me | n/a | **minimized**: holds no contact (C7) |
| `niyyah.events.v1` | Nothing: a hallway-test log read only by a console helper | Every tap, to the millisecond | Anyone holding the phone | 300 events, for ever | Forget me | **Yes** | **removed** (C6): in memory for the session; an old diary is cleared on the next visit |
| Service worker cache | The app opens offline | Each visit | Her browser | Until the next deploy | A new deploy | No | keep (never holds a code or a `/.netlify/*` response; THREAT T3) |

## 2. The kept map (`maps`, keyed by her 8-character code)

| Field | Why | When | Who reads | How long | Deleted by | Without it? | Verdict |
|---|---|---|---|---|---|---|---|
| The snapshot (everything in section 1 except the guide's threads and follow-ups, her contact, her advice line, `updatedAt`) | Brings her back on a new phone; lets an introduction be made | She taps Keep; she joins the door; she asks for a vouch | Her, with the code; the founder in storage; `/pool` reads five fields (age, stage, practice, children, non-negotiables) into counts with a minimum group size of five | A year after the last keep | Forget me; weekly sweep; a read after lapse | No: this *is* the backup she asked for | **minimized** (C1–C3) |
| Timestamps inside it | Ordering and "days since" | As written | Same | Same | Same | Yes, below a day | **minimized**: cut to the day, client and server (C2) |
| Follow-up ids | Uniqueness within her list | As written | Same | Same | Same | Yes: they carried a timestamp | **minimized**: renumbered (C2) |
| `createdAt`, `expiresAt` (days) | Lapse, and the first day she kept it | Keep | Server | Same | Same | No | keep |

## 3. The door (`cohort`) and the way to reach her (`contacts`)

| Field | Why | When | Who reads | How long | Deleted by | Without it? | Verdict |
|---|---|---|---|---|---|---|---|
| Door key `country/scene/gender/reach/hook/code` | The public count, and which pool she is in | She joins the door | Public as counts only; the founder in storage | As long as her kept map | Forget me; weekly sweep when the map lapses | No | keep |
| `ledger` (which instruments she used) | The seriousness that got her counted | Join | Founder, in counts floored at five | Same | Same | Partly | keep |
| `contacts/<code>`: email or phone, city, country, day | Telling her when her pool opens | Join, if she gives it | **Founder, with her own credentials. No URL returns it** | As long as her kept map | Forget me; weekly sweep; `/pool?sweep=1` | No | keep, **now the only copy** (C7) |
| The founder's monthly `reach-<date>/` export | One vendor's loss must not lose the people waiting | Monthly, by hand | Founder | **Only the latest is kept** (was all of them) | By hand, the month after | No | **retention fixed** (R4) |

## 4. Step counts (`progress`, keyed by a random install id, not the map code)

| Field | Why | When | Who reads | How long | Deleted by | Without it? | Verdict |
|---|---|---|---|---|---|---|---|
| `first`: rung → day first reached | Does any of this help? (the North Star) | Each new step, while Count me is on | Founder, as distributions | A year after the last step; **kept for ever once `married`** (the outcome the product exists for) | Forget me; **weekly sweep** (was: only when the founder opened the readout) | No | **retention fixed** (R3) |
| `scene`, `country`, `gender`, `via` | Which city, country, side and link kind move | Same | Founder, floored at five | Same | Same | No | keep |
| `facts` (closed ids: grounds, read band, eleven counts, conversations, ending taps, ended reason, "not now" word, began, asked) | Which conversations get had, what decides a marriage | Same | Founder, floored | Same | Same | Each was argued for in LEARNING | keep |
| `/export` backup | The learning record survives one vendor | Monthly | Founder; GitHub artifact if enabled | **Skips lapsed records** (it checked no date); artifact **35 days** (was 90) | Artifact expiry | No | **retention fixed** (R3, R5) |

**Count me defaults to on.** This was the founder's decision (LEARNING calls
it "opt-out, not consent"), and it is kept. The switch now says "On unless you
turn it off", so the default is never a surprise.

## 5. The eleven (`couples`, `tallies`)

| Field | Why | When | Who reads | How long | Deleted by | Without it? | Verdict |
|---|---|---|---|---|---|---|---|
| Her sheet and his (closed states), creator side, owner key, days | Only the joint comes back to either | She sends it; he answers | Only the joint, to the code holder. The owner key goes back once, to her | **90 days, now enforced** (was: until someone opened it) | Either side's forget; **weekly sweep** | No | **retention fixed** (R2) |
| `tallies/joint` | How pairs come out, per topic | He answers | Founder | For ever | Cannot be: it holds no code | It is what the eleven teaches | keep (Trust names it) |

## 6. The vouch (`vouches`)

| Field | Why | When | Who reads | How long | Deleted by | Without it? | Verdict |
|---|---|---|---|---|---|---|---|
| Relationship, relative's first name | What her screens show: the only verification claimed | A relative vouches | Her screens; the founder | **As long as her map, now enforced** | Forget me; **weekly sweep when the map is gone** (was: never) | No | **retention fixed** (R1) |
| The relative's sentence and **phone** | The founder may call to confirm the vouch is real | Same | **Founder only**; no URL returns them | Same | Same | Not without losing the check that makes a vouch mean anything | keep, **now bounded** (R1) |
| `asked/<code>`, `token/<t>` | One link per map; the token opens nothing else | She asks | Server | Same | Same | No | **retention fixed** (R1) |

## 7. Safety (`reports`)

| Field | Why | When | Who reads | How long | Deleted by | Without it? | Verdict |
|---|---|---|---|---|---|---|---|
| Report: couple code, side, reason id, her words (≤500), day | The one free text about another person, so the founder can act | She reports | **Founder only** | Until resolved — forget me no longer withdraws it (`docs/ABUSE.md`, coercion) | The founder's resolution; by hand, at her request | No | keep |
| `gone/<code>` in `couples`: a day, nothing else | A report can still reach the founder after the sheet is deleted, forgotten or expired — the man she is reporting holds the code too (`netlify/shared/sheet.ts`) | The sheet goes | Nobody; `safety.ts` checks it exists | Ninety days | The weekly sweep | No: without it, deleting the sheet silenced her | **added** |
| Resolved stub: reason, day, outcome | The taxonomy of harm, joined to nobody | The founder resolves | Founder | For ever | Cannot be: no code, no side, no words | It is the only way harm can be counted | keep |

## 8. Leaving the site

| Recipient | What it gets | Why | How long | Without it? | Verdict |
|---|---|---|---|---|---|
| **Anthropic** (the guide, only if she asks it something and "Keep the Guide on this device" is off) | Her message, up to 10 earlier turns, and: **age range**, woman/man, city, timeline, practice, faith, family role, children, closeness, what feels safe, non-negotiables, hardest part, stage, one line each for a read and the eleven | The advice is specific to her map | Not stored by us. Anthropic's own retention is under its API terms | **Her name: yes, removed. Her exact age: yes, now a range** (C5). The whole identity and every free-text answer no longer leave the phone at all (C4) | **minimized** |
| **Netlify Forms** | **A city and a day** | Emails the founder when someone is counted | Until the founder deletes rows | Contact, country, reach, gender, hardest part: all removed (C7) | **minimized** |
| **Netlify** (hosting, functions, storage) | Everything in sections 2–7 | It is the server | As above | No | keep |
| **Function logs** | Route names and error objects; never a body, contact or message | Debugging | Netlify's log window | No | keep |
| **Links she sends** | `?map=`, `?couple=`, `?vouch=` carry a code or token; `?via=` a kind | The link is the feature | In the message she sent | No | keep (stripped from the address bar before any request; SECURITY O2) |

---

## Unnecessary collection — found and removed

| # | What | Value without it? | Now |
|---|---|---|---|
| C1 | `updatedAt` (ms) in every kept map: a last-seen time under another name | Restore never reads it | Stripped, client and server |
| C2 | Millisecond timestamps across the kept map, and follow-up ids built from them | Every use is in days | Cut to the day; ids renumbered |
| C3 | `ending.advice` in the kept map, while Ending promised "never does" | It is used only in her own messages | Stays on the phone |
| C4 | The guide's request carried the whole identity and every answer, including free text the server then dropped | The prompt reads nine answers and three identity fields | The client sends only those |
| C5 | Her first name and exact age, to Anthropic, on every message | The guide says "you"; a range carries the advice | Removed; age range |
| C6 | A 300-event local diary with ms timestamps, read by nothing | Hallway tests need only the session | Session memory; the old diary cleared |
| C7 | A second copy of her contact plus five fields at Netlify Forms, beyond Forget me's reach | The founder needs a notice, not a copy | A city and a day |

## Unnecessary retention — found and ended

| # | What lingered | Now |
|---|---|---|
| R1 | A lapsed map's vouch: a relative's name, sentence and **phone**, for ever | Swept with the map |
| R2 | Couple sheets past 90 days, unless someone opened one | Swept |
| R3 | Step counts past their year, unless the founder opened the readout; backed up regardless | Swept weekly; the backup skips them |
| R4 | Every monthly contacts export, "kept as the history" | Only the latest |
| R5 | The backup artifact: 90 days of step counts | 35 days |
| R6 | Guide threads on the phone, unbounded | Last 40 per voice |
| R7 | Three code comments promising the opposite of the code | Corrected |

## Linkability

- **Kept map ↔ couple sheet ↔ reports.** The map names her couple code
  (needed to bring her eleven back), and reports sit under the couple code.
  Reports can no longer be *deleted* through that link (SECURITY O1). The
  founder can still follow it in storage.
- **Kept map ↔ contact ↔ door**, all keyed by the map code. This is needed:
  an introduction needs a person. The third-party copy of the pair is gone
  (C7).
- **Step counts ↔ kept map.** They are not joinable by key or by name. They
  *are* joinable by content in a small city, which LEARNING already admits.
  Trust used to say "nothing that leads back to you". It now says what is
  true: no answer in her words and no name, under a code that is not her map
  code.
- **Clock joins.** Every store kept days, except the kept map, whose
  millisecond `couple.at` could be lined up against the sheet's `createdAt`.
  That is closed by C2.

## Sensitive combinations

- **The kept map** is the most sensitive record in the product: name, age,
  city, practice, children, closeness, non-negotiables, her `working-on` in
  her own words, the couple code and her relative's first name. It is
  minimized (C1–C3) but still readable by the founder. **This is where
  encryption comes next** (below).
- **The guide's context** was name + exact age + city + faith + children +
  closeness + non-negotiables + her message about a man, sent to a third
  party. The identifying pair is removed (C5).
- **Contact + city + gender + hardest part**, at a third party. Removed (C7).
- **A vouch**: relationship, first name and phone identify a family in a small
  community. It is kept, because it is the only verification. It is
  founder-only, and it now ends with the map (R1).
- **Step counts** in a small city: married + who + what decided it. Floored at
  five in every readout. The raw records go only to the founder's backup,
  which no longer holds lapsed ones.

## Promises — simplified, not added to

Trust made about 16 privacy explanations, **2,176 words**. It now makes
**~2,010**, pinned by `tests/load.test.ts` at a ceiling of 2,050. The drop
came from removing data, not from rewording:

- **Removed with C7:** the "second copy at the form service" paragraph, the
  second half of "The two things it cannot reach" (now one thing), and the
  same sentence on the door.
- **"Where your answers live":** 55 words claiming "no one at Niyyah can read
  them" became 31 that are true: *everything you answer stays on this phone;
  it leaves only if you tap one of the six things below.*
- **Made true by code, not by caveat:**
  - the vouch "goes when your map goes" (R1);
  - the eleven "expires after ninety days" (R2);
  - the contact "lives as long as your kept map" (R4, C7);
  - the advice line "never does" (C3).
- **Overstated lines removed rather than qualified:**
  - "nothing that leads back to you" (Trust)
  - "not us" (Welcome)
  - "This stays private to you" (Heart chapter intro)
  - "No one sees this but you" (Reflection, twice)
  - "Your answers stay on this device" (Read, Before you say yes)
  - "Kept: … nothing else" (KeepMap)
- **One line added:** "On unless you turn it off" on Count me, because the
  default must never be a surprise.

## Where local-first improved

- The event log never touches storage (C6).
- Guide threads are bounded (R6).
- The signup retry queue holds no contact (C7).
- Start over also clears a half-finished link's entry.
- The guide's request is assembled from nine fields on the phone rather than
  trimmed on the server (C4).

## Next — encryption, after minimization (P2)

The kept map is the one record the founder can still read whole. The path to
making that impossible:

1. **Move the pool's inputs into the door record.** `/pool` reads five fields
   of the kept map (age band, stage, practice, children, non-negotiables).
   Carry those five on the door entry at join instead.
2. **Encrypt the kept map in the browser** (AES-GCM, WebCrypto) under a key
   the server never sees.
   - The key travels only in the restore link's `#fragment`, which browsers
     never send.
   - The typed restore takes the code plus that key.
   - The server stores ciphertext under the code, as now. Forget me, lapse
     and the sweep work unchanged.
3. **Trust then says one sentence** about the kept map: nobody at Niyyah can
   read it.

**Trigger:** the first introduction, or 100 kept maps, whichever comes first.
It is not done now for two reasons. It changes the restore flow and the
pool's data source together. And minimizing first shrinks what would need
encrypting.

## Founder actions

- **Netlify Forms:** rows from before 2026-09-23 still hold contacts. Copy any
  you need into the store's export, then delete them from the form.
- **Contacts exports:** keep only the latest `reach-<date>/` folder.

## Verification

- **Red first.** Each rule was written as a test and watched fail on the old
  code before the fix:
  - sweep: orphan vouch, expired sheet, lapsed step count, married kept
    (`tests/sweep-function.test.ts`);
  - export skips lapsed records (`tests/export-function.test.ts`);
  - kept map: no ms, no `updatedAt`, no advice, on the client
    (`src/lib/keep.test.ts`) and the server (`tests/keep-function.test.ts`);
  - guide: no name, age range (`tests/guide-prompt.test.ts`,
    `tests/guide-disclosure.test.ts`); client body carries no free text
    (`src/lib/coach.test.ts`);
  - events never stored (`src/lib/analytics.test.ts`);
  - form ping carries no contact, and an old queue is cleaned
    (`src/lib/waitlist.test.ts`);
  - threads capped (`src/lib/storage.test.ts`);
  - Trust under its word ceiling, with no removed claim left
    (`tests/load.test.ts`).
- **Mutation check:** dropping the married exception from the sweep fails the
  sweep test.
- **Chromium walk** of the built artifact, with the same script run against a
  build of `main`:

  | Check | `main` | This branch |
  |---|---|---|
  | An old activity diary cleared on the next visit | no | **yes** |
  | Events written while tapping around | yes | **no** |
  | Trust mentions a second copy or the form service | yes | **no** |
  | Trust says Count me starts on | no | **yes** |
  | The guide's list says "your age range", not "your first name" | no | **yes** |
  | Forget me names one thing it cannot reach | no (two) | **yes** |
  | Visible words on Trust, every disclosure open | 2,093 | **1,933** |
- **Suite:** `npm run verify` passes.
