import { getStore } from '@netlify/blobs'
import { CODE, normalise } from '../shared/code'
import { readJson } from '../shared/body'
import { isFounder, notFounder } from '../shared/founder'
// Validated against closed sets so a bad key can never be written — see netlify/shared/vocab.ts.
import { COUNTRIES, GENDERS, HOOKS, LEDGER, REACH, SCENES, SCENE_COUNTRY } from '../shared/vocab'
import { day } from '../shared/day'
import { floor } from '../shared/floor'
import { overHourlyCap, rateLimited } from '../shared/limit'
import { stamp } from '../shared/record'

/**
 * The number on the door.
 *
 * A marriage platform with no members is a promise, and the honest thing to do
 * with a promise is to count toward it in public. This is that count: how many
 * women and how many men have kept a map and can be reached, against the number
 * a pool opens at. It goes up when a real person acts, down when a kept map
 * lapses and the founder's read of the pool sweeps it (netlify/functions/pool.ts),
 * and it is never seeded, rounded up, or invented — the day it lies is the day
 * the trust claim under it stops being true.
 *
 * The unit is the pool, not the city. A city is where a person can meet someone
 * this week; a country is where she would move for the right person — and for
 * most of the diaspora, who live in a hundred small pockets rather than five
 * big ones, the country is the only geography in which a real number of serious
 * people exists. So every count here is two numbers: the city (`here`) and the
 * people in her country who said they would travel (`across`). Reach is mutual
 * by construction — a person is in `across` only if she herself would travel —
 * so the pool a woman in Bristol sees is the pool a man in Leeds sees.
 * `other` is not a city: two people in it may be continents apart, so it has no
 * `here`, and someone there who would not travel is counted but in no pool
 * that can open. That is the honest repair of what `other` used to be: one
 * worldwide bucket counted toward the same forty as Minneapolis.
 *
 * It is also the first measurement of need this product has ever had. Every
 * join records what the person named as the hardest part, so the tally answers
 * a question we have only been guessing at: what are people actually here for?
 *
 * Nothing here is a person. A join is keyed by the anonymous code her kept map
 * lives under, and carries her country and city, who she is seeking, how far
 * she would go, her hardest part, and what she has done here. Nothing about
 * how her map read — a readiness number was an answer key — and nothing about
 * how she uses the app. The way to reach her is deliberately NOT in this
 * store, so that it can be listed and tallied without ever holding contact
 * details. The country is coarser than the city, so docs/LEARNING.md's refusal
 * of anything finer stands untouched.
 *
 * ─── The `contacts` store ──────────────────────────────────────────────────
 * The way to reach her is written here to a *separate* store, keyed by the
 * same code, holding her contact and the city and country it belongs to and
 * nothing else — strictly less than the founder's form already receives.
 *
 * Why it exists (docs/OWNED.md, move 2): until now the only copy of how to
 * reach any member lived in Netlify Forms, which meant the answer to "own the
 * customer?" was no. If that account ended, every person who ever trusted us
 * with a way to reach them became unreachable and the pool they were waiting
 * for could never be told it opened. A list is only ever owned from member one
 * — there is no retroactive version — so this is written from the first join.
 *
 * **No endpoint ever returns it.** Not this function, not the founder's tally,
 * not the backup in export.ts, which refuses member contact for exactly this
 * reason. It is read the way the vouch sentence and phone are read: in the
 * Blobs store, by the founder, with her own credentials — and exported to a
 * file in the monthly hour, which is what makes it hers rather than a
 * supplier's. tests/cohort-function.test.ts holds that line.
 *
 * It is deleted by forget-me, in the same breath as the map and the vouch, so
 * "a person deletes it by hand" stopped being the promise on the Trust page.
 *
 * Key layout: `<country>/<scene>/<gender>/<reach>/<hook>/<code>`. Listing by
 * prefix is the only query Blobs offers, and with this layout every count the
 * door needs is one list under a country and a walk over its keys — no reads,
 * no PII, nothing to leak. Fine to some thousands of members per country; the
 * running counter that replaces it, and its trigger, are in docs/SCALE.md.
 */

/** A pool opens when both sides have this many people who can be reached. */
export const COHORT_TARGET = 40

/** A code, a city, a country, a side, a reach, a hardest part, seven ledger ids and a way to reach her is the largest thing anyone can send. */
const MAX_BODY = 2_560
/** An email or a phone number. Long enough for any real address, short enough that nothing else fits. */
const MAX_CONTACT = 200
/** A member key has exactly this many segments. Anything else is the index, or a key from before countries existed. */
export const SEGMENTS = 6
/** Joins in one hour, from everyone. A circuit breaker, not a member limit — see netlify/shared/limit.ts. */
const DEFAULT_HOURLY_CAP = 200
/** Door counts read in one hour, from everyone — the read cap, per keep.ts. */
const DEFAULT_READ_CAP = 600

