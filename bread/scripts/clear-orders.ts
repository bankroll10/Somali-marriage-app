import pg from 'pg'
import { poolConfig, poolDb } from '../netlify/lib/db/client.ts'

/**
 * Wipes every order from the database DATABASE_URL points at, so a site that
 * has been tested on real pickup dates opens with its full capacity rather
 * than phantom sales. Deletes orders (and with them their items, payment
 * references and exceptions), the webhook log, checkout attempts, sign-in
 * attempts and admin actions; zeroes every date's committed and overflow
 * units and lifts nothing else — blocked dates, products and capacities
 * stay as she set them.
 *
 *   npm run db:clear-orders -- --yes
 *
 * Refuses to run without --yes. Never run by the build. Run it once, before
 * the first real customer, and not again: it does not know test orders from
 * real ones, and money already taken at Stripe is not touched by deleting
 * the row that remembers it.
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
const db = poolDb(pool)
try {
  const count = async (table: string) => (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n
  const before = { orders: await count('orders'), paid: (await db.query<{ n: number }>("SELECT count(*)::int AS n FROM orders WHERE status = 'paid'")).rows[0].n, exceptions: await count('payment_exceptions') }
  console.log(`[bread] before: ${before.orders} orders (${before.paid} paid), ${before.exceptions} payment exceptions`)
  await db.transaction(async (tx) => {
    await tx.query('DELETE FROM admin_actions')
    await tx.query('DELETE FROM checkout_attempts')
    await tx.query('DELETE FROM webhook_events')
    await tx.query('DELETE FROM admin_sign_ins')
    await tx.query('DELETE FROM orders') // cascades to order_items, payment_references, payment_exceptions
    await tx.query('UPDATE date_inventory SET committed = 0, overflow = 0')
  })
  const dates = (await db.query<{ date: string; blocked: boolean }>('SELECT date::text AS date, (blocked_at IS NOT NULL) AS blocked FROM pickup_dates ORDER BY date')).rows
  console.log(`[bread] after: ${await count('orders')} orders, ${await count('payment_references')} payment references, ${await count('webhook_events')} webhook events`)
  console.log(`[bread] ${dates.length} pickup date${dates.length === 1 ? '' : 's'} kept, capacity restored; blocked: ${dates.filter((d) => d.blocked).map((d) => d.date).join(', ') || 'none'}`)
} finally {
  await pool.end()
}
