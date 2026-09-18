import { TIMEZONE, WEEKS_AHEAD, ZELLE_HANDLE, ZELLE_NAME, type ProductId } from '../../shared/config.ts'
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
  PublicProduct,
} from '../../shared/types.ts'
import { shortId } from '../../shared/types.ts'
import { addDays, isYmd, ymdInZone } from '../../shared/zoned.ts'
import { checkAdmin } from './auth.ts'
import { PG, pgCode, type Db } from './db/client.ts'
import { env, error, json, readJson } from './http.ts'
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
  type ProductRow,
} from './inventory.ts'
import { validateCheckout } from './validate.ts'

/**
 * The HTTP layer, built once from a database and a clock. Production passes
 * Netlify DB and the system clock; tests pass PGlite and a clock they hold
 * still. Nothing here reads Date.now() or process.env except the admin
 * password.
 */
export interface AppDeps {
  db: Db
  clock: Clock
}

export type Handler = (req: Request) => Promise<Response>

const ZELLE = { name: ZELLE_NAME, handle: ZELLE_HANDLE }
const UUID_LOOSE = /^[0-9a-f-]{32,36}$/i

const publicProduct = (p: ProductRow): PublicProduct => ({
  id: p.id as ProductId,
  name: p.name,
  blurb: p.blurb,
  priceCents: p.price_cents,
  capacityPerDay: p.daily_capacity,
})

const summarise = (order: Order): OrderSummary => ({
  id: order.id,
  shortId: shortId(order.id),
  date: order.date,
  name: order.name,
  qty: order.qty,
  amountCents: order.amountCents,
  status: order.status,
  holdExpiresAt: order.holdExpiresAt,
  zelle: ZELLE,
})

const adminOrder = (o: Order): AdminOrder => ({ ...o, shortId: shortId(o.id) })

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

export function createApp({ db, clock }: AppDeps) {
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
        return {
          date,
          blocked: s?.blocked ?? false,
          cutoffAt: new Date(cutoffFor(date)).toISOString(),
          open: now < cutoffFor(date),
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
    const checked = validateCheckout(body, products, clock.now())
    if (!checked.ok) return error(checked.code, checked.status)

    const outcome = await reserve(db, checked.value, products, clock)
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
    return json(response)
  })

  // ── GET /api/order?order=<id> ────────────────────────────────────────────
  const order = guard('order', async (req) => {
    if (req.method !== 'GET') return error('method_not_allowed', 405)
    const id = new URL(req.url).searchParams.get('order') ?? ''
    if (!UUID_LOOSE.test(id)) return error('bad_order', 400)
    const found = await readOrder(db, id, clock.now())
    if (!found) return error('not_found', 404)
    return json(summarise(found))
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
      orders: orders.map(adminOrder),
    }
  }

  const admin = guard('admin', async (req) => {
    const auth = checkAdmin(req, env.adminPassword)
    if (auth === 'unconfigured') return error('admin_not_configured', 503)
    if (auth === 'denied') return error('unauthorized', 401)
    const now = clock.now()

    if (req.method === 'GET') {
      const today = ymdInZone(now, TIMEZONE)
      const params = new URL(req.url).searchParams
      const from = params.get('from') ?? addDays(today, -7)
      const to = params.get('to') ?? addDays(today, WEEKS_AHEAD * 7)
      if (!isYmd(from) || !isYmd(to) || from > to) return error('bad_range', 400)
      const dates: string[] = []
      for (let d = from; d <= to && dates.length < 120; d = addDays(d, 1)) if (isPickupDay(d)) dates.push(d)
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
      return updated ? json(adminOrder(updated)) : error('not_found', 404)
    }
    if (body.action === 'markPaid') {
      const result = await markPaid(db, orderId, clock, body.force === true, 'admin')
      if (!result.ok) {
        return result.reason === 'not_found' ? error('not_found', 404) : error('would_exceed_capacity', 409, { remaining: result.remaining })
      }
      return json(adminOrder(result.order))
    }
    if (body.action === 'cancel') {
      const updated = await cancel(db, orderId, clock)
      return updated ? json(adminOrder(updated)) : error('not_found', 404)
    }
    return error('bad_action', 400)
  })

  return { availability, checkout, order, admin }
}
