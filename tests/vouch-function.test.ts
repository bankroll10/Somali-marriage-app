import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The vouch is verification by family. What matters structurally: it attaches
 * only to a kept map, it happens once, and the sentence and phone a family
 * member leaves never come back over any endpoint.
 */
const stores = new Map<string, Map<string, string>>()
function memStore(name: string) {
  const m = stores.get(name) ?? new Map<string, string>()
  stores.set(name, m)
  return {
    list: async ({ prefix = '' }: { prefix?: string } = {}) => ({
      blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key, etag: 'x' })),
      directories: [],
    }),
    get: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key) ?? null
      return v !== null && opts?.type === 'json' ? JSON.parse(v) : v
    },
    getMetadata: async (key: string) => (m.has(key) ? { etag: 'x', metadata: {} } : null),
    getWithMetadata: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key) ?? null
      if (v === null) return null
      return { data: opts?.type === 'json' ? JSON.parse(v) : v, etag: v, metadata: {} }
    },
    set: async (key: string, value: string) => void m.set(key, value),
    // Conditional writes behave like the real store's, so the hourly cap in
    // shared/limit.ts counts here the way it does in production.
    setJSON: async (key: string, value: unknown, opts?: { onlyIfMatch?: string; onlyIfNew?: boolean }) => {
      if (opts?.onlyIfNew && m.has(key)) return { modified: false }
      if (opts?.onlyIfMatch && opts.onlyIfMatch !== m.get(key)) return { modified: false }
      m.set(key, JSON.stringify(value))
      return { modified: true }
    },
    delete: async (key: string) => void m.delete(key),
  }
}
vi.mock('@netlify/blobs', () => ({ getStore: (arg: string | { name: string }) => memStore(typeof arg === 'string' ? arg : arg.name) }))
const { default: handler } = await import('../netlify/functions/vouch')

const post = (body: unknown) => handler(new Request('http://x/.netlify/functions/vouch', { method: 'POST', body: JSON.stringify(body) }))
const get = (code: string) => handler(new Request(`http://x/.netlify/functions/vouch?code=${code}`))
const good = { code: 'ACDEFG', relationship: 'brother', firstName: 'Ali', sentence: 'She is my sister and she means this.', phone: '+1 612 555 0100' }

beforeEach(() => {
  stores.clear()
  memStore('maps').setJSON('ACDEFG', { snapshot: {} })
})

afterEach(() => vi.unstubAllEnvs())

/** The founder's key, set for every test: a readout never answers without one (netlify/shared/founder.ts). */
const FOUNDER_KEY = 'test-founder-key'
const FOUNDER = { authorization: `Bearer ${FOUNDER_KEY}` }
beforeEach(() => vi.stubEnv('FOUNDER_KEY', FOUNDER_KEY))

describe('a family vouch', () => {
  it('attaches to a kept map and comes back as relationship and first name only', async () => {
    const res = await post(good)
    const text = await res.text()
    expect(res.status).toBe(200)
    expect(JSON.parse(text)).toEqual({ vouched: true, relationship: 'brother', firstName: 'Ali' })
    expect(text).not.toMatch(/sentence|phone|sister|612/)
    const read = await (await get('ACDEFG')).text()
    expect(JSON.parse(read)).toEqual({ vouched: true, relationship: 'brother', firstName: 'Ali' })
    expect(read).not.toMatch(/sentence|phone|sister|612/)
  })

  it('never vouches for a code with no kept map behind it', async () => {
    expect((await post({ ...good, code: 'HJKMNP' })).status).toBe(404)
    expect((await get('HJKMNP')).status).toBe(404)
  })

  it('happens once — a second vouch is refused, and says who already did', async () => {
    await post(good)
    const res = await post({ ...good, relationship: 'father', firstName: 'Cabdi' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.relationship).toBe('brother')
    expect(JSON.stringify(body)).not.toMatch(/sentence|phone/)
  })

  it('refuses what it cannot vouch with', async () => {
    expect((await post({ ...good, relationship: 'cousin-ish' })).status).toBe(400)
    expect((await post({ ...good, firstName: '' })).status).toBe(400)
    expect((await post({ ...good, sentence: '   ' })).status).toBe(400)
    expect((await post({ ...good, code: 'nope' })).status).toBe(400)
    expect((await get('nope')).status).toBe(400)
  })

  it('keeps the sentence and phone in the store, for the founder alone', async () => {
    await post(good)
    const stored = JSON.parse((await memStore('vouches').get('ACDEFG')) as string)
    expect(stored.sentence).toBe(good.sentence)
    expect(stored.phone).toBe(good.phone)
  })

  it('has no expiry of its own', async () => {
    await post(good)
    const stored = JSON.parse((await memStore('vouches').get('ACDEFG')) as string)
    expect(stored.expiresAt).toBeUndefined()
    expect(stored.at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('lives exactly as long as the map — gone when the map goes, back when it is kept again', async () => {
    await post(good)
    expect((await get('ACDEFG')).status).toBe(200)
    await memStore('maps').delete('ACDEFG')
    expect((await get('ACDEFG')).status).toBe(404)
    // The vouch itself was not thrown away with the map.
    expect(await memStore('vouches').get('ACDEFG')).toBeTruthy()
    await memStore('maps').setJSON('ACDEFG', { snapshot: {} })
    expect((await get('ACDEFG')).status).toBe(200)
  })

  it('an old record whose expiresAt has passed is still live while the map is', async () => {
    await memStore('vouches').setJSON('ACDEFG', {
      relationship: 'father',
      firstName: 'Cabdi',
      sentence: 'She is my daughter.',
      at: '2024-01-01T00:00:00.000Z',
      expiresAt: '2025-01-01T00:00:00.000Z',
    })
    const res = await get('ACDEFG')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ vouched: true, relationship: 'father', firstName: 'Cabdi' })
    // And a second vouch is refused however old the first is.
    expect((await post(good)).status).toBe(409)
  })

  it('refuses an oversized body before parsing it', async () => {
    const big = new Request('http://x/.netlify/functions/vouch', { method: 'POST', body: 'x'.repeat(5000) })
    expect((await handler(big)).status).toBe(413)
  })
})

describe('the token in the link', () => {
  const ask = async (code = 'ACDEFG') => (await post({ side: 'ask', code })).json()

  it('she asks, and gets a token that is not her code', async () => {
    const { token } = await ask()
    expect(token).toMatch(/^[ACDEFGHJKMNPQRTWXY34789]{8}$/)
    expect(token).not.toBe('ACDEFG')
    // Asking again sends the same link.
    expect((await ask()).token).toBe(token)
  })

  it('asking needs a kept map', async () => {
    expect((await post({ side: 'ask', code: 'HJKMNP' })).status).toBe(404)
  })

  it('a token opens no map: it is not a code, and no map lives under it', async () => {
    const { token } = await ask()
    expect(token.length).not.toBe(6)
    expect(await memStore('maps').get(token)).toBeNull()
    expect(await memStore('maps').get(`token/${token}`)).toBeNull()
  })

  it('a family member vouches with the token, and it lands under her code', async () => {
    const { token } = await ask()
    const res = await post({ ...good, code: token })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ vouched: true, relationship: 'brother', firstName: 'Ali' })
    expect(JSON.parse((await memStore('vouches').get('ACDEFG')) as string).firstName).toBe('Ali')
    // Both her screen (by code) and theirs (by token) see it.
    expect((await get('ACDEFG')).status).toBe(200)
    expect((await get(token)).status).toBe(200)
  })

  it('a token nobody minted is a bad code', async () => {
    expect((await get('ACDEFGHJ')).status).toBe(400)
    expect((await post({ ...good, code: 'ACDEFGHJ' })).status).toBe(400)
  })

  it('an older link still carrying the code still vouches', async () => {
    expect((await post(good)).status).toBe(200)
  })
})

