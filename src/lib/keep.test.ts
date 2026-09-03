import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { codeFromUrl, keepMap, rememberedCode, restoreLink, restoreMap } from './keep'
import { saveProgress } from './storage'
import { defaultPlus, defaultTrust } from '../types'

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
  checkIns: [],
  firstSeen: '2026-09-02',
  mapHistory: [],
  stage: 'preparing' as const,
  steps: [],
  plus: defaultPlus,
  waitlist: null,
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
