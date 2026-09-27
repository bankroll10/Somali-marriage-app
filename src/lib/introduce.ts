import type { Gender } from '../types'
import type { Reach } from '../data/reach'
import { isCode } from './code'
import { send, whyOf, type Why } from './net'

/**
 * Putting a name down for an introduction — the client half of
 * netlify/functions/introduce.ts.
 *
 * One POST, with exactly what the server keeps: a way to reach her, her first
 * name if she gives it, woman or man, her city (and country, when she is
 * somewhere else), how far she would go. Nothing from her map, her read or
 * her eleven travels with it, and nothing here runs unless she taps the
 * button on the screen that says what it is for (src/components/Looking.tsx).
 *
 * The answer is a code, held on this phone under its own key — not her map
 * code, not her install id — so that she can take her name off again from
 * here, and Forget me takes it off with everything else (src/lib/forget.ts).
 * "You're on the list" is shown on a 200 with that code, and on nothing else:
 * a hung request, a 503 or a refused body leaves her told the truth, that it
 * did not go through, with her words still in the form.
 *
 * A name is kept at most 180 days (docs/DECISIONS.md decision 32). The server
 * removes it; this phone forgets the code on the same day, so no screen says
 * "your name is down" about a name that is gone. Nothing reminds her: if she
 * still wants an introduction she puts it down again.
 */

const ENDPOINT = '/.netlify/functions/introduce'

/** Its own key, apart from the map code and the install id. Cleared by Forget me. */
const KEY = 'niyyah.intro.v1'

/** How long a name stays on the list, at most. The server's twin is LIST_DAYS in netlify/functions/introduce.ts. */
export const LIST_DAYS = 180

/**
 * Where introductions are beginning (docs/DECISIONS.md decision 28). A name
 * from anywhere else is taken and kept for later, and the screen says so.
 */
export const PILOT_SCENE = 'twin-cities'

const DAY_MS = 24 * 60 * 60 * 1000

/** The day a name put down on `at` comes off the list. Null when `at` is not a day. */
export function untilOf(at: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(at)) return null
  const ms = Date.parse(`${at}T00:00:00Z`)
  return Number.isNaN(ms) ? null : new Date(ms + LIST_DAYS * DAY_MS).toISOString().slice(0, 10)
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

/** What this phone remembers: that a name is down, under which code, since when. Never the contact. */
export interface IntroState {
  code: string
  at: string
}

export type Registered = { ok: true; code: string } | { ok: false; why: Why }

/**
 * The name this phone put down, while it is still on the list. On and after
 * its 180th day the code is forgotten here too — the server has removed the
 * name, or will at its next sweep, and the founder's list no longer shows it.
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

function rememberIntro(state: IntroState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage refused — she is on the list, and the screen says so for this visit */
  }
}

export function forgetIntro(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* nothing to forget */
  }
}

/** Put her name down. `ok` only when the server says it saved. */
export async function registerInterest(input: InterestInput): Promise<Registered> {
  const res = await send(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contact: input.contact.trim(),
      ...(input.firstName?.trim() ? { firstName: input.firstName.trim() } : {}),
      gender: input.gender,
      scene: input.scene,
      ...(input.scene === 'other' && input.country ? { country: input.country } : {}),
      ...(input.reach ? { reach: input.reach } : {}),
    }),
  })
  if (!res?.ok) return { ok: false, why: await whyOf(res) }
  try {
    const { saved, code } = (await res.json()) as { saved?: unknown; code?: unknown }
    if (saved !== true || typeof code !== 'string' || !isCode(code)) return { ok: false, why: 'garbled' }
    rememberIntro({ code, at: new Date().toISOString().slice(0, 10) })
    return { ok: true, code }
  } catch {
    return { ok: false, why: 'garbled' }
  }
}

/**
 * Take her name off. True when it is gone — a 404 is gone too — and the phone
 * forgets the code either way it succeeded; on a failure the code is kept, so
 * she can try again or Forget me can finish it.
 */
export async function withdrawInterest(code: string): Promise<boolean> {
  const res = await send(`${ENDPOINT}?code=${encodeURIComponent(code)}`, { method: 'DELETE' })
  const gone = !!res && (res.ok || res.status === 404)
  if (gone) forgetIntro()
  return gone
}
