/**
 * The brand's first sentences, in one place.
 *
 * docs/BACKWARD.md's institution rule — nothing that would need renaming for
 * a second community lives outside `src/data` — was declared "already true of
 * the code" on the day it was written, and it was not: the hero's eyebrow, a
 * Welcome bullet, the `<title>`, the meta description, the social-card alt and
 * the web manifest all carried the community's name as literals in
 * `src/components` and `index.html` (docs/BOARD.md). These are those strings.
 * `index.html` reads them at build time through vite.config.ts; the manifest
 * is static JSON and `tests/brand.test.ts` holds it equal to what is here.
 *
 * What still names the community outside this file, on purpose: the
 * instruments' own copy — "the eleven conversations that decide a Somali
 * marriage" in BeforeYes, Couple, Home, Read, the vouch's letter to a father,
 * and Philosophy's headline. Those are content, and the day a second
 * community is served they are a second `src/data` of content, not a rename.
 * The rule is enforceable by test for the brand strings only, and
 * docs/BACKWARD.md now says so.
 *
 * "Powered by AI" is gone from all three surfaces that still carried it after
 * docs/DURABLE.md recorded it removed — the model may add a sentence, never
 * be the reason (tests/durable.test.ts). No imports: vite.config.ts loads
 * this file at build time.
 */

export const NAME = 'Niyyah'

/** The eyebrow over the hero, and the first thing anyone reads. */
export const EYEBROW = 'Built for the Somali diaspora'

/** The Welcome bullet that says who built this and for whom. */
export const BUILT_BY = 'Built by a Somali, for the questions our aunties ask — and the ones they don’t.'

/** `<title>`: what a tab, a bookmark and a search result call this. */
export const TITLE = `${NAME} — the trusted marriage platform for the Somali diaspora`

/** The meta description and the manifest's description. */
export const DESCRIPTION =
  'The trusted marriage platform for the Somali diaspora — guided by faith, designed for serious people.'

/** What the social card says when a link is pasted into a chat. */
export const TAGLINE = 'Find someone serious — without losing your dignity, faith, time, or peace.'

/** The social card's alt text. */
export const OG_ALT = `${NAME} — built for the Somali diaspora. What’s actually in your way?`
