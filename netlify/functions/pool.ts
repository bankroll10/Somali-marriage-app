import { getStore } from '@netlify/blobs'
import { isFounder, notFounder } from '../shared/founder'
import { COUNTRIES, SCENES, STAGES as VOCAB_STAGES } from '../shared/vocab'
import { floorRows } from '../shared/floor'
import { blocked } from '../shared/gate'
import { AGE_BANDS, bandOf } from '../shared/age'
import { COHORT_TARGET, SEGMENTS, countryOf, sideOf } from './cohort'
import type { KeptMap } from './keep'

/**
 * The shape of a pool — the number the door cannot give.
 *
 * The door counts kept maps that can be reached. A pool opens on forty and
 * forty of them, and nothing until now could say whether forty and forty could
 * introduce anyone: whether the maps are still live, whether the people are
 * still looking, whether they have an age at all, and whether — after the age
 * band and the two non-negotiables a form can check, in both directions — a
 * given woman has one eligible man in the room or none. A door at 40/40 and a
 * door at 40/8 read the same to everyone but the founder, and the second is a
 * pool where a quarter of the women would be told it opened and never be
 * introduced. That is the "a hundred thousand registered and still empty"
 * failure, at forty (docs/LIQUIDITY.md). This is the reading that tells them
 * apart, and the opening checklist reads from it.
 *
 * ─── What this reads, and why it may ────────────────────────────────────────
 * This route reads every counted member's kept map. It is the first thing in
 * the product that reads a map for any purpose other than handing it back to
 * her, and it is permitted only because matching is the job she kept it for —
 * the door card says so on its face ("Your map's job is to be matched",
 * src/lib/cohort.ts). Of the map it reads five things and nothing else: her
 * age, her stage, her practice, her answer on children, and what she said she
 * will not compromise on. What leaves is the shape of a pool: counts, with no
 * code, no name, no answer and no per-member figure; every split by a
 * quasi-identifier or a derived attribute is floored (netlify/shared/floor.ts);
 * no cell can be asked for one member. Nothing is written back to any tally,
 * and nothing here learns about a person. The founder already holds the store
 * and could count by hand (docs/LEARNING.md, honest limits); this turns that
 * into an aggregate and nothing more. `inventory` is eligible partners as a
 * histogram — computed on read from stated non-negotiables, never stored — and
 * it is not the per-member match count docs/LEARNING.md refuses; it must never
 * become one. Trust says all of this in the member's words.
 *
 * ─── The sweep ──────────────────────────────────────────────────────────────
 * A join requires a kept map and nothing re-checked, so the door only ever
 * rose (docs/HARD.md #12): a map lapses a year after its last keep and its
 * door entry stayed. Reading the maps here is the re-check. A member whose map
 * is gone or expired loses her member key and its index; an expired map goes
 * too, so the next join cannot count her and this read cannot sweep her again
 * (one expiry rule — netlify/functions/keep.ts's — applied in both readers).
 * Her `contacts` row goes with it — the way to reach her lives as long as her
 * kept map, and this read deletes it (below) exactly as the weekly sweep does
 * (netlify/functions/sweep.ts). Like progress.ts's readout, a founder GET
 * is where the sweep happens; the public door stays keys-only.
 *
 * ─── What is supply ─────────────────────────────────────────────────────────
 * `supply` is live and *preparing*, as of the last keep. The door card is
 * shown to someone getting to know somebody too, and she may be counted; but
 * one introduction at a time is the product's own rule (docs/PRODUCT.md §7),
 * and she is in one. `stages` sits beside supply so the founder can see the
 * split rather than take it on trust.
 *
 * The age band is an assumption. `AGE_GAP` says what most families would
 * consider, it gates nothing — the introduction is by hand — and it is echoed
 * in every response so nobody reads the pairs without seeing what they rest
 * on. It is revised only by the founder's hand, from the introductions
 * record's `age` reason once that exists (designed, docs/LIQUIDITY.md), never
 * from a tally: docs/LEARNING.md forbids learning age.
 *
 * Founder-gated like every readout, fails open like every readout but
 * /safety, and uncapped like every founder route. One list and one map read
 * per member; fine to a few hundred, and past that it meets the ceiling
 * docs/SCALE.md already names for the progress readout.
 */

// The bands live beside the guide's use of them (netlify/shared/age.ts);
// re-exported so this readout's callers and tests read them from here as before.
export { AGE_BANDS, bandOf, type AgeBand } from '../shared/age'

