import { PRODUCT_IDS, type ProductId } from '../../shared/config.ts'
import { normalisePhone } from '../../shared/phone.ts'
import { cutoffFor, isInWindow } from '../../shared/schedule.ts'
import type { CheckoutRequest, Qty } from '../../shared/types.ts'
import { zeroQty } from '../../shared/types.ts'
import { isYmd } from '../../shared/zoned.ts'

/**
 * Everything a checkout request must satisfy before the database is touched.
 * Pure: takes the request, the products the database currently sells, and
 * the time; returns either a clean value or the error code to answer with.
 * Prices and totals from the browser are not read at all.
 */

export interface SellableProduct {
  id: string
  active: boolean
  daily_capacity: number
}

export interface CleanCheckout {
  date: string
  qty: Qty
  name: string
  phone: string
  checkoutKey: string
}

export type Validation = { ok: true; value: CleanCheckout } | { ok: false; code: string; status: number }

/** A v4 UUID and nothing looser: order ids and checkout keys are made by crypto.randomUUID(), so anything else is not one of ours. */
export const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateCheckout(body: Partial<CheckoutRequest> | null | undefined, products: SellableProduct[], nowMs: number): Validation {
  const fail = (code: string, status = 400): Validation => ({ ok: false, code, status })
  if (!body || typeof body !== 'object') return fail('bad_json')

  const date = body.date
  if (!isYmd(date)) return fail('bad_date')
  // Only a pickup day inside the rolling window is a date at all; a forged
  // date months out is refused here, not reserved.
  if (!isInWindow(date, nowMs)) return fail('bad_date')
  if (nowMs >= cutoffFor(date)) return fail('closed')

  const byId = new Map(products.map((p) => [p.id, p]))
  const qty: Qty = zeroQty()
  const rawQty = body.qty
  if (rawQty !== undefined && (rawQty === null || typeof rawQty !== 'object' || Array.isArray(rawQty))) return fail('bad_quantity')
  for (const key of Object.keys(rawQty ?? {})) {
    if (!(PRODUCT_IDS as readonly string[]).includes(key)) return fail('bad_product')
  }
  for (const id of PRODUCT_IDS) {
    const n = rawQty?.[id] ?? 0
    const product = byId.get(id)
    if (!Number.isInteger(n) || n < 0) return fail('bad_quantity')
    if (n > 0 && (!product || !product.active)) return fail('bad_product')
    if (product && n > product.daily_capacity) return fail('bad_quantity')
    qty[id as ProductId] = n
  }
  if (PRODUCT_IDS.every((id) => qty[id] === 0)) return fail('empty')

  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
  if (name.length < 1 || name.length > 80) return fail('bad_name')
  const phone = normalisePhone(typeof body.phone === 'string' ? body.phone : '')
  if (!phone) return fail('bad_phone')

  const checkoutKey = typeof body.checkoutKey === 'string' ? body.checkoutKey.toLowerCase() : ''
  if (!UUID_V4.test(checkoutKey)) return fail('bad_key')

  return { ok: true, value: { date, qty, name, phone, checkoutKey } }
}
