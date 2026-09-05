import { getStore } from '@netlify/blobs'
import { isFounder, notFounder } from '../shared/founder'
import {
  DIMENSIONS,
  GROUND_STATES,
  MATTERED,
  READ_BANDS,
  READ_DIMENSIONS,
  RUNGS,
  SCENES,
  THROUGH_TOPICS,
  TOPICS,
  USED,
  VIAS,
  WHO,
} from '../shared/vocab'

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
 * anyone who ever reads this store. A record holds rung ids and dates, the
 * kind of link that first brought the person here, and — for a few rungs — how
 * they came out, in words from the closed lists in netlify/shared/vocab.ts.
 * That is all it can hold.
 *
 * The facts are the asset. The ladder said that a map was built; the facts say
 * which ground read thin. It said a conversation was had; the facts say which
 * one. It said someone married; the facts say who she married and what
 * decided it. Crossed with each other in the tally below they are the first
 * thing this product knows that no one could copy from its screens — and they
 * are still counts of ids, never a record of a person, never a sentence.
 */

/** Same alphabet and length as netlify/functions/keep.ts — but a different code. */
const ID = /^[ACDEFGHJKMNPQRTWXY34789]{6}$/

/** A year, refreshed on every report. */
const TTL_MS = 365 * 24 * 60 * 60 * 1000

/** Twelve rungs, a scene, a via and every fact at once is the largest thing anyone can send. */
const MAX_BODY = 4_096

/** Mirrors src/lib/facts.ts, with the ids as plain strings. Every value is validated against vocab.ts. */
export interface Facts {
  grounds?: Record<string, string>
  read?: { band: string; thin: string }
  eleven?: { agree: number; differ: number; notTalked: number; unknown: number; open: string }
  through?: string[]
  ending?: { who?: string; mattered?: string; used?: string[] }
}

export interface ProgressRecord {
  /** Rung id → when it was first reached. A rung never un-reaches. */
  first: Record<string, string>
  scene?: string
  /** What kind of link brought this person here. First told wins; never a person. */
  via?: string
  /** How a few of the rungs came out. See `mergeFacts` for what may change. */
  facts?: Facts
  expiresAt: string
}

const isPlain = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const onlyKeys = (x: Record<string, unknown>, allowed: string[]) => Object.keys(x).every((k) => allowed.includes(k))
const count = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= 11

/**
 * Accept facts, or none of them. Anything off the lists — an unknown ground, a
 * band we do not have, a conversation under the guide's name, the line she
 * wrote on the way out — refuses the whole field, so the store can never hold
 * a value nobody chose to allow.
 */
function parseFacts(x: unknown): Facts | null {
  if (!isPlain(x) || !onlyKeys(x, ['grounds', 'read', 'eleven', 'through', 'ending'])) return null
  const out: Facts = {}

  if (x.grounds !== undefined) {
    if (!isPlain(x.grounds)) return null
    for (const [k, v] of Object.entries(x.grounds)) {
      if (!DIMENSIONS.has(k) || typeof v !== 'string' || !GROUND_STATES.has(v)) return null
    }
    out.grounds = x.grounds as Record<string, string>
  }

  if (x.read !== undefined) {
    const r = x.read
    if (!isPlain(r) || !onlyKeys(r, ['band', 'thin'])) return null
    if (typeof r.band !== 'string' || !READ_BANDS.has(r.band)) return null
    if (typeof r.thin !== 'string' || !READ_DIMENSIONS.has(r.thin)) return null
    out.read = { band: r.band, thin: r.thin }
  }

  if (x.eleven !== undefined) {
    const e = x.eleven
    if (!isPlain(e) || !onlyKeys(e, ['agree', 'differ', 'notTalked', 'unknown', 'open'])) return null
    const { agree, differ, notTalked, unknown, open } = e
    if (!count(agree) || !count(differ) || !count(notTalked) || !count(unknown)) return null
    if (agree + differ + notTalked + unknown !== TOPICS.size) return null
    if (typeof open !== 'string' || !TOPICS.has(open)) return null
    out.eleven = { agree, differ, notTalked, unknown, open }
  }

  if (x.through !== undefined) {
    if (!Array.isArray(x.through) || x.through.length > 32) return null
    for (const t of x.through) {
      if (typeof t !== 'string') return null
      const colon = t.indexOf(':')
      const allowed = THROUGH_TOPICS[t.slice(0, colon)]
      if (colon === -1 || !allowed || !allowed.has(t.slice(colon + 1))) return null
    }
    out.through = [...new Set(x.through as string[])].sort()
  }

  if (x.ending !== undefined) {
    const e = x.ending
    if (!isPlain(e) || !onlyKeys(e, ['who', 'mattered', 'used'])) return null
    const ending: NonNullable<Facts['ending']> = {}
    if (e.who !== undefined) {
      if (typeof e.who !== 'string' || !WHO.has(e.who)) return null
      ending.who = e.who
    }
    if (e.mattered !== undefined) {
      if (typeof e.mattered !== 'string' || !MATTERED.has(e.mattered)) return null
      ending.mattered = e.mattered
    }
    if (e.used !== undefined) {
      if (!Array.isArray(e.used) || !e.used.every((u) => typeof u === 'string' && USED.has(u))) return null
      ending.used = [...new Set(e.used as string[])].sort()
    }
    out.ending = ending
  }

  return out
}

