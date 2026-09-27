import { beforeEach, describe, expect, it, vi } from 'vitest'
import { memStore, stores } from './support/memory'

/**
 * The weekly sweep: lapsed maps, expired couple sheets and step counts past
 * their year go on a schedule, so what Trust says about how long each lives
 * stays true whether or not anyone remembers (docs/PRODUCT.md R3).
 */

vi.mock('@netlify/blobs', async () => (await import('./support/memory')).memoryModule)

const { default: handler, config } = await import('../netlify/functions/sweep')
const run = () => handler(new Request('http://x/.netlify/functions/sweep', { method: 'POST', body: '{"next_run":"2026-09-27T00:00:00Z"}' }))

const LIVE = '2099-01-01'
const LAPSED = '2025-09-01'

beforeEach(() => stores.clear())

describe('the weekly sweep', () => {
  it('runs on a schedule, weekly', () => {
    expect(config.schedule).toBe('@weekly')
  })

  it('takes a kept map past its year, and leaves a live one', async () => {
    memStore('maps').setJSON('BCDFGH', { snapshot: {}, createdAt: '2025-01-01', expiresAt: LAPSED })
    memStore('maps').setJSON('JKMNPQ', { snapshot: {}, createdAt: '2026-01-01', expiresAt: LIVE })
    const res = await run()
    expect(res.status).toBe(200)
    expect((await res.json()).swept).toMatchObject({ maps: 1 })
    expect([...stores.get('maps')!.keys()]).toEqual(['JKMNPQ'])
  })

  it('is idempotent — a second run finds nothing to take', async () => {
    memStore('maps').setJSON('BCDFGH', { snapshot: {}, createdAt: '2025-01-01', expiresAt: LAPSED })
    await run()
    const again = await run()
    expect((await again.json()).swept).toEqual({ maps: 0, couples: 0, progress: 0, journals: 0, introductions: 0, withdrawn: 0, markers: 0, errors: 0 })
  })

  // From 2026-09-24 to 2026-09-27 the sweep emptied these three stores every
  // week because the door and the vouch had been removed. Two real women had
  // asked, through the door, to be introduced; the sweep took the only way to
  // reach them, on no promise anyone had made (docs/DECISIONS.md Part 22). A
  // retired feature is not a lifetime, and the sweep removes nothing on it.
  it('leaves what the door and the vouch left behind exactly as it found it, whatever is in it', async () => {
    memStore('cohort').setJSON('us/twin-cities/woman/city/serious/ACDEFG', { at: '2026-09-01', ledger: [] })
    memStore('cohort').set('index/ACDEFG', 'us/twin-cities/woman/city/serious/ACDEFG')
    memStore('contacts').setJSON('ACDEFG', { contact: 'x@example.com', scene: 'twin-cities', country: 'us', at: '2026-09-01' })
    memStore('vouches').setJSON('ACDEFG', { relationship: 'father', firstName: 'Cabdi', sentence: 's', phone: '+1 555', at: 'd' })
    const before = Object.fromEntries(['cohort', 'contacts', 'vouches'].map((s) => [s, [...stores.get(s)!.entries()]]))
    const res = await run()
    expect(res.status).toBe(200)
    expect((await res.json()).swept).not.toHaveProperty('retired')
    for (const store of ['cohort', 'contacts', 'vouches']) expect([...stores.get(store)!.entries()], store).toEqual(before[store])
  })

  it('names every store it holds off, so a pass over one cannot come back unnoticed', async () => {
    const { HELD_STORES } = await import('../netlify/functions/sweep')
    expect([...HELD_STORES].sort()).toEqual(['cohort', 'contacts', 'vouches'])
  })
})

