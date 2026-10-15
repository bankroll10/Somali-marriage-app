// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import Looking from '../../src/components/Looking'
import type { IntroState } from '../../src/lib/introduce'
import { mount, type Mounted } from '../support/render'

/**
 * What the receipt says and does not say (docs/DECISIONS.md Part 36, closing
 * finding B; kept through release R3 and its integration).
 *
 * Finding B: a receipt must not say where a request came from, because the
 * phone does not hold it and the profile can change. R3 removed the pilot's
 * policy line altogether, so the receipt now says nothing about a place; these
 * hold that. And the receipt's account of time: the day is this phone's own
 * record, and past the 180th day the phone says so and keeps the code, because
 * time passing does not show that the server has removed anything.
 */

const NOW = Date.now()
const day = (offset: number) => new Date(NOW + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
const receipt = (over: Partial<IntroState> = {}): IntroState => ({ code: 'QRTWXY34', at: day(-3), removeOn: day(170), confirmed: true, kept: true, ...over })
/** What the old receipt said about a place, or about the request's standing. */
const PLACE_CLAIMS = [
  /Introductions are beginning in/,
  /Requests from other places are kept for later/,
  /Your request is kept for later/,
  /nobody in .* is being introduced/,
  /Minneapolis|Columbus|the UK/,
  /is still on the list|has been checked|we checked|still saved/i,
]

let screen: Mounted | undefined
afterEach(() => {
  screen?.unmount()
  screen = undefined
})

const show = async (intro: IntroState = receipt()) => {
  screen = await mount(<Looking intro={intro} onWithdrawn={vi.fn()} onTalking={vi.fn()} onMap={vi.fn()} onTrust={vi.fn()} onBack={vi.fn()} />)
  return screen
}
const flat = (m: Mounted) => m.text().replace(/\s+/g, ' ')
const claimsNoPlace = (t: string) => PLACE_CLAIMS.forEach((c) => expect(t).not.toMatch(c))

describe('the receipt says nothing about where a request is from, or how it stands', () => {
  it('for a server-dated receipt, one from before the server gave dates, and one past its days', async () => {
    for (const intro of [receipt(), receipt({ confirmed: false, removeOn: undefined, at: day(-5) }), receipt({ at: day(-200), removeOn: day(-20) })]) {
      const m = await show(intro)
      claimsNoPlace(flat(m))
      expect(flat(m)).toContain('New introduction requests are closed, and matching is not available.')
      m.unmount()
    }
  })

  it('a receipt keeps saying the day is this phone’s own record of it', async () => {
    const m = await show(receipt({ confirmed: false, removeOn: undefined, at: day(-5) }))
    expect(flat(m)).toContain(`put down on ${day(-5)}, by this phone’s own record`)
  })
})

describe('time passing does not make the phone let go of a code', () => {
  it('inside its 180 days: no notice, and the code is kept until the request is taken off', async () => {
    const t = flat(await show(receipt({ at: day(-30), removeOn: day(150) })))
    expect(t).not.toContain('are over')
    expect(t).toContain('keeps the code until you take the request off, or use Forget me')
  })

  it('past its 180 days: the notice says so, says the phone cannot see the list, and the button is still there', async () => {
    const m = await show(receipt({ at: day(-200), removeOn: day(-20) }))
    const t = flat(m)
    expect(t).toContain(`The 180 days from ${day(-200)} are over.`)
    expect(t).toContain('This phone cannot see whether the request has come off the list, so it has kept the code.')
    expect(m.has(/^Take my name off/)).toBe(true)
    // Not a claim that it is gone, or that it is still there.
    expect(t).not.toMatch(/has been removed|is gone|was removed|still there/i)
    expect(t).not.toContain('stops offering this code')
  })

  it('on exactly the 180th day it is over; the day before it is not', async () => {
    const at = day(-180)
    expect(flat(await show(receipt({ at })))).toContain('are over.')
    screen?.unmount()
    expect(flat(await show(receipt({ at: day(-179) })))).not.toContain('are over.')
  })
})

describe('a receipt this browser could not keep', () => {
  it('shows its code, says what a reload does, and still says nothing about a place', async () => {
    const m = await show(receipt({ kept: false }))
    const t = flat(m)
    expect(t).toContain('This browser is not saving anything')
    expect(t).toContain('QRTW XY34')
    expect(t).toContain('Keep it: it takes the request off later, here or on another phone.')
    claimsNoPlace(t)
  })
})
