import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCAL_KEYS, forgetMe } from './forget'

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
  it('deletes the map by her code and the count by her install code, then wipes every key this app writes', async () => {
    seed()
    const spy = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{"forgotten":true}', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    const result = await forgetMe()
    expect(result).toEqual({ map: true, progress: true })
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
    expect(await forgetMe()).toEqual({ map: true, progress: true })
  })

  it('with no codes on this phone, calls nobody and still clears', async () => {
    store.set('niyyah.intake.v1', '{"answers":{}}')
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    expect(await forgetMe()).toEqual({ map: true, progress: true })
    expect(spy).not.toHaveBeenCalled()
    expect(store.size).toBe(0)
  })

  it('wipes the phone even when the server cannot be reached, and says so', async () => {
    seed()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await forgetMe()).toEqual({ map: false, progress: false })
    expect(store.size).toBe(0)
  })

  it('names every key the app writes', () => {
    expect(LOCAL_KEYS.sort()).toEqual(
      ['niyyah.events.v1', 'niyyah.install.v1', 'niyyah.intake.v1', 'niyyah.keep.code.v1', 'niyyah.via.v1', 'niyyah.waitlist.queue.v1'].sort(),
    )
  })
})
