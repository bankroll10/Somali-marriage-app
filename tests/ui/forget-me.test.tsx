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

  it('leaves the deletion flow as it was: ask, confirm, one call; and a failure still names what is held', async () => {
    const onForget = vi.fn().mockResolvedValue({ map: true, progress: false, couple: true, intro: true, code: 'BCDFGH' })
    screen = await mount(<ForgetMe onForget={onForget} />)
    expect(screen.has('Forget me')).toBe(true)
    expect(screen.has('Yes, delete everything')).toBe(false)
    await screen.press('Forget me')
    expect(onForget).not.toHaveBeenCalled()
    expect(screen.text()).toMatch(/This cannot be undone\./)
    await screen.press('Yes, delete everything')
    expect(onForget).toHaveBeenCalledTimes(1)
    expect(screen.text()).toMatch(/We could not reach the count of your steps just now, so it is still held/)
    expect(screen.text()).toMatch(/BCDFGH/)
  })
})
