import type { CreateSessionParams, GatewayEvent, GatewayRefund, GatewaySession, StripeGateway } from '../netlify/lib/stripe/gateway.ts'

/**
 * Stripe, as far as this app can tell: a table of Checkout Sessions with
 * the idempotency behaviour of the real API (same key + same params → same
 * session; same key + different params → error), and switches for the
 * failures the lifecycle must survive. Nothing here is a Stripe test; it
 * proves the app's side of the contract.
 */
export const WEBHOOK_SECRET = 'whsec_test'

export function fakeStripe(livemode = false) {
  const sessions = new Map<string, GatewaySession>()
  const refunds = new Map<string, GatewayRefund[]>()
  const byKey = new Map<string, { id: string; params: string }>()
  const created: { key: string; params: CreateSessionParams }[] = []
  let n = 0
  const state = { apiDown: false, createFails: false, expireRefuses: false, payDuringExpire: false }

  const get = (id: string) => {
    const s = sessions.get(id)
    if (!s) throw Object.assign(new Error(`No such checkout.session: ${id}`), { code: 'resource_missing' })
    return s
  }
  const pay = (id: string, over: Partial<GatewaySession> = {}) => {
    const s = get(id)
    Object.assign(s, { status: 'complete', paymentStatus: 'paid', paymentIntentId: `pi_${id}`, url: null }, over)
    return { ...s }
  }
  const expire = (id: string) => {
    const s = get(id)
    Object.assign(s, { status: 'expired', url: null })
    return { ...s }
  }

  const gateway: StripeGateway = {
    livemode,
    async createSession(params, key) {
      if (state.apiDown || state.createFails) throw new Error('stripe unreachable')
      const canonical = JSON.stringify(params)
      const seen = byKey.get(key)
      if (seen) {
        if (seen.params !== canonical) throw Object.assign(new Error('Keys for idempotent requests can only be used with the same parameters'), { type: 'idempotency_error' })
        return { ...get(seen.id) }
      }
      const id = `cs_test_${++n}`
      const session: GatewaySession = {
        id,
        status: 'open',
        paymentStatus: 'unpaid',
        mode: 'payment',
        livemode,
        amountTotal: params.lines.reduce((sum, l) => sum + l.unitAmountCents * l.quantity, 0),
        currency: 'usd',
        metadata: { order_id: params.orderId },
        clientReferenceId: params.orderId,
        paymentIntentId: null,
        url: `https://checkout.stripe.com/c/pay/${id}`,
        expiresAt: params.expiresAt,
      }
      sessions.set(id, session)
      byKey.set(key, { id, params: canonical })
      created.push({ key, params })
      return { ...session }
    },
    async retrieveSession(id) {
      if (state.apiDown) throw new Error('stripe unreachable')
      return { ...get(id) }
    },
    async expireSession(id) {
      if (state.apiDown) throw new Error('stripe unreachable')
      const s = get(id)
      if (state.payDuringExpire) {
        // The customer's payment landed a moment before our expire arrived.
        pay(id)
        throw Object.assign(new Error('You cannot expire a Checkout Session that is not open'), { code: 'checkout_session_not_open' })
      }
      if (state.expireRefuses || s.status !== 'open') throw Object.assign(new Error('You cannot expire a Checkout Session that is not open'), { code: 'checkout_session_not_open' })
      return expire(id)
    },
    async constructEvent(raw, signature) {
      if (signature !== `sig:${WEBHOOK_SECRET}`) throw new Error('No signatures found matching the expected signature for payload')
      const body = JSON.parse(raw) as { id: string; type: string; livemode: boolean; session_id?: string; snapshot?: GatewaySession; payment_intent_id?: string }
      const event: GatewayEvent = { id: body.id, type: body.type, livemode: body.livemode }
      if (body.session_id) event.session = body.snapshot ?? { ...get(body.session_id) }
      if (body.payment_intent_id) event.paymentIntentId = body.payment_intent_id
      return event
    },
    async listRefunds(paymentIntentId) {
      if (state.apiDown) throw new Error('stripe unreachable')
      return (refunds.get(paymentIntentId) ?? []).map((r) => ({ ...r }))
    },
  }

  let e = 0
  let r = 0
  return {
    gateway,
    sessions,
    refunds,
    created,
    state,
    pay,
    expire,
    /** A refund issued in the Dashboard against a paid session's payment. */
    refund(paymentIntentId: string, amountCents: number, status = 'succeeded'): GatewayRefund {
      const one = { id: `re_${++r}`, amountCents, status }
      refunds.set(paymentIntentId, [...(refunds.get(paymentIntentId) ?? []), one])
      return one
    },
    /** A charge.* or refund.* webhook body, naming only the payment intent — the app must ask Stripe for the rest. */
    refundEvent(type: string, paymentIntentId: string, id = `evt_${++e}`): { body: string; headers: Record<string, string> } {
      return { body: JSON.stringify({ id, type, livemode, payment_intent_id: paymentIntentId }), headers: { 'stripe-signature': `sig:${WEBHOOK_SECRET}` } }
    },
    /** A webhook body. `snapshot` lets a test deliver a stale picture of the session, as Stripe may. */
    event(type: string, sessionId: string, snapshot?: GatewaySession, id = `evt_${++e}`): { body: string; headers: Record<string, string> } {
      return { body: JSON.stringify({ id, type, livemode, session_id: sessionId, snapshot }), headers: { 'stripe-signature': `sig:${WEBHOOK_SECRET}` } }
    },
  }
}
