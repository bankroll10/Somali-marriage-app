import { getStore } from '@netlify/blobs'
import { day } from '../shared/day'

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
 * A vouch has no clock of its own. It lives exactly as long as the map it was
 * given about: a father's word does not expire while his daughter is still
 * here, and it goes when her map goes. It used to carry a fixed year from the
 * day it was written while the map was refreshed on every keep — so the vouch
 * could lapse under a live map, which is the one thing a web of trust must not
 * do. Every vouch is a real family that trusted this with a name; the store is
 * the graph of them, and it should only ever grow.
 */

const ALPHABET = 'ACDEFGHJKMNPQRTWXY34789'
const CODE = /^[ACDEFGHJKMNPQRTWXY34789]{6}$/
/** Eight, never six: a token is not a code and cannot be mistaken for one. */
const TOKEN = /^[ACDEFGHJKMNPQRTWXY34789]{8}$/
const TOKEN_LENGTH = 8
const RELATIONSHIPS = new Set(['father', 'brother', 'uncle', 'mother', 'aunt', 'other'])
const MAX_BODY = 4_000

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
const normalise = (s: unknown) => (typeof s === 'string' ? s.toUpperCase().replace(/[^A-Z0-9]/g, '') : '')

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_LENGTH))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

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

export default async function handler(req: Request) {
  const store = getStore('vouches')

  if (req.method === 'GET') {
    let code: string | null
    try {
      code = await resolve(store, new URL(req.url).searchParams.get('code'))
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
      if (!map || !record) return Response.json({ vouched: false }, { status: 404 })
      return Response.json(publicView(record))
    } catch (err) {
      console.error('[niyyah] vouch: read failed', err)
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
  let body: { side?: string; code?: string; relationship?: string; firstName?: string; sentence?: string; phone?: string }
  try {
    body = JSON.parse(text)
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 })
  }

  // ── She asks: mint the token her link will carry ──────────────────────────
  if (body.side === 'ask') {
    const code = normalise(body.code)
    if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
    try {
      if (!(await getStore('maps').getMetadata(code))) return Response.json({ error: 'no_map' }, { status: 404 })
      // One token per map, reused: asking twice sends the same link, and
      // forgetting a map has one token to find.
      const existing = (await store.get(`asked/${code}`, { type: 'text' })) as string | null
      if (existing && TOKEN.test(existing)) return Response.json({ token: existing })
      const token = newToken()
      await store.set(`token/${token}`, code)
      await store.set(`asked/${code}`, token)
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
    await store.setJSON(code, record)
    return Response.json(publicView(record))
  } catch (err) {
    console.error('[niyyah] vouch: write failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
