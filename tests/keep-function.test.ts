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
    get: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key) ?? null
      return v !== null && opts?.type === 'json' ? JSON.parse(v) : v
    },
    getMetadata: async (key: string) => (m.has(key) ? { etag: 'x', metadata: {} } : null),
    setJSON: async (key: string, value: unknown) => void m.set(key, JSON.stringify(value)),
    delete: async (key: string) => void m.delete(key),
  }
}
vi.mock('@netlify/blobs', () => ({ getStore: (name: string) => memStore(name) }))

const { default: handler } = await import('../netlify/functions/keep')

const post = (body: unknown) =>
  handler(new Request('http://x/.netlify/functions/keep', { method: 'POST', body: JSON.stringify(body) }))
const get = (code: string) => handler(new Request(`http://x/.netlify/functions/keep?code=${code}`))

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

  it('refuses a snapshot that is not an object, and a bad code', async () => {
    expect((await post({ snapshot: 'x' })).status).toBe(400)
    expect((await post({ snapshot: {}, code: 'nope' })).status).toBe(400)
    expect((await get('nope')).status).toBe(400)
    expect((await get('ACDEFG')).status).toBe(404)
  })
})
