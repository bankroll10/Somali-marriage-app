import { PRODUCT_IDS, type ProductId } from '../../shared/config.ts'
import type { Clock } from '../../shared/clock.ts'
import type { Order, PaymentProvider, Qty } from '../../shared/types.ts'
import { zeroQty } from '../../shared/types.ts'
import type { Db, Queryable } from './db/client.ts'
import type { CleanCheckout } from './validate.ts'

/**
 * The ordering rules, as transactions against Postgres.
 *
 * The invariant: for every (date, product), date_inventory.committed equals
 * the units of that date's orders that are reserved or paid, and never
 * exceeds capacity + overflow. The CHECK constraint enforces the second half
 * whatever this code does; the first half holds because every change to
 * committed and every exit from `reserved` happens inside one transaction
 * that first locks the date's pickup_dates row.
 *
 * Reads never lock and never write. A Zelle hold that has lapsed but not yet
 * been swept is *reported* as free and its order as expired; the sweep itself
 * runs on the next write to that date, under the lock.
 *
 * A Stripe-backed hold is never released by time — not by the sweep, not by
 * the availability query, not by the order page. A Checkout Session can
 * still complete until Stripe says otherwise, so those holds are released
 * only by netlify/lib/stripe/payments.ts after confirming with Stripe.
 */

// ── Rows ───────────────────────────────────────────────────────────────────

export interface ProductRow {
  id: string
  name: string
  blurb: string
  price_cents: number
  daily_capacity: number
  sort_order: number
  active: boolean
}

interface OrderRow {
  id: string
  provider: PaymentProvider
  date: string
  status: Order['status']
  customer_name: string
  customer_phone: string
  total_cents: number
  hold_expires_ms: number
  created_ms: number
  paid_ms: number | null
  picked_up_ms: number | null
  forced: boolean
  items: string // json
}

const ORDER_SELECT = `
  SELECT o.id, o.provider, o.date::text AS date, o.status, o.customer_name, o.customer_phone, o.total_cents,
         extract(epoch FROM o.hold_expires_at)::float8 * 1000 AS hold_expires_ms,
         extract(epoch FROM o.created_at)::float8 * 1000 AS created_ms,
         extract(epoch FROM o.paid_at)::float8 * 1000 AS paid_ms,
         extract(epoch FROM o.picked_up_at)::float8 * 1000 AS picked_up_ms,
         o.forced,
         COALESCE((SELECT json_agg(json_build_object('p', oi.product_id, 'q', oi.quantity))
                   FROM order_items oi WHERE oi.order_id = o.id), '[]')::text AS items
  FROM orders o`

const iso = (ms: number | null) => (ms === null ? undefined : new Date(Math.round(ms)).toISOString())

function toOrder(row: OrderRow, nowMs: number): Order {
  const qty = zeroQty()
  for (const { p, q } of JSON.parse(row.items) as { p: string; q: number }[]) {
    if ((PRODUCT_IDS as readonly string[]).includes(p)) qty[p as ProductId] = q
  }
  const lapsed = row.provider === 'zelle' && row.status === 'reserved' && Math.round(row.hold_expires_ms) <= nowMs
  const order: Order = {
    id: row.id,
    provider: row.provider,
    date: row.date,
    name: row.customer_name,
    phone: row.customer_phone,
    qty,
    amountCents: row.total_cents,
    // A lapsed hold reads as expired everywhere, whether or not the sweep
    // has caught up with it yet.
    status: lapsed ? 'expired' : row.status,
    createdAt: iso(row.created_ms)!,
    holdExpiresAt: iso(row.hold_expires_ms)!,
  }
  if (row.paid_ms !== null) order.paidAt = iso(row.paid_ms)
  if (row.picked_up_ms !== null) order.pickedUpAt = iso(row.picked_up_ms)
  if (row.forced) order.forced = true
  return order
}

/** Thrown inside a transaction to roll it back and answer with a reason. */
export class Refusal<T> extends Error {
  readonly outcome: T
  constructor(outcome: T) {
    super('refused')
    this.outcome = outcome
  }
}

const lines = (qty: Qty) =>
  [...PRODUCT_IDS]
    .filter((id) => qty[id] > 0)
    .sort()
    .map((id) => ({ id, q: qty[id] }))

