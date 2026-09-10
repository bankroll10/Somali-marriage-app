import { describe, expect, it } from 'vitest'
import { alignment } from '../src/lib/matching'
import type { Candidate } from '../src/data/candidates'
import { blocked } from '../netlify/shared/gate'

/**
 * The server gate is the client gate.
 *
 * netlify/shared/gate.ts decides, for the founder's pool readout, whether two
 * counted people could be introduced; src/lib/matching.ts decides the same
 * thing for an introduction on screen. Two copies of one rule drift unless
 * something says so — this walks every combination and says so.
 */

const base: Candidate = {
  id: 'x',
  name: 'X',
  age: 30,
  gender: 'man',
  scene: 'twin-cities',
  occupation: '',
  practice: 'consistent',
  faithRole: 4,
  timeline: '1-2',
  familyRole: 'guided',
  children: 'want',
  household: 'near-family',
  work: 'both',
  moneyHome: 'some',
  values: [],
  bio: '',
  prompts: [],
}
const PRACTICE = ['devout', 'consistent', 'returning', 'cultural'] as const
const CHILDREN = ['want', 'open', 'unsure', 'no'] as const
/** The five no form can check — on the client they become the first question; here they do nothing. */
const UNCHECKABLE = ['honesty', 'respect', 'no-addiction', 'ambition-nn', 'kindness-nn']

describe('the server gate is the client gate', () => {
  it('agrees with alignment() on every combination of the two checkable non-negotiables', () => {
    let cases = 0
    for (const nn of [[], ['faith-nn'], ['kids-nn'], ['faith-nn', 'kids-nn']]) {
      for (const hers of [...CHILDREN, undefined]) {
        for (const practice of PRACTICE) {
          for (const children of CHILDREN) {
            const answers = { dealbreakers: [...nn, ...UNCHECKABLE], ...(hers ? { children: hers } : {}) }
            const him = { ...base, practice, children }
            const why = JSON.stringify({ nn, hers, practice, children })
            expect(blocked(answers.dealbreakers, answers, him) !== null, why).toBe(alignment(answers, him).blocked !== null)
            cases += 1
          }
        }
      }
    }
    expect(cases).toBe(320)
  })

  it('names which gate blocked, in the order the client checks them', () => {
    expect(blocked(['faith-nn', 'kids-nn'], { children: 'want' }, { practice: 'cultural', children: 'no' })).toBe('faith')
    expect(blocked(['kids-nn'], { children: 'want' }, { practice: 'cultural', children: 'no' })).toBe('children')
    expect(blocked(['faith-nn', 'kids-nn'], { children: 'want' }, { practice: 'devout', children: 'want' })).toBeNull()
  })

  it('an honest unsure, and an unanswered question, never clash — on either side', () => {
    expect(blocked(['kids-nn'], { children: 'unsure' }, { practice: 'devout', children: 'no' })).toBeNull()
    expect(blocked(['kids-nn'], { children: 'no' }, { practice: 'devout', children: 'unsure' })).toBeNull()
    expect(blocked(['kids-nn'], {}, { practice: 'devout', children: 'no' })).toBeNull()
    expect(blocked(['kids-nn'], { children: 'no' }, { practice: 'devout' })).toBeNull()
    expect(blocked(['faith-nn'], {}, {})).toBeNull()
  })

  it('the five non-negotiables no form can check never block', () => {
    for (const practice of PRACTICE) {
      for (const children of CHILDREN) expect(blocked(UNCHECKABLE, { children: 'no' }, { practice, children })).toBeNull()
    }
  })
})
