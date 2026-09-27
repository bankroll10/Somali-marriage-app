import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { blobs, serve, type Served } from '../../tests/support/server'
import { pendingIntro, registerInterest, rememberedIntro, resetIntroMirror, withdrawInterest } from './introduce'
import { forgetMe } from './forget'
import { day } from '../../netlify/shared/day'

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
