import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { buildRead } from '../src/lib/read'
import { coupleReading, type Joint } from '../src/lib/couple'
import { beforeYesTopics } from '../src/data/beforeYes'
import { TOPICS } from '../src/data/eleven'
import { allQuestions } from '../src/data/intake'
import { buildReflection } from '../src/lib/reflection'
import { NOT_YET_AGAIN_DAYS } from '../src/lib/followup'
import { readAnswers } from './support/arbitrary'
import type { Gender } from '../src/types'

/**
 * Claim calibration (docs/DECISIONS.md Part 20).
 *
 * The sentences the calibration pass found saying more than was true, pinned
 * by what makes them true or false — the combination of answers that reached
 * them — not by their wording. Each test names its row in the Part 20 table.
 */

const GENDERS: Gender[] = ['woman', 'man']
const BEST = {
  duration: 'months-3',
  named: 'early',
  timeline: 'dated',
  known: 'family',
  secret: 'no',
  family: 'how',
  initiative: 'same-day',
  'in-person': 'several',
  plans: 'never',
  nonneg: 'straight',
  hard: 'listens',
  money: 'no',
}

describe('the Read says no more than her answers', () => {
  it('R1: a strong read never tells her not to worry about her thinnest ground', () => {
    // Everything shown, and she comes away from hard conversations feeling like the problem.
    for (const g of GENDERS) {
      const r = buildRead({ ...BEST, hard: 'blames' }, g)!
      expect(r.band, g).toBe('strong')
      expect(r.summary, g).not.toMatch(/panick|nothing to worry|not worth/i)
    }
    for (const g of GENDERS)
      fc.assert(fc.property(readAnswers(g), (a) => !/panick|not worth worrying/i.test(buildRead(a, g)!.summary)))
  })

  it('R2: a caution names only what she told it', () => {
    for (const g of GENDERS) {
      const nobody = buildRead({ ...BEST, secret: 'explicit', known: 'nobody' }, g)!
      expect(nobody.concern).toBe('hidden')
      expect(nobody.summary, g).not.toMatch(/doubting yourself|careful what you say/)
      const blames = buildRead({ ...BEST, secret: 'explicit', hard: 'blames' }, g)!
      expect(blames.summary, g).toMatch(/doubting yourself/)
      const careful = buildRead({ ...BEST, secret: 'explicit', hard: 'careful' }, g)!
      expect(careful.summary, g).not.toMatch(/doubting yourself/)
    }
  })

  it('R10: her own "as far as I know" is kept when her answer is read back', () => {
    for (const g of GENDERS) {
      const r = buildRead({ ...BEST, known: 'nobody' }, g)!
      for (const line of [...r.missing, r.summary]) if (/knows you exist/.test(line)) expect(line, g).toMatch(/as far as you know/)
    }
  })
})

describe('the couple reading says what both said, and only that', () => {
  it('E1: "you have had the conversations" is never said while one is unopened', () => {
    const topics = beforeYesTopics().map((t) => t.id)
    const kinds: Joint[] = ['both-agree', 'both-settled', 'both-not-talked', 'one-thinks-talked', 'differ-somewhere', 'unknown-somewhere']
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...kinds), { minLength: topics.length, maxLength: topics.length }), (ks) => {
        const r = coupleReading(Object.fromEntries(topics.map((t, i) => [t, ks[i]])))
        const unopened = ks.some((k) => k !== 'both-agree' && k !== 'both-settled' && k !== 'differ-somewhere')
        return !(unopened && /had (all|the) (eleven|conversations)/i.test(r.headline))
      }),
    )
  })
})

describe('the map quotes her, and does not diagnose her', () => {
  const base = { timeline: '1-2', practice: 'consistent', 'faith-role': 4, 'family-role': 'guided', children: 'want', healing: 'healing', conflict: 'talk' }

  it('M1: the lean says what she answered, and no attachment label', () => {
    const attachment = allQuestions.find((q) => q.id === 'attachment')!
    for (const o of attachment.options ?? []) {
      const text = JSON.stringify(buildReflection({ ...base, attachment: o.id } as never))
      expect(text, o.id).not.toMatch(/\b(avoidant|anxiously attached|attachment style|insecure)\b/i)
      if (o.id === 'avoidant') {
        expect(text).toMatch(/goes quiet you pull back/)
        expect(text).not.toMatch(/gets close you pull back/)
      }
    }
  })

  it('E3: the eleven says her practice back in her words, not as a label', () => {
    const deen = TOPICS.find((t) => t.id === 'deen-daily')!
    for (const line of Object.values(deen.yourSide!.lines)) expect(line).not.toMatch(/\b(devout|uneven|cultural)\b/i)
  })
})

describe('what the product promises is what the code does', () => {
  it('S6: the check-back names the one re-ask, at the interval the code uses', () => {
    expect(NOT_YET_AGAIN_DAYS).toBe(7)
  })
})
