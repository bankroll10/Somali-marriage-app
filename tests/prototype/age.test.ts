import { describe, expect, it } from 'vitest'
import { AGE_MAX, AGE_MIN, parseAge } from '../../src/prototype/match/age'
import { PAIR_TEXT, SCENARIOS, fingerprint, pairTextFor, peopleFor, scenarioOf } from '../../src/prototype/match/fixtures'
import { completeSelf, emptyMe, initial, locked, missingAbout, missingAgeAsk, reduce, type Action, type Me, type Session } from '../../src/prototype/match/flow'
import { compare, evaluate, judge, pairFixture, type Self } from '../../src/prototype/match/suggest'
import { CRITERION_IDS, type AgeAsk, type Asks, type Person, type ScenarioId, type Side } from '../../src/prototype/match/types'

/**
 * Age, as a working part of the two-way requirements and preferences (docs/MATCH-PROTOTYPE.md).
 *
 * A tester has their own age and, separately, the ages they would consider in a partner: an inclusive
 * range with an explicit Requirement, Preference or Doesn’t matter. Every test here isolates age: both
 * people say “Doesn’t matter” on the six points, so the only thing that can include or leave someone
 * out is an age.
 *
 * Sections marked [existing] describe behaviour the demo already had and must keep. The rest describe
 * the new behaviour.
 */

const SIDES: Side[] = ['woman', 'man']

const anything = (): Asks => CRITERION_IDS.reduce((a, c) => ({ ...a, [c]: { accept: [], firm: 'any' as const } }), {} as Asks)
const range = (firm: 'requirement' | 'preference', min: number, max: number): AgeAsk => ({ firm, min, max })
const ANY: AgeAsk = { firm: 'any' }

/** A tester who cares about nothing but age. */
const tester = (age: number, ageAsk: AgeAsk): Self => ({ side: 'woman', age, ageAsk, answers: scenarioOf('three').answers, asks: anything() })
/** A made-up person who cares about nothing but age. */
const other = (age: number, ageAsk: AgeAsk): Person => ({ ...peopleFor('woman')[0], age, ageAsk, asks: anything() })

const byYou = (me: Self, p: Person) => judge(me, p).byYou
const byThem = (me: Self, p: Person) => judge(me, p).byThem

describe('[existing] the demo’s age handling before age preferences', () => {
  it('accepts a whole-number own age from 18 to 99 and rejects anything else, so every age is an adult age', () => {
    const me = (age: string): Me => ({ ...emptyMe(), name: 'Maryan', age })
    for (const ok of ['18', '19', '30', '99']) expect(missingAbout(me(ok)), ok).toEqual([])
    for (const bad of ['', '17', '0', '100', '30.5', 'abc']) expect(missingAbout(me(bad)).length, bad).toBeGreaterThan(0)
  })

  it('has ten made-up people, five on each side, all adult, and three sample scenarios with adult ages', () => {
    for (const side of SIDES) {
      const people = peopleFor(side)
      expect(people).toHaveLength(5)
      for (const p of people) {
        expect(Number.isInteger(p.age)).toBe(true)
        expect(p.age).toBeGreaterThanOrEqual(18)
      }
    }
    expect(SCENARIOS.map((s) => s.id)).toEqual(['three', 'one', 'none'])
    for (const s of SCENARIOS) expect(Number.isInteger(s.age) && s.age >= 18 && s.age <= 99).toBe(true)
  })

  it('still gives three, one and no suggestions in the three samples, on either side, with nothing relaxed', () => {
    const counts = (id: ScenarioId, side: Side) => {
      const s = scenarioOf(id)
      const self: Self = { side, age: s.age, ageAsk: s.ageAsk, answers: s.answers, asks: s.asks }
      return evaluate(self, peopleFor(side)).shown.map((p) => p.id.split('-')[1])
    }
    for (const side of SIDES) {
      expect(counts('three', side)).toEqual(['p1', 'p2', 'p3'])
      expect(counts('one', side)).toEqual(['p4'])
      expect(counts('none', side)).toEqual([])
    }
  })
})

