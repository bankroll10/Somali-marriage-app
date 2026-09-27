import { describe, expect, it } from 'vitest'
import { buildRead } from '../../src/lib/read'
import { buildBeforeYes } from '../../src/lib/beforeYes'
import { coupleReading } from '../../src/lib/couple'
import { beforeYesTopics, workItOut } from '../../src/data/beforeYes'
import { gradeAll, hardFailures } from '../guide-eval/graders'
import { CASES } from '../guide-eval/cases'
import { CALIBRATION } from './calibration'
import { THERAPY, scriptFindings } from './properties'
import { callsIncompatible, copiedPhrases, elevenInvariants, readInvariants, tellsLeak } from './invariants'
import { HELD_OUT } from './heldout'
import { drift, fingerprints, updated } from './lock'
import { registry } from './scripts'

/**
 * The harness, tested (docs/GUIDE-EVAL.md, "Relationship judgment", G).
 *
 * A check that has never failed has never been shown to check anything. Each
 * test here seeds one regression the founder named — in memory, on a copy —
 * and requires the harness to object. If one of these passes against a
 * mutation, the property it guards can regress silently, and that is the bug.
 */

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
const TOPICS = beforeYesTopics().map((t) => t.id)
const SCRIPTS = registry()

describe('a seeded regression in the words is caught', () => {
  it('"You always" put in front of a script', () => {
    for (const e of SCRIPTS.filter((e) => e.shape === 'ask').slice(0, 10))
      expect(scriptFindings(`You always leave this to me. ${e.words}`).map((f) => f.property), e.id).toContain('NO_ACCUSATION')
  })

  it('a sentence of `tells` moved into the words', () => {
    for (const e of SCRIPTS.filter((e) => e.tells.split(/(?<=[.?!])\s+/).some((s) => s.split(/\s+/).length >= 6)).slice(0, 10)) {
      const moved = e.tells.split(/(?<=[.?!])\s+/).find((s) => s.split(/\s+/).length >= 6)!
      expect(tellsLeak({ words: `${e.words} ${moved}`, tells: e.tells }), e.id).not.toEqual([])
    }
  })

  it('therapy-speak and a written register', () => {
    expect(scriptFindings('I need you to hear that this lands like that.').map((f) => f.property)).toContain('NO_THERAPY_SPEAK')
    expect(scriptFindings('I am asking whether you would. I do not mind which.').map((f) => f.property)).toContain('NATURAL_REGISTER')
  })

  it('a detector with a pattern removed no longer catches its calibration line', () => {
    const i = THERAPY.findIndex(([re]) => re.test('I need you to hear'))
    const [removed] = THERAPY.splice(i, 1)
    try {
      const c = CALIBRATION.find((c) => c.bad.includes('I need you to hear'))!
      // The calibration test would now fail: the property it names is not found.
      const stillCaught = scriptFindings(c.bad).some((f) => f.property === 'NO_THERAPY_SPEAK')
      expect(stillCaught).toBe(false)
    } finally {
      THERAPY.splice(i, 0, removed)
    }
    expect(scriptFindings(CALIBRATION.find((c) => c.bad.includes('I need you to hear'))!.bad).some((f) => f.property === 'NO_THERAPY_SPEAK')).toBe(true)
  })
})

describe('a seeded regression in the engines is caught', () => {
  it('a read forced to strong while being known is not shown', () => {
    const r = buildRead({ ...BEST, known: 'nobody', secret: 'soft' })!
    expect(r.band).not.toBe('strong')
    expect(readInvariants({ ...r, band: 'strong' })).toContain('strong without being known: words bought the read')
  })

  it('careful, and strong anyway, or handed words for him', () => {
    const r = buildRead({ ...BEST, hard: 'careful' })!
    expect(readInvariants(r)).toEqual([])
    expect(readInvariants({ ...r, band: 'strong' })).toContain('careful what she raises, and still strong')
    expect(readInvariants({ ...r, script: { words: 'Can we talk?', why: '', tells: '' } })).toContain('careful, and words for the person she is careful around')
  })

  it('a read that says what he intends', () => {
    const r = buildRead({ ...BEST, family: 'no' })!
    expect(readInvariants({ ...r, summary: `${r.summary} He is not serious about you.` }).join(' ')).toMatch(/another person feels or intends/)
  })

  it('"incompatible" put into a couple line, or into the Eleven', () => {
    const couple = coupleReading(Object.fromEntries(TOPICS.map((t) => [t, 'differ-somewhere'])))
    expect(callsIncompatible(couple.lines.map((l) => l.line).join(' '))).toBe(false)
    expect(callsIncompatible(`${couple.lines[0].line} You two are incompatible here.`)).toBe(true)
    const r = buildBeforeYes(Object.fromEntries(TOPICS.map((t) => [t, 'differ'])))!
    expect(elevenInvariants(r, 'woman', TOPICS.length)).toEqual([])
    expect(elevenInvariants({ ...r, headline: 'You are not compatible on these.' }, 'woman', TOPICS.length)).toContain('a difference called incompatibility')
  })

  it('a line opened as the conversation, or a difference opened without the words to work it out', () => {
    const r = buildBeforeYes(Object.fromEntries(TOPICS.map((t) => [t, t === 'live' ? 'differ' : 'not-talked'])), 'woman', ['live'])!
    expect(elevenInvariants(r, 'woman', TOPICS.length)).toEqual([])
    expect(elevenInvariants({ ...r, open: { ...r.open, id: 'live' } }, 'woman', TOPICS.length)).toContain('a line opened as a conversation while others were open')
    const open = buildBeforeYes(Object.fromEntries(TOPICS.map((t) => [t, t === 'live' ? 'differ' : 'agree'])))!
    expect(open.open.script).toEqual(workItOut())
    expect(elevenInvariants({ ...open, open: { ...open.open, script: beforeYesTopics()[0].script } }, 'woman', TOPICS.length)).toContain(
      'an open difference without the words for working it out',
    )
  })
})

describe('a seeded regression in the Guide is caught', () => {
  it('an answer that decides fails the hard gates', () => {
    const c = CASES.find((c) => c.id === 'decision-01')!
    expect(hardFailures(gradeAll(c, 'You should marry him. He is clearly serious about you.'))).not.toEqual([])
  })

  it('an answer that rules fails the hard gates', () => {
    const c = CASES.find((c) => c.id === 'religious-01')!
    expect(hardFailures(gradeAll(c, 'It is haram. Stop texting him until the families meet.'))).not.toEqual([])
  })

  it('a held-out phrase copied into a word list is caught', () => {
    const phrase = HELD_OUT[0].message.split(' ').slice(2, 6).join(' ')
    expect(copiedPhrases(HELD_OUT, ['some unrelated words', phrase], new Set())).not.toEqual([])
  })
})

describe('a change to content is not silent', () => {
  it('one changed script shows in the drift, and goes back to the queue', () => {
    const now = fingerprints()
    const lock = updated({}, now)
    const key = Object.keys(now).find((k) => k.startsWith('script '))!
    const changed = { ...now, [key]: 'different' }
    expect(drift(lock, changed)).toEqual([`changed: ${key}`])
    expect(updated({ ...lock, [key]: { ...lock[key], judged: true, somaliReview: 'done' } }, changed)[key]).toMatchObject({ judged: false, somaliReview: 'pending' })
  })
})
