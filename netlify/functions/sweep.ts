import { getStore } from '@netlify/blobs'
import { day } from '../shared/day'
import { SEGMENTS } from './cohort'
import type { KeptMap } from './keep'

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
 * Nothing else is touched. It is idempotent — a second run finds nothing —
 * and it needs no key, because its whole effect is one the founder already
 * performs by hand and a stranger could not misuse: it only ever removes
 * what the product had already promised to remove.
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
  /** Ways to reach someone, removed with their entry. */
  contacts: number
}

export async function sweepLapsed(cohort: Store, maps: Store, contacts: Store, now = Date.now()): Promise<Swept> {
  const swept: Swept = { entries: 0, maps: 0, contacts: 0 }

  // Every door entry, in every pool. `index/<code>` keys are not entries.
  const { blobs } = await cohort.list()
  for (const { key } of blobs) {
    const parts = key.split('/')
    if (parts.length !== SEGMENTS) continue
    const code = parts[SEGMENTS - 1]
    const kept = (await maps.get(code, { type: 'json' })) as KeptMap | null
    const expired = !!kept && Date.parse(kept.expiresAt) < now
    if (kept && !expired) continue
    await cohort.delete(key)
    await cohort.delete(`index/${code}`)
    swept.entries += 1
    if (expired) {
      await maps.delete(code)
      swept.maps += 1
    }
    await contacts.delete(code)
    swept.contacts += 1
  }

  // Kept maps past their year with no door entry: the blob goes too — one
  // expiry rule, whichever reader gets there first (keep.ts deletes on read).
  const all = await maps.list()
  for (const { key } of all.blobs) {
    const kept = (await maps.get(key, { type: 'json' })) as KeptMap | null
    if (kept && typeof kept.expiresAt === 'string' && Date.parse(kept.expiresAt) < now) {
      await maps.delete(key)
      swept.maps += 1
    }
  }

  return swept
}

export default async function handler(_req: Request) {
  try {
    const swept = await sweepLapsed(getStore('cohort'), getStore('maps'), getStore('contacts'))
    console.log(`[niyyah] sweep: ${swept.entries} entries, ${swept.maps} maps, ${swept.contacts} contacts on ${day()}`)
    return Response.json({ swept, at: day() })
  } catch (err) {
    console.error('[niyyah] sweep failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}

/** Sundays, on Netlify's scheduler. `@weekly` is cron's own alias for `0 0 * * 0`. */
export const config = { schedule: '@weekly' }
