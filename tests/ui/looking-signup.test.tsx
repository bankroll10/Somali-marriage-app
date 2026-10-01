// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Looking from '../../src/components/Looking'
import { scenes } from '../../src/data/scenes'
import { OPERATOR } from '../../src/lib/site'
import { mount, type Mounted } from '../support/render'

/**
 * The introduction signup, as a person reads and completes it (docs/DECISIONS.md
 * Part 25, BATCH-02C). The pilot's rules, the fields and the consent
 * affirmation did not change; this holds that what a person must know is still
 * on the page before the button, still visible, and still true to those rules,
 * and that the form keeps what she typed. The submission itself (the code, the
 * retries, the receipt, withdrawal) is held by tests/journeys/looking.test.tsx.
 */

let screen: Mounted | undefined
afterEach(() => {
  screen?.unmount()
  screen = undefined
})

const handlers = () => ({ onRegistered: vi.fn(), onWithdrawn: vi.fn(), onIdentity: vi.fn(), onTalking: vi.fn(), onMap: vi.fn(), onTrust: vi.fn(), onBack: vi.fn() })
const open = async (over: Partial<ReturnType<typeof handlers>> = {}) => {
  const h = { ...handlers(), ...over }
  screen = await mount(<Looking identity={{}} intro={null} {...h} />)
  return h
}
const el = (sel: string) => screen!.container.querySelector(sel) as HTMLElement | null
const flat = (s: string) => s.replace(/\s+/g, ' ')
/** Everything on screen above the button that sends the request. */
const beforeButton = () => {
  const t = flat(screen!.text())
  return t.slice(0, t.indexOf('Put my name down', t.indexOf('What goes, exactly')))
}

describe('what must be known before submitting is on the page, in the open', () => {
  it('says each material thing, in the pilot’s own terms', async () => {
    await open()
    const t = beforeButton()
    // Who runs it — the configured name, or its fallback.
    expect(t).toContain(`Niyyah is run by ${OPERATOR}`)
    // Eligibility: age, seriousness, the city first, elsewhere kept for later without a date, and the first-twenty rule.
    expect(t).toMatch(/18 or older, and serious about marriage/)
    expect(t).toMatch(/Introductions are beginning in Minneapolis–St\. Paul; a name from anywhere else is kept for later, with no opening date/)
    expect(t).toMatch(/For the first twenty introductions, nobody currently engaged or married/)
    // The founder's conversation first; the reference conversation only if she agrees, and not kept.
    expect(t).toMatch(/conversation with you, by the email or number you give, before anyone is considered for you/)
    expect(t).toMatch(/if you agree to it, one conversation with a person who knows you; what they say is not kept/)
    // The approved summary, and the release rule: nothing identifying until both have said yes.
    expect(t).toMatch(/first thing a proposed person hears about you is a short description you approve; it does not say who you are/)
    expect(t).toMatch(/Nothing that identifies you, such as your name or contact, goes to a person proposed to you until you and they have both said yes/)
    // Scheduled removal, and the right to withdraw.
    expect(t).toMatch(/scheduled to be removed on the Sunday on or before its 180th day; the exact date is shown when it is saved\. Take it off any time/)
    // Manual facilitation, said once, and one at a time.
    expect(t).toMatch(/makes every introduction by hand, one at a time/)
  })

  it('promises nothing about outcomes: one plain non-guarantee, no response time, no queue, no match', async () => {
    await open()
    const t = flat(screen!.text())
    expect(t.match(/does not guarantee an introduction/g)).toHaveLength(1)
    expect(t).not.toMatch(/within (a |an |\d+ )?(hour|day|week|month)s?|in \d+ (hours|days|weeks)|queue|position \d|waitlist|you will (hear|be matched)|we will (write|find|match)|soon\b/i)
  })

  it('hides none of it: no collapsed section, tooltip or hidden text carries a disclosure', async () => {
    await open()
    expect(screen!.container.querySelectorAll('details, [hidden], [aria-hidden="true"]:not(svg):not(svg *)')).toHaveLength(0)
    expect(screen!.container.querySelectorAll('[aria-expanded="false"], [title]')).toHaveLength(0)
    // Each disclosure is a labelled row inside the visible block.
    const rows = [...(el('#looking-before')?.parentElement?.querySelectorAll('dt') ?? [])].map((d) => d.textContent)
    expect(rows.map((r) => r?.trim().replace(/\.$/, ''))).toEqual(['Who runs it', 'Who it is for', 'What happens first', 'Before anyone hears about you', 'How long it stays'])
  })
})

