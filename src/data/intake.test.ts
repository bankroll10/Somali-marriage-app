import { describe, expect, it } from 'vitest'
import { allQuestions, chapters, chapterInsight, totalQuestions } from './intake'
import type { Dimension } from '../types'

/**
 * The intake was cut from 23 questions to 13 because the first real people to
 * open the app stopped partway through it. These guards keep the cut honest:
 * short enough to finish, and still complete enough that every part of the
 * product downstream has what it reads.
 */

const DIMENSIONS: Dimension[] = [
  'intention',
  'faith',
  'family',
  'vision',
  'character',
  'emotional',
  'selfAwareness',
]

/** Answer ids read by name somewhere else — the map, matching, the Guide, Profile. */
const READ_ELSEWHERE = [
  'timeline', // matching, Guide
  'practice', // matching, chapter insight
  'faith-role', // matching, alignment paragraph
  'family-role', // matching, alignment paragraph
  'children', // matching
  'value-most', // matching, core values
  'dealbreakers', // non-negotiables, Guide
  'attachment', // Guide (therapist voice)
  'household', // matching; Before you say yes shows her side
  'work', // matching; Before you say yes shows her side
  'money-home', // matching; Before you say yes shows her side
  'pattern', // the honest mirror
  'working-on', // the honest mirror, in their own words
]

/** Described in her words, never rated (src/lib/reflection.ts POSITIONS). */
const POSITIONS: string[] = ['faith', 'family', 'vision']

function canScore(q: (typeof allQuestions)[number]): boolean {
  if (q.type === 'scale') return true
  return !!q.options?.some((o) => typeof o.weight === 'number')
}

describe('the intake — short enough to finish, complete enough to read', () => {
  it('stays short — the first testers did not finish 23', () => {
    // Thirteen, then sixteen when the three "how you'd live" questions moved
    // in from Profile (docs/PRODUCT.md). Raising it again is a product
    // decision that needs A1's completion rate, not a question that felt too
    // good to leave out.
    expect(totalQuestions).toBeLessThanOrEqual(16)
    expect(chapters.length).toBeLessThanOrEqual(3)
  })

  it('every rated ground still has an answer that scores it', () => {
    // A ground with no scoring question silently reads as 50 for everyone,
    // which would make "your thinnest ground" a lie for that ground.
    for (const dim of DIMENSIONS.filter((d) => !POSITIONS.includes(d))) {
      const scoring = allQuestions.filter((q) => q.dimension === dim && canScore(q))
      expect(scoring.length, `no scoring question for ${dim}`).toBeGreaterThan(0)
    }
  })

  it('no answer that is a position carries a readiness weight (docs/PRODUCT.md S5)', () => {
    // Faith, family and children are positions; how soon is a timeline, not readiness.
    for (const id of ['practice', 'family-role', 'children', 'timeline']) {
      const q = allQuestions.find((x) => x.id === id)!
      expect(q.options?.some((o) => typeof o.weight === 'number'), id).toBe(false)
    }
  })

  it('keeps every question the rest of the product reads by id', () => {
    const ids = new Set(allQuestions.map((q) => q.id))
    for (const id of READ_ELSEWHERE) {
      expect(ids.has(id), `question '${id}' was cut but is still read elsewhere`).toBe(true)
    }
  })

  it('has no duplicate ids across chapters', () => {
    const ids = allQuestions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('asks at most one free-text question, and makes it skippable', () => {
    // Typing on a phone is the highest-friction thing the intake can ask for.
    const text = allQuestions.filter((q) => q.type === 'text')
    expect(text.length).toBeLessThanOrEqual(1)
    for (const q of text) expect(q.optional).toBe(true)
  })

  it('gives a reading after every chapter except the last', () => {
    const answers = { timeline: '1-2', practice: 'consistent', 'family-role': 'guided', children: 'want' }
    const [first, ...rest] = chapters
    const last = rest[rest.length - 1]
    expect(chapterInsight(first.id, answers)).toBeTruthy()
    for (const c of rest.slice(0, -1)) expect(chapterInsight(c.id, answers)).toBeTruthy()
    expect(chapterInsight(last.id, answers)).toBeNull()
  })
})
