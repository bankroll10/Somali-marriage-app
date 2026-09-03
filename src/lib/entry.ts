/**
 * Links into Niyyah, read before anything renders.
 *
 * Three kinds of link carry a code: `?map=` brings a kept map back, `?couple=`
 * is him opening the eleven she sent, `?vouch=` is a family member arriving to
 * vouch. None of them needs an account; the code is the whole handshake. This
 * is the one place they are recognised, so main.tsx can dispatch without a
 * router and the query string can be cleaned before React reads storage.
 */
export type EntryKind = 'map' | 'couple' | 'vouch'

export interface Entry {
  kind: EntryKind
  code: string
}

const KINDS: EntryKind[] = ['map', 'couple', 'vouch']

/** Normalise what a human or a messaging app did to a code. */
export function normaliseCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function entryFromUrl(search: string): Entry | null {
  let params: URLSearchParams
  try {
    params = new URLSearchParams(search)
  } catch {
    return null
  }
  for (const kind of KINDS) {
    const raw = params.get(kind)
    if (raw === null) continue
    const code = normaliseCode(raw)
    if (code) return { kind, code }
  }
  return null
}
