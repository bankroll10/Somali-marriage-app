import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { seedDemo } from '../../src/lib/demo'
import { forgetMe, pendingForget, resetForgetMirror, retryPendingForget } from '../../src/lib/forget'
import { keepMap } from '../../src/lib/keep'
import * as d07 from '../support/old-builds/forget-69f8b92'
import { Phone, onPhone } from '../support/device'
import { recoveryKey, recoveryOf } from '../support/recovery'
import { blobs, call, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * ORDERING — an older request that succeeds late must not erase a newer attempt
 * for the same code that is still unresolved (docs/DECISIONS.md Part 35, the
 * ordering check), and a late report must not make a forgotten step count again
 * (Part 37, BATCH-07H).
 *
 * The client rule is unchanged and held here: an older answer does not settle a
 * code a newer request has not confirmed, within a page, whichever order the
 * answers arrive in, and with storage denied. What changed is the server. Until
 * Part 37 the progress endpoint's DELETE left nothing behind, so a report that
 * was already on its way recreated the record under the same install id, and a
 * recovery key erased by an older success could leave that record with nothing
 * naming it. Now a DELETE writes a marker first and a report under a marker is
 * refused, so there is no record for such a key to name. Keep, the eleven and the
 * introduction list already closed their codes the same way.
 *
 * Page-memory sequence numbers are per tab and nothing here coordinates tabs;
 * the two-tab test says what that still means. Everything is synthetic and
 * local: the real handlers over the in-memory store.
 */

const I = 'HJKMNPQR'

type Step = 'hold-success' | 'hold-fail' | 'fail' | 'real'
/**
 * Decide, request by request, what the phone's DELETE to `route` comes to.
 *  - `hold-success`: the handler runs and deletes; the answer is held until released.
 *  - `hold-fail`: the request is held, then fails (the handler never runs).
 *  - `fail`: fails at once, the handler never runs.
 *  - `real`: the handler answers at once.
 */
function plan(route: string, steps: Step[]) {
  const real = globalThis.fetch
  const gates = steps.map(() => {
    let open!: () => void
    const until = new Promise<void>((r) => (open = r))
    return { until, open }
  })
  let n = 0
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'DELETE' && String(input).includes(`/${route}?`)) {
      const i = n++
      const step = steps[i] ?? 'real'
      if (step === 'fail') throw new TypeError('Failed to fetch')
      if (step === 'hold-fail') {
        await gates[i].until
        throw new TypeError('Failed to fetch')
      }
      const res = await real(input, init)
      if (step === 'hold-success') await gates[i].until
      return res
    }
    return real(input, init)
  }) as typeof fetch
  return {
    release: (i: number) => gates[i].open(),
    started: () => n,
    off: () => {
      globalThis.fetch = real
    },
  }
}

let phone: Phone
let back: (() => void) | undefined
beforeEach(() => {
  blobs.reset()
  serve()
  phone = onPhone(new Phone('hers'))
  resetForgetMirror()
})
afterEach(() => {
  back?.()
  back = undefined
  vi.unstubAllGlobals()
})

const report = () => call('progress', 'POST', 'progress', { id: I, rungs: ['arrived'] })
const record = () => blobs.read('progress', I)
const held = () => recoveryOf(phone.storage).installs

/** She has an install id and a counted record on the server. */
async function counted() {
  phone.storage.set('niyyah.install.v1', I)
  expect((await report()).status).toBe(200)
  expect(record()).not.toBeNull()
}

