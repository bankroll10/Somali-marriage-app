import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PAYMENT_HOLD_HOURS, ZELLE_HANDLE, ZELLE_NAME } from '../shared/config.ts'
import { fixedClock, type FixedClock } from '../shared/clock.ts'
import { createApp } from '../netlify/lib/app.ts'
import type { Db } from '../netlify/lib/db/client.ts'
import { assertLedger, freshDb } from './db.ts'

/**
 * The ordering rules, driven through the real HTTP handlers against a real
 * Postgres (PGlite) that ran the real migration. The clock is held still at
 * Friday Sep 18 2026, noon in Chicago (UTC−5): Monday the 21st is orderable
 * until Saturday 5 PM; Wednesday and Thursday comfortably so.
 */
const NOW = Date.UTC(2026, 8, 18, 17)
const MON = '2026-09-21'
const WED = '2026-09-23'
const THU = '2026-09-24'
const HOUR = 3_600_000
const ADMIN = 'let-me-in'

let db: Db
let clock: FixedClock
let app: ReturnType<typeof createApp>

beforeEach(async () => {
  ;({ db } = await freshDb())
  clock = fixedClock(NOW)
  app = createApp({ db, clock })
  process.env.ADMIN_PASSWORD = ADMIN
})
afterEach(() => assertLedger(db))

