import type { VouchState } from '../types'

/**
 * The client half of netlify/functions/vouch.ts. Nothing here ever handles the
 * sentence or the phone after they are sent — the server never returns them.
 */
const ENDPOINT = '/.netlify/functions/vouch'
const TIMEOUT_MS = 10_000

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
  const res = await withTimeout(ENDPOINT, {
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

/** Has anyone vouched for this code? Relationship and first name, or null. */
export async function readVouch(code: string): Promise<VouchState | null> {
  const res = await withTimeout(`${ENDPOINT}?code=${encodeURIComponent(code)}`)
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
  const res = await withTimeout(ENDPOINT, {
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
