# What happens when it doesn't work — Niyyah's failure states, 2026-09-20

## Context

Ten audits have graded this product on the happy path. This one asks what it
does when the network drops, the store is down, Claude refuses, the tab closes,
or the same button is tapped twice — against one rule: **no important failure
should leave the user wondering whether something happened.**

Three sweeps — every client call site, every server response, every local
write — found roughly thirty-five real defects. They sort into four kinds, and
the first two are the ones the rule is about:

1. **The app asserted something false.** *"You're counted"* when the contact
   was sitting in a local queue nobody had read. *"He hasn't answered yet"*
   about a man who answered days ago. *"This link isn't working — it may have
   expired, or been copied wrong"* about a link that was perfect.
2. **Work was destroyed silently.** The guide streamed a real, tailored answer
   and then **replaced it** with the canned fallback when the connection
   dropped. His eleven answers lived in React state, so a reload cost all of
   them *and* the code.
3. **Crashes.** `limit.ts` opened its blob store outside the try, so a Blobs
   hiccup was an unhandled rejection and a platform 500 on every capped
   endpoint at once — the exact thing that file's own note says a rate limiter
   must never cause.
4. **Corruption.** The couple sheet's first side wrote unconditionally with no
   creator check, so anyone holding the six characters she texted him could
   replace her answers or destroy his.

**One design fault produced most of it, and the repository already knew.**
Every call collapsed a timeout, an offline phone, a 404, a lapsed record, a 409
and a 503 into one `null`. A screen holding a `null` cannot say anything true:
it guesses, or it says nothing. `restoreDetail` in `src/lib/keep.ts` is the one
honest failure surface in the product, and it is honest *because* it kept the
distinction its siblings threw away — its own docblock calls the collapse the
bug it was written to fix, and `restoreMap` throws it away again three lines
later. So the fix started in `src/lib/net.ts`, not in the copy.

---

## Every failure state, and what it costs

Asked of each: **what the user sees · what data is safe · what can be
recovered · what they should do · whether retry is safe.** "Was" is what
shipped before this pass.