const post = (fn: (r: Request) => Promise<Response>, path: string, body: unknown, headers: Record<string, string> = {}) =>
  fn(new Request(`https://bread.example${path}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers }))
const get = (fn: (r: Request) => Promise<Response>, path: string, headers: Record<string, string> = {}) =>
  fn(new Request(`https://bread.example${path}`, { headers }))
type Buy = { date: string; qty: Partial<Record<'sourdough' | 'banana', number>>; name: string; phone: string; checkoutKey: string }
const good = (): Buy => ({ date: WED, qty: { sourdough: 2, banana: 1 }, name: '  Amina   Ali ', phone: '(612) 555-0199', checkoutKey: crypto.randomUUID() })
const buy = (over: Partial<Buy> & Record<string, unknown> = {}) => post(app.checkout, '/api/checkout', { ...good(), ...over })
const asAdmin = { authorization: `Bearer ${ADMIN}` }
const markPaid = (orderId: string, force = false) => post(app.admin, '/api/admin', { action: 'markPaid', orderId, force }, asAdmin)
const cancel = (orderId: string) => post(app.admin, '/api/admin', { action: 'cancel', orderId }, asAdmin)
const dayOf = async (date: string) => (await (await get(app.admin, `/api/admin?from=${date}&to=${date}`, asAdmin)).json()).days[0]
const dbStatus = async (id: string) => (await db.query<{ status: string }>('SELECT status FROM orders WHERE id = $1::uuid', [id])).rows[0]?.status

describe('availability', () => {
  it('lists four weeks of pickup days at full capacity, with the products, and nothing about anyone', async () => {
    await buy()
    const res = await get(app.availability, '/api/availability')
    const text = await res.text()
    const body = JSON.parse(text)
    expect(body.days).toHaveLength(12)
    expect(body.days[0]).toMatchObject({ date: MON, open: true, blocked: false, remaining: { sourdough: 3, banana: 4 } })
    expect(body.days[0].cutoffAt).toBe(new Date(Date.UTC(2026, 8, 19, 22)).toISOString())
    expect(body.days[1]).toMatchObject({ date: WED, remaining: { sourdough: 1, banana: 3 } })
    expect(body.products).toEqual([
      { id: 'sourdough', name: 'Sourdough', blurb: 'A full loaf', priceCents: 500, capacityPerDay: 3 },
      { id: 'banana', name: 'Banana bread', blurb: 'Small loaf', priceCents: 300, capacityPerDay: 4 },
    ])
    expect(text).not.toMatch(/Amina|6125550199|checkout|customer|"id":"[0-9a-f-]{36}"/)
  })

  it('hides a product she stops selling', async () => {
    await db.query("UPDATE products SET active = false WHERE id = 'banana'")
    const body = await (await get(app.availability, '/api/availability')).json()
    expect(body.products.map((p: { id: string }) => p.id)).toEqual(['sourdough'])
    expect(await (await buy({ qty: { banana: 1 } })).json()).toEqual({ error: 'bad_product' })
  })
})

describe('checkout', () => {
  it('reserves the whole cart, snapshots prices, opens a Zelle reference, and hands back instructions', async () => {
    const key = crypto.randomUUID()
    const res = await buy({ checkoutKey: key })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      orderId: expect.any(String),
      shortId: body.orderId.slice(0, 6).toUpperCase(),
      date: WED,
      qty: { sourdough: 2, banana: 1 },
      amountCents: 1300,
      holdExpiresAt: new Date(NOW + PAYMENT_HOLD_HOURS * HOUR).toISOString(),
      zelle: { name: ZELLE_NAME, handle: ZELLE_HANDLE },
      replayed: false,
    })
    const order = (await db.query('SELECT status, customer_name, customer_phone, total_cents, checkout_key FROM orders')).rows[0]
    expect(order).toEqual({ status: 'reserved', customer_name: 'Amina Ali', customer_phone: '6125550199', total_cents: 1300, checkout_key: key })
    const items = (await db.query('SELECT product_id, quantity, unit_price_cents FROM order_items ORDER BY product_id')).rows
    expect(items).toEqual([
      { product_id: 'banana', quantity: 1, unit_price_cents: 300 },
      { product_id: 'sourdough', quantity: 2, unit_price_cents: 500 },
    ])
    const ref = (await db.query('SELECT provider, status, amount_cents, idempotency_key FROM payment_references')).rows[0]
    expect(ref).toEqual({ provider: 'zelle', status: 'pending', amount_cents: 1300, idempotency_key: `zelle:${body.orderId}` })
    const inv = (await db.query("SELECT product_id, committed FROM date_inventory WHERE date = $1::date ORDER BY product_id", [WED])).rows
    expect(inv).toEqual([
      { product_id: 'banana', committed: 1 },
      { product_id: 'sourdough', committed: 2 },
    ])
  })

  it('keeps the price it sold at when the price later changes', async () => {
    const { orderId } = await (await buy()).json()
    await db.query("UPDATE products SET price_cents = 900 WHERE id = 'sourdough'")
    const page = await (await get(app.order, `/api/order?order=${orderId}`)).json()
    expect(page.amountCents).toBe(1300)
    expect((await (await buy({ checkoutKey: crypto.randomUUID(), qty: { sourdough: 1 } })).json()).amountCents).toBe(900)
  })

  it('refuses forged requests before touching inventory', async () => {
    const cases: [Partial<Buy> & Record<string, unknown>, string][] = [
      [{ date: '2026-09-22' }, 'bad_date'], // a Tuesday
      [{ date: '2027-06-07' }, 'bad_date'], // a Monday, months past the window
      [{ date: '2026-10-19' }, 'bad_date'], // the first Monday past the 4-week window
      [{ date: '2026-09-14' }, 'bad_date'], // last Monday
      [{ date: '2026-9-23' }, 'bad_date'],
      [{ date: '2026-09-18' }, 'bad_date'], // today, a Friday: not a pickup day
      [{ qty: { sourdough: 4 } }, 'bad_quantity'],
      [{ qty: { sourdough: 1.5 } }, 'bad_quantity'],
      [{ qty: { sourdough: -1 } }, 'bad_quantity'],
      [{ qty: { sourdough: '2' as unknown as number } }, 'bad_quantity'],
      [{ qty: { sourdough: 0, banana: 0 } }, 'empty'],
      [{ qty: { croissant: 1 } as never }, 'bad_product'],
      [{ qty: [1, 2] as never }, 'bad_quantity'],
      [{ name: '   ' }, 'bad_name'],
      [{ name: 'x'.repeat(81) }, 'bad_name'],
      [{ phone: '555-0199' }, 'bad_phone'],
      [{ checkoutKey: 'not-a-uuid' }, 'bad_key'],
      [{ checkoutKey: '' }, 'bad_key'],
    ]
    for (const [over, code] of cases) {
      const res = await buy(over)
      expect(await res.json(), JSON.stringify(over)).toEqual({ error: code })
      expect(res.status).toBe(400)
    }
    expect((await db.query('SELECT count(*)::int AS n FROM orders')).rows[0]).toEqual({ n: 0 })
    expect((await db.query('SELECT count(*)::int AS n FROM date_inventory')).rows[0]).toEqual({ n: 0 })
  })

  it('ignores any price or total the browser sends', async () => {
    const res = await buy({ amountCents: 1, total: 1, price: 1, qty: { sourdough: 1 } })
    expect((await res.json()).amountCents).toBe(500)
    expect((await db.query('SELECT total_cents FROM orders')).rows[0]).toEqual({ total_cents: 500 })
  })

  it('closes exactly 48 hours before the shift', async () => {
    clock.set(Date.UTC(2026, 8, 19, 21, 59, 59, 999))
    expect((await buy({ date: MON })).status).toBe(200)
    clock.set(Date.UTC(2026, 8, 19, 22, 0, 0, 0))
    expect(await (await buy({ date: MON })).json()).toEqual({ error: 'closed' })
  })

  it('says sold out once the date is spoken for, and blocked when she is away', async () => {
    expect((await buy({ qty: { sourdough: 3 } })).status).toBe(200)
    const res = await buy({ qty: { sourdough: 1 } })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'sold_out', remaining: { sourdough: 0, banana: 4 } })
    expect((await buy({ qty: { banana: 4 } })).status).toBe(200)
    expect(await (await buy({ qty: { banana: 1 } })).json()).toEqual({ error: 'sold_out', remaining: { sourdough: 0, banana: 0 } })

    await post(app.admin, '/api/admin', { action: 'block', date: MON }, asAdmin)
    const blocked = await buy({ date: MON })
    expect(blocked.status).toBe(409)
    expect(await blocked.json()).toEqual({ error: 'blocked' })
  })

  it('reserves a mixed cart entirely or not at all', async () => {
    await buy({ qty: { sourdough: 3 } }) // sourdough now full
    const res = await buy({ qty: { sourdough: 1, banana: 2 } })
    expect(await res.json()).toEqual({ error: 'sold_out', remaining: { sourdough: 0, banana: 4 } })
    // banana was not touched by the refused cart, whichever line was tried first
    const inv = (await db.query("SELECT product_id, committed FROM date_inventory WHERE date = $1::date ORDER BY product_id", [WED])).rows
    expect(inv).toEqual([
      { product_id: 'banana', committed: 0 },
      { product_id: 'sourdough', committed: 3 },
    ])
    expect((await db.query('SELECT count(*)::int AS n FROM orders')).rows[0]).toEqual({ n: 1 })
    // and the other way round
    await buy({ qty: { banana: 4 } })
    expect(await (await buy({ qty: { sourdough: 0, banana: 1 } })).json()).toMatchObject({ error: 'sold_out' })
  })

  it('treats each date independently — a full Monday leaves Wednesday whole', async () => {
    await buy({ date: MON, qty: { sourdough: 3, banana: 4 } })
    expect(await (await buy({ date: MON, qty: { sourdough: 1 } })).json()).toMatchObject({ error: 'sold_out' })
    expect((await buy({ date: WED, qty: { sourdough: 3, banana: 4 } })).status).toBe(200)
    expect((await buy({ date: THU, qty: { sourdough: 3, banana: 4 } })).status).toBe(200)
    const avail = await (await get(app.availability, '/api/availability')).json()
    expect(avail.days.slice(0, 3).map((d: { remaining: unknown }) => d.remaining)).toEqual([
      { sourdough: 0, banana: 0 },
      { sourdough: 0, banana: 0 },
      { sourdough: 0, banana: 0 },
    ])
    expect(avail.days[3].remaining).toEqual({ sourdough: 3, banana: 4 })
  })

  it('replays a retried request instead of reserving twice', async () => {
    const key = crypto.randomUUID()
    const first = await (await buy({ checkoutKey: key, qty: { sourdough: 3 } })).json()
    const again = await (await buy({ checkoutKey: key, qty: { sourdough: 3 } })).json()
    expect(again).toEqual({ ...first, replayed: true })
    expect((await db.query('SELECT count(*)::int AS n FROM orders')).rows[0]).toEqual({ n: 1 })
    expect((await db.query("SELECT committed FROM date_inventory WHERE product_id = 'sourdough'")).rows[0]).toEqual({ committed: 3 })
  })
})

