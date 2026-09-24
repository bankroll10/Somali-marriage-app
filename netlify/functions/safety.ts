import { getStore } from '@netlify/blobs'
import { failed } from '../shared/ops'
import { reportable } from '../shared/sheet'
import { notFounder, requireFounder } from '../shared/founder'
import { GENDERS, SAFETY_OUTCOMES, SAFETY_REASONS } from '../shared/vocab'
import { day } from '../shared/day'
import { readJson } from '../shared/body'
import { stamp } from '../shared/record'
import { overHourlyCap, rateLimited } from '../shared/limit'
import { CODE, MINT_ATTEMPTS, TOKEN, TOKEN_LENGTH, newCode, normalise } from '../shared/code'

/**
 * The one report a member can make about a real, named person.
 *
 * docs/PRIVACY.md draws one line through everything this product collects:
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
 *  - Tier 4 per docs/PRIVACY.md: founder-read only. Never listed beside a
 *    tally, never a signal to `progress.ts` or `couple.ts`, never joined to
 *    the map or the install id.
 *
 * ─── Two things this got wrong, fixed — docs/SECURITY.md ───────────────────────
 *
 * **Reports are append-only now.** Each one used to be written to
 * `` `${code}-${side}` `` with a plain `setJSON`, and nothing here validates
 * that the caller *is* the side they claim — it cannot, because the couple
 * code is shared with the other person by design; she texts him the link. So
 * the reported man held the exact key needed to POST as her and overwrite her
 * report with a blank one. The everyday version needed no malice at all: she
 * reports him twice and the first report is destroyed, escalation and all.
 * Every report now has its own id and its own key. He can still add noise —
 * he holds the code — but noise sits beside the real report where the founder
 * sees both, instead of replacing it.
 *
 * **Resolving keeps the lesson.** It used to delete, so "resolved" and "never
 * happened" were the same byte: nothing proved a report had been acted on, and
 * no pattern across reports was ever visible — which made the harm taxonomy
 * `docs/RESEARCH.md` names as its own test permanently uncomputable. Resolving now
 * takes an outcome from a closed list, deletes the record, and leaves an
 * anonymous stub: the reason, the day, what was done. **No code, no side, no
 * details.** Her words are expunged exactly as LEARNING promises; the fact
 * that a report of this kind happened, and what came of it, survives.
 *
 * And unlike every other readout, this one **fails closed** with no founder
 * key set. See `requireFounder` in netlify/shared/founder.ts.
 *
 * **Two buckets, in this order** (docs/SECURITY.md, T2). The reporting cap used
 * to be spent before the pair was checked, so thirty POSTs an hour with made-
 * up codes — each one a 404 — spent the whole hour's cap, and every real
 * report after them was refused. The cheapest denial of service in the
 * product, aimed at the one channel for harm. Now any attempt spends the
 * probe bucket, the pair is checked, and only a report against a pair that
 * exists spends the reporting cap: burying real reports needs thirty live
 * couple codes an hour, not thirty strings.
 *
 * **Never withdrawn from outside** (docs/SECURITY.md, O1; docs/SECURITY.md,
 * coercion). Forget me once deleted every report under `${couple}-${side}-`,
 * read from a snapshot the caller had written — so the reported man could keep
 * a map that claimed to be her and erase her reports by forgetting it. Then a
 * receipt on her phone withdrew them, and whoever held the phone held that
 * too. Since 2026-09-24 there is no withdrawal at all: only the founder
 * resolves a report, and a member who wants one dropped writes to her. A
 * report outlives its sheet too (netlify/shared/sheet.ts).
 */

const MAX_BODY = 2_000
const MAX_DETAILS = 500
/**
 * Reports in one hour, from everyone — against pairs that exist. The queue is
 * read by a person, so a flood of them is the one way to bury a real one. A
 * circuit breaker — see netlify/shared/limit.ts.
 */
const DEFAULT_HOURLY_CAP = 30
/**
 * Attempts in one hour, real or not. The existence check is an oracle over a
 * six-character couple code, so it is metered at the same shape as every
 * other code-gated read (netlify/functions/keep.ts).
 */
const DEFAULT_PROBE_CAP = 600

interface Report {
  /** This report's own id — the last segment of its key. */
  id: string
  code: string
  /** Whose report this is — the side raising the concern, not the one it is about. */
  side: 'woman' | 'man'
  reason: string
  details?: string
  at: string
}

/**
 * One key per report, so nothing can overwrite anything. The id is a token's
 * length; reports filed before 2026-09-23 carry a six-character one, and the
 * founder resolves both.
 */
function keyFor(code: string, side: string, id: string): string {
  return `${code}-${side}-${id}`
}

/** What is left after the founder has acted: a fact, joined to nobody. */
interface Resolved {
  reason: string
  at: string
  resolvedAt: string
  outcome: string
}

