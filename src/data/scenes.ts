/**
 * The diaspora "scenes" — the local Somali communities the app speaks to. This
 * is a belonging signal, not just a location field: it lets Home and (later)
 * discovery feel like *your* world, not a generic marketplace.
 *
 * Each named city sits in a country (src/data/countries.ts), and the door
 * counts both: the city she can meet someone in this week, and the country she
 * would move within for the right person. `other` is not a city — two people
 * in it may be continents apart — so it carries no country of its own; she
 * names one when she picks it.
 */
export interface Scene {
  id: string
  label: string
  /** A short, warm line that makes the place feel seen. */
  note: string
  /** The country this city is in. Absent only for `other`. Must match vocab.ts SCENE_COUNTRY. */
  country?: string
}

export const scenes: Scene[] = [
  { id: 'twin-cities', label: 'Minneapolis–St. Paul', note: 'Cedar-Riverside to the suburbs.', country: 'us' },
  { id: 'toronto', label: 'Toronto', note: 'Etobicoke, Rexdale, and beyond.', country: 'ca' },
  { id: 'london', label: 'London', note: 'From Woolwich to Wembley.', country: 'uk' },
  { id: 'columbus', label: 'Columbus', note: 'The heart of Ohio’s community.', country: 'us' },
  { id: 'stockholm', label: 'Stockholm', note: 'Rinkeby, Tensta, and the city.', country: 'se' },
  // Named before the first post, so nobody is counted as `other` in a city
  // that gets a door of its own a month later — a cohort key is written once,
  // and a member counted as `other` stays `other` (docs/BOARD.md, decision 7).
  { id: 'seattle', label: 'Seattle', note: 'Rainier Valley, Tukwila, SeaTac.', country: 'us' },
  { id: 'san-diego', label: 'San Diego', note: 'City Heights and beyond.', country: 'us' },
  { id: 'birmingham', label: 'Birmingham', note: 'Small Heath to Sparkhill.', country: 'uk' },
  { id: 'bristol', label: 'Bristol', note: 'Easton, Barton Hill, and the city.', country: 'uk' },
  { id: 'leicester', label: 'Leicester', note: 'St Matthews and the whole city.', country: 'uk' },
  { id: 'gothenburg', label: 'Gothenburg', note: 'Angered, Bergsjön, and the city.', country: 'se' },
  { id: 'oslo', label: 'Oslo', note: 'Grønland to Groruddalen.', country: 'no' },
  { id: 'copenhagen', label: 'Copenhagen', note: 'Nørrebro and the whole city.', country: 'dk' },
  { id: 'helsinki', label: 'Helsinki', note: 'The capital region.', country: 'fi' },
  { id: 'amsterdam', label: 'Amsterdam', note: 'And the Randstad around it.', country: 'nl' },
  { id: 'nairobi', label: 'Nairobi', note: 'Eastleigh and the city.', country: 'ke' },
  { id: 'melbourne', label: 'Melbourne', note: 'The west and the north.', country: 'au' },
  { id: 'other', label: 'Somewhere else', note: 'Wherever the diaspora took you.' },
]

export function getScene(id?: string): Scene | undefined {
  return scenes.find((s) => s.id === id)
}

/**
 * The country a person is counted in: her city's, when she named one; the one
 * she picked, when she is somewhere else. Undefined until she has said.
 */
export function countryFor(identity: { scene?: string; country?: string }): string | undefined {
  return getScene(identity.scene)?.country ?? (identity.scene === 'other' ? identity.country : undefined)
}