describe('holds', () => {
  it('lapse on their own: the bread reads as free without any sweep having run', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 3 } })).json()
    clock.advance(PAYMENT_HOLD_HOURS * HOUR)
    const avail = await (await get(app.availability, '/api/availability')).json()
    expect(avail.days[1].remaining).toEqual({ sourdough: 3, banana: 4 })
    expect(await (await get(app.order, `/api/order?order=${orderId}`)).json()).toMatchObject({ status: 'expired' })
    expect(await dbStatus(orderId)).toBe('reserved') // nothing wrote; the next write sweeps it
    expect((await buy({ qty: { sourdough: 3 } })).status).toBe(200)
    expect(await dbStatus(orderId)).toBe('expired')
  })

  it('hold expiry is elapsed time, straight across the fall-back hour', async () => {
    clock.set(Date.UTC(2026, 10, 1, 4, 30)) // Sat Oct 31, 11:30 PM CDT
    const { holdExpiresAt } = await (await buy({ date: '2026-11-05' })).json()
    expect(holdExpiresAt).toBe('2026-11-01T07:30:00.000Z') // 1:30 AM CST — the second 1:30 that night
  })
})

describe('admin', () => {
  it('is closed without a password configured, and to the wrong password', async () => {
    delete process.env.ADMIN_PASSWORD
    expect((await get(app.admin, '/api/admin', asAdmin)).status).toBe(503)
    process.env.ADMIN_PASSWORD = ADMIN
    expect((await get(app.admin, '/api/admin')).status).toBe(401)
    expect((await get(app.admin, '/api/admin', { authorization: 'Bearer nope' })).status).toBe(401)
    expect((await get(app.admin, '/api/admin', asAdmin)).status).toBe(200)
  })

  it('shows an order the moment it is reserved, before any Zelle has landed', async () => {
    const { orderId } = await (await buy()).json()
    const wed = await dayOf(WED)
    expect(wed.orders).toHaveLength(1)
    expect(wed.orders[0]).toMatchObject({ id: orderId, status: 'reserved', name: 'Amina Ali', phone: '6125550199' })
    expect(wed.toBake).toEqual({ sourdough: 0, banana: 0 })
    expect(wed.remaining).toEqual({ sourdough: 1, banana: 3 })
  })

  it('marks an order paid, updates what to bake, and is idempotent', async () => {
    const { orderId } = await (await buy()).json()
    const res = await markPaid(orderId)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'paid', paidAt: new Date(NOW).toISOString() })
    expect((await markPaid(orderId)).status).toBe(200)
    const wed = await dayOf(WED)
    expect(wed.toBake).toEqual({ sourdough: 2, banana: 1 })
    expect(wed.remaining).toEqual({ sourdough: 1, banana: 3 })
    const refs = (await db.query('SELECT status, confirmed_by FROM payment_references')).rows
    expect(refs).toEqual([{ status: 'succeeded', confirmed_by: 'admin' }])
    expect((await markPaid('deadbeef-dead-4eef-8ead-beefdeadbeef')).status).toBe(404)
  })

  it('confirms a lapsed-but-unswept hold with no capacity check — its units were never given away', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 3 } })).json()
    clock.advance(PAYMENT_HOLD_HOURS * HOUR + 1)
    const avail = await (await get(app.availability, '/api/availability')).json()
    expect(avail.days[1].remaining.sourdough).toBe(3) // public sees it as free…
    expect((await markPaid(orderId)).status).toBe(200) // …but nobody took it, so she can still confirm
    expect((await db.query("SELECT committed FROM date_inventory WHERE product_id = 'sourdough'")).rows[0]).toEqual({ committed: 3 })
  })

  it('confirms a swept order if the bread is still there, refuses if it is not, and can be forced', async () => {
    const { orderId: late } = await (await buy({ qty: { sourdough: 3 } })).json()
    clock.advance(PAYMENT_HOLD_HOURS * HOUR + 1)
    const { orderId: other } = await (await buy({ qty: { sourdough: 1 } })).json() // sweeps `late`, takes 1
    expect(await dbStatus(late)).toBe('expired')

    const refused = await markPaid(late)
    expect(refused.status).toBe(409)
    expect(await refused.json()).toEqual({ error: 'would_exceed_capacity', remaining: { sourdough: 2, banana: 4 } })
    expect(await dbStatus(late)).toBe('expired')

    await cancel(other)
    expect((await markPaid(late)).status).toBe(200) // fits again now
    expect(await dbStatus(late)).toBe('paid')
  })

  it('force records the extra she will bake as that date\'s overflow, and never advertises it', async () => {
    const { orderId: late } = await (await buy({ qty: { sourdough: 3 } })).json()
    clock.advance(PAYMENT_HOLD_HOURS * HOUR + 1)
    const { orderId: other } = await (await buy({ qty: { sourdough: 3 } })).json()
    expect((await markPaid(late)).status).toBe(409)
    const forced = await markPaid(late, true)
    expect(forced.status).toBe(200)
    expect(await forced.json()).toMatchObject({ status: 'paid', forced: true })
    expect((await db.query("SELECT capacity, overflow, committed FROM date_inventory WHERE product_id = 'sourdough'")).rows[0]).toEqual({ capacity: 3, overflow: 3, committed: 6 })
    expect((await dayOf(WED)).toBake).toEqual({ sourdough: 3, banana: 0 }) // `other` still unpaid
    expect((await dayOf(WED)).remaining).toEqual({ sourdough: 0, banana: 4 })
    // A raw write past capacity + overflow is refused by the database itself.
    await expect(db.query("UPDATE date_inventory SET committed = 7 WHERE product_id = 'sourdough'")).rejects.toMatchObject({ code: '23514' })
    // Cancelling the other order does not reveal a phantom slot.
    await cancel(other)
    expect((await dayOf(WED)).remaining).toEqual({ sourdough: 0, banana: 4 })
    const refs = (await db.query('SELECT status FROM payment_references WHERE order_id = $1::uuid ORDER BY id', [late])).rows
    expect(refs).toEqual([{ status: 'succeeded' }]) // the sweep left the reference pending, so the confirmation closed it
  })

  it('cancels a reservation, frees its bread at once, and leaves anything else alone', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 3 } })).json()
    expect(await (await buy({ qty: { sourdough: 1 } })).json()).toMatchObject({ error: 'sold_out' })
    expect(await (await cancel(orderId)).json()).toMatchObject({ status: 'cancelled' })
    expect((await buy({ qty: { sourdough: 1 } })).status).toBe(200)
    expect(await (await cancel(orderId)).json()).toMatchObject({ status: 'cancelled' })
    expect((await cancel('deadbeef-dead-4eef-8ead-beefdeadbeef')).status).toBe(404)
    const { orderId: paid } = await (await buy({ qty: { banana: 1 } })).json()
    await markPaid(paid)
    expect(await (await cancel(paid)).json()).toMatchObject({ status: 'paid' })
    expect((await db.query('SELECT status FROM payment_references WHERE order_id = $1::uuid', [orderId])).rows[0]).toEqual({ status: 'expired' })
  })

  it('a paid order is exactly one succeeded reference; a late confirmation opens a fresh one', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 1 } })).json()
    await cancel(orderId)
    expect((await markPaid(orderId)).status).toBe(200)
    const refs = (await db.query('SELECT status, idempotency_key FROM payment_references WHERE order_id = $1::uuid ORDER BY id', [orderId])).rows
    expect(refs).toEqual([
      { status: 'expired', idempotency_key: `zelle:${orderId}` },
      { status: 'succeeded', idempotency_key: `zelle:${orderId}:2` },
    ])
  })

  it('shows orders by pickup date with what to bake, and tracks pickup', async () => {
    const { orderId: a } = await (await buy()).json()
    await markPaid(a)
    const { orderId: b } = await (await buy({ name: 'Bob', phone: '6125550100', qty: { banana: 2 } })).json()
    await markPaid(b)
    await buy({ date: MON, qty: { sourdough: 1 } })
    const body = await (await get(app.admin, '/api/admin', asAdmin)).json()
    const wed = body.days.find((d: { date: string }) => d.date === WED)
    expect(wed.toBake).toEqual({ sourdough: 2, banana: 3 })
    expect(wed.remaining).toEqual({ sourdough: 1, banana: 1 })
    expect(wed.orders.map((o: { name: string; status: string }) => [o.name, o.status])).toEqual([
      ['Amina Ali', 'paid'],
      ['Bob', 'paid'],
    ])
    const mon = body.days.find((d: { date: string }) => d.date === MON)
    expect(mon.toBake).toEqual({ sourdough: 0, banana: 0 })
    expect(mon.orders.map((o: { status: string }) => o.status)).toEqual(['reserved'])

    const picked = await post(app.admin, '/api/admin', { action: 'pickedUp', orderId: a, pickedUp: true }, asAdmin)
    expect((await picked.json()).pickedUpAt).toBe(new Date(NOW).toISOString())
    const unpicked = await post(app.admin, '/api/admin', { action: 'pickedUp', orderId: a, pickedUp: false }, asAdmin)
    expect((await unpicked.json()).pickedUpAt).toBeUndefined()
  })

  it('blocks and unblocks a date; blocking keeps the orders already on it', async () => {
    const { orderId } = await (await buy({ date: MON })).json()
    await markPaid(orderId)
    const res = await post(app.admin, '/api/admin', { action: 'block', date: MON }, asAdmin)
    expect(await res.json()).toMatchObject({ date: MON, blocked: true, toBake: { sourdough: 2, banana: 1 } })
    expect((await (await get(app.availability, '/api/availability')).json()).days[0]).toMatchObject({ date: MON, blocked: true })
    expect((await buy({ date: MON, qty: { banana: 1 } })).status).toBe(409)
    await post(app.admin, '/api/admin', { action: 'unblock', date: MON }, asAdmin)
    expect((await buy({ date: MON, qty: { banana: 1 } })).status).toBe(200)
    expect((await post(app.admin, '/api/admin', { action: 'block', date: 'soon' }, asAdmin)).status).toBe(400)
    expect((await post(app.admin, '/api/admin', { action: 'explode', orderId }, asAdmin)).status).toBe(400)
    expect((await post(app.admin, '/api/admin', { action: 'markPaid', orderId: '../x' }, asAdmin)).status).toBe(400)
  })
})

