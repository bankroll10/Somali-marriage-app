import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CARD_CHECKOUT_LEAD_MINUTES, SESSION_MINUTES, STRIPE_HOLD_MARGIN_MINUTES } from '../shared/config.ts'
import { fixedClock, type FixedClock } from '../shared/clock.ts'
import { cutoffFor } from '../shared/schedule.ts'
import { createApp } from '../netlify/lib/app.ts'
import type { Db } from '../netlify/lib/db/client.ts'
import { finalizePayment, reconcileOrder } from '../netlify/lib/stripe/payments.ts'
import { assertLedger, freshDb } from './db.ts'
import { fakeStripe } from './fakeStripe.ts'

/**
 * The Stripe side of the lifecycle, against the fake gateway. These prove
 * the app's handling — retries, the deadline, timer-immunity, verification,
 * idempotent finalisation, reconciliation, the expire race. They are not
 * Stripe tests; those run on a machine that can reach Stripe (README).
 */
const NOW = Date.UTC(2026, 8, 18, 17) // Fri Sep 18, noon Chicago
const MON = '2026-09-21'
const WED = '2026-09-23'
const THU = '2026-09-24'
const MINUTE = 60_000
const ADMIN = 'let-me-in'

let db: Db
let clock: FixedClock
let stripe: ReturnType<typeof fakeStripe>
let app: ReturnType<typeof createApp>

beforeEach(async () => {
  ;({ db } = await freshDb())
  clock = fixedClock(NOW)
  stripe = fakeStripe()
  app = createApp({ db, clock, gateway: stripe.gateway })
  process.env.ADMIN_PASSWORD = ADMIN
})
afterEach(() => assertLedger(db))

