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
  it('is never a score or a band', () => {
    const a = alignment(aligned, candidate())
    expect('score' in a).toBe(false)
    expect('headline' in a).toBe(false)
    for (const r of a.reasons) expect(r).not.toMatch(/\d|%|alignment/i)
    expect(a.ask).not.toMatch(/\d\d/)
  })

  it('keeps an internal fit for ordering only, inside 0–1', () => {
    for (const answers of [{}, aligned]) {
      const a = alignment(answers, candidate())
      expect(Number.isFinite(a.fit)).toBe(true)
      expect(a.fit).toBeGreaterThanOrEqual(0)
      expect(a.fit).toBeLessThanOrEqual(1)
    }
  })

  it('always hands her something to ask', () => {
    expect(alignment(aligned, candidate()).ask.length).toBeGreaterThan(20)
    expect(alignment({}, candidate()).ask.length).toBeGreaterThan(20)
  })

  it('gives at most three reasons, so the card stays readable', () => {
    expect(alignment(aligned, candidate()).reasons.length).toBeLessThanOrEqual(3)
    expect(alignment(aligned, candidate()).reasons.length).toBeGreaterThan(0)
  })
})

describe('her non-negotiables are gates, checked before anything is weighed', () => {
  it('blocks a man whose practice fails her stated faith non-negotiable, however much else fits', () => {
    const a = alignment({ ...aligned, dealbreakers: ['faith-nn'] }, candidate({ practice: 'cultural' }))
    expect(a.blocked).toMatch(/faith/i)
    expect(a.fit).toBe(0)
  })

  it('blocks on children when she said that is not negotiable and they clash', () => {
    const a = alignment({ ...aligned, children: 'want', dealbreakers: ['kids-nn'] }, candidate({ children: 'no' }))
    expect(a.blocked).toMatch(/children/i)
    // Open to it is not a clash with wanting them.
    expect(alignment({ ...aligned, children: 'want', dealbreakers: ['kids-nn'] }, candidate({ children: 'open' })).blocked).toBeNull()
  })

  it('does not block on a mismatch she never called non-negotiable', () => {
    const a = alignment({ ...aligned, children: 'want' }, candidate({ children: 'no' }))
    expect(a.blocked).toBeNull()
    // It still shows as the place they differ, and the fit falls.
    expect(a.differs).toBe('children')
    expect(a.fit).toBeLessThan(alignment(aligned, candidate()).fit - 0.1)
  })

  it('turns a non-negotiable no form can check into the first thing to ask', () => {
    const a = alignment({ ...aligned, dealbreakers: ['honesty'] }, candidate())
    expect(a.blocked).toBeNull()
    expect(a.ask).toMatch(/honesty/i)
  })
})

describe('reasons and the place they differ', () => {
  it('translates option ids to the candidate tag vocabulary', () => {
    const a = alignment({ ...aligned, 'value-most': ['deen-char', 'emotional'] }, candidate({ values: ['Taqwa', 'Maturity'] }))
    expect(a.reasons.join(' ')).toContain('you share a value of')
    expect(a.reasons.join(' ')).toContain('taqwa')
  })

  it('shares nothing when the values genuinely differ', () => {
    const a = alignment({ ...aligned, 'value-most': ['humor'] }, candidate({ values: ['Taqwa', 'Depth'] }))
    expect(a.reasons.join(' ')).not.toContain('you share a value of')
  })

  it('names money home when both expect it — the sentence no other app could write', () => {
    const a = alignment({ ...aligned, 'money-home': 'expected' }, candidate({ moneyHome: 'expected' }))
    expect(a.reasons.indexOf('you both expect to send money home, and neither of you will resent it')).toBeLessThan(3)
  })

  it('shows at most one living reason', () => {
    const a = alignment(
      { ...aligned, household: 'near-family', work: 'both', 'money-home': 'expected' },
      candidate({ household: 'near-family', work: 'both', moneyHome: 'expected' }),
    )
    const living = a.reasons.filter((r) => /money home|front door|keep working|one household|fully your own|one of you at home/.test(r))
    expect(living).toHaveLength(1)
  })

  it('names the place they differ most, in words, and asks about it', () => {
    const a = alignment({ ...aligned, household: 'with-family' }, candidate({ household: 'separate' }))
    expect(a.differs).toBe('whose house you would live in')
    expect(a.ask).toContain('whose house')
  })

  it('has no difference to name when nothing she answered diverges', () => {
    expect(alignment(aligned, candidate()).differs).toBeNull()
  })

  it('leaves the fit alone when she has not said how she would live', () => {
    const without = alignment(aligned, candidate())
    const neutral = alignment({ ...aligned, household: 'flexible', work: 'unsure', 'money-home': 'unsure' }, candidate())
    expect(Math.abs(without.fit - neutral.fit)).toBeLessThanOrEqual(0.01)
  })

  it('orders a devout pair ahead of a mismatched one', () => {
    const match = alignment({ ...aligned, practice: 'devout' }, candidate({ practice: 'devout' }))
    const mismatch = alignment({ ...aligned, practice: 'devout' }, candidate({ practice: 'cultural' }))
    expect(match.fit).toBeGreaterThan(mismatch.fit)
  })
})
