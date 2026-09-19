import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PAYMENT_HOLD_HOURS, ZELLE_HANDLE, ZELLE_NAME } from '../shared/config.ts'
import { fixedClock, type FixedClock } from '../shared/clock.ts'
import type { Qty } from '../shared/types.ts'
import { createApp, zelleTerms } from '../netlify/lib/app.ts'
import type { Db } from '../netlify/lib/db/client.ts'
import { listProducts, reserve } from '../netlify/lib/inventory.ts'
import { assertLedger, freshDb } from './db.ts'
import { adminHeaders, signIn } from './adminSession.ts'
import { fakeStripe } from './fakeStripe.ts'

/**
 * The ordering rules, driven through the real HTTP handlers against a real
 * Postgres (PGlite) that ran the real migrations, with Stripe faked. The
 * clock is held still at Friday Sep 18 2026, noon in Chicago (UTC−5):
 * Monday the 21st is orderable until Saturday 5 PM; Wednesday and Thursday
 * comfortably so. Stripe's own lifecycle is in stripe.test.ts.
 */
const NOW = Date.UTC(2026, 8, 18, 17)
const MON = '2026-09-21'
const WED = '2026-09-23'
const THU = '2026-09-24'
const HOUR = 3_600_000
const ADMIN = 'let-me-in'

let db: Db
let clock: FixedClock
let stripe: ReturnType<typeof fakeStripe>
let app: ReturnType<typeof createApp>

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
const get = (fn: (r: Request) => Promise<Response>, path: string, headers: Record<string, string> = {}) =>
  fn(new Request(`https://bread.example${path}`, { headers }))
type Buy = { date: string; qty: Partial<Record<'sourdough' | 'banana', number>>; name: string; phone: string; checkoutKey: string }
const good = (): Buy => ({ date: WED, qty: { sourdough: 2, banana: 1 }, name: '  Amina   Ali ', phone: '(612) 555-0199', checkoutKey: crypto.randomUUID() })
const buy = (over: Partial<Buy> & Record<string, unknown> = {}) => post(app.checkout, '/api/checkout', { ...good(), ...over })
let asAdmin: Record<string, string>
const markPaid = (orderId: string, force = false) => post(app.admin, '/api/admin', { action: 'markPaid', orderId, force }, asAdmin)
const cancel = (orderId: string) => post(app.admin, '/api/admin', { action: 'cancel', orderId }, asAdmin)
const dayOf = async (date: string) => (await (await get(app.admin, `/api/admin?from=${date}&to=${date}`, asAdmin)).json()).days[0]
const dbStatus = async (id: string) => (await db.query<{ status: string }>('SELECT status FROM orders WHERE id = $1::uuid', [id])).rows[0]?.status
/** A hand-confirmed (Zelle) reservation, the manual path that stays beside card checkout. */
async function zelle(qty: Partial<Qty>, date = WED, name = 'Zed Zelle') {
  const products = await listProducts(db)
  const out = await reserve(db, { date, qty: { sourdough: 0, banana: 0, ...qty }, name, phone: '6125550000', checkoutKey: crypto.randomUUID() }, products, clock, zelleTerms(clock.now()))
  if (!out.ok) throw new Error(`zelle reserve refused: ${out.reason}`)
  return out.order
}

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
    expect(text).not.toMatch(/Amina|6125550199|checkout|customer|cs_test|"id":"[0-9a-f-]{36}"/)
  })

  it('tells held stock from sold stock, in counts only', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 2 } })).json() // on Stripe's page
    const day = async () => (await (await get(app.availability, '/api/availability')).json()).days.find((d: { date: string }) => d.date === WED)
    expect(await day()).toMatchObject({ remaining: { sourdough: 1, banana: 4 }, held: { sourdough: 2, banana: 0 } })
    stripe.pay('cs_test_1')
    await post(app.webhook, '/api/stripe-webhook', stripe.event('checkout.session.completed', 'cs_test_1').body, stripe.event('checkout.session.completed', 'cs_test_1').headers)
    expect(await day()).toMatchObject({ remaining: { sourdough: 1, banana: 4 }, held: { sourdough: 0, banana: 0 } })
    expect(await dbStatus(orderId)).toBe('paid')
    // A Zelle hold counts while it lives and not once it has lapsed.
    await zelle({ banana: 1 })
    expect(await day()).toMatchObject({ remaining: { sourdough: 1, banana: 3 }, held: { sourdough: 0, banana: 1 } })
    clock.advance((PAYMENT_HOLD_HOURS + 1) * HOUR)
    expect(await day()).toMatchObject({ remaining: { sourdough: 1, banana: 4 }, held: { sourdough: 0, banana: 0 } })
  })

  it('never lets a browser or a shared cache keep stock or an order', async () => {
    const { orderId } = await (await buy()).json()
    for (const res of [
      await get(app.availability, '/api/availability'),
      await get(app.order, `/api/order?order=${orderId}`),
      await buy({ qty: { sourdough: 9 } }),
      await get(app.order, '/api/order?order=nope'),
    ]) {
      expect(res.headers.get('cache-control')).toBe('no-store')
    }
  })

  it('hides a product she stops selling', async () => {
    await db.query("UPDATE products SET active = false WHERE id = 'banana'")
    const body = await (await get(app.availability, '/api/availability')).json()
    expect(body.products.map((p: { id: string }) => p.id)).toEqual(['sourdough'])
    expect(await (await buy({ qty: { banana: 1 } })).json()).toEqual({ error: 'bad_product' })
  })
})

