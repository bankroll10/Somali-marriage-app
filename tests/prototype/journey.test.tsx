// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOTH_WAYS, FIRMNESS } from '../../src/prototype/match/criteria'
import MatchPrototype from '../../src/prototype/match/MatchPrototype'
import { accessibleName, audit } from '../support/a11y'
import { mount, type Mounted } from '../support/render'

/**
 * JOURNEY — the matching prototype, as a person drives it (docs/MATCH-PROTOTYPE.md).
 *
 * The brief, in order: intentions and practical points with written answers; an
 * explicit requirement or preference on each; a limited set of suggestions with
 * no photos; an explanation that labels what is fixed text; private interest;
 * a conversation that either person may open; photos that are optional, explicit
 * and per connection; and disconnect, block and report in view. Every test runs
 * under spies that fail the test if anything touches the network or storage.
 */

const touched: string[] = []
let before: { cookie: string }

beforeEach(() => {
  touched.length = 0
  before = { cookie: document.cookie }
  vi.stubGlobal('fetch', (...a: unknown[]) => {
    touched.push(`fetch ${String(a[0])}`)
    return Promise.reject(new Error('the prototype must not use the network'))
  })
  vi.stubGlobal(
    'XMLHttpRequest',
    class {
      constructor() {
        touched.push('XMLHttpRequest')
      }
    },
  )
  vi.stubGlobal(
    'WebSocket',
    class {
      constructor() {
        touched.push('WebSocket')
      }
    },
  )
  if (typeof navigator !== 'undefined') Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: () => touched.push('sendBeacon') })
  for (const m of ['getItem', 'setItem', 'removeItem', 'clear', 'key'] as const) {
    vi.spyOn(Storage.prototype, m).mockImplementation(() => {
      touched.push(`Storage.${m}`)
      return null as never
    })
  }
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    get() {
      touched.push('indexedDB')
      return undefined
    },
  })
})

afterEach(() => {
  expect(touched).toEqual([])
  expect(document.cookie).toBe(before.cookie)
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete (globalThis as { indexedDB?: unknown }).indexedDB
})

const inputs = (m: Mounted) => [...m.container.querySelectorAll('input, textarea')] as HTMLInputElement[]
const field = (m: Mounted, name: string | RegExp) => inputs(m).find((f) => (typeof name === 'string' ? accessibleName(f).includes(name) : name.test(accessibleName(f))))
const tick = async (m: Mounted, name: string | RegExp) => {
  const el = field(m, name)
  if (!el) throw new Error(`no choice named ${String(name)}`)
  await act(async () => {
    el.click()
  })
  await m.settle()
}
const buttons = (m: Mounted, name: RegExp | string) =>
  [...m.container.querySelectorAll('button')].filter((b) => (typeof name === 'string' ? accessibleName(b).includes(name) : name.test(accessibleName(b)))) as HTMLButtonElement[]
/** Press the last control with this name: a sheet's own button follows the row button that opened it. */
const pressLast = async (m: Mounted, name: RegExp | string) => {
  const b = buttons(m, name).at(-1)
  if (!b) throw new Error(`nothing named ${String(name)}`)
  await act(async () => {
    b.click()
  })
  await m.settle()
}
const h1s = (m: Mounted) => [...m.container.querySelectorAll('h1')].map((h) => h.textContent)
const back = (m: Mounted) => m.press('Back')
/** What a person sees on the screen: the page without the banner and without the Prototype controls panel. */
const screenText = (m: Mounted) => {
  const main = m.container.querySelector('main')!.cloneNode(true) as HTMLElement
  main.querySelectorAll('details').forEach((d) => d.remove())
  return (main.textContent ?? '').replace(/\s+/g, ' ')
}

const SETUP_H1S = ['About you.', 'Timing.', 'Children.', 'Practice.', 'City.', 'Work.', 'Household.', 'In your own words.', 'Check before you see anyone.']

/** The items under a heading on Your people, or null when the heading is not on screen. */
const under = (m: Mounted, heading: string): string[] | null => {
  const h = [...m.container.querySelectorAll('main h2')].find((x) => x.textContent === heading)
  if (!h) return null
  const list = h.nextElementSibling
  return list ? [...list.querySelectorAll('li')].map((li) => li.textContent ?? '') : []
}

async function toSuggestions(m: Mounted, side: 'woman' | 'man' = 'woman', sample = 0) {
  await tick(m, side === 'woman' ? 'I am a woman' : 'I am a man')
  await act(async () => {
    buttons(m, 'Start from this sample')[sample].click()
  })
  await m.settle()
  for (const step of SETUP_H1S) {
    expect(h1s(m)).toEqual([step])
    await m.press(step.startsWith('Check') ? 'Show me suggestions' : 'Continue')
  }
  expect(h1s(m)).toEqual(['Your suggestions.'])
}

