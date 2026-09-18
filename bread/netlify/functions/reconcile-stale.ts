import type { Config } from '@netlify/functions'
import { systemClock } from '../../shared/clock.ts'
import { createApp } from '../lib/app.ts'
import { productionDb } from '../lib/db/client.ts'
import { error } from '../lib/http.ts'
import { productionGateway } from '../lib/stripe/gateway.ts'

/**
 * Every ten minutes, ask Stripe about card orders whose session should have
 * ended by now, so an abandoned checkout gives its bread back even if no
 * customer page, webhook or admin visit ever happens to do it. Netlify runs
 * this on the schedule below; it is also safe to call by hand.
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
  return app.reconcileStale(req)
}

export const config: Config = { schedule: '*/10 * * * *' }
