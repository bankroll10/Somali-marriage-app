import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCouple } from '../../src/lib/couple'
import { clearEverything, forgetMe, pendingForget, retryPendingForget } from '../../src/lib/forget'
import { keepMap } from '../../src/lib/keep'
import { installId, reportRungs, resetReported } from '../../src/lib/progress'
import { answerDelete, appHtml, cutStream, gone, type Route } from '../support/answers'
import { sheet } from '../support/arbitrary'
import { Phone, onPhone, reload } from '../support/device'
import { recoveryKey, recoveryKeys, recoveryOf } from '../support/recovery'
import { residue } from '../support/residue'
import { blobs, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * INVARIANT — Forget me confirms the map, the step count and the eleven only by
 * an answer their handlers give (docs/DECISIONS.md Part 34).
 *
 * The real handlers over the in-memory store; the DELETE's answer is the only thing
 * replaced, and everything is synthetic. Two situations look the same from the phone and
 * are both held: the server ran the deletion and the answer was cut (`completed`), and an
 * invalid success-looking answer came back with the handler never run (the record is still
 * there). Afterwards Forget me must not report it gone, her things must be gone from the
 * phone, and the code — only the code — must survive to be sent again.
 *
 * The classifier's own answers (each status and body, for each endpoint) are held once, in
 * src/lib/forget.test.ts, and not repeated here. This file holds what Forget me *does*
 * with a result: the record, the recovery, the page's copy, and what overlapping
 * operations may and may not do to it.
 */

type Kind = 'map' | 'progress' | 'couple'
const KINDS: Kind[] = ['map', 'progress', 'couple']
const ROUTE: Record<Kind, Route> = { map: 'keep', progress: 'progress', couple: 'couple' }
const LIST: Record<Kind, 'maps' | 'installs' | 'pairs'> = { map: 'maps', progress: 'installs', couple: 'pairs' }
const FLAG: Record<Kind, 'map' | 'progress' | 'couple'> = { map: 'map', progress: 'progress', couple: 'couple' }
const NAME = 'Zqforgetconfirm'

let server: Served
let phone: Phone
beforeEach(() => {
  blobs.reset()
  server = serve()
  phone = onPhone(new Phone('hers'))
  reload()
})
afterEach(() => {
  reload()
  vi.unstubAllGlobals()
})

/** One identifier of this kind, made by the real app code against the real handlers, and held by the phone. */
async function make(kind: Kind): Promise<string> {
  phone.storage.set('niyyah.intake.v1', JSON.stringify({ answers: { timeline: '1-2' }, identity: { firstName: NAME, gender: 'woman', adult: true, scene: 'twin-cities' }, completed: true, stage: 'preparing' }))
  if (kind === 'map') return (await keepMap())!
  if (kind === 'progress') {
    const id = installId()!
    resetReported()
    await reportRungs(['arrived', 'mapped'], 'twin-cities')
    return id
  }
  const [hers] = fc.sample(sheet, 1)
  const pair = (await createCouple(hers, 'woman'))!.code
  phone.storage.set('niyyah.intake.v1', JSON.stringify({ ...JSON.parse(phone.storage.get('niyyah.intake.v1')!), couple: { code: pair } }))
  return pair
}
/** Whether the server still holds the record. */
function holds(kind: Kind, id: string): boolean {
  return blobs.read(kind === 'map' ? 'maps' : kind === 'progress' ? 'progress' : 'couples', id) !== null
}
/** What a handler that ran leaves behind, besides deleting the record. */
function marker(kind: Kind, id: string): unknown {
  return kind === 'map' ? blobs.read('maps', `ended/${id}`) : kind === 'couple' ? blobs.read('couples', `gone/${id}`) : null
}
const deletes = (kind: Kind) => server.requests.filter((r) => r.startsWith('DELETE ') && r.includes(`/${ROUTE[kind]}?`)).length
/** The recovery keys on the phone, as codes by kind: what this build keeps for an unfinished forget. */
const onDisk = () => recoveryOf(phone.storage)
const only = (kind: Kind, ...codes: string[]) => ({ maps: [], installs: [], pairs: [], intros: [], [LIST[kind]]: codes.sort() })
const heldIds = (kind: Kind) => (pendingForget()?.[LIST[kind]] ?? []).slice().sort()
const personal = () => residue([NAME], [phone]).filter((l) => l.startsWith('phone'))

const SITUATIONS: [string, boolean, () => Response][] = [
  ['the deletion ran and its answer was cut', true, cutStream],
  ['an invalid success-looking answer, nothing deleted', false, appHtml],
]

describe.each(KINDS)('Forget me, the %s', (kind) => {
  describe.each(SITUATIONS)('%s', (_s, completed, reply) => {
    it('says it is not confirmed, clears her things, keeps only the code, and a later real answer resolves it', async () => {
      const id = await make(kind)
      const back = answerDelete(server, reply, completed, undefined, ROUTE[kind])

      const done = await forgetMe()
      expect(done[FLAG[kind]]).toBe(false)
      // The other three are unaffected, and the page is not replaced (it needs all four).
      for (const k of KINDS.filter((k) => k !== kind)) expect(done[FLAG[k]]).toBe(true)
      expect(done.intro).toBe(true)
      expect(done.kept).toBe(true)
      // Only the map's code is ever shown; the step id and the couple code are not.
      expect(done.mapHeld).toEqual(kind === 'map' ? [id] : undefined)
      // Her things are gone; the one key left is this code's own, and holds nothing else.
      expect(phone.keys()).toEqual([recoveryKey(LIST[kind], id)])
      expect(onDisk()).toEqual(only(kind, id))
      expect(phone.storage.get(recoveryKey(LIST[kind], id))).toBe('1')
      expect(personal()).toEqual([])
      // One DELETE for it, and the server is what the situation made it.
      expect(deletes(kind)).toBe(1)
      expect(holds(kind, id)).toBe(!completed)

      back()
      expect(await retryPendingForget()).toBe(true)
      expect(phone.keys()).toEqual([])
      expect(holds(kind, id)).toBe(false)
      if (kind !== 'progress') expect(marker(kind, id)).not.toBeNull()
    })
  })
})

describe('mixed results: each kind is confirmed on its own', () => {
  it('the map goes, the step count is not confirmed, the eleven was already retired by the map: only the step id is kept', async () => {
    const mapCode = await make('map')
    const id = installId()!
    resetReported()
    await reportRungs(['arrived'], 'twin-cities')
    const [hers] = fc.sample(sheet, 1)
    const pair = (await createCouple(hers, 'woman'))!.code
    // The map's snapshot names the sheet, so the map delete may retire it before its own delete is answered.
    phone.storage.set('niyyah.intake.v1', JSON.stringify({ ...JSON.parse(phone.storage.get('niyyah.intake.v1')!), couple: { code: pair } }))
    const back = answerDelete(server, appHtml, false, undefined, 'progress')

    const done = await forgetMe()
    expect(done).toMatchObject({ map: true, progress: false, couple: true, intro: true, kept: true })
    expect(done.mapHeld).toBeUndefined()
    expect(onDisk()).toEqual(only('progress', id))
    expect(holds('map', mapCode)).toBe(false)
    expect(holds('couple', pair)).toBe(false)
    expect(holds('progress', id)).toBe(true)

    back()
    expect(await retryPendingForget()).toBe(true)
    expect(phone.keys()).toEqual([])
    expect(holds('progress', id)).toBe(false)
  })
})

describe.each(KINDS)('a second unresolved forget adds to the first, never replaces it — the %s', (kind) => {
  it('A unresolved, then B made, then both unresolved: both kept, a reload resolves both', async () => {
    const a = await make(kind)
    let back = answerDelete(server, gone, false, undefined, ROUTE[kind])
    await forgetMe()
    expect(heldIds(kind)).toEqual([a])
    expect(onDisk()).toEqual(only(kind, a))

    // She keeps something new — the phone was wiped, so it is a new code — and it is unresolved too.
    const b = await make(kind)
    expect(b).not.toBe(a)
    const again = await forgetMe()
    back()
    expect(again[FLAG[kind]]).toBe(false)
    expect(heldIds(kind)).toEqual([a, b].sort())
    // Two keys, one for each code: neither replaced the other.
    expect(onDisk()).toEqual(only(kind, a, b))
    expect(recoveryKeys(phone.storage)).toEqual([recoveryKey(LIST[kind], a), recoveryKey(LIST[kind], b)].sort())
    expect(again.mapHeld?.slice().sort()).toEqual(kind === 'map' ? [a, b].sort() : undefined)
    expect(holds(kind, a)).toBe(true)
    expect(holds(kind, b)).toBe(true)

    // The page is gone and the app opens again: the launch retry finishes both.
    reload()
    expect(await retryPendingForget()).toBe(true)
    expect(phone.keys()).toEqual([])
    expect(holds(kind, a)).toBe(false)
    expect(holds(kind, b)).toBe(false)
  })
})

/**
 * A request for `code` on `route` that waits at the gate, then is answered by `then` — the real handler (so the
 * deletion happens) or a stand-in (so it does not). Only the first request for that code is held: every later one,
 * and every other code, goes straight through.
 */
function gate(route: Route, code: string, then: 'real' | (() => Response)) {
  let open!: () => void
  const opened = new Promise<void>((r) => (open = r))
  const before = globalThis.fetch
  let first = true
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (first && init?.method === 'DELETE' && String(input).includes(`/${route}?`) && String(input).includes(`=${code}`)) {
      first = false
      await opened
      return then === 'real' ? before(input, init) : then()
    }
    return before(input, init)
  }) as typeof fetch
  return {
    open,
    restore: () => {
      globalThis.fetch = before
    },
  }
}
const tick = () => new Promise<void>((r) => setTimeout(r, 0))

