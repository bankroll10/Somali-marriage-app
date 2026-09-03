import { describe, expect, it } from 'vitest'
import { buildRead, readSummary } from './read'
import { READ_QUESTION_COUNT, readQuestions } from '../data/read'

/**
 * The read says things about a real man to a woman who is already anxious. The
 * tests that matter are therefore not about arithmetic — they are about what it
 * is structurally incapable of saying.
 */

/** A complete set of answers, overridable per test. */
function answers(over: Record<string, string> = {}) {
  return {
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
    ...over,
  }
}

/** Everything he could fail to do. */
const nothing = {
  named: 'no',
  timeline: 'none',
  known: 'nobody',
  secret: 'soft',
  family: 'no',
  initiative: 'silence',
  'in-person': 'never',
  plans: 'no-plans',
  nonneg: 'deflected',
  hard: 'quiet',
}

function allText(r: ReturnType<typeof buildRead>): string {
  if (!r) return ''
  return [r.headline, r.summary, r.script.why, r.script.words, r.script.tells, r.caution ?? '', ...(r.watch ?? []), ...r.shown, ...r.missing]
    .join(' ')
    .toLowerCase()
}

describe('what it refuses to say', () => {
  it('never judges his character, and never tells her to stay or go', () => {
    const banned = [
      'good man', 'bad man', 'a player', 'red flag', 'he loves you', "he doesn't love you",
      'leave him', 'dump him', 'end it', 'he is not worth', 'you deserve better', 'walk away',
    ]
    const cases = [
      answers(),
      answers(nothing),
      answers({ ...nothing, duration: 'weeks-0' }),
      answers({ secret: 'explicit', hard: 'blames' }),
      answers({ duration: 'months-plus', known: 'nobody' }),
    ]
    for (const a of cases) {
      const text = allText(buildRead(a))
      for (const phrase of banned) expect(text, `for ${JSON.stringify(a)}`).not.toContain(phrase)
    }
  })

  it('never attaches a number to a human being', () => {
    const r = buildRead(answers())!
    expect(allText(r)).not.toMatch(/\b\d{1,3}\s*(%|out of|\/)/)
    // The dimensions she sees are three words, never a score.
    for (const d of r.dimensions) expect(['shown', 'partly', 'not-yet']).toContain(d.state)
  })
})

describe('honesty about what it can know', () => {
  it('refuses to conclude anything under two weeks, however good it looks', () => {
    const r = buildRead(answers({ duration: 'weeks-0' }))!
    expect(r.band).toBe('early')
    expect(r.headline).toMatch(/too early/i)
    expect(r.watch).toHaveLength(5)
    expect(r.script.words).toMatch(/what you are looking for/i)
  })

  it('will not call him strong while she is being kept hidden', () => {
    // Everything else perfect; nobody knows she exists.
    const r = buildRead(answers({ known: 'nobody', secret: 'soft' }))!
    expect(r.band).not.toBe('strong')
    expect(r.thin).toBe('public')
  })

  it('needs every answer before it says anything at all', () => {
    const partial = answers()
    delete (partial as Record<string, string>).hard
    expect(buildRead(partial)).toBeNull()
  })
})

describe('the pattern it declines to coach', () => {
  it('names being hidden and blamed, and sends her to a real person', () => {
    const r = buildRead(answers({ secret: 'explicit', hard: 'blames' }))!
    expect(r.band).toBe('caution')
    expect(r.caution).toMatch(/tell one person/i)
    // Not a diagnosis of him.
    expect(r.summary).toMatch(/cannot tell you what he intends/i)
  })

  it('treats explicit secrecy with total isolation the same way', () => {
    const r = buildRead(answers({ secret: 'explicit', known: 'nobody' }))!
    expect(r.band).toBe('caution')
  })

  it('does not fire on secrecy alone when everything else is healthy', () => {
    const r = buildRead(answers({ secret: 'explicit' }))!
    expect(r.band).not.toBe('caution')
  })
})

