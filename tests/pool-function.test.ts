import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The shape of a pool has one job: to say whether forty and forty could
 * introduce anyone. These drive the function against an in-memory stand-in
 * for Netlify Blobs and check that it counts live maps against the door's,
 * that supply is who is actually looking, that a pair clears the age band and
 * both people's checkable non-negotiables, that every fine split is floored,
 * that a lapsed entry is swept and its contact kept, and that nothing about a
 * person leaves.
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
    set: async (key: string, value: string) => void m.set(key, value),
    setJSON: async (key: string, value: unknown) => void m.set(key, JSON.stringify(value)),
    delete: async (key: string) => void m.delete(key),
  }
}
vi.mock('@netlify/blobs', () => ({ getStore: (arg: string | { name: string }) => memStore(typeof arg === 'string' ? arg : arg.name) }))

const { default: handler, AGE_GAP } = await import('../netlify/functions/pool')

const get = (query: string, headers: Record<string, string> = FOUNDER) =>
  handler(new Request(`http://x/.netlify/functions/pool?${query}`, { headers }))
/** The founder's key, set for every test: a readout never answers without one (netlify/shared/founder.ts). */
const FOUNDER_KEY = 'test-founder-key'
const FOUNDER = { authorization: `Bearer ${FOUNDER_KEY}` }
beforeEach(() => vi.stubEnv('FOUNDER_KEY', FOUNDER_KEY))

const read = async (query: string) => (await get(query)).json()

const LIVE = '2099-01-01'
const L = 'ACDEFGHJKMNPQRTWXY'
/** Distinct six-character codes from the code alphabet. */
const code = (side: 'W' | 'M', i: number) => `${side}AAA${L[Math.floor(i / L.length)]}${L[i % L.length]}`

interface Person {
  code: string
  gender?: 'woman' | 'man'
  scene?: string
  country?: string
  reach?: string
  age?: number
  stage?: string
  practice?: string
  children?: string
  nn?: string[]
  /** Null: no map at all. */
  expiresAt?: string | null
}

function seed(p: Person): string {
  const country = p.country ?? 'us'
  const scene = p.scene ?? 'twin-cities'
  const gender = p.gender ?? 'woman'
  const reach = p.reach ?? 'city'
  const key = `${country}/${scene}/${gender}/${reach}/serious/${p.code}`
  memStore('cohort').setJSON(key, { at: '2026-09-01', ledger: ['map', 'kept'] })
  memStore('cohort').set(`index/${p.code}`, key)
  memStore('contacts').setJSON(p.code, { contact: 'her@example.com', scene, country, at: '2026-09-01' })
  if (p.expiresAt !== null) {
    memStore('maps').setJSON(p.code, {
      snapshot: {
        identity: { firstName: 'Hodan', age: p.age },
        stage: p.stage ?? 'preparing',
        answers: { practice: p.practice ?? 'consistent', children: p.children ?? 'want', dealbreakers: p.nn ?? ['honesty'] },
      },
      createdAt: '2026-09-01',
      expiresAt: p.expiresAt ?? LIVE,
    })
  }
  return key
}
const woman = (i: number, p: Omit<Person, 'code' | 'gender'> = {}) => seed({ code: code('W', i), gender: 'woman', age: 27, ...p })
const man = (i: number, p: Omit<Person, 'code' | 'gender'> = {}) => seed({ code: code('M', i), gender: 'man', age: 30, ...p })

beforeEach(() => stores.clear())
afterEach(() => vi.unstubAllEnvs())

describe('who may read it', () => {
  it('is the founder’s, and closed when no key is set — it deletes on read', async () => {
    vi.stubEnv('FOUNDER_KEY', 'k')
    expect((await get('scene=twin-cities', {})).status).toBe(401)
    expect((await get('scene=twin-cities', { Authorization: 'Bearer wrong' })).status).toBe(401)
    expect((await get('scene=twin-cities', { Authorization: 'Bearer k' })).status).toBe(200)
    vi.stubEnv('FOUNDER_KEY', '')
    expect((await get('scene=twin-cities')).status).toBe(401)
  })

  it('names a pool that can open — a city, or a country’s travellers — and nothing else', async () => {
    expect((await get('')).status).toBe(400)
    expect((await get('scene=nowhere')).status).toBe(400)
    expect((await get('scene=other&country=uk')).status).toBe(400)
    expect((await get('country=zz')).status).toBe(400)
    expect((await get('country=other')).status).toBe(400)
    expect((await get('scene=london')).status).toBe(200)
    expect((await get('country=uk')).status).toBe(200)
  })

  it('says what its pairs rest on', async () => {
    expect((await read('scene=twin-cities')).assumptions).toEqual({ ageGap: AGE_GAP })
  })
})

