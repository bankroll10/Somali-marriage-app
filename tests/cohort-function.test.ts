import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
    // Honour `{ type: 'json' }` the way the real store does — the tally reads
    // records back parsed, and a mock that hands over strings hides that.
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

const { default: handler, COHORT_TARGET } = await import('../netlify/functions/cohort')

const post = (body: unknown) =>
  handler(new Request('http://x/.netlify/functions/cohort', { method: 'POST', body: JSON.stringify(body) }))
const count = (scene: string) => handler(new Request(`http://x/.netlify/functions/cohort?scene=${scene}`))
const raw = (body: string) => handler(new Request('http://x/.netlify/functions/cohort', { method: 'POST', body }))
const tallyReq = (headers: Record<string, string> = {}) =>
  handler(new Request('http://x/.netlify/functions/cohort', { headers }))

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
    await post({ code: 'ACDEFG', scene: 'twin-cities', gender: 'woman', hook: 'serious' })
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

  it('records the day she joined, never the moment', async () => {
    await post({ code: 'ACDEFG', scene: 'toronto', gender: 'woman' })
    const key = [...stores.get('cohort')!.keys()].find((k) => k.endsWith('/ACDEFG'))!
    expect(JSON.parse(stores.get('cohort')!.get(key)!).at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('keeps what she has done here, and only ids it knows', async () => {
    await post({ code: 'ACDEFG', scene: 'london', gender: 'woman', hook: 'serious', ledger: ['map', 'read', 'nope', 7] })
    const stored = JSON.parse((await memStore('cohort').get('london/woman/serious/ACDEFG')) as string)
    expect(stored.ledger).toEqual(['map', 'read'])
  })

  it('tallies the ledger per city — how serious the people on the door are', async () => {
    await post({ code: 'ACDEFG', scene: 'twin-cities', gender: 'woman', hook: 'serious', ledger: ['map', 'read', 'beforeYes'] })
    await post({ code: 'HJKMNP', scene: 'twin-cities', gender: 'man', hook: 'finding', ledger: ['map'] })
    const body = await (await handler(new Request('http://x/.netlify/functions/cohort'))).json()
    expect(body.scenes['twin-cities'].ledger).toEqual({ map: 2, read: 1, beforeYes: 1 })
  })

  it('drops a readiness number an older client still sends', async () => {
    await post({ code: 'ACDEFG', scene: 'london', gender: 'woman', hook: 'serious', overall: 88 })
    const stored = (await memStore('cohort').get('london/woman/serious/ACDEFG')) as string
    expect(stored).not.toMatch(/overall/)
  })

  it('keeps an unknown hardest part as "none", and keeps nothing about how she used the app', async () => {
    await post({ code: 'ACDEFG', scene: 'london', gender: 'woman', hook: 'x', voices: ['auntie', 'nope', 3] })
    const stored = JSON.parse((await memStore('cohort').get('london/woman/none/ACDEFG')) as string)
    expect(stored.voices).toBeUndefined()
  })
})

describe('the tally', () => {
  it('reads every scene, both sides and the hardest parts from keys alone', async () => {
    await post({ code: 'ACDEFG', scene: 'twin-cities', gender: 'woman', hook: 'serious' })
    await post({ code: 'HJKMNP', scene: 'twin-cities', gender: 'man', hook: 'serious' })
    const res = await handler(new Request('http://x/.netlify/functions/cohort'))
    const body = await res.json()
    expect(body.target).toBe(COHORT_TARGET)
    expect(body.scenes['twin-cities']).toEqual({ women: 1, men: 1, hooks: { serious: 2 }, ledger: {} })
    expect(body.scenes.index).toBeUndefined()
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
    expect((await ok.json()).scenes.toronto.women).toBe(1)
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
