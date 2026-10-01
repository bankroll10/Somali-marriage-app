// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { formatCode } from '../../src/lib/code'
import { pendingIntro } from '../../src/lib/introduce'
import { day } from '../../netlify/shared/day'
import { Phone, onPhone, reload } from '../support/device'
import { mount, type Mounted } from '../support/render'
import { blobs, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * The note about an earlier try (docs/DECISIONS.md Part 31, BATCH-07B): a request
 * this phone began sending and never got a confirmed answer to, shown on the
 * form when the person returns to it, with the one control that takes it off.
 *
 * The handlers are the real ones over the in-memory store; the phones are two
 * storages; "a reload" is an unmount, `reload()` (which clears the page's own
 * copies) and a fresh mount. These check DOM focus and calls to
 * `window.scrollTo`, which is all happy-dom has; the real offsets are measured in
 * a browser (docs/SESSION-HANDOFF.md). None of this is a screen-reader test.
 *
 * What is NOT repeated here, because tests/journeys/looking.test.tsx already
 * holds it: a lost answer retried under the same code and saved once; changed
 * details refused with 409 and never written over; a request still in flight
 * cannot land after Forget me; two tabs, one record.
 */

const CONTACT = 'zq.pending@example.test'
const PENDING_KEY = 'niyyah.intro.pending.v1'
const NOTE = /An earlier try may have reached us/
const CONFLICT = /An earlier try was saved with different details/

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

const records = () => blobs.keys('introductions').filter((k) => !k.startsWith('withdrawn/'))
const markers = () => blobs.keys('introductions').filter((k) => k.startsWith('withdrawn/'))
const count = (method: string) => server.requests.filter((r) => r.startsWith(`${method} /.netlify/functions/introduce`)).length
const active = () => document.activeElement as HTMLElement | null
const onHeading = (tag: 'H1' | 'H2', text: RegExp) => active()?.tagName === tag && text.test(active()?.textContent ?? '')
const control = (name: RegExp) => [...screen!.container.querySelectorAll<HTMLElement>('button')].find((b) => name.test(b.textContent ?? ''))!
const stored = () => phone.storage.get(PENDING_KEY)

/** Through the first door; `far` also picks how far she would go (the form's default is "city"). */
async function fill(m: Mounted, far = true) {
  await m.press(/^I am a woman/)
  await m.press(/^Minneapolis/)
  if (far) await m.press(/^Anywhere in the US/)
  await m.type('Your first name', 'Sagal')
  await m.type('Email or phone', CONTACT)
  await m.press(/I confirm I am 18/)
}
async function toForm() {
  screen = await mount(<App />)
  await screen.press(/I’m looking for someone serious/)
  return screen
}
/** A request sent, its answer lost after the write landed; then the page is gone. Returns the code it went under. */
async function leaveUncertain(): Promise<string> {
  const m = await toForm()
  await fill(m)
  server.lose(/introduce/)
  await m.press(/^Put my name down/)
  await m.until(() => m.text().includes('could not tell whether that reached us'), 'unsure')
  server.lose(false)
  const code = records()[0]
  expect(code).toBeTruthy()
  m.unmount()
  screen = undefined
  reload()
  return code
}
/** A return to Looking, as a person makes one: a fresh page, through the first door. */
async function returnToForm() {
  const m = await toForm()
  await m.until(() => /earlier try/.test(m.text()) || m.text().includes('Put my name down'), 'the form')
  await m.settle()
  return m
}

describe('an earlier try the phone is still waiting on, after a reload (storage works)', () => {
  it('is on the page when the form is: first heading, focused, no receipt, and the record holds only the code and the day', async () => {
    const code = await leaveUncertain()
    const m = await returnToForm()
    await m.until(() => onHeading('H2', NOTE), 'focus on the note')
    // It comes before the page's own heading, so App's heading focus reaches it with no code of its own.
    expect(m.container.querySelector('main')!.querySelector('h1, h2')).toBe(active())
    const t = m.text()
    expect(t).toContain(`This page has a record of a request started around ${day()}, but no confirmed receipt. We cannot tell whether it was saved.`)
    expect(t).toContain('This browser keeps its recovery code and when the attempt began. It does not save your contact or form answers with that record.')
    expect(t).toContain('To try again, enter the same details below.')
    // Not a receipt, a membership, a place in anything, or a promise; and no code shown when the phone holds it.
    expect(t).not.toMatch(/was saved on|your request was saved|queue|position|waitlist|in line|member|soon\b|you will (hear|be matched)/i)
    expect(t).not.toContain(formatCode(code))
    // The form is blank: nothing she typed was kept, and none of it is asked back.
    expect((m.container.querySelector('#looking-contact') as HTMLInputElement).value).toBe('')
    // The one pending record holds exactly its permitted fields: the code and the day.
    const record = JSON.parse(stored()!) as Record<string, unknown>
    expect(Object.keys(record).sort()).toEqual(['at', 'code'])
    expect(record).toEqual({ code, at: day() })
    expect(stored()).not.toContain(CONTACT)
  })

  it('takes it off directly: one withdrawal, no submission, the record gone, and the page arrives at the confirmation', async () => {
    const code = await leaveUncertain()
    const m = await returnToForm()
    const requests = server.requests.length
    const scrolls = scrollTo.mock.calls.length
    act(() => control(/^Take that try off/).focus())
    await m.press(/^Take that try off/)
    await m.until(() => m.text().includes('Your name is off the list'), 'taken off')
    // One DELETE under the code, and nothing else: no POST, no second request.
    expect(server.requests.slice(requests)).toEqual([`DELETE /.netlify/functions/introduce?code=${code}`])
    expect(records()).toEqual([])
    expect(markers()).toEqual([`withdrawn/${code}/${day()}`])
    expect(stored()).toBeUndefined()
    expect(pendingIntro()).toBeNull()
    // The note is gone, the confirmation is above the form heading, and BATCH-07A's arrival ran.
    expect(m.text()).not.toMatch(NOTE)
    await m.until(() => onHeading('H1', /Put your name down/), 'focus on the form heading')
    expect(scrollTo.mock.calls.slice(scrolls)).toEqual([[0, 0]])
  })

  it('says so, rather than failing, when nothing is under the code any more; and the code is cleared', async () => {
    // A pending code whose record never existed, or has since been swept.
    phone.storage.set(PENDING_KEY, JSON.stringify({ code: 'HJKMNPQR', at: day() }))
    const m = await returnToForm()
    expect(m.text()).toMatch(NOTE)
    await m.press(/^Take that try off/)
    await m.until(() => m.text().includes('Nothing was under that code any more'), 'nothing under it')
    expect(stored()).toBeUndefined()
    expect(m.text()).not.toMatch(NOTE)
  })

  it('retried with the same details after the reload, it is the same request: the receipt, one record, the note gone', async () => {
    const code = await leaveUncertain()
    const m = await returnToForm()
    await fill(m, true)
    await m.press(/^Put my name down/)
    await m.until(() => m.text().includes('Your request was saved on'), 'the receipt')
    expect(m.text()).toContain('the same request was not saved twice')
    expect(records()).toEqual([code])
    expect(stored()).toBeUndefined()
    expect(m.text()).not.toMatch(NOTE)
  })

  it('retried with a detail changed — even how far she would go — it is refused, never written over, and the note says what to do', async () => {
    const code = await leaveUncertain()
    const m = await returnToForm()
    await fill(m, false)
    const scrolls = scrollTo.mock.calls.length
    act(() => control(/^Put my name down/).focus())
    await m.press(/^Put my name down/)
    await m.until(() => CONFLICT.test(m.text()), 'the conflict')
    expect(records()).toEqual([code])
    expect(m.text()).toContain('To get its receipt, enter the original details again, including how far you would go.')
    expect(m.text()).toContain('You can also leave it unchanged. Its recovery code stays available here.')
    expect(m.text()).toContain('An earlier try went through with what you had typed then. Your changes were not saved over it.')
    // A newly entered conflict is brought into view, with the note's heading focused.
    await m.until(() => onHeading('H2', CONFLICT), 'focus on the conflict heading')
    expect(scrollTo.mock.calls.slice(scrolls)).toEqual([[0, 0]])
    // The same code is still held: leaving it unresolved clears nothing.
    expect(JSON.parse(stored()!)).toEqual({ code, at: day() })
  })

  it('a withdrawal that cannot be confirmed is its own message, keeps the code, the button and its focus, and retries without a submission', async () => {
    const code = await leaveUncertain()
    const m = await returnToForm()
    const button = control(/^Take that try off/)
    act(() => button.focus())
    server.down(/introduce/)
    const scrolls = scrollTo.mock.calls.length
    await m.press(/^Take that try off/)
    await m.until(() => m.text().includes('We could not confirm that it came off. Keep the recovery code and try again.'), 'the withdrawal failure')
    // About the withdrawal, not the submission, and no arrival.
    expect(m.text()).not.toContain('could not tell whether that reached us')
    expect(scrollTo.mock.calls.length).toBe(scrolls)
    // The same button, still mounted, still focused, now saying what it will do.
    expect(control(/^Try taking it off again/)).toBe(button)
    expect(active()).toBe(button)
    expect(button.getAttribute('aria-disabled')).toBe('false')
    expect(JSON.parse(stored()!)).toEqual({ code, at: day() })
    expect(records()).toEqual([code])
    // The server comes back: one tap, no submission, and it is off.
    server.down(false)
    const posts = count('POST')
    await m.press(/^Try taking it off again/)
    await m.until(() => m.text().includes('Your name is off the list'), 'taken off on the retry')
    expect(count('POST')).toBe(posts)
    expect(records()).toEqual([])
    expect(stored()).toBeUndefined()
  })

  it('while it is being taken off the button stays mounted, focused and says so; a second tap and a submission are both stopped by their handlers', async () => {
    const code = await leaveUncertain()
    const m = await returnToForm()
    await fill(m, true)
    const release = server.hold(/introduce/, 'DELETE')
    const button = control(/^Take that try off/)
    act(() => button.focus())
    const deletes = count('DELETE')
    const posts = count('POST')
    await m.press(/^Take that try off/)
    expect(count('DELETE')).toBe(deletes + 1)
    expect(button.textContent).toContain('Taking it off…')
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(active()).toBe(button)
    expect(m.container.querySelector('[role="status"]')?.textContent ?? '').not.toBe('')
    // aria-disabled alone stops nothing: a second tap on it sends nothing.
    await m.press(/^Taking it off/)
    expect(count('DELETE')).toBe(deletes + 1)
    // Nor does a submission get through, whether or not the button is disabled: send the form's own submit.
    const form = m.container.querySelector('form')!
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    await m.settle()
    expect(count('POST')).toBe(posts)
    release()
    await m.until(() => m.text().includes('Your name is off the list'), 'taken off')
    expect(records()).toEqual([])
    expect(markers()).toEqual([`withdrawn/${code}/${day()}`])
  })

  it('while a submission is in flight the earlier try cannot be taken off underneath it', async () => {
    const code = await leaveUncertain()
    const m = await returnToForm()
    await fill(m, true)
    const release = server.hold(/introduce/, 'POST')
    const button = control(/^Take that try off/)
    expect(button.getAttribute('aria-disabled')).toBe('false')
    await m.press(/^Put my name down/)
    expect(m.text()).toContain('Saving…')
    // Unavailable to a person as well as to its handler: aria-disabled, not `disabled` (it keeps focus),
    // and still saying what it would do. "Taking it off…" belongs to the withdrawal, not to a submission.
    expect(button.getAttribute('aria-disabled')).toBe('true')
    expect(button.hasAttribute('disabled')).toBe(false)
    expect(button.textContent).toContain('Take that try off')
    expect(button.textContent).not.toContain('Taking it off')
    expect(m.container.querySelector('[role="status"]')?.textContent ?? '').toBe('')
    const deletes = count('DELETE')
    await m.press(/^Take that try off/)
    expect(count('DELETE')).toBe(deletes)
    release()
    await m.until(() => m.text().includes('Your request was saved on'), 'the receipt')
    expect(records()).toEqual([code])
  })

  it('after an uncertain answer the button is available again, with the same words', async () => {
    await leaveUncertain()
    const m = await returnToForm()
    await fill(m, true)
    server.lose(/introduce/)
    await m.press(/^Put my name down/)
    await m.until(() => m.text().includes('could not tell whether that reached us'), 'unsure')
    const button = control(/^Take that try off/)
    expect(button.getAttribute('aria-disabled')).toBe('false')
    expect(button.textContent).toContain('Take that try off')
  })

  it('a code typed into "I have a code" that is the pending one takes the note away with it', async () => {
    const code = await leaveUncertain()
    const m = await returnToForm()
    expect(m.text()).toMatch(NOTE)
    await m.press(/^I have a code/)
    await m.type('Your code', code.toLowerCase())
    await m.press(/^Take it off$/)
    await m.until(() => m.text().includes('Your name is off the list'), 'taken off by its code')
    expect(m.text()).not.toMatch(NOTE)
    expect(stored()).toBeUndefined()
    expect(records()).toEqual([])
  })

  it('leaving and coming back inside the app keeps the note and the code; nothing clears it but an answer', async () => {
    const code = await leaveUncertain()
    const m = await returnToForm()
    await m.press(/^Back/)
    await m.until(() => m.text().includes('I’m already talking to someone.'), 'Welcome')
    await m.press(/I’m looking for someone serious/)
    await m.until(() => m.text().includes('An earlier try may have reached us'), 'the note again')
    expect(JSON.parse(stored()!)).toEqual({ code, at: day() })
  })
})

describe('a first request is not an earlier try', () => {
  it('while it is in flight there is no note; the note appears only on an uncertain result', async () => {
    const m = await toForm()
    await fill(m)
    const release = server.hold(/introduce/, 'POST')
    await m.press(/^Put my name down/)
    expect(m.text()).toContain('Saving…')
    expect(m.text()).not.toMatch(/earlier try/i)
    expect(stored()).toBeTruthy()
    release()
    await m.until(() => m.text().includes('Your request was saved on'), 'the receipt')
    expect(m.text()).not.toMatch(/earlier try/i)
  })
})

describe('a browser that is not saving anything', () => {
  beforeEach(() => phone.refuse(/^niyyah\.intro/))

  async function uncertainHere() {
    const m = await toForm()
    await fill(m)
    server.lose(/introduce/)
    // Where a person's focus is when she sends it: on the button (a programmatic click moves none).
    act(() => control(/^Put my name down/).focus())
    await m.press(/^Put my name down/)
    await m.until(() => m.text().includes('could not tell whether that reached us'), 'unsure')
    server.lose(false)
    return { m, code: records()[0] }
  }

  it('shows the code and what a reload does to it; Back and return keep it; a reload loses it, as stated', async () => {
    const { m, code } = await uncertainHere()
    expect(stored()).toBeUndefined()
    await m.until(() => onHeading('H2', NOTE), 'focus on the note')
    expect(m.text()).toContain('This browser could not save the recovery code.')
    expect(m.text()).toContain(`Your code is ${formatCode(code)}.`)
    expect(m.text()).toContain('Closing or reloading this page loses the code here. Going Back and returning within Niyyah keeps it.')
    expect(m.text()).not.toContain('This browser keeps its recovery code')
    // Going Back and returning keeps it, as the note says.
    await m.press(/^Back/)
    await m.until(() => m.text().includes('I’m already talking to someone.'), 'Welcome')
    await m.press(/I’m looking for someone serious/)
    await m.until(() => m.text().includes(formatCode(code)), 'the code again')
    expect(pendingIntro()).toMatchObject({ code, kept: false })
    // A reload does not: the page's copy is gone and the record is still on the server. The warning was true.
    m.unmount()
    screen = undefined
    reload()
    const again = await returnToForm()
    expect(again.text()).not.toMatch(/earlier try/i)
    expect(again.text()).not.toContain(formatCode(code))
    expect(records()).toEqual([code])
  })

  it('keeps the code through a conflict and a failed withdrawal, never says this phone holds it, and retries to a clean form', async () => {
    const { m, code } = await uncertainHere()
    await m.type('Email or phone', '+1 612 555 0199')
    const scrolls = scrollTo.mock.calls.length
    act(() => control(/^Put my name down/).focus())
    await m.press(/^Put my name down/)
    await m.until(() => CONFLICT.test(m.text()), 'the conflict')
    expect(m.text()).not.toMatch(/this phone holds/i)
    expect(m.text()).toContain(`Your code is ${formatCode(code)}.`)
    expect(m.text()).toContain('An earlier try went through with what you had typed then. Your changes were not saved over it.')
    expect(records()).toEqual([code])
    // Newly a conflict, so it arrives, once; the same refusal again does not.
    await m.until(() => onHeading('H2', CONFLICT), 'focus on the conflict heading')
    expect(scrollTo.mock.calls.length).toBe(scrolls + 1)
    await m.press(/^Put my name down/)
    await m.settle()
    expect(scrollTo.mock.calls.length).toBe(scrolls + 1)
    // The withdrawal cannot be confirmed: its own words, the conflict and the code still on the page, the button the same one.
    const button = control(/^Take the earlier name off/)
    act(() => button.focus())
    server.down(/introduce/)
    await m.press(/^Take the earlier name off/)
    await m.until(() => m.text().includes('We could not confirm that it came off.'), 'the withdrawal failure')
    expect(CONFLICT.test(m.text())).toBe(true)
    expect(m.text()).toContain(formatCode(code))
    expect(m.text()).not.toContain('could not tell whether that reached us')
    expect(control(/^Try taking it off again/)).toBe(button)
    expect(active()).toBe(button)
    expect(pendingIntro()).toMatchObject({ code, kept: false })
    // Leaving and coming back does not clear it either; it reads as the uncertain try it is known to be.
    await m.press(/^Back/)
    await m.until(() => m.text().includes('I’m already talking to someone.'), 'Welcome')
    await m.press(/I’m looking for someone serious/)
    await m.until(() => m.text().includes(formatCode(code)), 'the code after coming back')
    expect(pendingIntro()).toMatchObject({ code, kept: false })
    // Back up: one tap, no submission; the earlier name is off and the form goes under a fresh code.
    server.down(false)
    const posts = count('POST')
    await m.press(/^Take that try off/)
    await m.until(() => m.text().includes('Your name is off the list'), 'taken off')
    expect(count('POST')).toBe(posts)
    expect(records()).toEqual([])
    expect(pendingIntro()).toBeNull()
    expect(m.text()).not.toContain(formatCode(code))
  })
})
