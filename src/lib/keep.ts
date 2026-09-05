import { loadProgress, type PersistedState } from './storage'
import type { WaitlistState } from '../types'

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
const TIMEOUT_MS = 10_000

/**
 * What leaves the device under "Keep this map". Everything the app needs to
 * bring her back — and three things it must not carry, each because the Trust
 * screen makes a promise about it:
 *
 *  - Not her conversations with the guide, and not the follow-ups the guide
 *    handed her either: a guide follow-up holds what she asked and the words
 *    it gave her, in her own words to someone. "Keep the Guide on this device"
 *    promises that nothing she writes to it ever leaves the phone.
 *  - Not her email or phone. The way to reach her goes to the founder's form
 *    on its own, and Trust says it is never stored next to her answers. Until
 *    this type existed, every re-keep after joining the door put it there.
 *
 * The type is the guarantee: the fields do not exist on what is sent.
 */
export type KeptSnapshot = Omit<PersistedState, 'coachThreads' | 'waitlist'> & {
  waitlist: Omit<WaitlistState, 'contact'> | null
}

export function keptSnapshot(state: PersistedState): KeptSnapshot {
  const { coachThreads: _threads, waitlist, followups, ...rest } = state
  const { contact: _contact, ...place } = waitlist ?? { contact: '', joinedAt: '' }
  return {
    ...rest,
    waitlist: waitlist ? place : null,
    followups: followups.filter((f) => f.source !== 'guide'),
  }
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

function rememberCode(code: string) {
  try {
    localStorage.setItem(CODE_KEY, code)
  } catch {
    /* storage refused — she still has the code on screen */
  }
}

async function withTimeout(input: string, init: RequestInit): Promise<Response | null> {
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: abort.signal })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Send the current map up, and return the code that brings it back.
 *
 * Re-keeps under her existing code when she has one, so keeping an updated map
 * never hands her a second code to remember.
 */
export async function keepMap(): Promise<string | null> {
  const snapshot = loadProgress()
  if (!snapshot) return null

  const res = await withTimeout(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshot: keptSnapshot(snapshot), code: rememberedCode() ?? undefined }),
  })
  if (!res?.ok) return null

  try {
    const { code } = (await res.json()) as { code?: string }
    if (!code) return null
    rememberCode(code)
    return code
  } catch {
    return null
  }
}

/** Fetch a kept map by its code. Null for anything that isn't a clean hit. */
export async function restoreMap(code: string): Promise<PersistedState | null> {
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!clean) return null

  const res = await withTimeout(`${ENDPOINT}?code=${encodeURIComponent(clean)}`, { method: 'GET' })
  if (!res?.ok) return null

  try {
    const { snapshot } = (await res.json()) as { snapshot?: KeptSnapshot }
    if (!snapshot || typeof snapshot !== 'object') return null
    rememberCode(clean)
    // A restored map starts the guide fresh — its threads were never kept,
    // including in a snapshot kept before that was true. Her contact was
    // never kept either; the founder already has it from the form.
    return {
      ...snapshot,
      coachThreads: {},
      waitlist: snapshot.waitlist ? { ...snapshot.waitlist, contact: '' } : null,
    }
  } catch {
    return null
  }
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
