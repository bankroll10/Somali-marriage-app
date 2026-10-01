// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HelpLine from '../../src/components/HelpLine'
import type { Help } from '../../src/data/help'
import { loadProgress } from '../../src/lib/storage'
import { Phone, onPhone, reload } from '../support/device'
import { mount, type Mounted } from '../support/render'

/**
 * The Guide's two support blocks under one country question (docs/DECISIONS.md
 * Part 29). Part 26 left it that the picked country updated the abuse line
 * only, and the crisis line next to it kept its fallback. One HelpLine now
 * owns the temporary choice and shows both blocks from it.
 *
 * Everything is synthetic: seeded phones and a stubbed network. The two extra
 * countries below exist only in this file, to give the table a country whose
 * two lines differ in availability, which no real row does.
 */

const { synthetic } = vi.hoisted(() => ({ synthetic: {} as Record<string, Help> }))
vi.mock('../../src/data/help', async (original) => {
  const real = await original<typeof import('../../src/data/help')>()
  return { ...real, helpFor: (country?: string) => (country && synthetic[country]) || real.helpFor(country) }
})
vi.mock('../../src/data/countries', async (original) => {
  const real = await original<typeof import('../../src/data/countries')>()
  return {
    ...real,
    countries: [
      ...real.countries,
      { id: 'yy', label: 'Synthetic, crisis line only', within: 'yy' },
      { id: 'zz', label: 'Synthetic, abuse line only', within: 'zz' },
    ],
  }
})
synthetic.yy = { emergency: '000', crisis: { name: 'Synthetic Crisis Line', number: '111 222' } }
synthetic.zz = { emergency: '000', line: { name: 'Synthetic Abuse Line', number: '333 444' } }

const GENERIC_EMERGENCY = 'If you are in danger now, call your local emergency number (911 in the US and Canada, 999 in the UK, 112 across Europe, 000 in Australia).'
const GENERIC_CRISIS = 'A crisis line, where there is one: 988 in the US and Canada, 116 123 in the UK.'
const UNLISTED = 'We don’t have a local support line listed for this location.'

let phone: Phone
let screen: Mounted | undefined
const fetches = vi.fn()

