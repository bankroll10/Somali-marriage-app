// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import Trust from '../../src/components/Trust'
import { mount, type Mounted } from '../support/render'

/**
 * What Trust says about an earlier introduction request, now that new requests
 * are closed (release R3): that they are closed and matching is not available;
 * what such a request holds; that its code is a separate one the server made
 * (not the phone, and not the map or step code); the 180-day rule stated
 * apart from the weekly cleanup that carries it out, with no day by which
 * cleanup is guaranteed; and the ways to take one off. It must not offer an
 * introduction, promise a process, or say a request still exists.
 */

let screen: Mounted | undefined
afterEach(() => {
  screen?.unmount()
  screen = undefined
})

const mountTrust = (onManageRequest = vi.fn()) =>
  mount(
    <Trust
      identity={{ gender: 'woman' }}
      guideOnDevice={false}
      onGuideOnDevice={() => {}}
      countMe
      onCountMe={() => {}}
      onForget={async () => ({ map: true, progress: true, couple: true, intro: true })}
      onManageRequest={onManageRequest}
      onBack={() => {}}
    />,
  )

describe('Trust: an earlier introduction request', () => {
  it('says new requests are closed, what an earlier one holds, and where its code came from', async () => {
    screen = await mountTrust()
    const text = screen.text()
    expect(text).toContain('An earlier introduction request')
    expect(text).toContain('New introduction requests are closed, and matching is not available.')
    expect(text).toContain('Nothing you do here — a map, a read, the eleven — puts you on the list.')
    expect(text).toContain('the email or phone number you typed')
    // The server mints it: production's own words used to say the phone did.
    expect(text).toContain('a separate code, made by our server when the request was saved and given to the phone you used')
    expect(text).toContain('It is not your map code and not the code your steps go under')
    // Only this disclosure: the step count's own code really is made on the phone, and Trust says so there.
    const disclosure = text.slice(text.indexOf('An earlier introduction request'), text.indexOf('The Guide'))
    expect(disclosure.length).toBeGreaterThan(500)
    expect(disclosure).not.toMatch(/made up|minted/i)
  })

  it('states the 180-day rule apart from the weekly cleanup, and guarantees no day for either', async () => {
    screen = await mountTrust()
    const text = screen.text()
    expect(text).toContain('A request is meant to be kept for no more than 180 days from the day it was put down.')
    expect(text).toContain('Removal is done by a cleanup that runs weekly, so it can come up to a week sooner, and later if a run fails.')
    expect(text).not.toMatch(/at the latest|until \d|then removed|by that day|within a week/i)
  })

  it('offers no introduction and makes no promise about a founder process, and keeps the way to take a request off', async () => {
    const manage = vi.fn()
    screen = await mountTrust(manage)
    const text = screen.text()
    expect(text).not.toMatch(/The founder reads the list, by hand|to make introductions|you put it down again|there is no reminder|Put my name down/)
    expect(text).toContain('The founder can read the list; no other route returns it, and it is not in the backup.')
    // What a conversation left behind is described as having happened, not as something that will.
    expect(text).toContain('If the founder has spoken with you.')
    expect(text).toContain('For any introduction already begun,')
    expect(text).toContain('from the introduction screen on the phone you used, with its code from any phone, with Forget me below, or by asking us')
    await screen.press(/^Manage an earlier request/)
    expect(manage).toHaveBeenCalledTimes(1)
  })
})
