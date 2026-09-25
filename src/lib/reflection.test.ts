import { describe, expect, it } from 'vitest'
import { buildReflection, changesBetween, snapshotOf } from './reflection'
import { allQuestions } from '../data/intake'
import type { Answers, GroundState } from '../types'

const STATES: GroundState[] = ['thin', 'steady', 'strong']
/** Positions she holds — described, never rated (docs/PRODUCT.md S5). */
const POSITIONS = ['faith', 'family', 'vision']

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
  it('puts no number on a person — every rated ground is one of three words, and a position is none', () => {
    for (const answers of [{}, demoAnswers]) {
      const r = buildReflection(answers)
      expect('overall' in r).toBe(false)
      for (const d of r.dimensions) {
        if (POSITIONS.includes(d.dimension)) expect(d.state).toBeNull()
        else expect(STATES).toContain(d.state)
        expect('score' in d).toBe(false)
      }
    }
  })

  it('reads an empty intake as steady ground, not as a failing grade', () => {
    // Someone who answered nothing has told us nothing — the honest reading is
    // steady, and the copy must never call that "early in the journey".
    const r = buildReflection({})
    for (const d of r.dimensions) if (!POSITIONS.includes(d.dimension)) expect(d.state).toBe('steady')
    expect(r.headline).toBe('Building your foundation')
  })

  it('orders the grounds thinnest first, once each', () => {
    const r = buildReflection(demoAnswers)
    expect(r.thinnest).toHaveLength(7)
    expect(new Set(r.thinnest).size).toBe(7)
    const stateOf = (d: string) => r.dimensions.find((x) => x.dimension === d)!.state!
    // Nothing strong may sit ahead of something thin, among the rated grounds;
    // the positions follow, in the map's own order, never as a gap.
    const rated = r.thinnest.slice(0, 4)
    expect(r.thinnest.slice(4)).toEqual(POSITIONS)
    const rank = { thin: 0, steady: 1, strong: 2 }
    for (let i = 1; i < rated.length; i++) {
      expect(rank[stateOf(rated[i])]).toBeGreaterThanOrEqual(rank[stateOf(rated[i - 1])])
    }
  })

  it('reads the demo member as the demo copy claims', () => {
    // lib/demo.ts seeds a map history that ends on steady ground. If the
    // thresholds drift, the demo quietly breaks.
    const r = buildReflection(demoAnswers)
    expect(r.headline).toBe('On steady ground')
  })

  it('reads the most honest answers as building, not as early', () => {
    // The old score put the woman fresh from a situationship and returning to
    // her deen at the bottom. Two thin grounds is a foundation being built.
    const r = buildReflection({
      timeline: '3-plus', 'why-now': 'pressure', practice: 'cultural', 'faith-role': 2,
      'family-role': 'private', children: 'no', conflict: 'avoid', healing: 'fresh',
      attachment: 'anxious', pattern: 'walls',
    })
    expect(r.headline).toBe('Building your foundation')
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

  it('reads money home as an obligation to plan together, not a match criterion with a prediction on it', () => {
    // docs/DECISIONS.md Part 10: "will never resent that you do" told her what
    // he would feel for the rest of the marriage.
    const r = buildReflection({ ...demoAnswers, 'money-home': 'expected' })
    expect(r.alignment).toMatch(/can plan it with you/)
    expect(r.alignment).not.toMatch(/never resent/)
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
    expect(buildReflection(hodan).summary).toContain('knowing if someone is serious')
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
      r.dimensions.find((d) => d.dimension === 'selfAwareness')!.state
    expect(sa(done)).toBe('strong')
    expect(sa(carrying)).not.toBe('strong')
  })
})

describe('what changed between readings', () => {
  const before: Answers = { ...demoAnswers, healing: 'fresh', attachment: 'anxious' }

  it('says it in her words — the answer then, and the answer now', () => {
    const c = changesBetween(snapshotOf(before, '2026-06-01'), snapshotOf(demoAnswers, '2026-06-20'))
    const prompts = c.answers.map((a) => a.prompt.toLowerCase())
    expect(c.answers).toHaveLength(2)
    expect(prompts.join(' ')).toMatch(/heal|hurt|past/)
    for (const a of c.answers) {
      expect(a.then).not.toBe(a.now)
      expect(a.then).not.toMatch(/^[a-z-]+$/) // labels, not ids
    }
  })

  it('names a ground that moved, and only one that did', () => {
    const c = changesBetween(snapshotOf(before, '2026-06-01'), snapshotOf(demoAnswers, '2026-06-20'))
    for (const g of c.grounds) expect(g.then).not.toBe(g.now)
  })

  it('has nothing to say when nothing changed, and nothing to say without a before', () => {
    const same = snapshotOf(demoAnswers, '2026-06-20')
    expect(changesBetween(snapshotOf(demoAnswers, '2026-06-01'), same)).toEqual({ answers: [], grounds: [] })
    expect(changesBetween(undefined, same)).toEqual({ answers: [], grounds: [] })
    // A legacy snapshot that stored a number and no answers.
    expect(changesBetween({ date: '2026-05-01', headline: 'x', grounds: {}, answers: {} }, same)).toEqual({ answers: [], grounds: [] })
  })

  it('keeps only the map’s own answers in a snapshot — never a number', () => {
    const snap = snapshotOf({ ...demoAnswers, 'hardest-part': 'serious', household: 'near-family' }, '2026-06-20')
    // The hook is asked before the map and is not part of it.
    expect(snap.answers['hardest-part']).toBeUndefined()
    // How you'd live moved into chapter two (docs/PRODUCT.md), so a change in
    // whose house she pictures is now a change the next reading can name.
    expect(snap.answers['household']).toBe('near-family')
    expect(snap.answers['healing']).toBe('healing')
    expect(JSON.stringify(snap)).not.toMatch(/overall/)
  })
})

// Moved from tests/alignment-audit.test.ts (docs/PRODUCT.md), when matching went.
describe('the map describes positions; it rates only readiness', () => {
  // Faith kept private, lighter in practice, no children in view, a long
  // timeline, family kept informed. Every one a position a person may hold.
  const answers = {
    practice: 'cultural',
    'faith-role': 1,
    'family-role': 'private',
    children: 'no',
    timeline: '3-plus',
    'why-now': 'ready',
    conflict: 'talk',
    healing: 'healed',
    attachment: 'secure',
    pattern: 'none',
    'working-on': 'Listening before I answer.',
  }

  it('faith, family and vision carry no state — nothing says her faith is thin', () => {
    const r = buildReflection(answers)
    for (const dim of ['faith', 'family', 'vision'] as const) {
      expect(r.dimensions.find((d) => d.dimension === dim)!.state, dim).toBeNull()
    }
    // Their work is still offered, after every rated ground's — never as a gap.
    expect(r.thinnest.slice(0, 4)).toEqual(expect.not.arrayContaining(['faith', 'family', 'vision']))
    expect(r.thinnest.slice(4)).toEqual(['faith', 'family', 'vision'])
  })

  it('the headline is decided by the grounds that are about readiness, and says no verdict of "ready"', () => {
    const r = buildReflection(answers)
    expect(r.headline).toBe('On steady ground')
    expect(r.headline).not.toMatch(/ready/i)
  })
})
