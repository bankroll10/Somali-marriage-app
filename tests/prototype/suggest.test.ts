import { describe, expect, it } from 'vitest'
import { CRITERIA } from '../../src/prototype/match/criteria'
import { PAIR_TEXT, SCENARIOS, fingerprint, pairTextFor, peopleFor, scenarioOf } from '../../src/prototype/match/fixtures'
import { SHOWN_LIMIT, compare, evaluate, judge, looksLikeContact, orList, pairFixture, type Self } from '../../src/prototype/match/suggest'
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

const selfWith = (me: Self, asks: Partial<Asks>): Self => ({ ...me, asks: { ...me.asks, ...asks } })

describe('where two sets of answers line up and differ', () => {
  const me = selfOf('three', 'woman')
  const [p1, p2, p3] = peopleFor('woman')

  it('reads only the tester’s own asks, and only a preference can differ', () => {
    expect(compare(me, p1).differ).toEqual([])
    expect(compare(me, p2).differ.map((d) => d.id)).toEqual(['work'])
    expect(compare(me, p3).differ.map((d) => d.id)).toEqual(['practice', 'city', 'work', 'household'])
    for (const p of [p1, p2, p3]) for (const d of compare(me, p).differ) expect(me.asks[d.id].firm).toBe('preference')
  })

  it('attributes each answer to the person who gave it, against what the tester said would work, and shows no number', () => {
    const c = compare(me, p2)
    expect(c.differ[0]).toEqual({ id: 'work', theirs: 'I plan to be at home', preferred: ['I plan to work', 'I am open to either'] })
    for (const x of c.lineUp) expect(x.text).not.toMatch(/\d/)
    expect(orList(c.differ[0].preferred)).toBe('“I plan to work” or “I am open to either”')
    expect(orList(['A', 'B', 'C'])).toBe('“A”, “B” or “C”')
    expect(orList(['A'])).toBe('“A”')
  })

  // MATCH-02, refinement 1: the comparison is with the answers the tester accepted, not with their own answer.
  describe('regression: a preference is compared with the accepted answers, not with the tester’s own answer', () => {
    it('a different personal answer that the tester accepted still lines up, and is not a difference', () => {
      // Liban said “In one to two years”; the tester said “Within a year”, and accepts both.
      expect(p2.answers.timeline).not.toBe(me.answers.timeline)
      const c = compare(selfWith(me, { timeline: { accept: ['t-year', 't-two'], firm: 'preference' } }), p2)
      expect(c.lineUp.find((x) => x.id === 'timeline')).toMatchObject({ theirs: 'In one to two years' })
      expect(c.differ.map((d) => d.id)).not.toContain('timeline')
    })

    it('the same answer as the tester’s own is still a difference when the tester did not accept it', () => {
      // The tester answers “I plan to work” but would prefer someone “open to either”; Abdi plans to work.
      expect(p1.answers.work).toBe(me.answers.work)
      const c = compare(selfWith(me, { work: { accept: ['w-either'], firm: 'preference' } }), p1)
      expect(c.differ.find((d) => d.id === 'work')).toEqual({ id: 'work', theirs: 'I plan to work', preferred: ['I am open to either'] })
      expect(c.lineUp.map((x) => x.id)).not.toContain('work')
    })

    it('reports exactly the answers the tester selected as preferred, in the order the form lists them and not the order they were ticked', () => {
      const c = compare(selfWith(me, { household: { accept: ['h-open', 'h-own'], firm: 'preference' } }), p3)
      expect(c.differ.find((d) => d.id === 'household')!.preferred).toEqual(['Our own home', 'Open to living with family for a time'])
    })
  })

  it('does not compare a point the tester said does not matter', () => {
    const lax: Self = { ...me, asks: { ...me.asks, work: { accept: [], firm: 'any' } } }
    const c = compare(lax, p2)
    expect(c.unused).toEqual(['work'])
    expect([...c.lineUp, ...c.differ].map((x) => x.id)).not.toContain('work')
  })

  it('updates when the answers change', () => {
    // Changing only the tester's own answer changes nothing: the comparison reads what they accepted.
    const edited: Self = { ...me, answers: { ...me.answers, work: 'w-either' } }
    expect(compare(edited, p2).differ.find((d) => d.id === 'work')).toEqual(compare(me, p2).differ.find((d) => d.id === 'work'))
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

describe('the hand-written summaries, held against the answers they were written for', () => {
  // The structured facts are metadata the writer keeps beside the prose. These tests catch drift between the
  // prose, the facts and the answers; they cannot show that every sentence is accurate. Each sentence was read
  // against the scenario's answers when it was written, and the claims below pin the specific phrases.
  const cases = SIDES.flatMap((side) =>
    SCENARIOS.flatMap((sc) => {
      const self = selfOf(sc.id, side)
      return evaluate(self, peopleFor(side)).shown.map((p) => ({ side, sc, self, p }))
    }),
  )

  it('every person each scenario shows has a text whose facts match the comparison', () => {
    expect(cases.length).toBeGreaterThan(0)
    for (const { sc, self, p } of cases) {
      const text = pairTextFor(sc.id, p.id)!
      const c = compare(self, p)
      const why = `${sc.id}/${p.id}`
      expect([...text.facts.differs].sort(), why).toEqual(c.differ.map((d) => d.id).sort())
      for (const id of text.facts.same) expect(p.answers[id], `${why} same ${id}`).toBe(self.answers[id])
      for (const id of text.facts.workable) {
        expect(p.answers[id], `${why} workable ${id}`).not.toBe(self.answers[id])
        expect(c.lineUp.map((x) => x.id), `${why} workable ${id}`).toContain(id)
      }
      // No point is claimed twice.
      const all = [...text.facts.same, ...text.facts.workable, ...text.facts.differs]
      expect(new Set(all).size, why).toBe(all.length)
    }
  })

  it('the points a summary names are exactly the points its facts claim', () => {
    const WORDS: Record<(typeof CRITERION_IDS)[number], RegExp> = {
      timeline: /\btiming\b|\btimeline\b/i,
      children: /\bchildren\b/i,
      practice: /\bpractice\b/i,
      city: /\bcity\b|\bToronto\b|\bLondon\b/i,
      work: /\bwork\b|at home/i,
      household: /\bhousehold\b/i,
    }
    for (const [sc, byPerson] of Object.entries(PAIR_TEXT)) {
      for (const [key, text] of Object.entries(byPerson!)) {
        const claimed = new Set([...text.facts.same, ...text.facts.workable, ...text.facts.differs])
        const named = new Set(CRITERION_IDS.filter((id) => WORDS[id].test(text.summary)))
        expect([...named].sort(), `${sc}/${key}`).toEqual([...claimed].sort())
      }
    }
  })

  // Each entry is a sentence of prose and what it says about the answers, written by reading the sentence.
  const CLAIMS: { sc: 'three' | 'one'; key: string; says: string; holds: (self: Self, p: ReturnType<typeof peopleFor>[number]) => boolean }[] = [
    { sc: 'three', key: 'p1', says: 'give the same answers on timing, children, city, work and household', holds: (m, p) => (['timeline', 'children', 'city', 'work', 'household'] as const).every((id) => p.answers[id] === m.answers[id]) },
    { sc: 'three', key: 'p1', says: 'you both want to marry within a year', holds: (m, p) => p.answers.timeline === 't-year' && m.answers.timeline === 't-year' },
    { sc: 'three', key: 'p1', says: 'practice as steadier than yours', holds: (m, p) => p.answers.practice === 'p-steady' && m.answers.practice === 'p-build' },
    { sc: 'three', key: 'p2', says: 'a little later on timing (one to two years, where you said within a year)', holds: (m, p) => p.answers.timeline === 't-two' && m.answers.timeline === 't-year' },
    { sc: 'three', key: 'p2', says: 'open on children where you said you want them', holds: (m, p) => p.answers.children === 'c-open' && m.answers.children === 'c-want' },
    { sc: 'three', key: 'p2', says: 'plans to be at home and you plan to work', holds: (m, p) => p.answers.work === 'w-home' && m.answers.work === 'w-work' },
    { sc: 'three', key: 'p2', says: 'The one difference you marked as a preference is work', holds: (m, p) => compare(m, p).differ.length === 1 && compare(m, p).differ[0].id === 'work' },
    { sc: 'three', key: 'p3', says: 'meets your requirements on timing and children', holds: (m, p) => judge(m, p).byYou.length === 0 && m.asks.timeline.firm === 'requirement' && m.asks.children.firm === 'requirement' },
    { sc: 'three', key: 'p3', says: 'differs from your preferences on practice, city, work and household', holds: (m, p) => compare(m, p).differ.map((d) => d.id).join() === 'practice,city,work,household' },
    { sc: 'three', key: 'p3', says: 'lives in Toronto, where you do not', holds: (m, p) => p.answers.city === 'toronto' && m.answers.city !== 'toronto' },
    { sc: 'one', key: 'p4', says: 'give the same answers on timing, children, city and household', holds: (m, p) => (['timeline', 'children', 'city', 'household'] as const).every((id) => p.answers[id] === m.answers[id]) },
    { sc: 'one', key: 'p4', says: 'practice as occasional, where you describe yours as steady, which you marked as a preference', holds: (m, p) => p.answers.practice === 'p-occasional' && m.answers.practice === 'p-steady' && m.asks.practice.firm === 'preference' },
  ]

  it.each(SIDES)('the specific claims each summary makes are true of the answers, for a tester who is a %s', (side) => {
    for (const c of CLAIMS) {
      const self = selfOf(c.sc, side)
      const p = peopleFor(side).find((x) => x.id.endsWith(c.key))!
      const f = pairFixture(self, c.sc, p)
      expect(f.available).toBe(true)
      if (f.available) expect(f.text.summary, `${c.sc}/${c.key}`).toContain(c.says)
      expect(c.holds(self, p), `${c.sc}/${c.key}: ${c.says}`).toBe(true)
    }
  })

  it('every sentence-level claim table entry belongs to a text that exists, and every text has at least one claim', () => {
    for (const [sc, byPerson] of Object.entries(PAIR_TEXT)) for (const key of Object.keys(byPerson!)) expect(CLAIMS.some((c) => c.sc === sc && c.key === key), `${sc}/${key}`).toBe(true)
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