describe('what is sent, and what the person can do about it', () => {
  it('lists every field, who reads it, what is kept apart, and the way back', async () => {
    const h = await open()
    const block = el('#looking-goes')?.closest('section')
    expect(block).toBeTruthy()
    // Every field the request carries is named, once, in the one "Sent" sentence.
    const sent = flat([...block!.querySelectorAll('li')].find((li) => /^Sent:/.test(li.textContent ?? ''))?.textContent ?? '')
    for (const field of [/a way to reach you/, /your first name if you gave it/, /whether you are a woman or a man/, /your city and its country/, /how far you would go/, /that you confirmed you are 18 or older/]) {
      expect(sent).toMatch(field)
    }
    const text = flat(block!.textContent ?? '')
    expect(text).toMatch(/the founder reads the list; nothing else does/)
    expect(text).toMatch(/Nothing from your map, a read or the eleven is attached/)
    expect(text).toMatch(/our server under a code this phone made up for it, so you can take your name off from here; Forget me removes it with everything else/)
    // The way to the full account is a real control and goes where it says.
    await screen!.press('What leaves your phone')
    expect(h.onTrust).toHaveBeenCalledTimes(1)
  })
})

describe('the form', () => {
  it('keeps every place, “Somewhere else” and its countries, and asks no new question', async () => {
    await open()
    for (const sc of scenes) expect(screen!.has(new RegExp(`^${sc.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)), sc.label).toBe(true)
    expect(screen!.has(/^Somewhere else$/)).toBe(true)
    await screen!.press(/^Somewhere else$/)
    expect(screen!.has(/^United Kingdom$/)).toBe(true)
    // Four groups of controls, as before: side, place, how far (after a place), and the two text fields + the affirmation.
    const labels = [...screen!.container.querySelectorAll('input')].map((i) => i.id)
    expect(labels).toEqual(['looking-name', 'looking-contact'])
    expect(screen!.has(/I confirm I am 18 or older/)).toBe(true)
  })

  it('names its fields, and ties the contact field to its help', async () => {
    await open()
    expect(screen!.has('Put my name down')).toBe(true)
    const contact = el('#looking-contact') as HTMLInputElement
    expect(contact.required).toBe(true)
    const described = (contact.getAttribute('aria-describedby') ?? '').split(' ')
    expect(described).toContain('looking-contact-help')
    for (const id of described) expect(document.getElementById(id), id).toBeTruthy()
    for (const heading of ['About you', 'How to reach you']) expect(screen!.text()).toContain(heading)
  })

  it('shows what is still needed, and a contact problem, without resetting anything typed', async () => {
    await open()
    await screen!.press(/^I am a woman/)
    await screen!.press(/^Columbus/)
    await screen!.type('Your first name', 'Sagal')
    await screen!.type('Email or phone', 'sagal@')
    const contact = el('#looking-contact') as HTMLInputElement
    act(() => contact.focus())
    act(() => contact.blur())
    await screen!.settle()
    // Feedback, in her words: the contact reads unfinished, and what is missing is listed.
    expect(el('#looking-contact-hint')?.textContent).toMatch(/looks unfinished/)
    expect(contact.getAttribute('aria-invalid')).toBe('true')
    expect(screen!.text()).toMatch(/One thing left: that you are 18 or older\.|Still needed:.*18 or older/)
    // Nothing she chose or typed was cleared by the feedback or the layout.
    expect((el('#looking-name') as HTMLInputElement).value).toBe('Sagal')
    expect(contact.value).toBe('sagal@')
    expect(el('[role="radio"][aria-checked="true"]')?.textContent).toMatch(/I am a woman/)
    const chosen = [...screen!.container.querySelectorAll('[aria-pressed="true"]')].map((b) => b.textContent)
    expect(chosen).toContain('Columbus')
    expect(chosen).not.toContain('Minneapolis–St. Paul')
    expect(el('button[type="submit"]')?.hasAttribute('disabled')).toBe(true)
  })

  it('says, for a place outside the pilot, that the name is kept for later and has no date', async () => {
    await open()
    await screen!.press(/^Columbus/)
    expect(flat(screen!.text())).toContain('From Columbus you can leave your name for later: nobody there is being introduced yet, and there is no date for it.')
  })
})

describe('recovery by code stays separate from a new signup', () => {
  it('sits after the signup form, outside it, under one heading of its own', async () => {
    await open()
    const have = [...screen!.container.querySelectorAll('button')].find((b) => /^I have a code/.test(b.textContent ?? ''))!
    const signup = el('button[type="submit"]')!.closest('form')!
    expect(have.closest('form')).toBeNull()
    expect(signup.contains(have)).toBe(false)
    expect(signup.compareDocumentPosition(have) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(flat(screen!.text()).match(/Take a name off with its code/g)).toHaveLength(1)
    // Opening it adds a code field of its own; the signup's fields are untouched.
    await screen!.press(/^I have a code/)
    expect(el('#looking-code')).toBeTruthy()
    expect(signup.querySelector('#looking-code')).toBeNull()
  })
})
