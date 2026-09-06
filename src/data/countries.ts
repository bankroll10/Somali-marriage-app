/**
 * The countries the diaspora lives in.
 *
 * A city is where a person can meet someone this week. A country is where she
 * would move for the right person — and for most of the diaspora, who live in
 * a hundred small pockets rather than five big ones, the country is the only
 * geography in which a real number of serious people exists at all. So the
 * country sits above the city in the door's count, and never below it:
 * `docs/LEARNING.md` refuses anything finer than the city, and this is coarser.
 *
 * Adding a country is a two-file change — here and `COUNTRIES` in
 * netlify/shared/vocab.ts — and `tests/vocab-sync.test.ts` fails until both
 * move. `other` is the honest residual, not a place: two people in it may be
 * continents apart, so it is never a pool that opens.
 */
export interface Country {
  id: string
  label: string
  /** How the door names the pool: "Across the UK…", "Across Sweden…". */
  within: string
}

export const countries: Country[] = [
  { id: 'us', label: 'United States', within: 'the US' },
  { id: 'ca', label: 'Canada', within: 'Canada' },
  { id: 'uk', label: 'United Kingdom', within: 'the UK' },
  { id: 'se', label: 'Sweden', within: 'Sweden' },
  { id: 'no', label: 'Norway', within: 'Norway' },
  { id: 'dk', label: 'Denmark', within: 'Denmark' },
  { id: 'nl', label: 'Netherlands', within: 'the Netherlands' },
  { id: 'fi', label: 'Finland', within: 'Finland' },
  { id: 'de', label: 'Germany', within: 'Germany' },
  { id: 'au', label: 'Australia', within: 'Australia' },
  { id: 'ke', label: 'Kenya', within: 'Kenya' },
  { id: 'ae', label: 'UAE', within: 'the UAE' },
  { id: 'so', label: 'Somalia', within: 'Somalia' },
  { id: 'other', label: 'Somewhere else', within: 'your country' },
]

/** Must match netlify/shared/vocab.ts COUNTRIES. */
export const COUNTRY_IDS: string[] = countries.map((c) => c.id)

export function getCountry(id?: string): Country | undefined {
  return countries.find((c) => c.id === id)
}
