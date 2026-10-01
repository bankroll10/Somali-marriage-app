/**
 * The brand's first sentences, in one place.
 *
 * docs/PRODUCT.md's institution rule — nothing that would need renaming for
 * a second community lives outside `src/data` — was declared "already true of
 * the code" on the day it was written, and it was not: the hero's eyebrow, a
 * Welcome bullet, the `<title>`, the meta description, the social-card alt and
 * the web manifest all carried the community's name as literals in
 * `src/components` and `index.html` (docs/DECISIONS.md). These are those strings.
 * `index.html` reads them at build time through vite.config.ts; the manifest
 * is static JSON and `tests/brand.test.ts` holds it equal to what is here.
 *
 * What still names the community outside this file, on purpose: the
 * instruments' own content, such as "Somali at home" in the eleven
 * (src/data/eleven.ts). That is content, and the day a second community is
 * served it is a second `src/data` of content, not a rename. The instruments
 * no longer say the eleven "decide a Somali marriage": that was class F said
 * as fact (docs/RESEARCH.md, L5).
 * The rule is enforceable by test for the brand strings only, and
 * docs/PRODUCT.md now says so.
 *
 * The description and the social card changed on 2026-09-24
 * (docs/PRODUCT.md). Both used to say only what every competitor can
 * also claim — Somali, serious, faithful, done in the open — and the card
 * promised "find someone serious", a marketplace the product does not yet
 * have. They now say what someone gets on the first visit, which is also the
 * thing a copy of our homepage would not give them. On 2026-09-27 the two
 * doors came back to the first sentence (docs/DECISIONS.md Part 22): a name
 * put down for an introduction made by hand, and the instruments for someone
 * already talking to one. Neither promises an introduction, a date or a pool.
 *
 * "Powered by AI" is gone from all three surfaces that still carried it after
 * docs/PRODUCT.md recorded it removed — the model may add a sentence, never
 * be the reason (tests/durable.test.ts). No imports: vite.config.ts loads
 * this file at build time.
 */

export const NAME = 'Niyyah'

/** The eyebrow over the hero, and the first thing anyone reads. */
export const EYEBROW = 'Built for the Somali diaspora'

/**
 * The homepage's headline (src/components/Welcome.tsx), and so what a tab, a
 * bookmark and a pasted link lead with. Since 2026-10-01 (docs/DECISIONS.md
 * Part 25) the title, descriptions and card all say the two paths in the
 * homepage's words: a founder-led introduction pilot beginning in
 * Minneapolis–St. Paul, and tools for people already considering someone for
 * marriage. None promises a match, a date, a pool or a response time.
 */
export const HEADLINE = 'Meet someone serious. Think marriage through.'

/** `<title>`: what a tab, a bookmark and a search result call this. */
export const TITLE = `${NAME} — ${HEADLINE}`

/** The meta description and the manifest's description. */
export const DESCRIPTION =
  'A founder-led introduction pilot beginning in Minneapolis–St. Paul, and free tools for people already considering someone for marriage. For the Somali diaspora.'

/** `og:title` and `twitter:title` on the home page; `og:site_name` already says the name. */
export const SOCIAL_TITLE = HEADLINE

/** What the social card says when a link is pasted into a chat. */
export const TAGLINE =
  'A founder-led introduction pilot beginning in Minneapolis–St. Paul, and tools for people already considering someone for marriage.'

/**
 * The social card, under public/. The file is named for the card, not for
 * "og", and renamed whenever the card changes, so a new card has a new URL
 * rather than hoping a chat app re-fetches the old one (it may not; this does
 * not clear anyone's cache). Source and command: scripts/og/, `npm run og`.
 */
export const OG_IMAGE = 'og-pilot.png'

/** The social card's alt text: what the image shows, in its own words. */
export const OG_ALT = `${NAME} logo on dark green. “${HEADLINE}” Introductions beginning in Minneapolis–St. Paul. Tools for people considering someone for marriage.`
