import type { Gender, Reach } from '../types'
import { keepMap, rememberedCode } from './keep'

/**
 * The founding cohort, from her side.
 *
 * The client half of netlify/functions/cohort.ts. Joining is one act with two
 * halves: her map is kept (so there is something to match), and her place is
 * counted (so the number on the door moves). The way to reach her goes to the
 * founder's form separately — see lib/waitlist.ts — so the count store never
 * holds contact details.
 *
 * The count is two numbers, not one: her city, and the people in her country
 * who said they would travel for the right person. The second is what makes
 * the door honest for the woman in a city too small to ever reach forty on
 * its own — see netlify/functions/cohort.ts for why.
 *
 * Every failure returns null and changes nothing on the device.
 */

const ENDPOINT = '/.netlify/functions/cohort'
const TIMEOUT_MS = 10_000

/** Mirrors the function. Shown on the door, so it lives in one place. */
export const COHORT_TARGET = 40

export interface SideCount {
  women: number
  men: number
}

export interface CohortCount {
  /** Her city, both sides. Null when she is somewhere else — not a place anyone can meet. */
  here: SideCount | null
  /** Everyone in her country who said they would travel for the right person. */
  across: SideCount
  target: number
}

export interface JoinInput {
  scene: string
  gender: Gender
  /** Her country — only needed, and only read, when the scene is `other`. */
  country?: string
  /** How far she would go. Left out, the server takes it as her city. */
  reach?: Reach
  hook?: string
  /** What she has done here — see src/lib/ledger.ts. Goes with her place. */
  ledger?: string[]
  /**
   * How to reach her. Kept in its own store, never beside her answers and
   * never returned by any endpoint — see netlify/functions/cohort.ts. Sent so
   * that the list of people waiting for a pool is ours rather than a form
   * provider's (docs/OWNED.md).
   */
  contact?: string
}

async function withTimeout(input: string, init: RequestInit = {}): Promise<Response | null> {
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

function asSide(x: unknown): SideCount | null {
  if (!x || typeof x !== 'object') return null
  const { women, men } = x as Record<string, unknown>
  return typeof women === 'number' && typeof men === 'number' ? { women, men } : null
}

function asCount(x: unknown): CohortCount | null {
  if (!x || typeof x !== 'object') return null
  const { here, across, target } = x as Record<string, unknown>
  const a = asSide(across)
  if (!a || typeof target !== 'number') return null
  if (here === null) return { here: null, across: a, target }
  const h = asSide(here)
  return h ? { here: h, across: a, target } : null
}

/** The real count for a city and its country, or null when it cannot be read — never a guess. */
export async function cohortCount(scene: string, country?: string): Promise<CohortCount | null> {
  const query = new URLSearchParams({ scene })
  if (country) query.set('country', country)
  const res = await withTimeout(`${ENDPOINT}?${query.toString()}`)
  if (!res?.ok) return null
  try {
    return asCount(await res.json())
  } catch {
    return null
  }
}

async function postJoin(code: string, input: JoinInput): Promise<Response | null> {
  return withTimeout(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, ...input }),
  })
}

/**
 * Keep the map if it isn't already, then count her. Returns her code and the
 * count after she is in it, or null when any part of that could not happen.
 */
export async function joinCohort(input: JoinInput): Promise<({ code: string } & CohortCount) | null> {
  let code = rememberedCode() ?? (await keepMap())
  if (!code) return null

  let res = await postJoin(code, input)
  // A remembered code the server no longer holds (expired, or a store that was
  // reset): keep the map again under it and try once more.
  if (res?.status === 404) {
    code = (await keepMap()) ?? code
    res = await postJoin(code, input)
  }
  if (!res?.ok) return null
  try {
    const body = (await res.json()) as { code?: string }
    const count = asCount(body)
    if (!count || typeof body.code !== 'string') return null
    return { code: body.code, ...count }
  } catch {
    return null
  }
}
