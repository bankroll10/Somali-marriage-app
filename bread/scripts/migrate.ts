import pg from 'pg'
import { poolDb } from '../netlify/lib/db/client.ts'
import { applyMigrations } from '../netlify/lib/db/migrate.ts'

/**
 * Applies db/migrations/ to DATABASE_URL. Run by hand (`npm run db:migrate`)
 * against any Postgres, and also wired into the Netlify build itself
 * (`netlify.toml`'s build command), which is how migrations apply
 * automatically on deploy now that Netlify's own auto-provisioned database
 * isn't available on this account's plan — see docs/BUILD_STATUS.md.
 *
 * As a build step this must not fail a deploy that simply has no database
 * configured yet (a fresh site, or a preview deploy): that is a skip, not an
 * error. Anything else — a set DATABASE_URL that is wrong, or a migration
 * that fails to apply — fails loudly, because that deploy would otherwise
 * ship with the wrong schema.
 */
const url = process.env.DATABASE_URL
if (!url) {
  console.log('[bread] DATABASE_URL is not set — skipping database migrations for this build.')
  process.exit(0)
}

const isLocal = /^postgres(ql)?:\/\/[^/]*@?(localhost|127\.0\.0\.1)[:/]/.test(url)
const pool = new pg.Pool({ connectionString: url, ssl: isLocal ? undefined : { rejectUnauthorized: false } })
try {
  const ran = await applyMigrations(poolDb(pool))
  console.log(ran.length ? `[bread] migrations applied: ${ran.join(', ')}` : '[bread] migrations up to date')
} finally {
  await pool.end()
}
