import pg from 'pg'
import { poolConfig, poolDb } from '../netlify/lib/db/client.ts'
import { exportOrdersCsv } from '../netlify/lib/ops.ts'

/**
 * Her orders as a CSV on stdout — one line per bread line, with the
 * customer, the money and what happened to the bread. Records, tax time,
 * and the backup that opens in a spreadsheet when no database is around.
 *
 *   DATABASE_URL=… npm run db:export -- --from 2026-09-01 --to 2026-12-31 > orders.csv
 *
 * Both dates are pickup dates, inclusive; --from defaults to a year ago and
 * --to to a year ahead. Contains phone numbers: keep the file where she
 * keeps customer details, not in the repository.
 */
const url = process.env.DATABASE_URL
if (!url) {
  console.error('[bread] DATABASE_URL is not set')
  process.exit(1)
}
const arg = (name: string) => {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const ymd = (d: Date) => d.toISOString().slice(0, 10)
const from = arg('--from') ?? ymd(new Date(Date.now() - 365 * 86_400_000))
const to = arg('--to') ?? ymd(new Date(Date.now() + 365 * 86_400_000))
if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
  console.error('[bread] --from and --to must be YYYY-MM-DD')
  process.exit(1)
}
const pool = new pg.Pool(poolConfig(url))
try {
  process.stdout.write(await exportOrdersCsv(poolDb(pool), from, to))
} finally {
  await pool.end()
}