/** He may be this much older than her, and this much younger. An assumption — see above. */
export const AGE_GAP = { olderBy: 10, youngerBy: 3 } as const

/** Eligible partners a member has in the pool, as a bucket — never a number on a person. */
const INVENTORY = ['0', '1-2', '3-5', '6+'] as const
const STAGES = [...VOCAB_STAGES] as const

type Side = 'women' | 'men'
type Row = Record<string, number>

function bucketOf(n: number): (typeof INVENTORY)[number] {
  return n === 0 ? '0' : n <= 2 ? '1-2' : n <= 5 ? '3-5' : '6+'
}

/** A row with every cell present and zero — a missing key is itself a count. */
function zeroes(keys: readonly string[]): Row {
  return Object.fromEntries(keys.map((k) => [k, 0]))
}
function sides<T>(make: () => T): Record<Side, T> {
  return { women: make(), men: make() }
}

interface Member {
  key: string
  code: string
  side: Side
  /** The map is present and unexpired. */
  live: boolean
  /** The map is present but past its year — it goes with the entry. */
  expired: boolean
  stage: string
  age?: number
  practice?: unknown
  children?: unknown
  /** What she will not compromise on — the ids only. */
  nn: string[]
}

function readMember(key: string, side: Side, kept: KeptMap | null, now: number): Member {
  const code = key.split('/')[SEGMENTS - 1]
  const expired = !!kept && Date.parse(kept.expiresAt) < now
  const live = !!kept && !expired
  const snap = (kept?.snapshot ?? {}) as {
    identity?: { age?: unknown }
    stage?: unknown
    answers?: { practice?: unknown; children?: unknown; dealbreakers?: unknown }
  }
  const rawAge = snap.identity?.age
  const age = typeof rawAge === 'number' && Number.isInteger(rawAge) && rawAge >= 18 && rawAge <= 99 ? rawAge : undefined
  const stage = typeof snap.stage === 'string' && VOCAB_STAGES.has(snap.stage) ? snap.stage : 'preparing'
  const nn = Array.isArray(snap.answers?.dealbreakers)
    ? snap.answers.dealbreakers.filter((v): v is string => typeof v === 'string')
    : []
  return { key, code, side, live, expired, stage, age, practice: snap.answers?.practice, children: snap.answers?.children, nn }
}

/** Could these two be introduced: both aged, within the band, and neither fails the other's checkable non-negotiables. */
export function eligible(w: Member, m: Member): boolean {
  if (w.age === undefined || m.age === undefined) return false
  if (m.age - w.age > AGE_GAP.olderBy || w.age - m.age > AGE_GAP.youngerBy) return false
  return blocked(w.nn, w, m) === null && blocked(m.nn, m, w) === null
}

type Store = ReturnType<typeof getStore>

interface Pool {
  pool: 'city' | 'country'
  scene?: string
  country: string
}

