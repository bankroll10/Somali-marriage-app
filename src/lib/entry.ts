/**
 * Links into Niyyah, read before anything renders.
 *
 * Three kinds of link carry a code: `?map=` brings a kept map back, `?couple=`
 * is him opening the eleven she sent, `?vouch=` is a family member arriving to
 * vouch. Three more carry none and simply open an instrument: `?read`,
 * `?eleven`, `?families`. They exist because the thing that travels between
 * people here is the words — a friend sends a friend the exact question that
 * worked — and the person who receives them should land on the instrument,
 * not on a front door. None of them needs an account.
 *
 * Any link may also carry `?via=`: what kind of thing carried it — words, the
 * eleven, a couple's link, the door, a family link. Never who sent it. It is
 * the only attribution this product records, and it is validated here so that
 * nothing else can ride along under that name.
 *
 * This is the one place links are recognised, so main.tsx can dispatch without
 * a router and the query string can be cleaned before React reads storage.
 */
export type CodedKind = 'map' | 'couple' | 'vouch'
export type InstrumentKind = 'read' | 'eleven' | 'families'
export type EntryKind = CodedKind | InstrumentKind

export type Via = 'words' | 'eleven' | 'couple' | 'door' | 'family'
/** Must match netlify/functions/progress.ts. */
export const VIAS: Via[] = ['words', 'eleven', 'couple', 'door', 'family']

export interface Entry {
  kind: EntryKind
  /** Present for map, couple and vouch; the instruments carry none. */
  code?: string
  /** What kind of link this was — never who sent it. */
  via?: Via
}

/** Coded kinds first, so a link mangled into two still restores the map. */
const CODED: CodedKind[] = ['map', 'couple', 'vouch']
const INSTRUMENTS: InstrumentKind[] = ['read', 'eleven', 'families']

/** Normalise what a human or a messaging app did to a code. */
export function normaliseCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function viaOf(params: URLSearchParams): Via | undefined {
  const raw = params.get('via')
  return raw && (VIAS as string[]).includes(raw) ? (raw as Via) : undefined
}

export function entryFromUrl(search: string): Entry | null {
  let params: URLSearchParams
  try {
    params = new URLSearchParams(search)
  } catch {
    return null
  }
  const via = viaOf(params)
  for (const kind of CODED) {
    const raw = params.get(kind)
    if (raw === null) continue
    const code = normaliseCode(raw)
    if (code) return { kind, code, ...(via ? { via } : {}) }
  }
  // `?read` and `?read=1` both open the read; the value is ignored.
  for (const kind of INSTRUMENTS) {
    if (params.has(kind)) return { kind, ...(via ? { via } : {}) }
  }
  // A bare `?via=` with no kind is not a link we ever mint.
  return null
}
