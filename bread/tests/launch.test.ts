import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CARD_CHECKOUT_LEAD_MINUTES, MAX_LIVE_HOLDS_PER_IP, SESSION_MIN_MINUTES, TIMEZONE } from '../shared/config.ts'
import { fixedClock, type FixedClock } from '../shared/clock.ts'
import { cutoffFor, pickupStart } from '../shared/schedule.ts'
import { partsInZone } from '../shared/zoned.ts'
import { createApp } from '../netlify/lib/app.ts'
import type { Db } from '../netlify/lib/db/client.ts'
import { assertLedger, freshDb } from './db.ts'
import { adminHeaders } from './adminSession.ts'
import { fakeStripe } from './fakeStripe.ts'

/**
 * The launch-readiness scenarios, end to end through the HTTP handlers on a
 * real Postgres (PGlite) with Stripe faked: the first customer's $11, a
 * product selling out with *paid* orders while the other stays on sale,
 * the deadline to the millisecond on ordinary and daylight-saving dates,
 * tampered order links, and her totals staying consistent through pickups,
 * cancellations and refunds. Deterministic; not a Stripe test.
 */
const NOW = Date.UTC(2026, 8, 18, 17) // Fri Sep 18 2026, noon Chicago
const MON = '2026-09-21'
const WED = '2026-09-23'
const THU = '2026-09-24'
const MINUTE = 60_000
const ADMIN = 'test-admin-password'
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

let db: Db
let clock: FixedClock
let stripe: ReturnType<typeof fakeStripe>
let app: ReturnType<typeof createApp>
let asAdmin: Record<string, string>

beforeEach(async () => {
  ;({ db } = await freshDb())
  clock = fixedClock(NOW)
  stripe = fakeStripe(false, clock)
  app = createApp({ db, clock, gateway: stripe.gateway })
  process.env.ADMIN_PASSWORD = ADMIN
  asAdmin = await adminHeaders(app, ADMIN)
})
afterEach(() => assertLedger(db))

