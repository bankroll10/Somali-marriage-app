import { PRODUCTS, PRODUCT_IDS } from '../../shared/config.ts'
import type { DayRecord, Hold, Qty } from '../../shared/types.ts'
import { zeroQty } from '../../shared/types.ts'
import { readDay, writeDay, type BreadStore } from './store.ts'

/**
 * The inventory rules, as pure functions over a DayRecord, plus the one
 * read-modify-write loop that applies them against the store.
 */

const MAX_ATTEMPTS = 6

/** Holds that still count. An expired hold is simply ignored, then dropped on the next write. */
export function liveHolds(day: DayRecord, nowMs: number): Hold[] {
  return day.holds.filter((h) => Date.parse(h.expiresAt) > nowMs)
}

export function remaining(day: DayRecord, nowMs: number): Qty {
  const out = zeroQty()
  const holds = liveHolds(day, nowMs)
  for (const p of PRODUCTS) {
    const held = holds.reduce((n, h) => n + (h.qty[p.id] ?? 0), 0)
    out[p.id] = Math.max(0, p.capacityPerDay - (day.sold[p.id] ?? 0) - held)
  }
  return out
}

export function fits(day: DayRecord, qty: Qty, nowMs: number): boolean {
  const left = remaining(day, nowMs)
  return PRODUCT_IDS.every((id) => qty[id] <= left[id])
}

export type ReserveResult = { ok: true; day: DayRecord } | { ok: false; reason: 'sold_out' | 'blocked' | 'conflict' }

/**
 * Atomically change one day record. `mutate` returns the new record, or a
 * refusal. On a lost race the record is re-read and `mutate` runs again on
 * the fresh version, so it must be a pure decision.
 */
export async function updateDay(
  store: BreadStore,
  date: string,
  mutate: (day: DayRecord) => DayRecord | { refuse: 'sold_out' | 'blocked' },
): Promise<ReserveResult> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { value, etag } = await readDay(store, date)
    const next = mutate(structuredClone(value))
    if ('refuse' in next) return { ok: false, reason: next.refuse }
    if (await writeDay(store, next, etag)) return { ok: true, day: next }
  }
  return { ok: false, reason: 'conflict' }
}

/** Reserve `qty` for `orderId` until `expiresAt`. Fails if it would oversell. */
export function reserve(store: BreadStore, date: string, hold: Hold, nowMs: number): Promise<ReserveResult> {
  return updateDay(store, date, (day) => {
    if (day.blocked) return { refuse: 'blocked' }
    day.holds = liveHolds(day, nowMs).filter((h) => h.orderId !== hold.orderId)
    if (!fits(day, hold.qty, nowMs)) return { refuse: 'sold_out' }
    day.holds.push(hold)
    return day
  })
}

/**
 * The customer paid: the hold becomes a sale. Idempotent — a second call for
 * the same order changes nothing. If the hold had already expired (a slow
 * payment), the sale is still recorded: Stripe took the money, so she bakes it.
 */
export function confirm(store: BreadStore, date: string, orderId: string, qty: Qty, nowMs: number): Promise<ReserveResult> {
  return updateDay(store, date, (day) => {
    if (day.orderIds.includes(orderId)) return day
    day.holds = liveHolds(day, nowMs).filter((h) => h.orderId !== orderId)
    for (const id of PRODUCT_IDS) day.sold[id] = (day.sold[id] ?? 0) + qty[id]
    day.orderIds.push(orderId)
    return day
  })
}

/** The checkout was abandoned: give the bread back. Idempotent. */
export function release(store: BreadStore, date: string, orderId: string, nowMs: number): Promise<ReserveResult> {
  return updateDay(store, date, (day) => {
    day.holds = liveHolds(day, nowMs).filter((h) => h.orderId !== orderId)
    return day
  })
}

export function setBlocked(store: BreadStore, date: string, blocked: boolean, nowMs: number): Promise<ReserveResult> {
  return updateDay(store, date, (day) => {
    day.blocked = blocked
    day.holds = liveHolds(day, nowMs)
    return day
  })
}
