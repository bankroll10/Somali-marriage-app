import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { answerCouple, createCouple } from '../../src/lib/couple'
import { forgetMe, retryPendingForget } from '../../src/lib/forget'
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
 * Three things are allowed to remain, and each is named, not tolerated:
 *  - the tombstone that closes her code — a reason and a date, so the code
 *    can never be kept again from another phone;
 *  - her report — a message to the founder, which forget me must never take
 *    (docs/SECURITY.md, coercion);
 *  - the joint tally — how pairs come out, counts with no pair in them.
 * The couple sheet leaves only its reporting window: a date, and nothing
 * either of them answered.
 */

const NAME = 'Zqhodanforget'
const OWN_WORDS = 'Zq learning to listen before I answer'

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
  return (line: string) => line.startsWith(`maps:ended/${code} `)
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
    expect(residue([code, NAME, OWN_WORDS, install], [her]).length).toBeGreaterThan(3)

    const done = await forgetMe()
    expect(done).toMatchObject({ map: true, progress: true, couple: true })

    expect(residue([code, NAME, OWN_WORDS, install], [her]).filter((l) => !allowed(code)(l))).toEqual([])
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
    expect(her.keys()).toEqual(['niyyah.forget.pending.v1'])
    expect(residue([NAME, OWN_WORDS], [her]).filter((l) => l.startsWith('phone'))).toEqual([])

    served.down(false)
    expect(await retryPendingForget()).toBe(true)
    expect(residue([code, NAME, OWN_WORDS, install], [her]).filter((l) => !allowed(code)(l))).toEqual([])
    expect(her.keys()).toEqual([])
  })
})
