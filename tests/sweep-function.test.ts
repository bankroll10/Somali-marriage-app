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
    // The version is the value itself: enough for the sweep to see that a
    // map read as lapsed has not changed before it deletes it.
    getMetadata: async (key: string) => (m.has(key) ? { etag: m.get(key)!, metadata: {} } : null),
    getWithMetadata: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key) ?? null
      return v === null ? null : { data: opts?.type === 'json' ? JSON.parse(v) : v, etag: v, metadata: {} }
    },
    // Conditional options work here too: the real store returns { modified }
    // from `set` exactly as it does from `setJSON`, and vouch.ts now claims
    // `asked/<code>` with onlyIfNew so no token can outlive forget me.
    set: async (key: string, value: string, opts?: { onlyIfMatch?: string; onlyIfNew?: boolean }) => {
      if (opts?.onlyIfNew && m.has(key)) return { modified: false }
      if (opts?.onlyIfMatch && opts.onlyIfMatch !== m.get(key)) return { modified: false }
      m.set(key, value)
      return { modified: true }
    },
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
    expect((await res.json()).swept).toMatchObject({ entries: 2, maps: 2, contacts: 2 })

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
    expect((await again.json()).swept).toEqual({
      entries: 0,
      maps: 0,
      contacts: 0,
      vouches: 0,
      couples: 0,
      progress: 0,
      reconciled: 0,
      journals: 0,
      errors: 0,
    })
    expect([...stores.get('cohort')!.keys()].sort()).toEqual(['index/ACDEFG', 'us/twin-cities/woman/city/serious/ACDEFG'])
  })

  // docs/PRIVACY.md, R1–R3. This test used to be "touches nothing but door
  // entries, their contacts and lapsed maps" — which pinned the gap: a lapsed
  // map's vouch (a relative's name, sentence and phone) lived for ever, an
  // expired couple sheet stayed unless someone opened it, and a step count
  // past its year stayed unless the founder opened the readout.
  it('takes a vouch, its ask and its token once the map they were about is gone or lapsed — and leaves a live one', async () => {
    memStore('maps').setJSON('ACDEFG', { snapshot: {}, createdAt: 'd', expiresAt: LIVE })
    memStore('maps').setJSON('QRTWXY', { snapshot: {}, createdAt: 'd', expiresAt: LAPSED })
    for (const code of ['ACDEFG', 'HJKMNP', 'QRTWXY']) {
      memStore('vouches').setJSON(code, { relationship: 'father', firstName: 'Cabdi', sentence: 's', phone: '+1 555', at: 'd' })
      memStore('vouches').set(`asked/${code}`, `TOK${code}X`)
      memStore('vouches').set(`token/TOK${code}X`, code)
    }
    const res = await run()
    expect((await res.json()).swept.vouches).toBe(2)
    expect([...stores.get('vouches')!.keys()].sort()).toEqual(['ACDEFG', 'asked/ACDEFG', 'token/TOKACDEFGX'])
  })

  it('takes a couple sheet past its ninety days, and leaves one inside them', async () => {
    memStore('couples').setJSON('ACDEFG', { creator: 'woman', first: {}, createdAt: 'd', expiresAt: LIVE })
    memStore('couples').setJSON('HJKMNP', { creator: 'woman', first: {}, createdAt: 'd', expiresAt: LAPSED })
    const res = await run()
    expect((await res.json()).swept.couples).toBe(1)
    // The expired sheet is gone; what it leaves is its reporting window — a
    // date, and nothing about either of them (netlify/shared/sheet.ts).
    expect([...stores.get('couples')!.keys()].sort()).toEqual(['ACDEFG', 'gone/HJKMNP'])
    expect(Object.keys(JSON.parse(stores.get('couples')!.get('gone/HJKMNP')!))).toEqual(['expiresAt'])
  })

  it('takes a step count past its year — unless it reached married, which is kept by rule', async () => {
    memStore('progress').setJSON('ACDEFGHJ', { first: { arrived: 'd' }, expiresAt: LIVE })
    memStore('progress').setJSON('HJKMNPQR', { first: { arrived: 'd' }, expiresAt: LAPSED })
    memStore('progress').setJSON('QRTWXY34', { first: { arrived: 'd', married: 'd' }, expiresAt: LAPSED })
    const res = await run()
    expect((await res.json()).swept.progress).toBe(1)
    expect([...stores.get('progress')!.keys()].sort()).toEqual(['ACDEFGHJ', 'QRTWXY34'])
  })

  it('never touches a report, a tally or a limit', async () => {
    memStore('reports').set('HJKMNP-woman-ACDEFGHJKM', '{}')
    memStore('tallies').set('joint', '{}')
    await run()
    expect(stores.get('reports')!.size).toBe(1)
    expect(stores.get('tallies')!.size).toBe(1)
  })
})
