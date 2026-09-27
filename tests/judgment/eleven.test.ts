import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { buildBeforeYes, beforeYesSummary } from '../../src/lib/beforeYes'
import { coupleReading, type Joint } from '../../src/lib/couple'
import { allHad, beforeYesTopics, ownAnswerFirst, sayTheLine, STATES, workItOut, type YesState } from '../../src/data/beforeYes'
import { joint } from '../../netlify/functions/couple'
import { beforeYesAnswers } from '../support/arbitrary'
import { autonomyNotes } from '../guide-eval/graders'
import { callsIncompatible, elevenCopy, elevenInvariants } from './invariants'
import type { Gender } from '../../src/types'

/**
 * Eleven judgment (docs/GUIDE-EVAL.md, "Relationship judgment", B).
 *
 * The Eleven records which conversations two people have had and chooses the
 * one to open. Its judgment is in that choice and in how a difference is named:
 * a difference is not incompatibility, a line is not a negotiation, an answer
 * she does not have yet starts with her, and agreement is what they say, not
 * a fact the product has checked.
 */

const GENDERS: Gender[] = ['woman', 'man']
const TOPICS = beforeYesTopics().map((t) => t.id)
const sheet = (state: YesState, over: Record<string, YesState> = {}) => ({ ...Object.fromEntries(TOPICS.map((t) => [t, state])), ...over })

const build = (a: Record<string, string>, g: Gender = 'woman', lines: string[] = []) => {
  const r = buildBeforeYes(a, g, lines)
  if (!r) throw new Error('incomplete')
  return r
}

const copyOf = elevenCopy
const compat = callsIncompatible

