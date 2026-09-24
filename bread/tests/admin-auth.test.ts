import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fixedClock, type FixedClock } from '../shared/clock.ts'
import { createApp, zelleTerms } from '../netlify/lib/app.ts'
import { ATTEMPT_WINDOW_MINUTES, MAX_FAILURES_GLOBAL, MAX_FAILURES_PER_IP, SESSION_DAYS } from '../netlify/lib/auth.ts'
import type { Db } from '../netlify/lib/db/client.ts'
import { listProducts, reserve } from '../netlify/lib/inventory.ts'
import { adminHeaders, signIn, TEST_IP } from './adminSession.ts'
import { assertLedger, freshDb } from './db.ts'
import { fakeStripe } from './fakeStripe.ts'

/**
 * The admin's front door. One password, exchanged once for a signed session;
 * guessing is throttled in the database, per address and overall. Every
 * check here is against the real handlers: nothing about the token format or
 * the throttle is mocked.
 */
const NOW = Date.UTC(2026, 8, 18, 17)
const MON = '2026-09-21'
const MINUTE = 60_000
const DAY = 86_400_000
const ADMIN = 'test-admin-password'

let db: Db
let clock: FixedClock
let app: ReturnType<typeof createApp>

beforeEach(async () => {
  ;({ db } = await freshDb())
  clock = fixedClock(NOW)
  app = createApp({ db, clock, gateway: fakeStripe().gateway })
  process.env.ADMIN_PASSWORD = ADMIN
})
afterEach(() => assertLedger(db))

const get = (path: string, headers: Record<string, string> = {}) => app.admin(new Request(`https://bread.example${path}`, { headers }))
const post = (body: unknown, headers: Record<string, string> = {}) =>
  app.admin(new Request('https://bread.example/api/admin', { method: 'POST', body: JSON.stringify(body), headers }))
const code = async (res: Response) => ((await res.json()) as { error?: string }).error

async function paidOrder() {
  const products = await listProducts(db)
  const out = await reserve(db, { date: MON, qty: { sourdough: 1, banana: 0, banana_large: 0 }, name: 'Amina Ali', phone: '6125550199', checkoutKey: crypto.randomUUID() }, products, clock, zelleTerms(clock.now()))
  if (!out.ok) throw new Error('reserve refused')
  await post({ action: 'markPaid', orderId: out.order.id }, await adminHeaders(app, ADMIN))
  return out.order.id
}

describe('sessions', () => {
  it('exchanges the password for a token, and the token — not the password — opens the admin', async () => {
    const res = await signIn(app, ADMIN)
    expect(res.status).toBe(200)
    const { token, expiresAt } = (await res.json()) as { token: string; expiresAt: string }
    expect(token).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
    expect(expiresAt).toBe(new Date(NOW + SESSION_DAYS * DAY).toISOString())
    expect((await get('/api/admin', { authorization: `Bearer ${token}` })).status).toBe(200)
    expect((await get('/api/admin', { authorization: `Bearer ${ADMIN}` })).status).toBe(401)
  })

  it('refuses no token, garbage, a tampered signature, and a token for a different password', async () => {
    const { authorization } = await adminHeaders(app, ADMIN)
    const token = authorization.slice('Bearer '.length)
    const [v, payload, sig] = token.split('.')
    for (const bad of ['', 'Bearer', 'Bearer nope', `Basic ${token}`, `Bearer ${v}.${payload}.${sig.slice(0, -2)}xx`, `Bearer ${v}.${payload}x.${sig}`, `Bearer v0.${payload}.${sig}`]) {
      const res = await get('/api/admin', bad ? { authorization: bad } : {})
      expect(res.status, bad).toBe(401)
      expect(await code(res), bad).toBe('unauthorized')
    }
    process.env.ADMIN_PASSWORD = 'something-else'
    expect((await get('/api/admin', { authorization })).status).toBe(401)
  })

  it('expires after thirty days, and says so', async () => {
    const headers = await adminHeaders(app, ADMIN)
    clock.set(NOW + SESSION_DAYS * DAY - MINUTE)
    expect((await get('/api/admin', headers)).status).toBe(200)
    clock.set(NOW + SESSION_DAYS * DAY + MINUTE)
    const res = await get('/api/admin', headers)
    expect(res.status).toBe(401)
    expect(await code(res)).toBe('session_expired')
  })

  it('is locked entirely while no password is configured', async () => {
    const headers = await adminHeaders(app, ADMIN)
    delete process.env.ADMIN_PASSWORD
    expect((await get('/api/admin', headers)).status).toBe(503)
    expect((await signIn(app, ADMIN)).status).toBe(503)
  })
})

