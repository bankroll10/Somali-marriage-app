import { getStore } from '@netlify/blobs'
import { failed } from '../shared/ops'
import { CODE, TOKEN, normalise } from '../shared/code'
import { day, toDays } from '../shared/day'
import { readJson } from '../shared/body'
import { overHourlyCap, rateLimited } from '../shared/limit'
import { stamp } from '../shared/record'
import { retire } from '../shared/sheet'
import {
  DAY_MS,
  YEAR_MS,
  deleteIfUnchanged,
  ended,
  lapsed,
  mintFree,
  movingKey,
  onceKey,
  tombstone,
  type Journal,
  type KeptMap,
} from '../shared/integrity'

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
 * real person completed one.
 *
 * Deliberately NOT an account. No password, no email required, no profile. A
 * code she keeps, and nothing else, because the cheapest way to keep a promise
 * about privacy is to hold as little as possible.
 */

/** Keys expire after a year of not being touched — see `expiresAt` below. */
const TTL_MS = YEAR_MS
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
 * authority, so an unmetered DELETE is a destruction primitive that takes the
 * *other* person's couple record with it.
 *
 * Higher than the write cap because a real member restores more often than she
 * keeps, and because being unable to open your own map is a bad hour. It is a
 * circuit breaker on a script, not a limit on a person.
 */
const DEFAULT_READ_CAP = 600
/** Conditional writes lose a race now and then; three tries, like every one here. */
const ATTEMPTS = 3

export type { KeptMap } from '../shared/integrity'

type Store = ReturnType<typeof getStore>

/** A code that was forgotten or moved answers 410, and says which (docs/INTEGRITY.md). */
const closed = (why: string) => Response.json({ error: why }, { status: 410, headers: { 'Cache-Control': 'no-store' } })

/** A map, carried to a new code: the same answers and first day, a fresh year, one more revision. */
function carried(kept: KeptMap, now: number): KeptMap {
  return { snapshot: kept.snapshot, createdAt: kept.createdAt ?? day(now), expiresAt: day(now + TTL_MS), rev: (kept.rev ?? 0) + 1 }
}

/**
 * Finish a move whose copy is written: close the old code and put the journal
 * away. Shared with the sweep, which rolls an abandoned move forward from
 * here once the old code is closed.
 */
export async function finishMove(maps: Store, old: string, now = Date.now()) {
  await tombstone(maps, old, 'moved', now)
  const was = (await maps.get(old, { type: 'json' })) as KeptMap | null
  if (was?.once) await maps.delete(onceKey(was.once))
  await maps.delete(old)
  await maps.delete(movingKey(old))
}

/**
 * Undo a move that was abandoned before the old code was closed: the copy
 * under the new code goes. The new code was never handed to anyone — a move
 * answers only once it is finished — so nothing that anyone holds stops
 * working.
 */
export async function rollBackMove(maps: Store, old: string, to: string) {
  await maps.delete(to)
  await maps.delete(movingKey(old))
}

