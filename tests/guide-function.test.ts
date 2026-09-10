import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * The guide's health check makes a live Anthropic call. Open, it is the
 * cheapest way anyone could run up the bill; behind the founder key it is a
 * diagnostic the founder can open from a phone. The SDK is mocked so nothing
 * here ever reaches the network.
 */

const create = vi.fn(async () => ({ stop_reason: 'end_turn' }))
/** Yields nothing: enough to exercise the pre-answer path without a real network call. */
const stream = vi.fn(() => ({
  async *[Symbol.asyncIterator]() {},
  abort: () => {},
}))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create, stream }
  },
}))

/** A minimal etag-aware store, enough for the hourly cap in shared/limit.ts. */
const limits = new Map<string, string>()
const limitEtags = new Map<string, number>()
vi.mock('@netlify/blobs', () => ({
  getStore: () => ({
    list: async ({ prefix = '' }: { prefix?: string } = {}) => ({
      blobs: [...limits.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })),
      directories: [],
    }),
    delete: async (key: string) => void limits.delete(key),
    getWithMetadata: async (key: string) => {
      const v = limits.get(key)
      if (v === undefined) return null
      return { data: JSON.parse(v), etag: `${key}#${limitEtags.get(key) ?? 0}` }
    },
    setJSON: async (key: string, value: unknown, opts?: { onlyIfMatch?: string; onlyIfNew?: boolean }) => {
      const current = limitEtags.get(key) ?? 0
      const etag = `${key}#${current}`
      if (opts?.onlyIfNew && limits.has(key)) return { modified: false }
      if (opts?.onlyIfMatch && opts.onlyIfMatch !== etag) return { modified: false }
      limits.set(key, JSON.stringify(value))
      limitEtags.set(key, current + 1)
      return { modified: true }
    },
  }),
}))

const { default: handler } = await import('../netlify/functions/guide')
const health = (headers: Record<string, string> = {}) =>
  handler(new Request('http://x/.netlify/functions/guide', { headers }), {} as never)
const ask = () =>
  handler(
    new Request('http://x/.netlify/functions/guide', {
      method: 'POST',
      body: JSON.stringify({ system: 'you are a guide', message: 'hi' }),
    }),
    {} as never,
  )

afterEach(() => {
  vi.unstubAllEnvs()
  create.mockClear()
  stream.mockClear()
  limits.clear()
  limitEtags.clear()
})

describe('the health check', () => {
  it('needs the founder key once one is set, and makes no call without it', async () => {
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    expect((await health()).status).toBe(401)
    expect((await health({ authorization: 'Bearer nope' })).status).toBe(401)
    expect(create).not.toHaveBeenCalled()

    const ok = await health({ authorization: 'Bearer open-sesame' })
    expect(ok.status).toBe(200)
    const body = await ok.json()
    expect(body.keyPresent).toBe(true)
    expect(body.call).toBe('ok')
    expect(JSON.stringify(body)).not.toContain('sk-ant-test')
  })

  it('with no founder key configured it still answers, and with no API key it says the guide is off', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    const res = await health()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.keyPresent).toBe(false)
    expect(body.call).toBeUndefined()
    expect(create).not.toHaveBeenCalled()
  })
})

describe('the hourly cap', () => {
  // A circuit breaker against an unattended month of runaway calls, not a
  // per-member limit — see netlify/shared/limit.ts. Testing it at cap 1 proves
  // the shape without needing a real hour to pass.
  it('lets a call through, then refuses without ever reaching the model', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    vi.stubEnv('GUIDE_HOURLY_CAP', '1')

    const first = await ask()
    expect(stream).toHaveBeenCalledTimes(1)
    expect(first.status).toBe(503)

    const second = await ask()
    expect(stream).toHaveBeenCalledTimes(1)
    expect(second.status).toBe(503)
    expect((await second.json()).error).toBe('rate_limited')
  })

  it('bounds the day, not just the hour — the cap that makes an unattended month survivable', async () => {
    // An hourly counter resets 720 times a month, so "the worst hour is
    // survivable" and "the worst month is survivable" were different claims.
    // The day binds even while the hour still has room. docs/ROADMAP.md.
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    vi.stubEnv('GUIDE_DAILY_CAP', '2')
    vi.stubEnv('GUIDE_HOURLY_CAP', '100')

    await ask()
    await ask()
    expect(stream).toHaveBeenCalledTimes(2)

    const third = await ask()
    expect(stream).toHaveBeenCalledTimes(2)
    expect(third.status).toBe(503)
    expect((await third.json()).error).toBe('rate_limited')
  })

  it('keeps the day’s count when the hour sweeps its own old keys', async () => {
    // The hour and the day live in the same store, and an hourly stamp has a
    // daily one as its prefix. A single `guide-` listing would return both, and
    // the sweep deletes everything but the key it was given — so the hour would
    // have eaten the day's counter every hour and the daily cap would never
    // have bound. The period is in the key to keep the two listings disjoint.
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    vi.stubEnv('GUIDE_DAILY_CAP', '10')
    await ask()

    const dayKeys = [...limits.keys()].filter((k) => k.startsWith('guide-d-'))
    const hourKeys = [...limits.keys()].filter((k) => k.startsWith('guide-h-'))
    expect(dayKeys).toHaveLength(1)
    expect(hourKeys).toHaveLength(1)
    // Neither listing can see the other, which is the whole guarantee.
    expect(dayKeys[0].startsWith('guide-h-')).toBe(false)
    expect(hourKeys[0].startsWith('guide-d-')).toBe(false)
  })

  it('is generous enough that it never touches a real call, by default', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    for (let i = 0; i < 50; i++) await ask()
    expect(stream).toHaveBeenCalledTimes(50)
  })

  it('the first call of a new period sweeps the ones before it, so the store never grows', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-test')
    limits.set('guide-h-2020-01-01T00', '5')
    limits.set('guide-h-2020-01-01T01', '2')
    limits.set('guide-d-2020-01-01', '7')
    await ask()
    await ask()
    // One live key per period, and every stale one gone — including the stale
    // day, which only its own period's sweep can reach.
    const hourKeys = [...limits.keys()].filter((k) => k.startsWith('guide-h-'))
    const dayKeys = [...limits.keys()].filter((k) => k.startsWith('guide-d-'))
    expect(hourKeys).toHaveLength(1)
    expect(dayKeys).toHaveLength(1)
    expect(hourKeys[0]).toMatch(/^guide-h-\d{4}-\d{2}-\d{2}T\d{2}$/)
    expect(dayKeys[0]).toMatch(/^guide-d-\d{4}-\d{2}-\d{2}$/)
    expect(hourKeys[0]).not.toMatch(/2020/)
    expect(dayKeys[0]).not.toMatch(/2020/)
    expect(JSON.parse(limits.get(hourKeys[0])!)).toBe(2)
    expect(JSON.parse(limits.get(dayKeys[0])!)).toBe(2)
  })
})
