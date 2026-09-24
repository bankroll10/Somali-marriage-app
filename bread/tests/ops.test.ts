import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fixedClock, type FixedClock } from '../shared/clock.ts'
import { createApp } from '../netlify/lib/app.ts'
import type { Db } from '../netlify/lib/db/client.ts'
import { loadMigrations } from '../netlify/lib/db/migrate.ts'
import { clearOrders, exportOrdersCsv, healthReport } from '../netlify/lib/ops.ts'
import { preflightChecks, smokeChecks } from '../scripts/checks.ts'
import { adminHeaders } from './adminSession.ts'
import { assertLedger, freshDb } from './db.ts'
import { fakeStripe } from './fakeStripe.ts'

/**
 * Operating the deployed site: the health report, the job record the
 * scheduled reconcile leaves, the admin's view of both, the launch chores,
 * and the exact verdicts the smoke and preflight scripts would print.
 */
const NOW = Date.UTC(2026, 8, 18, 17)
const WED = '2026-09-23'
const MINUTE = 60_000
const ADMIN = 'test-admin-password'

let db: Db
let clock: FixedClock
let stripe: ReturnType<typeof fakeStripe>
let app: ReturnType<typeof createApp>

beforeEach(async () => {
  ;({ db } = await freshDb())
  clock = fixedClock(NOW)
  stripe = fakeStripe(false, clock)
  app = createApp({ db, clock, gateway: stripe.gateway })
  process.env.ADMIN_PASSWORD = ADMIN
})
afterEach(() => assertLedger(db))

