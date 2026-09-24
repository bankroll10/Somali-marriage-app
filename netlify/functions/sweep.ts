import { getStore } from '@netlify/blobs'
import { failed, mark, pruneOps } from '../shared/ops'
import { day } from '../shared/day'
import { CODE } from '../shared/code'
import { isGone, retire } from '../shared/sheet'
import { DAY_MS, deleteIfUnchanged, ended, isBookkeeping, isMoving, lapsed, type Journal, type KeptMap } from '../shared/integrity'
import { SEGMENTS } from './cohort'
import { finishMove, rollBackMove } from './keep'

/**
 * The weekly sweep — what makes "the way to reach you lives exactly as long as
 * your kept map" true without a person remembering.
 *
 * A kept map expires a year after it was last kept (netlify/functions/keep.ts).
 * A door entry points at a map by code, and beside it sits the one piece of
 * personal information this product holds: the way to reach her, in the
 * `contacts` store (netlify/functions/cohort.ts). Until 2026-09-17 all three
 * outlived the map until the founder read that pool with `?sweep=1`
 * (netlify/functions/pool.ts) — so Trust's sentence was true only on the
 * weeks somebody ran a command (docs/RISKS.md R3, docs/TIME.md).
 *
 * This runs on Netlify's schedule, weekly, and does exactly what that flag
 * does, for every pool at once: a door entry whose map is gone or past its
 * year goes, with its index and its contact; a lapsed map's blob goes too.
 *
 * And, since 2026-09-23 (docs/PRIVACY.md, R1–R3), three things that each had a
 * stated lifetime and nothing that ended it:
 *  - **A vouch** — a relative's first name, their sentence, their phone — with
 *    the ask and the token that point at it, once the map it was about is
 *    gone or past its year. Trust says the vouch "goes when your map goes"; it
 *    went only with forget me, and a lapsed map's vouch lived for ever. A
 *    lapsed code can no longer be re-kept (a supplied code is never created,
 *    netlify/functions/keep.ts), so there is no map for it to come back to.
 *  - **A couple sheet** past its ninety days. It stopped being readable, and
 *    was deleted only if someone happened to open it.
 *  - **A step count** past its year, unless it reached `married`, which is
 *    kept by rule (netlify/functions/progress.ts). It was pruned only on the
 *    days the founder opened the readout.
 *
 * Reports, tallies and limits are never touched: a report waits for the
 * founder, and the other two carry nobody. It is idempotent — a second run finds nothing —
 * and it needs no key, because its whole effect is one the founder already
 * performs by hand and a stranger could not misuse: it only ever removes
 * what the product had already promised to remove.
 *
 * And, since 2026-09-24, it is where everything a failed step left behind is
 * put right (docs/INTEGRITY.md): a way to reach someone whose map is gone,
 * however it was orphaned; an index that points at nothing; a second door
 * entry for one person, left by two joins at once; a change of code
 * abandoned part-way, rolled back or finished. Every record is its own step:
 * one it cannot read is counted in `errors` and tried again next week, and
 * everything else still goes — a single bad blob used to stop the sweep for
 * every store, every week, for good.
 *
 * Netlify does not expose a scheduled function over HTTP in production; if
 * it ever did, the same reasoning holds.
 */

type Store = ReturnType<typeof getStore>

export interface Swept {
  /** Door entries removed, with their index keys. */
  entries: number
  /** Kept maps past their year, removed. */
  maps: number
  /** Ways to reach someone whose map is gone or lapsed — with their entry, or orphaned. */
  contacts: number
  /** Vouches whose map is gone or lapsed — each with its ask and token, counted once. */
  vouches: number
  /** Couple sheets past their ninety days. */
  couples: number
  /** Step counts past their year that never reached `married`. */
  progress: number
  /** Second door entries for one person, and indexes that point at nothing. */
  reconciled: number
  /** Changes of code abandoned part-way: rolled back, or finished. */
  journals: number
  /** Records that could not be read or removed this week. Everything else still went; these are tried again. */
  errors: number
}

const empty = (): Swept => ({ entries: 0, maps: 0, contacts: 0, vouches: 0, couples: 0, progress: 0, reconciled: 0, journals: 0, errors: 0 })

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

/** Whether a code's map can still be acted on — netlify/shared/integrity.ts `liveMap`, remembered for one run. */
function liveness(maps: Store, now: number) {
  const seen = new Map<string, Promise<boolean>>()
  return (code: string): Promise<boolean> => {
    if (!seen.has(code)) {
      seen.set(
        code,
        (async () => {
          const kept = (await maps.get(code, { type: 'json' })) as KeptMap | null
          return !!kept && !lapsed(kept, now) && !(await ended(maps, code))
        })(),
      )
    }
    return seen.get(code)!
  }
}

