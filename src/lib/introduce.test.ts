import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { blobs, serve, type Served } from '../../tests/support/server'
import { holdPendingInPage, holdReceiptInPage, records, seedPending, seedReceipt, seedRecord } from '../../tests/support/intro'
import { lifetimeOver, pendingIntro, rememberedIntro, resetIntroMirror, untilOf, withdrawInterest } from './introduce'
import { forgetMe } from './forget'
import { newCode } from './code'
import { day } from '../../netlify/shared/day'
import { answerDelete, appHtml, cutStream, gone, text } from '../../tests/support/answers'
import { Phone, onPhone } from '../../tests/support/device'

/**
 * The client half of the introduction path that is still open: taking an
 * earlier request off, and recovering the code of one (docs/DECISIONS.md,
 * release R3 and its integration into the held branch).
 *
 * New requests are closed, so every state here is seeded (tests/support/intro.ts):
 * a receipt or an attempt on a phone, in the page when the phone's storage
 * refuses to hold it, and the record on the real handler over the in-memory
 * store. The answers the phone reads are the protocol's: `200 { removed: true }`
 * is `removed`; `200 { removed: false }` and the legacy `404 { error:
 * 'not_found' }` are `nothing`; everything else is `failed`, an unconfirmed
 * answer, which must never cost the phone its code. And the days passing never
 * confirm a deletion, so a code is kept past its 180th day.
 */

vi.mock('@netlify/blobs', async () => (await import('../../tests/support/blobs')).blobsModule)

let server: Served
beforeEach(() => {
  blobs.reset()
  server = serve()
  resetIntroMirror()
})
afterEach(() => {
  resetIntroMirror()
  vi.unstubAllGlobals()
})

const A = 'QRTWXY34'

describe('a browser that refuses to store the receipt', () => {
  it('holds it in the page, and Forget me removes the record by that code', async () => {
    const phone = onPhone(new Phone('refusing'))
    holdReceiptInPage(phone, A)
    seedRecord(A)
    expect(rememberedIntro()).toMatchObject({ code: A, kept: false })
    expect(pendingIntro()).toBeNull()
    expect(phone.keys()).toEqual([])
    // Forget me finds it, sends it, and the record is gone — not only the flag.
    const done = await forgetMe()
    expect(done.intro).toBe(true)
    expect(records()).toEqual([])
    expect(blobs.keys('introductions')).toEqual([`withdrawn/${A}/${day()}`])
    expect(rememberedIntro()).toBeNull()
  })

  it('a reload loses the page copy, which is the honest limit; the code shown on the screen is the record', () => {
    const phone = onPhone(new Phone('refusing'))
    holdReceiptInPage(phone, A)
    seedRecord(A)
    resetIntroMirror()
    expect(rememberedIntro()).toBeNull()
    expect(records()).toHaveLength(1)
  })

  it('taking the name off from the receipt clears the page copy too', async () => {
    const phone = onPhone(new Phone('refusing'))
    holdReceiptInPage(phone, A)
    seedRecord(A)
    expect(await withdrawInterest(A)).toBe('removed')
    expect(rememberedIntro()).toBeNull()
    expect(records()).toEqual([])
  })
})

describe('a withdrawal that cannot be confirmed', () => {
  it('keeps the pending code and the record, so the same withdrawal can be tried again', async () => {
    const phone = onPhone(new Phone('refusing'))
    holdPendingInPage(phone, A)
    seedRecord(A)
    expect(pendingIntro()).toMatchObject({ code: A, kept: false })
    // No answer at all, then a server that answers with an error: neither is "removed" or "nothing".
    server.down(/introduce/)
    expect(await withdrawInterest(A)).toBe('failed')
    expect(pendingIntro()).toMatchObject({ code: A, kept: false })
    expect(records()).toEqual([A])
    server.down(false)
    blobs.failOn({ store: 'introductions', op: 'setJSON', key: `withdrawn/${A}/${day()}` })
    expect(await withdrawInterest(A)).toBe('failed')
    expect(pendingIntro()?.code).toBe(A)
    expect(records()).toEqual([A])
    // Only an answer clears it, and the third try gets one.
    expect(await withdrawInterest(A)).toBe('removed')
    expect(pendingIntro()).toBeNull()
    expect(records()).toEqual([])
  })
})

