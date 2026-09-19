import pg from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { fixedClock } from '../shared/clock.ts'
import type { Qty } from '../shared/types.ts'
import { createApp, zelleTerms } from '../netlify/lib/app.ts'
import { fakeStripe } from './fakeStripe.ts'
import { poolDb, type Db } from '../netlify/lib/db/client.ts'
import { applyMigrations } from '../netlify/lib/db/migrate.ts'
import { listProducts, reserve, setBlocked } from '../netlify/lib/inventory.ts'
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
    const app = createApp({ db, clock: fixedClock(NOW), gateway: fakeStripe().gateway })
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
})
