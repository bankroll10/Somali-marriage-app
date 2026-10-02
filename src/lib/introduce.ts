import type { Gender } from '../types'
import type { Reach } from '../data/reach'
import { isCode, newCode } from './code'
import { TIMEOUT_MS, send, whyOf, type Why } from './net'

/**
 * Putting a name down for an introduction — the client half of
 * netlify/functions/introduce.ts.
 *
 * One POST, with exactly what the server keeps: a way to reach her, her first
 * name if she gives it, woman or man, her city (and country, when she is
 * somewhere else), how far she would go, and that she confirmed she is an
 * adult. Nothing from her map, her read or her eleven travels with it, and
 * nothing here runs unless she taps the button on the screen that says what
 * it is for (src/components/Looking.tsx).
 *
 * **The code is minted here, before the request** (docs/BATCH-01-PLAN.md D1).
 * It is held as a *pending* attempt — the code and the day, never the
 * contact — and sent with the fields. If the answer is lost, the same code
 * goes again with the same request and the server answers `again` instead of
 * writing twice; if this phone's storage refuses to hold it, a module
 * variable holds it for the page, and the screen shows the code so she can
 * take the name off by hand later. A different request under a code that
 * exists is refused by the server (409), and the screen asks her what she
 * wants done; nothing is ever written over.
 *
 * **The receipt has the same fallback.** When storage refuses the receipt
 * too, the page keeps it in memory, and `rememberedIntro` answers from there:
 * so Home shows the card, "Take my name off" works, and Forget me on Trust
 * sends the code — all within the page. Until 2026-09-27 the receipt was
 * dropped on the floor when `setItem` threw, and Forget me, finding no code,
 * reported the name gone while the record stayed. What a reload clears is
 * still cleared: the screen shows the code once and says to keep it, and
 * that is the honest limit of a browser that is not saving.
 *
 * **The receipt is the server's** (D4). "Saved" is shown on a 200 that carries
 * the code and the server's two days — the day it wrote, and the Sunday it
 * has scheduled the removal for — and on nothing else. A receipt written by
 * the version before this one carries only the day this phone recorded, and
 * is shown as that. The phone never throws a code away on its own clock's
 * say-so: past the scheduled day it says so and keeps the code, so the name
 * can still be taken off until she does, or Forget me does (src/lib/forget.ts).
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

export interface InterestInput {
  contact: string
  firstName?: string
  gender: Gender
  scene: string
  /** Only read when the scene is `other`. */
  country?: string
  reach?: Reach
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
function rememberIntro(state: Omit<IntroState, 'kept'>): boolean {
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

function holdPending(code: string, at: string): PendingIntro {
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

export type Registered =
  | { ok: true; state: IntroState; again: boolean; kept: boolean }
  | {
      ok: false
      /** `taken`: a different request landed under this code; `withdrawn`: the code was taken off before this arrived. */
      why: Why | 'withdrawn'
      /** The code the attempt went under, so the screen can show it when nothing else holds it. */
      code: string
      /** Whether this phone's storage holds the pending attempt. */
      kept: boolean
      /** True when the request may have landed: no answer, an answer that could not be read, or a server error after the write may have happened. */
      unsure: boolean
    }

/**
 * Put her name down, under the pending code if there is one, else a fresh
 * one held first. `ok` only when the server says it saved — this time, or an
 * earlier time under the same code.
 */
export async function registerInterest(input: InterestInput): Promise<Registered> {
  // The code this request goes under: the attempt this phone is still waiting
  // on; else the receipt this phone already holds — another tab on the same
  // phone may have been answered first, and a request from a phone with a
  // receipt is the same request, answered `again`, or a different one,
  // refused; else a fresh one, held before anything is sent.
  const held = rememberedIntro()
  const pending = pendingIntro() ?? (held ? { code: held.code, at: held.at, kept: true } : holdPending(newCode(), today()))
  const { code } = pending
  const res = await send(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      contact: input.contact.trim(),
      ...(input.firstName?.trim() ? { firstName: input.firstName.trim() } : {}),
      gender: input.gender,
      scene: input.scene,
      ...(input.scene === 'other' && input.country ? { country: input.country } : {}),
      ...(input.reach ? { reach: input.reach } : {}),
      adult: true,
    }),
  })
  const failed = (why: Why | 'withdrawn', unsure: boolean): Registered => ({ ok: false, why, code, kept: pending.kept, unsure })
  if (!res) return failed('unreachable', true)
  if (res.status === 410) {
    // Taken off — by her, or by Forget me — before this was answered. The
    // code is spent; the next tap goes under a fresh one. Whether anything
    // is still physically under it is the server's and the sweep's business,
    // never a claim this phone makes.
    forgetPending()
    return failed('withdrawn', false)
  }
  // A server error can come after the write landed, so the pending code is
  // kept and the attempt is unsure; a refusal of the body (4xx) is not.
  if (!res.ok) return failed(await whyOf(res), res.status >= 500)
  try {
    const body = (await res.json()) as { saved?: unknown; code?: unknown; at?: unknown; removeOn?: unknown; again?: unknown }
    if (body.saved !== true || body.code !== code || typeof body.at !== 'string' || typeof body.removeOn !== 'string') return failed('garbled', true)
    const kept = rememberIntro({ code, at: body.at, removeOn: body.removeOn, confirmed: true })
    const state: IntroState = { code, at: body.at, removeOn: body.removeOn, confirmed: true, kept }
    forgetPending()
    return { ok: true, state, again: body.again === true, kept }
  } catch {
    return failed('garbled', true)
  }
}

/**
 * What a withdrawal came to. `failed` means *unconfirmed*: no answer at all, or
 * an answer that is not one of the two the protocol gives (below). It says
 * nothing about whether the server removed the record.
 */
export type Withdrawn = 'removed' | 'nothing' | 'failed'

/** The body of a response, if it is a JSON object. Anything else — HTML, a cut stream, `null`, an array, a string — is not one. */
async function objectBody(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await res.json()
    return body !== null && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null
  } catch {
    return null
  }
}

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
async function outcomeOf(res: Response | null): Promise<Withdrawn> {
  if (!res) return 'failed'
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
 * **One deadline covers the wait for the response and the read of its body.**
 * `send()` stops its clock when the headers arrive, and a body that begins and
 * never ends would otherwise hold the caller — for Forget me, before the phone
 * is wiped. So this calls `fetch` itself with its own signal, aborts it at the
 * deadline where the platform honours that, and settles at the deadline either
 * way (a `fetch` that ignores its signal is not waited for). The timer is
 * cleared however the call ends. The first thing to settle decides: an answer
 * that arrives after the deadline is not read as one, and changes nothing.
 * `net.ts` is not touched, and no other endpoint is bounded by this.
 */
export async function confirmWithdrawal(code: string): Promise<Withdrawn> {
  const abort = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<Withdrawn>((resolve) => {
    timer = setTimeout(() => {
      abort.abort()
      resolve('failed')
    }, TIMEOUT_MS)
  })
  const answered = (async (): Promise<Withdrawn> => {
    let res: Response
    try {
      res = await fetch(`${ENDPOINT}?code=${encodeURIComponent(code)}`, { method: 'DELETE', signal: abort.signal })
    } catch {
      return 'failed'
    }
    return outcomeOf(res)
  })().catch((): Withdrawn => 'failed')
  try {
    return await Promise.race([answered, deadline])
  } finally {
    clearTimeout(timer)
  }
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
