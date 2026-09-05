/**
 * Reporting a rung — the client half of netlify/functions/progress.ts.
 *
 * Two rules hold this file honest. It sends rung ids, what kind of link first
 * brought this install here, and — for a few rungs — how they came out, in
 * words from closed lists (src/lib/facts.ts), and nothing else, because that
 * is all the types allow and all the server accepts. And it sends them under
 * a code this device made up for itself, which is deliberately NOT the code
 * her kept map lives under — so nobody, us included, can walk from a map to a
 * timeline.
 *
 * Every failure is silent and changes nothing. The app has never depended on
 * this and must never start: not being counted is our problem, not hers.
 */
import type { RungId } from './rungs'
import { VIAS, type Via } from './entry'
import type { Facts } from './facts'

const ENDPOINT = '/.netlify/functions/progress'
const TIMEOUT_MS = 8_000

/** Its own key, deliberately far away from niyyah.keep.code.v1. */
const ID_KEY = 'niyyah.install.v1'
/** What kind of link first brought this install here. Its own key too. */
const VIA_KEY = 'niyyah.via.v1'

/**
 * Remember what kind of link brought this person here — words a friend sent,
 * the eleven, a couple's link, the door, a family link. First arrival wins and
 * it is never overwritten: the question is how she found this, not how she
 * last opened it. Never who sent it; the link does not carry that.
 */
export function rememberVia(via: Via): void {
  try {
    if (!localStorage.getItem(VIA_KEY)) localStorage.setItem(VIA_KEY, via)
  } catch {
    // Storage refused. Not being attributed is our problem, not hers.
  }
}

/** The remembered via, validated on the way out so a stale value can never be sent. */
export function rememberedVia(): Via | null {
  try {
    const raw = localStorage.getItem(VIA_KEY)
    return raw && (VIAS as string[]).includes(raw) ? (raw as Via) : null
  } catch {
    return null
  }
}

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
export async function reportRungs(rungs: RungId[], scene?: string, facts?: Facts): Promise<void> {
  const id = installId()
  if (!id || rungs.length === 0) return
  const some = facts && Object.keys(facts).length > 0 ? facts : undefined
  // The facts are part of the signature: a re-render with the same facts posts
  // nothing, and a new fact — a read taken, a conversation confirmed — posts once.
  const signature = `${scene ?? ''}:${rungs.join(',')}:${some ? JSON.stringify(some) : ''}`
  if (signature === lastSent) return
  lastSent = signature

  // Sent on every report, not once: the first POST may fail offline, and the
  // server keeps the first via it was ever told, so repeating it changes nothing.
  const via = rememberedVia()
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        rungs,
        ...(scene ? { scene } : {}),
        ...(via ? { via } : {}),
        ...(some ? { facts: some } : {}),
      }),
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
