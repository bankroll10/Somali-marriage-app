# Niyyah against Norman — does the interface explain itself, 2026-09-18

## Context

`docs/VALUE.md` measured how much work a person does before value. This asks a
different question about the same screens: **when she is in front of them, do
they explain themselves?** Don Norman's six — affordances, signifiers, mapping,
feedback, constraints, and whether a person can build a working model of what
the product is doing without knowing how it is built.

The last one matters most here, because Niyyah's architecture is unusual — no
accounts, four separate stores, a six-character code instead of a password, a
guide with a live and an offline voice — and every one of those is a chance to
make the person learn the system instead of the system understanding the person.

**Observed, not assumed.** Read in code, then watched in Chromium at 400 px
with the functions stubbed. "The placeholder shows characters no code can
contain" and "it spends a network call to say the wrong thing" are things that
happened.

---

## What is already right, and was not touched

Half of Norman's six are in good shape, and a redesign pass that ignored that
would do damage.

- **No clickable non-buttons.** Every one of ~250 `onClick` handlers is on a
  real `<button>`. Not a single clickable `div`, `span` or `p` in the tree.
  That removes an entire class of affordance bug, and almost no codebase of
  this size can say it.
- **One focus rule covering everything.** `index.css` gives a gold outline to
  `:where(button, a, [role='switch']):focus-visible`. Zero specificity, so
  every hand-rolled button inherits a real focus ring without declaring one.
- **Scroll on navigation.** `src/App.tsx:49` resets to the top in a
  `useLayoutEffect`, before paint, so a new screen never flashes at the old
  offset. Most single-page apps get this wrong.
- **Return addresses where it counts.** `trustReturn` and `philosophyReturn`
  record where a person came from and send Back there.
- **A disabled button that names its own precondition.**
  `src/components/Identity.tsx:118` says which of the two things is missing,
  and switches text between them.
- **Destructive action, properly constrained.** Forget me is two taps with a
  named consequence and a labelled escape (`src/components/Trust.tsx`).
- **`prefers-reduced-motion` honoured globally**, and one correct
  `role="switch"`, and the one accordion (`Families.tsx`) with `aria-expanded`
  and a rotating chevron.

---

## CONCEPTUAL MODEL — the deepest finding, and the architecture causes it

**A person has to hold four storage models to use the privacy controls.**
Answers live on this phone. A *kept map* is a copy we hold, opened by a code.
Being *counted* puts a row on a door with a contact kept "apart from all of
it". A *vouch* is a fourth thing, written by somebody else under her code.
Trust explains all four correctly, and that it takes 355 lines of careful prose
is the finding: the four stores are an architecture, and the vocabulary is the
architecture surfacing.

**Verdict: acceptable, not a defect.** The honest simple model — *nothing
leaves unless you tap something that says it will* — is true, and Trust is the
audit trail for anyone who wants detail. Collapsing four stores into one would
be a privacy regression, not a usability win.

What was worth fixing is the one place the model became the person's homework.

### The code was the architecture as homework

"No accounts" is the right decision and the reason the product can promise what
it promises. Its cost is that she now holds a credential. The *entry* of that
code, on a new phone, was where the system stopped understanding the person —
three Norman failures in one interaction, all observed:

| Failure | What happened |
|---|---|
| **The signifier lied** | The placeholder read `ABC123`. The alphabet is `ACDEFGHJKMNPQRTWXY34789`, chosen so nothing can be misread off a cracked screen — **B, 1 and 2 cannot occur in any code** |
| **No forcing function** | `BOO12` was accepted: the field stripped punctuation only, so impossible characters and a wrong length both passed |
| **The feedback blamed her** | `BOO12` spent a network round trip and **1,476 ms**, then said *"No map found for that code. Check it and try again"* — so she looks for a map that could never exist |

And one worse case behind the same sentence: the server **deletes** a lapsed
map on the read that finds it expired, and the screen told her to check her
typing. She would retype a correct code at a map that no longer exists.

**Fixed.** `src/lib/code.ts` now holds the alphabet on this side too; the field
accepts only what a code can contain, as she types; the shape is checked before
anything is spent; and the four outcomes — not a code, no map, lapsed, could
not reach us — are four different sentences. `tests/vocab-sync.test.ts` holds
the client alphabet equal to the server's, the same way every other closed set
in this product is held in step.

---

## FEEDBACK — good where visible, false in one place, absent to assistive tech

