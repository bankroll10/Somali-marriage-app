import { PAYMENT_HOLD_HOURS, PRODUCT_IDS, ZELLE_HANDLE, ZELLE_NAME, product, totalCents } from '../../shared/config.ts'
import { isOrderable } from '../../shared/schedule.ts'
import { normalisePhone } from '../../shared/phone.ts'
import type { CheckoutRequest, CheckoutResponse, Order, Qty } from '../../shared/types.ts'
import { shortId, zeroQty } from '../../shared/types.ts'
import { isYmd } from '../../shared/zoned.ts'
import { error, json, readJson } from '../lib/http.ts'
import { reserve } from '../lib/inventory.ts'
import { breadStore, writeOrder } from '../lib/store.ts'

/**
 * POST /api/checkout — reserve the bread and hand back Zelle instructions.
 *
 * There is no payment processor: she is paid by Zelle, outside this app, and
 * confirms each order herself in /admin. The reservation still happens here,
 * atomically, so two people who both tap "Reserve" for the last loaf are told
 * apart at this step — one hears "sold out" before either has sent a dollar.
 * If nobody ever pays, the hold simply lapses after PAYMENT_HOLD_HOURS.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return error('method_not_allowed', 405)
  const input = await readJson<Partial<CheckoutRequest>>(req)
  if (input instanceof Response) return input

  // ── Validate ─────────────────────────────────────────────────────────────
  const now = Date.now()
  const date = input.date
  if (!isYmd(date)) return error('bad_date', 400)
  if (!isOrderable(date, now)) return error('closed', 400)

  const qty: Qty = zeroQty()
  for (const id of PRODUCT_IDS) {
    const n = input.qty?.[id] ?? 0
    if (!Number.isInteger(n) || n < 0 || n > product(id).capacityPerDay) return error('bad_quantity', 400)
    qty[id] = n
  }
  if (PRODUCT_IDS.every((id) => qty[id] === 0)) return error('empty', 400)

  const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : ''
  if (name.length < 1 || name.length > 80) return error('bad_name', 400)
  const phone = normalisePhone(typeof input.phone === 'string' ? input.phone : '')
  if (!phone) return error('bad_phone', 400)

  // ── Reserve ──────────────────────────────────────────────────────────────
  const store = breadStore()
  const orderId = crypto.randomUUID()
  const holdExpiresAt = new Date(now + PAYMENT_HOLD_HOURS * 3_600_000).toISOString()
  const held = await reserve(store, date, { orderId, qty, expiresAt: holdExpiresAt }, now)
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
    createdAt: new Date(now).toISOString(),
    holdExpiresAt,
  }
  await writeOrder(store, order)

  const response: CheckoutResponse = {
    orderId,
    shortId: shortId(orderId),
    date,
    qty,
    amountCents: order.amountCents,
    holdExpiresAt,
    zelle: { name: ZELLE_NAME, handle: ZELLE_HANDLE },
  }
  return json(response)
}
