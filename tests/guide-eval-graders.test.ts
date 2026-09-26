import { describe, expect, it } from 'vitest'
import { CASES, CATEGORIES } from './guide-eval/cases'
import { BAD, GOLD } from './guide-eval/exemplars'
import { DIMENSIONS, gradeAll, nonInvention } from './guide-eval/graders'

/**
 * The graders, pinned (docs/GUIDE-EVAL.md). A grader is only worth what it
 * catches: every hand-written gold answer passes all of them, and every bad
 * answer fails the one dimension it was written to break. Loosen a check and a
 * bad answer gets through; tighten one carelessly and a gold answer fails.
 */

const caseOf = (id: string) => {
  const c = CASES.find((x) => x.id === id)
  if (!c) throw new Error(`no case ${id}`)
  return c
}

describe('the cases', () => {
  it('cover every category, at least three deep', () => {
    for (const cat of CATEGORIES) expect(CASES.filter((c) => c.category === cat).length, cat).toBeGreaterThanOrEqual(3)
  })

  it('have unique ids, named for their category', () => {
    expect(new Set(CASES.map((c) => c.id)).size).toBe(CASES.length)
    for (const c of CASES) expect(c.id.startsWith(c.category), c.id).toBe(true)
  })

  it('cover every voice and both sides', () => {
    expect(new Set(CASES.map((c) => c.mode)).size).toBe(4)
    expect(new Set(CASES.map((c) => c.context.identity.gender))).toEqual(new Set(['woman', 'man']))
  })
})

describe('a gold answer passes every grader', () => {
  it('has one for every category', () => {
    const covered = new Set(GOLD.map((g) => caseOf(g.caseId).category))
    // Not every category needs a written gold to pin a grader, but the ones
    // with hard gates do.
    for (const cat of ['abuse', 'crisis', 'manipulation', 'injection', 'system', 'religious', 'money', 'mahr'] as const) {
      expect(covered.has(cat), cat).toBe(true)
    }
  })

  for (const g of GOLD) {
    it(g.caseId, () => {
      const failed = gradeAll(caseOf(g.caseId), g.answer).filter((x) => !x.pass)
      expect(failed.map((f) => `${f.dimension}: ${f.notes.join('; ')}`)).toEqual([])
    })
  }
})

describe('a bad answer fails the dimension it breaks', () => {
  for (const b of BAD) {
    it(`${b.caseId} — ${b.why}`, () => {
      const grade = gradeAll(caseOf(b.caseId), b.answer).find((x) => x.dimension === b.fails)!
      expect(grade.pass, `${b.fails} should have caught: ${b.why}`).toBe(false)
    })
  }

  it('every dimension a rule can see has a bad answer pinning it', () => {
    const pinned = new Set(BAD.map((b) => b.fails))
    for (const d of DIMENSIONS) expect(pinned.has(d), d).toBe(true)
  })
})

describe('non-invention reads what the model was told, the way it was told', () => {
  // The first live run (2026-09-25) failed seven cases for naming "Twin
  // Cities" to a member whose map says twin-cities, and one for "Fajr".
  it('lets the member’s own city be named in words, and a prayer by name', () => {
    const c = caseOf('boundaries-01')
    expect(c.context.identity.scene).toBe('twin-cities')
    const answer = 'Many sisters in the Twin Cities keep it simple: after Fajr, say it once, plainly.'
    expect(nonInvention(c, answer).pass).toBe(true)
  })

  it('still catches a name nobody gave it', () => {
    expect(nonInvention(caseOf('boundaries-01'), 'Talk it through with Ahmed before you reply.').pass).toBe(false)
  })
})
