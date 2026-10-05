import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { blobs, call, FOUNDER, FOUNDER_KEY } from './support/server'
import { day } from '../netlify/shared/day'
import { CLOSED_DAYS, CLOSED_STORE, closedKey } from '../netlify/functions/progress'

/**
 * A forgotten install code cannot be written under again, for a while
 * (docs/DECISIONS.md, release candidate R2).
 *
 * Until this, a progress DELETE removed the record and left nothing, so a
 * report already on its way — or sent by another tab in the moments before the
 * phone was wiped — landed afterwards and made the record again, under a code
 * nothing on the phone named. DELETE now writes `<install>/<day>` to its own
 * strong store *before* it deletes, whether or not a record exists; a POST
 * refuses under any marker, and checks again after its write.
 *
 * What these hold is behaviour, not a transaction. The two stores are not one:
 * a function that stops after its write, or whose re-check or compensating
 * delete fails, can leave a record under a marker, and the tests below say
 * what resolves it (a retry, a later refused POST, the weekly sweep). No
 * failure path may answer in a way that claims protection it did not establish.
 */

vi.mock('@netlify/blobs', async () => (await import('./support/blobs')).blobsModule)

const ID = 'HJKMNPQR'
const OTHER = 'QRTWXY34'
const at = (d: string) => Date.parse(`${d}T00:00:00Z`)
const POST = { id: ID, rungs: ['arrived'] }
const report = (id = ID) => call('progress', 'POST', 'progress', { ...POST, id })
const forget = (id = ID) => call('progress', 'DELETE', `progress?id=${id}`)
const tally = () => call('progress', 'GET', 'progress', undefined, FOUNDER)
const record = (id = ID) => blobs.read('progress', id)
const markers = () => blobs.keys(CLOSED_STORE)
const THE_RECORD = { first: { arrived: '2026-10-01' }, expiresAt: '2027-10-01', v: 1 }
/** A record the year has passed, as the cleaners find one. */
const EXPIRED = { first: { arrived: '2020-01-01' }, expiresAt: '2021-01-01', v: 1 }

beforeEach(() => {
  blobs.reset()
  process.env.FOUNDER_KEY = FOUNDER_KEY
})
afterEach(() => {
  vi.useRealTimers()
  delete process.env.PROGRESS_FORGET_HOURLY_CAP
})

async function sweepClosures(when: number) {
  const { sweepProgressClosures } = await import('../netlify/functions/sweep')
  return sweepProgressClosures(blobs.store('progress') as never, blobs.store(CLOSED_STORE) as never, when)
}
const sweepAll = async () => (await import('../netlify/functions/sweep')).sweep()
const clockAt = (iso: string) => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(iso))
}

