import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fixedClock, type FixedClock } from '../shared/clock.ts'
import type { AdminDay, AdminOrder, Qty } from '../shared/types.ts'
import { createApp, zelleTerms } from '../netlify/lib/app.ts'
import type { Db } from '../netlify/lib/db/client.ts'
import { listProducts, reserve } from '../netlify/lib/inventory.ts'
import { adminHeaders } from './adminSession.ts'
import { assertLedger, freshDb } from './db.ts'
import { fakeStripe } from './fakeStripe.ts'

/**
 * Her page during a shift: what to bake, who is coming, what is on hold, and
 * the three decisions she can take — block a date, mark bread handed over,
 * decide a paid customer will not be getting bread. Payment state and
 * fulfilment state are separate throughout; a refund at Stripe is mirrored
 * and changes neither. Clock held at Friday Sep 18 2026, noon Chicago.
 */
const NOW = Date.UTC(2026, 8, 18, 17)
const MON = '2026-09-21'
const WED = '2026-09-23'
const THU = '2026-09-24'
const HOUR = 3_600_000
const ADMIN = 'Biz-operations'

let db: Db
let clock: FixedClock
let stripe: ReturnType<typeof fakeStripe>
let app: ReturnType<typeof createApp>
let asAdmin: Record<string, string>

beforeEach(async () => {
  ;({ db } = await freshDb())
  clock = fixedClock(NOW)
  stripe = fakeStripe()
  app = createApp({ db, clock, gateway: stripe.gateway })
  process.env.ADMIN_PASSWORD = ADMIN
  asAdmin = await adminHeaders(app, ADMIN)
})
afterEach(() => assertLedger(db))

