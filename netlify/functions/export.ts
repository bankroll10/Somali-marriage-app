import { getStore } from '@netlify/blobs'
import { isFounder, notFounder } from '../shared/founder'
import { COUNTRIES, SCENES } from '../shared/vocab'
import { SEGMENTS } from './cohort'
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
 *  - **The door, as counts.** Countries, cities, sides, how far people would
 *    go, hardest parts, ledgers.
 *
 * What it deliberately refuses to return, and this is the more important half:
 *
 *  - **Kept maps.** Every member's intake answers, first name and age. A single
 *    endpoint that dumps those is precisely the honeypot docs/LEARNING.md
 *    exists to prevent, and it is not the business's to lose — her map is on
 *    her phone, and the code to fetch it is hers.
 *  - **Vouches.** A family member's name, their phone number, and a sentence
 *    they wrote. A vouch can be asked for again; a leaked phone book cannot be
 *    taken back.
 *  - **Pair sheets.** Two people's answers on the eleven. They expire in ninety
 *    days by design, and what they teach is already in the joint tally.
 *  - **Cohort records rather than counts.** Their keys carry map codes, and a
 *    list of valid map codes is a list of keys to everyone's map. The counts
 *    teach the same thing and unlock nothing.
 *
 * Founder-gated like every other readout. At founding scale this is one small
 * document; if the ladder ever outgrows a single response, page it by prefix
 * rather than widening what it returns.
 */

type Store = ReturnType<typeof getStore>

/** One city on the door, as counts. */
export interface DoorScene {
  women: number
  men: number
  hooks: Record<string, number>
  ledger: Record<string, number>
  /** How far its people said they would go: city, country, anywhere. */
  reach: Record<string, number>
}

export interface Backup {
  /** When this copy was taken. */
  at: string
  /**
   * What shape this wrapper is in, so a future reader knows how to read it.
   * Version 2: the door is nested country → city and each city carries `reach`.
   * The records inside carry their own version — `v`, netlify/shared/record.ts
   * — since 2026-09-11; before that the wrapper was versioned and the asset
   * inside it was not, which docs/HARD.md called exactly backwards.
   */
  version: 2
  /** Install code → the whole record. The learning asset. */
  progress: Record<string, ProgressRecord>
  /** How pairs come out on each of the eleven. Null when no pair has answered. */
  joint: unknown
  /** The door, as counts: country → city → counts. No codes. */
  door: Record<string, Record<string, DoorScene>>
  /** What is deliberately not here, named in the file itself so a reader is never misled. */
  omitted: string[]
}

const OMITTED = [
  'maps — every member’s answers, name and age. Hers, on her phone, under a code only she has.',
  'vouches — a family member’s name, phone and sentence. Ask again rather than hold a phone book.',
  'couples — two people’s sheets on the eleven. They expire in ninety days; the joint tally keeps what they taught.',
  'cohort records — their keys carry map codes, which are keys to maps. The counts below teach the same thing.',
]

/** Every progress record, whole. Small values, so reading them all is fine at this scale. */
async function allProgress(store: Store): Promise<Record<string, ProgressRecord>> {
  const { blobs } = await store.list()
  const out: Record<string, ProgressRecord> = {}
  await Promise.all(
    blobs.map(async ({ key }) => {
      const record = (await store.get(key, { type: 'json' })) as ProgressRecord | null
      if (record?.first) out[key] = record
    }),
  )
  return out
}

/**
 * The door as counts. Deliberately rebuilt here from keys and ledgers rather
 * than reusing cohort.ts's tally, because that one floors small cells for
 * safety in a readout — and a backup that quietly rounds is not a backup.
 */
async function door(store: Store): Promise<Backup['door']> {
  const { blobs } = await store.list()
  const out: Backup['door'] = {}
  // A member key has SEGMENTS parts; the index is one, and a key from before
  // countries existed is four. The layout is cohort.ts's to define — a literal
  // here was the one copy that would not have moved with it (docs/BOARD.md).
  const members = blobs.filter(({ key }) => key.split('/').length === SEGMENTS)
  const records = await Promise.all(
    members.map(async ({ key }) => ({ key, record: (await store.get(key, { type: 'json' })) as { ledger?: string[] } | null })),
  )
  for (const { key, record } of records) {
    const [country, scene, gender, reach, hook] = key.split('/')
    if (!country || !COUNTRIES.has(country) || !scene || !SCENES.has(scene)) continue
    const c = (out[country] ??= {})
    const s = (c[scene] ??= { women: 0, men: 0, hooks: {}, ledger: {}, reach: {} })
    if (gender === 'woman') s.women += 1
    else if (gender === 'man') s.men += 1
    s.hooks[hook] = (s.hooks[hook] ?? 0) + 1
    s.reach[reach] = (s.reach[reach] ?? 0) + 1
    for (const id of record?.ledger ?? []) s.ledger[id] = (s.ledger[id] ?? 0) + 1
  }
  return out
}

export default async function handler(req: Request) {
  if (req.method !== 'GET') return Response.json({ error: 'GET only' }, { status: 405 })
  if (!isFounder(req)) return notFounder()

  try {
    const [progress, joint, cohortCounts] = await Promise.all([
      allProgress(getStore('progress')),
      getStore('tallies').get('joint', { type: 'json' }),
      door(getStore('cohort')),
    ])
    const backup: Backup = {
      at: new Date().toISOString(),
      version: 2,
      progress,
      joint: joint ?? null,
      door: cohortCounts,
      omitted: OMITTED,
    }
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        // Named for the day it was taken, so a folder of these sorts itself.
        'Content-Disposition': `attachment; filename="niyyah-backup-${backup.at.slice(0, 10)}.json"`,
      },
    })
  } catch (err) {
    console.error('[niyyah] export: failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
