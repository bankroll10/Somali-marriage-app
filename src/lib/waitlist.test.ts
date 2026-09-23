import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NETLIFY_FORM_ENDPOINT, flushWaitlistQueue, joinWaitlist, mailtoFor, waitlistConfigured } from './waitlist'

const entry = { scene: 'twin-cities', at: '2026-08-28' }

function stubEnv(vars: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v as string)
}

/**
 * Minimal in-memory localStorage. These tests run in node, and the retry queue
 * is the thing standing between a bad connection and a lost signup, so it needs
 * real storage to assert against — but not a whole DOM.
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

beforeEach(() => {
  installStorage()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('the waitlist — the only line out of this app', () => {
  it('is unconfigured when nothing is set, and never claims otherwise', async () => {
    stubEnv({ VITE_WAITLIST_FORM: undefined, VITE_WAITLIST_URL: undefined })
    expect(waitlistConfigured()).toBe(false)
    expect(await joinWaitlist(entry)).toBe('unconfigured')
  })

  it('posts where Netlify actually listens', async () => {
    // Netlify's form handler matches on form-name and runs before redirects,
    // so "/" is correct and the SPA rewrite does not intercept it. A previous
    // version posted to /__forms.html on the opposite assumption and silently
    // dropped every signup — the form registered, the submissions never
    // arrived. This pins the target that is known to work.
    stubEnv({ VITE_WAITLIST_FORM: 'niyyah-waitlist' })
    const spy = vi.fn(async (_u: string, _i: RequestInit) => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', spy)

    expect(await joinWaitlist(entry)).toBe('joined')
    expect(spy.mock.calls[0][0]).toBe(NETLIFY_FORM_ENDPOINT)
    expect(NETLIFY_FORM_ENDPOINT).toBe('/')
  })

  it('sends url-encoded fields naming the form — JSON is silently ignored by Netlify', async () => {
    stubEnv({ VITE_WAITLIST_FORM: 'niyyah-waitlist' })
    const spy = vi.fn(async (_u: string, _i: RequestInit) => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await joinWaitlist(entry)

    const init = spy.mock.calls[0][1]
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    )
    const sent = new URLSearchParams(init.body as string)
    expect(sent.get('form-name')).toBe('niyyah-waitlist')
    // A ping, and nothing a person can be reached or known by: the city, so the
    // founder sees which pool moved, and the day (docs/PRIVACY.md, C7).
    expect([...sent.keys()].sort()).toEqual(['at', 'form-name', 'scene'])
    expect(sent.get('scene')).toBe('twin-cities')
    expect(sent.get('at')).toBe('2026-08-28')
  })

  it('never carries the way to reach her, even when a caller hands it one', async () => {
    // It carried her email or phone, city, country, how far she would go, who
    // she sought and her hardest part — a second copy at a third party that
    // Forget me could not reach, which Trust needed a paragraph to confess.
    // The way to reach her now lives in one place: our own store.
    stubEnv({ VITE_WAITLIST_FORM: 'niyyah-waitlist' })
    const spy = vi.fn(async (_u: string, _i: RequestInit) => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await joinWaitlist({ ...entry, contact: 'hodan@example.com', gender: 'woman', at: '2026-08-28T12:00:00.000Z' } as never)
    const body = spy.mock.calls[0][1].body as string
    expect(body).not.toContain('hodan')
    expect(body).not.toContain('woman')
    expect(new URLSearchParams(body).get('at')).toBe('2026-08-28')
  })

  it('queues a failed ping — and the queue holds no contact either', async () => {
    stubEnv({ VITE_WAITLIST_FORM: 'niyyah-waitlist' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await joinWaitlist(entry)).toBe('queued')
    expect(JSON.parse(localStorage.getItem('niyyah.waitlist.queue.v1')!)).toEqual([entry])
  })

  it('sends an older queue on without the contact it used to hold', async () => {
    stubEnv({ VITE_WAITLIST_FORM: 'niyyah-waitlist' })
    localStorage.setItem('niyyah.waitlist.queue.v1', JSON.stringify([{ contact: 'hodan@example.com', scene: 'london', at: '2026-08-01T09:00:00.000Z' }]))
    const spy = vi.fn(async (_u: string, _i: RequestInit) => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await flushWaitlistQueue()
    expect(spy.mock.calls[0][1].body as string).not.toContain('hodan')
    expect(localStorage.getItem('niyyah.waitlist.queue.v1')).toBe('[]')
  })

  it('queues on a server error too, not just a dead network', async () => {
    stubEnv({ VITE_WAITLIST_FORM: 'niyyah-waitlist' })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))
    expect(await joinWaitlist(entry)).toBe('queued')
  })

  it('falls back to the JSON endpoint when no form is named — with the same two fields', async () => {
    stubEnv({ VITE_WAITLIST_FORM: undefined, VITE_WAITLIST_URL: 'https://example.test/hook' })
    const spy = vi.fn(async (_u: string, _i: RequestInit) => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', spy)

    expect(await joinWaitlist(entry)).toBe('joined')
    expect(spy.mock.calls[0][0]).toBe('https://example.test/hook')
    expect(JSON.parse(spy.mock.calls[0][1].body as string)).toEqual(entry)
  })

  it('offers a mailto that still reaches a human', () => {
    const href = mailtoFor({ scene: 'twin-cities' })
    expect(href.startsWith('mailto:')).toBe(true)
    expect(decodeURIComponent(href)).toContain(encodeURIComponent('Minneapolis')) // the city's name, not its id — the founder used to receive `twin-cities`
  })
})
