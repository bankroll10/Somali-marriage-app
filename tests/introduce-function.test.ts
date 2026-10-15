import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { memStore, stores } from './support/memory'
import { day } from '../netlify/shared/day'
import { whyOf } from '../src/lib/net'

/**
 * The introduction list (netlify/functions/introduce.ts) since new requests
 * were closed (release R3, 2026-10-13), with the withdrawal markers and the
 * scheduled removal day the held branch added.
 *
 * What these hold: a new request is refused with 410 before anything is
 * opened, read, counted or written, whatever it carries; the founder reads the
 * list whole and nobody else does, and it leaves out a withdrawn name and a
 * marker; a name comes off by its code, leaving a marker, with `200 { removed }`
 * saying whether anything was there; and no name is shown on or past its
 * scheduled day, which the weekly sweep carries out (tests/sweep-function.test.ts).
 * Records are seeded straight into the store: nothing writes one any more.
 * The interleavings are in tests/introduce-race.test.ts and
 * tests/introduce-residue.test.ts.
 */

vi.mock('@netlify/blobs', async () => (await import('./support/memory')).memoryModule)

const { default: handler, INTRODUCTION_KEYS, LIST_DAYS, WITHDRAWN_DAYS, removeOn } = await import('../netlify/functions/introduce')

/** A day `n` days before today: fixtures stay inside the list's 180 days whenever the suite runs. */
const ago = (n: number) => day(Date.now() - n * 24 * 60 * 60 * 1000)

const URL_ = 'http://x/.netlify/functions/introduce'
const post = (body: BodyInit | null, headers: Record<string, string> = {}) => handler(new Request(URL_, { method: 'POST', body, headers }))
const list = (headers: Record<string, string> = {}) => handler(new Request(URL_, { headers }))
const off = (code: string) => handler(new Request(`${URL_}?code=${code}`, { method: 'DELETE' }))
const stored = (code: string) => JSON.parse(stores.get('introductions')!.get(code)!) as Record<string, unknown>
const keys = () => [...(stores.get('introductions')?.keys() ?? [])].sort()
const FOUNDER = { authorization: 'Bearer k' }
/** What an earlier page sent: the six fields, nothing else. */
const OLD_PAGE = JSON.stringify({ contact: 'sagal@example.com', firstName: 'Sagal', gender: 'woman', scene: 'twin-cities', reach: 'city' })
const A_RECORD = { contact: 'sagal@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', adult: true, v: 1 }

beforeEach(() => {
  stores.clear()
  vi.unstubAllEnvs()
})
afterEach(() => vi.restoreAllMocks())

describe('new requests are closed', () => {
  it('refuses the request an earlier page sends, and opens, reads, counts and writes nothing', async () => {
    // A cap of one: if the refused request spent it, the second would be a 503.
    vi.stubEnv('INTRODUCE_HOURLY_CAP', '1')
    for (let i = 0; i < 2; i++) {
      const res = await post(OLD_PAGE, { 'content-type': 'application/json' })
      expect(res.status).toBe(410)
      expect(res.headers.get('cache-control')).toBe('no-store')
      expect(await res.json()).toEqual({ error: 'closed' })
    }
    // `getStore` registers a store the moment it is asked for one: none was.
    expect(stores.size).toBe(0)
  })

  it('answers the same to an empty body, a malformed one, an oversize one and a body that never finished', async () => {
    const unfinished = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode('{"contact":"sa'))
        c.error(new Error('connection reset'))
      },
    })
    const bodies: [string, BodyInit | null][] = [
      ['no body', null],
      ['not json', 'not json {'],
      ['oversize', 'x'.repeat(10_000)],
      ['unfinished', unfinished],
    ]
    for (const [name, body] of bodies) {
      const res = await handler(new Request(URL_, { method: 'POST', body, duplex: 'half' } as RequestInit))
      expect(res.status, name).toBe(410)
      expect(await res.json(), name).toEqual({ error: 'closed' })
    }
    expect(stores.size).toBe(0)
  })

  it('leaves a name already on the list, and the founder’s view of it, exactly as they were', async () => {
    vi.stubEnv('FOUNDER_KEY', 'k')
    memStore('introductions').setJSON('AAAAAAAA', { ...A_RECORD, at: ago(7) })
    const before = JSON.stringify([...stores.get('introductions')!])
    expect((await post(OLD_PAGE)).status).toBe(410)
    expect(JSON.stringify([...stores.get('introductions')!])).toBe(before)
    expect(stores.size).toBe(1)
    const body = (await (await list(FOUNDER)).json()) as { total: number }
    expect(body.total).toBe(1)
  })

  // An older page still open on someone's phone reads every status it does not
  // recognise through `whyOf` (src/lib/net.ts), which is unchanged. Its answer
  // for 410 is "unreachable": "That did not reach us, so nothing is saved".
  // True, and it never shows a receipt or writes a code.
  it('is read by an earlier page as nothing saved: not ok, no code, and the reason it already knows', async () => {
    const res = await post(OLD_PAGE)
    expect(res.ok).toBe(false)
    const body = (await res.clone().json()) as Record<string, unknown>
    expect(body.saved).toBeUndefined()
    expect(body.code).toBeUndefined()
    expect(await whyOf(res)).toBe('unreachable')
  })

  it('anything but GET or DELETE, and the closed POST, is refused as before', async () => {
    expect((await handler(new Request(URL_, { method: 'PUT' }))).status).toBe(405)
  })
})

