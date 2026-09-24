import { getStore } from '@netlify/blobs'
import { bump } from './counter'
import { day } from './day'
import { OPS_SIGNALS, type OpsRoute } from './vocab'

/**
 * Counting how the service is doing, and nothing about anyone using it.
 *
 * Until this existed, every failure on the server was a line in Netlify's
 * function log and nothing else: a storage outage, a bad Anthropic key, a
 * cap refusing all afternoon — none of it was counted, so none of it could
 * be seen without reading logs, and nothing could raise an alarm
 * (docs/OPS.md). This is the smallest thing that could: a number per signal
 * per day, in its own store.
 *
 * The rules that keep it from becoming the analytics this product refuses
 * (docs/LEARNING.md):
 *  - **A closed list.** A signal is one of OPS_SIGNALS or it is dropped —
 *    so no code, city, id, route parameter or text can ever be counted.
 *  - **A day, never a time.** Keys are `day/<YYYY-MM-DD>/<signal>`.
 *  - **Totals, never events.** A number goes up; nothing records which call.
 *  - **Thirty-five days,** then the weekly sweep deletes it (sweep.ts).
 *  - **It never breaks what it counts.** Every write swallows its own
 *    failure: a count that could take a route down would be the worst bug here.
 */

const store = () => getStore({ name: 'ops', consistency: 'strong' })

const DAY_PREFIX = 'day/'
export const opsKey = (d: string, signal: string) => `${DAY_PREFIX}${d}/${signal}`

/** How long a day's counts are kept, in days: the backup's window (watch.yml). */
export const OPS_KEEP_DAYS = 35

/** Add to today's count for a signal. Never throws; an unknown signal is dropped. */
export async function note(signal: string, by = 1): Promise<void> {
  if (!OPS_SIGNALS.has(signal) || !Number.isFinite(by) || by <= 0) return
  try {
    await bump(store(), opsKey(day(), signal), Math.round(by))
  } catch {
    // Counting is never worth a failed request.
  }
}

/**
 * A route's caught failure: logged exactly as it always was, and counted as
 * `fail.<route>`. Every `catch` in netlify/functions that used to call
 * `console.error('[niyyah] <route>: …')` calls this instead.
 */
export async function failed(route: OpsRoute, message: string, err?: unknown): Promise<void> {
  if (err === undefined) console.error(`[niyyah] ${route}: ${message}`)
  else console.error(`[niyyah] ${route}: ${message}`, err)
  await note(`fail.${route}`)
}

/** The last time something that should happen on a clock did: a day, and counts. */
export type Last = { day: string } & Record<string, number | string>

/** Record that a backup was taken, or the sweep ran. Never throws. */
export async function mark(what: 'export' | 'sweep', extra: Record<string, number> = {}): Promise<void> {
  try {
    await store().setJSON(`last/${what}`, { ...extra, day: day() })
  } catch {
    // The health check will say it has not heard, which is the truth.
  }
}

export async function lastRun(what: 'export' | 'sweep'): Promise<Last | null> {
  const got = (await store().get(`last/${what}`, { type: 'json' })) as Last | null
  return got && typeof got.day === 'string' ? got : null
}

/** Counts per signal, for each of the last `days` days (today first). Throws when the store does. */
export async function readDays(days: number, now = Date.now()): Promise<Record<string, Record<string, number>>> {
  const wanted = Array.from({ length: days }, (_, i) => day(now - i * 86_400_000))
  const out: Record<string, Record<string, number>> = Object.fromEntries(wanted.map((d) => [d, {}]))
  const s = store()
  const { blobs } = await s.list({ prefix: DAY_PREFIX })
  await Promise.all(
    blobs.map(async ({ key }) => {
      const [, d, signal] = key.split('/')
      if (!(d in out) || !OPS_SIGNALS.has(signal)) return
      const n = (await s.get(key, { type: 'json' })) as number | null
      if (typeof n === 'number') out[d][signal] = n
    }),
  )
  return out
}

/** Delete days past OPS_KEEP_DAYS. Returns how many keys went. Throws when the store does. */
export async function pruneOps(now = Date.now()): Promise<number> {
  const oldest = day(now - OPS_KEEP_DAYS * 86_400_000)
  const s = store()
  const { blobs } = await s.list({ prefix: DAY_PREFIX })
  const old = blobs.filter(({ key }) => key.split('/')[1] < oldest)
  await Promise.all(old.map(({ key }) => s.delete(key)))
  return old.length
}

/** Write, read and delete one key: is storage answering, right now? */
export async function probe(): Promise<number> {
  const s = store()
  const started = Date.now()
  const key = `probe/${day()}`
  await s.setJSON(key, 1)
  if ((await s.get(key, { type: 'json' })) !== 1) throw new Error('probe read back wrong')
  await s.delete(key)
  return Date.now() - started
}
