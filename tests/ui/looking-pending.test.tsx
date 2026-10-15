// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { formatCode } from '../../src/lib/code'
import { pendingIntro } from '../../src/lib/introduce'
import { day } from '../../netlify/shared/day'
import { Phone, onPhone, reload } from '../support/device'
import { PENDING_KEY, holdPendingInPage, markers, records, seedPending, seedRecord } from '../support/intro'
import { mount, type Mounted } from '../support/render'
import { blobs, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * The note about an earlier try (docs/DECISIONS.md Part 31, BATCH-07B): a request
 * this phone began sending and never got a confirmed answer to, with the one
 * control that takes it off. Kept through release R3 and the integration of main:
 * nothing can start such an attempt now that new requests are closed, but phones
 * that hold one still need to deal with it, so every state below is seeded
 * (tests/support/intro.ts) and the screen is the merged introduction screen,
 * reached through the link every visitor has.
 *
 * The handlers are the real ones over the in-memory store; the phones are two
 * storages; "a reload" is an unmount, `reload()` (which clears the page's own
 * copies) and a fresh mount. These check DOM focus and calls to `window.scrollTo`,
 * which is all happy-dom has. None of this is a screen-reader test.
 *
 * Not carried, because they are about making a request, which cannot happen: a
 * retry under the same code, a changed request refused with 409 and the conflict
 * wording, and a submission in flight beside the note.
 */

const CODE = 'QRTWXY34'
const NOTE = /An earlier try may have reached us/

let server: Served
let phone: Phone
let screen: Mounted | undefined
let scrollTo: ReturnType<typeof vi.fn>
beforeEach(() => {
  blobs.reset()
  server = serve()
  phone = onPhone(new Phone('pending'))
  scrollTo = vi.fn()
  vi.stubGlobal('scrollTo', scrollTo)
})
afterEach(() => {
  screen?.unmount()
  screen = undefined
  reload()
  vi.unstubAllGlobals()
  ;(document.activeElement as HTMLElement | null)?.blur()
})

const count = (method: string) => server.requests.filter((r) => r.startsWith(`${method} /.netlify/functions/introduce`)).length
const active = () => document.activeElement as HTMLElement | null
const onHeading = (tag: 'H1' | 'H2', text: RegExp) => active()?.tagName === tag && text.test(active()?.textContent ?? '')
const control = (name: RegExp) => [...screen!.container.querySelectorAll<HTMLElement>('button')].find((b) => name.test(b.textContent ?? ''))!
const stored = () => phone.storage.get(PENDING_KEY)

/** A return to the introduction screen, as a person makes one: a fresh page, through the link every visitor has. */
async function toLooking() {
  screen = await mount(<App />)
  await screen.press(/Manage an earlier introduction request/)
  await screen.until(() => NOTE.test(screen!.text()) || screen!.text().includes('New introduction requests are closed.'), 'the screen')
  await screen.settle()
  return screen
}
/** An attempt whose answer was lost after the write landed: the record on the server, its code on this phone. */
const leaveUncertain = (code = CODE) => {
  seedRecord(code)
  seedPending(phone, code)
  return code
}

describe('an earlier try the phone is still waiting on, after a reload (storage works)', () => {
  it('is on the page when the screen is: first heading, focused, no receipt, and the record holds only the code and the day', async () => {
    const code = leaveUncertain()
    const m = await toLooking()
    await m.until(() => onHeading('H2', NOTE), 'focus on the note')
    // It comes before the page's own heading, so the arrival focus reaches it.
    expect(m.container.querySelector('main')!.querySelector('h1, h2')).toBe(active())
    const t = m.text()
    expect(t).toContain(`This phone has a record of a request started around ${day()}, but no confirmed receipt. We cannot tell whether it was saved.`)
    expect(t).toContain('This browser keeps its recovery code and when the attempt began. It does not save your contact or form answers with that record.')
    // Said as closed: nothing to retry, and no way to put a name down from here.
    expect(t).toContain('New introduction requests are closed, and matching is not available.')
    expect(t).not.toContain('To try again, enter the same details below.')
    // Not a receipt, a membership, a place in anything, or a promise; and no code shown when the phone holds it.
    expect(t).not.toMatch(/was saved on|your request was saved|queue|position|waitlist|in line|member|soon\b|you will (hear|be matched)/i)
    expect(t).not.toContain(formatCode(code))
    // The one pending record holds exactly its permitted fields: the code and the day.
    const record = JSON.parse(stored()!) as Record<string, unknown>
    expect(Object.keys(record).sort()).toEqual(['at', 'code'])
    expect(record).toEqual({ code, at: day() })
  })

  it('takes it off directly: one withdrawal, nothing else sent, the record gone, and the page arrives at the confirmation', async () => {
    const code = leaveUncertain()
    const m = await toLooking()
    const requests = server.requests.length
    const scrolls = scrollTo.mock.calls.length
    act(() => control(/^Take that try off/).focus())
    await m.press(/^Take that try off/)
    await m.until(() => m.text().includes('The request under the code this phone was holding for that try is off the list.'), 'taken off')
    // One DELETE under the code, and nothing else: no POST, no second request.
    expect(server.requests.slice(requests)).toEqual([`DELETE /.netlify/functions/introduce?code=${code}`])
    expect(records()).toEqual([])
    expect(markers()).toEqual([`withdrawn/${code}/${day()}`])
    expect(stored()).toBeUndefined()
    expect(pendingIntro()).toBeNull()
    // The note is gone, the confirmation is above the heading, and the arrival ran: the top of the page, heading focused.
    expect(m.text()).not.toMatch(NOTE)
    await m.until(() => onHeading('H1', /New introduction requests are closed\./), 'focus on the screen heading')
    expect(scrollTo.mock.calls.slice(scrolls)).toEqual([[0, 0]])
  })

  it('says so, rather than failing, when nothing is under the code any more; and the code is cleared', async () => {
    // A pending code whose record never existed, or has since been swept.
    phone.storage.set(PENDING_KEY, JSON.stringify({ code: 'HJKMNPQR', at: day() }))
    const m = await toLooking()
    expect(m.text()).toMatch(NOTE)
    await m.press(/^Take that try off/)
    await m.until(() => m.text().includes('We found nothing under the code this phone was holding'), 'nothing under it')
    expect(stored()).toBeUndefined()
    expect(m.text()).not.toMatch(NOTE)
  })

  it('a withdrawal that cannot be confirmed is its own message, keeps the code, the button and its focus, and retries without a request of any other kind', async () => {
    const code = leaveUncertain()
    const m = await toLooking()
    const button = control(/^Take that try off/)
    act(() => button.focus())
    server.down(/introduce/)
    const scrolls = scrollTo.mock.calls.length
    await m.press(/^Take that try off/)
    await m.until(() => m.text().includes('We could not confirm whether that request was removed.'), 'the withdrawal failure')
    // No arrival: nothing was removed, so nothing moved.
    expect(scrollTo.mock.calls.length).toBe(scrolls)
    // The same button, still mounted, still focused, available again.
    expect(control(/^Take that try off/)).toBe(button)
    expect(active()).toBe(button)
    expect(button.getAttribute('aria-disabled')).toBe('false')
    expect(JSON.parse(stored()!)).toEqual({ code, at: day() })
    expect(records()).toEqual([code])
    // The server comes back: one tap, and it is off.
    server.down(false)
    const posts = count('POST')
    await m.press(/^Take that try off/)
    await m.until(() => m.text().includes('The request under the code this phone was holding for that try is off the list.'), 'taken off on the retry')
    expect(count('POST')).toBe(posts)
    expect(records()).toEqual([])
    expect(stored()).toBeUndefined()
  })

  it('while it is being taken off the button stays mounted, focused and says so; a second tap and a form submit are both stopped by their handlers', async () => {
    const code = leaveUncertain()
    const m = await toLooking()
    const release = server.hold(/introduce/, 'DELETE')
    const button = control(/^Take that try off/)
    act(() => button.focus())
    const deletes = count('DELETE')
    await m.press(/^Take that try off/)
    expect(count('DELETE')).toBe(deletes + 1)
    expect(button.textContent).toContain('Taking it off…')
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(active()).toBe(button)
    // aria-disabled alone stops nothing: a second tap on it sends nothing, and neither does the field's own submit.
    await m.press(/^Taking it off/)
    expect(count('DELETE')).toBe(deletes + 1)
    await m.type('Request code', 'ACDEFGHJ')
    await act(async () => {
      m.container.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await m.settle()
    expect(count('DELETE')).toBe(deletes + 1)
    release()
    await m.until(() => m.text().includes('The request under the code this phone was holding for that try is off the list.'), 'taken off')
    expect(records()).toEqual([])
    expect(markers()).toEqual([`withdrawn/${code}/${day()}`])
  })

  it('a code typed in that is the pending one takes the note away with it', async () => {
    const code = leaveUncertain()
    const m = await toLooking()
    expect(m.text()).toMatch(NOTE)
    await m.type('Request code', code.toLowerCase())
    await m.press(/^Take it off the list/)
    await m.until(() => m.text().includes('The request under that code is off the list.'), 'taken off by its code')
    expect(m.text()).not.toMatch(NOTE)
    expect(stored()).toBeUndefined()
    expect(records()).toEqual([])
  })

  it('leaving and coming back inside the app keeps the note and the code; nothing clears it but an answer', async () => {
    const code = leaveUncertain()
    const m = await toLooking()
    await m.press(/^Back/)
    await m.until(() => m.text().includes('I’m already talking to someone.'), 'Welcome')
    await m.press(/Manage an earlier introduction request/)
    await m.until(() => m.text().includes('An earlier try may have reached us'), 'the note again')
    expect(JSON.parse(stored()!)).toEqual({ code, at: day() })
  })

  it('Home offers it: the earlier-request card is there for a pending code with no receipt, and opens the note', async () => {
    const { seedDemo } = await import('../../src/lib/demo')
    seedDemo()
    leaveUncertain()
    screen = await mount(<App />)
    await screen.press(/An earlier introduction request/)
    await screen.until(() => NOTE.test(screen!.text()), 'the note from Home')
  })
})

describe('a browser that is not saving anything', () => {
  it('shows the code and what a reload does to it; Back and return keep it; a reload loses it, as stated', async () => {
    seedRecord(CODE)
    holdPendingInPage(phone, CODE)
    const m = await toLooking()
    expect(stored()).toBeUndefined()
    await m.until(() => onHeading('H2', NOTE), 'focus on the note')
    expect(m.text()).toContain('This browser could not save the recovery code.')
    expect(m.text()).toContain(`Your code is ${formatCode(CODE)}.`)
    expect(m.text()).toContain('Closing or reloading this page loses the code here. Going Back and returning within Niyyah keeps it.')
    expect(m.text()).not.toContain('This browser keeps its recovery code')
    // Going Back and returning keeps it, as the note says.
    await m.press(/^Back/)
    await m.until(() => m.text().includes('I’m already talking to someone.'), 'Welcome')
    await m.press(/Manage an earlier introduction request/)
    await m.until(() => m.text().includes(formatCode(CODE)), 'the code again')
    expect(pendingIntro()).toMatchObject({ code: CODE, kept: false })
    // A reload does not: the page's copy is gone and the record is still on the server. The warning was true.
    m.unmount()
    screen = undefined
    reload()
    const again = await toLooking()
    expect(again.text()).not.toMatch(/earlier try/i)
    expect(again.text()).not.toContain(formatCode(CODE))
    expect(records()).toEqual([CODE])
  })

  it('keeps the code through a failed withdrawal, never says this phone holds it, and a later tap takes it off', async () => {
    seedRecord(CODE)
    holdPendingInPage(phone, CODE)
    const m = await toLooking()
    expect(m.text()).not.toMatch(/this phone holds/i)
    expect(m.text()).toContain(`Your code is ${formatCode(CODE)}.`)
    // The withdrawal cannot be confirmed: its own words, the code still on the page, the button the same one.
    const button = control(/^Take that try off/)
    act(() => button.focus())
    server.down(/introduce/)
    await m.press(/^Take that try off/)
    await m.until(() => m.text().includes('We could not confirm whether that request was removed.'), 'the withdrawal failure')
    expect(m.text()).toContain(formatCode(CODE))
    expect(control(/^Take that try off/)).toBe(button)
    expect(active()).toBe(button)
    expect(pendingIntro()).toMatchObject({ code: CODE, kept: false })
    // Leaving and coming back does not clear it either.
    await m.press(/^Back/)
    await m.until(() => m.text().includes('I’m already talking to someone.'), 'Welcome')
    await m.press(/Manage an earlier introduction request/)
    await m.until(() => m.text().includes(formatCode(CODE)), 'the code after coming back')
    expect(pendingIntro()).toMatchObject({ code: CODE, kept: false })
    // Back up: one tap, nothing else sent; it is off, and the page no longer shows the code.
    server.down(false)
    const posts = count('POST')
    await m.press(/^Take that try off/)
    await m.until(() => m.text().includes('The request under the code this phone was holding for that try is off the list.'), 'taken off')
    expect(count('POST')).toBe(posts)
    expect(records()).toEqual([])
    expect(pendingIntro()).toBeNull()
    expect(m.text()).not.toContain(formatCode(CODE))
  })
})
