import { getStore } from '@netlify/blobs'
import { failed } from '../shared/ops'
import { CODE, normalise } from '../shared/code'
import { readJson } from '../shared/body'
import { isFounder, notFounder } from '../shared/founder'
import { day } from '../shared/day'
import { stamp } from '../shared/record'
import { floorRows } from '../shared/floor'
import { overHourlyCap, rateLimited } from '../shared/limit'
import {
  ASKED,
  COUNTRIES,
  DIMENSIONS,
  ENDED_REASONS,
  ENDED_STAGES,
  ENDED_WHICH,
  GROUND_STATES,
  GENDERS,
  HESITATIONS,
  INSTRUMENTS,
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

/** The install id: the same shape as a map code, minted on her device — but a different code. */
const ID = CODE

/**
 * A year, refreshed on every report — except once someone has married.
 *
 * The refresh was anti-correlated with the value of the record: it happens on
 * a write, and marrying is the thing that ends the writing. So the one outcome
 * this product exists to cause dropped out of every readout at day 366, and
 * the historical count changed retroactively — while the blob, and its cost,
 * stayed on disk for ever because nothing deleted it either. `export.ts` never
 * checked `expiresAt` at all, so the backup and the readout disagreed in both
 * directions with nothing reconciling them. docs/HARD.md.
 *
 * A record that has reached `married` is kept and counted, whatever its date.
 * Everything else honours the year — and the year is now real: the tally
 * deletes what it walks past and refuses to count.
 */
const TTL_MS = 365 * 24 * 60 * 60 * 1000

/** Twelve rungs, a scene, a via and every fact at once is the largest thing anyone can send. */
const MAX_BODY = 4_096
/**
 * Reports in one hour, from everyone. The readout is rebuilt from every record
 * on each read, so a loop of made-up install codes is the cheapest way to make
 * it time out. A circuit breaker, not a member limit — see netlify/shared/limit.ts.
 */
const DEFAULT_HOURLY_CAP = 1000
/** Forgets in one hour, from everyone — the read-cap shape from keep.ts, since this deletes. */
const DEFAULT_FORGET_CAP = 600
/** Conditional writes lose a race now and then; three tries, like every one here. */
const ATTEMPTS = 3

/** Mirrors src/lib/facts.ts, with the ids as plain strings. Every value is validated against vocab.ts. */
export interface Facts {
  grounds?: Record<string, string>
  read?: { band: string; thin: string }
  eleven?: { agree: number; differ: number; notTalked: number; unknown: number; open: string }
  through?: string[]
  ending?: { who?: string; mattered?: string; used?: string[] }
  ended?: { stage: string; reason: string; which?: string }[]
  /** Why she stopped at the door, in one word about the door. */
  hesitated?: string
  /** Which questionnaires she began — the denominator for a completion rate. */
  began?: string[]
  /** What she asked, ever, as a set — today only `guide`. */
  asked?: string[]
}

/** Courtships a person can report as ended. Eight is a lot of courtships. */
const MAX_ENDED = 8

export interface ProgressRecord {
  /** Rung id → when it was first reached. A rung never un-reaches. */
  first: Record<string, string>
  scene?: string
  /**
   * The country, last told wins like `scene`. Without it the North Star could
   * not be read for any country: thirteen of fourteen have no named city, so
   * every member outside the five cities collapsed into one `other` row. Added
   * while there were zero records — a field is cheapest before member one
   * (docs/BACKWARD.md, docs/BOARD.md). Floored like every quasi-identifier.
   */
  country?: string
  /** What kind of link brought this person here. First told wins; never a person. */
  via?: string
  /**
   * Which side of the door this person is on — `woman` or `man`, as chosen at
   * Identity, last told wins like `scene`. The one split the men's funnel
   * needs (docs/MACHINE.md); floored like every other quasi-identifier.
   */
  gender?: string
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
  if (!isPlain(x) || !onlyKeys(x, ['grounds', 'read', 'eleven', 'through', 'ending', 'ended', 'hesitated', 'began', 'asked'])) return null
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
      // Own keys only: `constructor:` used to find Object's prototype here and
      // throw on `.has` (docs/SECURITY.md, O3).
      const prefix = t.slice(0, colon)
      const allowed = Object.hasOwn(THROUGH_TOPICS, prefix) ? THROUGH_TOPICS[prefix] : undefined
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

  if (x.ended !== undefined) {
    if (!Array.isArray(x.ended) || x.ended.length > MAX_ENDED) return null
    const ended: NonNullable<Facts['ended']> = []
    for (const e of x.ended) {
      if (!isPlain(e) || !onlyKeys(e, ['stage', 'reason', 'which'])) return null
      if (typeof e.stage !== 'string' || !ENDED_STAGES.has(e.stage)) return null
      if (typeof e.reason !== 'string' || !ENDED_REASONS.has(e.reason)) return null
      const takes = Object.hasOwn(ENDED_WHICH, e.reason) ? ENDED_WHICH[e.reason] : undefined
      // A which only where the reason takes one, and only from that reason's list.
      if (e.which !== undefined) {
        if (!takes || typeof e.which !== 'string' || !takes.has(e.which)) return null
        ended.push({ stage: e.stage, reason: e.reason, which: e.which })
      } else {
        ended.push({ stage: e.stage, reason: e.reason })
      }
    }
    out.ended = ended
  }

  if (x.hesitated !== undefined) {
    if (typeof x.hesitated !== 'string' || !HESITATIONS.has(x.hesitated)) return null
    out.hesitated = x.hesitated
  }

  if (x.began !== undefined) {
    if (!Array.isArray(x.began) || x.began.length > INSTRUMENTS.size) return null
    if (!x.began.every((id) => typeof id === 'string' && INSTRUMENTS.has(id))) return null
    out.began = [...new Set(x.began as string[])].sort()
  }

  if (x.asked !== undefined) {
    if (!Array.isArray(x.asked) || x.asked.length > ASKED.size) return null
    if (!x.asked.every((id) => typeof id === 'string' && ASKED.has(id))) return null
    out.asked = [...new Set(x.asked as string[])].sort()
  }

  return out
}

/**
 * What may change once written. The map, the read and the eleven keep the
 * state they were in when first reported — the baseline, not the retake; her
 * movement stays on her device, in the map's history. Conversations only
 * accumulate. The ending she may revise: it is a set of taps on one screen,
 * and the last word on the way out is the one that counts. Ended courtships
 * are replaced whole for the same reason, and for one more: the list on her
 * device is the record, so a reason she takes back leaves here too. A union
 * would make retraction impossible and let a stale device resurrect it. Why
 * she stopped at the door is overwritten too: she may change her mind, and if
 * she later walks through, the reason stays beside the `counted` rung so the
 * readout can say who came back.
 */
function mergeFacts(existing: Facts | undefined, incoming: Facts | undefined): Facts | undefined {
  if (!existing) return incoming
  if (!incoming) return existing
  const through = [...new Set([...(existing.through ?? []), ...(incoming.through ?? [])])].sort()
  // A beginning cannot be un-begun, so this is a union like `through` — and
  // because it is a set, it can never become a count of how often she opened one.
  const began = [...new Set([...(existing.began ?? []), ...(incoming.began ?? [])])].sort()
  // Asked is a set too: a thing asked once was asked.
  const asked = [...new Set([...(existing.asked ?? []), ...(incoming.asked ?? [])])].sort()
  const merged: Facts = {
    ...(existing.grounds ?? incoming.grounds ? { grounds: existing.grounds ?? incoming.grounds } : {}),
    ...(existing.read ?? incoming.read ? { read: existing.read ?? incoming.read } : {}),
    ...(existing.eleven ?? incoming.eleven ? { eleven: existing.eleven ?? incoming.eleven } : {}),
    ...(through.length ? { through } : {}),
    ...(incoming.ending ?? existing.ending ? { ending: incoming.ending ?? existing.ending } : {}),
    ...(incoming.ended ?? existing.ended ? { ended: incoming.ended ?? existing.ended } : {}),
    ...(incoming.hesitated ?? existing.hesitated ? { hesitated: incoming.hesitated ?? existing.hesitated } : {}),
    ...(began.length ? { began } : {}),
    ...(asked.length ? { asked } : {}),
  }
  return merged
}

type Store = ReturnType<typeof getStore>

/**
 * The founder's readout. Per rung, how many people reached it; the same split
 * by city, by what kind of link brought them, and by side — so the men's
 * funnel can be read apart from the women's, which is the one question
 * docs/MACHINE.md found the ladder could not answer; and arrivals by week, so
 * `followed-through` per hundred `arrived` is computable over a cohort rather
 * than over all time — and so word of mouth can be told from every other
 * arrival, by source, without an edge between two people anywhere. Side and
 * via are crossed once, in `sidesByVia`, because a man who arrived through a
 * woman's eleven is already talking to someone and is not supply, and neither
 * split alone can tell him from a man the network channel produced
 * (docs/REDTEAM.md).
 */
async function tally(store: Store) {
  const { blobs } = await store.list()
  const records = await Promise.all(
    blobs.map(async ({ key }) => ({ key, record: (await store.get(key, { type: 'json' })) as ProgressRecord | null })),
  )
  /** Records past their year, swept as the tally walks them. */
  const stale: string[] = []
  const now = Date.now()
  const rungs: Record<string, number> = {}
  const scenes: Record<string, Record<string, number>> = {}
  /** The ladder per country — the North Star for the nine countries with no named city. */
  const countries: Record<string, Record<string, number>> = {}
  const vias: Record<string, Record<string, number>> = {}
  const sides: Record<string, Record<string, number>> = {}
  /**
   * Side × via. A man who arrives through a woman's eleven — `couple`, or the
   * eleven's own words — is already talking to someone, often someone counted
   * here; he is not supply for anyone else. `group` is the men the network
   * channel produced; `door` is the men a member sent, some looking and some
   * already talking. `sides` says how many men, `vias` says how many came
   * through a group, and neither can say whether they are the same men. This
   * can. Floored per cell like every other split by a quasi-identifier, and
   * never crossed with the facts.
   */
  const sidesByVia: Record<string, Record<string, Record<string, number>>> = {}
  const arrivedByDay: Record<string, number> = {}
  const facts = emptyFactsTally()

  for (const { key, record } of records) {
    if (!record?.first) continue
    // A marriage is the asset. It never expires, and it is the one thing here
    // that a member stops writing about precisely because it happened.
    if (!('married' in record.first) && Date.parse(record.expiresAt) < now) {
      // The year, made real. Skipping without deleting left the store holding
      // exactly what the readout refuses to count.
      stale.push(key)
      continue
    }
    const scene = record.scene && SCENES.has(record.scene) ? record.scene : 'unsaid'
    const country = record.country && COUNTRIES.has(record.country) ? record.country : 'unsaid'
    const via = record.via && VIAS.has(record.via) ? record.via : 'unsaid'
    const side = record.gender && GENDERS.has(record.gender) ? record.gender : 'unsaid'
    const perScene = (scenes[scene] ??= {})
    const perCountry = (countries[country] ??= {})
    const perVia = (vias[via] ??= {})
    const perSide = (sides[side] ??= {})
    const perSideVia = ((sidesByVia[side] ??= {})[via] ??= {})
    for (const [id, at] of Object.entries(record.first)) {
      if (!RUNGS.has(id)) continue
      rungs[id] = (rungs[id] ?? 0) + 1
      perScene[id] = (perScene[id] ?? 0) + 1
      perCountry[id] = (perCountry[id] ?? 0) + 1
      perVia[id] = (perVia[id] ?? 0) + 1
      perSide[id] = (perSide[id] ?? 0) + 1
      perSideVia[id] = (perSideVia[id] ?? 0) + 1
      // Records written before dates were days still hold a moment; read the day off them.
      if (id === 'arrived') {
        const d = at.slice(0, 10)
        arrivedByDay[d] = (arrivedByDay[d] ?? 0) + 1
      }
    }
    if (record.facts) {
      tallyFacts(facts, record.facts, 'married' in record.first, 'counted' in record.first, 'followed-through' in record.first)
    }
  }

  // The sweep. Nothing else in this product ever deleted an expired record, so
  // the year was a claim the storage did not keep — and the records that
  // expire are by definition the ones nobody reads again, so a lazy
  // delete-on-read would never have fired for them. This is the founder's own
  // readout, made rarely, so it is the right place to do the walking.
  // Failures are ignored: a record that outlives its year by a month is a
  // tidiness problem, and a readout that 503s because a delete failed is not.
  if (stale.length) {
    await Promise.all(stale.map((key) => store.delete(key).catch(() => {})))
  }

  // Whole-population counts as they are; every split by a quasi-identifier
  // floored — see netlify/shared/floor.ts. `sides.man` therefore reads null
  // until five men have arrived, which is also the first moment a conclusion
  // about men is worth drawing; the door's own count stays the unfloored
  // number for `counted`.
  return {
    rungs,
    scenes: floorRows(scenes),
    countries: floorRows(countries),
    vias: floorRows(vias),
    sides: floorRows(sides),
    sidesByVia: Object.fromEntries(Object.entries(sidesByVia).map(([s, rows]) => [s, floorRows(rows)])),
    arrivedByDay,
    facts: {
      ...facts,
      marriedBy: {
        through: floorRows(facts.marriedBy.through),
        readThin: floorRows(facts.marriedBy.readThin),
        open: floorRows(facts.marriedBy.open),
        ended: floorRows(facts.marriedBy.ended),
      },
      countedBy: {
        hesitated: floorRows(facts.countedBy.hesitated),
      },
      followedThroughBy: {
        asked: floorRows(facts.followedThroughBy.asked),
      },
    },
  }
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
    /** Why courtships end, from which stage, and which non-negotiable, topic or ground did it. */
    ended: { reason: {} as Counts, stage: {} as Counts, which: {} as Record<string, Counts> },
    /** Why people stopped at the door — the one no this product records. */
    hesitated: {} as Counts,
    /**
     * Who began each questionnaire. Against `rungs` — which counts who finished
     * one — this is the completion rate, and both are whole-population counts
     * that stay numbers at founding scale. See docs/EXPERIMENTS.md.
     */
    began: {} as Counts,
    /** Who ever asked the guide. Whole-population, like `began`. */
    asked: {} as Counts,
    /**
     * Of the people who ever asked the guide, how many followed through on a
     * conversation — against everyone. The reading docs/EXPERIMENTS.md A3 could
     * not make before an ending; readable at twenty followed-through instead of
     * in years.
     */
    followedThroughBy: { asked: {} as Pair },
    /** The cross-tabs: each fact against whether the person went on to marry. */
    marriedBy: { through: {} as Pair, readThin: {} as Pair, open: {} as Pair, ended: {} as Pair },
    /** Of the people who stopped at the door for a reason, how many were later counted after all. */
    countedBy: { hesitated: {} as Pair },
  }
}

