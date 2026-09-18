import {
  CHECKOUT_MINUTES,
  CURRENCY,
  HOLD_MINUTES,
  PICKUP_END_HOUR,
  PICKUP_PLACE,
  PICKUP_START_HOUR,
  PRODUCT_IDS,
  product,
  totalCents,
} from '../../shared/config.ts'
import { isOrderable } from '../../shared/schedule.ts'
import type { CheckoutRequest, Order, Qty } from '../../shared/types.ts'
import { zeroQty } from '../../shared/types.ts'
import { formatYmd, isYmd } from '../../shared/zoned.ts'
import { error, json, readJson, siteOrigin } from '../lib/http.ts'
import { release, reserve } from '../lib/inventory.ts'
import { sessionMetadata } from '../lib/orders.ts'
import { normalisePhone } from '../../shared/phone.ts'
import { breadStore, rememberSession, writeOrder } from '../lib/store.ts'
import { stripe } from '../lib/stripe.ts'

const hour12 = (h: number) => `${h > 12 ? h - 12 : h} ${h >= 12 ? 'PM' : 'AM'}`

/**
 * POST /api/checkout — reserve the bread, then send the customer to Stripe.
 *
 * The reservation happens before the Stripe page exists, so two people who
 * both tap "Pay" for the last loaf are told apart here, not after one of them
 * has paid. If Stripe cannot be reached the reservation is given straight
 * back; if the customer walks away it lapses on its own.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return error('method_not_allowed', 405)
  const body = await readJson<Partial<CheckoutRequest>>(req)
  if (body instanceof Response) return body

  // ── Validate ─────────────────────────────────────────────────────────────
  const now = Date.now()
  const date = body.date
  if (!isYmd(date)) return error('bad_date', 400)
  if (!isOrderable(date, now)) return error('closed', 400)

  const qty: Qty = zeroQty()
  for (const id of PRODUCT_IDS) {
    const n = body.qty?.[id] ?? 0
    if (!Number.isInteger(n) || n < 0 || n > product(id).capacityPerDay) return error('bad_quantity', 400)
    qty[id] = n
  }
  if (PRODUCT_IDS.every((id) => qty[id] === 0)) return error('empty', 400)

  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  if (name.length < 1 || name.length > 80) return error('bad_name', 400)
  const phone = normalisePhone(typeof body.phone === 'string' ? body.phone : '')
  if (!phone) return error('bad_phone', 400)

  const client = stripe()
  if (!client) return error('payments_not_configured', 503)

  // ── Reserve ──────────────────────────────────────────────────────────────
  const store = breadStore()
  const orderId = crypto.randomUUID()
  const held = await reserve(store, date, { orderId, qty, expiresAt: new Date(now + HOLD_MINUTES * 60_000).toISOString() }, now)
  if (!held.ok) {
    if (held.reason === 'conflict') return error('busy', 503)
    return error(held.reason, 409)
  }

  const order: Order = {
    id: orderId,
    date,
    name,
    phone,
    qty,
    amountCents: totalCents(qty),
    status: 'pending',
    stripeSessionId: '',
    createdAt: new Date(now).toISOString(),
  }

  // ── Stripe ───────────────────────────────────────────────────────────────
  const origin = siteOrigin(req)
  const when = `${formatYmd(date)}, ${hour12(PICKUP_START_HOUR)}–${hour12(PICKUP_END_HOUR)} at ${PICKUP_PLACE}`
  try {
    const session = await client.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: PRODUCT_IDS.filter((id) => qty[id] > 0).map((id) => ({
          quantity: qty[id],
          price_data: {
            currency: CURRENCY,
            unit_amount: product(id).priceCents,
            product_data: { name: product(id).name, description: `Pickup ${when}` },
          },
        })),
        success_url: `${origin}/thanks?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?canceled={CHECKOUT_SESSION_ID}&date=${date}`,
        expires_at: Math.floor(now / 1000) + CHECKOUT_MINUTES * 60,
        metadata: sessionMetadata(order),
        payment_intent_data: {
          description: `Bread for ${name}, pickup ${formatYmd(date)}`,
          metadata: sessionMetadata(order),
        },
        custom_text: { submit: { message: `Pickup ${when}.` } },
      },
      { idempotencyKey: orderId },
    )
    if (!session.url) throw new Error('Stripe returned no checkout URL')
    order.stripeSessionId = session.id
    await writeOrder(store, order)
    await rememberSession(store, session.id, orderId)
    return json({ url: session.url, orderId })
  } catch (err) {
    console.error('[bread] checkout: Stripe failed', err)
    await release(store, date, orderId, Date.now()).catch(() => {})
    return error('payment_unavailable', 503)
  }
}
