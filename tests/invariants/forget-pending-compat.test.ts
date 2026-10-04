import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { forgetMe, pendingForget, resetForgetMirror, retryPendingForget } from '../../src/lib/forget'
import * as base from '../support/old-builds/forget-261d055'
import * as d07 from '../support/old-builds/forget-69f8b92'
import { Phone, onPhone } from '../support/device'
import { LEGACY, recoveryKeys, recoveryOf, recoverySnapshot } from '../support/recovery'

/**
 * COMPATIBILITY — what the two builds before this one do with the unresolved
 * deletion identifiers this build has captured (docs/DECISIONS.md Part 35).
 *
 * **These are hybrid tests.** The fixtures in tests/support/old-builds/ are the
 * old `src/lib/forget.ts` verbatim, but they run over TODAY's helper modules
 * (`keep`, `progress`, `storage`, `net`, `code`, `introduce`). So they prove what
 * the old `forget.ts` itself reads, writes, removes and spreads on localStorage
 * and its own permissive confirmation of a map, a step count and the eleven.
 * They do not prove anything that goes through the old introduction module or the
 * old screens; only the real old bundles do, and those are run in a browser
 * (Part 35, "acceptance").
 *
 * What the protection is: an identifier with a recovery key
 * (`niyyah.forget.recovery.v1.<kind>.<CODE>`) is a key no older build reads,
 * rewrites, spreads or removes, so it stays until a build that knows it asks the
 * server and is answered. What it is not: protection for what an older build
 * loses before this build has captured it. That is tested below as a limitation.
 */

const BUILDS = [
  // Both confirm a map, a step count and the eleven on any 2xx (`res.ok || 404`).
  // 261d055 also confirms an introduction code that way; 69f8b92 checks that answer strictly.
  { name: '261d055', old: base, confirmsIntroOn200: true, listsIntros: false, erasesIntrosOnlyRecord: true },
  { name: '69f8b92', old: d07, confirmsIntroOn200: false, listsIntros: true, erasesIntrosOnlyRecord: false },
] as const

const MAPS = ['ACDEFG', 'CDEFGH']
const IDS = ['HJKMNPQR', 'JKMNPQRT']
const PAIRS = ['QRTWXY', 'RTWXY3']
const INTROS = ['QRTWXY34', 'XY347QRT']
const THEIRS = { map: 'DEFGHJ', id: 'KMNPQRTW', pair: 'WXY347', intro: 'CDEFGHJK' }

type Mode = 'down' | 'html' | 'ok'
let mode: Mode
let asked: string[]
let phone: Phone

const strict = (url: string) =>
  new Response(url.includes('/couple') ? '{"ok":true}' : url.includes('/introduce') ? '{"removed":true}' : '{"forgotten":true}', { status: 200 })

beforeEach(() => {
  phone = onPhone(new Phone('hers'))
  resetForgetMirror()
  d07.resetForgetMirror()
  mode = 'down'
  asked = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') asked.push(String(url))
      if (mode === 'down') throw new Error('offline')
      // A 200 that is the app's own page: what a path with no function behind it answers.
      if (mode === 'html') return new Response('<!doctype html><title>Niyyah</title>', { status: 200, headers: { 'content-type': 'text/html' } })
      return strict(String(url))
    }),
  )
})
afterEach(() => vi.unstubAllGlobals())

/** The phone holds one of each, as it would the moment before Forget me. */
function holds(map: string, id: string, pair: string, intro: string) {
  phone.storage.set('niyyah.keep.code.v1', map)
  phone.storage.set('niyyah.install.v1', id)
  phone.storage.set('niyyah.intake.v1', JSON.stringify({ answers: {}, couple: { code: pair, sentAt: 'x' } }))
  phone.storage.set('niyyah.intro.v1', JSON.stringify({ code: intro, at: '2026-09-27', removeOn: '2027-03-21' }))
}

/** This build captured two codes of every kind: two Forget mes in a row, the server down. */
async function twoOfEach() {
  for (const i of [0, 1]) {
    holds(MAPS[i], IDS[i], PAIRS[i], INTROS[i])
    await forgetMe()
  }
}

describe('the fixtures are the old builds, unedited', () => {
  it.each(['261d055', '69f8b92'])('%s: the text after the marker is the one the header hashes', (name) => {
    const text = readFileSync(new URL(`../support/old-builds/forget-${name}.ts`, import.meta.url), 'utf8')
    const marker = '// ---- begin verbatim ----\n'
    const at = text.indexOf(marker)
    expect(at).toBeGreaterThan(0)
    const recorded = /^\/\/ SHA256 ([0-9a-f]{64})$/m.exec(text.slice(0, at))?.[1]
    expect(createHash('sha256').update(text.slice(at + marker.length)).digest('hex')).toBe(recorded)
    expect(text.slice(0, at)).toContain('HYBRID TEST FIXTURE')
  })
})

