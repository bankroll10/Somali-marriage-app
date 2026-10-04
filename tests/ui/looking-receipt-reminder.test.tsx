// @vitest-environment happy-dom
import { act, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Looking from '../../src/components/Looking'
import type { Identity } from '../../src/types'
import type { IntroState } from '../../src/lib/introduce'
import { mount, type Mounted } from '../support/render'

/**
 * The receipt's reminder is the pilot's policy, not a reading of this request
 * (docs/DECISIONS.md Part 36, closing finding B).
 *
 * It used to be derived from the *current profile*: a request made from London
 * lost its notice after "Not sure? Start where you are", and a Minneapolis
 * request gained one after choosing London there. The phone does not hold where
 * a request came from, so the receipt must not say. These hold both directions:
 * the receipt is the same whatever the profile becomes, on a fresh load too, and
 * for the receipts from before the server gave dates.
 */

const REMINDER = 'Introductions are beginning in Minneapolis–St. Paul. Requests from other places are kept for later, with no opening date.'
/** What the old receipt said about the profile's place. */
const OLD_CLAIMS = [/Your request is kept for later/, /nobody in .* is being introduced/, /nobody there is being introduced/]

const NOW = Date.now()
const day = (offset: number) => new Date(NOW + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
const receipt = (over: Partial<IntroState> = {}): IntroState => ({ code: 'QRTWXY34', at: day(-3), removeOn: day(170), confirmed: true, kept: true, ...over })

const COLUMBUS: Identity = { scene: 'columbus', country: 'us', gender: 'woman', adult: true }
const TWIN: Identity = { scene: 'twin-cities', country: 'us', gender: 'woman', adult: true }
const UK: Identity = { scene: 'other', country: 'gb', gender: 'man', adult: true }

let screen: Mounted | undefined
let setIdentity: (i: Identity) => void = () => {}
afterEach(() => {
  screen?.unmount()
  screen = undefined
})

/** The Looking screen with a receipt, whose profile a test can change while it stays mounted. */
function Host({ start, intro }: { start: Identity; intro: IntroState }) {
  const [identity, set] = useState(start)
  setIdentity = set
  return <Looking identity={identity} intro={intro} onRegistered={vi.fn()} onWithdrawn={vi.fn()} onIdentity={vi.fn()} onTalking={vi.fn()} onMap={vi.fn()} onTrust={vi.fn()} onBack={vi.fn()} />
}
async function show(start: Identity, intro: IntroState = receipt()) {
  screen = await mount(<Host start={start} intro={intro} />)
  return screen
}
const changeTo = (i: Identity) => act(async () => setIdentity(i))
const flat = (m: Mounted) => m.text().replace(/\s+/g, ' ')
const noOldClaims = (t: string) => OLD_CLAIMS.forEach((c) => expect(t).not.toMatch(c))

describe('the receipt says the same whatever the profile becomes', () => {
  it('a request made outside the pilot, then a profile in the pilot city: nothing about the receipt changes', async () => {
    const m = await show(COLUMBUS)
    const before = flat(m)
    expect(before).toContain(REMINDER)
    noOldClaims(before)
    expect(before).not.toContain('Columbus')
    await changeTo(TWIN)
    expect(flat(m)).toBe(before)
    expect(flat(m).split(REMINDER)).toHaveLength(2) // once
  })

  it('a request made in the pilot city, then a profile outside it (a city, then another country): the reminder stays and no claim appears', async () => {
    const m = await show(TWIN)
    const before = flat(m)
    expect(before).toContain(REMINDER)
    for (const outside of [COLUMBUS, UK]) {
      await changeTo(outside)
      expect(flat(m)).toBe(before)
      noOldClaims(flat(m))
      expect(flat(m)).not.toMatch(/Columbus|the UK/)
    }
  })

  it('on a fresh load (a reload holds the receipt, not the old profile), the receipt is the same under either profile', async () => {
    const first = await show(COLUMBUS)
    const text = flat(first)
    first.unmount()
    for (const profile of [TWIN, UK, {} as Identity]) {
      const again = await show(profile)
      expect(flat(again)).toBe(text)
      again.unmount()
    }
  })
})

describe('the reminder is on every receipt, and the receipt keeps what it already said', () => {
  it('a receipt from before the server gave dates: the phone’s own day, labelled, and the reminder', async () => {
    const m = await show(UK, receipt({ confirmed: false, removeOn: undefined, at: day(-5) }))
    const t = flat(m)
    expect(t).toContain('This phone holds a code for a request from around')
    expect(t).toContain('That day is this phone’s own record')
    expect(t).toContain(REMINDER)
    noOldClaims(t)
  })

  it('a receipt past its scheduled day: the removal notice and the reminder, both', async () => {
    const m = await show(TWIN, receipt({ at: day(-200), removeOn: day(-20) }))
    const t = flat(m)
    expect(t).toContain('The day scheduled for its removal has passed.')
    expect(t).toContain(REMINDER)
  })

  it('a receipt this browser could not keep: its code is shown and the reminder is there too', async () => {
    const m = await show(COLUMBUS, receipt({ kept: false }))
    const t = flat(m)
    expect(t).toContain('This browser is not saving anything')
    expect(t).toContain('QRTW XY34')
    expect(t).toContain(REMINDER)
  })

  it('the reminder describes the pilot, and never the request or the app’s knowledge of it', async () => {
    const m = await show(UK)
    const t = flat(m)
    expect(t).toContain('Requests from other places are kept for later')
    expect(t).not.toMatch(/your request is kept for later|is still on the list|has been checked|we checked|still saved/i)
    // The form's own location-specific disclosure is not on the receipt, and not changed by it.
    expect(t).not.toMatch(/From .* you can leave your name for later/)
  })
})
