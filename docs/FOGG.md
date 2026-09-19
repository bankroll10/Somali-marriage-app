# Niyyah against B = MAP — the eight actions, 2026-09-19

## Context

BJ Fogg's model says a behaviour happens when **motivation**, **ability** and a
**prompt** arrive at the same moment, and that when a behaviour does not happen
exactly one of the three was missing. The useful half of the model is the
second half: *raising motivation is the expensive move and usually the wrong
one.* Ability is cheaper, and timing is free.

That matters here more than in most products, because raising motivation is the
one thing Niyyah must not do. These are decisions about marriage. A product
that made someone keener to send the eleven, to join a pool, or to involve
their family would be doing harm. So this pass reads the model in one
direction only: **find the places where a person had already decided and the
product got in the way.**

Eight actions were audited, each on all three legs. Four came out sound and
needed nothing. Four had a real defect, and all four are fixed in this pass.

**What this pass explicitly did not do** is at the end, under *The line*. It is
not a disclaimer; it is enforced by `tests/fogg.test.ts`.

---

## The eight, scored

| Action | Motivation | Ability | Prompt | |
|---|---|---|---|---|
| **Finishing an instrument** | Peak — she is one tap from the thing she came for | **Broken.** Answers in component state; leaving destroyed all of them | Fine | **fixed** |
| **Asking the difficult question** | High at the result, lower on the day it must be said | High — the words are written out, one tap to copy | **The best in the product** | sound |
| **Sending the eleven** | High once she has her own result | One tap to the share sheet | On the result, where it belongs | sound |
| **Involving family** | Variable, and socially expensive | High — the sentences are written for her | On the map and the profile | sound |
| **Keeping a map** | Peak the instant the reading appears | One tap, no account, no email | **Nine hundred words below the peak** | **fixed** |
| **Joining the pool** | Built honestly by the count | **Five required fields, dead button, silence** | Gated on having a map | **fixed** |
| **Reporting someone** | Near zero at the one place it was offered; peak weeks later where nothing was offered | Four taps deep, and only after a completed two-sided eleven | **Promised on Trust, absent from Trust** | **fixed** |
| **Deleting data** | Spikes on distrust | Two taps, confirmed, reports what it could not delete | On Trust, where it belongs | sound — **but its guard was not** |

---

## The four defects

### 1 · Nine answers, and then the phone rang

`Read.tsx` and `BeforeYes.tsx` kept their answers in `useState`. Leaving either
one before the last question destroyed every answer given — silently, with
nothing on the way back in to say it had happened.

This is the clearest failure in the product under this model. At question nine
motivation is as high as it will ever be: she has spent ninety seconds and is
one tap from the thing she came for. Ability then drops to zero for a reason
that has nothing to do with her. And the product *knew* — `began`
(`src/data/instruments.ts`) recorded that she had started, and the next visit
greeted her as though she never had.

**Why it shipped now, having been deferred three times.** It is `docs/BETS.md`
B6, named again as severity 3 in `docs/NIELSEN.md` and again in
`docs/LOAD.md`, each time held with every other instrument change until the
five sessions. That gate was drawn around a category — "changes to the
instruments" — and this does not belong in it. **A resume is invisible to an
observed session by construction:** a person sitting with the founder does not
abandon the read and come back next week. It adds no question, changes no
question, changes no order, and alters nothing a session can see. The gate was
protecting the sessions from a change that cannot reach them.

**Built:** `src/lib/draft.ts`, and the offer to resume on the way into each
instrument — above the explanation, because a returning person has already read
it. Measured at 400 px: the read's offer moved from *below* the intro to 224 px
down the page, the eleven's from **910 px** — off the bottom of an 860 px
screen — to 426 px. Both resume at the first unanswered question, not at a
count, for the reason `resume` in `useNiyyah` already gives: a count skips a
real question for anyone who paused before the question set changed.

### 2 · The map result asks for the expensive thing first

`Reflection.tsx` put the door — five required fields and a way to reach her — at
the top, "right where the map has just said something specific about her", and
put **Keep this map** at line 428, below the mirror and the alignment.

That is exactly inverted. Keeping the map costs one tap, no account and no email,
and it protects what she has just earned. Joining the door costs five fields,
her contact details, and serves us. The cheap action that serves her was buried
past the fold; the expensive one that serves us held the peak-motivation slot.
Closing the tab before scrolling cost her everything, with no warning.

**Built:** the order swapped. Keep, then the door. Nothing was removed.

### 3 · Count me in, and nothing happens

