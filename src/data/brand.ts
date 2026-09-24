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
 * thing a copy of our homepage would not give them.
 *
 * "Powered by AI" is gone from all three surfaces that still carried it after
 * docs/PRODUCT.md recorded it removed — the model may add a sentence, never
 * be the reason (tests/durable.test.ts). No imports: vite.config.ts loads
 * this file at build time.
 */

export const NAME = 'Niyyah'

/** The eyebrow over the hero, and the first thing anyone reads. */
export const EYEBROW = 'Built for the Somali diaspora'

/** `<title>`: what a tab, a bookmark and a search result call this. */
export const TITLE = `${NAME} — marriage for the Somali diaspora, done in the open`

/** The meta description and the manifest's description. */
export const DESCRIPTION =
  'For someone you are already talking to: what they have done, the conversations to have before you marry, and the words for them. For the Somali diaspora. No account.'

/** What the social card says when a link is pasted into a chat. */
export const TAGLINE =
  'Already talking to someone? What they have shown you, the conversation to have next, and the words for it.'

/** The social card's alt text. */
export const OG_ALT = `${NAME} — built for the Somali diaspora. What’s in your way?`
