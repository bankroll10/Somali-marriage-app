import { error, json } from '../lib/http.ts'
import { expireOrder, summarise } from '../lib/orders.ts'
import { breadStore, readOrder } from '../lib/store.ts'

/**
 * GET /api/order?order=<id> — what the confirmation page shows.
 *
 * If the order is still `pending` and its hold has lapsed, it is settled to
 * `expired` here, on read, so the customer's own page is never stuck showing
 * "waiting on Zelle" for a hold that has already been given back.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return error('method_not_allowed', 405)
  const orderId = new URL(req.url).searchParams.get('order') ?? ''
  if (!/^[0-9a-f-]{10,80}$/i.test(orderId)) return error('bad_order', 400)

  const store = breadStore()
  try {
    let order = await readOrder(store, orderId)
    if (!order) return error('not_found', 404)

    if (order.status === 'pending' && Date.parse(order.holdExpiresAt) <= Date.now()) {
      order = (await expireOrder(store, orderId, Date.now())) ?? order
    }
    return json(summarise(order))
  } catch (err) {
    console.error('[bread] order lookup failed', err)
    return error('unavailable', 503)
  }
}
