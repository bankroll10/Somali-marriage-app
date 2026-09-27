import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { memStore, stores } from './support/memory'
import { day } from '../netlify/shared/day'

/**
 * The introduction list (netlify/functions/introduce.ts): a name put down for
 * an introduction made by hand, and nothing else about the person.
 *
 * What these hold: exactly the six fields the screen names are written, under
 * a minted code, and "saved" is said only when they are; anything a client
 * might send beyond them — answers, an age, a map — is never stored; the
 * founder reads the list whole and nobody else does; a name comes off by its
 * code; and no name is shown past its 180 days, which the weekly sweep
 * enforces (tests/sweep-function.test.ts).
 */

vi.mock('@netlify/blobs', async () => (await import('./support/memory')).memoryModule)

const { default: handler, INTRODUCTION_KEYS, LIST_DAYS, reachable, removeBy, countryOf } = await import('../netlify/functions/introduce')

/** A day `n` days before today: fixtures stay inside the list's 180 days whenever the suite runs. */
const ago = (n: number) => day(Date.now() - n * 24 * 60 * 60 * 1000)

const post = (body: unknown) => handler(new Request('http://x/.netlify/functions/introduce', { method: 'POST', body: JSON.stringify(body) }))
const list = (headers: Record<string, string> = {}) => handler(new Request('http://x/.netlify/functions/introduce', { headers }))
const off = (code: string) => handler(new Request(`http://x/.netlify/functions/introduce?code=${code}`, { method: 'DELETE' }))
const stored = (code: string) => JSON.parse(stores.get('introductions')!.get(code)!) as Record<string, unknown>
const OK = { contact: 'sagal@example.com', gender: 'woman', scene: 'twin-cities' }
const FOUNDER = { authorization: 'Bearer k' }

beforeEach(() => {
  stores.clear()
  vi.unstubAllEnvs()
})
afterEach(() => vi.restoreAllMocks())

