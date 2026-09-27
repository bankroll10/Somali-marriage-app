import { beforeEach, describe, expect, it, vi } from 'vitest'
import { blobs, call, FOUNDER, FOUNDER_KEY } from './support/server'
import { day } from '../netlify/shared/day'
import { markerKey } from '../netlify/functions/introduce'

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
 * evidence for the next attempt stays.
 *
 * And the marker itself cannot be undone by cleanup. Blobs has no conditional
 * delete, so the first repair's "read the marker, then delete it if unchanged"
 * was two calls with a gap, and a withdrawal in that gap lost its marker to
 * the sweep (the review's reproduction, kept below as the last interleaving).
 * Markers are now one immutable key per code per day; an old key's removal
 * cannot touch a fresh withdrawal's, whatever the interleaving.
 */

vi.mock('@netlify/blobs', async () => (await import('./support/blobs')).blobsModule)

const CODE = 'HJKMNPQR'
/** Today's marker for the code — what a withdrawal made now writes. */
const MARKER = markerKey(CODE, day())
/** An old marker for the same code, from a withdrawal weeks ago. */
const OLD = markerKey(CODE, '2026-09-01')
const OK = { code: CODE, contact: 'zq.residue@example.com', gender: 'woman', scene: 'twin-cities', adult: true }
const put = () => call('introduce', 'POST', 'introduce', OK)
const off = (code = CODE) => call('introduce', 'DELETE', `introduce?code=${code}`)
const list = async () => (await (await call('introduce', 'GET', 'introduce', undefined, FOUNDER)).json()) as { people: { code: string }[]; counts: Record<string, unknown>; total: number; withdrawn: number }
const DAY = 24 * 60 * 60 * 1000
const at = (d: string) => Date.parse(`${d}T00:00:00Z`)
const record = () => ({ contact: 'zq.residue@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', adult: true, at: '2026-09-01', v: 1 })

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
    return put()
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
    // The same night: the record goes, today's marker stays.
    expect(await sweepAt(Date.now())).toEqual({ introductions: 0, withdrawn: 1, markers: 0, errors: 0 })
    expect(blobs.keys('introductions')).toEqual([MARKER])
    // Two days on the marker is still not two full days old; three days on it is.
    expect(await sweepAt(Date.now() + 2 * DAY)).toEqual({ introductions: 0, withdrawn: 0, markers: 0, errors: 0 })
    expect(await sweepAt(Date.now() + 3 * DAY)).toEqual({ introductions: 0, withdrawn: 0, markers: 1, errors: 0 })
    expect(blobs.keys('introductions')).toEqual([])
  })

  it('a retry of the same request finds the marker and is refused; it never becomes a second record', async () => {
    await reproduce()
    const res = await put()
    expect(res.status).toBe(410)
    // The retry's own attempt to clear the residue succeeded this time.
    expect(blobs.keys('introductions')).toEqual([MARKER])
    // The check is a list by the code's marker prefix, on the store opened strong.
    expect(blobs.log.filter((c) => c.op === 'list').map((c) => c.key)).toContain(`withdrawn/${CODE}/`)
    expect(blobs.opened.get('introductions')).toEqual({ consistency: 'strong' })
  })
})

describe('the sweep processing markers', () => {
  it('a record it cannot delete keeps its marker, so the next run finds the evidence', async () => {
    blobs.put('introductions', OLD, { at: '2026-09-01' })
    blobs.put('introductions', CODE, record())
    blobs.failOn({ store: 'introductions', op: 'delete', key: CODE })
    expect(await sweepAt(at('2026-09-13'))).toEqual({ introductions: 0, withdrawn: 0, markers: 0, errors: 1 })
    expect(blobs.keys('introductions')).toEqual([CODE, OLD])
    // Next week, both go — record first.
    blobs.log.length = 0
    expect(await sweepAt(at('2026-09-20'))).toEqual({ introductions: 0, withdrawn: 1, markers: 1, errors: 0 })
    expect(blobs.keys('introductions')).toEqual([])
    expect(blobs.log.filter((c) => c.op === 'delete').map((c) => c.key)).toEqual([CODE, OLD])
  })

  it('a marker whose record is still there is never removed first, however old it is', async () => {
    blobs.put('introductions', markerKey(CODE, '2026-01-01'), { at: '2026-01-01' })
    blobs.put('introductions', CODE, record())
    blobs.failOn({ store: 'introductions', op: 'delete', key: CODE })
    await sweepAt(at('2026-09-13'))
    expect(blobs.keys('introductions')).toEqual([CODE, markerKey(CODE, '2026-01-01')])
    expect(blobs.log.filter((c) => c.op === 'delete' && c.key !== CODE)).toEqual([])
  })

  it('a code withdrawn on two days carries two markers; the record goes once, and each marker goes on its own day', async () => {
    blobs.put('introductions', OLD, { at: '2026-09-01' })
    blobs.put('introductions', CODE, record())
    expect(await (await off()).json()).toEqual({ removed: true })
    expect(blobs.keys('introductions')).toEqual([OLD, MARKER])
    expect(await sweepAt(Date.now())).toEqual({ introductions: 0, withdrawn: 0, markers: 1, errors: 0 })
    expect(blobs.keys('introductions')).toEqual([MARKER])
    // And a request under the code is refused while any marker stands.
    expect((await put()).status).toBe(410)
  })

  it('a withdrawal repeated on the same day is one marker, left as it was', async () => {
    expect(await (await off()).json()).toEqual({ removed: false })
    expect(await (await off()).json()).toEqual({ removed: false })
    expect(blobs.keys('introductions')).toEqual([MARKER])
    expect(blobs.read('introductions', MARKER)).toEqual({ at: day() })
  })

  it('a withdrawal that lands before the sweep reads: the old marker goes, the fresh one stays, the request is refused', async () => {
    blobs.put('introductions', OLD, { at: '2026-09-01' })
    blobs.before('list', '', () => off(), 'introductions')
    expect(await sweepAt(Date.now())).toEqual({ introductions: 0, withdrawn: 0, markers: 1, errors: 0 })
    expect(blobs.keys('introductions')).toEqual([MARKER])
    expect((await put()).status).toBe(410)
    expect(blobs.keys('introductions')).toEqual([MARKER])
  })

  it('a withdrawal that lands immediately before the sweep’s delete of an old marker is not undone by it', async () => {
    // The review's reproduction against 5dedfe3: the sweep had read the one
    // marker as old, the withdrawal rewrote it, and the unconditional delete
    // took the fresh marker; the request then answered 200. Now the fresh
    // withdrawal is its own key.
    blobs.put('introductions', OLD, { at: '2026-09-01' })
    blobs.before(
      'delete',
      OLD,
      async () => {
        const response = await off()
        expect(response.status).toBe(200)
      },
      'introductions',
    )
    expect(await sweepAt(Date.now())).toEqual({ introductions: 0, withdrawn: 0, markers: 1, errors: 0 })
    expect(blobs.keys('introductions')).toEqual([MARKER])
    const response = await put()
    expect(response.status).toBe(410)
    expect(blobs.keys('introductions')).toEqual([MARKER])
  })

  it('a marker whose key carries no day is from no version of this route, and goes once nothing is under its code', async () => {
    blobs.put('introductions', 'withdrawn/QRTWXY34', { at: '2026-09-01' })
    blobs.put('introductions', 'withdrawn/ACDEFGHJ/last-spring', {})
    expect(await sweepAt(Date.now())).toEqual({ introductions: 0, withdrawn: 0, markers: 2, errors: 0 })
    expect(blobs.keys('introductions')).toEqual([])
  })
})
