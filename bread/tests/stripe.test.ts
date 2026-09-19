import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CARD_CHECKOUT_LEAD_MINUTES, RECONCILE_MIN_INTERVAL_MS, SESSION_MINUTES, STRIPE_HOLD_MARGIN_MINUTES } from '../shared/config.ts'
import { fixedClock, type FixedClock } from '../shared/clock.ts'
import { cutoffFor } from '../shared/schedule.ts'
import { createApp } from '../netlify/lib/app.ts'
import type { Db } from '../netlify/lib/db/client.ts'
import { finalizePayment, reconcileOrder } from '../netlify/lib/stripe/payments.ts'
import { assertLedger, freshDb } from './db.ts'
import { adminHeaders } from './adminSession.ts'
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
  stripe = fakeStripe(false, clock)
  app = createApp({ db, clock, gateway: stripe.gateway })
  process.env.ADMIN_PASSWORD = ADMIN
  asAdmin = await adminHeaders(app, ADMIN)
})
afterEach(() => assertLedger(db))

const post = (fn: (r: Request) => Promise<Response>, path: string, body: unknown, headers: Record<string, string> = {}) =>
  fn(new Request(`https://bread.example${path}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers }))
const get = (fn: (r: Request) => Promise<Response>, path: string, headers: Record<string, string> = {}) =>
  fn(new Request(`https://bread.example${path}`, { headers }))
let asAdmin: Record<string, string>
const buy = (over: Record<string, unknown> = {}) =>
  post(app.checkout, '/api/checkout', { date: WED, qty: { sourdough: 2, banana: 1 }, name: 'Amina Ali', phone: '6125550199', checkoutKey: crypto.randomUUID(), ...over })
/** A different customer: a live card hold is one per phone number, so competing buyers need their own. */
const someoneElse = (n: number) => ({ name: `Buyer ${n}`, phone: `61255501${String(n).padStart(2, '0')}` })
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
    const late = await buy({ date: MON, ...someoneElse(1) })
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
    expect(await (await buy({ qty: { sourdough: 1 }, ...someoneElse(1) })).json()).toMatchObject({ error: 'sold_out' })
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
    clock.advance(RECONCILE_MIN_INTERVAL_MS) // the page polls seconds apart; two polls inside a second share one answer
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
      const { orderId } = await (await buy({ date: dates[i], qty: { sourdough: 1 }, ...someoneElse(i) })).json()
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
    expect(await (await buy({ qty: { sourdough: 1 }, ...someoneElse(1) })).json()).toMatchObject({ error: 'sold_out' })
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

describe('recovering a session that never reached the database', () => {
  const refRow = async (id: string) =>
    (await db.query<{ external_id: string | null; idempotency_key: string; session_expires_ms: number; return_origin: string | null }>(
      "SELECT external_id, idempotency_key, extract(epoch FROM session_expires_at)::float8 * 1000 AS session_expires_ms, return_origin FROM payment_references WHERE order_id = $1::uuid AND provider = 'stripe' ORDER BY id DESC LIMIT 1",
      [id],
    )).rows[0]
  const holdMs = async (id: string) => Date.parse((await page(id)).holdExpiresAt)

  it('twenty minutes on, when the stored expiry is one Stripe would refuse, recovers under a fresh expiry and a fresh key — and the customer’s retry gets that same session', async () => {
    stripe.state.createFails = true
    const key = crypto.randomUUID()
    const { orderId } = await (await buy({ checkoutKey: key })).json()
    stripe.state.createFails = false
    clock.advance(20 * MINUTE)
    // The scheduler runs (no request, no origin to hand it) and recovers the session.
    await post(app.reconcileStale, '/api/reconcile', '')
    // Nothing stale yet (the hold is 55 minutes long), so the page does it.
    expect(await page(orderId)).toMatchObject({ status: 'reserved', checking: true })
    const ref = await refRow(orderId)
    expect(ref.external_id).toBe('cs_test_1')
    expect(ref.idempotency_key).toBe(`${orderId}:2`)
    expect(ref.session_expires_ms).toBe(NOW + (20 + SESSION_MINUTES) * MINUTE)
    expect(await holdMs(orderId)).toBe(NOW + (20 + SESSION_MINUTES + STRIPE_HOLD_MARGIN_MINUTES) * MINUTE)
    const created = stripe.created[0]
    expect(created.key).toBe(`${orderId}:2`)
    expect(created.params.expiresAt).toBe(Math.floor((NOW + (20 + SESSION_MINUTES) * MINUTE) / 1000))
    expect(created.params.successUrl).toBe(`https://bread.example/thanks?order=${orderId}`)
    // The customer taps Pay again with the same key: same order, same session, no second create.
    const again = await (await buy({ checkoutKey: key })).json()
    expect(again).toMatchObject({ orderId, replayed: true, url: 'https://checkout.stripe.com/c/pay/cs_test_1' })
    expect(stripe.created).toHaveLength(1)
    expect(await committed()).toBe(2)
  })

  it('a recovery attempted while the stored expiry is still good repeats the original create under the original key', async () => {
    stripe.state.createFails = true
    const { orderId } = await (await buy()).json()
    stripe.state.createFails = false
    clock.advance(5 * MINUTE)
    expect(await page(orderId)).toMatchObject({ status: 'reserved', checking: true })
    expect((await refRow(orderId)).idempotency_key).toBe(orderId)
    expect(stripe.created[0]).toMatchObject({ key: orderId, params: { expiresAt: Math.floor((NOW + SESSION_MINUTES * MINUTE) / 1000) } })
  })

  it('when the deadline is too near for any honest session, the hold is released instead — by the page, or by the retry', async () => {
    const cutoff = cutoffFor(MON)
    clock.set(cutoff - 33 * MINUTE)
    stripe.state.createFails = true
    const key = crypto.randomUUID()
    const { orderId } = await (await buy({ date: MON, checkoutKey: key })).json()
    stripe.state.createFails = false
    clock.set(cutoff - 30 * MINUTE)
    expect(await page(orderId)).toMatchObject({ status: 'expired', checking: false })
    expect(await dbStatus(orderId)).toBe('expired')
    expect(await committed('sourdough')).toBe(0)
    expect((await db.query("SELECT committed FROM date_inventory WHERE date = $1::date AND product_id = 'sourdough'", [MON])).rows[0]).toEqual({ committed: 0 })
    expect(stripe.created).toHaveLength(0)

    // Or the customer's own retry: the date is closing, and the hold is settled the same way.
    clock.set(cutoff - 33 * MINUTE)
    stripe.state.createFails = true
    const { orderId: second } = await (await buy({ date: MON, checkoutKey: crypto.randomUUID(), ...someoneElse(2) })).json()
    stripe.state.createFails = false
    clock.set(cutoff - 30 * MINUTE)
    const retry = await buy({ date: MON, checkoutKey: (await db.query<{ checkout_key: string }>('SELECT checkout_key FROM orders WHERE id = $1::uuid', [second])).rows[0].checkout_key, ...someoneElse(2) })
    expect(retry.status).toBe(409)
    expect(await retry.json()).toEqual({ error: 'closing_soon', cutoffAt: new Date(cutoff).toISOString() })
    expect(await dbStatus(second)).toBe('expired')
    expect(stripe.created).toHaveLength(0)
  })

  it('the webhook, the scheduler and her page all re-create with the customer’s own origin, not theirs — so the key still matches', async () => {
    process.env.URL = 'https://bread-pickup.netlify.app'
    try {
      stripe.state.createFails = true
      const { orderId } = await (await buy()).json()
      stripe.state.createFails = false
      expect((await refRow(orderId)).return_origin).toBe('https://bread-pickup.netlify.app')
      // A recovery from a request on another host — Netlify's internal hostname, a preview, whatever — builds the same URLs.
      delete process.env.URL
      const elsewhere = new Request('https://abc123--bread-pickup.netlify.live/api/admin', { headers: asAdmin })
      expect((await app.admin(elsewhere)).status).toBe(200)
      expect(await page(orderId)).toMatchObject({ status: 'reserved' })
      expect(stripe.created[0].params).toMatchObject({
        successUrl: `https://bread-pickup.netlify.app/thanks?order=${orderId}`,
        cancelUrl: `https://bread-pickup.netlify.app/?canceled=${orderId}`,
      })
      expect(stripe.created).toHaveLength(1)
    } finally {
      delete process.env.URL
    }
  })

  it('a create whose answer was lost, then a parameter that changed underneath it: Stripe’s idempotency refusal is answered with one fresh key', async () => {
    stripe.state.loseCreateResponse = true
    const { orderId, error } = await (await buy()).json()
    expect(error).toBe('payment_unavailable')
    stripe.state.loseCreateResponse = false
    expect(stripe.sessions.size).toBe(1) // Stripe has a session we never heard of
    await db.query("UPDATE products SET name = 'Country sourdough' WHERE id = 'sourdough'")
    expect(await page(orderId)).toMatchObject({ status: 'reserved', checking: true })
    expect(stripe.created.map((c) => c.key)).toEqual([orderId, `${orderId}:2`])
    expect((await refRow(orderId))).toMatchObject({ external_id: 'cs_test_2', idempotency_key: `${orderId}:2` })
    // The orphan at Stripe pays nobody: if it ever did, it would be refused as not this order's session.
    const orphan = stripe.pay('cs_test_1')
    const out = await finalizePayment({ db, clock, gateway: stripe.gateway }, orphan)
    expect(out).toEqual({ ok: false, reason: 'order_mismatch' })
    expect(await dbStatus(orderId)).toBe('reserved')
    expect(await committed()).toBe(2)
  })

  it('a session that cannot be re-created at all is flagged for her once its time is up, she may cancel it, and Stripe coming back clears the flag', async () => {
    stripe.state.createFails = true
    const { orderId } = await (await buy({ qty: { sourdough: 3 } })).json()
    clock.advance(20 * MINUTE)
    expect(await (await post(app.reconcileStale, '/api/reconcile', '')).json()).toEqual({ reconciled: 0, states: {} })
    expect(await exceptions(orderId)).toEqual([]) // not yet past its time: an outage is not a case for her
    clock.advance(40 * MINUTE)
    expect(await (await post(app.reconcileStale, '/api/reconcile', '')).json()).toEqual({ reconciled: 1, states: { attention: 1 } })
    expect(await exceptions(orderId)).toEqual(['session_unrecoverable'])
    expect(await committed()).toBe(3)
    expect(await page(orderId)).toMatchObject({ status: 'reserved', checking: false, attention: true })

    // Nothing at Stripe could pay this, so she is allowed to let the bread go.
    const res = await post(app.admin, '/api/admin', { action: 'cancel', orderId }, asAdmin)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'cancelled' })
    expect(await committed()).toBe(0)

    // The other branch: Stripe returns before she acts, the session is made, the flag clears itself.
    stripe.state.createFails = true
    const { orderId: other } = await (await buy({ qty: { sourdough: 1 }, ...someoneElse(1) })).json()
    clock.advance(60 * MINUTE)
    await post(app.reconcileStale, '/api/reconcile', '')
    expect(await exceptions(other)).toEqual(['session_unrecoverable'])
    stripe.state.createFails = false
    expect(await (await post(app.reconcileStale, '/api/reconcile', '')).json()).toEqual({ reconciled: 1, states: { released: 1 } }) // made, then expired for being past its time, then released
    expect(await exceptions(other)).toEqual([])
    expect((await db.query("SELECT resolved_by FROM payment_exceptions WHERE order_id = $1::uuid", [other])).rows[0]).toEqual({ resolved_by: 'system' })
  })

  it('an order with a session on record is never cancelled by hand while Stripe cannot be asked', async () => {
    const { orderId } = await (await buy()).json()
    stripe.state.apiDown = true
    const res = await post(app.admin, '/api/admin', { action: 'cancel', orderId }, asAdmin)
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'payment_uncertain', state: 'unknown' })
    expect(await committed()).toBe(2)
  })
})

