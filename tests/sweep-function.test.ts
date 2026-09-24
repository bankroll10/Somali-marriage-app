import { beforeEach, describe, expect, it, vi } from 'vitest'
import { memStore, stores } from './support/memory'

/**
 * The weekly sweep: what the founder's `/pool?sweep=1` does, for every pool,
 * on a schedule — so the way to reach someone lives exactly as long as her
 * map whether or not anyone remembers (docs/RISKS.md R3).
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
    memStore('contacts').setJSON('ACDEFG', { contact: 'x@example.com', at: '2026-09-01' })
    await run()
    const again = await run()
    expect((await again.json()).swept).toEqual({ maps: 0, couples: 0, progress: 0, journals: 0, retired: 0, errors: 0 })
  })

  // The door and the family vouch were removed on 2026-09-24. What they left
  // on the server — a way to reach someone, a relative's name, sentence and
  // phone — is read by nothing, so it is kept by nothing.
  it('empties the stores the door and the vouch left behind, whatever is in them', async () => {
    memStore('cohort').setJSON('us/twin-cities/woman/city/serious/ACDEFG', { at: '2026-09-01', ledger: [] })
    memStore('cohort').set('index/ACDEFG', 'us/twin-cities/woman/city/serious/ACDEFG')
    memStore('contacts').setJSON('ACDEFG', { contact: 'x@example.com', scene: 'twin-cities', country: 'us', at: '2026-09-01' })
    memStore('vouches').setJSON('ACDEFG', { relationship: 'father', firstName: 'Cabdi', sentence: 's', phone: '+1 555', at: 'd' })
    const res = await run()
    expect((await res.json()).swept.retired).toBe(4)
    for (const store of ['cohort', 'contacts', 'vouches']) expect(stores.get(store)!.size, store).toBe(0)
  })

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
