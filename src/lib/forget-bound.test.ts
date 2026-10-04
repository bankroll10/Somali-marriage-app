import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { forgetMe, pendingForget, resetForgetMirror, retryPendingForget } from './forget'
import { confirmWithdrawal, rememberedIntro, resetIntroMirror, withdrawInterest } from './introduce'
import { TIMEOUT_MS, sendRead } from './net'

/**
 * The introduction confirmation is bounded where it is made (docs/DECISIONS.md Part 33).
 *
 * `send()` clears its clock when the response headers arrive, and a confirmation also reads
 * the body: a body that never ends would hold Forget me before the phone is wiped. So the
 * confirmation owns one deadline over the wait for the response *and* the read of the body.
 * `net.ts` is not touched, and nothing here is about the other endpoints.
 *
 * Fake timers; fetch is a stub; the codes are synthetic. What is held is the contract:
 * an unconfirmed answer at the deadline, the code kept, the phone wiped, the request aborted
 * where fetch supports it, no timer left, and a late answer that changes nothing.
 */

const A = 'QRTWXY34'
const B = 'HJKMNPQR'
const PENDING = 'niyyah.forget.pending.v1'

const store = new Map<string, string>()
function installStorage() {
  store.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  installStorage()
  resetIntroMirror()
  resetForgetMirror()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const receipt = (code: string) => store.set('niyyah.intro.v1', JSON.stringify({ code, at: '2026-09-27', removeOn: '2027-03-21' }))
const held = (): string[] => {
  const raw = store.get(PENDING)
  if (!raw) return []
  const p = JSON.parse(raw) as { intro?: string; introPending?: string; intros?: string[] }
  return [...new Set([...(p.intros ?? []), p.intro, p.introPending].filter((c): c is string => !!c))].sort()
}

/** A 200 whose body starts and does not finish, until `finish` — or never. */
function stalledBody() {
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const res = new Response(
    new ReadableStream<Uint8Array>({
      start(c) {
        controller = c
        c.enqueue(new TextEncoder().encode('{"remo'))
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )
  return {
    res,
    /** The rest of a valid answer, arriving late. A cancelled stream refuses it, which is also fine. */
    finish: () => {
      try {
        controller.enqueue(new TextEncoder().encode('ved":true}'))
        controller.close()
      } catch {
        /* the read was cancelled */
      }
    },
  }
}

/** Run `p` while the clock moves to `ms`, and say whether it had settled by then. */
async function settledBy<T>(p: Promise<T>, ms: number): Promise<boolean> {
  let done = false
  void p.then(
    () => (done = true),
    () => (done = true),
  )
  await vi.advanceTimersByTimeAsync(ms)
  return done
}

describe('confirmWithdrawal', () => {
  it('a body that stops after the status is unconfirmed at the deadline, aborts the request, and leaves no timer', async () => {
    const stalled = stalledBody()
    let signal: AbortSignal | null | undefined
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init?: RequestInit) => ((signal = init?.signal), stalled.res)))
    const p = confirmWithdrawal(A)
    expect(await settledBy(p, TIMEOUT_MS - 1)).toBe(false)
    expect(await settledBy(p, 1)).toBe(true)
    expect(await p).toBe('failed')
    expect(signal?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('no response at all, even from a fetch that ignores its signal, is unconfirmed at the deadline', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
    const p = confirmWithdrawal(A)
    expect(await settledBy(p, TIMEOUT_MS)).toBe(true)
    expect(await p).toBe('failed')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('an answer that arrives in time clears its timer at once', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"removed":false}', { status: 200 })))
    expect(await confirmWithdrawal(A)).toBe('nothing')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('a late valid answer changes neither the outcome nor anything on the phone', async () => {
    receipt(A)
    const stalled = stalledBody()
    vi.stubGlobal('fetch', vi.fn(async () => stalled.res))
    const p = confirmWithdrawal(A)
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
    expect(await p).toBe('failed')
    stalled.finish()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(await p).toBe('failed')
    expect(rememberedIntro()?.code).toBe(A)
  })

  it('a response that arrives after the deadline is not read as an answer', async () => {
    let late!: (r: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => (late = r))))
    const p = confirmWithdrawal(A)
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
    expect(await p).toBe('failed')
    late(new Response('{"removed":true}', { status: 200 }))
    await vi.advanceTimersByTimeAsync(1_000)
    expect(await p).toBe('failed')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('withdrawInterest shares the bound, and still keeps the receipt when it is unconfirmed', async () => {
    receipt(A)
    vi.stubGlobal('fetch', vi.fn(async () => stalledBody().res))
    const p = withdrawInterest(A)
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
    expect(await p).toBe('failed')
    expect(rememberedIntro()?.code).toBe(A)
  })
})

describe('Forget me with a confirmation that never ends', () => {
  it('wipes the phone, keeps the code, and settles at the deadline', async () => {
    store.set('niyyah.intake.v1', '{"answers":{"name":"Zqstall"}}')
    receipt(A)
    const stalled = stalledBody()
    vi.stubGlobal('fetch', vi.fn(async () => stalled.res))
    const p = forgetMe()
    expect(await settledBy(p, TIMEOUT_MS - 1)).toBe(false)
    expect(await settledBy(p, 1)).toBe(true)
    const done = await p
    expect(done).toMatchObject({ intro: false, introHeld: [A], kept: true })
    expect([...store.keys()]).toEqual([PENDING])
    expect(held()).toEqual([A])
    expect(vi.getTimerCount()).toBe(0)
    // A late valid answer changes nothing: the code stays until a request of its own is answered.
    stalled.finish()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(held()).toEqual([A])
  })

  it('waits at most two bounded rounds in all: the retry first, then its own deletes', async () => {
    // A earlier, still pending; B on this phone now; every confirmation stalls.
    store.set(PENDING, JSON.stringify({ intros: [A] }))
    receipt(B)
    vi.stubGlobal('fetch', vi.fn(async () => stalledBody().res))
    const p = forgetMe()
    // The retry's round, then the second round for A and B together: not less than two deadlines…
    expect(await settledBy(p, 2 * TIMEOUT_MS - 1)).toBe(false)
    // …and not more.
    expect(await settledBy(p, 1)).toBe(true)
    expect(held()).toEqual([A, B].sort())
    expect(vi.getTimerCount()).toBe(0)
  })

  it('a retry alone waits one round', async () => {
    store.set(PENDING, JSON.stringify({ intros: [A, B] }))
    vi.stubGlobal('fetch', vi.fn(async () => stalledBody().res))
    const p = retryPendingForget()
    expect(await settledBy(p, TIMEOUT_MS)).toBe(true)
    expect(await p).toBe(false)
    expect(held()).toEqual([A, B].sort())
    expect(pendingForget()).toEqual({ intros: [A, B].sort() })
  })
})

describe('sendRead, the one primitive under all four deletes', () => {
  let reads = 0
  const read = async (res: Response) => (reads++, (await res.json()) as { ok: boolean })
  beforeEach(() => {
    reads = 0
  })

  it('reads an answer that arrives in time, and clears its timer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"ok":true}', { status: 200 })))
    expect(await sendRead('/x', { method: 'DELETE' }, read, null)).toEqual({ ok: true })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not call the reader for a response that resolves after the deadline, and cancels it', async () => {
    let late!: (r: Response) => void
    const cancelled = vi.fn()
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => (late = r))))
    const p = sendRead('/x', { method: 'DELETE' }, read, null)
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
    expect(await p).toBeNull()
    late(new Response(new ReadableStream({ start() {}, cancel: cancelled }), { status: 200 }))
    await vi.advanceTimersByTimeAsync(1_000)
    expect(reads).toBe(0)
    expect(cancelled).toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('a body that finishes after the deadline changes nothing: the first to settle decides', async () => {
    const stalled = stalledBody()
    vi.stubGlobal('fetch', vi.fn(async () => stalled.res))
    const outcomes: string[] = []
    const p = sendRead('/x', { method: 'DELETE' }, async (res) => (outcomes.push('read'), res.json()), 'fallback')
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
    expect(await p).toBe('fallback')
    stalled.finish()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(await p).toBe('fallback')
  })

  it('aborts the request at the deadline, where the platform honours it', async () => {
    let signal: AbortSignal | null | undefined
    vi.stubGlobal('fetch', vi.fn((_u: string, init?: RequestInit) => ((signal = init?.signal), new Promise<Response>(() => {}))))
    const p = sendRead('/x', { method: 'DELETE' }, read, null)
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
    expect(await p).toBeNull()
    expect(signal?.aborted).toBe(true)
  })

  it('a rejected fetch and a reader that throws both give the fallback, at once, with no timer left', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    expect(await sendRead('/x', {}, read, null)).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
    expect(await sendRead('/x', {}, async () => { throw new Error('bad') }, 'fallback')).toBe('fallback')
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('the same deadline holds for the map, the step count and the eleven', () => {
  const KEEP_CODE = 'ACDEFG'
  const ID = 'HJKMNPQR'
  const PAIR = 'QRTWXY'
  const seed = () => {
    store.set('niyyah.keep.code.v1', KEEP_CODE)
    store.set('niyyah.install.v1', ID)
    store.set('niyyah.intake.v1', JSON.stringify({ answers: {}, couple: { code: PAIR, sentAt: 'x' } }))
  }

  it('a body that never ends is unconfirmed at the deadline for each, the codes are kept, and the phone is wiped', async () => {
    seed()
    const bodies = [stalledBody(), stalledBody(), stalledBody()]
    let n = 0
    vi.stubGlobal('fetch', vi.fn(async () => bodies[n++].res))
    const p = forgetMe()
    expect(await settledBy(p, TIMEOUT_MS - 1)).toBe(false)
    expect(await settledBy(p, 1)).toBe(true)
    expect(await p).toMatchObject({ map: false, progress: false, couple: false, intro: true, mapHeld: [KEEP_CODE], kept: true })
    expect(JSON.parse(store.get(PENDING)!)).toEqual({ code: KEEP_CODE, id: ID, pair: PAIR })
    expect([...store.keys()]).toEqual([PENDING])
    expect(vi.getTimerCount()).toBe(0)
    for (const b of bodies) b.finish()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(JSON.parse(store.get(PENDING)!)).toEqual({ code: KEEP_CODE, id: ID, pair: PAIR })
  })

  it('no response from a fetch that ignores its signal is unconfirmed at the deadline for each', async () => {
    seed()
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
    const p = forgetMe()
    expect(await settledBy(p, TIMEOUT_MS)).toBe(true)
    expect(await p).toMatchObject({ map: false, progress: false, couple: false })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('a response that arrives after the deadline is not read, and the codes stay until a request of their own is answered', async () => {
    seed()
    const late: ((r: Response) => void)[] = []
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => late.push(r))))
    const p = forgetMe()
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS)
    await p
    for (const r of late) r(new Response('{"forgotten":true,"ok":true}', { status: 200 }))
    await vi.advanceTimersByTimeAsync(5_000)
    expect(JSON.parse(store.get(PENDING)!)).toEqual({ code: KEEP_CODE, id: ID, pair: PAIR })
  })
})
