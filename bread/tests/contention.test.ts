import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { fixedClock } from '../shared/clock.ts'
import type { Qty } from '../shared/types.ts'
import { createApp, zelleTerms } from '../netlify/lib/app.ts'
import { fakeStripe } from './fakeStripe.ts'
import { poolDb, type Db } from '../netlify/lib/db/client.ts'
import { applyMigrations } from '../netlify/lib/db/migrate.ts'
import { listProducts, reserve, setBlocked } from '../netlify/lib/inventory.ts'
import { finalizePayment } from '../netlify/lib/stripe/payments.ts'
import { assertLedger } from './db.ts'

/**
 * The same races on a real Postgres with many connections, where
 * transactions genuinely overlap and the date lock genuinely blocks. Runs
 * only when TEST_DATABASE_URL points at a database this test may wipe.
 */
const URL = process.env.TEST_DATABASE_URL
const NOW = Date.UTC(2026, 8, 18, 17)
const WED = '2026-09-23'

describe.skipIf(!URL)('contention on a real Postgres', () => {
  let pool: pg.Pool
  let db: Db

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: URL, max: 12 })
    db = poolDb(pool)
  })
  afterAll(() => pool?.end())
  beforeEach(async () => {
    await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
    await applyMigrations(db)
  })

  const cart = (qty: Partial<Qty>, i: number) => ({ date: WED, qty: { sourdough: 0, banana: 0, ...qty }, name: `Buyer ${i}`, phone: `612555${String(i).padStart(4, '0')}`, checkoutKey: crypto.randomUUID() })

  it('twenty buyers on ten connections for three loaves: three win, no errors, ledger exact', async () => {
    const products = await listProducts(db)
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => reserve(db, cart({ sourdough: 1, banana: 1 }, i), products, fixedClock(NOW), zelleTerms(NOW))))
    expect(results.filter((r) => r.ok)).toHaveLength(3)
    expect(results.filter((r) => !r.ok && r.reason === 'sold_out')).toHaveLength(17)
    const rows = (await db.query('SELECT product_id, committed FROM date_inventory WHERE date = $1::date ORDER BY product_id', [WED])).rows
    expect(rows).toEqual([
      { product_id: 'banana', committed: 3 },
      { product_id: 'sourdough', committed: 3 },
    ])
    await assertLedger(db)
  })

  it('a reservation waits for whoever holds the date, then proceeds', async () => {
    const app = createApp({ db, clock: fixedClock(NOW), gateway: fakeStripe(false, fixedClock(NOW)).gateway })
    const holder = await pool.connect()
    await holder.query('BEGIN')
    await holder.query('INSERT INTO pickup_dates (date) VALUES ($1::date) ON CONFLICT DO NOTHING', [WED])
    await holder.query('SELECT date FROM pickup_dates WHERE date = $1::date FOR UPDATE', [WED])

    let settled = false
    const attempt = app
      .checkout(new Request('https://bread.example/api/checkout', { method: 'POST', body: JSON.stringify(cart({ sourdough: 1 }, 1)) }))
      .then((r) => {
        settled = true
        return r
      })
    await new Promise((r) => setTimeout(r, 400))
    expect(settled).toBe(false) // blocked on the lock, not failing, not proceeding
    await holder.query('COMMIT')
    holder.release()
    expect((await attempt).status).toBe(200)
    await assertLedger(db)
  })

  it('a client that dies mid-transaction leaves nothing behind', async () => {
    const products = await listProducts(db)
    await reserve(db, cart({ sourdough: 1 }, 0), products, fixedClock(NOW), zelleTerms(NOW))
    const dying = await pool.connect()
    await dying.query('BEGIN')
    await dying.query('SELECT date FROM pickup_dates WHERE date = $1::date FOR UPDATE', [WED])
    await dying.query("UPDATE date_inventory SET committed = committed + 1 WHERE date = $1::date AND product_id = 'sourdough'", [WED])
    await dying.query(
      `INSERT INTO orders (id, date, status, customer_name, customer_phone, total_cents, hold_expires_at, created_at)
       VALUES (gen_random_uuid(), $1::date, 'reserved', 'Ghost', '6125550000', 500, now(), now())`,
      [WED],
    )
    dying.release(true) // destroy the socket: the server rolls the transaction back
    await new Promise((r) => setTimeout(r, 200))
    expect((await db.query("SELECT committed FROM date_inventory WHERE date = $1::date AND product_id = 'sourdough'", [WED])).rows[0]).toEqual({ committed: 1 })
    expect((await db.query("SELECT count(*)::int AS n FROM orders WHERE customer_name = 'Ghost'")).rows[0]).toEqual({ n: 0 })
    await assertLedger(db)
  })

  it('the database refuses a write past capacity even from a caller that skips the lock', async () => {
    await db.query('INSERT INTO pickup_dates (date) VALUES ($1::date)', [WED])
    await db.query("INSERT INTO date_inventory (date, product_id, capacity, committed) VALUES ($1::date, 'sourdough', 3, 3)", [WED])
    await expect(db.query("UPDATE date_inventory SET committed = committed + 1 WHERE date = $1::date AND product_id = 'sourdough'", [WED])).rejects.toMatchObject({ code: '23514' })
  })

  it('a block waits for whoever holds the date, then lands, and the next reservation is refused', async () => {
    const products = await listProducts(db)
    const holder = await pool.connect()
    await holder.query('BEGIN')
    await holder.query('INSERT INTO pickup_dates (date) VALUES ($1::date) ON CONFLICT DO NOTHING', [WED])
    await holder.query('SELECT date FROM pickup_dates WHERE date = $1::date FOR UPDATE', [WED])

    let settled = false
    const attempt = setBlocked(db, WED, true, fixedClock(NOW), 'admin', 'closed').then((r) => {
      settled = true
      return r
    })
    await new Promise((r) => setTimeout(r, 300))
    expect(settled).toBe(false) // strictly after whoever holds the date, never in the middle of them
    await holder.query('COMMIT')
    holder.release()
    const affected = await attempt
    expect(settled).toBe(true)
    expect(affected).toEqual({ owed: [], holds: [] })
    const next = await reserve(db, cart({ sourdough: 1 }, 8), products, fixedClock(NOW), zelleTerms(NOW))
    expect(next).toEqual({ ok: false, reason: 'blocked' })
    await assertLedger(db)
  })

  it('the webhook and the page delivering the same paid session on two connections at once: one conversion, one reference', async () => {
    const clock = fixedClock(NOW)
    const stripe = fakeStripe(false, clock)
    const app = createApp({ db, clock, gateway: stripe.gateway })
    const res = await app.checkout(new Request('https://bread.example/api/checkout', { method: 'POST', body: JSON.stringify(cart({ sourdough: 2, banana: 1 }, 1)) }), '203.0.113.1')
    expect(res.status).toBe(200)
    const { orderId } = await res.json()
    const session = stripe.pay('cs_test_1')
    const deps = { db, clock, gateway: stripe.gateway }
    const outcomes = await Promise.all(Array.from({ length: 6 }, () => finalizePayment(deps, session)))
    expect(outcomes.every((o) => o.ok)).toBe(true)
    expect(outcomes.filter((o) => o.ok && !o.already)).toHaveLength(1)
    expect(outcomes.filter((o) => o.ok && o.already)).toHaveLength(5)
    expect((await db.query('SELECT status FROM orders WHERE id = $1::uuid', [orderId])).rows[0]).toEqual({ status: 'paid' })
    expect((await db.query("SELECT count(*)::int AS n FROM payment_references WHERE order_id = $1::uuid AND status = 'succeeded'", [orderId])).rows[0]).toEqual({ n: 1 })
    expect((await db.query('SELECT product_id, committed FROM date_inventory WHERE date = $1::date ORDER BY product_id', [WED])).rows).toEqual([
      { product_id: 'banana', committed: 1 },
      { product_id: 'sourdough', committed: 2 },
    ])
    await assertLedger(db)
  })

  it('the same phone number checking out on two connections at once ends with one hold, and the same key with one order', async () => {
    const clock = fixedClock(NOW)
    const stripe = fakeStripe(false, clock)
    const app = createApp({ db, clock, gateway: stripe.gateway })
    const send = (body: unknown, ip: string) => app.checkout(new Request('https://bread.example/api/checkout', { method: 'POST', body: JSON.stringify(body) }), ip)
    const samePhone = { date: WED, qty: { sourdough: 1, banana: 0 }, name: 'Twice Tapped', phone: '6125550042' }
    const [a, b] = await Promise.all([send({ ...samePhone, checkoutKey: crypto.randomUUID() }, '203.0.113.1'), send({ ...samePhone, checkoutKey: crypto.randomUUID() }, '203.0.113.1')])
    expect([a.status, b.status]).toEqual([200, 200])
    const [ja, jb] = await Promise.all([a.json(), b.json()])
    expect(ja.orderId).toBe(jb.orderId)
    expect([ja.replayed, jb.replayed].sort()).toEqual([false, true])
    expect((await db.query("SELECT count(*)::int AS n FROM orders WHERE status = 'reserved'")).rows[0]).toEqual({ n: 1 })
    expect(stripe.created).toHaveLength(1)

    const key = crypto.randomUUID()
    const twin = { date: WED, qty: { banana: 2, sourdough: 0 }, name: 'Double Click', phone: '6125550043', checkoutKey: key }
    const [c, d] = await Promise.all([send(twin, '203.0.113.2'), send(twin, '203.0.113.2')])
    const [jc, jd] = await Promise.all([c.json(), d.json()])
    expect(jc.orderId).toBe(jd.orderId)
    expect((await db.query('SELECT count(*)::int AS n FROM orders WHERE checkout_key = $1::uuid', [key])).rows[0]).toEqual({ n: 1 })
    expect((await db.query("SELECT committed FROM date_inventory WHERE date = $1::date AND product_id = 'banana'", [WED])).rows[0]).toEqual({ committed: 2 })
    expect(stripe.created).toHaveLength(2)
    await assertLedger(db)
  })

  it('a burst of checkouts from one address cannot all slip under the hold cap', async () => {
    const clock = fixedClock(NOW)
    const stripe = fakeStripe(false, clock)
    const app = createApp({ db, clock, gateway: stripe.gateway })
    const dates = ['2026-09-21', '2026-09-23', '2026-09-24', '2026-09-28', '2026-09-30', '2026-10-01', '2026-10-05', '2026-10-07', '2026-10-08', '2026-10-12']
    const results = await Promise.all(
      dates.map((date, i) => app.checkout(new Request('https://bread.example/api/checkout', { method: 'POST', body: JSON.stringify({ ...cart({ banana: 1 }, i), date }) }), '203.0.113.99')),
    )
    expect(results.filter((r) => r.status === 200)).toHaveLength(4)
    expect(results.filter((r) => r.status === 429)).toHaveLength(6)
    expect((await db.query("SELECT count(*)::int AS n FROM orders WHERE status = 'reserved'")).rows[0]).toEqual({ n: 4 })
    await assertLedger(db)
  })
})