describe.each(KINDS)('overlapping operations — the %s (separate from one forget after another)', (kind) => {
  it('automatic retry: a code another Forget me wrote while it was in flight survives, and only what the retry confirmed is removed', async () => {
    const a = await make(kind)
    const down = answerDelete(server, gone, false, undefined, ROUTE[kind])
    await forgetMe()
    down()
    expect(heldIds(kind)).toEqual([a])

    // The launch retry sends A and waits. Meanwhile a new code B is made and a Forget me on it is not confirmed.
    const held = gate(ROUTE[kind], a, 'real')
    const retry = retryPendingForget()
    await tick()
    const b = await make(kind)
    const fail = answerDelete(server, gone, false, b, ROUTE[kind])
    await forgetMe()
    fail()
    // Its own retry also asked about A, and got a real answer, so A is already gone; B is held.
    expect(heldIds(kind)).toEqual([b])

    held.open()
    expect(await retry).toBe(true)
    held.restore()
    // The older completion confirmed A only. B, newer and unresolved, is still held.
    expect(heldIds(kind)).toEqual([b])
    expect(holds(kind, a)).toBe(false)
    expect(holds(kind, b)).toBe(true)
  })

  it('foreground settlement: an older Forget me that ends unconfirmed does not put back a code a newer one confirmed', async () => {
    const id = await make(kind)
    // The first Forget me asks, and its answer is held up — and when it comes it is not one the protocol gives.
    const held = gate(ROUTE[kind], id, appHtml)
    const older = forgetMe()
    await tick()
    // A newer Forget me asks about the same code, and the real handler answers it.
    const newer = await forgetMe()
    expect(newer[FLAG[kind]]).toBe(true)
    expect(holds(kind, id)).toBe(false)
    expect(pendingForget()).toBeNull()

    held.open()
    const result = await older
    held.restore()
    // The older one could not confirm, but the code is already confirmed gone: nothing is put back.
    expect(pendingForget()).toBeNull()
    expect(phone.keys()).toEqual([])
    expect(result[FLAG[kind]]).toBe(true)
  })

  it('automatic retry: an older retry that ends unconfirmed does not put back a code a newer Forget me confirmed', async () => {
    const a = await make(kind)
    const down = answerDelete(server, gone, false, undefined, ROUTE[kind])
    await forgetMe()
    down()
    expect(heldIds(kind)).toEqual([a])

    const held = gate(ROUTE[kind], a, appHtml)
    const retry = retryPendingForget()
    await tick()
    // A newer Forget me sends A as part of its own retry, and the real handler answers it.
    expect((await forgetMe())[FLAG[kind]]).toBe(true)
    expect(pendingForget()).toBeNull()

    held.open()
    expect(await retry).toBe(false)
    held.restore()
    expect(pendingForget()).toBeNull()
    expect(phone.keys()).toEqual([])
  })

  it('a confirmed completion removes only what it confirmed: of two pending codes, the one answered goes and the other stays', async () => {
    const a = await make(kind)
    const down = answerDelete(server, gone, false, undefined, ROUTE[kind])
    await forgetMe()
    const b = await make(kind)
    await forgetMe()
    down()
    expect(heldIds(kind)).toEqual([a, b].sort())

    const bad = answerDelete(server, appHtml, false, b, ROUTE[kind])
    expect(await retryPendingForget()).toBe(false)
    bad()
    expect(heldIds(kind)).toEqual([b])
    expect(holds(kind, a)).toBe(false)
    expect(holds(kind, b)).toBe(true)
    expect(await retryPendingForget()).toBe(true)
    expect(phone.keys()).toEqual([])
  })
})

