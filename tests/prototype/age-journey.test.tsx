// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MatchPrototype from '../../src/prototype/match/MatchPrototype'
import { SCENARIOS, peopleFor } from '../../src/prototype/match/fixtures'
import { accessibleName, audit } from '../support/a11y'
import { mount, type Mounted } from '../support/render'

/**
 * JOURNEY — age, as a person drives it (docs/MATCH-PROTOTYPE.md).
 *
 * The tester’s own age and the ages they would consider in a partner are asked together on the About
 * step, with an explicit Requirement, Preference or Doesn’t matter that nobody has chosen for them.
 * The same guards as the other journey tests apply: nothing touches the network or storage.
 */

const touched: string[] = []

beforeEach(() => {
  touched.length = 0
  vi.stubGlobal('fetch', (...a: unknown[]) => {
    touched.push(`fetch ${String(a[0])}`)
    return Promise.reject(new Error('the demo must not use the network'))
  })
  for (const m of ['getItem', 'setItem', 'removeItem', 'clear', 'key'] as const) {
    vi.spyOn(Storage.prototype, m).mockImplementation(() => {
      touched.push(`Storage.${m}`)
      return null as never
    })
  }
})

afterEach(() => {
  expect(touched).toEqual([])
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const OWN_AGE = 'A made-up age (18 to 99)'
const inputs = (m: Mounted) => [...m.container.querySelectorAll('input, textarea')] as HTMLInputElement[]
const field = (m: Mounted, name: string) => inputs(m).find((f) => accessibleName(f).includes(name))
const choose = async (m: Mounted, name: string) => {
  const el = inputs(m).find((f) => (f.type === 'radio' || f.type === 'checkbox') && accessibleName(f).includes(name))
  if (!el) throw new Error(`no choice named ${name}`)
  await act(async () => {
    el.click()
  })
  await m.settle()
}
const h1s = (m: Mounted) => [...m.container.querySelectorAll('h1')].map((h) => h.textContent)
const status = (m: Mounted) => [...m.container.querySelectorAll('[role="status"]')].map((e) => e.textContent).join(' ')
const buttons = (m: Mounted, name: string) => [...m.container.querySelectorAll('button')].filter((b) => accessibleName(b).includes(name)) as HTMLButtonElement[]
const screenText = (m: Mounted) => {
  const main = m.container.querySelector('main')!.cloneNode(true) as HTMLElement
  main.querySelectorAll('details').forEach((d) => d.remove())
  return (main.textContent ?? '').replace(/\s+/g, ' ')
}
const cards = (m: Mounted) => [...m.container.querySelectorAll('li h2')].map((h) => h.textContent)
/**
 * The tester's panel only simulates the people who are shown. It lists nobody who was left out and gives no reason for anyone,
 * and nothing else on the page names them either. (The eligibility diagnostics stay in the code and are held by suggest.test.ts
 * and age.test.ts; they are not on any screen.)
 */
const expectNoExclusions = (m: Mounted, left: string[], label = 'page') => {
  const text = m.text()
  expect(text, label).not.toMatch(/Why these made-up people are not shown|reason this panel does not list|does not name another person/)
  expect(text, label).not.toMatch(/\b(your|his|her) requirement on\b/)
  for (const name of left) expect(text, `${label}: ${name}`).not.toMatch(new RegExp(`\\b${name}\\b`))
}

async function start(m: Mounted, side: 'woman' | 'man' = 'woman', sample: 'three' | 'one' | 'none' | 'blank' = 'three') {
  await choose(m, side === 'woman' ? 'I am a woman' : 'I am a man')
  await act(async () => {
    if (sample === 'three') buttons(m, 'Start the demo')[0].click()
    else if (sample === 'blank') buttons(m, 'Start with blank answers')[0].click()
    else buttons(m, 'Start from this sample')[sample === 'one' ? 0 : 1].click()
  })
  await m.settle()
}
/** Through the six points and the words, to Review. */
async function toReview(m: Mounted) {
  for (let i = 0; i < 8; i++) await m.press('Continue')
  expect(h1s(m)).toEqual(['Check before you see anyone.'])
}
async function toSuggestions(m: Mounted, side: 'woman' | 'man' = 'woman', sample: 'three' | 'one' | 'none' = 'three') {
  await start(m, side, sample)
  await toReview(m)
  await m.press('Show me suggestions')
  expect(h1s(m)).toEqual(['Your suggestions.'])
}
/** From Review, back to About with the edit rules, change the range and return. */
async function editAbout(m: Mounted, edit: (m: Mounted) => Promise<void>) {
  await m.press('Change age')
  expect(h1s(m)).toEqual(['About you.'])
  await edit(m)
  await m.press('Continue')
  expect(h1s(m)).toEqual(['Check before you see anyone.'])
}

describe('About asks for the tester’s age and the ages they would consider, on one step', () => {
  it('keeps the tester’s own age apart from the partner range, and chooses nothing for someone starting blank', async () => {
    const m = await mount(<MatchPrototype />)
    await start(m, 'woman', 'blank')
    expect(h1s(m)).toEqual(['About you.'])
    expect(m.text()).toContain('Step 1 of 8.')
    // Three separate things: the tester’s own age, the range, and how firm.
    expect(field(m, OWN_AGE)!.value).toBe('')
    expect(field(m, 'Youngest age')!.value).toBe('')
    expect(field(m, 'Oldest age')!.value).toBe('')
    const legends = [...m.container.querySelectorAll('legend')].map((l) => l.textContent!.replace(/\s+/g, ' ').trim())
    expect(legends.some((l) => l.startsWith('What would work for you in a partner'))).toBe(true)
    expect(legends.some((l) => l.startsWith('How firm is this?'))).toBe(true)
    // Requirement, Preference and Doesn’t matter are all offered, and none is chosen.
    const radios = inputs(m).filter((f) => f.type === 'radio' && /^(Requirement|Preference|Doesn’t matter)/.test(accessibleName(f)))
    expect(radios.map((r) => /^(Requirement|Preference|Doesn’t matter)/.exec(accessibleName(r))![1])).toEqual(['Requirement', 'Preference', 'Doesn’t matter'])
    expect(radios.every((r) => !r.checked)).toBe(true)
    // It is still one About screen, in the same place in the same eight steps.
    expect(m.container.querySelectorAll('fieldset').length).toBeGreaterThan(0)
    expect(audit(m.container)).toEqual([])
    m.unmount()
  })

  it('says what is and is not shown, and no longer says age is not used', async () => {
    const m = await mount(<MatchPrototype />)
    await start(m, 'woman', 'blank')
    expect(m.text()).not.toContain('not used to include or leave anyone out')
    expect(m.text()).not.toContain('age preferences are not built')
    expect(m.text()).toContain('Your age is shown to the people you meet.')
    expect(m.text()).toContain('The ages you would consider, and how firm you are about them, are not shown to anyone.')
    // Both ends are included, and the same three firmness meanings are one tap away.
    expect(m.text()).toContain('Both ends are included.')
    expect(m.text()).toContain('What these three mean')
    m.unmount()
  })

  it('starts a sample with that sample’s own age and its own explicit choice, and lets the person change either', async () => {
    const m = await mount(<MatchPrototype />)
    await start(m, 'woman', 'three')
    const sc = SCENARIOS.find((s) => s.id === 'three')!
    expect(field(m, OWN_AGE)!.value).toBe(String(sc.age))
    expect(sc.ageAsk.firm).toBe('preference')
    if (sc.ageAsk.firm !== 'any') {
      expect(field(m, 'Youngest age')!.value).toBe(String(sc.ageAsk.min))
      expect(field(m, 'Oldest age')!.value).toBe(String(sc.ageAsk.max))
    }
    expect(inputs(m).find((f) => f.type === 'radio' && f.checked && accessibleName(f).startsWith('Preference'))).toBeTruthy()
    m.unmount()
  })
})

describe('checking the age fields before moving on', () => {
  it('names each missing part and does not move on, then moves on once the range is complete', async () => {
    const m = await mount(<MatchPrototype />)
    await start(m, 'woman', 'blank')
    await m.press('Continue')
    expect(h1s(m)).toEqual(['About you.'])
    expect(status(m)).toContain('Still to fill in: a made-up first name, a made-up age from 18 to 99.')
    expect(status(m)).toContain('Still to do: the youngest age you would consider; the oldest age you would consider; how firm this is.')
    await m.type('A made-up first name', 'Maryan')
    await m.type(OWN_AGE, '30')
    await m.type('Youngest age', '28')
    await m.press('Continue')
    expect(h1s(m)).toEqual(['About you.'])
    expect(status(m)).not.toContain('Still to fill in')
    expect(status(m)).toContain('Still to do: the oldest age you would consider; how firm this is.')
    await m.type('Oldest age', '34')
    await m.press('Continue')
    expect(status(m)).toContain('Still to do: how firm this is.')
    await choose(m, 'Preference')
    await m.press('Continue')
    expect(h1s(m)).toEqual(['Timing.'])
    m.unmount()
  })

  it.each([
    ['17', '40', 'a youngest age that is a whole number from 18 to 99'],
    ['99.5', '99', 'a youngest age that is a whole number from 18 to 99'],
    ['28.5', '34', 'a youngest age that is a whole number from 18 to 99'],
    ['abc', '34', 'a youngest age that is a whole number from 18 to 99'],
    ['28', '100', 'an oldest age that is a whole number from 18 to 99'],
    ['28', '34.5', 'an oldest age that is a whole number from 18 to 99'],
    ['28', '17', 'an oldest age that is a whole number from 18 to 99'],
    ['40', '30', 'a youngest age that is not above the oldest age'],
  ])('rejects %s to %s and says why', async (min, max, message) => {
    const m = await mount(<MatchPrototype />)
    await start(m, 'woman', 'three')
    await choose(m, 'Requirement')
    await m.type('Youngest age', min)
    await m.type('Oldest age', max)
    await m.press('Continue')
    expect(h1s(m)).toEqual(['About you.'])
    expect(status(m)).toContain(message)
    // The message clears as soon as the fields are fixed.
    await m.type('Youngest age', '28')
    await m.type('Oldest age', '34')
    expect(status(m)).not.toContain(message)
    await m.press('Continue')
    expect(h1s(m)).toEqual(['Timing.'])
    m.unmount()
  })

  it('marks the field that needs fixing as invalid, and only that one', async () => {
    const m = await mount(<MatchPrototype />)
    await start(m, 'woman', 'three')
    await m.type('Oldest age', '100')
    await m.press('Continue')
    expect(field(m, 'Oldest age')!.getAttribute('aria-invalid')).toBe('true')
    expect(field(m, 'Youngest age')!.getAttribute('aria-invalid')).not.toBe('true')
    expect(field(m, OWN_AGE)!.getAttribute('aria-invalid')).not.toBe('true')
    m.unmount()
  })

  it.each(['17', '100', '30.5', '3e1', ''])('rejects an own age of %j', async (bad) => {
    const m = await mount(<MatchPrototype />)
    await start(m, 'woman', 'three')
    await m.type(OWN_AGE, bad)
    await m.press('Continue')
    expect(h1s(m)).toEqual(['About you.'])
    expect(status(m)).toContain('a made-up age from 18 to 99')
    m.unmount()
  })

  it('needs no range when it does not matter, and sets the boxes aside', async () => {
    const m = await mount(<MatchPrototype />)
    await start(m, 'woman', 'blank')
    await m.type('A made-up first name', 'Maryan')
    await m.type(OWN_AGE, '30')
    await m.type('Youngest age', '17')
    await choose(m, 'Doesn’t matter')
    const rangeSet = field(m, 'Youngest age')!.closest('fieldset') as HTMLFieldSetElement
    expect(rangeSet.disabled).toBe(true)
    expect(rangeSet.querySelector('legend')!.textContent!.replace(/\s+/g, ' ')).toContain('Set aside while this does not matter to you.')
    await m.press('Continue')
    expect(h1s(m)).toEqual(['Timing.'])
    m.unmount()
  })
})

describe('Review shows the age choice and lets it be edited', () => {
  it('lists age first, in the same three lines as every point, and does not show a set-aside range', async () => {
    const m = await mount(<MatchPrototype />)
    await start(m, 'woman', 'three')
    await toReview(m)
    const row = (name: string) => ([...m.container.querySelectorAll('main ul li')].find((li) => li.querySelector('h3')?.textContent === name) as HTMLElement | undefined)?.textContent?.replace(/\s+/g, ' ')
    expect(row('Age')).toContain('About you 30')
    expect(row('Age')).toContain('In a partner Ages 28 to 34, both included.')
    expect(row('Age')).toContain('How firm Preference')
    expect([...m.container.querySelectorAll('main li h3')].map((h) => h.textContent)[0]).toBe('Age')
    expect(m.text()).toContain('The ages you would consider, and how firm you were on each point.')
    expect(audit(m.container)).toEqual([])
    await editAbout(m, async (mm) => choose(mm, 'Doesn’t matter'))
    expect(row('Age')).toContain('In a partner Not used: this does not matter to you.')
    expect(row('Age')).toContain('How firm Doesn’t matter')
    expect(row('Age')).not.toContain('28 to 34')
    m.unmount()
  })

  it('does not let an edit from Review go back with an invalid range', async () => {
    const m = await mount(<MatchPrototype />)
    await start(m, 'woman', 'three')
    await toReview(m)
    expect(buttons(m, 'Show me suggestions')[0].disabled).toBe(false)
    // Change age to a reversed range through About: About itself refuses to go back to Review.
    await m.press('Change age')
    await m.type('Youngest age', '40')
    await m.press('Continue')
    expect(h1s(m)).toEqual(['About you.'])
    m.unmount()
  })

  it('returns to Review from the edit, through Back as well as Continue, with the choice kept', async () => {
    const m = await mount(<MatchPrototype />)
    await start(m, 'woman', 'three')
    await toReview(m)
    await m.press('Change age')
    await m.press('Back')
    expect(h1s(m)).toEqual(['Check before you see anyone.'])
    await m.press('Change name and age')
    expect(h1s(m)).toEqual(['About you.'])
    await m.type('Youngest age', '25')
    await m.press('Continue')
    expect(h1s(m)).toEqual(['Check before you see anyone.'])
    expect(m.text()).toContain('Ages 25 to 34, both included.')
    m.unmount()
  })
})

describe('what a Preference shows, and what a Requirement removes', () => {
  it('the three-suggestion sample shows a person outside the preferred ages, and says so on the card and on the profile', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    expect(cards(m)).toEqual(['Abdi', 'Liban', 'Yusuf'])
    const card = (name: string) => ([...m.container.querySelectorAll('li')].find((li) => li.querySelector('h2')?.textContent === name) as HTMLElement).textContent!.replace(/\s+/g, ' ')
    expect(card('Yusuf')).toContain('27')
    expect(card('Yusuf')).toContain('Differs from what you preferred')
    expect(card('Yusuf')).toContain('Age: 27, where you preferred 28 to 34')
    expect(card('Abdi')).not.toContain('Age:')
    await m.press('Read more about Yusuf')
    const differ = [...m.container.querySelectorAll('h2#differ ~ ul li')].map((li) => li.textContent!.replace(/\s+/g, ' '))
    expect(differ[0]).toContain('Age.')
    expect(differ[0]).toContain('Yusuf’s age: 27')
    expect(differ[0]).toContain('You preferred: ages 28 to 34')
    // Yusuf is still shown, and nothing says how much it matters: no score.
    expect(m.text()).not.toMatch(/\d\s?%|compatib|score of/i)
    await m.press('Back')
    await m.press('Read more about Abdi')
    expect(m.text()).toContain('Fits what you asked for on: age, timing, children, practice, city, work, household.')
    expect(m.text()).toContain('Age. Abdi is 29, within the 28 to 34 you asked for.')
    m.unmount()
  })

  it('a Requirement leaves out the person outside the range, and nobody takes their place', async () => {
    const m = await mount(<MatchPrototype />)
    await start(m, 'woman', 'three')
    await choose(m, 'Requirement')
    await toReview(m)
    await m.press('Show me suggestions')
    expect(cards(m)).toEqual(['Abdi', 'Liban'])
    // The screen the person sees does not say that, or why, someone is missing.
    expect(screenText(m)).not.toMatch(/Yusuf|left out|excluded/)
    // The panel keeps the simulation controls for the people who are shown, and lists nobody who was left out, or why.
    expect(m.text()).toContain('Simulate: Abdi has chosen you')
    expectNoExclusions(m, ['Yusuf'])
    m.unmount()
  })

  it('the other person’s requirement leaves out the tester, and the tester is not told whose or why', async () => {
    const m = await mount(<MatchPrototype />)
    await start(m, 'woman', 'three')
    // Abdi asks for 27 to 35.
    await m.type(OWN_AGE, '41')
    await toReview(m)
    expect(m.text()).toContain('About you 41')
    await m.press('Show me suggestions')
    expect(cards(m)).not.toContain('Abdi')
    expect(screenText(m)).not.toMatch(/Abdi|left out|excluded/)
    // Nor does the tester's panel: Abdi, his requirement and the reason are not listed anywhere, and Liban's controls remain.
    expect(m.text()).toContain('Simulate: Liban has chosen you')
    expectNoExclusions(m, ['Abdi'])
    m.unmount()
  })

  it('lists nobody who was left out, and no reason, for any sample, side or tester age', { timeout: 90_000 }, async () => {
    for (const side of ['woman', 'man'] as const) {
      for (const sample of ['three', 'one', 'none'] as const) {
        for (const age of ['18', '41']) {
          const m = await mount(<MatchPrototype />)
          try {
            await start(m, side, sample)
            await m.type(OWN_AGE, age)
            await toReview(m)
            await m.press('Show me suggestions')
            const shown = cards(m)
            expectNoExclusions(
              m,
              peopleFor(side).map((p) => p.firstName).filter((n) => !shown.includes(n)),
              `${side} ${sample} ${age}`,
            )
          } finally {
            m.unmount()
          }
        }
      }
    }
  })

  it('“Doesn’t matter” shows people of any age, and says the age was not compared', async () => {
    const m = await mount(<MatchPrototype />)
    await start(m, 'woman', 'three')
    await choose(m, 'Doesn’t matter')
    await toReview(m)
    await m.press('Show me suggestions')
    expect(cards(m)).toEqual(['Abdi', 'Liban', 'Yusuf'])
    expect(m.container.querySelector('main')!.textContent).not.toContain('Age:')
    await m.press('Read more about Yusuf')
    expect(m.text()).toContain('You said these do not matter, so they are not compared: age.')
    expect(m.text()).not.toContain('Age. Yusuf')
    m.unmount()
  })

  it('never shows another person’s age range anywhere, and shows only the point in the tester’s own panel', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    const seen = (): string => m.text()
    const theirs = othersRanges()
    const check = () => {
      for (const r of theirs) expect(seen(), r).not.toContain(r)
    }
    check()
    await m.press('Read more about Abdi')
    check()
    await m.press('I’m interested')
    check()
    m.unmount()
  })
})

