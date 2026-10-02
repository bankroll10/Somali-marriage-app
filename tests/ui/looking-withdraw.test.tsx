// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { formatCode } from '../../src/lib/code'
import { day } from '../../netlify/shared/day'
import { answerDelete, appHtml, cutStream, text } from '../support/answers'
import { Phone, onPhone, reload } from '../support/device'
import { mount, type Mounted } from '../support/render'
import { blobs, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * A withdrawal the phone cannot confirm (docs/DECISIONS.md Part 32, finding F), on
 * the three screens that send one: the receipt's "Take my name off", the earlier
 * try's "Take that try off", and "I have a code".
 *
 * Two situations look the same from the phone and are both held: the server did
 * delete the record and the confirmation arrived unreadable (`completed`), and an
 * invalid answer that looks like a success came back with nothing deleted. After
 * either, no screen may say the name is off, that nothing was under the code, or
 * that nothing has changed; the code stays where it was; and one later valid answer
 * resolves it. The handlers are the real ones over the in-memory store; the answer
 * to the DELETE is the only thing replaced. This is local-handler evidence, not the
 * deployed functions, and checks text and storage, not what a screen reader says.
 */

const CONTACT = 'zq.withdraw@example.test'
const RECEIPT_KEY = 'niyyah.intro.v1'
const PENDING_KEY = 'niyyah.intro.pending.v1'
const UNCONFIRMED = 'We could not confirm that your name came off the list. It may have, or it may not. Try again in a moment: asking again with the same code is safe.'
/** What no screen may say after an unconfirmed answer. */
const FALSE_CLAIMS = ['Your name is off the list', 'Nothing was under that code', 'Nothing has changed', 'We could not reach the list', 'that is us, not you']

let server: Served
let phone: Phone
let screen: Mounted | undefined
let scrollTo: ReturnType<typeof vi.fn>
beforeEach(() => {
  blobs.reset()
  server = serve()
  phone = onPhone(new Phone('withdraw'))
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
const deletes = () => server.requests.filter((r) => r.startsWith('DELETE ')).length
const posts = () => server.requests.filter((r) => r.startsWith('POST ')).length
const field = (id: string) => screen!.container.querySelector<HTMLInputElement>(id)!
const noFalseClaims = (m: Mounted) => {
  for (const claim of FALSE_CLAIMS) expect(m.text(), claim).not.toContain(claim)
}

async function toForm() {
  screen = await mount(<App />)
  await screen.press(/I’m looking for someone serious/)
  return screen
}
async function fill(m: Mounted) {
  await m.press(/^I am a woman/)
  await m.press(/^Minneapolis/)
  await m.type('Email or phone', CONTACT)
  await m.press(/I confirm I am 18/)
}
/** A saved request, and its receipt on screen. Returns its code. */
async function receipt(): Promise<string> {
  const m = await toForm()
  await fill(m)
  await m.press(/^Put my name down/)
  await m.until(() => m.text().includes('Your request was saved on'), 'the receipt')
  return records()[0]
}
/** A request whose answer was lost after it was written; then the page is gone. Returns its code. */
async function leaveUncertain(): Promise<string> {
  const m = await toForm()
  await fill(m)
  server.lose(/introduce/)
  await m.press(/^Put my name down/)
  await m.until(() => m.text().includes('could not tell whether that reached us'), 'unsure')
  server.lose(false)
  const code = records()[0]
  m.unmount()
  screen = undefined
  reload()
  return code
}
async function returnToForm() {
  const m = await toForm()
  await m.until(() => /earlier try/.test(m.text()), 'the note')
  await m.settle()
  return m
}

const SITUATIONS: [string, boolean][] = [
  ['the deletion happened and its confirmation was unreadable', true],
  ['an invalid success-looking answer, nothing deleted', false],
]
/** The unreadable answer in each situation: a cut body where the delete ran, the app's HTML where it did not. */
const reply = (completed: boolean) => (completed ? cutStream : appHtml)

describe.each(SITUATIONS)('the receipt’s "Take my name off", %s', (_name, completed) => {
  it('keeps the receipt and the code, says it could not confirm, claims nothing, and a later valid answer resolves it', async () => {
    const code = await receipt()
    expect(JSON.parse(phone.storage.get(RECEIPT_KEY)!).code).toBe(code)
    const scrolls = scrollTo.mock.calls.length
    const back = answerDelete(server, reply(completed), completed)
    await screen!.press(/^Take my name off/)
    await screen!.until(() => screen!.text().includes(UNCONFIRMED), 'the unconfirmed message')
    const m = screen!
    noFalseClaims(m)
    // Still the receipt, still the button, the code still on the phone, nothing scrolled.
    expect(m.text()).toContain('Your request was saved on')
    expect(m.text()).toContain('Your code is still held here. Tap Take my name off to ask again')
    expect(m.has(/^Take my name off/)).toBe(true)
    expect(JSON.parse(phone.storage.get(RECEIPT_KEY)!).code).toBe(code)
    expect(scrollTo.mock.calls.length).toBe(scrolls)
    expect(records()).toEqual(completed ? [] : [code])

    // A direct retry, the same code, no new submission; the server's own answer is believed.
    back()
    const before = { deletes: deletes(), posts: posts() }
    await m.press(/^Take my name off/)
    await m.until(() => m.text().includes(completed ? 'Nothing was under that code any more' : 'Your name is off the list'), 'the confirmed answer')
    expect(deletes()).toBe(before.deletes + 1)
    expect(posts()).toBe(before.posts)
    expect(server.requests.filter((r) => r.startsWith('DELETE ')).every((r) => r.endsWith(`?code=${code}`))).toBe(true)
    expect(phone.storage.get(RECEIPT_KEY)).toBeUndefined()
    expect(records()).toEqual([])
    expect(markers()).toEqual([`withdrawn/${code}/${day()}`])
  })
})

describe.each(SITUATIONS)('the earlier try’s "Take that try off", %s', (_name, completed) => {
  it('keeps the note, the button and the pending code, claims nothing, and a later valid answer resolves it', async () => {
    const code = await leaveUncertain()
    const m = await returnToForm()
    const back = answerDelete(server, reply(completed), completed)
    await m.press(/^Take that try off/)
    await m.until(() => m.text().includes('We could not confirm that it came off. Keep the recovery code and try again.'), 'the unconfirmed message')
    noFalseClaims(m)
    expect(m.text()).toMatch(/An earlier try may have reached us/)
    expect(m.has(/^Try taking it off again/)).toBe(true)
    expect(JSON.parse(phone.storage.get(PENDING_KEY)!)).toEqual({ code, at: day() })
    expect(records()).toEqual(completed ? [] : [code])

    back()
    const before = posts()
    await m.press(/^Try taking it off again/)
    await m.until(() => m.text().includes(completed ? 'Nothing was under that code any more' : 'Your name is off the list'), 'the confirmed answer')
    expect(posts()).toBe(before)
    expect(m.text()).not.toMatch(/An earlier try may have reached us/)
    expect(phone.storage.get(PENDING_KEY)).toBeUndefined()
    expect(records()).toEqual([])
  })
})

describe.each(SITUATIONS)('"I have a code", %s', (_name, completed) => {
  it('keeps what was typed and the code the phone holds, claims nothing, and a later valid answer resolves it', async () => {
    const code = await leaveUncertain()
    const m = await returnToForm()
    await m.press(/^I have a code/)
    await m.type('Your code', code.toLowerCase())
    const back = answerDelete(server, reply(completed), completed)
    await m.press(/^Take it off$/)
    await m.until(() => m.text().includes(UNCONFIRMED), 'the unconfirmed message')
    noFalseClaims(m)
    // The typed code is still in the field, ready for the retry, and the note it belongs to is still on the page.
    expect(field('#looking-code').value).toBe(formatCode(code))
    expect(m.text()).toMatch(/An earlier try may have reached us/)
    expect(JSON.parse(phone.storage.get(PENDING_KEY)!)).toEqual({ code, at: day() })
    expect(records()).toEqual(completed ? [] : [code])

    back()
    await m.press(/^Take it off$/)
    await m.until(() => m.text().includes(completed ? 'Nothing was under that code any more' : 'Your name is off the list'), 'the confirmed answer')
    expect(field('#looking-code').value).toBe('')
    expect(m.text()).not.toMatch(/An earlier try may have reached us/)
    expect(phone.storage.get(PENDING_KEY)).toBeUndefined()
    expect(records()).toEqual([])
  })

  it('for a code this phone does not hold (another phone’s): the same words, the code stays in the field', async () => {
    const other = await receipt()
    // Another phone: this one holds nothing, and a fresh page opens the form.
    screen!.unmount()
    screen = undefined
    reload()
    onPhone(new Phone('elsewhere'))
    const m = await toForm()
    await m.press(/^I have a code/)
    await m.type('Your code', other)
    const back = answerDelete(server, reply(completed), completed)
    await m.press(/^Take it off$/)
    await m.until(() => m.text().includes(UNCONFIRMED), 'the unconfirmed message')
    noFalseClaims(m)
    expect(field('#looking-code').value).toBe(formatCode(other))
    back()
    await m.press(/^Take it off$/)
    await m.until(() => m.text().includes(completed ? 'Nothing was under that code any more' : 'Your name is off the list'), 'the confirmed answer')
    expect(records()).toEqual([])
  })
})

describe('a code typed on the receipt screen', () => {
  it('that is the receipt’s own code leaves the receipt in place after an unconfirmed answer', async () => {
    const code = await receipt()
    const m = screen!
    await m.press(/^I have a code/)
    await m.type('Your code', code)
    const back = answerDelete(server, text('{}'), false)
    await m.press(/^Take it off$/)
    await m.until(() => m.text().includes(UNCONFIRMED), 'the unconfirmed message')
    noFalseClaims(m)
    expect(m.text()).toContain('Your request was saved on')
    expect(JSON.parse(phone.storage.get(RECEIPT_KEY)!).code).toBe(code)
    back()
    await m.press(/^Take it off$/)
    await m.until(() => m.text().includes('Your name is off the list'), 'the confirmed answer')
    expect(phone.storage.get(RECEIPT_KEY)).toBeUndefined()
  })
})

describe('a browser that is not saving anything', () => {
  beforeEach(() => phone.refuse(/^niyyah\.intro/))

  it('the receipt, held only by the page, survives an unconfirmed withdrawal and is cleared by a valid one', async () => {
    const code = await receipt()
    expect(phone.storage.get(RECEIPT_KEY)).toBeUndefined()
    expect(screen!.text()).toContain(formatCode(code))
    const back = answerDelete(server, text('{"removed":"yes"}'), false)
    await screen!.press(/^Take my name off/)
    await screen!.until(() => screen!.text().includes(UNCONFIRMED), 'the unconfirmed message')
    noFalseClaims(screen!)
    // Still the receipt, with the code it shows because nothing else holds it.
    expect(screen!.text()).toContain('Your request was saved on')
    expect(screen!.text()).toContain(formatCode(code))
    expect(records()).toEqual([code])
    back()
    await screen!.press(/^Take my name off/)
    await screen!.until(() => screen!.text().includes('Your name is off the list'), 'the confirmed answer')
    expect(records()).toEqual([])
  })

  it('the pending code, held only by the page, survives an unconfirmed withdrawal from the note', async () => {
    const m = await toForm()
    await fill(m)
    server.lose(/introduce/)
    await m.press(/^Put my name down/)
    await m.until(() => m.text().includes('could not tell whether that reached us'), 'unsure')
    server.lose(false)
    const code = records()[0]
    await m.until(() => m.text().includes(formatCode(code)), 'the code shown in the note')
    const back = answerDelete(server, appHtml, false)
    await m.press(/^Take that try off/)
    await m.until(() => m.text().includes('We could not confirm that it came off.'), 'the unconfirmed message')
    noFalseClaims(m)
    expect(m.text()).toContain(formatCode(code))
    expect(m.has(/^Try taking it off again/)).toBe(true)
    back()
    await m.press(/^Try taking it off again/)
    await m.until(() => m.text().includes('Your name is off the list'), 'the confirmed answer')
    expect(records()).toEqual([])
    expect(m.text()).not.toMatch(/An earlier try may have reached us/)
  })
})
