import type { Context } from '@netlify/functions'
import { systemClock } from '../../shared/clock.ts'
import { createApp } from '../lib/app.ts'
import { clientIp } from '../lib/auth.ts'
import { productionDb } from '../lib/db/client.ts'
import { error } from '../lib/http.ts'
import { productionGateway } from '../lib/stripe/gateway.ts'

/**
 * POST /api/checkout. The caller's address comes from Netlify's context so
 * the per-address checkout limit counts real clients, not a header. The
 * database is opened on first request, not at import, so a cold start
 * without one still loads — and answers with a clear 503 rather than a crash.
 */
let app: ReturnType<typeof createApp> | undefined

export default async function handler(req: Request, context: Context): Promise<Response> {
  if (!app) {
    try {
      app = createApp({ db: productionDb(), clock: systemClock, gateway: productionGateway() })
    } catch (err) {
      console.error('[bread] no database configured', err)
      return error('database_not_configured', 503)
    }
  }
  return app.checkout(req, clientIp(req, context))
}
