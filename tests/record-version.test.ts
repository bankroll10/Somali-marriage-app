import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOPICS } from '../netlify/shared/vocab'
import { RECORD_VERSION, stamp } from '../netlify/shared/record'
import { memStore, stores } from './support/memory'

/**
 * Every record about a member carries the version it was written in, and
 * nothing that is not a record does. This drives one write through every
 * function that writes a member record and reads the blobs back — the day a
 * shape changes, this is the test that says every writer moved with it.
 */

vi.mock('@netlify/blobs', async () => (await import('./support/memory')).memoryModule)

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
