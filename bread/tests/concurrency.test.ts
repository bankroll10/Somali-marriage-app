import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fixedClock } from '../shared/clock.ts'
import type { Qty } from '../shared/types.ts'
import { createApp } from '../netlify/lib/app.ts'
import type { Db } from '../netlify/lib/db/client.ts'
import { listProducts, reserve } from '../netlify/lib/inventory.ts'
import { assertLedger, freshDb } from './db.ts'

/**
 * Many buyers at once, on PGlite. PGlite has one connection, so the
 * transactions queue rather than overlap — what this proves is that the
 * guarded UPDATE and the CHECK constraint decide correctly however the
 * requests interleave above the database. tests/contention.test.ts runs the
 * same races on a real multi-connection Postgres.
 */
const NOW = Date.UTC(2026, 8, 18, 17)
const WED = '2026-09-23'
let db: Db

beforeEach(async () => {
  ;({ db } = await freshDb())
})
afterEach(() => assertLedger(db))

const cart = (qty: Partial<Qty>, i: number) => ({ date: WED, qty: { sourdough: 0, banana: 0, ...qty }, name: `Buyer ${i}`, phone: `612555${String(i).padStart(4, '0')}`, checkoutKey: crypto.randomUUID() })

describe('concurrent purchases', () => {
  it('ten buyers for three loaves: exactly three win', async () => {
    const products = await listProducts(db)
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => reserve(db, cart({ sourdough: 1, banana: 0 }, i), products, fixedClock(NOW))))
    expect(results.filter((r) => r.ok)).toHaveLength(3)
    expect(results.filter((r) => !r.ok && r.reason === 'sold_out')).toHaveLength(7)
    const row = (await db.query("SELECT committed FROM date_inventory WHERE date = $1::date AND product_id = 'sourdough'", [WED])).rows[0]
    expect(row).toEqual({ committed: 3 })
    expect((await db.query("SELECT count(*)::int AS n FROM orders WHERE status = 'reserved'")).rows[0]).toEqual({ n: 3 })
  })

  it('ten mixed carts: three whole carts win, and the plentiful product is never over-taken by the losers', async () => {
    const products = await listProducts(db)
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => reserve(db, cart({ sourdough: 1, banana: 1 }, i), products, fixedClock(NOW))))
    expect(results.filter((r) => r.ok)).toHaveLength(3)
    const rows = (await db.query('SELECT product_id, committed FROM date_inventory WHERE date = $1::date ORDER BY product_id', [WED])).rows
    expect(rows).toEqual([
      { product_id: 'banana', committed: 3 },
      { product_id: 'sourdough', committed: 3 },
    ])
  })

  it('through the HTTP handler, with the last loaf contested by carts of different sizes', async () => {
    const app = createApp({ db, clock: fixedClock(NOW) })
    const post = (body: unknown) => app.checkout(new Request('https://bread.example/api/checkout', { method: 'POST', body: JSON.stringify(body) }))
    const sizes = [2, 2, 1, 3, 1, 1, 2]
    const responses = await Promise.all(sizes.map((n, i) => post(cart({ sourdough: n }, i))))
    const statuses = responses.map((r) => r.status)
    const won = statuses.filter((s) => s === 200).length
    expect(won).toBeGreaterThanOrEqual(1)
    expect(statuses.every((s) => s === 200 || s === 409)).toBe(true)
    const row = (await db.query("SELECT committed FROM date_inventory WHERE date = $1::date AND product_id = 'sourdough'", [WED])).rows[0] as { committed: number }
    expect(row.committed).toBeLessThanOrEqual(3)
  })
})
