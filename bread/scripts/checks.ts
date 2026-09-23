/**
 * The check logic behind `npm run smoke` and `npm run launch:preflight`, as
 * pure functions over what the site answered, so the tests can prove what
 * each script would say without a site to talk to.
 */
export interface Check {
  name: string
  ok: boolean
  detail: string
}

export interface HealthLike {
  ok?: unknown
  migrations?: unknown
  livemode?: unknown
  stripeConfigured?: unknown
  adminConfigured?: unknown
  lastReconcileAt?: unknown
  lastWebhookAt?: unknown
  liveHolds?: unknown
  testDataPresent?: unknown
}

const minutesAgo = (iso: unknown, nowMs: number) => (typeof iso === 'string' ? Math.round((nowMs - Date.parse(iso)) / 60_000) : null)

/**
 * How long since the scheduled reconcile last finished before we call it
 * dead. It runs every 30 minutes, so this allows one missed run and some
 * slack — long enough not to cry wolf, short enough to catch a job that has
 * genuinely stopped.
 */
export const RECONCILE_STALE_AFTER_MINUTES = 70

/** Everything a launch needs the deployed site to say about itself. */
export function preflightChecks(health: HealthLike | null, status: number, localMigrations: number, nowMs: number): Check[] {
  if (!health || status !== 200) return [{ name: 'health endpoint', ok: false, detail: `HTTP ${status}` }]
  const ran = minutesAgo(health.lastReconcileAt, nowMs)
  return [
    { name: 'health endpoint', ok: health.ok === true, detail: 'answers' },
    { name: 'database migrated to this code', ok: health.migrations === localMigrations, detail: `${String(health.migrations)} applied, ${localMigrations} in the repo` },
    { name: 'Stripe configured', ok: health.stripeConfigured === true, detail: health.stripeConfigured === true ? 'key and webhook secret present' : 'STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET missing' },
    { name: 'Stripe in LIVE mode', ok: health.livemode === true, detail: health.livemode === true ? 'live key' : health.livemode === false ? 'still a TEST key — real customers would pay nothing' : 'no key' },
    { name: 'admin password set', ok: health.adminConfigured === true, detail: health.adminConfigured === true ? 'ADMIN_PASSWORD present' : 'ADMIN_PASSWORD missing: the admin is locked' },
    { name: 'no test data in the database', ok: health.testDataPresent === false, detail: health.testDataPresent === false ? 'clean' : 'test-mode orders or payments present — run npm run db:clear-orders -- --yes' },
    { name: 'no card holds in flight', ok: health.liveHolds === 0, detail: `${String(health.liveHolds)} on hold` },
    { name: 'scheduled reconcile has run recently', ok: ran !== null && ran <= RECONCILE_STALE_AFTER_MINUTES, detail: ran === null ? 'never ran' : `${ran} min ago` },
  ]
}

export interface SmokeInput {
  health: { status: number; body: HealthLike | null }
  availability: { status: number; body: { products?: unknown[]; days?: unknown[] } | null; cacheControl: string | null }
  orderUnknown: number
  orderMalformed: number
  adminNoToken: number
  adminSessionWrong: number
  reconcile: { status: number; text: string }
  webhookUnsigned: number
  home: { status: number; headers: Record<string, string | null> }
  thanksCacheControl: string | null
  robots: { status: number; text: string }
  adminWithPassword?: { status: number; days: number } | null
}

const UUID_V4 = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

