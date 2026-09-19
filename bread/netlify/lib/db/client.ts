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
/**
 * How to open `url`, as `pg.Pool` wants it.
 *
 * SSL is decided entirely inside the connection string, because `pg` resolves
 * it that way whatever we pass: ConnectionParameters does
 * `Object.assign({}, config, parse(config.connectionString))`, so a `sslmode`
 * in the URL silently overrides an `ssl` option given alongside it. Passing
 * both is how you end up believing one thing and running another.
 *
 * A managed Postgres gets `sslmode=verify-full`: encrypted *and* the
 * certificate checked against the CA store, so a machine in the middle cannot
 * pose as the database. `pg` 8 already behaves that way for a plain
 * `sslmode=require` — it says so in a warning on every cold start — but that
 * is scheduled to change: in `pg` 9 / `pg-connection-string` 3, `require`
 * takes libpq's weaker meaning of "encrypt, don't check who answered". Saying
 * `verify-full` outright is identical today (both parse to the same options)
 * and keeps the guarantee across that upgrade instead of quietly losing it.
 *
 * A local Postgres speaks no TLS at all, so SSL is off there.
 */
export function poolConfig(url: string): pg.PoolConfig {
  if (/^postgres(ql)?:\/\/[^/]*@?(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    return { connectionString: url, ssl: false }
  }
  const parsed = new URL(url)
  parsed.searchParams.set('sslmode', 'verify-full')
  return { connectionString: parsed.toString() }
}

export function productionDb(): Db {
  if (!cached) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL is not set')
    cached = poolDb(new pg.Pool(poolConfig(connectionString)))
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
