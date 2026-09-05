import { getStore } from '@netlify/blobs'
import { day } from '../shared/day'

/**
 * The first thing this business actually owns.
 *
 * Until now every trace of a member lived in her own browser: her answers, her
 * map, her check-ins, even the analytics events, all in localStorage. Clear
 * Safari or pick up a different phone and she was gone — and we never knew she
 * had been here at all. We could not count members, could not recognise a
 * returning one, and could not reach anyone. A waitlist of three emails was the
 * entire customer relationship.
 *
 * This gives her map a home on our side, and it is a trade rather than a
 * favour: she gets a map that survives a lost phone, we get a record that a
 * real person completed one. That is the difference between a demo and a
 * business, and it is the precondition for everything else — retention,
 * measurement, and eventually matching two real people to each other.
 *
 * Deliberately NOT an account. No password, no email required, no profile. A
 * code she keeps, and nothing else, because the cheapest way to keep a promise
 * about privacy is to hold as little as possible.
 */

/**
 * Unambiguous over the phone and in a text message: no O/0, no I/1/l, no U/V.
 * She may well be reading this to a friend or typing it on a cracked screen.
 */
const ALPHABET = 'ACDEFGHJKMNPQRTWXY34789'
const CODE_LENGTH = 6

/** Keys expire after a year of not being touched — see `expiresAt` below. */
const TTL_MS = 365 * 24 * 60 * 60 * 1000

export interface KeptMap {
  /** Everything the app needs to restore her, as written by lib/storage.ts. */
  snapshot: unknown
  createdAt: string
  expiresAt: string
}

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

/** Normalise what a human typed: case, spaces, and the dash people add. */
function normalise(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export default async function handler(req: Request) {
  const store = getStore('maps')

  // ── Restore ──────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const code = normalise(new URL(req.url).searchParams.get('code') ?? '')
    if (code.length !== CODE_LENGTH) {
      return Response.json({ error: 'bad_code' }, { status: 400 })
    }
    try {
      const kept = (await store.get(code, { type: 'json' })) as KeptMap | null
      if (!kept) return Response.json({ error: 'not_found' }, { status: 404 })
      if (Date.parse(kept.expiresAt) < Date.now()) {
        await store.delete(code)
        return Response.json({ error: 'expired' }, { status: 404 })
      }
      return Response.json({ snapshot: kept.snapshot })
    } catch (err) {
      console.error('[niyyah] keep: read failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // ── Keep ─────────────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return Response.json({ error: 'GET or POST only' }, { status: 405 })
  }

  let body: { snapshot?: unknown; code?: string }
  try {
    body = (await req.json()) as { snapshot?: unknown; code?: string }
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 })
  }
  if (!body.snapshot || typeof body.snapshot !== 'object') {
    return Response.json({ error: 'missing_snapshot' }, { status: 400 })
  }

  // The client promises never to send three things (src/lib/keep.ts): her
  // conversations with the guide, the follow-ups the guide handed her, and her
  // email or phone. The server refuses to hold them even if an older client
  // still does — a promise about what is stored is kept where it is stored.
  const snap = body.snapshot as Record<string, unknown>
  delete snap.coachThreads
  if (snap.waitlist && typeof snap.waitlist === 'object') delete (snap.waitlist as Record<string, unknown>).contact
  if (Array.isArray(snap.followups)) {
    snap.followups = snap.followups.filter(
      (f) => !(f && typeof f === 'object' && (f as { source?: unknown }).source === 'guide'),
    )
  }

  // A rough ceiling. A real map is a few kilobytes; anything far past that is a
  // mistake or an attempt to use us as free storage.
  const serialised = JSON.stringify(body.snapshot)
  if (serialised.length > 128_000) {
    return Response.json({ error: 'too_large' }, { status: 413 })
  }

  // Re-keeping under the code she already has, so updating a map does not
  // hand her a second code to remember.
  const code = body.code ? normalise(body.code) : newCode()
  if (code.length !== CODE_LENGTH) {
    return Response.json({ error: 'bad_code' }, { status: 400 })
  }

  const now = Date.now()
  try {
    // Re-keeping refreshes the year but keeps the day it was first kept. A
    // createdAt that moved on every save was a last-seen timestamp under
    // another name — an activity trace this store has no business holding.
    const existing = body.code ? ((await store.get(code, { type: 'json' })) as KeptMap | null) : null
    const kept: KeptMap = {
      snapshot: body.snapshot,
      createdAt: existing?.createdAt ?? day(now),
      expiresAt: day(now + TTL_MS),
    }
    await store.setJSON(code, kept)
    return Response.json({ code })
  } catch (err) {
    // Storage is unavailable. The app keeps working exactly as it did before
    // this function existed — her map is still on her device — so this degrades
    // to the old behaviour rather than to an error.
    console.error('[niyyah] keep: write failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
