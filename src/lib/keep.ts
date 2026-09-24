import { loadProgress, saveProgress, type PersistedState } from './storage'
import { ALPHABET, cleanCode, isCode } from './code'
import { send } from './net'

/**
 * Keeping a map somewhere it can survive a lost phone.
 *
 * The client half of netlify/functions/keep.ts. Strictly opt-in: nothing here
 * runs unless she asks for it, because the Trust screen promises her answers
 * stay on her device and that promise is the product.
 *
 * Every failure is silent and harmless. If the function is unreachable, the
 * store is down, or the code is wrong, the app behaves exactly as it did before
 * any of this existed — her map is still in front of her, on her device. This
 * adds a way to recover; it never becomes a way to lose.
 */

const ENDPOINT = '/.netlify/functions/keep'

/**
 * What leaves the device under "Keep this map". Everything the app needs to
 * bring her back — and three things it must not carry, each because the Trust
 * screen makes a promise about it:
 *
 *  - Not her conversations with the guide, and not the follow-ups the guide
 *    handed her either: a guide follow-up holds what she asked and the words
 *    it gave her, in her own words to someone. "Keep the Guide on this device"
 *    promises that nothing she writes to it ever leaves the phone.
 *  - Not the line she writes for the next person at the end. Ending says it
 *    never leaves; it went with every keep (docs/PRIVACY.md, C3).
 *  - No moment finer than a day. Every other store has kept that rule since
 *    docs/LEARNING.md; this one carried millisecond timestamps, a follow-up id
 *    built from one, and `updatedAt` — a last-seen time under another name
 *    (docs/PRIVACY.md, C1–C2). What comes back after a restore is used only in
 *    days.
 *
 * The type is the guarantee for the first two: the fields do not exist on
 * what is sent. The server applies the same rules again, for older clients.
 */
export type KeptSnapshot = Omit<PersistedState, 'coachThreads'>

const MOMENT = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/

/** Every timestamp in a value, cut to its day. */
function toDays<T>(value: T): T {
  if (typeof value === 'string') return (value.match(MOMENT)?.[1] ?? value) as T
  if (Array.isArray(value)) return value.map(toDays) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toDays(v)])) as T
  }
  return value
}

export function keptSnapshot(state: PersistedState): KeptSnapshot {
  const { coachThreads: _threads, followups, ending, read, couple, ...rest } = state
  // The read before this one stays on the phone — it was never in the kept map.
  const { previous: _previous, ...latest } = read ?? { at: '', answers: {} }
  delete (rest as { updatedAt?: number }).updatedAt
  const { advice: _advice, ...ended } = ending ?? { at: '' }
  // The pair's code and when he answered, as before — not her owner key, not
  // the cached joint, not which side this phone is.
  const pair = couple ? { code: couple.code, at: couple.at, ...(couple.answered ? { answered: couple.answered } : {}) } : null
  return toDays({
    ...rest,
    read: read ? latest : null,
    couple: pair,
    ending: ending ? ended : null,
    // Ids unique within her list, and nothing more: they were built from the
    // moment each was written.
    followups: followups.filter((f) => f.source !== 'guide').map((f, i) => ({ ...f, id: `${f.source}:${f.topic}:${i}` })),
  })
}

/** Where her own code is remembered, so she is shown it rather than asked for it. */
const CODE_KEY = 'niyyah.keep.code.v1'

export function rememberedCode(): string | null {
  try {
    return localStorage.getItem(CODE_KEY)
  } catch {
    return null
  }
}

/**
 * The revision of the map this phone last kept or brought back
 * (docs/INTEGRITY.md). Sent with every re-keep, so a phone that has not seen
 * a keep made from another phone since cannot write over it.
 */
const REV_KEY = 'niyyah.keep.rev.v1'
/**
 * The key of a first keep still waiting for its code. Reused by every attempt
 * until one comes back, so a double tap, or a reply lost on the way, is one
 * map under one code rather than two.
 */
const ONCE_KEY = 'niyyah.keep.once.v1'

export function rememberCode(code: string, rev?: number) {
  try {
    localStorage.setItem(CODE_KEY, code)
    if (typeof rev === 'number') localStorage.setItem(REV_KEY, String(rev))
    else localStorage.removeItem(REV_KEY)
  } catch {
    /* storage refused — she still has the code on screen */
  }
}

/** The revision this phone last saw, or nothing for a code kept before revisions — which the server accepts as before. */
export function rememberedRev(): number | undefined {
  try {
    const n = Number(localStorage.getItem(REV_KEY))
    return localStorage.getItem(REV_KEY) !== null && Number.isInteger(n) && n >= 0 ? n : undefined
  } catch {
    return undefined
  }
}

