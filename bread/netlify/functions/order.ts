import { error, json } from '../lib/http.ts'
import { settlePaid, summarise } from '../lib/orders.ts'
import { breadStore, orderIdForSession, readOrder } from '../lib/store.ts'
import { stripe } from '../lib/stripe.ts'

/**
 * GET /api/order?session_id=cs_… — what the confirmation page shows.
 *
 * If the webhook has not landed yet, ask Stripe directly and settle the order
 * here, so the page the customer lands on after paying is never wrong.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return error('method_not_allowed', 405)
  const sid = new URL(req.url).searchParams.get('session_id') ?? ''
  if (!/^cs_[A-Za-z0-9_]{5,200}$/.test(sid)) return error('bad_session', 400)

  const store = breadStore()
  try {
    const orderId = await orderIdForSession(store, sid)
    if (!orderId) return error('not_found', 404)
    let order = await readOrder(store, orderId)
    if (!order) return error('not_found', 404)

    if (order.status === 'pending') {
      const client = stripe()
      if (client) {
        const session = await client.checkout.sessions.retrieve(sid)
        if (session.payment_status === 'paid') order = (await settlePaid(store, session, Date.now())) ?? order
      }
    }
    return json(summarise(order))
  } catch (err) {
    console.error('[bread] order lookup failed', err)
    return error('unavailable', 503)
  }
}
