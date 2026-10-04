import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCAL_KEYS, forgetMe, importLegacy, pendingForget, resetForgetMirror, retryPendingForget } from './forget'
import { LEGACY, recoveryKey, recoveryKeys, recoveryOf } from '../../tests/support/recovery'

/**
 * Forget me is the control that makes every sentence on Trust enforceable.
 * These pin what it deletes, where, and that the phone is wiped whatever the
 * server said.
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
  return store
}

let store: Map<string, string>
beforeEach(() => {
  store = installStorage()
  // What a reload clears: the codes this page has had confirmed, and the ones it holds because storage refused them.
  resetForgetMirror()
})
afterEach(() => vi.unstubAllGlobals())

/** What each route's own handler answers when it did the work (netlify/functions): the shapes differ, and Forget me reads each by its own. */
const gave = (url: string) =>
  new Response(String(url).includes('/couple') ? '{"ok":true}' : String(url).includes('/introduce') ? '{"removed":true}' : '{"forgotten":true}', { status: 200 })

const seed = () => {
  store.set('niyyah.intake.v1', '{"answers":{}}')
  store.set('niyyah.keep.code.v1', 'ACDEFG')
  store.set('niyyah.install.v1', 'HJKMNP')
  store.set('niyyah.via.v1', 'words')
  store.set('niyyah.waitlist.queue.v1', '[]')
  store.set('niyyah.events.v1', '[]')
}