export interface CohortRecord {
  at: string
  /** Which instruments she has used — the seriousness that got her counted. */
  ledger: string[]
}

/**
 * The way to reach her — the `contacts` store's record, and the only one that
 * holds free text about a member. Her contact, and the pool it belongs to, so
 * the founder can write to exactly the people whose pool opened. Nothing else
 * may be added here: tests/cohort-function.test.ts holds the key list.
 */
export interface ContactRecord {
  contact: string
  scene: string
  country: string
  at: string
}

export interface SideCount {
  women: number
  men: number
}

export interface PoolCount {
  scene: string
  country: string
  target: number
  /** The city, both sides. Null for `other`, which is not a place anyone can meet. */
  here: SideCount | null
  /** Everyone in the country who said they would travel for the right person. */
  across: SideCount
}

type Store = ReturnType<typeof getStore>

export function sideOf(gender: string): keyof SideCount | null {
  return gender === 'woman' ? 'women' : gender === 'man' ? 'men' : null
}

/**
 * A named city knows its country; somewhere-else has to be told one. Null when
 * the person cannot be placed — and an unplaced person cannot be counted.
 */
export function countryOf(scene: string, told: unknown): string | null {
  if (scene !== 'other') return SCENE_COUNTRY[scene] ?? null
  return typeof told === 'string' && COUNTRIES.has(told) ? told : null
}

/** The two numbers on the door, from keys alone, in one walk over the country. */
async function countPool(store: Store, country: string, scene: string): Promise<PoolCount> {
  const { blobs } = await store.list({ prefix: `${country}/` })
  const here: SideCount | null = scene === 'other' ? null : { women: 0, men: 0 }
  const across: SideCount = { women: 0, men: 0 }
  for (const { key } of blobs) {
    const parts = key.split('/')
    if (parts.length !== SEGMENTS) continue
    const [, s, gender, reach] = parts
    const side = sideOf(gender)
    if (!side) continue
    if (here && s === scene) here[side] += 1
    if (reach !== 'city') across[side] += 1
  }
  return { scene, country, target: COHORT_TARGET, here, across }
}

interface SceneTally {
  women: number
  men: number
  hooks: Record<string, number>
  ledger: Record<string, number>
  reach: Record<string, number>
}

/**
 * The founder's readout: every country, every city in it, both sides, how far
 * its people would go, and what they named as the hardest part — all from keys
 * alone, plus one read per member for the ledger.
 */
async function tally(store: Store) {
  const { blobs } = await store.list()
  const countries: Record<string, { across: SideCount; scenes: Record<string, SceneTally> }> = {}
  const members = blobs.filter(({ key }) => key.split('/').length === SEGMENTS)
  // The counts come from keys alone; the ledger lives in the value, so the
  // founder's readout reads each record. Fine at founding scale — this is a
  // GET the founder makes, not one the app makes. See docs/SCALE.md.
  const records = await Promise.all(
    members.map(async ({ key }) => ({ key, record: (await store.get(key, { type: 'json' })) as CohortRecord | null })),
  )
  for (const { key, record } of records) {
    const [country, scene, gender, reach, hook] = key.split('/')
    const side = sideOf(gender)
    if (!country || !scene || !side || !reach || !hook) continue
    const c = (countries[country] ??= { across: { women: 0, men: 0 }, scenes: {} })
    const s = (c.scenes[scene] ??= { women: 0, men: 0, hooks: {}, ledger: {}, reach: {} })
    s[side] += 1
    if (reach !== 'city') c.across[side] += 1
    s.hooks[hook] = (s.hooks[hook] ?? 0) + 1
    s.reach[reach] = (s.reach[reach] ?? 0) + 1
    for (const id of record?.ledger ?? []) s.ledger[id] = (s.ledger[id] ?? 0) + 1
  }
  // The door's own numbers — a city's sides, a country's travellers — are
  // public by design and stay numbers. What a city named as hardest, how far
  // its people would go, and what they have done are floored — see
  // netlify/shared/floor.ts.
  return {
    target: COHORT_TARGET,
    countries: Object.fromEntries(
      Object.entries(countries).map(([country, c]) => [
        country,
        {
          across: c.across,
          scenes: Object.fromEntries(
            Object.entries(c.scenes).map(([scene, s]) => [
              scene,
              { women: s.women, men: s.men, hooks: floor(s.hooks), ledger: floor(s.ledger), reach: floor(s.reach) },
            ]),
          ),
        },
      ]),
    ),
  }
}

