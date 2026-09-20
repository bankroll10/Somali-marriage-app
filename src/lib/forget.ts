import { rememberedCode } from './keep'
import { rememberedInstallId } from './progress'
import { clearProgress, loadProgress } from './storage'
import { send } from './net'

/**
 * Forget me.
 *
 * One action, three deletes and a clean phone. Her kept map and everything
 * chained to it go by her map code; the count of her steps goes by her install
 * code; the eleven she sent him goes by its own couple code; then every key
 * this app ever wrote to this phone is removed. What is left is what was never
 * hers to begin with: a tally with no code in it.
 *
 * The couple code is deleted on its own because the map cascade could not
 * reach it. `createCouple` needs no map code, and the cascade in
 * netlify/functions/keep.ts finds the couple code inside a kept snapshot — so
 * a woman who sent him the eleven, kept nothing, and tapped this was told it
 * was done while both sheets sat on the server for the rest of the ninety
 * days. Trust says "deletes ... the eleven you sent him" without a condition,
 * and now that is true of her too (docs/BOARD.md).
 *
 * Each server call is best-effort and reported honestly — a 404 means it was
 * already gone, which is the same as done. The local wipe happens whatever
 * the server said: her phone is hers, and it is the one thing we can
 * guarantee.
 */

const KEEP = '/.netlify/functions/keep'
const PROGRESS = '/.netlify/functions/progress'
const COUPLE = '/.netlify/functions/couple'

/** Every key this app writes. Kept in one place so nothing is left behind. */
export const LOCAL_KEYS = [
  'niyyah.intake.v1',
  'niyyah.keep.code.v1',
  'niyyah.install.v1',
  'niyyah.via.v1',
  'niyyah.waitlist.queue.v1',
  'niyyah.events.v1',
  // A read or an eleven she was part-way through — see src/lib/draft.ts.
  // Forget me promises the phone is cleared, and this is on the phone.
  'niyyah.draft.v1',
]

async function del(url: string): Promise<boolean> {
  const res = await send(url, { method: 'DELETE' })
  // A 404 is success: there was nothing there to forget.
  return !!res && (res.ok || res.status === 404)
}

export interface Forgotten {
  /** The kept map and everything under its code — or true when there was none. */
  map: boolean
  /** The count of her steps — or true when this phone never had a code. */
  progress: boolean
  /** The eleven she sent him — or true when she never sent one. */
  couple: boolean
}

export async function forgetMe(): Promise<Forgotten> {
  const code = rememberedCode()
  const id = rememberedInstallId()
  // Read before the phone is wiped. A 404 from any of the three means it was
  // already gone — the map cascade may well have taken the couple with it —
  // which is the same as done.
  const pair = loadProgress()?.couple?.code
  const [map, progress, couple] = await Promise.all([
    code ? del(`${KEEP}?code=${encodeURIComponent(code)}`) : Promise.resolve(true),
    id ? del(`${PROGRESS}?id=${encodeURIComponent(id)}`) : Promise.resolve(true),
    pair ? del(`${COUPLE}?code=${encodeURIComponent(pair)}`) : Promise.resolve(true),
  ])
  clearProgress()
  for (const key of LOCAL_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* storage refused; there is nothing more to do than try */
    }
  }
  return { map, progress, couple }
}