| Failure | What they see now | Data safe | Recoverable | What to do | Retry safe? |
|---|---|---|---|---|---|
| **No signal at all when the app tries to open** (a home-screen launch, or any reload, with nothing reaching the network) | Since 2026-09-21, the app itself — from `src/lib/serviceWorker.ts`'s offline shell — with every row below then applying as it normally would. Was: the browser's own connection-error page, before a single byte of Niyyah ran; found in a link/discovery audit (`docs/LINKS.md`) after the manifest had promised home-screen installability with nothing behind it | Everything already on the device; nothing new is written offline | The shell, from the last successful visit — a first-ever visit with no signal still fails, honestly, since there is nothing to have cached | Get a signal, or wait | n/a |
| **Network unavailable** (any call) | The reason, per screen — never a guess. Was: one `null` for six different causes | Everything on the device | All of it | Try again | **Yes** |
| **API unavailable** (a function 503s) | *"That is us, not you"*, with the action still offered | Everything | All of it | Try again | **Yes** |
| **Claude unavailable** | *"We couldn't reach the guide just now, so that answer came from this phone. It cost you nothing."* Was: nine distinct failures — no key, 429, the daily cap, a safety decline, an outage — all rendered the same canned answer in the same bubble with the same glyph, and **each one spent a reply** | The thread | The question, by asking again | Ask again | **Yes**, and free |
| **Claude drops mid-answer** | The words that arrived **stay**, and *"That answer was cut off."* Was: the real answer was overwritten wholesale by the canned framework — she watched it being typed and then saw it vanish | The partial answer | The rest, by asking again | Ask again | **Yes** |
| **Storage unavailable** (private mode, full quota) | *"This browser isn't saving anything… so your answers will be gone when you close the tab."* Now on the read, the eleven, the couple sheet and the vouch form too — the four screens a stranger arrives on from someone else's link, and the only ones with a draft to lose. Was: 3 screens of 23, none of them these | Nothing persists; the session is intact | Nothing, after the tab closes | Finish in one sitting, or leave private browsing | n/a |
| **Expired code** (`?map=`) | *"That code has lapsed… there is nothing left to bring back. Nothing on this phone has been changed."* | The device's own map | Nothing under that code | Nothing — retrying is futile, and the screen does not suggest it | **No, and it says so** |
| **Expired couple link** | *"This link isn't working. It may have expired — they last ninety days"* — now only when the server actually says so | Her answers | Nothing | Ask her to send a new one | **No** |
| **Expired map behind a vouch link** | *"There is nothing left to vouch for… You copied the link correctly — it is the map behind it that is gone."* Was: *"This link isn't working. It may have been copied wrong"*, to a father who had copied it perfectly | What he typed, unsent | Nothing | Nothing; they can ask again | **No** |
| **Incorrect code** (typed) | *"A code is 6 characters, like ACDEFG — check for a missing one."* Unchanged: this was already the model | Everything | — | Retype | **Yes** |
| **Failed keep** | *"That didn't save — nothing is lost, your map is still right here."* And the device's code is dropped **only once a replacement exists**: it used to be forgotten first, so a timed-out retry left her with no code at all while that sentence was on screen | Map, answers, code | All of it | Try again | **Yes** |
| **Failed vouch** | *"That didn't go through. Please try again in a moment."* — with the form intact | Every field | All of it | Submit again | **Yes** (409 → already vouched) |
| **Failed couple link** (his send) | *"That didn't send — the link is fine and your answers are still here."* He stays where he is. Was: dropped on the dead-link screen with all eleven answers discarded | All eleven, in the draft store as he gives them | All of it | Tap the answer again | **Yes** |
| **Partial submission** (counted, contact not stored) | *"The way to reach you did not save — you are counted, but we could not write it down."* Plus the address to write to. Was: *"You're counted"* either way, because the delivery result went to `track()` and nowhere else | Her place in the count | The contact, by joining again | Join again, or email | **Yes** |
| **Browser refresh** on `?couple=` / `?vouch=` | Back on the screen the link opened, at the question he left. Was: the marketing page, with the code gone from the bar and his answers gone with it | His answers, for a day | The screen and the answers | Carry on | n/a |
| **Closed tab** mid-instrument | The read, the eleven and now **his** side of the eleven all resume; the vouch form does not | Answers | Answers | Pick up where you left off | n/a |
| **Unsupported state** (a map that will not rebuild) | Still a silent redirect to Welcome — **named, not fixed**; see below | Whatever is on the device | — | — | — |
| **Server timeout** | Ten seconds on every call, eight on the one nobody waits for, twenty to the guide's first character. Was: **no clock at all** on either waitlist post, so "Counting you in…" could spin for ever | Everything | All of it | Try again | **Yes** |
| **Rate limit** | Deliberately indistinguishable from an outage — `netlify/shared/limit.ts` says why, and that stands | Everything | All of it | Try again shortly | **Yes** |
| **Duplicate action** | Every write is guarded *and shows it*: the couple sheet's answer buttons now render the send they always guarded, the guide's send is disabled for the whole reply rather than only until the first streamed character, and the door's travel button no longer unmounts itself before its write returns | — | — | — | **Yes** server-side: the couple sheet, the vouch and the keep are now conditional writes |
| **Stale data** | Unchanged and still named: a re-opened read carries no date, and the door's count says "today" without one | — | — | — | — |

---

## The four that mattered most

### 1 · The guide deleted an answer it had already given

`Coach.tsx` wrote the streamed reply into the thread under a fixed id, then
settled it with `writeReply(reply.text)` — and on a mid-stream drop
`askCoach` falls through to the offline voice, so that call **replaced** the
real answer with the three-bullet framework. She watched a tailored answer
being typed out and then saw it vanish.

Underneath it, a second fault: `askCoach` can never return null, so
`onSpendReply()` was unconditional. The comment above it reads *"Charged only
once an answer actually exists. Spending up front billed the member for replies
that failed or fell back"* — describing a fix the code did not implement. Three
taps during an outage cost three of the twenty and then showed her the wall.

**Built:** `CoachReply` carries `live`. Streamed words are never overwritten;
the screen says the answer was cut off. A fallback costs nothing and says so.

### 2 · A woman was told she was counted when nobody could reach her

`joinWaitlist` returns `'joined' | 'queued' | 'unconfigured'`, and that answer
was passed to `track()` and nowhere else. `onJoined` fired identically in all
three cases. Meanwhile the server's own contact write sits in a try of its own
— correctly, so that being counted cannot fail because the list did — and
returned 200 with live pool numbers whether it succeeded or threw. The failure
was invisible to her, invisible to the client, and invisible in every readout,
because nothing returns that store.