**It said "Copied" when nothing had been copied.** `src/lib/share.ts` caught
the clipboard rejection and fell through to `return 'copied'`, so six screens
showed a tick and the word. A confirmation that is sometimes false is worse
than none, because it stops her checking. **Fixed:** `shareOrCopy` returns
`'failed'`, the two callers that confirmed on anything-but-cancel now exclude
it, and the guide's copy button — which set its confirmation unconditionally
after catching the same rejection — only sets it on a copy that happened.

**A refused clipboard was a tap that did nothing.** `ScriptCard` deliberately
said nothing, reasoning the words are on screen. They are, but the tap produced
no response of any kind. **Fixed:** it says so and points at the words.

**The whole app contained one live region** — the guide's thread. Every other
success and error was a visual change: a swapped button label that clears
itself after two seconds, a coloured paragraph. **Fixed for the transient
ones:** a shared `Announce` in `src/components/ui.tsx` renders an `sr-only`
`role="status"`, used by the script card and the kept map, and the save-failure
panel carries `role="status"`.

**The save warning arrived after the loss.** It rendered on Home and Profile —
which are *after* the sixteen-question intake, and the intake is where the
answers that would be lost are given. **Fixed:** it renders in the intake's own
header while she is still answering.

**Forget me showed a clean app as proof.** `forgetMe` returns which of the
three server deletes landed, and its own docstring says each is *"reported
honestly"*. The hook discarded the result and replaced the page regardless — so
a timed-out DELETE left her kept map on the server and showed her a stranger's
app as evidence it was gone. Against the one promise this product is built on.
**Fixed:** the page is replaced only when all three landed; otherwise the
screen names what is still held and says it is us, not her.

**Still open, named:** she is never told he answered her eleven. `couple.answered`
is polled and written, and its only reader is the analytics ladder. The single
most consequential event in the two-sided instrument produces no feedback
anywhere she will see it — she has to go looking. That is a *feature* decision
about notification, not a defect to patch, and it belongs with the door's
"we write to you" work.

---

## CONSTRAINTS — one unguarded wipe, and a data-loss path behind it

**"Start over from the beginning" was one tap**, on 12px text at 70% opacity,
directly under another link — and it cleared twenty-three pieces of state. The
*same* destruction through Trust required reading a paragraph and two taps with
a "cannot be undone" warning. The inconsistency was the finding.

Worse, and this is the one genuine data-loss path the audit found:
`clearProgress` removes only the saved state, so the remembered **code
survived**. `KeepMap` reads it straight from storage on mount — so a person who
started over was shown *"Your map is kept"* under a code whose map she no
longer had, and one tap on *Keep this map* re-keyed that code, **overwriting her
real map with the empty one, irreversibly.** Two mis-taps, no confirmation
anywhere on the path.

**Fixed:** Start over asks first, in the same shape Trust uses, and
`startFresh` forgets the code so the overwrite cannot happen.

**An option that looked disabled was not.** At a multi-select's maximum,
`QuestionCard` dimmed the unpicked options to 45% and left them tappable with a
handler that silently did nothing. **Fixed:** the tap is refused and
`aria-disabled` says so.

**A double-tap produced a blank screen.** `Couple.choose` awaited the network
write with no in-flight guard, so a second tap on the eleventh answer fired it
twice; the second returned 409 and landed on a phase with no render branch.
**Fixed:** guarded, and that phase now says his answers are in.

---

## AFFORDANCES AND SIGNIFIERS

**Fixed**

- **Two disclosures on the public front door had no affordance.** `Read.tsx`
  strips the native marker and added nothing in its place, so on a phone — with
  no hover — they were bordered cards visually identical to the static panels
  beside them. Both now carry a rotating chevron, the same one `Families.tsx`
  uses.
- **Every text field had a weaker focus ring than every button.** `fieldClass`
  set `focus:outline-none` plus a 5%-opacity forest ring: invisible, and
  because it carried a class it beat the zero-specificity global outline. Now
  the ring is visible and `outline-none` is gone.
- **The most-used control was 36 px.** `BackButton` sits on fourteen screens at
  `h-9 w-9`. Now 44.

**Named, not fixed** — real, and each is a judgment about a flow rather than a
defect:

- `Read.tsx` has 21 interactive elements and no ARIA at all; its eleven
  question screens are visual radio buttons with no `role="radio"`. It is the
  public front door, so this is the highest-value accessibility work left.
- The same `ArrowRight` means both "go to a new screen" and "expand in place".
- Static gold pills on Profile and Reflection are visually identical to the
  interactive chips on the same screens.
