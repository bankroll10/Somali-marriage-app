import Stripe from 'stripe'
import { SITE_URL } from '../shared/config.ts'
import { REQUIRED_WEBHOOK_EVENTS } from '../netlify/lib/stripe/gateway.ts'
import { printChecks, stripeAccountChecks, type AccountLike, type WebhookEndpointLike } from './checks.ts'

/**
 * Asks STRIPE ITSELF whether the account is ready to take a real payment —
 * without taking one. Every other check in this repo asks the deployed site
 * about itself; this one answers the questions only Stripe knows: are
 * charges enabled, can money reach her bank, is Stripe still waiting on a
 * document, and is there a live webhook endpoint pointed at us with every
 * event the app relies on.
 *
 *   STRIPE_SECRET_KEY=... npm run stripe:verify
 *
 * The key is read from the shell environment only, never from an argument —
 * arguments end up in shell history and in `ps`. Nothing here creates,
 * changes or charges anything: two GETs, no writes.
 *
 * A restricted key needs Account *read* and Webhook endpoints *read* for
 * this script; the site itself only needs Checkout Sessions write and
 * Refunds read.
 */
const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('[bread] Set STRIPE_SECRET_KEY in your shell first, e.g.\n         STRIPE_SECRET_KEY=rk_live_... npm run stripe:verify\n       Do not pass it as an argument — arguments are saved in shell history.')
  process.exit(1)
}
/** Enough of the key to tell live from test and nothing more; never the whole thing. */
const prefix = `${key.slice(0, key.lastIndexOf('_') + 1)}…`
const stripe = new Stripe(key, { maxNetworkRetries: 1 })

/** A permissions failure on a restricted key is a fact to report, not a crash. */
async function tryGet<T>(what: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (err) {
    const e = err as { type?: string; message?: string }
    if (e.type === 'StripePermissionError') console.error(`[bread] This key is not allowed to read ${what}. Re-run with a key that has ${what} read access (a restricted key can be given it).`)
    else console.error(`[bread] Could not read ${what}: ${e.message ?? String(err)}`)
    return null
  }
}

const account = (await tryGet('the account', () => stripe.accounts.retrieveCurrent())) as AccountLike | null
const endpoints = await tryGet('webhook endpoints', () => stripe.webhookEndpoints.list({ limit: 100 }))
const ok = printChecks(
  `Stripe account check at ${new Date().toISOString()}`,
  stripeAccountChecks(account, (endpoints?.data as WebhookEndpointLike[] | undefined) ?? null, SITE_URL, prefix, REQUIRED_WEBHOOK_EVENTS),
)
if (!ok) console.log('\nAnything failing above is fixed in her Stripe Dashboard — see docs/LAUNCH_CHECKLIST.md, section 2.')
process.exit(ok ? 0 : 1)
