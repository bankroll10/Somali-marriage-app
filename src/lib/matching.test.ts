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
    partnership: ['Team', 'Gentle'],
    bio: '',
    prompts: [],
    trust: { verified: true, seriousIntention: true, waliFriendly: true },
    reciprocates: true,
    ...over,
  }
}

/**
 * Exactly what the app stores: QuestionCard writes option *ids*, not labels.
 *
 * This fixture used to hold ['Kindness', 'Loyalty'] — capitalised labels the
 * app never produces — and that is why every test passed while `values.ratio`
 * scored zero for every real user against every candidate. A fixture that
 * doesn't match the shipped shape is worse than no fixture: it guards nothing
 * and reports success.
 */
const aligned: Answers = {
  'faith-role': 4,
  practice: 'consistent',
  timeline: '1-2',
  'family-role': 'guided',
  children: 'want',
  'value-most': ['kindness', 'loyalty'],
}

describe('alignment', () => {
  it('scores a mirror-image candidate near the top', () => {
    const a = alignment(aligned, candidate())
    expect(a.score).toBeGreaterThanOrEqual(85)
    expect(a.headline).toBe('Strong alignment')
  })

  it('translates option ids to the candidate tag vocabulary', () => {
    // The regression that hid for the life of the project: the intake stores
    // 'deen-char'/'emotional', candidates carry 'Taqwa'/'Maturity', and a raw
    // comparison silently shares nothing. Assert on the human reason, because
    // that is the sentence the user actually reads on the card.
    const a = alignment(
      { ...aligned, 'value-most': ['deen-char', 'emotional'] },
      candidate({ values: ['Taqwa', 'Maturity'] }),
    )
    expect(a.reasons.join(' ')).toContain('you share a value of')
    expect(a.reasons.join(' ')).toContain('taqwa')
  })

  it('shares nothing when the values genuinely differ', () => {
    // Guards the opposite failure: a translation so loose everything matches.
    const a = alignment(
      { ...aligned, 'value-most': ['humor'] },
      candidate({ values: ['Taqwa', 'Depth'] }),
    )
    expect(a.reasons.join(' ')).not.toContain('you share a value of')
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

  it('leaves the score alone when she has not said how she would live', () => {
    // Optional questions must never punish the person who skipped them.
    const without = alignment(aligned, candidate())
    const neutral = alignment({ ...aligned, household: 'flexible', work: 'unsure', 'money-home': 'unsure' }, candidate())
    expect(Math.abs(without.score - neutral.score)).toBeLessThanOrEqual(1)
  })

  it('names money home when both expect it — the sentence no other app could write', () => {
    const a = alignment({ ...aligned, 'money-home': 'expected' }, candidate({ moneyHome: 'expected' }))
    expect(a.reasons.join(' ')).toContain('send money home')
    // And it sits where she will read it: within the three shown.
    expect(a.reasons.indexOf('you both expect to send money home, and neither of you will resent it')).toBeLessThan(3)
  })

  it('penalises whose-house when one wants family in the home and the other wants their own', () => {
    const same = alignment({ ...aligned, household: 'near-family' }, candidate({ household: 'near-family' }))
    const far = alignment({ ...aligned, household: 'with-family' }, candidate({ household: 'separate' }))
    expect(far.score).toBeLessThan(same.score - 5)
    expect(far.reasons.join(' ')).not.toContain('front door')
  })

  it('shows at most one living reason', () => {
    const a = alignment(
      { ...aligned, household: 'near-family', work: 'both', 'money-home': 'expected' },
      candidate({ household: 'near-family', work: 'both', moneyHome: 'expected' }),
    )
    const living = a.reasons.filter((r) => /money home|front door|keep working|one household|fully your own|one of you at home/.test(r))
    expect(living).toHaveLength(1)
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
