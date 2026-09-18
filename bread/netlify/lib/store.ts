import { getStore } from '@netlify/blobs'
import type { DayRecord, Order } from '../../shared/types.ts'
import { zeroQty } from '../../shared/types.ts'

/**
 * One Netlify Blobs store, read with strong consistency and written with an
 * etag check. Blobs has no transactions, so every write to a day record goes
 * through `writeDay`, which refuses to overwrite a version it did not read.
 * That refusal is what makes "never sell more than capacity" true under two
 * customers checking out in the same second.
 */

export const STORE_NAME = 'bread'

export interface Versioned<T> {
  value: T
  /** undefined when the key does not exist yet. */
  etag: string | undefined
}

export type BreadStore = ReturnType<typeof getStore>

export function breadStore(): BreadStore {
  return getStore({ name: STORE_NAME, consistency: 'strong' })
}

export const dayKey = (date: string) => `day:${date}`
export const orderKey = (id: string) => `order:${id}`

export function emptyDay(date: string): DayRecord {
  return { date, blocked: false, holds: [], sold: zeroQty(), orderIds: [] }
}

export async function readDay(store: BreadStore, date: string): Promise<Versioned<DayRecord>> {
  const got = await store.getWithMetadata(dayKey(date), { type: 'json' })
  if (!got || !got.data) return { value: emptyDay(date), etag: undefined }
  return { value: got.data as DayRecord, etag: got.etag }
}

/**
 * Write a day record only if nobody else has since `etag` was read. Returns
 * false when the write lost the race; the caller re-reads and decides again.
 */
export async function writeDay(store: BreadStore, day: DayRecord, etag: string | undefined): Promise<boolean> {
  const body = JSON.stringify(day)
  const result = etag
    ? await store.set(dayKey(day.date), body, { onlyIfMatch: etag })
    : await store.set(dayKey(day.date), body, { onlyIfNew: true })
  return result.modified
}

export async function readOrder(store: BreadStore, id: string): Promise<Order | null> {
  const got = (await store.get(orderKey(id), { type: 'json' })) as Order | null
  return got ?? null
}

export async function writeOrder(store: BreadStore, order: Order): Promise<void> {
  await store.setJSON(orderKey(order.id), order)
}