const post = (fn: (r: Request) => Promise<Response>, path: string, body: unknown, headers: Record<string, string> = {}) =>
  fn(new Request(`https://bread.example${path}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers }))
const get = (fn: (r: Request) => Promise<Response>, path: string, headers: Record<string, string> = {}) => fn(new Request(`https://bread.example${path}`, { headers }))
const act = (body: unknown) => post(app.admin, '/api/admin', body, asAdmin)
const buy = (date = WED, qty: Partial<Qty> = { sourdough: 2, banana: 1 }, name = 'Amina Ali') =>
  post(app.checkout, '/api/checkout', { date, qty, name, phone: '(612) 555-0199', checkoutKey: crypto.randomUUID() })
const hook = (type: string, sessionId: string) => {
  const e = stripe.event(type, sessionId)
  return post(app.webhook, '/api/stripe-webhook', e.body, e.headers)
}
const refundHook = (type: string, pi: string) => {
  const e = stripe.refundEvent(type, pi)
  return post(app.webhook, '/api/stripe-webhook', e.body, e.headers)
}
const dayOf = async (date: string): Promise<AdminDay> => (await (await get(app.admin, `/api/admin?from=${date}&to=${date}`, asAdmin)).json()).days[0]
const committed = async (date: string, product = 'sourdough') =>
  (await db.query<{ committed: number }>('SELECT committed FROM date_inventory WHERE date = $1::date AND product_id = $2', [date, product])).rows[0]?.committed ?? 0
const actions = async () => (await db.query<{ action: string }>('SELECT action FROM admin_actions ORDER BY id')).rows.map((r) => r.action)

/** A card order paid through the webhook. */
async function paidCard(date = WED, qty: Partial<Qty> = { sourdough: 2, banana: 1 }, name = 'Amina Ali'): Promise<{ orderId: string; sessionId: string; pi: string }> {
  const { orderId } = await (await buy(date, qty, name)).json()
  const sessionId = `cs_test_${stripe.created.length}`
  stripe.pay(sessionId)
  await hook('checkout.session.completed', sessionId)
  return { orderId, sessionId, pi: `pi_${sessionId}` }
}
async function zelle(qty: Partial<Qty>, date = WED, name = 'Zed Zelle') {
  const products = await listProducts(db)
  const out = await reserve(db, { date, qty: { sourdough: 0, banana: 0, ...qty }, name, phone: '6125550000', checkoutKey: crypto.randomUUID() }, products, clock, zelleTerms(clock.now()))
  if (!out.ok) throw new Error(`zelle reserve refused: ${out.reason}`)
  return out.order
}

describe('the day', () => {
  it('opens on the next pickup date, with capacity, paid, held and free told apart', async () => {
    const body = await (await get(app.admin, '/api/admin', asAdmin)).json()
    expect(body).toMatchObject({ today: '2026-09-18', nextPickupDate: MON })
    const wed0: AdminDay = body.days.find((d: AdminDay) => d.date === WED)
    expect(wed0).toMatchObject({ capacity: { sourdough: 3, banana: 4 }, toBake: { sourdough: 0, banana: 0 }, held: { sourdough: 0, banana: 0 }, remaining: { sourdough: 3, banana: 4 }, activeCheckouts: 0, open: true, blocked: false })

    await buy() // on Stripe's page
    const wed1 = await dayOf(WED)
    expect(wed1).toMatchObject({ toBake: { sourdough: 0, banana: 0 }, held: { sourdough: 2, banana: 1 }, remaining: { sourdough: 1, banana: 3 }, activeCheckouts: 1 })
    expect(wed1.orders[0]).toMatchObject({ status: 'reserved', fulfillment: 'owed', refundedCents: 0, refundPendingCents: 0 })
    expect(wed1.orders[0].stripeUrl).toBeUndefined()

    stripe.pay('cs_test_1')
    await hook('checkout.session.completed', 'cs_test_1')
    const wed2 = await dayOf(WED)
    expect(wed2).toMatchObject({ toBake: { sourdough: 2, banana: 1 }, held: { sourdough: 0, banana: 0 }, remaining: { sourdough: 1, banana: 3 }, activeCheckouts: 0 })
    expect(wed2.orders[0]).toMatchObject({ status: 'paid', fulfillment: 'owed', stripeUrl: 'https://dashboard.stripe.com/test/payments/pi_cs_test_1', resellableIfRestocked: true })
  })

  it('counts a lapsed Zelle hold as neither held nor to bake, and a live one as held', async () => {
    await zelle({ banana: 2 })
    expect(await dayOf(WED)).toMatchObject({ held: { sourdough: 0, banana: 2 }, remaining: { sourdough: 3, banana: 2 } })
    clock.advance(4 * HOUR)
    expect(await dayOf(WED)).toMatchObject({ held: { sourdough: 0, banana: 0 }, remaining: { sourdough: 3, banana: 4 }, toBake: { sourdough: 0, banana: 0 } })
  })

  it('does not put pending, expired or cancelled bread on the bake list', async () => {
    const { orderId } = await (await buy(WED, { sourdough: 1 })).json()
    await zelle({ sourdough: 1 }, WED, 'Lapsed')
    clock.advance(4 * HOUR)
    await act({ action: 'cancel', orderId })
    expect(await dayOf(WED)).toMatchObject({ toBake: { sourdough: 0, banana: 0 }, held: { sourdough: 0, banana: 0 }, remaining: { sourdough: 3, banana: 4 } })
  })
})

describe('blocking a date', () => {
  it('stops new orders, keeps paid orders owed and live holds held, reports both, and cancels nothing', async () => {
    const paid = await paidCard(THU, { sourdough: 1 }, 'Paid Pat')
    const { orderId: held } = await (await buy(THU, { banana: 1 }, 'Holding Hal')).json()

    const res = await act({ action: 'block', date: THU, reason: 'Out of town' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.day).toMatchObject({ date: THU, blocked: true, blockedReason: 'Out of town', open: false, toBake: { sourdough: 1, banana: 0 }, held: { sourdough: 0, banana: 1 } })
    expect(body.affected.owed.map((o: AdminOrder) => [o.name, o.status, o.fulfillment])).toEqual([['Paid Pat', 'paid', 'owed']])
    expect(body.affected.holds.map((o: AdminOrder) => [o.name, o.status])).toEqual([['Holding Hal', 'reserved']])

    // Customers: closed. Her: everything exactly as it was.
    expect((await buy(THU, { sourdough: 1 })).status).toBe(409)
    const avail = await (await get(app.availability, '/api/availability')).json()
    expect(avail.days.find((d: { date: string }) => d.date === THU)).toMatchObject({ blocked: true })
    const rows = (await db.query<{ id: string; status: string; fulfillment: string }>('SELECT id, status, fulfillment FROM orders WHERE date = $1::date ORDER BY seq', [THU])).rows
    expect(rows).toEqual([
      { id: paid.orderId, status: 'paid', fulfillment: 'owed' },
      { id: held, status: 'reserved', fulfillment: 'owed' },
    ])
    expect((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM payment_references WHERE refunded_cents > 0')).rows[0].n).toBe(0)
    expect(await committed(THU, 'sourdough')).toBe(1)
    expect(await committed(THU, 'banana')).toBe(1)
    expect((await db.query<{ blocked_by: string; blocked_reason: string }>('SELECT blocked_by, blocked_reason FROM pickup_dates WHERE date = $1::date', [THU])).rows[0]).toEqual({ blocked_by: 'admin', blocked_reason: 'Out of town' })

    // The held customer can still finish paying on a blocked date: the hold was honoured.
    stripe.pay('cs_test_2')
    await hook('checkout.session.completed', 'cs_test_2')
    expect(await dayOf(THU)).toMatchObject({ toBake: { sourdough: 1, banana: 1 }, held: { sourdough: 0, banana: 0 } })

    const un = await (await act({ action: 'unblock', date: THU })).json()
    expect(un.day).toMatchObject({ blocked: false, open: true })
    expect(un.day.blockedReason).toBeUndefined()
    expect((await buy(THU, { sourdough: 1 })).status).toBe(200)
    expect(await actions()).toEqual(['block', 'unblock'])
  })

  it('takes the date lock, so a block never lands between a reservation’s check and its commit', async () => {
    // With one connection the lock is trivially serial; the multi-connection
    // proof is in contention.test.ts. Here: a block on a date nobody has
    // touched creates the row under the lock rather than racing an insert.
    await act({ action: 'block', date: MON })
    expect((await buy(MON, { sourdough: 1 })).status).toBe(409)
    expect((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM pickup_dates WHERE date = $1::date', [MON])).rows[0].n).toBe(1)
  })
})

describe('fulfilment, apart from payment', () => {
  it('marks paid bread picked up and back, and refuses to on anything unpaid', async () => {
    const { orderId } = await paidCard()
    const on = await (await act({ action: 'pickedUp', orderId, pickedUp: true })).json()
    expect(on).toMatchObject({ status: 'paid', fulfillment: 'picked_up', pickedUpAt: new Date(NOW).toISOString() })
    expect(await dayOf(WED)).toMatchObject({ toBake: { sourdough: 2, banana: 1 } }) // still bread she made
    const off = await (await act({ action: 'pickedUp', orderId, pickedUp: false })).json()
    expect(off).toMatchObject({ fulfillment: 'owed' })
    expect(off.pickedUpAt).toBeUndefined()

    const { orderId: reserved } = await (await buy(THU, { banana: 1 })).json()
    const res = await act({ action: 'pickedUp', orderId: reserved, pickedUp: true })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'not_paid' })
    expect((await act({ action: 'pickedUp', orderId: '00000000-0000-4000-8000-000000000000', pickedUp: true })).status).toBe(404)
  })

  it('cancelling a paid order without restocking takes it off the bake list and keeps the units committed', async () => {
    const { orderId } = await paidCard(WED, { sourdough: 2 })
    const res = await act({ action: 'cancelPaid', orderId, restock: false, note: 'Customer moved away' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.order).toMatchObject({ status: 'paid', fulfillment: 'cancelled', fulfillmentNote: 'Customer moved away', refundedCents: 0 })
    expect(body.order.restockedAt).toBeUndefined()
    expect(await dayOf(WED)).toMatchObject({ toBake: { sourdough: 0, banana: 0 }, remaining: { sourdough: 1, banana: 4 } })
    expect(await committed(WED)).toBe(2)
    expect((await act({ action: 'pickedUp', orderId, pickedUp: true })).status).toBe(409)
    expect(await (await act({ action: 'cancelPaid', orderId, restock: true })).json()).toEqual({ error: 'already_cancelled' })
    expect(await actions()).toEqual(['cancelPaid'])
  })

  it('cancelling with restock returns the units, and says whether anyone can still buy them', async () => {
    const { orderId } = await paidCard(WED, { sourdough: 2 })
    const res = await (await act({ action: 'cancelPaid', orderId, restock: true })).json()
    expect(res.resellable).toBe(true)
    expect(res.order).toMatchObject({ fulfillment: 'cancelled', restockedAt: new Date(NOW).toISOString() })
    expect(await dayOf(WED)).toMatchObject({ toBake: { sourdough: 0, banana: 0 }, remaining: { sourdough: 3, banana: 4 } })
    expect(await committed(WED)).toBe(0)
    expect((await buy(WED, { sourdough: 3 })).status).toBe(200)

    // On a blocked date the units still come back — and nobody can buy them, which she is told.
    const other = await paidCard(THU, { banana: 2 }, 'Thu Customer')
    await act({ action: 'block', date: THU })
    expect((await dayOf(THU)).orders[0].resellableIfRestocked).toBe(false)
    const blocked = await (await act({ action: 'cancelPaid', orderId: other.orderId, restock: true })).json()
    expect(blocked.resellable).toBe(false)
    expect(await dayOf(THU)).toMatchObject({ remaining: { sourdough: 3, banana: 4 }, blocked: true })
    expect((await buy(THU, { banana: 1 })).status).toBe(409)

    // Past the cutoff, likewise.
    const late = await paidCard(MON, { sourdough: 1 }, 'Mon Customer')
    clock.set(Date.UTC(2026, 8, 20, 12))
    expect((await act({ action: 'cancelPaid', orderId: late.orderId, restock: true })).status).toBe(200)
    expect((await dayOf(MON)).orders.find((o: AdminOrder) => o.id === late.orderId)).toMatchObject({ fulfillment: 'cancelled' })
  })

  it('refuses to fulfilment-cancel anything that is not paid', async () => {
    const { orderId } = await (await buy(THU, { banana: 1 })).json()
    expect(await (await act({ action: 'cancelPaid', orderId, restock: true })).json()).toEqual({ error: 'not_paid' })
    expect((await act({ action: 'cancelPaid', orderId, restock: 'yes' })).status).toBe(400)
  })
})

describe('refunds, mirrored from Stripe', () => {
  it('a partial then full refund shows on the order and changes neither bread nor fulfilment', async () => {
    const { orderId, pi } = await paidCard(WED, { sourdough: 1 }) // $5
    stripe.refund(pi, 200)
    expect((await refundHook('charge.refunded', pi)).status).toBe(200)
    let day = await dayOf(WED)
    expect(day.orders[0]).toMatchObject({ refundedCents: 200, refundPendingCents: 0, status: 'paid', fulfillment: 'owed' })
    expect(day).toMatchObject({ toBake: { sourdough: 1, banana: 0 }, remaining: { sourdough: 2, banana: 4 } })

    stripe.refund(pi, 300)
    await refundHook('refund.updated', pi)
    day = await dayOf(WED)
    expect(day.orders[0]).toMatchObject({ refundedCents: 500, fulfillment: 'owed' })
    expect(day).toMatchObject({ toBake: { sourdough: 1, banana: 0 }, remaining: { sourdough: 2, banana: 4 } })
    expect(await committed(WED)).toBe(1)

    // The bread comes off the list only when she says so, and the money is not touched by that.
    const cancelled = await (await act({ action: 'cancelPaid', orderId, restock: true })).json()
    expect(cancelled.order).toMatchObject({ fulfillment: 'cancelled', refundedCents: 500 })
    expect(await dayOf(WED)).toMatchObject({ toBake: { sourdough: 0, banana: 0 }, remaining: { sourdough: 3, banana: 4 } })
  })

  it('keeps pending refunds apart, ignores a payment it does not know, and can be asked by hand', async () => {
    const { orderId, pi } = await paidCard(WED, { banana: 1 })
    stripe.refund(pi, 300, 'pending')
    await refundHook('refund.created', pi)
    expect((await dayOf(WED)).orders[0]).toMatchObject({ refundedCents: 0, refundPendingCents: 300 })

    expect((await refundHook('charge.refunded', 'pi_nobody')).status).toBe(200)
    expect((await dayOf(WED)).orders[0]).toMatchObject({ refundedCents: 0, refundPendingCents: 300 })

    stripe.refunds.get(pi)![0].status = 'succeeded'
    const synced = await act({ action: 'syncRefund', orderId })
    expect(synced.status).toBe(200)
    expect(await synced.json()).toMatchObject({ refundedCents: 300, refundPendingCents: 0 })

    stripe.state.apiDown = true
    const down = await act({ action: 'syncRefund', orderId })
    expect(down.status).toBe(409)
    expect(await down.json()).toEqual({ error: 'payment_uncertain', state: 'unknown' })
  })

  it('has nothing to mirror for a Zelle order, and no Stripe link', async () => {
    const { id } = await zelle({ banana: 1 })
    await act({ action: 'markPaid', orderId: id })
    const order = (await dayOf(WED)).orders[0]
    expect(order).toMatchObject({ status: 'paid', refundedCents: 0 })
    expect(order.stripeUrl).toBeUndefined()
    expect(await (await act({ action: 'syncRefund', orderId: id })).json()).toEqual({ error: 'not_stripe' })
  })
})
