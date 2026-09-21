# A performance audit, measured — 2026-09-20

## Context

Requested directly: measure and improve initial JS, bundle size, unused
dependencies, route/component loading, font loading, image loading, layout
shift, render blocking, API waterfalls, Claude streaming, localStorage work,
expensive rerenders, and mobile CPU cost — optimize what the numbers show,
not what seems clever, and set a small budget future changes have to respect.

**Method.** `npm run build` for real bundle output; Chromium
(`/opt/pw-browsers/chromium`, same convention as `docs/MOBILE.md`) driven by
Playwright against `vite preview`, with `Emulation.setCPUThrottlingRate({
rate: 4 })` and `Network.emulateNetworkConditions` (150ms latency, 1.5 Mbps
down, 0.75 Mbps up) at a 390×844 viewport for anything claiming a mobile
number. Every number below came from one of those two, not a guess — where
an audited category turned up nothing to fix, that is said plainly rather
than invented.

## Findings and what changed, category by category

**Initial JS / bundle size / route and component loading — the one real
structural problem, fixed.** `App.tsx` statically imported all 23 screens;
`npm run build` produced a single 611.63 KB chunk (176.52 KB gzipped) and
Vite's own build warned about it. Every session only ever needs one screen at
a time (`AppScreen`'s `switch`), and most sessions never reach most of them —
Trust, Philosophy, Plus, the endings, the Somali sheet's screens. Welcome (and
the `ui.tsx` primitives it already imports) stays eager since it's first
paint for almost everyone; the other 22 are now `lazy(() => import(...))`
behind one `<Suspense>` in `App.tsx`. Measured after:

| | before | after |
|---|---|---|
| initial JS | 611.63 KB | 328.15 KB |
| initial JS, gzipped | 176.52 KB | 107.54 KB |
| largest lazy chunk | — | `Home.tsx`, 25.17 KB (6.29 KB gzip) |

A real navigation was walked in Chromium (tap "Start where you are" on
Welcome → the lazily-loaded `Identity` screen renders, no console errors)
and the full suite (827 tests) is unchanged, since this is a loading-strategy
change with no behavior difference.

**The obvious follow-on, tried and reverted.** Warming every lazy chunk on
idle so a later tap never waits on the network seemed like a free win.
Measured under the throttled profile above, it was not:

| prefetch strategy | first contentful paint |
|---|---|
| none | 1940 – 1960ms |
| all 22 imports in one idle callback | 2204ms |
| one import per idle callback, chained | 2164ms |

Both variants made FCP **~12% slower**, not faster — 22 chunks' worth of
requests and top-level module evaluation land on the same throttled
connection and 4×-slowed main thread that first paint is still using, and
`requestIdleCallback` chains back-to-back with no real gap once the page is
otherwise quiet, so staggering the *scheduling* didn't stagger the *cost*.
Removed entirely; re-measured at 1960ms, matching the no-prefetch baseline.
Nothing here is on a path anyone is waiting on — a lazy chunk is a few KB,
fetched once, the first time its screen is actually reached — so the fix is
not fetching it early, not fetching it more cleverly.

