import Stripe from 'stripe'
import { describe, expect, it } from 'vitest'
import { stripeGateway } from '../netlify/lib/stripe/gateway.ts'

/**
 * The real Stripe SDK, with its HTTP client replaced by one that records the
 * request and answers with a canned session. No network, so no Stripe test
 * — what this proves is the exact shape of the create the app sends
 * (card only, one-off payment, the snapshotted amounts, our order id in
 * the metadata, no tax, the idempotency key on the header) and that
 * webhook signatures are verified with Stripe's own code, not ours.
 */
const ORDER = '3f2d9c4e-8b1a-4c6d-9e7f-0a1b2c3d4e5f'

function canned(over: Record<string, unknown> = {}) {
  return {
    id: 'cs_test_abc',
    object: 'checkout.session',
    status: 'open',
    payment_status: 'unpaid',
    mode: 'payment',
    livemode: false,
    amount_total: 1100,
    currency: 'usd',
    metadata: { order_id: ORDER },
    client_reference_id: ORDER,
    payment_intent: null,
    url: 'https://checkout.stripe.com/c/pay/cs_test_abc',
    expires_at: 1_800_000_000,
    ...over,
  }
}

function recorder(body: unknown) {
  const seen: { url: string; method: string; headers: Record<string, string>; body: string }[] = []
  const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
    const headers: Record<string, string> = {}
    new Headers(init?.headers).forEach((v, k) => (headers[k] = v))
    seen.push({ url: String(url), method: init?.method ?? 'GET', headers, body: typeof init?.body === 'string' ? init.body : '' })
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } })
  }
  return { seen, httpClient: Stripe.createFetchHttpClient(fetchFn as typeof fetch) }
}