/** Every range the made-up people ask of the tester, as the text a screen would show it. */
function othersRanges(): string[] {
  const out = new Set<string>()
  for (const p of peopleFor('man')) if (p.ageAsk.firm !== 'any') out.add(`${p.ageAsk.min} to ${p.ageAsk.max}`)
  for (const p of peopleFor('woman')) if (p.ageAsk.firm !== 'any') out.add(`${p.ageAsk.min} to ${p.ageAsk.max}`)
  // The tester’s own sample range is shown to them and is not another person’s.
  out.delete('28 to 34')
  return [...out]
}

describe('editing is read-only after a choice, as for the other asks', () => {
  it('disables the tester’s age and age choice, keeps the name editable, and says so', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Liban')
    await m.press('Not for me')
    await m.press('Back')
    await m.press('Back')
    await m.press('Change age')
    expect(h1s(m)).toEqual(['About you.'])
    expect(m.text()).toContain('read-only now. Start again to change')
    expect(field(m, OWN_AGE)!.disabled).toBe(true)
    expect(field(m, 'Youngest age')!.closest('fieldset')!.disabled).toBe(true)
    expect(inputs(m).filter((f) => f.type === 'radio').every((f) => (f.closest('fieldset') as HTMLFieldSetElement).disabled)).toBe(true)
    expect(field(m, 'A made-up first name')!.disabled).toBe(false)
    m.unmount()
  })
})

