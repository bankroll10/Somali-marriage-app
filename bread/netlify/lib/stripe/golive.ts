import Stripe from 'stripe'
import { SESSION_MIN_MINUTES } from '../../../shared/config.ts'
import { REQUIRED_WEBHOOK_EVENTS, stripeGateway } from './gateway.ts'
import { defaultOrigin, returnUrls } from './payments.ts'
import type { GoLiveProbe, GoLiveWebhook } from '../../../shared/types.ts'
import { stripeAccountChecks, webhookPlan, type AccountLike, type Check, type WebhookEndpointLike } from './readiness.ts'

/**
 * The three Stripe steps of going live, run on the deployed site from her
 * admin page — the one place that can always reach Stripe, so nobody needs a
 * terminal. Each takes the staged LIVE key, whatever mode the site is in:
 * they are how the live side is checked before anything switches to it.
 *
 *   status   reads her account and webhook endpoints; charges nothing
 *   probe    makes the exact Checkout Session a real order makes, then
 *            expires it at once — proves the key's permissions cover the
 *            real call, and nobody can pay an expired session
 *   webhook  creates (or widens) the live endpoint; Stripe returns the
 *            signing secret only now, so it is handed back exactly once
 *
 * Nothing here ever returns the key.
 */

export interface LiveStripe {
  key: string
  options?: Stripe.StripeConfig
}

const hookUrl = () => `${defaultOrigin().replace(/\/$/, '')}/api/stripe-webhook`
const prefixOf = (key: string) => `${key.slice(0, key.lastIndexOf('_') + 1)}…`

/** A Stripe error, for her page: the message and the kind, never the request. */
function explain(err: unknown): { message: string; type: string } {
  const e = err as { message?: unknown; type?: unknown }
  return { message: typeof e.message === 'string' ? e.message : String(err), type: typeof e.type === 'string' ? e.type : 'unknown' }
}

export interface StatusResult {
  checks: Check[]
  /** Whether an endpoint for this site already exists — the probe should come first if not. */
  webhookExists: boolean
  errors: { message: string; type: string }[]
}

export async function goLiveStatus(live: LiveStripe): Promise<StatusResult> {
  const stripe = new Stripe(live.key, { maxNetworkRetries: 1, ...live.options })
  const errors: StatusResult['errors'] = []
  let account: AccountLike | null = null
  let endpoints: WebhookEndpointLike[] | null = null
  try {
    account = (await stripe.accounts.retrieveCurrent()) as unknown as AccountLike
  } catch (err) {
    errors.push(explain(err))
  }
  try {
    endpoints = (await stripe.webhookEndpoints.list({ limit: 100 })).data as WebhookEndpointLike[]
  } catch (err) {
    errors.push(explain(err))
  }
  const checks = stripeAccountChecks(account, endpoints, defaultOrigin(), prefixOf(live.key), REQUIRED_WEBHOOK_EVENTS)
  const webhookExists = endpoints ? webhookPlan(endpoints, hookUrl(), REQUIRED_WEBHOOK_EVENTS).action !== 'create' : false
  return { checks, webhookExists, errors }
}

export type ProbeResult = GoLiveProbe

/**
 * One throwaway Checkout Session through the site's own gateway code — the
 * same parameters a customer's order sends — expired the moment it exists.
 * Its metadata carries no order id, so if its expiry event ever reaches the
 * webhook it matches no order and changes nothing.
 */
export async function goLiveProbe(live: LiveStripe, nowMs: number): Promise<ProbeResult> {
  const gateway = stripeGateway(live.key, '', { maxNetworkRetries: 1, ...live.options })
  const marker = `setup-check-${nowMs}`
  let sessionId: string
  let livemode: boolean
  try {
    const made = await gateway.createSession(
      {
        orderId: marker,
        lines: [{ name: 'Setup check — not an order', unitAmountCents: 100, quantity: 1 }],
        expiresAt: Math.floor(nowMs / 1000) + (SESSION_MIN_MINUTES + 1) * 60,
        ...returnUrls(defaultOrigin(), marker),
        description: 'Setup check — not an order, expired immediately',
      },
      marker,
    )
    sessionId = made.id
    livemode = made.livemode
  } catch (err) {
    return { ok: false, step: 'create', ...explain(err) }
  }
  try {
    const gone = await gateway.expireSession(sessionId)
    return { ok: true, sessionId, livemode, expired: gone.status === 'expired' }
  } catch (err) {
    return { ok: false, step: 'expire', ...explain(err) }
  }
}

export type WebhookResult = GoLiveWebhook

export async function goLiveWebhook(live: LiveStripe): Promise<WebhookResult> {
  const stripe = new Stripe(live.key, { maxNetworkRetries: 1, ...live.options })
  try {
    const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data as WebhookEndpointLike[]
    const plan = webhookPlan(existing, hookUrl(), REQUIRED_WEBHOOK_EVENTS)
    if (plan.action === 'ok') return { ok: true, action: 'unchanged', id: plan.id }
    if (plan.action === 'update') {
      await stripe.webhookEndpoints.update(plan.id, { enabled_events: [...REQUIRED_WEBHOOK_EVENTS] })
      return { ok: true, action: 'updated', id: plan.id, added: plan.missing }
    }
    const made = await stripe.webhookEndpoints.create({ url: hookUrl(), enabled_events: [...REQUIRED_WEBHOOK_EVENTS], description: 'Fresh Bread pre-orders' })
    if (!made.secret) return { ok: false, message: 'Stripe created the endpoint but returned no signing secret', type: 'no_secret' }
    return { ok: true, action: 'created', id: made.id, secret: made.secret }
  } catch (err) {
    return { ok: false, ...explain(err) }
  }
}
