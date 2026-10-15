import { isCode } from './code'
import { objectBody, sendRead } from './net'

/**
 * An earlier introduction request — the client half of
 * netlify/functions/introduce.ts, now that new requests are closed (release R3,
 * 2026-10-13; docs/DECISIONS.md).
 *
 * Nothing here puts a name down any more: the server answers a new request with
 * 410 and no screen sends one. What stays is what a person needs to deal with a
 * request made while intake was open, or an attempt that was in flight:
 *
 *  - the receipt this phone holds (`rememberedIntro`), the pending attempt whose
 *    answer never came (`pendingIntro`), and the page's own copy of either when
 *    storage refused to hold it, which shows the code so the request can still
 *    be taken off;
 *  - taking a request off by its code (`confirmWithdrawal`, `withdrawInterest`),
 *    from the receipt, from the pending note, or from any phone with the code
 *    typed in;
 *  - Forget me (src/lib/forget.ts), which uses the same classification and keeps
 *    every code that did not land.
 *
 * `rememberIntro` and `holdPending` are kept, exported, for the tests that build
 * those recovery states; nothing in the app calls them while the route is closed.
 *
 * **The phone never throws a code away on its own clock's say-so.** A request
 * is kept at most 180 days, and the server removes it on its own schedule, but
 * time passing does not confirm that it did. Past the 180th day the receipt says
 * so and keeps the code, so the request can still be taken off until it is, or
 * Forget me does it (this supersedes release R3's rule that the phone forgot
 * the code on the 180th day; docs/DECISIONS.md, the integration entry).
 *
 * **A withdrawal is read strictly** (`outcomeOf`): `200 { removed: true }`
 * confirms removal; documented `200 { removed: false }` and the legacy
 * `404 { error: 'not_found' }` both mean nothing was found; everything else,
 * including any other 2xx, an unreadable body and no answer, is unconfirmed and
 * costs the phone nothing it holds.
 */

const ENDPOINT = '/.netlify/functions/introduce'

/** The receipt: its own key, apart from the map code and the install id. Cleared by Forget me. */
const KEY = 'niyyah.intro.v1'
/** An attempt whose answer has not arrived: the code it went under and the day. Cleared once answered, or by Forget me. */
const PENDING_KEY = 'niyyah.intro.pending.v1'

/** How long a name stays on the list, at most. The server's twin is LIST_DAYS in netlify/functions/introduce.ts. */
export const LIST_DAYS = 180

/**
 * Where introductions are beginning (docs/DECISIONS.md decision 28). A name
 * from anywhere else is taken and kept for later, and the screen says so.
 */
export const PILOT_SCENE = 'twin-cities'

const DAY_MS = 24 * 60 * 60 * 1000

const today = (now = Date.now()) => new Date(now).toISOString().slice(0, 10)

/** The day a name put down on `at` has had its 180 days. Null when `at` is not a day. */
export function untilOf(at: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(at)) return null
  const ms = Date.parse(`${at}T00:00:00Z`)
  return Number.isNaN(ms) ? null : today(ms + LIST_DAYS * DAY_MS)
}

/**
 * Whether the 180 days of this request are over. Said, never acted on: time
 * passing does not show that the server has removed anything, so the code is
 * kept until the request is taken off or Forget me does it.
 */
export function lifetimeOver(state: IntroState, now = Date.now()): boolean {
  const until = untilOf(state.at)
  return !!until && today(now) >= until
}

/**
 * The Sunday (00:00 UTC) on or before `at` plus 180 days: the day the weekly
 * sweep takes a name put down on `at`. The server's `removeOn` is the one the
 * screen shows; this twin is for a receipt from before the server said it,
 * and is held equal by tests/vocab-sync.test.ts. Null when `at` is not a day.
 */
export function removeOnOf(at: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(at)) return null
  const ms = Date.parse(`${at}T00:00:00Z`)
  if (Number.isNaN(ms)) return null
  const last = new Date(ms + LIST_DAYS * DAY_MS)
  return today(last.getTime() - last.getUTCDay() * DAY_MS)
}

/** What this phone remembers about a saved request. Never the contact. */
export interface IntroState {
  code: string
  /** The day the server wrote it — or, when `confirmed` is false, the day this phone recorded. */
  at: string
  /** The Sunday the server scheduled the removal for. Absent on a receipt from before the server said it. */
  removeOn?: string
  /** True when `at` and `removeOn` are the server's own answer. */
  confirmed: boolean
  /** True when this phone's storage holds it; false when only this page does, and a reload loses it. */
  kept: boolean
}

/** The day a request is scheduled to go: the server's, or the twin's reading of the phone's day. */
export function scheduledRemoval(state: IntroState): string | null {
  return state.removeOn ?? removeOnOf(state.at)
}

/** Whether the scheduled day has come. Said, never acted on: the code stays until she takes it off. */
export function pastScheduled(state: IntroState, now = Date.now()): boolean {
  const goes = scheduledRemoval(state)
  return !goes || today(now) >= goes
}

/** An attempt sent and not yet answered: the code it went under, the day, and whether this phone's storage holds it. */
export interface PendingIntro {
  code: string
  at: string
  kept: boolean
}

/** The page's own copy of the pending attempt, for a phone whose storage refuses to hold one. */
let mirror: PendingIntro | null = null
/** The page's own copy of the receipt, for the same phone. Never the contact; cleared by a reload. */
let receiptMirror: IntroState | null = null

