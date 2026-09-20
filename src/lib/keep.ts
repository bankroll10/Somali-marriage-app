import { loadProgress, type PersistedState } from './storage'
import type { Identity, WaitlistState } from '../types'
import { CODE_LENGTH, cleanCode } from './code'
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

export function forgetCode() {
  try {
    localStorage.removeItem(CODE_KEY)
  } catch {
    /* nothing to forget */
  }
}


/** Something to lay over what the device holds before it is sent — see `keepMap`. */
export interface KeepPatch {
  identity?: Partial<Identity>
}

/**
 * Send the current map up, and return the code that brings it back.
 *
 * Re-keeps under her existing code when she has one, so keeping an updated map
 * never hands her a second code to remember.
 *
 * A patch lays over what is on the device before it is sent, and changes
 * nothing on the device. The door hands the age she just typed this way:
 * persistence is debounced (useNiyyah), so a re-keep that read storage could
 * send the map from a quarter-second ago — without the one fact being counted
 * requires.
 */
export async function keepMap(patch?: KeepPatch): Promise<string | null> {
  const state = loadProgress()
  if (!state) return null
  const snapshot = patch?.identity ? { ...state, identity: { ...state.identity, ...patch.identity } } : state
  const body = keptSnapshot(snapshot)

  const put = (code: string | null) =>
    send(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot: body, code: code ?? undefined }),
    })

  let res = await put(rememberedCode())
  // Her remembered code points at nothing — the map lapsed, or was forgotten
  // from another device. The server no longer creates a map under a code it
  // did not mint (netlify/functions/keep.ts), so forget the code and keep
  // fresh: she gets a new one, and nobody else's map is ever written over.
  if (res?.status === 404 && rememberedCode()) {
    forgetCode()
    res = await put(null)
  }
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

/**
 * Why a restore did not produce a map. Four different things used to arrive as
 * one `null`, and the screen said "No map found for that code. Check it and try
 * again" for all of them — so a person whose map had *expired* (the server
 * deletes the blob on that read) was told to check her typing, and a person
 * with a perfectly good code and no signal was told her map did not exist. She
 * retypes a correct code at a server that cannot answer (docs/NORMAN.md).
 */
export type RestoreProblem = 'not-a-code' | 'not-found' | 'expired' | 'unreachable'

/** Fetch a kept map by its code, saying why when it cannot. */
export async function restoreDetail(code: string): Promise<PersistedState | RestoreProblem> {
  const clean = cleanCode(code)
  if (clean.length !== CODE_LENGTH) return 'not-a-code'

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
    if (res.status === 400) return 'not-a-code'
    return 'unreachable'
  }

  try {
    const { snapshot } = (await res.json()) as { snapshot?: KeptSnapshot }
    if (!snapshot || typeof snapshot !== 'object') return 'unreachable'
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
    return 'unreachable'
  }
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
