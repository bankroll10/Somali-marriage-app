import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PAYMENT_HOLD_HOURS, ZELLE_HANDLE, ZELLE_NAME } from '../shared/config.ts'
import { resetStores } from './memstore.ts'
import { breadStore, readDay, readOrder } from '../netlify/lib/store.ts'
import { remaining } from '../netlify/lib/inventory.ts'
import availability from '../netlify/functions/availability.ts'
import checkout from '../netlify/functions/checkout.ts'
import order from '../netlify/functions/order.ts'
import admin from '../netlify/functions/admin.ts'

// Friday Sep 18 2026, noon in Chicago (UTC−5). Monday the 21st is orderable
// until Saturday 5 PM; Wednesday and Thursday comfortably so.
const NOW = Date.UTC(2026, 8, 18, 17)
const MON = '2026-09-21'
const WED = '2026-09-23'

const ADMIN = 'let-me-in'

beforeEach(() => {
  resetStores()
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
  process.env.ADMIN_PASSWORD = ADMIN
})
afterEach(() => {
  vi.useRealTimers()
})

const post = (fn: (r: Request) => Promise<Response>, path: string, body: unknown, headers: Record<string, string> = {}) =>
  fn(new Request(`https://bread.example${path}`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers }))
const get = (fn: (r: Request) => Promise<Response>, path: string, headers: Record<string, string> = {}) =>
  fn(new Request(`https://bread.example${path}`, { headers }))
