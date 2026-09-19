import Stripe from 'stripe'

/**
 * The slice of Stripe the app uses, behind an interface so the tests can
 * stand in a fake with a session table of their own. Production wraps the
 * official SDK. Nothing here ever sees a card number; Stripe's hosted page
 * does that.
 */

export type SessionStatus = 'open' | 'complete' | 'expired'
export type PaymentStatus = 'paid' | 'unpaid' | 'no_payment_required'

/** A Checkout Session as the app needs to see it. */
export interface GatewaySession {
  id: string
  status: SessionStatus
  paymentStatus: PaymentStatus
  mode: string
  livemode: boolean
  amountTotal: number | null
  currency: string | null
  metadata: Record<string, string>
  clientReferenceId: string | null
  paymentIntentId: string | null
  url: string | null
  /** Epoch seconds. */
  expiresAt: number
}

export interface SessionLine {
  name: string
  unitAmountCents: number
  quantity: number
}

export interface CreateSessionParams {
  orderId: string
  lines: SessionLine[]
  /** Epoch seconds; Stripe requires 30 min – 24 h after creation. */
  expiresAt: number
  successUrl: string
  cancelUrl: string
  description: string
}

export interface GatewayEvent {
  id: string
  type: string
  livemode: boolean
  /** Present for checkout.session.* events. */
  session?: GatewaySession
  /** Present for charge.* and refund.* events: the payment they concern. */
  paymentIntentId?: string
}

/** A refund as Stripe reports it. status: pending | requires_action | succeeded | failed | canceled. */
export interface GatewayRefund {
  id: string
  amountCents: number
  status: string
}

export interface StripeGateway {
  livemode: boolean
  createSession(params: CreateSessionParams, idempotencyKey: string): Promise<GatewaySession>
  retrieveSession(id: string): Promise<GatewaySession>
  /** Only an open session can be expired; Stripe errors otherwise. */
  expireSession(id: string): Promise<GatewaySession>
  /** Verifies the signature against the raw body; throws when it does not match. */
  constructEvent(rawBody: string, signature: string): Promise<GatewayEvent>
  /** Every refund against a payment, so the app mirrors what Stripe holds rather than an event's snapshot. */
  listRefunds(paymentIntentId: string): Promise<GatewayRefund[]>
}

export const CURRENCY = 'usd'

export function toGatewaySession(s: Stripe.Checkout.Session): GatewaySession {
  return {
    id: s.id,
    status: (s.status ?? 'open') as SessionStatus,
    paymentStatus: s.payment_status as PaymentStatus,
    mode: s.mode,
    livemode: s.livemode,
    amountTotal: s.amount_total,
    currency: s.currency,
    metadata: s.metadata ?? {},
    clientReferenceId: s.client_reference_id,
    paymentIntentId: typeof s.payment_intent === 'string' ? s.payment_intent : (s.payment_intent?.id ?? null),
    url: s.url,
    expiresAt: s.expires_at,
  }
}

/** The real thing. Secret key and webhook secret come from the server environment only. */
export function stripeGateway(secretKey: string, webhookSecret: string): StripeGateway {
  const stripe = new Stripe(secretKey)
  return {
    livemode: secretKey.startsWith('sk_live_'),
    async createSession(p, idempotencyKey) {
      const session = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          // Cards only: Apple Pay and Google Pay ride on 'card' where the
          // customer's browser supports them; every delayed-settlement method
          // stays out.
          payment_method_types: ['card'],
          line_items: p.lines.map((l) => ({
            quantity: l.quantity,
            price_data: { currency: CURRENCY, unit_amount: l.unitAmountCents, product_data: { name: l.name, description: p.description } },
          })),
          client_reference_id: p.orderId,
          metadata: { order_id: p.orderId },
          payment_intent_data: { description: p.description, metadata: { order_id: p.orderId } },
          customer_creation: 'if_required',
          expires_at: p.expiresAt,
          success_url: p.successUrl,
          cancel_url: p.cancelUrl,
        },
        { idempotencyKey },
      )
      return toGatewaySession(session)
    },
    async retrieveSession(id) {
      return toGatewaySession(await stripe.checkout.sessions.retrieve(id))
    },
    async expireSession(id) {
      return toGatewaySession(await stripe.checkout.sessions.expire(id))
    },
    async constructEvent(rawBody, signature) {
      const event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret)
      const object = event.data.object as { object?: string; payment_intent?: string | { id: string } | null }
      const out: GatewayEvent = { id: event.id, type: event.type, livemode: event.livemode }
      if (object?.object === 'checkout.session') out.session = toGatewaySession(object as Stripe.Checkout.Session)
      if (object?.object === 'charge' || object?.object === 'refund') {
        const pi = object.payment_intent
        if (typeof pi === 'string') out.paymentIntentId = pi
        else if (pi?.id) out.paymentIntentId = pi.id
      }
      return out
    },
    async listRefunds(paymentIntentId) {
      const page = await stripe.refunds.list({ payment_intent: paymentIntentId, limit: 100 })
      return page.data.map((r) => ({ id: r.id, amountCents: r.amount, status: r.status ?? 'pending' }))
    },
  }
}

/** True when Stripe is configured for this deploy. */
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)
}

export function productionGateway(): StripeGateway | null {
  const key = process.env.STRIPE_SECRET_KEY
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!key || !secret) return null
  return stripeGateway(key, secret)
}