describe('the whole journey, as a woman', () => {
  it('goes from answers to an open conversation, with each step as the brief says', async () => {
    const m = await mount(<MatchPrototype />)
    // Front: made-up answers only, state in memory, and what is not used.
    expect(m.text()).toContain('Prototype. The people here are made up. Nothing you type is saved or sent.')
    expect(m.text()).toContain('Use made-up answers too: no real names, and no personal or contact information.')
    expect(m.text()).toContain('What you type stays in memory in this tab and is cleared when you reload it.')
    expect(m.text()).toContain('no AI model is called')
    expect(m.text()).not.toMatch(/real answers/i)
    expect(m.text()).toContain('Your private tools (the map, the read, the eleven, the Guide) are not used here')

    await toSuggestions(m)
    // Suggestions: three, no photo, no score, no ranking, no count of people left out.
    const cards = [...m.container.querySelectorAll('li h2')].map((h) => h.textContent)
    expect(cards).toEqual(['Abdi', 'Liban', 'Yusuf'])
    expect(m.text()).toContain('in no particular order. There is no score and no ranking.')
    expect(m.text()).not.toMatch(/\d\s?%|compatib|match(es)? for you|swipe/i)
    expect(m.container.querySelector('img')).toBeNull()
    expect(m.text()).toContain('People appear here only when you and they each meet the other’s requirements. This prototype checks six points only.')

    // A suggestion: derived comparisons, labelled fixtures, no photo, a private choice.
    await m.press('Read more about Abdi')
    expect(m.text()).toContain('No photo is part of a suggestion.')
    expect(m.text()).toContain('Abdi said: “Prayer is steady and central to my days”. That works for you.')
    const fixtures = [...m.container.querySelectorAll('section[aria-labelledby^="fx-"]')]
    expect(fixtures).toHaveLength(1)
    for (const f of fixtures) {
      expect(f.textContent).toContain('Prototype fixture')
      expect(f.textContent).toContain('No model was called')
    }
    expect(m.text()).toContain('Interest is private')
    expect(m.has('Block')).toBe(true)
    expect(m.has('Report')).toBe(true)

    await m.press('I’m interested')
    expect(h1s(m)).toEqual(['Your people.'])
    expect(m.text()).toContain('You chose each other. A conversation with Abdi is open, and either of you can write first.')
    expect(m.text()).toContain('No photos have been shared: each of you decides that separately.')
    await back(m)
    // Interest where the other person has not chosen: recorded in the prototype, nothing implies durable saving, nobody is told.
    await m.press('Read more about Liban')
    await m.press('I’m interested')
    expect(m.text()).toContain('Interest recorded in this prototype. Liban is not told.')
    expect(screenText(m)).not.toMatch(/\bsaved\b/)
    expect(m.has('Open conversation with Liban')).toBe(false)
    expect(screenText(m)).not.toMatch(/Liban.*(chose|chosen) you/)
    m.unmount()
  })

  it('opens a conversation either person may start, and keeps photos per connection and per direction', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Abdi')
    await m.press('I’m interested')
    await back(m)
    await m.press('Read more about Yusuf')
    await m.press('I’m interested')
    expect(m.has('Open conversation with Abdi')).toBe(true)
    expect(m.has('Open conversation with Yusuf')).toBe(true)

    // Abdi: the tester writes first, then he writes (simulated), then photos.
    await m.press('Open conversation with Abdi')
    expect(m.text()).toContain('Prototype messages stay in this tab. Nothing is delivered to anyone.')
    expect(m.text()).toContain('Either of you can write first.')
    await m.type('Write to Abdi', 'Salaam. A made-up first line.')
    await m.press('Send')
    expect(m.text()).toContain('Salaam. A made-up first line.')
    await m.press(/Simulate: Abdi writes “Salaam\. I read your words/)
    expect(m.text()).toContain('Abdi (simulated)')
    // Nothing shared by opening the conversation, in either direction.
    expect(m.text()).toContain('Not shared with Abdi.')
    expect(m.text()).toContain('Abdi has not shared a photo with you.')
    expect(m.text()).not.toMatch(/photo — placeholder/)
    // Sharing needs an explicit confirmation.
    await m.press('Share my photo with Abdi')
    expect(m.text()).toContain('Share your photo with Abdi? He will be able to see it in this conversation only.')
    expect(m.text()).not.toContain('Shared with Abdi only')
    await m.press('Not now')
    expect(m.text()).toContain('Not shared with Abdi.')
    await m.press('Share my photo with Abdi')
    await m.press('Share with Abdi')
    expect(m.text()).toContain('Shared with Abdi only. This is a placeholder: no image exists.')
    await tick(m, /Simulate: Abdi shares his photo/)
    expect(m.text()).toContain('Simulated: Abdi chose to share his photo with you.')
    expect(m.text().match(/photo — placeholder/g)).toHaveLength(2)
    expect(m.text()).toContain('Someone who has already seen a photo may have kept it.')

    // Yusuf: nothing Abdi did reaches this conversation.
    await back(m)
    await m.press('Open conversation with Yusuf')
    expect(m.text()).toContain('Not shared with Yusuf.')
    expect(m.text()).toContain('Yusuf has not shared a photo with you.')
    expect(m.text()).not.toMatch(/photo — placeholder/)
    expect(m.text()).toContain('Either of you can write first.')
    expect(m.text()).not.toContain('A made-up first line.')
    // Yusuf writes first, then his photo is shared from his side only.
    await m.press(/Simulate: Yusuf writes “Salaam\. Where do you see yourself living/)
    expect(m.text()).toContain('Yusuf (simulated)')
    await tick(m, /Simulate: Yusuf shares his photo/)
    expect(m.text()).toContain('Not shared with Yusuf.')
    expect(m.text().match(/photo — placeholder/g)).toHaveLength(1)
    // And back in Abdi's, his and hers are unchanged.
    await back(m)
    await m.press('Open conversation with Abdi')
    expect(m.text()).toContain('Shared with Abdi only')
    expect(m.text().match(/photo — placeholder/g)).toHaveLength(2)
    m.unmount()
  })

  it('keeps disconnect, block and report in view, and says only what the prototype does', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Abdi')
    await m.press('I’m interested')
    await m.press('Open conversation with Abdi')
    for (const name of ['Disconnect', 'Block', 'Report']) expect(m.has(name), name).toBe(true)

    // Report: reasons, a plain statement that no one receives it, and the lines for danger.
    await m.press('Report')
    expect(m.text()).toContain('Prototype: no one will receive this and no one will review it.')
    await tick(m, 'Harassment or threats')
    await m.press('Record this report')
    expect(m.text()).toContain('Report recorded in this prototype. Nobody received it and nobody will review it.')
    expect(m.text()).toContain('If you are in danger now: 911 in the US and Canada')
    expect(m.text()).not.toMatch(/we will (review|remove|delete|investigate)|has been (reviewed|removed|deleted|escalated)|moderator|our team/i)

    // Disconnect describes a simulated notification and no deletion.
    await m.press('Disconnect')
    expect(m.text()).toContain('In a product, Abdi would be told it has ended. Here that notification is simulated and nothing is delivered.')
    expect(m.text()).toContain('Nothing is deleted anywhere, because nothing was ever stored.')
    await pressLast(m, 'Disconnect')
    expect(h1s(m)).toEqual(['Your people.'])
    expect(m.text()).toContain('The conversation with Abdi has ended. In a product Abdi would be told; here that is simulated.')
    expect(m.text()).toContain('Abdi: conversation ended')
    // A disconnected conversation stays apart from the people passed on.
    expect(under(m, 'Not shown again')).toEqual(['Abdi: conversation ended'])
    expect(under(m, 'Passed on')).toBeNull()
    expect(m.has('Open conversation with Abdi')).toBe(false)
    m.unmount()
  })

  it('blocks from a suggestion: removed for the session, not told, nothing enforced beyond the tab', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Liban')
    await m.press('Block')
    expect(m.text()).toContain('Liban is removed and will not be suggested to you again in this tab. He is not told.')
    expect(m.text()).toContain('Nothing is enforced beyond this tab')
    await pressLast(m, 'Block Liban')
    expect(m.text()).toContain('Liban is blocked in this tab and will not be suggested again.')
    await back(m)
    expect(m.has('Read more about Liban')).toBe(false)
    m.unmount()
  })
})

describe('focus is never dropped on the page', () => {
  it('moves to the confirmation, back to the control it came from, and back from a safety sheet', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Abdi')
    await m.press('I’m interested')
    await m.press('Open conversation with Abdi')
    const active = () => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? ''
    // Opening the confirmation puts focus on it; "Not now" returns it to the share button.
    await m.press('Share my photo with Abdi')
    expect(active()).toBe('Confirm sharing your photo')
    await m.press('Not now')
    expect(active()).toBe('Share my photo with Abdi')
    // Confirming puts focus on the control that now stops the sharing.
    await m.press('Share my photo with Abdi')
    await m.press('Share with Abdi')
    expect(active()).toBe('Stop sharing with Abdi')
    // A safety sheet takes focus to its heading, and cancelling returns it to the button that opened it.
    await m.press('Report')
    expect(document.activeElement?.tagName).toBe('H2')
    expect(active()).toBe('Report Abdi')
    await m.press('Cancel')
    expect(active()).toBe('Report')
    m.unmount()
  })
})

describe('the same journey, as a man', () => {
  it('meets the made-up women, with the pronouns of the people shown', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m, 'man')
    expect([...m.container.querySelectorAll('li h2')].map((h) => h.textContent)).toEqual(['Amina', 'Sahra', 'Ladan'])
    await m.press('Read more about Amina')
    expect(m.text()).toContain('On practice, Amina chose “Prayer is steady and central to my days”, a steadier answer than your “I am building the habit”.')
    expect(m.text()).toContain('Amina is told only if she also chooses you, and you can withdraw it until then.')
    m.unmount()
  })
})