describe('the webhook and the page, in either order, exactly once', () => {
  it('the page finalizes first; the webhook then finds it done — already, paid_at untouched, no exception, one reference', async () => {
    const { orderId } = await (await buy()).json()
    stripe.pay('cs_test_1')
    expect(await page(orderId)).toMatchObject({ status: 'paid' })
    const paidAt = (await db.query<{ paid_at: string }>('SELECT paid_at FROM orders WHERE id = $1::uuid', [orderId])).rows[0].paid_at
    clock.advance(3 * MINUTE)
    const late = await finalizePayment({ db, clock, gateway: stripe.gateway }, stripe.sessions.get('cs_test_1')!)
    expect(late).toMatchObject({ ok: true, already: true })
    expect((await hook('checkout.session.completed', 'cs_test_1')).status).toBe(200)
    expect((await db.query<{ paid_at: string }>('SELECT paid_at FROM orders WHERE id = $1::uuid', [orderId])).rows[0].paid_at).toEqual(paidAt)
    expect(await refs(orderId)).toHaveLength(1)
    expect(await exceptions(orderId)).toEqual([])
    expect(await committed()).toBe(2)
  })

  it('the page polls once a second at most: a burst of polls is one question to Stripe, and the next second asks again', async () => {
    const { orderId } = await (await buy()).json()
    const before = stripe.calls.retrieve
    await Promise.all([page(orderId), page(orderId), page(orderId), page(orderId)])
    await page(orderId)
    expect(stripe.calls.retrieve - before).toBe(1)
    clock.advance(RECONCILE_MIN_INTERVAL_MS)
    stripe.pay('cs_test_1')
    expect(await page(orderId)).toMatchObject({ status: 'paid' })
    expect(stripe.calls.retrieve - before).toBe(2)
    // The customer backing out, or her cancel, is never served a stale answer.
    const { orderId: other } = await (await buy({ qty: { banana: 1 }, ...someoneElse(1) })).json()
    await page(other)
    const n = stripe.calls.retrieve
    expect(await (await post(app.cancelCheckout, `/api/cancel?order=${other}`, '')).json()).toEqual({ state: 'released' })
    expect(stripe.calls.retrieve).toBeGreaterThan(n)
  })
})
