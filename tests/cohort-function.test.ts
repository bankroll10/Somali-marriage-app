import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The number on the door has one job: to be true. These drive the function
 * against an in-memory stand-in for Netlify Blobs and check that it counts
 * only kept maps, never counts a person twice, counts a person toward her
 * country only if she said she would travel, treats somewhere-else as not a
 * city, and never writes a key it cannot later tally.
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
    // Honour `{ type: 'json' }` the way the real store does — the tally reads
    // records back parsed, and a mock that hands over strings hides that.
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

const { default: handler, COHORT_TARGET } = await import('../netlify/functions/cohort')

const post = (body: unknown) =>
  handler(new Request('http://x/.netlify/functions/cohort', { method: 'POST', body: JSON.stringify(body) }))
const count = (scene: string, country?: string) =>
  handler(new Request(`http://x/.netlify/functions/cohort?scene=${scene}${country ? `&country=${country}` : ''}`))
const raw = (body: string) => handler(new Request('http://x/.netlify/functions/cohort', { method: 'POST', body }))
const tallyReq = (headers: Record<string, string> = {}) =>
  handler(new Request('http://x/.netlify/functions/cohort', { headers }))
const keys = () => [...(stores.get('cohort')?.keys() ?? [])].filter((k) => !k.startsWith('index/')).sort()

beforeEach(() => {
  stores.clear()
  // Two kept maps exist — the precondition for being counted at all.
  memStore('maps').setJSON('ACDEFG', { snapshot: {} })
  memStore('maps').setJSON('HJKMNP', { snapshot: {} })
})