describe('the progress endpoint: the older deletion closes the code', () => {
  it('its DELETE writes a marker, so a report that arrives afterwards is refused and makes no record', async () => {
    await counted()
    expect((await call('progress', 'DELETE', `progress?id=${I}`)).status).toBe(200)
    expect(record()).toBeNull()
    expect((await report()).status).toBe(410)
    expect(record()).toBeNull()
    expect(blobs.keys('progress-closed')).toHaveLength(1)
  })

  it('older success held, a report is refused, a newer attempt fails; the older answer is then released: the newer attempt stays unresolved, and no record exists', async () => {
    await counted()
    const net = plan('progress', ['hold-success', 'fail'])
    back = net.off
    const older = forgetMe()
    await vi.waitFor(() => expect(record()).toBeNull()) // the older deletion has run; its answer is held
    expect((await report()).status).toBe(410) // the report that was in flight: refused, the code is closed
    expect(record()).toBeNull()

    const newer = await forgetMe() // asks the same install id, and fails
    expect(newer.progress).toBe(false)
    expect(held()).toEqual([I]) // the newer attempt is kept…

    net.release(0) // …and now the older, successful answer arrives
    const result = await older
    expect(record()).toBeNull() // no record can be there: the code is closed
    expect(held()).toEqual([I]) // and the newer attempt's recovery key is still kept (the client rule)
    expect(result.progress).toBe(false) // and the page is not told it is done
    expect(pendingForget()).toEqual({ installs: [I] })

    // The next trigger asks again and, answered for real, resolves it.
    net.off()
    back = undefined
    expect(await retryPendingForget()).toBe(true)
    expect(record()).toBeNull()
    expect(held()).toEqual([])
  })

  it('the other order: the older success arrives first, then the newer attempt fails: the newer attempt is kept', async () => {
    await counted()
    const net = plan('progress', ['hold-success', 'hold-fail'])
    back = net.off
    const older = forgetMe()
    await vi.waitFor(() => expect(record()).toBeNull())
    expect((await report()).status).toBe(410) // refused: the code is closed
    const newer = forgetMe()
    await vi.waitFor(() => expect(net.started()).toBe(2))

    net.release(0)
    await older // the older answer is in; its code is settled
    net.release(1)
    const result = await newer // the newer attempt fails after it
    expect(result.progress).toBe(false)
    expect(held()).toEqual([I])
    expect(record()).toBeNull()
  })

  it('a newer attempt that is a launch retry (it captures nothing, it relies on the key staying) is not undone by an older success', async () => {
    await counted()
    phone.storage.set(recoveryKey('installs', I), '1')
    phone.storage.delete('niyyah.install.v1')
    const net = plan('progress', ['hold-success', 'fail'])
    back = net.off
    const older = retryPendingForget()
    await vi.waitFor(() => expect(record()).toBeNull())
    expect((await report()).status).toBe(410) // refused: the code is closed
    expect(await retryPendingForget()).toBe(false) // newer, fails
    net.release(0)
    await older
    expect(record()).toBeNull()
    expect(held()).toEqual([I])
  })
})

describe('a newer confirmation still resolves older failures, in either order', () => {
  it('the older attempt fails first (and is kept), then the newer one is confirmed: nothing is left', async () => {
    await counted()
    const net = plan('progress', ['hold-fail', 'hold-success'])
    back = net.off
    const older = forgetMe()
    await vi.waitFor(() => expect(net.started()).toBe(1))
    const newer = forgetMe()
    await vi.waitFor(() => expect(net.started()).toBe(2))
    net.release(0)
    expect((await older).progress).toBe(false)
    expect(held()).toEqual([I])
    net.release(1)
    expect((await newer).progress).toBe(true)
    expect(held()).toEqual([])
    expect(record()).toBeNull()
  })

  it('the newer attempt is confirmed first, then the older one fails: the old failure is stale and brings nothing back', async () => {
    await counted()
    const net = plan('progress', ['hold-fail', 'real'])
    back = net.off
    const older = forgetMe()
    await vi.waitFor(() => expect(net.started()).toBe(1))
    const newer = await forgetMe() // confirmed at once
    expect(newer.progress).toBe(true)
    expect(held()).toEqual([])
    net.release(0)
    await older
    expect(held()).toEqual([])
    expect(record()).toBeNull()
  })
})

describe('a browser that will not save: the page memory is held to the same rule', () => {
  it('the newer unresolved attempt is in page memory, and an older success does not clear it', async () => {
    await counted()
    phone.refuse(/^niyyah\.forget/)
    const net = plan('progress', ['hold-success', 'fail'])
    back = net.off
    const older = forgetMe()
    await vi.waitFor(() => expect(record()).toBeNull())
    expect((await report()).status).toBe(410) // refused: the code is closed
    const newer = await forgetMe()
    expect(newer).toMatchObject({ progress: false, kept: false })
    expect(held()).toEqual([]) // nothing on disk
    expect(pendingForget()).toEqual({ installs: [I] }) // the page holds it

    net.release(0)
    const result = await older
    expect(result.progress).toBe(false)
    expect(record()).toBeNull()
    expect(pendingForget()).toEqual({ installs: [I] })

    // Storage works again: the next trigger persists it, then a real answer resolves it.
    phone.refuse(null)
    net.off()
    back = undefined
    expect(await retryPendingForget()).toBe(true)
    expect(record()).toBeNull()
    expect(pendingForget()).toBeNull()
  })
})

