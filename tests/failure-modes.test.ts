import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TOPICS } from '../netlify/shared/vocab'
import { HANDLERS, ORIGIN, blobs, call, serve } from './support/server'

vi.mock('@netlify/blobs', async () => (await import('./support/blobs')).blobsModule)

/**
 * Failures that must stay contained — proved by causing them.
 *
 * These were checks on the *source* in tests/fail.test.ts: that `getStore`
 * sits below a `try {`, that the text `await req.text()` has a `try {` within
 * two hundred characters before it, that one string appears before another in
 * vouch.ts. Each passed on code that was wrong in a new way and failed on a
 * harmless rename (the vouch order broke on one in the last PR). Here each
 * failure is made to happen, against every route it applies to, and the route
 * is held to what the member sees (docs/FAIL.md, docs/TESTING.md, "Pruned").
 */

/** Every route that takes a body, with one a real client would send. */
const POSTS: [string, string, unknown][] = [
  ['keep', 'keep', { snapshot: { answers: {}, identity: {} } }],
  ['cohort', 'cohort', { scene: 'twin-cities', gender: 'woman', code: 'CDFGHJKM' }],
  ['couple', 'couple', { side: 'first', gender: 'woman', states: { live: 'agree' } }],
  ['vouch', 'vouch', { side: 'ask', code: 'CDFGHJKM' }],
  ['progress', 'progress', { id: 'ACDEFGHJKM', rungs: ['arrived'] }],
  ['safety', 'safety', { code: 'CDFGHJKM', side: 'woman', reason: 'pressure' }],
  ['guide', 'guide', { messages: [{ role: 'user', content: 'salaam' }] }],
]

/** A body the platform started to deliver and then lost. */
function truncated(path: string): Request {
  const body = new ReadableStream({
    start(c) {
      c.enqueue(new TextEncoder().encode('{"side":"fi'))
      c.error(new Error('connection reset'))
    },
  })
  return new Request(`${ORIGIN}/.netlify/functions/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    duplex: 'half',
  } as RequestInit)
}

/** What the phone gets: a status, and a body it can parse — never a platform crash page. */
async function answered(res: Response | Promise<Response>): Promise<number> {
  const r = await res
  const text = await r.text()
  expect(() => (text ? JSON.parse(text) : null), `${r.status}: ${text.slice(0, 80)}`).not.toThrow()
  return r.status
}

beforeEach(() => {
  blobs.reset()
  serve()
  process.env.ANTHROPIC_API_KEY = ''
})

describe('a body that never finished arriving', () => {
  it.each(POSTS)('%s answers it as a bad request, not a crash', async (name, path) => {
    // The guide says 503 before it reads anything when it has no key; give it
    // one, so what is tested is the read.
    process.env.ANTHROPIC_API_KEY = 'sk-test'
    const status = await answered(HANDLERS[name](truncated(path)))
    expect(status).toBeGreaterThanOrEqual(400)
    expect(status).toBeLessThan(500)
  })
})

describe('a limiter that cannot open its own store', () => {
  // Every public write is capped (netlify/shared/limit.ts). If the cap's
  // store could not be opened, the throw escaped the limiter and took the
  // route with it — every capped endpoint at once, on one Blobs hiccup.
  it.each(POSTS)('%s still answers', async (name, path, body) => {
    blobs.failOpen('limits')
    // Whatever the route decides — refuse, fall back, or go ahead — it says
    // so in a body the phone can read. The guide's own answer to anything it
    // cannot do is a 503, which the app reads as "use the offline voice".
    const status = await answered(call(name, 'POST', path, body))
    expect(status).not.toBe(500)
  })
})

describe('the vouch ask, interrupted', () => {
  async function keptCode(): Promise<string> {
    const res = await call('keep', 'POST', 'keep', { snapshot: { answers: {}, identity: { firstName: 'Hodan' } } })
    return ((await res.json()) as { code: string }).code
  }

  it('claims the ask before the token, so a failure between them leaves no token forget me cannot find', async () => {
    // Forget me finds her token by reading `asked/<code>`. A token written
    // first, with the claim then failing, would be a pointer to her code that
    // nothing could ever sweep.
    const code = await keptCode()
    blobs.failOn({ store: 'vouches', op: 'set', prefix: 'asked/' })
    expect((await call('vouch', 'POST', 'vouch', { side: 'ask', code })).status).toBeGreaterThanOrEqual(500)
    expect(blobs.keys('vouches').filter((k) => k.startsWith('token/'))).toEqual([])
    // And the retry succeeds, with both halves.
    const retry = await call('vouch', 'POST', 'vouch', { side: 'ask', code })
    expect(retry.status).toBe(200)
    const { token } = (await retry.json()) as { token: string }
    expect(blobs.read('vouches', `asked/${code}`)).toBe(token)
    expect(blobs.read('vouches', `token/${token}`)).toBe(code)
  })

  it('lets only the first family member’s word land, when two arrive together', async () => {
    const code = await keptCode()
    const { token } = (await (await call('vouch', 'POST', 'vouch', { side: 'ask', code })).json()) as { token: string }
    const give = (firstName: string) =>
      call('vouch', 'POST', 'vouch', { side: 'give', code: token, relationship: 'mother', firstName, sentence: 'She is ready.' })
    // Her aunt's vouch lands in the gap between her mother's check and write.
    let aunt: Response | undefined
    blobs.before('setJSON', code, async () => void (aunt = await give('Aunt')), 'vouches')
    const mother = await give('Mother')
    expect([mother.status, aunt!.status].sort()).toEqual([200, 409])
    expect(blobs.read('vouches', code)).toMatchObject({ firstName: 'Aunt' })
  })
})

describe('the couple sheet, answered twice at once', () => {
  it('keeps the first answer, and tells the second it was too late', async () => {
    const states = (s: string) => Object.fromEntries([...TOPICS].map((t) => [t, s]))
    const { code } = (await (await call('couple', 'POST', 'couple', { side: 'first', gender: 'woman', states: states('agree') })).json()) as {
      code: string
    }
    let other: Response | undefined
    blobs.before('setJSON', code, async () => void (other = await call('couple', 'POST', 'couple', { side: 'second', code, states: states('differ') })), 'couples')
    const his = await call('couple', 'POST', 'couple', { side: 'second', code, states: states('not-talked') })
    expect([his.status, other!.status].sort()).toEqual([200, 409])
  })
})