describe('honest sample scenarios', () => {
  it('one suggestion: exactly the one person who meets everyone’s requirements', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m, 'woman', 1)
    expect([...m.container.querySelectorAll('li h2')].map((h) => h.textContent)).toEqual(['Hassan'])
    // The footer says nothing about which requirements left people out, and offers no way to loosen them.
    expect(m.text()).not.toMatch(/left some people out|Your requirements on/)
    expect(m.has('Review what you ask for')).toBe(false)
    expect(m.text()).toContain('Differs from what you preferred:')
    expect(m.text()).toContain('Practice: “I practise occasionally”')
    await m.press('Read more about Hassan')
    expect(m.text()).toContain('Hassan’s answer: “I practise occasionally”')
    expect(m.text()).toContain('You preferred: “A partner whose prayer is steady and central to their days”')
    expect(m.container.querySelectorAll('section[aria-labelledby^="fx-"]')).toHaveLength(1)
    m.unmount()
  })

  it('no suggestions: says so plainly, with two equal choices and nothing that pushes a change', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m, 'woman', 2)
    expect(m.container.querySelectorAll('li h2')).toHaveLength(0)
    expect(m.text()).toContain('No one is suggested to you right now.')
    expect(m.text()).toContain('Suggestions appear only when you and the other person each meet the other’s requirements.')
    expect(m.text()).toContain('Nothing is added to this list for any other reason, and nothing refreshes by itself.')
    expect(screenText(m)).not.toMatch(/loosen|relax|widen|broaden|reconsider|adjust|try changing|change what you ask|review what you ask|should change/i)
    // The old no-op and the primary-styled push are gone; the two choices left carry the same weight.
    for (const gone of ['Keep it as it is', 'Review what you ask for', 'Leave']) expect(m.has(gone), gone).toBe(false)
    const see = buttons(m, 'See what I asked for')
    const stop = buttons(m, 'Stop here')
    expect(see).toHaveLength(1)
    expect(stop).toHaveLength(1)
    expect(see[0].className).toBe(stop[0].className)
    // Seeing what was asked changes nothing and still shows no one; stopping starts over.
    await m.press('See what I asked for')
    expect(h1s(m)).toEqual(['Check before you see anyone.'])
    await m.press('Show me suggestions')
    expect(m.container.querySelectorAll('li h2')).toHaveLength(0)
    await m.press('Stop here')
    expect(h1s(m)).toEqual(['A first look at how meeting someone could work.'])
    m.unmount()
  })

  it('fixed text is marked unavailable once an answer changes, while the comparison updates', async () => {
    const m = await mount(<MatchPrototype />)
    await tick(m, 'I am a woman')
    await act(async () => {
      buttons(m, 'Start from this sample')[0].click()
    })
    await m.settle()
    // On the Work step, change the tester's own answer.
    for (let i = 0; i < 5; i++) await m.press('Continue')
    expect(h1s(m)).toEqual(['Work.'])
    await tick(m, 'I am open to either')
    for (const step of ['Continue', 'Continue', 'Continue', 'Show me suggestions']) await m.press(step)
    await m.press('Read more about Liban')
    // Derived from the structured fields, so it follows the edit. The comparison is with what was accepted, not with the new answer.
    expect(m.text()).toContain('Liban’s answer: “I plan to be at home”')
    expect(m.text()).toContain('You preferred: “A partner who plans to work” or “A partner who is open to working or staying at home”')
    // Fixed text, written for the unedited scenario, is not shown as if it still described this tester.
    expect(m.text()).not.toContain('The one difference you marked as a preference is work')
    const blocks = [...m.container.querySelectorAll('section[aria-labelledby^="fx-"]')]
    expect(blocks).toHaveLength(1)
    for (const b of blocks) expect(b.textContent).toContain('Unavailable. This fixed text was written for a sample scenario, and your answers no longer match it.')
    m.unmount()
  })

  it('blank answers have no fixed text at all, and are checked before moving on', async () => {
    const m = await mount(<MatchPrototype />)
    await tick(m, 'I am a man')
    await m.press('Start with blank answers')
    await m.press('Continue')
    expect(m.text()).toContain('Still to fill in: a made-up first name, a made-up age, 18 or over.')
    expect(h1s(m)).toEqual(['About you.'])
    await m.type('A made-up age (18 or over)', '17')
    await m.press('Continue')
    expect(h1s(m)).toEqual(['About you.'])
    m.unmount()
  })

  it('keeps contact details out of the written answers', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    // Back to the words.
    await back(m)
    await back(m)
    expect(h1s(m)).toEqual(['In your own words.'])
    await m.type('What are you looking for in a marriage?', 'Write to me at made.up@example.com')
    expect(m.text()).toContain('That looks like a way to reach you. Keep it out of here.')
    await m.press('Continue')
    expect(h1s(m)).toEqual(['In your own words.'])
    expect(m.text()).toContain('a way to reach you, which belongs in a conversation and not here')
    m.unmount()
  })
})

describe('requirements are read-only once the tester has chosen or passed on someone', () => {
  it('says so on each step, with the choices disabled, and offers a fresh start instead of a quiet reshuffle', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Liban')
    await m.press('Not for me')
    expect(m.text()).toContain('Liban is removed from your suggestions. He is not told.')
    await back(m) // suggestions
    await back(m) // review
    await m.press('Change timing')
    expect(h1s(m)).toEqual(['Timing.'])
    expect(m.text()).toContain('what you ask for is read-only now. Start again to change it.')
    const groups = [...m.container.querySelectorAll('fieldset')]
    expect(groups.length).toBeGreaterThan(0)
    for (const g of groups) expect((g as HTMLFieldSetElement).disabled).toBe(true)
    m.unmount()
  })

  it('is lifted again only when nothing irreversible happened: a withdrawn interest changes nothing for good', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Liban')
    await m.press('I’m interested')
    await m.press('Withdraw interest in Liban')
    await back(m)
    await back(m)
    await m.press('Change timing')
    expect(m.text()).not.toContain('read-only now')
    expect([...m.container.querySelectorAll('fieldset')].some((g) => (g as HTMLFieldSetElement).disabled)).toBe(false)
    m.unmount()
  })
})

describe('every screen', () => {
  it('has one h1, labelled controls, focus on its heading, and the banner; and “what is real here” is reachable', async () => {
    const m = await mount(<MatchPrototype />)
    const seen: string[] = []
    const check = () => {
      expect(audit(m.container)).toEqual([])
      expect(h1s(m)).toHaveLength(1)
      expect(m.text()).toContain('Nothing you type is saved or sent.')
      seen.push(h1s(m)[0]!)
    }
    check()
    await m.press('What is real here, and what is not')
    check()
    expect(m.text()).toContain('There is no upload and no image.')
    expect(m.text()).toContain('Age is shown but not used. Age preferences are not built in this slice')
    expect(m.text()).toContain('provisional prototype choices, not launch policy')
    expect(m.text()).toContain('No AI model is called.')
    await m.press('Start again')
    await toSuggestions(m)
    check()
    await m.press('Read more about Abdi')
    check()
    await m.press('I’m interested')
    check()
    await m.press('Open conversation with Abdi')
    check()
    expect(document.activeElement?.tagName).toBe('H1')
    expect(seen).toEqual(['A first look at how meeting someone could work.', 'What is real here, and what is not.', 'Your suggestions.', 'Abdi', 'Your people.', 'Abdi'])
    m.unmount()
  })
})

// ── MATCH-02: shorter setup, a concise suggestion, withdrawing and undoing ──────────────────────

const pick = (m: Mounted, type: 'radio' | 'checkbox', label: string, nth = 0) => inputs(m).filter((f) => f.type === type && accessibleName(f).includes(label))[nth]
const choose = async (m: Mounted, type: 'radio' | 'checkbox', label: string, nth = 0) => {
  const el = pick(m, type, label, nth)
  if (!el) throw new Error(`no ${type} named ${label}`)
  await act(async () => {
    el.click()
  })
  await m.settle()
}
/** The labels of what is ticked, with the always-visible hint under a firmness choice left off its name. */
const checked = (m: Mounted) =>
  inputs(m)
    .filter((f) => f.checked)
    .map((f) => {
      const n = accessibleName(f)
      return ['Requirement', 'Preference', 'Doesn’t matter'].find((x) => n.startsWith(x)) ?? n
    })
async function startBlank(m: Mounted, side: 'woman' | 'man' = 'woman') {
  await tick(m, side === 'woman' ? 'I am a woman' : 'I am a man')
  await m.press('Start with blank answers')
  await m.type('A made-up first name', 'Maryan')
  await m.type('A made-up age (18 or over)', '30')
}
const statusText = (m: Mounted) => [...m.container.querySelectorAll('[role="status"]')].map((e) => e.textContent).join(' ')

