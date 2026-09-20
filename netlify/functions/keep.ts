import { getStore } from '@netlify/blobs'
import { CODE_LENGTH, mint, normalise } from '../shared/code'
import { day } from '../shared/day'
import { overHourlyCap, rateLimited } from '../shared/limit'
import { stamp } from '../shared/record'

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

/** Keys expire after a year of not being touched — see `expiresAt` below. */
const TTL_MS = 365 * 24 * 60 * 60 * 1000
/** A whole map, generously. Checked against the raw body, before it is parsed. */
const MAX_BODY = 128_000
/**
 * Maps kept in one hour, from everyone. A loop against this route is the
 * cheapest way to spend a free plan's storage; this is what bounds it. A
 * circuit breaker, not a member limit — see netlify/shared/limit.ts.
 */
const DEFAULT_HOURLY_CAP = 300
/**
 * Restores and forgets in one hour, from everyone.
 *
 * These are reads, and until now nothing bounded them — every cap in this
 * product was on a write. That was backwards. A six-character code is the
 * *sole* authenticator for a kept map and it carries about 27 bits, so an
 * unmetered GET is an enumeration surface: at a hundred requests a second
 * against fifty thousand members, a stranger's whole map roughly every thirty
 * seconds. And DELETE is worse than a read — possession of the code is the
 * authority, so an unmetered DELETE is a destruction primitive that cascades
 * across five stores and takes the *other* person's couple record with it.
 *
 * Higher than the write cap because a real member restores more often than she
 * keeps, and because being unable to open your own map is a bad hour. It is a
 * circuit breaker on a script, not a limit on a person.
 */
const DEFAULT_READ_CAP = 600

export interface KeptMap {
  /** Everything the app needs to restore her, as written by lib/storage.ts. */
  snapshot: unknown
  createdAt: string
  expiresAt: string
}