describe('the shape of a record from before', () => {
  it('is fixed, so the founder’s list and the sweep read what they always read', () => {
    expect(INTRODUCTION_KEYS).toEqual(['contact', 'firstName', 'gender', 'scene', 'country', 'reach', 'adult', 'at', 'v'])
    for (const key of Object.keys(A_RECORD)) expect(INTRODUCTION_KEYS as readonly string[], key).toContain(key)
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
    memStore('introductions').setJSON('QRTWXY34', { ...A_RECORD, at: ago(3) })
    const first = await off('QRTWXY34')
    expect(first.status).toBe(200)
    expect(await first.json()).toEqual({ removed: true })
    expect(keys()).toEqual([`withdrawn/QRTWXY34/${day()}`])
    expect(stored(`withdrawn/QRTWXY34/${day()}`)).toEqual({ at: day() })
    const again = await off('QRTWXY34')
    expect(again.status).toBe(200)
    expect(await again.json()).toEqual({ removed: false })
  })

  it('takes a code however it was typed, and nothing else with it', async () => {
    memStore('introductions').setJSON('QRTWXY34', { ...A_RECORD, at: ago(3) })
    memStore('introductions').setJSON('ACDEFGHJ', { ...A_RECORD, at: ago(3) })
    expect((await off('qrtw-xy34')).status).toBe(200)
    expect(keys()).toEqual(['ACDEFGHJ', `withdrawn/QRTWXY34/${day()}`])
  })

  it('works for a record written before the affirmation was stored', async () => {
    memStore('introductions').setJSON('AAAAAAAA', { contact: 'old@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', at: ago(3), v: 1 })
    expect(await (await off('AAAAAAAA')).json()).toEqual({ removed: true })
    expect(keys()).toEqual([`withdrawn/AAAAAAAA/${day()}`])
  })

  it('a code with nothing under it leaves a marker too, and says so', async () => {
    expect(await (await off('ACDEFGHJ')).json()).toEqual({ removed: false })
    expect(keys()).toEqual([`withdrawn/ACDEFGHJ/${day()}`])
  })

  it('needs a code the right shape, and takes nothing else', async () => {
    memStore('introductions').setJSON('QRTWXY34', { ...A_RECORD, at: ago(3) })
    for (const bad of ['nope', 'ACDEFGHJKM', '']) expect((await off(bad)).status).toBe(400)
    expect(stores.get('introductions')!.has('QRTWXY34')).toBe(true)
    expect(keys()).toEqual(['QRTWXY34'])
  })

  it('anything but GET or DELETE is refused', async () => {
    expect((await handler(new Request(URL_, { method: 'PUT' }))).status).toBe(405)
    expect((await handler(new Request(URL_, { method: 'PATCH' }))).status).toBe(405)
  })
})

describe('a record under a withdrawn code', () => {
  it('is left out of the founder’s list and its counts, and counted only as withdrawn', async () => {
    vi.stubEnv('FOUNDER_KEY', 'k')
    memStore('introductions').setJSON('QRTWXY34', { ...A_RECORD, contact: 'zq.marked@example.com', at: ago(3) })
    memStore('introductions').setJSON(`withdrawn/QRTWXY34/${day()}`, { at: day() })
    memStore('introductions').setJSON('ACDEFGHJ', { ...A_RECORD, at: ago(3) })
    const body = (await (await list(FOUNDER)).json()) as { people: { code: string }[]; total: number; withdrawn: number }
    expect(body.people.map((p) => p.code)).toEqual(['ACDEFGHJ'])
    expect(body).toMatchObject({ total: 1, withdrawn: 1 })
    expect(JSON.stringify(body)).not.toContain('zq.marked')
  })
})