describe('setup, in short steps (MATCH-02)', () => {
  it('takes one point to a step, numbered, asking your answer, then what would work, then how firm', async () => {
    const m = await mount(<MatchPrototype />)
    await startBlank(m)
    expect(h1s(m)).toEqual(['About you.'])
    expect(m.text()).toContain('Step 1 of 8.')
    await m.press('Continue')
    expect(h1s(m)).toEqual(['Timing.'])
    expect(m.text()).toContain('Step 2 of 8.')
    // The order is the point: answers that would work come before how firm.
    const legends = [...m.container.querySelectorAll('legend')].map((l) => l.textContent!.replace(/\s+/g, ' ').trim())
    expect(legends).toEqual([
      'About you When would you like to be married?',
      'What would work for you in a partner Choose every answer that would work. At least one, unless this does not matter to you.',
      'How firm is this?',
    ])
    const [own, would, firm] = [...m.container.querySelectorAll('fieldset')]
    expect(own.compareDocumentPosition(would) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(would.compareDocumentPosition(firm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Nothing is chosen for the person, and what each firmness does is always in view.
    expect(checked(m)).toEqual([])
    expect(m.text()).toContain('Only people who fit are shown to you. People who do not fit are left out, and they are never told.')
    expect(m.text()).toContain('People who differ are still shown to you, and the difference is pointed out.')
    expect(m.text()).toContain(FIRMNESS.find((f) => f.id === 'any')!.full)
    expect(m.text()).toContain(BOTH_WAYS)

    // Each step checks only what it asks, and says which part is missing.
    await m.press('Continue')
    expect(h1s(m)).toEqual(['Timing.'])
    expect(statusText(m)).toContain('Still to do: your answer, an answer that would work (or choose “Doesn’t matter”), how firm this is.')
    await choose(m, 'radio', 'Within a year')
    await m.press('Continue')
    expect(statusText(m)).toContain('Still to do: an answer that would work (or choose “Doesn’t matter”), how firm this is.')
    await choose(m, 'checkbox', 'A partner who wants to marry within a year')
    await m.press('Continue')
    expect(statusText(m)).toContain('Still to do: how firm this is.')
    await choose(m, 'radio', 'Requirement')
    await m.press('Continue')
    expect(h1s(m)).toEqual(['Children.'])
    expect(m.text()).toContain('Step 3 of 8.')
    m.unmount()
  })

  it('keeps every entered answer and choice when going back and forward, step by step', async () => {
    const m = await mount(<MatchPrototype />)
    await startBlank(m)
    await m.press('Continue')
    await choose(m, 'radio', 'In one to two years')
    await choose(m, 'checkbox', 'A partner who wants to marry within a year')
    await choose(m, 'checkbox', 'A partner who wants to marry in one to two years')
    await choose(m, 'radio', 'Preference')
    await m.press('Continue')
    expect(h1s(m)).toEqual(['Children.'])
    await choose(m, 'radio', 'I want children')
    await back(m)
    expect(h1s(m)).toEqual(['Timing.'])
    expect(checked(m)).toEqual(['In one to two years', 'A partner who wants to marry within a year', 'A partner who wants to marry in one to two years', 'Preference'])
    await back(m)
    expect(h1s(m)).toEqual(['About you.'])
    expect(field(m, 'A made-up first name')!.value).toBe('Maryan')
    expect(field(m, 'A made-up age (18 or over)')!.value).toBe('30')
    await m.press('Continue')
    await m.press('Continue')
    expect(h1s(m)).toEqual(['Children.'])
    expect(checked(m)).toEqual(['I want children'])
    m.unmount()
  })

  it('“Doesn’t matter” sets the answers that would work aside, shows them as not used, and gives them back if the person changes their mind', async () => {
    const m = await mount(<MatchPrototype />)
    await startBlank(m)
    await m.press('Continue')
    await choose(m, 'radio', 'Within a year')
    await choose(m, 'checkbox', 'A partner who wants to marry within a year')
    await choose(m, 'checkbox', 'A partner who wants to marry in one to two years')
    await choose(m, 'radio', 'Doesn’t matter')
    const would = [...m.container.querySelectorAll('fieldset')][1] as HTMLFieldSetElement
    expect(would.disabled).toBe(true)
    // The group stays identified while it is set aside, with the reason beneath its name.
    expect(would.querySelector('legend')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('What would work for you in a partner Set aside while this does not matter to you.')
    await m.press('Continue') // no answer that would work is needed
    expect(h1s(m)).toEqual(['Children.'])
    await back(m)
    await choose(m, 'radio', 'Preference')
    expect(((await Promise.resolve([...m.container.querySelectorAll('fieldset')][1])) as HTMLFieldSetElement).disabled).toBe(false)
    expect(checked(m)).toEqual(['Within a year', 'A partner who wants to marry within a year', 'A partner who wants to marry in one to two years', 'Preference'])
    m.unmount()
  })

  it('Review lists each point, shows a “Doesn’t matter” point as not used, and a Change returns to Review', async () => {
    const m = await mount(<MatchPrototype />)
    await tick(m, 'I am a woman')
    await act(async () => {
      buttons(m, 'Start from this sample')[0].click()
    })
    await m.settle()
    // Make Work “Doesn’t matter”, then go to Review.
    for (let i = 0; i < 5; i++) await m.press('Continue')
    expect(h1s(m)).toEqual(['Work.'])
    await choose(m, 'radio', 'Doesn’t matter')
    for (const step of ['Continue', 'Continue', 'Continue']) await m.press(step)
    expect(h1s(m)).toEqual(['Check before you see anyone.'])
    const rows = [...m.container.querySelectorAll('main ul li')].filter((li) => /^(Timing|Children|Practice|City|Work|Household)$/.test(li.querySelector('h3')?.textContent ?? ''))
    expect(rows).toHaveLength(6)
    const text = (name: string) => (rows.find((r) => r.querySelector('h3')!.textContent === name) as HTMLElement).textContent!.replace(/\s+/g, ' ')
    // Three labelled rows: your own answer, what would work in a partner, how firm.
    expect(text('Timing')).toContain('In a partner A partner who wants to marry within a year; A partner who wants to marry in one to two years')
    expect(text('Timing')).toContain('How firm Requirement')
    expect(text('Practice')).toContain('How firm Preference')
    // The setting-aside is shown as what it is. The retained, ignored selections are not presented as active.
    expect(text('Work')).toContain('In a partner Not used: this does not matter to you.')
    expect(text('Work')).toContain('How firm Doesn’t matter')
    expect(text('Work')).not.toContain('A partner who plans to work')
    // Change a point from Review: Continue and Back both come straight back.
    await m.press('Change children')
    expect(h1s(m)).toEqual(['Children.'])
    await m.press('Continue')
    expect(h1s(m)).toEqual(['Check before you see anyone.'])
    await m.press('Change household')
    await back(m)
    expect(h1s(m)).toEqual(['Check before you see anyone.'])
    await m.press('Change name and age')
    expect(h1s(m)).toEqual(['About you.'])
    await m.press('Continue')
    expect(h1s(m)).toEqual(['Check before you see anyone.'])
    await m.press('Change my words')
    expect(h1s(m)).toEqual(['In your own words.'])
    await m.press('Continue')
    expect(h1s(m)).toEqual(['Check before you see anyone.'])
    await m.press('Show me suggestions')
    expect(h1s(m)).toEqual(['Your suggestions.'])
    m.unmount()
  })

  it('every setup step passes the page audit, with one h1 and focus on it', async () => {
    const m = await mount(<MatchPrototype />)
    await tick(m, 'I am a woman')
    await act(async () => {
      buttons(m, 'Start from this sample')[0].click()
    })
    await m.settle()
    for (const step of SETUP_H1S.slice(0, -1)) {
      expect(h1s(m)).toEqual([step])
      expect(audit(m.container)).toEqual([])
      expect(document.activeElement?.tagName).toBe('H1')
      await m.press('Continue')
    }
    m.unmount()
  })
})

describe('the suggestion screen, shorter and led by their words (MATCH-02)', () => {
  it('puts their words first, then concrete differences against what was preferred, then the one labelled block, then the choice', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    // The list shows their own first words and the concrete difference, not only the topic.
    expect(m.text()).toContain('“I am looking for someone kind and patient who wants to build slowly.”')
    expect(m.text()).toContain('Work: “I plan to be at home”')
    expect(m.text()).toContain('and 2 more points')
    expect(m.text()).not.toContain('Meets your requirements.')
    await m.press('Read more about Liban')
    const main = m.container.querySelector('main')!
    const at = (needle: string) => (main.textContent ?? '').indexOf(needle)
    const order = ['In Liban’s words', 'Where you differ', 'Fits what you asked for on:', 'Summary and questions', 'I’m interested']
    const positions = order.map(at)
    for (const [i, p] of positions.entries()) expect(p, order[i]).toBeGreaterThan(-1)
    expect([...positions].sort((a, b) => a - b)).toEqual(positions)
    // Each written answer says what it answers.
    for (const label of ['Looking for', 'How they live', 'Families']) expect(m.text()).toContain(label)
    // The difference is the person’s answer against the answers the tester selected as preferred.
    expect(m.text()).toContain('Liban’s answer: “I plan to be at home”')
    expect(m.text()).toContain('You preferred: “A partner who plans to work” or “A partner who is open to working or staying at home”')
    expect(m.text()).not.toContain('You marked this a preference')
    // A different personal answer that the tester accepted is not a difference: Liban’s timing differs from the tester’s own but works.
    const diffItems = [...main.querySelectorAll('h2#differ ~ ul li')].map((li) => li.textContent)
    expect(diffItems).toHaveLength(1)
    expect(diffItems[0]).toContain('Work.')
    expect(diffItems.join(' ')).not.toContain('Timing.')
    // What fits is one tap away, and the answers that differ from the tester's own stay visible there.
    const details = main.querySelector('details') as HTMLDetailsElement
    expect(details.open).toBe(false)
    expect(details.textContent).toContain('Timing. Liban said: “In one to two years”. That works for you.')
    // One block of simulated notes, one label, one statement that no model was called.
    expect(m.container.querySelectorAll('section[aria-labelledby^="fx-"]')).toHaveLength(1)
    expect(m.text().match(/Prototype fixture/g)).toHaveLength(1)
    expect(m.text()).toContain('No model was called.')
    m.unmount()
  })

  it('says “No differences on your preferences.” when there are none', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Abdi')
    expect(m.text()).toContain('No differences on your preferences.')
    expect(m.text()).toContain('Fits what you asked for on: timing, children, practice, city, work, household.')
    expect(m.text()).not.toMatch(/line up/i)
    // Abdi’s practice answer is not the tester’s own (steady, where hers is building the habit), and it fits what she asked for. The difference stays visible.
    const details = m.container.querySelector('main details')!
    expect(details.textContent).toContain('Practice. Abdi said: “Prayer is steady and central to my days”. That works for you.')
    expect(m.text()).toContain('give the same answers on timing, children, city, work and household')
    expect(m.text()).toContain('On practice, Abdi chose “Prayer is steady and central to my days”, a steadier answer than your “I am building the habit”.')
    m.unmount()
  })
})

describe('withdrawing interest, and undoing “Not for me” (MATCH-02)', () => {
  const activeRole = () => document.activeElement?.getAttribute('role')
  const focusables = (m: Mounted) => [...m.container.querySelectorAll('button, a[href], input, textarea, summary, [tabindex]')]

  it('withdraws from Your people: private, back among the suggestions, and focus lands on the status', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Liban')
    await m.press('I’m interested')
    expect(m.text()).toContain('Interest recorded in this prototype. Liban is not told.')
    expect(m.has('Withdraw interest in Liban')).toBe(true)
    await m.press('Withdraw interest in Liban')
    expect(statusText(m)).toContain('You withdrew your interest in Liban. He was not told, and is not told now. Liban is back in your suggestions.')
    expect(m.has('Withdraw interest in Liban')).toBe(false)
    expect(activeRole()).toBe('status')
    // He is among the people still to decide, and the tester can choose again.
    await m.press('Read more about Liban')
    expect(m.has('I’m interested')).toBe(true)
    expect(m.has('Not for me')).toBe(true)
    m.unmount()
  })

  it('withdraws from the person’s own page too, and focus lands on the status', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Liban')
    await m.press('I’m interested')
    await m.press('Read more about Liban') // from the private choices
    expect(h1s(m)).toEqual(['Liban'])
    expect(m.text()).toContain('Withdrawing is private too: Liban is not told. You can do this until a conversation opens.')
    await m.press('Withdraw interest in Liban')
    expect(h1s(m)).toEqual(['Liban'])
    expect(statusText(m)).toContain('You withdrew your interest in Liban.')
    expect(activeRole()).toBe('status')
    expect(m.has('I’m interested')).toBe(true)
    expect(m.has('Withdraw interest in Liban')).toBe(false)
    m.unmount()
  })

  it('has nothing to withdraw once mutual interest came first, in either order; the way out is Disconnect or Block', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    // Abdi had chosen the tester already: choosing him opens the conversation at once.
    await m.press('Read more about Abdi')
    await m.press('I’m interested')
    expect(m.has('Open conversation with Abdi')).toBe(true)
    expect(m.has('Withdraw interest in Abdi')).toBe(false)
    // Liban chooses second, while the tester is looking at the list of private choices.
    await back(m)
    await m.press('Read more about Liban')
    await m.press('I’m interested')
    expect(m.has('Withdraw interest in Liban')).toBe(true)
    await tick(m, /Simulate: Liban has chosen you/)
    expect(statusText(m)).toContain('You chose each other. A conversation with Liban is open')
    expect(m.has('Withdraw interest in Liban')).toBe(false)
    expect(m.has('Open conversation with Liban')).toBe(true)
    await m.press('Open conversation with Liban')
    for (const name of ['Disconnect', 'Block', 'Report']) expect(m.has(name), name).toBe(true)
    expect(m.has('Withdraw interest')).toBe(false)
    m.unmount()
  })

  it('opens the conversation from the person’s own page when the other person chooses second, with the way in on that page', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Liban')
    await m.press('I’m interested')
    await m.press('Read more about Liban') // from the private choices
    await tick(m, /Simulate: Liban has chosen you/)
    expect(h1s(m)).toEqual(['Liban'])
    expect(statusText(m)).toContain('You chose each other. A conversation with Liban is open')
    expect(m.has('Withdraw interest in Liban')).toBe(false)
    await m.press('Open conversation with Liban')
    expect(h1s(m)).toEqual(['Liban'])
    expect(m.text()).toContain('Prototype messages stay in this tab.')
    expect(m.text()).toContain('Not shared with Liban.')
    m.unmount()
  })

  it('does not bring back a conversation that was disconnected', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Abdi')
    await m.press('I’m interested')
    await m.press('Open conversation with Abdi')
    await m.press('Disconnect')
    await pressLast(m, 'Disconnect')
    expect(h1s(m)).toEqual(['Your people.'])
    expect(under(m, 'Not shown again')).toEqual(['Abdi: conversation ended'])
    expect(under(m, 'Passed on')).toBeNull()
    expect(m.has('Open conversation with Abdi')).toBe(false)
    expect(m.has('Withdraw interest in Abdi')).toBe(false)
    expect(m.has('Undo')).toBe(false)
    // The Prototype controls offer the simulated person no way to start it again.
    expect(inputs(m).some((i) => /Simulate: Abdi has chosen you/.test(accessibleName(i)))).toBe(false)
    expect(m.has('Read more about Abdi')).toBe(false)
    m.unmount()
  })

  it('offers Undo on the confirmation screen at once, right after the confirmation, with the heading focused first', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Liban')
    await m.press('Not for me')
    expect(h1s(m)).toEqual(['Your people.'])
    expect(document.activeElement?.tagName).toBe('H1')
    const region = m.container.querySelector('[role="status"][tabindex="-1"]') as HTMLElement
    expect(region.textContent).toContain('Liban is removed from your suggestions. He is not told.')
    const undo = buttons(m, 'Undo: bring Liban back')[0]
    expect(undo).toBeTruthy()
    // Reading or tabbing on from the heading meets the confirmation, then Undo, with nothing between.
    const f = focusables(m)
    expect(f.indexOf(undo) - 1).toBe(f.indexOf(region))
    const h1 = m.container.querySelector('h1')!
    expect(h1.compareDocumentPosition(region) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(region.compareDocumentPosition(undo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // While Undo is on offer the heading is the true one: passed on, not yet “not shown again”.
    expect(under(m, 'Passed on')).toEqual(['Liban'])
    expect(under(m, 'Not shown again')).toBeNull()
    m.unmount()
  })

  it('keeps Undo through focus moving, scrolling, opening a disclosure and the simulated person acting, then undoes', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Liban')
    await m.press('Not for me')
    const undo = () => buttons(m, 'Undo: bring Liban back')[0]
    expect(undo()).toBeTruthy()
    // Keyboard focus moves around the page.
    await act(async () => {
      buttons(m, 'Read more about Abdi')[0].focus()
    })
    expect(undo()).toBeTruthy()
    await act(async () => {
      undo().focus()
      ;(document.activeElement as HTMLElement).blur()
    })
    expect(undo()).toBeTruthy()
    // Scrolling.
    await act(async () => {
      window.dispatchEvent(new Event('scroll'))
      document.dispatchEvent(new Event('scroll'))
    })
    expect(undo()).toBeTruthy()
    // An informational disclosure opens and closes.
    const details = m.container.querySelector('details') as HTMLDetailsElement
    await act(async () => {
      details.open = true
      details.dispatchEvent(new Event('toggle'))
    })
    expect(undo()).toBeTruthy()
    // The simulated person acts: Liban chooses the tester after being passed on, and Yusuf's choice is toggled.
    await tick(m, /Simulate: Liban has chosen you/)
    await tick(m, /Simulate: Yusuf has chosen you/)
    expect(undo()).toBeTruthy()
    expect(m.has('Open conversation with Liban')).toBe(false) // a pass stands even when the other person has chosen
    await act(async () => {
      details.open = false
      details.dispatchEvent(new Event('toggle'))
    })
    // Undo: back among the suggestions, nothing opened, the focus on the status.
    await m.press('Undo: bring Liban back')
    expect(statusText(m)).toContain('Liban is back in your suggestions.')
    expect(activeRole()).toBe('status')
    expect(m.has('Undo: bring Liban back')).toBe(false)
    expect(under(m, 'Passed on')).toBeNull()
    expect(m.has('Open conversation with Liban')).toBe(false)
    expect(m.has('Read more about Liban')).toBe(true)
    m.unmount()
  })

  it('loses Undo on a later deliberate decision, on leaving the screen, or on a safety action, and a block is never undone', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    // Leaving the screen.
    await m.press('Read more about Liban')
    await m.press('Not for me')
    await back(m)
    await m.press('Your people')
    expect(m.has('Undo')).toBe(false)
    expect(under(m, 'Passed on')).toEqual(['Liban'])
    // A later decision.
    await back(m)
    await m.press('Read more about Yusuf')
    await m.press('Not for me')
    expect(m.has('Undo: bring Yusuf back')).toBe(true)
    expect(m.has('Undo: bring Liban back')).toBe(false)
    await m.press('Read more about Abdi')
    await m.press('I’m interested')
    expect(m.has('Undo')).toBe(false)
    expect(under(m, 'Passed on')).toEqual(['Liban', 'Yusuf'])
    expect(under(m, 'Not shown again')).toBeNull()
    m.unmount()

    const m2 = await mount(<MatchPrototype />)
    await toSuggestions(m2)
    // A safety action, then the block itself.
    await m2.press('Read more about Liban')
    await m2.press('Block')
    await pressLast(m2, 'Block Liban')
    expect(h1s(m2)).toEqual(['Your people.'])
    expect(m2.has('Undo')).toBe(false)
    expect(m2.text()).toContain('Liban is blocked in this tab and will not be suggested again.')
    // A block is final and is listed apart from anyone passed on.
    expect(under(m2, 'Not shown again')).toEqual(['Liban: blocked'])
    expect(under(m2, 'Passed on')).toBeNull()
    m2.unmount()
  })

  it('leaves messaging, photo consent and the safety row working in the other conversations', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Abdi')
    await m.press('I’m interested')
    await back(m)
    await m.press('Read more about Yusuf')
    await m.press('I’m interested')
    await m.press('Read more about Liban') // the private-choices row
    await m.press('I’m interested')
    await m.press('Withdraw interest in Liban')
    // Either person writes first, in two conversations at once.
    await m.press('Open conversation with Abdi')
    await m.type('Write to Abdi', 'Salaam, a made-up line.')
    await m.press('Send')
    await m.press('Share my photo with Abdi')
    await m.press('Share with Abdi')
    expect(m.text()).toContain('Shared with Abdi only.')
    await back(m)
    await m.press('Open conversation with Yusuf')
    expect(m.text()).toContain('Not shared with Yusuf.')
    expect(m.text()).toContain('Either of you can write first.')
    await m.press(/Simulate: Yusuf writes/)
    expect(m.text()).toContain('Yusuf (simulated)')
    for (const name of ['Disconnect', 'Block', 'Report']) expect(m.has(name), name).toBe(true)
    await m.press('Report')
    expect(m.text()).toContain('Prototype: no one will receive this and no one will review it.')
    m.unmount()
  })
})

