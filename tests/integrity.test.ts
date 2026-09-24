import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ALPHABET } from '../netlify/shared/code'
import { blobs } from './support/blobs'

/**
 * The data model, broken on purpose (docs/PRIVACY.md).
 *
 * Netlify Blobs has no transactions: every operation here that touches more
 * than one key is a sequence, and any step of it can fail after the ones
 * before it succeeded — or be overtaken by another request. Each test below
 * picks a step, makes it fail or makes something happen just before it, and
 * checks that what is left is either whole, or finished by a retry, or
 * reconciled by the weekly sweep — never a map nobody can reach, two copies
 * of one map, or a code that comes back after she forgot it.
 */

vi.mock('@netlify/blobs', async () => (await import('./support/blobs')).blobsModule)

const keep = (await import('../netlify/functions/keep')).default
const couple = (await import('../netlify/functions/couple')).default
const safety = (await import('../netlify/functions/safety')).default
const progress = (await import('../netlify/functions/progress')).default
const { sweep } = await import('../netlify/functions/sweep')

type Handler = (req: Request) => Promise<Response>
const call = (h: Handler, method: string, path: string, body?: unknown) =>
  h(
    new Request(`http://x/.netlify/functions/${path}`, {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }),
    }),
  )

const DAY = 24 * 60 * 60 * 1000
const LIVE = '2099-01-01'
const HER = 'HJKMNPQR'
const TOKEN = 'ACDEFGHJKM'
const PAIR = 'TWXY3478'

/** A member with a kept map and the eleven she sent him. */
function seedMember(code = HER) {
  blobs.put('maps', code, { snapshot: { identity: { firstName: 'Hodan' }, couple: { code: PAIR } }, createdAt: '2026-09-01', expiresAt: LIVE, v: 1 })
  blobs.put('couples', PAIR, { creator: 'woman', first: {}, createdAt: '2026-09-04', expiresAt: LIVE, v: 1 })
}

/** Every key, in every store, that still names her code. */
function underCode(code: string): string[] {
  const out: string[] = []
  for (const [name, m] of blobs.stores) {
    for (const [key, b] of m) {
      if (key === `ended/${code}`) continue
      if (key.includes(code) || b.value === code || b.value.endsWith(`/${code}`)) out.push(`${name}:${key}`)
    }
  }
  return out
}

/** Map codes in the maps store — records, not tombstones, journals or once keys. */
const mapCodes = () => blobs.keys('maps').filter((k) => /^[A-Z0-9]{6,8}$/.test(k))

/** Make `crypto.getRandomValues` draw these codes, in order. */
function drawing(...codes: string[]) {
  const queue = codes.flatMap((c) => [...c].map((ch) => ALPHABET.indexOf(ch)))
  return (array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) array[i] = queue.shift() ?? 0
    return array
  }
}

beforeEach(() => blobs.reset())
afterEach(() => vi.restoreAllMocks())

// ─── Forget me ─────────────────────────────────────────────────────────────
describe('forget me, failing at every step of its cascade', () => {
  const steps = [
    { store: 'couples', op: 'delete' as const, key: PAIR },
    { store: 'maps', op: 'delete' as const, key: HER },
  ]
  for (const step of steps) {
    it(`fails at ${step.store}:${step.key} — the code already restores nothing, and a retry leaves nothing under it`, async () => {
      seedMember()
      blobs.failOn(step)
      expect((await call(keep, 'DELETE', `keep?code=${HER}`)).status).toBe(503)
      // Part-forgotten is forgotten: she asked, and nothing may bring it back.
      const get = await call(keep, 'GET', `keep?code=${HER}`)
      expect(get.status).toBe(410)
      expect((await get.json()).error).toBe('forgotten')
      // The retry finishes it — every step is safe to run twice.
      const again = await call(keep, 'DELETE', `keep?code=${HER}`)
      expect(again.status).toBe(200)
      expect(underCode(HER)).toEqual([])
    })
  }

  it('a code she forgot is never kept again from another phone — it answers that it was forgotten', async () => {
    seedMember()
    await call(keep, 'DELETE', `keep?code=${HER}`)
    const res = await call(keep, 'POST', 'keep', { code: HER, snapshot: { identity: { firstName: 'Hodan' } } })
    expect(res.status).toBe(410)
    expect((await res.json()).error).toBe('forgotten')
    expect(mapCodes()).toEqual([])
  })
})

