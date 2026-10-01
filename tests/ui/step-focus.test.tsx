// @vitest-environment happy-dom
import { act, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import FocusStep from '../../src/components/FocusStep'
import { readQuestions } from '../../src/data/read'
import { beforeYesTopics } from '../../src/data/beforeYes'
import { buildRead } from '../../src/lib/read'
import { entryFromUrl } from '../../src/lib/entry'
import { accessibleName } from '../support/a11y'
import { Phone, onPhone, reload } from '../support/device'
import { mount, type Mounted } from '../support/render'
import { blobs, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * Where focus lands on the next question and on the result
 * (docs/DECISIONS.md Part 26).
 *
 * A screen change moves focus to its heading. The next question and the result
 * are not screen changes, so the tap that answered the last question removed
 * the button that had focus and focus fell to <body>: nothing told a keyboard
 * or screen-reader user a new question had appeared, twelve times and again at
 * the result. These check the DOM's focus, which is what a screen reader
 * follows; none of this is a screen-reader test.
 */

let screen: Mounted | undefined
let phone: Phone
beforeEach(() => {
  blobs.reset()
  serve()
  phone = onPhone(new Phone('step-focus'))
})
afterEach(() => {
  screen?.unmount()
  screen = undefined
  reload()
  vi.unstubAllGlobals()
  ;(document.activeElement as HTMLElement | null)?.blur()
})

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const active = () => document.activeElement as HTMLElement | null
const control = (name: string | RegExp) =>
  [...screen!.container.querySelectorAll<HTMLElement>('button, [role="radio"]')].find((c) => (typeof name === 'string' ? accessibleName(c).includes(name) : name.test(accessibleName(c))))!

/** What a person does: focus the control, then activate it. */
async function tap(name: string | RegExp) {
  const el = control(name)
  if (!el) throw new Error(`nothing to tap named ${String(name)}`)
  act(() => el.focus())
  expect(active()).toBe(el)
  await screen!.press(name)
}
const onHeading = (tag: 'H1' | 'H2', text: string) => active()?.tagName === tag && (active()?.textContent ?? '').includes(text)

describe('the read', () => {
  it('focus follows each question, and the result, with every answer kept', async () => {
    const want: Record<string, string> = {
      duration: 'months-3', named: 'after', timeline: 'soft', known: 'friends', secret: 'no', family: 'passing',
      initiative: 'day-two', 'in-person': 'several', plans: 'rescheduled', money: 'no', nonneg: 'untold', hard: 'defensive',
    }
    screen = await mount(<App entry={entryFromUrl('', '/tools/is-he-serious')} />)
    const questions = readQuestions('woman')
    await tap('Start the read')
    for (const [i, q] of questions.entries()) {
      // Focus is on the question, not on <body> and not on a control that has gone.
      expect(onHeading('H2', q.prompt), `question ${i + 1}: ${active()?.tagName} ${active()?.textContent?.slice(0, 40)}`).toBe(true)
      expect(active()?.getAttribute('tabindex')).toBe('-1')
      await tap(new RegExp(`^${escape(q.options.find((o) => o.id === want[q.id])!.label)}`))
    }
    // The result: the headline, once.
    const built = buildRead(want, 'woman')!
    expect(onHeading('H1', built.headline)).toBe(true)
    // Nothing was reset to get there.
    const kept = () => JSON.parse(phone.storage.get('niyyah.intake.v1') ?? '{}')
    await screen.until(() => kept().read, 'the read is saved')
    expect(kept().read.answers).toEqual(want)
  })

  it('leaves focus on a control that survives the change: Back, held on Back', async () => {
    screen = await mount(<App entry={entryFromUrl('', '/tools/is-he-serious')} />)
    await tap('Start the read')
    const q = readQuestions('woman')
    await tap(new RegExp(`^${escape(q[0].options[0].label)}`))
    expect(onHeading('H2', q[1].prompt)).toBe(true)
    await tap('Back')
    // The previous question is showing, her answer is still chosen, and focus
    // is where she put it — on Back.
    expect(screen.text()).toContain(q[0].prompt)
    expect(screen.container.querySelector('[role="radio"][aria-checked="true"]')).toBeTruthy()
    expect(active()).toBe(control('Back'))
    expect(accessibleName(active()!)).toBe('Back')
  })

  it('a result reached by "See the read you took before" takes focus too', async () => {
    const want: Record<string, string> = {
      duration: 'months-3', named: 'after', timeline: 'soft', known: 'friends', secret: 'no', family: 'passing',
      initiative: 'day-two', 'in-person': 'several', plans: 'rescheduled', money: 'no', nonneg: 'untold', hard: 'defensive',
    }
    phone.storage.set('niyyah.intake.v1', JSON.stringify({ identity: { gender: 'woman', adult: true }, stage: 'talking', situated: true, read: { at: new Date().toISOString(), answers: want } }))
    screen = await mount(<App entry={entryFromUrl('', '/tools/is-he-serious')} />)
    await tap('See the read you took before')
    expect(onHeading('H1', buildRead(want, 'woman')!.headline)).toBe(true)
  })
})

describe('the eleven', () => {
  it('focus follows each topic, the difference question keeps its own, and the result takes it', async () => {
    screen = await mount(<App entry={entryFromUrl('', '/tools/before-you-say-yes')} />)
    const topics = beforeYesTopics('woman')
    await tap(/^Start — about him/)
    for (const i of topics.keys()) {
      expect(onHeading('H2', 'Have the two of you talked about this?'), `topic ${i + 1}`).toBe(true)
      expect(screen.text()).toContain(`${i + 1} of ${topics.length}`)
      if (i === 1) {
        // "We don't agree" opens the second question, and focus goes to it —
        // not to the topic heading again, and not to <body>.
        await tap(/^We’ve talked, and we don’t agree/)
        expect(active()?.textContent).toBe('Where does that leave it?')
        await tap(/^It’s still open/)
      } else {
        await tap(/^We’ve talked, and we agree/)
      }
    }
    expect(onHeading('H1', 'One conversation is still open between you.')).toBe(true)
    await screen.until(() => JSON.parse(phone.storage.get('niyyah.intake.v1') ?? '{}').beforeYes, 'the eleven is saved')
    const saved = JSON.parse(phone.storage.get('niyyah.intake.v1')!).beforeYes
    expect(saved.answers[topics[1].id]).toBe('differ')
    expect(Object.keys(saved.answers)).toHaveLength(topics.length)
  })
})

describe('the family words', () => {
  it('choosing whose words these are puts focus on the first script, once', async () => {
    screen = await mount(<App entry={entryFromUrl('', '/tools/families')} />)
    // On arrival, with no side, focus is on the page's heading (App).
    expect(active()?.tagName).toBe('H1')
    await tap(/^Mine — I’m a woman/)
    expect(active()?.getAttribute('aria-expanded')).toBe('false')
    expect(active()?.textContent).toContain('Telling your wali you met him online')
  })

  it('a side already known leaves focus on the heading', async () => {
    phone.storage.set('niyyah.intake.v1', JSON.stringify({ identity: { gender: 'man', adult: true }, stage: 'talking', situated: true }))
    screen = await mount(<App entry={entryFromUrl('', '/tools/families')} />)
    expect(active()?.tagName).toBe('H1')
    expect(screen.text()).toContain('Telling your family you met her online')
  })
})

describe('FocusStep, by itself', () => {
  function Steps({ initial = 'a' }: { initial?: string }) {
    const [step, setStep] = useState(initial)
    const [n, setN] = useState(0)
    return (
      <div>
        <button onClick={() => setStep(step === 'a' ? 'b' : 'a')}>Next</button>
        <button onClick={() => setN(n + 1)}>Rerender {n}</button>
        <FocusStep key={step}>
          <h2>Step {step}</h2>
          <button>Inside {step}</button>
          <input aria-label={`Field ${step}`} />
        </FocusStep>
      </div>
    )
  }

  it('takes lost focus when a step appears, and not otherwise', async () => {
    screen = await mount(<Steps />)
    // Mounted with focus on <body>: the first step takes it.
    expect(onHeading('H2', 'Step a')).toBe(true)
    // Replace the step while focus is inside it: the control that had it goes
    // with the step, focus is lost, and the new step takes it.
    act(() => control('Inside a').focus())
    expect(accessibleName(active()!)).toBe('Inside a')
    await act(async () => control('Next').click())
    expect(onHeading('H2', 'Step b')).toBe(true)
  })

  it('does not move focus on a re-render of the same step, or while she is in a field', async () => {
    screen = await mount(<Steps />)
    const field = screen.container.querySelector('input')!
    act(() => field.focus())
    await tap(/^Rerender/)
    await tap(/^Rerender/)
    // Tapping a button elsewhere moves focus to that button; it stays there.
    expect(accessibleName(active()!)).toMatch(/^Rerender/)
    act(() => field.focus())
    await act(async () => screen!.root.render(<Steps />))
    expect(active()).toBe(field)
  })

  it('leaves focus on a control outside the step (the header Back) when the step is replaced', async () => {
    screen = await mount(<Steps />)
    await tap('Next')
    expect(accessibleName(active()!)).toBe('Next')
    expect(screen.text()).toContain('Step b')
  })
})