- "Skip" occupies the primary slot on two screens, and Hook's "Skip for now"
  starts the sixteen-question intake.
- Roughly fifteen further touch targets sit between 31 and 39 px.
- `Cohort`'s Count-me-in disables on six conditions with no message, one of
  which (`!identity.gender`) no control on that screen can satisfy.

---

## MAPPING — the phone's own back gesture leaves the site

`src/App.tsx` uses `replaceState` and never `pushState`, and there is no
`popstate` listener anywhere. The reasoning in the code is real: no manufactured
history means an eleven-question flow cannot be half-lost to a stray Back. The
consequence is also real — **from any of the 24 screens, at any depth, the
Android back button and the iOS back-swipe exit Niyyah entirely**, and because
the query is stripped before React mounts, the forward button returns to `/`
rather than to the `?couple=` or `?vouch=` screen she was on.

**Verdict: a considered trade-off with a named cost, not a fix for this pass.**
Wiring real history is the correct Norman answer and is not a high-confidence
change: it touches every screen transition, and the flow it would put at risk
is the one the product is measured on.

Three further mapping findings, named and not fixed for the same reason — they
change flows the five sessions are about to observe:

- `backHome` collapses six different origins into one destination, so
  read → the eleven → Back lands on Home, and a man who came in on his
  fiancée's link and tapped through to his own read lands on a marketing page
  he has never seen, with his couple result unreachable.
- The stage chips on Home carry `aria-pressed` like filters, and tapping one
  writes a permanent "a courtship ended" record and throws her into a
  full-screen ending flow.
- The guide's chat has no direct exit: the back chevron is wired to "switch
  guide", and leaving takes two taps through a screen inside a screen.

---

## What changed

| # | Fix | Norman principle | Where |
|---|---|---|---|
| 1 | The code field accepts only what a code can be; the placeholder is a real shape; four outcomes, four sentences; no round trip on a bad shape | Signifier, constraint, feedback | `src/lib/code.ts` (new), `RestoreMap.tsx`, `keep.ts`, `vocab-sync.test.ts` |
| 2 | "Copied" only when something was copied | Feedback | `share.ts`, `ScriptCard.tsx`, `Coach.tsx`, `BeforeYes.tsx`, `VouchRow.tsx` |
| 3 | A refused clipboard says so | Feedback | `ScriptCard.tsx`, `Coach.tsx` |
| 4 | Transient confirmations announce themselves | Feedback | `Announce` in `ui.tsx`, `ScriptCard.tsx`, `KeepMap.tsx`, `Home.tsx` |
| 5 | The intake warns while the answers are still being given | Feedback | `Intake.tsx`, `App.tsx` |
| 6 | Forget me reports what it could not delete | Feedback | `useNiyyah.ts`, `Trust.tsx` |
| 7 | Start over asks, and no longer leaves a live code that would overwrite a real map | Constraint | `Home.tsx`, `useNiyyah.ts`, `keep.ts` |
| 8 | An option that looks disabled is disabled | Constraint | `QuestionCard.tsx` |
| 9 | The eleventh couple answer cannot be double-submitted, and its already-answered state renders | Constraint, feedback | `Couple.tsx` |
| 10 | Both front-door disclosures carry a chevron | Signifier | `Read.tsx` |
| 11 | Text fields have a visible focus ring | Signifier | `ui.tsx` |
| 12 | Back is a 44 px target on fourteen screens | Affordance | `ui.tsx` |

**Not changed, and why:** browser history and the three mapping findings above
(they change flows the five sessions will observe, and `docs/TREE.md` item 3
commits to not moving navigation on inference); the four storage concepts (a
privacy regression); `Read.tsx`'s missing ARIA (worth a pass of its own, named
here so it is a decision); the guide's silent fall back to its offline voice,
which is a deliberate refusal to show error walls.

## How it was verified
1. `npm run verify` — 53 files, 641 tests, one of them new and holding the
   client code alphabet equal to the server's. `npm run build` green.
2. Chromium at 400 px, thirteen assertions: the placeholder is a real shape;
   impossible characters cannot be entered; lower case still works; a short
   code spends no network call and says what is wrong; not-found, lapsed and
   unreachable each read differently; Start over asks and backs out; the
   example disclosure carries a chevron; Back measures at least 44 px; the
   script card has a live region.

## Keeping this true
A fixed row is struck through with the date it went, never deleted. A named
finding stays named until it is fixed or a session says it does not matter.
