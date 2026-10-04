// @vitest-environment happy-dom
import { Suspense, lazy, act, useRef, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { FocusHeading } from '../../src/hooks/useFocusHeading'
import { Phone, onPhone, reload } from '../support/device'
import { mount, type Mounted } from '../support/render'
import { blobs, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * Where keyboard and screen-reader focus lands when a screen arrives
 * (docs/DECISIONS.md Part 25).
 *
 * Every screen past Welcome is a lazy chunk. The first version of this ran in
 * `App`, outside the Suspense boundary, keyed on the screen name: on a cold
 * load it ran while the chunk was still in flight, found only the blank
 * fallback, and never ran again, so focus stayed on <body> and a keyboard or
 * screen-reader user was told nothing had changed. These tests hold the
 * destination chunk back, as a slow connection does, and prove focus reaches
 * its heading when it resolves. They check the DOM's focus, which is what a
 * screen reader follows; none of this is a screen-reader test.
 */

// Talking's chunk is held until the test lets it go.
const talking = vi.hoisted(() => {
  let release!: () => void
  const held = new Promise<void>((r) => (release = r))
  return { held, release }
})
vi.mock('../../src/components/Talking', async (importOriginal) => {
  await talking.held
  return importOriginal()
})

let screen: Mounted | undefined
beforeEach(() => {
  blobs.reset()
  serve()
  onPhone(new Phone('focus'))
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
const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms))

describe('App, on a cold load of a lazy screen', () => {
  it('moves focus to the heading when the held chunk resolves, and not before', async () => {
    screen = await mount(<App />)
    await screen.press(/Choose where to start/)
    // The chunk is still in flight: the screen is the blank fallback, there is
    // nothing to focus, and focus is on the page, not on a stale control.
    expect(screen.text()).not.toMatch(/Where are you with it\?/)
    expect(active()).toBe(document.body)

    talking.release()
    await screen.until(() => /Where are you with it\?/.test(screen!.text()), 'Talking to appear')
    await screen.until(() => onHeading(/Where are you with it\?/), 'focus to reach the heading')

    // Normal keyboard order follows from there: the next Tab is the first
    // control, not something skipped, and the heading is not a tab stop.
    expect(active()?.getAttribute('tabindex')).toBe('-1')
  })

  it('does not take focus back once the person moves on the screen', async () => {
    screen = await mount(<App />)
    await screen.press(/Choose where to start/) // warm now: Talking has resolved
    await screen.until(() => onHeading(/Where are you with it\?/), 'focus to reach the heading')
    const card = [...screen.container.querySelectorAll('button')].find((b) => /We’re getting serious/.test(b.textContent ?? ''))!
    act(() => card.focus())
    await tick(150)
    await screen.settle()
    expect(active()).toBe(card)
    expect(active()?.tagName).toBe('BUTTON')
  })
})

describe('FocusHeading, in a keyed Suspense frame shaped like App’s', () => {
  const deferred = () => {
    let release!: () => void
    const held = new Promise<void>((r) => (release = r))
    return { held, release }
  }
  const page = (title: string, extra?: ReactNode) => ({ default: () => <main><h1>{title}</h1>{extra}<button>{title} button</button></main> })

  function Frame({ screen: which, pages }: { screen: string; pages: Record<string, React.ComponentType> }) {
    const ref = useRef<HTMLDivElement>(null)
    const Page = pages[which]
    return (
      <div key={which} ref={ref}>
        <Suspense fallback={<div />}>
          <Page />
          <FocusHeading within={ref} />
        </Suspense>
      </div>
    )
  }

  it('ignores a slow screen that was left before it arrived, and lands on the one that replaced it', async () => {
    const a = deferred()
    const b = deferred()
    const pages = {
      a: lazy(() => a.held.then(() => page('Page A'))),
      b: lazy(() => b.held.then(() => page('Page B'))),
    }
    screen = await mount(<Frame screen="a" pages={pages} />)
    await act(async () => screen!.root.render(<Frame screen="b" pages={pages} />))
    // B lands first: focus goes to B's heading.
    b.release()
    await screen.until(() => onHeading(/Page B/), 'B’s heading to be focused')
    // A, the screen that was left, resolves late. It is not on screen, so it
    // cannot run anything: focus stays on B.
    a.release()
    await tick()
    await screen.settle()
    expect(onHeading(/Page B/)).toBe(true)
    expect(screen.text()).not.toMatch(/Page A/)
  })

  it('leaves focus alone when something inside the screen already has it', async () => {
    const pages = {
      a: lazy(() => Promise.resolve({ default: () => <main><h1>Page A</h1><input aria-label="Name" autoFocus /></main> })),
    }
    screen = await mount(<Frame screen="a" pages={pages} />)
    await screen.settle()
    expect(active()?.tagName).toBe('INPUT')
  })

  it('focuses the heading of a screen that is already loaded, at once', async () => {
    const pages = { a: lazy(() => Promise.resolve(page('Page A'))) }
    screen = await mount(<Frame screen="a" pages={pages} />)
    await screen.until(() => onHeading(/Page A/), 'A’s heading to be focused')
  })
})