type Buy = { date: string; qty: Partial<Record<'sourdough' | 'banana', number>>; name: string; phone: string }
const good: Buy = { date: WED, qty: { sourdough: 2, banana: 1 }, name: '  Amina   Ali ', phone: '(612) 555-0199' }
const buy = (over: Partial<Buy> = {}) => post(checkout, '/api/checkout', { ...good, ...over })
const asAdmin = { authorization: `Bearer ${ADMIN}` }
const markPaid = (orderId: string, force = false) => post(admin, '/api/admin', { action: 'markPaid', orderId, force }, asAdmin)

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
  it('reserves the bread and hands back Zelle instructions, no redirect', async () => {
    const res = await buy()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      orderId: expect.any(String),
      shortId: body.orderId.slice(0, 6).toUpperCase(),
      date: WED,
      qty: { sourdough: 2, banana: 1 },
      amountCents: 1300,
      holdExpiresAt: new Date(NOW + PAYMENT_HOLD_HOURS * 3_600_000).toISOString(),
      zelle: { name: ZELLE_NAME, handle: ZELLE_HANDLE },
    })

    const day = (await readDay(breadStore(), WED)).value
    expect(day.holds).toHaveLength(1)
    expect(remaining(day, NOW)).toEqual({ sourdough: 1, banana: 3 })
    expect(await readOrder(breadStore(), body.orderId)).toMatchObject({
      status: 'pending',
      name: 'Amina Ali',
      phone: '6125550199',
      amountCents: 1300,
      holdExpiresAt: body.holdExpiresAt,
    })
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

  it('shows an order the moment it is reserved, before any Zelle has landed', async () => {
    const { orderId } = await (await buy()).json()
    const body = await (await get(admin, '/api/admin', asAdmin)).json()
    const wed = body.days.find((d: { date: string }) => d.date === WED)
    expect(wed.orders).toHaveLength(1)
    expect(wed.orders[0]).toMatchObject({ id: orderId, status: 'pending', name: 'Amina Ali', phone: '6125550199' })
    expect(wed.toBake).toEqual({ sourdough: 0, banana: 0 }) // not baked until confirmed paid
  })

  it('marks an order paid, updates what to bake, and is idempotent', async () => {
    const { orderId } = await (await buy()).json()
    const res = await markPaid(orderId)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: 'paid', paidAt: new Date(NOW).toISOString() })
    let day = (await readDay(breadStore(), WED)).value
    expect(day.sold).toEqual({ sourdough: 2, banana: 1 })
    expect(day.holds).toEqual([])

    // Marking paid again changes nothing.
    expect((await markPaid(orderId)).status).toBe(200)
    day = (await readDay(breadStore(), WED)).value
    expect(day.sold).toEqual({ sourdough: 2, banana: 1 })
  })

  it('404s marking an unknown order paid', async () => {
    expect((await markPaid('no-such-order')).status).toBe(404)
  })

  it('confirms a late Zelle after the hold lapsed, as long as it still fits', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 1 } })).json()
    vi.setSystemTime(NOW + (PAYMENT_HOLD_HOURS + 1) * 3_600_000) // well past the hold
    expect((await markPaid(orderId)).status).toBe(200)
    expect((await readDay(breadStore(), WED)).value.sold).toEqual({ sourdough: 1, banana: 0 })
  })

  it('refuses a late Zelle that would oversell, unless forced', async () => {
    const { orderId: first } = await (await buy({ qty: { sourdough: 3 } })).json()
    vi.setSystemTime(NOW + (PAYMENT_HOLD_HOURS + 1) * 3_600_000) // first hold lapses, unpaid
    const { orderId: second } = await (await buy({ qty: { sourdough: 3 } })).json() // someone else takes all 3

    const refused = await markPaid(first)
    expect(refused.status).toBe(409)
    expect(await refused.json()).toEqual({ error: 'would_exceed_capacity', remaining: { sourdough: 0, banana: 4 } })

    const forced = await markPaid(first, true)
    expect(forced.status).toBe(200)
    expect((await readDay(breadStore(), WED)).value.sold).toEqual({ sourdough: 3, banana: 0 })
    expect((await markPaid(second)).status).toBe(200) // the other order still confirms normally
    // Both are now honored — deliberately over her stated capacity of 3, which
    // is the trade-off of forcing a late confirmation through.
    expect((await readDay(breadStore(), WED)).value.sold).toEqual({ sourdough: 6, banana: 0 })
  })

  it('cancels a pending order and frees its bread at once', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 3 } })).json()
    expect(await (await buy({ qty: { sourdough: 1 } })).json()).toEqual({ error: 'sold_out' })
    const res = await post(admin, '/api/admin', { action: 'expireOrder', orderId }, asAdmin)
    expect(await res.json()).toMatchObject({ status: 'expired' })
    expect((await buy({ qty: { sourdough: 1 } })).status).toBe(200)
    // Cancelling again, or an order that is already paid, is a harmless no-op.
    expect((await post(admin, '/api/admin', { action: 'expireOrder', orderId }, asAdmin)).status).toBe(200)
    expect((await post(admin, '/api/admin', { action: 'expireOrder', orderId: 'nope' }, asAdmin)).status).toBe(404)
  })

  it('shows orders by pickup date with what to bake, mixing pending and paid', async () => {
    const { orderId: a } = await (await buy()).json()
    await markPaid(a)
    const { orderId: b } = await (await buy({ name: 'Bob', phone: '6125550100', qty: { banana: 2 } })).json()
    await markPaid(b)
    await buy({ date: MON, qty: { sourdough: 1 } }) // still pending — awaiting Zelle

    const body = await (await get(admin, '/api/admin', asAdmin)).json()
    const wed = body.days.find((d: { date: string }) => d.date === WED)
    expect(wed.toBake).toEqual({ sourdough: 2, banana: 3 })
    expect(wed.remaining).toEqual({ sourdough: 1, banana: 1 })
    expect(wed.orders.map((o: { name: string; status: string }) => [o.name, o.status])).toEqual([
      ['Amina Ali', 'paid'],
      ['Bob', 'paid'],
    ])
    const mon = body.days.find((d: { date: string }) => d.date === MON)
    expect(mon.toBake).toEqual({ sourdough: 0, banana: 0 })
    expect(mon.remaining).toEqual({ sourdough: 2, banana: 4 })
    expect(mon.orders.map((o: { status: string }) => o.status)).toEqual(['pending'])

    const picked = await post(admin, '/api/admin', { action: 'pickedUp', orderId: a, pickedUp: true }, asAdmin)
    expect((await picked.json()).pickedUpAt).toBe(new Date(NOW).toISOString())
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

describe('confirmation page', () => {
  it('shows a pending order, then a paid one once she confirms it', async () => {
    const { orderId } = await (await buy()).json()
    const pending = await get(order, `/api/order?order=${orderId}`)
    expect(pending.status).toBe(200)
    expect(await pending.json()).toMatchObject({ status: 'pending', zelle: { name: ZELLE_NAME, handle: ZELLE_HANDLE } })

    await markPaid(orderId)
    const res = await get(order, `/api/order?order=${orderId}`)
    const body = await res.json()
    expect(body).toEqual({
      id: orderId,
      shortId: orderId.slice(0, 6).toUpperCase(),
      date: WED,
      name: 'Amina Ali',
      qty: { sourdough: 2, banana: 1 },
      amountCents: 1300,
      status: 'paid',
      holdExpiresAt: body.holdExpiresAt,
      zelle: { name: ZELLE_NAME, handle: ZELLE_HANDLE },
    })
    expect(JSON.stringify(body)).not.toContain('6125550199')
  })

  it('self-heals a stale hold to expired, and frees the bread, without anyone confirming it', async () => {
    const { orderId } = await (await buy({ qty: { sourdough: 3 } })).json()
    vi.setSystemTime(NOW + (PAYMENT_HOLD_HOURS + 1) * 3_600_000)
    const res = await get(order, `/api/order?order=${orderId}`)
    expect(await res.json()).toMatchObject({ status: 'expired' })
    expect((await buy({ qty: { sourdough: 3 } })).status).toBe(200)
  })

  it('404s an unknown order and 400s a malformed one', async () => {
    expect((await get(order, '/api/order?order=deadbeef-dead-beef-dead-beefdeadbeef')).status).toBe(404)
    expect((await get(order, '/api/order?order=../etc')).status).toBe(400)
  })
})
