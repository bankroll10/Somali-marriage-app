import { getStore } from '@netlify/blobs'
import { isFounder, notFounder } from '../shared/founder'
import { GENDERS, SAFETY_REASONS } from '../shared/vocab'
import { day } from '../shared/day'
import { overHourlyCap, rateLimited } from '../shared/limit'
import { CODE } from '../shared/code'

/**
 * The one report a member can make about a real, named person.
 *
 * docs/LEARNING.md draws one line through everything this product collects:
 * no free text about anyone but yourself, ever — except here. Trust already
 * promises "players, liars and creeps removed, not warned," and a report is
 * inescapably about a specific person. This is the single carve-out, kept as
 * narrow as the promise requires and no wider:
 *
 *  - It can only be raised against whoever is on the other side of a real
 *    couple code — the same code from the two-sided eleven. There is no field
 *    for a name, a phone number, or a profile; the code is the only pointer
 *    to a person this function will accept, and it exists already.
 *  - The reason is a closed id, same as everywhere else in this product. The
 *    one open field is a short line of her own words, because "what
 *    happened" sometimes needs more than six categories can hold — but it
 *    goes nowhere but here.
 *  - Tier 4 per docs/LEARNING.md: founder-read only. Never listed beside a
 *    tally, never a signal to `progress.ts` or `couple.ts`, never joined to
 *    the map or the install id. Resolving one deletes it — a report is a live
 *    concern to act on, not a record to keep once it has been.
 */

const MAX_BODY = 2_000
const MAX_DETAILS = 500
/**
 * Reports in one hour, from everyone. The queue is read by a person, so a
 * flood of them is the one way to bury a real one. A circuit breaker — see
 * netlify/shared/limit.ts.
 */
const DEFAULT_HOURLY_CAP = 30

interface Report {
  code: string
  /** Whose report this is — the side raising the concern, not the one it is about. */
  side: 'woman' | 'man'
  reason: string
  details?: string
  at: string
}

function keyFor(code: string, side: string): string {
  return `${code}-${side}`
}

export default async function handler(req: Request) {
  const store = getStore('reports')

  if (req.method === 'GET') {
    // The founder's queue. Oldest open first — the shape a person clearing a
    // backlog actually needs, not a dashboard to check daily.
    if (!isFounder(req)) return notFounder()
    try {
      const { blobs } = await store.list()
      const reports: Report[] = []
      for (const { key } of blobs) {
        const record = (await store.get(key, { type: 'json' })) as Report | null
        if (record) reports.push(record)
      }
      reports.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
      return Response.json({ reports })
    } catch (err) {
      console.error('[niyyah] safety: list failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  if (req.method === 'POST') {
    let text: string
    try {
      text = await req.text()
    } catch {
      return Response.json({ error: 'bad_json' }, { status: 400 })
    }
    if (text.length > MAX_BODY) return Response.json({ error: 'too_large' }, { status: 413 })
    let body: { code?: string; side?: string; reason?: string; details?: unknown }
    try {
      body = JSON.parse(text)
    } catch {
      return Response.json({ error: 'bad_json' }, { status: 400 })
    }

    const code = (body.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
    if (!GENDERS.has(body.side ?? '')) return Response.json({ error: 'bad_side' }, { status: 400 })
    if (!SAFETY_REASONS.has(body.reason ?? '')) return Response.json({ error: 'bad_reason' }, { status: 400 })
    const details = typeof body.details === 'string' ? body.details.trim().slice(0, MAX_DETAILS) : undefined

    // Bounded, like every public write — after validation, before any read.
    if (await overHourlyCap('safety', DEFAULT_HOURLY_CAP)) return rateLimited()

    // Real only if it names a pair that exists. This never reads the pair's
    // answers — a metadata check, so the two-sided eleven's own guarantee
    // (neither side's sheet is ever read back by anything but the joint) is
    // never touched by this function.
    try {
      const exists = await getStore('couples').getMetadata(code)
      if (!exists) return Response.json({ error: 'not_found' }, { status: 404 })
    } catch (err) {
      console.error('[niyyah] safety: couple lookup failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }

    const record: Report = { code, side: body.side as 'woman' | 'man', reason: body.reason!, ...(details ? { details } : {}), at: day() }
    try {
      await store.setJSON(keyFor(code, body.side!), record)
    } catch (err) {
      console.error('[niyyah] safety: write failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
    return Response.json({ received: true })
  }

  if (req.method === 'DELETE') {
    // Resolving a report expunges it, per docs/LEARNING.md — nothing here is
    // kept once the founder has acted on it.
    if (!isFounder(req)) return notFounder()
    const params = new URL(req.url).searchParams
    const code = (params.get('code') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    const side = params.get('side') ?? ''
    if (!CODE.test(code) || !GENDERS.has(side)) return Response.json({ error: 'bad_request' }, { status: 400 })
    try {
      await store.delete(keyFor(code, side))
    } catch (err) {
      console.error('[niyyah] safety: delete failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
    return Response.json({ resolved: true })
  }

  return Response.json({ error: 'GET, POST or DELETE only' }, { status: 405 })
}
