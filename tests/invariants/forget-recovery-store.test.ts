import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { forgetMe, importLegacy, onLegacyStorageEvent, pendingForget, resetForgetMirror, retryPendingForget } from '../../src/lib/forget'
import { Phone, onPhone } from '../support/device'
import { LEGACY, RECOVERY, recoveryKey, recoveryKeys, recoveryOf } from '../support/recovery'

/**
 * The recovery store, on the new build alone: what it does when an older tab
 * rewrites the record it imports from, when a storage event arrives late, when
 * the scan is shaken by another tab, and when a code is confirmed and then
 * mentioned again (docs/DECISIONS.md Part 35).
 *
 * Two instances of the module over one storage stand for two tabs. A hook on the
 * fake storage runs between two operations, as another tab would.
 */

const X = 'ACDEFGHJ'
const Y = 'CDEFGHJK'
const Z = 'DEFGHJKM'
const OLD = JSON.stringify({ code: 'ACDEFG', id: 'HJKMNPQR', pair: 'QRTWXY', intros: ['QRTWXY34'] })

let phone: Phone
let asked: string[]
let answer: (url: string) => Response | Promise<Response>
const ok = (url: string) =>
  new Response(url.includes('/couple') ? '{"ok":true}' : url.includes('/introduce') ? '{"removed":true}' : '{"forgotten":true}', { status: 200 })
const down = () => {
  throw new Error('offline')
}

beforeEach(() => {
  phone = onPhone(new Phone('hers'))
  resetForgetMirror()
  asked = []
  answer = down
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') asked.push(String(url))
      return answer(String(url))
    }),
  )
})
afterEach(() => vi.unstubAllGlobals())

const holds = (map: string) => phone.storage.set('niyyah.keep.code.v1', map)
const count = (code: string) => asked.filter((u) => u.includes(code)).length

/** A second tab: its own copy of the module (its own page memory), the same storage. */
async function anotherTab() {
  vi.resetModules()
  return await import('../../src/lib/forget')
}

describe('an older tab rewrites the record while this build is importing it', () => {
  it('the import works from what it read; what the older tab wrote next is imported at the next trigger; the older key is not touched', async () => {
    phone.storage.set(LEGACY, JSON.stringify({ code: 'ACDEFG' }))
    const theirs = JSON.stringify({ code: 'CDEFGH', id: 'HJKMNPQR' })
    let once = true
    phone.hook = (op, key) => {
      if (op === 'set' && key?.startsWith(RECOVERY) && once) {
        once = false
        phone.storage.set(LEGACY, theirs) // the older tab, between this build's read and its write
      }
    }
    importLegacy([phone.storage.get(LEGACY)])
    expect(recoveryOf(phone.storage).maps).toEqual(['ACDEFG'])
    expect(phone.storage.get(LEGACY)).toBe(theirs)

    await retryPendingForget() // down: the new content is imported, nothing is removed
    expect(recoveryOf(phone.storage).maps).toEqual(['ACDEFG', 'CDEFGH'])
    expect(recoveryOf(phone.storage).installs).toEqual(['HJKMNPQR'])
    expect(phone.storage.get(LEGACY)).toBe(theirs)
  })
})

describe('the storage event', () => {
  it('imports the codes in oldValue and in newValue: the key may be gone or different by the time it runs', () => {
    // The key no longer holds either value.
    phone.storage.set(LEGACY, '{"code":"WXY347"}')
    onLegacyStorageEvent({ key: LEGACY, oldValue: JSON.stringify({ code: 'ACDEFG', intros: [X] }), newValue: JSON.stringify({ code: 'CDEFGH' }) })
    expect(recoveryOf(phone.storage).maps).toEqual(['ACDEFG', 'CDEFGH'])
    expect(recoveryOf(phone.storage).intros).toEqual([X])
    // The removal of the key — the case where an older tab drops an unconfirmed code.
    onLegacyStorageEvent({ key: LEGACY, oldValue: JSON.stringify({ id: Y }), newValue: null })
    expect(recoveryOf(phone.storage).installs).toEqual([Y])
    expect(phone.storage.get(LEGACY)).toBe('{"code":"WXY347"}')
  })

  it('ignores a clear (key null), another key, and values that are not a record', () => {
    onLegacyStorageEvent({ key: null, oldValue: OLD, newValue: OLD })
    onLegacyStorageEvent({ key: 'niyyah.keep.code.v1', oldValue: OLD, newValue: OLD })
    onLegacyStorageEvent({ key: LEGACY, oldValue: '{cut', newValue: '[1]' })
    onLegacyStorageEvent({ key: LEGACY, oldValue: null, newValue: null })
    expect(recoveryKeys(phone.storage)).toEqual([])
  })
})