describe('a DELETE closes the code, with a record and without one', () => {
  it('with a record: the marker is its day and nothing else, the record goes, the answer is as it was, and a report is then refused', async () => {
    blobs.put('progress', ID, THE_RECORD)
    const res = await forget()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ forgotten: true })
    expect(markers()).toEqual([closedKey(ID, day())])
    expect(blobs.read(CLOSED_STORE, markers()[0])).toEqual({ at: day() }) // no step, fact, city, side or contact
    expect(record()).toBeNull()
    const late = await report()
    expect(late.status).toBe(410)
    expect(await late.json()).toEqual({ error: 'forgotten' })
    expect(record()).toBeNull()
  })

  it('with no record: the marker is written all the same, the answer is as it was, and the first report to arrive is refused', async () => {
    const res = await forget()
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
    expect(markers()).toEqual([closedKey(ID, day())])
    expect((await report()).status).toBe(410)
    expect(record()).toBeNull()
  })

  it('the marker store is opened strong, and the marker is written before the record is deleted', async () => {
    blobs.put('progress', ID, THE_RECORD)
    await forget()
    expect(blobs.opened.get(CLOSED_STORE)).toMatchObject({ consistency: 'strong' })
    const calls = blobs.log
    const marked = calls.findIndex((c) => c.store === CLOSED_STORE && c.op === 'setJSON')
    const deleted = calls.findIndex((c) => c.store === 'progress' && c.op === 'delete' && c.key === ID)
    expect(marked).toBeGreaterThanOrEqual(0)
    expect(deleted).toBeGreaterThan(marked)
  })

  it('only the code asked about is closed, and a code that is not one writes nothing and deletes nothing', async () => {
    blobs.put('progress', OTHER, THE_RECORD)
    expect((await forget('nope')).status).toBe(400)
    expect(markers()).toEqual([])
    expect(record(OTHER)).not.toBeNull()
    await forget(ID)
    expect((await report(OTHER)).status).toBe(200)
    expect(record(OTHER)).not.toBeNull()
  })

  it('the existing forget cap still applies: a refused DELETE writes no marker', async () => {
    process.env.PROGRESS_FORGET_HOURLY_CAP = '1'
    expect((await forget(ID)).status).toBe(404)
    const over = await forget(OTHER)
    expect(over.status).toBe(503) // a cap is deliberately indistinguishable from an outage (netlify/shared/limit.ts)
    expect(markers()).toEqual([closedKey(ID, day())])
  })

  it('a second DELETE the same day is the same key, left exactly as it was; a later day is another key', async () => {
    clockAt('2026-10-01T08:00:00Z')
    await forget()
    const key = closedKey(ID, '2026-10-01')
    const first = blobs.stores.get(CLOSED_STORE)!.get(key)!
    vi.setSystemTime(new Date('2026-10-01T22:00:00Z'))
    await forget()
    expect(markers()).toEqual([key])
    expect(blobs.stores.get(CLOSED_STORE)!.get(key)).toEqual(first) // not rewritten, so not extended
    vi.setSystemTime(new Date('2026-10-02T00:00:00Z'))
    await forget()
    expect(markers()).toEqual([key, closedKey(ID, '2026-10-02')])
  })

  it('the day in the key is the UTC day: the last millisecond of one and the first of the next', async () => {
    clockAt('2026-10-01T23:59:59.999Z')
    await forget()
    vi.setSystemTime(new Date('2026-10-02T00:00:00.000Z'))
    await forget(OTHER)
    expect(markers()).toEqual([closedKey(ID, '2026-10-01'), closedKey(OTHER, '2026-10-02')])
  })
})

describe('when establishing the closure fails, nothing is confirmed', () => {
  it('the marker cannot be written: 503, the record is untouched and not deleted, no marker, and a retry then closes it', async () => {
    blobs.put('progress', ID, THE_RECORD)
    blobs.failOn({ store: CLOSED_STORE, op: 'setJSON' })
    const res = await forget()
    expect(res.status).toBe(503)
    expect([200, 404]).not.toContain(res.status)
    expect(record()).not.toBeNull()
    expect(markers()).toEqual([])
    // Nothing protected: a report is not refused.
    expect((await report()).status).toBe(200)
    expect((await forget()).status).toBe(200)
    expect(markers()).toEqual([closedKey(ID, day())])
    expect(record()).toBeNull()
  })

  it('the record cannot be deleted after the marker: 503, the marker stands, and a retry finishes it', async () => {
    blobs.put('progress', ID, THE_RECORD)
    blobs.failOn({ store: 'progress', op: 'delete', key: ID })
    const res = await forget()
    expect(res.status).toBe(503)
    expect(markers()).toEqual([closedKey(ID, day())])
    expect(record()).not.toBeNull() // stranded under a marker
    const retry = await forget()
    expect(retry.status).toBe(200)
    expect(record()).toBeNull()
    expect(markers()).toEqual([closedKey(ID, day())])
    expect((await report()).status).toBe(410)
  })
})