describe('the door against the maps', () => {
  it('counts the door from keys, live from maps, and sweeps an entry whose map is gone — keeping her contact', async () => {
    woman(1)
    const gone = woman(2, { expiresAt: null })
    man(1)
    const r = await read('scene=twin-cities')
    expect(r.door).toEqual({ women: 2, men: 1 })
    expect(r.live).toEqual({ women: 1, men: 1 })
    expect(r.swept).toEqual({ women: 1, men: 0 })
    expect(stores.get('cohort')!.has(gone)).toBe(false)
    expect(stores.get('cohort')!.has(`index/${code('W', 2)}`)).toBe(false)
    expect(stores.get('contacts')!.has(code('W', 2))).toBe(true)
    // The live member is untouched.
    expect(stores.get('cohort')!.size).toBe(4)
  })

  it('treats a map past its year as gone, and takes the blob with the entry — one expiry rule, both readers', async () => {
    woman(1)
    woman(2, { expiresAt: '2025-01-01' })
    const r = await read('scene=twin-cities')
    expect(r.live.women).toBe(1)
    expect(r.swept.women).toBe(1)
    expect(stores.get('maps')!.has(code('W', 2))).toBe(false)
    expect(stores.get('maps')!.has(code('W', 1))).toBe(true)
    // Read again: nothing left to sweep, the count holds.
    expect((await read('scene=twin-cities')).swept).toEqual({ women: 0, men: 0 })
  })

  it('supply is who is looking: live and preparing, as of the last keep', async () => {
    woman(1, { stage: 'preparing' })
    woman(2, { stage: 'talking' })
    woman(3, { stage: 'deciding' })
    woman(4, { stage: 'married' })
    man(1)
    const r = await read('scene=twin-cities')
    expect(r.live.women).toBe(4)
    expect(r.supply).toEqual({ women: 1, men: 1 })
    // The split is there to be read, floored like every split by a quasi-identifier.
    expect(Object.keys(r.stages.women).sort()).toEqual(['deciding', 'married', 'preparing', 'talking'])
    expect(r.stages.women.talking).toBeNull()
  })
})

describe('ages', () => {
  it('reads null under five in a band and the number at five; a member with no age is counted whole', async () => {
    for (let i = 1; i <= 4; i += 1) woman(i, { age: 26 })
    woman(9, { age: undefined })
    let r = await read('scene=twin-cities')
    expect(r.ages.women['25-29']).toBeNull()
    expect(r.unaged).toEqual({ women: 1, men: 0 })
    woman(5, { age: 29 })
    r = await read('scene=twin-cities')
    expect(r.ages.women['25-29']).toBe(5)
    expect(Object.keys(r.ages.men)).toEqual(['18-24', '25-29', '30-34', '35-39', '40+'])
  })
})

describe('a pair', () => {
  it('needs both people to have an age', async () => {
    woman(1, { age: 27 })
    man(1, { age: undefined })
    expect((await read('scene=twin-cities')).pairs).toEqual({ eligible: 0, of: 1 })
  })

  it('is within the band — he may be older by ten, younger by three', async () => {
    woman(1, { age: 28 })
    man(1, { age: 38 })
    man(2, { age: 39 })
    man(3, { age: 25 })
    man(4, { age: 24 })
    expect((await read('scene=twin-cities')).pairs).toEqual({ eligible: 2, of: 4 })
  })

  it('clears her checkable non-negotiables against him', async () => {
    woman(1, { nn: ['faith-nn'] })
    man(1, { practice: 'cultural' })
    man(2, { practice: 'devout' })
    expect((await read('scene=twin-cities')).pairs).toEqual({ eligible: 1, of: 2 })
  })

  it('clears his against her, too — the gate runs both ways', async () => {
    woman(1, { children: 'no', nn: ['honesty'] })
    man(1, { children: 'want', nn: ['kids-nn'] })
    man(2, { children: 'want', nn: ['honesty'] })
    expect((await read('scene=twin-cities')).pairs).toEqual({ eligible: 1, of: 2 })
  })

  it('counts only supply', async () => {
    woman(1, { stage: 'talking' })
    woman(2)
    man(1)
    expect((await read('scene=twin-cities')).pairs).toEqual({ eligible: 1, of: 1 })
  })
})

describe('inventory and the stranded', () => {
  it('is a floored histogram of eligible partners, and stranded is its zero bucket under both names', async () => {
    for (let i = 1; i <= 5; i += 1) woman(i, { nn: ['faith-nn'] })
    man(1, { practice: 'cultural' })
    const r = await read('scene=twin-cities')
    expect(r.pairs).toEqual({ eligible: 0, of: 5 })
    expect(r.inventory.women).toEqual({ '0': 5, '1-2': null, '3-5': null, '6+': null })
    expect(r.stranded).toEqual({ women: 5, men: null })
    expect(r.stranded.women).toBe(r.inventory.women['0'])
  })

  it('moves a woman out of stranded the moment one eligible man is counted', async () => {
    for (let i = 1; i <= 5; i += 1) woman(i)
    const before = await read('scene=twin-cities')
    expect(before.stranded.women).toBe(5)
    man(1)
    const after = await read('scene=twin-cities')
    expect(after.stranded.women).toBeNull()
    expect(after.inventory.women['1-2']).toBe(5)
  })
})

describe('what leaves', () => {
  it('is counts — no code, no contact, no name, no answer', async () => {
    woman(1)
    man(1)
    const text = await (await get('scene=twin-cities')).text()
    expect(text).not.toMatch(new RegExp(`${code('W', 1)}|${code('M', 1)}|example\\.com|Hodan|dealbreakers|honesty|consistent`))
  })
})

describe('the country pool', () => {
  it('is everyone in the country who would travel — including somewhere-else — and nobody who would not', async () => {
    woman(1, { scene: 'twin-cities', reach: 'city' })
    woman(2, { scene: 'twin-cities', reach: 'country' })
    woman(3, { scene: 'other', reach: 'country' })
    man(1, { scene: 'columbus', reach: 'anywhere' })
    man(2, { scene: 'columbus', reach: 'city' })
    woman(4, { scene: 'london', country: 'uk', reach: 'country' })
    const r = await read('country=us')
    expect(r.pool).toBe('country')
    expect(r.door).toEqual({ women: 2, men: 1 })
    // The city pool is everyone in the city, whatever their reach.
    expect((await read('scene=twin-cities')).door).toEqual({ women: 2, men: 0 })
  })
})
