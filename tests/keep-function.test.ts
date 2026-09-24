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
  it('holds no moment finer than a day, no last-seen time and not her line for the next person — whatever an older client sends', async () => {
    // docs/PRIVACY.md C1–C3, enforced where the map is stored, the way the
    // guide threads and the contact already are.
    const res = await post({
      snapshot: {
        identity: { firstName: 'Sagal' },
        updatedAt: 1758612345678,
        read: { at: '2026-09-23T10:11:12.345Z', answers: {} },
        ending: { at: '2026-09-23T10:11:12.345Z', who: 'met-here', advice: 'Ask about money first.' },
        followups: [{ id: 'read:public:2026-09-23T10:11:12.345Z', source: 'read', topic: 'public', at: '2026-09-23T10:11:12.345Z' }],
      },
    })
    const { code } = await res.json()
    const stored = stores.get('maps')!.get(code)!
    expect(stored).not.toMatch(/T\d{2}:\d{2}/)
    expect(stored).not.toContain('updatedAt')
    expect(stored).not.toContain('Ask about money first.')
    const { snapshot } = JSON.parse(stored)
    expect(snapshot.read.at).toBe('2026-09-23')
    expect(snapshot.ending).toEqual({ at: '2026-09-23', who: 'met-here' })
    expect(snapshot.followups[0].id).toBe('read:public:0')
  })

  it('stores the snapshot under a minted code and hands it back', async () => {
    const res = await post({ snapshot: { identity: { firstName: 'Sagal' }, answers: {} } })
    expect(res.status).toBe(200)
    const { code } = await res.json()
    // Eight characters since 2026-09-23 (docs/SECURITY.md, O8).
    expect(code).toMatch(/^[ACDEFGHJKMNPQRTWXY34789]{8}$/)
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
    const res = await post({ snapshot: { identity: { firstName: 'Sagal', scene: 'toronto' } }, code: 'ACDEFG' })
    expect(res.status).toBe(200)
    expect(JSON.parse(stores.get('maps')!.get('ACDEFG')!).snapshot.identity.scene).toBe('toronto')
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

  it('drops a place at the door, a vouch and the guide’s follow-ups an older client still sends', async () => {
    seed()
    await post({
      snapshot: {
        identity: {},
        waitlist: { contact: 'sagal@example.com', scene: 'toronto', joinedAt: 'x' },
        vouch: { relationship: 'father', firstName: 'Cabdi', at: 'x' },
        followups: [
          { id: 'g1', source: 'guide', topic: 'what she asked', words: 'what it said' },
          { id: 'r1', source: 'read', topic: 'public' },
        ],
      },
      code: 'ACDEFG',
    })
    const stored = stores.get('maps')!.get('ACDEFG')!
    expect(stored).not.toContain('sagal@example.com')
    expect(stored).not.toContain('Cabdi')
    expect(stored).not.toContain('what she asked')
    expect(stored).not.toContain('what it said')
    const back = JSON.parse(stored).snapshot
    expect(back.waitlist).toBeUndefined()
    expect(back.followups).toEqual([{ id: 'read:public:0', source: 'read', topic: 'public' }])
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

  it('a ten-character token — an owner key, a report’s id — is not a code, and opens nothing', async () => {
    seed('ACDEFG', { identity: { firstName: 'Sagal' } })
    expect((await get('ACDEFGHJKM')).status).toBe(400)
  })

  it('a code kept at six characters, before codes were eight, still comes back', async () => {
    seed('HJKMNP', { identity: { firstName: 'Sagal' } })
    expect((await (await get('HJKMNP')).json()).snapshot.identity.firstName).toBe('Sagal')
    // And an eight-character one, as minted now.
    seed('HJKMNPQR', { identity: { firstName: 'Hodan' } })
    expect((await (await get('hjkm-npqr')).json()).snapshot.identity.firstName).toBe('Hodan')
    // Any other length, and anything off the alphabet, is not a code.
    for (const bad of ['HJKMNPQ', 'HJKMN', 'HJKMNPQRT', 'OOOOOO', 'H0KMNP']) expect((await get(bad)).status).toBe(400)
  })

  it('forgetting a code removes the map and the pair — and asking again is done, not an error', async () => {
    // Everything one person can leave behind, seeded as the functions write it.
    seed('ACDEFG', { identity: { firstName: 'Sagal', gender: 'woman' }, couple: { code: 'HJKMNP', at: 'x' } })
    memStore('couples')
    stores.get('couples')!.set('HJKMNP', JSON.stringify({ creator: 'woman', first: {} }))
    // Someone else's things, which must survive.
    stores.get('couples')!.set('QRTWXY', JSON.stringify({ creator: 'man', first: {} }))
    memStore('reports')
    stores.get('reports')!.set('HJKMNP-woman-ACDEFG', JSON.stringify({ id: 'ACDEFG', code: 'HJKMNP', side: 'woman', reason: 'threats', details: 'her words', at: 'd' }))
    stores.get('reports')!.set('resolved/QRTWXY', JSON.stringify({ reason: 'harassment', at: 'd', resolvedAt: 'd', outcome: 'no-action' }))

    const res = await forget('ACDEFG')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ forgotten: true })
    expect(stores.get('maps')!.has('ACDEFG')).toBe(false)
    expect(stores.get('couples')!.has('HJKMNP')).toBe(false)
    // Reports are not this cascade's to touch: only the founder resolves one
    // (netlify/functions/safety.ts), because anything read from a snapshot is
    // whatever the caller wrote (docs/SECURITY.md, O1).
    expect(stores.get('reports')!.has('HJKMNP-woman-ACDEFG')).toBe(true)
    expect(stores.get('reports')!.has('resolved/QRTWXY')).toBe(true)
    expect(stores.get('couples')!.has('QRTWXY')).toBe(true)
    // Asking again finishes whatever a first attempt left, and says it is done
    // (docs/INTEGRITY.md); the code opens nothing, and says why.
    const again = await forget('ACDEFG')
    expect(again.status).toBe(200)
    expect(await again.json()).toEqual({ forgotten: true })
    expect((await get('ACDEFG')).status).toBe(410)
  })

  it('takes no report on either side, whatever the snapshot claims — only the founder resolves one', async () => {
    // This cascade used to delete `${couple}-${side}-*`, with both read out of
    // the snapshot. A snapshot is whatever the caller POSTed, so a reported man
    // could keep a map claiming to be her and erase her reports by forgetting
    // it (docs/SECURITY.md, O1; tests/security-audit.test.ts). Now neither
    // side's report moves, and the sheet — which any code holder can delete
    // anyway — is the only thing a snapshot can name.
    for (const [code, gender] of [['ACDEFG', 'woman'], ['JKMNPQ', 'man'], ['QRTWXY', undefined]] as const) {
      seed(code, { identity: { gender }, couple: { code: 'HJKMNP', at: 'x' } })
      memStore('couples').setJSON('HJKMNP', { creator: 'woman', first: {} })
      memStore('reports')
      stores.get('reports')!.set('HJKMNP-woman-QRTWXYAC', JSON.stringify({ id: 'QRTWXYAC', code: 'HJKMNP', side: 'woman', reason: 'threats', at: 'd' }))
      stores.get('reports')!.set('HJKMNP-man-BCDFGHJK', JSON.stringify({ id: 'BCDFGHJK', code: 'HJKMNP', side: 'man', reason: 'other', at: 'd' }))
      const res = await forget(code)
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ forgotten: true })
      expect(stores.get('reports')!.size).toBe(2)
      expect(stores.get('couples')!.has('HJKMNP')).toBe(false)
    }
  })

  it('forgetting needs a code the right shape', async () => {
    expect((await forget('nope')).status).toBe(400)
    expect((await forget('ACDEFGHJKM')).status).toBe(400)
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
    memStore('maps').setJSON('AAAAAAAA', hers)
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(drawing('AAAAAAAA', 'CCCCCCCC') as never)

    const res = await post({ snapshot: { identity: { firstName: 'Hodan' } } })
    expect(res.status).toBe(200)
    expect((await res.json()).code).toBe('CCCCCCCC')

    // Hers is untouched, byte for byte.
    expect(JSON.parse(stores.get('maps')!.get('AAAAAAAA')!)).toEqual(hers)
    // And the new map really is stored, under the code that was free.
    expect(JSON.parse(stores.get('maps')!.get('CCCCCCCC')!).snapshot.identity.firstName).toBe('Hodan')
    vi.restoreAllMocks()
  })

  it('refuses rather than overwrites when every attempt collides', async () => {
    for (const c of ['AAAAAAAA', 'CCCCCCCC', 'DDDDDDDD', 'EEEEEEEE', 'FFFFFFFF']) {
      memStore('maps').setJSON(c, { snapshot: { taken: c }, createdAt: 'd', expiresAt: 'z' })
    }
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(
      drawing('AAAAAAAA', 'CCCCCCCC', 'DDDDDDDD', 'EEEEEEEE', 'FFFFFFFF') as never,
    )
    // Failing to save is recoverable — her map is still on her phone.
    // Overwriting one of these five is not.
    expect((await post({ snapshot: { identity: { firstName: 'Hodan' } } })).status).toBe(503)
    for (const c of ['AAAAAAAA', 'CCCCCCCC', 'DDDDDDDD', 'EEEEEEEE', 'FFFFFFFF']) {
      expect(JSON.parse(stores.get('maps')!.get(c)!).snapshot.taken).toBe(c)
    }
    vi.restoreAllMocks()
  })

  it('re-keeping under the code she already has still writes straight through', async () => {
    const first = await post({ snapshot: { identity: { firstName: 'Hodan' } } })
    const { code } = await first.json()
    const again = await post({ snapshot: { identity: { firstName: 'Hodan', scene: 'london' } }, code })
    expect(again.status).toBe(200)
    expect((await again.json()).code).toBe(code)
    expect(JSON.parse(stores.get('maps')!.get(code)!).snapshot.identity.scene).toBe('london')
  })

  it('measures the body before it parses it', async () => {
    const huge = JSON.stringify({ snapshot: { blob: 'x'.repeat(200_000) } })
    const res = await handler(
      new Request('http://x/.netlify/functions/keep', { method: 'POST', body: huge }),
    )
    expect(res.status).toBe(413)
  })
})