/** What the deployed site must do for a stranger, and — with the password in the shell — for her. */
export function smokeChecks(r: SmokeInput, nowMs: number): Check[] {
  const h = r.health.body
  const ran = minutesAgo(h?.lastReconcileAt, nowMs)
  const hooked = minutesAgo(h?.lastWebhookAt, nowMs)
  const out: Check[] = [
    { name: 'GET /api/health', ok: r.health.status === 200 && h?.ok === true, detail: `HTTP ${r.health.status}` },
    { name: 'database reachable and migrated', ok: typeof h?.migrations === 'number' && (h.migrations as number) >= 5, detail: `${String(h?.migrations)} migrations` },
    { name: 'Stripe mode', ok: typeof h?.livemode === 'boolean', detail: h?.livemode === true ? 'LIVE' : h?.livemode === false ? 'TEST (practice payments only)' : 'not configured' },
    { name: 'admin password configured', ok: h?.adminConfigured === true, detail: String(h?.adminConfigured) },
    { name: 'scheduled reconcile is running', ok: ran !== null && ran <= RECONCILE_STALE_AFTER_MINUTES, detail: ran === null ? 'has never run (wait half an hour after the first deploy, then check again)' : `last run ${ran} min ago` },
    { name: 'Stripe webhook has reached the site', ok: hooked !== null, detail: hooked === null ? 'no event received yet (make a test order to prove the endpoint)' : `last event ${hooked} min ago` },
    { name: 'GET /api/availability', ok: r.availability.status === 200 && Array.isArray(r.availability.body?.days) && Array.isArray(r.availability.body?.products), detail: `HTTP ${r.availability.status}, ${r.availability.body?.days?.length ?? 0} days, ${r.availability.body?.products?.length ?? 0} products` },
    { name: 'API answers are never cached', ok: r.availability.cacheControl === 'no-store', detail: String(r.availability.cacheControl) },
    { name: 'unknown order id → 404', ok: r.orderUnknown === 404, detail: `HTTP ${r.orderUnknown}` },
    { name: 'malformed order id → 400', ok: r.orderMalformed === 400, detail: `HTTP ${r.orderMalformed}` },
    { name: 'admin without a token → 401', ok: r.adminNoToken === 401, detail: `HTTP ${r.adminNoToken}` },
    { name: 'wrong admin password → 401', ok: r.adminSessionWrong === 401, detail: `HTTP ${r.adminSessionWrong}` },
    { name: 'reconcile endpoint reveals no order ids', ok: r.reconcile.status === 200 && !UUID_V4.test(r.reconcile.text), detail: `HTTP ${r.reconcile.status}` },
    { name: 'unsigned webhook → 400', ok: r.webhookUnsigned === 400, detail: `HTTP ${r.webhookUnsigned}` },
    { name: 'home page serves over HTTPS with security headers', ok: r.home.status === 200 && Boolean(r.home.headers['content-security-policy']) && Boolean(r.home.headers['strict-transport-security']) && r.home.headers['x-frame-options'] === 'DENY' && r.home.headers['x-content-type-options'] === 'nosniff', detail: `HTTP ${r.home.status}; CSP ${r.home.headers['content-security-policy'] ? 'yes' : 'NO'}, HSTS ${r.home.headers['strict-transport-security'] ? 'yes' : 'NO'}` },
    { name: '/thanks is never cached', ok: r.thanksCacheControl === 'no-store', detail: String(r.thanksCacheControl) },
    { name: 'robots.txt disallows indexing', ok: r.robots.status === 200 && /Disallow:\s*\//.test(r.robots.text), detail: `HTTP ${r.robots.status}` },
  ]
  if (r.adminWithPassword !== undefined) {
    out.push(
      r.adminWithPassword
        ? { name: 'admin sign-in and day list (persistent data)', ok: r.adminWithPassword.status === 200, detail: `HTTP ${r.adminWithPassword.status}, ${r.adminWithPassword.days} pickup days listed` }
        : { name: 'admin sign-in and day list (persistent data)', ok: false, detail: 'sign-in failed' },
    )
  }
  return out
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
    checks.push({ name: 'webhook endpoint for this site exists', ok: false, detail: `none of the ${endpoints.length} endpoint(s) points at ${hookUrl}` })
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

export function printChecks(title: string, checks: Check[]): boolean {
  const width = Math.max(...checks.map((c) => c.name.length))
  console.log(`\n${title}\n${'─'.repeat(title.length)}`)
  for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name.padEnd(width)}  ${c.detail}`)
  const failed = checks.filter((c) => !c.ok).length
  console.log(failed ? `\n${failed} check${failed === 1 ? '' : 's'} failed.` : '\nAll checks passed.')
  return failed === 0
}
