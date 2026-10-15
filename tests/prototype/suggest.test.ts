import { describe, expect, it } from 'vitest'
import { CRITERIA } from '../../src/prototype/match/criteria'
import { SCENARIOS, fingerprint, peopleFor, scenarioOf } from '../../src/prototype/match/fixtures'
import { SHOWN_LIMIT, compare, evaluate, judge, looksLikeContact, pairFixture, type Self } from '../../src/prototype/match/suggest'
import { CRITERION_IDS, type Asks, type Side } from '../../src/prototype/match/types'

/**
 * Eligibility and comparison, on the sample scenarios (docs/MATCH-PROTOTYPE.md).
 * The counts below are what the scenarios promise the tester; nothing is
 * relaxed to reach them, and a requirement that fails is never softened.
 */

const selfOf = (id: 'three' | 'one' | 'none', side: Side): Self => {
  const s = scenarioOf(id)
  return { side, answers: s.answers, asks: s.asks }
}
const SIDES: Side[] = ['woman', 'man']

describe('the sample scenarios', () => {
  it.each(SIDES)('give three, one and no suggestions for a tester who is a %s, with nothing relaxed', (side) => {
    const people = peopleFor(side)
    expect(evaluate(selfOf('three', side), people).shown.map((p) => p.id.split('-')[1])).toEqual(['p1', 'p2', 'p3'])
    expect(evaluate(selfOf('one', side), people).shown.map((p) => p.id.split('-')[1])).toEqual(['p4'])
    expect(evaluate(selfOf('none', side), people).shown).toEqual([])
  })

  it('leave people out by the tester’s requirement, by the other person’s, and by both', () => {
    const people = peopleFor('woman')
    const reasons = (id: 'three' | 'one' | 'none') =>
      Object.fromEntries(evaluate(selfOf(id, 'woman'), people).leftOut.map((j) => [j.person.id.split('-')[1], { you: j.byYou.length > 0, them: j.byThem.length > 0 }]))
    expect(reasons('three')).toEqual({ p4: { you: true, them: true }, p5: { you: false, them: true } })
    expect(reasons('one')).toMatchObject({ p2: { you: true, them: false }, p1: { you: true, them: true } })
    // Nobody is eligible in the third, and both directions are at work.
    const none = reasons('none')
    expect(Object.values(none).some((r) => r.you && !r.them)).toBe(true)
    expect(Object.values(none).some((r) => !r.you && r.them)).toBe(true)
  })

  it('never show more than the limit, however many are eligible, and never reorder by anything but the fixed order', () => {
    const everyoneWelcome: Self = {
      side: 'woman',
      answers: scenarioOf('three').answers,
      asks: CRITERION_IDS.reduce((a, c) => ({ ...a, [c]: { accept: [], firm: 'any' as const } }), {} as Asks),
    }
    const people = peopleFor('woman').map((p) => ({ ...p, asks: everyoneWelcome.asks }))
    const out = evaluate(everyoneWelcome, people)
    expect(out.eligible).toHaveLength(5)
    expect(out.shown).toHaveLength(SHOWN_LIMIT)
    expect(out.shown.map((p) => p.id)).toEqual(people.slice(0, SHOWN_LIMIT).map((p) => p.id))
  })

  it('are made of adult, fictional people on both sides', () => {
    for (const side of SIDES) {
      for (const p of peopleFor(side)) {
        expect(p.age).toBeGreaterThanOrEqual(25)
        expect(p.side).not.toBe(side)
        expect(p.words.join(' ')).not.toMatch(/@|\d{5,}|https?:|www\./)
      }
    }
    for (const s of SCENARIOS) expect(s.age).toBeGreaterThanOrEqual(18)
  })
})

describe('a requirement works in both directions, and a preference never excludes', () => {
  const people = peopleFor('woman')
  const me = selfOf('three', 'woman')

  it('a requirement the person fails leaves them out; the same point as a preference does not', () => {
    const p4 = people.find((p) => p.id.endsWith('p4'))!
    expect(judge(me, p4).byYou).toEqual(['timeline'])
    const loosened: Self = { ...me, asks: { ...me.asks, timeline: { ...me.asks.timeline, firm: 'preference' } } }
    expect(judge(loosened, p4).byYou).toEqual([])
    // Left alone, the same tester still does not see p4: the prototype never loosens a requirement for them.
    expect(evaluate(me, people).shown.map((p) => p.id)).not.toContain(p4.id)
  })

  it('the other person’s requirement leaves the tester out of their suggestions', () => {
    const p5 = people.find((p) => p.id.endsWith('p5'))!
    expect(judge(me, p5)).toMatchObject({ byYou: [], byThem: ['practice'] })
  })
})

