// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { beforeYesTopics } from '../../src/data/beforeYes'
import { coupleReading } from '../../src/lib/couple'
import { entryFromUrl } from '../../src/lib/entry'
import { accessibleName } from '../support/a11y'
import { Phone, onPhone, reload } from '../support/device'
import { mount, type Mounted } from '../support/render'
import { blobs, call, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * Where focus lands on his side of the two-person eleven
 * (docs/DECISIONS.md Part 28).
 *
 * He opens her link and answers on his own phone. The screen has seven
 * phases — loading, intro, asking, the joint, already answered, a dead link,
 * an unreachable one — and every change between them, and every change from
 * one question to the next, replaced the control that had focus and left it
 * on <body>: a keyboard or screen-reader user was told nothing had changed,
 * on the way in, on every question, and again at the result. These check the
 * DOM's focus, which is what a screen reader follows; none of this is a
 * screen-reader test.
 */

let screen: Mounted | undefined
let phone: Phone
let server: Served
beforeEach(() => {
  blobs.reset()
  server = serve()
  phone = onPhone(new Phone('couple-focus'))
})
afterEach(() => {
  screen?.unmount()
  screen = undefined
  reload()
  vi.unstubAllGlobals()
  ;(document.activeElement as HTMLElement | null)?.blur()
})

const IDS = beforeYesTopics('man').map((t) => t.id)
const active = () => document.activeElement as HTMLElement | null
const control = (name: string | RegExp) =>
  [...screen!.container.querySelectorAll<HTMLElement>('button, [role="radio"]')].find((c) => (typeof name === 'string' ? accessibleName(c).includes(name) : name.test(accessibleName(c))))
const onHeading = (tag: 'H1' | 'H2', text: string) => active()?.tagName === tag && (active()?.textContent ?? '').includes(text)
const AGREE = /^We’ve talked, and we agree/
/** The headline of a joint where both said "agree" to all eleven — what his result opens with. */
const ALL_AGREE = coupleReading(Object.fromEntries(IDS.map((id) => [id, 'both-agree' as const])), 'man').headline

/** What a person does: focus the control, then activate it. */
async function tap(name: string | RegExp) {
  const el = control(name)
  if (!el) throw new Error(`nothing to tap named ${String(name)}`)
  act(() => el.focus())
  expect(active()).toBe(el)
  await screen!.press(name)
}

/** Her side, made by the real handler: the code she would have sent him. */
async function herCode(): Promise<string> {
  const states = Object.fromEntries(IDS.map((id) => [id, 'agree']))
  const res = await call('couple', 'POST', 'couple', { side: 'first', gender: 'woman', states })
  return ((await res.json()) as { code: string }).code
}

async function openHis(code: string) {
  screen = await mount(<App entry={entryFromUrl(`?couple=${code}`, '/')} />)
}

/** From the intro to the first question, then answer `n` questions, each by tapping the first answer. */
async function begin() {
  await tap(/^Start$/)
}
async function answer(n: number) {
  for (let i = 0; i < n; i++) await tap(AGREE)
}

describe('arriving on her link', () => {
  it('the intro takes focus when the record arrives — it is not a screen change, the record was still loading', async () => {
    const code = await herCode()
    const release = server.hold(/couple/, 'GET')
    await openHis(code)
    // Nothing to focus while it loads.
    expect(screen!.text()).toContain('One moment.')
    expect(active()).toBe(document.body)
    release()
    await screen!.until(() => screen!.text().includes('asked you to do this too'), 'the intro')
    expect(onHeading('H1', 'asked you to do this too')).toBe(true)
    expect(active()?.getAttribute('tabindex')).toBe('-1')
  })

  it('a link that has gone, one that cannot be reached and one already answered each take focus at their heading', async () => {
    // Gone.
    await openHis('ACDEFGHJ')
    await screen!.until(() => screen!.text().includes('This link isn’t working.'), 'dead')
    expect(onHeading('H1', 'This link isn’t working.')).toBe(true)
    screen!.unmount()
    reload()
    ;(document.activeElement as HTMLElement | null)?.blur()
    // Unreachable: the server is away, which is us, not the link.
    server.down(true)
    await openHis('ACDEFGHJ')
    await screen!.until(() => screen!.text().includes('We couldn’t open this just now.'), 'unreachable')
    expect(onHeading('H1', 'We couldn’t open this just now.')).toBe(true)
    screen!.unmount()
    reload()
    ;(document.activeElement as HTMLElement | null)?.blur()
    server.down(false)
    // Already answered: he opens the link after both have answered.
    const code = await herCode()
    await call('couple', 'POST', 'couple', { side: 'second', code, states: Object.fromEntries(IDS.map((id) => [id, 'agree'])) })
    await openHis(code)
    await screen!.until(() => screen!.text().includes('This one has been answered'), 'the joint')
    expect(active()?.tagName).toBe('H1')
    expect(active()?.textContent).toBe(ALL_AGREE)
  })

  it('does not take focus from a control he has already moved to', async () => {
    const code = await herCode()
    const release = server.hold(/couple/, 'GET')
    await openHis(code)
    // Something he can reach while it loads: a field-less page has only the page itself, so give focus to
    // an element of his own choosing inside the screen.
    const stand = document.createElement('button')
    stand.textContent = 'elsewhere'
    screen!.container.querySelector('main')!.appendChild(stand)
    act(() => stand.focus())
    release()
    await screen!.until(() => screen!.text().includes('asked you to do this too'), 'the intro')
    expect(active()).toBe(stand)
    stand.remove()
  })
})

describe('asking', () => {
  it('Start, then each question, takes focus at its heading; the chosen answer is kept', async () => {
    const code = await herCode()
    await openHis(code)
    await begin()
    for (const [i, id] of IDS.entries()) {
      expect(onHeading('H2', 'Have the two of you talked about this?'), `question ${i + 1}: ${active()?.tagName} ${active()?.textContent?.slice(0, 40)}`).toBe(true)
      expect(active()?.id).toBe(`couple-q-${id}`)
      expect(active()?.getAttribute('tabindex')).toBe('-1')
      if (i === IDS.length - 1) break
      if (i === 1) {
        // "We don't agree" opens a second question, which keeps its own focus.
        await tap(/^We’ve talked, and we don’t agree/)
        expect(active()?.textContent).toBe('Where does that leave it?')
        await tap(/^It’s still open/)
      } else {
        await tap(AGREE)
      }
    }
  })

  it('Back keeps focus on Back, with the answer kept, and from the first question returns to the intro heading', async () => {
    const code = await herCode()
    await openHis(code)
    await begin()
    await answer(3)
    const back = control('Back')!
    act(() => back.focus())
    await screen!.press('Back')
    // The same button, still focused: Back survived the change.
    expect(control('Back')).toBe(back)
    expect(active()).toBe(back)
    expect(screen!.container.querySelector('h2')?.id).toBe(`couple-q-${IDS[2]}`)
    expect(screen!.container.querySelector('[role="radio"][aria-checked="true"]')).toBeTruthy()
    // And again, all the way to the first question; Back there is the intro.
    await tap('Back')
    await tap('Back')
    expect(screen!.container.querySelector('h2')?.id).toBe(`couple-q-${IDS[0]}`)
    expect(active()).toBe(control('Back'))
    await tap('Back')
    expect(onHeading('H1', 'asked you to do this too')).toBe(true)
    // Her answers survive the round trip: Start now offers to pick up.
    expect(screen!.has('Pick up where you left off')).toBe(true)
  })
})

describe('sending the eleventh', () => {
  async function toTheEleventh() {
    const code = await herCode()
    await openHis(code)
    await begin()
    await answer(IDS.length - 1)
    expect(screen!.container.querySelector('h2')?.id).toBe(`couple-q-${IDS[IDS.length - 1]}`)
    return code
  }

  it('the result takes focus when it arrives, after a delayed response, and nothing before then', async () => {
    await toTheEleventh()
    const release = server.hold(/couple/, 'POST')
    await tap(AGREE)
    expect(screen!.text()).toContain('Sending your answers…')
    // Still sending: focus is not pulled anywhere by the wait.
    expect(['H1', 'H2']).not.toContain(active()?.tagName)
    release()
    await screen!.until(() => screen!.text().includes('Where the two of you stand'), 'the joint')
    expect(active()?.tagName).toBe('H1')
    expect(active()?.textContent).toBe(ALL_AGREE)
    expect(active()?.getAttribute('tabindex')).toBe('-1')
    // His answers went once and were kept on his phone.
    await screen!.until(() => JSON.parse(phone.storage.get('niyyah.intake.v1') ?? '{}').beforeYes, 'saved')
  })

  it('he steps Back while it sends: Back keeps focus, and the late result then takes it', async () => {
    await toTheEleventh()
    const release = server.hold(/couple/, 'POST')
    await tap(AGREE)
    const back = control('Back')!
    act(() => back.focus())
    await screen!.press('Back')
    expect(active()).toBe(back)
    expect(screen!.container.querySelector('h2')?.id).toBe(`couple-q-${IDS[IDS.length - 2]}`)
    release()
    await screen!.until(() => screen!.text().includes('Where the two of you stand'), 'the joint')
    // The question he was on is gone, and so is Back; the result's heading has focus.
    expect(active()?.tagName).toBe('H1')
  })

  it('the result does not pull focus back once he has moved on inside it', async () => {
    await toTheEleventh()
    await tap(AGREE)
    await screen!.until(() => screen!.text().includes('Where the two of you stand'), 'the joint')
    expect(active()?.tagName).toBe('H1')
    const next = control(/Copy the words|Your own map/)!
    act(() => next.focus())
    // Anything that re-renders his screen — the save landing, a request finishing.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    await act(async () => screen!.root.render(<App entry={entryFromUrl('', '/')} />))
    expect(active()).toBe(next)
  })

  it('a link that has gone takes focus at its heading', async () => {
    await toTheEleventh()
    blobs.reset()
    await tap(AGREE)
    await screen!.until(() => screen!.text().includes('This link isn’t working.'), 'dead')
    expect(onHeading('H1', 'This link isn’t working.')).toBe(true)
  })

  it('a link answered meanwhile — a second tab got there first — takes focus at its heading', async () => {
    const code = await toTheEleventh()
    await call('couple', 'POST', 'couple', { side: 'second', code, states: Object.fromEntries(IDS.map((id) => [id, 'agree'])) })
    await tap(AGREE)
    await screen!.until(() => screen!.text().includes('This one has been answered'), 'already answered')
    expect(onHeading('H1', 'This one has been answered.')).toBe(true)
  })

  /** A send that does not land: the server runs it and the phone never hears. Held first, so the test can act while it is in flight. */
  async function failingSend() {
    const release = server.hold(/couple/, 'POST')
    server.lose(/couple/)
    await tap(AGREE)
    expect(screen!.text()).toContain('Sending your answers…')
    return release
  }
  /**
   * Chromium drops focus from a button the moment it is disabled for the send (checked in the built
   * app, docs/DECISIONS.md Part 28); happy-dom keeps it, and will not blur a disabled element, so do
   * what the browser did — or the failed-send tests would pass on a DOM that kept focus.
   */
  function browserDropsFocusFromDisabled() {
    const el = document.activeElement as HTMLButtonElement | null
    if (!el || !el.disabled) return
    act(() => {
      el.disabled = false
      el.blur()
      el.disabled = true
    })
    expect(document.activeElement).toBe(document.body)
  }
  const lastQuestion = `couple-q-${IDS[IDS.length - 1]}`

  it('a send that does not go leaves him on the question, with focus on the answer he gave', async () => {
    await toTheEleventh()
    const release = await failingSend()
    browserDropsFocusFromDisabled()
    release()
    await screen!.until(() => screen!.text().includes('That didn’t send'), 'the failure')
    // Same question, answer kept, and the keyboard is on that answer, not on <body>.
    expect(screen!.container.querySelector('h2')?.id).toBe(lastQuestion)
    expect(active()?.getAttribute('role')).toBe('radio')
    expect(active()?.getAttribute('aria-checked')).toBe('true')
    expect(active()?.hasAttribute('disabled')).toBe(false)
  })

  it('a failed send leaves focus where he put it if he has moved to Back', async () => {
    await toTheEleventh()
    const release = await failingSend()
    const back = control('Back')!
    act(() => back.focus())
    release()
    await screen!.until(() => screen!.text().includes('That didn’t send'), 'the failure')
    expect(active()).toBe(back)
  })

  it('a failed send does not pull focus into a question he has stepped back to', async () => {
    await toTheEleventh()
    const release = await failingSend()
    browserDropsFocusFromDisabled()
    // Back by pointer, with focus on <body> (Safari does not focus a tapped button): the tenth
    // question appears and takes it, as any new question does.
    await act(async () => control('Back')!.click())
    const tenth = screen!.container.querySelector('h2')!
    expect(tenth.id).toBe(`couple-q-${IDS[IDS.length - 2]}`)
    expect(active()).toBe(tenth)
    release()
    await screen!.until(() => screen!.text().includes('That didn’t send'), 'the failure')
    // The late failure about the eleventh moves nothing.
    expect(active()).toBe(tenth)
  })

  it('a response that lands after he has left takes nothing', async () => {
    await toTheEleventh()
    const release = server.hold(/couple/, 'POST')
    await tap(AGREE)
    screen!.unmount()
    screen = undefined
    ;(document.activeElement as HTMLElement | null)?.blur()
    release()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(active()).toBe(document.body)
    expect(document.querySelector('h1, h2')).toBeNull()
  })
})