/**
 * A withdrawal answered in a way that does not confirm it (docs/DECISIONS.md Part 32,
 * finding F). Two situations the client cannot tell apart, and both are tested:
 *
 *  - `completed`: the real handler ran and deleted the record, then what the phone
 *    heard was unreadable, wrong or cut. The record is gone and the phone does not know.
 *  - not completed: the handler never ran (Netlify's catch-all answers 200 with the
 *    app's HTML for a path with no function behind it, a proxy can answer for it, a
 *    body can be malformed). The record is still there and a 200 is not evidence.
 *
 * In both the phone keeps the code that can resolve it, and a later valid answer
 * resolves it. The synthetic state is a code minted here and a contact no one has,
 * seeded as an earlier request left it.
 */
describe('a withdrawal answered without confirming it', () => {
  /** Every answer that is not one of the protocol's two, with the shape it has. */
  const UNCONFIRMED: [string, () => Response][] = [
    ['a 200 whose body is cut off', cutStream],
    ['a 200 with the app’s HTML', appHtml],
    ['a 200 with no body', text('')],
    ['a 200 with {}', text('{}')],
    ['a 200 with null', text('null')],
    ['a 200 with an array', text('[]')],
    ['a 200 whose removed is a string', text('{"removed":"yes"}')],
    ['a 200 whose removed is a number', text('{"removed":1}')],
    ['a 204', text('', 204)],
    // Exactly 200: the handler never sends another success status, and a well-formed body on one is still not its answer.
    ['a 202 with {"removed":true}', text('{"removed":true}', 202)],
    ['a 404 with HTML', text('<!doctype html>', 404, 'text/html')],
    ['a 404 with {}', text('{}', 404)],
    ['a 404 with another error', text('{"error":"expired"}', 404)],
    ['a 500', text('{"error":"oops"}', 500)],
    ['a 503', text('{"error":"unavailable"}', 503)],
    ['no answer at all', gone],
  ]
  /** The memory-only runs are the same code path with other storage; three shapes are enough to prove the mirrors. */
  const MEMORY = new Set(['a 200 whose body is cut off', 'a 200 with the app’s HTML', 'a 200 with {}'])

  const answerDeleteWith = (reply: () => Response, completed: boolean) => answerDelete(server, reply, completed)

  type Where = 'receipt' | 'pending'
  type Storage = 'kept' | 'memory'
  const held = (where: Where) => (where === 'receipt' ? rememberedIntro()?.code : pendingIntro()?.code)
  /** A receipt, or an attempt whose answer never came, on a phone that stores or one that does not; the record is on the server. */
  async function begin(where: Where, storage: Storage): Promise<string> {
    const phone = onPhone(new Phone('withdrawal'))
    const code = newCode()
    seedRecord(code)
    if (where === 'receipt') (storage === 'memory' ? holdReceiptInPage : seedReceipt)(phone, code)
    else (storage === 'memory' ? holdPendingInPage : seedPending)(phone, code)
    return code
  }
  const sent = (from: number) => server.requests.slice(from)

  const SETUPS: [Where, Storage, boolean][] = [
    ['receipt', 'kept', true],
    ['receipt', 'kept', false],
    ['pending', 'kept', true],
    ['pending', 'kept', false],
    ['receipt', 'memory', true],
    ['receipt', 'memory', false],
    ['pending', 'memory', true],
    ['pending', 'memory', false],
  ]

  for (const [name, reply] of UNCONFIRMED) {
    for (const [where, storage, completed] of SETUPS) {
      if (storage === 'memory' && !MEMORY.has(name)) continue
      it(`${name} is unconfirmed: the ${where} is kept (${storage === 'kept' ? 'storage' : 'memory'}), the deletion ${completed ? 'did' : 'did not'} happen`, async () => {
        const code = await begin(where, storage)
        const before = server.requests.length
        const restore = answerDeleteWith(reply, completed)
        expect(await withdrawInterest(code)).toBe('failed')
        restore()
        // Recovery survives: the same code, the same kind of record, in the same place.
        expect(held(where)).toBe(code)
        if (storage === 'memory') expect(where === 'receipt' ? rememberedIntro()!.kept : pendingIntro()!.kept).toBe(false)
        // The request is the one it always was, and nothing else was sent.
        expect(sent(before)).toEqual([`DELETE /.netlify/functions/introduce?code=${code}`])
        // What the server holds is what it held: the answer changed nothing there.
        expect(records()).toEqual(completed ? [] : [code])
        expect(blobs.keys('introductions').filter((k) => k.startsWith('withdrawn/'))).toHaveLength(completed ? 1 : 0)
      })
    }
  }

  for (const [where, storage] of [['receipt', 'kept'], ['pending', 'kept'], ['receipt', 'memory'], ['pending', 'memory']] as [Where, Storage][]) {
    it(`a later valid answer resolves it: ${where}, ${storage === 'kept' ? 'storage' : 'memory'}`, async () => {
      // The deletion happened and the answer was unreadable: asking again is answered `nothing`, and clears.
      const a = await begin(where, storage)
      let restore = answerDeleteWith(text('<!doctype html>', 200, 'text/html'), true)
      expect(await withdrawInterest(a)).toBe('failed')
      restore()
      expect(held(where)).toBe(a)
      expect(await withdrawInterest(a)).toBe('nothing')
      expect(held(where)).toBeUndefined()
      expect(records()).toEqual([])
      expect(blobs.keys('introductions')).toEqual([`withdrawn/${a}/${day()}`])

      // The handler never ran and the answer was a plausible lie: the record is still there, and the retry removes it.
      blobs.reset()
      resetIntroMirror()
      const b = await begin(where, storage)
      restore = answerDeleteWith(text('{}'), false)
      expect(await withdrawInterest(b)).toBe('failed')
      restore()
      expect(held(where)).toBe(b)
      expect(records()).toEqual([b])
      expect(await withdrawInterest(b)).toBe('removed')
      expect(held(where)).toBeUndefined()
      expect(records()).toEqual([])
      expect(blobs.keys('introductions')).toEqual([`withdrawn/${b}/${day()}`])
    })
  }

  describe('the answers that do confirm', () => {
    it('200 {removed:true} is removed and clears; 200 {removed:false} is nothing and clears; the legacy 404 not_found is nothing and clears', async () => {
      const cases: [() => Response, string][] = [
        [text('{"removed":true}'), 'removed'],
        [text('{"removed":false}'), 'nothing'],
        [text('{"error":"not_found"}', 404), 'nothing'],
      ]
      for (const [reply, outcome] of cases) {
        blobs.reset()
        resetIntroMirror()
        const code = await begin('receipt', 'kept')
        const restore = answerDeleteWith(reply, false)
        expect(await withdrawInterest(code)).toBe(outcome)
        restore()
        expect(held('receipt')).toBeUndefined()
      }
    })

    it('the handler’s own answers: removed, then (asked again) nothing, each a recognized 200', async () => {
      const code = await begin('receipt', 'kept')
      expect(await withdrawInterest(code)).toBe('removed')
      // Nothing is held now, so this asks about a code the phone no longer has: still answered, still nothing.
      expect(await withdrawInterest(code)).toBe('nothing')
      expect(records()).toEqual([])
    })
  })

  describe('only the records that hold the code asked about are cleared', () => {
    const RECEIPT_KEY = 'niyyah.intro.v1'
    const PENDING_KEY = 'niyyah.intro.pending.v1'
    function twoCodes() {
      const phone = onPhone(new Phone('two'))
      const [a, b] = [newCode(), newCode()]
      phone.storage.set(RECEIPT_KEY, JSON.stringify({ code: a, at: day(), removeOn: day() }))
      phone.storage.set(PENDING_KEY, JSON.stringify({ code: b, at: day() }))
      return { a, b }
    }

    it('an unconfirmed answer for the receipt’s code clears neither', async () => {
      const { a, b } = twoCodes()
      const restore = answerDeleteWith(text('{}'), false)
      expect(await withdrawInterest(a)).toBe('failed')
      expect(await withdrawInterest(b)).toBe('failed')
      restore()
      expect(rememberedIntro()?.code).toBe(a)
      expect(pendingIntro()?.code).toBe(b)
    })

    it('a confirmed answer for one code clears that record and keeps the other, in either order', async () => {
      for (const first of ['a', 'b'] as const) {
        const codes = twoCodes()
        const second = first === 'a' ? 'b' : 'a'
        expect(await withdrawInterest(codes[first])).not.toBe('failed')
        expect(rememberedIntro()?.code).toBe(first === 'a' ? undefined : codes.a)
        expect(pendingIntro()?.code).toBe(first === 'b' ? undefined : codes.b)
        expect(await withdrawInterest(codes[second])).not.toBe('failed')
        expect(rememberedIntro()).toBeNull()
        expect(pendingIntro()).toBeNull()
      }
    })
  })
})

