import { getStore } from '@netlify/blobs'
import { failed } from '../shared/ops'
import { goneKey, retire } from '../shared/sheet'
import { mintFree } from '../shared/integrity'
import { CODE, TOKEN_LENGTH, newCode, normalise } from '../shared/code'
import { sameSecret } from '../shared/secret'
import { isFounder, notFounder } from '../shared/founder'
import { GENDERS, TOPICS, YES_STATES as STATES } from '../shared/vocab'
import { day } from '../shared/day'
import { readJson } from '../shared/body'
import { stamp } from '../shared/record'
import { overHourlyCap, rateLimited } from '../shared/limit'

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

const TTL_MS = 90 * 24 * 60 * 60 * 1000
const MAX_BODY = 8_000
/** The one key in the tallies store this function writes. */
const TALLY_KEY = 'joint'
/** Conditional writes lose a race now and then; three tries is plenty at any scale we will see. */
const TALLY_ATTEMPTS = 3
/** Joints read back in one hour, from everyone — the read cap, per keep.ts. */
const DEFAULT_READ_CAP = 600
/**
 * Elevens started in one hour, from everyone. A circuit breaker — see
 * netlify/shared/limit.ts.
 */
const DEFAULT_HOURLY_CAP = 200
/**
 * Answers to a sent eleven in one hour, from everyone. This side used to be
 * uncapped on the reasoning that his answer is bounded by the links that
 * exist — but a guessed live code is also an answer, and one that freezes her
 * sheet for ever and pollutes the joint tally (docs/DECISIONS.md). Bounded like a
 * read, well above any real hour, so refusing it never costs the one thing
 * she asked him to do.
 */
const DEFAULT_ANSWER_CAP = 600

export type YesState = 'agree' | 'differ' | 'not-talked' | 'unknown'
export type Joint = 'both-agree' | 'both-not-talked' | 'one-thinks-talked' | 'differ-somewhere' | 'unknown-somewhere'
type Sides = Record<string, YesState>

interface CoupleRecord {
  creator: 'woman' | 'man'
  /**
   * The key the person who started it was handed, and the only thing that
   * lets her change her side before he answers (docs/SECURITY.md, O6). Never
   * in any response but the one that created it. Absent on sheets made before
   * 2026-09-23; those can no longer be changed, because nothing proves whose
   * they are.
   */
  owner?: string
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
  | { status: 'joint'; joint: Record<string, Joint>; answerFor: 'woman' | 'man' }

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
    await failed('couple', 'tally lost a race three times; one pair uncounted')
  } catch (err) {
    await failed('couple', 'tally failed; the pair is saved, the count is one short', err)
  }
}

