import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'
import { resetStores } from './memstore.ts'
import { fakeStripe } from './fakeStripe.ts'
import { useStripeClient } from '../netlify/lib/stripe.ts'
import { breadStore, readDay, readOrder } from '../netlify/lib/store.ts'
import { remaining } from '../netlify/lib/inventory.ts'
import availability from '../netlify/functions/availability.ts'
import checkout from '../netlify/functions/checkout.ts'
import webhook from '../netlify/functions/stripe-webhook.ts'
import order from '../netlify/functions/order.ts'
import admin from '../netlify/functions/admin.ts'
import cancel from '../netlify/functions/cancel.ts'

// Friday Sep 18 2026, noon in Chicago (UTC−5). Monday the 21st is orderable
// until Saturday 5 PM; Wednesday and Thursday comfortably so.
const NOW = Date.UTC(2026, 8, 18, 17)
const MON = '2026-09-21'
const WED = '2026-09-23'

let stripe: ReturnType<typeof fakeStripe>
const ADMIN = 'let-me-in'

beforeEach(() => {
  resetStores()
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
  stripe = fakeStripe()
  useStripeClient(stripe as unknown as Stripe)
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x'
  process.env.ADMIN_PASSWORD = ADMIN
  process.env.URL = 'https://bread.example'
})
afterEach(() => {
  vi.useRealTimers()
  useStripeClient(undefined)
})

const post = (fn: (r: Request) => Promise<Response>, path: string, body: unknown, headers: Record<string, string> = {}) =>
  fn(new Request(`https://bread.example${path}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers }))
const get = (fn: (r: Request) => Promise<Response>, path: string, headers: Record<string, string> = {}) =>
  fn(new Request(`https://bread.example${path}`, { headers }))
type Buy = { date: string; qty: Partial<Record<'sourdough' | 'banana', number>>; name: string; phone: string }
const good: Buy = { date: WED, qty: { sourdough: 2, banana: 1 }, name: '  Amina   Ali ', phone: '(612) 555-0199' }
const buy = (over: Partial<Buy> = {}) => post(checkout, '/api/checkout', { ...good, ...over })
const hook = (type: string, id: string) => post(webhook, '/api/stripe-webhook', stripe.event(type, id), { 'stripe-signature': 'sig:whsec_x' })
const asAdmin = { authorization: `Bearer ${ADMIN}` }

describe('availability', () => {
  it('lists four weeks of pickup days with full capacity and open/closed state', async () => {
    const res = await get(availability, '/api/availability')
    const body = await res.json()
    expect(body.days).toHaveLength(12)
    expect(body.days[0]).toMatchObject({ date: MON, open: true, blocked: false, remaining: { sourdough: 3, banana: 4 } })
    expect(body.days[0].cutoffAt).toBe(new Date(Date.UTC(2026, 8, 19, 22)).toISOString())
  })
})

describe('checkout', () => {
  it('reserves, creates a Stripe session with the order on it, and returns its url', async () => {
    const res = await buy()
    expect(res.status).toBe(200)
    const { url, orderId } = await res.json()
    expect(url).toMatch(/^https:\/\/checkout\.stripe\.com\//)
    const params = stripe.created[0]
    expect(params.mode).toBe('payment')
    expect(params.line_items).toEqual([
      expect.objectContaining({ quantity: 2, price_data: expect.objectContaining({ unit_amount: 500 }) }),
      expect.objectContaining({ quantity: 1, price_data: expect.objectContaining({ unit_amount: 300 }) }),
    ])
    expect(params.metadata).toMatchObject({ orderId, date: WED, name: 'Amina Ali', phone: '6125550199', sourdough: '2', banana: '1' })
    expect(params.success_url).toBe('https://bread.example/thanks?session_id={CHECKOUT_SESSION_ID}')
    expect(params.expires_at).toBe(Math.floor(NOW / 1000) + 31 * 60)
    expect((params.custom_text?.submit || { message: '' }).message).toContain('Wed, Sep 23, 5 PM–11 PM at Life Time')

    const day = (await readDay(breadStore(), WED)).value
    expect(day.holds).toHaveLength(1)
    expect(remaining(day, NOW)).toEqual({ sourdough: 1, banana: 3 })
    expect(await readOrder(breadStore(), orderId)).toMatchObject({ status: 'pending', amountCents: 1300, stripeSessionId: 'cs_test_1' })
  })

  it('refuses bad input before touching inventory', async () => {
    const cases: [Partial<Buy>, string][] = [
      [{ date: '2026-09-22' }, 'closed'], // a Tuesday
      [{ date: '2026-9-23' }, 'bad_date'],
      [{ qty: { sourdough: 4 } }, 'bad_quantity'],
      [{ qty: { sourdough: 1.5 } }, 'bad_quantity'],
      [{ qty: { sourdough: 0, banana: 0 } }, 'empty'],
      [{ name: '   ' }, 'bad_name'],
      [{ phone: '555-0199' }, 'bad_phone'],
    ]
    for (const [over, code] of cases) {
      const res = await buy(over)
      expect(await res.json(), JSON.stringify(over)).toEqual({ error: code })
      expect(res.status).toBe(400)
    }
    expect(stripe.created).toHaveLength(0)
    expect((await readDay(breadStore(), WED)).value.holds).toHaveLength(0)
  })

  it('closes 48 hours before the shift', async () => {
    vi.setSystemTime(Date.UTC(2026, 8, 19, 21, 59))
    expect((await buy({ date: MON })).status).toBe(200)
    vi.setSystemTime(Date.UTC(2026, 8, 19, 22, 0))
    expect(await (await buy({ date: MON })).json()).toEqual({ error: 'closed' })
  })

  it('says sold out once the date is spoken for, and blocked when she is away', async () => {
    expect((await buy({ qty: { sourdough: 3 } })).status).toBe(200)
    const res = await buy({ qty: { sourdough: 1 } })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: 'sold_out' })
    expect((await buy({ qty: { banana: 4 } })).status).toBe(200)

    await post(admin, '/api/admin', { action: 'block', date: MON }, asAdmin)
    const blocked = await buy({ date: MON })
    expect(blocked.status).toBe(409)
    expect(await blocked.json()).toEqual({ error: 'blocked' })
  })

  it('gives the reservation back when Stripe is down', async () => {
    useStripeClient(fakeStripe({ failCreate: true }) as unknown as Stripe)
    const res = await buy()
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'payment_unavailable' })
    expect((await readDay(breadStore(), WED)).value.holds).toHaveLength(0)
  })

  it('refuses to sell when no Stripe key is configured', async () => {
    useStripeClient(undefined)
    delete process.env.STRIPE_SECRET_KEY
    const res = await buy()
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'payments_not_configured' })
  })
})