type Cart = { date?: string; qty?: Partial<Record<'sourdough' | 'banana', number>>; name?: string; phone?: string; checkoutKey?: string }
let customers = 0
/** A fresh customer each time: their own phone, their own key, from their own address unless one is named. */
function checkout(cart: Cart = {}, ip?: string) {
  const n = ++customers
  return app.checkout(
    new Request('https://bread.example/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ date: WED, qty: { sourdough: 1 }, name: `Customer ${n}`, phone: `612555${String(n).padStart(4, '0')}`, checkoutKey: crypto.randomUUID(), ...cart }),
    }),
    ip ?? `198.51.100.${n % 250}`,
  )
}
const get = (fn: (r: Request) => Promise<Response>, path: string, headers: Record<string, string> = {}) => fn(new Request(`https://bread.example${path}`, { headers }))
const post = (fn: (r: Request) => Promise<Response>, path: string, body: unknown, headers: Record<string, string> = {}) =>
  fn(new Request(`https://bread.example${path}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers }))
const availability = async () => (await (await get(app.availability, '/api/availability')).json()) as { days: { date: string; open: boolean; cutoffAt: string; remaining: Record<string, number>; held: Record<string, number> }[] }
const day = async (date: string) => (await availability()).days.find((d) => d.date === date)!
const adminDay = async (date: string) => (await (await get(app.admin, `/api/admin?from=${date}&to=${date}`, asAdmin)).json()).days[0]
const sessionOf = async (orderId: string) => (await db.query<{ external_id: string }>("SELECT external_id FROM payment_references WHERE order_id = $1::uuid AND provider = 'stripe'", [orderId])).rows[0].external_id
/** A customer who pays: the hold becomes a sale through the webhook. */
async function paid(cart: Cart = {}) {
  const res = await checkout(cart)
  expect(res.status, await res.clone().text()).toBe(200)
  const { orderId } = await res.json()
  const sid = await sessionOf(orderId)
  stripe.pay(sid)
  const { body, headers } = stripe.event('checkout.session.completed', sid)
  expect((await post(app.webhook, '/api/stripe-webhook', body, headers)).status).toBe(200)
  return orderId as string
}

describe('S1 — the first order', () => {
  it('1 sourdough + 2 banana bread is $11, on the response, in the database and on Stripe’s line items, with no tax anywhere', async () => {
    const res = await checkout({ qty: { sourdough: 1, banana: 2 }, name: 'Amina Ali' })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.amountCents).toBe(1100)
    expect(body.qty).toEqual({ sourdough: 1, banana: 2 })
    expect(body).not.toHaveProperty('zelle')
    expect(JSON.stringify(body)).not.toMatch(/tax/i)
    expect((await db.query('SELECT total_cents FROM orders')).rows[0]).toEqual({ total_cents: 1100 })
    const lines = stripe.created[0].params.lines
    expect(lines.reduce((s, l) => s + l.unitAmountCents * l.quantity, 0)).toBe(1100)
    expect(stripe.sessions.get(await sessionOf(body.orderId))?.amountTotal).toBe(1100)
    expect(Object.keys(stripe.created[0].params)).not.toContain('tax')
    // Once paid, the confirmation reads the same $11 and no more.
    stripe.pay(await sessionOf(body.orderId))
    const summary = await (await get(app.order, `/api/order?order=${body.orderId}`)).json()
    expect(summary).toMatchObject({ status: 'paid', amountCents: 1100, qty: { sourdough: 1, banana: 2 } })
  })
})

describe('S2, S3 — sold out per product, per date, with paid orders', () => {
  it('three paid sourdough sell Wednesday’s sourdough out while banana bread stays on sale; a fourth is refused', async () => {
    for (let i = 0; i < 3; i++) await paid({ qty: { sourdough: 1 } })
    expect(await day(WED)).toMatchObject({ remaining: { sourdough: 0, banana: 4 }, held: { sourdough: 0, banana: 0 } })
    const fourth = await checkout({ qty: { sourdough: 1 } })
    expect(fourth.status).toBe(409)
    expect(await fourth.json()).toEqual({ error: 'sold_out', remaining: { sourdough: 0, banana: 4 } })
    expect((await checkout({ qty: { banana: 1 } })).status).toBe(200)
    expect((await adminDay(WED)).toBake).toEqual({ sourdough: 3, banana: 0 })
    expect(await day(THU)).toMatchObject({ remaining: { sourdough: 3, banana: 4 } })
  })

  it('four paid banana bread sell out independently of sourdough; then the whole day is spoken for', async () => {
    for (let i = 0; i < 4; i++) await paid({ qty: { banana: 1 } })
    expect(await day(WED)).toMatchObject({ remaining: { sourdough: 3, banana: 0 } })
    expect(await (await checkout({ qty: { banana: 1 } })).json()).toEqual({ error: 'sold_out', remaining: { sourdough: 3, banana: 0 } })
    expect(await (await checkout({ qty: { sourdough: 1, banana: 1 } })).json()).toEqual({ error: 'sold_out', remaining: { sourdough: 3, banana: 0 } })
    for (let i = 0; i < 3; i++) await paid({ qty: { sourdough: 1 } })
    expect(await day(WED)).toMatchObject({ remaining: { sourdough: 0, banana: 0 } })
    expect((await adminDay(WED)).toBake).toEqual({ sourdough: 3, banana: 4 })
  })

  it('a date’s capacity is fixed the first time it is touched; a later capacity change applies to untouched dates only', async () => {
    await paid({ date: WED, qty: { sourdough: 1 } })
    await db.query("UPDATE products SET daily_capacity = 5 WHERE id = 'sourdough'")
    expect((await day(WED)).remaining.sourdough).toBe(2) // 3 − 1, as it was when first sold against
    expect((await day(THU)).remaining.sourdough).toBe(5) // nobody has touched Thursday yet
    expect((await adminDay(WED)).capacity).toEqual({ sourdough: 3, banana: 4 })
  })
})

describe('S4, S5 — dates apart, competing buyers, all-or-nothing', () => {
  it('a blocked date refuses checkout before Stripe is asked, and leaves the other dates alone', async () => {
    await post(app.admin, '/api/admin', { action: 'block', date: WED, reason: 'away' }, asAdmin)
    const res = await checkout({ date: WED })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'blocked' })
    expect(stripe.created).toHaveLength(0)
    expect((await checkout({ date: THU })).status).toBe(200)
  })

  it('two buyers for the last loaf: exactly one gets it, the other is told, and a mixed cart is taken entirely or not at all', async () => {
    await paid({ qty: { sourdough: 1 } })
    await paid({ qty: { sourdough: 1 } })
    const [a, b] = await Promise.all([checkout({ qty: { sourdough: 1 } }), checkout({ qty: { sourdough: 1 } })])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    expect((await db.query("SELECT committed FROM date_inventory WHERE date = $1::date AND product_id = 'sourdough'", [WED])).rows[0]).toEqual({ committed: 3 })
    const mixed = await checkout({ qty: { sourdough: 1, banana: 2 } })
    expect(await mixed.json()).toEqual({ error: 'sold_out', remaining: { sourdough: 0, banana: 4 } })
    expect((await db.query("SELECT committed FROM date_inventory WHERE date = $1::date AND product_id = 'banana'", [WED])).rows[0]).toEqual({ committed: 0 })
  })
})

describe('S8 — the deadline, to the millisecond', () => {
  it('the constants agree: the lead is longer than the shortest session, which is longer than Stripe’s minimum', () => {
    expect(SESSION_MIN_MINUTES).toBeGreaterThan(30)
    expect(CARD_CHECKOUT_LEAD_MINUTES).toBeGreaterThan(SESSION_MIN_MINUTES)
  })

  it('opens, closes for cards and closes outright at the same instants everywhere — the list, her page and the checkout', async () => {
    const cutoff = cutoffFor(MON)
    const lead = CARD_CHECKOUT_LEAD_MINUTES * MINUTE

    clock.set(cutoff - lead - 1)
    const ok = await checkout({ date: MON })
    expect(ok.status).toBe(200)
    expect(stripe.created[0].params.expiresAt).toBe(Math.floor(cutoff / 1000)) // the session ends at the deadline, never after
    expect((await day(MON)).open).toBe(true)
    expect((await adminDay(MON)).open).toBe(true)

    clock.set(cutoff - lead)
    const closing = await checkout({ date: MON })
    expect(closing.status).toBe(409)
    expect(await closing.json()).toEqual({ error: 'closing_soon', cutoffAt: new Date(cutoff).toISOString() })
    expect((await day(MON)).open).toBe(false)
    expect((await adminDay(MON)).open).toBe(false)

    clock.set(cutoff - 1)
    expect(await (await checkout({ date: MON })).json()).toMatchObject({ error: 'closing_soon' })
    clock.set(cutoff)
    expect(await (await checkout({ date: MON })).json()).toEqual({ error: 'closed' })
    clock.set(cutoff + 1)
    expect(await (await checkout({ date: MON })).json()).toEqual({ error: 'closed' })
    expect((await day(MON)).open).toBe(false)
    expect(stripe.created).toHaveLength(1)
  })

  it('across the daylight-saving changes the cutoff is 5 PM the day before, and checkout agrees to the millisecond', async () => {
    for (const [date, wall] of [
      ['2026-03-09', { month: 3, day: 8, hour: 17 }], // clocks went forward at 2 AM that Sunday
      ['2026-11-02', { month: 11, day: 1, hour: 17 }], // clocks went back at 2 AM that Sunday
    ] as const) {
      const cutoff = cutoffFor(date)
      expect(cutoff).toBe(pickupStart(date) - 24 * 3_600_000)
      expect(partsInZone(cutoff, TIMEZONE)).toMatchObject(wall)
      expect(partsInZone(pickupStart(date), TIMEZONE)).toMatchObject({ hour: 17, minute: 0 })

      clock.set(cutoff - (CARD_CHECKOUT_LEAD_MINUTES + 1) * MINUTE)
      expect((await day(date)).cutoffAt).toBe(new Date(cutoff).toISOString())
      const ok = await checkout({ date })
      expect(ok.status, date).toBe(200)
      expect(stripe.created.at(-1)!.params.expiresAt).toBe(Math.floor(cutoff / 1000))
      clock.set(cutoff - 1)
      expect(await (await checkout({ date })).json()).toMatchObject({ error: 'closing_soon' })
      clock.set(cutoff)
      expect(await (await checkout({ date })).json()).toEqual({ error: 'closed' })
    }
  })
})

describe('S11, S12 — what a link or a guess can reach', () => {
  it('a tampered or guessed order link reaches nothing: 404 for an unknown id, 400 for anything that is not a v4 UUID', async () => {
    const { orderId } = await (await checkout()).json()
    for (const bad of ['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'aaaaaaaa-aaaa-1aaa-aaaa-aaaaaaaaaaaa', `${orderId}x`, orderId.slice(1), '../etc/passwd', "1' OR '1'='1", '']) {
      expect((await get(app.order, `/api/order?order=${encodeURIComponent(bad)}`)).status, bad).toBe(400)
      expect((await post(app.cancelCheckout, `/api/cancel?order=${encodeURIComponent(bad)}`, '')).status, bad).toBe(400)
      expect((await post(app.admin, '/api/admin', { action: 'cancel', orderId: bad }, asAdmin)).status, bad).toBe(400)
    }
    expect((await get(app.order, '/api/order?order=deadbeef-dead-4eef-8ead-beefdeadbeef')).status).toBe(404)
    expect(await (await post(app.cancelCheckout, '/api/cancel?order=deadbeef-dead-4eef-8ead-beefdeadbeef', '')).json()).toEqual({ state: 'not_found' })
  })

  it('the public order summary carries no phone number, no Stripe ids and no key material, and landing on it never marks anything paid', async () => {
    const { orderId } = await (await checkout({ phone: '6125559876' })).json()
    for (let i = 0; i < 3; i++) {
      const text = await (await get(app.order, `/api/order?order=${orderId}`)).text()
      expect(text).not.toMatch(/6125559876|cs_|pi_|sk_|whsec_/)
      expect(JSON.parse(text)).toMatchObject({ status: 'reserved', checking: true })
      clock.advance(2_000)
    }
    expect((await db.query('SELECT status FROM orders')).rows[0]).toEqual({ status: 'reserved' })
  })

  it('the scheduled reconcile answers anyone with counts only, never an order id', async () => {
    await checkout()
    await checkout()
    clock.advance(60 * MINUTE)
    stripe.state.apiDown = true
    const body = await (await post(app.reconcileStale, '/api/reconcile', '')).text()
    expect(body).not.toMatch(UUID)
    expect(JSON.parse(body)).toEqual({ reconciled: 2, states: { unknown: 2 } })
  })

  it('without a session nobody reads orders, and the customer endpoints never list anything', async () => {
    await paid({ name: 'Private Person', phone: '6125550001' })
    for (const res of [await get(app.admin, '/api/admin'), await post(app.admin, '/api/admin', { action: 'block', date: WED })]) {
      expect(res.status).toBe(401)
      expect(await res.text()).not.toMatch(/Private Person|6125550001/)
    }
    expect(await (await get(app.availability, '/api/availability')).text()).not.toMatch(/Private Person|6125550001|[0-9a-f]{8}-[0-9a-f]{4}-4/)
    expect((await get(app.order, '/api/order')).status).toBe(400)
  })
})

describe('S13 — her totals through a real evening', () => {
  it('to bake, held, free and the ledger agree after pickups, a refund, a cancellation without restock and one with', async () => {
    const a = await paid({ qty: { sourdough: 1, banana: 1 } })
    const b = await paid({ qty: { sourdough: 1 } })
    const c = await paid({ qty: { banana: 2 } })
    const d = await paid({ qty: { sourdough: 1 } })
    const { orderId: held } = await (await checkout({ qty: { banana: 1 } })).json()
    expect(await adminDay(WED)).toMatchObject({ toBake: { sourdough: 3, banana: 3 }, held: { sourdough: 0, banana: 1 }, remaining: { sourdough: 0, banana: 0 } })

    // a picked up; b refunded in full at Stripe but not cancelled — still owed until she says otherwise.
    await post(app.admin, '/api/admin', { action: 'pickedUp', orderId: a, pickedUp: true }, asAdmin)
    stripe.refund(`pi_${await sessionOf(b)}`, 500)
    const { body, headers } = stripe.refundEvent('charge.refunded', `pi_${await sessionOf(b)}`)
    await post(app.webhook, '/api/stripe-webhook', body, headers)
    let dayNow = await adminDay(WED)
    expect(dayNow).toMatchObject({ toBake: { sourdough: 3, banana: 3 }, held: { sourdough: 0, banana: 1 }, remaining: { sourdough: 0, banana: 0 } })
    expect(dayNow.orders.find((o: { id: string }) => o.id === b)).toMatchObject({ refundedCents: 500, fulfillment: 'owed', status: 'paid' })

    // b cancelled and restocked: its loaf is on sale again. c cancelled without restock: nothing changes for buyers.
    await post(app.admin, '/api/admin', { action: 'cancelPaid', orderId: b, restock: true }, asAdmin)
    await post(app.admin, '/api/admin', { action: 'cancelPaid', orderId: c, restock: false }, asAdmin)
    dayNow = await adminDay(WED)
    expect(dayNow).toMatchObject({ toBake: { sourdough: 2, banana: 1 }, held: { sourdough: 0, banana: 1 }, remaining: { sourdough: 1, banana: 0 } })
    expect(await day(WED)).toMatchObject({ remaining: { sourdough: 1, banana: 0 }, held: { sourdough: 0, banana: 1 } })

    // The held customer never pays: released on Stripe's word, and the day reads as it should.
    stripe.expire(await sessionOf(held))
    const ev = stripe.event('checkout.session.expired', await sessionOf(held))
    await post(app.webhook, '/api/stripe-webhook', ev.body, ev.headers)
    expect(await day(WED)).toMatchObject({ remaining: { sourdough: 1, banana: 1 }, held: { sourdough: 0, banana: 0 } })
    expect((await adminDay(WED)).toBake).toEqual({ sourdough: 2, banana: 1 })
    expect(d).toMatch(UUID)
    expect((await adminDay(WED)).orders.map((o: { fulfillment: string }) => o.fulfillment).sort()).toEqual(['cancelled', 'cancelled', 'owed', 'owed', 'picked_up'])
  })
})

describe('reservation abuse', () => {
  it('one address cannot hold more than a few card orders at once, and gets a clear 429 rather than the stock', async () => {
    const ip = '203.0.113.7'
    for (let i = 0; i < MAX_LIVE_HOLDS_PER_IP; i++) expect((await checkout({ date: [MON, WED, THU, MON][i], qty: { banana: 1 } }, ip)).status).toBe(200)
    const more = await checkout({ qty: { banana: 1 } }, ip)
    expect(more.status).toBe(429)
    expect(await more.json()).toEqual({ error: 'too_many_reservations' })
    // Someone else, elsewhere, is unaffected.
    expect((await checkout({ qty: { banana: 1 } }, '203.0.113.8')).status).toBe(200)
    // One of the holds settling at Stripe frees a slot.
    const first = (await db.query<{ id: string }>('SELECT id FROM orders ORDER BY seq LIMIT 1')).rows[0].id
    expect(await (await post(app.cancelCheckout, `/api/cancel?order=${first}`, '')).json()).toEqual({ state: 'released' })
    expect((await checkout({ qty: { banana: 1 } }, ip)).status).toBe(200)
  })
})
