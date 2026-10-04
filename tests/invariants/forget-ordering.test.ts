import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { seedDemo } from '../../src/lib/demo'
import { forgetMe, pendingForget, resetForgetMirror, retryPendingForget } from '../../src/lib/forget'
import { keepMap } from '../../src/lib/keep'
import { Phone, onPhone } from '../support/device'
import { recoveryKey, recoveryOf } from '../support/recovery'
import { blobs, call, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * ORDERING — an older request that succeeds late must not erase a newer attempt
 * for the same code that is still unresolved (docs/DECISIONS.md Part 35, the
 * ordering check).
 *
 * The question is whether that can lose a recovery that matters. It can only
 * when a record can exist on the server *after* the older deletion, while the
 * newer deletion stays unconfirmed. The progress endpoint is that case: its
 * DELETE writes no marker, and a report that was already on its way recreates
 * the record under the same install id (netlify/functions/progress.ts). The keep
 * endpoint is the opposite: its DELETE leaves a tombstone and every later write
 * under the code answers 410, so a newer unconfirmed attempt there is a
 * redundant request for something already gone.
 *
 * Everything is synthetic and local: the real handlers over the in-memory store.
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

describe('the progress endpoint: a record can exist after the older deletion', () => {
  it('its DELETE leaves no marker, so a report already on its way recreates the record under the same id', async () => {
    await counted()
    expect((await call('progress', 'DELETE', `progress?id=${I}`)).status).toBe(200)
    expect(record()).toBeNull()
    expect((await report()).status).toBe(200)
    expect(record()).not.toBeNull()
  })

  it('older success held, a report recreates the record, a newer attempt fails; the older answer is then released: the newer attempt stays unresolved', async () => {
    await counted()
    const net = plan('progress', ['hold-success', 'fail'])
    back = net.off
    const older = forgetMe()
    await vi.waitFor(() => expect(record()).toBeNull()) // the older deletion has run; its answer is held
    expect((await report()).status).toBe(200) // the report that was in flight
    expect(record()).not.toBeNull()

    const newer = await forgetMe() // asks the same install id, and fails
    expect(newer.progress).toBe(false)
    expect(held()).toEqual([I]) // the newer attempt is kept…

    net.release(0) // …and now the older, successful answer arrives
    const result = await older
    expect(record()).not.toBeNull() // the record is still there
    expect(held()).toEqual([I]) // so its recovery key must be
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
    expect((await report()).status).toBe(200)
    const newer = forgetMe()
    await vi.waitFor(() => expect(net.started()).toBe(2))

    net.release(0)
    await older // the older answer is in; its code is settled
    net.release(1)
    const result = await newer // the newer attempt fails after it
    expect(result.progress).toBe(false)
    expect(held()).toEqual([I])
    expect(record()).not.toBeNull()
  })

  it('a newer attempt that is a launch retry (it captures nothing, it relies on the key staying) is not undone by an older success', async () => {
    await counted()
    phone.storage.set(recoveryKey('installs', I), '1')
    phone.storage.delete('niyyah.install.v1')
    const net = plan('progress', ['hold-success', 'fail'])
    back = net.off
    const older = retryPendingForget()
    await vi.waitFor(() => expect(record()).toBeNull())
    expect((await report()).status).toBe(200)
    expect(await retryPendingForget()).toBe(false) // newer, fails
    net.release(0)
    await older
    expect(record()).not.toBeNull()
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
    expect((await report()).status).toBe(200)
    const newer = await forgetMe()
    expect(newer).toMatchObject({ progress: false, kept: false })
    expect(held()).toEqual([]) // nothing on disk
    expect(pendingForget()).toEqual({ installs: [I] }) // the page holds it

    net.release(0)
    const result = await older
    expect(result.progress).toBe(false)
    expect(record()).not.toBeNull()
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

describe('LIMITATION: two tabs have separate sequences', () => {
  it('another tab\'s older success removes the key this tab\'s newer failure wrote: sequence numbers are per page, and nothing here coordinates tabs', async () => {
    await counted()
    const net = plan('progress', ['hold-success', 'fail'])
    back = net.off
    vi.resetModules()
    const tabA = await import('../../src/lib/forget')
    vi.resetModules()
    const tabB = await import('../../src/lib/forget')
    const older = tabA.forgetMe()
    await vi.waitFor(() => expect(record()).toBeNull())
    expect((await report()).status).toBe(200)
    expect((await tabB.forgetMe()).progress).toBe(false)
    expect(held()).toEqual([I])
    net.release(0)
    await older
    // Tab A knows nothing of tab B's request: its confirmation removes the key. The record exists and no key names it.
    expect(record()).not.toBeNull()
    expect(held()).toEqual([])
  })
})