// ─── Change my code ────────────────────────────────────────────────────────
describe('a new code, failing part-way', () => {
  it('fails before the old code is closed — the old code still opens her map, and a retry makes one copy, not two', async () => {
    seedMember()
    blobs.failOn({ store: 'maps', op: 'setJSON', key: `ended/${HER}` })
    expect((await call(keep, 'PUT', `keep?code=${HER}`)).status).toBe(503)
    expect((await call(keep, 'GET', `keep?code=${HER}`)).status).toBe(200)
    const res = await call(keep, 'PUT', `keep?code=${HER}`)
    expect(res.status).toBe(200)
    const { code } = await res.json()
    expect(mapCodes()).toEqual([code])
    expect(blobs.keys('maps').filter((k) => k.startsWith('moving/'))).toEqual([])
  })

  it('fails removing the old map — the old code is already closed, and the sweep finishes it under the same new code', async () => {
    seedMember()
    blobs.failOn({ store: 'maps', op: 'delete', key: HER })
    expect((await call(keep, 'PUT', `keep?code=${HER}`)).status).toBe(503)
    expect((await call(keep, 'GET', `keep?code=${HER}`)).status).toBe(410)
    const res = await call(keep, 'PUT', `keep?code=${HER}`)
    // A retry against a closed code has nothing to move; the sweep finishes it.
    expect([200, 410]).toContain(res.status)
    await sweep(Date.now() + 2 * DAY)
    expect(mapCodes()).toHaveLength(1)
    expect(underCode(HER)).toEqual([])
  })

  it('an attempt nobody retries is rolled back by the sweep — one map, under the code she has', async () => {
    seedMember()
    blobs.failOn({ store: 'maps', op: 'setJSON', key: `ended/${HER}` })
    expect((await call(keep, 'PUT', `keep?code=${HER}`)).status).toBe(503)
    await sweep(Date.now() + 2 * DAY)
    expect(mapCodes()).toEqual([HER])
    expect((await call(keep, 'GET', `keep?code=${HER}`)).status).toBe(200)
  })

  it('a save that lands mid-move is carried to the new code, not lost with the old one', async () => {
    seedMember()
    // Just after the copy is made under the new code, the old phone saves.
    let fired = false
    blobs.before(
      'setJSON',
      `moving/${HER}`,
      async () => {
        fired = true
        await call(keep, 'POST', 'keep', { code: HER, snapshot: { identity: { firstName: 'Newer' } } })
      },
      'maps',
    )
    const res = await call(keep, 'PUT', `keep?code=${HER}`)
    expect(res.status).toBe(200)
    const { code } = await res.json()
    expect(fired).toBe(true)
    expect((blobs.read('maps', code) as { snapshot: { identity: { firstName: string } } }).snapshot.identity.firstName).toBe('Newer')
  })

  it('a code that was changed is never kept again from the old phone — it answers that it moved', async () => {
    seedMember()
    await call(keep, 'PUT', `keep?code=${HER}`)
    const res = await call(keep, 'POST', 'keep', { code: HER, snapshot: { identity: { firstName: 'Hodan' } } })
    expect(res.status).toBe(410)
    expect((await res.json()).error).toBe('moved')
    expect(mapCodes()).toHaveLength(1)
  })
})