// ── MATCH-03: less to read at setup, and whose answer each group is ─────────────────────────────

const norm = (t: string | null | undefined) => (t ?? '').replace(/\s+/g, ' ').trim()
const groupNames = (m: Mounted) => [...m.container.querySelectorAll('main fieldset')].map((f) => norm(f.querySelector('legend')?.textContent))
const labelsIn = (fieldset: Element) => [...fieldset.querySelectorAll('label')].map((l) => norm(l.querySelector('span > span')?.textContent))

describe('setup: whose answer it is, and what each firmness means (MATCH-03)', () => {
  /** Answer the topic on screen with the first choices and a Requirement, then go on. */
  async function fillTopic(m: Mounted) {
    await act(async () => {
      const all = (type: string) => [...m.container.querySelectorAll(`main input[type="${type}"]`)] as HTMLInputElement[]
      all('radio')[0].click()
      all('checkbox')[0].click()
      all('radio').find((i) => /^Requirement/.test(accessibleName(i)))!.click()
    })
    await m.settle()
    await m.press('Continue')
  }
  async function toTopic(m: Mounted, name: string) {
    await startBlank(m)
    await m.press('Continue')
    for (const step of ['Timing.', 'Children.', 'Practice.', 'City.', 'Work.', 'Household.']) {
      if (step === name) return
      expect(h1s(m)).toEqual([step])
      await fillTopic(m)
    }
  }

  it('names the three groups on every topic, in order: about you, what would work in a partner, how firm', async () => {
    const m = await mount(<MatchPrototype />)
    await toTopic(m, 'Work.')
    expect(h1s(m)).toEqual(['Work.'])
    expect(groupNames(m)).toEqual([
      'About you After marriage, what do you expect for your own work?',
      'What would work for you in a partner Choose every answer that would work.',
      'How firm is this?',
    ])
    // Your own answers are in the first person; the partner group says “a partner” and means the same options.
    const [own, partner] = [...m.container.querySelectorAll('main fieldset')]
    expect(labelsIn(own)).toEqual(['I plan to work', 'I am open to either', 'I plan to be at home'])
    expect(labelsIn(partner)).toEqual(['A partner who plans to work', 'A partner who is open to working or staying at home', 'A partner who plans to be at home'])
    m.unmount()
  })

  it('shows the full explanation at first use only, with the short definitions always in view after it', async () => {
    const m = await mount(<MatchPrototype />)
    await startBlank(m)
    await m.press('Continue')
    expect(h1s(m)).toEqual(['Timing.'])
    // First use: every definition in full, the both-ways sentence, and no control to reopen anything.
    for (const f of FIRMNESS) expect(m.text()).toContain(f.full)
    expect(m.text()).toContain(BOTH_WAYS)
    expect(m.container.querySelector('main details')).toBeNull()
    expect(m.text()).not.toContain('Not sure?')
    for (const f of FIRMNESS) expect(m.text()).not.toContain(f.short)
    expect(checked(m)).toEqual([])
    m.unmount()
  })

  it('on later topics keeps short definitions in view and a way to reopen the full explanation', async () => {
    const m = await mount(<MatchPrototype />)
    await toTopic(m, 'Work.')
    for (const f of FIRMNESS) expect(m.text()).toContain(f.short)
    const details = m.container.querySelector('main details') as HTMLDetailsElement
    expect(details).not.toBeNull()
    expect(details.open).toBe(false)
    expect(norm(details.querySelector('summary')!.textContent)).toBe('What these three mean')
    // The body is the same text as at first use, from one source.
    for (const f of FIRMNESS) expect(norm(details.textContent)).toContain(f.full)
    expect(norm(details.textContent)).toContain(BOTH_WAYS)
    // Opening and closing it is not a choice: nothing is picked or changed, and firmness stays unset.
    const before = checked(m)
    await act(async () => {
      details.querySelector('summary')!.click()
    })
    await m.settle()
    await act(async () => {
      details.querySelector('summary')!.click()
    })
    await m.settle()
    expect(checked(m)).toEqual(before)
    expect(['Requirement', 'Preference', 'Doesn’t matter'].some((f) => checked(m).includes(f))).toBe(false)
    m.unmount()
  })

  it('has no pressure toward a firmness, anywhere in setup', async () => {
    const m = await mount(<MatchPrototype />)
    await toTopic(m, 'Work.')
    expect(m.text() + norm(m.container.querySelector('main details')?.textContent)).not.toMatch(/Not sure\?|we suggest|recommend|best to|gentler/i)
    m.unmount()
  })

  it('does not start with a firmness chosen on any topic', async () => {
    const m = await mount(<MatchPrototype />)
    await startBlank(m)
    await m.press('Continue')
    for (const step of ['Timing.', 'Children.', 'Practice.', 'City.', 'Work.', 'Household.']) {
      expect(h1s(m)).toEqual([step])
      expect(inputs(m).filter((i) => i.type === 'radio' && i.checked)).toEqual([])
      expect(inputs(m).filter((i) => i.type === 'checkbox' && i.checked)).toEqual([])
      await fillTopic(m)
    }
    m.unmount()
  })

  it('Review puts your answer, what would work in a partner and how firm on three labelled lines, with a Change that is a full-size target on the heading line', async () => {
    const m = await mount(<MatchPrototype />)
    await tick(m, 'I am a woman')
    await act(async () => {
      buttons(m, 'Start from this sample')[0].click()
    })
    await m.settle()
    for (let i = 0; i < 8; i++) await m.press('Continue')
    expect(h1s(m)).toEqual(['Check before you see anyone.'])
    const rows = [...m.container.querySelectorAll('main ul li')].filter((li) => li.querySelector('h3'))
    expect(rows).toHaveLength(6)
    for (const row of rows) {
      const heading = row.querySelector('h3')!
      const change = row.querySelector('button')!
      // The heading and its Change share a line (a wrapping row) and Change keeps the shared 44px target.
      expect(heading.parentElement).toBe(change.parentElement)
      expect(change.className).toContain('min-h-11')
      expect([...row.querySelectorAll('p')].map((p) => norm(p.textContent).split(' ').slice(0, 2).join(' '))).toEqual(['About you', 'In a', 'How firm'])
    }
    expect(m.text()).toContain('Requirements work both ways: your answers can leave you out of other people’s suggestions.')
    m.unmount()
  })
})

