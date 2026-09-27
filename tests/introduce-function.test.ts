import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { memStore, stores } from './support/memory'
import { day } from '../netlify/shared/day'

/**
 * The introduction list (netlify/functions/introduce.ts): a name put down for
 * an introduction made by hand, and nothing else about the person.
 *
 * What these hold: exactly the fields the screen names are written, under the
 * code the phone sends (or one minted here for an older client), and "saved"
 * is said only when they are, with the server's own two days; the same
 * request under the same code is answered once, never written twice, and a
 * different request under a code that exists is refused, never written over;
 * a withdrawal leaves a marker that a late request finds; the affirmation
 * of adulthood is required and stored as one boolean; anything a client might
 * send beyond the fields — answers, an age, a map — is never stored; the
 * founder reads the list whole and nobody else does; and no name is shown on
 * or past its scheduled day, which the weekly sweep enforces
 * (tests/sweep-function.test.ts). The interleavings are in
 * tests/introduce-race.test.ts.
 */

vi.mock('@netlify/blobs', async () => (await import('./support/memory')).memoryModule)

const { default: handler, INTRODUCTION_KEYS, LIST_DAYS, WITHDRAWN_DAYS, reachable, removeOn, countryOf, sameRequest } = await import('../netlify/functions/introduce')

/** A day `n` days before today: fixtures stay inside the list's 180 days whenever the suite runs. */
const ago = (n: number) => day(Date.now() - n * 24 * 60 * 60 * 1000)

const post = (body: unknown) => handler(new Request('http://x/.netlify/functions/introduce', { method: 'POST', body: JSON.stringify(body) }))
const list = (headers: Record<string, string> = {}) => handler(new Request('http://x/.netlify/functions/introduce', { headers }))
const off = (code: string) => handler(new Request(`http://x/.netlify/functions/introduce?code=${code}`, { method: 'DELETE' }))
const stored = (code: string) => JSON.parse(stores.get('introductions')!.get(code)!) as Record<string, unknown>
const keys = () => [...(stores.get('introductions')?.keys() ?? [])].sort()
const OK = { contact: 'sagal@example.com', gender: 'woman', scene: 'twin-cities', adult: true }
/** The phone's own code for the request: minted there, held there, sent with it. */
const CODE = 'HJKMNPQR'
const FOUNDER = { authorization: 'Bearer k' }

type Receipt = { saved: boolean; code: string; at: string; removeOn: string; again?: boolean }

beforeEach(() => {
  stores.clear()
  vi.unstubAllEnvs()
})
afterEach(() => vi.restoreAllMocks())