/** Normalise what a human typed: case, spaces, and the dash people add. */
export default async function handler(req: Request) {
  const store = getStore('maps')

  // ── Restore ──────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const code = normalise(new URL(req.url).searchParams.get('code') ?? '')
    // The alphabet, not just the length: a code with an O or a 0 in it was
    // never minted, and is refused before it spends anything.
    if (!CODE.test(code)) {
      return Response.json({ error: 'bad_code' }, { status: 400 })
    }
    // Bounded, after validation: a wrong-shaped code spends nothing.
    if (await overHourlyCap('restore', DEFAULT_READ_CAP)) return rateLimited()
    // Never cached, by a browser or anything between: the body is her whole
    // map, and the only thing protecting it is a code in the URL. A 404 is
    // not cached either — "nothing here" for a code is a wrong answer the
    // day it is kept (docs/THREAT.md, T4).
    const headers = { 'Cache-Control': 'no-store' }
    try {
      // A code she forgot or changed opens nothing, even if a forget or a move
      // stopped part-way and the map is still there (docs/INTEGRITY.md).
      const why = await ended(store, code)
      if (why) return closed(why)
      const kept = (await store.getWithMetadata(code, { type: 'json' })) as { data: KeptMap; etag?: string } | null
      if (!kept) return Response.json({ error: 'not_found' }, { status: 404, headers })
      if (lapsed(kept.data)) {
        // Only the version read as lapsed: one renewed a moment ago stays.
        await deleteIfUnchanged(store, code, kept.etag)
        return Response.json({ error: 'expired' }, { status: 404, headers })
      }
      return Response.json({ snapshot: kept.data.snapshot, rev: kept.data.rev ?? 0 }, { headers })
    } catch (err) {
      await failed('keep', 'read failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // ── Forget ───────────────────────────────────────────────────────────────
  // Everything kept under her code, gone: the map and the eleven she sent
  // him. Possession of the code is the authority, exactly as it is for
  // restoring. What cannot be undone is not here at all: a count with no code
  // in it.
  //
  // In this order, so that any step can fail and a retry finishes it
  // (docs/INTEGRITY.md): the code is closed first, so from that moment it
  // restores nothing and cannot be kept again from another phone; then the
  // sheet is retired; the map goes last, because it is the one thing that
  // says which couple sheet was hers. A retry after the map went, with the
  // code closed as forgotten, answers that it is done.
  if (req.method === 'DELETE') {
    const code = normalise(new URL(req.url).searchParams.get('code') ?? '')
    if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
    // Bounded like the restore above, and for a sharper reason: this deletes.
    if (await overHourlyCap('forget', DEFAULT_READ_CAP)) return rateLimited()
    try {
      const kept = (await store.get(code, { type: 'json' })) as KeptMap | null
      const why = await ended(store, code)
      if (!kept && why !== 'forgotten') return Response.json({ error: 'not_found' }, { status: 404 })
      if (why !== 'forgotten') await tombstone(store, code, 'forgotten')

      // The one thing read out of the snapshot, and the one thing it may name:
      // the sheet. Anyone holding a couple code can already delete it
      // (netlify/functions/couple.ts), so a forged snapshot gains nothing here.
      const snapshot = (kept?.snapshot ?? {}) as { couple?: { code?: unknown } }
      const coupleCode = typeof snapshot.couple?.code === 'string' ? normalise(snapshot.couple.code) : ''
      // Retired, not erased: a report about it can still reach the founder.
      if (CODE.test(coupleCode)) await retire(getStore('couples'), coupleCode)
      // The first keep's once key, which names this code for a day.
      if (kept?.once) await store.delete(onceKey(kept.once))
      // Reports are not touched here, and cannot be. This cascade used to
      // take every report under `${couple}-${side}-`, reading both the couple
      // code and the side out of the snapshot — which is whatever the caller
      // POSTed. The reported man holds the couple code, so he could keep a
      // throwaway map claiming to be her, forget it, and erase every report
      // she had filed about him (docs/SECURITY.md, O1). A report stays until
      // the founder has read and resolved it (netlify/functions/safety.ts,
      // docs/ABUSE.md).
      await store.delete(code)
      return Response.json({ forgotten: true })
    } catch (err) {
      await failed('keep', 'forget failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // ── A new code, everything carried across ────────────────────────────────
  // For a code someone else has seen. Possession is the authority here
  // (docs/HARD.md), so a code read over her shoulder or taken from her phone
  // let its holder read her map and write over it. The only way to take it
  // back was forget me, which cost her the map (docs/THREAT.md T8,
  // docs/ABUSE.md).
  //
  // Journaled, so that a failure at any step is finished by a retry or undone
  // by the sweep, and never leaves a whole copy of her map under a code nobody
  // was told (docs/INTEGRITY.md):
  //
  //   1. `moving/<old>` names the new code before anything is copied. A retry
  //      finds it and resumes the same move — the same new code, never a
  //      second copy.
  //   2. The map is copied under the new code.
  //   3. The old map is read again: a save that landed while this ran is
  //      carried across, not lost with the old code.
  //   4. The old code is closed, the journal put away, and only then is the
  //      new code handed back.
  //
  // A move abandoned before step 4 is rolled back by the sweep; one abandoned
  // during it is rolled forward. The couple sheet has its own code and is not
  // moved; nor are reports, which are keyed by it.
  if (req.method === 'PUT') {
    const old = normalise(new URL(req.url).searchParams.get('code') ?? '')
    if (!CODE.test(old)) return Response.json({ error: 'bad_code' }, { status: 400 })
    // The forget bucket: it is a delete, and it is as rare.
    if (await overHourlyCap('forget', DEFAULT_READ_CAP)) return rateLimited()
    try {
      const now = Date.now()
      let journal = (await store.get(movingKey(old), { type: 'json' })) as Journal | null
      const why = await ended(store, old)
      // Closed and no move in flight: it was forgotten, or its move finished.
      if (why && !journal) return closed(why)

      const read = (await store.getWithMetadata(old, { type: 'json' })) as { data: KeptMap; etag?: string } | null
      if (!journal) {
        if (!read) return Response.json({ error: 'not_found' }, { status: 404 })
        const minted = await mintFree(store, stamp(carried(read.data, now)), async (c) => !!(await ended(store, c)))
        if (!minted) return Response.json({ error: 'unavailable' }, { status: 503 })
        const claimed = await store.setJSON(movingKey(old), stamp({ to: minted, at: day(now) }), { onlyIfNew: true })
        if (claimed.modified) journal = { to: minted, at: day(now) }
        else {
          // Another attempt at the same move got there first: use its code.
          await store.delete(minted)
          journal = (await store.get(movingKey(old), { type: 'json' })) as Journal | null
          if (!journal) return Response.json({ error: 'unavailable' }, { status: 503 })
        }
      }
      const code = journal.to

      // Forgotten while it was moving: forgetting wins. What was copied under
      // the new code goes with everything else.
      if (why === 'forgotten') {
        await store.delete(code)
        await store.delete(movingKey(old))
        return closed(why)
      }

      if (!why) {
        // A resumed move whose mint was lost: write the copy again.
        if (read && !(await store.getMetadata(code))) await store.setJSON(code, stamp(carried(read.data, now)), { onlyIfNew: true })
        // The old map, read again. A save that landed since it was copied is
        // carried across now, not deleted with the old code a moment later.
        for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
          const again = (await store.getWithMetadata(old, { type: 'json' })) as { data: KeptMap; etag?: string } | null
          if (!again || !read || again.etag === read.etag) break
          await store.setJSON(code, stamp(carried(again.data, now)))
          read.etag = again.etag
        }
      }
      await finishMove(store, old, now)
      const moved = (await store.get(code, { type: 'json' })) as KeptMap | null
      return Response.json({ code, rev: moved?.rev ?? 0 })
    } catch (err) {
      await failed('keep', 'new code failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // ── Keep ─────────────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return Response.json({ error: 'GET, POST, PUT or DELETE only' }, { status: 405 })
  }

  // Measured before it is parsed (netlify/shared/body.ts). This one used to
  // `req.json()` first and `JSON.stringify` the result back to check its size.
  // A real map is a few kilobytes; anything far past that is a mistake or an
  // attempt to use us as free storage.
  const body = await readJson<{ snapshot?: unknown; code?: unknown; rev?: unknown; once?: unknown }>(req, MAX_BODY)
  if (body instanceof Response) return body
  if (!body.snapshot || typeof body.snapshot !== 'object') {
    return Response.json({ error: 'missing_snapshot' }, { status: 400 })
  }

  // The client promises never to send these (src/lib/keep.ts): her
  // conversations with the guide, the follow-ups the guide handed her, the
  // line she writes for the next person at the end, a last-seen time, and
  // any moment finer than a day. The server refuses to hold them even if an
  // older client still sends them — a promise about what is stored is kept
  // where it is stored (docs/PRIVACY.md). An older client may also send its
  // place at the door, with her email or phone, and a relative's vouch; both
  // went with the door (2026-09-24), and neither is held.
  const snap = body.snapshot as Record<string, unknown>
  delete snap.coachThreads
  delete snap.updatedAt
  delete snap.waitlist
  delete snap.vouch
  if (snap.ending && typeof snap.ending === 'object') delete (snap.ending as Record<string, unknown>).advice
  if (Array.isArray(snap.followups)) {
    snap.followups = snap.followups
      .filter((f) => !(f && typeof f === 'object' && (f as { source?: unknown }).source === 'guide'))
      // Ids unique within her list, and nothing more — they were built from
      // the moment each was written.
      .map((f, i) => (f && typeof f === 'object' ? { ...f, id: `${(f as { source?: unknown }).source}:${(f as { topic?: unknown }).topic}:${i}` } : f))
  }
  const snapshot = toDays(snap)

  // Re-keeping under the code she already has, so updating a map does not
  // hand her a second code to remember.
  const code = body.code ? normalise(body.code) : ''
  if (body.code && !CODE.test(code)) {
    return Response.json({ error: 'bad_code' }, { status: 400 })
  }
  // The revision this phone last saw, and the key of this first keep — both
  // optional, so an older client keeps exactly as it always did.
  const seen = typeof body.rev === 'number' && Number.isInteger(body.rev) && body.rev >= 0 ? body.rev : undefined
  const once = typeof body.once === 'string' && TOKEN.test(body.once) ? body.once : undefined

  // Bounded, like every public write — after validation, before any read.
  if (await overHourlyCap('keep', DEFAULT_HOURLY_CAP)) return rateLimited()

  const now = Date.now()

  /**
   * Re-keeping under her code: only ever *over her own map*. This used to be a
   * bare write under whatever code the body carried — so a code nobody held
   * was created on demand, skipping `mint`'s `onlyIfNew`, and a guessed code
   * overwrote a stranger's map as surely as DELETE once destroyed one
   * (docs/HARD.md row 3, docs/BOARD.md). Nothing under the code is a 404, and
   * the client mints fresh; something under it is written with the etag it
   * was read at, so two saves racing lose one cleanly instead of
   * interleaving.
   *
   * And only by a phone that has seen the latest keep (docs/INTEGRITY.md). A
   * phone that last kept at revision 2 cannot write over revision 3 kept from
   * another phone since — it is told `stale`, and she decides which to keep.
   * A phone that sends no revision (an older client, or a code kept before
   * revisions) is accepted as before.
   */
  const rekeep = async (target: string, rev: number | undefined): Promise<Response> => {
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const existing = (await store.getWithMetadata(target, { type: 'json' })) as { data: KeptMap; etag?: string } | null
      if (!existing) return Response.json({ error: 'not_found' }, { status: 404 })
      const was = existing.data
      const held = was.rev ?? 0
      if (rev !== undefined && held > rev) return Response.json({ error: 'stale', rev: held }, { status: 409 })
      // Re-keeping refreshes the year but keeps the day it was first kept. A
      // createdAt that moved on every save was a last-seen timestamp under
      // another name — an activity trace this store has no business holding.
      const kept: KeptMap = {
        snapshot,
        createdAt: was.createdAt ?? day(now),
        expiresAt: day(now + TTL_MS),
        rev: held + 1,
        ...(was.once ? { once: was.once } : {}),
      }
      const { modified } = await store.setJSON(target, stamp(kept), { onlyIfMatch: existing.etag })
      if (modified) return Response.json({ code: target, rev: kept.rev })
    }
    return Response.json({ error: 'conflict' }, { status: 409 })
  }

  try {
    if (code) {
      // A code she forgot, or changed, from another phone: it is not kept
      // again behind her back. The phone is told which, and she decides.
      const why = await ended(store, code)
      if (why) return closed(why)
      return await rekeep(code, seen)
    }
    // The same first keep, again — a double tap, or a reply that never
    // arrived: the map that attempt made, kept again, rather than a second map
    // under a second code.
    if (once) {
      const prior = (await store.get(onceKey(once), { type: 'json' })) as { code?: unknown } | null
      if (typeof prior?.code === 'string' && CODE.test(prior.code) && !(await ended(store, prior.code))) {
        const res = await rekeep(prior.code, undefined)
        if (res.status !== 404) return res
      }
    }
    // A code nobody holds yet: minted with `onlyIfNew`, so a collision costs a
    // retry instead of somebody's map — see netlify/shared/code.ts for why
    // that is not theoretical — and never a code that was forgotten or moved.
    const kept: KeptMap = { snapshot, createdAt: day(now), expiresAt: day(now + TTL_MS), rev: 1, ...(once ? { once } : {}) }
    const minted = await mintFree(store, stamp(kept), async (c) => !!(await ended(store, c)))
    if (!minted) {
      await failed('keep', 'every minted code collided')
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
    if (once) {
      const claimed = await store.setJSON(onceKey(once), stamp({ code: minted, expiresAt: day(now + DAY_MS) }), { onlyIfNew: true })
      if (!claimed.modified) {
        // Two copies of the same first keep, at the same moment: one map.
        const winner = (await store.get(onceKey(once), { type: 'json' })) as { code?: unknown } | null
        if (typeof winner?.code === 'string' && winner.code !== minted) {
          await store.delete(minted)
          return await rekeep(winner.code, undefined)
        }
      }
    }
    return Response.json({ code: minted, rev: 1 })
  } catch (err) {
    // Storage is unavailable. The app keeps working exactly as it did before
    // this function existed — her map is still on her device — so this degrades
    // to the old behaviour rather than to an error.
    await failed('keep', 'write failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