describe('forget me', () => {
  it('takes the eleven she sent him, even when she never kept a map', async () => {
    // The gap this closes: `createCouple` needs no map code, and the cascade
    // in netlify/functions/keep.ts finds the couple code inside a kept
    // snapshot. So a woman who sent him the eleven and kept nothing was told
    // forgetting was done while both sheets sat on the server for the rest of
    // the ninety days — while Trust says, with no condition, that this
    // "deletes ... the eleven you sent him" (docs/DECISIONS.md).
    store.set('niyyah.intake.v1', JSON.stringify({ answers: {}, couple: { code: 'QRTWXY', sentAt: 'x' } }))
    store.set('niyyah.install.v1', 'HJKMNP')
    const spy = vi.fn(async (url: string, _init?: RequestInit) => gave(url))
    vi.stubGlobal('fetch', spy)

    const result = await forgetMe()
    expect(result).toEqual({ map: true, progress: true, couple: true, intro: true })
    const calls = spy.mock.calls.map((c) => c[0]).sort()
    expect(calls).toEqual([
      '/.netlify/functions/couple?code=QRTWXY',
      '/.netlify/functions/progress?id=HJKMNP',
    ])
    expect(store.size).toBe(0)
  })

  it('deletes the map by her code and the count by her install code, then wipes every key this app writes', async () => {
    seed()
    const spy = vi.fn(async (url: string, _init?: RequestInit) => gave(url))
    vi.stubGlobal('fetch', spy)
    const result = await forgetMe()
    expect(result).toEqual({ map: true, progress: true, couple: true, intro: true })
    const calls = spy.mock.calls.map((c) => [c[0], c[1]?.method]).sort()
    expect(calls).toEqual([
      ['/.netlify/functions/keep?code=ACDEFG', 'DELETE'],
      ['/.netlify/functions/progress?id=HJKMNP', 'DELETE'],
    ])
    for (const key of LOCAL_KEYS) expect(store.has(key)).toBe(false)
    expect(store.size).toBe(0)
  })

  it('treats already-gone as done', async () => {
    seed()
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"not_found"}', { status: 404 })))
    expect(await forgetMe()).toEqual({ map: true, progress: true, couple: true, intro: true })
  })

  it('with no codes on this phone, calls nobody and still clears', async () => {
    store.set('niyyah.intake.v1', '{"answers":{}}')
    const spy = vi.fn()
    vi.stubGlobal('fetch', spy)
    expect(await forgetMe()).toEqual({ map: true, progress: true, couple: true, intro: true })
    expect(spy).not.toHaveBeenCalled()
    expect(store.size).toBe(0)
  })

  it('wipes everything but the codes still to delete when the server cannot be reached, and says which', async () => {
    seed()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    // The code is named, so she can write in with it (docs/PRIVACY.md).
    expect(await forgetMe()).toEqual({ map: false, progress: false, couple: true, intro: true, mapHeld: ['ACDEFG'], kept: true })
    // What is left is one key per code to delete, and none of her answers.
    expect([...store.keys()].sort()).toEqual([recoveryKey('installs', 'HJKMNP'), recoveryKey('maps', 'ACDEFG')].sort())
    expect(recoveryOf(store)).toEqual({ maps: ['ACDEFG'], installs: ['HJKMNP'], pairs: [], intros: [] })
    expect(store.get(recoveryKey('maps', 'ACDEFG'))).toBe('1')
  })

  it('finishes a forget the server missed — tapping again, or just opening the app — and then leaves nothing', async () => {
    seed()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    await forgetMe()
    // Tapping Forget me again used to send nothing, and say it was done.
    const spy = vi.fn(async (url: string, _init?: RequestInit) => gave(url))
    vi.stubGlobal('fetch', spy)
    expect(await forgetMe()).toEqual({ map: true, progress: true, couple: true, intro: true })
    expect(spy.mock.calls.map((c) => c[0]).sort()).toEqual(['/.netlify/functions/keep?code=ACDEFG', '/.netlify/functions/progress?id=HJKMNP'])
    expect(store.size).toBe(0)
  })

  it('sends a pending forget again on its own, and keeps what still did not land', async () => {
    seed()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    await forgetMe()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).includes('/keep') ? gave(url) : new Response('{}', { status: 503 }))))
    expect(await retryPendingForget()).toBe(false)
    expect(recoveryOf(store)).toEqual({ maps: [], installs: ['HJKMNP'], pairs: [], intros: [] })
    vi.stubGlobal('fetch', vi.fn(async (url: string) => gave(url)))
    expect(await retryPendingForget()).toBe(true)
    expect(store.size).toBe(0)
  })

  it('leaves every concern she reported with the founder — a forget me made under pressure takes none', async () => {
    // Forget me used to send every receipt this phone held and withdraw each
    // report. So "delete that app in front of me" erased the only record of a
    // threat — without the man standing over her ever knowing there was one
    // (docs/SECURITY.md, coercion). A report is a message to a person now, like
    // any sent message: it stays until the founder has read it, and then only
    // the kind of harm and what was done are kept.
    store.set('niyyah.intake.v1', '{"answers":{}}')
    store.set('niyyah.reports.v1', JSON.stringify([{ code: 'QRTWXY', side: 'woman', id: 'ACDEFGHJ' }]))
    const spy = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    await forgetMe()
    expect(spy.mock.calls.filter((c) => String(c[0]).includes('/safety'))).toEqual([])
    // An older phone's receipts go with everything else on it.
    expect(store.size).toBe(0)
  })

  it('takes her name off the introduction list by the code that list handed this phone', async () => {
    // Its own code under its own key, joined to nothing else (src/lib/introduce.ts).
    // Forget me sends it as a fourth delete, and a 404 is done.
    store.set('niyyah.intake.v1', '{"answers":{}}')
    store.set('niyyah.intro.v1', JSON.stringify({ code: 'QRTWXY34', at: '2026-09-27' }))
    const spy = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{"removed":true}', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    expect(await forgetMe()).toEqual({ map: true, progress: true, couple: true, intro: true })
    expect(spy.mock.calls.map((c) => [c[0], c[1]?.method])).toEqual([['/.netlify/functions/introduce?code=QRTWXY34', 'DELETE']])
    expect(store.size).toBe(0)
    // Offline, the code is kept to send again — and named as what is still held. (A new page: a code this page had
    // confirmed is not asked about again here, so the second half starts as a reload would.)
    resetForgetMirror()
    store.set('niyyah.intro.v1', JSON.stringify({ code: 'QRTWXY34', at: '2026-09-27' }))
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await forgetMe()).toEqual({ map: true, progress: true, couple: true, intro: false, introHeld: ['QRTWXY34'], kept: true })
    expect(recoveryOf(store).intros).toEqual(['QRTWXY34'])
  })

  it('takes off an attempt to put her name down that was never answered, under the code it went out with', async () => {
    // The pending attempt (src/lib/introduce.ts): its code is sent as a
    // delete too, so the server marks it and a request still on its way
    // cannot land after Forget me (docs/BATCH-01-PLAN.md D2).
    store.set('niyyah.intake.v1', '{"answers":{}}')
    store.set('niyyah.intro.v1', JSON.stringify({ code: 'QRTWXY34', at: '2026-09-27', removeOn: '2027-03-21' }))
    store.set('niyyah.intro.pending.v1', JSON.stringify({ code: 'HJKMNPQR', at: '2026-09-27' }))
    const spy = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{"removed":false}', { status: 200 }))
    vi.stubGlobal('fetch', spy)
    expect(await forgetMe()).toEqual({ map: true, progress: true, couple: true, intro: true })
    expect(spy.mock.calls.map((c) => [c[0], c[1]?.method]).sort()).toEqual([
      ['/.netlify/functions/introduce?code=HJKMNPQR', 'DELETE'],
      ['/.netlify/functions/introduce?code=QRTWXY34', 'DELETE'],
    ])
    expect(store.size).toBe(0)
    // Offline, both codes are kept to send again, and named as still held. (After a reload.)
    resetForgetMirror()
    store.set('niyyah.intro.v1', JSON.stringify({ code: 'QRTWXY34', at: '2026-09-27', removeOn: '2027-03-21' }))
    store.set('niyyah.intro.pending.v1', JSON.stringify({ code: 'HJKMNPQR', at: '2026-09-27' }))
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await forgetMe()).toEqual({ map: true, progress: true, couple: true, intro: false, introHeld: ['HJKMNPQR', 'QRTWXY34'], kept: true })
    expect(recoveryOf(store).intros).toEqual(['HJKMNPQR', 'QRTWXY34'])
    // The next launch finishes it.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"removed":true}', { status: 200 })))
    expect(await retryPendingForget()).toBe(true)
    expect(store.size).toBe(0)
  })

  it('names every key the app writes', () => {
    // The list itself; tests/forget-keys.test.ts is what proves it is complete, by
    // reading src/ for every key the app actually writes. A hand-written list
    // alone cannot do that, which is how `niyyah.draft.v1` would have been
    // missed (docs/DESIGN.md).
    expect(LOCAL_KEYS.sort()).toEqual(
      [
        'niyyah.draft.v1',
        'niyyah.entry.v1',
        'niyyah.events.v1',
        'niyyah.install.v1',
        'niyyah.intake.v1',
        'niyyah.intro.pending.v1',
        'niyyah.intro.v1',
        'niyyah.keep.code.v1',
        'niyyah.keep.once.v1',
        'niyyah.keep.rev.v1',
        'niyyah.reports.v1',
        'niyyah.via.v1',
        'niyyah.waitlist.queue.v1',
      ].sort(),
    )
  })
})

