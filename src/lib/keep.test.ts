import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { codeFromUrl, keepMap, rememberedCode, restoreLink, restoreMap } from './keep'
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
    // The read's follow-up is not the guide's, and stays.
    expect(sent.followups.map((f: { id: string }) => f.id)).toEqual(['r1'])
  })

  it('sends everything else the app needs to bring her back', async () => {
    saveProgress(state)
    const spy = vi.fn(async (_input: string, _init?: RequestInit) => new Response(JSON.stringify({ code: 'ACDEFG' }), { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await keepMap()
    const sent = JSON.parse(spy.mock.calls[0][1]?.body as string).snapshot
    const expected = Object.keys(loadProgress()!).filter((k) => k !== 'coachThreads').sort()
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
