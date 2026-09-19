import { printChecks, smokeChecks, type HealthLike } from './checks.ts'

/**
 * Proves the DEPLOYED site does what the tests say the code does — from
 * any machine that can reach it, with no secrets:
 *
 *   npm run smoke -- https://bread-pickup.netlify.app
 *
 * With ADMIN_PASSWORD in the shell environment (never on the command line,
 * never in a file in this repo) it also signs in and reads the day list,
 * which proves the database and the admin end to end. One wrong-password
 * attempt is made on purpose; it counts as one of the five allowed.
 */
const site = (process.argv[2] ?? '').replace(/\/$/, '')
if (!/^https:\/\//.test(site)) {
  console.error('usage: npm run smoke -- https://<site>')
  process.exit(1)
}
const get = (path: string, init: RequestInit = {}) => fetch(`${site}${path}`, { redirect: 'manual', ...init })
const json = async (res: Response) => {
  try {
    return (await res.json()) as HealthLike & Record<string, unknown>
  } catch {
    return null
  }
}

try {
  const health = await get('/api/health')
  const healthBody = await json(health)
  if (!healthBody) {
    // Not our app answering: a proxy, a parked domain, a dead site. Say so rather than print a page of FAILs.
    console.error(`${site}/api/health answered HTTP ${health.status} with no JSON — the site is not reachable from here, or not deployed.`)
    process.exit(2)
  }
  const availability = await get('/api/availability')
  const home = await get('/')
  const thanks = await get('/thanks')
  const robots = await get('/robots.txt')
  const reconcile = await get('/api/reconcile-stale', { method: 'POST' })
  const availabilityBody = (await json(availability)) as { products?: unknown[]; days?: unknown[] } | null
  let adminWithPassword: { status: number; days: number } | null | undefined
  if (process.env.ADMIN_PASSWORD) {
    const signIn = await get('/api/admin-session', { method: 'POST', body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }) })
    if (signIn.status === 200) {
      const { token } = (await signIn.json()) as { token: string }
      const list = await get('/api/admin', { headers: { authorization: `Bearer ${token}` } })
      const body = (await json(list)) as { days?: unknown[] } | null
      adminWithPassword = { status: list.status, days: body?.days?.length ?? 0 }
    } else adminWithPassword = null
  }
  const ok = printChecks(`Smoke test of ${site} at ${new Date().toISOString()}`, smokeChecks(
    {
      health: { status: health.status, body: healthBody },
      availability: { status: availability.status, body: availabilityBody, cacheControl: availability.headers.get('cache-control') },
      orderUnknown: (await get('/api/order?order=deadbeef-dead-4eef-8ead-beefdeadbeef')).status,
      orderMalformed: (await get('/api/order?order=nope')).status,
      adminNoToken: (await get('/api/admin')).status,
      adminSessionWrong: (await get('/api/admin-session', { method: 'POST', body: JSON.stringify({ password: 'definitely-not-it' }) })).status,
      reconcile: { status: reconcile.status, text: await reconcile.text() },
      webhookUnsigned: (await get('/api/stripe-webhook', { method: 'POST', body: '{}' })).status,
      home: { status: home.status, headers: Object.fromEntries(['content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options'].map((h) => [h, home.headers.get(h)])) },
      thanksCacheControl: thanks.headers.get('cache-control'),
      robots: { status: robots.status, text: await robots.text() },
      adminWithPassword,
    },
    Date.now(),
  ))
  process.exit(ok ? 0 : 1)
} catch (err) {
  console.error(`Could not reach ${site}: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(2)
}
