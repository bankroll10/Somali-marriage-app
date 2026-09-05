import { getStore } from '@netlify/blobs'
import { isFounder, notFounder } from '../shared/founder'
import { TOPICS } from '../shared/vocab'

/**
 * The two-sided Before you say yes.
 *
 * She sends him the eleven. He answers with no account, no name, and no
 * knowledge of what she said. Then both of them see one thing: where they
 * match — and, most importantly, where one of them thinks a conversation has
 * happened and the other does not.
 *
 * The whole value depends on one guarantee: neither person ever sees the
 * other's sheet. That is why the joint view is computed here, why the response
 * type has no field that could carry a side, and why each side becomes
 * write-once the moment the other exists — otherwise either of them could flip
 * one answer, re-read the joint, and deduce the other's exact state.
 *
 * What each can still infer: from their own answer and the joint, whether the
 * other thinks a conversation happened. That is the point of the product, and
 * Trust says it plainly.
 *
 * One more thing is kept, and it is the first knowledge this product holds
 * that no single member could give it: how pairs come out. The moment he
 * answers, the pair's joint is added to a running count per topic — how many
 * pairs both agree on money, how many have both not raised qabiil, how many
 * have one side who thinks the second-wife conversation happened. The pair's
 * own record still expires in ninety days; what it taught does not. No code,
 * no side and no state of either person is in the tally — only the joint,
 * which is symmetric by construction.
 */

const STATES = new Set(['agree', 'differ', 'not-talked', 'unknown'])
const GENDERS = new Set(['woman', 'man'])
const ALPHABET = 'ACDEFGHJKMNPQRTWXY34789'
const CODE_LENGTH = 6
const CODE = /^[ACDEFGHJKMNPQRTWXY34789]{6}$/
const TTL_MS = 90 * 24 * 60 * 60 * 1000
const MAX_BODY = 8_000
/** The one key in the tallies store this function writes. */
const TALLY_KEY = 'joint'
/** Conditional writes lose a race now and then; three tries is plenty at any scale we will see. */
const TALLY_ATTEMPTS = 3

export type YesState = 'agree' | 'differ' | 'not-talked' | 'unknown'
export type Joint = 'both-agree' | 'both-not-talked' | 'one-thinks-talked' | 'differ-somewhere' | 'unknown-somewhere'
type Sides = Record<string, YesState>

interface CoupleRecord {
  creator: 'woman' | 'man'
  first: Sides
  second?: Sides
  createdAt: string
  expiresAt: string
  answeredAt?: string
}

/** How pairs come out, per topic. Counts of joints; nothing that names a pair. */
export interface JointTally {
  pairs: number
  topics: Record<string, Partial<Record<Joint, number>>>
}

/** What any caller may receive. There is no field here that could carry a side. */
type CoupleResponse =
  | { status: 'open'; answerFor: 'woman' | 'man' }
  | { status: 'joint'; joint: Record<string, Joint> }

/**
 * Symmetric by construction: every branch tests both arguments the same way,
 * so joint(a, b) === joint(b, a) and nothing about order leaks which side is which.
 */
export function joint(a: YesState, b: YesState): Joint {
  if (a === 'unknown' || b === 'unknown') return 'unknown-somewhere'
  if (a === 'agree' && b === 'agree') return 'both-agree'
  if (a === 'not-talked' && b === 'not-talked') return 'both-not-talked'
  const talked = (x: YesState) => x === 'agree' || x === 'differ'
  if (talked(a) !== talked(b)) return 'one-thinks-talked'
  return 'differ-somewhere'
}

function jointOf(first: Sides, second: Sides): Record<string, Joint> {
  const out: Record<string, Joint> = {}
  for (const id of TOPICS) out[id] = joint(first[id], second[id])
  return out
}

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

function validSides(x: unknown): x is Sides {
  if (!x || typeof x !== 'object') return false
  const keys = Object.keys(x as object)
  if (keys.length !== TOPICS.size) return false
  return keys.every((k) => TOPICS.has(k) && STATES.has((x as Record<string, unknown>)[k] as string))
}

/**
 * Add one pair to the tally. Read-modify-write under the blob's etag, retried a
 * few times, so two pairs answering in the same second cannot lose each other.
 * Never throws and never delays the answer: a lost increment under-counts,
 * which is the failure we can live with. The pair's own record is already
 * written by the time this runs.
 */