describe('webhook', () => {
  it('rejects a bad signature and an unconfigured secret', async () => {
    const { orderId } = await (await buy()).json()
    const res = await post(webhook, '/api/stripe-webhook', stripe.event('checkout.session.completed', 'cs_test_1'), { 'stripe-signature': 'sig:wrong' })
    expect(res.status).toBe(400)
    expect(await readOrder(breadStore(), orderId)).toMatchObject({ status: 'pending' })
    delete process.env.STRIPE_WEBHOOK_SECRET
    expect((await hook('checkout.session.completed', 'cs_test_1')).status).toBe(503)
  })

  it('turns a paid session into a sale, once, however many times Stripe says so', async () => {
    const { orderId } = await (await buy()).json()
    stripe.pay('cs_test_1')
    expect((await hook('checkout.session.completed', 'cs_test_1')).status).toBe(200)
    expect((await hook('checkout.session.completed', 'cs_test_1')).status).toBe(200)
    const day = (await readDay(breadStore(), WED)).value
    expect(day.sold).toEqual({ sourdough: 2, banana: 1 })
    expect(day.holds).toEqual([])
    expect(day.orderIds).toEqual([orderId])
    expect(await readOrder(breadStore(), orderId)).toMatchObject({ status: 'paid', email: 'customer@example.com', paidAt: new Date(NOW).toISOString() })
    // A late "expired" for a paid order changes nothing.
    await hook('checkout.session.expired', 'cs_test_1')
    expect(await readOrder(breadStore(), orderId)).toMatchObject({ status: 'paid' })
    expect((await readDay(breadStore(), WED)).value.sold.sourdough).toBe(2)
  })

  it('ignores a completed event that is not yet paid', async () => {
    await buy()
    await hook('checkout.session.completed', 'cs_test_1')
    expect((await readDay(breadStore(), WED)).value.sold).toEqual({ sourdough: 0, banana: 0 })
  })

  it('frees the bread when a session expires', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 3 } })).json()
    expect(await (await buy({ qty: { sourdough: 1 } })).json()).toEqual({ error: 'sold_out' })
    expect((await hook('checkout.session.expired', 'cs_test_1')).status).toBe(200)
    expect(await readOrder(breadStore(), orderId)).toMatchObject({ status: 'expired' })
    expect((await buy({ qty: { sourdough: 1 } })).status).toBe(200)
  })

  it('lets an abandoned checkout lapse on its own even if no event ever arrives', async () => {
    await buy({ qty: { sourdough: 3 } })
    vi.setSystemTime(NOW + 33 * 60_000)
    expect((await buy({ qty: { sourdough: 3 } })).status).toBe(200)
  })
})

describe('backing out', () => {
  it('expires the Stripe session and frees the bread at once', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 3 } })).json()
    const res = await post(cancel, '/api/cancel?session_id=cs_test_1', '')
    expect(await res.json()).toEqual({ status: 'expired' })
    expect(stripe.sessions.get('cs_test_1')?.status).toBe('expired')
    expect(await readOrder(breadStore(), orderId)).toMatchObject({ status: 'expired' })
    expect((await buy({ qty: { sourdough: 3 } })).status).toBe(200)
    // Again is harmless.
    expect(await (await post(cancel, '/api/cancel?session_id=cs_test_1', '')).json()).toEqual({ status: 'expired' })
  })

  it('never cancels an order that was paid', async () => {
    const { orderId } = await (await buy()).json()
    stripe.pay('cs_test_1')
    expect(await (await post(cancel, '/api/cancel?session_id=cs_test_1', '')).json()).toEqual({ status: 'paid' })
    await hook('checkout.session.completed', 'cs_test_1')
    expect(await (await post(cancel, '/api/cancel?session_id=cs_test_1', '')).json()).toEqual({ status: 'paid' })
    expect(await readOrder(breadStore(), orderId)).toMatchObject({ status: 'paid' })
    expect((await post(cancel, '/api/cancel?session_id=cs_test_9', '')).status).toBe(404)
  })
})

