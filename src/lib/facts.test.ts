import { describe, expect, it } from 'vitest'
import { factsFrom, type FactsInput } from './facts'
import { buildReflection } from './reflection'
import { readQuestions } from '../data/read'
import { beforeYesTopics } from '../data/beforeYes'
import type { FollowUp } from '../types'

/**
 * The facts are the one thing this product knows that could not be copied
 * from its screens, and they may only ever be ids from lists the product
 * owns. These pin both halves: that the knowledge is there, and that nothing
 * a person wrote can be.
 */

const none: FactsInput = { reflection: null, read: null, beforeYes: null, followups: [], ending: null, gender: 'woman' }

/** A complete read, every question answered with its first option. */
const readAnswers = Object.fromEntries(readQuestions('woman').map((q) => [q.id, q.options[0].id]))
/** A complete eleven: two disagreements, one not had, the rest agreed. */
const elevenAnswers = Object.fromEntries(
  beforeYesTopics('woman').map((t, i) => [t.id, i === 0 ? 'differ' : i === 3 ? 'differ' : i === 5 ? 'not-talked' : 'agree']),
)

const asked = (source: FollowUp['source'], topic: string, outcome: FollowUp['outcome'] = 'asked'): FollowUp => ({
  id: `${source}-${topic}`,
  source,
  topic,
  at: '2026-01-01T00:00:00.000Z',
  outcome,
  outcomeAt: '2026-01-04T00:00:00.000Z',
})

const leaves = (x: unknown): string[] => {
  if (typeof x === 'string') return [x]
  if (typeof x === 'number') return []
  if (Array.isArray(x)) return x.flatMap(leaves)
  if (x && typeof x === 'object') return Object.values(x).flatMap(leaves)
  return []
}

describe('what the rungs were made of', () => {
  it('says nothing at all for someone who has done nothing', () => {
    expect(factsFrom(none)).toEqual({})
  })

  it('names each of the seven grounds in a word, from the reflection', () => {
    const facts = factsFrom({ ...none, reflection: buildReflection({}) })
    expect(Object.keys(facts.grounds!).sort()).toEqual(
      ['intention', 'faith', 'family', 'vision', 'character', 'emotional', 'selfAwareness'].sort(),
    )
    for (const state of Object.values(facts.grounds!)) expect(['thin', 'steady', 'strong']).toContain(state)
  })

  it('carries the read’s band and thinnest ground, and none of her answers', () => {
    const facts = factsFrom({ ...none, read: { at: '2026-01-01', answers: readAnswers } })
    expect(['early', 'strong', 'mixed', 'thin', 'caution']).toContain(facts.read!.band)
    expect(['intent', 'public', 'family', 'consistency', 'pressure']).toContain(facts.read!.thin)
    expect(Object.keys(facts.read!).sort()).toEqual(['band', 'thin'])
    // Not one of her answers travels: no question id appears anywhere.
    const serialised = JSON.stringify(facts)
    for (const id of Object.keys(readAnswers)) expect(serialised).not.toContain(`"${id}"`)
  })

  it('counts the eleven to exactly eleven and names the one to open — never her sheet', () => {
    const facts = factsFrom({ ...none, beforeYes: { at: '2026-01-01', answers: elevenAnswers } })
    const e = facts.eleven!
    expect(e.agree + e.differ + e.notTalked + e.unknown).toBe(11)
    expect(e.differ).toBe(2)
    expect(e.notTalked).toBe(1)
    expect(beforeYesTopics('woman').map((t) => t.id)).toContain(e.open)
    expect(Object.keys(e).sort()).toEqual(['agree', 'differ', 'notTalked', 'open', 'unknown'])
  })

  it('lists the conversations she confirmed as source:topic — never the guide’s, never "not yet"', () => {
    const facts = factsFrom({
      ...none,
      followups: [
        asked('beforeYes', 'money-home'),
        asked('read', 'early'),
        asked('family', 'first-with-hooyo'),
        asked('couple', 'live', 'not-yet'),
        asked('guide', 'should I tell my mother about him'),
        asked('beforeYes', 'money-home'),
      ],
    })
    expect(facts.through).toEqual(['beforeYes:money-home', 'family:first-with-hooyo', 'read:early'])
  })

  it('carries who, mattered and used from the ending, and never the advice', () => {
    const facts = factsFrom({
      ...none,
      ending: { at: '2026-05-01', who: 'brought', mattered: 'eleven', used: ['map', 'eleven'], advice: 'Ask about money early.' },
    })
    expect(facts.ending).toEqual({ who: 'brought', mattered: 'eleven', used: ['eleven', 'map'] })
    expect(JSON.stringify(facts)).not.toContain('money early')
  })

  it('drops any id it does not recognise, so a stale record cannot poison the report', () => {
    const facts = factsFrom({
      ...none,
      followups: [asked('beforeYes', 'pets'), asked('read', 'money-home')],
      ending: { at: '2026-05-01', who: 'tinder', mattered: 'eleven', used: ['map', 'swipes'] },
    })
    expect(facts.through).toBeUndefined()
    expect(facts.ending).toEqual({ mattered: 'eleven', used: ['map'] })
  })

  it('serialises the same facts to the same string whatever order the input came in', () => {
    const a = factsFrom({ ...none, followups: [asked('read', 'public'), asked('beforeYes', 'live')], ending: { at: 'x', used: ['vouch', 'guide'] } })
    const b = factsFrom({ ...none, followups: [asked('beforeYes', 'live'), asked('read', 'public')], ending: { at: 'x', used: ['guide', 'vouch'] } })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('has no field that could carry text she wrote', () => {
    const facts = factsFrom({
      reflection: buildReflection({}),
      read: { at: '2026-01-01', answers: readAnswers },
      beforeYes: { at: '2026-01-01', answers: elevenAnswers },
      followups: [asked('beforeYes', 'money-home'), asked('family', 'tell-wali-online')],
      ending: { at: '2026-05-01', who: 'here', mattered: 'shown', used: ['read'], advice: 'a whole sentence, with spaces.' },
      gender: 'woman',
    })
    for (const leaf of leaves(facts)) expect(leaf).toMatch(/^[A-Za-z-]+(:[A-Za-z-]+)?$/)
  })
})
