/**
 * The diaspora "scenes" — the local Somali communities the app speaks to. This
 * is a belonging signal, not just a location field: it lets Home and (later)
 * discovery feel like *your* world, not a generic marketplace.
 */
export interface Scene {
  id: string
  label: string
  /** A short, warm line that makes the place feel seen. */
  note: string
}

export const scenes: Scene[] = [
  { id: 'twin-cities', label: 'Minneapolis–St. Paul', note: 'Cedar-Riverside to the suburbs.' },
  { id: 'toronto', label: 'Toronto', note: 'Etobicoke, Rexdale, and beyond.' },
  { id: 'london', label: 'London', note: 'From Woolwich to Wembley.' },
  { id: 'columbus', label: 'Columbus', note: 'The heart of Ohio’s community.' },
  { id: 'stockholm', label: 'Stockholm', note: 'Rinkeby, Tensta, and the city.' },
  { id: 'other', label: 'Somewhere else', note: 'Wherever the diaspora took you.' },
]

export function getScene(id?: string): Scene | undefined {
  return scenes.find((s) => s.id === id)
}
