import { describe, expect, it } from 'vitest'
import { dailyPrefsFor } from './personalize'
import type { Reflection } from '../types'

function reflection(lowest: Reflection['dimensions'][number]['dimension']): Reflection {
  return {
    headline: '',
    summary: '',
    dimensions: [
      { dimension: 'intention', label: 'Intention', state: 'strong', note: '' },
      { dimension: lowest, label: 'Low', state: 'thin', note: '' },
    ],
    thinnest: [lowest, 'intention'],
    coreValues: [],
    nonNegotiables: [],
    growthNote: '',
    alignment: '',
  }
}

describe('dailyPrefsFor', () => {
  it('leads with what the member named as their hardest part', () => {
    const p = dailyPrefsFor('family', null, 'preparing')
    expect(p.tags[0]).toBe('Family')
    expect(p.reasons?.Family).toContain('pressure from family')
  })

  it('stops using the search hook once someone is married', () => {
    // Telling a married woman her reflection was picked because finding
    // someone serious is hard would be nonsense.
    const p = dailyPrefsFor('finding', null, 'married')
    expect(p.tags).not.toContain('Diaspora')
    expect(p.tags).toContain('Heart')
  })

  it('switches to the deciding-together themes at that stage', () => {
    const p = dailyPrefsFor('serious', null, 'deciding')
    expect(p.tags).toContain('Family')
    expect(p.tags).toContain('Patience')
  })

  it('reaches for the thinnest ground on the map', () => {
    const p = dailyPrefsFor(undefined, reflection('family'), 'preparing')
    expect(p.tags).toContain('Family')
    expect(p.reasons?.Family).toContain('most room')
  })

  it('never repeats a tag', () => {
    const p = dailyPrefsFor('family', reflection('family'), 'preparing')
    expect(new Set(p.tags).size).toBe(p.tags.length)
  })

  it('gives every chosen tag a reason the card can show', () => {
    const p = dailyPrefsFor('trust', reflection('emotional'), 'preparing')
    for (const tag of p.tags) {
      expect(p.reasons?.[tag], `no reason for ${tag}`).toBeTruthy()
    }
  })

  it('returns something usable for a brand-new member with nothing recorded', () => {
    const p = dailyPrefsFor(undefined, null, 'preparing')
    expect(Array.isArray(p.tags)).toBe(true)
  })
})
