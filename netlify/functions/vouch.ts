import { getStore } from '@netlify/blobs'
import { CODE, TOKEN, TOKEN_LENGTH, newCode, normalise } from '../shared/code'
import { day } from '../shared/day'
import { readJson } from '../shared/body'
import { stamp } from '../shared/record'
import { floor } from '../shared/floor'
import { isFounder, notFounder } from '../shared/founder'
import { overHourlyCap, rateLimited } from '../shared/limit'

/**
 * Family vouch — verification by the people whose names carry.
 *
 * A selfie proves a face exists. A wali or a mother who puts a name to a member
 * has staked something in a community where that costs, and that is the only
 * verification this product claims. She sends a family member a link; they
 * confirm two things on one screen with no account — that she is who she says,
 * and that she is seeking marriage.
 *
 * What comes back to any screen is the relationship and a first name. The
 * sentence they write and the number they may leave are for the founder alone
 * — read in the Blobs store, never on any endpoint. First vouch wins; a typo
 * cannot be corrected, and that is accepted over letting a vouch be rewritten.
 *
 * The link she sends carries a token, not her map code. The two used to be
 * the same string, which meant a father holding the vouch link could open
 * `?map=` with it and read his daughter's whole map. A token is eight
 * characters to a code's six, so the two can never be confused, resolves to
 * the code only here, and opens nothing else anywhere. Links minted before
 * this existed carry the code and still vouch; they never opened more than
 * they already had.
 *
 * The store is also the only place this product records an ask that was never
 * answered: `asked/<code>` is written when she asks, the vouch under `<code>`
 * when a relative answers. Both were written from the first day and neither
 * was ever counted — docs/EXPERIMENTS.md A2, docs/BETS.md B1. The readout at
 * the bottom of the GET branch counts them, and nothing else changed to make
 * that possible: no new field, no new screen, no new promise.
 *
 * A vouch has no clock of its own. It lives exactly as long as the map it was
 * given about: a father's word does not expire while his daughter is still
 * here, and it goes when her map goes. It used to carry a fixed year from the
 * day it was written while the map was refreshed on every keep — so the vouch
 * could lapse under a live map, which is the one thing a web of trust must not
 * do. Every vouch is a real family that trusted this with a name; the store is
 * the graph of them, and it should only ever grow.
 */

const RELATIONSHIPS = new Set(['father', 'brother', 'uncle', 'mother', 'aunt', 'other'])
const MAX_BODY = 4_000
/** Links minted and vouches given in one hour, from everyone. A circuit breaker — see netlify/shared/limit.ts. */
const DEFAULT_HOURLY_CAP = 100
/**
 * Vouches read by code or token in one hour, from everyone — the fifth read
 * bucket. docs/HARD.md row 3 capped four reads because a six-character code is
 * the sole authenticator for a map and an unmetered read is an enumeration
 * surface; this one was missed, and it was the cheapest of the five: a 404
 * against a 200 confirms a live map code as surely as `GET /keep` does, and
 * `GET /keep` then returns the whole map. Found by docs/THREAT.md, T1.
 */
const DEFAULT_READ_CAP = 600

interface VouchRecord {
  relationship: string
  firstName: string
  sentence: string
  phone?: string
  at: string
  /** Written by an older version. Ignored: the map decides. */
  expiresAt?: string
}

/** The only shape any caller ever receives. No sentence, no phone. */
interface VouchPublic {
  vouched: true
  relationship: string
  firstName: string
}

const publicView = (r: VouchRecord): VouchPublic => ({ vouched: true, relationship: r.relationship, firstName: r.firstName })

const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.trim().slice(0, max) : '')

/** A vouch token, from the one generator — netlify/shared/code.ts. */
const newToken = () => newCode(TOKEN_LENGTH)

type Store = ReturnType<typeof getStore>

/**
 * A token or a code, to the code. Her own screens send the code; the family
 * member's link sends the token; an older link sends the code. Anything else
 * is nothing.
 */
async function resolve(store: Store, raw: unknown): Promise<string | null> {
  const key = normalise(raw)
  if (CODE.test(key)) return key
  if (!TOKEN.test(key)) return null
  const code = (await store.get(`token/${key}`, { type: 'text' })) as string | null
  return code && CODE.test(code) ? code : null
}

