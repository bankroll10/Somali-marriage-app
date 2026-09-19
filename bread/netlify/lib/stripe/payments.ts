import { PICKUP_PLACE, STRIPE_HOLD_MARGIN_MINUTES } from '../../../shared/config.ts'
import type { Clock } from '../../../shared/clock.ts'
import type { Order } from '../../../shared/types.ts'
import { formatYmd } from '../../../shared/zoned.ts'
import type { Db, Queryable } from '../db/client.ts'
import { ensureInventory, lockDate, readOrder, sweep, take } from '../inventory.ts'
import { CURRENCY, type GatewaySession, type StripeGateway } from './gateway.ts'

/**
 * The Stripe side of the lifecycle. Four operations, each exactly-once:
 *
 *   ensureSession   the order's Checkout Session, created or re-created with
 *                   the same idempotency key from the same database rows
 *   finalizePayment a verified paid session converts the hold into paid
 *                   inventory — the ONE way a card order becomes paid, used
 *                   by the webhook, the customer's page and reconciliation
 *   releaseStripe   gives the bread back, once, after Stripe has said the
 *                   session cannot complete
 *   reconcileOrder  asks Stripe what really happened and applies it
 *
 * A success URL is never evidence. A timer is never evidence. Stripe is.
 *
 * syncRefunds is the fifth: what Stripe holds about refunds on a payment,
 * mirrored onto the order's reference — and nothing else. A refund changes
 * no inventory and no fulfilment; those are her separate decisions.
 */

export interface PaymentDeps {
  db: Db
  clock: Clock
  gateway: StripeGateway
}

interface StripeRef {
  id: number
  external_id: string | null
  status: string
  session_expires_ms: number
  amount_cents: number
}

async function stripeRef(q: Queryable, orderId: string): Promise<StripeRef | null> {
  const { rows } = await q.query<StripeRef>(
    `SELECT id, external_id, status, extract(epoch FROM session_expires_at)::float8 * 1000 AS session_expires_ms, amount_cents
     FROM payment_references WHERE order_id = $1::uuid AND provider = 'stripe' ORDER BY id DESC LIMIT 1`,
    [orderId],
  )
  return rows[0] ?? null
}

export type ExceptionKind = 'amount_mismatch' | 'currency_mismatch' | 'order_mismatch' | 'mode_mismatch' | 'livemode_mismatch' | 'paid_after_release' | 'duplicate_payment' | 'expire_uncertain'

/** One open exception per (order, session, kind); a repeat delivery does not pile up rows. */
async function recordException(q: Queryable, orderId: string, sessionId: string | null, kind: ExceptionKind, detail: Record<string, unknown>, nowMs: number): Promise<void> {
  const { rows } = await q.query<{ id: number }>(
    `SELECT id FROM payment_exceptions WHERE order_id = $1::uuid AND kind = $2 AND session_id IS NOT DISTINCT FROM $3 AND resolved_at IS NULL`,
    [orderId, kind, sessionId],
  )
  if (rows[0]) return
  await q.query('INSERT INTO payment_exceptions (order_id, session_id, kind, detail, created_at) VALUES ($1::uuid, $2, $3, $4::jsonb, $5::timestamptz)', [
    orderId,
    sessionId,
    kind,
    JSON.stringify(detail),
    new Date(nowMs).toISOString(),
  ])
}

// ── ensureSession ─────────────────────────────────────────────────────────

export type SessionOutcome = { ok: true; session: GatewaySession } | { ok: false; reason: 'not_stripe' | 'not_found' | 'create_failed' }

/**
 * The Checkout Session for a reserved card order. Built only from what the
 * database holds — snapshotted prices, the stored expiry — so a retry, a
 * replayed request or a recovery after a crash sends Stripe exactly the same
 * create under the same idempotency key, and Stripe hands back the same
 * session rather than a second one.
 */
