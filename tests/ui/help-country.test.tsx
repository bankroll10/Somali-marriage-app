// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HelpLine from '../../src/components/HelpLine'
import { COUNTRY_IDS } from '../../src/data/countries'
import { HELP } from '../../src/data/help'
import { Phone, onPhone, reload } from '../support/device'
import { mount, type Mounted } from '../support/render'

/**
 * The urgent line when nobody has said where she is (docs/DECISIONS.md Part 26).
 *
 * Someone who comes in through a tool — the read, the eleven — never sets a
 * city, so the line under a caution was an emergency sentence for four regions
 * and no one to call. Where an urgent abuse line has no line for her country,
 * it asks, in place, and shows the line for the one she names. The choice
 * lives in the component only.
 */

let phone: Phone
let screen: Mounted | undefined
const fetches = vi.fn()

beforeEach(() => {
  phone = onPhone(new Phone('help'))
  fetches.mockReset()
  vi.stubGlobal('fetch', fetches)
})
afterEach(() => {
  screen?.unmount()
  screen = undefined
  reload()
  vi.unstubAllGlobals()
})

const progress = (identity: object) => phone.storage.set('niyyah.intake.v1', JSON.stringify({ identity, stage: 'talking', situated: true }))
const select = () => screen!.container.querySelector('select') as HTMLSelectElement | null

async function choose(value: string) {
  const el = select()!
  await act(async () => {
    el.value = value
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('HelpLine, urgent, with no country on the phone', () => {
  it('asks where she is, with a visible label, and lists only countries that have a line', async () => {
    screen = await mount(<HelpLine urgent />)
    const el = select()!
    expect(el).toBeTruthy()
    const label = screen.container.querySelector(`label[for="${el.id}"]`)
    expect(label?.textContent).toMatch(/Where are you\?/)
    const offered = [...el.options].map((o) => o.value).filter(Boolean)
    expect(offered.sort()).toEqual(COUNTRY_IDS.filter((id) => HELP[id].line).sort())
    expect(offered).not.toContain('so')
    expect(offered).not.toContain('other')
  })

  it('still says the emergency sentence, unchanged, before she answers', async () => {
    screen = await mount(<HelpLine urgent />)
    expect(screen.text()).toContain('If you are in danger now, call your local emergency number (911 in the US and Canada, 999 in the UK, 112 across Europe, 000 in Australia).')
    expect(screen.text()).not.toMatch(/To talk to someone now/)
  })

  it('shows that country’s emergency number and free line once she picks, and a dialable link', async () => {
    screen = await mount(<HelpLine urgent />)
    await choose('uk')
    expect(screen.text()).toContain('call 999')
    expect(screen.text()).toContain('To talk to someone now, free: National Domestic Abuse Helpline, 0808 2000 247.')
    const href = [...screen.container.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(href).toContain('tel:08082000247')
    await choose('us')
    expect(screen.text()).toContain('1-800-799-7233')
    expect(screen.text()).not.toContain('0808 2000 247')
    // Back to nothing chosen: back to the generic sentence.
    await choose('')
    expect(screen.text()).toContain('your local emergency number (911 in the US')
  })

  it('keeps the choice in the component: nothing is written to the phone, nothing is sent', async () => {
    screen = await mount(<HelpLine urgent />)
    const before = phone.keys()
    await choose('ca')
    expect(phone.keys()).toEqual(before)
    expect(fetches).not.toHaveBeenCalled()
    // A new mount asks again.
    screen.unmount()
    screen = await mount(<HelpLine urgent />)
    expect(select()!.value).toBe('')
  })

  it('also asks on a phone whose country has no line (Somalia, somewhere else)', async () => {
    progress({ scene: 'other', country: 'so' })
    screen = await mount(<HelpLine urgent />)
    expect(select()).toBeTruthy()
    await choose('ke')
    expect(screen.text()).toContain('National GBV Helpline, 1195')
  })
})

describe('HelpLine, everywhere it must stay as it was', () => {
  it('a phone that knows her country is shown the line with no question', async () => {
    progress({ scene: 'twin-cities', gender: 'woman' })
    screen = await mount(<HelpLine urgent />)
    expect(select()).toBeNull()
    expect(screen.text()).toContain('If you are in danger now, call 911. To talk to someone now, free: National Domestic Violence Hotline, 1-800-799-7233.')
  })

  it('not urgent: the emergency sentence only, no question', async () => {
    screen = await mount(<HelpLine />)
    expect(select()).toBeNull()
    expect(screen.text()).not.toMatch(/Where are you\?/)
  })

  it('a crisis line, and a line shown under another one, never ask', async () => {
    screen = await mount(
      <>
        <HelpLine kind="crisis" />
        <HelpLine urgent lineOnly />
      </>,
    )
    expect(select()).toBeNull()
    expect(screen.text()).toContain('A crisis line, where there is one: 988 in the US and Canada, 116 123 in the UK.')
  })
})