`Cohort.tsx` switched the button off on five separate conditions — gender, city,
country, age, a reachable contact — and explained only the contact one, and only
after she had left the field. A person who had decided to join tapped a dead
button and was told nothing.

Motivation present, prompt fired, ability zero for an invisible reason. It was
`docs/NIELSEN.md`'s severity 2 and it is worse under this model than under that
one.

**Built:** the form names what is left — *"Still needed: your city, your age and
a way to reach you"* — and narrows as she fills it in. Not shown before she has
touched anything: an empty form listing five missing things is a scolding, not
help.

### 4 · A promise with no route behind it

Trust says, in the community promise: *"you can report a concern about them, in
your own words if you need to."* Trust offered no way to do it. The only route
in the product was at the foot of the joint sheet — reachable only after he had
answered, four taps deep.

Both legs fail at once. The prompt exists at the moment motivation is *lowest*:
immediately after a couple has successfully completed the eleven, which is a
good outcome. The moment motivation is highest is weeks later, when something has
happened — and at that moment there was no prompt anywhere she would look, on
the screen that had promised her one.

**Built:** the report route renders on Trust whenever a couple code exists,
directly under the paragraph that promises it. When there is no couple, nothing
appears — this product knows who someone has been in touch with in exactly one
place, and Trust already says so.

---

## The one that was sound, and whose guard was not

**Deleting data** scored well on all three legs and still produced the most
dangerous finding in this pass.

Forget me's promise is *"then clears this phone"*, and it is worth exactly as
much as `LOCAL_KEYS` in `src/lib/forget.ts` is complete. That list was written
by hand, and the test called `names every key the app writes` compared it to a
second hand-written list. Neither could notice a key added anywhere else.

Adding drafts added exactly such a key. The test would have stayed green while
half-answered questions about somebody survived a Forget me.

**Built:** the test now reads `src/` and fails if any `niyyah.*.v1` literal is
missing from `LOCAL_KEYS` (`tests/fogg.test.ts`). The next one fails in CI
instead of surviving on somebody's phone.

---

## Prompts that arrive before motivation

The brief asked for these specifically. **There is one**, and it is the report
prompt above. That is a better result than expected and worth recording rather
than padding:

- The door is gated on having a map (`Home.tsx`), or on having just read one
  (`Reflection.tsx`). Nobody is asked to join before the product has given them
  something.
- The follow-up waits three days before asking whether she had the conversation
  (`MIN_AGE_DAYS`, `src/lib/followup.ts`), asks once, and treats "not yet" as a
  real answer that closes nothing. A read is only ever re-offered after thirty
  days, because "a read re-taken every week would be a mood diary about him,
  and this product does not keep one of those about anyone."
- The guide is never pushed.
- The vouch is offered where her map has just said something specific about her.

The follow-up system is the best-designed prompt here and needed no change. It
is worth naming because it is the template: *write down what you told someone to
do, wait long enough that the answer could have changed, ask once, and accept
no.*

---

## The line

Fogg's model is the standard tool for building compulsion, and the brief was
explicit. What this pass refused, and what enforces the refusal:

- **No badge, no count of unfinished things, anywhere.** A draft is read on the
  way into an instrument and nowhere else. `tests/fogg.test.ts` fails if any
  other file imports the draft module — so a future "you have 1 unfinished
  read" on Home cannot be added without deleting a test that says why not.
- **No reminder and no notification.** If she never comes back, the product
  never mentions it.
- **Drafts expire after thirty days** rather than being kept indefinitely as
  re-engagement material. A read half-answered a month ago is about a person she
  may not be speaking to, and offering it back would be worse than losing it.
- **Drafts never leave the device.** Their own key, deliberately outside the
  kept snapshot, so Trust's account of what leaves the phone stays true without
  changing a word — and so the most ambiguous thing this product could hold is
  held in one place only, and let go.
- **Nothing here raises motivation.** Every change removes an obstacle or moves
  a prompt to where a decision was already made.

## What would falsify this

- If drafts are created often and resumed rarely, the instruments are too long
  and `docs/EXPERIMENTS.md` A1 is the real question — resume is a plaster.
  Watch `began` against the completion rungs, which is the experiment that
  already exists.
- If the door's "still needed" line appears and people still do not finish, the
  cost is the contact detail, not the clarity, and `docs/GAPS.md`'s "not now"
  reasons are where the answer is.
- If a report is never filed through Trust, the route was not the obstacle.

All three are observable in the five sessions and in the readout. Record what
happens in `docs/FEEDBACK.md`.
