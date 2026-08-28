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
    values: ['Kindness', 'Loyalty'],
    partnership: ['Team', 'Gentle'],
    bio: '',
    prompts: [],
    trust: { verified: true, seriousIntention: true, waliFriendly: true },
    reciprocates: true,
    ...over,
  }
}

const aligned: Answers = {
  'faith-role': 4,
  practice: 'consistent',
  timeline: '1-2',
  'family-role': 'guided',
  children: 'want',
  'value-most': ['Kindness', 'Loyalty'],
  'partnership-style': ['Team', 'Gentle'],
}

describe('alignment', () => {
  it('scores a mirror-image candidate near the top', () => {
    const a = alignment(aligned, candidate())
    expect(a.score).toBeGreaterThanOrEqual(85)
    expect(a.headline).toBe('Strong alignment')
  })

  it('punishes the one mismatch that actually ends marriages', () => {
    // Wants children vs. does not — this must outweigh every shared value.
    const withKids = alignment({ ...aligned, children: 'no' }, candidate({ children: 'want' }))
    const same = alignment(aligned, candidate())
    expect(withKids.score).toBeLessThan(same.score - 10)
  })

  it('drops the score when faith and timeline both diverge', () => {
    const far = alignment(
      { ...aligned, 'faith-role': 1, practice: 'cultural', timeline: '3-plus' },
      candidate({ faithRole: 5, practice: 'devout', timeline: 'within-1' }),
    )
    expect(far.score).toBeLessThan(60)
  })

  it('never returns NaN or leaves 0–100 for an empty intake', () => {
    const a = alignment({}, candidate())
    expect(Number.isFinite(a.score)).toBe(true)
    expect(a.score).toBeGreaterThanOrEqual(0)
    expect(a.score).toBeLessThanOrEqual(100)
  })

  it('gives at most three reasons, so the card stays readable', () => {
    const a = alignment(aligned, candidate())
    expect(a.reasons.length).toBeLessThanOrEqual(3)
  })

  it('explains a strong match rather than asserting it', () => {
    const a = alignment(aligned, candidate())
    expect(a.reasons.length).toBeGreaterThan(0)
  })

  it('reads the user practice scale — a devout pair beats a mismatched one', () => {
    // Regression guard for the merged PRACTICE_SCALE lookup.
    const match = alignment(
      { ...aligned, practice: 'devout' },
      candidate({ practice: 'devout' }),
    )
    const mismatch = alignment(
      { ...aligned, practice: 'devout' },
      candidate({ practice: 'cultural' }),
    )
    expect(match.score).toBeGreaterThan(mismatch.score)
  })
})
