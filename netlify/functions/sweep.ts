import { getStore } from '@netlify/blobs'
import { failed, mark, pruneOps } from '../shared/ops'
import { day } from '../shared/day'
import { isGone, retire } from '../shared/sheet'
import { DAY_MS, deleteIfUnchanged, ended, isBookkeeping, isMoving, lapsed, type Journal } from '../shared/integrity'
import { finishMove, rollBackMove } from './keep'
import { removeBy } from './introduce'

/**
 * The weekly sweep — what makes every stated lifetime true without a person
 * remembering (docs/OPS.md).
 *
 *  - **A kept map** past its year goes, with the bookkeeping beside it
 *    (netlify/functions/keep.ts).
 *  - **A couple sheet** past its ninety days. It stopped being readable, and
 *    was deleted only if someone happened to open it.
 *  - **A step count** past its year, unless it reached `married`, which is
 *    kept by rule (netlify/functions/progress.ts).
 *  - **A change of code abandoned part-way** is rolled back or finished
 *    (docs/PRIVACY.md).
 *  - **A name on the introduction list** past its 180 days — removed at the
 *    last weekly run before its day, so that no name is kept longer than
 *    Trust says (docs/DECISIONS.md decision 32). A name is never renewed or
 *    reminded about; its owner puts it down again if she still wants it.
 *
 * **What it leaves alone, by decision.** From 2026-09-24 to 2026-09-27 this
 * also emptied the `cohort`, `contacts` and `vouches` stores every week,
 * because the door and the family vouch had been removed and "nothing reads
 * them any more". That deleted the only way to reach real people who had
 * asked to be introduced — two women had signed up for exactly that — on no
 * promise anyone had made to them (docs/DECISIONS.md Part 22). The sweep
 * removes a record only when a lifetime the product stated has run out, or
 * when the person asked (Forget me, netlify/functions/keep.ts). Retiring a
 * feature is neither. Those three stores are not written, not read by any
 * route, and not touched here; what becomes of them is the founder's
 * decision, recorded before anything is deleted.
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
  /** Names on the introduction list at the end of their 180 days, or with no day to count from. */
  introductions: number
  /** Records that could not be read or removed this week. Everything else still went; these are tried again. */
  errors: number
}

const empty = (): Swept => ({ maps: 0, couples: 0, progress: 0, journals: 0, introductions: 0, errors: 0 })

/**
 * Stores the sweep never opens: the door's and the vouch's, held until the
 * founder decides their retention (docs/DECISIONS.md decision 21). Named so
 * the test can hold the line, and so nobody re-adds a pass over them without
 * meeting this list. The introduction list is not one of them: it has a
 * lifetime of its own (decision 32), kept below.
 */
export const HELD_STORES = ['cohort', 'contacts', 'vouches'] as const

/** The sweep runs weekly; a name whose day falls before the next run goes on this one. */
const SWEEP_EVERY_MS = 7 * DAY_MS

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

/**
 * The introduction list: a name goes at the last weekly run before its 180th
 * day, so it is never held past the day Trust names. A record that reads but
 * carries no day this route could have written cannot be shown to be inside
 * its lifetime, and goes too. One that cannot be read at all — the store did
 * not answer — is an error, tried again next week; one that reads as
 * something other than JSON is removed, since nothing can ever read it.
 */
export async function sweepIntroductions(introductions: Store, now = Date.now()) {
  const out = { introductions: 0, errors: 0 }
  const cutoff = day(now + SWEEP_EVERY_MS)
  for (const { key } of (await introductions.list()).blobs) {
    await each(out, async () => {
      const raw = (await introductions.get(key, { type: 'text' })) as string | null
      if (raw === null) return
      let at: unknown
      try {
        at = (JSON.parse(raw) as { at?: unknown } | null)?.at
      } catch {
        at = undefined
      }
      const until = removeBy(at)
      if (until && until > cutoff) return
      await introductions.delete(key)
      out.introductions += 1
    })
  }
  return out
}

/** The whole sweep, every store it may touch, as the schedule runs it. */
export async function sweep(now = Date.now()): Promise<Swept> {
  const swept = await sweepLapsed(getStore('maps'), now)
  const rest = await sweepExpired(getStore('couples'), getStore('progress'), now)
  const names = await sweepIntroductions(getStore('introductions'), now)
  return {
    ...swept,
    couples: rest.couples,
    progress: rest.progress,
    introductions: names.introductions,
    errors: swept.errors + rest.errors + names.errors,
  }
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
      `[niyyah] sweep: ${swept.maps} maps, ${swept.couples} couples, ${swept.progress} step counts, ${swept.journals} moves, ${swept.introductions} names past 180 days, ${ops} old ops counts, ${swept.errors} errors on ${day()}`,
    )
    return Response.json({ swept, at: day() })
  } catch (err) {
    await failed('sweep', 'failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}

/** Sundays, on Netlify's scheduler. `@weekly` is cron's own alias for `0 0 * * 0`. */
export const config = { schedule: '@weekly' }
