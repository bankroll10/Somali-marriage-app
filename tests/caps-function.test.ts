import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOPICS } from '../netlify/shared/vocab'

/**
 * Every public write is bounded.
 *
 * Each function has its own tests for what it accepts. This one checks the
 * rule that cuts across all of them: once a bucket's hour is spent, the next
 * write is refused with the same quiet 503 every client already treats as
 * "try later", nothing is written, and no other bucket is touched. A bad body
 * never spends the cap, and his answer to her eleven is never capped at all.
 * See netlify/shared/limit.ts and docs/SCALE.md.
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
    set: async (key: string, value: string) => void m.set(key, value),
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

const cohort = (await import('../netlify/functions/cohort')).default
const keep = (await import('../netlify/functions/keep')).default
const vouch = (await import('../netlify/functions/vouch')).default
const couple = (await import('../netlify/functions/couple')).default
const safety = (await import('../netlify/functions/safety')).default
const progress = (await import('../netlify/functions/progress')).default

type Handler = (req: Request) => Promise<Response>
const post = (handler: Handler, path: string, body: unknown) =>
  handler(new Request(`http://x/.netlify/functions/${path}`, { method: 'POST', body: JSON.stringify(body) }))

const sides = Object.fromEntries([...TOPICS].map((id) => [id, 'agree']))
/** Every member key in a store — the index entries the door writes beside them are not members. */
const members = (store: string) => [...(stores.get(store)?.keys() ?? [])].filter((k) => !k.startsWith('index/'))

beforeEach(() => {
  stores.clear()
  memStore('maps').setJSON('ACDEFG', { snapshot: {} })
  memStore('maps').setJSON('HJKMNP', { snapshot: {} })
  memStore('couples').setJSON('QRTWXY', { creator: 'woman', first: sides, createdAt: '2026-01-01', expiresAt: '2099-01-01' })
})
afterEach(() => vi.unstubAllEnvs())

const cases: { bucket: string; path: string; handler: Handler; store: string; first: unknown; second: unknown }[] = [
  {
    bucket: 'cohort',
    path: 'cohort',
    handler: cohort,
    store: 'cohort',
    first: { code: 'ACDEFG', scene: 'london', gender: 'woman' },
    second: { code: 'HJKMNP', scene: 'london', gender: 'man' },
  },
  {
    bucket: 'keep',
    path: 'keep',
    handler: keep,
    store: 'maps',
    first: { snapshot: { answers: {} }, code: 'ACDEFH' },
    second: { snapshot: { answers: {} }, code: 'ACDEFJ' },
  },
  {
    bucket: 'vouch',
    path: 'vouch',
    handler: vouch,
    store: 'vouches',
    first: { side: 'ask', code: 'ACDEFG' },
    second: { code: 'HJKMNP', relationship: 'brother', firstName: 'Ali', sentence: 'She means this.' },
  },
  {
    bucket: 'couple',
    path: 'couple',
    handler: couple,
    store: 'couples',
    first: { side: 'first', gender: 'woman', states: sides },
    second: { side: 'first', gender: 'woman', states: sides },
  },
  {
    bucket: 'safety',
    path: 'safety',
    handler: safety,
    store: 'reports',
    first: { code: 'QRTWXY', side: 'woman', reason: 'harassment' },
    second: { code: 'QRTWXY', side: 'man', reason: 'threats' },
  },
  {
    bucket: 'progress',
    path: 'progress',
    handler: progress,
    store: 'progress',
    first: { id: 'ACDEFG', rungs: ['arrived'] },
    second: { id: 'HJKMNP', rungs: ['arrived'] },
  },
]

