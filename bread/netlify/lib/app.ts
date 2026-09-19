import {
  CHECKOUT_WINDOW_MINUTES,
  MAX_CHECKOUTS_PER_IP,
  MAX_LIVE_HOLDS_PER_IP,
  PAYMENT_HOLD_HOURS,
  RECONCILE_MIN_INTERVAL_MS,
  SESSION_MINUTES,
  SESSION_MIN_MINUTES,
  STRIPE_HOLD_MARGIN_MINUTES,
  TIMEZONE,
  WEEKS_AHEAD,
  ZELLE_HANDLE,
  ZELLE_NAME,
  type ProductId,
} from '../../shared/config.ts'
import type { Clock } from '../../shared/clock.ts'
import { cardCheckoutOpen, cutoffFor, isPickupDay, pickupDates } from '../../shared/schedule.ts'
import type {
  AdminAction,
  AdminBlockResult,
  AdminDay,
  AdminOrder,
  AdminResponse,
  AdminSession,
  AvailabilityResponse,
  CheckoutRequest,
  CheckoutResponse,
  Order,
  OrderSummary,
  PaymentException,
  PublicProduct,
} from '../../shared/types.ts'
import { shortId } from '../../shared/types.ts'
import { addDays, isYmd, ymdInZone } from '../../shared/zoned.ts'
import { recordAction } from './audit.ts'
import { checkSession, issueSession, matches, recordAttempt, throttle } from './auth.ts'
import { PG, pgCode, type Db, type Queryable } from './db/client.ts'
import { env, error, json, readJson, siteOrigin } from './http.ts'
import { healthReport, opsState, recordJobRun } from './ops.ts'
import {
  cancel,
  cancelPaid,
  heldFor,
  heldUnits,
  listProducts,
  markPaid,
  ordersForDate,
  owedUnits,
  readOrder,
  resellable,
  reserve,
  setBlocked,
  setPickedUp,
  stockFor,
  type HoldTerms,
  type ProductRow,
  type ReserveLimits,
} from './inventory.ts'
import type { StripeGateway } from './stripe/gateway.ts'
import {
  dashboardPaymentUrl,
  ensureSession,
  finalizePayment,
  liveHoldsForPhone,
  orderForPaymentIntent,
  reconcileOrder,
  sessionRecorded,
  staleStripeOrders,
  syncRefunds,
  type PaymentDeps,
  type ReconcileState,
} from './stripe/payments.ts'
import { UUID_V4, validateCheckout } from './validate.ts'

/**
 * The HTTP layer, built once from a database, a clock and a payment gateway.
 * Production passes Netlify DB, the system clock and Stripe; tests pass
 * PGlite, a clock they hold still and a fake gateway with a session table
 * of its own. Nothing here reads Date.now() or process.env except the admin
 * password and the site origin.
 */
export interface AppDeps {
  db: Db
  clock: Clock
  /** null when Stripe is not configured: card checkout answers 503 and says so. */
  gateway: StripeGateway | null
}

export type Handler = (req: Request) => Promise<Response>

/** The single admin. There are no accounts to tell apart — see docs/BUILD_STATUS.md. */
const ACTOR = 'admin'

const ZELLE = { name: ZELLE_NAME, handle: ZELLE_HANDLE }
const MINUTE = 60_000

const publicProduct = (p: ProductRow): PublicProduct => ({
  id: p.id as ProductId,
  name: p.name,
  blurb: p.blurb,
  priceCents: p.price_cents,
  capacityPerDay: p.daily_capacity,
})

async function openExceptions(db: Queryable, orderId: string): Promise<PaymentException[]> {
  const { rows } = await db.query<{ id: number; session_id: string | null; kind: string; detail: unknown; created_ms: number }>(
    `SELECT id, session_id, kind, detail, extract(epoch FROM created_at)::float8 * 1000 AS created_ms
     FROM payment_exceptions WHERE order_id = $1::uuid AND resolved_at IS NULL ORDER BY id`,
    [orderId],
  )
  return rows.map((r) => ({
    id: r.id,
    orderId,
    sessionId: r.session_id,
    kind: r.kind,
    detail: (typeof r.detail === 'string' ? JSON.parse(r.detail) : r.detail) as Record<string, unknown>,
    createdAt: new Date(Math.round(r.created_ms)).toISOString(),
  }))
}

