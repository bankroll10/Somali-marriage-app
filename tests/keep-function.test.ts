import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The maps store holds what brings a person back, and nothing she said to the
 * guide. The client leaves those out; this checks the server refuses to hold
 * them even when an older client still sends them.
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

const { default: handler } = await import('../netlify/functions/keep')

const post = (body: unknown) =>
  handler(new Request('http://x/.netlify/functions/keep', { method: 'POST', body: JSON.stringify(body) }))
const get = (code: string) => handler(new Request(`http://x/.netlify/functions/keep?code=${code}`))
const forget = (code: string) => handler(new Request(`http://x/.netlify/functions/keep?code=${code}`, { method: 'DELETE' }))

beforeEach(() => stores.clear())

describe('keeping a map', () => {
  it('stores the snapshot under a code and hands it back', async () => {
    const res = await post({ snapshot: { identity: { firstName: 'Sagal' }, answers: {} }, code: 'ACDEFG' })
    expect(res.status).toBe(200)
    expect((await res.json()).code).toBe('ACDEFG')
    const back = await (await get('ACDEFG')).json()
    expect(back.snapshot.identity.firstName).toBe('Sagal')
  })

  it('drops guide threads an older client still sends', async () => {
    await post({
      snapshot: { identity: {}, coachThreads: { auntie: [{ id: '1', role: 'user', text: 'never stored' }] } },
      code: 'ACDEFG',
    })
    const stored = stores.get('maps')!.get('ACDEFG')!
    expect(stored).not.toContain('coachThreads')
    expect(stored).not.toContain('never stored')
  })

  it('drops the contact and the guide’s follow-ups an older client still sends', async () => {
    await post({
      snapshot: {
        identity: {},
        waitlist: { contact: 'sagal@example.com', scene: 'toronto', joinedAt: 'x' },
        followups: [
          { id: 'g1', source: 'guide', topic: 'what she asked', words: 'what it said' },
          { id: 'r1', source: 'read', topic: 'public' },
        ],
      },
      code: 'ACDEFG',
    })
    const stored = stores.get('maps')!.get('ACDEFG')!
    expect(stored).not.toContain('sagal@example.com')
    expect(stored).not.toContain('what she asked')
    expect(stored).not.toContain('what it said')
    const back = JSON.parse(stored).snapshot
    expect(back.waitlist).toEqual({ scene: 'toronto', joinedAt: 'x' })
    expect(back.followups).toEqual([{ id: 'r1', source: 'read', topic: 'public' }])
  })

  it('re-keeping keeps the day it was first kept', async () => {
    await post({ snapshot: { answers: {} }, code: 'ACDEFG' })
    const first = JSON.parse(stores.get('maps')!.get('ACDEFG')!).createdAt
    await new Promise((r) => setTimeout(r, 5))
    await post({ snapshot: { answers: { timeline: '1-2' } }, code: 'ACDEFG' })
    const again = JSON.parse(stores.get('maps')!.get('ACDEFG')!)
    expect(again.createdAt).toBe(first)
    expect(again.snapshot.answers.timeline).toBe('1-2')
  })

  it('an eight-character vouch token is not a code, and opens nothing', async () => {
    await post({ snapshot: { identity: { firstName: 'Sagal' } }, code: 'ACDEFG' })
    expect((await get('ACDEFGHJ')).status).toBe(400)
  })

  it('forgetting a code removes the map, the pair, the vouch and its token, and the door entry — and a second time is a quiet 404', async () => {
    // Everything one person can leave behind, seeded as the functions write it.
    await post({ snapshot: { identity: { firstName: 'Sagal' }, couple: { code: 'HJKMNP', at: 'x' } }, code: 'ACDEFG' })
    memStore('couples'); memStore('vouches'); memStore('cohort')
    stores.get('couples')!.set('HJKMNP', JSON.stringify({ creator: 'woman', first: {} }))
    stores.get('vouches')!.set('ACDEFG', JSON.stringify({ relationship: 'father', firstName: 'Cabdi', sentence: 's', at: 'd' }))
    stores.get('vouches')!.set('asked/ACDEFG', 'ACDEFGHJ')
    stores.get('vouches')!.set('token/ACDEFGHJ', 'ACDEFG')
    stores.get('cohort')!.set('index/ACDEFG', 'ca/toronto/woman/city/serious/ACDEFG')
    stores.get('cohort')!.set('ca/toronto/woman/city/serious/ACDEFG', JSON.stringify({ at: 'd', ledger: [] }))
    memStore('contacts')
    stores.get('contacts')!.set('ACDEFG', JSON.stringify({ contact: 'sagal@example.com', scene: 'toronto', country: 'ca', at: 'd' }))
    // Someone else's things, which must survive.
    stores.get('couples')!.set('QRTWXY', JSON.stringify({ creator: 'man', first: {} }))
    stores.get('cohort')!.set('ca/toronto/man/city/serious/QRTWXY', JSON.stringify({ at: 'd', ledger: [] }))
    stores.get('contacts')!.set('QRTWXY', JSON.stringify({ contact: 'other@example.com', scene: 'toronto', country: 'ca', at: 'd' }))

    const res = await forget('ACDEFG')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ forgotten: true })
    expect(stores.get('maps')!.has('ACDEFG')).toBe(false)
    expect(stores.get('couples')!.has('HJKMNP')).toBe(false)
    expect([...stores.get('vouches')!.keys()]).toEqual([])
    expect([...stores.get('cohort')!.keys()]).toEqual(['ca/toronto/man/city/serious/QRTWXY'])
    // The way to reach her goes with everything else — it used to need a person
    // to delete it by hand. See docs/OWNED.md.
    expect(stores.get('contacts')!.has('ACDEFG')).toBe(false)
    expect(stores.get('contacts')!.has('QRTWXY')).toBe(true)
    expect(stores.get('couples')!.has('QRTWXY')).toBe(true)
    // Nothing left to forget.
    expect((await forget('ACDEFG')).status).toBe(404)
    expect((await get('ACDEFG')).status).toBe(404)
  })

  it('forgetting needs a code the right shape', async () => {
    expect((await forget('nope')).status).toBe(400)
    expect((await forget('ACDEFGHJ')).status).toBe(400)
  })

  it('refuses a snapshot that is not an object, and a bad code', async () => {
    expect((await post({ snapshot: 'x' })).status).toBe(400)
    expect((await post({ snapshot: {}, code: 'nope' })).status).toBe(400)
    expect((await get('nope')).status).toBe(400)
    expect((await get('ACDEFG')).status).toBe(404)
  })
})