describe('a read that missed the record does not leave it behind', () => {
  it('DELETE: the existence read answers nothing although a record is there; the record is deleted all the same, the answer is as it was, and the code is closed', async () => {
    blobs.put('progress', ID, THE_RECORD)
    blobs.stale('progress', ID)
    const res = await forget()
    expect(res.status).toBe(404) // what the read said
    expect(record()).toBeNull() // what is held
    expect(markers()).toEqual([closedKey(ID, day())])
  })

  it('the sweep: the existence read misses a record under a marker; the record is deleted anyway, then the old marker', async () => {
    blobs.put('progress', ID, THE_RECORD)
    blobs.put(CLOSED_STORE, closedKey(ID, '2026-09-01'), { at: '2026-09-01' })
    blobs.stale('progress', ID)
    expect(await sweepClosures(at('2026-10-04'))).toEqual({ stranded: 0, closures: 1, errors: 0 })
    expect(record()).toBeNull()
    expect(markers()).toEqual([])
  })
})

describe('a report that races a DELETE', () => {
  /** Each point in a POST's own calls at which a complete DELETE can land. Every one ends with the code closed and no record. */
  const POINTS: [string, () => void][] = [
    ['before its first look at the markers', () => blobs.before('list', `${ID}/`, () => forget(), CLOSED_STORE, 1)],
    ['after that look and before it reads the record', () => blobs.before('getWithMetadata', ID, () => forget(), 'progress')],
    ['after it reads and before it writes', () => blobs.before('setJSON', ID, () => forget(), 'progress')],
    ['after it writes and before its second look', () => blobs.before('list', `${ID}/`, () => forget(), CLOSED_STORE, 2)],
  ]
  for (const present of [false, true]) {
    it.each(POINTS)(`${present ? 'a record already there' : 'no record yet'}, a DELETE lands %s: the code ends closed and nothing is left`, async (_n, arm) => {
      if (present) blobs.put('progress', ID, THE_RECORD)
      arm()
      const res = await report()
      // Whatever the report was told, the state is what is held: closed, and no record under it.
      expect([200, 410]).toContain(res.status)
      expect(record()).toBeNull()
      expect(markers()).toEqual([closedKey(ID, day())])
      expect((await report()).status).toBe(410)
      expect(record()).toBeNull()
    })
  }

  it('a report that finishes first answers 200, and a DELETE after it leaves the same closed state', async () => {
    const first = await report()
    expect(first.status).toBe(200)
    expect(record()).not.toBeNull()
    await forget()
    expect(record()).toBeNull()
    expect(markers()).toEqual([closedKey(ID, day())])
    expect((await report()).status).toBe(410)
  })
})

describe('when the report’s own checks fail', () => {
  it('the markers cannot be looked up before it writes: 503, nothing is written', async () => {
    blobs.failOn({ store: CLOSED_STORE, op: 'list', nth: 1 })
    const res = await report()
    expect(res.status).toBe(503)
    expect(record()).toBeNull()
  })

  it('the markers cannot be looked up after it writes: 503, not a success; the record is not deleted on a guess, and a closed code retires it', async () => {
    // A DELETE lands between the report's read and its write, so a marker is there; then the second look fails.
    blobs.before('setJSON', ID, () => forget(), 'progress')
    blobs.failOn({ store: CLOSED_STORE, op: 'list', nth: 2 })
    const res = await report()
    expect(res.status).toBe(503)
    expect(record()).not.toBeNull() // written, unchecked, stranded under the marker
    expect(markers()).toEqual([closedKey(ID, day())])
    // Resolved by a refused report: the next one finds the marker and removes what is under it.
    expect((await report()).status).toBe(410)
    expect(record()).toBeNull()
  })

  it('the markers cannot be looked up after it writes and no marker exists: 503, and the record is left, since the code may be open', async () => {
    blobs.failOn({ store: CLOSED_STORE, op: 'list', nth: 2 })
    const res = await report()
    expect(res.status).toBe(503)
    expect(res.status).not.toBe(200)
    expect(record()).not.toBeNull()
  })

  it('the compensating delete fails: still refused (410), the record stays under the marker, and a retry or the sweep removes it', async () => {
    // The DELETE lands between the report's read and its write; only then is the failure armed, so it is the report's own
    // compensating delete that fails, whatever the DELETE did or did not call.
    blobs.before(
      'setJSON',
      ID,
      async () => {
        await forget()
        blobs.failOn({ store: 'progress', op: 'delete', key: ID })
      },
      'progress',
    )
    const res = await report()
    expect(res.status).toBe(410) // a refusal, not a success
    expect(record()).not.toBeNull() // stranded
    expect(markers()).toEqual([closedKey(ID, day())])
    // The sweep resolves it, and keeps the young marker.
    expect(await sweepClosures(Date.now())).toEqual({ stranded: 1, closures: 0, errors: 0 })
    expect(record()).toBeNull()
    expect(markers()).toEqual([closedKey(ID, day())])
  })

  it('a record stranded under a marker is also resolved by a retry of the DELETE', async () => {
    blobs.put('progress', ID, THE_RECORD)
    blobs.put(CLOSED_STORE, closedKey(ID, day()), { at: day() })
    const res = await forget()
    expect(res.status).toBe(200)
    expect(record()).toBeNull()
  })
})

