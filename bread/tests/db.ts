import { PGlite } from '@electric-sql/pglite'
import { expect } from 'vitest'
import type { Db, Queryable, QueryResult } from '../netlify/lib/db/client.ts'
import { applyMigrations } from '../netlify/lib/db/migrate.ts'

/**
 * Postgres, in-process, for the tests: PGlite runs the same migration file
 * production runs. Its one limitation is a single connection, so
 * transactions queue rather than contend; the CHECK constraint still proves
 * the invariant, and tests/contention.test.ts repeats the race on a real
 * multi-connection Postgres when one is available.
 */

// PGlite's extended-protocol query() takes one statement; exec() takes many
// but no parameters. Route on whether there are parameters.
function adapt(q: { query: PGlite['query']; exec: PGlite['exec'] }): Queryable {
  return {
    async query<R>(text: string, params?: readonly unknown[]): Promise<QueryResult<R>> {
      if (params && params.length > 0) return (await q.query(text, params as unknown[])) as unknown as QueryResult<R>
      const results = await q.exec(text)
      return (results[results.length - 1] ?? { rows: [] }) as unknown as QueryResult<R>
    },
  }
}

export function pgliteDb(pg: PGlite): Db {
  const top = adapt(pg)
  return {
    query: top.query,
    transaction: (fn) => pg.transaction((tx) => fn(adapt(tx))),
  }
}

// One engine per test file; each test gets an empty schema and a fresh
// migration, which is fast, rather than a fresh engine, which is not.
let engine: { db: Db; pg: PGlite } | undefined

export async function freshDb(): Promise<{ db: Db; pg: PGlite }> {
  if (!engine) {
    const pg = new PGlite()
    engine = { db: pgliteDb(pg), pg }
  } else {
    await engine.db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
  }
  await applyMigrations(engine.db)
  return engine
}

/**
 * The ledger must always equal a recount from the orders themselves: every
 * live reservation, plus every paid order whose units she has not explicitly
 * put back on sale (a fulfilment-cancelled order stays committed until she
 * chooses to restock it).
 */
export async function assertLedger(db: Queryable): Promise<void> {
  const { rows } = await db.query<{ date: string; product_id: string; committed: number; capacity: number; overflow: number; actual: number }>(
    `SELECT di.date::text AS date, di.product_id, di.committed, di.capacity, di.overflow,
            COALESCE((SELECT SUM(oi.quantity) FROM orders o JOIN order_items oi ON oi.order_id = o.id
                      WHERE o.date = di.date AND oi.product_id = di.product_id
                        AND (o.status = 'reserved' OR (o.status = 'paid' AND o.restocked_at IS NULL))), 0)::int AS actual
     FROM date_inventory di ORDER BY di.date, di.product_id`,
  )
  for (const r of rows) {
    expect(r.committed, `${r.date} ${r.product_id}: committed vs recount`).toBe(r.actual)
    expect(r.committed, `${r.date} ${r.product_id}: within capacity`).toBeLessThanOrEqual(r.capacity + r.overflow)
  }
}