/**
 * The introduction codes in the pending-forget record (docs/DECISIONS.md Part 33): what an
 * unresolved deletion leaves behind, and what a completed retry may remove. Fetch is a stub
 * here and answers what each test says; the real handler runs in
 * tests/invariants/forget-introduction.test.ts.
 */
const A = 'QRTWXY34'
const B = 'HJKMNPQR'
const PENDING = LEGACY
const receipt = (code: string) => store.set('niyyah.intro.v1', JSON.stringify({ code, at: '2026-09-27', removeOn: '2027-03-21' }))
/** The introduction codes this phone keeps a recovery key for. */
const heldCodes = (): string[] => recoveryOf(store).intros
const removed = () => new Response('{"removed":true}', { status: 200 })

describe('what Forget me accepts as an introduction deletion', () => {
  it('the legacy 404 with not_found confirms absence; a 404 with any other body does not', async () => {
    receipt(A)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"not_found"}', { status: 404 })))
    expect((await forgetMe()).intro).toBe(true)
    expect(store.size).toBe(0)

    resetForgetMirror()
    receipt(A)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<!doctype html>', { status: 404 })))
    expect((await forgetMe()).intro).toBe(false)
    expect(heldCodes()).toEqual([A])
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"gone"}', { status: 404 })))
    expect(await retryPendingForget()).toBe(false)
    expect(heldCodes()).toEqual([A])
  })

  it('a bare 200 is not a confirmation of any of the four, and every code is kept', async () => {
    store.set('niyyah.keep.code.v1', 'ACDEFG')
    store.set('niyyah.install.v1', 'HJKMNP')
    store.set('niyyah.intake.v1', JSON.stringify({ answers: {}, couple: { code: 'QRTWXY', sentAt: 'x' } }))
    receipt(A)
    store.set('niyyah.intro.pending.v1', JSON.stringify({ code: B, at: '2026-09-27' }))
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })))
    const done = await forgetMe()
    expect(done).toMatchObject({ map: false, progress: false, couple: false, intro: false, mapHeld: ['ACDEFG'], introHeld: [A, B].sort(), kept: true })
    expect(recoveryOf(store)).toEqual({ maps: ['ACDEFG'], installs: ['HJKMNP'], pairs: ['QRTWXY'], intros: [A, B].sort() })
  })

  it('a record written by an earlier build is imported, never rewritten; what did not land is kept under recovery keys', async () => {
    const raw = JSON.stringify({ code: 'ACDEFG', intro: A, introPending: B })
    store.set(PENDING, raw)
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).includes(B) ? new Response('<html>', { status: 200 }) : gave(url))))
    expect(await retryPendingForget()).toBe(false)
    expect(recoveryOf(store)).toEqual({ maps: [], installs: [], pairs: [], intros: [B] })
    // The older record is exactly as that build left it: this build never writes or removes it.
    expect(store.get(PENDING)).toBe(raw)
  })

  it('imports a record with junk in it as far as it can: bad codes are not imported, good ones are, and the record is left as it was', async () => {
    const raw = JSON.stringify({ intros: [A, 'zz', 7, null, B], intro: A })
    store.set(PENDING, raw)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 200 })))
    expect(await retryPendingForget()).toBe(false)
    expect(heldCodes()).toEqual([A, B].sort())
    expect(pendingForget()).toEqual({ intros: [A, B].sort() })
    expect(store.get(PENDING)).toBe(raw)
  })
})

