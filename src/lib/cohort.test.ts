import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cohortCount, joinCohort } from './cohort'
import { saveProgress } from './storage'
import { defaultPlus, defaultTrust } from '../types'

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
  answers: { 'hardest-part': 'serious' },
  identity: { firstName: 'Sagal', gender: 'woman' as const, scene: 'twin-cities' },
  trust: defaultTrust,
  checkIns: [],
  firstSeen: '2026-09-03',
  mapHistory: [],
  stage: 'preparing' as const,
  situated: true,
  steps: [],
  plus: defaultPlus,
  waitlist: null,
  read: null,
  beforeYes: null,
  couple: null,
  vouch: null,
  completed: true,
  matched: [],
  pendingInterest: [],
  passed: [],
  conversations: {},
  coachThreads: {},
  interestNotes: {},
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

beforeEach(() => {
  installStorage()
  vi.stubGlobal('window', { location: { search: '' } })
})
afterEach(() => vi.unstubAllGlobals())

describe('reading the count', () => {
  it('returns the real number, and only the real number', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ scene: 'twin-cities', women: 3, men: 1, target: 40 })))
    expect(await cohortCount('twin-cities')).toEqual({ women: 3, men: 1, target: 40 })
  })

  it('returns nothing rather than a guess when the server is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: 'unavailable' }, 503)))
    expect(await cohortCount('twin-cities')).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await cohortCount('twin-cities')).toBeNull()
  })
})

describe('joining', () => {
  it('keeps the map first, then counts her under that code', async () => {
    saveProgress(state)
    const calls: { url: string; body: Record<string, unknown> }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const body = init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {}
        calls.push({ url, body })
        if (url.endsWith('/keep')) return json({ code: 'ACDEFG' })
        return json({ code: 'ACDEFG', scene: 'twin-cities', women: 1, men: 0, target: 40 })
      }),
    )
    const result = await joinCohort({ scene: 'twin-cities', gender: 'woman', hook: 'serious', overall: 88, voices: ['auntie'], ledger: ['map', 'kept'] })
    expect(result).toEqual({ code: 'ACDEFG', women: 1, men: 0, target: 40 })
    expect(calls[0].url).toContain('/keep')
    expect(calls[1].url).toContain('/cohort')
    expect(calls[1].body).toMatchObject({ code: 'ACDEFG', scene: 'twin-cities', gender: 'woman', hook: 'serious', overall: 88, voices: ['auntie'], ledger: ['map', 'kept'] })
  })

  it('re-keeps the map and retries once when the server has lost it', async () => {
    saveProgress(state)
    localStorage.setItem('niyyah.keep.code.v1', 'HJKMNP')
    let cohortCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.endsWith('/keep')) return json({ code: 'HJKMNP' })
        cohortCalls += 1
        return cohortCalls === 1
          ? json({ error: 'no_map' }, 404)
          : json({ code: 'HJKMNP', scene: 'twin-cities', women: 1, men: 0, target: 40 })
      }),
    )
    expect((await joinCohort({ scene: 'twin-cities', gender: 'woman' }))?.code).toBe('HJKMNP')
    expect(cohortCalls).toBe(2)
  })

  it('does nothing when there is no map to keep', async () => {
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    expect(await joinCohort({ scene: 'twin-cities', gender: 'woman' })).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('fails quietly when the count cannot be written', async () => {
    saveProgress(state)
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => (url.endsWith('/keep') ? json({ code: 'ACDEFG' }) : json({ error: 'unavailable' }, 503))),
    )
    expect(await joinCohort({ scene: 'twin-cities', gender: 'woman' })).toBeNull()
  })
})
