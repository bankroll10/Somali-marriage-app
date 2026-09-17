import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The weekly sweep: what the founder's `/pool?sweep=1` does, for every pool,
 * on a schedule — so the way to reach someone lives exactly as long as her
 * map whether or not anyone remembers (docs/RISKS.md R3).
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
    set: async (key: string, value: string) => void m.set(key, value),
    setJSON: async (key: string, value: unknown) => void m.set(key, JSON.stringify(value)),
    delete: async (key: string) => void m.delete(key),
  }
}
vi.mock('@netlify/blobs', () => ({ getStore: (arg: string | { name: string }) => memStore(typeof arg === 'string' ? arg : arg.name) }))

const { default: handler, config } = await import('../netlify/functions/sweep')
const run = () => handler(new Request('http://x/.netlify/functions/sweep', { method: 'POST', body: '{"next_run":"2026-09-27T00:00:00Z"}' }))

const LIVE = '2099-01-01'
const LAPSED = '2025-09-01'

/** A person on the door: entry, index, contact — and a map, unless `map` is null. */
function seed(code: string, gender: 'woman' | 'man', map: string | null) {
  const key = `us/twin-cities/${gender}/city/serious/${code}`
  memStore('cohort').setJSON(key, { at: '2026-09-01', ledger: ['map', 'kept'] })
  memStore('cohort').set(`index/${code}`, key)
  memStore('contacts').setJSON(code, { contact: 'x@example.com', scene: 'twin-cities', country: 'us', at: '2026-09-01' })
  if (map !== null) memStore('maps').setJSON(code, { snapshot: { identity: { gender } }, createdAt: '2026-09-01', expiresAt: map })
  return key
}

beforeEach(() => stores.clear())

describe('the weekly sweep', () => {
  it('runs on a schedule, weekly', () => {
    expect(config.schedule).toBe('@weekly')
  })

  it('takes a door entry whose map is gone or lapsed — with its index, its contact, and a lapsed map’s blob — and leaves the live', async () => {
    const live = seed('ACDEFG', 'woman', LIVE)
    const gone = seed('HJKMNP', 'man', null)
    const lapsed = seed('QRTWXY', 'woman', LAPSED)
    // A kept map with no door entry, past its year: the blob goes too.
    memStore('maps').setJSON('BCDFGH', { snapshot: {}, createdAt: '2025-01-01', expiresAt: LAPSED })
    // And one that is live, which stays.
    memStore('maps').setJSON('JKMNPQ', { snapshot: {}, createdAt: '2026-01-01', expiresAt: LIVE })

    const res = await run()
    expect(res.status).toBe(200)
    expect((await res.json()).swept).toEqual({ entries: 2, maps: 2, contacts: 2 })

    const cohort = stores.get('cohort')!
    expect(cohort.has(live)).toBe(true)
    expect(cohort.has('index/ACDEFG')).toBe(true)
    expect(cohort.has(gone)).toBe(false)
    expect(cohort.has('index/HJKMNP')).toBe(false)
    expect(cohort.has(lapsed)).toBe(false)
    expect(cohort.has('index/QRTWXY')).toBe(false)

    const contacts = stores.get('contacts')!
    expect(contacts.has('ACDEFG')).toBe(true)
    expect(contacts.has('HJKMNP')).toBe(false)
    expect(contacts.has('QRTWXY')).toBe(false)

    const maps = stores.get('maps')!
    expect(maps.has('ACDEFG')).toBe(true)
    expect(maps.has('QRTWXY')).toBe(false)
    expect(maps.has('BCDFGH')).toBe(false)
    expect(maps.has('JKMNPQ')).toBe(true)
  })

  it('is idempotent — a second run finds nothing to take', async () => {
    seed('ACDEFG', 'woman', LIVE)
    seed('HJKMNP', 'man', null)
    await run()
    const again = await run()
    expect((await again.json()).swept).toEqual({ entries: 0, maps: 0, contacts: 0 })
    expect([...stores.get('cohort')!.keys()].sort()).toEqual(['index/ACDEFG', 'us/twin-cities/woman/city/serious/ACDEFG'])
  })

  it('touches nothing but door entries, their contacts and lapsed maps', async () => {
    seed('HJKMNP', 'man', null)
    memStore('couples').setJSON('HJKMNP', { creator: 'man', first: {} })
    memStore('vouches').set('HJKMNP', '{}')
    memStore('progress').set('anything', '{}')
    await run()
    expect(stores.get('couples')!.has('HJKMNP')).toBe(true)
    expect(stores.get('vouches')!.has('HJKMNP')).toBe(true)
    expect(stores.get('progress')!.has('anything')).toBe(true)
  })
})
