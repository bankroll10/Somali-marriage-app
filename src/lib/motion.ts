/**
 * `prefers-reduced-motion` covers CSS animation and transition durations on
 * its own (src/index.css's blanket `@media` rule) — but a JS-driven
 * `scrollTo({ behavior: 'smooth' })` is not CSS, and nothing gated it
 * (docs/ACCESS.md). Every smooth-scroll call in the app goes through this so
 * the preference actually reaches it.
 */
export function scrollBehavior(): ScrollBehavior {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  } catch {
    return 'smooth'
  }
}