describe('the supported bounds are one pair of constants, shared by the tester and the made-up people', () => {
  it('are 18 and 99, and are demo constraints', () => {
    expect([AGE_MIN, AGE_MAX]).toEqual([18, 99])
  })

  it('parseAge accepts whole numbers inside the bounds, both ends included', () => {
    expect(parseAge('18')).toBe(18)
    expect(parseAge('99')).toBe(99)
    expect(parseAge('30')).toBe(30)
    expect(parseAge(' 30 ')).toBe(30)
  })

  it.each(['', ' ', '17', '100', '0', '-30', '+30', '30.5', '30,5', '3e1', '0x20', '030', 'thirty', '३०', '30 31'])('parseAge rejects %j', (text) => {
    expect(parseAge(text)).toBeNull()
  })

  it('every made-up person, and every sample, has an explicit age choice inside the bounds', () => {
    const asks: AgeAsk[] = [...SIDES.flatMap((side) => peopleFor(side).map((p) => p.ageAsk)), ...SCENARIOS.map((s) => s.ageAsk)]
    for (const a of asks) {
      expect(['requirement', 'preference', 'any']).toContain(a.firm)
      if (a.firm !== 'any') {
        expect(Number.isInteger(a.min) && Number.isInteger(a.max)).toBe(true)
        expect(a.min).toBeGreaterThanOrEqual(AGE_MIN)
        expect(a.max).toBeLessThanOrEqual(AGE_MAX)
        expect(a.min).toBeLessThanOrEqual(a.max)
      }
    }
    // The fictional people use all three choices, so each is on show.
    expect(new Set(peopleFor('woman').map((p) => p.ageAsk.firm))).toEqual(new Set(['requirement', 'preference', 'any']))
    // Each sample makes one explicit choice, and the three samples make three different ones.
    expect(SCENARIOS.map((s) => s.ageAsk.firm).sort()).toEqual(['any', 'preference', 'requirement'])
  })
})

describe('a requirement leaves out anyone outside the range, both ends included', () => {
  const me = tester(30, range('requirement', 28, 34))

  it.each([
    [27, true],
    [28, false],
    [31, false],
    [34, false],
    [35, true],
  ])('a person aged %i is left out by the tester’s requirement: %s', (age, out) => {
    expect(byYou(me, other(age, ANY))).toEqual(out ? ['age'] : [])
    expect(evaluate(me, [other(age, ANY)]).shown).toHaveLength(out ? 0 : 1)
  })

  it('a range of one age is a valid, inclusive range', () => {
    const exact = tester(30, range('requirement', 31, 31))
    expect(byYou(exact, other(31, ANY))).toEqual([])
    expect(byYou(exact, other(30, ANY))).toEqual(['age'])
    expect(byYou(exact, other(32, ANY))).toEqual(['age'])
  })

  it('works at the lowest and highest supported ages', () => {
    const wide = tester(30, range('requirement', AGE_MIN, AGE_MAX))
    expect(byYou(wide, other(AGE_MIN, ANY))).toEqual([])
    expect(byYou(wide, other(AGE_MAX, ANY))).toEqual([])
  })
})