describe('the keep endpoint: the same ordering is a redundant request, not a need', () => {
  it('its tombstone answers 410 to every later write, so the map cannot exist after the older deletion', async () => {
    seedDemo()
    const code = (await keepMap())!
    const net = plan('keep', ['hold-success', 'fail'])
    back = net.off
    const older = forgetMe()
    await vi.waitFor(() => expect(blobs.read('maps', code)).toBeNull())
    // Nothing can put it back: a write under the closed code is refused.
    const again = await call('keep', 'POST', 'keep', { code, snapshot: { identity: { firstName: 'Hodan' } } })
    expect(again.status).toBe(410)
    expect(blobs.read('maps', code)).toBeNull()

    const newer = await forgetMe() // fails: unconfirmed, but there is nothing left to delete
    expect(newer.map).toBe(false)
    net.release(0)
    await older
    // The newer attempt is kept anyway (the code cannot tell the two cases apart): one redundant request resolves it.
    expect(recoveryOf(phone.storage).maps).toEqual([code])
    net.off()
    back = undefined
    expect(await retryPendingForget()).toBe(true)
    expect(recoveryOf(phone.storage).maps).toEqual([])
    expect(blobs.read('maps', code)).toBeNull()
  })
})

describe('two tabs have separate sequences, and that no longer leaves a record', () => {
  it('another tab’s older success removes the key this tab’s newer failure wrote — the client limit is unchanged — and the code is closed, so no record is left for that key to name', async () => {
    await counted()
    const net = plan('progress', ['hold-success', 'fail'])
    back = net.off
    vi.resetModules()
    const tabA = await import('../../src/lib/forget')
    vi.resetModules()
    const tabB = await import('../../src/lib/forget')
    const older = tabA.forgetMe()
    await vi.waitFor(() => expect(record()).toBeNull())
    expect((await report()).status).toBe(410) // the report in flight when A's delete was processed
    expect((await tabB.forgetMe()).progress).toBe(false)
    expect(held()).toEqual([I])
    net.release(0)
    await older
    // Tab A knows nothing of tab B's request: sequence numbers are per page, and its confirmation removes the key. That is
    // still so. What it can no longer cost is a record: the server closed the code, so none exists and none can be made.
    expect(held()).toEqual([])
    expect(record()).toBeNull()
    expect(blobs.keys('progress-closed')).toHaveLength(1)
  })
})

describe('a report that is not the cross-tab case at all', () => {
  it('one tab: a report already in flight when Forget me runs is refused, and nothing is left on the server or the phone', async () => {
    await counted()
    // The report began before the DELETE and finishes after it: Forget me runs, whole, between its read and its write.
    blobs.before('getWithMetadata', I, async () => expect((await forgetMe()).progress).toBe(true), 'progress')
    const res = await report()
    expect([200, 410]).toContain(res.status)
    expect(record()).toBeNull()
    expect(blobs.keys('progress-closed')).toHaveLength(1)
    expect(held()).toEqual([])
    expect(phone.storage.has('niyyah.install.v1')).toBe(false)
  })

  it('no record yet: the DELETE finds nothing and is confirmed, and the first report to arrive afterwards is refused', async () => {
    phone.storage.set('niyyah.install.v1', I) // an id minted, its first report not yet landed
    expect((await forgetMe()).progress).toBe(true)
    expect(blobs.keys('progress-closed')).toHaveLength(1)
    expect((await report()).status).toBe(410)
    expect(record()).toBeNull()
  })

  it('an older build’s Forget me (its forget.ts, a hybrid test) is protected too: the server refuses the late report', async () => {
    await counted()
    d07.resetForgetMirror()
    await d07.forgetMe()
    expect(record()).toBeNull()
    expect((await report()).status).toBe(410)
    expect(record()).toBeNull()
  })
})
