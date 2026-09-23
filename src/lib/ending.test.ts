import { describe, expect, it } from 'vitest'
import { buildEnding, endingHeadline, marriedShares, type EndingInput } from './ending'
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
    expect(text).toMatch(/read on what he had done/)
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

describe('the two things only a married person can send', () => {
  it('both say what kind of link they are, and nothing about who sent them', () => {
    const { eleven, door } = marriedShares({ scene: 'twin-cities' }, 'Ask about money home before anyone books a hall.')
    expect(eleven.url).toMatch(/\/tools\/before-you-say-yes\?via=married$/)
    expect(door.url).toMatch(/\/tools\/door\?via=married$/)
    for (const share of [eleven, door]) {
      expect(share.url).not.toMatch(/code|map=|ref|name/)
      expect(share.text).not.toMatch(/Hodan|ACDEFG/)
    }
  })

  it('her line rides on the eleven — the friend who is talking to someone — and not on the door', () => {
    const { eleven, door } = marriedShares({ scene: 'twin-cities' }, 'Ask about money home before anyone books a hall.')
    expect(eleven.text).toContain('Ask about money home before anyone books a hall.')
    expect(door.text).not.toContain('money home before anyone')
    expect(marriedShares({}).eleven.text).not.toMatch(/\n\n/)
  })

  it('names the pool the way the door does — the city, or the country for somewhere else', () => {
    expect(marriedShares({ scene: 'twin-cities' }).door.text).toContain('Minneapolis–St. Paul opens when there are enough women and men here that each can be introduced')
    expect(marriedShares({ scene: 'other', country: 'uk' }).door.text).toContain('the UK opens when')
    expect(marriedShares({}).door.text).toContain('your city opens when')
  })

  it('the door share is for the person who is looking, and says so', () => {
    const { door } = marriedShares({ scene: 'london' })
    expect(door.text).toMatch(/If you’re looking/)
    expect(door.text).toMatch(/No photos, no account/)
  })

  it('claims the eleven only when she did them, and never names the year', () => {
    // The record refuses to claim anything she did not do; the share must not
    // either — a template testimonial is the one thing that would poison the
    // married referral in a community this tight (docs/BOARD.md).
    const without = marriedShares({ scene: 'london' }, 'Ask early.')
    expect(without.eleven.text).not.toMatch(/we went through/)
    expect(without.eleven.text).toMatch(/There are eleven conversations/)
    expect(without.eleven.text).toContain('Ask early.')
    const withEleven = marriedShares({ scene: 'london' }, undefined, { eleven: true })
    expect(withEleven.eleven.text).toMatch(/Before we said yes, we went through eleven conversations/)
    for (const s of [without, withEleven]) {
      expect(s.door.text).not.toMatch(/this year/)
      expect(s.door.text).toMatch(/^We married, alhamdulillah\./)
    }
  })
})