export async function ensureSession(deps: PaymentDeps, orderId: string, urls: { successUrl: string; cancelUrl: string }): Promise<SessionOutcome> {
  const { db, gateway } = deps
  const order = await readOrder(db, orderId, deps.clock.now())
  if (!order) return { ok: false, reason: 'not_found' }
  if (order.provider !== 'stripe') return { ok: false, reason: 'not_stripe' }
  const ref = await stripeRef(db, orderId)
  if (!ref) return { ok: false, reason: 'not_stripe' }

  if (ref.external_id) {
    try {
      return { ok: true, session: await gateway.retrieveSession(ref.external_id) }
    } catch (err) {
      console.error('[bread] stripe: retrieve failed', err)
      return { ok: false, reason: 'create_failed' }
    }
  }

  const { rows: items } = await db.query<{ product_id: string; name: string; quantity: number; unit_price_cents: number }>(
    `SELECT oi.product_id, p.name, oi.quantity, oi.unit_price_cents FROM order_items oi JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1::uuid ORDER BY oi.product_id`,
    [orderId],
  )
  const description = `Pickup ${formatYmd(order.date)}, 5–11 PM at ${PICKUP_PLACE}`
  let session: GatewaySession
  try {
    session = await gateway.createSession(
      {
        orderId,
        lines: items.map((i) => ({ name: i.name, unitAmountCents: i.unit_price_cents, quantity: i.quantity })),
        expiresAt: Math.floor(ref.session_expires_ms / 1000),
        successUrl: urls.successUrl,
        cancelUrl: urls.cancelUrl,
        description,
      },
      orderId,
    )
  } catch (err) {
    console.error('[bread] stripe: create failed', err)
    return { ok: false, reason: 'create_failed' }
  }
  // Only ever fill an empty slot: two racing creates got the same session anyway.
  await db.query(
    "UPDATE payment_references SET external_id = $2, livemode = $3, updated_at = $4::timestamptz WHERE id = $1 AND external_id IS NULL",
    [ref.id, session.id, session.livemode, new Date(deps.clock.now()).toISOString()],
  )
  return { ok: true, session }
}

// ── finalizePayment ───────────────────────────────────────────────────────

export type FinalizeOutcome = { ok: true; order: Order; already: boolean } | { ok: false; reason: 'not_found' | ExceptionKind }

/**
 * Stripe says this session is paid. Check that it is the payment we asked
 * for, then convert the hold — exactly once, however many callers arrive.
 * Anything that does not add up keeps the stock and leaves a note for her.
 */