describe('the cases', () => {
  it('a healthy difference, worked out, is never the one to open while a conversation has not been had', () => {
    for (const g of GENDERS)
      for (const settled of TOPICS)
        for (const other of TOPICS.filter((t) => t !== settled))
          for (const state of ['not-talked', 'unknown', 'differ'] as YesState[]) {
            const r = build(sheet('agree', { [settled]: 'settled', [other]: state }), g)
            expect(r.open.id, `${g}: ${settled} settled, ${other} ${state}`).toBe(other)
          }
  })

  it('a difference is never called incompatibility, anywhere', () => {
    for (const g of GENDERS)
      fc.assert(
        fc.property(beforeYesAnswers(g), fc.subarray(TOPICS), (a, lines) => {
          const r = build(a, g, lines)
          return !compat(copyOf(r)) && autonomyNotes(copyOf(r)).length === 0
        }),
      )
  })

  it('a genuine incompatibility — a line — is said, never worked out, and never opened while anything else is', () => {
    for (const g of GENDERS) {
      const r = build(sheet('not-talked', { 'second-wife': 'differ' }), g, ['second-wife'])
      expect(r.open.id).not.toBe('second-wife')
      expect(r.lines.map((l) => l.id)).toEqual(['second-wife'])
      expect(r.byState.differ).toEqual([])
      // Every topic a line: nothing to open, and the words say a line once.
      const all = build(sheet('differ'), g, TOPICS)
      expect(all.open.script).toEqual(sayTheLine(g))
    }
  })

  it('an unresolved but negotiable difference gets words for working it out, not for opening it again', () => {
    for (const g of GENDERS)
      fc.assert(
        fc.property(beforeYesAnswers(g), (a) => {
          const r = build(a, g)
          return r.open.state !== 'differ' || JSON.stringify(r.open.script) === JSON.stringify(workItOut(g))
        }),
      )
  })

  it('an answer that changed is read as it is now: nothing is kept, and a difference worked out drops back', () => {
    for (const g of GENDERS)
      for (const t of TOPICS) {
        // Worked out, it is never ahead of a conversation not yet had. (Still
        // open, it may not be first either: an unasked question about where
        // you'd live outranks a difference about the wedding, by design.)
        const after = build(sheet('not-talked', { [t]: 'settled' }), g)
        expect(after.open.id).not.toBe(t)
        // Nothing remarks on the change: the result is a function of the answers alone.
        expect(after).toEqual(build(sheet('not-talked', { [t]: 'settled' }), g))
        expect(copyOf(after)).not.toMatch(/\b(changed|used to|no longer|anymore|before you said)\b/i)
      }
  })

  it('an ambiguous answer — she does not know her own — starts with her', () => {
    for (const g of GENDERS)
      fc.assert(
        fc.property(beforeYesAnswers(g), (a) => {
          const r = build(a, g)
          return r.open.state !== 'unknown' || JSON.stringify(r.open.script) === JSON.stringify(ownAnswerFirst(g))
        }),
      )
    // Two-sided: one of them not knowing is never read as a difference between them.
    for (const s of STATES.map((x) => x.id)) expect(joint('unknown', s)).toBe('unknown-somewhere')
    const couple = coupleReading(Object.fromEntries(TOPICS.map((t) => [t, t === 'live' ? 'unknown-somewhere' : 'both-agree'])) as Record<string, Joint>)
    expect(couple.open?.script).toEqual(ownAnswerFirst())
  })

  it('a socially desirable answer — all agreed — is said back as what they say, and reopened, never closed', () => {
    for (const g of GENDERS) {
      const r = build(sheet('agree'), g)
      expect(r.allHad).toBe(true)
      expect(r.open.script).toEqual(allHad(g))
      expect(copyOf(r)).not.toMatch(/\b(compatible|done|nothing (left )?to (talk|worry) about|you'?re ready)\b/i)
      // What the Guide is told is what she said, attributed.
      expect(beforeYesSummary(r)).toMatch(/^say they agree on/)
    }
    // The `agree` answer asks her to check it would come out the same from both.
    expect(STATES.find((s) => s.id === 'agree')!.hint).toMatch(/each say/)
    const couple = coupleReading(Object.fromEntries(TOPICS.map((t) => [t, 'both-agree'])) as Record<string, Joint>)
    expect(couple.headline).toMatch(/\bsay\b/)
    for (const l of couple.lines) expect(l.line).toMatch(/\bsay\b/)
    expect(couple.open?.script).toEqual(allHad())
  })
})

describe('properties over every sheet', () => {
  const STATE_IDS = STATES.map((s) => s.id)

  it('the two-sided joint is symmetric: nothing says which side said what', () => {
    fc.assert(fc.property(fc.constantFrom(...STATE_IDS), fc.constantFrom(...STATE_IDS), (a, b) => joint(a, b) === joint(b, a)))
  })

  it('no two-sided reading states agreement as fact: every mention is attributed to what they say', () => {
    const JOINTS: Joint[] = ['both-agree', 'both-settled', 'both-not-talked', 'one-thinks-talked', 'differ-somewhere', 'unknown-somewhere']
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...JOINTS), { minLength: TOPICS.length, maxLength: TOPICS.length }), (kinds) => {
        const r = coupleReading(Object.fromEntries(TOPICS.map((t, i) => [t, kinds[i]])))
        for (const text of [r.headline, ...r.lines.map((l) => l.line)]) {
          if (/\bagree\b/i.test(text) && !/\b(say|says)\b/i.test(text)) return false
          if (compat(text) || autonomyNotes(text).length) return false
        }
        return true
      }),
    )
  })

  it('holds every Eleven invariant, whatever is answered and whatever she calls a line', () => {
    for (const g of GENDERS)
      fc.assert(
        fc.property(beforeYesAnswers(g), fc.subarray(TOPICS), (a, lines) => {
          expect(elevenInvariants(build(a, g, lines), g, TOPICS.length)).toEqual([])
        }),
      )
  })

  it('the one to open is never a line, unless every one is', () => {
    for (const g of GENDERS)
      fc.assert(
        fc.property(beforeYesAnswers(g), fc.subarray(TOPICS), (a, lines) => {
          const r = build(a, g, lines)
          const lineIds = r.lines.map((l) => l.id)
          return !lineIds.includes(r.open.id) || lineIds.length === TOPICS.length
        }),
      )
  })
})
