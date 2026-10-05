import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { answerCouple, createCouple } from '../../src/lib/couple'
import { forgetMe, retryPendingForget } from '../../src/lib/forget'
import { registerInterest } from '../../src/lib/introduce'
import { keepMap } from '../../src/lib/keep'
import { installId, reportRungs, resetReported } from '../../src/lib/progress'
import { sendReport } from '../../src/lib/safety'
import { sheet } from '../support/arbitrary'
import { Phone, onPhone } from '../support/device'
import { residue } from '../support/residue'
import { blobs, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * INVARIANT — delete means deleted (docs/TESTING.md, docs/PRIVACY.md).
 *
 * One person uses everything the product has — keeps her map, sends a man
 * the eleven and he answers, is counted on the ladder, reports a concern —
 * and then taps Forget me. Afterwards every store and her phone are searched
 * for anything of hers: her code, her name, her answer in her own words, her
 * install id.
 *
 * Four things are allowed to remain, and each is named, not tolerated:
 *  - the tombstone that closes her code — a reason and a date, so the code
 *    can never be kept again from another phone;
 *  - her report — a message to the founder, which forget me must never take
 *    (docs/SECURITY.md, coercion);
 *  - the joint tally — how pairs come out, counts with no pair in them;
 *  - the closure marker on her install code (`progress-closed`, `<install>/<day>`):
 *    a day and nothing about her, kept at least two days so a report still on
 *    its way cannot make her step count again (docs/DECISIONS.md, release
 *    candidate R2).
 * The couple sheet leaves only its reporting window: a date, and nothing
 * either of them answered.
 */

const NAME = 'Zqhodanforget'
const OWN_WORDS = 'Zq learning to listen before I answer'
const CONTACT = 'zq.hodan.forget@example.test'

let served: Served
let her: Phone

async function aWholeLife() {
  her = onPhone(new Phone('hers'))
  her.storage.set(
    'niyyah.intake.v1',
    JSON.stringify({ answers: { timeline: '1-2', 'working-on': OWN_WORDS }, identity: { firstName: NAME, gender: 'woman', adult: true, scene: 'twin-cities' }, completed: true, stage: 'preparing' }),
  )
  const code = (await keepMap())!
  const install = installId()!
  resetReported()
  await reportRungs(['arrived', 'mapped', 'kept'], 'twin-cities')
  // And her name on the introduction list, the one record that carries a way to reach her.
  expect((await registerInterest({ contact: CONTACT, firstName: NAME, gender: 'woman', scene: 'twin-cities' })).ok).toBe(true)

  const [hers, his] = fc.sample(sheet, 2)
  const pair = (await createCouple(hers, 'woman'))!.code
  const state = JSON.parse(her.storage.get('niyyah.intake.v1')!)
  her.storage.set('niyyah.intake.v1', JSON.stringify({ ...state, couple: { code: pair } }))
  expect(await sendReport(pair, 'woman', 'harassment', 'Zq what he said')).toBe('sent')

  onPhone(new Phone('his'))
  await answerCouple(pair, his)
  onPhone(her)
  return { code, install, pair }
}

/** What may remain, and only this. */
function allowed(code: string) {
  return (line: string) => line.startsWith(`maps:ended/${code} `) || line.startsWith('progress-closed:')
}

/** The step counts after her forget: no record, and one closure marker under her install code, holding a day and nobody. */
function onlyAClosure(install: string) {
  expect(blobs.keys('progress')).toEqual([])
  const keys = blobs.keys('progress-closed')
  expect(keys).toHaveLength(1)
  expect(keys[0]).toMatch(new RegExp(`^${install}/\\d{4}-\\d{2}-\\d{2}$`))
  expect(Object.keys(blobs.read('progress-closed', keys[0]) as object)).toEqual(['at'])
}

/** The introduction list after her forget: one withdrawal marker under her code, holding a day and nobody. */
function onlyAMarker() {
  const keys = blobs.keys('introductions')
  expect(keys).toHaveLength(1)
  expect(keys[0]).toMatch(/^withdrawn\/[ACDEFGHJKMNPQRTWXY34789]{8}\/\d{4}-\d{2}-\d{2}$/)
  expect(Object.keys(blobs.read('introductions', keys[0]) as object)).toEqual(['at'])
}

beforeEach(() => {
  blobs.reset()
  served = serve()
})
afterEach(() => vi.unstubAllGlobals())

describe('after Forget me', () => {
  it('nothing of hers is anywhere — only what is named above remains', async () => {
    const { code, install, pair } = await aWholeLife()
    // Before: she is everywhere, so the search below is not vacuous.
    expect(residue([code, NAME, OWN_WORDS, install, CONTACT], [her]).length).toBeGreaterThan(4)
    expect(blobs.keys('introductions')).toHaveLength(1)

    const done = await forgetMe()
    expect(done).toMatchObject({ map: true, progress: true, couple: true, intro: true })

    expect(residue([code, NAME, OWN_WORDS, install, CONTACT], [her]).filter((l) => !allowed(code)(l))).toEqual([])
    // The list keeps a marker under her code for two days — a day, and
    // nothing about her — so a request still on its way cannot land after
    // this (netlify/functions/introduce.ts).
    onlyAMarker()
    onlyAClosure(install)
    expect(her.keys()).toEqual([])
    // The sheet leaves a date, and nothing either of them said.
    expect(blobs.keys('couples')).toEqual([`gone/${pair}`])
    for (const k of Object.keys(blobs.read('couples', `gone/${pair}`) as object)) expect(['expiresAt', 'v']).toContain(k)
    // Her report stays with the founder — by design, and by a test that says so.
    expect(blobs.keys('reports')).toHaveLength(1)
  })

  it('even when the server was down as she asked — the next time the app opens, it is finished', async () => {
    const { code, install } = await aWholeLife()
    served.down(true)
    const first = await forgetMe()
    expect(first.map).toBe(false)
    // Her phone keeps the codes it still needs, and nothing else of hers.
    expect(her.keys().every((k) => k.startsWith('niyyah.forget.recovery.v1.'))).toBe(true)
    expect(her.keys().length).toBeGreaterThan(0)
    expect(residue([NAME, OWN_WORDS], [her]).filter((l) => l.startsWith('phone'))).toEqual([])

    served.down(false)
    expect(await retryPendingForget()).toBe(true)
    expect(residue([code, NAME, OWN_WORDS, install, CONTACT], [her]).filter((l) => !allowed(code)(l))).toEqual([])
    onlyAMarker()
    onlyAClosure(install)
    expect(her.keys()).toEqual([])
  })
})