describe('confirmation page', () => {
  it('shows a reserved order, then a paid one, and never the phone number', async () => {
    const { orderId } = await (await buy()).json()
    const pending = await (await get(app.order, `/api/order?order=${orderId}`)).json()
    expect(pending).toMatchObject({ status: 'reserved', zelle: { name: ZELLE_NAME, handle: ZELLE_HANDLE } })
    await markPaid(orderId)
    const res = await get(app.order, `/api/order?order=${orderId}`)
    const body = await res.json()
    expect(body).toEqual({
      id: orderId,
      shortId: orderId.slice(0, 6).toUpperCase(),
      date: WED,
      name: 'Amina Ali',
      qty: { sourdough: 2, banana: 1 },
      amountCents: 1300,
      status: 'paid',
      holdExpiresAt: body.holdExpiresAt,
      zelle: { name: ZELLE_NAME, handle: ZELLE_HANDLE },
    })
    expect(JSON.stringify(body)).not.toContain('6125550199')
  })

  it('404s an unknown order and 400s a malformed one', async () => {
    expect((await get(app.order, '/api/order?order=deadbeef-dead-4eef-8ead-beefdeadbeef')).status).toBe(404)
    expect((await get(app.order, '/api/order?order=../etc')).status).toBe(400)
  })
})