const post = (fn: (r: Request) => Promise<Response>, path: string, body: unknown, headers: Record<string, string> = {}) =>
  fn(new Request(`https://bread.example${path}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers }))
const get = (fn: (r: Request) => Promise<Response>, path: string, headers: Record<string, string> = {}) => fn(new Request(`https://bread.example${path}`, { headers }))
let n = 0
const buy = (over: Record<string, unknown> = {}) =>
  app.checkout(new Request('https://bread.example/api/checkout', { method: 'POST', body: JSON.stringify({ date: WED, qty: { sourdough: 1 }, name: `Customer ${++n}`, phone: `612555${String(n).padStart(4, '0')}`, checkoutKey: crypto.randomUUID(), ...over }) }), `198.51.100.${n}`)
async function paid(over: Record<string, unknown> = {}) {
  const { orderId } = await (await buy(over)).json()
  const sid = (await db.query<{ external_id: string }>("SELECT external_id FROM payment_references WHERE order_id = $1::uuid", [orderId])).rows[0].external_id
  stripe.pay(sid)
  const { body, headers } = stripe.event('checkout.session.completed', sid)
  await post(app.webhook, '/api/stripe-webhook', body, headers)
  return orderId as string
}

describe('health and the job record', () => {
  it('reports the wiring and nothing about anyone, and the scheduled reconcile leaves a record the report and her page show', async () => {
    const { orderId } = await (await buy({ name: 'Private Person', phone: '6125559999' })).json()
    const before = await (await get(app.health, '/api/health')).json()
    expect(before).toMatchObject({ ok: true, migrations: loadMigrations().length, livemode: false, stripeConfigured: true, adminConfigured: true, lastReconcileAt: null, lastWebhookAt: null, liveHolds: 1, testDataPresent: true })
    expect(JSON.stringify(before)).not.toMatch(/Private Person|6125559999|cs_test|[0-9a-f]{8}-[0-9a-f]{4}-4/)
    expect((await get(app.health, '/api/health')).headers.get('cache-control')).toBe('no-store')

    clock.advance(60 * MINUTE)
    stripe.expire('cs_test_1')
    await post(app.reconcileStale, '/api/reconcile-stale', '')
    const after = await (await get(app.health, '/api/health')).json()
    expect(after).toMatchObject({ lastReconcileAt: new Date(NOW + 60 * MINUTE).toISOString(), lastReconcile: { reconciled: 1, states: { released: 1 } }, liveHolds: 0 })
    expect((await db.query('SELECT status FROM orders WHERE id = $1::uuid', [orderId])).rows[0]).toEqual({ status: 'expired' })

    const asAdmin = await adminHeaders(app, ADMIN)
    const admin = await (await get(app.admin, '/api/admin', asAdmin)).json()
    expect(admin.ops).toEqual({
      livemode: false,
      lastReconcileAt: new Date(NOW + 60 * MINUTE).toISOString(),
      lastWebhookAt: null,
      // Nothing is staged for going live in this test's environment.
      mode: 'test',
      liveKeyStaged: false,
      liveWebhookSecretStaged: false,
    })

    await paid()
    expect((await (await get(app.health, '/api/health')).json()).lastWebhookAt).toBe(new Date(NOW + 60 * MINUTE).toISOString())
    // Runs older than thirty days are let go.
    clock.advance(31 * 24 * 60 * MINUTE)
    await post(app.reconcileStale, '/api/reconcile-stale', '')
    expect((await db.query('SELECT count(*)::int AS n FROM job_runs')).rows[0]).toEqual({ n: 1 })
  })

  it('says whether Stripe is live, and whether test data is present, in both modes', async () => {
    expect((await healthReport(db, null, false, NOW)).livemode).toBeNull()
    expect(await healthReport(db, null, false, NOW)).toMatchObject({ stripeConfigured: false, adminConfigured: false, testDataPresent: false })
    await paid()
    const live = fakeStripe(true, clock)
    expect(await healthReport(db, live.gateway, true, NOW)).toMatchObject({ livemode: true, testDataPresent: true })
    await clearOrders(db, { includeLive: false })
    expect(await healthReport(db, live.gateway, true, NOW)).toMatchObject({ livemode: true, testDataPresent: false, liveHolds: 0 })
    // In live mode an order with no live payment reference is suspect too.
    await db.query("INSERT INTO pickup_dates (date) VALUES ($1::date) ON CONFLICT DO NOTHING", [WED])
    await db.query("INSERT INTO orders (id, date, status, customer_name, customer_phone, total_cents, hold_expires_at, created_at, provider) VALUES (gen_random_uuid(), $1::date, 'paid', 'Ghost', '6125550000', 500, now(), now(), 'zelle')", [WED])
    expect((await healthReport(db, live.gateway, true, NOW)).testDataPresent).toBe(true)
    await db.query('DELETE FROM orders')
  })
})

describe('the launch chores', () => {
  it('clearing refuses while a real sale is in the database, and wipes only orders otherwise', async () => {
    const liveApp = createApp({ db, clock, gateway: fakeStripe(true, clock).gateway })
    const sale = await (await liveApp.checkout(new Request('https://bread.example/api/checkout', { method: 'POST', body: JSON.stringify({ date: WED, qty: { banana: 1 }, name: 'Real Customer', phone: '6125550777', checkoutKey: crypto.randomUUID() }) }), '203.0.113.5')).json()
    await db.query("UPDATE payment_references SET status = 'succeeded', livemode = true WHERE order_id = $1::uuid", [sale.orderId])
    await db.query("UPDATE orders SET status = 'paid' WHERE id = $1::uuid", [sale.orderId])
    const asAdmin = await adminHeaders(app, ADMIN)
    await post(app.admin, '/api/admin', { action: 'block', date: '2026-09-28', reason: 'away' }, asAdmin)

    expect(await clearOrders(db, { includeLive: false })).toEqual({ ok: false, reason: 'live_sales_present', liveSales: 1 })
    expect((await db.query('SELECT count(*)::int AS n FROM orders')).rows[0]).toEqual({ n: 1 })

    const out = await clearOrders(db, { includeLive: true })
    expect(out).toMatchObject({ ok: true, before: { orders: 1, paid: 1 }, after: { orders: 0, blocked: ['2026-09-28'] } })
    for (const t of ['orders', 'order_items', 'payment_references', 'payment_exceptions', 'webhook_events', 'checkout_attempts', 'admin_actions', 'admin_sign_ins', 'job_runs']) {
      expect((await db.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0], t).toEqual({ n: 0 })
    }
    expect((await db.query('SELECT sum(committed)::int AS c, sum(overflow)::int AS o FROM date_inventory')).rows[0]).toEqual({ c: 0, o: 0 })
    expect((await db.query("SELECT count(*)::int AS n FROM products")).rows[0]).toEqual({ n: 3 })
    expect((await db.query("SELECT blocked_reason FROM pickup_dates WHERE date = '2026-09-28'")).rows[0]).toEqual({ blocked_reason: 'away' })
  })

  it('exports every line of every order in the range as CSV a spreadsheet can open, with awkward names quoted', async () => {
    const a = await paid({ qty: { sourdough: 2, banana: 1 }, name: 'O\'Brien, "Ann"', phone: '6125550101' })
    await paid({ date: '2026-09-24', qty: { banana: 1 }, name: 'Bob', phone: '6125550102' })
    await buy({ date: '2026-10-05', qty: { sourdough: 1 } })
    const csv = await exportOrdersCsv(db, '2026-09-01', '2026-09-30')
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('pickup_date,order,name,phone,product,quantity,unit_price,order_total,status,provider,paid_at,fulfillment,picked_up_at,refunded,refund_pending,note,created_at')
    expect(lines).toHaveLength(4) // header + two lines for a + one for Bob; October is out of range
    expect(lines[1]).toContain(`${WED},${a.slice(0, 6).toUpperCase()},"O'Brien, ""Ann""",6125550101,banana,1,3.00,13.00,paid,stripe,`)
    expect(lines[2]).toContain(',sourdough,2,5.00,13.00,paid,stripe,')
    expect(lines[3]).toMatch(/^2026-09-24,[A-F0-9]{6},Bob,6125550102,banana,1,3\.00,3\.00,paid,stripe,/)
    expect(csv).not.toContain('2026-10-05')
  })
})

describe('what the scripts would say', () => {
  const healthy = { ok: true, migrations: loadMigrations().length, livemode: true, stripeConfigured: true, adminConfigured: true, lastReconcileAt: new Date(NOW - 5 * MINUTE).toISOString(), lastWebhookAt: new Date(NOW - 60 * MINUTE).toISOString(), liveHolds: 0, testDataPresent: false }

  it('preflight passes only a live, migrated, clean, attended site', () => {
    expect(preflightChecks(healthy, 200, loadMigrations().length, NOW).every((c) => c.ok)).toBe(true)
    const fails = (over: Record<string, unknown>) => preflightChecks({ ...healthy, ...over }, 200, loadMigrations().length, NOW).filter((c) => !c.ok).map((c) => c.name)
    expect(fails({ livemode: false })).toEqual(['Stripe in LIVE mode'])
    expect(fails({ testDataPresent: true })).toEqual(['no test data in the database'])
    expect(fails({ migrations: 4 })).toEqual(['database migrated to this code'])
    expect(fails({ lastReconcileAt: new Date(NOW - 45 * MINUTE).toISOString() })).toEqual([]) // one missed half-hourly run is not a dead job
    expect(fails({ lastReconcileAt: new Date(NOW - 90 * MINUTE).toISOString() })).toEqual(['scheduled reconcile has run recently'])
    expect(fails({ liveHolds: 2 })).toEqual(['no card holds in flight'])
    expect(fails({ adminConfigured: false })).toEqual(['admin password set'])
    expect(preflightChecks(null, 503, 5, NOW)).toEqual([{ name: 'health endpoint', ok: false, detail: 'HTTP 503' }])
  })

  it('smoke reads the deployed answers, and flags a job that never ran or headers that are missing', () => {
    const good = {
      health: { status: 200, body: { ...healthy, livemode: false } },
      availability: { status: 200, body: { products: [{}, {}], days: new Array(12).fill({}) }, cacheControl: 'no-store' },
      orderUnknown: 404,
      orderMalformed: 400,
      adminNoToken: 401,
      adminSessionWrong: 401,
      reconcile: { status: 200, text: '{"reconciled":0,"states":{}}' },
      webhookUnsigned: 400,
      home: { status: 200, headers: { 'content-security-policy': "default-src 'self'", 'strict-transport-security': 'max-age=31536000', 'x-frame-options': 'DENY', 'x-content-type-options': 'nosniff' } },
      thanksCacheControl: 'no-store',
      robots: { status: 200, text: 'User-agent: *\nDisallow: /\n' },
      adminWithPassword: { status: 200, days: 30 },
    }
    const checks = smokeChecks(good, NOW)
    expect(checks.every((c) => c.ok)).toBe(true)
    expect(checks.find((c) => c.name === 'Stripe mode')?.detail).toBe('TEST (practice payments only)')
    const bad = smokeChecks({ ...good, health: { status: 200, body: { ...healthy, lastReconcileAt: null } }, home: { status: 200, headers: { ...good.home.headers, 'content-security-policy': null } }, reconcile: { status: 200, text: '{"results":{"3f2d9c4e-8b1a-4c6d-9e7f-0a1b2c3d4e5f":"open"}}' } }, NOW)
    expect(bad.filter((c) => !c.ok).map((c) => c.name)).toEqual(['scheduled reconcile is running', 'reconcile endpoint reveals no order ids', 'home page serves over HTTPS with security headers'])
  })
})
