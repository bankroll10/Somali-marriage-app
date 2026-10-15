import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rememberedIntro, untilOf, withdrawInterest } from './introduce'

/**
 * Taking an earlier introduction request off the list (src/lib/introduce.ts).
 *
 * The server documents two answers (netlify/functions/introduce.ts): `200
 * { removed: true }` and `404 { error: 'not_found' }`. Those, exactly, are
 * `removed` and `nothing`. Everything else (a cap, a 503, a 400, a body that
 * is not one of the two, a 2xx that is not 200, no answer at all) is
 * `unconfirmed`, and an unconfirmed answer must never cost the phone its code.
 */

const CODE = 'QRTWXY34'
const KEY = 'niyyah.intro.v1'

let storage: Map<string, string>
let calls: [string, RequestInit | undefined][]

function answer(status: number, body: unknown) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push([url, init])
      return new Response(text, { status })
    }),
  )
}

beforeEach(() => {
  storage = new Map([[KEY, JSON.stringify({ code: CODE, at: new Date().toISOString().slice(0, 10) })]])
  calls = []
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('withdrawInterest', () => {
  it('sends a DELETE with the code, and nothing else', async () => {
    answer(200, { removed: true })
    await withdrawInterest(CODE)
    expect(calls).toHaveLength(1)
    expect(calls[0][0]).toBe(`/.netlify/functions/introduce?code=${CODE}`)
    expect(calls[0][1]?.method).toBe('DELETE')
    expect(calls[0][1]?.body).toBeUndefined()
  })

  it('removed: only on 200 { removed: true }, and the phone drops the code it holds', async () => {
    answer(200, { removed: true })
    expect(await withdrawInterest(CODE)).toBe('removed')
    expect(storage.has(KEY)).toBe(false)
  })

  it('nothing: only on 404 { error: "not_found" }, and the phone drops the code it holds', async () => {
    answer(404, { error: 'not_found' })
    expect(await withdrawInterest(CODE)).toBe('nothing')
    expect(storage.has(KEY)).toBe(false)
  })

  const unconfirmed: [string, number, unknown][] = [
    ['a 200 with no body field', 200, {}],
    ['a 200 that says removed: false', 200, { removed: false }],
    ['a 200 whose removed is not a boolean', 200, { removed: 'true' }],
    ['a 200 that is not JSON', 200, 'ok'],
    ['a 200 that is an array', 200, []],
    ['a 200 that is null', 200, null],
    ['a 201 that says removed: true', 201, { removed: true }],
    ['a 404 that is not not_found', 404, { error: 'expired' }],
    ['a 404 with no body field', 404, {}],
    ['a 404 that is not JSON', 404, 'not found'],
    ['a 400', 400, { error: 'bad_code' }],
    ['a rate limit', 429, { error: 'rate_limited' }],
    ['a 503', 503, { error: 'unavailable' }],
    ['a 500', 500, { error: 'boom' }],
    ['a 410', 410, { error: 'closed' }],
  ]
  it.each(unconfirmed)('unconfirmed: %s, and the phone keeps its code', async (_name, status, body) => {
    answer(status, body)
    expect(await withdrawInterest(CODE)).toBe('unconfirmed')
    expect(JSON.parse(storage.get(KEY)!).code).toBe(CODE)
  })

  it('unconfirmed: no answer at all, and the phone keeps its code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    expect(await withdrawInterest(CODE)).toBe('unconfirmed')
    expect(JSON.parse(storage.get(KEY)!).code).toBe(CODE)
  })

  it('a different code, removed or not found, leaves this phone’s own code alone', async () => {
    answer(200, { removed: true })
    expect(await withdrawInterest('ACDEFGHJ')).toBe('removed')
    expect(JSON.parse(storage.get(KEY)!).code).toBe(CODE)
    answer(404, { error: 'not_found' })
    expect(await withdrawInterest('ACDEFGHJ')).toBe('nothing')
    expect(JSON.parse(storage.get(KEY)!).code).toBe(CODE)
  })
})

describe('what the phone remembers', () => {
  it('forgets the code on the 180th day, as before', () => {
    const put = '2026-01-01'
    expect(untilOf(put)).toBe('2026-06-30')
    storage.set(KEY, JSON.stringify({ code: CODE, at: put }))
    expect(rememberedIntro(Date.parse('2026-06-29T12:00:00Z'))?.code).toBe(CODE)
    expect(rememberedIntro(Date.parse('2026-06-30T00:00:00Z'))).toBeNull()
    expect(storage.has(KEY)).toBe(false)
  })

  it('ignores a record that is not a code and a day', () => {
    for (const bad of ['nope', JSON.stringify({ code: 'x', at: '2026-01-01' }), JSON.stringify({ code: CODE }), JSON.stringify({ code: CODE, at: 'last spring' })]) {
      storage.set(KEY, bad)
      expect(rememberedIntro()).toBeNull()
    }
  })
})