// A name on the introduction list goes on its scheduled day: the Sunday on
// or before its 180th day, which is a day the sweep runs (docs/DECISIONS.md
// decision 32; docs/BATCH-01-PLAN.md D3). The screen and the founder's list
// name the same day, so a name is never deleted while a phone still shows it
// as scheduled for later, and never shown as scheduled after it has gone.
describe('the introduction list, on its scheduled day', () => {
  // Put down on a Thursday; its 180th day is Tuesday 2026-06-30, so it goes on Sunday the 28th.
  const PUT = '2026-01-01'
  const GOES = '2026-06-28'
  const at = (d: string) => Date.parse(`${d}T00:00:00Z`)
  const name = (when: unknown = PUT) => ({ contact: 'x@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', adult: true, at: when, v: 1 })

  it('keeps a name the day before its Sunday', async () => {
    const { sweepIntroductions } = await import('../netlify/functions/sweep')
    const { removeOn } = await import('../netlify/functions/introduce')
    expect(removeOn(PUT)).toBe(GOES)
    memStore('introductions').setJSON('HJKMNPQR', name())
    expect(await sweepIntroductions(memStore('introductions') as never, at('2026-06-27'))).toEqual({ introductions: 0, withdrawn: 0, markers: 0, errors: 0 })
    expect(stores.get('introductions')!.size).toBe(1)
  })

  it('removes it on that Sunday — the day the screen and the founder’s list name', async () => {
    const { sweepIntroductions } = await import('../netlify/functions/sweep')
    memStore('introductions').setJSON('HJKMNPQR', name())
    expect(await sweepIntroductions(memStore('introductions') as never, at(GOES))).toEqual({ introductions: 1, withdrawn: 0, markers: 0, errors: 0 })
    expect(stores.get('introductions')!.size).toBe(0)
  })

  it('and on any later run, if that Sunday’s failed', async () => {
    const { sweepIntroductions } = await import('../netlify/functions/sweep')
    memStore('introductions').setJSON('HJKMNPQR', name())
    expect(await sweepIntroductions(memStore('introductions') as never, at('2026-07-05'))).toEqual({ introductions: 1, withdrawn: 0, markers: 0, errors: 0 })
  })

  it('removes a name nothing can date, or nothing can read', async () => {
    const { sweepIntroductions } = await import('../netlify/functions/sweep')
    memStore('introductions').setJSON('ACDEFGHJ', { ...name(), at: undefined })
    memStore('introductions').setJSON('KMNPQRTW', name('last spring'))
    memStore('introductions').set('XY347989', 'not json {')
    memStore('introductions').setJSON('HJKMNPQR', name('2026-09-01'))
    const out = await sweepIntroductions(memStore('introductions') as never, at('2026-09-10'))
    expect(out).toEqual({ introductions: 3, withdrawn: 0, markers: 0, errors: 0 })
    expect([...stores.get('introductions')!.keys()]).toEqual(['HJKMNPQR'])
  })

  it('removes a withdrawal marker once its own day is two full days behind, and keeps a fresher one', async () => {
    // The day is in the key (`withdrawn/<code>/<day>`); a marker two days
    // old to the day is kept, since it may have been written a minute before
    // midnight; one without a readable day goes.
    const { sweepIntroductions } = await import('../netlify/functions/sweep')
    const now = at('2026-09-10')
    memStore('introductions').setJSON('withdrawn/ACDEFGHJ/2026-09-09', { at: '2026-09-09' })
    memStore('introductions').setJSON('withdrawn/HJKMNPQR/2026-09-08', { at: '2026-09-08' })
    memStore('introductions').setJSON('withdrawn/KMNPQRTW/2026-09-07', { at: '2026-09-07' })
    memStore('introductions').setJSON('withdrawn/QRTWXY34', {})
    const out = await sweepIntroductions(memStore('introductions') as never, now)
    expect(out).toEqual({ introductions: 0, withdrawn: 0, markers: 2, errors: 0 })
    expect([...stores.get('introductions')!.keys()]).toEqual(['withdrawn/ACDEFGHJ/2026-09-09', 'withdrawn/HJKMNPQR/2026-09-08'])
  })

  it('a store that does not answer costs that name a week, and nothing else goes', async () => {
    const { sweepIntroductions } = await import('../netlify/functions/sweep')
    memStore('introductions').setJSON('ACDEFGHJ', name())
    memStore('introductions').setJSON('HJKMNPQR', name())
    const real = memStore('introductions')
    const flaky = { ...real, list: () => real.list(), delete: (k: string) => real.delete(k), get: async (k: string, o: unknown) => {
      if (k === 'ACDEFGHJ') throw new Error('blobs down')
      return (real.get as (k: string, o: unknown) => unknown)(k, o)
    } }
    const out = await sweepIntroductions(flaky as never, at('2026-07-19'))
    expect(out).toEqual({ introductions: 1, withdrawn: 0, markers: 0, errors: 1 })
    expect([...stores.get('introductions')!.keys()]).toEqual(['ACDEFGHJ'])
  })

  it('runs as part of the weekly sweep, and says how many it took', async () => {
    memStore('introductions').setJSON('HJKMNPQR', name('2025-01-01'))
    memStore('introductions').setJSON('ACDEFGHJ', name('2099-01-01'))
    const res = await run()
    expect((await res.json()).swept).toMatchObject({ introductions: 1, withdrawn: 0, markers: 0, errors: 0 })
    expect([...stores.get('introductions')!.keys()]).toEqual(['ACDEFGHJ'])
  })
})

describe('the weekly sweep, continued', () => {
  it('takes a couple sheet past its ninety days, and leaves one inside them', async () => {
    memStore('couples').setJSON('ACDEFG', { creator: 'woman', first: {}, createdAt: 'd', expiresAt: LIVE })
    memStore('couples').setJSON('HJKMNP', { creator: 'woman', first: {}, createdAt: 'd', expiresAt: LAPSED })
    const res = await run()
    expect((await res.json()).swept.couples).toBe(1)
    // The expired sheet is gone; what it leaves is its reporting window — a
    // date, and nothing about either of them (netlify/shared/sheet.ts).
    expect([...stores.get('couples')!.keys()].sort()).toEqual(['ACDEFG', 'gone/HJKMNP'])
    const gone = JSON.parse(stores.get('couples')!.get('gone/HJKMNP')!)
    expect(Object.keys(gone)).toEqual(['expiresAt'])
    // A day, never the moment, like every other date in every store.
    expect(gone.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('takes a step count past its year — unless it reached married, which is kept by rule', async () => {
    memStore('progress').setJSON('ACDEFGHJ', { first: { arrived: 'd' }, expiresAt: LIVE })
    memStore('progress').setJSON('HJKMNPQR', { first: { arrived: 'd' }, expiresAt: LAPSED })
    memStore('progress').setJSON('QRTWXY34', { first: { arrived: 'd', married: 'd' }, expiresAt: LAPSED })
    const res = await run()
    expect((await res.json()).swept.progress).toBe(1)
    expect([...stores.get('progress')!.keys()].sort()).toEqual(['ACDEFGHJ', 'QRTWXY34'])
  })

  it('never touches a report, a tally or a limit', async () => {
    memStore('reports').set('HJKMNP-woman-ACDEFGHJKM', '{}')
    memStore('tallies').set('joint', '{}')
    await run()
    expect(stores.get('reports')!.size).toBe(1)
    expect(stores.get('tallies')!.size).toBe(1)
  })
})
