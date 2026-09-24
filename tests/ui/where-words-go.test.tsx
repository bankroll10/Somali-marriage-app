// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { seedDemo } from '../../src/lib/demo'
import { CONTACT_EMAIL, GUIDE_SOURCE, OPERATOR } from '../../src/lib/site'
import { Phone, onPhone, reload } from '../support/device'
import { mount } from '../support/render'
import { blobs, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * Where her words go, said where they leave, and who answers for it.
 *
 * The guide's header said "private" while every message it sent went to
 * Anthropic, Home's ask box sent without a word about where, and nothing
 * named who runs Niyyah (docs/DECISIONS.md, the completion review, B2).
 */

beforeEach(() => {
  blobs.reset()
  serve()
  onPhone(new Phone('notice'))
  seedDemo()
})
afterEach(() => {
  reload()
  vi.unstubAllGlobals()
})

describe('where her words go', () => {
  it('Home says who answers before she sends, and the guide says it in its header', async () => {
    const m = await mount(<App entry={null} />)
    expect(m.text()).toContain(GUIDE_SOURCE)
    expect(GUIDE_SOURCE).toMatch(/Claude, made by Anthropic/)
    await m.press(/^Talk to your guide/)
    await m.press(/^Wise Auntie/)
    expect(m.text()).toMatch(/answered by Claude, made by Anthropic/)
    expect(m.text()).not.toMatch(/· private/)
    m.unmount()
  })

  it('Trust names who runs Niyyah and how to reach them, set or not', async () => {
    const m = await mount(<App entry={null} />)
    await m.press(/^Your privacy/)
    expect(OPERATOR.trim()).not.toBe('')
    expect(m.text()).toContain(`Niyyah is run by ${OPERATOR}.`)
    expect(m.text()).toMatch(/complain to the data-protection authority where you live/)
    const mail = [...m.container.querySelectorAll('a')].find((a) => a.closest('section')?.textContent?.includes('Niyyah is run by'))
    expect(mail?.getAttribute('href')).toBe(`mailto:${CONTACT_EMAIL}`)
    m.unmount()
  })
})