/** The receipt: this phone's storage first, else the page's own copy. */
export function rememberedIntro(): IntroState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw) as { code?: unknown; at?: unknown; removeOn?: unknown }
      if (typeof p.code === 'string' && isCode(p.code) && typeof p.at === 'string') {
        const removeOn = typeof p.removeOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.removeOn) ? p.removeOn : undefined
        return { code: p.code, at: p.at, ...(removeOn ? { removeOn } : {}), confirmed: !!removeOn, kept: true }
      }
    }
  } catch {
    /* storage refused — the page's own copy, below */
  }
  return receiptMirror
}

/**
 * Write the receipt. True when this phone's storage took it; false when only
 * this page holds it, in which case the state returned by `rememberedIntro`
 * says `kept: false` and the screen shows the code.
 */
export function rememberIntro(state: Omit<IntroState, 'kept'>): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code: state.code, at: state.at, removeOn: state.removeOn }))
    receiptMirror = null
    return true
  } catch {
    receiptMirror = { ...state, kept: false }
    return false
  }
}

export function forgetIntro(): void {
  receiptMirror = null
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to forget */
  }
}

export function pendingIntro(): PendingIntro | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    if (raw) {
      const p = JSON.parse(raw) as { code?: unknown; at?: unknown }
      if (typeof p.code === 'string' && isCode(p.code) && typeof p.at === 'string') return { code: p.code, at: p.at, kept: true }
    }
  } catch {
    /* storage refused — the page's own copy, below */
  }
  return mirror
}

export function holdPending(code: string, at: string): PendingIntro {
  let kept = false
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ code, at }))
    kept = true
  } catch {
    kept = false
  }
  mirror = { code, at, kept }
  return mirror
}

export function forgetPending(): void {
  mirror = null
  try {
    localStorage.removeItem(PENDING_KEY)
  } catch {
    /* nothing to forget */
  }
}

/** For a test that reloads the page: what a reload clears — both of the page's own copies. */
export function resetIntroMirror(): void {
  mirror = null
  receiptMirror = null
}

/**
 * What a withdrawal came to. `failed` means *unconfirmed*: no answer at all, or
 * an answer that is not one of the two the protocol gives (below). It says
 * nothing about whether the server removed the record.
 */
export type Withdrawn = 'removed' | 'nothing' | 'failed'

/**
 * Read a DELETE's answer as `removed`, `nothing` or `failed`, and as nothing
 * else. Two answers confirm an outcome, and only these:
 *
 *  - **200 with a JSON object whose `removed` is a boolean** — the handler's
 *    own answer (netlify/functions/introduce.ts). `true`: a record went.
 *    `false`: none was under the code. The current handler writes the
 *    withdrawal marker either way; nothing on the wire says so, and nothing
 *    here treats the answer as proof of it.
 *  - **404 with a JSON object whose `error` is `not_found`** — the *legacy*
 *    handler's answer for a code with nothing under it (the one deployed
 *    before 2026-09-27). It confirms absence under that contract. It is not
 *    evidence that a withdrawal marker was written, and nothing here treats
 *    it as such; the current handler never sends a 404.
 *
 * Everything else is `failed`: a 200 whose body cannot be read, is not JSON, or
 * has no boolean `removed` (a 200 alone is not evidence — Netlify's catch-all
 * answers 200 with the app's HTML for a path with no function behind it, and a
 * body can be cut after the status was sent), another 2xx, a 404 with any
 * other body, and every other status.
 */
async function outcomeOf(res: Response): Promise<Withdrawn> {
  if (res.status === 200) {
    const body = await objectBody(res)
    return body && typeof body.removed === 'boolean' ? (body.removed ? 'removed' : 'nothing') : 'failed'
  }
  if (res.status === 404) {
    const body = await objectBody(res)
    return body?.error === 'not_found' ? 'nothing' : 'failed'
  }
  return 'failed'
}

/**
 * Ask the server to take a name off by its code, and read the answer — and do
 * nothing else. This phone's receipt, pending attempt and page copies are not
 * touched, so a caller that has its own rules for what to keep (Forget me,
 * src/lib/forget.ts, wipes the phone whatever the answer and keeps only the
 * codes that did not land) shares the classification and not the clearing.
 *
 * `removed` when the server said a record went; `nothing` when it said none was
 * under the code; `failed` when the outcome is not confirmed (see `outcomeOf`):
 * no answer, one that does not satisfy the protocol, or none inside
 * `TIMEOUT_MS`. Asking again with the same code is safe: a second DELETE is
 * answered `removed: false`.
 *
 * **One deadline covers the wait for the response and the read of its body**,
 * and it is `sendRead`'s (src/lib/net.ts), the same bound Forget me puts on its
 * other three deletes: it aborts where the platform honours that, settles at the
 * deadline either way, never reads an answer that arrives after it, and clears
 * its timer. The first thing to settle decides.
 */
export async function confirmWithdrawal(code: string): Promise<Withdrawn> {
  return sendRead(`${ENDPOINT}?code=${encodeURIComponent(code)}`, { method: 'DELETE' }, outcomeOf, 'failed')
}

/**
 * Take a name off by its code and, once the server has answered, forget the
 * code here. `removed` or `nothing` (see `confirmWithdrawal`): the receipt and
 * the pending attempt that hold *this* code, and the page's own copies of them,
 * are cleared — and only those, so a receipt for A and a pending attempt for B
 * are independent. `failed` means *unconfirmed*: no claim about whether the
 * server removed anything, so everything is kept, as a receipt and as a
 * pending attempt, and asking again with the same code is safe.
 */
export async function withdrawInterest(code: string): Promise<Withdrawn> {
  const result = await confirmWithdrawal(code)
  if (result === 'failed') return result
  if (rememberedIntro()?.code === code) forgetIntro()
  if (pendingIntro()?.code === code) forgetPending()
  return result
}
