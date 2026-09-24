/**
 * The countries the diaspora lives in.
 *
 * Asked only when her city is `other`, so the help line she is shown is her
 * country's (src/data/help.ts). Never sent anywhere.
 */
export interface Country {
  id: string
  label: string
}

export const countries: Country[] = [
  { id: 'us', label: 'United States' },
  { id: 'ca', label: 'Canada' },
  { id: 'uk', label: 'United Kingdom' },
  { id: 'se', label: 'Sweden' },
  { id: 'no', label: 'Norway' },
  { id: 'dk', label: 'Denmark' },
  { id: 'nl', label: 'Netherlands' },
  { id: 'fi', label: 'Finland' },
  { id: 'de', label: 'Germany' },
  { id: 'au', label: 'Australia' },
  { id: 'ke', label: 'Kenya' },
  { id: 'ae', label: 'UAE' },
  { id: 'so', label: 'Somalia' },
  { id: 'other', label: 'Somewhere else' },
]

/** Must match netlify/shared/vocab.ts COUNTRIES. */
export const COUNTRY_IDS: string[] = countries.map((c) => c.id)
