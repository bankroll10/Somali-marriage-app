/**
 * Where Niyyah actually lives.
 *
 * Every share, invite and generated card used to hardcode `niyyah.app`, which
 * is not where the app is served from — so someone who tapped "copy invite" and
 * pasted it sent their friend to a link that does not lead to the app they were
 * just shown. One constant, so the demo domain and the eventual real domain are
 * a single edit apart rather than six.
 */
export const SITE_HOST = 'getniyyah.netlify.app'
export const SITE_URL = `https://${SITE_HOST}`

/** Where a signup reaches a human when the form isn't configured. */
export const CONTACT_EMAIL = 'salaam@niyyah.app'
