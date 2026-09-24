import fc from 'fast-check'
import { allQuestions } from '../../src/data/intake'
import { readQuestions } from '../../src/data/read'
import { beforeYesTopics, STATES } from '../../src/data/beforeYes'
import { ALPHABET } from '../../netlify/shared/code'
import { TOPICS, YES_STATES } from '../../netlify/shared/vocab'
import type { Gender } from '../../src/types'

/**
 * Inputs for properties, built from the product's own vocabularies so they can
 * never drift from what a member can actually answer (docs/TESTING.md). A new
 * option in the intake, the read or the eleven is generated here the day it
 * ships.
 */

export const gender: fc.Arbitrary<Gender> = fc.constantFrom('woman', 'man')

/** A map code as minted now: eight characters of the code alphabet. */
export const code = fc.array(fc.constantFrom(...ALPHABET), { minLength: 8, maxLength: 8 }).map((c) => c.join(''))

/**
 * An intake as someone might leave it: every question answered, skipped, or
 * answered with any of its options (several, for a multi-select).
 */
export const intake = fc.record(
  Object.fromEntries(
    allQuestions.map((q) => {
      const ids = (q.options ?? []).map((o) => o.id)
      const value =
        q.type === 'scale' && q.scale
          ? fc.integer({ min: q.scale.min, max: q.scale.max })
          : q.type === 'multi'
            ? fc.subarray(ids)
            : q.type === 'text'
              ? fc.constantFrom('', 'Listening before I answer.')
              : fc.constantFrom(...ids)
      return [q.id, fc.option(value as fc.Arbitrary<unknown>, { nil: undefined })]
    }),
  ),
  { requiredKeys: [] },
) as fc.Arbitrary<Record<string, unknown>>

/** A read, every question answered, as the reader of gender `g` is asked it. */
export const readAnswers = (g: Gender) =>
  fc.record(Object.fromEntries(readQuestions(g).map((q) => [q.id, fc.constantFrom(...q.options.map((o) => o.id))]))) as fc.Arbitrary<
    Record<string, string>
  >

/** Before-you-say-yes, every topic answered. */
export const beforeYesAnswers = (g: Gender) =>
  fc.record(Object.fromEntries(beforeYesTopics(g).map((t) => [t.id, fc.constantFrom(...STATES.map((s) => s.id))]))) as fc.Arbitrary<
    Record<string, string>
  >

/** One side of the two-sided eleven, as the couple route accepts it. */
export const sheet = fc.record(Object.fromEntries([...TOPICS].map((t) => [t, fc.constantFrom(...YES_STATES)]))) as fc.Arbitrary<
  Record<string, string>
>

/** A name no product string contains, so finding it anywhere is a leak. */
export const needle = fc
  .array(fc.constantFrom(...'bcdfghjklmnpqrstvwxz'), { minLength: 10, maxLength: 10 })
  .map((c) => `Zq${c.join('')}`)
