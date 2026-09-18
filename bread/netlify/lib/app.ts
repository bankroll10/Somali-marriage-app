import {
  CARD_CHECKOUT_LEAD_MINUTES,
  PAYMENT_HOLD_HOURS,
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
import { cutoffFor, isPickupDay, pickupDates } from '../../shared/schedule.ts'
import type {
  AdminAction,
  AdminDay,
  AdminOrder,
  AdminResponse,
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
import { checkAdmin } from './auth.ts'
import { PG, pgCode, type Db, type Queryable } from './db/client.ts'
import { env, error, json, readJson, siteOrigin } from './http.ts'
import {
  cancel,
  listProducts,
  markPaid,
  ordersForDate,
  paidUnits,
  readOrder,
  reserve,
  setBlocked,
  setPickedUp,
  stockFor,
  type HoldTerms,
  type ProductRow,
} from './inventory.ts'
import type { StripeGateway } from './stripe/gateway.ts'
import { ensureSession, finalizePayment, reconcileOrder, staleStripeOrders, type PaymentDeps } from './stripe/payments.ts'
import { validateCheckout } from './validate.ts'

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

const ZELLE = { name: ZELLE_NAME, handle: ZELLE_HANDLE }
const UUID_LOOSE = /^[0-9a-f-]{32,36}$/i
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
function guard(name: string, fn: Handler): Handler {
  return async (req) => {
    try {
      return await fn(req)
    } catch (err) {
      if (pgCode(err) === PG.lockNotAvailable) return error('busy', 503)
      console.error(`[bread] ${name} failed`, err)
      return error('unavailable', 503)
    }
  }
}

export function createApp({ db, clock, gateway }: AppDeps) {
  const payments = (): PaymentDeps | null => (gateway ? { db, clock, gateway } : null)
  const urlsFor = (req: Request, orderId: string) => {
    const origin = siteOrigin(req)
    return { successUrl: `${origin}/thanks?order=${orderId}`, cancelUrl: `${origin}/?canceled=${orderId}` }
  }

  async function summarise(order: Order): Promise<OrderSummary> {
    const exceptions = await openExceptions(db, order.id)
    return {
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
      zelle: ZELLE,
    }
  }

  async function adminOrder(o: Order): Promise<AdminOrder> {
    return { ...o, shortId: shortId(o.id), exceptions: await openExceptions(db, o.id) }
  }

  // ── GET /api/availability ────────────────────────────────────────────────
  const availability = guard('availability', async (req) => {
    if (req.method !== 'GET') return error('method_not_allowed', 405)
    const now = clock.now()
    const dates = pickupDates(now)
    const [products, stock] = await Promise.all([listProducts(db), stockFor(db, dates, now)])
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
          // Card payment must be complete by the cutoff and Stripe needs its
          // 30 minutes, so the date closes to new checkouts a little early.
          open: now < cutoff - CARD_CHECKOUT_LEAD_MINUTES * MINUTE,
          remaining: s?.remaining ?? { sourdough: 0, banana: 0 },
        }
      }),
    }
    return json(body)
  })

  // ── POST /api/checkout ───────────────────────────────────────────────────
  const checkout = guard('checkout', async (req) => {
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
    if (cutoff - now < CARD_CHECKOUT_LEAD_MINUTES * MINUTE) return error('closing_soon', 409, { cutoffAt: new Date(cutoff).toISOString() })
    const sessionExpiresMs = Math.max(now + SESSION_MIN_MINUTES * MINUTE, Math.min(cutoff, now + SESSION_MINUTES * MINUTE))
    const terms: HoldTerms = {
      provider: 'stripe',
      sessionExpiresAt: new Date(sessionExpiresMs).toISOString(),
      holdExpiresAt: new Date(sessionExpiresMs + STRIPE_HOLD_MARGIN_MINUTES * MINUTE).toISOString(),
    }

    const outcome = await reserve(db, checked.value, products, clock, terms)
    if (!outcome.ok) {
      return outcome.reason === 'sold_out' ? error('sold_out', 409, { remaining: outcome.remaining }) : error('blocked', 409)
    }
    const { order } = outcome
    const response: CheckoutResponse = {
      orderId: order.id,
      shortId: shortId(order.id),
      date: order.date,
      qty: order.qty,
      amountCents: order.amountCents,
      holdExpiresAt: order.holdExpiresAt,
      zelle: ZELLE,
      replayed: outcome.replayed,
    }
    // A replayed order that has already been decided is not sent back to Stripe.
    if (order.status !== 'reserved') return json(response)
    const made = await ensureSession(pay, order.id, urlsFor(req, order.id))
    if (!made.ok) {
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
    if (!UUID_LOOSE.test(id)) return error('bad_order', 400)
    const pay = payments()
    if (!pay) return error('payments_not_configured', 503)
    // Backing out is not evidence: the session is ended at Stripe and only
    // then, on Stripe's word, is the bread released.
    const state = await reconcileOrder(pay, id, { forceExpire: true, ...urlsFor(req, id) })
    return json({ state })
  })

  // ── GET /api/order?order=<id> ────────────────────────────────────────────
  const order = guard('order', async (req) => {
    if (req.method !== 'GET') return error('method_not_allowed', 405)
    const id = new URL(req.url).searchParams.get('order') ?? ''
    if (!UUID_LOOSE.test(id)) return error('bad_order', 400)
    let found = await readOrder(db, id, clock.now())
    if (!found) return error('not_found', 404)
    if (found.provider === 'stripe' && found.status === 'reserved') {
      // Every poll of the page is a server-side check with Stripe. The page
      // itself never gets to say the order is paid.
      const pay = payments()
      if (pay) {
        await reconcileOrder(pay, id, urlsFor(req, id))
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
        if (orderId && UUID_LOOSE.test(orderId)) await reconcileOrder(pay, orderId, urlsFor(req, orderId))
      }
    }
    await db.query('UPDATE webhook_events SET processed_at = $2::timestamptz WHERE id = $1', [event.id, now])
    return json({ received: true })
  })

  // ── scheduled: reconcile whatever Stripe should have decided by now ─────
  const reconcileStale = guard('reconcile', async (req) => {
    const pay = payments()
    if (!pay) return json({ reconciled: 0 })
    const ids = await staleStripeOrders(db, clock.now())
    const results: Record<string, string> = {}
    for (const id of ids) results[id] = await reconcileOrder(pay, id, urlsFor(req, id))
    return json({ reconciled: ids.length, results })
  })

  // ── /api/admin ───────────────────────────────────────────────────────────
  async function adminDay(date: string, now: number): Promise<AdminDay> {
    const [orders, toBake, stock] = await Promise.all([ordersForDate(db, date, now), paidUnits(db, date), stockFor(db, [date], now)])
    const s = stock.get(date)
    return {
      date,
      blocked: s?.blocked ?? false,
      cutoffAt: new Date(cutoffFor(date)).toISOString(),
      toBake,
      remaining: s?.remaining ?? { sourdough: 0, banana: 0 },
      orders: await Promise.all(orders.map(adminOrder)),
    }
  }

  const admin = guard('admin', async (req) => {
    const auth = checkAdmin(req, env.adminPassword)
    if (auth === 'unconfigured') return error('admin_not_configured', 503)
    if (auth === 'denied') return error('unauthorized', 401)
    const now = clock.now()
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
      if (pay) for (const id of await staleStripeOrders(db, now, dates)) await reconcileOrder(pay, id, urlsFor(req, id))
      const days = await Promise.all(dates.map((d) => adminDay(d, now)))
      const body: AdminResponse = { now: new Date(now).toISOString(), days }
      return json(body)
    }
    if (req.method !== 'POST') return error('method_not_allowed', 405)

    const body = await readJson<Partial<AdminAction>>(req)
    if (body instanceof Response) return body

    if (body.action === 'block' || body.action === 'unblock') {
      if (!isYmd(body.date)) return error('bad_date', 400)
      await setBlocked(db, body.date, body.action === 'block', clock)
      return json(await adminDay(body.date, now))
    }
    const orderId = (body as { orderId?: unknown }).orderId
    if (typeof orderId !== 'string' || !UUID_LOOSE.test(orderId)) return error('bad_request', 400)

    if (body.action === 'pickedUp') {
      if (typeof body.pickedUp !== 'boolean') return error('bad_request', 400)
      const updated = await setPickedUp(db, orderId, body.pickedUp, clock)
      return updated ? json(await adminOrder(updated)) : error('not_found', 404)
    }

    // A card order still reserved is decided by Stripe before she can touch
    // it: its session is ended and settled, and if the customer had in fact
    // paid, that is what she is told.
    const settleStripe = async (): Promise<Response | null> => {
      const current = await readOrder(db, orderId, now)
      if (!current) return error('not_found', 404)
      if (current.provider !== 'stripe' || current.status !== 'reserved') return null
      if (!pay) return error('payments_not_configured', 503)
      const state = await reconcileOrder(pay, orderId, { forceExpire: true, ...urlsFor(req, orderId) })
      if (state === 'paid') return error('already_paid', 409, { order: await adminOrder((await readOrder(db, orderId, now))!) })
      if (state === 'unknown' || state === 'uncertain' || state === 'attention') return error('payment_uncertain', 409, { state })
      return null
    }

    if (body.action === 'markPaid') {
      const settled = await settleStripe()
      if (settled) return settled
      const result = await markPaid(db, orderId, clock, body.force === true, 'admin')
      if (!result.ok) {
        return result.reason === 'not_found' ? error('not_found', 404) : error('would_exceed_capacity', 409, { remaining: result.remaining })
      }
      return json(await adminOrder(result.order))
    }
    if (body.action === 'cancel') {
      const settled = await settleStripe()
      if (settled) return settled
      const updated = await cancel(db, orderId, clock)
      return updated ? json(await adminOrder(updated)) : error('not_found', 404)
    }
    if (body.action === 'resolveException') {
      if (!Number.isInteger(body.exceptionId)) return error('bad_request', 400)
      await db.query('UPDATE payment_exceptions SET resolved_at = $3::timestamptz, resolved_by = $4 WHERE id = $1 AND order_id = $2::uuid AND resolved_at IS NULL', [
        body.exceptionId,
        orderId,
        new Date(now).toISOString(),
        'admin',
      ])
      const updated = await readOrder(db, orderId, now)
      return updated ? json(await adminOrder(updated)) : error('not_found', 404)
    }
    return error('bad_action', 400)
  })

  return { availability, checkout, cancelCheckout, order, webhook, reconcileStale, admin }
}

/** Hold terms for a Zelle order, kept for the manual path and the tests. */
export function zelleTerms(nowMs: number): HoldTerms {
  return { provider: 'zelle', holdExpiresAt: new Date(nowMs + PAYMENT_HOLD_HOURS * 3_600_000).toISOString() }
}