function tallyFacts(t: ReturnType<typeof emptyFactsTally>, f: Facts, married: boolean, counted: boolean, followedThrough: boolean) {
  const bump = (c: Counts, k: string) => void (c[k] = (c[k] ?? 0) + 1)
  const pair = (p: Pair, k: string, seen: string) => {
    const row = (p[k] ??= { [seen]: 0, married: 0 })
    row[seen] += 1
    if (married) row.married += 1
  }
  for (const id of f.began ?? []) bump(t.began, id)
  for (const id of f.asked ?? []) {
    bump(t.asked, id)
    const row = (t.followedThroughBy.asked[id] ??= { asked: 0, followedThrough: 0 })
    row.asked += 1
    if (followedThrough) row.followedThrough += 1
  }
  if (f.hesitated) {
    bump(t.hesitated, f.hesitated)
    const row = (t.countedBy.hesitated[f.hesitated] ??= { hesitated: 0, counted: 0 })
    row.hesitated += 1
    if (counted) row.counted += 1
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
  // Each ended courtship counts once in reason and stage; the person counts
  // once per reason in the cross-tab, so someone who ended two over the same
  // thing is one person who later did or did not marry.
  const reasons = new Set<string>()
  for (const e of f.ended ?? []) {
    bump(t.ended.reason, e.reason)
    bump(t.ended.stage, e.stage)
    if (e.which) bump((t.ended.which[e.reason] ??= {}), e.which)
    reasons.add(e.reason)
  }
  for (const r of reasons) pair(t.marriedBy.ended, r, 'ended')
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
      await failed('progress', 'tally failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // ── Forgetting an install ─────────────────────────────────────────────────
  // The record under this install code, gone. Because the readout is computed
  // from the records on every read, this is a true un-count: she leaves the
  // tally, not just the store. Possession of the code is the authority; the
  // code was made on her phone and never left it except in these reports.
  if (req.method === 'DELETE') {
    const id = normalise(new URL(req.url).searchParams.get('id'))
    if (!ID.test(id)) return Response.json({ error: 'bad_id' }, { status: 400 })
    // Bounded like keep.ts's forget, and for the same reason: possession of
    // the id is the authority, so an unmetered DELETE is a destruction
    // primitive over a 27-bit secret. It was the one public write with no cap
    // (docs/BOARD.md). A circuit breaker, far above any real hour.
    if (await overHourlyCap('progress-forget', DEFAULT_FORGET_CAP)) return rateLimited()
    try {
      const existing = await store.get(id, { type: 'json' })
      if (!existing) return Response.json({ error: 'not_found' }, { status: 404 })
      await store.delete(id)
      return Response.json({ forgotten: true })
    } catch (err) {
      await failed('progress', 'forget failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // ── Reporting a rung ──────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return Response.json({ error: 'GET, POST or DELETE only' }, { status: 405 })
  }

  // Its six siblings all guarded a truncated upload; this one did not
  // (docs/FAIL.md). All seven now read the same way — netlify/shared/body.ts.
  const body = await readJson<{ id?: unknown; rungs?: unknown; scene?: string; country?: string; via?: string; gender?: string; facts?: unknown }>(req, MAX_BODY)
  if (body instanceof Response) return body

  const id = normalise(body.id)
  if (!ID.test(id)) return Response.json({ error: 'bad_id' }, { status: 400 })
  if (!Array.isArray(body.rungs)) return Response.json({ error: 'bad_rungs' }, { status: 400 })

  const rungs = body.rungs.filter((r): r is string => typeof r === 'string' && RUNGS.has(r))
  if (rungs.length !== body.rungs.length) return Response.json({ error: 'bad_rungs' }, { status: 400 })
  if (body.scene !== undefined && !SCENES.has(body.scene)) {
    return Response.json({ error: 'bad_scene' }, { status: 400 })
  }
  if (body.country !== undefined && !COUNTRIES.has(body.country)) {
    return Response.json({ error: 'bad_country' }, { status: 400 })
  }
  if (body.via !== undefined && !VIAS.has(body.via)) {
    return Response.json({ error: 'bad_via' }, { status: 400 })
  }
  if (body.gender !== undefined && !GENDERS.has(body.gender)) {
    return Response.json({ error: 'bad_gender' }, { status: 400 })
  }
  const facts = body.facts === undefined ? undefined : parseFacts(body.facts)
  if (facts === null) return Response.json({ error: 'bad_facts' }, { status: 400 })

  // Bounded, like every public write — after validation, before any read.
  if (await overHourlyCap('progress', DEFAULT_HOURLY_CAP)) return rateLimited()

  const now = Date.now()
  // The day, never the moment — see netlify/shared/day.ts.
  const at = day(now)
  try {
    // Written at the version it was read, three tries, like every
    // read-modify-write here. A bare write lost a rung whenever two tabs
    // reported at once — and this record only ever adds (docs/INTEGRITY.md).
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const held = (await store.getWithMetadata(id, { type: 'json' })) as { data: ProgressRecord; etag?: string } | null
      const existing = held?.data ?? null
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
        ...(body.country ? { country: body.country } : existing?.country ? { country: existing.country } : {}),
        ...(via ? { via } : {}),
        ...(body.gender ? { gender: body.gender } : existing?.gender ? { gender: existing.gender } : {}),
        ...(merged && Object.keys(merged).length ? { facts: merged } : {}),
        expiresAt: day(now + TTL_MS),
      }
      const written = held
        ? await store.setJSON(id, stamp(record), { onlyIfMatch: held.etag })
        : await store.setJSON(id, stamp(record), { onlyIfNew: true })
      if (written.modified) return Response.json({ ok: true })
    }
    return Response.json({ error: 'conflict' }, { status: 409 })
  } catch (err) {
    // The app never depended on this and must never start. Failing to count
    // someone is a measurement problem, not her problem.
    await failed('progress', 'write failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
