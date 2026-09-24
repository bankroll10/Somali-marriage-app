import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { memStore, stores } from './support/memory'

/**
 * The backup exists because everything this product knows lives in one
 * vendor's storage with no copy anywhere. What matters structurally is what it
 * hands back — the learning record, whole — and what it refuses to: anyone's
 * answers, anyone's phone number, and any code that unlocks a map.
 */

vi.mock('@netlify/blobs', async () => (await import('./support/memory')).memoryModule)

const { default: handler } = await import('../netlify/functions/export')

const get = (headers: Record<string, string> = FOUNDER) =>
  handler(new Request('http://x/.netlify/functions/export', { headers }))
/** The founder's key, set for every test: a readout never answers without one (netlify/shared/founder.ts). */
const FOUNDER_KEY = 'test-founder-key'
const FOUNDER = { authorization: `Bearer ${FOUNDER_KEY}` }
beforeEach(() => vi.stubEnv('FOUNDER_KEY', FOUNDER_KEY))
afterEach(() => vi.unstubAllEnvs())


/** One of everything a real site would hold, including what must not come back. */
function seed() {
  memStore('progress').setJSON('ACDEFG', {
    first: { arrived: '2026-09-01', read: '2026-09-03', married: '2026-09-30' },
    scene: 'toronto',
    via: 'words',
    facts: { read: { band: 'mixed', thin: 'public' }, ended: [{ stage: 'talking', reason: 'his-read', which: 'public' }] },
    expiresAt: '2027-09-01',
  })
  memStore('progress').setJSON('HJKMNP', { first: { arrived: '2026-09-02' }, expiresAt: '2027-09-02' })
  memStore('tallies').setJSON('joint', { pairs: 2, topics: { 'money-home': { 'both-agree': 2 } } })
  // The stores the backup must never touch — and what the door and the vouch
  // left behind, until the sweep empties it.
  memStore('maps').setJSON('QRTWXY', { snapshot: { identity: { firstName: 'Sagal' }, answers: { healing: 'fresh' } } })
  memStore('cohort').setJSON('ca/toronto/woman/country/family/QRTWXY', { at: '2026-09-01', ledger: ['map', 'read'] })
  memStore('contacts').setJSON('QRTWXY', { contact: 'sagal@example.com', at: '2026-09-01' })
  memStore('vouches').setJSON('QRTWXY', {
    relationship: 'father',
    firstName: 'Cabdi',
    sentence: 'She is my daughter and she means this.',
    phone: '+1 612 555 0100',
    at: '2026-09-01',
  })
  memStore('couples').setJSON('ACDEFJ', { creator: 'woman', first: { live: 'agree' }, second: { live: 'differ' } })
}

beforeEach(() => {
  stores.clear()
  seed()
})

describe('the backup', () => {
  it('hands back every progress record whole — the part nobody could recreate', async () => {
    const body = await (await get()).json()
    expect(body.version).toBe(3)
    expect(Object.keys(body.progress).sort()).toEqual(['ACDEFG', 'HJKMNP'])
    expect(body.progress.ACDEFG.facts.ended).toEqual([{ stage: 'talking', reason: 'his-read', which: 'public' }])
    expect(body.progress.ACDEFG.first.married).toBe('2026-09-30')
    expect(body.joint).toEqual({ pairs: 2, topics: { 'money-home': { 'both-agree': 2 } } })
  })

  it('leaves out a step count past its year — the backup keeps nothing the store has let go', async () => {
    // docs/PRIVACY.md R3: the backup checked no date at all, so a record the
    // store was done with went on into the founder's files and the artifact.
    // A married record is kept by rule, lapsed or not.
    memStore('progress').setJSON('QRTWXY34', { first: { arrived: '2025-01-01' }, expiresAt: '2025-09-01' })
    memStore('progress').setJSON('KMNPQRTW', { first: { arrived: '2024-01-01', married: '2024-06-01' }, expiresAt: '2025-06-01' })
    const body = await (await get()).json()
    expect(Object.keys(body.progress).sort()).toEqual(['ACDEFG', 'HJKMNP', 'KMNPQRTW'])
  })

  it('refuses to carry anyone’s answers, name, phone or the code to a map', async () => {
    const raw = await (await get()).text()
    for (const secret of ['Sagal', 'sagal@example.com', 'Cabdi', 'my daughter', '612 555', 'healing', 'fresh', 'QRTWXY', 'ACDEFJ']) {
      expect(raw, `the backup must not contain ${secret}`).not.toContain(secret)
    }
    const body = JSON.parse(raw)
    expect(body.maps).toBeUndefined()
    expect(body.vouches).toBeUndefined()
    expect(body.couples).toBeUndefined()
    expect(body.cohort).toBeUndefined()
    expect(body.door).toBeUndefined()
    // And it says so in the file, so a reader is never misled about what this is.
    expect(body.omitted.length).toBe(2)
    expect(body.omitted.join(' ')).toMatch(/maps/)
    expect(body.omitted.join(' ')).toMatch(/couples/)
  })

  it('is the founder’s, and downloads as a dated file', async () => {
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    expect((await get({})).status).toBe(401)
    vi.stubEnv('FOUNDER_KEY', '')
    expect((await get()).status).toBe(401)
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    expect((await get({ authorization: 'Bearer wrong' })).status).toBe(401)
    const res = await get({ authorization: 'Bearer open-sesame' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="niyyah-backup-\d{4}-\d{2}-\d{2}\.json"$/)
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('reads, and never writes', async () => {
    expect((await handler(new Request('http://x/.netlify/functions/export', { method: 'POST' }))).status).toBe(405)
    expect((await handler(new Request('http://x/.netlify/functions/export', { method: 'DELETE' }))).status).toBe(405)
  })

  it('is empty rather than broken on a site nobody has used yet', async () => {
    stores.clear()
    const body = await (await get()).json()
    expect(body.progress).toEqual({})
    expect(body.joint).toBeNull()
  })
})