describe.each(KINDS)('a browser that cannot save the recovery codes — the %s', (kind) => {
  it('keeps the code in the page, lets the same page send it again, keeps it through another unconfirmed tap and "Start completely fresh" — and a reload loses it', async () => {
    phone.refuse(/^niyyah\.forget/)
    const id = await make(kind)
    const back = answerDelete(server, gone, false, undefined, ROUTE[kind])

    const done = await forgetMe()
    expect(done[FLAG[kind]]).toBe(false)
    expect(done.kept).toBe(false)
    // Nothing is written; the page holds the code and nothing else of hers.
    expect(phone.keys()).toEqual([])
    expect(pendingForget()).toEqual({ [LIST[kind]]: [id] })
    expect(JSON.stringify(pendingForget())).not.toContain(NAME)

    // Again, still unconfirmed: the wipe that follows it does not drop the page's copy.
    expect((await forgetMe())[FLAG[kind]]).toBe(false)
    clearEverything()
    expect(pendingForget()).toEqual({ [LIST[kind]]: [id] })

    // Tapping Forget me again in this page, answered for real, finishes it.
    back()
    const next = await forgetMe()
    expect(next[FLAG[kind]]).toBe(true)
    expect(pendingForget()).toBeNull()
    expect(holds(kind, id)).toBe(false)
  })

  it('a reload loses the page’s copy: nothing is sent, and the record is still there, as the message says', async () => {
    phone.refuse(/^niyyah\.forget/)
    const id = await make(kind)
    const back = answerDelete(server, gone, false, undefined, ROUTE[kind])
    await forgetMe()
    back()
    reload()
    expect(pendingForget()).toBeNull()
    const before = deletes(kind)
    expect(await retryPendingForget()).toBe(true)
    expect(deletes(kind)).toBe(before)
    expect(holds(kind, id)).toBe(true)
  })
})

describe('reload: the launch retry sends each kept code once and keeps what is still not confirmed', () => {
  it.each(KINDS)('the %s', async (kind) => {
    const id = await make(kind)
    const back = answerDelete(server, appHtml, false, undefined, ROUTE[kind])
    await forgetMe()
    reload()
    const before = deletes(kind)
    expect(await retryPendingForget()).toBe(false)
    expect(deletes(kind) - before).toBe(1)
    expect(onDisk()).toEqual(only(kind, id))
    back()
    expect(await retryPendingForget()).toBe(true)
    expect(phone.keys()).toEqual([])
  })
})
