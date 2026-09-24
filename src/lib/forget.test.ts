import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCAL_KEYS, forgetMe, retryPendingForget } from './forget'

/**
 * Forget me is the control that makes every sentence on Trust enforceable.
 * These pin what it deletes, where, and that the phone is wiped whatever the
 * server said.
 */

function installStorage() {
  const store = new Map<string, string>()
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
  return store
}

let store: Map<string, string>
beforeEach(() => {
  store = installStorage()
})
afterEach(() => vi.unstubAllGlobals())

const seed = () => {
  store.set('niyyah.intake.v1', '{"answers":{}}')
  store.set('niyyah.keep.code.v1', 'ACDEFG')
  store.set('niyyah.install.v1', 'HJKMNP')
  store.set('niyyah.via.v1', 'words')
  store.set('niyyah.waitlist.queue.v1', '[]')
  store.set('niyyah.events.v1', '[]')
}

describe('forget me', () => {
  it('takes the eleven she sent him, even when she never kept a map', async () => {
    // The gap this closes: `createCouple` needs no map code, and the cascade
    // in netlify/functions/keep.ts finds the couple code inside a kept
    // snapshot. So a woman who sent him the eleven and kept nothing was told
    // forgetting was done while both sheets sat on the server for the rest of
    // the ninety days — while Trust says, with no condition, that this
    // "deletes ... the eleven you sent him" (docs/DECISIONS.md).
    store.set('niyyah.intake.v1', JSON.stringify({ answers: {}, couple: { code: 'QRSTVW', sentAt: 'x' } }))
    store.set('niyyah.install.v1', 'HJKMNP')
    const spy = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', spy)

    const result = await forgetMe()
    expect(result).toEqual({ map: true, progress: true, couple: true })
    const calls = spy.mock.calls.map((c) => c[0]).sort()
    expect(calls).toEqual([
      '/.netlify/functions/couple?code=QRSTVW',
      '/.netlify/functions/progress?id=HJKMNP',
    ])
    expect(store.size).toBe(0)
  })

  it('deletes the map by her code and the count by her install code, then wipes every key this app writes', async () => {
    seed()
    const spy = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{"forgotten":true}', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    const result = await forgetMe()
    expect(result).toEqual({ map: true, progress: true, couple: true })
    const calls = spy.mock.calls.map((c) => [c[0], c[1]?.method]).sort()
    expect(calls).toEqual([
      ['/.netlify/functions/keep?code=ACDEFG', 'DELETE'],
      ['/.netlify/functions/progress?id=HJKMNP', 'DELETE'],
    ])
    for (const key of LOCAL_KEYS) expect(store.has(key)).toBe(false)
    expect(store.size).toBe(0)
  })

  it('treats already-gone as done', async () => {
    seed()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"not_found"}', { status: 404 })))
    expect(await forgetMe()).toEqual({ map: true, progress: true, couple: true })
  })

  it('with no codes on this phone, calls nobody and still clears', async () => {
    store.set('niyyah.intake.v1', '{"answers":{}}')
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    expect(await forgetMe()).toEqual({ map: true, progress: true, couple: true })
    expect(spy).not.toHaveBeenCalled()
    expect(store.size).toBe(0)
  })

  it('wipes everything but the codes still to delete when the server cannot be reached, and says which', async () => {
    seed()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    // The code is named, so she can write in with it (docs/PRIVACY.md).
    expect(await forgetMe()).toEqual({ map: false, progress: false, couple: true, code: 'ACDEFG' })
    // One key is left: the codes, and none of her answers.
    expect([...store.keys()]).toEqual(['niyyah.forget.pending.v1'])
    expect(JSON.parse(store.get('niyyah.forget.pending.v1')!)).toEqual({ code: 'ACDEFG', id: 'HJKMNP' })
  })

  it('finishes a forget the server missed — tapping again, or just opening the app — and then leaves nothing', async () => {
    seed()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    await forgetMe()
    // Tapping Forget me again used to send nothing, and say it was done.
    const spy = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{"forgotten":true}', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    expect(await forgetMe()).toEqual({ map: true, progress: true, couple: true })
    expect(spy.mock.calls.map((c) => c[0]).sort()).toEqual(['/.netlify/functions/keep?code=ACDEFG', '/.netlify/functions/progress?id=HJKMNP'])
    expect(store.size).toBe(0)
  })

  it('sends a pending forget again on its own, and keeps what still did not land', async () => {
    seed()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    await forgetMe()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).includes('/keep') ? new Response('{}', { status: 200 }) : new Response('{}', { status: 503 }))))
    expect(await retryPendingForget()).toBe(false)
    expect(JSON.parse(store.get('niyyah.forget.pending.v1')!)).toEqual({ id: 'HJKMNP' })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
    expect(await retryPendingForget()).toBe(true)
    expect(store.size).toBe(0)
  })

  it('leaves every concern she reported with the founder — a forget me made under pressure takes none', async () => {
    // Forget me used to send every receipt this phone held and withdraw each
    // report. So "delete that app in front of me" erased the only record of a
    // threat — without the man standing over her ever knowing there was one
    // (docs/SECURITY.md, coercion). A report is a message to a person now, like
    // any sent message: it stays until the founder has read it, and then only
    // the kind of harm and what was done are kept.
    store.set('niyyah.intake.v1', '{"answers":{}}')
    store.set('niyyah.reports.v1', JSON.stringify([{ code: 'QRTWXY', side: 'woman', id: 'ACDEFGHJ' }]))
    const spy = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await forgetMe()
    expect(spy.mock.calls.filter((c) => String(c[0]).includes('/safety'))).toEqual([])
    // An older phone's receipts go with everything else on it.
    expect(store.size).toBe(0)
  })

  it('names every key the app writes', () => {
    // The list itself; tests/forget-keys.test.ts is what proves it is complete, by
    // reading src/ for every key the app actually writes. A hand-written list
    // alone cannot do that, which is how `niyyah.draft.v1` would have been
    // missed (docs/DESIGN.md).
    expect(LOCAL_KEYS.sort()).toEqual(
      [
        'niyyah.draft.v1',
        'niyyah.entry.v1',
        'niyyah.events.v1',
        'niyyah.install.v1',
        'niyyah.intake.v1',
        'niyyah.keep.code.v1',
        'niyyah.keep.once.v1',
        'niyyah.keep.rev.v1',
        'niyyah.reports.v1',
        'niyyah.via.v1',
        'niyyah.waitlist.queue.v1',
      ].sort(),
    )
  })
})
