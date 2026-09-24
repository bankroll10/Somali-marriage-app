import { describe, expect, it } from 'vitest'
import type { FollowUp } from '../types'
import { readQuestions } from '../data/read'
import { beforeYesTopics } from '../data/beforeYes'
import { buildRead } from './read'
import { buildBeforeYes } from './beforeYes'
import { MIN_AGE_DAYS, noteFollowUp, openFollowUp } from './followup'
import { hasHomeFor, stageAfterInstrument } from './inferStage'

/**
 * If an instrument gives someone words to say, we must be able to ask later
 * whether they said them.
 *
 * That is one chain across four files, and every link is unit-tested alone
 * while nothing tested the chain. The last time it broke, nothing noticed: a
 * read taken from `?read` wrote a follow-up and inferred no stage, so the
 * person had no Home, and Home is the only screen that asks. The follow-up was
 * written, persisted, and unreachable for ever — and "followed through per
 * hundred arrived", the one number the whole thing is for, read zero by
 * construction for exactly the person the product is aimed at
 * (`src/lib/inferStage.ts`, `docs/BOARD.md`).
 *
 * A stranger opening a link on a phone that has never seen Niyyah is the
 * sprint's main subject, so this walks that person end to end: no answers, no
 * map, no stage, no name.
 */

const DAY = 24 * 60 * 60 * 1000
const START = Date.parse('2026-09-12T10:00:00.000Z')

/** Answer every question with its first option — the shape `Read.tsx` saves. */
const allAnswered = (qs: { id: string; options: { id: string }[] }[]) =>
  Object.fromEntries(qs.map((q) => [q.id, q.options[0].id]))

describe('a read taken by a stranger can be asked about later', () => {
  for (const gender of ['woman', 'man'] as const) {
    it(`holds for a ${gender} arriving on ?read with nothing saved`, () => {
      // 1. She answers the read. Nothing else about her exists.
      const answers = allAnswered(readQuestions(gender))
      const result = buildRead(answers, gender)
      expect(result, 'the read returns a reading').not.toBeNull()

      // 2. Saving it writes exactly one follow-up, about the gap it named.
      const topic = result!.band === 'early' ? 'early' : result!.thin
      const followups: FollowUp[] = noteFollowUp([], 'read', topic, new Date(START).toISOString())
      expect(followups).toHaveLength(1)
      expect(followups[0].topic).toBe(topic)

      // 3. And infers where she is, because she said nothing about it. This
      //    is the step whose absence made the whole chain unreachable.
      const inferred = stageAfterInstrument('read', 'preparing', false)
      expect(inferred).toBe('talking')
      expect(hasHomeFor({ completed: false, stage: inferred! })).toBe(true)

      // 4. Not asked the same day — a conversation needs time to have happened.
      expect(openFollowUp(followups, gender, START)).toBeNull()
      expect(openFollowUp(followups, gender, START + (MIN_AGE_DAYS - 1) * DAY)).toBeNull()

      // 5. Asked once it has had time, in her own words, with the words again.
      const ask = openFollowUp(followups, gender, START + MIN_AGE_DAYS * DAY)
      expect(ask, 'the ask ripens').not.toBeNull()
      expect(ask!.question.length).toBeGreaterThan(10)
      expect(ask!.script.words.length).toBeGreaterThan(10)

      // 6. Answered, it closes — and stops being asked.
      const answered = followups.map((f) => ({ ...f, outcome: 'asked' as const }))
      expect(openFollowUp(answered, gender, START + 30 * DAY)).toBeNull()
    })
  }
})

describe('the eleven, the same way', () => {
  for (const gender of ['woman', 'man'] as const) {
    it(`holds for a ${gender} arriving on ?eleven with nothing saved`, () => {
      const answers = Object.fromEntries(beforeYesTopics(gender).map((t) => [t.id, 'not-talked']))
      const result = buildBeforeYes(answers, gender)
      expect(result, 'the eleven returns a reading').not.toBeNull()

      const followups = noteFollowUp([], 'beforeYes', result!.open.id, new Date(START).toISOString())
      expect(followups).toHaveLength(1)

      // The eleven puts someone further along than the read does.
      const inferred = stageAfterInstrument('eleven', 'preparing', false)
      expect(inferred).toBe('deciding')
      expect(hasHomeFor({ completed: false, stage: inferred! })).toBe(true)

      const ask = openFollowUp(followups, gender, START + MIN_AGE_DAYS * DAY)
      expect(ask).not.toBeNull()
      // Saying "we talked" about one of the eleven can be written back into
      // the sheet; a read's gap cannot, because a read is about behaviour.
      expect(ask!.writesBack).toBe(true)
    })
  }
})

describe('what the chain does not cover', () => {
  it('leaves a Home-less person with an ask that can never be rendered', () => {
    // Honest about the edge, so that it is a known limit rather than a
    // surprise in the data: the family scripts and a guide commitment write
    // follow-ups without inferring a stage, and Home is the only screen that
    // asks. Someone who arrives on ?families and never builds a map has an
    // ask written and no Home to be asked on. Out of scope for this sprint —
    // ?read and ?eleven are what is being posted — and recorded so the number
    // is read as "not asked" rather than "did not follow through".
    const followups = noteFollowUp([], 'family', 'first-with-hooyo', new Date(START).toISOString())
    const ask = openFollowUp(followups, 'woman', START + MIN_AGE_DAYS * DAY)
    expect(ask, 'the ask exists').not.toBeNull()
    // ...but with nothing else saved, there is no Home to show it on.
    expect(hasHomeFor({ completed: false, stage: 'preparing' })).toBe(false)
  })
})