async function countPair(jointView: Record<string, Joint>): Promise<void> {
  const tallies = getStore({ name: 'tallies', consistency: 'strong' })
  try {
    for (let attempt = 0; attempt < TALLY_ATTEMPTS; attempt++) {
      const current = (await tallies.getWithMetadata(TALLY_KEY, { type: 'json' })) as
        | { data: JointTally; etag?: string }
        | null
      const next: JointTally = current?.data ?? { pairs: 0, topics: {} }
      next.pairs += 1
      for (const [topic, j] of Object.entries(jointView)) {
        const row = (next.topics[topic] ??= {})
        row[j] = (row[j] ?? 0) + 1
      }
      const result = current?.etag
        ? await tallies.setJSON(TALLY_KEY, next, { onlyIfMatch: current.etag })
        : await tallies.setJSON(TALLY_KEY, next, { onlyIfNew: true })
      if (result.modified) return
    }
    console.error('[niyyah] couple: tally lost a race three times; one pair uncounted')
  } catch (err) {
    console.error('[niyyah] couple: tally failed; the pair is saved, the count is one short', err)
  }
}

function view(record: CoupleRecord): CoupleResponse {
  if (!record.second) return { status: 'open', answerFor: record.creator === 'woman' ? 'man' : 'woman' }
  return { status: 'joint', joint: jointOf(record.first, record.second) }
}

export default async function handler(req: Request) {
  const store = getStore('couples')

  if (req.method === 'GET') {
    const params = new URL(req.url).searchParams
    // No code at all: the founder's readout of how pairs come out. The app
    // always sends a code, so a bad one below is still a bad code.
    if (!params.has('code')) {
      if (!isFounder(req)) return notFounder()
      try {
        const tally = (await getStore('tallies').get(TALLY_KEY, { type: 'json' })) as JointTally | null
        return Response.json(tally ?? { pairs: 0, topics: {} })
      } catch (err) {
        console.error('[niyyah] couple: tally read failed', err)
        return Response.json({ error: 'unavailable' }, { status: 503 })
      }
    }
    const code = (params.get('code') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
    try {
      const record = (await store.get(code, { type: 'json' })) as CoupleRecord | null
      if (!record) return Response.json({ error: 'not_found' }, { status: 404 })
      if (Date.parse(record.expiresAt) < Date.now()) {
        await store.delete(code)
        return Response.json({ error: 'expired' }, { status: 404 })
      }
      return Response.json(view(record))
    } catch (err) {
      console.error('[niyyah] couple: read failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  if (req.method !== 'POST') return Response.json({ error: 'GET or POST only' }, { status: 405 })

  let text: string
  try {
    text = await req.text()
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 })
  }
  if (text.length > MAX_BODY) return Response.json({ error: 'too_large' }, { status: 413 })
  let body: { side?: string; code?: string; gender?: string; states?: unknown }
  try {
    body = JSON.parse(text)
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 })
  }
  if (!validSides(body.states)) return Response.json({ error: 'bad_states' }, { status: 400 })

  const now = Date.now()

  // ── The person who started it ─────────────────────────────────────────────
  if (body.side === 'first') {
    if (!GENDERS.has(body.gender ?? '')) return Response.json({ error: 'bad_gender' }, { status: 400 })
    const code = body.code ? body.code.toUpperCase().replace(/[^A-Z0-9]/g, '') : newCode()
    if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
    try {
      const existing = (await store.get(code, { type: 'json' })) as CoupleRecord | null
      // Once the other side has answered, hers is frozen — re-posting would let
      // her flip one topic and read his exact state off the joint.
      if (existing?.second) return Response.json({ error: 'answered' }, { status: 409 })
      const record: CoupleRecord = {
        creator: body.gender as 'woman' | 'man',
        first: body.states,
        createdAt: existing?.createdAt ?? new Date(now).toISOString(),
        expiresAt: new Date(now + TTL_MS).toISOString(),
      }
      await store.setJSON(code, record)
      return Response.json({ code })
    } catch (err) {
      console.error('[niyyah] couple: create failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // ── The person who was sent the link ──────────────────────────────────────
  if (body.side === 'second') {
    const code = (body.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
    try {
      const record = (await store.get(code, { type: 'json' })) as CoupleRecord | null
      if (!record) return Response.json({ error: 'not_found' }, { status: 404 })
      if (Date.parse(record.expiresAt) < now) return Response.json({ error: 'expired' }, { status: 404 })
      // Once. A second answer would let him probe hers the same way.
      if (record.second) return Response.json({ error: 'answered' }, { status: 409 })
      const updated: CoupleRecord = { ...record, second: body.states, answeredAt: new Date(now).toISOString() }
      await store.setJSON(code, updated)
      // The pair is saved. Now, and only now, it is counted.
      await countPair(jointOf(updated.first, body.states))
      return Response.json(view(updated))
    } catch (err) {
      console.error('[niyyah] couple: answer failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  return Response.json({ error: 'bad_side' }, { status: 400 })
}