// ── MATCH-04: the profile after mutual interest, and what the fixed text is based on ─────────────

const draftOf = (m: Mounted, label: string) => (field(m, label) as HTMLTextAreaElement | undefined)?.value
const backName = (m: Mounted) => accessibleName(m.container.querySelector('header button')!)

describe('the profile stays reachable after mutual interest (MATCH-04)', () => {
  /** Abdi had chosen the tester already: choosing him opens the conversation, and the tester lands on Your people. */
  async function mutualWithAbdi(m: Mounted) {
    await toSuggestions(m)
    await m.press('Read more about Abdi')
    await m.press('I’m interested')
    expect(h1s(m)).toEqual(['Your people.'])
  }

  it('is one tap from Your people, and Back returns there', async () => {
    const m = await mount(<MatchPrototype />)
    await mutualWithAbdi(m)
    expect(m.has('View profile of Abdi')).toBe(true)
    expect(m.has('Open conversation with Abdi')).toBe(true)
    await m.press('View profile of Abdi')
    expect(h1s(m)).toEqual(['Abdi'])
    expect(m.text()).toContain('In Abdi’s words')
    expect(m.text()).toContain('Where you differ')
    expect(m.text()).toContain('Summary and questions')
    expect(m.text()).toContain('Questions worth asking')
    // Already chosen each other: no second decision to make, and a way to the conversation.
    expect(m.has('I’m interested')).toBe(false)
    expect(m.has('Not for me')).toBe(false)
    expect(m.has('Open conversation with Abdi')).toBe(true)
    expect(backName(m)).toBe('Back to your people')
    await back(m)
    expect(h1s(m)).toEqual(['Your people.'])
    m.unmount()
  })

  it('is one tap from the conversation, and Back returns there with the thread and an unsent draft kept', async () => {
    const m = await mount(<MatchPrototype />)
    await mutualWithAbdi(m)
    await m.press('Open conversation with Abdi')
    expect(m.has('View profile of Abdi')).toBe(true)
    await m.type('Write to Abdi', 'Salaam. A sent line.')
    await m.press('Send')
    await m.press(/Simulate: Abdi writes “Salaam\. I read your words/)
    await m.type('Write to Abdi', 'A line not sent yet')
    await m.press('View profile of Abdi')
    expect(h1s(m)).toEqual(['Abdi'])
    expect(m.text()).toContain('Questions worth asking')
    expect(backName(m)).toBe('Back to conversation')
    await back(m)
    expect(h1s(m)).toEqual(['Abdi'])
    expect(m.has('Write to Abdi')).toBe(false) // a label, not a button
    expect(draftOf(m, 'Write to Abdi')).toBe('A line not sent yet')
    expect(m.text()).toContain('Salaam. A sent line.')
    expect(m.text()).toContain('Abdi (simulated)')
    // Sending clears the draft, and it stays cleared after another look at the profile.
    await m.press('Send')
    expect(draftOf(m, 'Write to Abdi')).toBe('')
    await m.press('View profile of Abdi')
    await back(m)
    expect(draftOf(m, 'Write to Abdi')).toBe('')
    expect(m.text()).toContain('A line not sent yet')
    m.unmount()
  })

  it('keeps one draft for each person', async () => {
    const m = await mount(<MatchPrototype />)
    await mutualWithAbdi(m)
    await back(m)
    await m.press('Read more about Yusuf')
    await m.press('I’m interested')
    await m.press('Open conversation with Abdi')
    await m.type('Write to Abdi', 'for Abdi')
    await back(m)
    await m.press('Open conversation with Yusuf')
    expect(draftOf(m, 'Write to Yusuf')).toBe('')
    await m.type('Write to Yusuf', 'for Yusuf')
    await m.press('View profile of Yusuf')
    await back(m)
    expect(draftOf(m, 'Write to Yusuf')).toBe('for Yusuf')
    await back(m)
    await m.press('Open conversation with Abdi')
    expect(draftOf(m, 'Write to Abdi')).toBe('for Abdi')
    m.unmount()
  })

  it('does not change the choice, the conversation or what was shared, and shows no photo', async () => {
    const m = await mount(<MatchPrototype />)
    await mutualWithAbdi(m)
    await m.press('Open conversation with Abdi')
    await m.press('Share my photo with Abdi')
    await m.press('Share with Abdi')
    await tick(m, /Simulate: Abdi shares his photo/)
    expect(m.text().match(/photo — placeholder/g)).toHaveLength(2)
    await m.press('View profile of Abdi')
    expect(m.text()).toContain('No photo is part of a suggestion.')
    expect(m.text()).not.toMatch(/photo — placeholder/)
    expect(m.has('Share my photo')).toBe(false)
    for (const name of ['Disconnect', 'Block', 'Report']) expect(m.has(name), name).toBe(true)
    await back(m)
    expect(m.text()).toContain('Shared with Abdi only')
    expect(m.text().match(/photo — placeholder/g)).toHaveLength(2)
    await back(m)
    expect(m.has('Withdraw interest in Abdi')).toBe(false)
    expect(m.has('Open conversation with Abdi')).toBe(true)
    m.unmount()
  })

  it.each(['Block', 'Disconnect'] as const)('offers no profile once the conversation is ended from it by %s', async (how) => {
    const m = await mount(<MatchPrototype />)
    await mutualWithAbdi(m)
    await m.press('Open conversation with Abdi')
    await m.press(how)
    await pressLast(m, how === 'Block' ? 'Block Abdi' : 'Disconnect')
    expect(h1s(m)).toEqual(['Your people.'])
    expect(m.has('View profile of Abdi')).toBe(false)
    expect(m.has('Open conversation with Abdi')).toBe(false)
    expect(under(m, 'Not shown again')).toEqual([how === 'Block' ? 'Abdi: blocked' : 'Abdi: conversation ended'])
    m.unmount()
  })

  it.each(['Block', 'Disconnect'] as const)('leaves the profile, for Your people, when %s is chosen from it', async (how) => {
    const m = await mount(<MatchPrototype />)
    await mutualWithAbdi(m)
    await m.press('View profile of Abdi')
    await m.press(how)
    await pressLast(m, how === 'Block' ? 'Block Abdi' : 'Disconnect')
    expect(h1s(m)).toEqual(['Your people.'])
    expect(m.has('View profile of Abdi')).toBe(false)
    m.unmount()
  })

  it('leaves the profile when the simulated person ends the conversation while it is open', async () => {
    const m = await mount(<MatchPrototype />)
    await mutualWithAbdi(m)
    await m.press('View profile of Abdi')
    await m.press(/Simulate: Abdi ends the conversation/)
    expect(h1s(m)).toEqual(['Your people.'])
    expect(m.has('View profile of Abdi')).toBe(false)
    m.unmount()
  })

  it('returns a person chosen privately, and one still to decide, to the screen they were opened from', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Liban')
    expect(backName(m)).toBe('Back')
    await back(m)
    expect(h1s(m)).toEqual(['Your suggestions.'])
    await m.press('Read more about Liban')
    await m.press('I’m interested')
    await m.press('Read more about Liban') // from the private choices
    expect(backName(m)).toBe('Back to your people')
    await back(m)
    expect(h1s(m)).toEqual(['Your people.'])
    m.unmount()
  })

  it('clears a draft with Start again, so nothing is carried into a new session', async () => {
    const m = await mount(<MatchPrototype />)
    await mutualWithAbdi(m)
    await m.press('Open conversation with Abdi')
    await m.type('Write to Abdi', 'left over')
    await m.press('Start again')
    await toSuggestions(m)
    await m.press('Read more about Abdi')
    await m.press('I’m interested')
    await m.press('Open conversation with Abdi')
    expect(draftOf(m, 'Write to Abdi')).toBe('')
    m.unmount()
  })
})

