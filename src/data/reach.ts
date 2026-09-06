import type { Reach } from '../types'

/**
 * How far she would go for the right person.
 *
 * The one fact about geography this product cannot derive, and the one that
 * decides whether a woman in a small city is alone or is one of thirty: a
 * Bristol woman who would move within the UK is in a pool that can open years
 * before Bristol can. It is a stated preference, like her non-negotiables and
 * how she'd live — asked once, in her own words, never inferred and never
 * learned about her. Absent means "my city": the product never assumes anyone
 * would move.
 *
 * Must match netlify/shared/vocab.ts REACH.
 */
export const REACH_IDS: Reach[] = ['city', 'country', 'anywhere']

export interface ReachOption {
  id: Reach
  label: string
}

/** The three chips. `within` is the country's name as the door says it — "the UK", "Sweden". */
export function reachOptions(within: string = 'my country'): ReachOption[] {
  return [
    { id: 'city', label: 'My city' },
    { id: 'country', label: `Anywhere in ${within}` },
    { id: 'anywhere', label: 'Anywhere the diaspora is' },
  ]
}
