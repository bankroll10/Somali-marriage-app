import { getDatabase } from '@netlify/database'
import type { Pool, PoolClient } from 'pg'

/**
 * The narrow surface the app needs from Postgres: parameterised queries and
 * a transaction that commits on success and rolls back on any throw.
 *
 * Production is Netlify DB (Postgres on Neon) through `@netlify/database`'s
 * pool. Tests are PGlite — the same Postgres, in-process — through the
 * adapter in tests/db.ts. Both satisfy this interface, so every query and
 * every transaction the app runs is the one the tests ran.
 */

export interface QueryResult<R> {
  rows: R[]
}

export interface Queryable {
  query<R = Record<string, unknown>>(text: string, params?: readonly unknown[]): Promise<QueryResult<R>>
}

export interface Db extends Queryable {
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>
}

/**
 * A `pg`-style pool as a Db. Neon needs a real connection for a transaction
 * (its HTTP driver runs each statement alone), which is what pool.connect()
 * gives. The lock timeout turns a stuck date lock into a fast "busy" rather
 * than a hung function; the idle timeout stops a killed function from
 * pinning the lock behind Neon's pooler.
 */
export function poolDb(pool: Pool): Db {
  return {
    query: <R>(text: string, params?: readonly unknown[]) => pool.query(text, params as unknown[]) as unknown as Promise<QueryResult<R>>,
    async transaction(fn) {
      const client: PoolClient = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query("SET LOCAL lock_timeout = '4s'")
        await client.query("SET LOCAL idle_in_transaction_session_timeout = '10s'")
        const result = await fn({
          query: <R>(text: string, params?: readonly unknown[]) => client.query(text, params as unknown[]) as unknown as Promise<QueryResult<R>>,
        })
        await client.query('COMMIT')
        return result
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        throw err
      } finally {
        client.release()
      }
    },
  }
}

let cached: Db | undefined

/**
 * The production database. `@netlify/database` reads NETLIFY_DB_URL, which
 * Netlify sets once the site's database exists; DATABASE_URL is honoured too
 * so any other Postgres can stand in.
 */
export function productionDb(): Db {
  if (!cached) {
    const override = process.env.NETLIFY_DB_URL ? undefined : process.env.DATABASE_URL
    const database = getDatabase(override ? { connectionString: override } : {})
    cached = poolDb(database.pool as unknown as Pool)
  }
  return cached
}

/** Postgres error codes the app cares about. */
export const PG = {
  checkViolation: '23514',
  uniqueViolation: '23505',
  lockNotAvailable: '55P03',
  serializationFailure: '40001',
} as const

/** The SQLSTATE of a thrown database error, when the driver attached one. */
export function pgCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
    return (err as { code: string }).code
  }
  return undefined
}