export async function finalizePayment(deps: PaymentDeps, session: GatewaySession): Promise<FinalizeOutcome> {
  const { db, clock, gateway } = deps
  const nowMs = clock.now()
  const now = new Date(nowMs).toISOString()
  const orderId = session.metadata.order_id ?? session.clientReferenceId ?? ''
  const located = await db.query<{ date: string }>('SELECT date::text AS date FROM orders WHERE id = $1::uuid', [/^[0-9a-f-]{36}$/i.test(orderId) ? orderId : '00000000-0000-4000-8000-000000000000'])
  if (!located.rows[0]) return { ok: false, reason: 'not_found' }
  const date = located.rows[0].date

  return db.transaction(async (tx) => {
    await lockDate(tx, date)
    const { rows } = await tx.query<{ status: Order['status']; total_cents: number; provider: string }>('SELECT status, total_cents, provider FROM orders WHERE id = $1::uuid FOR UPDATE', [orderId])
    const order = rows[0]
    const ref = await stripeRef(tx, orderId)
    if (ref?.status === 'succeeded' && ref.external_id === session.id) {
      return { ok: true, order: (await readOrder(tx, orderId, nowMs))!, already: true }
    }

    const refuse = async (kind: ExceptionKind, detail: Record<string, unknown>): Promise<FinalizeOutcome> => {
      await recordException(tx, orderId, session.id, kind, detail, nowMs)
      return { ok: false, reason: kind }
    }
    if (session.paymentStatus !== 'paid') return refuse('amount_mismatch', { paymentStatus: session.paymentStatus })
    if (session.mode !== 'payment') return refuse('mode_mismatch', { mode: session.mode })
    if (session.livemode !== gateway.livemode) return refuse('livemode_mismatch', { sessionLivemode: session.livemode, expected: gateway.livemode })
    if (session.currency?.toLowerCase() !== CURRENCY) return refuse('currency_mismatch', { currency: session.currency })
    if (session.amountTotal !== order.total_cents) return refuse('amount_mismatch', { amountTotal: session.amountTotal, expected: order.total_cents })
    if (session.metadata.order_id !== orderId || (session.clientReferenceId && session.clientReferenceId !== orderId)) {
      return refuse('order_mismatch', { metadata: session.metadata, clientReferenceId: session.clientReferenceId })
    }
    if (ref && ref.external_id && ref.external_id !== session.id) return refuse('order_mismatch', { expectedSession: ref.external_id })
    if (order.status === 'paid') return refuse('duplicate_payment', { paidVia: 'earlier confirmation' })

    let forced = false
    if (order.status !== 'reserved') {
      // The stock had already gone back into the pool; Stripe took the money
      // regardless, so it is taken again — over capacity if it must be — and
      // flagged for her.
      await sweep(tx, date, nowMs)
      await ensureInventory(tx, date)
      const items = await tx.query<{ product_id: string; quantity: number }>('SELECT product_id, quantity FROM order_items WHERE order_id = $1::uuid ORDER BY product_id', [orderId])
      for (const { product_id, quantity } of items.rows) {
        if (await take(tx, date, product_id, quantity, true)) continue
        await tx.query(
          `UPDATE date_inventory SET overflow = overflow + (committed + $3 - capacity - overflow), committed = committed + $3 WHERE date = $1::date AND product_id = $2`,
          [date, product_id, quantity],
        )
        forced = true
      }
      await recordException(tx, orderId, session.id, 'paid_after_release', { previousStatus: order.status, forced }, nowMs)
    }

    await tx.query("UPDATE orders SET status = 'paid', paid_at = $2::timestamptz, ended_at = NULL, forced = forced OR $3 WHERE id = $1::uuid", [orderId, now, forced])
    if (ref) {
      await tx.query(
        `UPDATE payment_references SET status = 'succeeded', external_id = COALESCE(external_id, $2), payment_intent_id = $3, livemode = $4, confirmed_by = 'stripe', updated_at = $5::timestamptz, last_checked_at = $5::timestamptz
         WHERE id = $1`,
        [ref.id, session.id, session.paymentIntentId, session.livemode, now],
      )
    } else {
      await tx.query(
        `INSERT INTO payment_references (order_id, provider, external_id, idempotency_key, status, amount_cents, payment_intent_id, livemode, confirmed_by, created_at, updated_at)
         VALUES ($1::uuid, 'stripe', $2, $1, 'succeeded', $3, $4, $5, 'stripe', $6::timestamptz, $6::timestamptz)`,
        [orderId, session.id, session.amountTotal, session.paymentIntentId, session.livemode, now],
      )
    }
    await tx.query("UPDATE payment_references SET status = 'expired', updated_at = $2::timestamptz WHERE order_id = $1::uuid AND status = 'pending'", [orderId, now])
    return { ok: true, order: (await readOrder(tx, orderId, nowMs))!, already: false }
  })
}

// ── releaseStripe ─────────────────────────────────────────────────────────

/** The bread goes back, once. Only called after Stripe has confirmed the session is dead. */
export async function releaseStripe(deps: PaymentDeps, orderId: string, sessionId: string | null): Promise<boolean> {
  const { db, clock } = deps
  const nowMs = clock.now()
  const now = new Date(nowMs).toISOString()
  const located = await db.query<{ date: string }>('SELECT date::text AS date FROM orders WHERE id = $1::uuid', [orderId])
  if (!located.rows[0]) return false
  const date = located.rows[0].date
  return db.transaction(async (tx) => {
    await lockDate(tx, date)
    const { rows } = await tx.query<{ id: string }>(
      "UPDATE orders SET status = 'expired', ended_at = $2::timestamptz WHERE id = $1::uuid AND status = 'reserved' AND provider = 'stripe' RETURNING id",
      [orderId, now],
    )
    if (!rows[0]) return false
    await tx.query(
      `UPDATE date_inventory di SET committed = di.committed - oi.quantity
       FROM order_items oi WHERE oi.order_id = $1::uuid AND di.date = $2::date AND di.product_id = oi.product_id`,
      [orderId, date],
    )
    await tx.query(
      "UPDATE payment_references SET status = 'expired', external_id = COALESCE(external_id, $3), updated_at = $2::timestamptz, last_checked_at = $2::timestamptz WHERE order_id = $1::uuid AND provider = 'stripe' AND status = 'pending'",
      [orderId, now, sessionId],
    )
    return true
  })
}