// ── Reads ──────────────────────────────────────────────────────────────────

export async function listProducts(db: Queryable): Promise<ProductRow[]> {
  const { rows } = await db.query<ProductRow>('SELECT id, name, blurb, price_cents, daily_capacity, sort_order, active FROM products ORDER BY sort_order, id')
  return rows
}

export interface DateStock {
  blocked: boolean
  remaining: Qty
}

/**
 * What is left for each date, in one statement so every date is read at one
 * snapshot. A date nobody has touched yet reads as full capacity. Lapsed
 * holds count as free without being written.
 */
export async function stockFor(db: Queryable, dates: readonly string[], nowMs: number): Promise<Map<string, DateStock>> {
  const out = new Map<string, DateStock>()
  if (dates.length === 0) return out
  const { rows } = await db.query<{ date: string; product_id: string; blocked: boolean; remaining: number }>(
    `WITH d AS (SELECT unnest(string_to_array($1, ','))::date AS date),
          stale AS (
            SELECT o.date, oi.product_id, SUM(oi.quantity)::int AS units
            FROM orders o JOIN order_items oi ON oi.order_id = o.id
            WHERE o.status = 'reserved' AND o.provider = 'zelle' AND o.hold_expires_at <= $2::timestamptz
              AND o.date IN (SELECT date FROM d)
            GROUP BY o.date, oi.product_id)
     SELECT d.date::text AS date, p.id AS product_id,
            (pd.blocked_at IS NOT NULL) AS blocked,
            GREATEST(0, COALESCE(di.capacity, p.daily_capacity) - COALESCE(di.committed, 0) + COALESCE(s.units, 0))::int AS remaining
     FROM d CROSS JOIN products p
     LEFT JOIN pickup_dates pd ON pd.date = d.date
     LEFT JOIN date_inventory di ON di.date = d.date AND di.product_id = p.id
     LEFT JOIN stale s ON s.date = d.date AND s.product_id = p.id
     WHERE p.active`,
    [dates.join(','), new Date(nowMs).toISOString()],
  )
  for (const r of rows) {
    const entry = out.get(r.date) ?? { blocked: r.blocked, remaining: zeroQty() }
    if ((PRODUCT_IDS as readonly string[]).includes(r.product_id)) entry.remaining[r.product_id as ProductId] = r.remaining
    out.set(r.date, entry)
  }
  return out
}

export async function readOrder(db: Queryable, id: string, nowMs: number): Promise<Order | null> {
  const { rows } = await db.query<OrderRow>(`${ORDER_SELECT} WHERE o.id = $1::uuid`, [id])
  return rows[0] ? toOrder(rows[0], nowMs) : null
}

/** Every order ever placed for a date, oldest first — lapsed and cancelled ones included, so a late Zelle can still be confirmed. */
export async function ordersForDate(db: Queryable, date: string, nowMs: number): Promise<Order[]> {
  const { rows } = await db.query<OrderRow>(`${ORDER_SELECT} WHERE o.date = $1::date ORDER BY o.seq`, [date])
  return rows.map((r) => toOrder(r, nowMs))
}

/** Units she has actually been paid for, per product. */
export async function paidUnits(db: Queryable, date: string): Promise<Qty> {
  const { rows } = await db.query<{ product_id: string; units: number }>(
    `SELECT oi.product_id, SUM(oi.quantity)::int AS units FROM orders o JOIN order_items oi ON oi.order_id = o.id
     WHERE o.date = $1::date AND o.status = 'paid' GROUP BY oi.product_id`,
    [date],
  )
  const out = zeroQty()
  for (const r of rows) if ((PRODUCT_IDS as readonly string[]).includes(r.product_id)) out[r.product_id as ProductId] = r.units
  return out
}

// ── Inside a transaction, under the date lock ──────────────────────────────

export async function lockDate(tx: Queryable, date: string): Promise<{ blocked: boolean }> {
  await tx.query('INSERT INTO pickup_dates (date) VALUES ($1::date) ON CONFLICT (date) DO NOTHING', [date])
  const { rows } = await tx.query<{ blocked: boolean }>('SELECT (blocked_at IS NOT NULL) AS blocked FROM pickup_dates WHERE date = $1::date FOR UPDATE', [date])
  return rows[0]
}