const post = (fn: (r: Request) => Promise<Response>, path: string, body: unknown, headers: Record<string, string> = {}) =>
  fn(new Request(`https://bread.example${path}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers }))
const get = (fn: (r: Request) => Promise<Response>, path: string, headers: Record<string, string> = {}) =>
  fn(new Request(`https://bread.example${path}`, { headers }))
const asAdmin = { authorization: `Bearer ${ADMIN}` }
const buy = (over: Record<string, unknown> = {}) =>
  post(app.checkout, '/api/checkout', { date: WED, qty: { sourdough: 2, banana: 1 }, name: 'Amina Ali', phone: '6125550199', checkoutKey: crypto.randomUUID(), ...over })
const hook = (type: string, sessionId: string, snapshot?: Parameters<typeof stripe.event>[2], id?: string) => {
  const { body, headers } = stripe.event(type, sessionId, snapshot, id)
  return post(app.webhook, '/api/stripe-webhook', body, headers)
}
const page = async (id: string) => (await get(app.order, `/api/order?order=${id}`)).json()
const committed = async (product = 'sourdough') => ((await db.query(`SELECT committed FROM date_inventory WHERE date = $1::date AND product_id = $2`, [WED, product])).rows[0] as { committed: number } | undefined)?.committed ?? 0
const dbStatus = async (id: string) => (await db.query<{ status: string }>('SELECT status FROM orders WHERE id = $1::uuid', [id])).rows[0]?.status
const refs = async (id: string) => (await db.query<{ status: string; external_id: string | null; payment_intent_id: string | null }>('SELECT status, external_id, payment_intent_id FROM payment_references WHERE order_id = $1::uuid ORDER BY id', [id])).rows
const exceptions = async (id: string) => (await db.query<{ kind: string }>('SELECT kind FROM payment_exceptions WHERE order_id = $1::uuid AND resolved_at IS NULL ORDER BY id', [id])).rows.map((r) => r.kind)
const dayOf = async (date: string) => (await (await get(app.admin, `/api/admin?from=${date}&to=${date}`, asAdmin)).json()).days[0]

describe('starting a card checkout', () => {
  it('builds the session from the database, with the same parameters every time', async () => {
    const key = crypto.randomUUID()
    const first = await (await buy({ checkoutKey: key })).json()
    const p = stripe.created[0]
    expect(p.key).toBe(first.orderId)
    expect(p.params).toMatchObject({
      orderId: first.orderId,
      expiresAt: Math.floor((NOW + SESSION_MINUTES * MINUTE) / 1000),
      successUrl: `https://bread.example/thanks?order=${first.orderId}`,
      cancelUrl: `https://bread.example/?canceled=${first.orderId}`,
    })
    // The hold is only a hint of when to ask Stripe; it sits past the session's own expiry.
    expect(first.holdExpiresAt).toBe(new Date(NOW + (SESSION_MINUTES + STRIPE_HOLD_MARGIN_MINUTES) * MINUTE).toISOString())
    // A retry a minute later, prices changed meanwhile: identical create, same session, no idempotency error.
    clock.advance(MINUTE)
    await db.query("UPDATE products SET price_cents = 900 WHERE id = 'sourdough'")
    const again = await (await buy({ checkoutKey: key })).json()
    expect(again.url).toBe(first.url)
    expect(stripe.created).toHaveLength(1)
  })

  it('leaves the reservation standing when Stripe cannot be reached, and the retry re-issues the same create', async () => {
    stripe.state.createFails = true
    const key = crypto.randomUUID()
    const res = await buy({ checkoutKey: key })
    expect(res.status).toBe(503)
    const { error, orderId } = await res.json()
    expect(error).toBe('payment_unavailable')
    expect(await dbStatus(orderId)).toBe('reserved')
    expect(await committed()).toBe(2)
    expect((await refs(orderId))[0]).toMatchObject({ status: 'pending', external_id: null })

    stripe.state.createFails = false
    const retry = await (await buy({ checkoutKey: key })).json()
    expect(retry).toMatchObject({ orderId, replayed: true, url: 'https://checkout.stripe.com/c/pay/cs_test_1' })
    expect((await refs(orderId))[0]).toMatchObject({ external_id: 'cs_test_1' })
    expect(stripe.created[0].key).toBe(orderId)
  })

  it('recovers a session whose id never reached the database, by re-creating under the same key', async () => {
    stripe.state.createFails = true
    const { orderId } = await (await buy()).json()
    stripe.state.createFails = false
    // The customer's page polls: reconciliation issues the create again and learns the id.
    expect(await page(orderId)).toMatchObject({ status: 'reserved', checking: true })
    expect((await refs(orderId))[0]).toMatchObject({ external_id: 'cs_test_1' })
  })

  it('closes card checkout 32 minutes before the deadline and never past it', async () => {
    const cutoff = cutoffFor(MON)
    clock.set(cutoff - (CARD_CHECKOUT_LEAD_MINUTES + 1) * MINUTE)
    const ok = await buy({ date: MON })
    expect(ok.status).toBe(200)
    // Started 33 minutes out: the session ends exactly at the deadline, not after.
    expect(stripe.created[0].params.expiresAt).toBe(Math.floor(cutoff / 1000))
    clock.set(cutoff - CARD_CHECKOUT_LEAD_MINUTES * MINUTE + 1)
    const late = await buy({ date: MON })
    expect(late.status).toBe(409)
    expect(await late.json()).toEqual({ error: 'closing_soon', cutoffAt: new Date(cutoff).toISOString() })
    expect((await (await get(app.availability, '/api/availability')).json()).days[0]).toMatchObject({ date: MON, open: false })
    expect(await committed()).toBe(0)
  })

  it('answers plainly when Stripe is not configured at all', async () => {
    const bare = createApp({ db, clock, gateway: null })
    const res = await post(bare.checkout, '/api/checkout', { date: WED, qty: { sourdough: 1 }, name: 'A', phone: '6125550199', checkoutKey: crypto.randomUUID() })
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'payments_not_configured' })
    expect(await committed()).toBe(0)
  })
})

