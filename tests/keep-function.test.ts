import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The maps store holds what brings a person back, and nothing she said to the
 * guide. The client leaves those out; this checks the server refuses to hold
 * them even when an older client still sends them.
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
    // Conditional writes behave like the real store's, so the hourly cap in
    // shared/limit.ts counts here the way it does in production.
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

const { default: handler } = await import('../netlify/functions/keep')

const post = (body: unknown) =>
  handler(new Request('http://x/.netlify/functions/keep', { method: 'POST', body: JSON.stringify(body) }))
const get = (code: string) => handler(new Request(`http://x/.netlify/functions/keep?code=${code}`))
const forget = (code: string) => handler(new Request(`http://x/.netlify/functions/keep?code=${code}`, { method: 'DELETE' }))

beforeEach(() => stores.clear())

/**
 * Her map, already kept under ACDEFG — the way every test below that re-keeps
 * starts. A code the server did not mint is never created on demand any more
 * (see "a supplied code is never created"), so the seed is written directly.
 */
function seed(code = 'ACDEFG', snapshot: unknown = { identity: {}, answers: {} }) {
  memStore('maps').setJSON(code, { snapshot, createdAt: '2026-01-01', expiresAt: '2099-01-01', v: 1 })
}

describe('keeping a map', () => {
  it('stores the snapshot under a minted code and hands it back', async () => {
    const res = await post({ snapshot: { identity: { firstName: 'Sagal' }, answers: {} } })
    expect(res.status).toBe(200)
    const { code } = await res.json()
    expect(code).toMatch(/^[ACDEFGHJKMNPQRTWXY34789]{6}$/)
    const restored = await get(code)
    // Her whole map, keyed by a secret in the URL: never cached, by a browser
    // or anything between (docs/THREAT.md, T4). Nor is "nothing here".
    expect(restored.headers.get('cache-control')).toBe('no-store')
    const back = await restored.json()
    expect(back.snapshot.identity.firstName).toBe('Sagal')
    expect((await get('HJKMNP')).headers.get('cache-control')).toBe('no-store')
  })

  it('a supplied code is never created — nothing under it is a 404, and the client mints fresh', async () => {
    // This used to write whatever code the body carried, skipping mint's
    // onlyIfNew and letting a guessed code land on a stranger's map
    // (docs/HARD.md row 3, docs/BOARD.md).
    const res = await post({ snapshot: { identity: { firstName: 'Sagal' } }, code: 'ACDEFG' })
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('not_found')
    expect(stores.get('maps')?.has('ACDEFG') ?? false).toBe(false)
  })

  it('re-keeping writes over her own map only, at the version it was read', async () => {
    seed('ACDEFG', { identity: { firstName: 'Sagal' } })
    const res = await post({ snapshot: { identity: { firstName: 'Sagal', age: 27 } }, code: 'ACDEFG' })
    expect(res.status).toBe(200)
    expect(JSON.parse(stores.get('maps')!.get('ACDEFG')!).snapshot.identity.age).toBe(27)
  })

  it('drops guide threads an older client still sends', async () => {
    seed()
    await post({
      snapshot: { identity: {}, coachThreads: { auntie: [{ id: '1', role: 'user', text: 'never stored' }] } },
      code: 'ACDEFG',
    })
    const stored = stores.get('maps')!.get('ACDEFG')!
    expect(stored).not.toContain('coachThreads')
    expect(stored).not.toContain('never stored')
  })

  it('drops the contact and the guide’s follow-ups an older client still sends', async () => {
    seed()
    await post({
      snapshot: {
        identity: {},
        waitlist: { contact: 'sagal@example.com', scene: 'toronto', joinedAt: 'x' },
        followups: [
          { id: 'g1', source: 'guide', topic: 'what she asked', words: 'what it said' },
          { id: 'r1', source: 'read', topic: 'public' },
        ],
      },
      code: 'ACDEFG',
    })
    const stored = stores.get('maps')!.get('ACDEFG')!
    expect(stored).not.toContain('sagal@example.com')
    expect(stored).not.toContain('what she asked')
    expect(stored).not.toContain('what it said')
    const back = JSON.parse(stored).snapshot
    expect(back.waitlist).toEqual({ scene: 'toronto', joinedAt: 'x' })
    expect(back.followups).toEqual([{ id: 'r1', source: 'read', topic: 'public' }])
  })

  it('re-keeping keeps the day it was first kept', async () => {
    seed('ACDEFG', { answers: {} })
    const first = JSON.parse(stores.get('maps')!.get('ACDEFG')!).createdAt
    await new Promise((r) => setTimeout(r, 5))
    await post({ snapshot: { answers: { timeline: '1-2' } }, code: 'ACDEFG' })
    const again = JSON.parse(stores.get('maps')!.get('ACDEFG')!)
    expect(again.createdAt).toBe(first)
    expect(again.snapshot.answers.timeline).toBe('1-2')
  })

  it('an eight-character vouch token is not a code, and opens nothing', async () => {
    seed('ACDEFG', { identity: { firstName: 'Sagal' } })
    expect((await get('ACDEFGHJ')).status).toBe(400)
  })

  it('forgetting a code removes the map, the pair, the vouch and its token, and the door entry — and a second time is a quiet 404', async () => {
    // Everything one person can leave behind, seeded as the functions write it.
    seed('ACDEFG', { identity: { firstName: 'Sagal', gender: 'woman' }, couple: { code: 'HJKMNP', at: 'x' } })
    memStore('couples'); memStore('vouches'); memStore('cohort')
    stores.get('couples')!.set('HJKMNP', JSON.stringify({ creator: 'woman', first: {} }))
    stores.get('vouches')!.set('ACDEFG', JSON.stringify({ relationship: 'father', firstName: 'Cabdi', sentence: 's', at: 'd' }))
    stores.get('vouches')!.set('asked/ACDEFG', 'ACDEFGHJ')
    stores.get('vouches')!.set('token/ACDEFGHJ', 'ACDEFG')
    stores.get('cohort')!.set('index/ACDEFG', 'ca/toronto/woman/city/serious/ACDEFG')
    stores.get('cohort')!.set('ca/toronto/woman/city/serious/ACDEFG', JSON.stringify({ at: 'd', ledger: [] }))
    memStore('contacts')
    stores.get('contacts')!.set('ACDEFG', JSON.stringify({ contact: 'sagal@example.com', scene: 'toronto', country: 'ca', at: 'd' }))
    // Someone else's things, which must survive.
    stores.get('couples')!.set('QRTWXY', JSON.stringify({ creator: 'man', first: {} }))
    stores.get('cohort')!.set('ca/toronto/man/city/serious/QRTWXY', JSON.stringify({ at: 'd', ledger: [] }))
    stores.get('contacts')!.set('QRTWXY', JSON.stringify({ contact: 'other@example.com', scene: 'toronto', country: 'ca', at: 'd' }))
    memStore('reports')
    stores.get('reports')!.set('HJKMNP-woman-ACDEFG', JSON.stringify({ id: 'ACDEFG', code: 'HJKMNP', side: 'woman', reason: 'threats', details: 'her words', at: 'd' }))
    stores.get('reports')!.set('resolved/QRTWXY', JSON.stringify({ reason: 'harassment', at: 'd', resolvedAt: 'd', outcome: 'no-action' }))

    const res = await forget('ACDEFG')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ forgotten: true, reportsTaken: true })
    expect(stores.get('maps')!.has('ACDEFG')).toBe(false)
    expect(stores.get('couples')!.has('HJKMNP')).toBe(false)
    expect([...stores.get('vouches')!.keys()]).toEqual([])
    expect([...stores.get('cohort')!.keys()]).toEqual(['ca/toronto/man/city/serious/QRTWXY'])
    // The way to reach her goes with everything else — it used to need a person
    // to delete it by hand. See docs/OWNED.md.
    expect(stores.get('contacts')!.has('ACDEFG')).toBe(false)
    expect(stores.get('contacts')!.has('QRTWXY')).toBe(true)
    // Her words about what happened go with the rest of it — the one store the
    // cascade used to miss (docs/HARD.md). A resolved stub carries no code and
    // nothing of hers, so it stays.
    expect(stores.get('reports')!.has('HJKMNP-woman-ACDEFG')).toBe(false)
    expect(stores.get('reports')!.has('resolved/QRTWXY')).toBe(true)
    expect(stores.get('couples')!.has('QRTWXY')).toBe(true)
    // Nothing left to forget.
    expect((await forget('ACDEFG')).status).toBe(404)
    expect((await get('ACDEFG')).status).toBe(404)
  })

  it('says so when it cannot take her reports, rather than reporting the promise kept', async () => {
    // Reports are keyed by the side that filed them, so without a side there
    // is no safe prefix to delete under — taking both would let a reported man
    // erase the report about himself. The cascade skipped them and answered
    // `{ forgotten: true }` anyway, which is Trust's promise reported kept
    // when part of it was not (docs/FAIL.md).
    seed('ACDEFG', { identity: { firstName: 'Sagal' }, couple: { code: 'HJKMNP', at: 'x' } })
    memStore('couples'); memStore('vouches'); memStore('cohort'); memStore('contacts')
    memStore('reports')
    stores.get('reports')!.set('HJKMNP-woman-ACDEFG', JSON.stringify({ id: 'ACDEFG', code: 'HJKMNP', side: 'woman', reason: 'threats', at: 'd' }))

    const res = await forget('ACDEFG')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ forgotten: true, reportsTaken: false })
    // The phone and the map are gone either way; only the report stayed.
    expect(stores.get('maps')!.has('ACDEFG')).toBe(false)
    expect(stores.get('reports')!.has('HJKMNP-woman-ACDEFG')).toBe(true)
  })

  it('a man’s forget me leaves her report about him exactly where it was', async () => {
    // He sent her the eleven, kept his map, and she reported him. Both hold
    // the couple code, so until 2026-09-17 his forget me took her report with
    // his sheet — the one thing netlify/functions/couple.ts says must never
    // happen (docs/RISKS.md R4). Her words stay; only his own filings go.
    seed('ACDEFG', { identity: { gender: 'man' }, couple: { code: 'HJKMNP', at: 'x' } })
    memStore('couples').setJSON('HJKMNP', { creator: 'man', first: {} })
    memStore('reports')
    stores.get('reports')!.set('HJKMNP-woman-QRTWXY', JSON.stringify({ id: 'QRTWXY', code: 'HJKMNP', side: 'woman', reason: 'threats', details: 'her words', at: 'd' }))
    stores.get('reports')!.set('HJKMNP-man-BCDFGH', JSON.stringify({ id: 'BCDFGH', code: 'HJKMNP', side: 'man', reason: 'other', at: 'd' }))

    expect((await forget('ACDEFG')).status).toBe(200)
    expect(stores.get('reports')!.has('HJKMNP-woman-QRTWXY')).toBe(true)
    expect(stores.get('reports')!.has('HJKMNP-man-BCDFGH')).toBe(false)
    expect(stores.get('couples')!.has('HJKMNP')).toBe(false)
  })

  it('her forget me takes her report and leaves his — and a map with no side takes none', async () => {
    seed('ACDEFG', { identity: { gender: 'woman' }, couple: { code: 'HJKMNP', at: 'x' } })
    memStore('reports')
    stores.get('reports')!.set('HJKMNP-woman-QRTWXY', JSON.stringify({ id: 'QRTWXY', code: 'HJKMNP', side: 'woman', reason: 'threats', at: 'd' }))
    stores.get('reports')!.set('HJKMNP-man-BCDFGH', JSON.stringify({ id: 'BCDFGH', code: 'HJKMNP', side: 'man', reason: 'other', at: 'd' }))
    expect((await forget('ACDEFG')).status).toBe(200)
    expect(stores.get('reports')!.has('HJKMNP-woman-QRTWXY')).toBe(false)
    expect(stores.get('reports')!.has('HJKMNP-man-BCDFGH')).toBe(true)

    // An older snapshot that never said which side it was: nothing in reports
    // is guessed at, so nothing in reports is deleted.
    seed('JKMNPQ', { identity: {}, couple: { code: 'HJKMNP', at: 'x' } })
    expect((await forget('JKMNPQ')).status).toBe(200)
    expect(stores.get('reports')!.has('HJKMNP-man-BCDFGH')).toBe(true)
  })

  it('forgetting needs a code the right shape', async () => {
    expect((await forget('nope')).status).toBe(400)
    expect((await forget('ACDEFGHJ')).status).toBe(400)
  })

  it('refuses a snapshot that is not an object, and a bad code', async () => {
    expect((await post({ snapshot: 'x' })).status).toBe(400)
    expect((await post({ snapshot: {}, code: 'nope' })).status).toBe(400)
    expect((await get('nope')).status).toBe(400)
    expect((await get('ACDEFG')).status).toBe(404)
  })
})

