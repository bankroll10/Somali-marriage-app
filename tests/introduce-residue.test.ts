import { beforeEach, describe, expect, it, vi } from 'vitest'
import { blobs, call, FOUNDER, FOUNDER_KEY } from './support/server'
import { day } from '../netlify/shared/day'

/**
 * A withdrawal that wins, and a record that is left behind anyway
 * (docs/BATCH-01-PLAN.md D2, as repaired on 2026-09-27).
 *
 * The interleavings in tests/introduce-race.test.ts assume every delete
 * lands. Here one does not: a late request writes its record after the
 * withdrawal has been answered, finds the marker, and cannot delete what it
 * wrote. Before the repair that request answered 503, the founder's list
 * showed the person, and the sweep kept the record for 180 days while the
 * marker went after two — a withdrawal that was acknowledged and then quietly
 * undone. The marker is the authority now: a record under a marked code is
 * not on the founder's list and not in the counts; the sweep deletes it on any
 * run and only then the marker; a cleanup that fails keeps the marker, so the
 * evidence for the next attempt stays; and a marker refreshed by a new
 * withdrawal is never removed on the strength of an older read.
 */

vi.mock('@netlify/blobs', async () => (await import('./support/blobs')).blobsModule)

const CODE = 'HJKMNPQR'
const MARKER = `withdrawn/${CODE}`
const OK = { code: CODE, contact: 'zq.residue@example.com', gender: 'woman', scene: 'twin-cities', adult: true }
const put = () => call('introduce', 'POST', 'introduce', OK)
const off = (code = CODE) => call('introduce', 'DELETE', `introduce?code=${code}`)
const list = async () => (await (await call('introduce', 'GET', 'introduce', undefined, FOUNDER)).json()) as { people: { code: string }[]; counts: Record<string, unknown>; total: number; withdrawn: number }
const DAY = 24 * 60 * 60 * 1000
const at = (d: string) => Date.parse(`${d}T00:00:00Z`)

beforeEach(() => {
  blobs.reset()
  process.env.FOUNDER_KEY = FOUNDER_KEY
})

async function sweepAt(when: number) {
  const { sweepIntroductions } = await import('../netlify/functions/sweep')
  return sweepIntroductions(blobs.store('introductions') as never, when)
}

describe('a late write whose cleanup fails, after the withdrawal was answered', () => {
  async function reproduce() {
    // The withdrawal lands just before the request's write; the request's own
    // delete of what it wrote then fails.
    blobs.before('setJSON', CODE, () => off(), 'introductions')
    blobs.failOn({ store: 'introductions', op: 'delete', key: CODE })
    const res = await put()
    return res
  }

  it('answers withdrawn, not a server error, and leaves the marker beside the record it could not remove', async () => {
    const res = await reproduce()
    expect(res.status).toBe(410)
    expect((await res.json()).error).toBe('withdrawn')
    expect(blobs.keys('introductions')).toEqual([CODE, MARKER])
  })

  it('the founder’s list does not show the person, and does not count them', async () => {
    await reproduce()
    const body = await list()
    expect(body.people).toEqual([])
    expect(body.counts).toEqual({})
    expect(body.total).toBe(0)
    expect(body.withdrawn).toBe(1)
    expect(JSON.stringify(body)).not.toContain('zq.residue')
  })

  it('a later sweep deletes the record on any run, and the marker only once it is gone and its days are up', async () => {
    await reproduce()
    // The same night: the record goes, the fresh marker stays.
    expect(await sweepAt(Date.now())).toEqual({ introductions: 0, withdrawn: 1, markers: 0, errors: 0 })
    expect(blobs.keys('introductions')).toEqual([MARKER])
    // A run past the marker's days takes the marker.
    expect(await sweepAt(Date.now() + 3 * DAY)).toEqual({ introductions: 0, withdrawn: 0, markers: 1, errors: 0 })
    expect(blobs.keys('introductions')).toEqual([])
  })

  it('a retry of the same request finds the marker and is refused; it never becomes a second record', async () => {
    await reproduce()
    const res = await put()
    expect(res.status).toBe(410)
    // The retry's own attempt to clear the residue succeeded this time.
    expect(blobs.keys('introductions')).toEqual([MARKER])
  })
})

describe('the sweep processing markers', () => {
  it('a record it cannot delete keeps its marker, so the next run finds the evidence', async () => {
    blobs.put('introductions', MARKER, { at: '2026-09-01' })
    blobs.put('introductions', CODE, { contact: 'zq.residue@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', adult: true, at: '2026-09-01', v: 1 })
    blobs.failOn({ store: 'introductions', op: 'delete', key: CODE })
    expect(await sweepAt(at('2026-09-13'))).toEqual({ introductions: 0, withdrawn: 0, markers: 0, errors: 1 })
    expect(blobs.keys('introductions')).toEqual([CODE, MARKER])
    // Next week, both go — record first.
    blobs.log.length = 0
    expect(await sweepAt(at('2026-09-20'))).toEqual({ introductions: 0, withdrawn: 1, markers: 1, errors: 0 })
    expect(blobs.keys('introductions')).toEqual([])
    const order = blobs.log.filter((c) => c.op === 'delete').map((c) => c.key)
    expect(order).toEqual([CODE, MARKER])
  })

  it('a marker whose record is still there is never removed first, however old it is', async () => {
    blobs.put('introductions', MARKER, { at: '2026-01-01' })
    blobs.put('introductions', CODE, { contact: 'zq.residue@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', adult: true, at: '2026-09-01', v: 1 })
    // Only the record's delete fails; the marker's would succeed if tried.
    blobs.failOn({ store: 'introductions', op: 'delete', key: CODE })
    await sweepAt(at('2026-09-13'))
    expect(blobs.keys('introductions')).toEqual([CODE, MARKER])
    expect(blobs.log.filter((c) => c.op === 'delete' && c.key === MARKER)).toEqual([])
  })

  it('a withdrawal repeated near cleanup refreshes the marker’s day, and the sweep keeps it', async () => {
    blobs.put('introductions', MARKER, { at: '2026-09-01' })
    expect(await (await off()).json()).toEqual({ removed: false })
    expect(blobs.read('introductions', MARKER)).toEqual({ at: day() })
    expect(await sweepAt(Date.now())).toEqual({ introductions: 0, withdrawn: 0, markers: 0, errors: 0 })
    expect(blobs.keys('introductions')).toEqual([MARKER])
  })

  it('a withdrawal that lands while the sweep is deciding about an old marker wins: the marker read as old is not the one deleted', async () => {
    blobs.put('introductions', MARKER, { at: '2026-09-01' })
    // The sweep has read the marker as old; the withdrawal rewrites it just
    // before the sweep checks the version it is about to delete.
    blobs.before('getMetadata', MARKER, () => off(), 'introductions')
    expect(await sweepAt(at('2026-09-13'))).toEqual({ introductions: 0, withdrawn: 0, markers: 0, errors: 0 })
    expect(blobs.keys('introductions')).toEqual([MARKER])
    // And a request under that code, arriving now, is refused.
    expect((await put()).status).toBe(410)
    expect(blobs.keys('introductions')).toEqual([MARKER])
  })
})
