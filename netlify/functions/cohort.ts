import { getStore } from '@netlify/blobs'

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
 * lives under, and carries her city, who she is seeking, her hardest part, her
 * overall number, and which guide voices she has used. The way to reach her is
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
const VOICES = new Set(['auntie', 'brother', 'therapist', 'islamic', 'matchmaker', 'profile'])
/** Same alphabet and length as netlify/functions/keep.ts. */
const CODE = /^[ACDEFGHJKMNPQRTWXY34789]{6}$/

export interface CohortRecord {
  at: string
  overall?: number
  voices: string[]
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
  const scenes: Record<string, { women: number; men: number; hooks: Record<string, number> }> = {}
  for (const { key } of blobs) {
    const [scene, gender, hook] = key.split('/')
    if (!scene || !gender || !hook || scene === 'index') continue
    const s = (scenes[scene] ??= { women: 0, men: 0, hooks: {} })
    if (gender === 'woman') s.women += 1
    else if (gender === 'man') s.men += 1
    s.hooks[hook] = (s.hooks[hook] ?? 0) + 1
  }
  return { target: COHORT_TARGET, scenes }
}

export default async function handler(req: Request) {
  const store = getStore('cohort')

  // ── Count ─────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const scene = new URL(req.url).searchParams.get('scene')
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
    overall?: number
    voices?: unknown
  }
  try {
    body = await req.json()
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

  const voices = Array.isArray(body.voices)
    ? body.voices.filter((v): v is string => typeof v === 'string' && VOICES.has(v))
    : []
  const record: CohortRecord = {
    at: new Date().toISOString(),
    ...(typeof body.overall === 'number' ? { overall: Math.round(body.overall) } : {}),
    voices,
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