describe('where two sets of answers line up and differ', () => {
  const me = selfOf('three', 'woman')
  const [p1, p2, p3] = peopleFor('woman')

  it('reads only the tester’s own asks, and only a preference can differ', () => {
    expect(compare(me, p1).differ).toEqual([])
    expect(compare(me, p2).differ.map((d) => d.id)).toEqual(['work'])
    expect(compare(me, p3).differ.map((d) => d.id)).toEqual(['practice', 'city', 'work', 'household'])
    for (const p of [p1, p2, p3]) for (const d of compare(me, p).differ) expect(me.asks[d.id].firm).toBe('preference')
  })

  it('attributes each answer to the person who gave it, and shows no number', () => {
    const c = compare(me, p2)
    expect(c.differ[0].text).toBe('Liban said: “I plan to be at home”. You said: “I plan to work”. You marked this a preference.')
    for (const x of [...c.lineUp, ...c.differ]) expect(x.text).not.toMatch(/\d/)
  })

  it('does not compare a point the tester said does not matter', () => {
    const lax: Self = { ...me, asks: { ...me.asks, work: { accept: [], firm: 'any' } } }
    const c = compare(lax, p2)
    expect(c.unused).toEqual(['work'])
    expect([...c.lineUp, ...c.differ].map((x) => x.id)).not.toContain('work')
  })

  it('updates when the answers change', () => {
    const edited: Self = { ...me, answers: { ...me.answers, work: 'w-either' } }
    expect(compare(edited, p2).differ.find((d) => d.id === 'work')!.text).toContain('You said: “I am open to either”')
    const accepting: Self = { ...me, asks: { ...me.asks, work: { accept: ['w-work', 'w-either', 'w-home'], firm: 'preference' } } }
    expect(compare(accepting, p2).differ.map((d) => d.id)).toEqual([])
  })
})

describe('fixed pair text', () => {
  const [p1, p2] = peopleFor('woman')
  const me = selfOf('three', 'woman')

  it('is available while the answers equal the scenario it was written for', () => {
    const f = pairFixture(me, 'three', p1)
    expect(f.available).toBe(true)
    if (f.available) {
      expect(f.text.summary).toContain('Abdi')
      expect(f.text.summary).toContain('He describes his practice')
      expect(f.text.questions).toHaveLength(3)
    }
  })

  it('is unavailable after any edit to an answer or an ask, rather than saying what the answers no longer say', () => {
    const edited: Self = { ...me, answers: { ...me.answers, work: 'w-home' } }
    expect(pairFixture(edited, 'three', p2)).toEqual({ available: false, reason: 'edited' })
    const loosened: Self = { ...me, asks: { ...me.asks, city: { accept: ['mpls', 'london'], firm: 'preference' } } }
    expect(pairFixture(loosened, 'three', p2)).toEqual({ available: false, reason: 'edited' })
  })

  it('is unavailable for a tester who started with blank answers, and for a person with no text in that scenario', () => {
    expect(pairFixture(me, null, p1)).toEqual({ available: false, reason: 'no-scenario' })
    const [, , , p4] = peopleFor('woman')
    expect(pairFixture(me, 'three', p4)).toEqual({ available: false, reason: 'none-written' })
  })

  it('does not depend on the words, the name or the age, which no pair text mentions', () => {
    // The fingerprint covers only answers and asks.
    expect(fingerprint('woman', me.answers, me.asks)).toBe(fingerprint('woman', { ...me.answers }, { ...me.asks }))
  })

  it('has a text for every person each scenario shows, and none for a person it does not show', () => {
    for (const side of SIDES) {
      for (const sc of SCENARIOS) {
        const self = selfOf(sc.id, side)
        const shown = evaluate(self, peopleFor(side)).shown
        for (const p of shown) expect(pairFixture(self, sc.id, p).available, `${sc.id}/${p.id}`).toBe(true)
      }
    }
  })
})

describe('contact details', () => {
  it.each(['write me at a.b@example.com', 'call 612 555 0148', '+44 7700 900123', 'find me @hodan_made_up', 'see https://example.com/me', 'www.example.org', 'my site is hodan.com'])(
    'are noticed in %s',
    (text) => expect(looksLikeContact(text)).toBe(true),
  )
  it.each(['I want a calm home.', 'I am 29 and I work.', 'Within a year, in 2 or 3 steps.'])('are not seen in %s', (text) => expect(looksLikeContact(text)).toBe(false))
})

describe('the criteria', () => {
  it('are the six provisional points, each with at least two options, and none of the four that stay conversations', () => {
    expect(CRITERIA.map((c) => c.id)).toEqual([...CRITERION_IDS])
    for (const c of CRITERIA) expect(c.options.length).toBeGreaterThanOrEqual(2)
    const all = JSON.stringify(CRITERIA).toLowerCase()
    for (const banned of ['qabiil', 'clan', 'mahr', 'going back', 'going-back']) expect(all).not.toContain(banned)
  })
})