describe('the other person’s requirement leaves out the tester, applied independently', () => {
  const them = (age = 40) => other(age, range('requirement', 30, 40))

  it.each([
    [29, true],
    [30, false],
    [35, false],
    [40, false],
    [41, true],
  ])('a tester aged %i is left out by the other person’s requirement: %s', (age, out) => {
    const me = tester(age, ANY)
    expect(byThem(me, them())).toEqual(out ? ['age'] : [])
    expect(evaluate(me, [them()]).shown).toHaveLength(out ? 0 : 1)
  })

  it('each direction is checked on its own: one can fail while the other holds, and both can fail', () => {
    // Mine holds (their age 35 is in 33 to 37); theirs fails (my age 25 is outside 30 to 40).
    const mineOnly = tester(25, range('requirement', 33, 37))
    expect(byYou(mineOnly, other(35, range('requirement', 30, 40)))).toEqual([])
    expect(byThem(mineOnly, other(35, range('requirement', 30, 40)))).toEqual(['age'])
    // Mine fails (their age 45 is outside 33 to 37); theirs holds (my age 35 is in 30 to 40).
    const theirsOnly = tester(35, range('requirement', 33, 37))
    expect(byYou(theirsOnly, other(45, range('requirement', 30, 40)))).toEqual(['age'])
    expect(byThem(theirsOnly, other(45, range('requirement', 30, 40)))).toEqual([])
    // Both fail.
    const both = tester(25, range('requirement', 33, 37))
    const p = other(45, range('requirement', 30, 40))
    expect(byYou(both, p)).toEqual(['age'])
    expect(byThem(both, p)).toEqual(['age'])
    expect(evaluate(both, [p]).shown).toEqual([])
    expect(evaluate(both, [p]).leftOut).toHaveLength(1)
  })

  it('a requirement that the tester satisfies in both directions shows the person', () => {
    expect(evaluate(tester(35, range('requirement', 33, 37)), [other(35, range('requirement', 30, 40))]).shown).toHaveLength(1)
  })
})

describe('a preference keeps otherwise eligible people and shows the difference', () => {
  const me = tester(30, range('preference', 28, 34))

  it('does not leave anyone out, whatever their age', () => {
    for (const age of [18, 27, 28, 34, 35, 60, 99]) {
      expect(byYou(me, other(age, ANY)), String(age)).toEqual([])
      expect(evaluate(me, [other(age, ANY)]).shown, String(age)).toHaveLength(1)
    }
  })

  it('reports a difference only outside the range, with the age and the range the tester chose', () => {
    expect(compare(me, other(27, ANY)).age).toEqual({ state: 'differs', theirs: 27, min: 28, max: 34 })
    expect(compare(me, other(35, ANY)).age).toEqual({ state: 'differs', theirs: 35, min: 28, max: 34 })
    expect(compare(me, other(28, ANY)).age).toEqual({ state: 'fits', theirs: 28, min: 28, max: 34 })
    expect(compare(me, other(34, ANY)).age).toEqual({ state: 'fits', theirs: 34, min: 28, max: 34 })
  })

  it('does not affect the six points’ differences', () => {
    expect(compare(me, other(27, ANY)).differ).toEqual([])
  })

  it('the other person’s preference never leaves the tester out and is never shown to the tester', () => {
    const p = other(40, range('preference', 61, 62))
    expect(byThem(me, p)).toEqual([])
    expect(evaluate(me, [p]).shown).toHaveLength(1)
    // What the other person chose is not in anything the tester is shown about them.
    const shownAbout = JSON.stringify(compare(me, p))
    expect(shownAbout).not.toMatch(/61|62/)
    expect(shownAbout).not.toMatch(/preference/)
  })
})

describe('“Doesn’t matter” ignores the tester’s range, and the tester’s own age still counts', () => {
  const me = tester(30, ANY)

  it('shows people of any age', () => {
    for (const age of [18, 45, 99]) expect(byYou(me, other(age, ANY))).toEqual([])
    expect(compare(me, other(45, ANY)).age).toEqual({ state: 'unused' })
  })

  it('still leaves the tester out when their own age fails the other person’s requirement', () => {
    expect(byThem(me, other(40, range('requirement', 35, 45)))).toEqual(['age'])
    expect(evaluate(me, [other(40, range('requirement', 35, 45))]).shown).toEqual([])
    expect(byThem(me, other(40, range('requirement', 30, 45)))).toEqual([])
  })

  it('a range typed before choosing Doesn’t matter is kept in the form and is not used', () => {
    let s = reduce(initial(), { type: 'start', side: 'woman', scenario: 'three' })
    s = reduce(s, { type: 'ageFirm', value: 'any' })
    expect(s.me.ageAsk).toMatchObject({ min: '28', max: '34', firm: 'any' })
    expect(completeSelf(s.me)!.ageAsk).toEqual({ firm: 'any' })
    s = reduce(s, { type: 'ageFirm', value: 'preference' })
    expect(completeSelf(s.me)!.ageAsk).toEqual({ firm: 'preference', min: 28, max: 34 })
  })
})

