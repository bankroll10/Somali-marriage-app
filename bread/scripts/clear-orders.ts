import pg from 'pg'
import { poolConfig, poolDb } from '../netlify/lib/db/client.ts'
import { clearOrders } from '../netlify/lib/ops.ts'

/**
 * Wipes every order from the database DATABASE_URL points at, so a site that
 * has been tested on real pickup dates opens with its full capacity rather
 * than phantom sales. Deletes orders (and with them their items, payment
 * references and exceptions), the webhook log, checkout attempts, sign-in
 * attempts, admin actions and job runs; zeroes every date's committed and
 * overflow units and lifts nothing else — blocked dates, products and
 * capacities stay as she set them.
 *
 *   npm run db:clear-orders -- --yes
 *
 * Refuses to run without --yes, and refuses outright while the database holds
 * a real (live-mode) card sale unless --include-live is also given: this is
 * for the test orders before launch, not for her books. Never run by the
 * build. Money already taken at Stripe is not touched by deleting the row
 * that remembers it — refund in Stripe first if that is what is meant.
 */
const url = process.env.DATABASE_URL
if (!url) {
  console.error('[bread] DATABASE_URL is not set')
  process.exit(1)
}
if (!process.argv.includes('--yes')) {
  console.error('[bread] This deletes every order in the database. Run it as:  npm run db:clear-orders -- --yes')
  process.exit(1)
}

const pool = new pg.Pool(poolConfig(url))
try {
  const out = await clearOrders(poolDb(pool), { includeLive: process.argv.includes('--include-live') })
  if (!out.ok) {
    console.error(`[bread] Refused: ${out.liveSales} real (live-mode) card sale${out.liveSales === 1 ? '' : 's'} in this database. Export them first (npm run db:export), then add --include-live if you really mean to delete them.`)
    process.exit(2)
  }
  console.log(`[bread] before: ${out.before.orders} orders (${out.before.paid} paid)`)
  console.log(`[bread] after: ${out.after.orders} orders; ${out.after.dates} pickup date${out.after.dates === 1 ? '' : 's'} kept, capacity restored; blocked: ${out.after.blocked.join(', ') || 'none'}`)
} finally {
  await pool.end()
}
