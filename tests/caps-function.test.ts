import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOPICS } from '../netlify/shared/vocab'
import { memStore, stores } from './support/memory'

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

vi.mock('@netlify/blobs', async () => (await import('./support/memory')).memoryModule)

const keep = (await import('../netlify/functions/keep')).default
const couple = (await import('../netlify/functions/couple')).default
const safety = (await import('../netlify/functions/safety')).default
const progress = (await import('../netlify/functions/progress')).default

type Handler = (req: Request) => Promise<Response>
const post = (handler: Handler, path: string, body: unknown) =>
  handler(new Request(`http://x/.netlify/functions/${path}`, { method: 'POST', body: JSON.stringify(body) }))

const sides = Object.fromEntries([...TOPICS].map((id) => [id, 'agree']))
/** Every record key in a store. */
const members = (store: string) => [...(stores.get(store)?.keys() ?? [])]

beforeEach(() => {
  stores.clear()
  memStore('maps').setJSON('ACDEFG', { snapshot: {} })
  memStore('maps').setJSON('HJKMNP', { snapshot: {} })
  memStore('couples').setJSON('QRTWXY', { creator: 'woman', first: sides, createdAt: '2026-01-01', expiresAt: '2099-01-01' })
})
afterEach(() => vi.unstubAllEnvs())