// ─── Keeping ───────────────────────────────────────────────────────────────
describe('keeping from two phones', () => {
  it('a phone that has not seen the latest keep cannot write over it', async () => {
    blobs.put('maps', HER, { snapshot: { identity: { firstName: 'Newest' } }, createdAt: '2026-09-01', expiresAt: LIVE, rev: 3, v: 1 })
    const stale = await call(keep, 'POST', 'keep', { code: HER, rev: 2, snapshot: { identity: { firstName: 'Older' } } })
    expect(stale.status).toBe(409)
    expect((await stale.json()).error).toBe('stale')
    expect((blobs.read('maps', HER) as { snapshot: { identity: { firstName: string } } }).snapshot.identity.firstName).toBe('Newest')
    const current = await call(keep, 'POST', 'keep', { code: HER, rev: 3, snapshot: { identity: { firstName: 'Newer still' } } })
    expect(current.status).toBe(200)
    expect((await current.json()).rev).toBe(4)
  })

  it('a map kept before revisions, from a client that sends none, is kept and given one', async () => {
    blobs.put('maps', HER, { snapshot: {}, createdAt: '2026-09-01', expiresAt: LIVE })
    const res = await call(keep, 'POST', 'keep', { code: HER, snapshot: { identity: { firstName: 'Hodan' } } })
    expect(res.status).toBe(200)
    expect(blobs.read('maps', HER)).toMatchObject({ rev: 1, v: 1 })
    const restored = await call(keep, 'GET', `keep?code=${HER}`)
    expect((await restored.json()).rev).toBe(1)
  })

  it('the same first keep sent twice — a double tap, or a reply lost on the way — is one code and one map', async () => {
    const once = 'CDEFGHJKMN'
    const a = await (await call(keep, 'POST', 'keep', { once, snapshot: { identity: { firstName: 'Hodan' } } })).json()
    const b = await (await call(keep, 'POST', 'keep', { once, snapshot: { identity: { firstName: 'Hodan' } } })).json()
    expect(b.code).toBe(a.code)
    expect(mapCodes()).toEqual([a.code])
  })

  it('never mints a code that was forgotten or moved', async () => {
    blobs.put('maps', 'AAAAAAAA', { why: 'forgotten', expiresAt: LIVE })
    blobs.put('maps', 'ended/AAAAAAAA', { why: 'forgotten', expiresAt: LIVE })
    blobs.stores.get('maps')!.delete('AAAAAAAA')
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(drawing('AAAAAAAA', 'CCCCCCCC') as never)
    const res = await call(keep, 'POST', 'keep', { snapshot: { identity: { firstName: 'Hodan' } } })
    expect((await res.json()).code).toBe('CCCCCCCC')
  })
})

// ─── The sweep ─────────────────────────────────────────────────────────────
describe('the weekly sweep', () => {
  it('one record it cannot read is counted, and everything else is still swept', async () => {
    blobs.put('maps', 'ACDEFGHJ', 'not json {')
    blobs.put('maps', HER, { snapshot: {}, createdAt: '2025-01-01', expiresAt: '2025-06-01', v: 1 })
    const swept = await sweep(Date.now())
    expect(swept.errors).toBeGreaterThanOrEqual(1)
    expect(mapCodes()).toEqual(['ACDEFGHJ'])
  })

  it('empties what the door and the vouch left behind — a way to reach someone, a relative’s name and phone', async () => {
    // Removed on 2026-09-24 (docs/DECISIONS.md). Nothing reads these stores
    // any more, so nothing in them is kept.
    blobs.put('contacts', HER, { contact: 'hodan@example.com', scene: 'twin-cities', country: 'us', at: '2026-01-01' })
    blobs.put('cohort', `us/twin-cities/woman/city/serious/${HER}`, { at: '2026-09-03', ledger: [], v: 1 })
    blobs.put('cohort', `index/${HER}`, `us/twin-cities/woman/city/serious/${HER}`)
    blobs.put('vouches', HER, { relationship: 'father', firstName: 'Abdi', sentence: 's', phone: '07000', at: '2026-09-02' })
    blobs.put('vouches', `token/${TOKEN}`, HER)
    const swept = await sweep(Date.now())
    expect(swept.retired).toBe(5)
    for (const store of ['contacts', 'cohort', 'vouches']) expect(blobs.keys(store), store).toEqual([])
    expect((await sweep(Date.now())).retired).toBe(0)
  })

  it('never deletes a map renewed between reading it as lapsed and deleting it', async () => {
    blobs.put('maps', HER, { snapshot: {}, createdAt: '2025-01-01', expiresAt: '2025-06-01', rev: 1, v: 1 })
    blobs.before(
      'getMetadata',
      HER,
      async () => {
        await call(keep, 'POST', 'keep', { code: HER, snapshot: { identity: { firstName: 'Back' } } })
      },
      'maps',
    )
    await sweep(Date.now())
    expect(mapCodes()).toEqual([HER])
  })
})

