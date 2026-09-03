import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The two-sided Before you say yes lives or dies on one guarantee: neither
 * person ever sees the other's answers. These tests check the guarantee
 * structurally — the joint is symmetric, no response can carry a side, and
 * each side is frozen the moment the other exists.
 */
const stores = new Map<string, Map<string, string>>()
function memStore(name: string) {
  const m = stores.get(name) ?? new Map<string, string>()
  stores.set(name, m)
  return {
    get: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key) ?? null
      return v !== null && opts?.type === 'json' ? JSON.parse(v) : v
    },
    setJSON: async (key: string, value: unknown) => void m.set(key, JSON.stringify(value)),
    delete: async (key: string) => void m.delete(key),
  }
}
vi.mock('@netlify/blobs', () => ({ getStore: (name: string) => memStore(name) }))

const { default: handler, joint } = await import('../netlify/functions/couple')

const IDS = ['live', 'his-family-in-home', 'work', 'money-home', 'children', 'deen-daily', 'aroos-mahr', 'qabiil', 'going-back', 'second-wife', 'families-disagree']
const STATES = ['agree', 'differ', 'not-talked', 'unknown'] as const
const sides = (over: Record<string, string> = {}, base = 'agree') => ({ ...Object.fromEntries(IDS.map((id) => [id, base])), ...over })
const post = (body: unknown) => handler(new Request('http://x/.netlify/functions/couple', { method: 'POST', body: JSON.stringify(body) }))
const get = (code: string) => handler(new Request(`http://x/.netlify/functions/couple?code=${code}`))

beforeEach(() => stores.clear())

describe('the joint', () => {
  it('is symmetric over every pair of states', () => {
    for (const a of STATES) for (const b of STATES) expect(joint(a, b)).toBe(joint(b, a))
  })
  it('names the mismatch that matters most', () => {
    expect(joint('agree', 'not-talked')).toBe('one-thinks-talked')
    expect(joint('differ', 'not-talked')).toBe('one-thinks-talked')
    expect(joint('agree', 'differ')).toBe('differ-somewhere')
    expect(joint('differ', 'differ')).toBe('differ-somewhere')
    expect(joint('agree', 'agree')).toBe('both-agree')
    expect(joint('not-talked', 'not-talked')).toBe('both-not-talked')
    expect(joint('unknown', 'agree')).toBe('unknown-somewhere')
  })
})

describe('the handshake', () => {
  it('she creates, he sees it is open for a man, and until he answers she is waiting', async () => {
    const { code } = await (await post({ side: 'first', gender: 'woman', states: sides() })).json()
    expect(code).toMatch(/^[ACDEFGHJKMNPQRTWXY34789]{6}$/)
    expect(await (await get(code)).json()).toEqual({ status: 'open', answerFor: 'man' })
  })

  it('once he answers, both see only the joint — never a side', async () => {
    const { code } = await (await post({ side: 'first', gender: 'woman', states: sides({ live: 'agree', 'money-home': 'not-talked', qabiil: 'differ' }) })).json()
    const res = await post({ side: 'second', code, states: sides({ live: 'not-talked', 'money-home': 'not-talked', qabiil: 'agree' }) })
    const text = await res.text()
    expect(text).not.toMatch(/"(agree|differ|not-talked|unknown)"/)
    // Keys only — the topic id "his-family-in-home" is not a side.
    expect(text).not.toMatch(/"(first|second|hers|his|creator)"/)
    const body = JSON.parse(text)
    expect(body.status).toBe('joint')
    expect(body.joint.live).toBe('one-thinks-talked')
    expect(body.joint['money-home']).toBe('both-not-talked')
    expect(body.joint.qabiil).toBe('differ-somewhere')
    expect(body.joint.children).toBe('both-agree')
    const again = await (await get(code)).text()
    expect(again).not.toMatch(/"(agree|differ|not-talked|unknown)"/)
  })

  it('freezes her side the moment he has answered, and his after once', async () => {
    const { code } = await (await post({ side: 'first', gender: 'woman', states: sides() })).json()
    // She may still change her mind while he has not answered.
    expect((await post({ side: 'first', gender: 'woman', code, states: sides({ live: 'differ' }) })).status).toBe(200)
    expect((await post({ side: 'second', code, states: sides() })).status).toBe(200)
    // Now neither can probe the other.
    expect((await post({ side: 'first', gender: 'woman', code, states: sides({ live: 'not-talked' }) })).status).toBe(409)
    expect((await post({ side: 'second', code, states: sides({ live: 'not-talked' }) })).status).toBe(409)
  })

  it('refuses anything that is not exactly the eleven', async () => {
    expect((await post({ side: 'first', gender: 'woman', states: { live: 'agree' } })).status).toBe(400)
    expect((await post({ side: 'first', gender: 'woman', states: sides({ live: 'maybe' }) })).status).toBe(400)
    expect((await post({ side: 'first', gender: 'woman', states: { ...sides(), extra: 'agree' } })).status).toBe(400)
    expect((await post({ side: 'first', gender: 'x', states: sides() })).status).toBe(400)
    expect((await post({ side: 'second', code: 'ACDEFG', states: sides() })).status).toBe(404)
    expect((await get('nope')).status).toBe(400)
    expect((await get('ACDEFG')).status).toBe(404)
  })

  it('refuses an oversized body before parsing it', async () => {
    const big = new Request('http://x/.netlify/functions/couple', { method: 'POST', body: 'x'.repeat(9000) })
    expect((await handler(big)).status).toBe(413)
  })
})
