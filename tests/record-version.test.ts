import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOPICS } from '../netlify/shared/vocab'
import { RECORD_VERSION, stamp } from '../netlify/shared/record'

/**
 * Every record about a member carries the version it was written in, and
 * nothing that is not a record does. This drives one write through every
 * function that writes a member record and reads the blobs back — the day a
 * shape changes, this is the test that says every writer moved with it.
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
    // Conditional options work here too: the real store returns { modified }
    // from `set` exactly as it does from `setJSON`.
    set: async (key: string, value: string, opts?: { onlyIfMatch?: string; onlyIfNew?: boolean }) => {
      if (opts?.onlyIfNew && m.has(key)) return { modified: false }
      if (opts?.onlyIfMatch && opts.onlyIfMatch !== m.get(key)) return { modified: false }
      m.set(key, value)
      return { modified: true }
    },
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

const keep = (await import('../netlify/functions/keep')).default
const progress = (await import('../netlify/functions/progress')).default
const couple = (await import('../netlify/functions/couple')).default
const safety = (await import('../netlify/functions/safety')).default

type Handler = (req: Request) => Promise<Response>
const post = (handler: Handler, path: string, body: unknown) =>
  handler(new Request(`http://x/.netlify/functions/${path}`, { method: 'POST', body: JSON.stringify(body) }))
const blob = (store: string, key: string) => JSON.parse(stores.get(store)!.get(key)!) as Record<string, unknown>
const sides = Object.fromEntries([...TOPICS].map((id) => [id, 'agree']))

beforeEach(() => stores.clear())
afterEach(() => vi.unstubAllEnvs())

describe('the stamp', () => {
  it('is applied last, so a record rewritten at a later version carries that version', () => {
    const born = { a: 1, v: 0 }
    expect(stamp({ ...born, b: 2 })).toEqual({ a: 1, b: 2, v: RECORD_VERSION })
    expect(RECORD_VERSION).toBe(1)
  })
})

describe('every record about a member carries its version', () => {
  it('a kept map — minted, and re-kept under her code', async () => {
    const { code } = (await (await post(keep, 'keep', { snapshot: { identity: { firstName: 'Hodan' } } })).json()) as { code: string }
    expect(blob('maps', code).v).toBe(RECORD_VERSION)
    await post(keep, 'keep', { snapshot: { identity: { firstName: 'Hodan' } }, code })
    expect(blob('maps', code).v).toBe(RECORD_VERSION)
  })

  it('a ladder record — and only at the top, never inside the facts', async () => {
    expect((await post(progress, 'progress', { id: 'HJKMNP', rungs: ['arrived', 'mapped'], facts: { grounds: { faith: 'steady' } } })).status).toBe(200)
    const record = blob('progress', 'HJKMNP')
    expect(record.v).toBe(RECORD_VERSION)
    expect('v' in (record.facts as object)).toBe(false)
  })

  it('a pair’s sheets — started, and answered, with the version of the last write', async () => {
    const { code } = (await (await post(couple, 'couple', { side: 'first', gender: 'woman', states: sides })).json()) as { code: string }
    expect(blob('couples', code).v).toBe(RECORD_VERSION)
    // An older sheet, answered today, is rewritten at today's version.
    const born = blob('couples', code)
    memStore('couples').setJSON(code, { ...born, v: 0 })
    expect((await post(couple, 'couple', { side: 'second', code, states: sides })).status).toBe(200)
    expect(blob('couples', code).v).toBe(RECORD_VERSION)
    // The joint tally is a tally, not a record.
    expect('v' in blob('tallies', 'joint')).toBe(false)
  })

  it('a report, and the stub it leaves when resolved', async () => {
    memStore('couples').setJSON('QRTWXY', { creator: 'woman', first: sides, createdAt: '2026-01-01', expiresAt: '2099-01-01' })
    expect((await post(safety, 'safety', { code: 'QRTWXY', side: 'woman', reason: 'threats', details: 'He said so.' })).status).toBe(200)
    const [reportKey] = [...stores.get('reports')!.keys()]
    const report = blob('reports', reportKey)
    expect(report.v).toBe(RECORD_VERSION)
    vi.stubEnv('FOUNDER_KEY', 'k')
    const res = await safety(
      new Request(`http://x/.netlify/functions/safety?code=QRTWXY&side=woman&id=${report.id}&outcome=no-action`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer k' },
      }),
    )
    expect(res.status).toBe(200)
    expect(blob('reports', `resolved/${report.id}`).v).toBe(RECORD_VERSION)
  })

  it('a counter is a number, and carries nothing', async () => {
    await post(keep, 'keep', { snapshot: {} })
    const [key] = [...stores.get('limits')!.keys()]
    expect(JSON.parse(stores.get('limits')!.get(key)!)).toBe(1)
  })
})
