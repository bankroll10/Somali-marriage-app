import pg from 'pg'
import type { Pool, PoolClient } from 'pg'

/**
 * The narrow surface the app needs from Postgres: parameterised queries and
 * a transaction that commits on success and rolls back on any throw.
 *
 * Production is a regular Postgres — any provider — reached with `pg`'s own
 * pool over DATABASE_URL. (Netlify also sells a zero-config, auto-provisioned
 * database, but it isn't available on this account's plan, so this app
 * doesn't depend on it — see db/migrations/README or BUILD_STATUS.) Tests
 * are PGlite — the same Postgres, in-process — through the adapter in
 * tests/db.ts. Both satisfy this interface, so every query and every
 * transaction the app runs is the one the tests ran.
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
 * The production database: DATABASE_URL, whatever Postgres it points at.
 * Throws when it's unset, which every function handler turns into a plain
 * 503 rather than a crash. Managed Postgres providers (this app was set up
 * against Neon) need TLS; a plain "localhost" URL — local development only —
 * is the one case that doesn't.
 */
export function productionDb(): Db {
  if (!cached) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL is not set')
    const isLocal = /^postgres(ql)?:\/\/[^/]*@?(localhost|127\.0\.0\.1)[:/]/.test(connectionString)
    const pool = new pg.Pool({ connectionString, ssl: isLocal ? undefined : { rejectUnauthorized: false } })
    cached = poolDb(pool)
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