/**
 * The door, the maps and the ways to reach people — everything whose life is
 * a kept map's.
 */
export async function sweepLapsed(cohort: Store, maps: Store, contacts: Store, now = Date.now()): Promise<Swept> {
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

  const live = liveness(maps, now)

  // A door entry whose map is gone, past its year or closed goes, with its
  // index and the way to reach her.
  for (const { key } of (await cohort.list()).blobs) {
    const parts = key.split('/')
    if (parts.length !== SEGMENTS) continue
    await each(swept, async () => {
      const code = parts[SEGMENTS - 1]
      if (await live(code)) return
      await cohort.delete(key)
      if ((await cohort.get(`index/${code}`, { type: 'text' })) === key) await cohort.delete(`index/${code}`)
      swept.entries += 1
      await contacts.delete(code)
      swept.contacts += 1
    })
  }

  // The door, reconciled. One person has one entry, and her index names it.
  // An index that names nothing goes; an entry her index does not name is a
  // second join's leftover and goes too — but never one written today, which
  // may be a join caught between writing its entry and writing its index.
  const today = day(now)
  for (const { key } of (await cohort.list()).blobs) {
    await each(swept, async () => {
      if (key.startsWith('index/')) {
        const target = (await cohort.get(key, { type: 'text' })) as string | null
        if (target && (await cohort.getMetadata(target))) return
        await cohort.delete(key)
        swept.reconciled += 1
        return
      }
      const parts = key.split('/')
      if (parts.length !== SEGMENTS) return
      const code = parts[SEGMENTS - 1]
      if ((await cohort.get(`index/${code}`, { type: 'text' })) === key) return
      const record = (await cohort.get(key, { type: 'json' })) as { at?: unknown } | null
      if (typeof record?.at === 'string' && record.at >= today) return
      await cohort.delete(key)
      swept.reconciled += 1
    })
  }

  // A way to reach someone lives exactly as long as her map, however it was
  // left behind: a join that raced her forget, a change of code that stopped
  // part-way. It used to go only with a door entry, so an orphan stayed for
  // ever (docs/PRIVACY.md).
  for (const { key } of (await contacts.list()).blobs) {
    await each(swept, async () => {
      if (!CODE.test(key) || (await live(key))) return
      await contacts.delete(key)
      swept.contacts += 1
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

/**
 * Everything whose life is someone else's: vouches (a map's), couple sheets
 * (their own ninety days) and step counts (their own year). Run after
 * `sweepLapsed`, so a map it has just removed counts as gone here.
 */
export async function sweepExpired(maps: Store, vouches: Store, couples: Store, progress: Store, now = Date.now()) {
  const out = { vouches: 0, couples: 0, progress: 0, errors: 0 }
  const live = liveness(maps, now)

  for (const { key } of (await vouches.list()).blobs) {
    await each(out, async () => {
      let code: string | null = null
      if (key.startsWith('asked/')) code = key.slice('asked/'.length)
      else if (key.startsWith('token/')) code = ((await vouches.get(key, { type: 'text' })) as string | null) ?? ''
      else if (CODE.test(key)) code = key
      if (code === null) return
      if (code && (await live(code))) return
      await vouches.delete(key)
      if (CODE.test(key)) out.vouches += 1
    })
  }

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

/** The whole sweep, every store, as the schedule runs it. */
export async function sweep(now = Date.now()): Promise<Swept> {
  const maps = getStore('maps')
  const swept = await sweepLapsed(getStore('cohort'), maps, getStore('contacts'), now)
  const rest = await sweepExpired(maps, getStore('vouches'), getStore('couples'), getStore('progress'), now)
  return { ...swept, vouches: rest.vouches, couples: rest.couples, progress: rest.progress, errors: swept.errors + rest.errors }
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
      `[niyyah] sweep: ${swept.entries} entries, ${swept.maps} maps, ${swept.contacts} contacts, ${swept.vouches} vouches, ${swept.couples} couples, ${swept.progress} step counts, ${swept.reconciled} reconciled, ${swept.journals} moves, ${ops} old ops counts, ${swept.errors} errors on ${day()}`,
    )
    return Response.json({ swept, at: day() })
  } catch (err) {
    await failed('sweep', 'failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}

/** Sundays, on Netlify's scheduler. `@weekly` is cron's own alias for `0 0 * * 0`. */
export const config = { schedule: '@weekly' }