/**
 * The founder's readout: four numbers, and no person in any of them.
 *
 * `asked` against `given` is the whole of docs/EXPERIMENTS.md A2 — of the women
 * who asked a relative to vouch, how many relatives answered — and `maps` is
 * the denominator its decision rule needs, so the rule reads in one call. The
 * sentence a family member wrote and the number they left are read here to be
 * counted and never leave: what returns is counts, and the relationship split
 * is floored (netlify/shared/floor.ts), because who in her family vouched is a
 * quasi-identifier like a city. The three totals are whole-population counts
 * and are not floored, per the same file's rule.
 *
 * O(n) in vouches and one list of maps, exactly like the ladder's readout in
 * netlify/functions/progress.ts — and it inherits that readout's trigger in
 * docs/SCALE.md: at the order of magnitude where listing a store stops being
 * free, both are replaced by a counter, together.
 */
async function tally(store: Store) {
  const { blobs } = await store.list()
  let asked = 0
  const codes: string[] = []
  for (const { key } of blobs) {
    if (key.startsWith('asked/')) asked++
    else if (CODE.test(key)) codes.push(key)
  }
  const records = (
    await Promise.all(codes.map((key) => store.get(key, { type: 'json' }) as Promise<VouchRecord | null>))
  ).filter((r): r is VouchRecord => !!r)

  // Every relationship is a key, including the ones at zero: a missing key is
  // itself a count of zero-to-four with the sign changed.
  const byRelationship: Record<string, number> = {}
  for (const rel of RELATIONSHIPS) byRelationship[rel] = 0
  for (const r of records) byRelationship[RELATIONSHIPS.has(r.relationship) ? r.relationship : 'other'] += 1

  const { blobs: maps } = await getStore('maps').list()
  return { maps: maps.length, asked, given: records.length, byRelationship: floor(byRelationship) }
}