describe('the sample journeys still give three, one and no suggestions, on either side', () => {
  it.each([
    ['woman', 'three', ['Abdi', 'Liban', 'Yusuf']],
    ['man', 'three', ['Amina', 'Sahra', 'Ladan']],
    ['woman', 'one', ['Hassan']],
    ['man', 'one', ['Ifrah']],
    ['woman', 'none', []],
    ['man', 'none', []],
  ] as const)('%s, %s', async (side, sample, names) => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m, side, sample)
    expect(cards(m)).toEqual(names)
    if (names.length === 0) {
      expect(m.text()).toContain('No one is suggested to you right now.')
      expect(m.text()).toContain('See what I asked for')
      expect(screenText(m)).not.toMatch(/relax|loosen|widen|change your/i)
    }
    m.unmount()
  })

  it('the one-suggestion sample’s prewritten text is still shown and does not contradict the age on screen', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m, 'woman', 'one')
    await m.press('Read more about Hassan')
    expect(m.text()).toContain('Demo example')
    expect(m.text()).toContain('On practice, Hassan chose “I practise occasionally”')
    // Hassan is inside the ages this sample asked for, so there is no age difference to be silent about.
    expect(m.text()).not.toContain('Age. Hassan’s age')
    expect(m.text()).toContain('Age. Hassan is 34, within the 32 to 40 you asked for.')
    m.unmount()
  })

  it('the three-suggestion sample’s prewritten text for the person outside the preferred ages says so', async () => {
    const m = await mount(<MatchPrototype />)
    await toSuggestions(m)
    await m.press('Read more about Yusuf')
    expect(m.text()).toContain('he is 27, outside the 28 to 34 you preferred, and lives in Toronto')
    // Changing the age choice makes the fixed text unavailable rather than leaving it saying what the answers no longer say.
    await m.press('Back')
    await m.press('Back')
    await m.press('Change age')
    await m.type('Youngest age', '20')
    await m.press('Continue')
    await m.press('Show me suggestions')
    await m.press('Read more about Yusuf')
    expect(m.text()).toContain('Unavailable. This example was written for a sample scenario, and your answers no longer match it.')
    expect(m.text()).not.toContain('he is 27, outside')
    m.unmount()
  })
})

describe('the notes page tells the truth about age', () => {
  it('says age is used, in which ways, and that the bounds are demo constraints and not policy', async () => {
    const m = await mount(<MatchPrototype />)
    await m.press('See what’s real and what isn’t')
    expect(m.text()).not.toContain('Age is shown but not used')
    expect(m.text()).not.toContain('Age preferences are not built')
    expect(m.text()).toContain('Age works like the six points')
    expect(m.text()).toContain('Ages from 18 to 99 are the limits of this demo, not a policy')
    expect(m.text()).toContain('No age is checked or verified')
    expect(audit(m.container)).toEqual([])
    m.unmount()
  })
})
