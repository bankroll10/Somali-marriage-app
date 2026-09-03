import { getStore } from '@netlify/blobs'

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
 */

const CODE = /^[ACDEFGHJKMNPQRTWXY34789]{6}$/
const RELATIONSHIPS = new Set(['father', 'brother', 'uncle', 'mother', 'aunt', 'other'])
const TTL_MS = 365 * 24 * 60 * 60 * 1000
const MAX_BODY = 4_000

interface VouchRecord {
  relationship: string
  firstName: string
  sentence: string
  phone?: string
  at: string
  expiresAt: string
}

/** The only shape any caller ever receives. No sentence, no phone. */
interface VouchPublic {
  vouched: true
  relationship: string
  firstName: string
}

const publicView = (r: VouchRecord): VouchPublic => ({ vouched: true, relationship: r.relationship, firstName: r.firstName })

const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.trim().slice(0, max) : '')

export default async function handler(req: Request) {
  const store = getStore('vouches')

  if (req.method === 'GET') {
    const code = (new URL(req.url).searchParams.get('code') ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
    try {
      const record = (await store.get(code, { type: 'json' })) as VouchRecord | null
      if (!record) return Response.json({ vouched: false }, { status: 404 })
      if (Date.parse(record.expiresAt) < Date.now()) {
        await store.delete(code)
        return Response.json({ vouched: false }, { status: 404 })
      }
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
  let body: { code?: string; relationship?: string; firstName?: string; sentence?: string; phone?: string }
  try {
    body = JSON.parse(text)
  } catch {
    return Response.json({ error: 'bad_json' }, { status: 400 })
  }

  const code = (body.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const relationship = clean(body.relationship, 20)
  const firstName = clean(body.firstName, 40)
  const sentence = clean(body.sentence, 280)
  const phone = clean(body.phone, 40)
  if (!CODE.test(code)) return Response.json({ error: 'bad_code' }, { status: 400 })
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
    const existing = (await store.get(code, { type: 'json' })) as VouchRecord | null
    if (existing && Date.parse(existing.expiresAt) >= Date.now()) {
      return Response.json({ error: 'vouched', ...publicView(existing) }, { status: 409 })
    }
    const now = Date.now()
    const record: VouchRecord = {
      relationship,
      firstName,
      sentence,
      ...(phone ? { phone } : {}),
      at: new Date(now).toISOString(),
      expiresAt: new Date(now + TTL_MS).toISOString(),
    }
    await store.setJSON(code, record)
    return Response.json(publicView(record))
  } catch (err) {
    console.error('[niyyah] vouch: write failed', err)
    return Response.json({ error: 'unavailable' }, { status: 503 })
  }
}
