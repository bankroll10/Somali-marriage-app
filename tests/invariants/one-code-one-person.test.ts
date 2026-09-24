import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCouple } from '../../src/lib/couple'
import { forgetMe } from '../../src/lib/forget'
import { keepMap, rememberedCode, restoreDetail, rotateCode } from '../../src/lib/keep'
import { installId } from '../../src/lib/progress'
import { sendReport } from '../../src/lib/safety'
import { needle, sheet } from '../support/arbitrary'
import { Phone, onPhone } from '../support/device'
import { blobs, call, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * INVARIANT — one code opens one person's map, and nothing else does
 * (docs/TESTING.md).
 *
 * Possession of a code is the only authority this product has. So a code must
 * bring back exactly the map it was minted for — never another person's,
 * never a mixture — and none of the other things a member is handed (the
 * couple code she sends him, the install id on her phone, a report's id)
 * may open a map at all. A link to someone's
 * map, opened on a stranger's phone, fetches without adopting. A code she
 * changed or forgot brings nothing back.
 *
 * Run end to end: her phone's own code keeps and restores, through the real
 * handlers, over the in-memory store.
 */

/** A phone with a finished map under this first name. */
function phoneWith(name: string): Phone {
  const p = onPhone(new Phone(name))
  p.storage.set('niyyah.intake.v1', JSON.stringify({ answers: { timeline: '1-2' }, identity: { firstName: name, gender: 'woman', adult: true }, completed: true, stage: 'preparing' }))
  return p
}

beforeEach(() => {
  blobs.reset()
  serve()
})
afterEach(() => vi.unstubAllGlobals())

describe('a code brings back its own map', () => {
  it('for every person, exactly theirs — and nobody else’s name anywhere in the reply', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uniqueArray(needle, { minLength: 2, maxLength: 4 }), async (names) => {
        blobs.reset()
        serve()
        const codes: string[] = []
        for (const name of names) {
          phoneWith(name)
          const code = await keepMap()
          expect(code).toBeTruthy()
          codes.push(code!)
        }
        onPhone(new Phone('stranger'))
        for (const [i, code] of codes.entries()) {
          const got = await restoreDetail(code)
          expect(typeof got).toBe('object')
          const json = JSON.stringify(got)
          expect((got as { identity: { firstName: string } }).identity.firstName).toBe(names[i])
          for (const other of names) if (other !== names[i]) expect(json).not.toContain(other)
        }
      }),
      { numRuns: 15 },
    )
  })

  it('on a stranger’s phone, fetching is not adopting — nothing of hers is written there', async () => {
    phoneWith('ZqOwnerName')
    const code = (await keepMap())!
    const stranger = onPhone(new Phone('stranger'))
    await restoreDetail(code)
    expect(rememberedCode()).toBeNull()
    expect(stranger.keys()).toEqual([])
  })
})

describe('nothing else she is handed opens a map', () => {
  it('not the couple code, the install id or a report’s id', async () => {
    const her = phoneWith('ZqHodanOnly')
    await keepMap()
    const states = await fc.sample(sheet, 1)[0]
    const pair = (await createCouple(states, 'woman'))!.code
    const install = installId()!
    expect(await sendReport(pair, 'woman', 'harassment', 'Zq details')).toBe('sent')
    const reportId = blobs.keys('reports')[0].split('-').pop()!
    const once = 'CDEFGHJKMN'
    expect(her.keys()).toContain('niyyah.keep.code.v1')

    for (const [what, id] of [['couple code', pair], ['install id', install], ['report id', reportId], ['a once key', once]]) {
      const res = await call('keep', 'GET', `keep?code=${id}`)
      expect(res.status, what).not.toBe(200)
      expect(await res.text(), what).not.toContain('ZqHodanOnly')
    }
  })

  it('not a code she changed, and not a code she forgot', async () => {
    phoneWith('ZqChanged')
    const old = (await keepMap())!
    const next = (await rotateCode())!
    expect(next).not.toBe(old)
    expect(await restoreDetail(old)).toBe('moved')

    phoneWith('ZqForgotten')
    const gone = (await keepMap())!
    await forgetMe()
    expect(await restoreDetail(gone)).toBe('forgotten')
  })
})
