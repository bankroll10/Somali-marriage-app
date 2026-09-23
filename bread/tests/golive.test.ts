import Stripe from 'stripe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SITE_URL } from '../shared/config.ts'
import { fixedClock, type FixedClock } from '../shared/clock.ts'
import { createApp } from '../netlify/lib/app.ts'
import type { Db } from '../netlify/lib/db/client.ts'
import { REQUIRED_WEBHOOK_EVENTS, selectStripeCredentials, stagedStripe } from '../netlify/lib/stripe/gateway.ts'
import { adminHeaders } from './adminSession.ts'
import { assertLedger, freshDb } from './db.ts'
import { fakeStripe } from './fakeStripe.ts'

/**
 * Going live from the admin page. The Stripe calls go through the real SDK
 * with a recording HTTP client standing in for api.stripe.com, so these
 * prove the exact requests the panel sends — and that none of them takes a
 * payment, and none of its answers carries the key.
 */
const NOW = Date.UTC(2026, 8, 23, 17)
const ADMIN = 'test-admin-password'
const LIVE_KEY = 'rk_live_TESTONLYnotarealkey'
const HOOK = `${SITE_URL}/api/stripe-webhook`

describe('which Stripe keys the site runs on', () => {
  const test = { STRIPE_SECRET_KEY: 'sk_test_1', STRIPE_WEBHOOK_SECRET: 'whsec_test' }
  const live = { STRIPE_LIVE_SECRET_KEY: 'rk_live_1', STRIPE_LIVE_WEBHOOK_SECRET: 'whsec_live' }

  it('runs on the test pair until STRIPE_MODE=live, with the live pair staged beside it and ignored', () => {
    expect(selectStripeCredentials({})).toBeNull()
    expect(selectStripeCredentials({ ...test })).toEqual({ key: 'sk_test_1', webhookSecret: 'whsec_test', mode: 'test' })
    expect(selectStripeCredentials({ ...test, ...live })).toEqual({ key: 'sk_test_1', webhookSecret: 'whsec_test', mode: 'test' })
    expect(selectStripeCredentials({ ...test, ...live, STRIPE_MODE: 'live' })).toEqual({ key: 'rk_live_1', webhookSecret: 'whsec_live', mode: 'live' })
  })

  it('in live mode, refuses to run at all rather than fall back to test keys', () => {
    expect(selectStripeCredentials({ ...test, STRIPE_MODE: 'live', STRIPE_LIVE_SECRET_KEY: 'rk_live_1' })).toBeNull() // no live webhook secret
    expect(selectStripeCredentials({ ...test, STRIPE_MODE: 'live', STRIPE_LIVE_WEBHOOK_SECRET: 'whsec_live' })).toBeNull() // no live key
    expect(selectStripeCredentials({ ...test, STRIPE_MODE: 'live', STRIPE_LIVE_SECRET_KEY: 'sk_test_oops', STRIPE_LIVE_WEBHOOK_SECRET: 'whsec_live' })).toBeNull() // a test key in the live slot
  })

  it('reports what is staged as flags, never values', () => {
    expect(stagedStripe({ ...test })).toEqual({ mode: 'test', liveKeyStaged: false, liveWebhookSecretStaged: false })
    const flags = stagedStripe({ ...test, ...live })
    expect(flags).toEqual({ mode: 'test', liveKeyStaged: true, liveWebhookSecretStaged: true })
    expect(JSON.stringify(flags)).not.toMatch(/rk_live|whsec/)
  })
})

// ── The panel ─────────────────────────────────────────────────────────────

type Seen = { method: string; path: string; form: URLSearchParams }

