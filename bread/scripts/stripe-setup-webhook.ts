import Stripe from 'stripe'
import { SITE_URL } from '../shared/config.ts'
import { REQUIRED_WEBHOOK_EVENTS } from '../netlify/lib/stripe/gateway.ts'
import { webhookPlan, type WebhookEndpointLike } from './checks.ts'

/**
 * Creates the Stripe webhook endpoint this site needs, with exactly the
 * events it acts on — the fiddly half of going live, which otherwise means
 * ticking eight items out of a list of hundreds in the Dashboard and
 * failing silently if one is missed.
 *
 *   STRIPE_SECRET_KEY=... npm run stripe:setup-webhook
 *   STRIPE_SECRET_KEY=... npm run stripe:setup-webhook -- --dry-run
 *
 * Stripe returns an endpoint's signing secret ONLY when it is created, so
 * this prints it once. That is also why it is worth doing this way: the
 * secret is printed on the machine that will paste it into Netlify and
 * never has to be sent anywhere.
 *
 * The key needs "Webhook endpoints: write". Creating an endpoint charges
 * nothing and affects no payment; running it twice will not make a second
 * one.
 */
const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('[bread] Set STRIPE_SECRET_KEY in your shell first, e.g.\n         STRIPE_SECRET_KEY=rk_live_... npm run stripe:setup-webhook\n       Do not pass it as an argument — arguments are saved in shell history.')
  process.exit(1)
}
const dryRun = process.argv.includes('--dry-run')
const live = key.includes('_live_')
const hookUrl = `${SITE_URL.replace(/\/$/, '')}/api/stripe-webhook`
const stripe = new Stripe(key, { maxNetworkRetries: 1 })

console.log(`\nStripe mode : ${live ? 'LIVE — real money' : 'TEST — practice only'}`)
console.log(`Endpoint    : ${hookUrl}`)
console.log(`Events      : ${REQUIRED_WEBHOOK_EVENTS.join(', ')}`)
if (dryRun) {
  console.log('\n--dry-run: nothing was created or changed.')
  process.exit(0)
}

let existing: WebhookEndpointLike[]
try {
  existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data as WebhookEndpointLike[]
} catch (err) {
  const e = err as { type?: string; message?: string }
  console.error(`\n[bread] Could not list webhook endpoints: ${e.message ?? String(err)}`)
  if (e.type === 'StripePermissionError') console.error('       This key needs "Webhook endpoints: write" — add it to the restricted key in Stripe.')
  process.exit(1)
}

const plan = webhookPlan(existing, hookUrl, REQUIRED_WEBHOOK_EVENTS)
try {
  if (plan.action === 'ok') {
    console.log(`\nAlready set up (${plan.id}) with every event it needs. Nothing to do.`)
    console.log('If STRIPE_WEBHOOK_SECRET is not yet in Netlify, get one by rolling the secret:')
    console.log(`  Stripe → Developers → Webhooks → ${plan.id} → "Roll secret"`)
  } else if (plan.action === 'update') {
    await stripe.webhookEndpoints.update(plan.id, { enabled_events: [...REQUIRED_WEBHOOK_EVENTS] })
    console.log(`\nUpdated the existing endpoint (${plan.id}); it was missing: ${plan.missing.join(', ')}`)
    console.log('Its signing secret is unchanged — Stripe only ever shows that at creation.')
    console.log('If Netlify does not have it, roll it: Stripe → Developers → Webhooks → this endpoint → "Roll secret".')
  } else {
    const made = await stripe.webhookEndpoints.create({ url: hookUrl, enabled_events: [...REQUIRED_WEBHOOK_EVENTS], description: 'Fresh Bread pre-orders' })
    console.log(`\nCreated ${made.id} with all ${REQUIRED_WEBHOOK_EVENTS.length} events.`)
    console.log('\n──────── signing secret — shown once, by Stripe, and never again ────────')
    console.log(`  ${made.secret}`)
    console.log('────────────────────────────────────────────────────────────────────────')
    console.log('\nPaste it into Netlify now: Site configuration → Environment variables →')
    console.log('STRIPE_WEBHOOK_SECRET. Do not save it anywhere else, and clear your terminal after.')
  }
} catch (err) {
  const e = err as { type?: string; message?: string }
  console.error(`\n[bread] Stripe refused: ${e.message ?? String(err)}`)
  if (e.type === 'StripePermissionError') console.error('       This key needs "Webhook endpoints: write".')
  process.exit(1)
}
console.log('\nNext: npm run stripe:verify — every row should pass now.')
