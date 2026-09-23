/**
 * Is Biz's Stripe account genuinely ready, and what should be done about the
 * webhook endpoint? Pure functions over Stripe's own Account and Webhook
 * Endpoint shapes, so they are tested with fixtures and no network, and so
 * they can run in two places: the command-line scripts (scripts/) and the
 * admin page's "Going live" panel, which runs them on the deployed site —
 * the one place that can always reach Stripe.
 *
 * Lives under netlify/lib/ because only that is bundled into the functions;
 * scripts/checks.ts re-exports it.
 */

export interface Check {
  name: string
  ok: boolean
  detail: string
}

// ── Her Stripe account, asked of Stripe itself ─────────────────────────────

/** The slice of Stripe's Account object that decides whether she can trade. */
export interface AccountLike {
  charges_enabled?: unknown
  payouts_enabled?: unknown
  details_submitted?: unknown
  requirements?: { currently_due?: unknown; past_due?: unknown; disabled_reason?: unknown } | null
  business_profile?: { url?: unknown; name?: unknown } | null
  settings?: { payments?: { statement_descriptor?: unknown } | null } | null
}

export interface WebhookEndpointLike {
  id?: unknown
  url?: unknown
  status?: unknown
  enabled_events?: unknown
}

const listOf = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

/**
 * Is her Stripe account genuinely ready to take a real payment and pay it
 * out? Asked of Stripe's own Account and Webhook Endpoint objects, so it
 * answers without charging anybody. `requiredEvents` is
 * REQUIRED_WEBHOOK_EVENTS; `siteUrl` is where the site is deployed.
 */
export function stripeAccountChecks(
  account: AccountLike | null,
  endpoints: WebhookEndpointLike[] | null,
  siteUrl: string,
  keyPrefix: string,
  requiredEvents: readonly string[],
): Check[] {
  if (!account) return [{ name: 'Stripe account readable', ok: false, detail: 'the key could not read the account' }]
  const req = account.requirements ?? {}
  const due = [...listOf(req.currently_due), ...listOf(req.past_due)]
  const descriptor = account.settings?.payments?.statement_descriptor
  const businessUrl = account.business_profile?.url
  const hookUrl = `${siteUrl.replace(/\/$/, '')}/api/stripe-webhook`

  const checks: Check[] = [
    { name: 'key is a LIVE key', ok: keyPrefix.includes('_live_'), detail: keyPrefix.includes('_live_') ? keyPrefix : `${keyPrefix} — this is a TEST key, so none of the below is about real money` },
    { name: 'can accept card payments', ok: account.charges_enabled === true, detail: account.charges_enabled === true ? 'charges enabled' : 'charges NOT enabled — a real customer would be refused' },
    { name: 'can pay out to her bank', ok: account.payouts_enabled === true, detail: account.payouts_enabled === true ? 'payouts enabled' : 'payouts NOT enabled — money would pile up at Stripe' },
    { name: 'activation submitted', ok: account.details_submitted === true, detail: account.details_submitted === true ? 'submitted' : 'Stripe has not received her details' },
    { name: 'Stripe is not waiting on anything', ok: due.length === 0 && !req.disabled_reason, detail: due.length === 0 && !req.disabled_reason ? 'nothing outstanding' : [req.disabled_reason ? `blocked: ${String(req.disabled_reason)}` : '', due.length ? `still wanted: ${due.join(', ')}` : ''].filter(Boolean).join('; ') },
    { name: 'statement descriptor set', ok: typeof descriptor === 'string' && descriptor.trim().length > 0, detail: typeof descriptor === 'string' && descriptor.trim() ? `customers will see "${descriptor}"` : 'not set — customers see something generic on their statement' },
    { name: 'business website points at the site', ok: typeof businessUrl === 'string' && businessUrl.replace(/\/$/, '') === siteUrl.replace(/\/$/, ''), detail: typeof businessUrl === 'string' && businessUrl ? `${businessUrl} (expected ${siteUrl})` : 'not set' },
  ]

  if (!endpoints) {
    checks.push({ name: 'live webhook endpoint', ok: false, detail: 'the key could not list webhook endpoints' })
    return checks
  }
  const ours = endpoints.filter((e) => typeof e.url === 'string' && e.url.replace(/\/$/, '') === hookUrl)
  if (ours.length === 0) {
    checks.push({ name: 'webhook endpoint for this site exists', ok: false, detail: `none of the ${endpoints.length} endpoint(s) points at ${hookUrl} — run: npm run stripe:setup-webhook` })
    return checks
  }
  const enabled = ours.find((e) => e.status === 'enabled') ?? ours[0]
  const events = listOf(enabled.enabled_events)
  const missing = events.includes('*') ? [] : requiredEvents.filter((e) => !events.includes(e))
  checks.push(
    { name: 'webhook endpoint for this site exists', ok: true, detail: hookUrl },
    { name: 'webhook endpoint is enabled', ok: enabled.status === 'enabled', detail: String(enabled.status ?? 'unknown') },
    { name: 'webhook sends every event the site needs', ok: missing.length === 0, detail: missing.length === 0 ? `all ${requiredEvents.length} present` : `MISSING: ${missing.join(', ')}` },
  )
  return checks
}

/** What `npm run stripe:setup-webhook` should do about the endpoint, decided without touching Stripe. */
export type WebhookPlan =
  | { action: 'create' }
  | { action: 'update'; id: string; missing: string[] }
  | { action: 'ok'; id: string }

/**
 * Is there already an endpoint at our URL, and does it carry every event the
 * app acts on? Create one, widen the one that is there, or leave it alone —
 * never a second endpoint for the same URL, which would double every
 * delivery.
 */
export function webhookPlan(endpoints: WebhookEndpointLike[], hookUrl: string, requiredEvents: readonly string[]): WebhookPlan {
  const norm = (u: string) => u.replace(/\/$/, '')
  const mine = endpoints.find((e) => typeof e.url === 'string' && norm(e.url) === norm(hookUrl))
  if (!mine || typeof (mine as { id?: unknown }).id !== 'string') return { action: 'create' }
  const id = (mine as { id: string }).id
  const events = listOf(mine.enabled_events)
  const missing = events.includes('*') ? [] : requiredEvents.filter((e) => !events.includes(e))
  return missing.length === 0 ? { action: 'ok', id } : { action: 'update', id, missing }
}
