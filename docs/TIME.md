# Niyyah — what survives thirty days without the founder

> MJ DeMarco's Commandment of Time asks a harder question than "is the site
> up." A static site with no founder behind it can stay up indefinitely. The
> real test is: of everything this product promises a real person, how much
> of it keeps being true if nobody is watching?

## The method

Eleven categories, each asked the same three questions against the code as it
actually is, not as the docs describe it:

1. **Does this run without anyone touching it**, the way the ladder, the
   backup, and the deploy pipeline already do?
2. **If it needs a human, how often, and what happens to the person waiting
   if that human is gone for a month** — a delay, a silent failure, or real
   harm?
3. **Was that human dependency a deliberate design choice** (the founder
   *should* be the one who reads a report, the way an auntie would) **or an
   accident of what got built first**?

Findings below are ranked by **frequency × operational burden × what a
30-day silence would actually cost a real person** — not by how interesting
the fix would be.

## The eleven, as the code actually behaves today

| Category | Runs without the founder? | What actually happens in 30 days of silence |
|---|---|---|
| **Onboarding** | **Yes, entirely.** Intake, map-building, and every entry link (`?via=`) are client-side or write to an anonymous store with no review step. | Nothing stops. This was already true before this pass |
| **Verification** | **Yes, by design.** The only verification is the family vouch (`netlify/functions/vouch.ts`) — a relative attests, under the map's own code, with no founder review in the loop | Nothing stops. Verification here is peer-to-peer on purpose; a founder review queue would be slower and less honest than the vouch already is |
| **Matching** | **Yes, for what exists.** The eleven and the read are both self-serve engines (`src/lib/beforeYes.ts`, `src/lib/read.ts`) with no human in the loop | Nothing stops. The *founder-run* matchmaker role in `src/data/plus.ts` ("A matchmaker in your corner") is real future labor, but it is priced and scoped for when a city opens — not running yet, so nothing to audit today |
| **Moderation** | **No — and until this pass, there was nothing to run at all.** Trust promised "players, liars and creeps removed, not warned" (`src/components/Trust.tsx`) against zero backing code | **Fixed this pass, partially.** `netlify/functions/safety.ts` gives the promise a channel; *acting* on a report is still a human decision, on purpose — see "What this pass deliberately leaves to the founder" below |
| **Reporting** | **No, until this pass.** There was no way for a member to name a concern about a specific real person; the only free-text field anywhere near a name went to the guide, which never leaves the device | **Fixed this pass.** One couple-code-scoped report, closed reasons plus one line of her own words, straight to a founder-only queue (Tier 4 per `docs/LEARNING.md`) |
| **Support** | **No.** A stuck member's only path is `mailto:salaam@joinniyyah.com` (`src/lib/waitlist.ts`), and Cohort.tsx tells her outright: *"we read every one"* | A promise made in the product's own voice, kept by exactly one inbox. Today's volume is near zero, so 30 days of silence costs little — but this line item's burden rises in lockstep with every other success in this document, and nothing here scales it |
| **Payments** | **N/A.** Nothing is sold yet (`docs/CONTROL.md`); `paidLater` in `src/data/plus.ts` describes prices, not a working checkout | Nothing to break. Revisit this file the day a payment processor is wired in — a stuck payment is a different, sharper kind of thirty-day silence |
| **Notifications** | **N/A, not a founder dependency.** There is no notification system for anyone, present or absent. A woman who sends her eleven has to return and check | This is a real product gap, but it does not become worse if the founder disappears — it is already the steady state. Out of scope for this pass, which asks what the founder's *absence* changes |
| **Fraud detection** | **Partially — and thinly.** `guide.ts` had no cap on call volume until this pass; `cohort.ts`, `vouch.ts`, and `couple.ts` cap body size but have no rate limit on repeat calls from the same source | **The guide's exposure is fixed this pass** (below). The other three are lower-value targets today — see "Identified, not built" |
| **Account recovery** | **Yes, entirely.** There are no accounts. A kept map is recovered by its own code (`netlify/functions/keep.ts`); `forget.ts` and `keep.ts` cascade a deletion the same way, with no founder step in either direction | Nothing stops. This was the right design from the start: recovery that needs the founder's help is recovery that fails at 2am for someone in a different timezone |
| **Match outcome tracking** | **Yes, entirely.** The ending screen, `facts.ts`, and the progress tally (`docs/OPERATING.md`) record what happened with zero founder involvement at write time | Nothing stops. *Reading* what was recorded is founder labor, but it is monthly by design (see `docs/OPERATING.md`), not something a 30-day absence breaks — it just means the next reading is late |

Seven of eleven were already founder-independent by earlier design choices —
the same pattern the Commandment of Control audit found in dependencies:
most of the exposure concentrates in a small number of places, and the rest
was already solved by choosing not to build accounts, not to build
messaging, and not to build a review queue for something peer verification
already does better.

## What actually breaks, ranked

The two real findings, ordered by frequency × burden × cost-of-silence —
not eleven; most of the checklist above was already clean.

### 1 · The live Guide had no cap on how often it could be called

