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
  { id: 'toronto', label: 'Toronto', note: 'Dixon Road and Rexdale.', country: 'ca' },
  { id: 'london', label: 'London', note: 'From Woolwich to Wembley.', country: 'uk' },
  { id: 'columbus', label: 'Columbus', note: 'Northland to Morse Road.', country: 'us' },
  { id: 'stockholm', label: 'Stockholm', note: 'Rinkeby to Tensta.', country: 'se' },
  // Named before the first post, so nobody is counted as `other` in a city
  // that gets a door of its own a month later — a cohort key is written once,
  // and a member counted as `other` stays `other` (docs/BOARD.md, decision 7).
  { id: 'seattle', label: 'Seattle', note: 'Rainier Valley, Tukwila, SeaTac.', country: 'us' },
  { id: 'san-diego', label: 'San Diego', note: 'City Heights.', country: 'us' },
  { id: 'birmingham', label: 'Birmingham', note: 'Small Heath to Sparkhill.', country: 'uk' },
  { id: 'bristol', label: 'Bristol', note: 'Easton to Barton Hill.', country: 'uk' },
  { id: 'leicester', label: 'Leicester', note: 'St Matthews to Highfields.', country: 'uk' },
  { id: 'gothenburg', label: 'Gothenburg', note: 'Angered to Bergsjön.', country: 'se' },
  { id: 'oslo', label: 'Oslo', note: 'Grønland to Groruddalen.', country: 'no' },
  { id: 'copenhagen', label: 'Copenhagen', note: 'Nørrebro to Tingbjerg.', country: 'dk' },
  { id: 'helsinki', label: 'Helsinki', note: 'Itäkeskus to Vuosaari.', country: 'fi' },
  { id: 'amsterdam', label: 'Amsterdam', note: 'Nieuw-West to Zuidoost.', country: 'nl' },
  { id: 'nairobi', label: 'Nairobi', note: 'Eastleigh to South C.', country: 'ke' },
  { id: 'melbourne', label: 'Melbourne', note: 'Flemington to Heidelberg West.', country: 'au' },
  { id: 'other', label: 'Somewhere else', note: 'Name it, and it is counted.' },
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
