import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { blobs, serve, type Served } from '../../tests/support/server'
import { pendingIntro, registerInterest, rememberedIntro, resetIntroMirror, withdrawInterest } from './introduce'
import { forgetMe } from './forget'
import { newCode } from './code'
import { day } from '../../netlify/shared/day'
import { answerDelete, appHtml, cutStream, gone, text } from '../../tests/support/answers'
import { Phone, onPhone } from '../../tests/support/device'

/**
 * The client half of the introduction path, against the real handler over
 * the in-memory store, on a phone whose storage refuses to hold anything
 * under `niyyah.intro` — the case the review of 2026-09-27 reproduced.
 */

vi.mock('@netlify/blobs', async () => (await import('../../tests/support/blobs')).blobsModule)

const INPUT = { contact: 'zq.unit@example.com', gender: 'woman' as const, scene: 'twin-cities' }
const records = () => blobs.keys('introductions').filter((k) => !k.startsWith('withdrawn/'))

/** getItem answers null, setItem throws: a browser that is not saving. */
function refusingStorage() {
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError')
    },
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  })
}

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

describe('a browser that refuses to store the receipt', () => {
  it('registers, keeps the receipt in the page, and Forget me removes the record by that code', async () => {
    refusingStorage()
    const result = await registerInterest(INPUT)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.kept).toBe(false)
    expect(result.state.kept).toBe(false)
    expect(records()).toEqual([result.state.code])
    // The lib answers from the page's own copy: the same code, marked as not kept.
    expect(rememberedIntro()).toEqual({ ...result.state, kept: false })
    expect(pendingIntro()).toBeNull()
    // Forget me finds it, sends it, and the record is gone — not only the flag.
    const done = await forgetMe()
    expect(done.intro).toBe(true)
    expect(records()).toEqual([])
    expect(blobs.keys('introductions')).toEqual([`withdrawn/${result.state.code}/${day()}`])
    expect(rememberedIntro()).toBeNull()
  })

  it('a reload loses the page copy, which is the honest limit; the code shown on the screen is the record', async () => {
    refusingStorage()
    const result = await registerInterest(INPUT)
    expect(result.ok).toBe(true)
    resetIntroMirror()
    expect(rememberedIntro()).toBeNull()
    expect(records()).toHaveLength(1)
  })

  it('taking the name off from the receipt clears the page copy too', async () => {
    refusingStorage()
    const result = await registerInterest(INPUT)
    if (!result.ok) throw new Error('not saved')
    expect(await withdrawInterest(result.state.code)).toBe('removed')
    expect(rememberedIntro()).toBeNull()
    expect(records()).toEqual([])
  })

  it('a second registration in the same page goes under the receipt’s code, and is answered again', async () => {
    refusingStorage()
    const first = await registerInterest(INPUT)
    const second = await registerInterest(INPUT)
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(second.state.code).toBe(first.state.code)
    expect(second.again).toBe(true)
    expect(records()).toEqual([first.state.code])
  })
})

describe('a withdrawal that cannot be confirmed', () => {
  it('keeps the pending code and the record, so the same withdrawal can be tried again', async () => {
    refusingStorage()
    server.lose(/introduce/)
    const lost = await registerInterest(INPUT)
    expect(lost.ok).toBe(false)
    const code = pendingIntro()!.code
    server.lose(false)
    // No answer at all, then a server that answers with an error: neither is "removed" or "nothing".
    server.down(/introduce/)
    expect(await withdrawInterest(code)).toBe('failed')
    expect(pendingIntro()).toMatchObject({ code, kept: false })
    expect(records()).toEqual([code])
    server.down(false)
    blobs.failOn({ store: 'introductions', op: 'setJSON', key: `withdrawn/${code}/${day()}` })
    expect(await withdrawInterest(code)).toBe('failed')
    expect(pendingIntro()?.code).toBe(code)
    expect(records()).toEqual([code])
    // Only an answer clears it, and the third try gets one.
    expect(await withdrawInterest(code)).toBe('removed')
    expect(pendingIntro()).toBeNull()
    expect(records()).toEqual([])
  })
})

describe('a server error after the request was sent', () => {
  it('is unsure — the write may have landed — and the pending code is kept for the retry', async () => {
    refusingStorage()
    blobs.failOn({ store: 'introductions', op: 'list', prefix: 'withdrawn/' })
    const result = await registerInterest(INPUT)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result).toMatchObject({ why: 'refused', unsure: true, kept: false })
    expect(pendingIntro()?.code).toBe(result.code)
    // The retry goes under the same code, and nothing was saved twice.
    const retry = await registerInterest(INPUT)
    expect(retry.ok).toBe(true)
    if (!retry.ok) return
    expect(retry.state.code).toBe(result.code)
    expect(records()).toEqual([result.code])
    expect(server.requests.filter((r) => r.startsWith('POST'))).toHaveLength(2)
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
 * resolves it. The synthetic state is a code minted here and a contact no one has.
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
  /** A receipt, or an attempt whose answer never came, on a phone that stores or one that does not. */
  async function begin(where: Where, storage: Storage): Promise<string> {
    if (storage === 'memory') refusingStorage()
    else onPhone(new Phone('withdrawal'))
    if (where === 'receipt') {
      const r = await registerInterest(INPUT)
      if (!r.ok) throw new Error('not saved')
      return r.state.code
    }
    server.lose(/introduce/)
    const r = await registerInterest(INPUT)
    server.lose(false)
    if (r.ok) throw new Error('should be unsure')
    return pendingIntro()!.code
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