describe('every public write is bounded', () => {
  for (const c of cases) {
    it(`${c.path}: at the cap, the next write is a quiet 503 and nothing is written`, async () => {
      vi.stubEnv(`${c.bucket.toUpperCase()}_HOURLY_CAP`, '1')
      expect((await post(c.handler, c.path, c.first)).status).toBe(200)
      const before = members(c.store)

      const res = await post(c.handler, c.path, c.second)
      expect(res.status).toBe(503)
      expect(await res.json()).toEqual({ error: 'rate_limited' })
      expect(members(c.store)).toEqual(before)

      // One live key per bucket, and it says how many were let through.
      const hours = [...stores.get('limits')!.keys()].filter((k) => k.startsWith(`${c.bucket}-`))
      expect(hours).toHaveLength(1)
      expect(JSON.parse(stores.get('limits')!.get(hours[0])!)).toBe(1)
    })
  }

  it('a bad body spends nothing', async () => {
    vi.stubEnv('COHORT_HOURLY_CAP', '1')
    expect((await post(cohort, 'cohort', { code: 'ACDEFG', scene: 'mars', gender: 'woman' })).status).toBe(400)
    expect((await post(cohort, 'cohort', { code: 'ACDEFG', scene: 'london', gender: 'woman' })).status).toBe(200)
  })

  it('his answer to her eleven is never capped — only starting one is', async () => {
    vi.stubEnv('COUPLE_HOURLY_CAP', '1')
    const { code } = await (await post(couple, 'couple', { side: 'first', gender: 'woman', states: sides })).json()
    expect((await post(couple, 'couple', { side: 'first', gender: 'woman', states: sides })).status).toBe(503)
    const answered = await post(couple, 'couple', { side: 'second', code, states: sides })
    expect(answered.status).toBe(200)
    expect((await answered.json()).status).toBe('joint')
  })

  it('each bucket is its own — spending one leaves the others open', async () => {
    vi.stubEnv('COHORT_HOURLY_CAP', '1')
    expect((await post(cohort, 'cohort', { code: 'ACDEFG', scene: 'london', gender: 'woman' })).status).toBe(200)
    expect((await post(cohort, 'cohort', { code: 'HJKMNP', scene: 'london', gender: 'man' })).status).toBe(503)
    expect((await post(keep, 'keep', { snapshot: { answers: {} }, code: 'ACDEFH' })).status).toBe(200)
    expect((await post(progress, 'progress', { id: 'ACDEFG', rungs: ['arrived'] })).status).toBe(200)
  })

  it('unset, the defaults are generous enough that a real hour never meets them', async () => {
    for (let i = 0; i < 60; i++) {
      const id = `A${String(i).padStart(5, '3').replace(/[^ACDEFGHJKMNPQRTWXY34789]/g, '3')}`
      expect((await post(progress, 'progress', { id, rungs: ['arrived'] })).status).toBe(200)
    }
  })

  it('the counter carries no identity — nothing but a bucket, a period and a number', async () => {
    await post(cohort, 'cohort', { code: 'ACDEFG', scene: 'london', gender: 'woman' })
    const limits = stores.get('limits')!
    for (const [key, value] of limits) {
      // `h` for the hour, `d` for the day — the period is in the key so the two
      // listings stay disjoint and neither sweep can eat the other's counter.
      expect(key).toMatch(/^cohort-(h-\d{4}-\d{2}-\d{2}T\d{2}|d-\d{4}-\d{2}-\d{2})$/)
      expect(value).toMatch(/^\d+$/)
    }
  })
})

/**
 * Reads and deletes are bounded too.
 *
 * Every cap in this product used to be on a write, which was backwards: a
 * six-character code is the sole authenticator for a kept map, so an unmetered
 * GET is an enumeration surface over a 27-bit secret, and an unmetered DELETE
 * is a destruction primitive that cascades across five stores. See the read cap
 * in netlify/functions/keep.ts.
 */
describe('the read and delete paths are bounded', () => {
  it('restoring a map spends the restore bucket, not the keep bucket', async () => {
    vi.stubEnv('RESTORE_HOURLY_CAP', '1')
    const { default: keep } = await import('../netlify/functions/keep')
    const url = 'http://x/.netlify/functions/keep?code=ACDEFG'
    expect((await keep(new Request(url))).status).toBe(200)
    expect((await keep(new Request(url))).status).toBe(503)
    // Keeping is a different bucket and is untouched by the flood above.
    const kept = await keep(
      new Request('http://x/.netlify/functions/keep', { method: 'POST', body: JSON.stringify({ snapshot: { a: 1 } }) }),
    )
    expect(kept.status).toBe(200)
  })

  it('forgetting spends its own bucket — the one that deletes', async () => {
    vi.stubEnv('FORGET_HOURLY_CAP', '1')
    const { default: keep } = await import('../netlify/functions/keep')
    const url = 'http://x/.netlify/functions/keep?code=ACDEFG'
    expect((await keep(new Request(url, { method: 'DELETE' }))).status).toBe(200)
    expect((await keep(new Request(url, { method: 'DELETE' }))).status).toBe(503)
  })

  it('the public door count is bounded — it walks a whole prefix on every call', async () => {
    vi.stubEnv('DOOR_HOURLY_CAP', '1')
    const { default: cohort } = await import('../netlify/functions/cohort')
    const url = 'http://x/.netlify/functions/cohort?scene=toronto'
    expect((await cohort(new Request(url))).status).toBe(200)
    expect((await cohort(new Request(url))).status).toBe(503)
  })
})