describe('checkout', () => {
  it('reserves the whole cart, snapshots prices, opens a Stripe session from trusted prices, and hands back its url', async () => {
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
      holdExpiresAt: expect.any(String),
      zelle: { name: ZELLE_NAME, handle: ZELLE_HANDLE },
      replayed: false,
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
    })
    const order = (await db.query('SELECT status, provider, customer_name, customer_phone, total_cents, checkout_key FROM orders')).rows[0]
    expect(order).toEqual({ status: 'reserved', provider: 'stripe', customer_name: 'Amina Ali', customer_phone: '6125550199', total_cents: 1300, checkout_key: key })
    expect((await db.query('SELECT product_id, quantity, unit_price_cents FROM order_items ORDER BY product_id')).rows).toEqual([
      { product_id: 'banana', quantity: 1, unit_price_cents: 300 },
      { product_id: 'sourdough', quantity: 2, unit_price_cents: 500 },
    ])
    const ref = (await db.query('SELECT provider, status, amount_cents, idempotency_key, external_id FROM payment_references')).rows[0]
    expect(ref).toEqual({ provider: 'stripe', status: 'pending', amount_cents: 1300, idempotency_key: body.orderId, external_id: 'cs_test_1' })
    expect(stripe.created[0].params.lines).toEqual([
      { name: 'Banana bread', unitAmountCents: 300, quantity: 1 },
      { name: 'Sourdough', unitAmountCents: 500, quantity: 2 },
    ])
    expect((await db.query("SELECT product_id, committed FROM date_inventory WHERE date = $1::date ORDER BY product_id", [WED])).rows).toEqual([
      { product_id: 'banana', committed: 1 },
      { product_id: 'sourdough', committed: 2 },
    ])
  })

  it('keeps the price it sold at when the price later changes', async () => {
    const { orderId } = await (await buy()).json()
    await db.query("UPDATE products SET price_cents = 900 WHERE id = 'sourdough'")
    expect((await (await get(app.order, `/api/order?order=${orderId}`)).json()).amountCents).toBe(1300)
    expect((await (await buy({ qty: { sourdough: 1 } })).json()).amountCents).toBe(900)
  })

  it('refuses forged requests before touching inventory or Stripe', async () => {
    const cases: [Partial<Buy> & Record<string, unknown>, string][] = [
      [{ date: '2026-09-22' }, 'bad_date'],
      [{ date: '2027-06-07' }, 'bad_date'],
      [{ date: '2026-10-19' }, 'bad_date'],
      [{ date: '2026-09-14' }, 'bad_date'],
      [{ date: '2026-9-23' }, 'bad_date'],
      [{ date: '2026-09-18' }, 'bad_date'],
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
    expect(stripe.created).toHaveLength(0)
  })

  it('ignores any price or total the browser sends', async () => {
    const res = await buy({ amountCents: 1, total: 1, price: 1, qty: { sourdough: 1 } })
    expect((await res.json()).amountCents).toBe(500)
    expect((await db.query('SELECT total_cents FROM orders')).rows[0]).toEqual({ total_cents: 500 })
    expect(stripe.sessions.get('cs_test_1')?.amountTotal).toBe(500)
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
    await buy({ qty: { sourdough: 3 } })
    expect(await (await buy({ qty: { sourdough: 1, banana: 2 } })).json()).toEqual({ error: 'sold_out', remaining: { sourdough: 0, banana: 4 } })
    expect((await db.query("SELECT product_id, committed FROM date_inventory WHERE date = $1::date ORDER BY product_id", [WED])).rows).toEqual([
      { product_id: 'banana', committed: 0 },
      { product_id: 'sourdough', committed: 3 },
    ])
    expect((await db.query('SELECT count(*)::int AS n FROM orders')).rows[0]).toEqual({ n: 1 })
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

  it('replays a retried request instead of reserving twice, with the same Stripe session', async () => {
    const key = crypto.randomUUID()
    const first = await (await buy({ checkoutKey: key, qty: { sourdough: 3 } })).json()
    const again = await (await buy({ checkoutKey: key, qty: { sourdough: 3 } })).json()
    expect(again).toEqual({ ...first, replayed: true })
    expect(stripe.created).toHaveLength(1)
    expect((await db.query('SELECT count(*)::int AS n FROM orders')).rows[0]).toEqual({ n: 1 })
    expect((await db.query("SELECT committed FROM date_inventory WHERE product_id = 'sourdough'")).rows[0]).toEqual({ committed: 3 })
  })
})

describe('Zelle holds (the manual path)', () => {
  it('lapse on their own: the bread reads as free without any sweep having run', async () => {
    const { id } = await zelle({ sourdough: 3 })
    clock.advance(PAYMENT_HOLD_HOURS * HOUR)
    const avail = await (await get(app.availability, '/api/availability')).json()
    expect(avail.days[1].remaining).toEqual({ sourdough: 3, banana: 4 })
    expect(await (await get(app.order, `/api/order?order=${id}`)).json()).toMatchObject({ status: 'expired', provider: 'zelle' })
    expect(await dbStatus(id)).toBe('reserved')
    expect((await buy({ qty: { sourdough: 3 } })).status).toBe(200)
    expect(await dbStatus(id)).toBe('expired')
  })

  it('confirms a lapsed-but-unswept hold with no capacity check — its units were never given away', async () => {
    const { id } = await zelle({ sourdough: 3 })
    clock.advance(PAYMENT_HOLD_HOURS * HOUR + 1)
    expect((await (await get(app.availability, '/api/availability')).json()).days[1].remaining.sourdough).toBe(3)
    expect((await markPaid(id)).status).toBe(200)
    expect((await db.query("SELECT committed FROM date_inventory WHERE product_id = 'sourdough'")).rows[0]).toEqual({ committed: 3 })
  })

  it('confirms a swept order if the bread is still there, refuses if not, and can be forced into overflow', async () => {
    const { id: late } = await zelle({ sourdough: 3 })
    clock.advance(PAYMENT_HOLD_HOURS * HOUR + 1)
    const { orderId: other } = await (await buy({ qty: { sourdough: 3 } })).json()
    expect(await dbStatus(late)).toBe('expired')
    const refused = await markPaid(late)
    expect(refused.status).toBe(409)
    expect(await refused.json()).toEqual({ error: 'would_exceed_capacity', remaining: { sourdough: 0, banana: 4 } })
    const forced = await markPaid(late, true)
    expect(await forced.json()).toMatchObject({ status: 'paid', forced: true })
    expect((await db.query("SELECT capacity, overflow, committed FROM date_inventory WHERE product_id = 'sourdough'")).rows[0]).toEqual({ capacity: 3, overflow: 3, committed: 6 })
    expect((await dayOf(WED)).remaining).toEqual({ sourdough: 0, banana: 4 })
    await expect(db.query("UPDATE date_inventory SET committed = 7 WHERE product_id = 'sourdough'")).rejects.toMatchObject({ code: '23514' })
    // Cancelling the card order (its session is ended first) reveals no phantom slot.
    await cancel(other)
    expect((await dayOf(WED)).remaining).toEqual({ sourdough: 0, banana: 4 })
  })

  it('marks an order paid idempotently, cancels once, and keeps one succeeded reference', async () => {
    const { id } = await zelle({ sourdough: 1, banana: 1 })
    expect((await markPaid(id)).status).toBe(200)
    expect((await markPaid(id)).status).toBe(200)
    expect((await db.query('SELECT status, confirmed_by FROM payment_references WHERE order_id = $1::uuid', [id])).rows).toEqual([{ status: 'succeeded', confirmed_by: 'admin' }])
    const { id: c } = await zelle({ sourdough: 2 })
    expect(await (await cancel(c)).json()).toMatchObject({ status: 'cancelled' })
    expect(await (await cancel(c)).json()).toMatchObject({ status: 'cancelled' })
    expect((await markPaid(c)).status).toBe(200) // a late Zelle after cancel
    const refs = (await db.query('SELECT status, idempotency_key FROM payment_references WHERE order_id = $1::uuid ORDER BY id', [c])).rows
    expect(refs).toEqual([
      { status: 'expired', idempotency_key: `zelle:${c}` },
      { status: 'succeeded', idempotency_key: `zelle:${c}:2` },
    ])
    expect((await markPaid('deadbeef-dead-4eef-8ead-beefdeadbeef')).status).toBe(404)
  })
})

describe('admin', () => {
  it('is closed without a password configured, without a session, and to the password used as a token', async () => {
    delete process.env.ADMIN_PASSWORD
    expect((await get(app.admin, '/api/admin', asAdmin)).status).toBe(503)
    expect((await signIn(app, ADMIN)).status).toBe(503)
    process.env.ADMIN_PASSWORD = ADMIN
    expect((await get(app.admin, '/api/admin')).status).toBe(401)
    expect((await get(app.admin, '/api/admin', { authorization: 'Bearer nope' })).status).toBe(401)
    expect((await get(app.admin, '/api/admin', { authorization: `Bearer ${ADMIN}` })).status).toBe(401)
    expect((await get(app.admin, '/api/admin', asAdmin)).status).toBe(200)
  })

  it('shows a card order the moment it is reserved, as reserved, not yet to bake', async () => {
    const { orderId } = await (await buy()).json()
    const wed = await dayOf(WED)
    expect(wed.orders[0]).toMatchObject({ id: orderId, status: 'reserved', provider: 'stripe', name: 'Amina Ali', phone: '6125550199', exceptions: [] })
    expect(wed.toBake).toEqual({ sourdough: 0, banana: 0 })
    expect(wed.remaining).toEqual({ sourdough: 1, banana: 3 })
  })

  it('lists orders by pickup date with what to bake, and tracks pickup', async () => {
    const { id: a } = await zelle({ sourdough: 2, banana: 1 }, WED, 'Amina Ali')
    await markPaid(a)
    const { id: b } = await zelle({ banana: 2 }, WED, 'Bob')
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
    expect(mon.orders.map((o: { status: string }) => o.status)).toEqual(['reserved'])
    const picked = await post(app.admin, '/api/admin', { action: 'pickedUp', orderId: a, pickedUp: true }, asAdmin)
    expect(await picked.json()).toMatchObject({ pickedUpAt: new Date(NOW).toISOString(), fulfillment: 'picked_up', status: 'paid' })
  })

  it('blocks and unblocks a date; blocking keeps the orders already on it', async () => {
    const { id } = await zelle({ sourdough: 2, banana: 1 }, MON)
    await markPaid(id)
    const res = await post(app.admin, '/api/admin', { action: 'block', date: MON }, asAdmin)
    expect(await res.json()).toMatchObject({ day: { date: MON, blocked: true, toBake: { sourdough: 2, banana: 1 } }, affected: { owed: [{ id }], holds: [] } })
    expect((await (await get(app.availability, '/api/availability')).json()).days[0]).toMatchObject({ date: MON, blocked: true })
    expect((await buy({ date: MON, qty: { banana: 1 } })).status).toBe(409)
    await post(app.admin, '/api/admin', { action: 'unblock', date: MON }, asAdmin)
    expect((await buy({ date: MON, qty: { banana: 1 } })).status).toBe(200)
    expect((await post(app.admin, '/api/admin', { action: 'block', date: 'soon' }, asAdmin)).status).toBe(400)
    expect((await post(app.admin, '/api/admin', { action: 'explode', orderId: id }, asAdmin)).status).toBe(400)
    expect((await post(app.admin, '/api/admin', { action: 'markPaid', orderId: '../x' }, asAdmin)).status).toBe(400)
  })
})

describe('order page', () => {
  it('never shows the phone number, and 404s or 400s bad ids', async () => {
    const { orderId } = await (await buy()).json()
    const body = await (await get(app.order, `/api/order?order=${orderId}`)).json()
    expect(body).toMatchObject({ id: orderId, status: 'reserved', provider: 'stripe', checking: true, attention: false })
    expect(JSON.stringify(body)).not.toContain('6125550199')
    expect((await get(app.order, '/api/order?order=deadbeef-dead-4eef-8ead-beefdeadbeef')).status).toBe(404)
    expect((await get(app.order, '/api/order?order=../etc')).status).toBe(400)
  })
})