export default async function handler(req: Request) {
  const store = getStore('vouches')

  if (req.method === 'GET') {
    const raw = new URL(req.url).searchParams.get('code')
    // No code at all is the founder asking about all of them — the same shape
    // as the door's tally in netlify/functions/cohort.ts. A code that is
    // present and malformed is still a bad code, so nothing existing moves.
    if (raw === null) {
      if (!isFounder(req)) return notFounder()
      try {
        return Response.json(await tally(store))
      } catch (err) {
        console.error('[niyyah] vouch: tally failed', err)
        return Response.json({ error: 'unavailable' }, { status: 503 })
      }
    }
    // Shape first, so a malformed code spends nothing — the same rule as
    // `GET /keep`. Then the cap, before `resolve`: the token lookup is itself
    // the oracle, so it must be metered too, not only the read behind it.
    const shaped = normalise(raw)
    if (!CODE.test(shaped) && !TOKEN.test(shaped)) return Response.json({ error: 'bad_code' }, { status: 400 })
    if (await overHourlyCap('vouch-read', DEFAULT_READ_CAP)) return rateLimited()
    let code: string | null
    try {
      code = await resolve(store, shaped)
    } catch (err) {
      console.error('[niyyah] vouch: token lookup failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
    if (!code) return Response.json({ error: 'bad_code' }, { status: 400 })
    try {
      // Live while the map is. The vouch is not deleted when the map is absent:
      // a map is re-kept under the same code, and the vouch must come back
      // with it rather than be lost to one lapsed year.
      const [map, record] = await Promise.all([
        getStore('maps').getMetadata(code),
        store.get(code, { type: 'json' }) as Promise<VouchRecord | null>,
      ])
      // Never cached: a family member's name, keyed by a secret.
      const headers = { 'Cache-Control': 'no-store' }
      if (!map || !record) return Response.json({ vouched: false }, { status: 404, headers })
      return Response.json(publicView(record), { headers })
    } catch (err) {
      console.error('[niyyah] vouch: read failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  if (req.method !== 'POST') return Response.json({ error: 'GET or POST only' }, { status: 405 })

  const body = await readJson<{ side?: string; code?: unknown; relationship?: unknown; firstName?: unknown; sentence?: unknown; phone?: unknown }>(req, MAX_BODY)
  if (body instanceof Response) return body

  // ── She asks: mint the token her link will carry ──────────────────────────
  if (body.side === 'ask') {
    const code = normalise(body.code)
    if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
    // Bounded, like every public write — after validation, before any read.
    if (await overHourlyCap('vouch', DEFAULT_HOURLY_CAP)) return rateLimited()
    try {
      if (!(await getStore('maps').getMetadata(code))) return Response.json({ error: 'no_map' }, { status: 404 })
      // One token per map, reused: asking twice sends the same link, and
      // forgetting a map has one token to find.
      const existing = (await store.get(`asked/${code}`, { type: 'text' })) as string | null
      if (existing && TOKEN.test(existing)) {
        // Confirm the pointer is really there. A half-written ask used to
        // leave `asked/` naming a token that resolved to nothing, and every
        // later ask handed back the same dead link.
        if (!(await store.getMetadata(`token/${existing}`))) await store.set(`token/${existing}`, code)
        return Response.json({ token: existing })
      }
      const token = newToken()
      // `asked/` first, and only if nothing claimed it: forget me finds the
      // token by reading this key (netlify/functions/keep.ts), so a token
      // written before it — or a second token from a simultaneous ask — is one
      // this store can never clean up. It survived forget me and still
      // resolved to her code, which is a promise on the Trust screen
      // (docs/FAIL.md).
      const claimed = await store.set(`asked/${code}`, token, { onlyIfNew: true })
      if (!claimed.modified) {
        const winner = (await store.get(`asked/${code}`, { type: 'text' })) as string | null
        if (winner && TOKEN.test(winner)) return Response.json({ token: winner })
        return Response.json({ error: 'unavailable' }, { status: 503 })
      }
      await store.set(`token/${token}`, code)
      return Response.json({ token })
    } catch (err) {
      console.error('[niyyah] vouch: ask failed', err)
      return Response.json({ error: 'unavailable' }, { status: 503 })
    }
  }

  // ── A family member vouches, with the token from the link ─────────────────
  let code: string | null
  try {
    code = await resolve(store, body.code)
  } catch (err) {
    console.error('[niyyah] vouch: token lookup failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
  if (!code) return Response.json({ error: 'bad_code' }, { status: 400 })
  const relationship = clean(body.relationship, 20)
  const firstName = clean(body.firstName, 40)
  const sentence = clean(body.sentence, 280)
  const phone = clean(body.phone, 40)
  if (!RELATIONSHIPS.has(relationship)) return Response.json({ error: 'bad_relationship' }, { status: 400 })
  if (!firstName) return Response.json({ error: 'missing_name' }, { status: 400 })
  if (!sentence) return Response.json({ error: 'missing_sentence' }, { status: 400 })

  // Bounded, like every public write — after validation, before any read.
  if (await overHourlyCap('vouch', DEFAULT_HOURLY_CAP)) return rateLimited()

  // A vouch attaches to a kept map. A code nobody has kept a map under is not a
  // person, and is not vouched for.
  try {
    if (!(await getStore('maps').getMetadata(code))) return Response.json({ error: 'no_map' }, { status: 404 })
  } catch (err) {
    console.error('[niyyah] vouch: map lookup failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }

  try {
    // First vouch wins, however old. The map behind it is live — checked above.
    const existing = (await store.get(code, { type: 'json' })) as VouchRecord | null
    if (existing) return Response.json({ error: 'vouched', ...publicView(existing) }, { status: 409 })
    const record: VouchRecord = {
      relationship,
      firstName,
      sentence,
      ...(phone ? { phone } : {}),
      at: day(),
    }
    // Conditional, because the read above is not a lock. Two relatives
    // submitting together both saw nothing and the second silently replaced
    // the first — against this file's own rule that a vouch is never
    // rewritten (docs/FAIL.md).
    const written = await store.setJSON(code, stamp(record), { onlyIfNew: true })
    if (!written.modified) {
      const winner = (await store.get(code, { type: 'json' })) as VouchRecord | null
      return winner
        ? Response.json({ error: 'vouched', ...publicView(winner) }, { status: 409 })
        : Response.json({ error: 'unavailable' }, { status: 503 })
    }
    return Response.json(publicView(record))
  } catch (err) {
    console.error('[niyyah] vouch: write failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