describe('the reading itself', () => {
  it('recognises a man who has actually done the things', () => {
    const r = buildRead(answers())!
    expect(r.band).toBe('strong')
    expect(r.shown.length).toBeGreaterThan(4)
    expect(r.missing).toHaveLength(0)
  })

  it('recognises when almost nothing has happened', () => {
    const r = buildRead(answers(nothing))!
    expect(r.band).toBe('thin')
    expect(r.missing.length).toBeGreaterThan(4)
  })

  it('always ends in words she can actually say', () => {
    for (const a of [answers(), answers(nothing), answers({ duration: 'weeks-0' }), answers({ secret: 'explicit', hard: 'blames' })]) {
      const r = buildRead(a)!
      expect(r.script.words.length).toBeGreaterThan(60)
      expect(r.script.tells.length).toBeGreaterThan(40)
    }
  })

  it('speaks to the thinnest ground, not a generic script', () => {
    expect(buildRead(answers({ known: 'nobody', secret: 'soft' }))!.thin).toBe('public')
    // Weighted by consequence, not just depth: being hidden outranks a smaller
    // gap that happens to score lower. Asking how he'd approach her family is
    // the wrong question to put to a man who has told nobody she exists.
    expect(buildRead(answers({ known: 'nobody', secret: 'soft', family: 'no' }))!.thin).toBe('public')
    expect(buildRead(answers({ family: 'avoids' }))!.thin).toBe('family')
    expect(buildRead(answers({ initiative: 'silence', 'in-person': 'never', plans: 'no-plans' }))!.thin).toBe('consistency')
    expect(buildRead(answers({ named: 'no', timeline: 'none' }))!.thin).toBe('intent')
  })

  it('reads back her own answers rather than generic advice', () => {
    const r = buildRead(answers({ duration: 'months-plus', known: 'nobody', secret: 'soft' }))!
    expect(r.summary).toMatch(/past three months/i)
    expect(r.missing.join(' ')).toMatch(/nobody in his life knows you exist/i)
    // A gap this late is named as a decision, not an oversight.
    expect(r.summary).toMatch(/decision rather than an oversight/i)
  })

  it('gives two different women two different readings', () => {
    const a = buildRead(answers({ named: 'no', timeline: 'none' }))!
    const b = buildRead(answers({ initiative: 'silence', 'in-person': 'never', plans: 'few' }))!
    expect(a.summary).not.toEqual(b.summary)
    expect(a.script.words).not.toEqual(b.script.words)
  })
})

describe('a man reading a woman', () => {
  it('flips every pronoun, in prompts, options and notes', () => {
    const qs = readQuestions('man')
    const text = qs.map((q) => `${q.prompt} ${q.helper ?? ''} ${q.options.map((o) => `${o.label} ${o.note}`).join(' ')}`).join(' ')
    expect(text).not.toMatch(/\bhe\b|\bhim\b|\bhis\b|\bhimself\b/i)
    expect(text).toMatch(/\bshe\b/)
    expect(text).not.toMatch(/\{/)
  })

  it('asks the same number of questions of everyone', () => {
    expect(readQuestions('woman')).toHaveLength(READ_QUESTION_COUNT)
    expect(readQuestions('man')).toHaveLength(READ_QUESTION_COUNT)
  })

  it('produces a reading for him too', () => {
    const r = buildRead(answers(), 'man')!
    expect(r.band).toBe('strong')
    expect(r.summary).not.toMatch(/\bhis\b/)
  })
})

describe('what the Guide is told', () => {
  it('summarises a read in one line, with no personal detail in it', () => {
    const r = buildRead(answers({ known: 'nobody', secret: 'soft' }))!
    const s = readSummary(r)
    expect(s).toMatch(/thinnest ground/)
    expect(s.length).toBeLessThan(120)
  })
})