describe('the count', () => {
  it('starts at zero, in the city and across the country, and says what the pool opens at', async () => {
    const res = await count('twin-cities')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      scene: 'twin-cities',
      country: 'us',
      target: COHORT_TARGET,
      here: { women: 0, men: 0 },
      across: { women: 0, men: 0 },
    })
  })

  it('goes up by one real person per join, on the right side', async () => {
    await post({ code: 'ACDEFG', scene: 'twin-cities', gender: 'woman', hook: 'serious' })
    const res = await post({ code: 'HJKMNP', scene: 'twin-cities', gender: 'man', hook: 'finding' })
    expect(await res.json()).toMatchObject({ code: 'HJKMNP', here: { women: 1, men: 1 } })
  })

  it('derives the country from a city, and ignores one the client sends beside it', async () => {
    await post({ code: 'ACDEFG', scene: 'london', country: 'us', gender: 'woman', hook: 'serious' })
    expect(keys()).toEqual(['uk/london/woman/city/serious/ACDEFG'])
    expect((await (await count('london')).json()).country).toBe('uk')
  })

  it('asks a country only for somewhere-else, and refuses one it does not know', async () => {
    expect((await post({ code: 'ACDEFG', scene: 'other', gender: 'woman' })).status).toBe(400)
    expect((await post({ code: 'ACDEFG', scene: 'other', country: 'mars', gender: 'woman' })).status).toBe(400)
    expect((await count('other')).status).toBe(400)
    expect((await count('other', 'mars')).status).toBe(400)
    expect((await post({ code: 'ACDEFG', scene: 'other', country: 'uk', gender: 'woman' })).status).toBe(200)
    expect((await count('other', 'uk')).status).toBe(200)
  })

  it('counts a person toward her country only if she said she would travel', async () => {
    await post({ code: 'ACDEFG', scene: 'london', gender: 'woman', reach: 'city' })
    let body = await (await count('london')).json()
    expect(body.here).toEqual({ women: 1, men: 0 })
    expect(body.across).toEqual({ women: 0, men: 0 })

    await post({ code: 'HJKMNP', scene: 'london', gender: 'woman', reach: 'country' })
    body = await (await count('london')).json()
    expect(body.here).toEqual({ women: 2, men: 0 })
    expect(body.across).toEqual({ women: 1, men: 0 })
  })

  it('somewhere-else is not a city: no count of its own, and in the country only if she would travel', async () => {
    await post({ code: 'ACDEFG', scene: 'other', country: 'uk', gender: 'woman', reach: 'city' })
    let body = await (await count('other', 'uk')).json()
    expect(body.here).toBeNull()
    expect(body.across).toEqual({ women: 0, men: 0 })
    // She is counted — the founder sees her — but in no pool that can open.
    expect(keys()).toEqual(['uk/other/woman/city/none/ACDEFG'])

    await post({ code: 'HJKMNP', scene: 'other', country: 'uk', gender: 'man', reach: 'anywhere' })
    body = await (await count('other', 'uk')).json()
    expect(body.across).toEqual({ women: 0, men: 1 })
    // And London sees him too: the country pool is the same pool from every city in it.
    expect((await (await count('london')).json()).across).toEqual({ women: 0, men: 1 })
  })

  it('changing how far she would go replaces her entry, never doubles it', async () => {
    await post({ code: 'ACDEFG', scene: 'london', gender: 'woman', reach: 'city' })
    await post({ code: 'ACDEFG', scene: 'london', gender: 'woman', reach: 'country' })
    expect(keys()).toEqual(['uk/london/woman/country/none/ACDEFG'])
    expect((await (await count('london')).json()).here).toEqual({ women: 1, men: 0 })
  })

  it('refuses a reach off the list, and takes silence as her city', async () => {
    expect((await post({ code: 'ACDEFG', scene: 'london', gender: 'woman', reach: 'moon' })).status).toBe(400)
    await post({ code: 'ACDEFG', scene: 'london', gender: 'woman' })
    expect(keys()[0]).toContain('/city/')
  })

  it('never counts a code that has no kept map behind it', async () => {
    const res = await post({ code: 'QRTWXY', scene: 'twin-cities', gender: 'woman' })
    expect(res.status).toBe(404)
    expect((await (await count('twin-cities')).json()).here.women).toBe(0)
  })

  it('never counts the same person twice, even after she moves city or country', async () => {
    await post({ code: 'ACDEFG', scene: 'twin-cities', gender: 'woman', hook: 'serious' })
    await post({ code: 'ACDEFG', scene: 'twin-cities', gender: 'woman', hook: 'trust' })
    await post({ code: 'ACDEFG', scene: 'toronto', gender: 'woman', hook: 'trust' })
    expect((await (await count('twin-cities')).json()).here.women).toBe(0)
    expect((await (await count('toronto')).json()).here.women).toBe(1)
    expect(keys()).toHaveLength(1)
  })

  it('refuses anything it could not later tally', async () => {
    expect((await post({ code: 'ACDEFG', scene: 'mars', gender: 'woman' })).status).toBe(400)
    expect((await post({ code: 'ACDEFG', scene: 'london', gender: 'other' })).status).toBe(400)
    expect((await post({ code: 'nope', scene: 'london', gender: 'woman' })).status).toBe(400)
    expect((await count('mars')).status).toBe(400)
  })

  it('records the day she joined, never the moment', async () => {
    await post({ code: 'ACDEFG', scene: 'toronto', gender: 'woman' })
    const key = [...stores.get('cohort')!.keys()].find((k) => k.endsWith('/ACDEFG'))!
    expect(JSON.parse(stores.get('cohort')!.get(key)!).at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('keeps what she has done here, and only ids it knows', async () => {
    await post({ code: 'ACDEFG', scene: 'london', gender: 'woman', hook: 'serious', ledger: ['map', 'read', 'nope', 7] })
    const stored = JSON.parse((await memStore('cohort').get('uk/london/woman/city/serious/ACDEFG')) as string)
    expect(stored.ledger).toEqual(['map', 'read'])
  })

  it('tallies the ledger per city — how serious the people on the door are', async () => {
    await post({ code: 'ACDEFG', scene: 'twin-cities', gender: 'woman', hook: 'serious', ledger: ['map', 'read', 'beforeYes'] })
    await post({ code: 'HJKMNP', scene: 'twin-cities', gender: 'man', hook: 'finding', ledger: ['map'] })
    const body = await (await tallyReq()).json()
    // Two people is under the floor, so each ledger cell reads null — present, never a number.
    expect(body.countries.us.scenes['twin-cities'].ledger).toEqual({ map: null, read: null, beforeYes: null })
  })

  it('shows a city’s ledger once five have done a thing', async () => {
    const codes = ['ACDEFG', 'HJKMNP', 'QRTWXY', 'ACDEFH', 'ACDEFJ']
    for (const code of codes) {
      memStore('maps').setJSON(code, { snapshot: {} })
      await post({ code, scene: 'twin-cities', gender: 'woman', ledger: ['map'] })
    }
    const body = await (await tallyReq()).json()
    expect(body.countries.us.scenes['twin-cities'].ledger.map).toBe(5)
  })

  it('drops a readiness number an older client still sends', async () => {
    await post({ code: 'ACDEFG', scene: 'london', gender: 'woman', hook: 'serious', overall: 88 })
    const stored = (await memStore('cohort').get('uk/london/woman/city/serious/ACDEFG')) as string
    expect(stored).not.toMatch(/overall/)
  })

  it('keeps an unknown hardest part as "none", and keeps nothing about how she used the app', async () => {
    await post({ code: 'ACDEFG', scene: 'london', gender: 'woman', hook: 'x', voices: ['auntie', 'nope', 3] })
    const stored = JSON.parse((await memStore('cohort').get('uk/london/woman/city/none/ACDEFG')) as string)
    expect(stored.voices).toBeUndefined()
  })
})

describe('the tally', () => {
  it('leaves the door’s numbers numbers, and floors what a small city named as hardest and how far it would go', async () => {
    await post({ code: 'ACDEFG', scene: 'toronto', gender: 'woman', hook: 'family', reach: 'country', ledger: ['map'] })
    await post({ code: 'HJKMNP', scene: 'toronto', gender: 'man', hook: 'family' })
    const body = await (await tallyReq()).json()
    const toronto = body.countries.ca.scenes.toronto
    expect(toronto.women).toBe(1)
    expect(toronto.men).toBe(1)
    expect(toronto.hooks.family).toBeNull()
    expect(toronto.ledger.map).toBeNull()
    expect(toronto.reach).toEqual({ country: null, city: null })
    // The country's travellers are a door number too, and stay one.
    expect(body.countries.ca.across).toEqual({ women: 1, men: 0 })
  })

  it('reads every country, every city, both sides and the hardest parts from keys alone', async () => {
    await post({ code: 'ACDEFG', scene: 'twin-cities', gender: 'woman', hook: 'serious' })
    await post({ code: 'HJKMNP', scene: 'twin-cities', gender: 'man', hook: 'serious' })
    const body = await (await tallyReq()).json()
    expect(body.target).toBe(COHORT_TARGET)
    expect(body.countries.us.scenes['twin-cities']).toEqual({
      women: 1,
      men: 1,
      hooks: { serious: null },
      ledger: {},
      reach: { city: null },
    })
    expect(body.countries.index).toBeUndefined()
  })

  it('ignores a key from before countries existed, rather than miscounting it', async () => {
    // A four-segment key, as the function wrote them before this layout.
    memStore('cohort').set('index/QRTWXY', 'toronto/woman/serious/QRTWXY')
    memStore('cohort').setJSON('toronto/woman/serious/QRTWXY', { at: '2026-01-01', ledger: ['map'] })
    const body = await (await tallyReq()).json()
    expect(body.countries).toEqual({})
    expect((await (await count('toronto')).json()).here).toEqual({ women: 0, men: 0 })
  })
})

describe('the founder key', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('the door stays public; the full tally needs the key', async () => {
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    await post({ code: 'ACDEFG', scene: 'toronto', gender: 'woman' })
    expect((await count('toronto')).status).toBe(200)
    expect((await tallyReq()).status).toBe(401)
    expect((await tallyReq({ authorization: 'Bearer wrong' })).status).toBe(401)
    const ok = await tallyReq({ authorization: 'Bearer open-sesame' })
    expect(ok.status).toBe(200)
    expect((await ok.json()).countries.ca.scenes.toronto.women).toBe(1)
  })

  it('stays open when no key is configured', async () => {
    expect((await tallyReq()).status).toBe(200)
  })
})

describe('the body', () => {
  it('refuses an oversized body before parsing it', async () => {
    expect((await raw('x'.repeat(3000))).status).toBe(413)
  })

  it('refuses a body that is not json', async () => {
    expect((await raw('{not json')).status).toBe(400)
  })
})