**Claude streaming / expensive rerenders / mobile CPU cost — the other real
problem, fixed.** `netlify/functions/guide.ts` forwards Anthropic's raw
`text_delta` events to the client unbatched — by design, so a mid-stream
failure still reads as a clean error contract. `Coach.tsx`'s `onChunk`
callback took each one of those deltas and ran a full `setThreads` plus a
complete re-parse of the *entire* answer-so-far in `RichText` (its
paragraph/bullet/markdown split runs over the accumulated text, not just
what's new) — on every single delta, however often they arrived. Fixed by
coalescing writes through `requestAnimationFrame`: `onChunk` now just records
the latest text and schedules at most one `writeReply` per animation frame,
bounding the re-render/re-parse rate to the screen's own paint cadence
instead of the network's. `streamedText` (what the cut-off check reads) is
still updated synchronously on every delta, and `flushPending()` runs
unconditionally the moment the stream ends — so a mid-stream drop still shows
exactly what arrived, never a frame behind. `tests/performance.test.ts` pins
both halves of this (the coalescing, and the guaranteed final flush) and was
mutation-tested: reverting the coalescing, or dropping the final flush, fails
it.

**Unused dependencies — none found.** `@anthropic-ai/sdk` and
`@netlify/blobs`/`@netlify/functions` are used only under `netlify/functions/`
and `tests/`, never imported from `src/` — confirmed by grep, not assumed —
so none of them reach the client bundle regardless of which `package.json`
list they sit in. `tailwindcss`/`@tailwindcss/vite` are used via the CSS
`@import` and the Vite plugin. Nothing to remove.

**Font loading — already right, left alone.** Both typefaces are
self-hosted, subsetted by `unicode-range` (latin / latin-ext), and declared
`font-display: swap` (`src/index.css`, done in an earlier pass —
`docs/CONTROL.md` C3). That already avoids invisible-text-on-load and lets a
fallback face render immediately. Nothing here showed a measurable problem to
fix.

**Image loading — nothing to audit.** `grep -rn "<img" src` returns zero
matches. The product carries no raster images at all; the only images that
exist (`favicon.svg`, `apple-touch-icon.png`, `og.png`) are outside the app's
own render path (a tab icon and a social-card preview). This category has no
finding because there is nothing in it.

**Layout shift — measured negligible.** Cumulative Layout Shift on the
Welcome screen, under the throttled profile: **0.0127** — well under the
0.1 threshold generally treated as "good". Consistent with no images and
`font-display: swap`; the Suspense fallback added for lazy-loading
(`<div className="min-h-dvh bg-cream" />`) is sized to the full viewport
specifically so it can't introduce a shift of its own when a lazy screen's
chunk is still loading.

**Render-blocking resources — already minimal.** `index.html` carries no
third-party script, no analytics tag, no web-font loader script — the only
render-blocking resource is the one same-origin stylesheet Vite emits
(53.22 KB, 9.62 KB gzip), and the module script is non-blocking by the
platform's own rules. Nothing added, nothing to remove.

**API waterfalls — none found.** The client-side network calls that fire on
load — `flushWaitlistQueue()`, the couple-answered check, the vouch check —
each run in their own `useEffect` with independent dependencies; none awaits
another's result before starting. There is exactly one *sequential*
network dependency in the whole app (the guide's stream, which is
sequential by nature — you can't render a reply before asking for it), and
that's the one already covered above.

**localStorage work — measured, and mostly not worth touching.**
`saveProgress` (the big journey-state write) was already debounced 250ms
before this pass, with a comment explaining exactly why (the age field would
otherwise write on every keystroke) — nothing to add. `track()` in
`src/lib/analytics.ts` does a full `JSON.parse` + `JSON.stringify` of up to
300 buffered events on every call, which looked worth fixing until it was
measured: at the full 300-event buffer, one call costs **~0.17ms** on this
machine — and every real call site (`src/hooks/useNiyyah.ts` and eleven
components) fires on a discrete tap or screen transition, never in a loop or
a keystroke handler, at most a handful of times per session. Left unchanged;
adding an in-memory buffer with flush logic to save fractions of a
millisecond that fire a few times a session is exactly the "clever
micro-optimization without evidence" this audit was told not to do.

## The budget

Enforced in `tests/performance.test.ts` where a source pin can catch a
regression cheaply (this repo's own convention — see `tests/mobile.test.ts`,
`tests/load.test.ts`); recorded here as the number a person checks by hand
otherwise.

- **Every screen but `Welcome` loads behind `lazy()`.** A new screen added to
  `AppScreen`'s `switch` must be lazy-imported in `App.tsx`, not statically
  imported — `tests/performance.test.ts` fails loudly if it isn't.
- **No blanket idle-prefetch of lazy screens.** Tried twice, measured both
  times as a ~12% regression to first contentful paint under a throttled
  mobile profile. If a real tap-latency problem shows up later, the fix is a
  *targeted* prefetch (e.g. on hover/pointerdown intent for one specific
  next screen), re-measured the same way — not a blanket one.
- **A streaming callback writes to state at most once per animation frame**,
  never once per network chunk. `tests/performance.test.ts` pins the
  `requestAnimationFrame` coalescing in `Coach.tsx` and the guaranteed final
  flush.
- **Initial JS chunk stays under ~400 KB raw / ~130 KB gzip.** Currently
  328 KB / 107.5 KB — headroom exists, but a screen migrating back to an
  eager import, or a heavy new shared dependency landing in `useNiyyah`'s
  import graph, should trip Vite's own >500 KB chunk warning in `npm run
  build` output well before this ceiling, and a person reviewing that build
  output is the backstop.
- **CLS stays under 0.1** (measured: 0.0127). No images and `font-display:
  swap` are why; don't add either without re-measuring.
- **Don't add a fix here without the number that justifies it.** This pass
  found exactly two real, structural problems (the eager bundle, the
  unthrottled stream) and confirmed six other categories had nothing to
  fix — including one thing that looked like a fix and measured out. That
  ratio is the point: most of this audit's value was in what it did *not*
  change.

## Verification

`npm run verify` (typecheck, lint, `tests/performance.test.ts` plus every
existing test — this pass touches no copy and no pinned content, so nothing
else should move) and `npm run build`. Chromium walk: Welcome → tap through
to a lazy screen, confirm it renders with no console errors; CLS and FCP
measured under the throttled profile above, before and after each change,
numbers recorded in this file rather than described qualitatively.