describe('a completed retry removes only what it confirmed (G2)', () => {
  /** A fetch whose first request for `code` waits for `release`; every later request, and every other code, is a 503. */
  function stallFirst(code: string) {
    let release!: (r: Response) => void
    const first = new Promise<Response>((res) => {
      release = res
    })
    const seen: Record<string, number> = {}
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        seen[url] = (seen[url] ?? 0) + 1
        return String(url).includes(code) && seen[url] === 1 ? first : new Response('{}', { status: 503 })
      }),
    )
    return release
  }

  it('an introduction code added while it was in flight stays', async () => {
    store.set(PENDING, JSON.stringify({ intro: A }))
    const release = stallFirst(A)
    const retry = retryPendingForget()
    // While it is out, a Forget me on a phone holding a pending attempt B: its own retry and deletes fail.
    store.set('niyyah.intro.pending.v1', JSON.stringify({ code: B, at: '2026-09-27' }))
    await forgetMe()
    expect(heldCodes()).toEqual([A, B].sort())
    release(removed())
    expect(await retry).toBe(true)
    expect(heldCodes()).toEqual([B])
  })

  it('a map code added while it was in flight stays, and so does an introduction code', async () => {
    store.set(PENDING, JSON.stringify({ intro: A }))
    const release = stallFirst(A)
    const retry = retryPendingForget()
    store.set('niyyah.keep.code.v1', 'ACDEFG')
    receipt(B)
    await forgetMe()
    release(removed())
    expect(await retry).toBe(true)
    expect(recoveryOf(store)).toEqual({ maps: ['ACDEFG'], installs: [], pairs: [], intros: [B] })
  })

  it('a retry that confirms nothing leaves a record that changed meanwhile as it found it', async () => {
    store.set(PENDING, JSON.stringify({ intro: A }))
    const release = stallFirst(A)
    const retry = retryPendingForget()
    receipt(B)
    await forgetMe()
    release(new Response('<html>', { status: 200 }))
    expect(await retry).toBe(false)
    expect(heldCodes()).toEqual([A, B].sort())
  })

  it('a code confirmed by a retry is not brought back by the Forget me that was running beside it', async () => {
    store.set(PENDING, JSON.stringify({ intros: [A] }))
    // Both ask about A; A is answered the first time, so the record empties once and stays empty.
    vi.stubGlobal('fetch', vi.fn(async () => removed()))
    await Promise.all([retryPendingForget(), forgetMe()])
    // Nothing is waiting. The older record is untouched, and still names A: a later launch may import and ask again.
    expect(recoveryKeys(store)).toEqual([])
    expect(store.get(PENDING)).toBe(JSON.stringify({ intros: [A] }))
  })
})

