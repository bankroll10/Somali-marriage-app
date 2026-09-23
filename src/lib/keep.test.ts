import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adoptMap, codeFromUrl, keepMap, keptSnapshot, rememberedCode, restoreLink, restoreMap } from './keep'
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
  steps: [],
  guide: defaultGuideUse,
  waitlist: null,
  read: null,
  beforeYes: null,
  couple: null,
  vouch: null,
  ending: null,
  endings: [],
  hesitated: null,
  began: [],
  completed: true,
  matched: [],
  pendingInterest: [],
  passed: [],
  conversations: {},
  coachThreads: {},
  interestNotes: {},
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

  it('carries no email or phone, and nothing the guide handed her', async () => {
    saveProgress({
      ...state,
      waitlist: { contact: 'sagal@example.com', scene: 'toronto', code: 'ACDEFG', joinedAt: '2026-01-01' },
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
    expect(body).not.toContain('sagal@example.com')
    expect(body).not.toContain('tell hooyo')
    expect(body).not.toContain('on a Tuesday')
    // Her place on the door survives without the way to reach her.
    expect(sent.waitlist).toEqual({ scene: 'toronto', code: 'ACDEFG', joinedAt: '2026-01-01' })
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

  it('comes back with her place on the door and no contact, whatever the snapshot held', async () => {
    const old = { ...state, waitlist: { contact: 'kept-by-an-older-version', scene: 'toronto', joinedAt: 'x' } }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ snapshot: old }), { status: 200 })))
    const restored = await restoreMap('ACDEFG')
    expect(restored?.waitlist).toEqual({ contact: '', scene: 'toronto', joinedAt: 'x' })
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

describe('a patch laid over the device', () => {
  it('is sent under her existing code, and the device is left as it was', async () => {
    saveProgress(state)
    localStorage.setItem('niyyah.keep.code.v1', 'ACDEFG')
    let sent: { code?: string; snapshot?: { identity?: { age?: number; firstName?: string } } } = {}
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        sent = JSON.parse(init!.body as string)
        return new Response(JSON.stringify({ code: 'ACDEFG' }), { status: 200 })
      }),
    )
    expect(await keepMap({ identity: { age: 28 } })).toBe('ACDEFG')
    expect(sent.code).toBe('ACDEFG')
    expect(sent.snapshot?.identity).toMatchObject({ firstName: 'Sagal', age: 28 })
    // The patch is for the copy on the server; nothing on the phone moved.
    expect(loadProgress()?.identity.age).toBeUndefined()
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