/**
 * The readout is the missing half of the vouch: `asked/<code>` has been written
 * since the first day and nothing ever counted it. docs/EXPERIMENTS.md A2,
 * docs/BETS.md B1. What matters structurally is that it counts, that it is the
 * founder's, and that nothing a family member wrote can leave through it.
 */
describe('the founder’s readout', () => {
  const tally = (headers: Record<string, string> = FOUNDER) =>
    handler(new Request('http://x/.netlify/functions/vouch', { headers }))
  const ask = (code: string) => post({ side: 'ask', code })

  it('counts the asks, the vouches given, and the kept maps behind them', async () => {
    const empty = await (await tally()).json()
    expect(empty).toMatchObject({ maps: 1, asked: 0, given: 0 })

    await ask('ACDEFG')
    expect((await (await tally()).json()).asked).toBe(1)
    // Asking twice is one ask: the token is reused, so the key is too.
    await ask('ACDEFG')
    expect((await (await tally()).json()).asked).toBe(1)

    await post(good)
    const body = await (await tally()).json()
    expect(body).toMatchObject({ maps: 1, asked: 1, given: 1 })
  })

  it('counts an ask nobody answered — the whole point of counting it', async () => {
    memStore('maps').setJSON('HJKMNP', { snapshot: {} })
    await ask('ACDEFG')
    await ask('HJKMNP')
    await post(good)
    const body = await (await tally()).json()
    expect(body.asked).toBe(2)
    expect(body.given).toBe(1)
  })

  it('floors who in the family vouched, and never omits a relationship', async () => {
    const codes = ['ACDEFG', 'HJKMNP', 'QRTWXY', 'ACDEFH', 'ACDEFJ']
    for (const code of codes) {
      memStore('maps').setJSON(code, { snapshot: {} })
      await post({ ...good, code, relationship: 'brother' })
    }
    const body = await (await tally()).json()
    expect(body.given).toBe(5)
    expect(body.byRelationship.brother).toBe(5)
    // A relationship nobody used is a key at null, not a missing key.
    expect(body.byRelationship.father).toBeNull()
    expect('father' in body.byRelationship).toBe(true)
  })

  it('carries nothing a family member wrote — no sentence, no phone, no name, no code', async () => {
    await ask('ACDEFG')
    await post(good)
    const serialised = JSON.stringify(await (await tally()).json())
    for (const secret of [good.sentence, good.phone, good.firstName, 'ACDEFG']) {
      expect(serialised).not.toContain(secret)
    }
  })

  it('is the founder’s when a key is set, and a bad code is still a bad code', async () => {
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    expect((await tally({})).status).toBe(401)
    vi.stubEnv('FOUNDER_KEY', '')
    expect((await tally()).status).toBe(401)
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    expect((await tally({ authorization: 'Bearer wrong' })).status).toBe(401)
    expect((await tally({ authorization: 'Bearer open-sesame' })).status).toBe(200)
    // Asking about one code needs no key — it is hers, and her family's.
    expect((await get('XX')).status).toBe(400)
    expect((await get('ACDEFG')).status).toBe(404)
  })
})
