import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installId, rememberVia, rememberedVia, reportRungs, resetReported } from './progress'

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
    rememberVia('family')
    rememberVia('words')
    expect(rememberedVia()).toBe('family')
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

  it('sends which side she is on when it is known, and no field when it is not', async () => {
    const spy = vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await reportRungs(['arrived'], undefined, undefined, 'man')
    expect((await lastBody(spy)).gender).toBe('man')
    // A correction at Identity is a new signature, so it posts once more.
    await reportRungs(['arrived'], undefined, undefined, 'woman')
    expect(spy).toHaveBeenCalledTimes(2)
    expect((await lastBody(spy)).gender).toBe('woman')
  })
})

describe('the facts beside the rungs', () => {
  it('sends facts when given them, and no field at all when there are none', async () => {
    const spy = vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await reportRungs(['arrived', 'read'], 'toronto', { read: { band: 'mixed', thin: 'public' } })
    expect((await lastBody(spy)).facts).toEqual({ read: { band: 'mixed', thin: 'public' } })
    await reportRungs(['arrived'], 'toronto', {})
    expect('facts' in (await lastBody(spy))).toBe(false)
  })

  it('a re-render with the same facts posts nothing; a new fact posts once', async () => {
    const spy = vi.fn(async () => new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await reportRungs(['arrived', 'read'], undefined, { read: { band: 'mixed', thin: 'public' } })
    await reportRungs(['arrived', 'read'], undefined, { read: { band: 'mixed', thin: 'public' } })
    expect(spy.mock.calls.length).toBe(1)
    await reportRungs(['arrived', 'read'], undefined, { read: { band: 'mixed', thin: 'public' }, through: ['read:public'] })
    expect(spy.mock.calls.length).toBe(2)
  })
})

describe('the install code', () => {
  it('throws away the bytes that would bias it, like the server does', () => {
    // 256 = 11×23 + 3: bytes 253, 254 and 255 used to fold onto A, C and D, so
    // those three came up one time in eleven more often (docs/SECURITY.md O11).
    const draws = [
      [253, 254, 255, 1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10, 11, 12, 13],
    ]
    vi.stubGlobal('crypto', { getRandomValues: (a: Uint8Array) => (a.set(draws.shift()!), a) })
    const ALPHABET = 'ACDEFGHJKMNPQRTWXY34789'
    expect(installId()).toBe([1, 2, 3, 4, 5, 6, 7, 8].map((i) => ALPHABET[i]).join(''))
  })
})
