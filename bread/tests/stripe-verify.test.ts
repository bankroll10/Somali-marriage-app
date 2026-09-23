import Stripe from 'stripe'
import { describe, expect, it } from 'vitest'
import { SITE_URL } from '../shared/config.ts'
import { REQUIRED_WEBHOOK_EVENTS } from '../netlify/lib/stripe/gateway.ts'
import { stripeAccountChecks, webhookPlan, type AccountLike, type WebhookEndpointLike } from '../scripts/checks.ts'

/**
 * What `npm run stripe:verify` would say about her account, proven against
 * fixture payloads in Stripe's own shapes — so the verdict is tested without
 * a Stripe account, a network, or a payment. The last test uses the real SDK
 * with a recording HTTP client to prove the script reads, and only reads,
 * the two endpoints it claims to.
 */
const HOOK = `${SITE_URL}/api/stripe-webhook`

const ready = (over: Partial<AccountLike> = {}): AccountLike => ({
  charges_enabled: true,
  payouts_enabled: true,
  details_submitted: true,
  requirements: { currently_due: [], past_due: [], disabled_reason: null },
  business_profile: { url: SITE_URL, name: 'Fresh Bread' },
  settings: { payments: { statement_descriptor: 'FRESH BREAD' } },
  ...over,
})
const endpoint = (over: Partial<WebhookEndpointLike> = {}): WebhookEndpointLike => ({ id: 'we_1', url: HOOK, status: 'enabled', enabled_events: [...REQUIRED_WEBHOOK_EVENTS], ...over })
const run = (a: AccountLike | null, e: WebhookEndpointLike[] | null, prefix = 'sk_live_') => stripeAccountChecks(a, e, SITE_URL, prefix, REQUIRED_WEBHOOK_EVENTS)
const failures = (checks: ReturnType<typeof run>) => checks.filter((c) => !c.ok).map((c) => c.name)
const detail = (checks: ReturnType<typeof run>, name: string) => checks.find((c) => c.name === name)?.detail

describe('is her Stripe account actually ready', () => {
  it('passes every row for an activated live account with a complete webhook, and shows the descriptor back', () => {
    const checks = run(ready(), [endpoint()])
    expect(failures(checks)).toEqual([])
    expect(detail(checks, 'statement descriptor set')).toBe('customers will see "FRESH BREAD"')
    expect(detail(checks, 'webhook sends every event the site needs')).toBe(`all ${REQUIRED_WEBHOOK_EVENTS.length} present`)
  })

  it('says plainly when the key is a test key, without pretending the rest is about real money', () => {
    const checks = run(ready(), [endpoint()], 'sk_test_')
    expect(failures(checks)).toEqual(['key is a LIVE key'])
    expect(detail(checks, 'key is a LIVE key')).toContain('TEST key')
  })

  it('names exactly what Stripe is still waiting for when activation is not really finished', () => {
    const checks = run(
      ready({ charges_enabled: false, payouts_enabled: false, requirements: { currently_due: ['individual.id_number', 'external_account'], past_due: ['individual.verification.document'], disabled_reason: 'requirements.past_due' } }),
      [endpoint()],
    )
    expect(failures(checks)).toEqual(['can accept card payments', 'can pay out to her bank', 'Stripe is not waiting on anything'])
    const why = detail(checks, 'Stripe is not waiting on anything')!
    expect(why).toContain('blocked: requirements.past_due')
    expect(why).toContain('individual.id_number')
    expect(why).toContain('individual.verification.document')
  })

  it('lists the missing webhook events by name rather than just failing', () => {
    const partial = REQUIRED_WEBHOOK_EVENTS.filter((e) => !e.startsWith('refund.') && e !== 'charge.refund.updated')
    const checks = run(ready(), [endpoint({ enabled_events: [...partial] })])
    expect(failures(checks)).toEqual(['webhook sends every event the site needs'])
    expect(detail(checks, 'webhook sends every event the site needs')).toBe('MISSING: charge.refund.updated, refund.created, refund.updated')
    // Stripe's catch-all subscription covers everything.
    expect(failures(run(ready(), [endpoint({ enabled_events: ['*'] })]))).toEqual([])
  })

  it('catches an endpoint pointed somewhere else, a disabled one, and no endpoint at all', () => {
    const elsewhere = run(ready(), [endpoint({ url: 'https://example.com/hook' })])
    expect(failures(elsewhere)).toEqual(['webhook endpoint for this site exists'])
    expect(detail(elsewhere, 'webhook endpoint for this site exists')).toContain('none of the 1 endpoint(s)')
    expect(failures(run(ready(), [endpoint({ status: 'disabled' })]))).toEqual(['webhook endpoint is enabled'])
    expect(failures(run(ready(), []))).toEqual(['webhook endpoint for this site exists'])
    // A trailing slash on the dashboard's copy of the URL is the same endpoint.
    expect(failures(run(ready(), [endpoint({ url: `${HOOK}/` })]))).toEqual([])
  })

  it('reports a key that cannot read, instead of guessing', () => {
    expect(run(null, null)).toEqual([{ name: 'Stripe account readable', ok: false, detail: 'the key could not read the account' }])
    expect(failures(run(ready(), null))).toEqual(['live webhook endpoint'])
  })

  it('flags a descriptor or website she has not set', () => {
    const checks = run(ready({ settings: { payments: { statement_descriptor: '' } }, business_profile: { url: 'https://some-other-site.com' } }), [endpoint()])
    expect(failures(checks)).toEqual(['statement descriptor set', 'business website points at the site'])
    expect(detail(checks, 'business website points at the site')).toBe(`https://some-other-site.com (expected ${SITE_URL})`)
  })

  it('points at the command that fixes a missing endpoint, rather than only naming the problem', () => {
    expect(detail(run(ready(), []), 'webhook endpoint for this site exists')).toContain('npm run stripe:setup-webhook')
  })

  it('reads the account and the webhook list, and writes nothing', async () => {
    const seen: { method: string; url: string }[] = []
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url)
      seen.push({ method: init?.method ?? 'GET', url: u })
      const body = u.includes('/v1/webhook_endpoints') ? { object: 'list', data: [endpoint()], has_more: false } : { id: 'acct_1', object: 'account', ...ready() }
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', 'request-id': 'req_test' } })
    }
    const stripe = new Stripe('sk_live_123', { httpClient: Stripe.createFetchHttpClient(fetchFn as typeof fetch), maxNetworkRetries: 0 })
    const account = (await stripe.accounts.retrieveCurrent()) as unknown as AccountLike
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 })
    expect(seen.map((r) => `${r.method} ${r.url}`)).toEqual(['GET https://api.stripe.com/v1/account', 'GET https://api.stripe.com/v1/webhook_endpoints?limit=100'])
    expect(seen.every((r) => r.method === 'GET')).toBe(true)
    expect(failures(run(account, endpoints.data as WebhookEndpointLike[]))).toEqual([])
  })
})

