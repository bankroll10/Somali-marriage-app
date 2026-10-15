// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

async function toSuggestions(m: Mounted, side: 'woman' | 'man' = 'woman', sample = 0) {
  await tick(m, side === 'woman' ? 'I am a woman' : 'I am a man')
  await act(async () => {
    buttons(m, 'Start from this sample')[sample].click()
  })
  await m.settle()
  for (const step of ['About you.', 'What you ask for.', 'In your own words.', 'Check before you see anyone.']) {
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
    expect(m.text()).toContain('Shown in no particular order. There is no score and no ranking.')
    expect(m.text()).not.toMatch(/\d\s?%|compatib|match(es)? for you|swipe/i)
    expect(m.container.querySelector('img')).toBeNull()
    expect(m.text()).toContain('Eligibility works both ways, and covers only the six points in this prototype.')

    // A suggestion: derived comparisons, labelled fixtures, no photo, a private choice.
    await m.press('Read more about Abdi')
    expect(m.text()).toContain('No photo is part of a suggestion.')
    expect(m.text()).toContain('Abdi said: “Prayer is steady and central to my days”. That works for you.')
    const fixtures = [...m.container.querySelectorAll('section[aria-labelledby^="fx-"]')]
    expect(fixtures).toHaveLength(2)
    for (const f of fixtures) {
      expect(f.textContent).toContain('Prototype fixture')
      expect(f.textContent).toContain('No model was called')
    }
    expect(m.text()).toContain('Interest is private.')
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
    expect(m.text()).toContain('She describes her practice as steadier than yours.')
    expect(m.text()).toContain('Amina is told only if she also chooses you.')
    m.unmount()
  })
})

describe('honest sample scenarios', () => {
  it('one suggestion: exactly the one person who meets everyone’s requirements', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m, 'woman', 1)
    expect([...m.container.querySelectorAll('li h2')].map((h) => h.textContent)).toEqual(['Hassan'])
    expect(m.text()).toContain('Your requirements on timing, children, city left some people out.')
    await m.press('Read more about Hassan')
    expect(m.text()).toContain('Hassan said: “I practise occasionally”. You said: “Prayer is steady and central to my days”. You marked this a preference.')
    expect(m.container.querySelectorAll('section[aria-labelledby^="fx-"]')).toHaveLength(2)
    m.unmount()
  })

  it('no suggestions: shows no one, relaxes nothing, and offers review, keeping it, or leaving', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m, 'woman', 2)
    expect(m.container.querySelectorAll('li h2')).toHaveLength(0)
    expect(m.text()).toContain('No one fits what you have asked for right now.')
    expect(m.text()).toContain('Nothing has been relaxed to fill this screen, and nothing here suggests you should change what you ask for.')
    expect(m.text()).not.toMatch(/loosen|relax your|try changing|widen/i)
    for (const name of ['Review what you ask for', 'Keep it as it is', 'Leave']) expect(m.has(name), name).toBe(true)
    await m.press('Keep it as it is')
    expect(m.text()).toContain('Kept as it is. Nothing changes unless you change it.')
    expect(m.container.querySelectorAll('li h2')).toHaveLength(0)
    // Reviewing shows the asks unchanged, and still shows no one until the tester changes something.
    await m.press('Review what you ask for')
    expect(h1s(m)).toEqual(['What you ask for.'])
    expect(field(m, 'Requirement')).toBeTruthy()
    await m.press('Continue')
    await m.press('Continue')
    await m.press('Show me suggestions')
    expect(m.container.querySelectorAll('li h2')).toHaveLength(0)
    await m.press('Leave')
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
    // Change the tester's own answer on work.
    await tick(m, 'I am open to either')
    for (const step of ['Continue', 'Continue', 'Continue', 'Show me suggestions']) await m.press(step)
    await m.press('Read more about Liban')
    // Derived from the structured fields, so it follows the edit.
    expect(m.text()).toContain('Liban said: “I plan to be at home”. You said: “I am open to either”.')
    // Fixed text, written for the unedited scenario, is not shown as if it still described this tester.
    expect(m.text()).not.toContain('The one difference you marked as a preference is work')
    const blocks = [...m.container.querySelectorAll('section[aria-labelledby^="fx-"]')]
    expect(blocks).toHaveLength(2)
    for (const b of blocks) expect(b.textContent).toContain('Unavailable. This fixed text was written for a sample scenario, and your answers no longer match it.')
    m.unmount()
  })

  it('blank answers have no fixed text at all, and are checked before moving on', async () => {
    const m = await mount(<MatchPrototype />)
    await tick(m, 'I am a man')
    await m.press('Start with blank answers')
    await m.press('Continue')
    expect(m.text()).toContain('Still to fill in: a made-up first name, a made-up age, 18 or over, timing, children')
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
  it('says so, and offers a fresh start instead of a quiet reshuffle', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Liban')
    await m.press('Not for me')
    expect(m.text()).toContain('Liban is removed from your suggestions. He is not told.')
    // No path back to the asks from the suggestions once someone has been decided.
    await m.press('Back')
    expect(m.has('Review what you ask for')).toBe(false)
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