describe('the older key stays after a confirmed deletion', () => {
  it('same page: the confirmed code is not imported again, so no second request; the record is untouched', async () => {
    phone.storage.set(LEGACY, JSON.stringify({ code: X }))
    answer = ok
    expect(await retryPendingForget()).toBe(true)
    expect(count(X)).toBe(1)
    expect(recoveryKeys(phone.storage)).toEqual([])
    expect(await retryPendingForget()).toBe(true)
    expect(count(X)).toBe(1)
    expect(phone.storage.get(LEGACY)).toBe(JSON.stringify({ code: X }))
  })

  it('after a reload the page has no memory of it: the code the record still mentions is asked again — redundant, not a loss, and it goes on while the record stays', async () => {
    phone.storage.set(LEGACY, JSON.stringify({ code: X }))
    answer = ok
    await retryPendingForget()
    for (const launch of [2, 3]) {
      resetForgetMirror() // a reload
      expect(await retryPendingForget()).toBe(true)
      expect(count(X), `launch ${launch}`).toBe(launch)
      expect(recoveryKeys(phone.storage)).toEqual([])
    }
    expect(phone.storage.get(LEGACY)).toBe(JSON.stringify({ code: X }))
  })
})

describe('a new attempt is not the same thing as an old mention', () => {
  it('a confirmed code, then a genuinely new failed attempt with the same identifier: it is kept', async () => {
    phone.storage.set(LEGACY, JSON.stringify({ code: X }))
    answer = ok
    await retryPendingForget() // confirmed; the record still mentions it
    expect(recoveryKeys(phone.storage)).toEqual([])

    holds(X) // she keeps the same map code again (a restore), and forgets while the server is down
    answer = down
    const result = await forgetMe()
    expect(result.map).toBe(false)
    expect(result.mapHeld).toEqual([X])
    expect(recoveryOf(phone.storage).maps).toEqual([X])
  })

  it('whereas a mention in the older record after that confirmation is only an import, and is not requested again on this page', async () => {
    answer = ok
    holds(X)
    await forgetMe() // asked and confirmed on this page
    expect(count(X)).toBe(1)
    answer = down
    importLegacy([JSON.stringify({ code: X })])
    await retryPendingForget()
    expect(count(X)).toBe(1)
    expect(recoveryKeys(phone.storage)).toEqual([])
  })
})

describe('two tabs over one storage', () => {
  it('one settles X while the other adds Y: Y is kept and X is gone', async () => {
    phone.storage.set(recoveryKey('maps', X), '1')
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    answer = async (url) => {
      await gate
      return ok(url)
    }
    const a = await anotherTab()
    const b = await anotherTab()
    const settling = b.retryPendingForget()
    await vi.waitFor(() => expect(count(X)).toBe(1))
    a.importLegacy([JSON.stringify({ code: Y })])
    release()
    expect(await settling).toBe(true)
    expect(recoveryOf(phone.storage).maps).toEqual([Y])
  })

  it('an add that lands after the settle brings the code back: one redundant request, and nothing lost', async () => {
    phone.storage.set(recoveryKey('maps', X), '1')
    phone.storage.set(recoveryKey('maps', Z), '1')
    answer = ok
    const a = await anotherTab()
    const b = await anotherTab()
    await b.retryPendingForget() // both confirmed and removed
    expect(recoveryKeys(phone.storage)).toEqual([])
    a.importLegacy([JSON.stringify({ code: X })]) // a's stale view of an older record
    expect(recoveryOf(phone.storage).maps).toEqual([X])
    await a.retryPendingForget()
    expect(count(X)).toBe(2)
    expect(recoveryKeys(phone.storage)).toEqual([])
  })

  it('an unconfirmed code is never removed by the other tab settling its own', async () => {
    phone.storage.set(recoveryKey('maps', X), '1')
    phone.storage.set(recoveryKey('installs', 'HJKMNPQR'), '1')
    answer = (url) => (url.includes('keep') ? ok(url) : down())
    const b = await anotherTab()
    expect(await b.retryPendingForget()).toBe(false)
    expect(recoveryOf(phone.storage)).toEqual({ maps: [], installs: ['HJKMNPQR'], pairs: [], intros: [] })
  })
})

