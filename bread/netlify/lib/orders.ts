import { ZELLE_HANDLE, ZELLE_NAME } from '../../shared/config.ts'
import type { Order, OrderSummary, Qty } from '../../shared/types.ts'
import { shortId } from '../../shared/types.ts'
import { confirm, fits, liveHolds, release, remaining } from './inventory.ts'
import { readDay, readOrder, writeOrder, type BreadStore } from './store.ts'

const ZELLE = { name: ZELLE_NAME, handle: ZELLE_HANDLE }

export function summarise(order: Order): OrderSummary {
  return {
    id: order.id,
    shortId: shortId(order.id),
    date: order.date,
    name: order.name,
    qty: order.qty,
    amountCents: order.amountCents,
    status: order.status,
    holdExpiresAt: order.holdExpiresAt,
    zelle: ZELLE,
  }
}

export type ConfirmResult =
  | { ok: true; order: Order }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'would_exceed_capacity'; remaining: Qty }

/**
 * She has seen the Zelle payment land and confirms it. The hold becomes a
 * sale, same as it always did. Idempotent — confirming an already-paid order
 * just returns it.
 *
 * If the hold has since lapsed (she checked her phone hours later), the sale
 * is allowed as long as there is still room; if it would push a product past
 * its daily capacity, that is surfaced instead of silently oversold, so she
 * can decide — `force` means she has decided.
 */
export async function confirmZelle(store: BreadStore, orderId: string, nowMs: number, force = false): Promise<ConfirmResult> {
  const order = await readOrder(store, orderId)
  if (!order) return { ok: false, reason: 'not_found' }
  if (order.status === 'paid') return { ok: true, order }

  const { value: day } = await readDay(store, order.date)
  const holdLive = liveHolds(day, nowMs).some((h) => h.orderId === orderId)
  if (!holdLive && !force && !fits(day, order.qty, nowMs)) {
    return { ok: false, reason: 'would_exceed_capacity', remaining: remaining(day, nowMs) }
  }

  await confirm(store, order.date, order.id, order.qty, nowMs)
  const paid: Order = { ...order, status: 'paid', paidAt: new Date(nowMs).toISOString() }
  await writeOrder(store, paid)
  return { ok: true, order: paid }
}

/**
 * The hold is given back — because nobody paid within the window, or because
 * she cancelled it herself. Idempotent; a no-op on anything but a pending order.
 */
export async function expireOrder(store: BreadStore, orderId: string, nowMs: number): Promise<Order | null> {
  const order = await readOrder(store, orderId)
  if (!order || order.status !== 'pending') return order
  await release(store, order.date, order.id, nowMs)
  const expired: Order = { ...order, status: 'expired' }
  await writeOrder(store, expired)
  return expired
}