/** Expire this date's lapsed Zelle holds and give their units back. Double-running is a no-op. */
export async function sweep(tx: Queryable, date: string, nowMs: number): Promise<void> {
  const now = new Date(nowMs).toISOString()
  await tx.query(
    `WITH e AS (
       UPDATE orders SET status = 'expired', ended_at = $2::timestamptz
       WHERE date = $1::date AND status = 'reserved' AND provider = 'zelle' AND hold_expires_at <= $2::timestamptz
       RETURNING id),
     u AS (
       SELECT oi.product_id, SUM(oi.quantity)::int AS n FROM order_items oi
       WHERE oi.order_id IN (SELECT id FROM e) GROUP BY oi.product_id)
     UPDATE date_inventory di SET committed = di.committed - u.n
     FROM u WHERE di.date = $1::date AND di.product_id = u.product_id`,
    [date, now],
  )
}

export async function ensureInventory(tx: Queryable, date: string): Promise<void> {
  await tx.query(
    `INSERT INTO date_inventory (date, product_id, capacity)
     SELECT $1::date, id, daily_capacity FROM products WHERE active
     ON CONFLICT (date, product_id) DO NOTHING`,
    [date],
  )
}

/**
 * Take `q` units of one product, only if they are there. The WHERE makes
 * this a no-op rather than an error when they are not; the CHECK constraint
 * behind it would refuse anyway.
 */
export async function take(tx: Queryable, date: string, productId: string, q: number, allowOverflow: boolean): Promise<boolean> {
  const { rows } = await tx.query(
    `UPDATE date_inventory SET committed = committed + $3
     WHERE date = $1::date AND product_id = $2 AND committed + $3 <= capacity ${allowOverflow ? '+ overflow' : ''}
     RETURNING committed`,
    [date, productId, q],
  )
  return rows.length === 1
}

export async function remainingNow(tx: Queryable, date: string, nowMs: number): Promise<Qty> {
  return (await stockFor(tx, [date], nowMs)).get(date)?.remaining ?? zeroQty()
}

// ── Writes ─────────────────────────────────────────────────────────────────

export type ReserveOutcome =
  | { ok: true; order: Order; replayed: boolean }
  | { ok: false; reason: 'blocked' }
  | { ok: false; reason: 'sold_out'; remaining: Qty }

/**
 * Reserve a whole cart for one date, or none of it.
 *
 * Runs under the date lock so competing carts are decided one at a time;
 * each line is taken with a guarded UPDATE, and the first line that cannot
 * be taken rolls the whole transaction back. A repeated request with the
 * same checkout key returns the order it already made.
 */
export interface HoldTerms {
  provider: PaymentProvider
  /** When the hold lapses (Zelle) or when to ask Stripe about it (Stripe). ISO. */
  holdExpiresAt: string
  /** Stripe only: when the Checkout Session will expire. ISO. */
  sessionExpiresAt?: string
}

