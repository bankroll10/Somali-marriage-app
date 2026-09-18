import type Stripe from 'stripe'
import { PRODUCT_IDS, totalCents } from '../../shared/config.ts'
import type { Order, OrderSummary } from '../../shared/types.ts'
import { shortId, zeroQty } from '../../shared/types.ts'
import { confirm, release } from './inventory.ts'
import { readOrder, writeOrder, type BreadStore } from './store.ts'

export function summarise(order: Order): OrderSummary {
  return {
    id: order.id,
    shortId: shortId(order.id),
    date: order.date,
    name: order.name,
    qty: order.qty,
    amountCents: order.amountCents,
    status: order.status,
  }
}

/** The metadata we put on every Checkout Session, so it can rebuild the order alone. */
export function sessionMetadata(order: Order): Record<string, string> {
  return {
    orderId: order.id,
    date: order.date,
    name: order.name,
    phone: order.phone,
    ...Object.fromEntries(PRODUCT_IDS.map((id) => [id, String(order.qty[id])])),
  }
}

function orderFromMetadata(session: Stripe.Checkout.Session): Order | null {
  const m = session.metadata ?? {}
  if (!m.orderId || !m.date) return null
  const qty = zeroQty()
  for (const id of PRODUCT_IDS) qty[id] = Number(m[id] ?? 0) || 0
  return {
    id: m.orderId,
    date: m.date,
    name: m.name ?? '',
    phone: m.phone ?? '',
    qty,
    amountCents: session.amount_total ?? totalCents(qty),
    status: 'pending',
    stripeSessionId: session.id,
    createdAt: new Date(session.created * 1000).toISOString(),
  }
}

/**
 * Stripe says the session is paid. Turn the hold into a sale and the order
 * into a paid one. Safe to call any number of times, from the webhook and
 * from the confirmation page alike — whichever arrives first does the work.
 */
export async function settlePaid(store: BreadStore, session: Stripe.Checkout.Session, nowMs: number): Promise<Order | null> {
  const orderId = session.metadata?.orderId
  if (!orderId) return null
  // The order record normally exists; if its write failed after the session
  // was created, the metadata is enough to rebuild it — the customer paid.
  const order = (await readOrder(store, orderId)) ?? orderFromMetadata(session)
  if (!order) return null
  if (order.status === 'paid') return order
  await confirm(store, order.date, order.id, order.qty, nowMs)
  const paid: Order = {
    ...order,
    status: 'paid',
    paidAt: new Date(nowMs).toISOString(),
    amountCents: session.amount_total ?? order.amountCents,
  }
  const email = session.customer_details?.email
  if (email) paid.email = email
  await writeOrder(store, paid)
  return paid
}

/** The session expired or failed: give the bread back. Idempotent. */
export async function settleExpired(store: BreadStore, session: Stripe.Checkout.Session, nowMs: number): Promise<Order | null> {
  const orderId = session.metadata?.orderId
  if (!orderId) return null
  const order = await readOrder(store, orderId)
  if (!order || order.status !== 'pending') return order
  await release(store, order.date, order.id, nowMs)
  const expired: Order = { ...order, status: 'expired' }
  await writeOrder(store, expired)
  return expired
}