export default async function handler(req: Request) {
  const store = getStore('cohort')

  // ── Count ─────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const params = new URL(req.url).searchParams
    const scene = params.get('scene')
    // The number on the door stays public — it is the honest count this
    // product promises. The full tally, every country and hardest part, is
    // the founder's readout.
    if (!scene && !isFounder(req)) return notFounder()
    try {
      if (!scene) return Response.json(await tally(store))
      if (!SCENES.has(scene)) return Response.json({ error: 'bad_scene' }, { status: 400 })
      const country = countryOf(scene, params.get('country'))
      if (!country) return Response.json({ error: 'bad_country' }, { status: 400 })
      // The one public route that walks a whole prefix of the store on every
      // call. Every other O(n) read here is behind the founder key; this one
      // is open by design, because the count is the promise. So it is bounded.
      if (await overHourlyCap('door', DEFAULT_READ_CAP)) return rateLimited()
      return Response.json(await countPool(store, country, scene))
    } catch (err) {
      console.error('[niyyah] cohort: count failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // ── Join ──────────────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return Response.json({ error: 'GET or POST only' }, { status: 405 })
  }

  const body = await readJson<{
    code?: unknown
    scene?: string
    country?: unknown
    reach?: unknown
    gender?: string
    hook?: string
    ledger?: unknown
    contact?: unknown
  }>(req, MAX_BODY)
  if (body instanceof Response) return body

  const code = normalise(body.code)
  const scene = body.scene ?? ''
  const gender = body.gender ?? ''
  const hook = HOOKS.has(body.hook ?? '') ? (body.hook as string) : 'none'
  if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
  if (!SCENES.has(scene)) return Response.json({ error: 'bad_scene' }, { status: 400 })
  if (!GENDERS.has(gender)) return Response.json({ error: 'bad_gender' }, { status: 400 })
  // A city implies its country and a value the client sends beside it is
  // ignored; somewhere-else must say which country, or it cannot be counted.
  const country = countryOf(scene, body.country)
  if (!country) return Response.json({ error: 'bad_country' }, { status: 400 })
  // Silence means her city. The product never assumes anyone would move.
  const reach = body.reach === undefined ? 'city' : body.reach
  if (typeof reach !== 'string' || !REACH.has(reach)) return Response.json({ error: 'bad_reach' }, { status: 400 })

  // Bounded, like every public write. After validation, so a bad body spends
  // nothing; before any read, so the cap is the cheapest thing here.
  if (await overHourlyCap('cohort', DEFAULT_HOURLY_CAP)) return rateLimited()

  // The count is of kept maps, not of taps. A code nobody has kept a map under
  // is not a person we could ever introduce, so it is not counted.
  try {
    const kept = await getStore('maps').getMetadata(code)
    if (!kept) return Response.json({ error: 'no_map' }, { status: 404 })
  } catch (err) {
    console.error('[niyyah] cohort: map lookup failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }

  // Her own words, and the only free text this store's neighbour holds — so
  // it is bounded and never parsed, only kept. Absent is fine: someone can be
  // counted from a screen that never asked, and the join must not fail for it.
  const contact = typeof body.contact === 'string' ? body.contact.trim().slice(0, MAX_CONTACT) : ''

  const ledger = Array.isArray(body.ledger)
    ? body.ledger.filter((v): v is string => typeof v === 'string' && LEDGER.has(v))
    : []
  // An older client may still send `overall` or `voices`. Neither is read or kept.
  const record: CohortRecord = {
    at: day(),
    ledger,
  }
  const key = `${country}/${scene}/${gender}/${reach}/${hook}/${code}`
  const indexKey = `index/${code}`

  try {
    // One person, one entry. Joining again after moving city, changing how far
    // she would go, or changing an answer replaces the old entry rather than
    // counting her twice.
    const previous = (await store.get(indexKey, { type: 'text' })) as string | null
    if (previous && previous !== key) await store.delete(previous)
    await store.setJSON(key, stamp(record))
    await store.set(indexKey, key)

    // The way to reach her, to its own store. After the count, and in its own
    // try: being counted is what she asked for, and it must not fail because
    // the list did. Joining again with a new address replaces the old one.
    let contactStored = true
    if (contact) {
      try {
        const reach: ContactRecord = { contact, scene, country, at: day() }
        await getStore('contacts').setJSON(code, stamp(reach))
      } catch (err) {
        console.error('[niyyah] cohort: contact write failed', err)
        // Say so. Being counted still succeeded and must not be undone, but
        // the response used to be identical either way, so she read "You're
        // counted" with the way to reach her never written — and no readout
        // could show it, because nothing returns this store (docs/FAIL.md).
        contactStored = false
      }
    }

    return Response.json({ code, ...(await countPool(store, country, scene)), contactStored })
  } catch (err) {
    console.error('[niyyah] cohort: join failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