export async function reserve(db: Db, input: CleanCheckout, products: readonly ProductRow[], clock: Clock, terms: HoldTerms): Promise<ReserveOutcome> {
  const nowMs = clock.now()
  const now = new Date(nowMs).toISOString()
  const priceOf = new Map(products.map((p) => [p.id, p.price_cents]))
  try {
    return await db.transaction(async (tx) => {
      const { blocked } = await lockDate(tx, input.date)
      if (blocked) throw new Refusal<ReserveOutcome>({ ok: false, reason: 'blocked' })

      const replay = await tx.query<{ id: string }>('SELECT id FROM orders WHERE checkout_key = $1::uuid', [input.checkoutKey])
      if (replay.rows[0]) {
        const order = await readOrder(tx, replay.rows[0].id, nowMs)
        throw new Refusal<ReserveOutcome>({ ok: true, order: order!, replayed: true })
      }

      await sweep(tx, input.date, nowMs)
      await ensureInventory(tx, input.date)
      // What was there before this cart touched anything: the honest answer
      // if any line of it cannot be had.
      const before = await remainingNow(tx, input.date, nowMs)
      for (const { id, q } of lines(input.qty)) {
        if (!(await take(tx, input.date, id, q, false))) {
          throw new Refusal<ReserveOutcome>({ ok: false, reason: 'sold_out', remaining: before })
        }
      }

      const id = crypto.randomUUID()
      const total = lines(input.qty).reduce((sum, l) => sum + l.q * (priceOf.get(l.id) ?? 0), 0)
      await tx.query(
        `INSERT INTO orders (id, provider, date, status, customer_name, customer_phone, total_cents, hold_expires_at, created_at, checkout_key)
         VALUES ($1::uuid, $9, $2::date, 'reserved', $3, $4, $5, $6::timestamptz, $7::timestamptz, $8::uuid)`,
        [id, input.date, input.name, input.phone, total, terms.holdExpiresAt, now, input.checkoutKey, terms.provider],
      )
      for (const { id: productId, q } of lines(input.qty)) {
        await tx.query('INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES ($1::uuid, $2, $3, $4)', [id, productId, q, priceOf.get(productId)])
      }
      if (terms.provider === 'stripe') {
        // The session id is filled in once Stripe has made it; the
        // idempotency key is the order id, so a retried create is the same create.
        await tx.query(
          `INSERT INTO payment_references (order_id, provider, external_id, idempotency_key, status, amount_cents, session_expires_at, created_at, updated_at)
           VALUES ($1::uuid, 'stripe', NULL, $2, 'pending', $3, $4::timestamptz, $5::timestamptz, $5::timestamptz)`,
          [id, id, total, terms.sessionExpiresAt, now],
        )
      } else {
        await tx.query(
          `INSERT INTO payment_references (order_id, provider, external_id, idempotency_key, status, amount_cents, created_at, updated_at)
           VALUES ($1::uuid, 'zelle', $2, $2, 'pending', $3, $4::timestamptz, $4::timestamptz)`,
          [id, `zelle:${id}`, total, now],
        )
      }
      const order = await readOrder(tx, id, nowMs)
      return { ok: true, order: order!, replayed: false } satisfies ReserveOutcome
    })
  } catch (err) {
    if (err instanceof Refusal) return err.outcome as ReserveOutcome
    throw err
  }
}

export type ConfirmOutcome =
  | { ok: true; order: Order }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'would_exceed_capacity'; remaining: Qty }

/**
 * She has seen the payment land. A reserved order — even one whose hold has
 * lapsed but not been swept, whose units are therefore still committed —
 * simply becomes paid. An expired or cancelled order has given its units
 * back, so they are taken again if there is room; if there is not, she is
 * told, unless she `force`s it, which records the extra she has agreed to
 * bake as that date's overflow.
 */
