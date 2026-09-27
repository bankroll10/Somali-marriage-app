import { beforeEach, describe, expect, it, vi } from 'vitest'
import { blobs, call } from './support/server'

/**
 * A request still in flight, and a withdrawal that overtakes it
 * (docs/BATCH-01-PLAN.md D2).
 *
 * The phone's `send` gives up after ten seconds, but the request it sent may
 * still land; a person who taps "Take my name off" or Forget me in that
 * window must not be left with a record on the list and no code for it. The
 * DELETE writes `withdrawn/<code>` before it deletes the record; the POST
 * checks the marker before and after its write. tests/support/blobs.ts runs
 * the competing request at an exact call, so each interleaving is a test,
 * not a thought experiment. Whatever the order, the store ends with the
 * marker and nothing else, and the request is told it was withdrawn.
 */

vi.mock('@netlify/blobs', async () => (await import('./support/blobs')).blobsModule)

const CODE = 'HJKMNPQR'
const MARKER = `withdrawn/${CODE}`
const OK = { code: CODE, contact: 'zq.race@example.com', gender: 'woman', scene: 'twin-cities', adult: true }
const put = () => call('introduce', 'POST', 'introduce', OK)
const off = () => call('introduce', 'DELETE', `introduce?code=${CODE}`)

beforeEach(() => blobs.reset())

describe('a withdrawal racing a request under the same code', () => {
  it('lands before the record is written: the request finds the marker first and writes nothing', async () => {
    // The marker check reads first; the withdrawal runs just before that read.
    blobs.before('get', MARKER, () => off(), 'introductions')
    const res = await put()
    expect(res.status).toBe(410)
    expect(blobs.keys('introductions')).toEqual([MARKER])
  })

  it('lands between the check and the write: the record is written, then removed by the request itself', async () => {
    blobs.before('setJSON', CODE, () => off(), 'introductions')
    const res = await put()
    expect(res.status).toBe(410)
    expect(blobs.keys('introductions')).toEqual([MARKER])
  })

  it('lands after the write and before the request’s second look: removed by the withdrawal, and the request says so', async () => {
    // The first marker read is the check before the write; the second is after.
    blobs.before('get', MARKER, () => off(), 'introductions', 2)
    const res = await put()
    expect(res.status).toBe(410)
    expect(blobs.keys('introductions')).toEqual([MARKER])
  })

  it('lands after the request has been answered: the ordinary case, removed and marked', async () => {
    const saved = await put()
    expect(saved.status).toBe(200)
    expect(blobs.keys('introductions')).toEqual([CODE])
    expect(await (await off()).json()).toEqual({ removed: true })
    expect(blobs.keys('introductions')).toEqual([MARKER])
  })

  it('a retry of a request that landed, overtaken by a withdrawal between its refused write and its read-back', async () => {
    expect((await put()).status).toBe(200)
    blobs.before('get', CODE, () => off(), 'introductions')
    const res = await put()
    expect(res.status).toBe(410)
    expect(blobs.keys('introductions')).toEqual([MARKER])
  })

  it('two requests under one code at once: one record, one day, both told', async () => {
    const [a, b] = await Promise.all([put(), put()])
    expect([a.status, b.status]).toEqual([200, 200])
    const [ra, rb] = (await Promise.all([a.json(), b.json()])) as { at: string; removeOn: string; again?: boolean }[]
    expect(ra.at).toBe(rb.at)
    expect(ra.removeOn).toBe(rb.removeOn)
    expect([ra.again, rb.again].filter(Boolean)).toHaveLength(1)
    expect(blobs.keys('introductions')).toEqual([CODE])
  })

  it('the store is opened for the latest state, not the edge’s eventual copy', async () => {
    // The mock records what it was asked for; the SDK's edge reads drift by
    // up to a minute (@netlify/blobs README), and every read here decides
    // whether a person's request stands.
    await put()
    expect(blobs.opened.get('introductions')).toEqual({ consistency: 'strong' })
    await off()
    expect(blobs.opened.get('introductions')).toEqual({ consistency: 'strong' })
  })
})
