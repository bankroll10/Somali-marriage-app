import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The ladder store has two jobs: to accept nothing but rungs, and to never let
 * a rung already reached move or disappear. These drive the function against
 * an in-memory stand-in for Netlify Blobs.
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
vi.mock('@netlify/blobs', () => ({ getStore: (name: string) => memStore(name) }))

const { default: handler } = await import('../netlify/functions/progress')

const ID = 'ACDEFG'
const post = (body: unknown) =>
  handler(new Request('http://x/.netlify/functions/progress', { method: 'POST', body: JSON.stringify(body) }))
const raw = (body: string) =>
  handler(new Request('http://x/.netlify/functions/progress', { method: 'POST', body }))
const readout = () => handler(new Request('http://x/.netlify/functions/progress'))

beforeEach(() => stores.clear())

describe('reporting a rung', () => {
  it('accepts the ladder and records when each was first reached', async () => {
    const res = await post({ id: ID, rungs: ['arrived', 'situated'], scene: 'toronto' })
    expect(res.status).toBe(200)
    const stored = JSON.parse(stores.get('progress')!.get(ID)!)
    expect(Object.keys(stored.first).sort()).toEqual(['arrived', 'situated'])
    expect(stored.scene).toBe('toronto')
  })

  it('never moves a timestamp already written', async () => {
    await post({ id: ID, rungs: ['arrived'] })
    const first = JSON.parse(stores.get('progress')!.get(ID)!).first.arrived
    await new Promise((r) => setTimeout(r, 5))
    await post({ id: ID, rungs: ['arrived', 'mapped'] })
    const after = JSON.parse(stores.get('progress')!.get(ID)!)
    expect(after.first.arrived).toBe(first)
    expect(after.first.mapped).toBeTruthy()
  })

  it('a rung once reported can never be taken back', async () => {
    await post({ id: ID, rungs: ['arrived', 'read'] })
    await post({ id: ID, rungs: ['arrived'] })
    expect(JSON.parse(stores.get('progress')!.get(ID)!).first.read).toBeTruthy()
  })

  it('refuses anything that is not a rung on the ladder', async () => {
    for (const bad of ['sessions', 'minutes', 'messages', 'streak', 'swipes', 'READ']) {
      const res = await post({ id: ID, rungs: [bad] })
      expect(res.status, bad).toBe(400)
    }
    expect(stores.get('progress')?.size ?? 0).toBe(0)
  })

  it('refuses a bad id, a bad scene, a missing list and an oversized body', async () => {
    expect((await post({ id: 'nope', rungs: ['arrived'] })).status).toBe(400)
    expect((await post({ id: ID, rungs: ['arrived'], scene: 'mars' })).status).toBe(400)
    expect((await post({ id: ID })).status).toBe(400)
    expect((await raw('x'.repeat(3000))).status).toBe(413)
    expect((await raw('{not json')).status).toBe(400)
  })
})

describe('the readout', () => {
  it('counts people per rung, splits by city, and returns no individual', async () => {
    await post({ id: 'ACDEFG', rungs: ['arrived', 'situated', 'read'], scene: 'toronto' })
    await post({ id: 'HJKMNP', rungs: ['arrived', 'situated'], scene: 'toronto' })
    await post({ id: 'QRTWXY', rungs: ['arrived'], scene: 'london' })

    const body = await (await readout()).json()
    expect(body.rungs.arrived).toBe(3)
    expect(body.rungs.situated).toBe(2)
    expect(body.rungs.read).toBe(1)
    expect(body.scenes.toronto.situated).toBe(2)
    expect(body.scenes.london.arrived).toBe(1)

    // No install id ever leaves, so nothing here can be traced to a device.
    const serialised = JSON.stringify(body)
    for (const id of ['ACDEFG', 'HJKMNP', 'QRTWXY']) expect(serialised).not.toContain(id)
  })

  it('carries nothing a person wrote', async () => {
    await post({ id: ID, rungs: ['arrived', 'eleven', 'followed-through'], scene: 'london' })
    const serialised = JSON.stringify(await (await readout()).json())
    expect(serialised).not.toMatch(/"(agree|differ|not-talked|unknown)"/)
  })

  it('POST is the only way in, and only GET reads', async () => {
    const res = await handler(new Request('http://x/.netlify/functions/progress', { method: 'DELETE' }))
    expect(res.status).toBe(405)
  })
})
