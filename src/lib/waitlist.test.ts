import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NETLIFY_FORM_ENDPOINT, joinWaitlist, mailtoFor, waitlistConfigured } from './waitlist'

const entry = {
  contact: 'hodan@example.com',
  code: 'ACDEFG',
  scene: 'twin-cities',
  gender: 'woman',
  overall: 88,
  hardestPart: 'Trusting again after being hurt',
  at: '2026-08-28T12:00:00.000Z',
}

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
    expect(sent.get('contact')).toBe(entry.contact)
    expect(sent.get('code')).toBe(entry.code)
    // The city signal — which city has enough serious people to open first.
    expect(sent.get('scene')).toBe('twin-cities')
    expect(sent.get('overall')).toBe('88')
    // Why they came — the most useful thing a signup can carry, and sent as the
    // human label rather than the id so a row reads as a finding.
    expect(sent.get('hardest_part')).toBe('Trusting again after being hurt')
  })

  it('queues a failed signup instead of losing a real person', async () => {
    stubEnv({ VITE_WAITLIST_FORM: 'niyyah-waitlist' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await joinWaitlist(entry)).toBe('queued')
    expect(localStorage.getItem('niyyah.waitlist.queue.v1')).toContain(entry.contact)
  })

  it('queues on a server error too, not just a dead network', async () => {
    stubEnv({ VITE_WAITLIST_FORM: 'niyyah-waitlist' })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))
    expect(await joinWaitlist(entry)).toBe('queued')
  })

  it('falls back to the JSON endpoint when no form is named', async () => {
    stubEnv({ VITE_WAITLIST_FORM: undefined, VITE_WAITLIST_URL: 'https://example.test/hook' })
    const spy = vi.fn(async (_u: string, _i: RequestInit) => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', spy)

    expect(await joinWaitlist(entry)).toBe('joined')
    expect(spy.mock.calls[0][0]).toBe('https://example.test/hook')
    expect(JSON.parse(spy.mock.calls[0][1].body as string).contact).toBe(entry.contact)
  })

  it('omits empty fields rather than filing blank columns', async () => {
    stubEnv({ VITE_WAITLIST_FORM: 'niyyah-waitlist' })
    const spy = vi.fn(async (_u: string, _i: RequestInit) => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await joinWaitlist({ contact: 'x@y.z', at: entry.at })

    const sent = new URLSearchParams(spy.mock.calls[0][1].body as string)
    expect(sent.has('scene')).toBe(false)
    expect(sent.has('gender')).toBe(false)
  })

  it('offers a mailto that still reaches a human', () => {
    const href = mailtoFor({ scene: 'twin-cities' })
    expect(href.startsWith('mailto:')).toBe(true)
    expect(decodeURIComponent(href)).toContain('twin-cities')
  })
})