describe('a scan is live against other tabs, and not seeing a key is not a reason to drop it', () => {
  it('a tab removes a key mid-scan and shifts the indices: two agreeing passes settle it; nothing is removed or asked for what was not seen', async () => {
    for (const c of [X, Y, Z]) phone.storage.set(recoveryKey('maps', c), '1')
    let calls = 0
    phone.hook = (op) => {
      if (op === 'key' && ++calls === 2) phone.storage.delete(recoveryKey('maps', X)) // another tab, after the first key was read
    }
    expect(pendingForget()).toEqual({ maps: [Y, Z] })
    expect(recoveryOf(phone.storage).maps).toEqual([Y, Z])
    expect(asked).toEqual([])
  })

  it('a scan that never settles is unknown: the page is told so, nothing is confirmed from it, and what was seen stays held', async () => {
    let on = false
    phone.hook = (op) => {
      if (op !== 'length') return
      on = !on
      if (on) phone.storage.set(recoveryKey('maps', X), '1')
      else phone.storage.delete(recoveryKey('maps', X))
    }
    const result = await forgetMe()
    expect(result.unchecked).toBe(true)
    expect(asked.length).toBeGreaterThan(0) // whatever it saw, it asked; it did not conclude "nothing"
  })

  it('a refused scan: no all-clear — retry says false, and Forget me says unchecked', async () => {
    phone.scanRefused = true
    expect(await retryPendingForget()).toBe(false)
    answer = ok
    holds(X)
    const result = await forgetMe()
    expect(result.unchecked).toBe(true)
    expect(result.map).toBe(true) // this attempt was answered…
  })

  it('a refused scan, the server down: the code this page wrote itself is still reported, and kept is true because a direct read finds its key', async () => {
    phone.scanRefused = true
    holds(X)
    const result = await forgetMe()
    expect(result.unchecked).toBe(true)
    expect(result.mapHeld).toEqual([X])
    expect(result.kept).toBe(true)
  })
})

describe('`kept` speaks for every unresolved code, not the latest write', () => {
  it('an earlier code stuck in page memory makes a later, successful write still say false; once storage takes it, true', async () => {
    phone.refuse(new RegExp(`\\.maps\\.${X}$`))
    holds(X)
    const first = await forgetMe()
    expect(first).toMatchObject({ map: false, mapHeld: [X], kept: false })

    holds(Y)
    const second = await forgetMe()
    expect(second.mapHeld).toEqual([X, Y].sort())
    expect(second.kept).toBe(false)
    expect(recoveryOf(phone.storage).maps).toEqual([Y])

    phone.refuse(null)
    holds(Z)
    const third = await forgetMe()
    expect(third.mapHeld).toEqual([X, Y, Z].sort())
    expect(third.kept).toBe(true)
    expect(recoveryOf(phone.storage).maps).toEqual([X, Y, Z].sort())
  })
})

describe('what the older key holds is never converted, rewritten or removed', () => {
  it.each(['{cut', '[]', '"ACDEFG"', 'null', '{"code":"acdefg","id":"ABC","pair":7,"intros":"QRTWXY34"}', '{"extra":{"x":1}}'])('%s', async (raw) => {
    phone.storage.set(LEGACY, raw)
    await retryPendingForget()
    holds(X)
    await forgetMe()
    onLegacyStorageEvent({ key: LEGACY, oldValue: raw, newValue: raw })
    expect(phone.storage.get(LEGACY)).toBe(raw)
    expect(recoveryOf(phone.storage).maps).toEqual([X])
    expect(recoveryOf(phone.storage).installs).toEqual([])
  })

  it('never calls setItem or removeItem on it, across a whole sequence', async () => {
    const touched: string[] = []
    phone.hook = (op, key) => {
      if ((op === 'set' || op === 'remove') && key === LEGACY) touched.push(op)
    }
    phone.storage.set(LEGACY, OLD)
    await retryPendingForget() // down
    holds(X)
    await forgetMe() // down
    answer = ok
    await retryPendingForget()
    onLegacyStorageEvent({ key: LEGACY, oldValue: OLD, newValue: null })
    await forgetMe()
    expect(touched).toEqual([])
    expect(phone.storage.get(LEGACY)).toBe(OLD)
  })

  it('what this build owns is a valid code in a key name and "1": nothing else of hers', async () => {
    phone.storage.set(LEGACY, OLD)
    holds(X)
    phone.storage.set('niyyah.intake.v1', JSON.stringify({ answers: { q: 'a private answer' }, contact: 'zq@example.test', couple: { code: 'QRTWXY', sentAt: 'x' } }))
    await forgetMe() // down
    const mine = recoveryKeys(phone.storage)
    expect(mine.length).toBeGreaterThan(3)
    for (const k of mine) {
      expect(k).toMatch(new RegExp(`^${RECOVERY.replace(/\./g, '\\.')}\\.(maps|installs|pairs|intros)\\.[ACDEFGHJKMNPQRTWXY34789]{6,8}$`))
      expect(phone.storage.get(k)).toBe('1')
    }
    const everything = [...phone.storage.entries()].filter(([k]) => k !== LEGACY).flat().join(' ')
    expect(everything).not.toContain('private answer')
    expect(everything).not.toContain('zq@example.test')
  })
})