describe('nothing is ever relaxed to fill the suggestions', () => {
  it('shows fewer than three when a requirement leaves fewer, and does not refill from people outside the range', () => {
    const people = peopleFor('woman').map((p, i) => ({ ...p, asks: anything(), ageAsk: ANY, age: [25, 27, 29, 40, 41][i] }))
    const me = tester(30, range('requirement', 24, 28))
    const out = evaluate(me, people)
    expect(out.eligible.map((p) => p.age)).toEqual([25, 27])
    expect(out.shown.map((p) => p.age)).toEqual([25, 27])
    expect(out.leftOut.map((j) => j.person.age)).toEqual([29, 40, 41])
    // Nobody who is outside the range appears, however few are left.
    expect(evaluate(tester(30, range('requirement', 90, 99)), people).shown).toEqual([])
  })
})

describe('validating the range the tester would consider', () => {
  const me = (min: string, max: string, firm: Me['ageAsk']['firm']): Me => ({ ...emptyMe(), ageAsk: { min, max, firm } })

  it('starts blank, with no choice made for the person', () => {
    expect(emptyMe().ageAsk).toEqual({ min: '', max: '', firm: null })
    const started = reduce(initial(), { type: 'start', side: 'woman' })
    expect(started.me.ageAsk).toEqual({ min: '', max: '', firm: null })
    expect(completeSelf(started.me)).toBeNull()
  })

  it('asks for the choice first, and for both ends where a range is required', () => {
    expect(missingAgeAsk(me('', '', null))).toEqual(['min', 'max', 'firm'])
    expect(missingAgeAsk(me('28', '34', null))).toEqual(['firm'])
    expect(missingAgeAsk(me('', '', 'requirement'))).toEqual(['min', 'max'])
    expect(missingAgeAsk(me('', '34', 'preference'))).toEqual(['min'])
    expect(missingAgeAsk(me('28', '', 'preference'))).toEqual(['max'])
    expect(missingAgeAsk(me('28', '34', 'requirement'))).toEqual([])
    expect(missingAgeAsk(me('28', '34', 'preference'))).toEqual([])
  })

  it('accepts both bounds and a single age, and rejects a reversed range', () => {
    expect(missingAgeAsk(me('18', '99', 'requirement'))).toEqual([])
    expect(missingAgeAsk(me('30', '30', 'requirement'))).toEqual([])
    expect(missingAgeAsk(me('35', '34', 'requirement'))).toEqual(['order'])
    expect(missingAgeAsk(me('99', '18', 'preference'))).toEqual(['order'])
  })

  it.each(['17', '100', '0', '30.5', '3e1', '-30', 'abc', '030', '٣٠'])('rejects %j at either end, so no age outside 18 to 99 or fractional age gets in', (bad) => {
    expect(missingAgeAsk(me(bad, '40', 'requirement')), `min ${bad}`).toEqual(['min'])
    expect(missingAgeAsk(me('20', bad, 'requirement')), `max ${bad}`).toEqual(['max'])
  })

  it('does not require a range at all when it does not matter, however the boxes were left', () => {
    expect(missingAgeAsk(me('', '', 'any'))).toEqual([])
    expect(missingAgeAsk(me('17', '9', 'any'))).toEqual([])
    expect(missingAgeAsk(me('abc', '', 'any'))).toEqual([])
  })

  it('does not let an incomplete or invalid range reach the suggestions', () => {
    const start = reduce(initial(), { type: 'start', side: 'woman', scenario: 'three' })
    for (const [min, max] of [['', '34'], ['28', ''], ['35', '34'], ['17', '34'], ['28', '100'], ['28.5', '34']]) {
      const s = [{ type: 'ageMin', value: min }, { type: 'ageMax', value: max }].reduce((acc, a) => reduce(acc, a as Action), start)
      expect(completeSelf(s.me), `${min}-${max}`).toBeNull()
      expect(reduce(s, { type: 'show' }).stage, `${min}-${max}`).toBe('about')
    }
  })

  it('does not accept an own age that is not a whole number from 18 to 99', () => {
    const base = reduce(initial(), { type: 'start', side: 'woman', scenario: 'three' })
    for (const bad of ['17', '100', '30.5', '', 'abc']) {
      const s = reduce(base, { type: 'age', value: bad })
      expect(missingAbout(s.me).length, bad).toBeGreaterThan(0)
      expect(completeSelf(s.me), bad).toBeNull()
    }
    expect(completeSelf(reduce(base, { type: 'age', value: '99' }).me)!.age).toBe(99)
  })
})

