import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rememberVia, rememberedVia, reportRungs, resetReported } from './progress'

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
  resetReported()
})
afterEach(() => vi.unstubAllGlobals())

async function lastBody(spy: ReturnType<typeof vi.fn>): Promise<Record<string, unknown>> {
  const init = spy.mock.calls[spy.mock.calls.length - 1][1] as RequestInit
  return JSON.parse(init.body as string)
}

describe('what kind of link brought her here', () => {
  it('remembers the first, and never overwrites it', () => {
    rememberVia('door')
    rememberVia('words')
    expect(rememberedVia()).toBe('door')
  })

  it('goes out with every report, so a failed first report loses nothing', async () => {
    rememberVia('eleven')
    const spy = vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await reportRungs(['arrived'])
    await reportRungs(['arrived', 'situated'])
    expect((await lastBody(spy)).via).toBe('eleven')
    expect(spy.mock.calls.length).toBe(2)
  })

  it('sends no field at all when there was no link', async () => {
    const spy = vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await reportRungs(['arrived'])
    expect('via' in (await lastBody(spy))).toBe(false)
  })

  it('never sends a value it does not recognise, even from storage', async () => {
    store.set('niyyah.via.v1', 'instagram')
    expect(rememberedVia()).toBeNull()
    const spy = vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await reportRungs(['arrived'])
    expect('via' in (await lastBody(spy))).toBe(false)
  })

  it('sends only the id, the rungs, the city and the via — nothing else', async () => {
    rememberVia('words')
    const spy = vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await reportRungs(['arrived', 'read'], 'twin-cities')
    expect(Object.keys(await lastBody(spy)).sort()).toEqual(['id', 'rungs', 'scene', 'via'])
  })
})