/**
 * The same classification, answered by a stub of the protocol alone (no
 * handler behind it), on a phone whose storage holds a receipt. These pin what
 * the phone does with each answer on its own; the group above pins it against
 * the real handler.
 */
describe('withdrawInterest, against the protocol’s answers', () => {
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

  it('nothing: on 200 { removed: false }, and the phone drops the code it holds', async () => {
    answer(200, { removed: false })
    expect(await withdrawInterest(CODE)).toBe('nothing')
    expect(storage.has(KEY)).toBe(false)
  })

  it('nothing: on the legacy 404 { error: "not_found" }, and the phone drops the code it holds', async () => {
    answer(404, { error: 'not_found' })
    expect(await withdrawInterest(CODE)).toBe('nothing')
    expect(storage.has(KEY)).toBe(false)
  })

  const unconfirmed: [string, number, unknown][] = [
    ['a 200 with no body field', 200, {}],
    ['a 200 whose removed is not a boolean', 200, { removed: 'true' }],
    ['a 200 that is not JSON', 200, 'ok'],
    ['a 200 that is an array', 200, []],
    ['a 200 that is null', 200, null],
    ['a 201 that says removed: true', 201, { removed: true }],
    ['a 201 that says removed: false', 201, { removed: false }],
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
    expect(await withdrawInterest(CODE)).toBe('failed')
    expect(JSON.parse(storage.get(KEY)!).code).toBe(CODE)
  })

  it('unconfirmed: no answer at all, and the phone keeps its code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    expect(await withdrawInterest(CODE)).toBe('failed')
    expect(JSON.parse(storage.get(KEY)!).code).toBe(CODE)
  })

  it('a different code, removed or not found, leaves this phone’s own code alone', async () => {
    answer(200, { removed: true })
    expect(await withdrawInterest('ACDEFGHJ')).toBe('removed')
    expect(JSON.parse(storage.get(KEY)!).code).toBe(CODE)
    answer(200, { removed: false })
    expect(await withdrawInterest('ACDEFGHJ')).toBe('nothing')
    expect(JSON.parse(storage.get(KEY)!).code).toBe(CODE)
  })
})