describe('the Stripe gateway, through the real SDK', () => {
  it('creates a card-only, one-off session from our amounts with our order id, no tax, under the idempotency key', async () => {
    const { seen, httpClient } = recorder(canned())
    const gw = stripeGateway('sk_test_123', 'whsec_test', { httpClient, maxNetworkRetries: 0 })
    const session = await gw.createSession(
      {
        orderId: ORDER,
        lines: [
          { name: 'Banana bread', unitAmountCents: 300, quantity: 2 },
          { name: 'Sourdough', unitAmountCents: 500, quantity: 1 },
        ],
        expiresAt: 1_800_000_000,
        successUrl: 'https://bread-pickup.netlify.app/thanks?order=' + ORDER,
        cancelUrl: 'https://bread-pickup.netlify.app/?canceled=' + ORDER,
        description: 'Pickup Wed, Sep 23, 5–11 PM at Life Time',
      },
      ORDER,
    )
    expect(seen).toHaveLength(1)
    const req = seen[0]
    expect(req.method).toBe('POST')
    expect(req.url).toBe('https://api.stripe.com/v1/checkout/sessions')
    expect(req.headers['idempotency-key']).toBe(ORDER)
    expect(req.headers.authorization).toBe('Bearer sk_test_123')
    const form = new URLSearchParams(req.body)
    expect(form.get('mode')).toBe('payment')
    expect(form.getAll('payment_method_types[0]')).toEqual(['card'])
    expect(form.get('payment_method_types[1]')).toBeNull()
    expect(form.get('line_items[0][quantity]')).toBe('2')
    expect(form.get('line_items[0][price_data][unit_amount]')).toBe('300')
    expect(form.get('line_items[0][price_data][currency]')).toBe('usd')
    expect(form.get('line_items[0][price_data][product_data][name]')).toBe('Banana bread')
    expect(form.get('line_items[1][price_data][unit_amount]')).toBe('500')
    expect(form.get('line_items[1][quantity]')).toBe('1')
    expect(form.get('metadata[order_id]')).toBe(ORDER)
    expect(form.get('client_reference_id')).toBe(ORDER)
    expect(form.get('payment_intent_data[metadata][order_id]')).toBe(ORDER)
    expect(form.get('expires_at')).toBe('1800000000')
    expect(form.get('success_url')).toBe('https://bread-pickup.netlify.app/thanks?order=' + ORDER)
    expect(form.get('cancel_url')).toBe('https://bread-pickup.netlify.app/?canceled=' + ORDER)
    // Nothing that would add to, or complicate, the $11: no tax, no shipping, no tip, no subscription.
    for (const key of form.keys()) expect(key, key).not.toMatch(/tax|shipping|tip|subscription|discount|allow_promotion/)
    // The total is what the line items say: 2 × $3 + 1 × $5 = $11.
    let total = 0
    for (let i = 0; form.has(`line_items[${i}][quantity]`); i++) total += Number(form.get(`line_items[${i}][quantity]`)) * Number(form.get(`line_items[${i}][price_data][unit_amount]`))
    expect(total).toBe(1100)
    expect(session).toMatchObject({ id: 'cs_test_abc', status: 'open', paymentStatus: 'unpaid', amountTotal: 1100, currency: 'usd', metadata: { order_id: ORDER }, url: 'https://checkout.stripe.com/c/pay/cs_test_abc' })
  })

  it('retrieves, expires and lists refunds against the documented endpoints', async () => {
    const { seen, httpClient } = recorder(canned({ status: 'expired', url: null }))
    const gw = stripeGateway('sk_test_123', 'whsec_test', { httpClient, maxNetworkRetries: 0 })
    expect((await gw.retrieveSession('cs_test_abc')).status).toBe('expired')
    expect(seen[0]).toMatchObject({ method: 'GET', url: 'https://api.stripe.com/v1/checkout/sessions/cs_test_abc' })
    await gw.expireSession('cs_test_abc')
    expect(seen[1]).toMatchObject({ method: 'POST', url: 'https://api.stripe.com/v1/checkout/sessions/cs_test_abc/expire' })

    const refunds = recorder({ object: 'list', data: [{ id: 're_1', amount: 300, status: 'succeeded' }, { id: 're_2', amount: 200, status: 'pending' }], has_more: false })
    const gw2 = stripeGateway('sk_test_123', 'whsec_test', { httpClient: refunds.httpClient, maxNetworkRetries: 0 })
    expect(await gw2.listRefunds('pi_1')).toEqual([
      { id: 're_1', amountCents: 300, status: 'succeeded' },
      { id: 're_2', amountCents: 200, status: 'pending' },
    ])
    expect(refunds.seen[0].url).toBe('https://api.stripe.com/v1/refunds?payment_intent=pi_1&limit=100')
  })

  it('verifies webhook signatures with the SDK: a real signature passes, the wrong secret and a tampered body do not', async () => {
    const gw = stripeGateway('sk_test_123', 'whsec_real')
    const stripe = new Stripe('sk_test_123')
    const payload = JSON.stringify({
      id: 'evt_1',
      object: 'event',
      type: 'checkout.session.completed',
      livemode: false,
      data: { object: canned({ status: 'complete', payment_status: 'paid', payment_intent: 'pi_9' }) },
    })
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_real' })
    const event = await gw.constructEvent(payload, signature)
    expect(event).toMatchObject({ id: 'evt_1', type: 'checkout.session.completed', livemode: false })
    expect(event.session).toMatchObject({ id: 'cs_test_abc', status: 'complete', paymentStatus: 'paid', paymentIntentId: 'pi_9', metadata: { order_id: ORDER } })

    await expect(gw.constructEvent(payload, stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_other' }))).rejects.toThrow(/signature/i)
    await expect(gw.constructEvent(payload.replace('"amount_total":1100', '"amount_total":1'), signature)).rejects.toThrow(/signature/i)
    await expect(gw.constructEvent(payload, '')).rejects.toThrow()

    const refund = JSON.stringify({ id: 'evt_2', object: 'event', type: 'charge.refunded', livemode: false, data: { object: { id: 'ch_1', object: 'charge', payment_intent: 'pi_9' } } })
    const refunded = await gw.constructEvent(refund, stripe.webhooks.generateTestHeaderString({ payload: refund, secret: 'whsec_real' }))
    expect(refunded).toMatchObject({ type: 'charge.refunded', paymentIntentId: 'pi_9' })
    expect(refunded.session).toBeUndefined()
  })

  it('knows live mode from any live key, restricted keys included', () => {
    expect(stripeGateway('sk_test_1', 'whsec_x').livemode).toBe(false)
    expect(stripeGateway('rk_test_1', 'whsec_x').livemode).toBe(false)
    expect(stripeGateway('sk_live_1', 'whsec_x').livemode).toBe(true)
    expect(stripeGateway('rk_live_1', 'whsec_x').livemode).toBe(true)
  })
})
