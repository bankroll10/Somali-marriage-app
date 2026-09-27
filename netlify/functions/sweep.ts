import { getStore } from '@netlify/blobs'
import { failed, mark, pruneOps } from '../shared/ops'
import { day } from '../shared/day'
import { isGone, retire } from '../shared/sheet'
import { DAY_MS, deleteIfUnchanged, ended, isBookkeeping, isMoving, lapsed, type Journal } from '../shared/integrity'
import { finishMove, rollBackMove } from './keep'
import { WITHDRAWN, WITHDRAWN_DAYS, markerCode, markerDay, removeOn } from './introduce'

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
 *  - **A name on the introduction list** on its scheduled day — the Sunday on
 *    or before its 180th day, which is the day the screen and the founder's
 *    list name (`removeOn`, netlify/functions/introduce.ts; docs/DECISIONS.md
 *    decision 32). A name is never renewed or reminded about; its owner puts
 *    it down again if she still wants it. A record left under a withdrawal
 *    marker because a delete failed goes on any run; the marker goes only
 *    after it, and only once its two days are up — so at the first Sunday
 *    at least two days on, between two and eight days after the withdrawal.
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
  /** Names on the introduction list on or past their scheduled day, or with no day to count from. */
  introductions: number
  /** Names still under a withdrawal marker because a delete failed: taken off now. */
  withdrawn: number
  /** Withdrawal markers on the introduction list whose own day is at least two full days behind, with nothing left under their code. */
  markers: number
  /** Records that could not be read or removed this week. Everything else still went; these are tried again. */
  errors: number
}

const empty = (): Swept => ({ maps: 0, couples: 0, progress: 0, journals: 0, introductions: 0, withdrawn: 0, markers: 0, errors: 0 })

/**
 * Stores the sweep never opens: the door's and the vouch's, held until the
 * founder decides their retention (docs/DECISIONS.md decision 21). Named so
 * the test can hold the line, and so nobody re-adds a pass over them without
 * meeting this list. The introduction list is not one of them: it has a
 * lifetime of its own (decision 32), kept below.
 */
export const HELD_STORES = ['cohort', 'contacts', 'vouches'] as const

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
 * The introduction list: a name goes on its scheduled day, `removeOn` — the
 * Sunday on or before its 180th day, which is a day this runs — so the day
 * the screen shows, the day the founder's list stops showing it and the day
 * it is deleted are one day. A record that reads but carries no day this
 * route could have written cannot be shown to be inside its lifetime, and
 * goes too. One that cannot be read at all — the store did not answer — is an
 * error, tried again next week; one that reads as something other than JSON
 * is removed, since nothing can ever read it.
 *
 * **A withdrawal marker is the authority** (`withdrawn/<code>/<day>`, a day
 * and nobody; netlify/functions/introduce.ts). A record still under a marked
 * code is there because a delete failed after the withdrawal was answered;
 * it is deleted on any run, whatever its own day. The marker goes only after
 * that record is gone, and only once the day in its own key is at least
 * WITHDRAWN_DAYS behind this run's — so a failed delete keeps the marker,
 * and with it the evidence that the record must go, for the next run.
 *
 * Blobs has no conditional delete, so this never decides about a marker by
 * reading it and then deleting it: the day is in the key, the key is never
 * rewritten, and a withdrawal that lands while this runs writes a key of its
 * own that no branch here names. Deleting an old marker therefore cannot
 * take a fresh withdrawal's, whatever the interleaving
 * (tests/introduce-residue.test.ts). A marker whose key carries no readable
 * day is from no version of this route and goes as soon as nothing is under
 * its code.
 */
export async function sweepIntroductions(introductions: Store, now = Date.now()) {
  const out = { introductions: 0, withdrawn: 0, markers: 0, errors: 0 }
  const today = day(now)
  // A marker is removable only when its own day is strictly before this: at
  // least two full days old, whatever the hour it was written.
  const markersBefore = day(now - WITHDRAWN_DAYS * DAY_MS)
  const keys = (await introductions.list()).blobs.map((b) => b.key)
  const present = new Set(keys)
  const marked = new Set(keys.filter((k) => k.startsWith(WITHDRAWN)).map(markerCode))

  // Names on their day — those not under a marker; the marked ones go below.
  for (const key of keys) {
    if (key.startsWith(WITHDRAWN) || marked.has(key)) continue
    await each(out, async () => {
      const raw = (await introductions.get(key, { type: 'text' })) as string | null
      if (raw === null) return
      const goes = removeOn(dayIn(raw))
      if (goes && goes > today) return
      await introductions.delete(key)
      out.introductions += 1
    })
  }

  // Markers: first whatever is left under the code, then — only if that is
  // gone and this key's own day is old enough — the marker itself. One code
  // may carry several markers (one per day it was withdrawn on); the record
  // is deleted once, by the first of them.
  for (const key of keys) {
    if (!key.startsWith(WITHDRAWN)) continue
    const code = markerCode(key)
    await each(out, async () => {
      if (present.has(code)) {
        await introductions.delete(code)
        present.delete(code)
        out.withdrawn += 1
      }
      const at = markerDay(key)
      if (at && at >= markersBefore) return
      await introductions.delete(key)
      out.markers += 1
    })
  }
  return out
}

/** The `at` inside a stored record's text, or undefined when there is none to read. */
function dayIn(raw: string): unknown {
  try {
    return (JSON.parse(raw) as { at?: unknown } | null)?.at
  } catch {
    return undefined
  }
}

/** The whole sweep, every store it may touch, as the schedule runs it. */
export async function sweep(now = Date.now()): Promise<Swept> {
  const swept = await sweepLapsed(getStore('maps'), now)
  const rest = await sweepExpired(getStore('couples'), getStore('progress'), now)
  const names = await sweepIntroductions(getStore({ name: 'introductions', consistency: 'strong' }), now)
  return {
    ...swept,
    couples: rest.couples,
    progress: rest.progress,
    introductions: names.introductions,
    withdrawn: names.withdrawn,
    markers: names.markers,
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
      `[niyyah] sweep: ${swept.maps} maps, ${swept.couples} couples, ${swept.progress} step counts, ${swept.journals} moves, ${swept.introductions} names on their day, ${swept.withdrawn} names left under a withdrawal, ${swept.markers} withdrawal markers, ${ops} old ops counts, ${swept.errors} errors on ${day()}`,
    )
    return Response.json({ swept, at: day() })
  } catch (err) {
    await failed('sweep', 'failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}

/** Sundays, on Netlify's scheduler. `@weekly` is cron's own alias for `0 0 * * 0`. */
export const config = { schedule: '@weekly' }