beforeEach(() => {
  phone = onPhone(new Phone('help-pair'))
  fetches.mockReset()
  vi.stubGlobal('fetch', fetches)
})
afterEach(() => {
  screen?.unmount()
  screen = undefined
  reload()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const progress = (identity: object) => phone.storage.set('niyyah.intake.v1', JSON.stringify({ identity, stage: 'talking', situated: true }))
const select = () => screen!.container.querySelector('select') as HTMLSelectElement | null
const tels = () => [...screen!.container.querySelectorAll('a')].map((a) => a.getAttribute('href')).filter((h) => h?.startsWith('tel:'))
/** The first two paragraphs are the abuse block and the crisis block; the third is the selector's note. */
const blocks = () => {
  const ps = [...screen!.container.querySelectorAll('p')].map((p) => (p.textContent ?? '').replace(/\s+/g, ' ').trim())
  return { abuse: ps[0], crisis: ps[1] }
}

async function choose(value: string) {
  const el = select()!
  await act(async () => {
    el.value = value
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('HelpLine urgent withCrisis, with no country on the phone', () => {
  it('shows one selector, after both blocks, labelled for it, and promises no service', async () => {
    screen = await mount(<HelpLine urgent withCrisis />)
    expect(screen.container.querySelectorAll('select')).toHaveLength(1)
    const el = select()!
    expect(el.value).toBe('')
    expect(screen.container.querySelectorAll(`label[for="${el.id}"]`)).toHaveLength(1)
    expect(screen.container.querySelector(`label[for="${el.id}"]`)?.textContent).toBe('Choose your country to see available support.')
    expect(el.className).toContain('min-h-11')
    // Both blocks come first, and the one control follows them.
    const [abuse, crisis] = [...screen.container.querySelectorAll('p')]
    expect(abuse.compareDocumentPosition(crisis) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(crisis.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Nothing is chosen, so both blocks say what they said before there was a selector.
    expect(blocks()).toEqual({ abuse: GENERIC_EMERGENCY, crisis: GENERIC_CRISIS })
    expect(tels()).toEqual([])
    expect(screen.container.querySelectorAll('[aria-live], [role="status"], [role="alert"]')).toHaveLength(0)
  })

  it('supported, unsupported, supported, empty, and a country whose crisis line keeps hours: both blocks follow, nothing stale', async () => {
    screen = await mount(<HelpLine urgent withCrisis />)

    await choose('uk')
    expect(blocks()).toEqual({
      abuse: 'If you are in danger now, call 999. To talk to someone now, free: National Domestic Abuse Helpline, 0808 2000 247.',
      crisis: 'To talk to someone: Samaritans, 116 123.',
    })
    expect(tels()).toEqual(['tel:999', 'tel:08082000247', 'tel:116123'])

    // Somalia has no number we could confirm: every service and link from the UK is gone,
    // the abuse block says so once, the crisis block keeps its country-qualified fallback.
    await choose('so')
    expect(blocks()).toEqual({ abuse: `${GENERIC_EMERGENCY} ${UNLISTED}`, crisis: GENERIC_CRISIS })
    expect(tels()).toEqual([])
    expect(screen.text()).not.toContain('Samaritans')
    expect(screen.text()).not.toContain('0808 2000 247')
    expect(screen.text().split(UNLISTED)).toHaveLength(2)

    await choose('other')
    expect(blocks()).toEqual({ abuse: `${GENERIC_EMERGENCY} ${UNLISTED}`, crisis: GENERIC_CRISIS })
    expect(tels()).toEqual([])

    await choose('us')
    expect(blocks()).toEqual({
      abuse: 'If you are in danger now, call 911. To talk to someone now, free: National Domestic Violence Hotline, 1-800-799-7233.',
      crisis: 'To talk to someone: 988 Suicide & Crisis Lifeline, 988.',
    })
    expect(tels()).toEqual(['tel:911', 'tel:18007997233', 'tel:988'])
    expect(screen.text()).not.toContain('Samaritans')
    expect(screen.text()).not.toContain('0808 2000 247')
    expect(screen.text()).not.toContain(UNLISTED)

    // Cleared: exactly the state before she chose.
    await choose('')
    expect(blocks()).toEqual({ abuse: GENERIC_EMERGENCY, crisis: GENERIC_CRISIS })
    expect(tels()).toEqual([])
    expect(screen.text()).not.toContain('988 Suicide')

    // The crisis lines of Denmark, Kenya and the UAE are not round the clock, and say so;
    // the abuse line is the one that is "free".
    await choose('dk')
    expect(blocks()).toEqual({
      abuse: 'If you are in danger now, call 112. To talk to someone now, free: Lev Uden Vold, 1888.',
      crisis: 'To talk to someone: Livslinien, 70 201 201 (daily, 09:00–05:00).',
    })
    expect(tels()).toEqual(['tel:112', 'tel:1888', 'tel:70201201'])
    await choose('ke')
    expect(blocks().crisis).toBe('To talk to someone: Befrienders Kenya, +254 722 178 177 (weekdays, 9am–5pm).')
    expect(tels()).toEqual(['tel:999', 'tel:1195', 'tel:+254722178177'])
  })

  it('a country whose two lines differ in availability: each block follows its own listing', async () => {
    screen = await mount(<HelpLine urgent withCrisis />)

    // A crisis line and no abuse line: the abuse block says it has none; the crisis block shows its own.
    await choose('yy')
    expect(blocks()).toEqual({
      abuse: `If you are in danger now, call 000. ${UNLISTED}`,
      crisis: 'To talk to someone: Synthetic Crisis Line, 111 222.',
    })
    expect(tels()).toEqual(['tel:000', 'tel:111222'])

    // An abuse line and no crisis line: the abuse block shows it, no "not listed" sentence is made up,
    // and the crisis block keeps the fallback it has when no crisis line is known.
    await choose('zz')
    expect(blocks()).toEqual({
      abuse: 'If you are in danger now, call 000. To talk to someone now, free: Synthetic Abuse Line, 333 444.',
      crisis: GENERIC_CRISIS,
    })
    expect(tels()).toEqual(['tel:000', 'tel:333444'])
    expect(screen.text()).not.toContain(UNLISTED)
    expect(screen.text()).not.toContain('Synthetic Crisis Line')
    expect(screen.text()).not.toContain('111 222')

    await choose('')
    expect(blocks()).toEqual({ abuse: GENERIC_EMERGENCY, crisis: GENERIC_CRISIS })
    expect(tels()).toEqual([])
  })

  it('keeps the select mounted and focused across every change, and reaches the links before it', async () => {
    screen = await mount(<HelpLine urgent withCrisis />)
    const el = select()!
    await act(async () => el.focus())
    expect(document.activeElement).toBe(el)
    for (const id of ['uk', 'so', 'us', 'other', 'dk', '', 'yy', 'zz']) {
      await choose(id)
      expect(select(), id).toBe(el)
      expect(document.activeElement, id).toBe(el)
      expect(el.isConnected, id).toBe(true)
    }
    await choose('uk')
    // Reading and tab order: the emergency link, the two lines, then the control that governs them.
    const order = [...screen.container.querySelectorAll('a[href], select')].map((n) => (n.tagName === 'SELECT' ? 'select' : n.getAttribute('href')))
    expect(order).toEqual(['tel:999', 'tel:08082000247', 'tel:116123', 'select'])
  })

  it('writes nothing and sends nothing: storage keys and values, identity, requests and the address are unchanged', async () => {
    const identity = { gender: 'woman', adult: true, scene: 'other', country: 'so' }
    progress(identity)
    const beacon = vi.fn()
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beacon })
    const xhr = vi.spyOn(XMLHttpRequest.prototype, 'open')
    sessionStorage.clear()
    screen = await mount(<HelpLine urgent withCrisis />)

    // Everything after the app has settled: the selection window.
    const held = () => JSON.stringify([...phone.storage].sort())
    const session = () => JSON.stringify(Object.entries(sessionStorage).sort())
    const where = () => `${location.href}|${history.length}|${document.cookie}`
    const [before, sessionBefore, whereBefore] = [held(), session(), where()]
    for (const id of ['uk', 'so', 'us', 'other', 'dk', 'yy', 'zz', '']) await choose(id)

    expect(held()).toBe(before)
    expect(session()).toBe(sessionBefore)
    expect(where()).toBe(whereBefore)
    expect(loadProgress()?.identity).toEqual(identity)
    expect(fetches).not.toHaveBeenCalled()
    expect(beacon).not.toHaveBeenCalled()
    expect(xhr).not.toHaveBeenCalled()
  })

  it('a new mount asks again: the choice is discarded with the blocks', async () => {
    screen = await mount(<HelpLine urgent withCrisis />)
    await choose('uk')
    expect(tels()).toContain('tel:116123')
    screen.unmount()
    screen = await mount(<HelpLine urgent withCrisis />)
    expect(select()!.value).toBe('')
    expect(blocks()).toEqual({ abuse: GENERIC_EMERGENCY, crisis: GENERIC_CRISIS })
  })
})

describe('HelpLine urgent withCrisis, with a country on the phone', () => {
  it('a country with lines: both blocks from it, no question, as before', async () => {
    progress({ scene: 'twin-cities', gender: 'woman' })
    screen = await mount(<HelpLine urgent withCrisis />)
    expect(select()).toBeNull()
    expect(blocks()).toEqual({
      abuse: 'If you are in danger now, call 911. To talk to someone now, free: National Domestic Violence Hotline, 1-800-799-7233.',
      crisis: 'To talk to someone: 988 Suicide & Crisis Lifeline, 988.',
    })
    expect(tels()).toEqual(['tel:911', 'tel:18007997233', 'tel:988'])
  })

  it('a saved country with no line (Somalia): asks, an explicit choice applies to both, clearing restores the saved default', async () => {
    progress({ scene: 'other', country: 'so' })
    screen = await mount(<HelpLine urgent withCrisis />)
    expect(select()).toBeTruthy()
    // Known to be Somalia, nothing said yet: no claim about listings.
    expect(blocks()).toEqual({ abuse: GENERIC_EMERGENCY, crisis: GENERIC_CRISIS })
    await choose('ke')
    expect(blocks()).toEqual({
      abuse: 'If you are in danger now, call 999. To talk to someone now, free: National GBV Helpline, 1195.',
      crisis: 'To talk to someone: Befrienders Kenya, +254 722 178 177 (weekdays, 9am–5pm).',
    })
    await choose('')
    expect(blocks()).toEqual({ abuse: GENERIC_EMERGENCY, crisis: GENERIC_CRISIS })
    expect(tels()).toEqual([])
  })
})