describe('a card hold is never released by time', () => {
  it('stays held past every timer while the session is open — sweep, availability and the order page all agree', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 3 } })).json()
    clock.advance(24 * 60 * MINUTE)
    stripe.state.apiDown = true // nobody can ask Stripe, so nothing may change
    expect((await (await get(app.availability, '/api/availability')).json()).days[1].remaining.sourdough).toBe(0)
    expect(await page(orderId)).toMatchObject({ status: 'reserved', checking: true })
    // Another buyer's reserve sweeps the date — and leaves this hold alone.
    expect(await (await buy({ qty: { sourdough: 1 } })).json()).toMatchObject({ error: 'sold_out' })
    expect(await dbStatus(orderId)).toBe('reserved')
    expect(await committed()).toBe(3)
  })

  it('is released exactly once, after Stripe reports the session expired', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 3 } })).json()
    stripe.expire('cs_test_1')
    expect((await hook('checkout.session.expired', 'cs_test_1')).status).toBe(200)
    expect(await dbStatus(orderId)).toBe('expired')
    expect(await committed()).toBe(0)
    expect((await refs(orderId))[0]).toMatchObject({ status: 'expired', external_id: 'cs_test_1' })
    // Delivered again, and again: nothing more to release.
    await hook('checkout.session.expired', 'cs_test_1')
    await reconcileOrder({ db, clock, gateway: stripe.gateway }, orderId)
    expect(await committed()).toBe(0)
    expect((await buy({ qty: { sourdough: 3 } })).status).toBe(200)
  })

  it('a customer backing out ends the session at Stripe first, then releases on Stripe\'s word', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 3 } })).json()
    const res = await post(app.cancelCheckout, `/api/cancel?order=${orderId}`, '')
    expect(await res.json()).toEqual({ state: 'released' })
    expect(stripe.sessions.get('cs_test_1')?.status).toBe('expired')
    expect(await committed()).toBe(0)
    expect(await (await post(app.cancelCheckout, `/api/cancel?order=${orderId}`, '')).json()).toEqual({ state: 'not_reserved' })
  })

  it('backing out while the payment is landing keeps the order and marks it paid', async () => {
    const { orderId } = await (await buy()).json()
    stripe.state.payDuringExpire = true
    expect(await (await post(app.cancelCheckout, `/api/cancel?order=${orderId}`, '')).json()).toEqual({ state: 'paid' })
    expect(await dbStatus(orderId)).toBe('paid')
    expect(await committed()).toBe(2)
  })

  it('an abandoned session past its hold is expired by reconciliation and released; if Stripe refuses, the stock stays', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 3 } })).json()
    clock.advance((SESSION_MINUTES + STRIPE_HOLD_MARGIN_MINUTES) * MINUTE)
    stripe.state.expireRefuses = true
    expect(await (await get(app.admin, '/api/admin', asAdmin)).status).toBe(200) // admin load reconciles stale orders
    expect(await dbStatus(orderId)).toBe('reserved')
    expect(await exceptions(orderId)).toEqual(['expire_uncertain'])
    expect(await committed()).toBe(3)
    stripe.state.expireRefuses = false
    await post(app.reconcileStale, '/api/reconcile', '')
    expect(await dbStatus(orderId)).toBe('expired')
    expect(await committed()).toBe(0)
  })

  it('does nothing at all while Stripe is unreachable', async () => {
    const { orderId } = await (await buy()).json()
    clock.advance(60 * MINUTE)
    stripe.state.apiDown = true
    await post(app.reconcileStale, '/api/reconcile', '')
    expect(await (await post(app.cancelCheckout, `/api/cancel?order=${orderId}`, '')).json()).toEqual({ state: 'unknown' })
    expect(await dbStatus(orderId)).toBe('reserved')
    expect(await committed()).toBe(2)
  })
})

