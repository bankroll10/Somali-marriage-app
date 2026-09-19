import { systemClock } from '../../shared/clock.ts'
import { createApp } from '../lib/app.ts'
import { productionDb } from '../lib/db/client.ts'
import { error } from '../lib/http.ts'
import { productionGateway } from '../lib/stripe/gateway.ts'

/**
 * GET /api/health: is the deployed site wired up — database reachable and
 * migrated, Stripe in which mode, admin configured, when the scheduled
 * reconcile last ran and the last webhook arrived, whether test data is
 * still in the database. Nothing about any customer. Read by the launch
 * preflight and smoke scripts, and by anyone who opens it.
 */
let app: ReturnType<typeof createApp> | undefined

export default async function handler(req: Request): Promise<Response> {
  if (!app) {
    try {
      app = createApp({ db: productionDb(), clock: systemClock, gateway: productionGateway() })
    } catch (err) {
      console.error('[bread] no database configured', err)
      return error('database_not_configured', 503)
    }
  }
  return app.health(req)
}
