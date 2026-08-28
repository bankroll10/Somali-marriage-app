import { describe, expect, it } from 'vitest'
import { buildReflection } from './reflection'
import { allQuestions } from '../data/intake'
import type { Answers } from '../types'

/** The seeded demo member, kept in sync with lib/demo.ts. */
const demoAnswers: Answers = {
  timeline: '1-2',
  'why-now': 'ready',
  seriousness: 5,
  'marriage-means': ['deen', 'partnership', 'peace'],
  practice: 'consistent',
  'faith-role': 4,
  prayer: 4,
  'faith-partner': 'together',
  'family-role': 'guided',
  'culture-tie': 4,
  'family-readiness': 'some',
  children: 'want',
  location: 'rooted',
  'partnership-style': ['team', 'gentle'],
  'value-most': ['kindness', 'deen-char', 'emotional'],
  conflict: 'space',
  dealbreakers: ['honesty', 'faith-nn', 'respect'],
  healing: 'healing',
  attachment: 'secure',
  'comm-safety': ['consistency', 'gentleness', 'follow-through'],
  pattern: 'walls',
  bring: 'I bring patience and a steady heart.',
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