describe('a verified payment converts the hold exactly once', () => {
  it('via the webhook: signature checked on the raw body, duplicates ignored, order paid, reference closed', async () => {
    const { orderId } = await (await buy()).json()
    stripe.pay('cs_test_1')
    const forged = await post(app.webhook, '/api/stripe-webhook', stripe.event('checkout.session.completed', 'cs_test_1').body, { 'stripe-signature': 'sig:wrong' })
    expect(forged.status).toBe(400)
    expect(await dbStatus(orderId)).toBe('reserved')

    expect((await hook('checkout.session.completed', 'cs_test_1', undefined, 'evt_1')).status).toBe(200)
    expect((await hook('checkout.session.completed', 'cs_test_1', undefined, 'evt_1')).status).toBe(200)
    expect((await hook('checkout.session.completed', 'cs_test_1', undefined, 'evt_2')).status).toBe(200)
    expect(await dbStatus(orderId)).toBe('paid')
    expect(await refs(orderId)).toEqual([{ status: 'succeeded', external_id: 'cs_test_1', payment_intent_id: 'pi_cs_test_1' }])
    expect((await db.query('SELECT count(*)::int AS n FROM webhook_events')).rows[0]).toEqual({ n: 2 })
    expect(await committed()).toBe(2)
    expect((await dayOf(WED)).toBake).toEqual({ sourdough: 2, banana: 1 })
    expect(await page(orderId)).toMatchObject({ status: 'paid', checking: false, attention: false })
  })

  it('via the customer\'s page when the webhook never arrived — the page verifies with Stripe, it never asserts', async () => {
    const { orderId } = await (await buy()).json()
    expect(await page(orderId)).toMatchObject({ status: 'reserved', checking: true })
    stripe.pay('cs_test_1')
    expect(await page(orderId)).toMatchObject({ status: 'paid', checking: false })
    expect(await refs(orderId)).toEqual([{ status: 'succeeded', external_id: 'cs_test_1', payment_intent_id: 'pi_cs_test_1' }])
  })

  it('an expired event arriving after the payment changes nothing', async () => {
    const { orderId } = await (await buy()).json()
    stripe.pay('cs_test_1')
    await hook('checkout.session.completed', 'cs_test_1')
    const stale = { ...stripe.sessions.get('cs_test_1')!, status: 'expired' as const, paymentStatus: 'unpaid' as const }
    await hook('checkout.session.expired', 'cs_test_1', stale)
    expect(await dbStatus(orderId)).toBe('paid')
    expect(await committed()).toBe(2)
  })

  it('a stale "completed, unpaid" snapshot is not believed; Stripe is asked afresh', async () => {
    const { orderId } = await (await buy()).json()
    const unpaid = { ...stripe.sessions.get('cs_test_1')!, status: 'complete' as const, paymentStatus: 'unpaid' as const }
    stripe.pay('cs_test_1')
    await hook('checkout.session.completed', 'cs_test_1', unpaid)
    expect(await dbStatus(orderId)).toBe('paid') // reconciled from the live session
  })

  it('a payment for stock already released is honoured, over capacity, and flagged', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 3 } })).json()
    await post(app.cancelCheckout, `/api/cancel?order=${orderId}`, '')
    expect(await committed()).toBe(0)
    await buy({ qty: { sourdough: 3 } }) // someone else takes the day
    // Stripe nevertheless reports the first session paid (a delivery that beat our expire).
    const paid = stripe.pay('cs_test_1')
    await hook('checkout.session.completed', 'cs_test_1', paid)
    expect(await dbStatus(orderId)).toBe('paid')
    expect(await exceptions(orderId)).toEqual(['paid_after_release'])
    expect((await db.query("SELECT capacity, overflow, committed FROM date_inventory WHERE product_id = 'sourdough'")).rows[0]).toEqual({ capacity: 3, overflow: 3, committed: 6 })
    expect(await page(orderId)).toMatchObject({ status: 'paid', attention: true })
    const admin = (await dayOf(WED)).orders.find((o: { id: string }) => o.id === orderId)
    expect(admin.exceptions).toHaveLength(1)
    await post(app.admin, '/api/admin', { action: 'resolveException', orderId, exceptionId: admin.exceptions[0].id }, asAdmin)
    expect(await exceptions(orderId)).toEqual([])
  })

  it('keeps the stock and records an exception when the payment does not match what was sold', async () => {
    const cases: [Partial<Parameters<typeof stripe.pay>[1]>, string][] = [
      [{ amountTotal: 1200 }, 'amount_mismatch'],
      [{ currency: 'eur' }, 'currency_mismatch'],
      [{ metadata: { order_id: 'deadbeef-dead-4eef-8ead-beefdeadbeef' } }, 'order_mismatch'],
      [{ mode: 'subscription' }, 'mode_mismatch'],
      [{ livemode: true }, 'livemode_mismatch'],
    ]
    const dates = [MON, WED, THU, MON, WED]
    for (const [i, [over, kind]] of cases.entries()) {
      const { orderId } = await (await buy({ date: dates[i], qty: { sourdough: 1 } })).json()
      const sid = (await refs(orderId))[0].external_id!
      const session = stripe.pay(sid, over)
      // Route straight to finalize so the order id is ours even when metadata lies.
      const out = await finalizePayment({ db, clock, gateway: stripe.gateway }, { ...session, metadata: { order_id: orderId }, ...(kind === 'order_mismatch' ? { clientReferenceId: 'someone-else' } : {}) })
      expect(out, kind).toEqual({ ok: false, reason: kind })
      expect(await dbStatus(orderId), kind).toBe('reserved')
      expect(await exceptions(orderId), kind).toEqual([kind])
      expect(await page(orderId)).toMatchObject({ status: 'reserved', checking: false, attention: true })
      // The same bad payment reported again does not pile up exceptions.
      await finalizePayment({ db, clock, gateway: stripe.gateway }, { ...session, metadata: { order_id: orderId } })
      expect((await exceptions(orderId)).length, kind).toBe(1)
    }
  })

  it('a decline leaves the session open and the bread held', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 3 } })).json()
    // Stripe keeps a declined session open for another try; nothing reaches us.
    await hook('payment_intent.payment_failed', 'cs_test_1')
    expect(await dbStatus(orderId)).toBe('reserved')
    expect(await committed()).toBe(3)
    expect(await (await buy({ qty: { sourdough: 1 } })).json()).toMatchObject({ error: 'sold_out' })
  })

  it('webhook and page arriving together produce one paid order and one succeeded reference', async () => {
    const { orderId } = await (await buy()).json()
    stripe.pay('cs_test_1')
    await Promise.all([hook('checkout.session.completed', 'cs_test_1'), page(orderId), hook('checkout.session.completed', 'cs_test_1'), page(orderId)])
    expect(await dbStatus(orderId)).toBe('paid')
    expect(await refs(orderId)).toHaveLength(1)
    expect(await committed()).toBe(2)
  })
})