describe('editing, under the existing rules', () => {
  const fresh = (scenario: ScenarioId = 'three'): Session => reduce(initial(), { type: 'start', side: 'woman', scenario })
  const run = (s: Session, ...actions: Action[]) => actions.reduce(reduce, s)

  it('the samples fill the form with the sample’s own age choice, as text, and the person’s own age separately', () => {
    const s = fresh('three')
    expect(s.me.age).toBe(String(scenarioOf('three').age))
    const a = scenarioOf('three').ageAsk
    expect(a.firm).not.toBe('any')
    expect(s.me.ageAsk.firm).toBe(a.firm)
    if (a.firm !== 'any') expect(s.me.ageAsk).toEqual({ min: String(a.min), max: String(a.max), firm: a.firm })
    // Changing one never changes the other.
    expect(run(s, { type: 'age', value: '41' }).me.ageAsk).toEqual(s.me.ageAsk)
    expect(run(s, { type: 'ageMin', value: '20' }).me.age).toBe(s.me.age)
  })

  it('changing the range before the suggestions are shown changes who is shown', () => {
    const tight = run(fresh('three'), { type: 'ageFirm', value: 'requirement' }, { type: 'ageMin', value: '28' }, { type: 'ageMax', value: '34' }, { type: 'show' })
    // The 27-year-old is outside the range and is left out, and nobody takes their place.
    expect(tight.shown.map((id) => id.split('-')[1])).toEqual(['p1', 'p2'])
    const wide = run(tight, { type: 'go', stage: 'about', editing: true }, { type: 'ageMin', value: '25' }, { type: 'show' })
    expect(wide.shown.map((id) => id.split('-')[1])).toEqual(['p1', 'p2', 'p3'])
  })

  it('the tester’s own age changes who is shown, through the other person’s requirement', () => {
    const base = fresh('three')
    expect(run(base, { type: 'show' }).shown.map((id) => id.split('-')[1])).toEqual(['p1', 'p2', 'p3'])
    // Abdi asks for 27 to 35; a 41-year-old does not fit his requirement and is not shown to him.
    const older = run(base, { type: 'age', value: '41' }, { type: 'show' })
    expect(older.shown.map((id) => id.split('-')[1])).not.toContain('p1')
  })

  it('is read-only after the tester has chosen or passed on someone, like the other asks, and is lifted when that is undone', () => {
    const shown = run(fresh('three'), { type: 'show' })
    const decided = run(shown, { type: 'decide', person: shown.shown[0], choice: 'passed' })
    expect(locked(decided)).toBe(true)
    for (const a of [
      { type: 'ageMin', value: '20' },
      { type: 'ageMax', value: '60' },
      { type: 'ageFirm', value: 'any' },
      { type: 'age', value: '45' },
    ] as Action[]) {
      expect(reduce(decided, a), a.type).toBe(decided)
    }
    const undone = run(decided, { type: 'undoPass', person: shown.shown[0] })
    expect(locked(undone)).toBe(false)
    expect(reduce(undone, { type: 'ageMin', value: '20' }).me.ageAsk.min).toBe('20')
  })

  it('the name stays editable when the rest is read-only, as before', () => {
    const shown = run(fresh('three'), { type: 'show' })
    const decided = run(shown, { type: 'decide', person: shown.shown[0], choice: 'passed' })
    expect(reduce(decided, { type: 'name', value: 'Sahra' }).me.name).toBe('Sahra')
  })
})