describe('what the phone remembers', () => {
  const CODE = 'QRTWXY34'
  const KEY = 'niyyah.intro.v1'
  let storage: Map<string, string>
  beforeEach(() => {
    storage = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    })
  })

  it('keeps the code past the 180th day: the days passing do not show the request is gone', () => {
    const put = '2026-01-01'
    expect(untilOf(put)).toBe('2026-06-30')
    storage.set(KEY, JSON.stringify({ code: CODE, at: put }))
    const state = rememberedIntro()!
    expect(state.code).toBe(CODE)
    // Said, never acted on: the 180 days being over is a notice, and the key stays.
    expect(lifetimeOver(state, Date.parse('2026-06-29T12:00:00Z'))).toBe(false)
    expect(lifetimeOver(state, Date.parse('2026-06-30T00:00:00Z'))).toBe(true)
    expect(lifetimeOver(state, Date.parse('2027-06-30T00:00:00Z'))).toBe(true)
    expect(rememberedIntro()?.code).toBe(CODE)
    expect(storage.has(KEY)).toBe(true)
  })

  it('has no day to count from when the day is not one', () => {
    expect(untilOf('last spring')).toBeNull()
    expect(lifetimeOver({ code: CODE, at: 'last spring', confirmed: false, kept: true })).toBe(false)
  })

  it('ignores a record that is not a code', () => {
    for (const bad of ['nope', JSON.stringify({ code: 'x', at: '2026-01-01' }), JSON.stringify({ code: CODE })]) {
      storage.set(KEY, bad)
      expect(rememberedIntro()).toBeNull()
    }
  })

  it('keeps a code whose day it cannot read, rather than lose the only way to take the request off', () => {
    storage.set(KEY, JSON.stringify({ code: CODE, at: 'last spring' }))
    expect(rememberedIntro()?.code).toBe(CODE)
  })
})
