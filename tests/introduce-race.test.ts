import { beforeEach, describe, expect, it, vi } from 'vitest'
import { blobs, call } from './support/server'
import { seedRecord } from './support/intro'
import { day } from '../netlify/shared/day'
import { markerKey } from '../netlify/functions/introduce'

/**
 * A request that was in flight when the route closed, and a withdrawal beside it
 * (docs/BATCH-01-PLAN.md D2; docs/DECISIONS.md, release R3 and its integration).
 *
 * The phone's `send` gives up after ten seconds, but a request it sent before
 * the route closed may still arrive. It must not write: the route answers 410
 * before it opens a store, so a late request cannot leave a record that a
 * withdrawal has already marked. What is left to race is the withdrawal itself:
 * the DELETE writes `withdrawn/<code>/<day>` before it deletes the record, and
 * a second tap, or Forget me beside it, must end in the same place.
 * tests/support/blobs.ts runs the competing request at an exact call, so each
 * interleaving is a test, not a thought experiment. tests/introduce-residue.test.ts
 * takes over where a delete fails.
 */

vi.mock('@netlify/blobs', async () => (await import('./support/blobs')).blobsModule)

const CODE = 'HJKMNPQR'
const MARKER = markerKey(CODE, day())
const OK = { code: CODE, contact: 'zq.race@example.com', gender: 'woman', scene: 'twin-cities', adult: true }
const put = () => call('introduce', 'POST', 'introduce', OK)
const off = () => call('introduce', 'DELETE', `introduce?code=${CODE}`)

beforeEach(() => blobs.reset())

describe('a request that arrives after the route closed', () => {
  it('is refused before any store is opened, and writes nothing', async () => {
    const res = await put()
    expect(res.status).toBe(410)
    expect(await res.json()).toEqual({ error: 'closed' })
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect(blobs.keys('introductions')).toEqual([])
    expect(blobs.opened.has('introductions')).toBe(false)
  })

  it('is refused the same way when a withdrawal has just marked the code: no record comes back', async () => {
    seedRecord(CODE)
    expect(await (await off()).json()).toEqual({ removed: true })
    const res = await put()
    expect(res.status).toBe(410)
    expect(blobs.keys('introductions')).toEqual([MARKER])
  })

  it('is refused when it lands between a withdrawal’s marker and its delete', async () => {
    seedRecord(CODE)
    blobs.before('delete', CODE, () => put(), 'introductions')
    expect(await (await off()).json()).toEqual({ removed: true })
    expect(blobs.keys('introductions')).toEqual([MARKER])
  })
})

describe('a withdrawal racing another under the same code', () => {
  it('two at once: one record gone, one marker, both told the request is off the list or was not there', async () => {
    seedRecord(CODE)
    const [a, b] = await Promise.all([off(), off()])
    expect([a.status, b.status]).toEqual([200, 200])
    const said = ((await Promise.all([a.json(), b.json()])) as { removed: boolean }[]).map((r) => r.removed)
    // Whichever deleted the record says so; the other may say either, but never an error.
    expect(said).toContain(true)
    expect(blobs.keys('introductions')).toEqual([MARKER])
  })

  it('a second tap after the first was answered: nothing found, still one marker', async () => {
    seedRecord(CODE)
    expect(await (await off()).json()).toEqual({ removed: true })
    expect(await (await off()).json()).toEqual({ removed: false })
    expect(blobs.keys('introductions')).toEqual([MARKER])
  })

  it('a code with nothing under it still leaves its marker, so a request that was in flight cannot outlive it', async () => {
    expect(await (await off()).json()).toEqual({ removed: false })
    expect(blobs.keys('introductions')).toEqual([MARKER])
  })

  it('the marker is written before the record is touched', async () => {
    seedRecord(CODE)
    let seen: string[] = []
    blobs.before('delete', CODE, () => {
      seen = blobs.keys('introductions')
    }, 'introductions')
    await off()
    expect(seen.sort()).toEqual([CODE, MARKER].sort())
  })
})

describe('the store', () => {
  it('is opened for the latest state, not the edge’s eventual copy', async () => {
    // The mock records what it was asked for; the SDK's edge reads drift by
    // up to a minute (@netlify/blobs README), and every read here decides
    // whether a person's request stands.
    seedRecord(CODE)
    await off()
    expect(blobs.opened.get('introductions')).toEqual({ consistency: 'strong' })
  })
})
