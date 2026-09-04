import { getStore } from '@netlify/blobs'
import { isFounder, notFounder } from '../shared/founder'

/**
 * The number on the door.
 *
 * A marriage platform with no members is a promise, and the honest thing to do
 * with a promise is to count toward it in public. This is that count: how many
 * women and how many men in a city have kept a map and can be reached, against
 * the number the city opens at. It goes up when a real person acts, and it is
 * never seeded, rounded up, or invented — the day it lies is the day the trust
 * claim under it stops being true.
 *
 * It is also the first measurement of need this product has ever had. Every
 * join records what the person named as the hardest part, so the tally answers
 * a question we have only been guessing at: what are people actually here for?
 *
 * Nothing here is a person. A join is keyed by the anonymous code her kept map
 * lives under, and carries her city, who she is seeking, her hardest part, and
 * what she has done here. Nothing about how her map read — a readiness number
 * was an answer key — and nothing about how she uses the app: which guide
 * voices she opened used to travel here, and it was usage, not need. The way to reach her is
 * deliberately NOT stored here — it goes to the founder's form, so that this
 * store can be read and tallied without ever holding contact details.
 *
 * Key layout: `<scene>/<gender>/<hook>/<code>`. Listing by prefix is the only
 * query Blobs offers, and with this layout every count the product needs is a
 * prefix and a length — no reads, no PII, nothing to leak.
 */

/** A city opens when both sides have this many people who can be reached. */
export const COHORT_TARGET = 40

/** Must match src/data/scenes.ts and src/data/hook.ts — validated so a bad key can never be written. */
const SCENES = new Set(['twin-cities', 'toronto', 'london', 'columbus', 'stockholm', 'other'])
const GENDERS = new Set(['woman', 'man'])
const HOOKS = new Set(['serious', 'family', 'trust', 'finding', 'ready', 'none'])
/** Must match src/lib/ledger.ts. What a person has actually done here. */
const LEDGER = new Set(['map', 'read', 'beforeYes', 'living', 'kept', 'counted', 'vouched'])
/** Same alphabet and length as netlify/functions/keep.ts. */
const CODE = /^[ACDEFGHJKMNPQRTWXY34789]{6}$/
/** A code, a city, a side, a hardest part and seven ledger ids is the largest thing anyone can send. */
const MAX_BODY = 2_048

export interface CohortRecord {
  at: string
  /** Which instruments she has used — the seriousness that got her counted. */
  ledger: string[]
}

export interface CohortCount {
  scene: string
  women: number
  men: number
  target: number
}

type Store = ReturnType<typeof getStore>

async function countPrefix(store: Store, prefix: string): Promise<number> {
  const { blobs } = await store.list({ prefix })
  return blobs.length
}

async function countScene(store: Store, scene: string): Promise<CohortCount> {
  const [women, men] = await Promise.all([
    countPrefix(store, `${scene}/woman/`),
    countPrefix(store, `${scene}/man/`),
  ])
  return { scene, women, men, target: COHORT_TARGET }
}

/**
 * The founder's readout: every scene, both sides, and what people named as the
 * hardest part — all from keys alone. This is the evidence the Need audit
 * asked for, and it costs nothing to keep.
 */
async function tally(store: Store) {
  const { blobs } = await store.list()
  const scenes: Record<string, { women: number; men: number; hooks: Record<string, number>; ledger: Record<string, number> }> = {}
  const members = blobs.filter(({ key }) => !key.startsWith('index/') && key.split('/').length === 4)
  // The counts come from keys alone; the ledger lives in the value, so the
  // founder's readout reads each record. Fine at founding scale — this is a
  // GET the founder makes, not one the app makes.
  const records = await Promise.all(
    members.map(async ({ key }) => ({ key, record: (await store.get(key, { type: 'json' })) as CohortRecord | null })),
  )
  for (const { key, record } of records) {
    const [scene, gender, hook] = key.split('/')
    if (!scene || !gender || !hook) continue
    const s = (scenes[scene] ??= { women: 0, men: 0, hooks: {}, ledger: {} })
    if (gender === 'woman') s.women += 1
    else if (gender === 'man') s.men += 1
    s.hooks[hook] = (s.hooks[hook] ?? 0) + 1
    for (const id of record?.ledger ?? []) s.ledger[id] = (s.ledger[id] ?? 0) + 1
  }
  return { target: COHORT_TARGET, scenes }
}

export default async function handler(req: Request) {
  const store = getStore('cohort')

  // ── Count ─────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const scene = new URL(req.url).searchParams.get('scene')
    // The number on the door stays public — it is the honest count this
    // product promises. The full tally, every city and hardest part, is the
    // founder's readout.
    if (!scene && !isFounder(req)) return notFounder()
    try {
      if (!scene) return Response.json(await tally(store))
      if (!SCENES.has(scene)) return Response.json({ error: 'bad_scene' }, { status: 400 })
      return Response.json(await countScene(store, scene))
    } catch (err) {
      console.error('[niyyah] cohort: count failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // ── Join ──────────────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return Response.json({ error: 'GET or POST only' }, { status: 405 })
  }

  let body: {
    code?: string
    scene?: string
    gender?: string
    hook?: string
    ledger?: unknown
  }
  let raw: string
  try {
    raw = await req.text()
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 })
  }
  if (raw.length > MAX_BODY) return Response.json({ error: 'too_large' }, { status: 413 })
  try {
    body = JSON.parse(raw)
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 })
  }

  const code = (body.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const scene = body.scene ?? ''
  const gender = body.gender ?? ''
  const hook = HOOKS.has(body.hook ?? '') ? (body.hook as string) : 'none'
  if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
  if (!SCENES.has(scene)) return Response.json({ error: 'bad_scene' }, { status: 400 })
  if (!GENDERS.has(gender)) return Response.json({ error: 'bad_gender' }, { status: 400 })

  // The count is of kept maps, not of taps. A code nobody has kept a map under
  // is not a person we could ever introduce, so it is not counted.
  try {
    const kept = await getStore('maps').getMetadata(code)
    if (!kept) return Response.json({ error: 'no_map' }, { status: 404 })
  } catch (err) {
    console.error('[niyyah] cohort: map lookup failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }

  const ledger = Array.isArray(body.ledger)
    ? body.ledger.filter((v): v is string => typeof v === 'string' && LEDGER.has(v))
    : []
  // An older client may still send `overall` or `voices`. Neither is read or kept.
  const record: CohortRecord = {
    at: new Date().toISOString(),
    ledger,
  }
  const key = `${scene}/${gender}/${hook}/${code}`
  const indexKey = `index/${code}`

  try {
    // One person, one entry. Joining again after moving city or changing an
    // answer replaces the old entry rather than counting her twice.
    const previous = (await store.get(indexKey, { type: 'text' })) as string | null
    if (previous && previous !== key) await store.delete(previous)
    await store.setJSON(key, record)
    await store.set(indexKey, key)
    return Response.json({ code, ...(await countScene(store, scene)) })
  } catch (err) {
    console.error('[niyyah] cohort: join failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