describe('putting a name down', () => {
  it('writes exactly what the screen says, under a minted code, and says saved only then', async () => {
    const res = await post(OK)
    expect(res.status).toBe(200)
    const { saved, code } = (await res.json()) as { saved: boolean; code: string }
    expect(saved).toBe(true)
    expect(code).toMatch(/^[ACDEFGHJKMNPQRTWXY34789]{8}$/)
    // Her city brings its country; silence about how far means her city; the day, never the moment.
    expect(stored(code)).toEqual({ contact: 'sagal@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', at: day(), v: 1 })
  })

  it('keeps her first name when she gives one, trimmed and bounded, and nothing when she does not', async () => {
    const { code } = await (await post({ ...OK, firstName: '  Sagal  ' })).json()
    expect(stored(code).firstName).toBe('Sagal')
    const { code: long } = await (await post({ ...OK, firstName: 'S'.repeat(80) })).json()
    expect((stored(long).firstName as string).length).toBe(40)
    const { code: none } = await (await post({ ...OK, firstName: '   ' })).json()
    expect('firstName' in stored(none)).toBe(false)
  })

  it('somewhere else needs a country; a named city brings its own and ignores one sent', async () => {
    expect((await post({ ...OK, scene: 'other' })).status).toBe(400)
    expect((await (await post({ ...OK, scene: 'other' })).json()).error).toBe('bad_country')
    expect((await post({ ...OK, scene: 'other', country: 'mars' })).status).toBe(400)
    const { code } = await (await post({ ...OK, scene: 'other', country: 'de' })).json()
    expect(stored(code)).toMatchObject({ scene: 'other', country: 'de' })
    const { code: named } = await (await post({ ...OK, scene: 'london', country: 'de' })).json()
    expect(stored(named).country).toBe('uk')
    expect(countryOf('bristol', 'de')).toBe('uk')
    expect(countryOf('other', 'de')).toBe('de')
    expect(countryOf('other', undefined)).toBeNull()
    expect(countryOf('mars', 'de')).toBeNull()
  })

  it('takes how far she would go, from the two answers only', async () => {
    const { code } = await (await post({ ...OK, reach: 'country' })).json()
    expect(stored(code).reach).toBe('country')
    for (const bad of ['anywhere', 'mars', 7, '']) expect((await post({ ...OK, reach: bad })).status, String(bad)).toBe(400)
  })

  it('refuses what could never reach anyone, and stores nothing', async () => {
    for (const contact of ['', '   ', 'sagal', 'sagal@gmial', '612 555', `${'x'.repeat(200)}@example.com`, 7]) {
      const res = await post({ ...OK, contact })
      expect(res.status, JSON.stringify(contact)).toBe(400)
      expect((await res.json()).error).toBe('bad_contact')
    }
    expect(stores.get('introductions')?.size ?? 0).toBe(0)
    // And what can: an ordinary email, an ordinary number, either way it is written.
    for (const contact of ['sagal@example.com', 'sagal.h@mail.co.uk', '612 555 0148', '+44 7700 900123', '(612) 555-0148']) {
      expect(reachable(contact), contact).toBe(true)
      expect((await post({ ...OK, contact })).status).toBe(200)
    }
  })

  it('refuses a side or a city off the lists', async () => {
    expect((await (await post({ ...OK, gender: 'person' })).json()).error).toBe('bad_gender')
    expect((await (await post({ ...OK, gender: undefined })).json()).error).toBe('bad_gender')
    expect((await (await post({ ...OK, scene: 'mars' })).json()).error).toBe('bad_scene')
    expect(stores.get('introductions')?.size ?? 0).toBe(0)
  })

  it('stores nothing but the six fields, whatever else a client sends — no answers, no age, no map', async () => {
    const { code } = await (await post({ ...OK, firstName: 'Sagal', answers: { timeline: '1-2' }, age: 27, snapshot: { identity: {} }, ledger: ['map'], hook: 'serious' })).json()
    const record = stored(code)
    for (const key of Object.keys(record)) expect(INTRODUCTION_KEYS as readonly string[], key).toContain(key)
    const text = JSON.stringify(record)
    for (const leak of ['answers', 'timeline', '"age"', 'snapshot', 'ledger', 'hook']) expect(text).not.toContain(leak)
  })

  it('never lands on a name already there', async () => {
    // The same drawing trick as tests/keep-function.test.ts: the first code
    // drawn is taken, so the write must move on rather than write over it.
    const ALPHABET = 'ACDEFGHJKMNPQRTWXY34789'
    const queue = ['AAAAAAAA', 'CCCCCCCC'].flatMap((c) => [...c].map((ch) => ALPHABET.indexOf(ch)))
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) array[i] = queue.shift() ?? 0
      return array
    }) as never)
    const hers = { contact: 'hodan@example.com', gender: 'woman', scene: 'london', country: 'uk', reach: 'city', at: '2026-09-01', v: 1 }
    memStore('introductions').setJSON('AAAAAAAA', hers)
    const { code } = await (await post(OK)).json()
    expect(code).toBe('CCCCCCCC')
    expect(stored('AAAAAAAA')).toEqual(hers)
  })

  it('refuses a body that is not an object, and measures one before parsing it', async () => {
    for (const raw of ['null', '[]', '"x"']) {
      const res = await handler(new Request('http://x/.netlify/functions/introduce', { method: 'POST', body: raw }))
      expect(res.status).toBe(400)
    }
    const huge = JSON.stringify({ ...OK, firstName: 'x'.repeat(5_000) })
    expect((await handler(new Request('http://x/.netlify/functions/introduce', { method: 'POST', body: huge }))).status).toBe(413)
  })
})

