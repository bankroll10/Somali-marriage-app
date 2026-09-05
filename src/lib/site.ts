/**
 * Where Niyyah actually lives.
 *
 * Every share, invite and generated card used to hardcode `niyyah.app`, which
 * is not where the app is served from — so someone who tapped "copy invite" and
 * pasted it sent their friend to a link that does not lead to the app they were
 * just shown. One constant, so the domain is a single edit apart rather than six.
 *
 * It is now a setting rather than a literal, and that is a control decision
 * rather than a tidiness one. The host below belongs to Netlify, not to us.
 * It is burned into every link ever sent to another person — the vouch link a
 * father opened, the couple link a man answered, every restore link — and into
 * the footer of every share image. The day that account ends, those links end
 * with it, and there is no DNS to repoint because we do not own `netlify.app`.
 * Owning a domain is the single highest-value thing in `docs/CONTROL.md`, and
 * this makes the switch one variable instead of a hunt through six files.
 *
 * The fallbacks are today's values, so nothing changes until the variables are
 * set. `VITE_SITE_HOST` is also read by `vite.config.ts`, which writes it into
 * the social-card tags in index.html — the two defaults must match.
 */

/** Must match the default in vite.config.ts. */
export const DEFAULT_SITE_HOST = 'getniyyah.netlify.app'

export const SITE_HOST = import.meta.env.VITE_SITE_HOST || DEFAULT_SITE_HOST
export const SITE_URL = `https://${SITE_HOST}`

/**
 * Where a signup reaches a human when the form isn't configured.
 *
 * This is a real address only if the domain behind it is owned and receiving.
 * It is the last fallback in `src/lib/waitlist.ts`, so if it bounces, a person
 * who tried to join is lost silently — set `VITE_CONTACT_EMAIL` to something
 * that answers before launch.
 */
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'salaam@niyyah.app'
