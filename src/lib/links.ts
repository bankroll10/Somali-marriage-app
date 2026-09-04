import type { InstrumentKind, Via } from './entry'
import { SITE_URL } from './site'

/**
 * The links this product hands out.
 *
 * A link to an instrument lands the person who opens it on that instrument —
 * the read, the eleven, the family words — with no front door and no account,
 * because the person sending it has just told them what it is. `via` says
 * what kind of thing carried the link, and nothing else; see src/lib/entry.ts.
 */
export function instrumentLink(kind: InstrumentKind, via: Via, origin = SITE_URL): string {
  return `${origin}/?${kind}&via=${via}`
}

/** Attach a via to a link that already carries a code — the couple's and the family's. */
export function withVia(url: string, via: Via): string {
  return `${url}${url.includes('?') ? '&' : '?'}via=${via}`
}