/**
 * What Forget me accepts as the map's, the step count's and the eleven's deletion (docs/DECISIONS.md Part 34):
 * the one table that holds each endpoint's answers. The layers above it (tests/invariants/forget-confirmation.test.ts,
 * the screen) hold what Forget me does with a result, and do not repeat this.
 */
describe('what Forget me accepts as a keep, progress or couple deletion', () => {
  const ENDPOINTS: [string, string, string, (store: Map<string, string>) => void, string][] = [
    ['keep', 'forgotten', 'map', (m) => m.set('niyyah.keep.code.v1', 'ACDEFG'), 'code'],
    ['progress', 'forgotten', 'progress', (m) => m.set('niyyah.install.v1', 'HJKMNPQR'), 'id'],
    ['couple', 'ok', 'couple', (m) => m.set('niyyah.intake.v1', JSON.stringify({ answers: {}, couple: { code: 'QRTWXY', sentAt: 'x' } })), 'pair'],
  ]
  const json = (body: unknown, status = 200) => () => new Response(JSON.stringify(body), { status })
  const html = (status = 200) => () => new Response('<!doctype html><title>Niyyah</title>', { status, headers: { 'content-type': 'text/html' } })

  describe.each(ENDPOINTS)('%s', (_route, field, flag, put, slot) => {
    const other = field === 'ok' ? 'forgotten' : 'ok'
    const CONFIRMS: [string, () => Response][] = [
      [`200 {${field}: true}`, json({ [field]: true })],
      [`200 {${field}: true} with other fields (an older build added reportsTaken)`, json({ [field]: true, reportsTaken: 2 })],
      ['404 {error: not_found}', json({ error: 'not_found' }, 404)],
    ]
    const UNCONFIRMED: [string, () => Response][] = [
      ['200 with the app’s own page', html()],
      ['200 {}', json({})],
      [`200 {${field}: false}`, json({ [field]: false })],
      [`200 {${field}: "true"}`, json({ [field]: 'true' })],
      [`200 {${other}: true}, another endpoint’s answer`, json({ [other]: true })],
      ['200 null', json(null)],
      ['200 []', json([])],
      ['200 empty', () => new Response('', { status: 200 })],
      ['202 with a valid answer', json({ [field]: true }, 202)],
      ['204', () => new Response(null, { status: 204 })],
      ['404 with the app’s own page', html(404)],
      ['404 {}', json({}, 404)],
      ['404 {error: expired}', json({ error: 'expired' }, 404)],
      ['400 bad_code', json({ error: 'bad_code' }, 400)],
      ['405', json({ error: 'GET, POST or DELETE only' }, 405)],
      ['503 rate_limited', json({ error: 'rate_limited' }, 503)],
      ['503 unavailable', json({ error: 'unavailable' }, 503)],
      ['502', html(502)],
      ['no answer', () => { throw new Error('offline') }],
    ]
    it.each(CONFIRMS)('confirms: %s', async (_n, reply) => {
      put(store)
      vi.stubGlobal('fetch', vi.fn(async () => reply()))
      expect(await forgetMe()).toEqual({ map: true, progress: true, couple: true, intro: true })
      expect(store.size).toBe(0)
    })
    it.each(UNCONFIRMED)('does not confirm: %s — the code is kept, and only the code', async (_n, reply) => {
      put(store)
      vi.stubGlobal('fetch', vi.fn(async () => reply()))
      const done = await forgetMe()
      expect(done[flag as 'map' | 'progress' | 'couple']).toBe(false)
      expect(done.kept).toBe(true)
      // One key, for this code only.
      const kind = ({ code: 'maps', id: 'installs', pair: 'pairs' } as const)[slot as 'code' | 'id' | 'pair']
      expect(recoveryKeys(store)).toEqual([recoveryKey(kind, recoveryOf(store)[kind][0])])
      expect([...store.keys()].sort()).toEqual(recoveryKeys(store))
    })
  })
})

