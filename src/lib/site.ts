/**
 * Where Niyyah actually lives.
 *
 * This host is burned into every link ever sent to another person — the couple
 * link a man answered, every restore link, every tool shared into a group —
 * and into the footer of every share image. Links do not come back to be
 * corrected: whatever address they carry is the address they carry for ever.
 * So it is a control decision, not a tidiness one, and `docs/OPS.md` ranks
 * it first of every dependency this product has.
 *
 * **The domain is ours.** `joinniyyah.com` is registered to the founder, and
 * that is the whole point: DNS can be repointed at any host on earth, so no
 * supplier can take the address with them when they go. It used to default to
 * `getniyyah.netlify.app` — a subdomain of a company under no obligation to
 * us, and the one thing in `docs/OPS.md` that money rather than code had
 * to fix. It was fixed; this is the code catching up. See `docs/OPS.md`.
 *
 * The default is now the owned address rather than the rented one, which
 * matters for exactly the case a variable cannot cover: a build where
 * `VITE_SITE_HOST` is missing — a fresh site, a preview, a teammate's laptop —
 * used to mint links pointing at the landlord. Now the worst case points home.
 *
 * Never release the `getniyyah.netlify.app` subdomain: Netlify keeps serving
 * it and redirecting here, and that is what keeps links already sitting in
 * people's messages alive.
 *
 * `VITE_SITE_HOST` is also read by `vite.config.ts`, which writes it into the
 * social-card tags in index.html — the two defaults must match, and
 * `tests/deploy-layout.test.ts` holds them together.
 */

/** Must match the default in vite.config.ts. */
export const DEFAULT_SITE_HOST = 'joinniyyah.com'

export const SITE_HOST = import.meta.env.VITE_SITE_HOST || DEFAULT_SITE_HOST
export const SITE_URL = `https://${SITE_HOST}`

/**
 * Where a person reaches a human: the contact link on Home and Trust.
 *
 * The default is on the domain we own, which is the half that can be fixed in
 * code. The other half is mail: until a mailbox actually answers at
 * `joinniyyah.com`, production must keep `VITE_CONTACT_EMAIL` pointed at an
 * address a person reads. That is the one open step in `docs/OPS.md`'s
 * cutover, and `docs/OPS.md` carries why it matters — an address on a mail
 * provider's domain is the last rented thing a member uses to reach us.
 */
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || 'salaam@joinniyyah.com'
