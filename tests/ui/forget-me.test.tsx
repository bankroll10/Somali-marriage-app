// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import ForgetMe from '../../src/components/ForgetMe'
import { mount, type Mounted } from '../support/render'

/**
 * What Forget me tells her about the step count's closure marker
 * (docs/DECISIONS.md, release candidate R2). The server keeps a random code and
 * a day for at least two days so a delayed report cannot bring the count back
 * (docs/PRIVACY.md); the screen says so, in the block both Trust and the Ending
 * show, before the controls. The deletion flow itself is unchanged.
 */

let screen: Mounted | undefined
afterEach(() => {
  screen?.unmount()
  screen = undefined
})

const DISCLOSURE =
  'To help stop a delayed step report from bringing your count back, we keep its random code and the day you asked to delete it. This deletion marker contains no steps or answers. It normally stays for two to nine days, and longer if cleanup fails.'

const paragraphs = (root: HTMLElement) => [...root.querySelectorAll('p')]

describe('Forget me', () => {
  it('says, in an ordinary paragraph before the controls, what the marker is and how long it stays', async () => {
    const onForget = vi.fn()
    screen = await mount(<ForgetMe onForget={onForget} />)
    const ps = paragraphs(screen.container)
    const intro = ps.find((p) => p.textContent?.startsWith('Deletes your kept map'))
    const marker = ps.find((p) => p.textContent?.replace(/\s+/g, ' ').trim() === DISCLOSURE)
    expect(intro).toBeDefined()
    expect(marker).toBeDefined()
    // After the introductory paragraph, in the same typography, not inside a disclosure…
    expect(intro!.compareDocumentPosition(marker!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(marker!.className).toBe(intro!.className.replace('mt-1', 'mt-2'))
    expect(marker!.closest('details')).toBeNull()
    // …and before the first control.
    const first = screen.container.querySelector('button')!
    expect(marker!.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // It states what is kept and what is not, and the window with its exception.
    expect(marker!.textContent).toMatch(/random code and the day you asked to delete it/)
    expect(marker!.textContent).toMatch(/no steps or answers/)
    expect(marker!.textContent).toMatch(/two to nine days, and longer if cleanup fails/)
    expect(onForget).not.toHaveBeenCalled()
  })

  it('leaves the deletion flow as it is: ask, confirm, one call; an unconfirmed deletion is said to be unknown, with the codes still held', async () => {
    const onForget = vi.fn().mockResolvedValue({ map: false, progress: false, couple: true, intro: true, mapHeld: ['BCDFGH'], kept: true, unchecked: true })
    screen = await mount(<ForgetMe onForget={onForget} />)
    expect(screen.has('Forget me')).toBe(true)
    expect(screen.has('Yes, delete everything')).toBe(false)
    await screen.press('Forget me')
    expect(onForget).not.toHaveBeenCalled()
    expect(screen.text()).toMatch(/This cannot be undone\./)
    await screen.press('Yes, delete everything')
    expect(onForget).toHaveBeenCalledTimes(1)
    // Unconfirmed is not "still there": it may have been deleted, or may not (docs/DECISIONS.md Part 34).
    expect(screen.text()).toMatch(/We could not confirm that your kept map and the count of your steps were deleted\. They may have been, or they may not\./)
    expect(screen.text()).not.toMatch(/is still held|are still held/)
    expect(screen.text()).toMatch(/We could not check whether anything from an earlier attempt is still waiting on this phone/)
    expect(screen.text()).toMatch(/BCDFGH/)
    // The disclosure about the marker is still above the controls, whatever the outcome.
    expect(screen.text()).toMatch(/This deletion marker contains no steps or answers/)
  })
})