`src/lib/waitlist.ts` states the rule this broke, at the top of the file:
*"Honesty rule: if no endpoint is configured we NEVER tell someone they've
joined."*

### 3 · The link was blamed for the network

`readCouple` and `answerCouple` returned `null` for a 404, a 410, a 503 and a
timeout alike, and `Couple.tsx` rendered all four as *"This link isn't working.
It may have expired — they last ninety days — or been copied wrong."* On the
eleventh tap of eleven, that discarded every answer he had given, on a link
someone else had sent him, for a two-second blip. The same sentence met a
father whose daughter's map had lapsed — something he cannot fix by checking
his typing.

### 4 · The limiter could take down what it protects

`capState` opened its store above its `try`. Seven call sites `await` it
outside their own `try`. So a Blobs hiccup was an unhandled rejection and a
platform 500 with a non-JSON body, across every capped endpoint at once —
against the note fifty lines up: *"A rate limiter that could itself take a
function down on a blob hiccup would be a worse bug than the one it exists to
prevent."*

---

## The line

Two things this pass deliberately did not do.

**It did not turn a check into a poll.** The couple and vouch checks failed and
then never ran again for the session, because neither effect's deps changed on
failure. They retry **once**, twenty seconds later, and then stop until she
opens the app again. `docs/FOGG.md`'s rule stands: no badge, no reminder, no
count of unfinished things.

**It did not make failure loud.** A rate limit still reads exactly like an
outage, because `netlify/shared/limit.ts` argues that a member should never
meet something shaped like a wall, and that argument survives this pass. The
guide's failure note is one grey line, not an error.

---

## Not in scope, and why

- **Server-side timeouts.** There are none anywhere in `netlify/`, and no
  timeout is configured on the Anthropic SDK. `docs/SCALE.md` ties this to a
  paid plan; it wants its own decision.
- **`progress.ts`'s read-modify-write race** — metrics only, and the file
  already documents the loss as acceptable.
- **`export.ts` ignoring expiry** — a founder-facing disagreement with the
  readout, not a user-visible failure.
- **The silent redirects to Welcome** when a map will not rebuild
  (`App.tsx`), and the blank render when `buildRead` returns null. Both are
  real and both are named in `docs/PLACE.md`; neither is a failure *state* in
  the sense this pass is about, and the second needs a screen designed rather
  than a guard added.
- **Dates on a re-opened read, and the door's hard-coded "today".** Stale data
  that does not say when it is from. Named here, unchanged.

---

## How this was verified

1. `npm run verify` — 59 files, 686 tests. `tests/fail.test.ts` is new: eleven
   guards, one per defect that shipped, read from the source because this
   repository has no jsdom.
2. `npm run build`.
3. **Chromium at 400×860**, `vite preview`, failure simulated at the route
   layer — 503, 404, 409, a 200 carrying `contactStored: false`, a delayed
   fulfil for the in-flight window, and a `Storage.prototype.setItem` that
   throws. Ten walks, **zero page errors**, each asserting both the new
   sentence and the absence of the old one:
   - the door reads *"Reading the count"* while asking, and *"that is us, not
     you"* when it fails — never the old sentence during a working request;
   - a 503 on the couple read says *"We couldn't check whether he has
     answered"* and offers **Check again** — never *"He hasn't answered yet"*;
   - a failed eleventh answer says *"the link is fine and your answers are
     still here"*, never *"This link isn't working"*, and **10 answers are in
     the draft store** afterwards;
   - reloading `/` after `?couple=` lands back on his sheet, not on Welcome;
   - a vouch link with the server down says *"We couldn't open this just
     now"* and **does not render the form**;
   - the guide says *"We couldn't reach the guide"* and *"It cost you
     nothing"*;
   - storage denied on the eleven says *"isn't saving anything"*.
4. One defect was found by the walk and not by reading: *"That is us, not he"*
   — a subject pronoun where the sentence needs the object one.

## What would falsify this

If nobody in the five sessions meets a failure state, this pass bought
insurance rather than value — though the 500 from a Blobs hiccup, the couple
sheet anyone with the code could overwrite, and the vouch token that survived
forget me were defects regardless of whether a session sees them. If a
participant reads *"We couldn't reach the guide"* and stops trusting the guide
at all, the honesty is costing more than the silence was, and that one line is
the first thing to revisit — it is the only place in this pass where saying
less was defensible. Record what happens in `docs/FEEDBACK.md`.
