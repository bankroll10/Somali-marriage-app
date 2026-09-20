# A strong accessibility baseline (2026-09-20)

## Context

No prior pass asked this question directly. `docs/NORMAN.md` fixed
affordances and signifiers; `docs/MOBILE.md` fixed safe areas and touch
targets; `docs/VOICE.md` fixed what the product says. This pass asks
whether a keyboard-only or screen-reader user can actually use it — semantic
structure, names, keyboard operability, focus, contrast, motion, and
color-independence — against WCAG 2.1 AA as the working bar. Structural and
behavioral only, like `docs/MOBILE.md`; no copy changed except two new
sr-only strings and the accessible names this pass had to add where none
existed.

Three parallel audits (semantic HTML/headings/ARIA/labels;
keyboard/focus/dynamic-text/error-announcements;
contrast/touch-targets/motion/color-independence) found a consistent
pattern: the product's own conventions were usually right where they existed
— `aria-pressed` on chip selectors, `role="status"` on some errors,
`Announce` for some confirmations, `role="checkbox"` on the one place that
had it — and simply hadn't been applied everywhere the same shape of problem
occurred. Very little here is a new pattern; most of it is the existing
pattern, applied to the sites that were missed.

## Findings, by inspection area

| Area | Disposition |
|---|---|
| **Semantic HTML** | Fixed. Two homogeneous card lists rendered as `<div>`s a few lines above the identical `creed` list correctly rendered `<ul>/<li>` in the same file; matched. Zero `onClick` handlers were found on a non-interactive element anywhere in the app — a genuinely clean result. |
| **Heading hierarchy** | Fixed. `Intake`, `ShortMap`, the guide's active chat view, and the loading screen had no heading at all; three of Home's visually-styled section labels were `<p>` where a heading belonged. |
| **Labels** | Fixed. Three textareas (the guide's chat input, the safety-report details box, the intake's reused free-text field) had only a `placeholder`, which is not an accessible name. |
| **Screen-reader descriptions** | Fixed. Six chip pickers sat under a visible label with no `aria-labelledby` connecting the two, unlike every structurally identical picker elsewhere in the app. |
| **Keyboard navigation** | Reviewed, no action. Every interactive element in the app is a native `<button>`, `<a>`, `<select>`, or `<input>` — confirmed by reading all ~170 `onClick` sites. `Disclose` is a genuine native `<details>`/`<summary>`. Nothing here needs a hand-rolled keyboard handler. |
| **Focus visibility** | Reviewed, no action. One global `focus-visible` rule already covers `button`, `a`, and `[role='switch']`; the one `outline-none` in the codebase is correctly paired with a replacement ring. Text fields' own focus ring is separately visible. Nothing found needing a fix. |
| **Focus management** | Fixed. Nothing moved focus on a screen change or a local phase change; a screen-reader or keyboard user got no cue that content had changed. |
| **Contrast** | Fixed. Five real text/background pairs — the most-used text color in the app, every error message, a form field's own border, its placeholder text, and the brand's gold used on both light and dark surfaces at once — failed WCAG AA. |
| **Touch target size** | Reviewed, no action. `docs/MOBILE.md` already brought every real action to a 44px floor. The remaining ~30px chip selectors clear WCAG 2.5.8's 24px AA minimum on their own; the 44px bar elsewhere in the app is AAA-level craft, not an AA requirement, and extending it to every multi-chip row risked the compact layout those rows depend on. |
| **Reduced motion** | Fixed, one gap. `src/index.css`'s blanket rule already zeroes every CSS animation and transition; nothing gated the five places the app drives a `scrollTo({ behavior: 'smooth' })` from JavaScript, which `prefers-reduced-motion` has no effect on unless something checks it. |
| **Dynamic text** | Fixed, alongside error announcements below. The guide's streaming reply was already correctly wrapped in `role="log" aria-live="polite"`; the "thinking" indicator had no accessible name, so a waiting screen-reader user got no cue at all — left as a smaller, lower-stakes gap (see below). |
| **Error announcements** | Fixed. Five clipboard/share confirmations swapped a button's own text with no live region; five comparable submit-error messages lacked the `role="status"` their siblings elsewhere in the same screens already had. |
| **Form validation** | Fixed. Two fields showed a validation error as visible text with nothing connecting it to the field — one had `aria-describedby` but no `aria-invalid`, the other had `role="status"` but no `id` for the field to point at. |
| **ARIA usage** | Fixed, throughout the above — every addition matched an ARIA pattern already correct somewhere else in the app (`role="radio"`/`"checkbox"` next to `Identity`'s existing adult-confirmation checkbox; `role="group"`/`"radiogroup"` next to the six pickers that already had it). Nothing new was invented. |
| **Color-independent meaning** | Fixed, one real gap; everything else already correct. The single most-used interactive pattern in the product — the "big card" single-select behind every intake question, the read, and before-you-say-yes — exposed its selected option only as a color change and an `aria-hidden` checkmark. Every other color-conveyed state in the app (the ledger's done/not-done, the toggle's on/off, `StateTag`'s thin/steady/strong) already pairs the color with a label, icon, or shape difference. |

Two areas from the brief mapped onto findings covered above rather than
needing their own section: **dynamic text** is the guide's streaming reply
and the "thinking" indicator, both under [Deliberately not
changed](#deliberately-not-changed-and-why); **screen-reader descriptions**
is the label and group-semantics work above.

## What changed

**Structure.** `Philosophy.tsx`'s `bridges` and `principles` lists move from
`<div>` to `<ul>/<li>`, matching its own `creed` list two sections later.
`Intake`, `ShortMap`, the guide's active chat view, and the loading screen
each get a real `<h1>`/`<h2>` (the loading screen's is `sr-only`, since the
visible status text remounts every 750ms and can't itself carry a heading
without stealing focus back from under a screen-reader user every cycle).
Home's "Since last time", "Your work", and "Where you are" section labels
move from `<p>` to `<h2>`. `App.tsx`'s screen-swap effect now moves focus to
the new screen's topmost heading — extracted into a shared hook,
`useFocusHeading`, and used again locally in `Vouch.tsx`, whose seven phases
are local component state the app-level effect can't see. Six screens
without a `<main>`/`<header>` pair at all get one; the crash screen gets
`role="alert"`.

**Names and selection state.** Three textareas that had only a `placeholder`
get a real accessible name. Six chip pickers get `role="group"`/`"radiogroup"`
with `aria-labelledby`, matching the six that already had it. The "big card"
single-select — `QuestionCard`'s `OptionRow` (backing every intake question),
`Read.tsx`'s and `BeforeYes.tsx`'s option buttons, `Identity`'s gender
chooser, `ReportConcern`'s reason picker — gets `role="radio"`/`"checkbox"`
and `aria-checked`, so a screen reader can tell what's selected, not just a
sighted user via color.

**Announcements and validation.** Five clipboard/share confirmations
(`VouchRow`, `InviteRow`, `FollowedThrough`, and `Ending`'s two shares) get
an `Announce`, matching `ScriptCard`'s and `KeepMap`'s existing correct use
of it. Five submit-error messages get the `role="status"` their siblings
already had. `Cohort`'s contact field gets `aria-invalid`; `RestoreMap`'s
error paragraph gets an `id` its field can point at via `aria-describedby`,
plus `aria-invalid`.

**Contrast.** `text-muted` (the single most-used text color, 32 files),
`text-clay` (every destructive/error message), the form field's own border,
and its placeholder text all failed WCAG AA on cream; darkened, in the case
of `muted` and `clay`, by an amount close enough to the eye that nothing
reads as a different color, only a more legible one. `gold`/`gold-soft` were
the worst by far — built for the dark forest-deep surfaces where they
already pass comfortably, and used just as often as a kicker label on cream,
where they nearly disappear. Rather than compromise the shade that works on
dark, a new `gold-ink` token takes over at every light-background site,
classified by hand against each site's real ancestor background rather than
a blanket rule.

**Reduced motion.** A new `scrollBehavior()` helper checks
`prefers-reduced-motion` before every JS-driven smooth scroll; five call
sites (three in `Intake`, two in `Coach`) now use it instead of a literal
`'smooth'`.

**Language.** `src/data/somali.ts`'s Somali sentence and English gloss move
from one concatenated string to two fields, so the three render sites can
wrap only the Somali span `lang="so"` — the printed guide
(`src/lib/guidePages.ts`) already did this correctly with its own separate
copy of the line; the in-app sites couldn't, because the data shape made the
two languages impossible to pull apart.

## Deliberately not changed, and why

- **Chip-selector touch targets.** Already covered above — they pass WCAG
  2.5.8's actual AA minimum (24px); the 44px floor elsewhere is craft, not a
  requirement, and applying it here risked the compact multi-chip rows the
  layout depends on. If this is worth revisiting, it belongs in a
  `docs/MOBILE.md`-scoped pass with its own visual-character tradeoff, not
  this one.
- **`TypingDots`' missing accessible name.** The guide's "thinking" indicator
  gives a screen-reader user no cue that a reply is coming. Real, and
  smaller than everything above: it's a few seconds of silence inside a
  conversation already correctly marked `role="log" aria-live="polite"`, not
  a missing confirmation or a silent failure. Left named rather than folded
  into this pass's scope; an `aria-label` on `TypingDots` or a short
  `sr-only` string ("The guide is replying") is a one-line fix for whoever
  picks it up next.
- **The guide's streaming reply re-announcing on every chunk.** `role="log"`
  without `aria-atomic="true"` on a node whose text mutates in place, rather
  than growing by discrete additions, means a screen reader's behavior here
  is implementation-dependent — it may announce once at the end, or several
  times as the reply grows. Changing this risks breaking the deliberate
  design (Coach.tsx's own comment) that scrolls a finished reply's first
  line into view rather than jumping to the bottom, and needs a real
  screen-reader test to get right, not a source-level guess. Named, not
  guessed at.
- **A full keyboard-navigation audit beyond "is everything a real
  element."** Confirmed clean at that level; things like a logical tab order
  across a whole 24-screen flow, or skip links for a long list, would need
  an interaction walk this pass's Chromium checks can approximate but not
  fully replace (see [Verification](#verification)).

## Add automated accessibility tests where useful

`tests/a11y.test.ts` (new, alongside `tests/mobile.test.ts` and
`tests/voice.test.ts` in the same source-scan style — no jsdom, matching
every other test in the repo) pins:

- the focus-on-screen-change mechanism and its use in `App.tsx` and `Vouch.tsx`;
- every heading, landmark, and list-tag change found above;
- every unlabeled field's new name, and every chip picker's new group semantics;
- `role`/`aria-checked` on every selection-state site;
- `Announce` usage at the five confirmation sites, and `role="status"` at the five error sites;
- the two form-validation wirings;
- **computed WCAG contrast ratios**, read from the live hex values in
  `src/index.css` rather than hard-coded numbers, so a future edit to a
  color can't silently drift back under the line;
- which sites keep plain `gold`/`gold-soft` (the dark ones) and which moved
  to `gold-ink` (the light ones), plus a regression guard for the
  regex-ordering bug this pass found and fixed while classifying them;
- `scrollBehavior()` used at all five smooth-scroll sites, with no literal
  `'smooth'` remaining;
- the Somali/English field split and the `lang="so"` wrapping at all three sites.

## Verification

`npm run verify` (typecheck, lint, `tests/a11y.test.ts` — 62 files / 742
tests total, plus every existing test, none of which moved) and `npm run
build`, green after every slice.

Walked in Chromium at 400×860 against the built app: after a screen change,
`document.activeElement` is the new screen's `<h1>` (confirmed on the
Welcome-to-Identity transition); a `role="radiogroup"`/`role="radio"` set
renders correctly with `aria-checked="false"` on an unanswered
before-you-say-yes question; the toggle row's `role="switch"` and its
enlarged hit area render on the DOM; `gold-ink`'s computed color is exactly
`rgb(133, 104, 46)` (`#85682e`) on a real kicker label; the Somali
`lang="so"` span renders with the correct text and attribute. No console
errors beyond the harness's own stubbed 503s for the Netlify functions it
deliberately doesn't run against.

**What this could not verify, and would need a real assistive-technology
pass to confirm:**

- Actual screen-reader output (VoiceOver, NVDA, TalkBack) reading any of
  this aloud — a DOM attribute being correct is necessary, not sufficient,
  for what a real AT announces and in what order.
- The streaming-reply announcement behavior named above, which is
  screen-reader-implementation-dependent by design.
- Real color perception — the computed contrast ratios are exact, but
  color blindness and low-vision use are broader than a ratio number.
- A full keyboard-only walk of the entire 24-screen flow, tab order
  included, rather than the spot checks above.

`docs/PROTOCOL.md`'s research protocol is the next honest test of all of
this: if a participant using a screen reader or keyboard-only can't
complete a flow this pass says is fixed, that is the finding that overrides
this document, the same way it overrides `docs/VOICE.md`.