export function forgetCode() {
  try {
    localStorage.removeItem(CODE_KEY)
    localStorage.removeItem(REV_KEY)
  } catch {
    /* nothing to forget */
  }
}


/**
 * Why a keep did not produce a code (docs/INTEGRITY.md):
 *  - `stale` — the map was kept from another phone since this one last saw
 *    it. Nothing was written over it; this phone keeps its answers.
 *  - `moved` — the code was changed on another phone, and opens nothing now.
 *  - `forgotten` — she asked, from another phone, for it to be forgotten.
 *  - `unreachable` — no answer, or one that made no sense.
 * For the last two the code is dropped from this phone: it opens nothing, and
 * the next keep she asks for is a new map under a new code — because she asked.
 */
export type KeepProblem = 'stale' | 'moved' | 'forgotten' | 'unreachable'

/** One key for one first keep, until a code comes back for it. */
function onceKey(): string | undefined {
  try {
    const held = localStorage.getItem(ONCE_KEY)
    if (held && /^[ACDEFGHJKMNPQRTWXY34789]{10}$/.test(held)) return held
    const bytes = crypto.getRandomValues(new Uint8Array(10))
    const fresh = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')
    localStorage.setItem(ONCE_KEY, fresh)
    return fresh
  } catch {
    return undefined
  }
}

function clearOnce() {
  try {
    localStorage.removeItem(ONCE_KEY)
  } catch {
    /* nothing to clear */
  }
}

/** The keep in flight, if any: two taps at once share one request. */
let inFlight: Promise<string | KeepProblem> | null = null

/**
 * Send the current map up, and return the code that brings it back — or say
 * why not.
 *
 * Re-keeps under her existing code when she has one, so keeping an updated map
 * never hands her a second code to remember.
 */
export function keepMapDetail(): Promise<string | KeepProblem> {
  if (inFlight) return inFlight
  inFlight = keepOnce().finally(() => {
    inFlight = null
  })
  return inFlight
}

async function keepOnce(): Promise<string | KeepProblem> {
  const state = loadProgress()
  if (!state) return 'unreachable'
  const body = keptSnapshot(state)

  const put = (code: string | null) =>
    send(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        code
          ? { snapshot: body, code, rev: rememberedRev() }
          : { snapshot: body, once: onceKey() },
      ),
    })

  const why = async (res: Response): Promise<string> => {
    try {
      return ((await res.json()) as { error?: string }).error ?? ''
    } catch {
      return ''
    }
  }

  let res = await put(rememberedCode())
  if (res?.status === 409 && (await why(res)) === 'stale') return 'stale'
  if (res?.status === 410) {
    // Closed from another phone. Never re-created behind her back: the code
    // is dropped, and she is told which.
    const closed = await why(res)
    forgetCode()
    return closed === 'moved' ? 'moved' : closed === 'forgotten' ? 'forgotten' : 'unreachable'
  }
  // Her remembered code points at nothing — the map lapsed. The server no
  // longer creates a map under a code it did not mint (netlify/functions/keep.ts),
  // so keep fresh: she gets a new one, and nobody else's map is ever written over.
  //
  // The old code is dropped only once the new one is in hand. `forgetCode()`
  // used to commit first, so a second attempt that timed out left the device
  // with no code at all while the screen said "nothing is lost" — and if the
  // 404 had been transient, the map it pointed at was still there and no
  // longer reachable (docs/FAIL.md).
  if (res?.status === 404 && rememberedCode()) {
    const replacement = await put(null)
    if (replacement?.ok) {
      forgetCode()
      res = replacement
    }
  }
  if (!res?.ok) return 'unreachable'

  try {
    const { code, rev } = (await res.json()) as { code?: string; rev?: number }
    if (!code || !isCode(code)) return 'unreachable'
    rememberCode(code, rev)
    clearOnce()
    return code
  } catch {
    return 'unreachable'
  }
}

/**
 * The same, as a code or nothing — for callers that only need a code to go on
 * with. A stale phone gets nothing here, and so never writes over the newer
 * map.
 */
export async function keepMap(): Promise<string | null> {
  const result = await keepMapDetail()
  // By name, never by shape: "unreachable" cleans to eight letters of the code
  // alphabet, and would pass for a code.
  return PROBLEMS.has(result) ? null : result
}

