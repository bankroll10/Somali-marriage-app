import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { memStore, stores } from './support/memory'
import { day } from '../netlify/shared/day'
import { whyOf } from '../src/lib/net'

/**
 * The introduction list (netlify/functions/introduce.ts) since new requests
 * were closed (release R3, 2026-10-13).
 *
 * What these hold: a new request is refused with 410 before anything is
 * opened, read, counted or written, whatever it carries; the founder reads the
 * list whole and nobody else does; a name comes off by its code, with the
 * server's two documented answers kept distinct; and no name is shown past its
 * 180 days, which the weekly sweep carries out (tests/sweep-function.test.ts).
 * Records are seeded straight into the store: nothing writes one any more.
 */

vi.mock('@netlify/blobs', async () => (await import('./support/memory')).memoryModule)

const { default: handler, INTRODUCTION_KEYS, LIST_DAYS, removeBy } = await import('../netlify/functions/introduce')

/** A day `n` days before today: fixtures stay inside the list's 180 days whenever the suite runs. */
const ago = (n: number) => day(Date.now() - n * 24 * 60 * 60 * 1000)

const URL_ = 'http://x/.netlify/functions/introduce'
const post = (body: BodyInit | null, headers: Record<string, string> = {}) => handler(new Request(URL_, { method: 'POST', body, headers }))
const list = (headers: Record<string, string> = {}) => handler(new Request(URL_, { headers }))
const off = (code: string) => handler(new Request(`${URL_}?code=${code}`, { method: 'DELETE' }))
const FOUNDER = { authorization: 'Bearer k' }
/** What an earlier page sent: the six fields, nothing else. */
const OLD_PAGE = JSON.stringify({ contact: 'sagal@example.com', firstName: 'Sagal', gender: 'woman', scene: 'twin-cities', reach: 'city' })
const A_RECORD = { contact: 'sagal@example.com', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', v: 1 }

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

  it('anything but GET or DELETE, and POST, is refused as before', async () => {
    expect((await handler(new Request(URL_, { method: 'PUT' }))).status).toBe(405)
  })
})

describe('the shape of a record from before', () => {
  it('is fixed, so the founder’s list and the sweep read what they always read', () => {
    expect(INTRODUCTION_KEYS).toEqual(['contact', 'firstName', 'gender', 'scene', 'country', 'reach', 'at', 'v'])
    for (const key of Object.keys(A_RECORD)) expect(INTRODUCTION_KEYS as readonly string[], key).toContain(key)
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
  it('by its code: the documented confirmation, and asking again is the documented not-found', async () => {
    memStore('introductions').setJSON('QRTWXY34', { ...A_RECORD, at: ago(3) })
    const gone = await off('QRTWXY34')
    expect(gone.status).toBe(200)
    expect(await gone.json()).toEqual({ removed: true })
    expect(stores.get('introductions')!.has('QRTWXY34')).toBe(false)
    const again = await off('QRTWXY34')
    expect(again.status).toBe(404)
    expect(await again.json()).toEqual({ error: 'not_found' })
  })

  it('takes a code however it was typed, and nothing else with it', async () => {
    memStore('introductions').setJSON('QRTWXY34', { ...A_RECORD, at: ago(3) })
    memStore('introductions').setJSON('ACDEFGHJ', { ...A_RECORD, at: ago(3) })
    expect((await off('qrtw-xy34')).status).toBe(200)
    expect([...stores.get('introductions')!.keys()]).toEqual(['ACDEFGHJ'])
  })

  it('needs a code the right shape, and takes nothing else', async () => {
    memStore('introductions').setJSON('QRTWXY34', { ...A_RECORD, at: ago(3) })
    for (const bad of ['nope', 'ACDEFGHJKM', '']) expect((await off(bad)).status).toBe(400)
    expect(stores.get('introductions')!.has('QRTWXY34')).toBe(true)
  })
})