describe('admin and card orders', () => {
  it('cancelling a reserved card order ends its session first; if it had been paid, she is told', async () => {
    const { orderId } = await (await buy()).json()
    expect(await (await post(app.admin, '/api/admin', { action: 'cancel', orderId }, asAdmin)).json()).toMatchObject({ status: 'expired' })
    expect(stripe.sessions.get('cs_test_1')?.status).toBe('expired')
    expect(await committed()).toBe(0)

    const { orderId: other } = await (await buy()).json()
    stripe.state.payDuringExpire = true
    const res = await post(app.admin, '/api/admin', { action: 'cancel', orderId: other }, asAdmin)
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'already_paid', order: { status: 'paid' } })
  })

  it('marking a card order paid by hand closes its session and records a manual confirmation, not a Stripe one', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 1 } })).json()
    expect(await (await post(app.admin, '/api/admin', { action: 'markPaid', orderId }, asAdmin)).json()).toMatchObject({ status: 'paid' })
    expect(stripe.sessions.get('cs_test_1')?.status).toBe('expired')
    const r = await refs(orderId)
    expect(r.map((x) => x.status)).toEqual(['expired', 'succeeded'])
    expect(await committed()).toBe(1)
    // A card payment that somehow lands afterwards is a duplicate, flagged, never double-counted.
    stripe.sessions.get('cs_test_1')!.status = 'complete'
    stripe.sessions.get('cs_test_1')!.paymentStatus = 'paid'
    await hook('checkout.session.completed', 'cs_test_1')
    expect(await exceptions(orderId)).toEqual(['duplicate_payment'])
    expect(await committed()).toBe(1)
  })
})