function view(record: CoupleRecord): CoupleResponse {
  const answerFor = record.creator === 'woman' ? 'man' : 'woman'
  if (!record.second) return { status: 'open', answerFor }
  // Carried on the joint too, so a report from the answered-already screen is
  // filed as the side that answered — it said "man" for everyone.
  return { status: 'joint', joint: jointOf(record.first, record.second), answerFor }
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
        await failed('couple', 'tally read failed', err)
        return Response.json({ error: 'unavailable' }, { status: 503 })
      }
    }
    const code = normalise(params.get('code'))
    if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
    // Bounded: a couple code is six characters and reading one back returns
    // the joint. See the read cap in netlify/functions/keep.ts for why reads
    // needed one at all.
    if (await overHourlyCap('couple-read', DEFAULT_READ_CAP)) return rateLimited()
    // Never cached: where two people agree and differ is the pair's own
    // business, keyed by a secret (docs/SECURITY.md, T4).
    const headers = { 'Cache-Control': 'no-store' }
    try {
      const record = (await store.get(code, { type: 'json' })) as CoupleRecord | null
      if (!record) return Response.json({ error: 'not_found' }, { status: 404, headers })
      if (Date.parse(record.expiresAt) < Date.now()) {
        await retire(store, code, Date.parse(record.expiresAt))
        return Response.json({ error: 'expired' }, { status: 404, headers })
      }
      return Response.json(view(record), { headers })
    } catch (err) {
      await failed('couple', 'read failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  /**
   * Forget me, from either side of the sheet.
   *
   * Trust promises that forgetting deletes "the eleven you sent him", and
   * until the reality-sprint pass that was only true of a woman who had also
   * kept her map: the cascade in netlify/functions/keep.ts finds the couple
   * code inside her kept snapshot, and `createCouple` needs no map code at
   * all. So a woman who sent him the eleven, kept nothing, and tapped forget
   * me was told it was done while both sheets sat here for the rest of the
   * ninety days (docs/DECISIONS.md).
   *
   * Possession of the couple code is the authority, exactly as it is for
   * reading the joint — and both of them hold it, which is right: either one
   * asking to be forgotten should take the sheet with them.
   *
   * It deletes the sheet and nothing else. In particular it does not touch
   * `reports`: only the founder resolves a report
   * (netlify/functions/safety.ts). A man must never be able to erase a
   * safety report about himself by tapping forget me — nor stop one being
   * made: the sheet is retired, not erased, and a report can still be made
   * against it for ninety days (netlify/shared/sheet.ts).
   */
  if (req.method === 'DELETE') {
    const code = normalise(new URL(req.url).searchParams.get('code'))
    if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
    if (await overHourlyCap('couple-forget', DEFAULT_ANSWER_CAP)) return rateLimited()
    try {
      const record = (await store.get(code, { type: 'json' })) as CoupleRecord | null
      if (!record) return Response.json({ error: 'not_found' }, { status: 404 })
      // Gone, but a report about it can still be made for ninety days: the
      // person deleting it may be the person about to be reported
      // (netlify/shared/sheet.ts).
      await retire(store, code)
      // The joint tally is not touched and cannot be: it carries no code and
      // no side, so there is nothing in it to find (Trust says so).
      return Response.json({ ok: true })
    } catch (err) {
      await failed('couple', 'delete failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  if (req.method !== 'POST') return Response.json({ error: 'GET, POST or DELETE only' }, { status: 405 })

  const body = await readJson<{ side?: string; code?: unknown; key?: unknown; gender?: string; states?: unknown }>(req, MAX_BODY)
  if (body instanceof Response) return body
  if (!validSides(body.states)) return Response.json({ error: 'bad_states' }, { status: 400 })

  const now = Date.now()

  // ── The person who started it ─────────────────────────────────────────────
  if (body.side === 'first') {
    if (!GENDERS.has(body.gender ?? '')) return Response.json({ error: 'bad_gender' }, { status: 400 })
    const code = body.code ? normalise(body.code) : ''
    if (body.code && !CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
    // Bounded, like every public write — after validation, before any read.
    if (await overHourlyCap('couple', DEFAULT_HOURLY_CAP)) return rateLimited()
    try {
      // Hers again, under the code she already sent him.
      if (code) {
        const held = (await store.getWithMetadata(code, { type: 'json' })) as { data: CoupleRecord; etag?: string } | null
        // A code is minted, never chosen: a sheet nobody started is not
        // created on demand under whatever the body names.
        if (!held) return Response.json({ error: 'not_found' }, { status: 404 })
        const existing = held.data
        // Once the other side has answered, hers is frozen — re-posting would
        // let her flip one topic and read his exact state off the joint.
        if (existing.second) return Response.json({ error: 'answered' }, { status: 409 })
        // The sheet is hers by the key she was handed when she made it. It
        // used to be hers by the gender the request *said* — and the code is
        // six characters she texted him, so he could post as her with states
        // he chose, and the joint she read was his invention
        // (docs/SECURITY.md, O6). A sheet from before the key cannot be
        // changed at all: the gender check it used to fall back on was the
        // hole.
        const key = typeof body.key === 'string' ? body.key : ''
        const hers = !!existing.owner && sameSecret(key, existing.owner)
        if (!hers) return Response.json({ error: 'not_yours' }, { status: 409 })
        const record: CoupleRecord = {
          ...existing,
          first: body.states,
          createdAt: existing.createdAt ?? day(now),
          expiresAt: day(now + TTL_MS),
        }
        // Conditional on the sheet still being what was just read. The
        // unconditional write it replaces was a time-of-check bug with the
        // worst possible payload — if he answered in the window, this
        // destroyed his answer while the permanent tally had already counted
        // the pair.
        const written = held.etag
          ? await store.setJSON(code, stamp(record), { onlyIfMatch: held.etag })
          : await store.setJSON(code, stamp(record), { onlyIfNew: true })
        if (!written.modified) return Response.json({ error: 'answered' }, { status: 409 })
        return Response.json({ code })
      }
      // A new pair: minted with `onlyIfNew`, so two women drawing the same six
      // characters costs a retry rather than one of them answering into the
      // other's sheet — netlify/shared/code.ts. The key goes back once, here.
      const owner = newCode(TOKEN_LENGTH)
      const record: CoupleRecord = {
        creator: body.gender as 'woman' | 'man',
        owner,
        first: body.states,
        createdAt: day(now),
        expiresAt: day(now + TTL_MS),
      }
      // Never the code of a sheet that is gone: its reports, and the window to
      // make one, belong to the pair they are about (docs/PRIVACY.md).
      const minted = await mintFree(store, stamp(record), async (c) => !!(await store.getMetadata(goneKey(c))))
      if (!minted) {
        await failed('couple', 'every minted code collided')
        return Response.json({ error: 'unavailable' }, { status: 503 })
      }
      return Response.json({ code: minted, key: owner })
    } catch (err) {
      await failed('couple', 'create failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // ── The person who was sent the link ──────────────────────────────────────
  if (body.side === 'second') {
    const code = normalise(body.code)
    if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
    // Bounded after validation, before any read — like every other public write.
    if (await overHourlyCap('couple-answer', DEFAULT_ANSWER_CAP)) return rateLimited()
    try {
      const held = (await store.getWithMetadata(code, { type: 'json' })) as { data: CoupleRecord; etag?: string } | null
      const record = held?.data ?? null
      if (!record) return Response.json({ error: 'not_found' }, { status: 404 })
      if (Date.parse(record.expiresAt) < now) return Response.json({ error: 'expired' }, { status: 404 })
      // Once. A second answer would let him probe hers the same way.
      if (record.second) return Response.json({ error: 'answered' }, { status: 409 })
      const updated: CoupleRecord = { ...record, second: body.states, answeredAt: day(now) }
      // Stamped after the spread, so a sheet born at one version and answered
      // at another carries the version it was last written in. Conditional,
      // because the check above is not a lock: two taps landing together both
      // passed it, both wrote, and `countPair` ran twice — one pair counted
      // twice in a permanent tally that carries no code to reconcile against
      // (docs/DESIGN.md).
      const written = held?.etag
        ? await store.setJSON(code, stamp(updated), { onlyIfMatch: held.etag })
        : await store.setJSON(code, stamp(updated), { onlyIfNew: true })
      if (!written.modified) return Response.json({ error: 'answered' }, { status: 409 })
      // The pair is saved, once. Now, and only now, it is counted.
      await countPair(jointOf(updated.first, body.states))
      return Response.json(view(updated))
    } catch (err) {
      await failed('couple', 'answer failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  return Response.json({ error: 'bad_side' }, { status: 400 })
}