// ── reconcileOrder ────────────────────────────────────────────────────────

export type ReconcileState = 'paid' | 'released' | 'open' | 'unknown' | 'uncertain' | 'attention' | 'not_stripe' | 'not_reserved' | 'not_found'

export interface ReconcileOptions {
  /** Make the session unusable first (customer backed out, admin cancelled), then settle. */
  forceExpire?: boolean
  successUrl?: string
  cancelUrl?: string
}

/**
 * Ask Stripe what became of a reserved card order and apply the answer.
 * Paid → finalize. Dead → release. Still open → leave it, unless it is past
 * its time or we were told to end it, in which case expire it and look
 * again — Stripe's word after the expiry attempt, not ours, decides.
 * Stripe unreachable → nothing changes; the stock stays held.
 */
export async function reconcileOrder(deps: PaymentDeps, orderId: string, opts: ReconcileOptions = {}): Promise<ReconcileState> {
  const { db, clock, gateway } = deps
  const nowMs = clock.now()
  const order = await readOrder(db, orderId, nowMs)
  if (!order) return 'not_found'
  if (order.provider !== 'stripe') return 'not_stripe'
  if (order.status !== 'reserved') return order.status === 'paid' ? 'paid' : 'not_reserved'
  const ref = await stripeRef(db, orderId)
  if (!ref || ref.status !== 'pending') return 'not_reserved'

  let session: GatewaySession
  if (!ref.external_id) {
    // The create never made it back to us (crash, timeout). Re-issuing it
    // with the same idempotency key gives us the session Stripe already has.
    const made = await ensureSession(deps, orderId, { successUrl: opts.successUrl ?? '', cancelUrl: opts.cancelUrl ?? '' })
    if (!made.ok) return 'unknown'
    session = made.session
  } else {
    try {
      session = await gateway.retrieveSession(ref.external_id)
    } catch (err) {
      console.error('[bread] stripe: retrieve failed', err)
      await db.query('UPDATE payment_references SET last_checked_at = $2::timestamptz WHERE id = $1', [ref.id, new Date(nowMs).toISOString()])
      return 'unknown'
    }
  }

  const apply = async (s: GatewaySession): Promise<ReconcileState | 'open'> => {
    if (s.status === 'complete' && s.paymentStatus === 'paid') {
      const done = await finalizePayment(deps, s)
      return done.ok ? 'paid' : 'attention'
    }
    if (s.status === 'expired' || (s.status === 'complete' && s.paymentStatus !== 'paid')) {
      await releaseStripe(deps, orderId, s.id)
      return 'released'
    }
    return 'open'
  }

  const first = await apply(session)
  if (first !== 'open') return first

  const pastHold = nowMs >= Date.parse(order.holdExpiresAt) || nowMs >= session.expiresAt * 1000 + STRIPE_HOLD_MARGIN_MINUTES * 60_000
  if (!opts.forceExpire && !pastHold) {
    await db.query('UPDATE payment_references SET last_checked_at = $2::timestamptz WHERE id = $1', [ref.id, new Date(nowMs).toISOString()])
    return 'open'
  }

  // End it, then believe only what Stripe shows afterwards: a payment that
  // slipped in first wins; an expired session is released; anything else is
  // left held and flagged.
  try {
    await gateway.expireSession(session.id)
  } catch (err) {
    console.warn('[bread] stripe: expire refused', err)
  }
  let after: GatewaySession
  try {
    after = await gateway.retrieveSession(session.id)
  } catch (err) {
    console.error('[bread] stripe: retrieve after expire failed', err)
    return 'unknown'
  }
  const second = await apply(after)
  if (second !== 'open') return second
  await db.transaction(async (tx) => {
    await recordException(tx, orderId, session.id, 'expire_uncertain', { status: after.status, paymentStatus: after.paymentStatus }, nowMs)
  })
  return 'uncertain'
}