describe('the weekly sweep of closures', () => {
  it('deletes a stranded record before it considers the marker, and keeps a young marker', async () => {
    blobs.put('progress', ID, THE_RECORD)
    blobs.put(CLOSED_STORE, closedKey(ID, day()), { at: day() })
    expect(await sweepClosures(Date.now())).toEqual({ stranded: 1, closures: 0, errors: 0 })
    expect(record()).toBeNull()
    expect(markers()).toEqual([closedKey(ID, day())])
  })

  it('a record it cannot delete keeps its marker, even an old one, so the next run finds the evidence', async () => {
    const OLD = closedKey(ID, '2026-09-01')
    blobs.put('progress', ID, THE_RECORD)
    blobs.put(CLOSED_STORE, OLD, { at: '2026-09-01' })
    blobs.failOn({ store: 'progress', op: 'delete', key: ID })
    expect(await sweepClosures(at('2026-10-04'))).toEqual({ stranded: 0, closures: 0, errors: 1 })
    expect(markers()).toEqual([OLD])
    expect(record()).not.toBeNull()
    expect(await sweepClosures(at('2026-10-04'))).toEqual({ stranded: 1, closures: 1, errors: 0 })
    expect(markers()).toEqual([])
    expect(record()).toBeNull()
  })

  it('the earliest eligible removal is the third UTC midnight: a marker dated D is kept through D+2 and goes at the start of D+3', async () => {
    const key = closedKey(ID, '2026-10-01')
    blobs.put(CLOSED_STORE, key, { at: '2026-10-01' })
    expect(CLOSED_DAYS).toBe(2)
    expect(await sweepClosures(Date.parse('2026-10-03T23:59:59.999Z'))).toEqual({ stranded: 0, closures: 0, errors: 0 })
    expect(markers()).toEqual([key])
    expect(await sweepClosures(Date.parse('2026-10-04T00:00:00.000Z'))).toEqual({ stranded: 0, closures: 1, errors: 0 })
    expect(markers()).toEqual([])
  })

  it('protection is at least two full days whatever the hour it was written, and none once the marker is gone', async () => {
    clockAt('2026-10-01T23:59:00Z')
    blobs.put('progress', ID, THE_RECORD)
    await forget()
    vi.setSystemTime(new Date('2026-10-03T23:59:59Z'))
    expect(await sweepClosures(Date.now())).toEqual({ stranded: 0, closures: 0, errors: 0 })
    expect((await report()).status).toBe(410)
    vi.setSystemTime(new Date('2026-10-04T00:00:00Z'))
    expect(await sweepClosures(Date.now())).toEqual({ stranded: 0, closures: 1, errors: 0 })
    // After physical removal a report under the code succeeds again, which is why nothing says "never".
    expect((await report()).status).toBe(200)
  })

  it('a marker that is present refuses, whatever its day: an old one the sweep has not yet removed still protects', async () => {
    blobs.put(CLOSED_STORE, closedKey(ID, '2026-09-01'), { at: '2026-09-01' })
    expect((await report()).status).toBe(410)
    await sweepClosures(Date.now())
    expect((await report()).status).toBe(200)
  })

  it('a DELETE that lands just before the sweep deletes an old marker is not undone by it: it is another key', async () => {
    const OLD = closedKey(ID, '2026-09-01')
    blobs.put(CLOSED_STORE, OLD, { at: '2026-09-01' })
    blobs.before('delete', OLD, async () => expect((await forget()).status).toBe(404), CLOSED_STORE)
    expect(await sweepClosures(Date.now())).toEqual({ stranded: 0, closures: 1, errors: 0 })
    expect(markers()).toEqual([closedKey(ID, day())])
    expect((await report()).status).toBe(410)
    expect(record()).toBeNull()
  })

  it('a DELETE that lands before the sweep lists leaves the old marker removed and the fresh one in place', async () => {
    blobs.put(CLOSED_STORE, closedKey(ID, '2026-09-01'), { at: '2026-09-01' })
    blobs.before('list', '', () => forget(), CLOSED_STORE)
    expect(await sweepClosures(Date.now())).toEqual({ stranded: 0, closures: 1, errors: 0 })
    expect(markers()).toEqual([closedKey(ID, day())])
  })

  it('a marker whose key carries no day, or a code this route could not have written, goes once nothing is under its code', async () => {
    blobs.put('progress', ID, THE_RECORD)
    blobs.put(CLOSED_STORE, `${ID}/last-spring`, {})
    blobs.put(CLOSED_STORE, 'not-a-code/2026-09-01', {})
    expect(await sweepClosures(Date.now())).toEqual({ stranded: 1, closures: 2, errors: 0 })
    expect(markers()).toEqual([])
    expect(record()).toBeNull()
  })

  it('the whole sweep reports them, and counts a failure in its errors', async () => {
    blobs.put('progress', ID, THE_RECORD)
    blobs.put(CLOSED_STORE, closedKey(ID, '2026-09-01'), { at: '2026-09-01' })
    const swept = await sweepAll()
    expect(swept).toMatchObject({ stranded: 1, closures: 1, errors: 0 })
  })
})

