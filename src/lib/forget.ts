import { rememberedCode } from './keep'
import { rememberedInstallId } from './progress'
import { clearProgress } from './storage'

/**
 * Forget me.
 *
 * One action, two deletes and a clean phone. Her kept map and everything
 * chained to it go by her map code; the count of her steps goes by her install
 * code; then every key this app ever wrote to this phone is removed. What is
 * left is what was never hers to begin with: a tally with no code in it.
 *
 * Each server call is best-effort and reported honestly — a 404 means it was
 * already gone, which is the same as done. The local wipe happens whatever
 * the server said: her phone is hers, and it is the one thing we can
 * guarantee.
 */

const KEEP = '/.netlify/functions/keep'
const PROGRESS = '/.netlify/functions/progress'
const TIMEOUT_MS = 10_000

/** Every key this app writes. Kept in one place so nothing is left behind. */
export const LOCAL_KEYS = [
  'niyyah.intake.v1',
  'niyyah.keep.code.v1',
  'niyyah.install.v1',
  'niyyah.via.v1',
  'niyyah.waitlist.queue.v1',
  'niyyah.events.v1',
]

async function del(url: string): Promise<boolean> {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { method: 'DELETE', signal: abort.signal })
    return res.ok || res.status === 404
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export interface Forgotten {
  /** The kept map and everything under its code — or true when there was none. */
  map: boolean
  /** The count of her steps — or true when this phone never had a code. */
  progress: boolean
}

export async function forgetMe(): Promise<Forgotten> {
  const code = rememberedCode()
  const id = rememberedInstallId()
  const [map, progress] = await Promise.all([
    code ? del(`${KEEP}?code=${encodeURIComponent(code)}`) : Promise.resolve(true),
    id ? del(`${PROGRESS}?id=${encodeURIComponent(id)}`) : Promise.resolve(true),
  ])
  clearProgress()
  for (const key of LOCAL_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* storage refused; there is nothing more to do than try */
    }
  }
  return { map, progress }
}
