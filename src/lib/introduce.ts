import { isCode } from './code'
import { send } from './net'

/**
 * An earlier introduction request — the client half of
 * netlify/functions/introduce.ts, now that new requests are closed (release R3,
 * 2026-10-13).
 *
 * Nothing here puts a name down any more: the server answers a new request
 * with 410, and no screen sends one. What is left is what a person needs to
 * deal with a request made while intake was open: the code this phone was
 * given and the day it kept it (`rememberedIntro`), and taking a request off
 * the list by its code (`withdrawInterest`), from this phone's own receipt or
 * from any phone with the code typed in.
 *
 * The code is the server's: it minted it and answered with it, and this phone
 * kept it under its own key, apart from the map code and the install id, so a
 * request can be taken off from here and Forget me takes it off with
 * everything else (src/lib/forget.ts, unchanged).
 *
 * A request is kept at most 180 days from the day it was put down
 * (docs/DECISIONS.md decision 32). The server removes it on its own schedule;
 * this phone forgets the code on the same 180th day, so no screen offers to
 * manage a request it has no code for. That is a rule about how long a request
 * may be kept, not a statement that cleanup has run.
 */

const ENDPOINT = '/.netlify/functions/introduce'

/** Its own key, apart from the map code and the install id. Cleared by Forget me. */
const KEY = 'niyyah.intro.v1'

/** How long a name stays on the list, at most. The server's twin is LIST_DAYS in netlify/functions/introduce.ts. */
export const LIST_DAYS = 180

/**
 * Where introductions were beginning (docs/DECISIONS.md decision 28). Kept
 * because the sweep's lifetime, the scenes list and tests/vocab-sync.test.ts
 * still name it; no screen says it now.
 */
export const PILOT_SCENE = 'twin-cities'

const DAY_MS = 24 * 60 * 60 * 1000

/** The day a name put down on `at` comes off the list. Null when `at` is not a day. */
export function untilOf(at: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(at)) return null
  const ms = Date.parse(`${at}T00:00:00Z`)
  return Number.isNaN(ms) ? null : new Date(ms + LIST_DAYS * DAY_MS).toISOString().slice(0, 10)
}

/** What this phone remembers: that a request was put down, under which code, since when. Never the contact. */
export interface IntroState {
  code: string
  at: string
}

/**
 * The request this phone holds a code for, until its 180th day. On and after
 * that day the code is forgotten here too, and the phone stops offering it.
 */
export function rememberedIntro(now = Date.now()): IntroState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<IntroState>
    if (typeof p.code !== 'string' || !isCode(p.code) || typeof p.at !== 'string') return null
    const until = untilOf(p.at)
    if (!until || new Date(now).toISOString().slice(0, 10) >= until) {
      forgetIntro()
      return null
    }
    return { code: p.code, at: p.at }
  } catch {
    return null
  }
}

export function forgetIntro(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to forget */
  }
}

/** Whether the code this phone holds is this one, however it was typed. */
function holds(code: string): boolean {
  try {
    const raw = localStorage.getItem(KEY)
    const p = raw ? (JSON.parse(raw) as Partial<IntroState>) : null
    return !!p && p.code === code
  } catch {
    return false
  }
}

/**
 * What a request to take a name off came to:
 *
 *  - `removed`: the server said `200 { removed: true }`, its one documented
 *    confirmation. Nothing else is read as one.
 *  - `nothing`: the server said `404 { error: 'not_found' }`, its one
 *    documented answer for a well-formed code with nothing under it. It does
 *    not say whether there ever was, so nothing is claimed about the past.
 *  - `unconfirmed`: anything else: no answer, a cap, a 503, a 400, a body that
 *    is not one of the two above. Nothing is known either way.
 */
export type Withdrawal = 'removed' | 'nothing' | 'unconfirmed'

/**
 * Take a request off the list by its code. The phone forgets its own code
 * only on `removed` or `nothing`; on `unconfirmed` the code stays, so the
 * person can try again or Forget me can finish it.
 */
export async function withdrawInterest(code: string): Promise<Withdrawal> {
  const res = await send(`${ENDPOINT}?code=${encodeURIComponent(code)}`, { method: 'DELETE' })
  if (!res) return 'unconfirmed'
  let body: unknown
  try {
    body = await res.json()
  } catch {
    return 'unconfirmed'
  }
  const answer = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const result: Withdrawal =
    res.status === 200 && answer.removed === true ? 'removed' : res.status === 404 && answer.error === 'not_found' ? 'nothing' : 'unconfirmed'
  if (result !== 'unconfirmed' && holds(code)) forgetIntro()
  return result
}