export default async function handler(req: Request) {
  const store = getStore('reports')

  if (req.method === 'GET') {
    // The founder's queue. Oldest open first — the shape a person clearing a
    // backlog actually needs, not a dashboard to check daily.
    if (!requireFounder(req)) return notFounder()
    try {
      const { blobs } = await store.list()
      const reports: Report[] = []
      const byReason: Record<string, number> = {}
      const byOutcome: Record<string, number> = {}
      for (const { key } of blobs) {
        if (key.startsWith('resolved/')) {
          const stub = (await store.get(key, { type: 'json' })) as Resolved | null
          if (!stub) continue
          byReason[stub.reason] = (byReason[stub.reason] ?? 0) + 1
          byOutcome[stub.outcome] = (byOutcome[stub.outcome] ?? 0) + 1
          continue
        }
        const record = (await store.get(key, { type: 'json' })) as Report | null
        if (record) reports.push(record)
      }
      reports.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))
      // Open reports in full, oldest first — a person may be waiting. Resolved
      // ones only as counts, because what is left of them is a fact about a
      // kind of harm and not about anybody. Never cached: the most sensitive
      // body in the product, even behind the key.
      return Response.json({ reports, resolved: { byReason, byOutcome } }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (err) {
      await failed('safety', 'list failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  if (req.method === 'POST') {
    const body = await readJson<{ code?: unknown; side?: string; reason?: string; details?: unknown }>(req, MAX_BODY)
    if (body instanceof Response) return body

    const code = normalise(body.code)
    if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
    if (!GENDERS.has(body.side ?? '')) return Response.json({ error: 'bad_side' }, { status: 400 })
    if (!SAFETY_REASONS.has(body.reason ?? '')) return Response.json({ error: 'bad_reason' }, { status: 400 })
    const details = typeof body.details === 'string' ? body.details.trim().slice(0, MAX_DETAILS) : undefined

    // Every attempt is metered, after validation: the check below is an
    // oracle over a couple code.
    if (await overHourlyCap('safety-probe', DEFAULT_PROBE_CAP)) return rateLimited()

    // Real only if it names a pair that exists. This never reads the pair's
    // answers — a metadata check, so the two-sided eleven's own guarantee
    // (neither side's sheet is ever read back by anything but the joint) is
    // never touched by this function.
    try {
      // Or one that did, inside its window: the sheet is not hers to keep, and
      // the man she is reporting can delete it (netlify/shared/sheet.ts).
      if (!(await reportable(getStore('couples'), code))) return Response.json({ error: 'not_found' }, { status: 404 })
    } catch (err) {
      await failed('safety', 'couple lookup failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }

    // Only a report against a real pair spends the reporting cap — so strings
    // cannot bury the queue (see the header).
    if (await overHourlyCap('safety', DEFAULT_HOURLY_CAP)) return rateLimited()

    // Only onto an id nobody holds: a colliding id must never overwrite
    // another report — it is the one thing a person who was frightened sent
    // (docs/PRIVACY.md).
    let id = ''
    try {
      for (let attempt = 0; attempt < MINT_ATTEMPTS && !id; attempt++) {
        const candidate = newCode(TOKEN_LENGTH)
        const record: Report = { id: candidate, code, side: body.side as 'woman' | 'man', reason: body.reason!, ...(details ? { details } : {}), at: day() }
        if ((await store.setJSON(keyFor(code, body.side!, candidate), stamp(record), { onlyIfNew: true })).modified) id = candidate
      }
    } catch (err) {
      await failed('safety', 'write failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
    if (!id) return Response.json({ error: 'unavailable' }, { status: 503 })
    return Response.json({ received: true })
  }

  if (req.method === 'DELETE') {
    // Resolving a report expunges her words, per docs/PRIVACY.md, and keeps
    // what is left: the kind of harm, the day, and what was done about it —
    // joined to nobody. Deleting outright made "resolved" and "never happened"
    // the same byte. See docs/SECURITY.md.
    const params = new URL(req.url).searchParams
    const code = normalise(params.get('code'))
    const side = params.get('side') ?? ''
    const id = normalise(params.get('id'))

    if (!requireFounder(req)) return notFounder()
    const outcome = params.get('outcome') ?? ''
    // Reports filed before 2026-09-23 carry a six-character id; the founder
    // resolves both.
    if (!CODE.test(code) || !GENDERS.has(side) || !(CODE.test(id) || TOKEN.test(id)) || !SAFETY_OUTCOMES.has(outcome)) {
      return Response.json({ error: 'bad_request' }, { status: 400 })
    }
    try {
      const open = (await store.get(keyFor(code, side, id), { type: 'json' })) as Report | null
      if (!open) return Response.json({ error: 'not_found' }, { status: 404 })
      const stub: Resolved = { reason: open.reason, at: open.at, resolvedAt: day(), outcome }
      await store.setJSON(`resolved/${id}`, stamp(stub))
      await store.delete(keyFor(code, side, id))
    } catch (err) {
      await failed('safety', 'delete failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
    return Response.json({ resolved: true })
  }

  return Response.json({ error: 'GET, POST or DELETE only' }, { status: 405 })
}
