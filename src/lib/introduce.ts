import type { Gender } from '../types'
import type { Reach } from '../data/reach'
import { isCode, newCode } from './code'
import { send, whyOf, type Why } from './net'

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

export function rememberedIntro(): IntroState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as { code?: unknown; at?: unknown; removeOn?: unknown }
    if (typeof p.code !== 'string' || !isCode(p.code) || typeof p.at !== 'string') return null
    const removeOn = typeof p.removeOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.removeOn) ? p.removeOn : undefined
    return { code: p.code, at: p.at, ...(removeOn ? { removeOn } : {}), confirmed: !!removeOn }
  } catch {
    return null
  }
}

/** Write the receipt. True when this phone's storage took it. */
function rememberIntro(state: IntroState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ code: state.code, at: state.at, removeOn: state.removeOn }))
    return true
  } catch {
    return false
  }
}

export function forgetIntro(): void {
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

/** For a test that reloads the page: what a reload clears. */
export function resetIntroMirror(): void {
  mirror = null
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
      /** True when the request may have landed: no answer, or an answer that could not be read. */
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
    // Taken off — by her, or by Forget me — before this arrived. The code is
    // spent; the next tap goes under a fresh one.
    forgetPending()
    return failed('withdrawn', false)
  }
  if (!res.ok) return failed(await whyOf(res), false)
  try {
    const body = (await res.json()) as { saved?: unknown; code?: unknown; at?: unknown; removeOn?: unknown; again?: unknown }
    if (body.saved !== true || body.code !== code || typeof body.at !== 'string' || typeof body.removeOn !== 'string') return failed('garbled', true)
    const state: IntroState = { code, at: body.at, removeOn: body.removeOn, confirmed: true }
    const kept = rememberIntro(state)
    forgetPending()
    return { ok: true, state, again: body.again === true, kept }
  } catch {
    return failed('garbled', true)
  }
}

export type Withdrawn = 'removed' | 'nothing' | 'failed'

/**
 * Take a name off by its code. `removed` when a record went; `nothing` when
 * none was under the code — and none can be put under it now, the server
 * having marked it; `failed` when the server could not be reached or would
 * not answer, in which case the code is kept so she can try again or Forget
 * me can finish it. On `removed` or `nothing` this phone forgets the code,
 * as a receipt and as a pending attempt.
 */
export async function withdrawInterest(code: string): Promise<Withdrawn> {
  const res = await send(`${ENDPOINT}?code=${encodeURIComponent(code)}`, { method: 'DELETE' })
  if (!res) return 'failed'
  let result: Withdrawn
  if (res.ok) {
    try {
      const body = (await res.json()) as { removed?: unknown }
      result = body.removed === true ? 'removed' : 'nothing'
    } catch {
      result = 'nothing'
    }
  } else if (res.status === 404) result = 'nothing'
  else return 'failed'
  if (rememberedIntro()?.code === code) forgetIntro()
  if (pendingIntro()?.code === code) forgetPending()
  return result
}