/**
 * Minting a code must never overwrite somebody.
 *
 * This route used to write a freshly minted code with a bare
 * `setJSON(code, kept)`. Six characters from a 23-symbol alphabet is 23^6 —
 * about 148 million — so two members drawing the same one is a birthday
 * problem: roughly 0.3% at a thousand kept maps, 29% at ten thousand, an even
 * chance by 14,300. The loser's map is the only server copy of thirteen honest
 * answers and every reading she ever had, and nothing anywhere would record
 * that it had been replaced. See netlify/shared/code.ts.
 */
describe('a minted code never lands on somebody', () => {
  /** Bytes that make `newCode` draw these characters, in this order. */
  function drawing(...codes: string[]) {
    const ALPHABET = 'ACDEFGHJKMNPQRTWXY34789'
    const queue = codes.flatMap((c) => [...c].map((ch) => ALPHABET.indexOf(ch)))
    return (array: Uint8Array) => {
      for (let i = 0; i < array.length; i++) array[i] = queue.shift() ?? 0
      return array
    }
  }

  it('retries onto a free code, and leaves the taken one exactly as it was', async () => {
    const hers = { snapshot: { identity: { firstName: 'Sagal' } }, createdAt: '2026-01-01', expiresAt: '2027-01-01' }
    memStore('maps').setJSON('AAAAAA', hers)
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(drawing('AAAAAA', 'CCCCCC') as never)

    const res = await post({ snapshot: { identity: { firstName: 'Hodan' } } })
    expect(res.status).toBe(200)
    expect((await res.json()).code).toBe('CCCCCC')

    // Hers is untouched, byte for byte.
    expect(JSON.parse(stores.get('maps')!.get('AAAAAA')!)).toEqual(hers)
    // And the new map really is stored, under the code that was free.
    expect(JSON.parse(stores.get('maps')!.get('CCCCCC')!).snapshot.identity.firstName).toBe('Hodan')
    vi.restoreAllMocks()
  })

  it('refuses rather than overwrites when every attempt collides', async () => {
    for (const c of ['AAAAAA', 'CCCCCC', 'DDDDDD', 'EEEEEE', 'FFFFFF']) {
      memStore('maps').setJSON(c, { snapshot: { taken: c }, createdAt: 'd', expiresAt: 'z' })
    }
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(
      drawing('AAAAAA', 'CCCCCC', 'DDDDDD', 'EEEEEE', 'FFFFFF') as never,
    )
    // Failing to save is recoverable — her map is still on her phone.
    // Overwriting one of these five is not.
    expect((await post({ snapshot: { identity: { firstName: 'Hodan' } } })).status).toBe(503)
    for (const c of ['AAAAAA', 'CCCCCC', 'DDDDDD', 'EEEEEE', 'FFFFFF']) {
      expect(JSON.parse(stores.get('maps')!.get(c)!).snapshot.taken).toBe(c)
    }
    vi.restoreAllMocks()
  })

  it('re-keeping under the code she already has still writes straight through', async () => {
    const first = await post({ snapshot: { identity: { firstName: 'Hodan' } } })
    const { code } = await first.json()
    const again = await post({ snapshot: { identity: { firstName: 'Hodan', age: 27 } }, code })
    expect(again.status).toBe(200)
    expect((await again.json()).code).toBe(code)
    expect(JSON.parse(stores.get('maps')!.get(code)!).snapshot.identity.age).toBe(27)
  })

  it('measures the body before it parses it', async () => {
    const huge = JSON.stringify({ snapshot: { blob: 'x'.repeat(200_000) } })
    const res = await handler(
      new Request('http://x/.netlify/functions/keep', { method: 'POST', body: huge }),
    )
    expect(res.status).toBe(413)
  })
})