// ─── Everything else that writes ──────────────────────────────────────────
describe('small writes that must not lose or overwrite', () => {
  it('two steps reported at once from two tabs both stay', async () => {
    const id = 'CDEFGHJK'
    blobs.before('setJSON', id, async () => {
      await call(progress, 'POST', 'progress', { id, rungs: ['situated'] })
    }, 'progress')
    await call(progress, 'POST', 'progress', { id, rungs: ['mapped'] })
    const record = blobs.read('progress', id) as { first: Record<string, string> }
    expect(Object.keys(record.first).sort()).toEqual(['mapped', 'situated'])
  })

  it('a report id that collides never overwrites another report', async () => {
    blobs.put('couples', PAIR, { creator: 'woman', first: {}, createdAt: '2026-09-04', expiresAt: LIVE, v: 1 })
    const theirs = { id: TOKEN, code: PAIR, side: 'woman', reason: 'threats', at: '2026-09-05', v: 1 }
    blobs.put('reports', `${PAIR}-woman-${TOKEN}`, theirs)
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(drawing(TOKEN, 'CDEFGHJKMN') as never)
    const res = await call(safety, 'POST', 'safety', { code: PAIR, side: 'woman', reason: 'harassment' })
    expect(res.status).toBe(200)
    expect(blobs.read('reports', `${PAIR}-woman-${TOKEN}`)).toEqual(theirs)
    expect(blobs.read('reports', `${PAIR}-woman-CDEFGHJKMN`)).toMatchObject({ reason: 'harassment' })
  })

  it('a new pair never takes the code of a sheet that is gone — its reports stay with the pair they are about', async () => {
    blobs.put('couples', 'gone/AAAAAAAA', { expiresAt: LIVE })
    const states = Object.fromEntries(
      ['live', 'his-family-in-home', 'work', 'money-home', 'children', 'deen-daily', 'aroos-mahr', 'qabiil', 'going-back', 'second-wife', 'families-disagree'].map((t) => [t, 'agree']),
    )
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(drawing('DDDDDDDDDD', 'AAAAAAAA', 'CCCCCCCC') as never)
    const res = await call(couple, 'POST', 'couple', { side: 'first', gender: 'woman', states })
    expect((await res.json()).code).toBe('CCCCCCCC')
  })
})

// ─── Shapes written before this ───────────────────────────────────────────
describe('records written before revisions, tombstones and once keys', () => {
  it('a six-character map with no version and no revision still opens, and is upgraded the next time it is kept', async () => {
    blobs.put('maps', 'QRTWXY', { snapshot: { identity: { firstName: 'Old' } }, createdAt: '2025-12-01', expiresAt: LIVE })
    const got = await call(keep, 'GET', 'keep?code=QRTWXY')
    expect(got.status).toBe(200)
    expect(await got.json()).toMatchObject({ rev: 0, snapshot: { identity: { firstName: 'Old' } } })
    await call(keep, 'POST', 'keep', { code: 'QRTWXY', snapshot: { identity: { firstName: 'Old' } } })
    expect(blobs.read('maps', 'QRTWXY')).toMatchObject({ v: 1, rev: 1, createdAt: '2025-12-01' })
  })

  it('a progress record with no version is added to, never replaced', async () => {
    blobs.put('progress', 'CDEFGHJK', { first: { arrived: '2026-01-01' }, expiresAt: LIVE })
    await call(progress, 'POST', 'progress', { id: 'CDEFGHJK', rungs: ['mapped'] })
    expect(blobs.read('progress', 'CDEFGHJK')).toMatchObject({ v: 1, first: { arrived: '2026-01-01', mapped: expect.any(String) } })
  })
})
