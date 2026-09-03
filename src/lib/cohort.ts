import type { Gender } from '../types'
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
 * Every failure returns null and changes nothing on the device.
 */

const ENDPOINT = '/.netlify/functions/cohort'
const TIMEOUT_MS = 10_000

/** Mirrors the function. Shown on the door, so it lives in one place. */
export const COHORT_TARGET = 40

export interface CohortCount {
  women: number
  men: number
  target: number
}

export interface JoinInput {
  scene: string
  gender: Gender
  hook?: string
  overall?: number
  voices?: string[]
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

function asCount(x: unknown): CohortCount | null {
  if (!x || typeof x !== 'object') return null
  const { women, men, target } = x as Record<string, unknown>
  if (typeof women !== 'number' || typeof men !== 'number' || typeof target !== 'number') return null
  return { women, men, target }
}

/** The real count for a city, or null when it cannot be read — never a guess. */
export async function cohortCount(scene: string): Promise<CohortCount | null> {
  const res = await withTimeout(`${ENDPOINT}?scene=${encodeURIComponent(scene)}`)
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
