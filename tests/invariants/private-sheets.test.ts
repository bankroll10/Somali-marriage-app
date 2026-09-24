import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOPICS } from '../../netlify/shared/vocab'
import { gender, sheet } from '../support/arbitrary'
import { FOUNDER, blobs, call, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * INVARIANT — neither side ever sees the other's sheet (docs/TESTING.md).
 *
 * The two-sided eleven works only because each person answers alone: she
 * sends it, he answers on his own phone, and both are shown only where they
 * meet — the joint — never what the other said. So no reply from any route
 * may carry a side: not his view, not her re-read, not the reply to his
 * answer, not the founder's tally, not the backup. The key that lets her
 * change her side before he answers is in exactly one reply — the one that
 * created the sheet. And a report about the pair is made without the route
 * ever reading the sheet at all.
 *
 * A side would show as `"<topic>":"<state>"` with a state from her own
 * vocabulary (agree, differ, not-talked, unknown). The joint's vocabulary
 * (both-agree, differ-somewhere, …) never collides with it, so the check is
 * exact.
 */

function sideIn(body: string, side: Record<string, string>): string[] {
  return [...TOPICS].filter((t) => body.includes(`"${t}":"${side[t]}"`)).map((t) => `${t}=${side[t]}`)
}

beforeEach(() => {
  blobs.reset()
  serve()
})
afterEach(() => vi.unstubAllGlobals())

describe('no reply carries a side', () => {
  it('from the moment she sends it to the moment it is counted', async () => {
    await fc.assert(
      fc.asyncProperty(sheet, sheet, gender, async (hers, his, g) => {
        blobs.reset()
        const replies: [string, string][] = []
        const created = await call('couple', 'POST', 'couple', { side: 'first', gender: g, states: hers })
        const { code, key } = await created.json()
        expect(typeof key).toBe('string')

        const say = async (what: string, res: Response | Promise<Response>) => replies.push([what, await (await res).text()])
        await say('his view before answering', call('couple', 'GET', `couple?code=${code}`))
        await say('the reply to his answer', call('couple', 'POST', 'couple', { side: 'second', code, states: his }))
        await say('either side reading it after', call('couple', 'GET', `couple?code=${code}`))
        await say('her trying to change hers after he answered', call('couple', 'POST', 'couple', { side: 'first', code, key, gender: g, states: his }))
        await say('the founder’s tally', call('couple', 'GET', 'couple', undefined, FOUNDER))
        await say('the backup', call('export', 'GET', 'export', undefined, FOUNDER))

        for (const [what, body] of replies) {
          // Hers never reaches him; his never reaches her. A topic where the two
          // happen to match is judged on the other's state, so check each.
          const leak = [...sideIn(body, hers).map((x) => `hers ${x}`), ...sideIn(body, his).map((x) => `his ${x}`)]
          expect(leak, what).toEqual([])
          expect(body, what).not.toContain(key)
          expect(body, what).not.toMatch(/"(first|second|owner)"/)
        }
      }),
      { numRuns: 40 },
    )
  })
})

describe('a report about the pair never reads the pair', () => {
  it('the safety route asks only whether the sheet exists', async () => {
    const hers = fc.sample(sheet, 1)[0]
    const { code } = await (await call('couple', 'POST', 'couple', { side: 'first', gender: 'woman', states: hers })).json()
    blobs.log.length = 0
    const res = await call('safety', 'POST', 'safety', { code, side: 'woman', reason: 'harassment', details: 'Zq' })
    expect(res.status).toBe(200)
    const reads = blobs.log.filter((c) => c.store === 'couples' && c.key === code && c.op !== 'getMetadata')
    expect(reads).toEqual([])
  })
})
