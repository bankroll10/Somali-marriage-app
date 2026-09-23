import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { blocked } from '../netlify/shared/gate'
import { eligible, withinAgeGap } from '../netlify/functions/pool'
import { alignment } from '../src/lib/matching'
import { buildRead, readSummary } from '../src/lib/read'
import { buildReflection } from '../src/lib/reflection'
import { buildBeforeYes } from '../src/lib/beforeYes'
import { beforeYesTopics } from '../src/data/beforeYes'
import type { Candidate } from '../src/data/candidates'

/**
 * Matching and alignment, audited as a decision system (docs/ALIGNMENT.md).
 *
 * Every number in these systems is editorial — no introduction has been made,
 * and nothing here has been measured against an outcome. So each test below
 * holds one piece of authority the product had not earned, and has given
 * back: a gate that blocked on our reading rather than their words, an age
 * band neither person stated, a score that chose the most flattering invented
 * man, a band that said "predict", a map that rated a person's faith, and a
 * headline that told a couple their difference was a light one.
 */

const him = (over: Partial<Candidate> = {}): Candidate => ({
  id: 'x',
  name: 'X',
  age: 30,
  gender: 'man',
  scene: 'twin-cities',
  occupation: '',
  practice: 'consistent',
  faithRole: 4,
  timeline: '1-2',
  familyRole: 'guided',
  children: 'want',
  household: 'near-family',
  work: 'both',
  moneyHome: 'some',
  values: [],
  bio: '',
  prompts: [],
  ...over,
})

describe('the hard gates block only what someone said, where the words plainly clash', () => {
  it('faith: "lighter in practice" blocks; "on the way back" is a question, not a verdict', () => {
    expect(blocked(['faith-nn'], {}, { practice: 'cultural' })).toBe('faith')
    expect(blocked(['faith-nn'], {}, { practice: 'returning' })).toBeNull()
    const a = alignment({ dealbreakers: ['faith-nn'] }, him({ practice: 'returning' }))
    expect(a.blocked).toBeNull()
    expect(a.ask).toMatch(/faith/i)
  })

  it('the block names his answer, and passes no judgement on his faith', () => {
    const a = alignment({ dealbreakers: ['faith-nn'] }, him({ practice: 'cultural' }))
    expect(a.blocked).toMatch(/lighter in practice/)
    expect(a.blocked).not.toMatch(/not there yet/)
  })

  it('children: want against no blocks, both ways; open against no is a difference to ask about', () => {
    expect(blocked(['kids-nn'], { children: 'want' }, { children: 'no' })).toBe('children')
    expect(blocked(['kids-nn'], { children: 'no' }, { children: 'want' })).toBe('children')
    expect(blocked(['kids-nn'], { children: 'open' }, { children: 'no' })).toBeNull()
    expect(blocked(['kids-nn'], { children: 'no' }, { children: 'open' })).toBeNull()
    const a = alignment({ dealbreakers: ['kids-nn'], children: 'open' }, him({ children: 'no' }))
    expect(a.blocked).toBeNull()
    expect(a.ask).toMatch(/children/i)
  })
})

describe('the age band is our assumption, so it is reported beside the gate and never inside it', () => {
  const w = (age?: number) => ({ age, nn: [], practice: 'devout', children: 'want' }) as never
  const m = (age?: number) => ({ age, nn: [], practice: 'devout', children: 'want' }) as never

  it('a woman five years older than him is eligible; the band only says it is outside what we assumed', () => {
    expect(eligible(w(35), m(30))).toBe(true)
    expect(withinAgeGap(w(35), m(30))).toBe(false)
    expect(eligible(w(25), m(40))).toBe(true)
    expect(withinAgeGap(w(25), m(40))).toBe(false)
    expect(withinAgeGap(w(28), m(31))).toBe(true)
  })

  it('an age is still required — an introduction by hand cannot be made without one, and she was told so', () => {
    expect(eligible(w(undefined), m(30))).toBe(false)
    expect(eligible(w(30), m(undefined))).toBe(false)
  })
})