describe('the founder’s list', () => {
  it('returns every name, oldest first, with its code and the counts by city and side — never cached', async () => {
    vi.stubEnv('FOUNDER_KEY', 'k')
    memStore('introductions').setJSON('AAAAAAAA', { contact: 'b@example.com', gender: 'man', scene: 'london', country: 'uk', reach: 'country', at: ago(7), v: 1 })
    memStore('introductions').setJSON('CCCCCCCC', { contact: 'a@example.com', firstName: 'Sagal', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', at: ago(17), v: 1 })
    memStore('introductions').setJSON('DDDDDDDD', { contact: 'c@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', at: ago(12), v: 1 })
    const res = await list(FOUNDER)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('no-store')
    const body = (await res.json()) as { people: { code: string; contact: string; at: string }[]; counts: Record<string, { women: number; men: number }>; total: number; skipped: number }
    expect(body.people.map((p) => p.code)).toEqual(['CCCCCCCC', 'DDDDDDDD', 'AAAAAAAA'])
    expect(body.people[0]).toMatchObject({ contact: 'a@example.com', firstName: 'Sagal' })
    expect(body.counts).toEqual({ 'twin-cities': { women: 2, men: 0 }, london: { women: 0, men: 1 } })
    expect(body.total).toBe(3)
    expect(body.skipped).toBe(0)
  })

  it('one record that cannot be read costs that record, never the list — and is counted', async () => {
    vi.stubEnv('FOUNDER_KEY', 'k')
    memStore('introductions').set('AAAAAAAA', 'not json {')
    memStore('introductions').set('CCCCCCCC', '"a string where a record goes"')
    memStore('introductions').setJSON('DDDDDDDD', { contact: 'c@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', at: ago(12), v: 1 })
    const body = (await (await list(FOUNDER)).json()) as { total: number; skipped: number }
    expect(body).toMatchObject({ total: 1, skipped: 2 })
  })

  // docs/DECISIONS.md decision 32. The sweep removes a name at the last run
  // before its 180th day; the list stops showing it on that day whatever the
  // sweep did, so a failed Sunday never puts a lapsed name in front of the
  // founder.
  it('shows each name with the day it comes off, and never one past its 180 days', async () => {
    vi.stubEnv('FOUNDER_KEY', 'k')
    expect(LIST_DAYS).toBe(180)
    expect(removeBy('2026-01-01')).toBe('2026-06-30')
    expect(removeBy('last spring')).toBeNull()
    memStore('introductions').setJSON('AAAAAAAA', { contact: 'in@example.com', gender: 'man', scene: 'twin-cities', country: 'us', reach: 'city', at: ago(179), v: 1 })
    memStore('introductions').setJSON('CCCCCCCC', { contact: 'zq.lapsed@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', at: ago(180), v: 1 })
    memStore('introductions').setJSON('DDDDDDDD', { contact: 'zq.undated@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', v: 1 })
    const res = await list(FOUNDER)
    const body = (await res.json()) as { people: { code: string; until: string }[]; total: number; skipped: number; lapsed: number }
    expect(body.people).toEqual([expect.objectContaining({ code: 'AAAAAAAA', until: day(Date.now() + 24 * 60 * 60 * 1000) })])
    expect(body).toMatchObject({ total: 1, lapsed: 1, skipped: 1 })
    const text = JSON.stringify(body)
    expect(text).not.toContain('zq.lapsed')
    expect(text).not.toContain('zq.undated')
  })

  it('answers nobody but the founder, and names nobody in the refusal', async () => {
    vi.stubEnv('FOUNDER_KEY', 'k')
    memStore('introductions').setJSON('AAAAAAAA', { contact: 'zq.secret@example.com', gender: 'man', scene: 'london', country: 'uk', reach: 'city', at: ago(7), v: 1 })
    const almost: Record<string, string>[] = [{}, { authorization: 'Bearer not-k' }]
    for (const headers of almost) {
      const res = await list(headers)
      expect(res.status).toBe(401)
      expect(await res.text()).not.toContain('zq.secret')
    }
  })
})

describe('taking a name off', () => {
  it('by its code: gone, and asking again is not found', async () => {
    const { code } = await (await post(OK)).json()
    expect((await off(code)).status).toBe(200)
    expect(stores.get('introductions')!.has(code)).toBe(false)
    expect((await off(code)).status).toBe(404)
  })

  it('needs a code the right shape, and takes nothing else', async () => {
    const { code } = await (await post(OK)).json()
    for (const bad of ['nope', 'ACDEFGHJKM', '']) expect((await off(bad)).status).toBe(400)
    expect(stores.get('introductions')!.has(code)).toBe(true)
  })

  it('anything but GET, POST or DELETE is refused', async () => {
    expect((await handler(new Request('http://x/.netlify/functions/introduce', { method: 'PUT' }))).status).toBe(405)
  })
})
