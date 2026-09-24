import type { getStore } from '@netlify/blobs'
import { day } from './day'
import { mint } from './code'
import { stamp } from './record'

/**
 * The few rules every multi-step write here is built from (docs/INTEGRITY.md).
 *
 * Netlify Blobs has no transactions. It has a write that only lands on a key
 * that does not exist (`onlyIfNew`), a write that only lands on the version
 * you read (`onlyIfMatch`), and a delete that always lands. Everything that
 * touches more than one key is therefore a sequence, any step of which can
 * fail after the ones before it succeeded, or be overtaken by another request.
 * These are the pieces that make each sequence either finish on a retry or be
 * reconciled by the weekly sweep, instead of leaving a map nobody can reach or
 * a code that comes back after she forgot it.
 *
 * Shared, not a function — see netlify/shared/founder.ts for why this lives
 * beside `netlify/functions` rather than in it.
 */

type Store = ReturnType<typeof getStore>

/** A kept map — the `maps` store's record. */
export interface KeptMap {
  /** Everything the app needs to restore her, as written by lib/storage.ts. */
  snapshot: unknown
  createdAt: string
  expiresAt: string
  /**
   * How many times it has been kept. A phone sends the one it last saw, and a
   * phone that has not seen the latest cannot write over it — see keep.ts.
   * Absent on maps kept before 2026-09-24, and read as 0.
   */
  rev?: number
  /**
   * The first keep's once key, when there was one — so forgetting the map, or
   * moving it, can take `once/<key>` with it rather than leave a pointer to
   * her code for a day (tests/invariants/delete-means-deleted.test.ts).
   */
  once?: string
}

export const DAY_MS = 24 * 60 * 60 * 1000
/** A kept map, a tombstone: a year. */
export const YEAR_MS = 365 * DAY_MS

/** Whether a record with an `expiresAt` has passed it. A record without one never has. */
export const lapsed = (record: { expiresAt?: unknown } | null, now = Date.now()) =>
  !!record && typeof record.expiresAt === 'string' && Date.parse(record.expiresAt) < now

// ─── Tombstones ────────────────────────────────────────────────────────────
// What a code leaves behind in `maps` when it stops opening anything: a
// reason, and the day it may be forgotten itself. Nothing about her, and —
// for a code she changed — never the new one: pointing the old code at the
// new would undo the whole point of changing it.

export type EndedWhy = 'moved' | 'forgotten'

const ENDED = 'ended/'
export const endedKey = (code: string) => `${ENDED}${code}`

/** Why a code no longer opens anything, or null if it still may. */
export async function ended(maps: Store, code: string): Promise<EndedWhy | null> {
  const record = (await maps.get(endedKey(code), { type: 'json' })) as { why?: unknown } | null
  return record?.why === 'moved' || record?.why === 'forgotten' ? record.why : null
}

/** Close a code. Idempotent: a second write says the same thing. */
export async function tombstone(maps: Store, code: string, why: EndedWhy, now = Date.now()): Promise<void> {
  await maps.setJSON(endedKey(code), stamp({ why, expiresAt: day(now + YEAR_MS) }))
}

// ─── Journals ──────────────────────────────────────────────────────────────
// A code being changed writes down where it is going before it copies
// anything, so a retry resumes the same move instead of starting a second
// one, and the sweep can roll an abandoned one back.

const MOVING = 'moving/'
export const movingKey = (code: string) => `${MOVING}${code}`
export const isMoving = (key: string) => key.startsWith(MOVING)

export interface Journal {
  to: string
  at: string
}

// ─── Once keys ─────────────────────────────────────────────────────────────
// A first keep carries a key minted on her phone and reused until some
// attempt comes back with a code, so a double tap or a reply lost on the way
// is one map rather than two.

const ONCE = 'once/'
export const onceKey = (id: string) => `${ONCE}${id}`

/** True for keys in `maps` that are not a map: tombstones, journals, once keys. */
export const isBookkeeping = (key: string) => key.startsWith(ENDED) || key.startsWith(MOVING) || key.startsWith(ONCE)

// ─── Deleting what may have changed ───────────────────────────────────────

/**
 * Delete a key only if it is still the version that was read.
 *
 * Blobs has no conditional delete, so this re-reads the version and deletes
 * only if it matches. It narrows the race — a map read as lapsed, renewed by
 * its owner a moment later, then deleted anyway — from the whole of a sweep to
 * the gap between two calls. docs/INTEGRITY.md names that gap rather than
 * pretending it is closed.
 */
export async function deleteIfUnchanged(store: Store, key: string, etag: string | undefined): Promise<boolean> {
  const now = await store.getMetadata(key)
  if (!now || (etag !== undefined && now.etag !== etag)) return false
  await store.delete(key)
  return true
}

// ─── Minting around what is retired ───────────────────────────────────────

/**
 * Mint a code with `onlyIfNew`, treating any code `taken` says is spoken for
 * as a collision. A code that was forgotten or moved, or a pair code whose
 * sheet is gone but whose reports still name it, must never be handed to
 * somebody new.
 */
export function mintFree<T>(store: Store, value: T, taken: (code: string) => Promise<boolean>): Promise<string | null> {
  return mint(async (code: string, v: T) => {
    if (await taken(code)) return { modified: false }
    return store.setJSON(code, v, { onlyIfNew: true })
  }, value)
}