describe('the cleaners of expired step counts, and a closure that lands while they run', () => {
  /** The ordering: the cleaner has read an expired record; a DELETE lands; the cleaner resumes and deletes; a late report arrives. */
  async function lands(clean: () => Promise<unknown>) {
    blobs.put('progress', ID, EXPIRED)
    blobs.before('delete', ID, async () => expect([200, 404]).toContain((await forget()).status), 'progress')
    await clean()
    // The closure survived the cleaner, and the late report is refused.
    expect(markers()).toEqual([closedKey(ID, day())])
    expect(record()).toBeNull()
    expect((await report()).status).toBe(410)
    expect(record()).toBeNull()
  }

  it('the readout’s own cleanup of an expired record', async () => {
    await lands(async () => expect((await tally()).status).toBe(200))
  })

  it('the weekly sweep of expired records', async () => {
    await lands(sweepAll)
  })

  it('neither opens the marker store: it is separate, so what they read, count, export and delete cannot include a marker', async () => {
    blobs.put('progress', ID, EXPIRED)
    blobs.put(CLOSED_STORE, closedKey(ID, day()), { at: day() })
    blobs.log.length = 0
    await tally()
    const { sweepExpired } = await import('../netlify/functions/sweep')
    await sweepExpired(blobs.store('couples') as never, blobs.store('progress') as never, Date.now())
    expect(blobs.log.filter((c) => c.store === CLOSED_STORE)).toEqual([])
    expect(markers()).toEqual([closedKey(ID, day())])
  })
})