const cases: { bucket: string; path: string; handler: Handler; store: string; first: unknown; second: unknown }[] = [
  {
    bucket: 'keep',
    path: 'keep',
    handler: keep,
    store: 'maps',
    // Re-keeps of the two seeded maps: a code the server did not mint is never
    // created on demand (netlify/functions/keep.ts).
    first: { snapshot: { answers: {} }, code: 'ACDEFG' },
    second: { snapshot: { answers: {} }, code: 'HJKMNP' },
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

      // One live key per bucket, and it says how many were let through. The
      // hour's own prefix, not the bare bucket: `safety-probe-h-…` is its own
      // bucket and must not be counted as `safety`'s.
      const hours = [...stores.get('limits')!.keys()].filter((k) => k.startsWith(`${c.bucket}-h-`))
      expect(hours).toHaveLength(1)
      expect(JSON.parse(stores.get('limits')!.get(hours[0])!)).toBe(1)
    })
  }

  it('a bad body spends nothing', async () => {
    vi.stubEnv('PROGRESS_HOURLY_CAP', '1')
    expect((await post(progress, 'progress', { id: 'ACDEFG', rungs: ['arrived'], scene: 'mars' })).status).toBe(400)
    expect((await post(progress, 'progress', { id: 'ACDEFG', rungs: ['arrived'], scene: 'london' })).status).toBe(200)
  })

  it('his answer to her eleven has its own bucket — starting one at the cap never refuses his answer', async () => {
    vi.stubEnv('COUPLE_HOURLY_CAP', '1')
    const { code } = await (await post(couple, 'couple', { side: 'first', gender: 'woman', states: sides })).json()
    expect((await post(couple, 'couple', { side: 'first', gender: 'woman', states: sides })).status).toBe(503)
    const answered = await post(couple, 'couple', { side: 'second', code, states: sides })
    expect(answered.status).toBe(200)
    expect((await answered.json()).status).toBe('joint')
  })

  it('his answer is bounded too — a guessed live code used to be an uncapped write that froze her sheet', async () => {
    vi.stubEnv('COUPLE_ANSWER_HOURLY_CAP', '1')
    const { code } = await (await post(couple, 'couple', { side: 'first', gender: 'woman', states: sides })).json()
    const { code: other } = await (await post(couple, 'couple', { side: 'first', gender: 'woman', states: sides })).json()
    expect((await post(couple, 'couple', { side: 'second', code, states: sides })).status).toBe(200)
    const refused = await post(couple, 'couple', { side: 'second', code: other, states: sides })
    expect(refused.status).toBe(503)
    expect(JSON.parse(stores.get('couples')!.get(other)!).second).toBeUndefined()
  })

  it('forgetting an install is bounded — it was the one public write with no cap', async () => {
    vi.stubEnv('PROGRESS_FORGET_HOURLY_CAP', '1')
    await post(progress, 'progress', { id: 'ACDEFG', rungs: ['arrived'] })
    await post(progress, 'progress', { id: 'HJKMNP', rungs: ['arrived'] })
    const del = (id: string) => progress(new Request(`http://x/.netlify/functions/progress?id=${id}`, { method: 'DELETE' }))
    expect((await del('ACDEFG')).status).toBe(200)
    expect((await del('HJKMNP')).status).toBe(503)
    expect(stores.get('progress')!.has('HJKMNP')).toBe(true)
  })

  it('each bucket is its own — spending one leaves the others open', async () => {
    vi.stubEnv('SAFETY_HOURLY_CAP', '1')
    expect((await post(safety, 'safety', { code: 'QRTWXY', side: 'woman', reason: 'harassment' })).status).toBe(200)
    expect((await post(safety, 'safety', { code: 'QRTWXY', side: 'man', reason: 'threats' })).status).toBe(503)
    expect((await post(keep, 'keep', { snapshot: { answers: {} }, code: 'ACDEFG' })).status).toBe(200)
    expect((await post(progress, 'progress', { id: 'ACDEFG', rungs: ['arrived'] })).status).toBe(200)
  })

  it('unset, the defaults are generous enough that a real hour never meets them', async () => {
    for (let i = 0; i < 60; i++) {
      const id = `A${String(i).padStart(5, '3').replace(/[^ACDEFGHJKMNPQRTWXY34789]/g, '3')}`
      expect((await post(progress, 'progress', { id, rungs: ['arrived'] })).status).toBe(200)
    }
  })

  it('the counter carries no identity — nothing but a bucket, a period and a number', async () => {
    await post(progress, 'progress', { id: 'ACDEFG', rungs: ['arrived'], scene: 'london' })
    const limits = stores.get('limits')!
    for (const [key, value] of limits) {
      // `h` for the hour, `d` for the day — the period is in the key so the two
      // listings stay disjoint and neither sweep can eat the other's counter.
      expect(key).toMatch(/^progress-(h-\d{4}-\d{2}-\d{2}T\d{2}|d-\d{4}-\d{2}-\d{2})$/)
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
 * is a destruction primitive. See the read cap
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

  // docs/THREAT.md, T2: thirty made-up codes an hour used to spend the whole
  // reporting cap and bury every real report after them.
  it('a report against a pair that does not exist spends the probe bucket, not the reporting cap', async () => {
    vi.stubEnv('SAFETY_HOURLY_CAP', '1')
    const report = (code: string) => post(safety, 'safety', { code, side: 'woman', reason: 'harassment' })
    expect((await report('HJKMNP')).status).toBe(404)
    // The miss above spent no reporting cap, so a real report still lands.
    expect((await report('QRTWXY')).status).toBe(200)
    expect((await report('QRTWXY')).status).toBe(503)
    const limits = stores.get('limits')!
    const count = (prefix: string) => {
      const keys = [...limits.keys()].filter((k) => k.startsWith(prefix))
      expect(keys).toHaveLength(1)
      return JSON.parse(limits.get(keys[0])!)
    }
    expect(count('safety-h-')).toBe(1)
    expect(count('safety-probe-h-')).toBe(3)
  })

  it('past the probe cap a miss is a 503, not a 404 — the oracle is closed', async () => {
    vi.stubEnv('SAFETY_PROBE_HOURLY_CAP', '1')
    const report = (code: string) => post(safety, 'safety', { code, side: 'woman', reason: 'harassment' })
    expect((await report('HJKMNP')).status).toBe(404)
    expect((await report('ACDEFG')).status).toBe(503)
    expect(members('reports')).toEqual([])
  })

  it('a hyphenated bucket reads the underscored variable docs/DEPLOY.md names', async () => {
    // `couple-read` used to look for COUPLE-READ_HOURLY_CAP, which no shell
    // can set, so the documented COUPLE_READ_HOURLY_CAP silently never bound.
    const { envName } = await import('../netlify/shared/limit')
    expect(envName('couple-read', 'HOURLY')).toBe('COUPLE_READ_HOURLY_CAP')
    expect(envName('guide', 'DAILY')).toBe('GUIDE_DAILY_CAP')

    vi.stubEnv('COUPLE_READ_HOURLY_CAP', '1')
    const { default: couple } = await import('../netlify/functions/couple')
    const url = 'http://x/.netlify/functions/couple?code=QRTWXY'
    expect((await couple(new Request(url))).status).toBe(200)
    expect((await couple(new Request(url))).status).toBe(503)
  })
})
