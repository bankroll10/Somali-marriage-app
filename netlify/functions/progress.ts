import { getStore } from '@netlify/blobs'

/**
 * The ladder, counted.
 *
 * Until now every trace of what anyone did here lived in their own browser —
 * src/lib/analytics.ts writes to localStorage and nowhere else — so the honest
 * answer to "did the Read help anyone this week" was that we had no idea. A
 * product that cannot see whether it helps people cannot be made to help more,
 * and that is the whole of the Law of Effection.
 *
 * So this counts rungs, and only rungs. The vocabulary below is the entire set
 * of things that can ever be written here, and every one of them is a claim
 * about a person's life rather than about their use of an app. There is
 * deliberately no field for a session, a duration, a screen, a tap, a message
 * count or a streak: an engagement metric cannot be recorded by this function
 * without someone changing this function.
 *
 * Nothing here is a person, and nothing here can be joined to one. The key is
 * a random code the device generated for itself — NOT the code her kept map
 * lives under — so there is no path from a map to a timeline, by us or by
 * anyone who ever reads this store. A record holds rung ids and dates, and the
 * kind of link that first brought the person here. That is all it can hold.
 */

/** Must match src/lib/rungs.ts. A rung the ladder does not have cannot be written. */
const RUNGS = new Set([
  'arrived',
  'situated',
  'mapped',
  'read',
  'eleven',
  'asked-him',
  'he-answered',
  'followed-through',
  'vouched',
  'counted',
  'deciding',
  'married',
])

/** Must match src/data/scenes.ts — the same list cohort.ts validates against. */
const SCENES = new Set(['twin-cities', 'toronto', 'london', 'columbus', 'stockholm', 'other'])

/**
 * Must match src/lib/entry.ts. What kind of link first brought a person here —
 * words a friend sent, the eleven, a couple's link, the door, a family link.
 * It is the only attribution this store holds, and it never says who sent it:
 * the link does not carry that, and this set is closed so nothing else can
 * arrive under the name.
 */
const VIAS = new Set(['words', 'eleven', 'couple', 'door', 'family'])

/** Same alphabet and length as netlify/functions/keep.ts — but a different code. */
const ID = /^[ACDEFGHJKMNPQRTWXY34789]{6}$/

/** A year, refreshed on every report. */
const TTL_MS = 365 * 24 * 60 * 60 * 1000

/** A rung id and an ISO date is the largest thing anyone can send. */
const MAX_BODY = 2_048

export interface ProgressRecord {
  /** Rung id → when it was first reached. A rung never un-reaches. */
  first: Record<string, string>
  scene?: string
  /** What kind of link brought this person here. First told wins; never a person. */
  via?: string
  expiresAt: string
}

type Store = ReturnType<typeof getStore>

/**
 * The founder's readout. Per rung, how many people reached it; the same split
 * by city and by what kind of link brought them; and arrivals by week, so
 * `followed-through` per hundred `arrived` is computable over a cohort rather
 * than over all time — and so word of mouth can be told from every other
 * arrival, by source, without an edge between two people anywhere.
 */
async function tally(store: Store) {
  const { blobs } = await store.list()
  const records = await Promise.all(
    blobs.map(async ({ key }) => (await store.get(key, { type: 'json' })) as ProgressRecord | null),
  )
  const now = Date.now()
  const rungs: Record<string, number> = {}
  const scenes: Record<string, Record<string, number>> = {}
  const vias: Record<string, Record<string, number>> = {}
  const arrivedByWeek: Record<string, number> = {}

  for (const record of records) {
    if (!record?.first) continue
    if (Date.parse(record.expiresAt) < now) continue
    const scene = record.scene && SCENES.has(record.scene) ? record.scene : 'unsaid'
    const via = record.via && VIAS.has(record.via) ? record.via : 'unsaid'
    const perScene = (scenes[scene] ??= {})
    const perVia = (vias[via] ??= {})
    for (const [id, at] of Object.entries(record.first)) {
      if (!RUNGS.has(id)) continue
      rungs[id] = (rungs[id] ?? 0) + 1
      perScene[id] = (perScene[id] ?? 0) + 1
      perVia[id] = (perVia[id] ?? 0) + 1
      if (id === 'arrived') {
        const week = at.slice(0, 10)
        arrivedByWeek[week] = (arrivedByWeek[week] ?? 0) + 1
      }
    }
  }
  return { rungs, scenes, vias, arrivedByWeek }
}

export default async function handler(req: Request) {
  const store = getStore('progress')

  // ── The readout ───────────────────────────────────────────────────────────
  // There is no route that returns one record. There is nothing in one worth
  // returning, and building the route would be building the thing we promised
  // not to have.
  if (req.method === 'GET') {
    try {
      return Response.json(await tally(store))
    } catch (err) {
      console.error('[niyyah] progress: tally failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // ── Reporting a rung ──────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return Response.json({ error: 'GET or POST only' }, { status: 405 })
  }

  const raw = await req.text()
  if (raw.length > MAX_BODY) return Response.json({ error: 'too_large' }, { status: 413 })

  let body: { id?: string; rungs?: unknown; scene?: string; via?: string }
  try {
    body = JSON.parse(raw)
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 })
  }

  const id = (body.id ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!ID.test(id)) return Response.json({ error: 'bad_id' }, { status: 400 })
  if (!Array.isArray(body.rungs)) return Response.json({ error: 'bad_rungs' }, { status: 400 })

  const rungs = body.rungs.filter((r): r is string => typeof r === 'string' && RUNGS.has(r))
  if (rungs.length !== body.rungs.length) return Response.json({ error: 'bad_rungs' }, { status: 400 })
  if (body.scene !== undefined && !SCENES.has(body.scene)) {
    return Response.json({ error: 'bad_scene' }, { status: 400 })
  }
  if (body.via !== undefined && !VIAS.has(body.via)) {
    return Response.json({ error: 'bad_via' }, { status: 400 })
  }

  const now = Date.now()
  const at = new Date(now).toISOString()
  try {
    const existing = (await store.get(id, { type: 'json' })) as ProgressRecord | null
    // Only ever adds. A rung already reached keeps the date it was first
    // reached, so a returning visitor cannot rewrite her own history and a
    // reported rung can never be taken back.
    const first: Record<string, string> = { ...(existing?.first ?? {}) }
    for (const rung of rungs) first[rung] ??= at
    // The via, like a rung's date, is first-told-wins: how she found this,
    // not how she last opened it.
    const via = existing?.via ?? body.via
    const record: ProgressRecord = {
      first,
      ...(body.scene ? { scene: body.scene } : existing?.scene ? { scene: existing.scene } : {}),
      ...(via ? { via } : {}),
      expiresAt: new Date(now + TTL_MS).toISOString(),
    }
    await store.setJSON(id, record)
    return Response.json({ ok: true })
  } catch (err) {
    // The app never depended on this and must never start. Failing to count
    // someone is a measurement problem, not her problem.
    console.error('[niyyah] progress: write failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
