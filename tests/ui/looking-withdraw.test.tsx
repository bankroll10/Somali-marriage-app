// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { day } from '../../netlify/shared/day'
import { formatCode } from '../../src/lib/code'
import { answerDelete, appHtml, cutStream, text } from '../support/answers'
import { Phone, onPhone, reload } from '../support/device'
import { PENDING_KEY, RECEIPT_KEY, holdPendingInPage, holdReceiptInPage, markers, records, seedPending, seedReceipt, seedRecord } from '../support/intro'
import { mount, type Mounted } from '../support/render'
import { blobs, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * A withdrawal the phone cannot confirm (docs/DECISIONS.md Part 32, finding F), on
 * the screens that send one: the receipt's "Take my name off", the earlier try's
 * "Take that try off", and the field for a code typed in.
 *
 * Re-seeded for release R3 and its integration: nothing can put a name down any
 * more, so the receipt, the pending attempt and the record under their code are
 * built directly (tests/support/intro.ts), and the screens are the merged ones.
 * What they assert is unchanged in kind.
 *
 * Two situations look the same from the phone and are both held: the server did
 * delete the record and the confirmation arrived unreadable (`completed`), and an
 * invalid answer that looks like a success came back with nothing deleted. After
 * either, no screen may say the request is off the list, that nothing was found
 * under the code, or that nothing has changed; the code stays where it was; and one
 * later valid answer resolves it. The handlers are the real ones over the in-memory
 * store; the answer to the DELETE is the only thing replaced. This is local-handler
 * evidence, not the deployed functions, and checks text and storage, not what a
 * screen reader says.
 */

const CODE = 'QRTWXY34'
const UNCONFIRMED = 'We could not confirm whether that request was removed.'
/** What no screen may say after an unconfirmed answer. */
const FALSE_CLAIMS = ['is off the list', 'We found nothing', 'We found no request', 'Nothing has changed', 'that is us, not you', 'still down']

let server: Served
let phone: Phone
let screen: Mounted | undefined
beforeEach(() => {
  blobs.reset()
  server = serve()
  phone = onPhone(new Phone('withdraw'))
  vi.stubGlobal('scrollTo', vi.fn())
})
afterEach(() => {
  screen?.unmount()
  screen = undefined
  reload()
  vi.unstubAllGlobals()
  ;(document.activeElement as HTMLElement | null)?.blur()
})

const deletes = () => server.requests.filter((r) => r.startsWith('DELETE ')).length
const posts = () => server.requests.filter((r) => r.startsWith('POST ') && r.includes('/introduce')).length
const field = () => screen!.container.querySelector<HTMLInputElement>('#request-code')!
const noFalseClaims = (m: Mounted) => {
  for (const claim of FALSE_CLAIMS) expect(m.text(), claim).not.toContain(claim)
}

/** The introduction screen, reached through the link every visitor has. */
async function toLooking() {
  screen = await mount(<App />)
  await screen.press(/Manage an earlier introduction request/)
  return screen
}
/** A request that exists: its record on the server and its receipt on this phone. */
async function receipt(): Promise<string> {
  seedRecord(CODE)
  seedReceipt(phone, CODE)
  await toLooking()
  expect(screen!.text()).toContain('Your earlier request.')
  return CODE
}
/** An attempt whose answer was lost after the write landed: the record on the server, a pending code on this phone. */
async function earlierTry(): Promise<string> {
  seedRecord(CODE)
  seedPending(phone, CODE)
  const m = await toLooking()
  await m.until(() => /earlier try/.test(m.text()), 'the note')
  return CODE
}

const SITUATIONS: [string, boolean][] = [
  ['the deletion happened and its confirmation was unreadable', true],
  ['an invalid success-looking answer, nothing deleted', false],
]
/** The unreadable answer in each situation: a cut body where the delete ran, the app's HTML where it did not. */
const reply = (completed: boolean) => (completed ? cutStream : appHtml)
/** What the later valid answer says: the handler removed nothing (it already had) or removed the record. */
const confirmed = (completed: boolean) => (completed ? 'We found nothing under this phone’s code' : 'The request under this code is off the list.')

describe.each(SITUATIONS)('the receipt’s "Take my name off", %s', (_name, completed) => {
  it('keeps the receipt and the code, says it could not confirm, claims nothing, and a later valid answer resolves it', async () => {
    const code = await receipt()
    expect(JSON.parse(phone.storage.get(RECEIPT_KEY)!).code).toBe(code)
    const back = answerDelete(server, reply(completed), completed)
    await screen!.press(/^Take my name off/)
    await screen!.until(() => screen!.text().includes(UNCONFIRMED), 'the unconfirmed message')
    const m = screen!
    noFalseClaims(m)
    // Still the receipt, still the button, the code still on the phone.
    expect(m.text()).toContain('Your earlier request.')
    expect(m.text()).toContain('This phone is keeping its code.')
    expect(m.has(/^Take my name off/)).toBe(true)
    expect(JSON.parse(phone.storage.get(RECEIPT_KEY)!).code).toBe(code)
    expect(records()).toEqual(completed ? [] : [code])

    // A direct retry, the same code; the server's own answer is believed.
    back()
    const before = { deletes: deletes(), posts: posts() }
    await m.press(/^Take my name off/)
    await m.until(() => m.text().includes(confirmed(completed)), 'the confirmed answer')
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
    const code = await earlierTry()
    const m = screen!
    const back = answerDelete(server, reply(completed), completed)
    await m.press(/^Take that try off/)
    await m.until(() => m.text().includes(UNCONFIRMED), 'the unconfirmed message')
    noFalseClaims(m)
    expect(m.text()).toMatch(/An earlier try may have reached us/)
    expect(m.has(/^Take that try off/)).toBe(true)
    expect(JSON.parse(phone.storage.get(PENDING_KEY)!)).toEqual({ code, at: day() })
    expect(records()).toEqual(completed ? [] : [code])

    back()
    const before = posts()
    await m.press(/^Take that try off/)
    await m.until(
      () => m.text().includes(completed ? 'We found nothing under the code this phone was holding' : 'The request under the code this phone was holding for that try is off the list.'),
      'the confirmed answer',
    )
    expect(posts()).toBe(before)
    expect(m.text()).not.toMatch(/An earlier try may have reached us/)
    expect(phone.storage.get(PENDING_KEY)).toBeUndefined()
    expect(records()).toEqual([])
  })
})

describe.each(SITUATIONS)('a code typed in, %s', (_name, completed) => {
  it('keeps what was typed and the code the phone holds, claims nothing, and a later valid answer resolves it', async () => {
    const code = await earlierTry()
    const m = screen!
    await m.type('Request code', code.toLowerCase())
    const back = answerDelete(server, reply(completed), completed)
    await m.press(/^Take it off the list/)
    await m.until(() => m.text().includes(UNCONFIRMED), 'the unconfirmed message')
    noFalseClaims(m)
    // The typed code is still in the field, ready for the retry, and the note it belongs to is still on the page.
    expect(field().value).toBe(code)
    expect(m.text()).toMatch(/An earlier try may have reached us/)
    expect(JSON.parse(phone.storage.get(PENDING_KEY)!)).toEqual({ code, at: day() })
    expect(records()).toEqual(completed ? [] : [code])

    back()
    await m.press(/^Take it off the list/)
    await m.until(() => m.text().includes(completed ? 'We found no request under that code' : 'The request under that code is off the list.'), 'the confirmed answer')
    expect(field().value).toBe('')
    expect(m.text()).not.toMatch(/An earlier try may have reached us/)
    expect(phone.storage.get(PENDING_KEY)).toBeUndefined()
    expect(records()).toEqual([])
  })

  it('for a code this phone does not hold (another phone’s): the same words, the code stays in the field', async () => {
    seedRecord(CODE)
    onPhone(new Phone('elsewhere'))
    const m = await toLooking()
    await m.type('Request code', CODE)
    const back = answerDelete(server, reply(completed), completed)
    await m.press(/^Take it off the list/)
    await m.until(() => m.text().includes(UNCONFIRMED), 'the unconfirmed message')
    noFalseClaims(m)
    expect(field().value).toBe(CODE)
    back()
    await m.press(/^Take it off the list/)
    await m.until(() => m.text().includes(completed ? 'We found no request under that code' : 'The request under that code is off the list.'), 'the confirmed answer')
    expect(records()).toEqual([])
  })
})

describe('a code typed on the receipt screen', () => {
  it('that is the receipt’s own code leaves the receipt in place after an unconfirmed answer', async () => {
    const code = await receipt()
    const m = screen!
    await m.press(/^Use a different code/)
    await m.type('Request code', code)
    const back = answerDelete(server, text('{}'), false)
    await m.press(/^Take it off the list/)
    await m.until(() => m.text().includes(UNCONFIRMED), 'the unconfirmed message')
    noFalseClaims(m)
    expect(m.text()).toContain('Your earlier request.')
    expect(JSON.parse(phone.storage.get(RECEIPT_KEY)!).code).toBe(code)
    back()
    await m.press(/^Take it off the list/)
    await m.until(() => m.text().includes('This phone is not holding a request code.'), 'the confirmed answer')
    expect(phone.storage.get(RECEIPT_KEY)).toBeUndefined()
  })
})

describe('a browser that is not saving anything', () => {
  it('the receipt, held only by the page, survives an unconfirmed withdrawal and is cleared by a valid one', async () => {
    seedRecord(CODE)
    holdReceiptInPage(phone, CODE)
    expect(phone.storage.get(RECEIPT_KEY)).toBeUndefined()
    await toLooking()
    expect(screen!.text()).toContain(formatCode(CODE))
    const back = answerDelete(server, text('{"removed":"yes"}'), false)
    await screen!.press(/^Take my name off/)
    await screen!.until(() => screen!.text().includes(UNCONFIRMED), 'the unconfirmed message')
    noFalseClaims(screen!)
    // Still the receipt, with the code it shows because nothing else holds it.
    expect(screen!.text()).toContain('Your earlier request.')
    expect(screen!.text()).toContain(formatCode(CODE))
    expect(records()).toEqual([CODE])
    back()
    await screen!.press(/^Take my name off/)
    await screen!.until(() => screen!.text().includes('The request under this code is off the list.'), 'the confirmed answer')
    expect(records()).toEqual([])
  })

  it('the pending code, held only by the page, survives an unconfirmed withdrawal from the note', async () => {
    seedRecord(CODE)
    holdPendingInPage(phone, CODE)
    const m = await toLooking()
    await m.until(() => m.text().includes(formatCode(CODE)), 'the code shown in the note')
    const back = answerDelete(server, appHtml, false)
    await m.press(/^Take that try off/)
    await m.until(() => m.text().includes(UNCONFIRMED), 'the unconfirmed message')
    noFalseClaims(m)
    expect(m.text()).toContain(formatCode(CODE))
    expect(m.has(/^Take that try off/)).toBe(true)
    back()
    await m.press(/^Take that try off/)
    await m.until(() => m.text().includes('The request under the code this phone was holding for that try is off the list.'), 'the confirmed answer')
    expect(records()).toEqual([])
    expect(m.text()).not.toMatch(/An earlier try may have reached us/)
  })
})
