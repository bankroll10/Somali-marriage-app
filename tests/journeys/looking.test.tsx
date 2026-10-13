// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { seedDemo } from '../../src/lib/demo'
import { day } from '../../netlify/shared/day'
import { Phone, onPhone, reload } from '../support/device'
import { mount } from '../support/render'
import { residue } from '../support/residue'
import { blobs, call, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * JOURNEY — introductions, now that new requests are closed (release R3).
 *
 * Founder-led introduction intake is no longer the operating model and
 * matching is not available. A stranger on Welcome is offered the tools, not an
 * introduction, and can still reach "Manage an earlier request". Someone who
 * put their name down while requests were open can take it off from the phone
 * that holds its code, or from any phone with the code typed in; what each
 * answer is called is the server's own (200 `removed`, 404 `not_found`), and
 * anything else is "could not confirm", which says nothing about whether a
 * request exists. A name is still kept at most 180 days, after which the phone
 * forgets the code and the sweep removes the record.
 *
 * Records are seeded as the server left them: nothing writes one any more.
 */

const DAY = 24 * 60 * 60 * 1000
const CONTACT = 'zq.sagal.looking@example.test'
const INTRO_KEY = 'niyyah.intro.v1'
const CODE = 'QRTWXY34'
const OTHER = 'ACDEFGHJ'

let server: Served
beforeEach(() => {
  blobs.reset()
  server = serve()
})
afterEach(() => {
  reload()
  vi.unstubAllGlobals()
})

const record = (at = day()) => ({ contact: CONTACT, firstName: 'Sagal', gender: 'woman', scene: 'twin-cities', country: 'us', reach: 'city', at, v: 1 })
/** An earlier request as the server left it, and the code this phone was given. */
function aRequest(phone: Phone, code = CODE) {
  blobs.put('introductions', code, record())
  phone.storage.set(INTRO_KEY, JSON.stringify({ code, at: day() }))
}
const asked = () => server.requests.filter((r) => r.includes('/introduce'))

describe('a person with no earlier request', () => {
  it('is offered the tools, no introduction, and a clear closed state with the way to manage a request', async () => {
    onPhone(new Phone('hers'))
    const m = await mount(<App />)
    const welcome = m.text()
    expect(welcome).toContain('Think marriage through.')
    expect(welcome).toContain('New introduction requests are closed, and matching is not available.')
    expect(welcome).not.toMatch(/looking for someone serious|made by hand|founder/i)

    await m.press(/Manage an earlier introduction request/)
    const said = m.text()
    expect(said).toContain('New introduction requests are closed.')
    expect(said).toContain('Niyyah is not taking new names for introductions, and matching is not available. No date is promised.')
    expect(said).toContain('This phone is not holding a request code.')
    expect(said).toContain(`No code? Write to`)
    // Nothing that takes a name, or promises an introduction, a place or a date.
    expect(said).not.toMatch(/Put my name down|made by hand|speaks with you|Minneapolis|kept for later|\bfits?\b|opens|launch/i)
    expect(m.container.querySelectorAll('input')).toHaveLength(1)

    // And the tools are one tap away.
    await m.press(/Talking to someone now\? Start there/)
    expect(m.text()).toContain('Where are you with it?')
    // Nothing was sent to the introduction route by looking.
    expect(asked()).toEqual([])
    m.unmount()
  })

  it('has no introduction card on Home', async () => {
    onPhone(new Phone('hers'))
    seedDemo()
    const m = await mount(<App />)
    expect(m.text()).not.toMatch(/Looking for someone serious|earlier introduction request/)
    m.unmount()
  })
})

describe('an earlier request this phone holds the code for', () => {
  it('shows a receipt that states the closure and the 180-day rule, and promises no completion', async () => {
    const phone = onPhone(new Phone('hers'))
    aRequest(phone)
    const m = await mount(<App />)
    await m.press(/Manage an earlier introduction request/)
    const said = m.text()
    expect(said).toContain('Your earlier request.')
    expect(said).toContain(`put down on ${day()}, by this phone’s own record`)
    expect(said).toContain('New introduction requests are closed, and matching is not available. No date is promised.')
    expect(said).toContain('meant to be kept for no more than 180 days')
    expect(said).toContain('cleanup that runs weekly')
    expect(said).toContain('and later if a run fails')
    // No guaranteed day, no claim about what happened to it, no founder script.
    expect(said).not.toMatch(/at the latest|until \d{4}|speaks with you|never (read|matched)|has been (read|matched)|still down|is down|already deleted/i)
    expect(said).not.toMatch(/Minneapolis|made by hand|kept for later/i)
    m.unmount()
  })

  it('Home offers it, at any stage, and it opens the receipt', async () => {
    const phone = onPhone(new Phone('hers'))
    seedDemo()
    aRequest(phone)
    const m = await mount(<App />)
    expect(m.text()).toContain('An earlier introduction request')
    expect(m.text()).toContain('New introduction requests are closed and matching is not available. Open this to take the request off the list.')
    await m.press(/^An earlier introduction request/)
    expect(m.text()).toContain('Your earlier request.')
    m.unmount()
  })

  it('she can take it off from the receipt, on the server’s documented confirmation, and nothing of hers is held there', async () => {
    const phone = onPhone(new Phone('hers'))
    aRequest(phone)
    const m = await mount(<App />)
    await m.press(/Manage an earlier introduction request/)
    await m.press(/^Take my name off/)
    await m.until(() => m.text().includes('The request under this code is off the list.'), 'taken off')
    expect(asked()).toEqual([`DELETE /.netlify/functions/introduce?code=${CODE}`])
    expect(blobs.keys('introductions')).toEqual([])
    expect(phone.storage.has(INTRO_KEY)).toBe(false)
    expect(residue([CONTACT], [phone])).toEqual([])
    // The screen is the closed state now, with the confirmation above it.
    expect(m.text()).toContain('New introduction requests are closed.')
    expect(m.text()).toContain('This phone is not holding a request code.')
    m.unmount()
  })

  it('when it cannot be confirmed, she is told so, keeps her code, and can try again', async () => {
    const phone = onPhone(new Phone('hers'))
    aRequest(phone)
    const m = await mount(<App />)
    await m.press(/Manage an earlier introduction request/)
    server.down(/introduce/)
    await m.press(/^Take my name off/)
    await m.until(() => m.text().includes('We could not confirm whether that request was removed.'), 'told it is unconfirmed')
    const said = m.text()
    expect(said).toContain('This phone is keeping its code.')
    expect(said).toContain('You can try again, use Forget me on Trust, or write to')
    // It claims neither that the request exists nor that it is gone, and promises no outcome.
    expect(said).not.toMatch(/is off the list|still down|still held|is down|will be (removed|taken)|that is us, not you/i)
    expect(blobs.keys('introductions')).toEqual([CODE])
    expect(phone.storage.has(INTRO_KEY)).toBe(true)
    // The server back, the same tap confirms it.
    server.down(false)
    await m.press(/^Take my name off/)
    await m.until(() => m.text().includes('The request under this code is off the list.'), 'confirmed on the retry')
    expect(blobs.keys('introductions')).toEqual([])
    expect(phone.storage.has(INTRO_KEY)).toBe(false)
    m.unmount()
  })

  it('a code the server has nothing under is reported as nothing found, never as taken off, and the phone drops it', async () => {
    const phone = onPhone(new Phone('hers'))
    // The phone holds a code; the record is not there (the sweep, or the founder, took it).
    phone.storage.set(INTRO_KEY, JSON.stringify({ code: CODE, at: day() }))
    const m = await mount(<App />)
    await m.press(/Manage an earlier introduction request/)
    await m.press(/^Take my name off/)
    await m.until(() => m.text().includes('We found nothing under this phone’s code'), 'nothing found')
    expect(m.text()).toContain('so nothing was taken off. It may already have come off the list. This phone has dropped the code.')
    expect(m.text()).not.toContain('is off the list')
    expect(phone.storage.has(INTRO_KEY)).toBe(false)
    m.unmount()
  })
})

describe('an earlier request, from a phone that was not the one that made it', () => {
  it('is taken off with its code typed however it was written, and only that one', async () => {
    onPhone(new Phone('another'))
    blobs.put('introductions', CODE, record())
    blobs.put('introductions', OTHER, record())
    const m = await mount(<App />)
    await m.press(/Manage an earlier introduction request/)
    await m.type('Request code', 'qrtw-xy34')
    expect((m.container.querySelector('#request-code') as HTMLInputElement).value).toBe(CODE)
    // As two groups of four, the way a code is read aloud and pasted.
    await m.type('Request code', 'QRTW XY34')
    expect((m.container.querySelector('#request-code') as HTMLInputElement).value).toBe(CODE)
    expect(m.container.querySelector('#request-code')!.hasAttribute('maxlength')).toBe(false)
    await m.press(/^Take it off the list/)
    await m.until(() => m.text().includes('The request under that code is off the list.'), 'taken off')
    expect(blobs.keys('introductions')).toEqual([OTHER])
    expect(asked()).toEqual([`DELETE /.netlify/functions/introduce?code=${CODE}`])
    expect((m.container.querySelector('#request-code') as HTMLInputElement).value).toBe('')
    m.unmount()
  })

  it('a code with nothing under it is reported as nothing found, and nothing else is touched', async () => {
    onPhone(new Phone('another'))
    blobs.put('introductions', OTHER, record())
    const m = await mount(<App />)
    await m.press(/Manage an earlier introduction request/)
    await m.type('Request code', CODE)
    await m.press(/^Take it off the list/)
    await m.until(() => m.text().includes('We found no request under that code'), 'nothing found')
    expect(m.text()).toContain('so nothing was taken off. It may already have come off the list, or a character may be wrong.')
    expect(m.text()).not.toContain('is off the list')
    expect(blobs.keys('introductions')).toEqual([OTHER])
    m.unmount()
  })

  // A code with extra characters must never be cut down to a valid one: that
  // could name, and delete, a different request.
  it('an overlong code is refused as typed and sends no DELETE, whatever its first eight characters name', async () => {
    onPhone(new Phone('another'))
    blobs.put('introductions', CODE, record())
    const m = await mount(<App />)
    await m.press(/Manage an earlier introduction request/)
    const field = () => (m.container.querySelector('#request-code') as HTMLInputElement).value
    for (const [typed, kept] of [
      ['QRTWXY3499', 'QRTWXY3499'],
      ['QRTW XY34 99', 'QRTWXY3499'],
      ['qrtw-xy34-9', 'QRTWXY349'],
      ['QRTWXY34A', 'QRTWXY34A'],
      ['QRTWXY3', 'QRTWXY3'],
    ]) {
      await m.type('Request code', typed)
      expect(field(), typed).toBe(kept)
      await m.press(/^Take it off the list/)
      expect(m.text(), typed).toContain('A request code is 8 characters')
    }
    expect(asked()).toEqual([])
    expect(blobs.keys('introductions')).toEqual([CODE])
    // The formatted forms are still accepted, and delete exactly that code.
    await m.type('Request code', 'qrtw xy34')
    await m.press(/^Take it off the list/)
    await m.until(() => m.text().includes('The request under that code is off the list.'), 'taken off')
    expect(asked()).toEqual([`DELETE /.netlify/functions/introduce?code=${CODE}`])
    expect(blobs.keys('introductions')).toEqual([])
    m.unmount()
  })

  it('a code of the wrong length is caught here, before anything is sent', async () => {
    onPhone(new Phone('another'))
    const m = await mount(<App />)
    await m.press(/Manage an earlier introduction request/)
    await m.type('Request code', 'QRTWX')
    await m.press(/^Take it off the list/)
    expect(m.text()).toContain('A request code is 8 characters')
    expect(asked()).toEqual([])
    m.unmount()
  })

  it('when it cannot be confirmed, what she typed stays and she is given the ways on, with no promise', async () => {
    onPhone(new Phone('another'))
    blobs.put('introductions', CODE, record())
    const m = await mount(<App />)
    await m.press(/Manage an earlier introduction request/)
    await m.type('Request code', CODE)
    server.down(/introduce/)
    await m.press(/^Take it off the list/)
    await m.until(() => m.text().includes('We could not confirm whether that request was removed.'), 'unconfirmed')
    expect(m.text()).toContain('What you typed is still here. You can try again, or write to')
    expect(m.text()).not.toMatch(/is off the list|still down|will be (removed|taken)|that is us, not you/i)
    expect((m.container.querySelector('#request-code') as HTMLInputElement).value).toBe(CODE)
    expect(blobs.keys('introductions')).toEqual([CODE])
    server.down(false)
    await m.press(/^Take it off the list/)
    await m.until(() => m.text().includes('The request under that code is off the list.'), 'confirmed on the retry')
    expect(blobs.keys('introductions')).toEqual([])
    m.unmount()
  })

  it('typing the code this phone also holds clears the receipt too', async () => {
    const phone = onPhone(new Phone('hers'))
    aRequest(phone)
    const m = await mount(<App />)
    await m.press(/Manage an earlier introduction request/)
    await m.press(/^Use a different code/)
    await m.type('Request code', CODE)
    await m.press(/^Take it off the list/)
    await m.until(() => m.text().includes('This phone is not holding a request code.'), 'receipt cleared')
    expect(m.text()).toContain('The request under that code is off the list.')
    expect(blobs.keys('introductions')).toEqual([])
    expect(phone.storage.has(INTRO_KEY)).toBe(false)
    m.unmount()
  })
})

describe('how long a request is kept', () => {
  it('after 180 days her phone stops offering it, Home shows nothing, and the sweep removes it', async () => {
    const phone = onPhone(new Phone('hers'))
    const put = day(Date.now() - 181 * DAY)
    blobs.put('introductions', 'HJKMNPQR', { ...record(put) })
    phone.storage.set(INTRO_KEY, JSON.stringify({ code: 'HJKMNPQR', at: put }))
    seedDemo()
    const m = await mount(<App />)
    expect(m.text()).not.toMatch(/earlier introduction request|Looking for someone serious/)
    expect(phone.storage.has(INTRO_KEY)).toBe(false)
    const res = await call('sweep', 'POST', 'sweep')
    expect(((await res.json()) as { swept: { introductions: number } }).swept.introductions).toBe(1)
    expect(blobs.keys('introductions')).toEqual([])
    m.unmount()
  })
})

describe('already talking to someone', () => {
  const doors: [RegExp, RegExp][] = [
    [/^I can’t tell what they mean yet/, /Are they serious\?/],
    [/^We’re getting serious/, /Before you say yes/],
    [/^The families are coming in/, /Bringing the families in/],
  ]

  it.each(doors)('%s lands on its instrument', async (door, lands) => {
    onPhone(new Phone('theirs'))
    const m = await mount(<App />)
    await m.press(/I’m already talking to someone/)
    expect(m.text()).toContain('Where are you with it?')
    expect(m.text()).not.toMatch(/introduction/i)
    await m.press(door)
    expect(m.text()).toMatch(lands)
    m.unmount()
  })
})
