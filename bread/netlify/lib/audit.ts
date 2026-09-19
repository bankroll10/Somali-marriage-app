import type { Queryable } from './db/client.ts'

/** Every admin write, on the record: who, what, which order or date, and the details that mattered. */
export async function recordAction(
  db: Queryable,
  entry: { actor: string; action: string; orderId?: string; date?: string; detail?: Record<string, unknown> },
  nowMs: number,
): Promise<void> {
  await db.query('INSERT INTO admin_actions (at, actor, action, order_id, date, detail) VALUES ($1::timestamptz, $2, $3, $4::uuid, $5::date, $6::jsonb)', [
    new Date(nowMs).toISOString(),
    entry.actor,
    entry.action,
    entry.orderId ?? null,
    entry.date ?? null,
    JSON.stringify(entry.detail ?? {}),
  ])
}
