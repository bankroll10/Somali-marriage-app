import { error, json } from '../lib/http.ts'
import { settleExpired } from '../lib/orders.ts'
import { breadStore, orderIdForSession, readOrder } from '../lib/store.ts'
import { stripe } from '../lib/stripe.ts'

/**
 * POST /api/cancel?session_id=cs_… — the customer backed out of the Stripe page.
 *
 * Without this their own reservation would keep the last loaf from them for
 * half an hour if they changed their mind and came straight back. The Stripe
 * session is expired too, so a stale tab cannot pay for bread that has since
 * been given to someone else.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return error('method_not_allowed', 405)
  const sid = new URL(req.url).searchParams.get('session_id') ?? ''
  if (!/^cs_[A-Za-z0-9_]{5,200}$/.test(sid)) return error('bad_session', 400)

  const store = breadStore()
  try {
    const orderId = await orderIdForSession(store, sid)
    const order = orderId ? await readOrder(store, orderId) : null
    if (!order) return error('not_found', 404)
    if (order.status !== 'pending') return json({ status: order.status })

    const client = stripe()
    let session = client ? await client.checkout.sessions.retrieve(sid) : null
    if (session?.payment_status === 'paid') return json({ status: 'paid' })
    if (client && session?.status === 'open') {
      // Expire first; only then let the bread go. If Stripe refuses (the
      // customer paid a second ago), the webhook settles it as paid.
      try {
        session = await client.checkout.sessions.expire(sid)
      } catch (err) {
        console.warn('[bread] cancel: could not expire session', err)
        return json({ status: 'pending' })
      }
    }
    await settleExpired(store, session ?? ({ metadata: { orderId: order.id } } as never), Date.now())
    return json({ status: 'expired' })
  } catch (err) {
    console.error('[bread] cancel failed', err)
    return error('unavailable', 503)
  }
}
