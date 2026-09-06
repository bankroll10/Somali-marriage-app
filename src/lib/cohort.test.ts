import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cohortCount, joinCohort } from './cohort'
import { saveProgress } from './storage'
import { defaultGuideUse, defaultTrust } from '../types'

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
  coachThreads: {},
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

beforeEach(() => {
  installStorage()
  vi.stubGlobal('window', { location: { search: '' } })
})
afterEach(() => vi.unstubAllGlobals())

const served = { scene: 'twin-cities', country: 'us', here: { women: 3, men: 1 }, across: { women: 12, men: 4 }, target: 40 }

describe('reading the count', () => {
  it('returns the real numbers — the city and the country’s travellers — and only those', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(served)))
    expect(await cohortCount('twin-cities')).toEqual({ here: { women: 3, men: 1 }, across: { women: 12, men: 4 }, target: 40 })
  })

  it('asks by city, and by country only for somewhere-else', async () => {
    const spy = vi.fn(async (_url: string) => json(served))
    vi.stubGlobal('fetch', spy)
    await cohortCount('twin-cities')
    expect(spy.mock.calls[0][0]).toBe('/.netlify/functions/cohort?scene=twin-cities')
    await cohortCount('other', 'uk')
    expect(spy.mock.calls[1][0]).toBe('/.netlify/functions/cohort?scene=other&country=uk')
  })

  it('somewhere-else has no city count, and that is a count it can read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ ...served, scene: 'other', country: 'uk', here: null })))
    expect(await cohortCount('other', 'uk')).toEqual({ here: null, across: { women: 12, men: 4 }, target: 40 })
  })

  it('refuses the old shape rather than guess at it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ scene: 'twin-cities', women: 3, men: 1, target: 40 })))
    expect(await cohortCount('twin-cities')).toBeNull()
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
        return json({ code: 'ACDEFG', ...served, here: { women: 1, men: 0 } })
      }),
    )
    const result = await joinCohort({
      scene: 'twin-cities',
      gender: 'woman',
      country: 'us',
      reach: 'country',
      hook: 'serious',
      ledger: ['map', 'kept'],
    })
    expect(result).toEqual({ code: 'ACDEFG', here: { women: 1, men: 0 }, across: { women: 12, men: 4 }, target: 40 })
    expect(calls[0].url).toContain('/keep')
    expect(calls[1].url).toContain('/cohort')
    expect(calls[1].body).toMatchObject({
      code: 'ACDEFG',
      scene: 'twin-cities',
      gender: 'woman',
      country: 'us',
      reach: 'country',
      hook: 'serious',
      ledger: ['map', 'kept'],
    })
    // Nothing about how her map read, and nothing about how she used the app.
    expect(JSON.stringify(calls[1].body)).not.toMatch(/overall|score|voices/)
  })

  it('leaves country and reach out when she has not said, so the server takes her city', async () => {
    saveProgress(state)
    let sent: Record<string, unknown> = {}
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.endsWith('/keep')) return json({ code: 'ACDEFG' })
        sent = JSON.parse(init!.body as string)
        return json({ code: 'ACDEFG', ...served })
      }),
    )
    await joinCohort({ scene: 'twin-cities', gender: 'woman' })
    expect('country' in sent).toBe(false)
    expect('reach' in sent).toBe(false)
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
          : json({ code: 'HJKMNP', ...served, here: { women: 1, men: 0 } })
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
