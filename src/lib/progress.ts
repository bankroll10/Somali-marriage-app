/**
 * Reporting a rung — the client half of netlify/functions/progress.ts.
 *
 * Two rules hold this file honest. It sends rung ids and nothing else, because
 * that is all the type allows and all the server accepts. And it sends them
 * under a code this device made up for itself, which is deliberately NOT the
 * code her kept map lives under — so nobody, us included, can walk from a map
 * to a timeline.
 *
 * Every failure is silent and changes nothing. The app has never depended on
 * this and must never start: not being counted is our problem, not hers.
 */
import type { RungId } from './rungs'

const ENDPOINT = '/.netlify/functions/progress'
const TIMEOUT_MS = 8_000

/** Its own key, deliberately far away from niyyah.keep.code.v1. */
const ID_KEY = 'niyyah.install.v1'

/** Same alphabet and length as netlify/functions/keep.ts — a different code. */
const ALPHABET = 'ACDEFGHJKMNPQRTWXY34789'
const ID_LENGTH = 6

function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

/**
 * This install's anonymous code, made on first use and kept after. Returns
 * null when storage refuses — a device that cannot remember an id is one we
 * would otherwise count again on every visit, so it is not counted at all.
 */
export function installId(): string | null {
  try {
    const existing = localStorage.getItem(ID_KEY)
    if (existing) return existing
    const id = newId()
    localStorage.setItem(ID_KEY, id)
    return id
  } catch {
    return null
  }
}

/** The last set reported from this tab, so a re-render never posts twice. */
let lastSent = ''

/**
 * Report the rungs reached. Fire-and-forget: the promise resolves either way
 * and the caller has nothing to do with the result.
 */
export async function reportRungs(rungs: RungId[], scene?: string): Promise<void> {
  const id = installId()
  if (!id || rungs.length === 0) return
  const signature = `${scene ?? ''}:${rungs.join(',')}`
  if (signature === lastSent) return
  lastSent = signature

  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, rungs, ...(scene ? { scene } : {}) }),
      signal: abort.signal,
    })
  } catch {
    // Unreachable, offline, or blocked. Nothing here is worth a retry.
  } finally {
    clearTimeout(timer)
  }
}

/** Test seam: forget what this tab has already sent. */
export function resetReported() {
  lastSent = ''
}