/** Reserved card orders whose session should be dead by now, for a batch reconcile. */
export async function staleStripeOrders(db: Queryable, nowMs: number, dates?: readonly string[]): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT o.id FROM orders o WHERE o.provider = 'stripe' AND o.status = 'reserved' AND o.hold_expires_at <= $1::timestamptz
       ${dates && dates.length > 0 ? 'AND o.date IN (SELECT unnest(string_to_array($2, \',\'))::date)' : ''}
     ORDER BY o.hold_expires_at LIMIT 50`,
    dates && dates.length > 0 ? [new Date(nowMs).toISOString(), dates.join(',')] : [new Date(nowMs).toISOString()],
  )
  return rows.map((r) => r.id)
}

// ── syncRefunds ───────────────────────────────────────────────────────────

export type RefundSync =
  | { ok: true; refundedCents: number; refundPendingCents: number }
  | { ok: false; reason: 'not_found' | 'not_stripe' | 'no_payment' | 'unreachable' }

/**
 * Mirror Stripe's refunds for this order's payment. Always from a fresh
 * list, never from an event's snapshot, so out-of-order or repeated
 * deliveries cannot roll the number back. Succeeded refunds and ones still
 * in flight are kept apart. Touches nothing but the payment reference.
 */
export async function syncRefunds(deps: PaymentDeps, orderId: string): Promise<RefundSync> {
  const { db, clock, gateway } = deps
  const { rows } = await db.query<{ id: number; payment_intent_id: string | null }>(
    "SELECT id, payment_intent_id FROM payment_references WHERE order_id = $1::uuid AND provider = 'stripe' AND status = 'succeeded' LIMIT 1",
    [orderId],
  )
  const ref = rows[0]
  if (!ref) {
    const exists = await db.query<{ provider: string }>('SELECT provider FROM orders WHERE id = $1::uuid', [orderId])
    if (!exists.rows[0]) return { ok: false, reason: 'not_found' }
    return { ok: false, reason: exists.rows[0].provider === 'stripe' ? 'no_payment' : 'not_stripe' }
  }
  if (!ref.payment_intent_id) return { ok: false, reason: 'no_payment' }
  let refunds
  try {
    refunds = await gateway.listRefunds(ref.payment_intent_id)
  } catch (err) {
    console.error('[bread] stripe: refunds list failed', err)
    return { ok: false, reason: 'unreachable' }
  }
  const refundedCents = refunds.filter((r) => r.status === 'succeeded').reduce((s, r) => s + r.amountCents, 0)
  const refundPendingCents = refunds.filter((r) => r.status === 'pending' || r.status === 'requires_action').reduce((s, r) => s + r.amountCents, 0)
  const now = new Date(clock.now()).toISOString()
  await db.query('UPDATE payment_references SET refunded_cents = $2, refund_pending_cents = $3, refund_checked_at = $4::timestamptz, updated_at = $4::timestamptz WHERE id = $1', [
    ref.id,
    refundedCents,
    refundPendingCents,
    now,
  ])
  return { ok: true, refundedCents, refundPendingCents }
}

/** The order a Stripe payment belongs to, for charge.* and refund.* events. */
export async function orderForPaymentIntent(db: Queryable, paymentIntentId: string): Promise<string | null> {
  const { rows } = await db.query<{ order_id: string }>("SELECT order_id FROM payment_references WHERE provider = 'stripe' AND payment_intent_id = $1 LIMIT 1", [paymentIntentId])
  return rows[0]?.order_id ?? null
}

/** Where she refunds it: the payment in Stripe's Dashboard, test or live to match the key. */
export function dashboardPaymentUrl(paymentIntentId: string, livemode: boolean): string {
  return `https://dashboard.stripe.com/${livemode ? '' : 'test/'}payments/${paymentIntentId}`
}
