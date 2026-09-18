import type Stripe from 'stripe'
import { env, error, json } from '../lib/http.ts'
import { settleExpired, settlePaid } from '../lib/orders.ts'
import { breadStore } from '../lib/store.ts'
import { stripe } from '../lib/stripe.ts'

/**
 * POST /api/stripe-webhook — Stripe tells us what happened to a checkout.
 *
 * The signature is checked against the raw body before anything is believed.
 * Every handler is idempotent because Stripe retries and may deliver twice.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return error('method_not_allowed', 405)
  const client = stripe()
  const secret = env.stripeWebhookSecret
  if (!client || !secret) return error('webhook_not_configured', 503)

  const signature = req.headers.get('stripe-signature')
  if (!signature) return error('missing_signature', 400)

  let event: Stripe.Event
  try {
    event = await client.webhooks.constructEventAsync(await req.text(), signature, secret)
  } catch (err) {
    console.warn('[bread] webhook: bad signature', err)
    return error('bad_signature', 400)
  }

  const store = breadStore()
  const now = Date.now()
  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object
        if (session.payment_status === 'paid') await settlePaid(store, session, now)
        // Unpaid at completion (a delayed method): wait for async_payment_succeeded.
        break
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        await settleExpired(store, event.data.object, now)
        break
      default:
        break
    }
  } catch (err) {
    // A 500 makes Stripe retry, which is exactly right for a storage blip.
    console.error('[bread] webhook: handling failed', event.type, err)
    return error('failed', 500)
  }
  return json({ received: true })
}
