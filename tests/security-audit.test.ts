import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * docs/SECURITY.md, written as attacks.
 *
 * Each test here is the exploit itself, run end to end through the real
 * handlers against an in-memory store that behaves like Netlify Blobs
 * (conditional writes, prefix listing). They were run against the code before
 * the fix and watched to succeed; the assertions below are what must now be
 * true instead. Comments in the functions said every one of these was
 * impossible, which is why they are tests and not comments.
 */

const stores = new Map<string, Map<string, string>>()
function memStore(name: string) {
  const m = stores.get(name) ?? new Map<string, string>()
  stores.set(name, m)
  return {
    list: async ({ prefix = '' }: { prefix?: string } = {}) => ({
      blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key, etag: 'x' })),
      directories: [],
    }),
    get: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key) ?? null
      return v !== null && opts?.type === 'json' ? JSON.parse(v) : v
    },
    getMetadata: async (key: string) => (m.has(key) ? { etag: 'x', metadata: {} } : null),
    getWithMetadata: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key) ?? null
      if (v === null) return null
      return { data: opts?.type === 'json' ? JSON.parse(v) : v, etag: v, metadata: {} }
    },
    set: async (key: string, value: string, opts?: { onlyIfNew?: boolean }) => {
      if (opts?.onlyIfNew && m.has(key)) return { modified: false }
      m.set(key, value)
      return { modified: true }
    },
    setJSON: async (key: string, value: unknown, opts?: { onlyIfMatch?: string; onlyIfNew?: boolean }) => {
      if (opts?.onlyIfNew && m.has(key)) return { modified: false }
      if (opts?.onlyIfMatch && opts.onlyIfMatch !== m.get(key)) return { modified: false }
      m.set(key, JSON.stringify(value))
      return { modified: true }
    },
    delete: async (key: string) => void m.delete(key),
  }
}
vi.mock('@netlify/blobs', () => ({ getStore: (arg: string | { name: string }) => memStore(typeof arg === 'string' ? arg : arg.name) }))

const { default: keep } = await import('../netlify/functions/keep')
const { default: safety } = await import('../netlify/functions/safety')
const { default: vouch } = await import('../netlify/functions/vouch')
const { default: couple } = await import('../netlify/functions/couple')
const { default: cohort } = await import('../netlify/functions/cohort')
const { default: progress } = await import('../netlify/functions/progress')

const call = (h: (r: Request) => Promise<Response>, path: string, init?: RequestInit) =>
  h(new Request(`http://x/.netlify/functions/${path}`, init))
const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) })

const TOPICS = ['live', 'his-family-in-home', 'work', 'money-home', 'children', 'deen-daily', 'aroos-mahr', 'qabiil', 'going-back', 'second-wife', 'families-disagree']
const TOPICS_ALL = Object.fromEntries(TOPICS.map((t) => [t, 'agree']))

beforeEach(() => {
  stores.clear()
  vi.unstubAllEnvs()
})

describe('O1 — a reported man cannot erase her report through forget me', () => {
  it('a forged snapshot naming her couple code and her side takes nothing of hers', async () => {
    // She sent him the eleven; both hold the couple code. She reports him.
    memStore('couples').setJSON('HJKMNP', { creator: 'woman', first: TOPICS_ALL, createdAt: 'd', expiresAt: '2099-01-01' })
    const filed = await call(safety, 'safety', json({ code: 'HJKMNP', side: 'woman', reason: 'threats', details: 'what he said' }))
    expect(filed.status).toBe(200)
    const theirs = () => [...(stores.get('reports') ?? new Map()).keys()].filter((k) => k.startsWith('HJKMNP-woman-'))
    expect(theirs()).toHaveLength(1)

    // He keeps a throwaway map whose snapshot claims to be her, on her pair —
    // every field of a snapshot is whatever the caller sends — then forgets it.
    const kept = await call(keep, 'keep', json({ snapshot: { identity: { gender: 'woman' }, couple: { code: 'HJKMNP' } } }))
    const { code } = (await kept.json()) as { code: string }
    const res = await call(keep, `keep?code=${code}`, { method: 'DELETE' })
    expect(res.status).toBe(200)

    // Her report is exactly where it was.
    expect(theirs()).toHaveLength(1)
  })
})

describe('O3 — a hostile body is a 400, never a crash', () => {
  // `JSON.parse('null')` is null, and every handler read `body.x` off it; a
  // number where a string was expected hit `.toUpperCase()`; a `constructor:`
  // prefix found Object's own prototype in a lookup table. Each threw past the
  // handler's own error contract and left the platform to answer.
  const routes = { keep, vouch, couple, cohort, progress, safety } as const
  const raw = (h: (r: Request) => Promise<Response>, name: string, body: string) =>
    h(new Request(`http://x/.netlify/functions/${name}`, { method: 'POST', body }))

  for (const [name, h] of Object.entries(routes)) {
    for (const body of ['null', '[]', '1', '"x"', 'true']) {
      it(`${name} refuses ${body} as a body`, async () => {
        const res = await raw(h, name, body)
        expect(res.status).toBe(400)
        expect((await res.json()).error).toBeTruthy()
      })
    }
  }

  it('a number where a code belongs is a bad code, not a TypeError', async () => {
    for (const [name, h, extra] of [
      ['safety', safety, { side: 'woman', reason: 'threats' }],
      ['cohort', cohort, { scene: 'toronto', gender: 'woman' }],
      ['progress', progress, { rungs: [] }],
    ] as const) {
      const res = await raw(h, name, JSON.stringify({ code: 1, id: 1, ...extra }))
      expect(res.status).toBe(400)
    }
  })

  it('a prototype name is not a vocabulary', async () => {
    for (const t of ['constructor:x', '__proto__:x', 'toString:x', 'hasOwnProperty:x']) {
      const res = await raw(progress, 'progress', JSON.stringify({ id: 'ACDEFG', rungs: [], facts: { through: [t] } }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('bad_facts')
    }
    const ended = await raw(progress, 'progress', JSON.stringify({ id: 'ACDEFG', rungs: [], facts: { ended: [{ stage: 'talking', reason: 'constructor', which: 'x' }] } }))
    expect(ended.status).toBe(400)
  })
})

describe('O4 — no key is one `git add -A` from the repository', () => {
  const ignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8').split('\n').map((l) => l.trim())
  const example = readFileSync(new URL('../.env.example', import.meta.url), 'utf8')

  it('ignores .env and every .env.* — only the example is tracked', () => {
    expect(ignore).toContain('.env')
    expect(ignore).toContain('.env.*')
    expect(ignore).toContain('!.env.example')
  })

  it('the example says what an unset founder key does — it closes, it does not open', () => {
    expect(example).not.toMatch(/Unset means open/i)
    expect(example).toMatch(/Unset means CLOSED/)
    // No value for either secret, ever, in a tracked file.
    expect(example).not.toMatch(/^\s*(ANTHROPIC_API_KEY|FOUNDER_KEY)\s*=/m)
  })
})