/** Normalise what a human typed: case, spaces, and the dash people add. */
export default async function handler(req: Request) {
  const store = getStore('maps')

  // ── Restore ──────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const code = normalise(new URL(req.url).searchParams.get('code') ?? '')
    if (code.length !== CODE_LENGTH) {
      return Response.json({ error: 'bad_code' }, { status: 400 })
    }
    // Bounded, after validation: a wrong-shaped code spends nothing.
    if (await overHourlyCap('restore', DEFAULT_READ_CAP)) return rateLimited()
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

  // ── Forget ───────────────────────────────────────────────────────────────
  // Everything kept under her code, gone: the map, the eleven she sent him,
  // her family's vouch and the token that pointed at it, her place on the
  // door, and the way to reach her. Possession of the code is the authority, exactly as it is for
  // restoring — and it is safe only because the vouch link no longer carries
  // the code. Asking twice is a quiet 404: there was nothing left to forget.
  // What cannot be undone is not here at all: a count with no code in it.
  if (req.method === 'DELETE') {
    const code = normalise(new URL(req.url).searchParams.get('code') ?? '')
    if (code.length !== CODE_LENGTH) return Response.json({ error: 'bad_code' }, { status: 400 })
    // Bounded like the restore above, and for a sharper reason: this deletes.
    if (await overHourlyCap('forget', DEFAULT_READ_CAP)) return rateLimited()
    try {
      const kept = (await store.get(code, { type: 'json' })) as KeptMap | null
      if (!kept) return Response.json({ error: 'not_found' }, { status: 404 })
      const snapshot = (kept.snapshot ?? {}) as { couple?: { code?: unknown }; identity?: { gender?: unknown } }
      const coupleCode = typeof snapshot.couple?.code === 'string' ? normalise(snapshot.couple.code) : ''
      // Whose side this map is. Reports are keyed `${couple}-${side}-${id}` by
      // the side that filed them, so this is what lets the cascade take hers
      // and leave his (or the other way round).
      const ownSide = snapshot.identity?.gender === 'woman' || snapshot.identity?.gender === 'man' ? snapshot.identity.gender : null

      const couples = getStore('couples')
      const vouches = getStore('vouches')
      const cohort = getStore('cohort')
      const contacts = getStore('contacts')
      const reports = getStore('reports')

      if (coupleCode.length === CODE_LENGTH) await couples.delete(coupleCode)
      const token = (await vouches.get(`asked/${code}`, { type: 'text' })) as string | null
      if (token) await vouches.delete(`token/${token}`)
      await vouches.delete(`asked/${code}`)
      await vouches.delete(code)
      const member = (await cohort.get(`index/${code}`, { type: 'text' })) as string | null
      if (member) await cohort.delete(member)
      await cohort.delete(`index/${code}`)
      // The way to reach her, which used to be deleted by hand — see
      // netlify/functions/cohort.ts and docs/OWNED.md.
      await contacts.delete(code)
      // Any report she filed — and only hers. Trust promises deletion of
      // everything, and this store holds the one free text in the product,
      // her own words about what happened. It was the only store the cascade
      // missed (docs/HARD.md). Until 2026-09-17 it then took every report under
      // the couple code, whichever side had filed it: both people hold that
      // code, a man can keep a map too, so a reported man could erase the
      // report about himself by tapping forget me — the exact thing
      // netlify/functions/couple.ts says must never happen (docs/RISKS.md R4).
      // Now the prefix carries the side, and an unknown side deletes nothing
      // here. The couple record is deleted just above; a report left behind
      // points at a sheet that is gone, which is what the founder's queue
      // shows. Resolved stubs carry no code and nothing of hers, and stay.
      // When the side is unknown there is no safe prefix to delete under, so
      // her reports stay — and this used to answer `{ forgotten: true }`
      // anyway. Trust's promise must not be reported kept when part of it was
      // skipped, so the one case that leaves her words behind says so
      // (docs/FAIL.md).
      let reportsTaken = true
      if (coupleCode.length === CODE_LENGTH) {
        if (ownSide) {
          const { blobs } = await reports.list({ prefix: `${coupleCode}-${ownSide}-` })
          for (const { key } of blobs) await reports.delete(key)
        } else {
          reportsTaken = false
        }
      }
      await store.delete(code)
      return Response.json({ forgotten: true, reportsTaken })
    } catch (err) {
      console.error('[niyyah] keep: forget failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // ── Keep ─────────────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return Response.json({ error: 'GET, POST or DELETE only' }, { status: 405 })
  }

  // Measured before it is parsed, like every other function here. This one
  // used to `req.json()` first and `JSON.stringify` the result back to check
  // its size — so an arbitrarily large body was fully buffered and parsed
  // before the guard that exists to refuse it ever ran, and every honest keep
  // paid for a second full pass over the object.
  let raw: string
  try {
    raw = await req.text()
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 })
  }
  // A real map is a few kilobytes; anything far past that is a mistake or an
  // attempt to use us as free storage.
  if (raw.length > MAX_BODY) return Response.json({ error: 'too_large' }, { status: 413 })

  let body: { snapshot?: unknown; code?: string }
  try {
    body = JSON.parse(raw) as { snapshot?: unknown; code?: string }
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

  // Re-keeping under the code she already has, so updating a map does not
  // hand her a second code to remember.
  const code = body.code ? normalise(body.code) : ''
  if (body.code && code.length !== CODE_LENGTH) {
    return Response.json({ error: 'bad_code' }, { status: 400 })
  }

  // Bounded, like every public write — after validation, before any read.
  if (await overHourlyCap('keep', DEFAULT_HOURLY_CAP)) return rateLimited()

  const now = Date.now()
  try {
    // Re-keeping under her code: only ever *over her own map*. This used to be
    // a bare write under whatever code the body carried — so a code nobody
    // held was created on demand, skipping `mint`'s `onlyIfNew`, and a guessed
    // code overwrote a stranger's map as surely as DELETE once destroyed one
    // (docs/HARD.md row 3, docs/BOARD.md). Now: nothing under the code is a
    // 404, and the client mints fresh; something under it is written with the
    // etag it was read at, so two saves racing lose one cleanly instead of
    // interleaving. Three tries, like every conditional write here.
    if (code) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const existing = await store.getWithMetadata(code, { type: 'json' })
        if (!existing) return Response.json({ error: 'not_found' }, { status: 404 })
        const was = existing.data as KeptMap
        // Re-keeping refreshes the year but keeps the day it was first kept. A
        // createdAt that moved on every save was a last-seen timestamp under
        // another name — an activity trace this store has no business holding.
        const kept: KeptMap = { snapshot: body.snapshot, createdAt: was.createdAt ?? day(now), expiresAt: day(now + TTL_MS) }
        const { modified } = await store.setJSON(code, stamp(kept), { onlyIfMatch: existing.etag })
        if (modified) return Response.json({ code })
      }
      return Response.json({ error: 'conflict' }, { status: 409 })
    }
    // A code nobody holds yet: minted with `onlyIfNew`, so a collision costs a
    // retry instead of somebody's map — see netlify/shared/code.ts for why
    // that is not theoretical.
    const kept: KeptMap = { snapshot: body.snapshot, createdAt: day(now), expiresAt: day(now + TTL_MS) }
    const minted = await mint((c, v: KeptMap) => store.setJSON(c, v, { onlyIfNew: true }), stamp(kept))
    if (!minted) {
      console.error('[niyyah] keep: every minted code collided')
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
    return Response.json({ code: minted })
  } catch (err) {
    // Storage is unavailable. The app keeps working exactly as it did before
    // this function existed — her map is still on her device — so this degrades
    // to the old behaviour rather than to an error.
    console.error('[niyyah] keep: write failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