describe('what stripe:setup-webhook decides to do', () => {
  it('creates when nothing points at us, and never a second one for the same URL', () => {
    expect(webhookPlan([], HOOK, REQUIRED_WEBHOOK_EVENTS)).toEqual({ action: 'create' })
    expect(webhookPlan([endpoint({ url: 'https://example.com/hook' })], HOOK, REQUIRED_WEBHOOK_EVENTS)).toEqual({ action: 'create' })
    expect(webhookPlan([endpoint()], HOOK, REQUIRED_WEBHOOK_EVENTS)).toEqual({ action: 'ok', id: 'we_1' })
    // The Dashboard's copy of the URL may carry a trailing slash; it is the same endpoint.
    expect(webhookPlan([endpoint({ url: `${HOOK}/` })], HOOK, REQUIRED_WEBHOOK_EVENTS)).toEqual({ action: 'ok', id: 'we_1' })
  })

  it('widens an endpoint that is missing events, naming them, and leaves a catch-all alone', () => {
    const partial = REQUIRED_WEBHOOK_EVENTS.filter((e) => e.startsWith('checkout.'))
    expect(webhookPlan([endpoint({ enabled_events: [...partial] })], HOOK, REQUIRED_WEBHOOK_EVENTS)).toEqual({
      action: 'update',
      id: 'we_1',
      missing: ['charge.refunded', 'charge.refund.updated', 'refund.created', 'refund.updated'],
    })
    expect(webhookPlan([endpoint({ enabled_events: ['*'] })], HOOK, REQUIRED_WEBHOOK_EVENTS)).toEqual({ action: 'ok', id: 'we_1' })
  })

  it('sends Stripe a POST carrying our URL and every required event, and reads back the secret', async () => {
    const seen: { method: string; url: string; body: string }[] = []
    const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
      seen.push({ method: init?.method ?? 'GET', url: String(url), body: typeof init?.body === 'string' ? init.body : '' })
      return new Response(JSON.stringify({ id: 'we_new', object: 'webhook_endpoint', secret: 'whsec_returned_once', url: HOOK, enabled_events: [...REQUIRED_WEBHOOK_EVENTS], status: 'enabled' }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'request-id': 'req_test' },
      })
    }
    const stripe = new Stripe('rk_live_123', { httpClient: Stripe.createFetchHttpClient(fetchFn as typeof fetch), maxNetworkRetries: 0 })
    const made = await stripe.webhookEndpoints.create({ url: HOOK, enabled_events: [...REQUIRED_WEBHOOK_EVENTS], description: 'Fresh Bread pre-orders' })

    expect(seen).toHaveLength(1)
    expect(seen[0].method).toBe('POST')
    expect(seen[0].url).toBe('https://api.stripe.com/v1/webhook_endpoints')
    const form = new URLSearchParams(seen[0].body)
    expect(form.get('url')).toBe(HOOK)
    expect(REQUIRED_WEBHOOK_EVENTS.map((_, i) => form.get(`enabled_events[${i}]`))).toEqual([...REQUIRED_WEBHOOK_EVENTS])
    expect(form.get(`enabled_events[${REQUIRED_WEBHOOK_EVENTS.length}]`)).toBeNull()
    // The secret exists only in this response — that is why the script prints it once.
    expect(made.secret).toBe('whsec_returned_once')
  })
})
