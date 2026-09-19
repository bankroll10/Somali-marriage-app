import { loadMigrations } from '../netlify/lib/db/migrate.ts'
import { preflightChecks, printChecks, type HealthLike } from './checks.ts'

/**
 * The go / no-go before the first real customer, asked of the deployed
 * site itself — no secrets needed:
 *
 *   npm run launch:preflight -- https://bread-pickup.netlify.app
 *
 * Every row must PASS: live Stripe key, admin password set, the schema this
 * code expects, no test orders left, nothing on hold, the scheduled
 * reconcile alive. Exit code 1 otherwise.
 */
const site = (process.argv[2] ?? '').replace(/\/$/, '')
if (!/^https:\/\//.test(site)) {
  console.error('usage: npm run launch:preflight -- https://<site>')
  process.exit(1)
}
try {
  const res = await fetch(`${site}/api/health`)
  let body: HealthLike | null = null
  try {
    body = (await res.json()) as HealthLike
  } catch {
    body = null
  }
  const ok = printChecks(`Launch preflight for ${site} at ${new Date().toISOString()}`, preflightChecks(body, res.status, loadMigrations().length, Date.now()))
  process.exit(ok ? 0 : 1)
} catch (err) {
  console.error(`Could not reach ${site}: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(2)
}