describe.each(BUILDS)('$name (hybrid: its forget.ts over current helpers)', ({ old, confirmsIntroOn200, listsIntros, erasesIntrosOnlyRecord }) => {
  it('leaves every recovery key byte for byte through a failed forget, a falsely confirmed retry, a wipe and a rewrite', async () => {
    await twoOfEach()
    const before = recoverySnapshot(phone.storage)
    expect(Object.keys(before)).toHaveLength(8)
    expect(Object.values(before).every((v) => v === '1')).toBe(true)

    // An older tab, on the same phone: it holds codes of its own, asks and cannot reach the server…
    holds(THEIRS.map, THEIRS.id, THEIRS.pair, THEIRS.intro)
    mode = 'down'
    await old.forgetMe()
    expect(phone.storage.has(LEGACY)).toBe(true)
    expect(recoverySnapshot(phone.storage)).toEqual(before)

    // …then the server answers with the app's own page, which it takes for a confirmation, and rewrites its record.
    mode = 'html'
    await old.retryPendingForget()
    expect(phone.storage.has(LEGACY)).toBe(confirmsIntroOn200 ? false : true)
    expect(recoverySnapshot(phone.storage)).toEqual(before)

    // Its "Start completely fresh", and one more Forget me that is answered falsely.
    old.clearEverything()
    holds(THEIRS.map, THEIRS.id, THEIRS.pair, THEIRS.intro)
    await old.forgetMe()
    old.clearEverything()
    expect(recoverySnapshot(phone.storage)).toEqual(before)
  })

  it('and this build, next time it opens, asks all of them and settles each only when answered', async () => {
    await twoOfEach()
    holds(THEIRS.map, THEIRS.id, THEIRS.pair, THEIRS.intro)
    mode = 'down'
    await old.forgetMe()
    mode = 'html'
    await old.retryPendingForget()
    old.clearEverything()

    mode = 'ok'
    asked = []
    expect(await retryPendingForget()).toBe(true)
    for (const c of [...MAPS, ...IDS, ...PAIRS, ...INTROS]) expect(asked.some((u) => u.includes(c)), c).toBe(true)
    expect(recoveryKeys(phone.storage)).toEqual([])
  })

  it('imports what the older build itself left, next to what this build already holds', async () => {
    await twoOfEach()
    holds(THEIRS.map, THEIRS.id, THEIRS.pair, THEIRS.intro)
    mode = 'down'
    await old.forgetMe()
    expect(await retryPendingForget()).toBe(false)
    const got = recoveryOf(phone.storage)
    expect(got.maps).toEqual([...MAPS, THEIRS.map].sort())
    expect(got.installs).toEqual([...IDS, THEIRS.id].sort())
    expect(got.pairs).toEqual([...PAIRS, THEIRS.pair].sort())
    expect(got.intros).toEqual([...INTROS, THEIRS.intro].sort())
    // Never written, never removed: the older build's record is as it left it.
    expect(JSON.parse(phone.storage.get(LEGACY)!)).toMatchObject({ code: THEIRS.map, id: THEIRS.id, pair: THEIRS.pair })
  })

  describe('LIMITATION: what the older build loses before this build has captured it', () => {
    it('two failed forgets in a row: its single slots keep the second code, and the first was never seen by this build', async () => {
      holds(MAPS[0], IDS[0], PAIRS[0], INTROS[0])
      await old.forgetMe()
      holds(MAPS[1], IDS[1], PAIRS[1], INTROS[1])
      await old.forgetMe()
      // Only now does this build open.
      await retryPendingForget()
      const got = recoveryOf(phone.storage)
      expect(got.maps).toEqual([MAPS[1]])
      expect(got.installs).toEqual([IDS[1]])
      expect(got.pairs).toEqual([PAIRS[1]])
      // 07D keeps a list of introduction codes; the base keeps one.
      expect(got.intros).toEqual(listsIntros ? [...INTROS].sort() : [INTROS[1]])
    })

    it('a record holding only introduction codes: ' + (erasesIntrosOnlyRecord ? 'the base reads it as nothing and erases it, unless this build took it first' : 'the 07D build reads and keeps it'), async () => {
      phone.storage.set(LEGACY, JSON.stringify({ intros: [INTROS[0]] }))
      await old.forgetMe() // nothing on the phone to ask about
      expect(phone.storage.has(LEGACY)).toBe(!erasesIntrosOnlyRecord)

      // The same record, taken by this build first (a launch, or a storage event): the key it made survives the same call.
      phone.storage.set(LEGACY, JSON.stringify({ intros: [INTROS[0]] }))
      await retryPendingForget() // down: asked, unconfirmed, kept
      await old.forgetMe()
      expect(recoveryOf(phone.storage).intros).toEqual([INTROS[0]])
      expect(pendingForget()).toEqual({ intros: [INTROS[0]] })
    })
  })
})
