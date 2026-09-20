import type { VouchState } from '../types'
import { send, whyOf, type Why } from './net'

/**
 * The client half of netlify/functions/vouch.ts. Nothing here ever handles the
 * sentence or the phone after they are sent — the server never returns them.
 */
const ENDPOINT = '/.netlify/functions/vouch'


function asVouch(x: unknown): VouchState | null {
  if (!x || typeof x !== 'object') return null
  const { vouched, relationship, firstName } = x as Record<string, unknown>
  if (vouched !== true || typeof relationship !== 'string' || typeof firstName !== 'string') return null
  return { relationship, firstName, at: new Date().toISOString() }
}

export interface VouchInput {
  relationship: string
  firstName: string
  sentence: string
  phone?: string
}

export type VouchResult = VouchState | 'already' | 'no_map' | null

/** A family member vouches. Once. */
export async function sendVouch(code: string, input: VouchInput): Promise<VouchResult> {
  const res = await send(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, ...input }),
  })
  if (!res) return null
  if (res.status === 409) return 'already'
  if (res.status === 404) return 'no_map'
  if (!res.ok) return null
  try {
    return asVouch(await res.json())
  } catch {
    return null
  }
}

/**
 * The same read, saying why nothing came back.
 *
 * 'none' is the ordinary answer — nobody has vouched yet — and it is the one
 * that should open the form. Everything else must not: a server that could not
 * be reached used to land here as "no vouch yet" and render the form, so a
 * father filled in his name, a sentence about his daughter and his phone
 * number before finding out (docs/FAIL.md).
 */
export async function readVouchDetail(code: string): Promise<VouchState | 'none' | Why> {
  const res = await send(`${ENDPOINT}?code=${encodeURIComponent(code)}`)
  // A 404 here is the server saying either "no vouch" or "no map"; it does not
  // separate them, and the form is the right answer to both — sendVouch says
  // which if the map is the problem.
  if (res?.status === 404) return 'none'
  if (!res?.ok) return whyOf(res)
  try {
    return asVouch(await res.json()) ?? 'none'
  } catch {
    return 'garbled'
  }
}

/** Has anyone vouched for this code? Relationship and first name, or null. */
export async function readVouch(code: string): Promise<VouchState | null> {
  const res = await send(`${ENDPOINT}?code=${encodeURIComponent(code)}`)
  if (!res?.ok) return null
  try {
    return asVouch(await res.json())
  } catch {
    return null
  }
}

/**
 * Ask for the token her link will carry. The link used to carry her map code,
 * which also opens her map; the token opens nothing but the vouch screen.
 */
export async function askVouch(code: string): Promise<string | null> {
  const res = await send(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ side: 'ask', code }),
  })
  if (!res?.ok) return null
  try {
    const { token } = (await res.json()) as { token?: string }
    return typeof token === 'string' && token.length === 8 ? token : null
  } catch {
    return null
  }
}

/** The link a family member opens. Carries the token, never the map code. */
export function vouchLink(token: string, origin: string): string {
  return `${origin}/?vouch=${encodeURIComponent(token)}`
}
