import { getStore } from '@netlify/blobs'
import { day } from '../shared/day'
import { CODE } from '../shared/code'
import { isGone, retire } from '../shared/sheet'
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
  /** Vouches whose map is gone or lapsed — each with its ask and token, counted once. */
  vouches: number
  /** Couple sheets past their ninety days. */
  couples: number
  /** Step counts past their year that never reached `married`. */
  progress: number
}

export async function sweepLapsed(cohort: Store, maps: Store, contacts: Store, now = Date.now()): Promise<Swept> {
  const swept: Swept = { entries: 0, maps: 0, contacts: 0, vouches: 0, couples: 0, progress: 0 }

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

const lapsed = (record: { expiresAt?: unknown } | null, now: number) =>
  !!record && typeof record.expiresAt === 'string' && Date.parse(record.expiresAt) < now

/**
 * Everything whose life is someone else's: vouches (a map's), couple sheets
 * (their own ninety days) and step counts (their own year). Run after
 * `sweepLapsed`, so a map it has just removed counts as gone here.
 */
export async function sweepExpired(maps: Store, vouches: Store, couples: Store, progress: Store, now = Date.now()) {
  let v = 0
  let c = 0
  let p = 0

  // A map is live if it is there and inside its year. Asked once per code.
  const live = new Map<string, boolean>()
  const isLive = async (code: string) => {
    if (!live.has(code)) {
      const kept = (await maps.get(code, { type: 'json' })) as KeptMap | null
      live.set(code, !!kept && !lapsed(kept, now))
    }
    return live.get(code)!
  }

  // `<code>` is a vouch; `asked/<code>` names the token; `token/<t>` names the
  // code. Each is judged by the map it leads to.
  const { blobs } = await vouches.list()
  for (const { key } of blobs) {
    let code: string | null = null
    if (key.startsWith('asked/')) code = key.slice('asked/'.length)
    else if (key.startsWith('token/')) code = ((await vouches.get(key, { type: 'text' })) as string | null) ?? ''
    else if (CODE.test(key)) code = key
    if (code === null) continue
    if (code && (await isLive(code))) continue
    await vouches.delete(key)
    if (CODE.test(key)) v += 1
  }

  // A sheet past its ninety days is retired, leaving its reporting window
  // behind; a window past its own end is deleted (netlify/shared/sheet.ts).
  for (const { key } of (await couples.list()).blobs) {
    const record = (await couples.get(key, { type: 'json' })) as { expiresAt?: unknown } | null
    if (!lapsed(record, now)) continue
    if (isGone(key)) {
      await couples.delete(key)
      continue
    }
    await retire(couples, key, Date.parse(record!.expiresAt as string))
    c += 1
  }

  for (const { key } of (await progress.list()).blobs) {
    const record = (await progress.get(key, { type: 'json' })) as { first?: Record<string, unknown>; expiresAt?: unknown } | null
    if (record?.first && 'married' in record.first) continue
    if (lapsed(record, now)) {
      await progress.delete(key)
      p += 1
    }
  }

  return { vouches: v, couples: c, progress: p }
}

export default async function handler(_req: Request) {
  try {
    const maps = getStore('maps')
    const swept = await sweepLapsed(getStore('cohort'), maps, getStore('contacts'))
    Object.assign(swept, await sweepExpired(maps, getStore('vouches'), getStore('couples'), getStore('progress')))
    console.log(
      `[niyyah] sweep: ${swept.entries} entries, ${swept.maps} maps, ${swept.contacts} contacts, ${swept.vouches} vouches, ${swept.couples} couples, ${swept.progress} step counts on ${day()}`,
    )
    return Response.json({ swept, at: day() })
  } catch (err) {
    console.error('[niyyah] sweep failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}

/** Sundays, on Netlify's scheduler. `@weekly` is cron's own alias for `0 0 * * 0`. */
export const config = { schedule: '@weekly' }