describe('putting a name down', () => {
  it('writes exactly what the screen says, under the code the phone sent, and says saved with its own two days', async () => {
    const res = await post({ ...OK, code: CODE })
    expect(res.status).toBe(200)
    const body = (await res.json()) as Receipt
    expect(body).toEqual({ saved: true, code: CODE, at: day(), removeOn: removeOn(day()) })
    // Her city brings its country; silence about how far means her city; the day, never the moment.
    expect(stored(CODE)).toEqual({ contact: 'sagal@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', adult: true, at: day(), v: 1 })
  })

  it('an older client that sends no code is still minted one here', async () => {
    const res = await post(OK)
    expect(res.status).toBe(200)
    const { code, at, removeOn: goes } = (await res.json()) as Receipt
    expect(code).toMatch(/^[ACDEFGHJKMNPQRTWXY34789]{8}$/)
    expect(at).toBe(day())
    expect(goes).toBe(removeOn(day()))
    expect(stored(code).adult).toBe(true)
  })

  it('the same request under the same code is answered again, with the record’s own dates, and written once', async () => {
    memStore('introductions').setJSON(CODE, { ...OK, country: 'us', reach: 'city', at: '2026-01-01', v: 1 })
    const res = await post({ ...OK, code: CODE })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ saved: true, again: true, code: CODE, at: '2026-01-01', removeOn: '2026-06-28' })
    // Not rewritten: the day it was put down stands, so a retry cannot extend anything.
    expect(stored(CODE).at).toBe('2026-01-01')
    expect(keys()).toEqual([CODE])
  })

  it('a different request under a code that exists is refused, and nothing is written over', async () => {
    const hers = { ...OK, country: 'us', reach: 'city', at: '2026-01-01', v: 1 }
    memStore('introductions').setJSON(CODE, hers)
    for (const change of [{ contact: 'other@example.com' }, { firstName: 'Sagal' }, { gender: 'man' }, { scene: 'london' }, { reach: 'country' }]) {
      const res = await post({ ...OK, code: CODE, ...change })
      expect(res.status, JSON.stringify(change)).toBe(409)
      expect((await res.json()).error).toBe('taken')
    }
    expect(stored(CODE)).toEqual(hers)
    expect(sameRequest(hers as never, { ...hers, firstName: '' } as never)).toBe(true)
  })

  it('two requests under one code at once leave one record, and both are told the same two days', async () => {
    const [a, b] = await Promise.all([post({ ...OK, code: CODE }), post({ ...OK, code: CODE })])
    expect([a.status, b.status]).toEqual([200, 200])
    const [ra, rb] = (await Promise.all([a.json(), b.json()])) as Receipt[]
    expect([ra.again, rb.again].filter(Boolean)).toHaveLength(1)
    expect(ra.at).toBe(rb.at)
    expect(ra.removeOn).toBe(rb.removeOn)
    expect(keys()).toEqual([CODE])
  })

  it('a code already taken off is refused, and nothing is written under it', async () => {
    expect((await off(CODE)).status).toBe(200)
    const res = await post({ ...OK, code: CODE })
    expect(res.status).toBe(410)
    expect((await res.json()).error).toBe('withdrawn')
    expect(keys()).toEqual([`withdrawn/${CODE}/${day()}`])
  })

  it('a code of the wrong shape is refused before anything is read', async () => {
    for (const bad of ['nope', 'ACDEFGHJKM', 7, '']) expect((await post({ ...OK, code: bad })).status, String(bad)).toBe(400)
    expect(keys()).toEqual([])
  })

  it('requires the affirmation of adulthood, exactly true, and stores the boolean and nothing about age', async () => {
    for (const adult of [undefined, false, 'yes', 1, 'true']) {
      const res = await post({ ...OK, code: CODE, adult })
      expect(res.status, String(adult)).toBe(400)
      expect((await res.json()).error).toBe('bad_adult')
    }
    // A body shaped like the client from before this gate: no code, no affirmation.
    expect((await post({ contact: OK.contact, gender: 'woman', scene: 'twin-cities' })).status).toBe(400)
    expect(keys()).toEqual([])
    const { code } = (await (await post({ ...OK, age: 99 })).json()) as Receipt
    expect(stored(code).adult).toBe(true)
    expect(JSON.stringify(stored(code))).not.toContain('99')
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
    expect(keys()).toEqual([])
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
    expect(keys()).toEqual([])
  })

  it('stores nothing but the named fields, whatever else a client sends — no answers, no age, no map', async () => {
    const { code } = await (await post({ ...OK, firstName: 'Sagal', answers: { timeline: '1-2' }, age: 27, snapshot: { identity: {} }, ledger: ['map'], hook: 'serious' })).json()
    const record = stored(code)
    for (const key of Object.keys(record)) expect(INTRODUCTION_KEYS as readonly string[], key).toContain(key)
    const text = JSON.stringify(record)
    for (const leak of ['answers', 'timeline', '"age"', 'snapshot', 'ledger', 'hook']) expect(text).not.toContain(leak)
  })

  it('never lands a minted code on a name already there', async () => {
    // The same drawing trick as tests/keep-function.test.ts: the first code
    // drawn is taken, so the write must move on rather than write over it.
    const ALPHABET = 'ACDEFGHJKMNPQRTWXY34789'
    const queue = ['AAAAAAAA', 'CCCCCCCC'].flatMap((c) => [...c].map((ch) => ALPHABET.indexOf(ch)))
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(((array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) array[i] = queue.shift() ?? 0
      return array
    }) as never)
    const hers = { contact: 'hodan@example.com', gender: 'woman', scene: 'london', country: 'uk', reach: 'city', adult: true, at: '2026-09-01', v: 1 }
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

// docs/DECISIONS.md decision 32, as docs/BATCH-01-PLAN.md D3 reads it: the day
// a name goes is the Sunday on or before its 180th day, because that is the
// day the sweep runs — one day for the screen, the founder's list and the
// deletion.
describe('the day a name is scheduled to go', () => {
  it('is the Sunday on or before the 180th day, and never later than it', () => {
    expect(LIST_DAYS).toBe(180)
    expect(WITHDRAWN_DAYS).toBe(2)
    // 2026-01-01 + 180 days is Tuesday 2026-06-30; the Sunday before is the 28th.
    expect(removeOn('2026-01-01')).toBe('2026-06-28')
    // 2026-03-31 + 180 days is itself a Sunday.
    expect(removeOn('2026-03-31')).toBe('2026-09-27')
    expect(removeOn('2028-02-29')).toBe('2028-08-27')
    for (const at of ['2026-01-01', '2026-03-31', '2028-02-29', '2026-09-27']) {
      const goes = removeOn(at)!
      expect(new Date(`${goes}T00:00:00Z`).getUTCDay(), at).toBe(0)
      expect(Date.parse(goes) - Date.parse(at)).toBeLessThanOrEqual(LIST_DAYS * 24 * 60 * 60 * 1000)
      expect(Date.parse(goes) - Date.parse(at)).toBeGreaterThan((LIST_DAYS - 7) * 24 * 60 * 60 * 1000)
    }
    expect(removeOn('last spring')).toBeNull()
    expect(removeOn(undefined)).toBeNull()
  })
})

describe('the founder’s list', () => {
  it('returns every name, oldest first, with its code and the counts by city and side — never cached', async () => {
    vi.stubEnv('FOUNDER_KEY', 'k')
    memStore('introductions').setJSON('AAAAAAAA', { contact: 'b@example.com', gender: 'man', scene: 'london', country: 'uk', reach: 'country', adult: true, at: ago(7), v: 1 })
    memStore('introductions').setJSON('CCCCCCCC', { contact: 'a@example.com', firstName: 'Sagal', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', adult: true, at: ago(17), v: 1 })
    // A record from before the affirmation was sent: still a person, still shown.
    memStore('introductions').setJSON('DDDDDDDD', { contact: 'c@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', at: ago(12), v: 1 })
    // A withdrawal marker is not a person.
    memStore('introductions').setJSON(`withdrawn/EEEEEEEE/${day()}`, { at: day() })
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
    memStore('introductions').setJSON('DDDDDDDD', { contact: 'c@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', adult: true, at: ago(12), v: 1 })
    const body = (await (await list(FOUNDER)).json()) as { total: number; skipped: number }
    expect(body).toMatchObject({ total: 1, skipped: 2 })
  })

  // The list stops showing a name on its scheduled day whatever the sweep
  // did, so a failed Sunday never puts a lapsed name in front of the founder.
  it('shows each name with the day it is scheduled to go, and never one on or past it', async () => {
    vi.stubEnv('FOUNDER_KEY', 'k')
    const shown = { contact: 'in@example.com', gender: 'man', scene: 'twin-cities', country: 'us', reach: 'city', adult: true, v: 1 }
    // Put down so that its Sunday is still ahead; and one whose Sunday is today or gone.
    const fresh = ago(1)
    const lapsedAt = ago(LIST_DAYS)
    memStore('introductions').setJSON('AAAAAAAA', { ...shown, at: fresh })
    memStore('introductions').setJSON('CCCCCCCC', { ...shown, contact: 'zq.lapsed@example.com', at: lapsedAt })
    memStore('introductions').setJSON('DDDDDDDD', { ...shown, contact: 'zq.undated@example.com' })
    const res = await list(FOUNDER)
    const body = (await res.json()) as { people: { code: string; removeOn: string }[]; total: number; skipped: number; lapsed: number }
    expect(body.people).toEqual([expect.objectContaining({ code: 'AAAAAAAA', removeOn: removeOn(fresh) })])
    expect(body).toMatchObject({ total: 1, lapsed: 1, skipped: 1 })
    const text = JSON.stringify(body)
    expect(text).not.toContain('zq.lapsed')
    expect(text).not.toContain('zq.undated')
  })

  it('answers nobody but the founder, and names nobody in the refusal', async () => {
    vi.stubEnv('FOUNDER_KEY', 'k')
    memStore('introductions').setJSON('AAAAAAAA', { contact: 'zq.secret@example.com', gender: 'man', scene: 'london', country: 'uk', reach: 'city', adult: true, at: ago(7), v: 1 })
    const almost: Record<string, string>[] = [{}, { authorization: 'Bearer not-k' }]
    for (const headers of almost) {
      const res = await list(headers)
      expect(res.status).toBe(401)
      expect(await res.text()).not.toContain('zq.secret')
    }
  })
})

describe('taking a name off', () => {
  it('by its code: gone, a marker left in its place, and asking again finds nothing to remove', async () => {
    const { code } = (await (await post({ ...OK, code: CODE })).json()) as Receipt
    const first = await off(code)
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({ removed: true })
    expect(keys()).toEqual([`withdrawn/${CODE}/${day()}`])
    expect(stored(`withdrawn/${CODE}/${day()}`)).toEqual({ at: day() })
    const again = await off(code)
    expect(again.status).toBe(200)
    expect(await again.json()).toEqual({ removed: false })
  })

  it('works for a record written before the affirmation was stored', async () => {
    memStore('introductions').setJSON('AAAAAAAA', { contact: 'old@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', at: ago(3), v: 1 })
    expect(await (await off('AAAAAAAA')).json()).toEqual({ removed: true })
    expect(keys()).toEqual([`withdrawn/AAAAAAAA/${day()}`])
  })

  it('needs a code the right shape, and takes nothing else', async () => {
    const { code } = await (await post({ ...OK, code: CODE })).json()
    for (const bad of ['nope', 'ACDEFGHJKM', '']) expect((await off(bad)).status).toBe(400)
    expect(stores.get('introductions')!.has(code)).toBe(true)
    expect(keys()).toEqual([CODE])
  })

  it('anything but GET, POST or DELETE is refused', async () => {
    expect((await handler(new Request('http://x/.netlify/functions/introduce', { method: 'PUT' }))).status).toBe(405)
  })
})
