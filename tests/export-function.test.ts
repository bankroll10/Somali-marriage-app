import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The backup exists because everything this product knows lives in one
 * vendor's storage with no copy anywhere. What matters structurally is what it
 * hands back — the learning record, whole — and what it refuses to: anyone's
 * answers, anyone's phone number, and any code that unlocks a map.
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

const { default: handler } = await import('../netlify/functions/export')

const get = (headers: Record<string, string> = {}) =>
  handler(new Request('http://x/.netlify/functions/export', { headers }))

/** One of everything a real site would hold, including what must not come back. */
function seed() {
  memStore('progress').setJSON('ACDEFG', {
    first: { arrived: '2026-09-01', read: '2026-09-03', married: '2026-09-30' },
    scene: 'toronto',
    via: 'words',
    facts: { read: { band: 'mixed', thin: 'public' }, ended: [{ stage: 'talking', reason: 'his-read', which: 'public' }] },
    expiresAt: '2027-09-01',
  })
  memStore('progress').setJSON('HJKMNP', { first: { arrived: '2026-09-02' }, expiresAt: '2027-09-02' })
  memStore('tallies').setJSON('joint', { pairs: 2, topics: { 'money-home': { 'both-agree': 2 } } })
  memStore('cohort').set('index/QRTWXY', 'toronto/woman/family/QRTWXY')
  memStore('cohort').setJSON('toronto/woman/family/QRTWXY', { at: '2026-09-01', ledger: ['map', 'read'] })
  memStore('cohort').setJSON('toronto/man/serious/ACDEFH', { at: '2026-09-02', ledger: ['map'] })
  // The three stores the backup must never touch.
  memStore('maps').setJSON('QRTWXY', { snapshot: { identity: { firstName: 'Sagal', age: 27 }, answers: { healing: 'fresh' } } })
  memStore('vouches').setJSON('QRTWXY', {
    relationship: 'father',
    firstName: 'Cabdi',
    sentence: 'She is my daughter and she means this.',
    phone: '+1 612 555 0100',
    at: '2026-09-01',
  })
  memStore('couples').setJSON('ACDEFJ', { creator: 'woman', first: { live: 'agree' }, second: { live: 'differ' } })
}

beforeEach(() => {
  stores.clear()
  seed()
})
afterEach(() => vi.unstubAllEnvs())

describe('the backup', () => {
  it('hands back every progress record whole — the part nobody could recreate', async () => {
    const body = await (await get()).json()
    expect(body.version).toBe(1)
    expect(Object.keys(body.progress).sort()).toEqual(['ACDEFG', 'HJKMNP'])
    expect(body.progress.ACDEFG.facts.ended).toEqual([{ stage: 'talking', reason: 'his-read', which: 'public' }])
    expect(body.progress.ACDEFG.first.married).toBe('2026-09-30')
    expect(body.joint).toEqual({ pairs: 2, topics: { 'money-home': { 'both-agree': 2 } } })
  })

  it('counts the door without carrying a single map code', async () => {
    const body = await (await get()).json()
    expect(body.door.toronto).toEqual({ women: 1, men: 1, hooks: { family: 1, serious: 1 }, ledger: { map: 2, read: 1 } })
    // The counts are true, not floored: a backup that quietly rounds is not a backup.
    expect(body.door.toronto.women).toBe(1)
    expect(JSON.stringify(body.door)).not.toContain('QRTWXY')
    expect(JSON.stringify(body.door)).not.toContain('ACDEFH')
  })

  it('refuses to carry anyone’s answers, name, phone or the code to a map', async () => {
    const raw = await (await get()).text()
    for (const secret of ['Sagal', 'Cabdi', 'my daughter', '612 555', 'healing', 'fresh', 'QRTWXY', 'ACDEFJ']) {
      expect(raw, `the backup must not contain ${secret}`).not.toContain(secret)
    }
    const body = JSON.parse(raw)
    expect(body.maps).toBeUndefined()
    expect(body.vouches).toBeUndefined()
    expect(body.couples).toBeUndefined()
    expect(body.cohort).toBeUndefined()
    // And it says so in the file, so a reader is never misled about what this is.
    expect(body.omitted.length).toBe(4)
    expect(body.omitted.join(' ')).toMatch(/maps|vouches|couples|cohort/)
  })

  it('is the founder’s, and downloads as a dated file', async () => {
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    expect((await get()).status).toBe(401)
    expect((await get({ authorization: 'Bearer wrong' })).status).toBe(401)
    const res = await get({ authorization: 'Bearer open-sesame' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="niyyah-backup-\d{4}-\d{2}-\d{2}\.json"$/)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('reads, and never writes', async () => {
    expect((await handler(new Request('http://x/.netlify/functions/export', { method: 'POST' }))).status).toBe(405)
    expect((await handler(new Request('http://x/.netlify/functions/export', { method: 'DELETE' }))).status).toBe(405)
  })

  it('is empty rather than broken on a site nobody has used yet', async () => {
    stores.clear()
    const body = await (await get()).json()
    expect(body.progress).toEqual({})
    expect(body.joint).toBeNull()
    expect(body.door).toEqual({})
  })
})
