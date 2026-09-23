import { describe, expect, it } from 'vitest'
import { alignment } from './matching'
import type { Candidate } from '../data/candidates'
import type { Answers } from '../types'

function candidate(over: Partial<Candidate> = {}): Candidate {
  return {
    id: 'test',
    name: 'Test',
    age: 29,
    gender: 'man',
    scene: 'twin-cities',
    occupation: 'Teacher',
    practice: 'consistent',
    faithRole: 4,
    timeline: '1-2',
    familyRole: 'guided',
    children: 'want',
    household: 'near-family',
    work: 'both',
    moneyHome: 'expected',
    values: ['Kindness', 'Loyalty'],
    bio: '',
    prompts: [],
    ...over,
  }
}

/** Exactly what the app stores: QuestionCard writes option ids, not labels. */
const aligned: Answers = {
  'faith-role': 4,
  practice: 'consistent',
  timeline: '1-2',
  'family-role': 'guided',
  children: 'want',
  'value-most': ['kindness', 'loyalty'],
}

describe('what reaches the screen', () => {
  it('is never a score, a band or a number of any kind', () => {
    const a = alignment(aligned, candidate())
    expect('score' in a).toBe(false)
    expect('fit' in a).toBe(false)
    expect('headline' in a).toBe(false)
    for (const r of [...a.same, ...a.differ, ...a.unknown]) expect(r).not.toMatch(/\d|%|alignment/i)
    expect(a.ask).not.toMatch(/\d\d/)
  })

  it('always hands her something to ask', () => {
    expect(alignment(aligned, candidate()).ask.length).toBeGreaterThan(20)
    expect(alignment({}, candidate()).ask.length).toBeGreaterThan(20)
  })

  it('speaks of the other side as who they are — a man reading a woman is not told what "he" thinks', () => {
    const a = alignment({ dealbreakers: ['honesty'] }, candidate({ gender: 'woman' }))
    expect(a.ask).toMatch(/\bher\b/)
    expect(a.ask).not.toMatch(/\b(he|him|his)\b/)
  })
})

describe('her non-negotiables are gates only where his answer plainly contradicts them', () => {
  it('blocks a man who describes his practice as lighter, when she said faith is not negotiable — however much else is the same', () => {
    const a = alignment({ ...aligned, dealbreakers: ['faith-nn'] }, candidate({ practice: 'cultural' }))
    expect(a.blocked).toMatch(/faith/i)
  })

  it('blocks on children only when one wants them and the other does not', () => {
    const a = alignment({ ...aligned, children: 'want', dealbreakers: ['kids-nn'] }, candidate({ children: 'no' }))
    expect(a.blocked).toMatch(/children/i)
    // Open to it is not a clash with wanting them.
    expect(alignment({ ...aligned, children: 'want', dealbreakers: ['kids-nn'] }, candidate({ children: 'open' })).blocked).toBeNull()
  })

  it('does not block on a difference she never called non-negotiable — it is named as a difference', () => {
    const a = alignment({ ...aligned, children: 'want' }, candidate({ children: 'no' }))
    expect(a.blocked).toBeNull()
    expect(a.differ).toContain('children')
  })

  it('turns a non-negotiable no form can check into the first thing to ask', () => {
    const a = alignment({ ...aligned, dealbreakers: ['honesty'] }, candidate())
    expect(a.blocked).toBeNull()
    expect(a.ask).toMatch(/honesty/i)
  })
})

describe('same, different, not known — literally', () => {
  it('translates option ids to the candidate tag vocabulary', () => {
    const a = alignment({ ...aligned, 'value-most': ['deen-char', 'emotional'] }, candidate({ values: ['Taqwa', 'Maturity'] }))
    expect(a.same.join(' ')).toContain('you both named taqwa')
  })

  it('names no shared value when the values genuinely differ, and does not call that a difference', () => {
    const a = alignment({ ...aligned, 'value-most': ['humor'] }, candidate({ values: ['Taqwa', 'Depth'] }))
    expect(a.same.join(' ')).not.toContain('you both named')
    expect(a.differ.join(' ')).not.toMatch(/value/)
  })

  it('names money home when both expect it — and claims nothing about how either will feel', () => {
    const a = alignment({ ...aligned, 'money-home': 'expected' }, candidate({ moneyHome: 'expected' }))
    expect(a.same).toContain('you both expect to send money home every month')
    expect(a.same.join(' ')).not.toMatch(/resent/)
  })

  it('lists every difference, in one fixed order, and asks about the first', () => {
    const a = alignment({ ...aligned, household: 'with-family', 'family-role': 'private' }, candidate({ household: 'separate' }))
    expect(a.differ).toEqual(['how involved family should be, and when', 'whose house you would live in'])
    expect(a.ask).toContain('how involved family')
  })

  it('has no difference to name when nothing she answered diverges', () => {
    expect(alignment(aligned, candidate()).differ).toEqual([])
  })

  it('an unsure or unanswered question is not known — never the same, never different', () => {
    const a = alignment({ ...aligned, work: 'unsure', 'money-home': 'unsure' }, candidate())
    expect(a.unknown).toEqual(expect.arrayContaining(['work after marriage and children', 'money sent home']))
    expect(a.differ).toEqual([])
  })

  it('flexible is an answer that meets anything: not a difference, and not unknown', () => {
    const a = alignment({ ...aligned, household: 'Flexible' }, candidate({ household: 'separate' }))
    expect([...a.differ, ...a.unknown].join(' ')).not.toMatch(/house/)
  })

  it('a one-point gap on a 1–5 self-rating is not a difference anyone could name; two points is', () => {
    expect(alignment({ ...aligned, 'faith-role': 3 }, candidate({ faithRole: 4 })).differ).not.toContain('how central faith should be at home')
    expect(alignment({ ...aligned, 'faith-role': 2 }, candidate({ faithRole: 4 })).differ).toContain('how central faith should be at home')
  })
})