/** A stand-in for api.stripe.com: a live account, a webhook-endpoint table, and checkout sessions. */
function stripeDouble(over: { accountStatus?: number; account?: Record<string, unknown> } = {}) {
  const seen: Seen[] = []
  const endpoints: { id: string; url: string; status: string; enabled_events: string[] }[] = []
  let n = 0
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } })
  const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
    const u = new URL(String(url))
    const form = new URLSearchParams(typeof init?.body === 'string' ? init.body : '')
    const method = init?.method ?? 'GET'
    seen.push({ method, path: u.pathname, form })
    if (u.pathname === '/v1/account') {
      if (over.accountStatus) return reply(over.accountStatus, { error: { type: 'invalid_request_error', message: 'The provided key does not have the required permissions for this endpoint.' } })
      return reply(200, {
        id: 'acct_1',
        object: 'account',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        requirements: { currently_due: [], past_due: [], disabled_reason: null },
        business_profile: { url: SITE_URL },
        settings: { payments: { statement_descriptor: 'FRESH BREAD' } },
        ...over.account,
      })
    }
    if (u.pathname === '/v1/webhook_endpoints' && method === 'GET') return reply(200, { object: 'list', data: endpoints, has_more: false })
    if (u.pathname === '/v1/webhook_endpoints' && method === 'POST') {
      const made = { id: `we_${++n}`, url: form.get('url')!, status: 'enabled', enabled_events: [...form.entries()].filter(([k]) => k.startsWith('enabled_events')).map(([, v]) => v) }
      endpoints.push(made)
      return reply(200, { ...made, object: 'webhook_endpoint', secret: `whsec_created_${n}` })
    }
    const upd = u.pathname.match(/^\/v1\/webhook_endpoints\/(we_\d+)$/)
    if (upd && method === 'POST') {
      const e = endpoints.find((x) => x.id === upd[1])!
      e.enabled_events = [...form.entries()].filter(([k]) => k.startsWith('enabled_events')).map(([, v]) => v)
      return reply(200, { ...e, object: 'webhook_endpoint' })
    }
    if (u.pathname === '/v1/checkout/sessions' && method === 'POST') {
      return reply(200, { id: 'cs_live_1', object: 'checkout.session', status: 'open', payment_status: 'unpaid', mode: 'payment', livemode: true, amount_total: 100, currency: 'usd', metadata: { order_id: form.get('metadata[order_id]') }, client_reference_id: form.get('client_reference_id'), payment_intent: null, url: 'https://checkout.stripe.com/c/pay/cs_live_1', expires_at: 1 })
    }
    if (u.pathname === '/v1/checkout/sessions/cs_live_1/expire' && method === 'POST') {
      return reply(200, { id: 'cs_live_1', object: 'checkout.session', status: 'expired', payment_status: 'unpaid', mode: 'payment', livemode: true, amount_total: 100, currency: 'usd', metadata: {}, client_reference_id: null, payment_intent: null, url: null, expires_at: 1 })
    }
    return reply(404, { error: { type: 'invalid_request_error', message: `unexpected ${method} ${u.pathname}` } })
  }
  return { seen, endpoints, options: { httpClient: Stripe.createFetchHttpClient(fetchFn as typeof fetch), maxNetworkRetries: 0 } }
}

let db: Db
let clock: FixedClock
let asAdmin: Record<string, string>

beforeEach(async () => {
  ;({ db } = await freshDb())
  clock = fixedClock(NOW)
  process.env.ADMIN_PASSWORD = ADMIN
  delete process.env.URL
})
afterEach(() => assertLedger(db))

function appWith(key: string | undefined, double = stripeDouble()) {
  const app = createApp({ db, clock, gateway: fakeStripe(false, clock).gateway, liveStripe: { key, options: double.options } })
  return { app, double }
}
const act = (app: ReturnType<typeof createApp>, body: Record<string, unknown>, headers: Record<string, string>) =>
  app.admin(new Request('https://bread.example/api/admin', { method: 'POST', body: JSON.stringify(body), headers }))

