import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The two-sided Before you say yes lives or dies on one guarantee: neither
 * person ever sees the other's answers. These tests check the guarantee
 * structurally — the joint is symmetric, no response can carry a side, and
 * each side is frozen the moment the other exists.
 */
const stores = new Map<string, Map<string, string>>()
/** Etags per key, so conditional writes behave like the real store's. */
const etags = new Map<string, number>()
/** Test seam: make the next N conditional writes lose their race. */
let loseRaces = 0
/** Test seam: make the tallies store throw. */
let talliesDown = false

function memStore(name: string) {
  const m = stores.get(name) ?? new Map<string, string>()
  stores.set(name, m)
  const etag = (key: string) => `${name}/${key}#${etags.get(`${name}/${key}`) ?? 0}`
  const write = (key: string, value: string) => {
    m.set(key, value)
    etags.set(`${name}/${key}`, (etags.get(`${name}/${key}`) ?? 0) + 1)
  }
  const down = () => {
    if (name === 'tallies' && talliesDown) throw new Error('tallies unavailable')
  }
  return {
    get: async (key: string, opts?: { type?: string }) => {
      down()
      const v = m.get(key) ?? null
      return v !== null && opts?.type === 'json' ? JSON.parse(v) : v
    },
    getWithMetadata: async (key: string, opts?: { type?: string }) => {
      down()
      const v = m.get(key) ?? null
      if (v === null) return null
      return { data: opts?.type === 'json' ? JSON.parse(v) : v, etag: etag(key), metadata: {} }
    },
    setJSON: async (key: string, value: unknown, opts?: { onlyIfMatch?: string; onlyIfNew?: boolean }) => {
      down()
      if (loseRaces > 0 && (opts?.onlyIfMatch || opts?.onlyIfNew)) {
        loseRaces -= 1
        return { modified: false }
      }
      if (opts?.onlyIfNew && m.has(key)) return { modified: false }
      if (opts?.onlyIfMatch && opts.onlyIfMatch !== etag(key)) return { modified: false }
      write(key, JSON.stringify(value))
      return { modified: true, etag: etag(key) }
    },
    delete: async (key: string) => void m.delete(key),
  }
}
vi.mock('@netlify/blobs', () => ({ getStore: (arg: string | { name: string }) => memStore(typeof arg === 'string' ? arg : arg.name) }))

const { default: handler, joint } = await import('../netlify/functions/couple')

const IDS = ['live', 'his-family-in-home', 'work', 'money-home', 'children', 'deen-daily', 'aroos-mahr', 'qabiil', 'going-back', 'second-wife', 'families-disagree']
const STATES = ['agree', 'differ', 'not-talked', 'unknown'] as const
const sides = (over: Record<string, string> = {}, base = 'agree') => ({ ...Object.fromEntries(IDS.map((id) => [id, base])), ...over })
const post = (body: unknown) => handler(new Request('http://x/.netlify/functions/couple', { method: 'POST', body: JSON.stringify(body) }))
const get = (code: string) => handler(new Request(`http://x/.netlify/functions/couple?code=${code}`))

const tallyReq = (headers: Record<string, string> = {}) =>
  handler(new Request('http://x/.netlify/functions/couple', { headers }))
const storedTally = () => JSON.parse(stores.get('tallies')?.get('joint') ?? 'null')

beforeEach(() => {
  stores.clear()
  etags.clear()
  loseRaces = 0
  talliesDown = false
})
afterEach(() => vi.unstubAllEnvs())

/** She creates, he answers. Returns the code. */
async function pair(hers: Record<string, string>, his: Record<string, string>): Promise<string> {
  const { code } = await (await post({ side: 'first', gender: 'woman', states: hers })).json()
  await post({ side: 'second', code, states: his })
  return code
}

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

describe('how pairs come out', () => {
  it('once he answers, the pair is counted into how pairs come out per conversation', async () => {
    const before = await (await post({ side: 'first', gender: 'woman', states: sides() })).json()
    expect(storedTally()).toBeNull()
    await post({ side: 'second', code: before.code, states: sides({ 'money-home': 'not-talked', qabiil: 'differ' }) })
    const t = storedTally()
    expect(t.pairs).toBe(1)
    expect(t.topics.live).toEqual({ 'both-agree': 1 })
    expect(t.topics['money-home']).toEqual({ 'one-thinks-talked': 1 })
    expect(t.topics.qabiil).toEqual({ 'differ-somewhere': 1 })

    await pair(sides({ 'money-home': 'not-talked' }), sides({ 'money-home': 'not-talked' }))
    const t2 = storedTally()
    expect(t2.pairs).toBe(2)
    expect(t2.topics['money-home']).toEqual({ 'one-thinks-talked': 1, 'both-not-talked': 1 })
    expect(t2.topics.live).toEqual({ 'both-agree': 2 })
  })

  it('records the day he answered, never the moment', async () => {
    const code = await pair(sides(), sides())
    const record = JSON.parse(stores.get('couples')!.get(code)!)
    expect(record.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(record.answeredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('carries no code and no side', async () => {
    const code = await pair(sides({ children: 'differ' }), sides({ children: 'unknown' }))
    const raw = stores.get('tallies')!.get('joint')!
    expect(raw).not.toContain(code)
    // No state of either person, no side, no gender. ("second-wife" is a topic, not a side.)
    expect(raw).not.toMatch(/"(agree|differ|not-talked|unknown)"|"first"|"second"|creator|woman|"man"/)
  })

  it('counts each pair once — a refused second answer adds nothing', async () => {
    const code = await pair(sides(), sides())
    expect((await post({ side: 'second', code, states: sides() })).status).toBe(409)
    expect(storedTally().pairs).toBe(1)
  })

  it('survives a lost race by retrying against the etag', async () => {
    loseRaces = 2
    await pair(sides(), sides())
    expect(storedTally().pairs).toBe(1)
  })

  it('the pair is saved even when the tally cannot be', async () => {
    talliesDown = true
    const { code } = await (await post({ side: 'first', gender: 'woman', states: sides() })).json()
    const res = await post({ side: 'second', code, states: sides() })
    expect(res.status).toBe(200)
    expect((await res.json()).status).toBe('joint')
    expect(storedTally()).toBeNull()
  })

  it('the founder reads the tally with no code; a bad code is still a bad code; the key is required once set', async () => {
    await pair(sides(), sides({ work: 'differ' }))
    const open = await tallyReq()
    expect(open.status).toBe(200)
    expect((await open.json()).topics.work).toEqual({ 'differ-somewhere': 1 })
    expect((await get('nope')).status).toBe(400)

    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    expect((await tallyReq()).status).toBe(401)
    expect((await tallyReq({ authorization: 'Bearer open-sesame' })).status).toBe(200)
  })

  it('reads as empty before any pair has answered', async () => {
    expect(await (await tallyReq()).json()).toEqual({ pairs: 0, topics: {} })
  })
})
