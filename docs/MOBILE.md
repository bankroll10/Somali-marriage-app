# Mobile craft (2026-09-20)

## Context

Every prior pass asked whether the interface explains itself
(`docs/NORMAN.md`), whether it says too much at once (`docs/LOAD.md`), or
whether it says the right thing at all (`docs/VOICE.md`). None of them asked
whether Niyyah *feels* like a phone app, or a desktop site shrunk to fit
one. This pass does, structurally only — nothing here touches copy
(`docs/VOICE.md` just finished that) and nothing here redesigns anything;
every fix is a class name, a prop, or an event handler, chosen so a device
that doesn't need it renders exactly as it did before.

`docs/NORMAN.md` had already found and fixed the sharpest version of this
problem — `BackButton` at 36px, "under every touch-target guideline there
is" — and named, but did not fix, "roughly fifteen further touch targets
between 31 and 39px." This pass picks that up, and three others the earlier
passes didn't look for at all: safe areas, form font-size (the actual cause
of iOS's zoom-on-focus), and unbounded textarea growth.

## Method

Chromium at 400×860 (and, for safe-area checks specifically, an emulated
390×844 notched-device profile) via `vite preview` — the convention every
prior pass used, `checkVisibility()`/`getBoundingClientRect()` over the
rendered page, no new tooling. What this can and cannot verify is stated
plainly in [Verification](#verification) below; some of it needs a real
iPhone, and that's named rather than glossed over.

## Findings, by inspection area

| Area | Disposition |
|---|---|
| **Safe areas** | Fixed. `index.html` opts into standalone mode (`viewport-fit=cover`, a translucent status bar) and nothing anywhere used `env(safe-area-inset-*)`. Every screen's first content sat 14–32px from the true top — clears nothing on a notched iPhone once added to the home screen. |
| **Tap targets** | Fixed. ~26 real actions rendered 16–29px tall as bare underlined text; Trust's privacy toggle was a 28px switch with an inert label beside it. |
| **Sticky elements** | Fixed. The two sticky top bars and three fixed/flex-pinned bottom bars ignored ancestor padding, so the safe-area fix had to live on them directly. |
| **Forms** | Fixed. Nine fields rendered under 16px (the actual trigger for iOS's zoom-on-focus); one field asked for the email keyboard on a field that also takes a phone number; two name fields had no `autoCapitalize`; three multi-field forms had no `enterKeyHint`. |
| **Keyboard behavior** | Reviewed, no action. `Coach.tsx`'s composer already uses `flex h-dvh flex-col` rather than `position: fixed`, which is the pattern that avoids fighting the on-screen keyboard. A `visualViewport`-resize hedge for a narrower iOS edge case was considered and set aside — see [Deliberately not changed](#deliberately-not-changed-and-why). |
| **Scroll position** | Reviewed, no action. `App.tsx`'s scroll-to-top-on-navigate and `Intake.tsx`'s scroll-to-top-on-advance are both already deliberate fixes from earlier passes; nothing new found. |
| **Focus** | Reviewed, no action. No modal exists, so no focus-trap risk applies. Nothing programmatically moves focus into a newly revealed field after a disclosure opens — consistent behavior, not a regression, and piecemeal `.focus()` calls without a full accessibility pass risk fighting VoiceOver more than helping it. Left for a dedicated accessibility pass. |
| **Text wrapping** | Fixed. Three rows put a variable-length label beside a fixed-shape badge with no wrap boundary; `Disclose`'s summary row already had the right pattern, so the other three now match it. |
| **Modals** | Reviewed, no action. None exist anywhere in the codebase; the full-page-navigation and inline-disclosure model already covers everything a modal would, and nothing in this audit needs one built. |
| **Long copy** | Reviewed, no action. Zero `truncate`/`line-clamp`/`whitespace-nowrap` anywhere on user-facing copy; `text-balance`/`text-pretty` already used correctly and extensively. |
| **Button reach** | Deliberately deferred — see below. |
| **Orientation** | Minimal fix only. No landscape layout exists anywhere to extend. |
| **Browser chrome** | Fixed. `maximum-scale=1.0` blocked pinch-zoom for no offsetting benefit once the 16px form floor lands; a dark-mode `theme-color` was missing. |
| **Loading states** | Fixed, one site. `ReportConcern`'s Send button gave no feedback beyond dimming while disabled. Two lower-stakes inconsistencies (`Vouch`'s text-only "Sending…", `VouchRow`'s "…") were reviewed and left — see below. |

## What changed

**Safe areas.** Four utilities added to `src/index.css`'s existing
`@layer utilities` block — `pt-safe`, `pt-safe-6`, `pt-safe-8`,
`pt-safe-sticky`, `pb-safe-bar` — each falling back to `0px` where the
platform doesn't report an inset. `pt-safe` went on eighteen screen roots
that had no top padding of their own; `pt-safe-6`/`pt-safe-8` replaced a
plain `pt-6`/`pt-8` on the five screens whose root already carried its own
rem value, so the fix *adds* to that padding rather than fighting it for
the same CSS property — a bare env()-only class on top of an existing
`pt-6` would have shrunk the padding to nothing on any device that doesn't
report an inset, which is the opposite of the goal. `ScreenHeader`'s sticky
branch and `Intake`'s hand-rolled sticky top bar got `pt-safe-sticky`;
`ShortMap`'s and `Intake`'s fixed CTA bars and `Coach`'s flex-pinned
composer (both its `locked` and live-form branches) got `pb-safe-bar`.

**Tap targets.** A new `TextButton` primitive in `ui.tsx` adds only
`min-h-11 items-center px-2` — no text size or color, since the ~26 call
sites span five different sizes and several colors and baking any of that
in would itself have been a visual change. Applied at every real text-link
action the audit found: `Door`, `Cohort` (Not now/Skip), `ReportConcern`
(the opener and Cancel), `Read`/`BeforeYes` (the Trust link and the
again-buttons), `Trust` (Keep it), `Profile` (close, Retake, See more),
`Ended`, `Ending` (both Close buttons), `home/FollowUp`, `home/StageBand`,
`home/WorkCard`, `Vouch` (both branches), `Couple` (both branches),
`Home` (cancel/Restart), `Coach` (Switch voice). The recognized chip
selectors (scene, relationship, hesitation-reason, stage, multi-select)
were left alone — they're single-tap selection controls the audit
correctly didn't flag. *Confirmed 2026-09-20 (docs/ACCESS.md): they clear
WCAG 2.5.8's actual 24px AA minimum on their own; the 44px floor here was
craft, not a compliance requirement.*

Trust's `Toggle` was worse than undersized: its 28px track was the *only*
clickable element in its row, and the title and description beside it —
what a person actually reads before deciding — did nothing. `role="switch"`
and the click handler moved up to the full-width row (`Control`); the
visual track (`Toggle`) is now purely decorative.

**Forms.** `text-[0.98rem]` → `text-[1rem]` on both `<select>`s in `Cohort`
and `Door`, the age and contact inputs, and three textareas
(`ReportConcern`, `Home`'s ask-guide, `Ending`'s advice) — nine fields that
were rendering under the size that makes iOS Safari zoom the viewport in on
focus. `Cohort`'s contact field asked for `inputMode="email"` on a field
whose own label accepts a phone number; changed to `"text"`, since no
single `inputMode` correctly serves both and `text` is the lesser wrong.
`Identity` and `Vouch`'s name fields got `autoCapitalize="words"`.
`enterKeyHint` added across `Cohort`'s, `Vouch`'s, and `RestoreMap`'s
multi-field forms (`"next"` on every field but the last, `"done"` on the
last), and `"send"` on `Coach`'s and `Home`'s chat composers, where Enter
already sends via existing `onKeyDown` — this only changes the on-screen
keyboard's own label for that key.

Four textareas grew with no cap at all — `Vouch`'s sentence,
`QuestionCard`'s free-text intake answer, `Ending`'s advice,
`ReportConcern`'s details — capped the same way `Coach`'s and `Home`'s
composers already were (`max-h-*` + `resize-none`). `QuestionCard`'s was
the real risk: paired with `Intake.tsx`'s fixed bottom bar, an uncapped
answer plus an open keyboard on a short viewport could have pushed
"Continue" out of reach.

`ReportConcern`'s Send button showed nothing while `state === 'sending'`
beyond `disabled:opacity-40` — added a `Spinner` and a `"Sending…"` label,
matching `KeepMap`'s existing pattern exactly. `RestoreMap`'s Check button
swapped to a bare spinner icon with no text; added `"Checking…"` beside it,
same pattern.

**Text wrapping.** `Read.tsx`'s and `Reflection.tsx`'s five-grounds list
put `{d.label}` in a bare span beside a fixed-shape `StateTag` badge, and
`Coach.tsx`'s quick-reply chip put `{s.label}` as a bare string child next
to a bare `→` glyph — in both cases, a long label wrapping to two lines
could leave the badge or arrow floating off-center. `ui.tsx`'s `Disclose`
summary row already wraps its label in `<span className="min-w-0
flex-1 text-pretty">` beside a `flex-none` chevron; all three sites now
match that shape.

**Browser chrome.** `index.html`'s `maximum-scale=1.0` blocked pinch-zoom
for everyone — a WCAG 1.4.4 regression with no offsetting benefit once
the 16px form floor above removes the actual reason a phone zooms on
focus. Removed. A second `theme-color` meta, scoped to
`prefers-color-scheme: dark`, stops Android/Safari's chrome-tinting
falling back to a mismatched default under system dark mode — the app has
one theme, this just makes sure the OS picks it up in both.

## Deliberately not changed, and why

- **Primary-CTA placement / content reordering.** `Welcome`, `Door`,
  `Home`, `Reflection`, and `Coach`'s mode-picker all put their primary
  CTA below a meaningful amount of copy — the one item on the user's list
  ("button reach") this pass does not fix. Moving a CTA higher means
  either cutting copy `docs/LOAD.md` already measured and chose to keep,
  or reordering a page `docs/PLACE.md` already scored against the
  stranger's five questions. Reopening either here would override two
  finished, considered passes without their frameworks — and "don't
  redesign the visual identity" argues the same way. If this is worth
  revisiting, it belongs in a `docs/LOAD.md`- or `docs/PLACE.md`-scoped
  pass, not this one.
- **A `visualViewport`-resize hedge on `Coach.tsx`'s composer.** The
  flex+`h-dvh` layout is already the right pattern — no `position: fixed`
  fighting the keyboard — and covers the overwhelming majority of cases.
  Adding a resize listener to hedge against a documented-but-unreproduced
  iOS Safari edge case is speculative, and Chromium's emulator can't
  validate a real on-screen-keyboard resize regardless (see
  [Verification](#verification)). Left for a real-device repro to justify.
- **A landscape layout.** No landscape-specific design exists anywhere in
  the visual language to extend; building one from nothing is a redesign,
  which this pass was explicitly told not to do.
- **`Door.tsx:129`'s ungated `grid-cols-2`.** Reviewed — holds two short
  labels ("A woman"/"A man"), safe down to a 320px viewport by its own
  math (~131px per cell). No fix needed.
- **`Vouch`'s text-only "Sending…" and `VouchRow`'s "…".** Both already
  give some feedback; bringing every async button in the app to
  pixel-identical treatment is cosmetic normalization the audit didn't
  show causes real confusion, and would have widened this pass beyond
  what it found broken.

## Verification

`npm run verify` (typecheck, lint, `tests/mobile.test.ts` — new, 61 files /
713 tests total — plus every existing test, none of which moved, since
nothing here touches pinned content) and `npm run build`, green after
every slice.

Walked in Chromium (400×860 for general screens; an emulated 390×844
notched-device profile for the safe-area checks specifically) against the
built app: `CSS.supports('padding-top', 'env(safe-area-inset-top)')`
returns `true` on that profile, confirming the mechanism actually
computes rather than silently no-opping everywhere; Profile's
`TextButton`-converted "Retake" measured 44.0px tall via
`getBoundingClientRect()`; `Door`'s community `<select>` and `Home`'s
ask-guide textarea both measured `font-size: 16px` via
`getComputedStyle()`; nine screens (Welcome, the read intro, the eleven
intro, Home, Profile, Trust, Reflection, Door, the guide's mode-picker)
loaded with no console errors beyond the test harness's own stubbed 503s
for the Netlify functions it deliberately doesn't run against.

**What this could not verify, and needs a real iPhone before this pass is
fully trusted:**

- Real `env(safe-area-inset-top/bottom)` values in **both** an ordinary
  Safari tab and after "Add to Home Screen" — the two modes report
  different insets (a normal tab's own chrome already occupies the area a
  notch would threaten, so the inset is `0` there; standalone mode is
  where it's real), and only a physical device exercises the standalone
  path at all. Chromium's device emulation approximates a notched
  profile's `env()` values but isn't running iOS Safari's actual
  standalone status-bar-overlay rendering.
- Real on-screen-keyboard behavior on `Coach.tsx`'s composer — whether
  iOS Safari's visual-viewport resize actually shrinks the `h-dvh` layout
  correctly is exactly the quirk this pass could not reproduce in a
  headless browser, which is also why the `visualViewport` hedge above
  was set aside rather than shipped unverified.
- Whether the 16px form-field floor actually suppresses iOS's
  zoom-on-focus in practice — Chromium doesn't zoom on focus at all, so
  this check is silent in the emulator regardless of pass or fail.
- Real pinch-zoom behavior after removing `maximum-scale` — confirms the
  accessibility fix actually restores zoom, and that nothing on the page
  breaks visibly under it.
