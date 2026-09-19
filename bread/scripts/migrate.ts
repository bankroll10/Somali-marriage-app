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
 * A build with no DATABASE_URL at all is a skip, not an error: a fresh site,
 * a preview deploy or a local `npm run build` should still build. The one
 * exception is a *production* build (Netlify sets CONTEXT=production), which
 * must not go live announcing success against a database it never migrated —
 * that failure is silent at deploy time and shows up only as every request
 * answering 503. So there it fails the build instead. Anything else — a set
 * DATABASE_URL that is wrong, or a migration that fails to apply — fails
 * loudly everywhere, because that deploy would ship with the wrong schema.
 */
const url = process.env.DATABASE_URL
if (!url) {
  if (process.env.CONTEXT === 'production') {
    console.error(
      '[bread] DATABASE_URL is not set in this production build.\n' +
        '        Set it in Netlify (Site configuration -> Environment variables), and leave\n' +
        '        "Contains secret values" UNCHECKED: Netlify withholds secret variables from\n' +
        '        the build environment, so the schema would never be migrated and every\n' +
        '        request would answer 503 on a deploy that otherwise looks successful.',
    )
    process.exit(1)
  }
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