describe('the sample introduction carries no number', () => {
  const answers = {
    'faith-role': 4,
    practice: 'consistent',
    timeline: '1-2',
    'family-role': 'central',
    children: 'want',
    household: 'with-family',
    'value-most': ['kindness'],
  }

  it('returns no fit, no score, nothing a screen could rank by', () => {
    const a = alignment(answers, him({ values: ['Kindness'] })) as unknown as Record<string, unknown>
    expect(Object.values(a).some((v) => typeof v === 'number')).toBe(false)
    expect(a).not.toHaveProperty('fit')
  })

  it('says only what is literally the same, literally different, and not known yet', () => {
    const a = alignment({ ...answers, work: 'unsure' }, him({ values: ['Kindness'], familyRole: 'guided', household: 'separate' }))
    expect(a.same.join(' ')).toMatch(/kindness/i)
    expect(a.same.join(' ')).toMatch(/children|family/i)
    expect(a.differ.join(' ')).toMatch(/family/i)
    expect(a.differ.join(' ')).toMatch(/house|live/i)
    expect(a.unknown.join(' ')).toMatch(/work/i)
    // Nothing that is the same is also called a difference.
    for (const d of a.differ) expect(a.same).not.toContain(d)
  })

  it('an unanswered map is not known, never scored as half a match', () => {
    const a = alignment({}, him())
    expect(a.same).toEqual([])
    expect(a.differ).toEqual([])
  })
})

describe('the read summarises her answers; it does not predict', () => {
  // He named marriage, gave a date, his family knows, never asked for secrecy,
  // asked how to approach her family, and is steady — and he pushed back on
  // what she will not compromise on, and goes quiet when something is hard.
  // The old weights summed that past 0.72 and told her he had "shown you the
  // things that predict it". The states on her screen say pressure: not yet.
  const answers = {
    duration: 'months-3',
    named: 'early',
    timeline: 'dated',
    known: 'family',
    secret: 'no',
    family: 'how',
    initiative: 'same-day',
    'in-person': 'several',
    plans: 'never',
    money: 'no',
    nonneg: 'pushed',
    hard: 'quiet',
  }

  it('the band follows the dimension states she can see', () => {
    const r = buildRead(answers)!
    expect(r.dimensions.find((d) => d.dimension === 'pressure')!.state).toBe('not-yet')
    expect(r.band).not.toBe('strong')
  })

  it('a read she can check: strong only when being known is shown, nothing is not-yet, and four of five are shown', () => {
    const r = buildRead({ ...answers, nonneg: 'straight', hard: 'listens' })!
    expect(r.band).toBe('strong')
    expect(r.dimensions.every((d) => d.state !== 'not-yet')).toBe(true)
  })

  it('"I have not told him" says nothing about him, so it is not scored', () => {
    // Scored at 0.5 it dragged "gets defensive, but comes back" under the line.
    const r = buildRead({ ...answers, nonneg: 'untold', hard: 'defensive' })!
    expect(r.dimensions.find((d) => d.dimension === 'pressure')!.state).toBe('shown')
  })

  it('never claims to predict, in the result or in what the guide is told', () => {
    const r = buildRead({ ...answers, nonneg: 'straight', hard: 'listens' })!
    expect(`${r.headline} ${r.summary}`).not.toMatch(/\bpredicts?\b|passing time produces|rarer than/i)
    expect(r.summary).toMatch(/not a prediction/)
    expect(readSummary({ band: 'strong', thin: 'public' })).not.toMatch(/predict/i)
  })
})

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

describe('Before you say yes never ranks a difference as a light one', () => {
  it('a single difference on qabiil is named, not weighed', () => {
    const topics = beforeYesTopics('woman')
    const answers = Object.fromEntries(topics.map((t) => [t.id, t.id === 'qabiil' ? 'differ' : 'agree']))
    const r = buildBeforeYes(answers)!
    expect(r.headline).not.toMatch(/weight|heav|light|mostly/i)
    expect(r.headline).toMatch(/one/i)
  })

  it('all eleven agreed is said as what it is, without a statistic about other couples', () => {
    const topics = beforeYesTopics('woman')
    const r = buildBeforeYes(Object.fromEntries(topics.map((t) => [t.id, 'agree'])))!
    expect(r.headline).not.toMatch(/most couples/i)
  })
})

describe('no screen claims authority the product has not earned', () => {
  const BANNED = [
    /\bpredicts?\b/i,
    /Chosen by alignment/,
    /never introduced, however much else fits/,
    /carry the most weight/,
    /most couples never/,
    /rarer than you would think/,
    /Grounded and ready/,
    /We’ll look for someone/,
    /will find you someone/,
  ]
  const files: string[] = []
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)) files.push(p)
    }
  }
  walk(new URL('../src', import.meta.url).pathname)

  it('in any source file a member can be shown', () => {
    const found: string[] = []
    for (const f of files) {
      // Comments may name what was removed; only strings reach a screen.
      const code = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      for (const b of BANNED) if (b.test(code)) found.push(`${f.split('/src/')[1]}: ${b}`)
    }
    expect(found).toEqual([])
  })
})
