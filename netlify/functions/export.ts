import { getStore } from '@netlify/blobs'
import { failed, mark } from '../shared/ops'
import { isFounder, notFounder } from '../shared/founder'
import type { ProgressRecord } from './progress'

/**
 * The backup.
 *
 * Everything this product knows lives in one vendor's storage, on a free plan,
 * with no copy anywhere else. If that account is suspended — a marriage app
 * with member content is exactly the kind of thing an acceptable-use review
 * reads badly — or if the storage product is discontinued, the compounding
 * asset built over years is gone in an afternoon. `docs/CONTROL.md` ranks that
 * second only to not owning the domain. This is the answer to it: one request
 * that hands back the part nobody could recreate, in a form that could be
 * loaded somewhere else.
 *
 * What it returns, and why only this:
 *
 *  - **Every progress record.** The ladder and the facts — how maps read, how
 *    reads came out, which conversations were had, why courtships ended, who
 *    married. This is the asset. It carries closed-vocabulary ids and days,
 *    under install codes that unlock nothing.
 *  - **The joint tally.** How pairs come out on the eleven. Aggregate already.
 *
 * What it deliberately refuses to return, and this is the more important half:
 *
 *  - **Kept maps.** Every member's intake answers and first name. A single
 *    endpoint that dumps those is precisely the honeypot docs/LEARNING.md
 *    exists to prevent, and it is not the business's to lose — her map is on
 *    her phone, and the code to fetch it is hers.
 *  - **Pair sheets.** Two people's answers on the eleven. They expire in ninety
 *    days by design, and what they teach is already in the joint tally.
 *
 * Founder-gated like every other readout. At founding scale this is one small
 * document; if the ladder ever outgrows a single response, page it by prefix
 * rather than widening what it returns.
 */

type Store = ReturnType<typeof getStore>

export interface Backup {
  /** When this copy was taken. */
  at: string
  /**
   * What shape this wrapper is in, so a future reader knows how to read it.
   * Version 3: the door's counts are gone with the door (2026-09-24).
   * The records inside carry their own version — `v`, netlify/shared/record.ts
   * — since 2026-09-11; before that the wrapper was versioned and the asset
   * inside it was not, which docs/HARD.md called exactly backwards.
   */
  version: 3
  /** Install code → the whole record. The learning asset. */
  progress: Record<string, ProgressRecord>
  /** How pairs come out on each of the eleven. Null when no pair has answered. */
  joint: unknown
  /** What is deliberately not here, named in the file itself so a reader is never misled. */
  omitted: string[]
  /**
   * Records that could not be read — corrupt, or not JSON — and so are not in
   * this copy. Named, not hidden: a backup that silently dropped them would
   * say it was whole. Zero on a healthy store (docs/RECOVERY.md).
   */
  skipped: number
}

const OMITTED = [
  'maps — every member’s answers and name. Hers, on her phone, under a code only she has.',
  'couples — two people’s sheets on the eleven. They expire in ninety days; the joint tally keeps what they taught.',
]

/**
 * Every progress record the store still keeps, whole. Small values, so reading
 * them all is fine at this scale. A record past its year is left out unless it
 * reached `married` — the same rule the store and the weekly sweep keep. This
 * checked no date at all, so a record the store had let go lived on in the
 * founder's files and the backup artifact (docs/PRIVACY.md, R3).
 */
async function allProgress(store: Store, skip: () => Promise<void>, now = Date.now()): Promise<Record<string, ProgressRecord>> {
  const { blobs } = await store.list()
  const out: Record<string, ProgressRecord> = {}
  await Promise.all(
    blobs.map(async ({ key }) => {
      // One record that cannot be read costs that record, never the backup.
      // It used to cost the backup: one corrupt blob and every month's copy
      // was a 503 until someone read the logs (docs/RECOVERY.md).
      let record: ProgressRecord | null
      try {
        record = (await store.get(key, { type: 'json' })) as ProgressRecord | null
      } catch {
        return skip()
      }
      if (!record?.first) return
      if (!('married' in record.first) && Date.parse(record.expiresAt) < now) return
      out[key] = record
    }),
  )
  return out
}

export default async function handler(req: Request) {
  if (req.method !== 'GET') return Response.json({ error: 'GET only' }, { status: 405 })
  if (!isFounder(req)) return notFounder()

  try {
    let skipped = 0
    const skip = async () => {
      skipped += 1
      await failed('export', 'one record could not be read; left out of this backup, and counted')
    }
    const [progress, joint] = await Promise.all([
      allProgress(getStore('progress'), skip),
      getStore('tallies')
        .get('joint', { type: 'json' })
        .catch(async () => {
          await skip()
          return null
        }),
    ])
    const backup: Backup = {
      at: new Date().toISOString(),
      version: 3,
      progress,
      joint: joint ?? null,
      omitted: OMITTED,
      skipped,
    }
    // A backup taken, by hand or by watch.yml: the one fact /health needs to
    // say how long it has been since the last (docs/OPS.md).
    await mark('export')
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        // Named for the day it was taken, so a folder of these sorts itself.
        'Content-Disposition': `attachment; filename="niyyah-backup-${backup.at.slice(0, 10)}.json"`,
      },
    })
  } catch (err) {
    await failed('export', 'failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
