import { PRODUCT_IDS } from '../../shared/config.ts'
import type { Db, Queryable } from './db/client.ts'
import type { StripeGateway } from './stripe/gateway.ts'

/**
 * Operating the deployed site without log access: a record of each
 * background run, a health report with no customer data in it, and the two
 * launch chores — wiping test orders and exporting the real ones — as
 * functions the scripts and the tests share.
 */

const iso = (ms: number) => new Date(ms).toISOString()

export async function recordJobRun(db: Queryable, job: string, detail: Record<string, unknown>, startedMs: number, finishedMs: number): Promise<void> {
  await db.query('INSERT INTO job_runs (job, started_at, finished_at, detail) VALUES ($1, $2::timestamptz, $3::timestamptz, $4::jsonb)', [job, iso(startedMs), iso(finishedMs), JSON.stringify(detail)])
  await db.query("DELETE FROM job_runs WHERE started_at < $1::timestamptz - interval '30 days'", [iso(finishedMs)])
}

export interface OpsState {
  /** Stripe's mode, from the configured key; null when no key is configured. */
  livemode: boolean | null
  lastReconcileAt: string | null
  lastReconcile: Record<string, unknown> | null
  lastWebhookAt: string | null
}

export async function opsState(db: Queryable, gateway: StripeGateway | null): Promise<OpsState> {
  const run = (await db.query<{ finished_ms: number; detail: unknown }>("SELECT extract(epoch FROM finished_at)::float8 * 1000 AS finished_ms, detail FROM job_runs WHERE job = 'reconcile-stale' ORDER BY started_at DESC LIMIT 1")).rows[0]
  const hook = (await db.query<{ received_ms: number | null }>('SELECT extract(epoch FROM max(received_at))::float8 * 1000 AS received_ms FROM webhook_events')).rows[0]
  return {
    livemode: gateway ? gateway.livemode : null,
    lastReconcileAt: run ? iso(Math.round(run.finished_ms)) : null,
    lastReconcile: run ? ((typeof run.detail === 'string' ? JSON.parse(run.detail) : run.detail) as Record<string, unknown>) : null,
    lastWebhookAt: hook?.received_ms ? iso(Math.round(hook.received_ms)) : null,
  }
}

export interface HealthReport extends OpsState {
  ok: true
  now: string
  /** Migrations applied to this database. */
  migrations: number
  stripeConfigured: boolean
  adminConfigured: boolean
  /** Card orders currently on hold. */
  liveHolds: number
  /** Orders or payments from Stripe's test mode are in this database. Must be false before live payments are taken. */
  testDataPresent: boolean
}

/** What a browser, a script or a person can read about the deployed site — nothing about any customer. */
export async function healthReport(db: Queryable, gateway: StripeGateway | null, adminConfigured: boolean, nowMs: number): Promise<HealthReport> {
  const ops = await opsState(db, gateway)
  const migrations = (await db.query<{ n: number }>('SELECT count(*)::int AS n FROM schema_migrations')).rows[0].n
  const holds = (await db.query<{ n: number }>("SELECT count(*)::int AS n FROM orders WHERE status = 'reserved' AND provider = 'stripe'")).rows[0].n
  return {
    ok: true,
    now: iso(nowMs),
    ...ops,
    migrations,
    stripeConfigured: gateway !== null,
    adminConfigured,
    liveHolds: holds,
    testDataPresent: await testDataPresent(db, ops.livemode),
  }
}

/**
 * Is anything from test mode in here? A payment reference Stripe marked as
 * not live is test data whatever the current key; once the key is live,
 * every order that has no live reference is suspect too — a real customer's
 * order always ends up with one.
 */
export async function testDataPresent(db: Queryable, livemode: boolean | null): Promise<boolean> {
  const test = (await db.query<{ n: number }>("SELECT count(*)::int AS n FROM payment_references WHERE provider = 'stripe' AND livemode = false")).rows[0].n
  if (test > 0) return true
  if (!livemode) return false
  const orphans = (await db.query<{ n: number }>("SELECT count(*)::int AS n FROM orders o WHERE NOT EXISTS (SELECT 1 FROM payment_references pr WHERE pr.order_id = o.id AND pr.provider = 'stripe' AND pr.livemode = true)")).rows[0].n
  return orphans > 0
}

