// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { Phone, onPhone, reload } from '../support/device'
import { seedPending, seedReceipt, seedRecord } from '../support/intro'
import { mount, type Mounted } from '../support/render'
import { blobs, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * Where the person lands when the introduction screen's content is replaced in
 * place (docs/DECISIONS.md Part 30, BATCH-07A, and release R3's amendment): the
 * receipt, or the note about an earlier try, going once its request is taken
 * off, so the confirmation and the screen's heading are what is left.
 *
 * Neither is a screen change, so App's scroll to the top and heading focus do
 * not run: the window would keep the old offset and the button that held focus
 * would be gone, so focus would sit on <body>. Scroll and focus are two separate
 * actions and are held separately here, along with the rule that focus the
 * person moved elsewhere while the request was out is theirs. These check DOM
 * focus and the calls to `window.scrollTo`, which is all happy-dom has; the real
 * behaviour was measured in Chromium. None of this is a screen-reader test.
 *
 * The form arriving as a receipt once a request is saved is not here: nothing
 * can put a name down now. The receipt and the note are seeded.
 */

const CODE = 'QRTWXY34'
let server: Served
let phone: Phone
let screen: Mounted | undefined
let scrollTo: ReturnType<typeof vi.fn>
beforeEach(() => {
  blobs.reset()
  server = serve()
  phone = onPhone(new Phone('arrival'))
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

const active = () => document.activeElement as HTMLElement | null
const onHeading = (tag: 'H1' | 'H2', text: RegExp) => active()?.tagName === tag && text.test(active()?.textContent ?? '')
const control = (name: RegExp) => [...screen!.container.querySelectorAll<HTMLElement>('button')].find((b) => name.test(b.textContent ?? ''))!

async function toLooking(kind: 'receipt' | 'try') {
  seedRecord(CODE)
  if (kind === 'receipt') seedReceipt(phone, CODE)
  else seedPending(phone, CODE)
  screen = await mount(<App />)
  await screen.press(/Manage an earlier introduction request/)
  await screen.until(() => (kind === 'receipt' ? onHeading('H1', /Your earlier request\./) : onHeading('H2', /An earlier try may have reached us/)), 'focus on the first heading')
  return screen
}
const buttonFor = (kind: 'receipt' | 'try') => (kind === 'receipt' ? /^Take my name off/ : /^Take that try off/)
const confirmation = (kind: 'receipt' | 'try') => (kind === 'receipt' ? 'The request under this code is off the list.' : 'The request under the code this phone was holding for that try is off the list.')

describe.each(['receipt', 'try'] as const)('the %s going once its request is taken off', (kind) => {
  it('brings the confirmation and the screen heading to the top and puts focus on the heading', async () => {
    const m = await toLooking(kind)
    const before = scrollTo.mock.calls.length
    act(() => control(buttonFor(kind)).focus())
    await m.press(buttonFor(kind))
    await m.until(() => m.text().includes(confirmation(kind)), 'the confirmation')
    await m.until(() => onHeading('H1', /New introduction requests are closed\./), 'focus on the screen heading')
    expect(scrollTo.mock.calls.slice(before)).toEqual([[0, 0]])
    // The confirmation sits above the heading in the same screen, so the top of the page shows both.
    const main = m.container.querySelector('main')!
    const status = [...main.querySelectorAll('[role="status"]')].find((s) => s.textContent?.includes(confirmation(kind)))!
    expect(status.compareDocumentPosition(active()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(main.querySelector('h1, h2')).toBe(active())
  })

  it('does not scroll or move focus when taking it off fails, and the retry that works arrives', async () => {
    const m = await toLooking(kind)
    const before = scrollTo.mock.calls.length
    server.down(/introduce/)
    const off = control(buttonFor(kind))
    act(() => off.focus())
    await m.press(buttonFor(kind))
    await m.until(() => m.text().includes('We could not confirm whether that request was removed.'), 'the failure')
    expect(scrollTo.mock.calls.length).toBe(before)
    expect(active()).toBe(off)
    server.down(false)
    await m.press(buttonFor(kind))
    await m.until(() => onHeading('H1', /New introduction requests are closed\./), 'focus on the screen heading')
    expect(scrollTo.mock.calls.length).toBe(before + 1)
  })
})

describe('focus the person moves during a withdrawal is theirs', () => {
  it('the header’s Back, focused while the request is out, keeps focus when the note goes', async () => {
    const m = await toLooking('try')
    const release = server.hold(/introduce/, 'DELETE')
    act(() => control(/^Take that try off/).focus())
    await m.press(/^Take that try off/)
    const back = screen!.container.querySelector<HTMLElement>('header button')!
    act(() => back.focus())
    release()
    await m.until(() => m.text().includes(confirmation('try')), 'the confirmation')
    await m.settle()
    expect(active()).toBe(back)
    expect(m.container.querySelector('h1')).not.toBe(active())
  })

  it('focus still on the control the tap came from is released, and the heading takes it', async () => {
    const m = await toLooking('try')
    const release = server.hold(/introduce/, 'DELETE')
    act(() => control(/^Take that try off/).focus())
    await m.press(/^Take that try off/)
    release()
    await m.until(() => onHeading('H1', /New introduction requests are closed\./), 'focus on the screen heading')
  })

  it('focus lost to <body> before the answer is left alone: she chose to click away', async () => {
    const m = await toLooking('try')
    const release = server.hold(/introduce/, 'DELETE')
    await m.press(/^Take that try off/)
    act(() => active()?.blur())
    expect(active()).toBe(document.body)
    release()
    await m.until(() => m.text().includes(confirmation('try')), 'the confirmation')
    await m.settle()
    // The note and its button went with the answer, but she had not been on them.
    expect(active()).toBe(document.body)
  })
})

describe('nothing else triggers it', () => {
  it('first arrival through App is one scroll and one focus, from App alone', async () => {
    seedRecord(CODE)
    seedReceipt(phone, CODE)
    screen = await mount(<App />)
    const before = scrollTo.mock.calls.length
    await screen.press(/Manage an earlier introduction request/)
    await screen.until(() => onHeading('H1', /Your earlier request\./), 'focus on the heading')
    await screen.settle()
    // App's own scroll for the screen change, and nothing from the screen.
    expect(scrollTo.mock.calls.length - before).toBe(1)
  })

  it('typing, validation and field changes on the closed screen never scroll or take focus', async () => {
    screen = await mount(<App />)
    await screen.press(/Manage an earlier introduction request/)
    await screen.settle()
    const before = scrollTo.mock.calls.length
    const focused = active()
    await screen.type('Request code', 'abc-d')
    await screen.press(/^Take it off the list/)
    await screen.settle()
    expect(screen.text()).toContain('A request code is 8 characters')
    expect(scrollTo.mock.calls.length).toBe(before)
    // Focus is exactly where it was: nothing here took it, or gave it back.
    expect(active()).toBe(focused)
  })

  it('on the receipt, opening the code field or any rerender does not scroll or take focus from the field', async () => {
    const m = await toLooking('receipt')
    const before = scrollTo.mock.calls.length
    act(() => control(/^Use a different code/).focus())
    await m.press(/^Use a different code/)
    await m.type('Request code', 'ABC')
    await m.settle()
    expect(scrollTo.mock.calls.length).toBe(before)
    expect(active()?.id).toBe('request-code')
  })
})
