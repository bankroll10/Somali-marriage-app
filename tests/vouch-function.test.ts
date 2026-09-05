import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The vouch is verification by family. What matters structurally: it attaches
 * only to a kept map, it happens once, and the sentence and phone a family
 * member leaves never come back over any endpoint.
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
const { default: handler } = await import('../netlify/functions/vouch')

const post = (body: unknown) => handler(new Request('http://x/.netlify/functions/vouch', { method: 'POST', body: JSON.stringify(body) }))
const get = (code: string) => handler(new Request(`http://x/.netlify/functions/vouch?code=${code}`))
const good = { code: 'ACDEFG', relationship: 'brother', firstName: 'Ali', sentence: 'She is my sister and she means this.', phone: '+1 612 555 0100' }

beforeEach(() => {
  stores.clear()
  memStore('maps').setJSON('ACDEFG', { snapshot: {} })
})

describe('a family vouch', () => {
  it('attaches to a kept map and comes back as relationship and first name only', async () => {
    const res = await post(good)
    const text = await res.text()
    expect(res.status).toBe(200)
    expect(JSON.parse(text)).toEqual({ vouched: true, relationship: 'brother', firstName: 'Ali' })
    expect(text).not.toMatch(/sentence|phone|sister|612/)
    const read = await (await get('ACDEFG')).text()
    expect(JSON.parse(read)).toEqual({ vouched: true, relationship: 'brother', firstName: 'Ali' })
    expect(read).not.toMatch(/sentence|phone|sister|612/)
  })

  it('never vouches for a code with no kept map behind it', async () => {
    expect((await post({ ...good, code: 'HJKMNP' })).status).toBe(404)
    expect((await get('HJKMNP')).status).toBe(404)
  })

  it('happens once — a second vouch is refused, and says who already did', async () => {
    await post(good)
    const res = await post({ ...good, relationship: 'father', firstName: 'Cabdi' })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.relationship).toBe('brother')
    expect(JSON.stringify(body)).not.toMatch(/sentence|phone/)
  })

  it('refuses what it cannot vouch with', async () => {
    expect((await post({ ...good, relationship: 'cousin-ish' })).status).toBe(400)
    expect((await post({ ...good, firstName: '' })).status).toBe(400)
    expect((await post({ ...good, sentence: '   ' })).status).toBe(400)
    expect((await post({ ...good, code: 'nope' })).status).toBe(400)
    expect((await get('nope')).status).toBe(400)
  })

  it('keeps the sentence and phone in the store, for the founder alone', async () => {
    await post(good)
    const stored = JSON.parse((await memStore('vouches').get('ACDEFG')) as string)
    expect(stored.sentence).toBe(good.sentence)
    expect(stored.phone).toBe(good.phone)
  })

  it('has no expiry of its own', async () => {
    await post(good)
    const stored = JSON.parse((await memStore('vouches').get('ACDEFG')) as string)
    expect(stored.expiresAt).toBeUndefined()
    expect(stored.at).toBeTruthy()
  })

  it('lives exactly as long as the map — gone when the map goes, back when it is kept again', async () => {
    await post(good)
    expect((await get('ACDEFG')).status).toBe(200)
    await memStore('maps').delete('ACDEFG')
    expect((await get('ACDEFG')).status).toBe(404)
    // The vouch itself was not thrown away with the map.
    expect(await memStore('vouches').get('ACDEFG')).toBeTruthy()
    await memStore('maps').setJSON('ACDEFG', { snapshot: {} })
    expect((await get('ACDEFG')).status).toBe(200)
  })

  it('an old record whose expiresAt has passed is still live while the map is', async () => {
    await memStore('vouches').setJSON('ACDEFG', {
      relationship: 'father',
      firstName: 'Cabdi',
      sentence: 'She is my daughter.',
      at: '2024-01-01T00:00:00.000Z',
      expiresAt: '2025-01-01T00:00:00.000Z',
    })
    const res = await get('ACDEFG')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ vouched: true, relationship: 'father', firstName: 'Cabdi' })
    // And a second vouch is refused however old the first is.
    expect((await post(good)).status).toBe(409)
  })

  it('refuses an oversized body before parsing it', async () => {
    const big = new Request('http://x/.netlify/functions/vouch', { method: 'POST', body: 'x'.repeat(5000) })
    expect((await handler(big)).status).toBe(413)
  })
})