describe('confirmation page', () => {
  it('shows the order, settling it itself if the webhook is late', async () => {
    const { orderId } = await (await buy()).json()
    expect((await get(order, '/api/order?session_id=cs_test_1')).status).toBe(200)
    expect(await (await get(order, '/api/order?session_id=cs_test_1')).json()).toMatchObject({ status: 'pending' })
    stripe.pay('cs_test_1')
    const res = await get(order, '/api/order?session_id=cs_test_1')
    const body = await res.json()
    expect(body).toEqual({
      id: orderId,
      shortId: orderId.slice(0, 6).toUpperCase(),
      date: WED,
      name: 'Amina Ali',
      qty: { sourdough: 2, banana: 1 },
      amountCents: 1300,
      status: 'paid',
    })
    expect(JSON.stringify(body)).not.toContain('6125550199')
    expect((await readDay(breadStore(), WED)).value.sold).toEqual({ sourdough: 2, banana: 1 })
  })

  it('404s an unknown session and 400s a malformed one', async () => {
    expect((await get(order, '/api/order?session_id=cs_test_999')).status).toBe(404)
    expect((await get(order, '/api/order?session_id=../etc')).status).toBe(400)
  })
})

describe('admin', () => {
  it('is closed without a password configured, and to the wrong password', async () => {
    delete process.env.ADMIN_PASSWORD
    expect((await get(admin, '/api/admin', asAdmin)).status).toBe(503)
    process.env.ADMIN_PASSWORD = ADMIN
    expect((await get(admin, '/api/admin')).status).toBe(401)
    expect((await get(admin, '/api/admin', { authorization: 'Bearer nope' })).status).toBe(401)
    expect((await get(admin, '/api/admin', { authorization: `Basic ${ADMIN}` })).status).toBe(401)
    expect((await get(admin, '/api/admin', asAdmin)).status).toBe(200)
  })

  it('shows orders by pickup date with what to bake, and tracks pickup', async () => {
    await buy()
    stripe.pay('cs_test_1')
    await hook('checkout.session.completed', 'cs_test_1')
    await buy({ name: 'Bob', phone: '6125550100', qty: { banana: 2 } })
    stripe.pay('cs_test_2')
    await hook('checkout.session.completed', 'cs_test_2')
    await buy({ date: MON, qty: { sourdough: 1 } }) // pending: in checkout, not to bake

    const body = await (await get(admin, '/api/admin', asAdmin)).json()
    const wed = body.days.find((d: { date: string }) => d.date === WED)
    expect(wed.toBake).toEqual({ sourdough: 2, banana: 3 })
    expect(wed.remaining).toEqual({ sourdough: 1, banana: 1 })
    expect(wed.orders.map((o: { name: string }) => o.name)).toEqual(['Amina Ali', 'Bob'])
    expect(wed.orders[0]).toMatchObject({ phone: '6125550199', qty: { sourdough: 2, banana: 1 }, amountCents: 1300, status: 'paid' })
    const mon = body.days.find((d: { date: string }) => d.date === MON)
    expect(mon.toBake).toEqual({ sourdough: 0, banana: 0 })
    expect(mon.remaining).toEqual({ sourdough: 2, banana: 4 })
    expect(mon.orders).toEqual([])

    const picked = await post(admin, '/api/admin', { action: 'pickedUp', orderId: wed.orders[0].id, pickedUp: true }, asAdmin)
    expect((await picked.json()).pickedUpAt).toBe(new Date(NOW).toISOString())
    const again = await (await get(admin, `/api/admin?from=${WED}&to=${WED}`, asAdmin)).json()
    expect(again.days).toHaveLength(1)
    expect(again.days[0].orders[0].pickedUpAt).toBeTruthy()
  })

  it('blocks and unblocks a date', async () => {
    const res = await post(admin, '/api/admin', { action: 'block', date: MON }, asAdmin)
    expect(await res.json()).toMatchObject({ date: MON, blocked: true })
    const avail = await (await get(availability, '/api/availability')).json()
    expect(avail.days[0]).toMatchObject({ date: MON, blocked: true })
    await post(admin, '/api/admin', { action: 'unblock', date: MON }, asAdmin)
    expect((await buy({ date: MON })).status).toBe(200)
    expect((await post(admin, '/api/admin', { action: 'block', date: 'soon' }, asAdmin)).status).toBe(400)
    expect((await post(admin, '/api/admin', { action: 'explode' }, asAdmin)).status).toBe(400)
  })
})