/**
 * What may change once written. The map, the read and the eleven keep the
 * state they were in when first reported — the baseline, not the retake; her
 * movement stays on her device, in the map's history. Conversations only
 * accumulate. The ending she may revise: it is a set of taps on one screen,
 * and the last word on the way out is the one that counts.
 */
function mergeFacts(existing: Facts | undefined, incoming: Facts | undefined): Facts | undefined {
  if (!existing) return incoming
  if (!incoming) return existing
  const through = [...new Set([...(existing.through ?? []), ...(incoming.through ?? [])])].sort()
  const merged: Facts = {
    ...(existing.grounds ?? incoming.grounds ? { grounds: existing.grounds ?? incoming.grounds } : {}),
    ...(existing.read ?? incoming.read ? { read: existing.read ?? incoming.read } : {}),
    ...(existing.eleven ?? incoming.eleven ? { eleven: existing.eleven ?? incoming.eleven } : {}),
    ...(through.length ? { through } : {}),
    ...(incoming.ending ?? existing.ending ? { ending: incoming.ending ?? existing.ending } : {}),
  }
  return merged
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
  const facts = emptyFactsTally()

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
    if (record.facts) tallyFacts(facts, record.facts, 'married' in record.first)
  }
  return { rungs, scenes, vias, arrivedByWeek, facts }
}

type Counts = Record<string, number>
type Pair = Record<string, { [k: string]: number }>

/**
 * The facts, as distributions. Each line is a question the founder asks the
 * readout, and `marriedBy` is the first outcome table this product has ever
 * had: of the people who confirmed they had a given conversation, or whose
 * read found a given ground thinnest, how many went on to marry. Counts of
 * ids, never a record; the install code appears nowhere.
 */
function emptyFactsTally() {
  return {
    /** Ground → state → how many maps read that way. What is this community thin on? */
    grounds: {} as Record<string, Counts>,
    /** How reads come out, and where men here have typically not shown themselves. */
    read: { band: {} as Counts, thin: {} as Counts },
    /** Which of the eleven the product most often tells people to open, and how many were in each state. */
    eleven: { open: {} as Counts, agree: {} as Counts, differ: {} as Counts, notTalked: {} as Counts, unknown: {} as Counts },
    /** Which conversations actually get had, by source and by topic. Which scripts get said. */
    through: {} as Counts,
    throughByTopic: {} as Counts,
    /** Who they married, what decided it, what here was real. */
    ending: { who: {} as Counts, mattered: {} as Counts, used: {} as Counts },
    /** The cross-tabs: each fact against whether the person went on to marry. */
    marriedBy: { through: {} as Pair, readThin: {} as Pair, open: {} as Pair },
  }
}

function tallyFacts(t: ReturnType<typeof emptyFactsTally>, f: Facts, married: boolean) {
  const bump = (c: Counts, k: string) => void (c[k] = (c[k] ?? 0) + 1)
  const pair = (p: Pair, k: string, seen: string) => {
    const row = (p[k] ??= { [seen]: 0, married: 0 })
    row[seen] += 1
    if (married) row.married += 1
  }
  for (const [dim, state] of Object.entries(f.grounds ?? {})) bump((t.grounds[dim] ??= {}), state)
  if (f.read) {
    bump(t.read.band, f.read.band)
    bump(t.read.thin, f.read.thin)
    pair(t.marriedBy.readThin, f.read.thin, 'read')
  }
  if (f.eleven) {
    bump(t.eleven.open, f.eleven.open)
    bump(t.eleven.agree, String(f.eleven.agree))
    bump(t.eleven.differ, String(f.eleven.differ))
    bump(t.eleven.notTalked, String(f.eleven.notTalked))
    bump(t.eleven.unknown, String(f.eleven.unknown))
    pair(t.marriedBy.open, f.eleven.open, 'eleven')
  }
  for (const entry of f.through ?? []) {
    bump(t.through, entry)
    const topic = entry.slice(entry.indexOf(':') + 1)
    bump(t.throughByTopic, topic)
    pair(t.marriedBy.through, topic, 'through')
  }
  if (f.ending) {
    if (f.ending.who) bump(t.ending.who, f.ending.who)
    if (f.ending.mattered) bump(t.ending.mattered, f.ending.mattered)
    for (const u of f.ending.used ?? []) bump(t.ending.used, u)
  }
}

export default async function handler(req: Request) {
  const store = getStore('progress')

  // ── The readout ───────────────────────────────────────────────────────────
  // There is no route that returns one record. There is nothing in one worth
  // returning, and building the route would be building the thing we promised
  // not to have.
  if (req.method === 'GET') {
    // The readout is the founder's. Aggregate, but still the one thing here
    // nobody else could produce — see netlify/shared/founder.ts.
    if (!isFounder(req)) return notFounder()
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

  let body: { id?: string; rungs?: unknown; scene?: string; via?: string; facts?: unknown }
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
  const facts = body.facts === undefined ? undefined : parseFacts(body.facts)
  if (facts === null) return Response.json({ error: 'bad_facts' }, { status: 400 })

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
    const merged = mergeFacts(existing?.facts, facts)
    const record: ProgressRecord = {
      first,
      ...(body.scene ? { scene: body.scene } : existing?.scene ? { scene: existing.scene } : {}),
      ...(via ? { via } : {}),
      ...(merged && Object.keys(merged).length ? { facts: merged } : {}),
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