`netlify/functions/guide.ts` is backed by `ANTHROPIC_API_KEY`, and until this
pass, calling it cost money with no ceiling anywhere in the code. The
client-side budget in `src/lib/budget.ts` shapes how a real member
experiences the guide, but it enforces nothing on the server — a script that
replays the same POST is invisible to it entirely. A founder present every
day would notice a cost spike quickly. A founder gone for thirty days would
not, and the first sign would be the bill.

**Fixed.** `netlify/shared/limit.ts` adds one shared, PII-free hourly
counter; `guide.ts` refuses new calls past `GUIDE_HOURLY_CAP` (default 300,
chosen well above any real hour this product has seen) with the same `503
rate_limited` shape the client already treats as "fall back to the offline
voice" — so a real member sees nothing different, ever, unless the cap is
actually being hit by abuse. No identity of any kind is attached to the
counter; it protects a number on a bill, not a person, which is the whole
point of keeping it out of `docs/LEARNING.md`'s territory entirely.

This is a circuit breaker, not a business rule — it exists so a bad thirty
days is *survivable*, not so a good one is shaped differently.

### 2 · There was no way to report a real, named concern about anyone

Every earlier privacy pass in this codebase (`docs/LEARNING.md`) drew one
hard line: no free text about anyone but yourself, anywhere, ever. That line
was correct and stays correct — except Trust has promised the opposite from
the start: *"Reports are meant to have real consequences — players, liars,
and creeps removed, not warned."* Nothing backed that sentence. A member who
had a bad experience with whoever answered her eleven had no channel at all,
founder present or not.

**Fixed, as the one deliberate carve-out `docs/LEARNING.md` already named.**
`netlify/functions/safety.ts` accepts a report only against a couple code
that actually exists — the same code from the two-sided eleven, so there is
no field anywhere for a name, a phone number, or a free-standing accusation
about someone the product never introduced. The reason is a closed id
(`src/data/safety.ts`, six of them); one line of her own words is allowed,
capped at 500 characters, because "what happened" sometimes genuinely needs
more than six categories can hold. It reaches the founder's queue only —
never a tally, never a signal to matching, never joined to a map. Resolving
one deletes it: a report is a live concern to act on, not a record to keep
once it has been.

## What this pass deliberately leaves to the founder, and why

Two things are unavoidably still founder labor, and both are named here on
purpose rather than quietly automated away:

- **Acting on a report is a human decision** — still true, and now recorded.
  Since `docs/HARD.md`, resolving one names an outcome from a closed list and
  leaves a stub behind, so "it is acted on" has evidence rather than a promise
  in front of it. What the founder can honestly do is unchanged: this product
  has no accounts,
  so there is no "ban" button that means anything — the only real levers are
  social ones: a call to the vouching family, a word to whoever runs the
  city once a matchmaker exists, a refusal to introduce someone again. That
  is what "real consequences" can honestly mean today, and it requires a
  person, not a queue-clearing script. Automating this further would mean
  either building an identity system this product has deliberately avoided,
  or pretending consequences exist that don't. Neither is worth doing to
  save the founder a phone call.
- **Reading every support email is still one inbox.** At today's volume this
  costs nothing. It is named here, not fixed, because the honest fix
  (a shared inbox, a canned-response system, a person other than the
  founder) is real infrastructure this product does not need yet — see
  "Identified, not built."

## Identified, not built — and the trigger that would change that

Matching the pattern `docs/CONTROL.md` set: naming a risk and choosing not to
spend on it yet is different from missing it.

- **No rate limit on `cohort.ts`, `vouch.ts`, or `couple.ts`.** Each caps body
  size, but none caps how often the same anonymous caller can hit them. At
  today's volume — a handful of real people — this is not a live risk, and
  `shared/limit.ts` from this pass is written generically enough to drop into
  any of the three in an afternoon. *Trigger, as written here: the first time
  a founder notices cohort or vouch counts moving faster than real signups
  plausibly explain.* **Built in the Scale pass instead** (`docs/SCALE.md`),
  on every public write including `keep` and `progress`, for a reason this
  audit did not have: the door became the unit that opens a marketplace, and
  a door whose writes are unbounded can be walked toward forty by a script.
- **No alert when a safety report is filed, or when the guide's hourly cap is
  hit.** Both are readable only by opening `/safety` or `/guide` by hand —
  exactly the founder-must-remember-to-check pattern this whole audit is
  about. A real fix (email or push on either event) needs an outbound
  channel this product does not have yet — see `docs/CONTROL.md`'s dependency
  list, which deliberately has no email/notification vendor in it. **Trigger:
  the day a paid Netlify tier or a transactional-email vendor is added for
  any other reason — piggyback this alert on it rather than adding a new
  dependency just for this.**
- **No support deflection (FAQ, canned replies, anyone but the founder).**
  Right for a product with a few dozen users. Wrong the day support volume
  and founder attention stop being the same order of magnitude. **Trigger:
  more than a handful of support emails in a week.**

## The one change to the operating loop

`docs/OPERATING.md`'s monthly hour is right for calibrating constants — doing
it more often turns a calibration loop into a dashboard, which is exactly
what that document warns against. A safety report is not a constant to
calibrate; it is a person who may be waiting. So the safety queue gets its
own, shorter cadence, added to `docs/OPERATING.md` directly: **check
`GET /safety` weekly**, independent of the monthly hour. A month is an
acceptable cadence for "should the eleven's weight move." It is not an
acceptable cadence for "someone reported a threat."
