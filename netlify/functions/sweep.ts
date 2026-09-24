import { getStore } from '@netlify/blobs'
import { failed, mark, pruneOps } from '../shared/ops'
import { day } from '../shared/day'
import { isGone, retire } from '../shared/sheet'
import { DAY_MS, deleteIfUnchanged, ended, isBookkeeping, isMoving, lapsed, type Journal } from '../shared/integrity'
import { finishMove, rollBackMove } from './keep'

/**
 * The weekly sweep — what makes every stated lifetime true without a person
 * remembering (docs/TIME.md).
 *
 *  - **A kept map** past its year goes, with the bookkeeping beside it
 *    (netlify/functions/keep.ts).
 *  - **A couple sheet** past its ninety days. It stopped being readable, and
 *    was deleted only if someone happened to open it.
 *  - **A step count** past its year, unless it reached `married`, which is
 *    kept by rule (netlify/functions/progress.ts).
 *  - **A change of code abandoned part-way** is rolled back or finished
 *    (docs/INTEGRITY.md).
 *  - **The three retired stores** — `cohort`, `contacts` and `vouches` — are
 *    emptied. The door and the family vouch were removed on 2026-09-24
 *    (docs/DECISIONS.md); what they held was a way to reach someone and a
 *    relative's name and phone, and nothing reads them any more. Once empty,
 *    this pass finds nothing.
 *
 * Reports, tallies and limits are never touched: a report waits for the
 * founder, and the other two carry nobody. It is idempotent — a second run
 * finds nothing — and it needs no key, because it only ever removes what the
 * product had already promised to remove. Every record is its own step: one
 * it cannot read is counted in `errors` and tried again next week, and
 * everything else still goes.
 *
 * Netlify does not expose a scheduled function over HTTP in production; if
 * it ever did, the same reasoning holds.
 */

type Store = ReturnType<typeof getStore>

export interface Swept {
  /** Kept maps past their year, removed. */
  maps: number
  /** Couple sheets past their ninety days. */
  couples: number
  /** Step counts past their year that never reached `married`. */
  progress: number
  /** Changes of code abandoned part-way: rolled back, or finished. */
  journals: number
  /** Records removed from the retired stores: the door's, its contacts', the vouches'. */
  retired: number
  /** Records that could not be read or removed this week. Everything else still went; these are tried again. */
  errors: number
}

const empty = (): Swept => ({ maps: 0, couples: 0, progress: 0, journals: 0, retired: 0, errors: 0 })

/** Stores that belonged to the door and the vouch, emptied and never written again. */
export const RETIRED_STORES = ['cohort', 'contacts', 'vouches'] as const

/** A move still in flight is left alone for this long — a move takes seconds, and the sweep runs at midnight. */
const JOURNAL_GRACE_MS = 2 * DAY_MS

/** One record's work, which may fail without stopping anyone else's. */
async function each(swept: Pick<Swept, 'errors'>, work: () => Promise<void>): Promise<void> {
  try {
    await work()
  } catch (err) {
    swept.errors += 1
    await failed('sweep', 'one record failed; the rest go on', err)
  }
}

/** Kept maps: their year, and a change of code left part-way. */
export async function sweepLapsed(maps: Store, now = Date.now()): Promise<Swept> {
  const swept = empty()

  // Moves abandoned part-way, first, so everything after sees the codes as
  // they will stay. Before the old code was closed: rolled back — the new
  // code was never handed to anyone. After: finished.
  for (const { key } of (await maps.list({ prefix: 'moving/' })).blobs) {
    await each(swept, async () => {
      const journal = (await maps.get(key, { type: 'json' })) as Journal | null
      if (!journal || Date.parse(journal.at) + JOURNAL_GRACE_MS > now) return
      const old = key.slice('moving/'.length)
      const why = await ended(maps, old)
      if (why === 'moved') await finishMove(maps, old, now)
      else await rollBackMove(maps, old, journal.to)
      swept.journals += 1
    })
  }

  // Maps past their year, and the bookkeeping beside them — a tombstone at
  // the end of its year, a first keep's once key at the end of its day.
  // Only the version read as lapsed is deleted: one renewed by its owner a
  // moment ago stays (netlify/shared/integrity.ts `deleteIfUnchanged`).
  for (const { key } of (await maps.list()).blobs) {
    if (isMoving(key)) continue
    await each(swept, async () => {
      const read = (await maps.getWithMetadata(key, { type: 'json' })) as { data: { expiresAt?: unknown }; etag?: string } | null
      if (!read || !lapsed(read.data, now)) return
      if ((await deleteIfUnchanged(maps, key, read.etag)) && !isBookkeeping(key)) swept.maps += 1
    })
  }

  return swept
}

/** Everything with a lifetime of its own: couple sheets (ninety days) and step counts (a year). */
export async function sweepExpired(couples: Store, progress: Store, now = Date.now()) {
  const out = { couples: 0, progress: 0, errors: 0 }

  for (const { key } of (await couples.list()).blobs) {
    await each(out, async () => {
      const record = (await couples.get(key, { type: 'json' })) as { expiresAt?: unknown } | null
      if (!lapsed(record, now)) return
      if (isGone(key)) {
        await couples.delete(key)
        return
      }
      await retire(couples, key, Date.parse(record!.expiresAt as string))
      out.couples += 1
    })
  }

  for (const { key } of (await progress.list()).blobs) {
    await each(out, async () => {
      const record = (await progress.get(key, { type: 'json' })) as { first?: Record<string, unknown>; expiresAt?: unknown } | null
      if (record?.first && 'married' in record.first) return
      if (lapsed(record, now)) {
        await progress.delete(key)
        out.progress += 1
      }
    })
  }

  return out
}

/** The retired stores, emptied. Every key goes; nothing in them is read. */
export async function sweepRetired(open: (name: string) => Store): Promise<{ retired: number; errors: number }> {
  const out = { retired: 0, errors: 0 }
  for (const name of RETIRED_STORES) {
    const store = open(name)
    for (const { key } of (await store.list()).blobs) {
      await each(out, async () => {
        await store.delete(key)
        out.retired += 1
      })
    }
  }
  return out
}

/** The whole sweep, every store, as the schedule runs it. */
export async function sweep(now = Date.now()): Promise<Swept> {
  const swept = await sweepLapsed(getStore('maps'), now)
  const rest = await sweepExpired(getStore('couples'), getStore('progress'), now)
  const gone = await sweepRetired(getStore)
  return { ...swept, couples: rest.couples, progress: rest.progress, retired: gone.retired, errors: swept.errors + rest.errors + gone.errors }
}

export default async function handler(_req: Request) {
  try {
    const swept = await sweep()
    // The operations counts past their thirty-five days (shared/ops.ts). Its
    // own failure is one more error, never the sweep's.
    let ops = 0
    try {
      ops = await pruneOps()
    } catch (err) {
      await failed('sweep', 'ops prune failed', err)
      swept.errors += 1
    }
    // So /health can tell a sweep that ran from one that stopped (docs/OPS.md).
    await mark('sweep', { errors: swept.errors })
    console.log(
      `[niyyah] sweep: ${swept.maps} maps, ${swept.couples} couples, ${swept.progress} step counts, ${swept.journals} moves, ${swept.retired} retired, ${ops} old ops counts, ${swept.errors} errors on ${day()}`,
    )
    return Response.json({ swept, at: day() })
  } catch (err) {
    await failed('sweep', 'failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}

/** Sundays, on Netlify's scheduler. `@weekly` is cron's own alias for `0 0 * * 0`. */
export const config = { schedule: '@weekly' }
