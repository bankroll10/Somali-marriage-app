import { day } from '../../netlify/shared/day'
import { holdPending, rememberIntro } from '../../src/lib/introduce'
import type { Phone } from './device'
import { blobs } from './server'

/**
 * Seeding an introduction request that already exists (docs/TESTING.md).
 *
 * New requests are closed (docs/DECISIONS.md, release R3), so nothing the app
 * does writes one. What a phone and the server can still hold is what an earlier
 * request left, and these build exactly that, directly:
 *
 *  - `seedRecord`: the record under its code on the server, as the route wrote
 *    it while it was open (the contact is a test address, never a real one).
 *  - `seedReceipt` / `seedPending`: this phone's own keys, the receipt and the
 *    attempt whose answer never came.
 *  - `holdReceiptInPage` / `holdPendingInPage`: the same two, for a browser that
 *    refuses to store them, which then live only in the page. They use the
 *    lib's own writers under a phone that refuses `niyyah.intro*`, so the page
 *    copy is built the way production built it.
 *
 * Replacing these with a request made through the screen is not possible and
 * not wanted: the recovery they test is for codes that are already held.
 */

export const RECEIPT_KEY = 'niyyah.intro.v1'
export const PENDING_KEY = 'niyyah.intro.pending.v1'

/** A record as the route left it. */
export const introRecord = (over: Record<string, unknown> = {}) => ({
  contact: 'zq.seeded@example.test',
  firstName: 'Sagal',
  gender: 'woman',
  scene: 'twin-cities',
  country: 'us',
  reach: 'city',
  at: day(),
  v: 1,
  ...over,
})

export function seedRecord(code: string, over: Record<string, unknown> = {}): void {
  blobs.put('introductions', code, introRecord(over))
}

/** The receipt this phone holds. `removeOn` is only there on a receipt from a build that had the server's second day. */
export function seedReceipt(phone: Phone, code: string, at = day(), removeOn?: string): void {
  phone.storage.set(RECEIPT_KEY, JSON.stringify({ code, at, ...(removeOn ? { removeOn } : {}) }))
}

export function seedPending(phone: Phone, code: string, at = day()): void {
  phone.storage.set(PENDING_KEY, JSON.stringify({ code, at }))
}

/** A receipt only this page holds: storage refuses it. The phone keeps refusing afterwards. */
export function holdReceiptInPage(phone: Phone, code: string, at = day(), removeOn?: string): void {
  phone.refuse(/^niyyah\.intro/)
  rememberIntro({ code, at, ...(removeOn ? { removeOn } : {}), confirmed: !!removeOn })
}

/** An attempt only this page holds: storage refuses it. The phone keeps refusing afterwards. */
export function holdPendingInPage(phone: Phone, code: string, at = day()): void {
  phone.refuse(/^niyyah\.intro/)
  holdPending(code, at)
}

/** Introduction records, without the withdrawal markers beside them. */
export const records = () => blobs.keys('introductions').filter((k) => !k.startsWith('withdrawn/'))
/** Withdrawal markers, as `withdrawn/<code>/<day>`. */
export const markers = () => blobs.keys('introductions').filter((k) => k.startsWith('withdrawn/'))
