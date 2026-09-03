import { describe, expect, it } from 'vitest'
import { beforeYesSummary, buildBeforeYes } from './beforeYes'
import { BEFORE_YES_COUNT, beforeYesTopics } from '../data/beforeYes'

/**
 * Before you say yes tells a woman which conversation to open with a real man.
 * As with the Read, what matters most is what it is structurally unable to say.
 */

const IDS = beforeYesTopics('woman').map((t) => t.id)
const all = (state: string) => Object.fromEntries(IDS.map((id) => [id, state]))
const answers = (over: Record<string, string> = {}) => ({ ...all('agree'), ...over })

function prose(r: ReturnType<typeof buildBeforeYes>): string {
  if (!r) return ''
  const notes = Object.values(r.byState).flatMap((xs) => xs.map((x) => x.note))
  return [r.headline, r.summary, r.open.why, r.open.script.why, r.open.script.words, r.open.script.tells, ...notes]
    .join(' ')
    .toLowerCase()
}

describe('what it refuses to say', () => {
  const banned = [
    'good man', 'bad man', 'a player', 'red flag', 'he loves you', "he doesn't love you",
    'leave him', 'dump him', 'end it', 'walk away', 'you deserve better',
    'you should marry', 'do not marry', "don't marry", 'call it off', 'not right for you', 'dealbreaker',
  ]
  const cases = [
    answers(),
    all('not-talked'),
    all('differ'),
    all('unknown'),
    answers({ live: 'differ', 'second-wife': 'differ', qabiil: 'not-talked' }),
    answers({ 'money-home': 'unknown' }),
  ]
  it('never judges him, and never tells her to stay or go', () => {
    for (const a of cases) {
      const text = prose(buildBeforeYes(a))
      for (const phrase of banned) expect(text, JSON.stringify(a)).not.toContain(phrase)
    }
  })

  it('never puts a digit in front of her — counts are spelled out', () => {
    for (const a of cases) expect(prose(buildBeforeYes(a))).not.toMatch(/\d/)
  })
})

describe('what it needs', () => {
  it('needs every conversation answered before it says anything', () => {
    const partial = answers()
    delete (partial as Record<string, string>).qabiil
    expect(buildBeforeYes(partial)).toBeNull()
  })
  it('rejects an answer it does not recognise', () => {
    expect(buildBeforeYes(answers({ live: 'maybe' }))).toBeNull()
  })
  it('asks the same conversations of everyone', () => {
    expect(beforeYesTopics('woman')).toHaveLength(BEFORE_YES_COUNT)
    expect(beforeYesTopics('man')).toHaveLength(BEFORE_YES_COUNT)
  })
})

describe('which one to open', () => {
  it('a disagreement about where you would live outranks an unasked question about the wedding', () => {
    const r = buildBeforeYes(answers({ live: 'differ', 'aroos-mahr': 'not-talked' }))!
    expect(r.open.id).toBe('live')
  })
  it('an unasked question about where you would live outranks a disagreement about the wedding', () => {
    const r = buildBeforeYes(answers({ live: 'not-talked', 'aroos-mahr': 'differ' }))!
    expect(r.open.id).toBe('live')
  })
  it('a disagreement about a second wife outranks an unasked question about money', () => {
    const r = buildBeforeYes(answers({ 'second-wife': 'differ', 'money-home': 'not-talked' }))!
    expect(r.open.id).toBe('second-wife')
  })
  it('when she does not know her own answer, the words are for herself first', () => {
    const r = buildBeforeYes(answers({ 'money-home': 'unknown' }))!
    expect(r.open.id).toBe('money-home')
    expect(r.open.script.words).toMatch(/give me a week/i)
    expect(r.summary).toMatch(/starts with you, not him/i)
  })
  it('when everything is agreed, it still ends in words — to revisit, not to celebrate', () => {
    const r = buildBeforeYes(answers())!
    expect(r.headline).toMatch(/done the work/i)
    expect(r.open.script.words).toMatch(/go back over/i)
  })
})

describe('the headline is about the conversations, never about him', () => {
  it('names one load-bearing disagreement as one', () => {
    const r = buildBeforeYes(answers({ live: 'differ' }))!
    expect(r.loadBearingDiffer).toEqual(['Where you’d live'])
    expect(r.headline).toMatch(/carrying more weight/i)
  })
  it('names two or more as more than one', () => {
    const r = buildBeforeYes(answers({ live: 'differ', 'second-wife': 'differ' }))!
    expect(r.loadBearingDiffer).toHaveLength(2)
    expect(r.headline).toMatch(/more than one/i)
  })
  it('does not call a wedding disagreement load-bearing', () => {
    const r = buildBeforeYes(answers({ 'aroos-mahr': 'differ' }))!
    expect(r.loadBearingDiffer).toEqual([])
    expect(r.headline).toMatch(/mostly agree/i)
  })
  it('says nothing is broken when nothing has been talked about', () => {
    const r = buildBeforeYes(all('not-talked'))!
    expect(r.headline).toMatch(/nothing is broken/i)
    expect(r.summary).toMatch(/eleven you haven’t had yet/i)
  })
})

describe('her own answers, read back', () => {
  it('states each conversation as a fact from her side', () => {
    const r = buildBeforeYes(answers({ qabiil: 'not-talked', work: 'differ' }))!
    expect(r.byState['not-talked'][0].note).toBe('you have not talked about qabiil')
    expect(r.byState.differ[0].note).toMatch(/whether you’d work, and you don’t agree/)
  })
  it('gives two different women two different readings', () => {
    const a = buildBeforeYes(answers({ live: 'differ' }))!
    const b = buildBeforeYes(answers({ 'going-back': 'not-talked', children: 'unknown' }))!
    expect(a.summary).not.toEqual(b.summary)
    expect(a.open.script.words).not.toEqual(b.open.script.words)
  })
  it('every conversation ends in words she can say', () => {
    for (const t of beforeYesTopics('woman')) {
      expect(t.script.words.length, t.id).toBeGreaterThan(60)
      expect(t.script.tells.length, t.id).toBeGreaterThan(40)
      expect(t.why.length, t.id).toBeGreaterThan(60)
    }
  })
})

describe('a man reading a woman', () => {
  it('flips every pronoun and leaves no token behind', () => {
    const text = beforeYesTopics('man')
      .map((t) => `${t.label} ${t.prompt} ${t.why} ${t.script.why} ${t.script.words} ${t.script.tells}`)
      .join(' ')
    expect(text).not.toMatch(/\bhe\b|\bhim\b|\bhis\b|\bhimself\b/)
    expect(text).toMatch(/\bshe\b/)
    expect(text).not.toMatch(/\{/)
  })
  it('reads for him too', () => {
    const r = buildBeforeYes(answers({ live: 'unknown' }), 'man')!
    expect(r.summary).toMatch(/starts with you, not her/i)
  })
})

describe('what the Guide is told', () => {
  it('is one short line with no detail a stranger could use', () => {
    const r = buildBeforeYes(answers({ live: 'differ', 'money-home': 'not-talked' }))!
    const s = beforeYesSummary(r)
    expect(s).toMatch(/^agreed on nine of eleven; differ on where you’d live; open next: where you’d live$/)
    expect(s.length).toBeLessThan(120)
    expect(s).not.toMatch(/\d/)
  })
})