async function health(cohort: Store, maps: Store, pool: Pool, contacts: Store, sweep = false, now = Date.now()) {
  const { blobs } = await cohort.list({ prefix: `${pool.country}/` })
  const keys = blobs
    .map(({ key }) => key)
    .filter((key) => {
      const parts = key.split('/')
      if (parts.length !== SEGMENTS) return false
      // The city pool is everyone in the city, whatever their reach; the
      // country pool is everyone in the country who said they would travel.
      return pool.pool === 'city' ? parts[1] === pool.scene : parts[3] !== 'city'
    })

  const door = sides(() => 0)
  const withSide = keys.flatMap((key) => {
    const side = sideOf(key.split('/')[2])
    if (!side) return []
    door[side] += 1
    return [{ key, side }]
  })

  // One read per member — the five fields above, and whether the map is live.
  const members = await Promise.all(
    withSide.map(async ({ key, side }) => {
      const code = key.split('/')[SEGMENTS - 1]
      const kept = (await maps.get(code, { type: 'json' })) as KeptMap | null
      return readMember(key, side, kept, now)
    }),
  )

  // The sweep, and only when it is asked for.
  //
  // It used to run on every read, which meant the founder could not look at a
  // pool without changing it: anyone whose map read as absent lost their place
  // on the door AND the only way to reach them, permanently, inside a GET,
  // with the readout reporting a count and never a code. A map reads as absent
  // when it has lapsed or been forgotten — and also for a moment if the store
  // simply does not answer, and that delete is not recoverable. Through a
  // sprint of twenty or forty people, one of those is a participant who
  // vanishes with no way to tell which (docs/BOARD.md, the reality-sprint
  // pass).
  //
  // So the readout counts what it would sweep and touches nothing. `?sweep=1`
  // is the founder saying, deliberately, that now is the time.
  const swept = sides(() => 0)
  await Promise.all(
    members
      .filter((m) => !m.live)
      .map(async (m) => {
        if (!sweep) {
          // Counting what would go, having touched nothing.
          swept[m.side] += 1
          return
        }
        // Counted only once the member key is actually gone. It used to be
        // incremented before any delete was attempted, and every delete here
        // swallows its own failure — so the founder could be told N were
        // swept, with `sweptForReal: true`, having removed nothing at all
        // (docs/FAIL.md).
        const gone = await cohort
          .delete(m.key)
          .then(() => true)
          .catch(() => false)
        if (gone) swept[m.side] += 1
        await cohort.delete(`index/${m.code}`).catch(() => {})
        if (m.expired) await maps.delete(m.code).catch(() => {})
        // The way to reach her lives exactly as long as her map. It used to
        // stay for ever — "lapsed is not forgotten" — so a person who had not
        // touched the product in over a year was still on a list, under the
        // same code as the map that was gone, in countries with retention law.
        // Trust now says the contact goes when the map does (docs/BOARD.md,
        // decision 13).
        await contacts.delete(m.code).catch(() => {})
      }),
  )

  const alive = members.filter((m) => m.live)
  const live = sides(() => 0)
  const unaged = sides(() => 0)
  const stages = sides(() => zeroes(STAGES))
  const ages = sides(() => zeroes(AGE_BANDS))
  for (const m of alive) {
    live[m.side] += 1
    stages[m.side][m.stage] += 1
    if (m.age === undefined) unaged[m.side] += 1
    else ages[m.side][bandOf(m.age)] += 1
  }

  const supplyW = alive.filter((m) => m.side === 'women' && m.stage === 'preparing')
  const supplyM = alive.filter((m) => m.side === 'men' && m.stage === 'preparing')
  const supply = { women: supplyW.length, men: supplyM.length }

  // Every pair in supply, both directions. The count per member exists only
  // long enough to land in a bucket.
  let pairs = 0
  const partners = new Map<Member, number>()
  for (const w of supplyW) {
    for (const m of supplyM) {
      if (!eligible(w, m)) continue
      pairs += 1
      partners.set(w, (partners.get(w) ?? 0) + 1)
      partners.set(m, (partners.get(m) ?? 0) + 1)
    }
  }
  const inventory = sides(() => zeroes(INVENTORY))
  for (const m of [...supplyW, ...supplyM]) inventory[m.side][bucketOf(partners.get(m) ?? 0)] += 1

  // The door's own numbers and the checklist's denominators stay whole, like
  // the door's women and men; every finer split is floored. The '0' bucket is
  // `stranded`, returned under both names so the checklist can name it.
  const flooredInventory = floorRows(inventory)
  return {
    ...pool,
    target: COHORT_TARGET,
    assumptions: { ageGap: AGE_GAP },
    door,
    live,
    supply,
    unaged,
    swept,
    stages: floorRows(stages),
    ages: floorRows(ages),
    pairs: { eligible: pairs, of: supply.women * supply.men },
    inventory: flooredInventory,
    stranded: { women: flooredInventory.women['0'], men: flooredInventory.men['0'] },
  }
}

export default async function handler(req: Request) {
  if (req.method !== 'GET') return Response.json({ error: 'GET only' }, { status: 405 })
  if (!isFounder(req)) return notFounder()

  const params = new URL(req.url).searchParams
  const scene = params.get('scene')
  const told = params.get('country')
  let pool: Pool
  if (scene) {
    if (!SCENES.has(scene) || scene === 'other') return Response.json({ error: 'bad_scene' }, { status: 400 })
    const country = countryOf(scene, told)
    if (!country) return Response.json({ error: 'bad_country' }, { status: 400 })
    pool = { pool: 'city', scene, country }
  } else if (told) {
    if (!COUNTRIES.has(told) || told === 'other') return Response.json({ error: 'bad_country' }, { status: 400 })
    pool = { pool: 'country', country: told }
  } else {
    return Response.json({ error: 'scene_or_country' }, { status: 400 })
  }

  try {
    // Deliberate, never incidental: a readout must not be able to delete a
    // member of the pool it is reporting on.
    const sweep = params.get('sweep') === '1'
    return Response.json({
      ...(await health(getStore('cohort'), getStore('maps'), pool, getStore('contacts'), sweep)),
      sweptForReal: sweep,
    })
  } catch (err) {
    console.error('[niyyah] pool: read failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