/** Turn a database failure into the right answer: a held lock is "busy", anything else is "unavailable". */
function guard<A extends unknown[]>(name: string, fn: (req: Request, ...args: A) => Promise<Response>): (req: Request, ...args: A) => Promise<Response> {
  return async (req, ...args) => {
    try {
      return await fn(req, ...args)
    } catch (err) {
      if (pgCode(err) === PG.lockNotAvailable) return error('busy', 503)
      console.error(`[bread] ${name} failed`, err)
      return error('unavailable', 503)
    }
  }
}

export function createApp({ db, clock, gateway }: AppDeps) {
  const payments = (): PaymentDeps | null => (gateway ? { db, clock, gateway } : null)

  async function summarise(order: Order): Promise<OrderSummary> {
    const exceptions = await openExceptions(db, order.id)
    const out: OrderSummary = {
      id: order.id,
      shortId: shortId(order.id),
      date: order.date,
      name: order.name,
      qty: order.qty,
      amountCents: order.amountCents,
      status: order.status,
      provider: order.provider,
      checking: order.provider === 'stripe' && order.status === 'reserved' && exceptions.length === 0,
      attention: exceptions.length > 0,
      holdExpiresAt: order.holdExpiresAt,
    }
    if (order.provider === 'zelle') out.zelle = ZELLE
    return out
  }

  /** The Stripe payment behind each paid card order, so the page can link straight to it. */
  async function stripeLinks(orderIds: readonly string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>()
    if (orderIds.length === 0) return out
    const { rows } = await db.query<{ order_id: string; payment_intent_id: string; livemode: boolean | null }>(
      `SELECT order_id, payment_intent_id, livemode FROM payment_references
       WHERE provider = 'stripe' AND payment_intent_id IS NOT NULL AND order_id IN (SELECT unnest(string_to_array($1, ','))::uuid)`,
      [orderIds.join(',')],
    )
    for (const r of rows) out.set(r.order_id, dashboardPaymentUrl(r.payment_intent_id, r.livemode ?? gateway?.livemode ?? false))
    return out
  }

  async function adminOrders(orders: readonly Order[], blocked: boolean, now: number): Promise<AdminOrder[]> {
    const links = await stripeLinks(orders.map((o) => o.id))
    return Promise.all(
      orders.map(async (o) => {
        const out: AdminOrder = {
          ...o,
          shortId: shortId(o.id),
          exceptions: await openExceptions(db, o.id),
          resellableIfRestocked: resellable(o.date, blocked, now),
        }
        const url = links.get(o.id)
        if (url) out.stripeUrl = url
        return out
      }),
    )
  }

  async function adminOrder(o: Order, now: number): Promise<AdminOrder> {
    const stock = await stockFor(db, [o.date], now)
    return (await adminOrders([o], stock.get(o.date)?.blocked ?? false, now))[0]
  }

  // ── GET /api/availability ────────────────────────────────────────────────
  const availability = guard('availability', async (req) => {
    if (req.method !== 'GET') return error('method_not_allowed', 405)
    const now = clock.now()
    const dates = pickupDates(now)
    const [products, stock, held] = await Promise.all([listProducts(db), stockFor(db, dates, now), heldFor(db, dates, now)])
    const body: AvailabilityResponse = {
      now: new Date(now).toISOString(),
      products: products.filter((p) => p.active).map(publicProduct),
      days: dates.map((date) => {
        const s = stock.get(date)
        const cutoff = cutoffFor(date)
        return {
          date,
          blocked: s?.blocked ?? false,
          cutoffAt: new Date(cutoff).toISOString(),
          open: cardCheckoutOpen(date, now),
          remaining: s?.remaining ?? { sourdough: 0, banana: 0 },
          held: held.get(date) ?? { sourdough: 0, banana: 0 },
        }
      }),
    }
    return json(body)
  })

  // ── POST /api/checkout ───────────────────────────────────────────────────
  const checkout = guard('checkout', async (req: Request, ip: string | null = null) => {
    if (req.method !== 'POST') return error('method_not_allowed', 405)
    const body = await readJson<Partial<CheckoutRequest>>(req)
    if (body instanceof Response) return body
    const products = await listProducts(db)
    const now = clock.now()
    const checked = validateCheckout(body, products, now)
    if (!checked.ok) return error(checked.code, checked.status)
    const pay = payments()
    if (!pay) return error('payments_not_configured', 503)

    // Payment must land by the displayed deadline. Stripe cannot make a
    // session shorter than 30 minutes, so inside the last half hour there is
    // no honest way to sell — the date is closed, and says so.
    const cutoff = cutoffFor(checked.value.date)
    if (!cardCheckoutOpen(checked.value.date, now)) {
      // A retry of an attempt that is still holding bread settles that hold
      // (nothing can pay it in time) before the customer is told.
      const { rows } = await db.query<{ id: string }>("SELECT id FROM orders WHERE checkout_key = $1::uuid AND status = 'reserved' AND provider = 'stripe'", [checked.value.checkoutKey])
      if (rows[0]) await reconcileOrder(pay, rows[0].id)
      return error('closing_soon', 409, { cutoffAt: new Date(cutoff).toISOString() })
    }

    // One live card hold per phone number. Starting again supersedes the
    // last attempt: it is ended at Stripe first and released only on
    // Stripe's word, so a customer who closed the payment page is not
    // locked out by their own hold, and a second tab cannot double it. Not
    // on a date she has closed: that checkout is refused as it stands.
    const dateOpen = !((await stockFor(db, [checked.value.date], now)).get(checked.value.date)?.blocked ?? false)
    if (dateOpen) for (const prior of await liveHoldsForPhone(db, checked.value.phone, checked.value.checkoutKey)) await reconcileOrder(pay, prior, { forceExpire: true })

    const sessionExpiresMs = Math.max(now + SESSION_MIN_MINUTES * MINUTE, Math.min(cutoff, now + SESSION_MINUTES * MINUTE))
    const terms: HoldTerms = {
      provider: 'stripe',
      sessionExpiresAt: new Date(sessionExpiresMs).toISOString(),
      holdExpiresAt: new Date(sessionExpiresMs + STRIPE_HOLD_MARGIN_MINUTES * MINUTE).toISOString(),
      returnOrigin: siteOrigin(req),
    }
    // A checkout is free and holds bread, so one address gets only so many.
    const limits: ReserveLimits = { ip, windowMs: CHECKOUT_WINDOW_MINUTES * MINUTE, maxRecent: MAX_CHECKOUTS_PER_IP, maxHolds: MAX_LIVE_HOLDS_PER_IP }

    const outcome = await reserve(db, checked.value, products, clock, terms, limits)
    if (!outcome.ok) {
      if (outcome.reason === 'sold_out') return error('sold_out', 409, { remaining: outcome.remaining })
      if (outcome.reason === 'too_many') return error('too_many_reservations', 429)
      return error('blocked', 409)
    }
    const { order } = outcome
    const response: CheckoutResponse = {
      orderId: order.id,
      shortId: shortId(order.id),
      date: order.date,
      qty: order.qty,
      amountCents: order.amountCents,
      holdExpiresAt: order.holdExpiresAt,
      replayed: outcome.replayed,
    }
    // A replayed order that has already been decided is not sent back to Stripe.
    if (order.status !== 'reserved') return json(response)
    const made = await ensureSession(pay, order.id)
    if (!made.ok) {
      if (made.reason === 'too_late') {
        // A retry so late that no session could end before the deadline:
        // the hold is settled (released — nothing was ever handed out) and
        // the date is closed to this customer as to everyone.
        await reconcileOrder(pay, order.id)
        return error('closing_soon', 409, { cutoffAt: new Date(cutoff).toISOString() })
      }
      // The reservation stands; a retry re-issues the same create.
      return error('payment_unavailable', 503, { orderId: order.id })
    }
    if (made.session.url) response.url = made.session.url
    return json(response)
  })

  // ── POST /api/cancel?order=<id> — the customer backed out of Stripe's page ──
  const cancelCheckout = guard('cancel', async (req) => {
    if (req.method !== 'POST') return error('method_not_allowed', 405)
    const id = new URL(req.url).searchParams.get('order') ?? ''
    if (!UUID_V4.test(id)) return error('bad_order', 400)
    const pay = payments()
    if (!pay) return error('payments_not_configured', 503)
    // Backing out is not evidence: the session is ended at Stripe and only
    // then, on Stripe's word, is the bread released.
    const state = await reconcileOrder(pay, id, { forceExpire: true })
    return json({ state })
  })

  // ── GET /api/order?order=<id> ────────────────────────────────────────────
  const order = guard('order', async (req) => {
    if (req.method !== 'GET') return error('method_not_allowed', 405)
    const id = new URL(req.url).searchParams.get('order') ?? ''
    if (!UUID_V4.test(id)) return error('bad_order', 400)
    let found = await readOrder(db, id, clock.now())
    if (!found) return error('not_found', 404)
    if (found.provider === 'stripe' && found.status === 'reserved') {
      // Every poll of the page is a server-side check with Stripe. The page
      // itself never gets to say the order is paid. Polls a second apart
      // share one answer, so the page cannot be used to hammer Stripe.
      const pay = payments()
      if (pay) {
        await reconcileOrder(pay, id, { maxAgeMs: RECONCILE_MIN_INTERVAL_MS })
        found = (await readOrder(db, id, clock.now())) ?? found
      }
    }
    return json(await summarise(found))
  })

  // ── POST /api/stripe-webhook ─────────────────────────────────────────────
  const webhook = guard('webhook', async (req) => {
    if (req.method !== 'POST') return error('method_not_allowed', 405)
    const pay = payments()
    if (!pay) return error('payments_not_configured', 503)
    const signature = req.headers.get('stripe-signature') ?? ''
    // The raw body, byte for byte, is what the signature covers.
    const raw = await req.text()
    let event
    try {
      event = await pay.gateway.constructEvent(raw, signature)
    } catch (err) {
      console.warn('[bread] webhook: signature rejected', err)
      return error('bad_signature', 400)
    }
    const now = new Date(clock.now()).toISOString()
    await db.query('INSERT INTO webhook_events (id, type, received_at) VALUES ($1, $2, $3::timestamptz) ON CONFLICT (id) DO NOTHING', [event.id, event.type, now])

    if (event.session) {
      const paidNow = (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') && event.session.paymentStatus === 'paid'
      if (paidNow) {
        // Verified by signature and complete in itself: finalize from the event.
        await finalizePayment(pay, event.session)
      } else {
        // Expired, failed, unpaid, or out of order: ask Stripe afresh rather
        // than act on a snapshot that may be stale.
        const orderId = event.session.metadata.order_id ?? event.session.clientReferenceId
        if (orderId && UUID_V4.test(orderId)) await reconcileOrder(pay, orderId)
      }
    } else if (event.paymentIntentId && /^(charge\.|refund\.)/.test(event.type)) {
      // A refund (or a charge update) at Stripe: mirror it from a fresh
      // list, never from the event. Inventory and fulfilment are untouched.
      const orderId = await orderForPaymentIntent(db, event.paymentIntentId)
      if (orderId) await syncRefunds(pay, orderId)
      else console.warn('[bread] webhook: refund for a payment this app does not know', event.paymentIntentId)
    }
    await db.query('UPDATE webhook_events SET processed_at = $2::timestamptz WHERE id = $1', [event.id, now])
    return json({ received: true })
  })

  // ── scheduled: reconcile whatever Stripe should have decided by now ─────
  const reconcileStale = guard('reconcile', async () => {
    const started = clock.now()
    const pay = payments()
    // Counts by outcome only: order ids are the customer's key to their own
    // order page, and this endpoint answers anyone.
    const states: Partial<Record<ReconcileState, number>> = {}
    let ids: string[] = []
    if (pay) {
      ids = await staleStripeOrders(db, started)
      for (const id of ids) {
        const state = await reconcileOrder(pay, id)
        states[state] = (states[state] ?? 0) + 1
      }
    }
    const result = { reconciled: ids.length, states }
    // On the record, so the health endpoint and her page can show the job is alive.
    await recordJobRun(db, 'reconcile-stale', result, started, clock.now())
    return json(result)
  })

  // ── GET /api/health — is the deployed site wired up? Nothing about anyone. ─
  const health = guard('health', async (req) => {
    if (req.method !== 'GET') return error('method_not_allowed', 405)
    return json(await healthReport(db, gateway, Boolean(env.adminPassword), clock.now()))
  })

  // ── POST /api/admin-session — the password, once, for a session ───────
  const adminSignIn = guard('admin-session', async (req: Request, ip: string | null) => {
    if (req.method !== 'POST') return error('method_not_allowed', 405)
    const password = env.adminPassword
    if (!password) return error('admin_not_configured', 503)
    const now = clock.now()
    const gate = await throttle(db, ip, now)
    if (!gate.allowed) return error('too_many_attempts', 429, { retryAfterSeconds: gate.retryAfterSeconds })
    const body = await readJson<{ password?: unknown }>(req)
    if (body instanceof Response) return body
    const supplied = typeof body.password === 'string' ? body.password : ''
    const ok = supplied.length > 0 && matches(supplied, password)
    await recordAttempt(db, ip, ok, now)
    if (!ok) return error('unauthorized', 401)
    const session: AdminSession = issueSession(password, now)
    return json(session)
  })

  // ── /api/admin ───────────────────────────────────────────────────────────
  async function adminDay(date: string, now: number): Promise<AdminDay> {
    const [orders, toBake, held, stock] = await Promise.all([ordersForDate(db, date, now), owedUnits(db, date), heldUnits(db, date, now), stockFor(db, [date], now)])
    const s = stock.get(date)
    const blocked = s?.blocked ?? false
    const cutoff = cutoffFor(date)
    const day: AdminDay = {
      date,
      blocked,
      cutoffAt: new Date(cutoff).toISOString(),
      open: !blocked && cardCheckoutOpen(date, now),
      capacity: s?.capacity ?? { sourdough: 0, banana: 0 },
      toBake,
      held,
      remaining: s?.remaining ?? { sourdough: 0, banana: 0 },
      activeCheckouts: orders.filter((o) => o.status === 'reserved').length,
      orders: await adminOrders(orders, blocked, now),
    }
    if (blocked && s?.blockedReason) day.blockedReason = s.blockedReason
    return day
  }

  const admin = guard('admin', async (req) => {
    const now = clock.now()
    const auth = checkSession(req, env.adminPassword, now)
    if (auth === 'unconfigured') return error('admin_not_configured', 503)
    if (auth === 'expired') return error('session_expired', 401)
    if (auth === 'denied') return error('unauthorized', 401)
    const pay = payments()

    if (req.method === 'GET') {
      const today = ymdInZone(now, TIMEZONE)
      const params = new URL(req.url).searchParams
      const from = params.get('from') ?? addDays(today, -7)
      const to = params.get('to') ?? addDays(today, WEEKS_AHEAD * 7)
      if (!isYmd(from) || !isYmd(to) || from > to) return error('bad_range', 400)
      const dates: string[] = []
      for (let d = from; d <= to && dates.length < 120; d = addDays(d, 1)) if (isPickupDay(d)) dates.push(d)
      // Her page is one of the places abandoned sessions get settled.
      if (pay) for (const id of await staleStripeOrders(db, now, dates)) await reconcileOrder(pay, id)
      const days = await Promise.all(dates.map((d) => adminDay(d, now)))
      const ops = await opsState(db, gateway)
      const body: AdminResponse = {
        now: new Date(now).toISOString(),
        today,
        nextPickupDate: pickupDates(now)[0],
        days,
        ops: { livemode: ops.livemode, lastReconcileAt: ops.lastReconcileAt, lastWebhookAt: ops.lastWebhookAt },
      }
      return json(body)
    }
    if (req.method !== 'POST') return error('method_not_allowed', 405)

    const body = await readJson<Partial<AdminAction>>(req)
    if (body instanceof Response) return body

    if (body.action === 'block' || body.action === 'unblock') {
      if (!isYmd(body.date)) return error('bad_date', 400)
      const reason = body.action === 'block' && typeof body.reason === 'string' ? body.reason.slice(0, 200) : undefined
      // Under the date lock: strictly before or strictly after any
      // reservation in flight. Nothing on the date is cancelled, refunded or
      // released; what is there is reported back so she sees it.
      const affected = await setBlocked(db, body.date, body.action === 'block', clock, ACTOR, reason)
      await recordAction(db, { actor: ACTOR, action: body.action, date: body.date, detail: { reason: reason ?? null, owed: affected.owed.length, holds: affected.holds.length } }, now)
      const day = await adminDay(body.date, now)
      const result: AdminBlockResult = {
        day,
        affected: { owed: await adminOrders(affected.owed, day.blocked, now), holds: await adminOrders(affected.holds, day.blocked, now) },
      }
      return json(result)
    }
    const orderId = (body as { orderId?: unknown }).orderId
    if (typeof orderId !== 'string' || !UUID_V4.test(orderId)) return error('bad_request', 400)

    if (body.action === 'pickedUp') {
      if (typeof body.pickedUp !== 'boolean') return error('bad_request', 400)
      const result = await setPickedUp(db, orderId, body.pickedUp, clock, ACTOR)
      if (!result.ok) return result.reason === 'not_found' ? error('not_found', 404) : error(result.reason, 409)
      await recordAction(db, { actor: ACTOR, action: 'pickedUp', orderId, date: result.order.date, detail: { pickedUp: body.pickedUp } }, now)
      return json(await adminOrder(result.order, now))
    }

    if (body.action === 'cancelPaid') {
      if (typeof body.restock !== 'boolean') return error('bad_request', 400)
      const note = typeof body.note === 'string' ? body.note.slice(0, 300) : undefined
      const result = await cancelPaid(db, orderId, { restock: body.restock, note, actor: ACTOR }, clock)
      if (!result.ok) return result.reason === 'not_found' ? error('not_found', 404) : error(result.reason, 409)
      await recordAction(db, { actor: ACTOR, action: 'cancelPaid', orderId, date: result.order.date, detail: { restock: body.restock, resellable: result.resellable, note: note ?? null } }, now)
      return json({ order: await adminOrder(result.order, now), resellable: result.resellable })
    }

    if (body.action === 'syncRefund') {
      if (!pay) return error('payments_not_configured', 503)
      const synced = await syncRefunds(pay, orderId)
      if (!synced.ok) {
        if (synced.reason === 'not_found') return error('not_found', 404)
        if (synced.reason === 'unreachable') return error('payment_uncertain', 409, { state: 'unknown' })
        return error(synced.reason, 409)
      }
      const updated = await readOrder(db, orderId, now)
      return updated ? json(await adminOrder(updated, now)) : error('not_found', 404)
    }

    // A card order still reserved is decided by Stripe before she can touch
    // it: its session is ended and settled, and if the customer had in fact
    // paid, that is what she is told. An order that never got a session at
    // all has nothing at Stripe that could pay it, so she may act on it.
    const settleStripe = async (): Promise<Response | null> => {
      const current = await readOrder(db, orderId, now)
      if (!current) return error('not_found', 404)
      if (current.provider !== 'stripe' || current.status !== 'reserved') return null
      if (!pay) return error('payments_not_configured', 503)
      const state = await reconcileOrder(pay, orderId, { forceExpire: true })
      if (state === 'paid') return error('already_paid', 409, { order: await adminOrder((await readOrder(db, orderId, now))!, now) })
      if (state === 'unknown' || state === 'uncertain' || state === 'attention') {
        if (!(await sessionRecorded(db, orderId))) return null
        return error('payment_uncertain', 409, { state })
      }
      return null
    }

    if (body.action === 'markPaid') {
      const settled = await settleStripe()
      if (settled) return settled
      const result = await markPaid(db, orderId, clock, body.force === true, ACTOR)
      if (!result.ok) {
        return result.reason === 'not_found' ? error('not_found', 404) : error('would_exceed_capacity', 409, { remaining: result.remaining })
      }
      await recordAction(db, { actor: ACTOR, action: 'markPaid', orderId, date: result.order.date, detail: { force: body.force === true } }, now)
      return json(await adminOrder(result.order, now))
    }
    if (body.action === 'cancel') {
      const settled = await settleStripe()
      if (settled) return settled
      const updated = await cancel(db, orderId, clock)
      if (!updated) return error('not_found', 404)
      await recordAction(db, { actor: ACTOR, action: 'cancel', orderId, date: updated.date }, now)
      return json(await adminOrder(updated, now))
    }
    if (body.action === 'resolveException') {
      if (!Number.isInteger(body.exceptionId)) return error('bad_request', 400)
      await db.query('UPDATE payment_exceptions SET resolved_at = $3::timestamptz, resolved_by = $4 WHERE id = $1 AND order_id = $2::uuid AND resolved_at IS NULL', [
        body.exceptionId,
        orderId,
        new Date(now).toISOString(),
        ACTOR,
      ])
      const updated = await readOrder(db, orderId, now)
      if (!updated) return error('not_found', 404)
      await recordAction(db, { actor: ACTOR, action: 'resolveException', orderId, date: updated.date, detail: { exceptionId: body.exceptionId } }, now)
      return json(await adminOrder(updated, now))
    }
    return error('bad_action', 400)
  })

  return { availability, checkout, cancelCheckout, order, webhook, reconcileStale, admin, adminSignIn, health }
}

/** Hold terms for a Zelle order, kept for the manual path and the tests. */
export function zelleTerms(nowMs: number): HoldTerms {
  return { provider: 'zelle', holdExpiresAt: new Date(nowMs + PAYMENT_HOLD_HOURS * 3_600_000).toISOString() }
}