describe('the answers disclosure on a profile (MATCH-04)', () => {
  it('is a native disclosure with a 44px minimum target, and keeps its default keyboard focus', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Liban')
    const details = m.container.querySelector('main details') as HTMLDetailsElement
    const summary = details.querySelector('summary')!
    expect(norm(summary.textContent)).toBe('Liban’s answers on each point')
    expect(summary.className).toContain('min-h-11')
    // Focus is the browser's own, never removed, and the summary stays in the tab order.
    expect(summary.className).not.toMatch(/outline-none|focus:outline-0/)
    expect(summary.getAttribute('tabindex')).toBeNull()
    expect(details.open).toBe(false)
    await act(async () => {
      summary.click()
    })
    await m.settle()
    expect(details.open).toBe(true)
    expect(details.textContent).toContain('Timing. Liban said: “In one to two years”. That works for you.')
    m.unmount()
  })
})

describe('the basis of the fixed text, on request (MATCH-04)', () => {
  const based = (m: Mounted) => m.container.querySelector('section[aria-labelledby="fx-notes"] details') as HTMLDetailsElement
  const basisText = (m: Mounted) => norm(based(m).textContent)

  it('keeps the summary and questions readable, and puts what they are based on behind one native disclosure, closed', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Liban')
    const details = based(m)
    expect(details).not.toBeNull()
    expect(details.open).toBe(false)
    const summary = details.querySelector('summary')!
    expect(norm(summary.textContent)).toBe('What this is based on')
    // Keyboard: a native summary is in the tab order and opens with Enter or Space; nothing removes it from the order.
    expect(summary.getAttribute('tabindex')).toBeNull()
    expect(m.container.querySelectorAll('section[aria-labelledby="fx-notes"] details')).toHaveLength(1)
    // One block, one label, still said once, with no model called.
    expect(m.container.querySelectorAll('section[aria-labelledby^="fx-"]')).toHaveLength(1)
    expect(m.text().match(/Prototype fixture/g)).toHaveLength(1)
    expect(m.text()).toContain('No model was called.')
    // The questions are a numbered list, readable without opening anything.
    const items = [...m.container.querySelector('section[aria-labelledby="fx-notes"] ol')!.querySelectorAll(':scope > li')].map((li) => norm(li.textContent))
    expect(items).toHaveLength(3)
    expect(items[0]).toContain('Liban chose “I plan to be at home”. What would you want to understand about that day to day?')
    m.unmount()
  })

  it('says when a summary uses structured answers only, and names them', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Liban')
    expect(basisText(m)).toContain('Summary. This summary uses structured answers only: your answers and Liban’s on timing, children, work. It does not use anything either of you wrote.')
    m.unmount()
  })

  it('resolves each question’s answers from the data, for the right person, in the first person for what they chose', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Liban')
    expect(basisText(m)).toContain('Question 1. Work. Liban: “I plan to be at home”.')
    expect(basisText(m)).toContain('Question 2. Timing. You: “Within a year”. Liban: “In one to two years”.')
    expect(basisText(m)).toContain('Question 3. Children. You: “I want children”. Liban: “I am open to them, and would decide together”.')
    m.unmount()
  })

  it('quotes a written answer in full, as the person wrote it, with the prompt it answers', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m, 'woman', 1)
    await m.press('Read more about Hassan')
    expect(m.text()).toContain('Hassan wrote about “a pace that suits both of us”. What does a good pace look like for you?')
    expect(basisText(m)).toContain('Hassan’s written answer, Looking for: “I have taken my time, and I would like to keep a pace that suits both of us.”')
    expect(basisText(m)).toContain('Timing. You: “Later than that”. Hassan: “Later than that”.')
    m.unmount()
  })

  it('labels a general question as general, in view and in the disclosure, and does not dress it up with answers', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Abdi')
    expect(screenText(m).match(/General question\./g)).toHaveLength(1)
    expect(basisText(m)).toContain('Question 2. General question. It is not drawn from either person’s answers.')
    expect(basisText(m)).toContain('Question 3. Abdi’s written answer, Families: “I expect our families to know us both well, and to leave the daily decisions to us.”')
    m.unmount()
  })

  it('says what a reference does not show', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Yusuf')
    expect(basisText(m)).toContain('These show what each line was written from. They do not show that a line follows from them.')
    m.unmount()
  })

  it('gives the right name and pronouns on the other side, and the corrected wording', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m, 'man')
    await m.press('Read more about Ladan')
    expect(m.text()).toContain('Ladan chose “With family” and you chose “Our own home” for where to live at first. What does each of you picture?')
    expect(m.text()).toContain('You live in different cities. How does each of you see where you would live?')
    expect(m.text()).not.toMatch(/give up|family nearby/)
    expect(basisText(m)).toContain('Household. You: “Our own home”. Ladan: “With family”.')
    m.unmount()
  })

  it('quotes the other person’s own words on the other side too', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m, 'man', 1)
    await m.press('Read more about Ifrah')
    expect(m.text()).toContain('Ifrah wrote about “a pace that suits both of us”. What does a good pace look like for you?')
    expect(basisText(m)).toContain('Ifrah’s written answer, Looking for: “I have taken my time, and I would like to keep a pace that suits both of us.”')
    expect(m.text()).toContain('On practice, Ifrah chose “I practise occasionally”, where you chose “Prayer is steady and central to my days”, and you marked practice as a preference.')
    m.unmount()
  })

  it('attributes a chosen practice answer to the person who chose it, not as something they described', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Abdi')
    expect(m.text()).toContain('On practice, Abdi chose “Prayer is steady and central to my days”, a steadier answer than your “I am building the habit”.')
    expect(m.text()).not.toMatch(/describes (his|her)/)
    m.unmount()
  })
})