export type ClearOutcome = { ok: true; before: { orders: number; paid: number }; after: { orders: number; dates: number; blocked: string[] } } | { ok: false; reason: 'live_sales_present'; liveSales: number }

/**
 * Wipe every order and everything that hangs off one; keep products,
 * capacities and blocked dates. Refuses while the database holds a real,
 * live-mode sale unless told in so many words that those go too.
 */
export async function clearOrders(db: Db, opts: { includeLive: boolean }): Promise<ClearOutcome> {
  const count = async (q: Queryable, sql: string) => (await q.query<{ n: number }>(sql)).rows[0].n
  const liveSales = await count(db, "SELECT count(*)::int AS n FROM payment_references WHERE provider = 'stripe' AND status = 'succeeded' AND livemode = true")
  if (liveSales > 0 && !opts.includeLive) return { ok: false, reason: 'live_sales_present', liveSales }
  const before = { orders: await count(db, 'SELECT count(*)::int AS n FROM orders'), paid: await count(db, "SELECT count(*)::int AS n FROM orders WHERE status = 'paid'") }
  await db.transaction(async (tx) => {
    await tx.query('DELETE FROM admin_actions')
    await tx.query('DELETE FROM checkout_attempts')
    await tx.query('DELETE FROM webhook_events')
    await tx.query('DELETE FROM admin_sign_ins')
    await tx.query('DELETE FROM job_runs')
    await tx.query('DELETE FROM orders') // cascades to order_items, payment_references, payment_exceptions
    await tx.query('UPDATE date_inventory SET committed = 0, overflow = 0')
  })
  const dates = (await db.query<{ date: string; blocked: boolean }>('SELECT date::text AS date, (blocked_at IS NOT NULL) AS blocked FROM pickup_dates ORDER BY date')).rows
  return { ok: true, before, after: { orders: await count(db, 'SELECT count(*)::int AS n FROM orders'), dates: dates.length, blocked: dates.filter((d) => d.blocked).map((d) => d.date) } }
}

const csvCell = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export const EXPORT_COLUMNS = ['pickup_date', 'order', 'name', 'phone', 'product', 'quantity', 'unit_price', 'order_total', 'status', 'provider', 'paid_at', 'fulfillment', 'picked_up_at', 'refunded', 'refund_pending', 'note', 'created_at'] as const

/** Every order line for pickup dates in [from, to], as CSV text with a header row. Her records, and the backup that reads without a database. */
export async function exportOrdersCsv(db: Queryable, from: string, to: string): Promise<string> {
  const { rows } = await db.query<Record<string, unknown>>(
    `SELECT o.date::text AS pickup_date, upper(left(o.id::text, 6)) AS "order", o.customer_name AS name, o.customer_phone AS phone,
            oi.product_id AS product, oi.quantity, oi.unit_price_cents, o.total_cents, o.status, o.provider,
            o.paid_at, o.fulfillment, o.picked_up_at,
            COALESCE(pr.refunded_cents, 0) AS refunded_cents, COALESCE(pr.refund_pending_cents, 0) AS refund_pending_cents,
            o.fulfillment_note AS note, o.created_at
     FROM orders o JOIN order_items oi ON oi.order_id = o.id
     LEFT JOIN payment_references pr ON pr.order_id = o.id AND pr.status = 'succeeded'
     WHERE o.date BETWEEN $1::date AND $2::date
     ORDER BY o.date, o.seq, oi.product_id`,
    [from, to],
  )
  const money = (c: unknown) => (Number(c) / 100).toFixed(2)
  const when = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? String(v) : '')
  const lines = [EXPORT_COLUMNS.join(',')]
  for (const r of rows) {
    if (!(PRODUCT_IDS as readonly string[]).includes(String(r.product))) continue
    lines.push(
      [r.pickup_date, r.order, r.name, r.phone, r.product, r.quantity, money(r.unit_price_cents), money(r.total_cents), r.status, r.provider, when(r.paid_at), r.fulfillment, when(r.picked_up_at), money(r.refunded_cents), money(r.refund_pending_cents), r.note, when(r.created_at)]
        .map(csvCell)
        .join(','),
    )
  }
  return lines.join('\n') + '\n'
}