describe('the codes Forget me will send: exactly a code, never one made out of something else', () => {
  const calls = () => {
    const spy = vi.fn(async (url: string, _init?: RequestInit) => gave(url))
    vi.stubGlobal('fetch', spy)
    return spy
  }

  it('sends a valid six-character and a valid eight-character code, as they are', async () => {
    store.set('niyyah.keep.code.v1', 'ACDEFG')
    store.set('niyyah.install.v1', 'HJKMNPQR')
    store.set('niyyah.intake.v1', JSON.stringify({ answers: {}, couple: { code: 'QRTWXY', sentAt: 'x' } }))
    const spy = calls()
    expect(await forgetMe()).toEqual({ map: true, progress: true, couple: true, intro: true })
    expect(spy.mock.calls.map((c) => c[0]).sort()).toEqual([
      '/.netlify/functions/couple?code=QRTWXY',
      '/.netlify/functions/keep?code=ACDEFG',
      '/.netlify/functions/progress?id=HJKMNPQR',
    ])
  })

  const BAD = ['QR?TWXY34', 'qrtwxy34', 'ACDEFG ', ' ACDEFG', 'ACDE-FG', 'ACDEFGH', 'ACDEF', 'ACDEFGHJKM', 'A1DEFG', 'ACDEFSG', 'ACDEFG\nA']
  it.each(BAD)('a stored value %j is not a code: it is not sent as itself, not cleaned into another, and not kept', async (bad) => {
    store.set('niyyah.keep.code.v1', bad)
    store.set('niyyah.install.v1', bad)
    store.set('niyyah.intake.v1', JSON.stringify({ answers: {}, couple: { code: bad, sentAt: 'x' } }))
    store.set('niyyah.intro.v1', JSON.stringify({ code: bad, at: '2026-09-27', removeOn: '2027-03-21' }))
    const spy = calls()
    expect(await forgetMe()).toEqual({ map: true, progress: true, couple: true, intro: true })
    expect(spy).not.toHaveBeenCalled()
    expect(store.size).toBe(0)
  })

  it('a malformed value in an older record is not imported, so it cannot be retried for ever; the valid ones beside it are', async () => {
    const raw = JSON.stringify({ code: 'QR?TWXY34', moreCodes: ['ACDEFG', 7, null, 'acdefg'], id: 'ACDEFGH', pair: 'QRTWXY', intros: [A, 'ZZZZZZZZ'] })
    store.set(PENDING, raw)
    importLegacy([raw])
    expect(pendingForget()).toEqual({ maps: ['ACDEFG'], pairs: ['QRTWXY'], intros: [A] })
    const spy = calls()
    expect(await retryPendingForget()).toBe(true)
    expect(spy.mock.calls.map((c) => c[0]).sort()).toEqual([
      '/.netlify/functions/couple?code=QRTWXY',
      '/.netlify/functions/introduce?code=QRTWXY34',
      '/.netlify/functions/keep?code=ACDEFG',
    ])
    // Everything it named is settled, and the older record, malformed value and all, is left byte for byte.
    expect(recoveryKeys(store)).toEqual([])
    expect(store.get(PENDING)).toBe(raw)
  })

  it('imports every record an earlier build wrote — the slots, and the introduction fields — and keeps a valid six- and eight-character code of each', async () => {
    importLegacy([JSON.stringify({ code: 'ACDEFG', id: 'HJKMNPQR', pair: 'QRTWXY', intro: A, introPending: B })])
    expect(pendingForget()).toEqual({ maps: ['ACDEFG'], installs: ['HJKMNPQR'], pairs: ['QRTWXY'], intros: [A, B].sort() })
  })

  it('keeps one key per code: a second unresolved forget adds a key and never replaces one', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    store.set('niyyah.keep.code.v1', 'ACDEFG')
    store.set('niyyah.install.v1', 'HJKMNPQR')
    await forgetMe()
    expect(recoveryOf(store)).toEqual({ maps: ['ACDEFG'], installs: ['HJKMNPQR'], pairs: [], intros: [] })
    store.set('niyyah.keep.code.v1', 'CDEFGH')
    await forgetMe()
    expect(recoveryOf(store)).toEqual({ maps: ['ACDEFG', 'CDEFGH'], installs: ['HJKMNPQR'], pairs: [], intros: [] })
    // Nothing but those keys: no record, no older key.
    expect([...store.keys()].sort()).toEqual([recoveryKey('installs', 'HJKMNPQR'), recoveryKey('maps', 'ACDEFG'), recoveryKey('maps', 'CDEFGH')].sort())
  })
})