describe('the Going live panel', () => {
  it('is closed without a session, for every step', async () => {
    const { app, double } = appWith(LIVE_KEY)
    for (const action of ['goLiveStatus', 'goLiveProbe', 'goLiveWebhook', 'clearPractice']) {
      expect((await act(app, { action, confirm: 'CLEAR' }, {})).status, action).toBe(401)
    }
    expect(double.seen).toEqual([]) // nobody reached Stripe
  })

  it('says so, and calls nothing, when no real live key is staged', async () => {
    for (const key of [undefined, 'sk_test_notlive']) {
      const { app, double } = appWith(key)
      asAdmin = await adminHeaders(app, ADMIN)
      const res = await act(app, { action: 'goLiveStatus' }, asAdmin)
      expect(res.status).toBe(409)
      expect(await res.json()).toEqual({ error: 'live_key_not_staged' })
      expect(double.seen).toEqual([])
    }
  })

  it('step 1 reads her account and the endpoint list — two GETs, nothing else — and never echoes the key', async () => {
    const { app, double } = appWith(LIVE_KEY)
    asAdmin = await adminHeaders(app, ADMIN)
    const res = await act(app, { action: 'goLiveStatus' }, asAdmin)
    const text = await res.text()
    expect(res.status).toBe(200)
    expect(text).not.toContain(LIVE_KEY)
    const body = JSON.parse(text)
    expect(double.seen.map((r) => `${r.method} ${r.path}`)).toEqual(['GET /v1/account', 'GET /v1/webhook_endpoints'])
    expect(body.webhookExists).toBe(false)
    expect(body.staged).toMatchObject({ liveKeyStaged: true })
    const failing = body.checks.filter((c: { ok: boolean }) => !c.ok).map((c: { name: string }) => c.name)
    expect(failing).toEqual(['webhook endpoint for this site exists']) // expected before step 3
    expect(body.checks.find((c: { name: string }) => c.name === 'statement descriptor set').detail).toBe('customers will see "FRESH BREAD"')
  })

  it('step 1 reports a key that may not read the account, instead of failing', async () => {
    const { app } = appWith(LIVE_KEY, stripeDouble({ accountStatus: 403 }))
    asAdmin = await adminHeaders(app, ADMIN)
    const body = await (await act(app, { action: 'goLiveStatus' }, asAdmin)).json()
    expect(body.checks[0]).toEqual({ name: 'Stripe account readable', ok: false, detail: 'the key could not read the account' })
    expect(body.errors[0].message).toContain('required permissions')
  })

  it('step 2 makes the same Checkout Session a real order makes, then expires it at once — nothing payable is left', async () => {
    const { app, double } = appWith(LIVE_KEY)
    asAdmin = await adminHeaders(app, ADMIN)
    const res = await act(app, { action: 'goLiveProbe' }, asAdmin)
    const text = await res.text()
    expect(text).not.toContain(LIVE_KEY)
    expect(JSON.parse(text)).toEqual({ ok: true, sessionId: 'cs_live_1', livemode: true, expired: true })
    expect(double.seen.map((r) => `${r.method} ${r.path}`)).toEqual(['POST /v1/checkout/sessions', 'POST /v1/checkout/sessions/cs_live_1/expire'])
    const form = double.seen[0].form
    // The production create, parameter for parameter where it matters: card only, one-off, our metadata.
    expect(form.get('mode')).toBe('payment')
    expect(form.get('payment_method_types[0]')).toBe('card')
    expect(form.get('customer_creation')).toBe('if_required')
    expect(form.get('metadata[order_id]')).toMatch(/^setup-check-\d+$/)
    expect(form.get('line_items[0][price_data][product_data][name]')).toBe('Setup check — not an order')
    // No order id a webhook could ever match: if its expiry event arrives, it changes nothing.
    expect(form.get('metadata[order_id]')).not.toMatch(/^[0-9a-f]{8}-/)
    expect((await db.query("SELECT detail FROM admin_actions WHERE action = 'goLiveProbe'")).rows).toHaveLength(1)
  })

  it('step 3 creates the endpoint once with every required event, hands the secret back once, and keeps it out of the audit record', async () => {
    const { app, double } = appWith(LIVE_KEY)
    asAdmin = await adminHeaders(app, ADMIN)
    const first = await (await act(app, { action: 'goLiveWebhook' }, asAdmin)).json()
    expect(first).toEqual({ ok: true, action: 'created', id: 'we_1', secret: 'whsec_created_1' })
    const create = double.seen.find((r) => r.method === 'POST' && r.path === '/v1/webhook_endpoints')!
    expect(create.form.get('url')).toBe(HOOK)
    expect([...create.form.entries()].filter(([k]) => k.startsWith('enabled_events')).map(([, v]) => v)).toEqual([...REQUIRED_WEBHOOK_EVENTS])

    // Pressed again: finds it, changes nothing, and has no secret to give.
    const again = await (await act(app, { action: 'goLiveWebhook' }, asAdmin)).json()
    expect(again).toEqual({ ok: true, action: 'unchanged', id: 'we_1' })
    expect(double.endpoints).toHaveLength(1)

    const audit = JSON.stringify((await db.query("SELECT detail FROM admin_actions WHERE action = 'goLiveWebhook'")).rows)
    expect(audit).not.toContain('whsec_')
    expect(audit).toContain('we_1')

    // Now step 1 sees it.
    const status = await (await act(app, { action: 'goLiveStatus' }, asAdmin)).json()
    expect(status.webhookExists).toBe(true)
    expect(status.checks.every((c: { ok: boolean }) => c.ok)).toBe(true)
  })

  it('step 3 widens an endpoint that exists but misses events, rather than making a second', async () => {
    const double = stripeDouble()
    double.endpoints.push({ id: 'we_9', url: HOOK, status: 'enabled', enabled_events: ['checkout.session.completed'] })
    const { app } = appWith(LIVE_KEY, double)
    asAdmin = await adminHeaders(app, ADMIN)
    const out = await (await act(app, { action: 'goLiveWebhook' }, asAdmin)).json()
    expect(out.action).toBe('updated')
    expect(out.added).toEqual(REQUIRED_WEBHOOK_EVENTS.filter((e) => e !== 'checkout.session.completed'))
    expect(out).not.toHaveProperty('secret')
    expect(double.endpoints).toHaveLength(1)
    expect(double.endpoints[0].enabled_events).toEqual([...REQUIRED_WEBHOOK_EVENTS])
  })

  it('step 4 clears practice orders only when told CLEAR, and never while a real sale exists', async () => {
    const { app } = appWith(LIVE_KEY)
    asAdmin = await adminHeaders(app, ADMIN)
    const order = async (livemode: boolean, name: string) => {
      const res = await app.checkout(new Request('https://bread.example/api/checkout', { method: 'POST', body: JSON.stringify({ date: '2026-09-28', qty: { banana: 1 }, name, phone: `612555${String(name.length).padStart(4, '0')}${''}`.slice(0, 10), checkoutKey: crypto.randomUUID() }) }), `198.51.100.${name.length}`)
      const { orderId } = await res.json()
      await db.query("UPDATE payment_references SET livemode = $2, status = CASE WHEN $2 THEN 'succeeded' ELSE status END WHERE order_id = $1::uuid", [orderId, livemode])
      if (livemode) await db.query("UPDATE orders SET status = 'paid' WHERE id = $1::uuid", [orderId])
      return orderId
    }
    await order(false, 'Practice')
    expect((await act(app, { action: 'clearPractice' }, asAdmin)).status).toBe(400)
    expect((await act(app, { action: 'clearPractice', confirm: 'clear' }, asAdmin)).status).toBe(400)

    const cleared = await (await act(app, { action: 'clearPractice', confirm: 'CLEAR' }, asAdmin)).json()
    expect(cleared).toMatchObject({ ok: true, before: { orders: 1 }, after: { orders: 0 } })
    expect((await db.query("SELECT action FROM admin_actions WHERE action = 'clearPractice'")).rows).toHaveLength(1)

    await order(true, 'Real Customer')
    const refused = await act(app, { action: 'clearPractice', confirm: 'CLEAR' }, asAdmin)
    expect(refused.status).toBe(409)
    expect(await refused.json()).toEqual({ error: 'live_sales_present', liveSales: 1 })
    expect((await db.query('SELECT count(*)::int AS n FROM orders')).rows[0]).toEqual({ n: 1 })
  })

  it('her page and the health endpoint show what is staged, as flags', async () => {
    process.env.STRIPE_LIVE_WEBHOOK_SECRET = 'whsec_staged'
    try {
      const { app } = appWith(LIVE_KEY)
      asAdmin = await adminHeaders(app, ADMIN)
      const page = await (await app.admin(new Request('https://bread.example/api/admin', { headers: asAdmin }))).json()
      expect(page.ops).toMatchObject({ mode: 'test', liveKeyStaged: true, liveWebhookSecretStaged: true })
      const healthText = await (await app.health(new Request('https://bread.example/api/health'))).text()
      expect(JSON.parse(healthText)).toMatchObject({ stripeMode: 'test', liveKeyStaged: true, liveWebhookSecretStaged: true })
      expect(healthText).not.toMatch(/rk_live|whsec_/)
    } finally {
      delete process.env.STRIPE_LIVE_WEBHOOK_SECRET
    }
  })
})