const PROBLEMS: ReadonlySet<string> = new Set<KeepProblem>(['stale', 'moved', 'forgotten', 'unreachable'])

/**
 * A new code for a map someone else has seen, with everything kept under the
 * old one carried across and the old one left opening nothing — see PUT in
 * netlify/functions/keep.ts. The phone keeps its answers; only the code changes.
 */
export async function rotateCode(): Promise<string | null> {
  const old = rememberedCode()
  if (!old) return null
  const res = await send(`${ENDPOINT}?code=${encodeURIComponent(old)}`, { method: 'PUT' })
  if (!res?.ok) return null
  try {
    const { code, rev } = (await res.json()) as { code?: string; rev?: number }
    if (!code || !isCode(code)) return null
    rememberCode(code, rev)
    return code
  } catch {
    return null
  }
}

/**
 * Why a restore did not produce a map. Four different things used to arrive as
 * one `null`, and the screen said "No map found for that code. Check it and try
 * again" for all of them — so a person whose map had *expired* (the server
 * deletes the blob on that read) was told to check her typing, and a person
 * with a perfectly good code and no signal was told her map did not exist. She
 * retypes a correct code at a server that cannot answer (docs/NORMAN.md).
 */
export type RestoreProblem = 'not-a-code' | 'not-found' | 'expired' | 'moved' | 'forgotten' | 'unreachable'

/** The revision each fetched map came with, until she adopts it — see `adoptMap`. */
const fetchedRev = new Map<string, number>()

/** Fetch a kept map by its code, saying why when it cannot. */
export async function restoreDetail(code: string): Promise<PersistedState | RestoreProblem> {
  const clean = cleanCode(code)
  if (!isCode(clean)) return 'not-a-code'

  const res = await send(`${ENDPOINT}?code=${encodeURIComponent(clean)}`, { method: 'GET' })
  // No response at all: timed out, offline, or blocked. Her code may be perfect.
  if (!res) return 'unreachable'
  if (!res.ok) {
    if (res.status === 404) {
      // The server says which: a code with nothing under it, or a map that
      // lapsed — and a lapsed one it has just deleted, so retrying is futile.
      try {
        const { error } = (await res.json()) as { error?: string }
        return error === 'expired' ? 'expired' : 'not-found'
      } catch {
        return 'not-found'
      }
    }
    if (res.status === 410) {
      // Closed: changed on another phone, or forgotten. Said, not guessed.
      try {
        const { error } = (await res.json()) as { error?: string }
        return error === 'moved' ? 'moved' : 'forgotten'
      } catch {
        return 'forgotten'
      }
    }
    if (res.status === 400) return 'not-a-code'
    return 'unreachable'
  }

  try {
    const { snapshot, rev } = (await res.json()) as { snapshot?: KeptSnapshot; rev?: number }
    if (!snapshot || typeof snapshot !== 'object') return 'unreachable'
    if (typeof rev === 'number') fetchedRev.set(clean, rev)
    // Fetched, not adopted. This used to remember the code here, so opening
    // anyone's `?map=` link made their code this phone's own: every keep
    // after it wrote under a code the sender holds and reads
    // (docs/SECURITY.md, O2). The caller adopts it, after she says it is hers.
    // A restored map starts the guide fresh — its threads were never kept,
    // including in a snapshot kept before that was true.
    return { ...snapshot, coachThreads: {} }
  } catch {
    return 'unreachable'
  }
}

/**
 * Make a fetched map this phone's own: its answers into storage, its code as
 * the one every later keep writes under. Only ever after she has said it is
 * hers — see src/components/ConfirmRestore.tsx.
 */
export function adoptMap(code: string, snapshot: PersistedState): void {
  saveProgress(snapshot)
  // With the revision it came at, so this phone's next keep is from the latest.
  const clean = cleanCode(code)
  rememberCode(clean, fetchedRev.get(clean))
}

/** The same, for callers that only need the map or nothing (the `?map=` link). */
export async function restoreMap(code: string): Promise<PersistedState | null> {
  const result = await restoreDetail(code)
  return typeof result === 'string' ? null : result
}

/** A link that restores the map on any device, for sending to herself. */
export function restoreLink(code: string, origin: string): string {
  return `${origin}/?map=${encodeURIComponent(code)}`
}

/** The code in the URL, when she has opened a restore link. */
export function codeFromUrl(): string | null {
  try {
    const raw = new URLSearchParams(window.location.search).get('map')
    return raw ? raw.toUpperCase().replace(/[^A-Z0-9]/g, '') : null
  } catch {
    return null
  }
}