describe('the prewritten summaries and questions, with age in play', () => {
  const selfOf = (id: ScenarioId, side: Side, over: Partial<Self> = {}): Self => {
    const s = scenarioOf(id)
    return { side, age: s.age, ageAsk: s.ageAsk, answers: s.answers, asks: s.asks, ...over }
  }

  it('every difference the screen shows is named by the summary’s facts, age included', () => {
    for (const side of SIDES) {
      for (const sc of SCENARIOS) {
        const self = selfOf(sc.id, side)
        for (const p of evaluate(self, peopleFor(side)).shown) {
          const text = pairTextFor(sc.id, p.id)
          if (!text) continue
          const c = compare(self, p)
          const shownDifferences = [...c.differ.map((d) => d.id as string), ...(c.age.state === 'differs' ? ['age'] : [])]
          expect([...text.facts.differs].sort(), `${side}/${sc.id}/${p.id}`).toEqual(shownDifferences.sort())
        }
      }
    }
  })

  it('a summary that names an age difference says the age and the range, and it is true of the data', () => {
    for (const side of SIDES) {
      for (const sc of SCENARIOS) {
        const self = selfOf(sc.id, side)
        for (const p of evaluate(self, peopleFor(side)).shown) {
          const text = pairFixture(self, sc.id, p)
          if (!text.available) continue
          const c = compare(self, p)
          if (c.age.state === 'differs') {
            expect(text.text.summary, `${side}/${sc.id}/${p.id}`).toMatch(new RegExp(`\\bis ${c.age.theirs}\\b`))
            expect(text.text.summary, `${side}/${sc.id}/${p.id}`).toContain(`${c.age.min} to ${c.age.max}`)
          } else {
            // A summary silent about age is only accurate while there is no age difference to be silent about.
            expect(PAIR_TEXT[sc.id]![p.id.split('-')[1]].facts.differs, `${side}/${sc.id}/${p.id}`).not.toContain('age')
          }
        }
      }
    }
  })

  it('the fixed text stands down when the tester changes their age choice, and not when they change their own age', () => {
    const me = selfOf('three', 'woman')
    const [p1] = peopleFor('woman')
    expect(pairFixture(me, 'three', p1).available).toBe(true)
    expect(pairFixture({ ...me, age: me.age + 1 }, 'three', p1).available).toBe(true)
    for (const changed of [range('preference', 20, 34), range('requirement', 28, 34), ANY]) {
      expect(pairFixture({ ...me, ageAsk: changed }, 'three', p1), JSON.stringify(changed)).toEqual({ available: false, reason: 'edited' })
    }
    expect(fingerprint('woman', me.answers, me.asks, range('preference', 28, 34))).not.toBe(fingerprint('woman', me.answers, me.asks, range('preference', 28, 35)))
  })

  it('the sample scenarios keep their stated stories: who is left out by whom, and why', () => {
    const reasons = (id: ScenarioId, side: Side) => Object.fromEntries(evaluate(selfOf(id, side), peopleFor(side)).leftOut.map((j) => [j.person.id.split('-')[1], { you: j.byYou.length > 0, them: j.byThem.length > 0 }]))
    for (const side of SIDES) {
      expect(reasons('three', side)).toEqual({ p4: { you: true, them: true }, p5: { you: false, them: true } })
      expect(reasons('one', side)).toEqual({ p1: { you: true, them: true }, p2: { you: true, them: false }, p3: { you: true, them: false }, p5: { you: true, them: false } })
      expect(reasons('none', side)).toEqual({
        p1: { you: false, them: true },
        p2: { you: true, them: true },
        p3: { you: true, them: true },
        p4: { you: true, them: false },
        p5: { you: false, them: true },
      })
    }
  })
})
