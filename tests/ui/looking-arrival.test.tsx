// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { Phone, onPhone, reload } from '../support/device'
import { mount, type Mounted } from '../support/render'
import { blobs, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * Where the person lands when the introduction screen's content is replaced in
 * place (docs/DECISIONS.md Part 30, BATCH-07A): the form becoming the receipt
 * once the request is saved, and the receipt becoming the form, with its word
 * that the name is off, once it is taken off.
 *
 * Neither is a screen change, so App's scroll to the top and heading focus did
 * not run: the window kept the form's offset (the receipt's beginning, with the
 * server's dates, was above it) and the button that held focus was gone, so
 * focus sat on <body>. Scroll and focus are two separate actions and are held
 * separately here. These check DOM focus and the calls to `window.scrollTo`,
 * which is all happy-dom has; the real offsets and visibility are measured in a
 * browser (docs/SESSION-HANDOFF.md). None of this is a screen-reader test.
 */

let server: Served
let screen: Mounted | undefined
let scrollTo: ReturnType<typeof vi.fn>
beforeEach(() => {
  blobs.reset()
  server = serve()
  onPhone(new Phone('arrival'))
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
const onHeading = (text: RegExp) => active()?.tagName === 'H1' && text.test(active()?.textContent ?? '')
const control = (name: RegExp) => [...screen!.container.querySelectorAll<HTMLElement>('button')].find((b) => name.test(b.textContent ?? ''))!

async function toForm() {
  screen = await mount(<App />)
  await screen.press(/I’m looking for someone serious/)
  await screen.until(() => onHeading(/Put your name down/), 'focus on the form heading')
  return screen
}
async function fill(m: Mounted) {
  await m.press(/^I am a woman/)
  await m.press(/^Minneapolis/)
  await m.type('Email or phone', 'zq.arrival@example.test')
  await m.press(/I confirm I am 18/)
}
/** Focus the submit button, as a keyboard user or a tap leaves it, then send. */
async function send(m: Mounted) {
  act(() => control(/^Put my name down/).focus())
  await m.press(/^Put my name down/)
  await m.until(() => m.text().includes('Your request was saved on'), 'the receipt')
}

describe('the form becomes the receipt', () => {
  it('brings the receipt to the top and puts focus on its heading', async () => {
    const m = await toForm()
    await fill(m)
    const before = scrollTo.mock.calls.length
    await send(m)
    await m.until(() => onHeading(/Your request was saved on/), 'focus on the receipt heading')
    // The scroll is its own action: the window goes to the top, once.
    expect(scrollTo.mock.calls.slice(before)).toEqual([[0, 0]])
    // The heading is not a tab stop afterwards; the first Tab is the first control after it.
    expect(active()?.getAttribute('tabindex')).toBe('-1')
  })

  // Changed in BATCH-07B (docs/DECISIONS.md Part 31). BATCH-07A held that a failed or unsure
  // submit never arrives: nothing the person needed was above the window. Now the first
  // uncertain result puts a note about the earlier try at the top of the page (its code and
  // its withdrawal), so that one outcome is brought into view; the same outcome again is not.
  it('is never the receipt when the request does not save; the first uncertain result brings the note about the earlier try into view, once', async () => {
    const m = await toForm()
    await fill(m)
    server.lose(/introduce/)
    const before = scrollTo.mock.calls.length
    act(() => control(/^Put my name down/).focus())
    await m.press(/^Put my name down/)
    await m.until(() => m.text().includes('could not tell whether that reached us'), 'the unsure answer')
    await m.until(() => active()?.tagName === 'H2' && /An earlier try may have reached us/.test(active()?.textContent ?? ''), 'focus on the note about the earlier try')
    expect(scrollTo.mock.calls.slice(before)).toEqual([[0, 0]])
    expect(onHeading(/Your request was saved on/)).toBe(false)
    expect(m.text()).not.toContain('Your request was saved on')
    // The same outcome again is already on the page: no second scroll, and focus is not taken back.
    const after = scrollTo.mock.calls.length
    const back = screen!.container.querySelector<HTMLElement>('header button')!
    act(() => back.focus())
    await m.press(/^Put my name down/)
    await m.until(() => !m.text().includes('Saving…'), 'the second answer')
    await m.settle()
    expect(scrollTo.mock.calls.length).toBe(after)
    expect(active()).toBe(back)
  })

  it('leaves focus where the person put it while the request was in flight', async () => {
    const m = await toForm()
    await fill(m)
    const release = server.hold(/introduce/)
    await m.press(/^Put my name down/)
    const back = screen!.container.querySelector<HTMLElement>('header button')!
    act(() => back.focus())
    release()
    await m.until(() => m.text().includes('Your request was saved on'), 'the receipt')
    await m.settle()
    // The scroll still brings the result into view; focus was not lost, so it stays.
    expect(active()).toBe(back)
  })
})

describe('the receipt becomes the form after the name is taken off', () => {
  it('brings the form and its confirmation to the top and puts focus on the form heading', async () => {
    const m = await toForm()
    await fill(m)
    await send(m)
    await m.until(() => onHeading(/Your request was saved on/), 'the receipt heading')
    const before = scrollTo.mock.calls.length
    act(() => control(/^Take my name off/).focus())
    await m.press(/^Take my name off/)
    await m.until(() => m.text().includes('Your name is off the list'), 'the confirmation')
    await m.until(() => onHeading(/Put your name down/), 'focus on the form heading')
    expect(scrollTo.mock.calls.slice(before)).toEqual([[0, 0]])
    // The confirmation sits directly above the heading in the same screen, so
    // the top of the page shows both.
    const main = m.container.querySelector('main')!
    const status = [...main.querySelectorAll('[role="status"]')].find((s) => s.textContent?.includes('Your name is off the list'))!
    expect(status.compareDocumentPosition(active()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(main.querySelector('h1, h2')).toBe(active())
  })

  it('does not scroll or move focus when taking the name off fails', async () => {
    const m = await toForm()
    await fill(m)
    await send(m)
    await m.until(() => onHeading(/Your request was saved on/), 'the receipt heading')
    const before = scrollTo.mock.calls.length
    server.down(/introduce/)
    const off = control(/^Take my name off/)
    act(() => off.focus())
    await m.press(/^Take my name off/)
    await m.until(() => m.text().includes('We could not confirm that your name came off the list'), 'the failure')
    expect(scrollTo.mock.calls.length).toBe(before)
    expect(m.text()).toContain('Your request was saved on')
    // And the retry that works is an arrival of its own.
    server.down(false)
    await m.press(/^Take my name off/)
    await m.until(() => onHeading(/Put your name down/), 'focus on the form heading')
    expect(scrollTo.mock.calls.length).toBe(before + 1)
  })
})

describe('focus the person moves during a submission is theirs', () => {
  // BATCH-07B follow-up. The arrival that brings the note about an earlier try into view
  // lets go of focus only when it is still on the control the tap came from. Focus lost to
  // <body> is taken by the heading; focus the person moved elsewhere while the request was
  // out — another field in the same form, or the header's Back — stays where she put it.
  // The scroll to the top happens in every case.
  const note = () => active()?.tagName === 'H2' && /An earlier try may have reached us/.test(active()?.textContent ?? '')
  const field = (label: string) => screen!.container.querySelector<HTMLElement>(`#${label}`)!
  const uncertain = (m: Mounted) => m.until(() => m.text().includes('could not tell whether that reached us'), 'the unsure answer')

  it('a field focused while the request is out keeps focus when the answer is uncertain', async () => {
    const m = await toForm()
    await fill(m)
    const release = server.hold(/introduce/)
    server.lose(/introduce/)
    const before = scrollTo.mock.calls.length
    act(() => control(/^Put my name down/).focus())
    await m.press(/^Put my name down/)
    expect(m.text()).toContain('Saving…')
    const other = field('looking-name')
    act(() => other.focus())
    release()
    await uncertain(m)
    await m.settle()
    expect(m.text()).toContain('An earlier try may have reached us')
    expect(active()).toBe(other)
    expect(scrollTo.mock.calls.slice(before)).toEqual([[0, 0]])
  })

  it('a field focused while the request is out keeps focus when the answer is a 409', async () => {
    const m = await toForm()
    await fill(m)
    server.lose(/introduce/)
    await m.press(/^Put my name down/)
    await uncertain(m)
    server.lose(false)
    await m.type('Email or phone', '+1 612 555 0199')
    const release = server.hold(/introduce/)
    const before = scrollTo.mock.calls.length
    act(() => control(/^Put my name down/).focus())
    await m.press(/^Put my name down/)
    expect(m.text()).toContain('Saving…')
    const other = field('looking-name')
    act(() => other.focus())
    release()
    await m.until(() => m.text().includes('An earlier try was saved with different details'), 'the conflict')
    await m.settle()
    expect(active()).toBe(other)
    expect(scrollTo.mock.calls.slice(before)).toEqual([[0, 0]])
  })

  it('the header’s Back, focused while the request is out, keeps focus', async () => {
    const m = await toForm()
    await fill(m)
    const release = server.hold(/introduce/)
    server.lose(/introduce/)
    act(() => control(/^Put my name down/).focus())
    await m.press(/^Put my name down/)
    const back = screen!.container.querySelector<HTMLElement>('header button')!
    act(() => back.focus())
    release()
    await uncertain(m)
    await m.settle()
    expect(active()).toBe(back)
  })

  it('focus still on the control the tap came from is released, and the note takes it', async () => {
    const m = await toForm()
    await fill(m)
    const release = server.hold(/introduce/)
    server.lose(/introduce/)
    act(() => control(/^Put my name down/).focus())
    await m.press(/^Put my name down/)
    release()
    await uncertain(m)
    await m.until(note, 'focus on the note')
  })

  it('focus lost to <body> is taken by the note', async () => {
    const m = await toForm()
    await fill(m)
    // Nothing holds focus: the page heading App focused on arrival is let go of, as a tap elsewhere does.
    act(() => active()?.blur())
    expect(active()).toBe(document.body)
    const release = server.hold(/introduce/)
    server.lose(/introduce/)
    await m.press(/^Put my name down/)
    release()
    await uncertain(m)
    await m.until(note, 'focus on the note')
  })
})

describe('nothing else triggers it', () => {
  it('first arrival through App is one scroll and one focus, from App alone', async () => {
    screen = await mount(<App />)
    const before = scrollTo.mock.calls.length
    await screen.press(/I’m looking for someone serious/)
    await screen.until(() => onHeading(/Put your name down/), 'focus on the form heading')
    await screen.settle()
    // App's own scroll for the screen change, and nothing from Looking.
    expect(scrollTo.mock.calls.length - before).toBe(1)
  })

  it('typing, validation and field changes on the form never scroll or take focus', async () => {
    const m = await toForm()
    const before = scrollTo.mock.calls.length
    await m.press(/^I am a man/)
    await m.press(/^London/)
    await m.type('Email or phone', 'sagal@gmial')
    await m.type('Your first name', 'Sagal')
    act(() => control(/I confirm I am 18/).focus())
    await m.press(/I confirm I am 18/)
    expect(scrollTo.mock.calls.length).toBe(before)
    expect(active()?.textContent).toMatch(/I confirm I am 18/)
  })

  it('on the receipt, opening the code field or any rerender does not scroll or take focus', async () => {
    const m = await toForm()
    await fill(m)
    await send(m)
    await m.until(() => onHeading(/Your request was saved on/), 'the receipt heading')
    const before = scrollTo.mock.calls.length
    act(() => control(/^I have a code/).focus())
    await m.press(/^I have a code/)
    await m.type('Your code', 'ABC')
    await m.settle()
    expect(scrollTo.mock.calls.length).toBe(before)
    expect(active()?.tagName).not.toBe('H1')
  })
})