export async function markPaid(db: Db, orderId: string, clock: Clock, force: boolean, by: string): Promise<ConfirmOutcome> {
  const nowMs = clock.now()
  const now = new Date(nowMs).toISOString()
  const located = await db.query<{ date: string }>('SELECT date::text AS date FROM orders WHERE id = $1::uuid', [orderId])
  if (!located.rows[0]) return { ok: false, reason: 'not_found' }
  const date = located.rows[0].date
  try {
    return await db.transaction(async (tx) => {
      await lockDate(tx, date)
      const { rows } = await tx.query<{ status: Order['status'] }>('SELECT status FROM orders WHERE id = $1::uuid FOR UPDATE', [orderId])
      if (!rows[0]) throw new Refusal<ConfirmOutcome>({ ok: false, reason: 'not_found' })
      const status = rows[0].status
      let forced = false

      if (status === 'paid') {
        const order = await readOrder(tx, orderId, nowMs)
        throw new Refusal<ConfirmOutcome>({ ok: true, order: order! })
      }

      if (status !== 'reserved') {
        // The units went back into the pool when this expired or was cancelled.
        await sweep(tx, date, nowMs)
        await ensureInventory(tx, date)
        const before = await remainingNow(tx, date, nowMs)
        const items = await tx.query<{ product_id: string; quantity: number }>('SELECT product_id, quantity FROM order_items WHERE order_id = $1::uuid ORDER BY product_id', [orderId])
        for (const { product_id, quantity } of items.rows) {
          if (await take(tx, date, product_id, quantity, true)) continue
          if (!force) throw new Refusal<ConfirmOutcome>({ ok: false, reason: 'would_exceed_capacity', remaining: before })
          await tx.query(
            `UPDATE date_inventory SET overflow = overflow + (committed + $3 - capacity - overflow), committed = committed + $3
             WHERE date = $1::date AND product_id = $2`,
            [date, product_id, quantity],
          )
          forced = true
        }
      }

      await tx.query('UPDATE orders SET status = $2, paid_at = $3::timestamptz, ended_at = NULL, forced = forced OR $4 WHERE id = $1::uuid', [orderId, 'paid', now, forced])
      // A hand confirmation never claims a Stripe session was paid: an open
      // Stripe reference is closed and a manual one recorded instead.
      await tx.query("UPDATE payment_references SET status = 'expired', updated_at = $2::timestamptz WHERE order_id = $1::uuid AND provider = 'stripe' AND status = 'pending'", [orderId, now])
      const pending = await tx.query<{ id: number }>(
        `UPDATE payment_references SET status = 'succeeded', confirmed_by = $2, updated_at = $3::timestamptz
         WHERE order_id = $1::uuid AND provider = 'zelle' AND status = 'pending' RETURNING id`,
        [orderId, by, now],
      )
      if (!pending.rows[0]) {
        // A late confirmation after the reference was closed: a fresh, distinct one.
        const { rows: n } = await tx.query<{ n: number }>('SELECT count(*)::int AS n FROM payment_references WHERE order_id = $1::uuid', [orderId])
        const key = `zelle:${orderId}:${n[0].n + 1}`
        await tx.query(
          `INSERT INTO payment_references (order_id, provider, external_id, idempotency_key, status, amount_cents, confirmed_by, created_at, updated_at)
           SELECT $1::uuid, 'zelle', $2, $2, 'succeeded', total_cents, $3, $4::timestamptz, $4::timestamptz FROM orders WHERE id = $1::uuid`,
          [orderId, key, by, now],
        )
      }
      const order = await readOrder(tx, orderId, nowMs)
      return { ok: true, order: order! } satisfies ConfirmOutcome
    })
  } catch (err) {
    if (err instanceof Refusal) return err.outcome as ConfirmOutcome
    throw err
  }
}

/** She cancels a reservation. Anything not reserved is left exactly as it is. */
export async function cancel(db: Db, orderId: string, clock: Clock): Promise<Order | null> {
  const nowMs = clock.now()
  const now = new Date(nowMs).toISOString()
  const located = await db.query<{ date: string }>('SELECT date::text AS date FROM orders WHERE id = $1::uuid', [orderId])
  if (!located.rows[0]) return null
  const date = located.rows[0].date
  return db.transaction(async (tx) => {
    await lockDate(tx, date)
    const { rows } = await tx.query<{ status: string }>('SELECT status FROM orders WHERE id = $1::uuid FOR UPDATE', [orderId])
    if (rows[0]?.status === 'reserved') {
      await tx.query("UPDATE orders SET status = 'cancelled', ended_at = $2::timestamptz WHERE id = $1::uuid", [orderId, now])
      await tx.query(
        `UPDATE date_inventory di SET committed = di.committed - oi.quantity
         FROM order_items oi WHERE oi.order_id = $1::uuid AND di.date = $2::date AND di.product_id = oi.product_id`,
        [orderId, date],
      )
      await tx.query("UPDATE payment_references SET status = 'expired', updated_at = $2::timestamptz WHERE order_id = $1::uuid AND status = 'pending'", [orderId, now])
    }
    return readOrder(tx, orderId, nowMs)
  })
}

export async function setBlocked(db: Db, date: string, blocked: boolean, clock: Clock, reason?: string): Promise<void> {
  const now = new Date(clock.now()).toISOString()
  await db.query(
    `INSERT INTO pickup_dates (date, blocked_at, blocked_reason) VALUES ($1::date, $2::timestamptz, $3)
     ON CONFLICT (date) DO UPDATE SET blocked_at = EXCLUDED.blocked_at, blocked_reason = EXCLUDED.blocked_reason`,
    [date, blocked ? now : null, blocked ? (reason ?? null) : null],
  )
}

export async function setPickedUp(db: Db, orderId: string, pickedUp: boolean, clock: Clock): Promise<Order | null> {
  const nowMs = clock.now()
  await db.query('UPDATE orders SET picked_up_at = $2::timestamptz WHERE id = $1::uuid', [orderId, pickedUp ? new Date(nowMs).toISOString() : null])
  return readOrder(db, orderId, nowMs)
}
