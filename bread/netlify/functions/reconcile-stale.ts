import type { Config } from '@netlify/functions'
import { systemClock } from '../../shared/clock.ts'
import { createApp } from '../lib/app.ts'
import { productionDb } from '../lib/db/client.ts'
import { error } from '../lib/http.ts'
import { productionGateway } from '../lib/stripe/gateway.ts'

/**
 * Every half hour, ask Stripe about card orders whose session should have
 * ended by now, so an abandoned checkout gives its bread back even if no
 * customer page, webhook or admin visit ever happens to do it. Netlify runs
 * this on the schedule below; it is also safe to call by hand.
 *
 * Why half an hour and not less: this is the LAST of four ways a hold comes
 * back, not the first. Stripe's own checkout.session.expired arrives at the
 * session's expiry and the webhook releases the bread there and then; the
 * customer's page and her admin page settle holds too. This run only ever
 * touches holds already past hold_expires_at — the session's 45 minutes plus
 * a 10-minute margin — so the interval only lengthens the worst case in the
 * case where Stripe's webhook ALSO failed. Against that: every run wakes the
 * database, and a woken Neon stays up five minutes, so a ten-minute schedule
 * kept it awake about half of every month and came close to exhausting the
 * free monthly compute — which does not bill anyone, it stops the database
 * until the month turns over. Half-hourly costs about a third of that.
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

export const config: Config = { schedule: '*/30 * * * *' }
