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
const { default: couple } = await import('../netlify/functions/couple')
const { default: progress } = await import('../netlify/functions/progress')
const { isFounder } = await import('../netlify/shared/founder')
const { sameSecret } = await import('../netlify/shared/secret')

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
  const routes = { keep, couple, progress, safety } as const
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

describe('O6 — the man she sent the eleven to cannot rewrite her side of it', () => {
  // Re-posting `side: first` was gated on `creator === body.gender` — a gender
  // the caller simply states. He holds the code (she texted it to him), so
  // before answering he could post as a woman with states he chose, and the
  // joint she then read was his invention, not their conversation.
  const sheet = (states: Record<string, string>, extra: Record<string, unknown> = {}) =>
    call(couple, 'couple', json({ side: 'first', gender: 'woman', states, ...extra }))
  const differ = Object.fromEntries(TOPICS.map((t) => [t, 'differ']))

  it('holding the code and claiming her gender is not enough', async () => {
    const created = await (await sheet(TOPICS_ALL)).json()
    const forged = await sheet(differ, { code: created.code })
    expect(forged.status).toBe(409)
    // Her eleven, exactly as she answered it.
    expect(JSON.parse(stores.get('couples')!.get(created.code)!).first).toEqual(TOPICS_ALL)
  })

  it('the key she was handed at creation is what lets her change it, until he answers', async () => {
    const created = await (await sheet(TOPICS_ALL)).json()
    expect(typeof created.key).toBe('string')
    expect((await sheet(differ, { code: created.code, key: created.key })).status).toBe(200)
    // The key is hers alone: no read of the sheet ever returns it.
    const read = await (await call(couple, `couple?code=${created.code}`)).json()
    expect(JSON.stringify(read)).not.toContain(created.key)
  })

  it('a sheet from before the key cannot be changed at all — nothing proves whose it is', async () => {
    memStore('couples').setJSON('HJKMNP', { creator: 'woman', first: TOPICS_ALL, createdAt: 'd', expiresAt: '2099-01-01' })
    expect((await sheet(differ, { code: 'HJKMNP', gender: 'man' })).status).toBe(409)
    expect((await sheet(differ, { code: 'HJKMNP' })).status).toBe(409)
    expect(JSON.parse(stores.get('couples')!.get('HJKMNP')!).first).toEqual(TOPICS_ALL)
  })

  it('a code nobody minted is never created on demand', async () => {
    expect((await sheet(TOPICS_ALL, { code: 'QRTWXY' })).status).toBe(404)
    expect(stores.get('couples')?.has('QRTWXY') ?? false).toBe(false)
  })
})

describe('O7 — no page can be framed, and the floor of headers is set', () => {
  const toml = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8')
  const block = toml.slice(toml.indexOf('for = "/*"'), toml.indexOf('[[headers]]', toml.indexOf('for = "/*"')))

  it('every path carries them', () => {
    expect(block).toContain('X-Frame-Options = "DENY"')
    expect(block).toContain(`Content-Security-Policy = "frame-ancestors 'none'"`)
    expect(block).toContain('X-Content-Type-Options = "nosniff"')
    expect(block).toContain('Referrer-Policy = "strict-origin-when-cross-origin"')
    expect(block).toMatch(/Permissions-Policy = "camera=\(\), microphone=\(\), geolocation=\(\)/)
    expect(block).toMatch(/Strict-Transport-Security = "max-age=\d{8,}"/)
  })
})

describe('O11 — the founder key is compared whole, and in constant time', () => {
  const asked = (header?: string) => new Request('http://x/', { headers: header ? { authorization: header } : {} })

  it('refuses every near miss, and a missing key refuses everything', () => {
    vi.stubEnv('FOUNDER_KEY', 'a-long-founder-key-0123456789')
    expect(isFounder(asked('Bearer a-long-founder-key-0123456789'))).toBe(true)
    expect(isFounder(asked('bearer a-long-founder-key-0123456789'))).toBe(true)
    for (const near of ['a-long-founder-key-012345678', 'a-long-founder-key-01234567890', 'a-long-founder-key-012345678X', '', ' ']) {
      expect(isFounder(asked(`Bearer ${near}`))).toBe(false)
    }
    expect(isFounder(asked('Basic a-long-founder-key-0123456789'))).toBe(false)
    expect(isFounder(asked())).toBe(false)
    vi.stubEnv('FOUNDER_KEY', '')
    expect(isFounder(asked('Bearer '))).toBe(false)
  })

  it('the comparison looks at every byte rather than stopping at the first difference', () => {
    // A timing test in CI measures the runner, not the code; this pins the
    // shape instead — no early return, no `===` on the secret.
    const src = readFileSync(new URL('../netlify/shared/secret.ts', import.meta.url), 'utf8')
    const body = src.slice(src.indexOf('export function sameSecret'))
    expect(body).not.toMatch(/return false|===\s*b\b|a\s*===/)
    expect(body).toMatch(/diff \|= left\[i\] \^ right\[i\]/)
    expect(sameSecret('abc', 'abc')).toBe(true)
    expect(sameSecret('abc', 'abd')).toBe(false)
    expect(sameSecret('abc', 'abcd')).toBe(false)
  })
})

describe('O8 — codes minted from now on are eight characters, and six still work', () => {
  it('the server mints eight, accepts six and eight, and keeps tokens at ten so nothing collides', async () => {
    const { CODE, TOKEN, newCode, CODE_LENGTH, TOKEN_LENGTH } = await import('../netlify/shared/code')
    expect(CODE_LENGTH).toBe(8)
    expect(TOKEN_LENGTH).toBe(10)
    expect(newCode()).toMatch(CODE)
    expect(newCode()).toHaveLength(8)
    expect(CODE.test('HJKMNP')).toBe(true)
    expect(CODE.test('HJKMNPQR')).toBe(true)
    for (const bad of ['HJKMN', 'HJKMNPQ', 'HJKMNPQRT', 'HJKMNPQRTW']) expect(CODE.test(bad)).toBe(false)
    expect(TOKEN.test(newCode(TOKEN_LENGTH))).toBe(true)
    expect(CODE.test(newCode(TOKEN_LENGTH))).toBe(false)
  })

  it('the client agrees, and shows an eight as two groups of four', async () => {
    const { CODE_LENGTH, isCode, formatCode, cleanCode } = await import('../src/lib/code')
    expect(CODE_LENGTH).toBe(8)
    expect(isCode('hjkm-npqr')).toBe(true)
    expect(isCode('HJKMNP')).toBe(true)
    expect(isCode('HJKMNPQ')).toBe(false)
    expect(formatCode('HJKMNPQR')).toBe('HJKM NPQR')
    expect(formatCode('HJKMNP')).toBe('HJKMNP')
    // What a person copies from the grouped form comes back whole.
    expect(cleanCode(formatCode('HJKMNPQR'))).toBe('HJKMNPQR')
  })
})
