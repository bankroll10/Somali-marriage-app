import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The one place a member can name a real person. These tests check the
 * boundary as hard as the value inside it: a report can only be raised
 * against a couple code that actually exists, every closed field is really
 * closed, the founder's queue is age-sorted, and resolving one deletes it —
 * nothing here is a tally or a record that outlives being acted on.
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
    list: async () => ({ blobs: [...m.keys()].map((key) => ({ key })) }),
  }
}
vi.mock('@netlify/blobs', () => ({ getStore: (arg: string | { name: string }) => memStore(typeof arg === 'string' ? arg : arg.name) }))

const { default: handler } = await import('../netlify/functions/safety')

const CODE = 'ACDEFG'
const post = (body: unknown) => handler(new Request('http://x/.netlify/functions/safety', { method: 'POST', body: JSON.stringify(body) }))
const get = (headers: Record<string, string> = {}) => handler(new Request('http://x/.netlify/functions/safety', { headers }))
const del = (params: string, headers: Record<string, string> = {}) =>
  handler(new Request(`http://x/.netlify/functions/safety?${params}`, { method: 'DELETE', headers }))

function seedCouple(code: string) {
  stores.set('couples', new Map([[code, JSON.stringify({ creator: 'woman', first: {}, createdAt: '2026-01-01', expiresAt: '2099-01-01' })]]))
}

beforeEach(() => {
  stores.clear()
  seedCouple(CODE)
})
afterEach(() => vi.unstubAllEnvs())

describe('reporting a concern', () => {
  it('needs a couple code that actually exists', async () => {
    const res = await post({ code: 'HJKMNP', side: 'woman', reason: 'harassment' })
    expect(res.status).toBe(404)
  })

  it('refuses a code shaped wrong, a side off the list, and a reason off the list', async () => {
    expect((await post({ code: 'nope', side: 'woman', reason: 'harassment' })).status).toBe(400)
    expect((await post({ code: CODE, side: 'x', reason: 'harassment' })).status).toBe(400)
    expect((await post({ code: CODE, side: 'woman', reason: 'made-up' })).status).toBe(400)
  })

  it('accepts a real report, with details capped and optional', async () => {
    const res = await post({ code: CODE, side: 'woman', reason: 'threats', details: 'x'.repeat(900) })
    expect(res.status).toBe(200)
    expect((await res.json()).received).toBe(true)

    const stored = JSON.parse(stores.get('reports')!.get(`${CODE}-woman`)!)
    expect(stored.reason).toBe('threats')
    expect(stored.details.length).toBe(500)
    expect(stored.at).toMatch(/^\d{4}-\d{2}-\d{2}$/)

    const bare = await post({ code: CODE, side: 'man', reason: 'other' })
    expect(bare.status).toBe(200)
    expect(JSON.parse(stores.get('reports')!.get(`${CODE}-man`)!).details).toBeUndefined()
  })

  it('refuses an oversized body before parsing it', async () => {
    const big = new Request('http://x/.netlify/functions/safety', { method: 'POST', body: 'x'.repeat(3000) })
    expect((await handler(big)).status).toBe(413)
  })
})

describe('the founder\'s queue', () => {
  it('is closed until a key is set, then open only with it, and sorted oldest first', async () => {
    await post({ code: CODE, side: 'woman', reason: 'harassment' })
    seedCouple('HJKMNP')
    await post({ code: 'HJKMNP', side: 'man', reason: 'sexual' })

    // Give the two reports distinct days so the sort is meaningful.
    const reports = stores.get('reports')!
    const first = JSON.parse(reports.get(`${CODE}-woman`)!)
    first.at = '2026-01-01'
    reports.set(`${CODE}-woman`, JSON.stringify(first))
    const second = JSON.parse(reports.get('HJKMNP-man')!)
    second.at = '2026-06-01'
    reports.set('HJKMNP-man', JSON.stringify(second))

    expect((await get()).status).toBe(200)

    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    expect((await get()).status).toBe(401)
    expect((await get({ authorization: 'Bearer nope' })).status).toBe(401)

    const res = await get({ authorization: 'Bearer open-sesame' })
    const body = await res.json()
    expect(body.reports.map((r: { code: string }) => r.code)).toEqual([CODE, 'HJKMNP'])
  })
})

describe('resolving a report', () => {
  it('expunges it, and needs the founder key once one is set', async () => {
    await post({ code: CODE, side: 'woman', reason: 'harassment' })
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')

    expect((await del(`code=${CODE}&side=woman`)).status).toBe(401)
    const res = await del(`code=${CODE}&side=woman`, { authorization: 'Bearer open-sesame' })
    expect(res.status).toBe(200)
    expect(stores.get('reports')!.has(`${CODE}-woman`)).toBe(false)

    // Resolving something already gone is not an error.
    const again = await del(`code=${CODE}&side=woman`, { authorization: 'Bearer open-sesame' })
    expect(again.status).toBe(200)
  })
})
