import { describe, expect, it } from 'vitest'
import { buildEnding, endingHeadline, type EndingInput } from './ending'
import type { FollowUp } from '../types'

const TODAY = '2026-09-04'

const empty: EndingInput = {
  gender: 'woman',
  answers: {},
  mapHistory: [],
  steps: [],
  read: null,
  beforeYes: null,
  couple: null,
  vouch: null,
  followups: [],
  completed: false,
}

const asked = (topic: string, at: string): FollowUp => ({
  id: `beforeYes:${topic}:${at}`,
  source: 'beforeYes',
  topic,
  at,
  outcome: 'asked',
  outcomeAt: at,
})

const full: EndingInput = {
  ...empty,
  completed: true,
  mapHistory: [
    { date: '2026-03-01', headline: 'Building your foundation', grounds: {}, answers: {} },
    { date: '2026-07-01', headline: 'Grounded and ready', grounds: {}, answers: {} },
  ],
  steps: [{ dimension: 'emotional', taken: '2026-03-10', done: '2026-03-12' }],
  read: { at: '2026-04-02T10:00:00.000Z', answers: {} },
  beforeYes: { at: '2026-05-01T10:00:00.000Z', answers: {} },
  couple: { code: 'ACDEFG', at: '2026-05-04T10:00:00.000Z', answered: '2026-05-05T10:00:00.000Z' },
  vouch: { relationship: 'father', firstName: 'Abdi', at: '2026-06-01T10:00:00.000Z' },
  followups: [asked('money-home', '2026-05-20T10:00:00.000Z'), asked('live', '2026-06-10T10:00:00.000Z')],
}

describe('how you chose', () => {
  it('tells the story from her own record, oldest first', () => {
    const e = buildEnding(full, TODAY)
    const dates = e.lines.map((l) => l.at).filter(Boolean) as string[]
    expect([...dates].sort()).toEqual(dates)
    expect(e.began).toBe('2026-03-01')
    expect(e.span).toBe('six months')
  })

  it('names every real thing she did, and nothing she did not', () => {
    const text = buildEnding(full, TODAY).lines.map((l) => l.text).join(' ')
    expect(text).toContain('Building your foundation')
    expect(text).toContain('Grounded and ready')
    expect(text).toMatch(/read on what he had actually done/)
    expect(text).toMatch(/eleven conversations before you said yes/)
    expect(text).toMatch(/his own phone, and he did/)
    expect(text).toContain('Your father, Abdi, vouched for you.')
  })

  it('counts only conversations she confirmed she had', () => {
    const e = buildEnding(full, TODAY)
    expect(e.conversations).toHaveLength(2)
    expect(endingHeadline(e)).toBe('You had two conversations you were not going to have.')
    // Anything unresolved, or resolved another way, is not a conversation.
    const notYet = { ...full, followups: [{ ...asked('live', '2026-06-10T10:00:00.000Z'), outcome: 'not-yet' as const }] }
    expect(buildEnding(notYet, TODAY).conversations).toHaveLength(0)
  })

  it('gives a person who did very little a short record, never a padded one', () => {
    const e = buildEnding(empty, TODAY)
    expect(e.lines).toEqual([])
    expect(e.began).toBeUndefined()
    expect(e.span).toBeUndefined()
    expect(endingHeadline(e)).toBe('You chose someone, and you did it in the open.')
  })

  it('never puts a digit in front of her', () => {
    const e = buildEnding(full, TODAY)
    for (const line of e.lines) expect(line.text).not.toMatch(/\d/)
    expect(endingHeadline(e)).not.toMatch(/\d/)
    expect(e.span).not.toMatch(/\d/)
  })

  it('says how long it took the way a person would say it', () => {
    const span = (from: string, to: string) =>
      buildEnding({ ...empty, read: { at: from, answers: {} } }, to).span
    expect(span('2026-09-01', '2026-09-04')).toBe('three days')
    expect(span('2026-08-01', '2026-09-04')).toBe('five weeks')
    expect(span('2026-03-04', '2026-09-04')).toBe('six months')
    expect(span('2025-09-04', '2026-09-04')).toBe('one year')
    expect(span('2025-07-04', '2026-09-04')).toBe('one year and two months')
  })
})
