import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { day } from '../../netlify/shared/day'
import { clearEverything, forgetMe, pendingForget, retryPendingForget } from '../../src/lib/forget'
import { rememberedIntro, resetIntroMirror } from '../../src/lib/introduce'
import { answerDelete, appHtml, cutStream, gone } from '../support/answers'
import { Phone, onPhone, reload } from '../support/device'
import { LEGACY, recoveryKey, recoveryKeys, recoveryOf } from '../support/recovery'
import { residue } from '../support/residue'
import { holdPendingInPage, holdReceiptInPage, markers as markersOf, records as recordsOf, seedPending, seedReceipt, seedRecord } from '../support/intro'
import { blobs, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * INVARIANT — Forget me confirms an introduction deletion only by an answer the
 * protocol gives (docs/DECISIONS.md Parts 32 and 33).
 *
 * The real handler over the in-memory store; the DELETE's answer is the only
 * thing replaced, and the codes are synthetic. Two situations look the same
 * from the phone and are both held: the server ran the deletion and the answer
 * was cut (`completed`), and an invalid success-looking answer came back with
 * the handler never run and the record still there. After either, Forget me must
 * not report the name gone, the local personal data must be gone, and the codes
 * (and only the codes) must survive to be sent again.
 *
 * `held` reads the pending-forget record by its raw JSON, in the shape the
 * earlier build wrote (`intro`, `introPending`) and the one this build writes
 * (`intros`), so the same assertions run against both.
 */

const A = 'QRTWXY34'
const B = 'HJKMNPQR'
const C = 'ACDEFGHJ'
const NAME = 'Zqhodanforgetintro'
const CONTACT = 'zq.forget.intro@example.test'
const PENDING = LEGACY

let server: Served
let phone: Phone
beforeEach(() => {
  blobs.reset()
  server = serve()
  phone = onPhone(new Phone('hers'))
  resetIntroMirror()
  reload()
})
afterEach(() => {
  reload()
  vi.unstubAllGlobals()
})

const records = recordsOf
const markers = () => markersOf().sort()
const markerOf = (code: string) => `withdrawn/${code}/${day()}`
const deletes = () => server.requests.filter((r) => r.startsWith('DELETE ')).length
const posts = () => server.requests.filter((r) => r.startsWith('POST ')).length

/** The introduction codes this phone keeps a recovery key for. */
const held = (): string[] => recoveryOf(phone.storage).intros

/** A record on the server under `code`, as the route left it while it still took requests (tests/support/intro.ts). */
const onServer = (code: string) => seedRecord(code, { contact: CONTACT })
const receipt = (code: string) => seedReceipt(phone, code, day(), '2027-03-21')
const attempt = (code: string) => seedPending(phone, code)
/** The same two, for a browser that refuses to save them: they live in the page, and Forget me's own key is refused too. */
const refuseAll = () => phone.refuse(/^niyyah\.(intro|forget)/)
const receiptInPage = (code: string) => {
  holdReceiptInPage(phone, code)
  refuseAll()
}
const attemptInPage = (code: string) => {
  holdPendingInPage(phone, code)
  refuseAll()
}
/** Her kept things on the phone, to be cleared: the codes alone are allowed to stay. */
const herThings = () => phone.storage.set('niyyah.intake.v1', JSON.stringify({ answers: {}, identity: { firstName: NAME } }))
const personal = () => residue([NAME, CONTACT], [phone]).filter((l) => l.startsWith('phone'))

const SITUATIONS: [string, boolean, () => Response][] = [
  ['the deletion ran and its answer was cut', true, cutStream],
  ['an invalid success-looking answer, nothing deleted', false, appHtml],
]
const KINDS: [string, (code: string) => void][] = [
  ['a saved receipt', receipt],
  ['a pending-only attempt', attempt],
]

describe.each(SITUATIONS)('Forget me, %s', (_s, completed, reply) => {
  describe.each(KINDS)('for %s', (_k, put) => {
    it('says the name is not confirmed gone, clears her things, keeps only the code, and a later valid answer resolves it', async () => {
      herThings()
      put(A)
      onServer(A)
      const back = answerDelete(server, reply, completed)

      const done = await forgetMe()
      expect(done.intro).toBe(false)
      expect(done).toMatchObject({ introHeld: [A], kept: true })
      // Her things are gone; the one key left is the code's own, and holds nothing else.
      expect(phone.keys()).toEqual([recoveryKey('intros', A)])
      expect(held()).toEqual([A])
      expect(personal()).toEqual([])
      expect(rememberedIntro()).toBeNull()
      // One DELETE, no POST, and the server's state is what the situation made it.
      expect(deletes()).toBe(1)
      expect(posts()).toBe(0)
      expect(records()).toEqual(completed ? [] : [A])

      // A later valid answer resolves it, with one marker, and the key goes.
      back()
      expect(await retryPendingForget()).toBe(true)
      expect(held()).toEqual([])
      expect(phone.keys()).toEqual([])
      expect(records()).toEqual([])
      expect(markers()).toEqual([markerOf(A)])
    })
  })
})

describe('two codes are confirmed independently', () => {
  const bad = (code: string) => answerDelete(server, appHtml, false, code)
  const CASES: [string, string[], string[]][] = [
    ['the receipt’s answer is bad, the attempt’s is good', [A], [A]],
    ['the receipt’s answer is good, the attempt’s is bad', [B], [B]],
    ['both answers are bad', [A, B], [A, B].sort()],
    ['both answers are good', [], []],
  ]
  it.each(CASES)('%s', async (_n, badOnes, left) => {
    herThings()
    receipt(A)
    attempt(B)
    onServer(A)
    onServer(B)
    const backs = badOnes.map(bad)
    const done = await forgetMe()
    expect(done.intro).toBe(left.length === 0)
    expect(held()).toEqual(left)
    expect(done.introHeld ?? []).toEqual(left)
    expect(personal()).toEqual([])
    // What was confirmed is gone from the server; what was not is still there.
    expect(records().sort()).toEqual(badOnes.slice().sort())
    for (const b of backs.reverse()) b()
  })

  it.each([
    ['the receipt’s code first', A, B],
    ['the attempt’s code first', B, A],
  ])('and a retry resolves them one at a time: %s', async (_n, first, second) => {
    receipt(A)
    attempt(B)
    onServer(A)
    onServer(B)
    let back = [bad(A), bad(B)]
    await forgetMe()
    expect(held()).toEqual([A, B].sort())
    for (const b of back.reverse()) b()

    // Only `second` is answered badly this time: `first` resolves and leaves.
    back = [bad(second)]
    expect(await retryPendingForget()).toBe(false)
    expect(held()).toEqual([second])
    expect(held()).not.toContain(first)
    expect(records()).toEqual([second])
    for (const b of back) b()
    expect(await retryPendingForget()).toBe(true)
    expect(held()).toEqual([])
    expect(records()).toEqual([])
    expect(markers()).toEqual([markerOf(A), markerOf(B)].sort())
  })
})

describe('one code under both names', () => {
  it('is deleted once, answered once, and kept once', async () => {
    receipt(A)
    attempt(A)
    onServer(A)
    const back = answerDelete(server, appHtml, false)
    const done = await forgetMe()
    expect(deletes()).toBe(1)
    expect(done.intro).toBe(false)
    expect(held()).toEqual([A])
    expect(recoveryKeys(phone.storage)).toEqual([recoveryKey('intros', A)])
    back()
    expect(await retryPendingForget()).toBe(true)
    expect(held()).toEqual([])
    expect(records()).toEqual([])
  })

  it('a record from the earlier build naming it in both slots is imported once, sent once and resolved once', async () => {
    const raw = JSON.stringify({ intro: A, introPending: A })
    phone.storage.set(PENDING, raw)
    onServer(A)
    expect(await retryPendingForget()).toBe(true)
    expect(deletes()).toBe(1)
    expect(recoveryKeys(phone.storage)).toEqual([])
    // The older record is left exactly as it was; this build never writes or removes it.
    expect(phone.storage.get(PENDING)).toBe(raw)
    expect(records()).toEqual([])
  })
})

describe('a record the earlier build wrote is imported, never rewritten', () => {
  it('reads intro and introPending, keeps what did not land under recovery keys, and leaves the older record alone', async () => {
    const raw = JSON.stringify({ intro: A, introPending: B })
    phone.storage.set(PENDING, raw)
    onServer(A)
    onServer(B)
    const back = answerDelete(server, appHtml, false, B)
    expect(await retryPendingForget()).toBe(false)
    expect(held()).toEqual([B])
    expect(phone.storage.get(PENDING)).toBe(raw)
    expect(records()).toEqual([B])
    back()
    expect(await retryPendingForget()).toBe(true)
    expect(recoveryKeys(phone.storage)).toEqual([])
    expect(phone.storage.get(PENDING)).toBe(raw)
  })
})

describe('G4 — a code unresolved from one Forget me is not replaced by the next', () => {
  it('A unresolved, then B saved, then Forget me with B also unconfirmed: both are kept, and a reload resolves both', async () => {
    const a = A
    receipt(a)
    onServer(a)
    let back = answerDelete(server, gone, false)
    expect((await forgetMe()).intro).toBe(false)
    expect(held()).toEqual([a])
    back()

    // A second request she made earlier is on the phone under another code.
    const b = B
    receipt(b)
    onServer(b)
    expect(held()).toEqual([a])

    back = answerDelete(server, gone, false)
    const again = await forgetMe()
    expect(again.intro).toBe(false)
    expect(held()).toEqual([a, b].sort())
    expect(again.introHeld?.slice().sort()).toEqual([a, b].sort())
    expect(records().sort()).toEqual([a, b].sort())
    back()

    // The page is gone and the app opens again: the launch retry finishes both.
    reload()
    expect(await retryPendingForget()).toBe(true)
    expect(phone.keys()).toEqual([])
    expect(records()).toEqual([])
    expect(markers()).toEqual([markerOf(a), markerOf(b)].sort())
  })

  it('three generations — a receipt, a second receipt and an unanswered attempt — all stay', async () => {
    receipt(A)
    onServer(A)
    let back = answerDelete(server, gone, false)
    await forgetMe()
    back()
    receipt(B)
    onServer(B)
    back = answerDelete(server, gone, false)
    await forgetMe()
    back()
    // The third was sent and its answer lost: the attempt is pending, and the record is written.
    attempt(C)
    onServer(C)
    back = answerDelete(server, gone, false)
    expect((await forgetMe()).intro).toBe(false)
    expect(held()).toEqual([A, B, C].sort())
    back()
    expect(await retryPendingForget()).toBe(true)
    expect(records()).toEqual([])
    expect(phone.keys()).toEqual([])
  })
})

describe('a browser that cannot save the recovery codes (G1)', () => {
  it('keeps the unresolved code in the page, shows it, and lets the same page send it again — a reload loses it', async () => {
    const a = A
    receiptInPage(a)
    onServer(a)
    expect(phone.keys()).toEqual([])
    const back = answerDelete(server, appHtml, false)

    const done = await forgetMe()
    expect(done.intro).toBe(false)
    expect(done).toMatchObject({ introHeld: [a], kept: false })
    // Nothing was written; the page holds the code and nothing else of hers.
    expect(phone.keys()).toEqual([])
    expect(rememberedIntro()).toBeNull()
    expect(pendingForget()).toEqual({ intros: [a] })
    expect(JSON.stringify(pendingForget())).not.toContain(CONTACT)
    expect(records()).toEqual([a])

    // Tapping Forget me again in this page sends it.
    back()
    const next = await forgetMe()
    expect(next.intro).toBe(true)
    expect(next.introHeld).toBeUndefined()
    expect(records()).toEqual([])
    expect(markers()).toEqual([markerOf(a)])
    expect(pendingForget()).toBeNull()
  })

  it('a Forget me that is unconfirmed again keeps the code in the page, shows it again, and a third that is answered finishes it', async () => {
    const a = A
    receiptInPage(a)
    onServer(a)
    const back = answerDelete(server, appHtml, false)
    expect((await forgetMe()).introHeld).toEqual([a])
    // Again, still wrong: the code the first round left in the page is not dropped by the wipe that follows it.
    const again = await forgetMe()
    expect(again).toMatchObject({ intro: false, introHeld: [a], kept: false })
    expect(pendingForget()).toEqual({ intros: [a] })
    expect(deletes()).toBe(2)
    // One DELETE for the first tap, and one for the held code on the second: the code is sent once per round, never twice.
    back()
    expect((await forgetMe()).intro).toBe(true)
    expect(records()).toEqual([])
    expect(pendingForget()).toBeNull()
  })

  it('"Start completely fresh" wipes her things and leaves the codes still to be sent, as it does for the saved record', async () => {
    receiptInPage(A)
    onServer(A)
    const back = answerDelete(server, appHtml, false)
    await forgetMe()
    clearEverything()
    expect(pendingForget()).toEqual({ intros: [A] })
    back()
  })

  it('a reload loses the page’s copy: the code that was shown is the only record', async () => {
    receiptInPage(A)
    onServer(A)
    const back = answerDelete(server, appHtml, false)
    await forgetMe()
    back()
    expect(pendingForget()).toEqual({ intros: [A] })
    reload()
    expect(pendingForget()).toBeNull()
    expect(await retryPendingForget()).toBe(true)
    expect(records()).toEqual([A])
  })

  it('a pending-only attempt is carried the same way', async () => {
    // The answer was lost and the browser would not save the attempt, so only the page has it. The record was written.
    attemptInPage(A)
    onServer(A)
    expect(phone.keys()).toEqual([])
    const back = answerDelete(server, appHtml, false)
    const done = await forgetMe()
    expect(done).toMatchObject({ intro: false, introHeld: [A], kept: false })
    back()
    expect(await retryPendingForget()).toBe(true)
    expect(records()).toEqual([])
  })

  it('the one code kept in storage and the page’s copy do not double: a code is shown once', async () => {
    receipt(A)
    onServer(A)
    const back = answerDelete(server, appHtml, false)
    const done = await forgetMe()
    expect(done).toMatchObject({ introHeld: [A], kept: true })
    back()
  })
})
