import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adoptMap, codeFromUrl, keepMap, keepMapDetail, keptSnapshot, rememberCode, rememberedCode, rememberedRev, restoreDetail, restoreLink, restoreMap } from './keep'
import { loadProgress, saveProgress } from './storage'
import { defaultGuideUse, defaultTrust } from '../types'

/**
 * The first thing the business owns.
 *
 * Everything about a member used to live in her browser and nowhere else: clear
 * Safari and she was gone, and we never knew she had existed. These guard the
 * two properties that make the fix worth having — it actually persists, and it
 * can never take anything away.
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
}

const state = {
  answers: { timeline: '1-2' },
  identity: { firstName: 'Sagal', gender: 'woman' as const },
  trust: defaultTrust,
  mapHistory: [],
  stage: 'preparing' as const,
  situated: true,
  followups: [],
  guide: defaultGuideUse,
  read: null,
  beforeYes: null,
  couple: null,
  ending: null,
  endings: [],
  began: [],
  completed: true,
  coachThreads: {},
}

beforeEach(() => {
  installStorage()
  vi.stubGlobal('window', { location: { search: '' } })
})
afterEach(() => vi.unstubAllGlobals())

describe('keeping a map', () => {
  it('sends what is on the device and remembers the code it gets back', async () => {
    saveProgress(state)
    const spy = vi.fn(async (_input: string, _init?: RequestInit) => new Response(JSON.stringify({ code: 'ACDEFG' }), { status: 200 }))
    vi.stubGlobal('fetch', spy)

    expect(await keepMap()).toBe('ACDEFG')
    const sent = JSON.parse(spy.mock.calls[0][1]?.body as string)
    expect(sent.snapshot.identity.firstName).toBe('Sagal')
    // Remembered, so she is shown her code rather than asked for it again.
    expect(rememberedCode()).toBe('ACDEFG')
  })

  it('never sends the guide’s threads', async () => {
    saveProgress({ ...state, coachThreads: { auntie: [{ id: '1', role: 'user', text: 'the secret thing' }] } })
    const spy = vi.fn(async (_input: string, _init?: RequestInit) => new Response(JSON.stringify({ code: 'ACDEFG' }), { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await keepMap()
    const body = spy.mock.calls[0][1]?.body as string
    expect(JSON.parse(body).snapshot.coachThreads).toBeUndefined()
    expect(body).not.toContain('the secret thing')
  })

  it('carries nothing the guide handed her', async () => {
    saveProgress({
      ...state,
      followups: [
        { id: 'g1', source: 'guide', topic: 'should I tell hooyo about him', words: 'Tell her on a Tuesday, plainly.', at: '2026-01-01' },
        { id: 'r1', source: 'read', topic: 'public', at: '2026-01-02' },
      ],
    })
    const spy = vi.fn(async (_input: string, _init?: RequestInit) => new Response(JSON.stringify({ code: 'ACDEFG' }), { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await keepMap()
    const body = spy.mock.calls[0][1]?.body as string
    const sent = JSON.parse(body).snapshot
    expect(body).not.toContain('tell hooyo')
    expect(body).not.toContain('on a Tuesday')
    // The read's follow-up is not the guide's, and stays — under an id that
    // carries no moment (docs/PRIVACY.md, C2).
    expect(sent.followups.map((f: { source: string }) => f.source)).toEqual(['read'])
  })

  it('sends everything else the app needs to bring her back', async () => {
    saveProgress(state)
    const spy = vi.fn(async (_input: string, _init?: RequestInit) => new Response(JSON.stringify({ code: 'ACDEFG' }), { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await keepMap()
    const sent = JSON.parse(spy.mock.calls[0][1]?.body as string).snapshot
    // Everything but the guide's threads and `updatedAt`, a last-seen time the
    // server has no use for (docs/PRIVACY.md, C1).
    const expected = Object.keys(loadProgress()!).filter((k) => k !== 'coachThreads' && k !== 'updatedAt').sort()
    expect(Object.keys(sent).sort()).toEqual(expected)
  })

  it('re-keeps under the code she already has, never issuing a second one', async () => {
    saveProgress(state)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ code: 'ACDEFG' }), { status: 200 })))
    await keepMap()

    const spy = vi.fn(async (_input: string, _init?: RequestInit) => new Response(JSON.stringify({ code: 'ACDEFG' }), { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await keepMap()
    expect(JSON.parse(spy.mock.calls[0][1]?.body as string).code).toBe('ACDEFG')
  })

  it('does nothing at all when there is no map yet', async () => {
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    expect(await keepMap()).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('fails silently when the server is unreachable — her map is untouched', async () => {
    saveProgress(state)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await keepMap()).toBeNull()
    expect(rememberedCode()).toBeNull()
  })

  it('fails silently on a server error too', async () => {
    saveProgress(state)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 503 })))
    expect(await keepMap()).toBeNull()
  })
})

describe('bringing a map back', () => {
  it('returns the stored snapshot for a good code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ snapshot: state }), { status: 200 })))
    const restored = await restoreMap('acdefg')
    expect(restored?.identity.firstName).toBe('Sagal')
  })

  it('comes back with empty guide threads, even from a snapshot kept before they were left out', async () => {
    const old = { ...state, coachThreads: { auntie: [{ id: '1', role: 'user', text: 'kept by an older version' }] } }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ snapshot: old }), { status: 200 })))
    const restored = await restoreMap('ACDEFG')
    expect(restored?.coachThreads).toEqual({})
  })

  it('normalises what a human types — case, spaces and dashes', async () => {
    const spy = vi.fn(async (_input: string, _init?: RequestInit) => new Response(JSON.stringify({ snapshot: state }), { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await restoreMap(' acd-efg ')
    expect(spy.mock.calls[0][0]).toContain('code=ACDEFG')
  })

  it('returns null for an unknown code rather than clearing anything', async () => {
    saveProgress(state)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    expect(await restoreMap('ZZZZZZ')).toBeNull()
    // The map she already had is still exactly where it was.
    expect(localStorage.getItem('niyyah.intake.v1')).toContain('Sagal')
  })

  it('fetches without adopting — the code only becomes this phone’s after she says the map is hers', async () => {
    // restoreDetail used to remember the code on fetch, so opening anyone's
    // `?map=` link made their code this phone's own and every later keep wrote
    // under it (docs/SECURITY.md, O2).
    saveProgress(state)
    localStorage.setItem('niyyah.keep.code.v1', 'HJKMNP')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ snapshot: { ...state, identity: { firstName: 'Not her' } } }), { status: 200 })))
    const fetched = await restoreMap('ACDEFG')
    expect(fetched?.identity.firstName).toBe('Not her')
    expect(rememberedCode()).toBe('HJKMNP')
    expect(localStorage.getItem('niyyah.intake.v1')).toContain('Sagal')

    adoptMap('acd-efg', fetched!)
    expect(rememberedCode()).toBe('ACDEFG')
    expect(localStorage.getItem('niyyah.intake.v1')).toContain('Not her')
  })

  it('builds a link that opens the map anywhere', () => {
    expect(restoreLink('ACDEFG', 'https://getniyyah.netlify.app')).toBe(
      'https://getniyyah.netlify.app/?map=ACDEFG',
    )
  })

  it('reads a code out of a restore link', () => {
    vi.stubGlobal('window', { location: { search: '?map=acd-efg' } })
    expect(codeFromUrl()).toBe('ACDEFG')
  })

  it('is absent when there is no code in the url', () => {
    expect(codeFromUrl()).toBeNull()
  })
})

describe('what a kept map carries — only what bringing her back needs (docs/PRIVACY.md)', () => {
  const full = {
    ...state,
    updatedAt: 1758612345678,
    read: { at: '2026-09-23T10:11:12.345Z', answers: { a: 'b' }, checkedAt: '2026-09-24T08:00:00.000Z' },
    couple: { code: 'HJKMNPQR', at: '2026-09-23T10:11:12.345Z' },
    ending: { at: '2026-09-23T10:11:12.345Z', who: 'met-here', advice: 'Ask about money before the nikah.' },
    followups: [
      { id: 'read:public:2026-09-23T10:11:12.345Z', source: 'read' as const, topic: 'public', at: '2026-09-23T10:11:12.345Z' },
      { id: 'read:public:2026-09-23T11:00:00.000Z', source: 'read' as const, topic: 'public', at: '2026-09-23T11:00:00.000Z', outcome: 'had' as const, outcomeAt: '2026-09-23T12:00:00.000Z' },
    ],
  }

  it('keeps no moment finer than a day, anywhere in it', () => {
    // LEARNING's rule — "every stored date is a day" — held for every store
    // but this one: the map carried millisecond timestamps, and `updatedAt`
    // was a last-seen time under another name.
    const kept = keptSnapshot(full as never)
    expect(JSON.stringify(kept)).not.toMatch(/T\d{2}:\d{2}/)
    expect(kept).not.toHaveProperty('updatedAt')
    expect(kept.read?.at).toBe('2026-09-23')
    expect(kept.couple?.at).toBe('2026-09-23')
  })

  it('keeps follow-ups apart without a time in their ids', () => {
    const ids = keptSnapshot(full as never).followups.map((f) => f.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('leaves her line for the next person on this phone — Ending says it never leaves', () => {
    const kept = keptSnapshot(full as never)
    expect(kept.ending).toEqual({ at: '2026-09-23', who: 'met-here' })
  })
})

describe('a new code for a map someone has seen', () => {
  beforeEach(installStorage)
  afterEach(() => vi.unstubAllGlobals())

  it('asks for one under the old code, and makes the new one this phone’s own', async () => {
    localStorage.setItem('niyyah.keep.code.v1', 'ACDEFG34')
    const spy = vi.fn(async (_url: string, _init?: RequestInit) => Response.json({ code: 'HJKM47QR' }))
    vi.stubGlobal('fetch', spy)
    const { rotateCode } = await import('./keep')
    expect(await rotateCode()).toBe('HJKM47QR')
    expect(spy.mock.calls[0][0]).toMatch(/keep\?code=ACDEFG34$/)
    expect(spy.mock.calls[0][1]?.method).toBe('PUT')
    expect(rememberedCode()).toBe('HJKM47QR')
  })

  it('keeps the old code when the change does not go through', async () => {
    localStorage.setItem('niyyah.keep.code.v1', 'ACDEFG34')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })))
    const { rotateCode } = await import('./keep')
    expect(await rotateCode()).toBeNull()
    expect(rememberedCode()).toBe('ACDEFG34')
  })
})

describe('two phones, one map (docs/INTEGRITY.md)', () => {
  const ok = (body: object) => new Response(JSON.stringify(body), { status: 200 })

  it('sends the revision it last saw, and remembers the one it gets back', async () => {
    saveProgress(state)
    rememberCode('ACDEFGHJ', 3)
    const spy = vi.fn(async (_input: string, _init?: RequestInit) => ok({ code: 'ACDEFGHJ', rev: 4 }))
    vi.stubGlobal('fetch', spy)
    expect(await keepMap()).toBe('ACDEFGHJ')
    expect(JSON.parse(spy.mock.calls[0][1]?.body as string).rev).toBe(3)
    expect(rememberedRev()).toBe(4)
  })

  it('a phone behind another is told so, writes nothing over it, and keeps its code', async () => {
    saveProgress(state)
    rememberCode('ACDEFGHJ', 2)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'stale', rev: 3 }), { status: 409 })))
    expect(await keepMapDetail()).toBe('stale')
    // No second map: she keeps the code she already has.
    expect(await keepMap()).toBeNull()
    expect(rememberedCode()).toBe('ACDEFGHJ')
  })

  it('a code closed from another phone is dropped, never quietly replaced by a new map', async () => {
    saveProgress(state)
    rememberCode('ACDEFGHJ', 2)
    const spy = vi.fn(async () => new Response(JSON.stringify({ error: 'moved' }), { status: 410 }))
    vi.stubGlobal('fetch', spy)
    expect(await keepMapDetail()).toBe('moved')
    expect(spy).toHaveBeenCalledTimes(1)
    expect(rememberedCode()).toBeNull()
  })

  it('never mistakes a problem for a code', async () => {
    // "unreachable" cleans to eight letters of the code alphabet.
    saveProgress(state)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await keepMapDetail()).toBe('unreachable')
    expect(await keepMap()).toBeNull()
  })

  it('a first keep sent twice carries the same key both times, until a code comes back', async () => {
    saveProgress(state)
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('lost') }))
    await keepMap()
    const spy = vi.fn(async (_input: string, _init?: RequestInit) => ok({ code: 'ACDEFGHJ', rev: 1 }))
    vi.stubGlobal('fetch', spy)
    await keepMap()
    const first = JSON.parse(spy.mock.calls[0][1]?.body as string).once
    expect(first).toMatch(/^[ACDEFGHJKMNPQRTWXY34789]{10}$/)
    expect(localStorage.getItem('niyyah.keep.once.v1')).toBeNull()
  })

  it('two taps at once are one request', async () => {
    saveProgress(state)
    const spy = vi.fn(async () => ok({ code: 'ACDEFGHJ', rev: 1 }))
    vi.stubGlobal('fetch', spy)
    const [a, b] = await Promise.all([keepMap(), keepMap()])
    expect(a).toBe('ACDEFGHJ')
    expect(b).toBe('ACDEFGHJ')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('a restored map is adopted at the revision it came at', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ok({ snapshot: { answers: {}, identity: {} }, rev: 7 })))
    const map = await restoreDetail('ACDEFGHJ')
    adoptMap('ACDEFGHJ', map as never)
    expect(rememberedRev()).toBe(7)
  })

  it('a restore of a closed code says which', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'forgotten' }), { status: 410 })))
    expect(await restoreDetail('ACDEFGHJ')).toBe('forgotten')
  })
})
