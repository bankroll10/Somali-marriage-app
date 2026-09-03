import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The number on the door has one job: to be true. These drive the function
 * against an in-memory stand-in for Netlify Blobs and check that it counts
 * only kept maps, never counts a person twice, and never writes a key it
 * cannot later tally.
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
    get: async (key: string) => m.get(key) ?? null,
    getMetadata: async (key: string) => (m.has(key) ? { etag: 'x', metadata: {} } : null),
    set: async (key: string, value: string) => void m.set(key, value),
    setJSON: async (key: string, value: unknown) => void m.set(key, JSON.stringify(value)),
    delete: async (key: string) => void m.delete(key),
  }
}
vi.mock('@netlify/blobs', () => ({ getStore: (name: string) => memStore(name) }))

const { default: handler, COHORT_TARGET } = await import('../netlify/functions/cohort')

const post = (body: unknown) =>
  handler(new Request('http://x/.netlify/functions/cohort', { method: 'POST', body: JSON.stringify(body) }))
const count = (scene: string) => handler(new Request(`http://x/.netlify/functions/cohort?scene=${scene}`))

beforeEach(() => {
  stores.clear()
  // Two kept maps exist — the precondition for being counted at all.
  memStore('maps').setJSON('ACDEFG', { snapshot: {} })
  memStore('maps').setJSON('HJKMNP', { snapshot: {} })
})

describe('the count', () => {
  it('starts at zero and says what the city opens at', async () => {
    const res = await count('twin-cities')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ scene: 'twin-cities', women: 0, men: 0, target: COHORT_TARGET })
  })

  it('goes up by one real person per join, on the right side', async () => {
    await post({ code: 'ACDEFG', scene: 'twin-cities', gender: 'woman', hook: 'serious', overall: 88 })
    const res = await post({ code: 'HJKMNP', scene: 'twin-cities', gender: 'man', hook: 'finding' })
    expect(await res.json()).toMatchObject({ code: 'HJKMNP', women: 1, men: 1 })
  })

  it('never counts a code that has no kept map behind it', async () => {
    const res = await post({ code: 'QRTWXY', scene: 'twin-cities', gender: 'woman' })
    expect(res.status).toBe(404)
    expect((await (await count('twin-cities')).json()).women).toBe(0)
  })

  it('never counts the same person twice, even after she moves city', async () => {
    await post({ code: 'ACDEFG', scene: 'twin-cities', gender: 'woman', hook: 'serious' })
    await post({ code: 'ACDEFG', scene: 'twin-cities', gender: 'woman', hook: 'trust' })
    await post({ code: 'ACDEFG', scene: 'toronto', gender: 'woman', hook: 'trust' })
    expect((await (await count('twin-cities')).json()).women).toBe(0)
    expect((await (await count('toronto')).json()).women).toBe(1)
  })

  it('refuses anything it could not later tally', async () => {
    expect((await post({ code: 'ACDEFG', scene: 'mars', gender: 'woman' })).status).toBe(400)
    expect((await post({ code: 'ACDEFG', scene: 'london', gender: 'other' })).status).toBe(400)
    expect((await post({ code: 'nope', scene: 'london', gender: 'woman' })).status).toBe(400)
    expect((await count('mars')).status).toBe(400)
  })

  it('keeps an unknown hardest part as "none" and keeps only real voices', async () => {
    await post({ code: 'ACDEFG', scene: 'london', gender: 'woman', hook: 'x', voices: ['auntie', 'nope', 3] })
    const stored = JSON.parse((await memStore('cohort').get('london/woman/none/ACDEFG')) as string)
    expect(stored.voices).toEqual(['auntie'])
  })
})

describe('the tally', () => {
  it('reads every scene, both sides and the hardest parts from keys alone', async () => {
    await post({ code: 'ACDEFG', scene: 'twin-cities', gender: 'woman', hook: 'serious' })
    await post({ code: 'HJKMNP', scene: 'twin-cities', gender: 'man', hook: 'serious' })
    const res = await handler(new Request('http://x/.netlify/functions/cohort'))
    const body = await res.json()
    expect(body.target).toBe(COHORT_TARGET)
    expect(body.scenes['twin-cities']).toEqual({ women: 1, men: 1, hooks: { serious: 2 } })
    expect(body.scenes.index).toBeUndefined()
  })
})
