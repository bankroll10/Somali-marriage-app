import pg from 'pg'
import { poolDb } from '../netlify/lib/db/client.ts'
import { applyMigrations } from '../netlify/lib/db/migrate.ts'

/**
 * `npm run db:migrate` — apply the migrations to a Postgres that is not
 * Netlify DB (Netlify applies them itself on deploy). Reads DATABASE_URL.
 */
const url = process.env.DATABASE_URL ?? process.env.NETLIFY_DB_URL
if (!url) {
  console.error('Set DATABASE_URL to the Postgres to migrate.')
  process.exit(1)
}
const pool = new pg.Pool({ connectionString: url })
const ran = await applyMigrations(poolDb(pool))
console.log(ran.length ? `applied: ${ran.join(', ')}` : 'up to date')
await pool.end()
