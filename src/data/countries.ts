/**
 * The countries the diaspora lives in.
 *
 * Asked only when her city is `other`, so the help line she is shown is her
 * country's (src/data/help.ts). It leaves the phone only inside a kept map.
 */
export interface Country {
  id: string
  label: string
  /** The country as a sentence says it — "anywhere in the UK" (src/data/reach.ts). */
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

export function getCountry(id?: string): Country | undefined {
  return countries.find((c) => c.id === id)
}

/** Every country she can pick; tests/help.test.ts holds src/data/help.ts to it. */
export const COUNTRY_IDS: string[] = countries.map((c) => c.id)
