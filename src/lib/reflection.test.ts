import { describe, expect, it } from 'vitest'
import { buildReflection } from './reflection'
import { allQuestions } from '../data/intake'
import type { Answers } from '../types'

/** The seeded demo member, kept in sync with lib/demo.ts. */
const demoAnswers: Answers = {
  timeline: '1-2',
  'why-now': 'ready',
  practice: 'consistent',
  'faith-role': 4,
  'family-role': 'guided',
  children: 'want',
  'value-most': ['kindness', 'deen-char', 'emotional'],
  dealbreakers: ['honesty', 'faith-nn', 'respect'],
  conflict: 'space',
  healing: 'healing',
  attachment: 'secure',
  pattern: 'walls',
  'working-on': 'ask for help instead of carrying everything alone',
}

describe('buildReflection', () => {
  it('never produces NaN, even with no answers at all', () => {
    const r = buildReflection({})
    expect(Number.isFinite(r.overall)).toBe(true)
    for (const d of r.dimensions) {
      expect(Number.isFinite(d.score)).toBe(true)
    }
  })

  it('reads an empty intake as the neutral middle, not as a failing grade', () => {
    // Someone who answered nothing has told us nothing — the honest reading is
    // the midpoint, and the copy must never call that "early in the journey".
    const r = buildReflection({})
    expect(r.overall).toBe(50)
    expect(r.headline).toBe('Building your foundation')
  })

  it('keeps every score inside 0–100', () => {
    for (const answers of [{}, demoAnswers]) {
      const r = buildReflection(answers)
      expect(r.overall).toBeGreaterThanOrEqual(0)
      expect(r.overall).toBeLessThanOrEqual(100)
      for (const d of r.dimensions) {
        expect(d.score).toBeGreaterThanOrEqual(0)
        expect(d.score).toBeLessThanOrEqual(100)
      }
    }
  })

  it('scores the demo member in the band the demo copy claims', () => {
    // lib/demo.ts seeds a map history ending at "Grounded and ready" (80+).
    // If the weights drift, the demo's transformation beat quietly breaks.
    const r = buildReflection(demoAnswers)
    expect(r.overall).toBeGreaterThanOrEqual(80)
    expect(r.headline).toBe('Grounded and ready')
  })

  it('reports all seven dimensions with human notes', () => {
    const r = buildReflection(demoAnswers)
    expect(r.dimensions).toHaveLength(7)
    for (const d of r.dimensions) {
      expect(d.note.length).toBeGreaterThan(0)
      expect(d.label.length).toBeGreaterThan(0)
    }
  })

  it('surfaces the stated non-negotiables as readable labels, not raw ids', () => {
    const r = buildReflection(demoAnswers)
    expect(r.nonNegotiables.length).toBe(3)
    for (const label of r.nonNegotiables) {
      expect(label).not.toMatch(/^[a-z-]+$/)
    }
  })

  it('folds the "working on" answer into the honest mirror', () => {
    const r = buildReflection(demoAnswers)
    expect(r.growthNote).toContain('ask for help')
  })

  it('every demo answer id matches a real intake question', () => {
    // Guards the demo seed against an intake rename silently zeroing the map.
    const known = new Set(allQuestions.map((q) => q.id))
    for (const id of Object.keys(demoAnswers)) {
      expect(known.has(id), `unknown question id: ${id}`).toBe(true)
    }
  })
})

/**
 * The distinctness guard.
 *
 * An audit found that two women scoring in the same band read a map that was
 * 75-85% word-for-word identical, and that one sentence — the self-awareness
 * note — was identical for every user who had ever finished the intake. Notes
 * were keyed on a score band rather than on what she actually answered, so
 * "I want children, God willing" and "I don't see children in my future"
 * printed the same line.
 *
 * This is the regression that would quietly undo that fix, because nothing else
 * in the suite would fail: the map would still build, still score, still render.
 * It would just stop being about her.
 */
describe('the map is about the person who filled it in', () => {
  const hodan: Answers = {
    'hardest-part': 'serious',
    timeline: 'within-1', 'why-now': 'ready', practice: 'devout', 'faith-role': 5,
    'family-role': 'central', children: 'want',
    'value-most': ['deen-char', 'kindness'], dealbreakers: ['honesty', 'faith-nn'],
    conflict: 'talk', healing: 'healed', attachment: 'secure', pattern: 'none',
    'working-on': 'ask for help instead of carrying everything alone',
  }
  const sagal: Answers = {
    'hardest-part': 'trust',
    timeline: '3-plus', 'why-now': 'pressure', practice: 'cultural', 'faith-role': 2,
    'family-role': 'private', children: 'no',
    'value-most': ['humor', 'intellect'], dealbreakers: ['respect'],
    conflict: 'avoid', healing: 'fresh', attachment: 'anxious', pattern: 'walls',
  }

  /** Every sentence of prose the map shows, normalised. */
  function sentences(answers: Answers): string[] {
    const r = buildReflection(answers)
    const prose = [r.summary, r.growthNote, r.alignment, ...r.dimensions.map((d) => d.note)].join(' ')
    return prose
      .split(/(?<=[.!?])\s+/)
      .map((x) => x.trim().toLowerCase())
      .filter((x) => x.length > 25)
  }

  it('gives two different women almost nothing in common, sentence for sentence', () => {
    const a = sentences(hodan)
    const b = sentences(sagal)
    const shared = a.filter((x) => b.includes(x))
    const overlap = shared.length / Math.min(a.length, b.length)
    expect(
      overlap,
      `these sentences were identical for both:\n${shared.join('\n')}`,
    ).toBeLessThan(0.15)
  })

  it('never repeats a sentence that every single user would read', () => {
    // The self-awareness note used to be one of these: all five `pattern`
    // options weighed 0.9-1.0, so the dimension scored high for everybody.
    const a = sentences(hodan)
    const b = sentences(sagal)
    const c = sentences({ ...hodan, pattern: 'settling', children: 'unsure', conflict: 'heated' })
    const inAll = a.filter((x) => b.includes(x) && c.includes(x))
    expect(inAll, 'a sentence every user reads verbatim').toEqual([])
  })

  it('names the hardest part she gave us before the intake even started', () => {
    expect(buildReflection(hodan).summary).toContain('knowing if someone is actually serious')
    expect(buildReflection(sagal).summary).toContain('trusting again after being hurt')
  })

  it('reads opposite answers to the same question differently', () => {
    const wants = buildReflection({ ...hodan, children: 'want' })
    const doesnt = buildReflection({ ...hodan, children: 'no' })
    const note = (r: ReturnType<typeof buildReflection>) =>
      r.dimensions.find((d) => d.dimension === 'vision')!.note
    expect(note(wants)).not.toBe(note(doesnt))
  })

  it('lets self-awareness actually vary, so it can be someone’s thinnest ground', () => {
    const done = buildReflection(hodan)
    const carrying = buildReflection(sagal)
    const sa = (r: ReturnType<typeof buildReflection>) =>
      r.dimensions.find((d) => d.dimension === 'selfAwareness')!.score
    expect(sa(done)).toBeGreaterThan(sa(carrying))
  })
})
