/**
 * How far someone would go for the right person.
 *
 * The one fact about geography the introduction list cannot derive, and the
 * one that decides whether two people could be introduced at all: a woman in
 * Bristol who would move within the UK can be introduced to a man in Leeds;
 * one who would not, cannot. A stated preference, asked once, never inferred.
 * Absent means her city: the product never assumes anyone would move.
 *
 * Two answers, not three. The door's third, "anywhere the diaspora is",
 * counted as `country` in every readout because no cross-country pool ever
 * existed (`git show 43295a4:src/data/reach.ts`). The first introductions are
 * made by hand, in one country at a time, so the third answer is not asked.
 *
 * Must match netlify/shared/vocab.ts REACH (tests/vocab-sync.test.ts).
 */
export type Reach = 'city' | 'country'

export const REACH_IDS: Reach[] = ['city', 'country']

export interface ReachOption {
  id: Reach
  label: string
}

/** The two chips. `within` is the country's name as the screen says it — "the UK", "Sweden". */
export function reachOptions(within = 'my country'): ReachOption[] {
  return [
    { id: 'city', label: 'My city' },
    { id: 'country', label: `Anywhere in ${within}` },
  ]
}