describe('unauthorized callers', () => {
  it('cannot read orders, change pickup status, block a date, or cancel a paid order', async () => {
    const orderId = await paidOrder()
    const attempts: Record<string, string>[] = [{}, { authorization: 'Bearer nope' }, { authorization: `Bearer ${ADMIN}` }]
    for (const headers of attempts) {
      const read = await get(`/api/admin?from=${MON}&to=${MON}`, headers)
      expect(read.status).toBe(401)
      expect(await read.text()).not.toMatch(/Amina|6125550199|orders/)
      expect((await post({ action: 'pickedUp', orderId, pickedUp: true }, headers)).status).toBe(401)
      expect((await post({ action: 'block', date: MON }, headers)).status).toBe(401)
      expect((await post({ action: 'cancelPaid', orderId, restock: true }, headers)).status).toBe(401)
      expect((await post({ action: 'syncRefund', orderId }, headers)).status).toBe(401)
    }
    const row = (await db.query<{ fulfillment: string; picked_up_at: string | null }>('SELECT fulfillment, picked_up_at FROM orders WHERE id = $1::uuid', [orderId])).rows[0]
    expect(row).toEqual({ fulfillment: 'owed', picked_up_at: null })
    expect((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM pickup_dates WHERE blocked_at IS NOT NULL')).rows[0].n).toBe(0)
    expect((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM admin_actions')).rows[0].n).toBe(1) // the markPaid that set the order up
  })
})

describe('the attempt limit', () => {
  it('records every attempt, and locks an address after five wrong passwords in fifteen minutes', async () => {
    for (let i = 0; i < MAX_FAILURES_PER_IP; i++) {
      const res = await signIn(app, `wrong-${i}`)
      expect(res.status).toBe(401)
      expect(await code(res)).toBe('unauthorized')
    }
    const locked = await signIn(app, ADMIN) // even the right password is not checked now
    expect(locked.status).toBe(429)
    expect(await locked.json()).toEqual({ error: 'too_many_attempts', retryAfterSeconds: ATTEMPT_WINDOW_MINUTES * 60 })
    const rows = (await db.query<{ ok: boolean; ip: string }>('SELECT ok, ip FROM admin_sign_ins ORDER BY id')).rows
    expect(rows).toHaveLength(MAX_FAILURES_PER_IP)
    expect(rows.every((r) => !r.ok && r.ip === TEST_IP)).toBe(true)
  })

  it('does not let one address lock everyone out, but does cap guessing overall', async () => {
    for (let i = 0; i < MAX_FAILURES_PER_IP; i++) await signIn(app, 'wrong', '198.51.100.1')
    expect((await signIn(app, ADMIN, '198.51.100.1')).status).toBe(429)
    expect((await signIn(app, ADMIN, '198.51.100.2')).status).toBe(200)

    // Four addresses each just under their own limit reach the global one.
    let failures = MAX_FAILURES_PER_IP
    for (let ip = 2; failures < MAX_FAILURES_GLOBAL; ip++) {
      for (let i = 0; i < MAX_FAILURES_PER_IP - 1 && failures < MAX_FAILURES_GLOBAL; i++, failures++) {
        expect((await signIn(app, 'wrong', `198.51.100.${ip}`)).status).toBe(401)
      }
    }
    const fresh = await signIn(app, ADMIN, '198.51.100.99')
    expect(fresh.status).toBe(429)
    expect(await code(fresh)).toBe('too_many_attempts')
  })

  it('lets the address try again once the window has passed', async () => {
    for (let i = 0; i < MAX_FAILURES_PER_IP; i++) await signIn(app, 'wrong')
    expect((await signIn(app, ADMIN)).status).toBe(429)
    clock.set(NOW + ATTEMPT_WINDOW_MINUTES * MINUTE - 1_000)
    expect((await signIn(app, ADMIN)).status).toBe(429)
    clock.set(NOW + ATTEMPT_WINDOW_MINUTES * MINUTE + 1_000)
    expect((await signIn(app, ADMIN)).status).toBe(200)
  })

  it('counts an unknown address as its own bucket and prunes yesterday', async () => {
    for (let i = 0; i < MAX_FAILURES_PER_IP; i++) await signIn(app, 'wrong', null)
    expect((await signIn(app, ADMIN, null)).status).toBe(429)
    expect((await signIn(app, ADMIN, TEST_IP)).status).toBe(200)
    clock.set(NOW + 2 * DAY)
    await signIn(app, ADMIN)
    expect((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM admin_sign_ins')).rows[0].n).toBe(1)
  })

  it('rejects a body without a password, and a non-string one, without counting it as a guess', async () => {
    for (const body of ['{}', '{"password": 5}', 'nope']) {
      const res = await app.adminSignIn(new Request('https://bread.example/api/admin-session', { method: 'POST', body }), TEST_IP)
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(res.status).toBeLessThan(500)
    }
    // '{}' and a number are treated as a wrong password (recorded); malformed JSON is refused before that.
    expect((await db.query<{ n: number }>('SELECT count(*)::int AS n FROM admin_sign_ins')).rows[0].n).toBe(2)
  })
})
