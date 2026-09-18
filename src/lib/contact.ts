/**
 * Does this look like something we could actually reach?
 *
 * The door collects exactly one piece of personal information — an email or a
 * phone number — and it is the only reason joining the door means anything.
 * The form used to accept anything non-empty, so `sagal@gmial`, `sagal`, or a
 * number three digits short all passed, and the confirmation panel then echoed
 * the typo back as proof she was on the list. A failure nobody can see: she
 * believes she is reachable, and the one route to her is dead
 * (docs/NIELSEN.md, N3).
 *
 * Deliberately loose. This is not a validator that decides whether an address
 * exists — no regex does that, and a rule that rejects a real address is worse
 * than one that accepts a typo. It catches the shapes that cannot possibly
 * work: an email with no `@`, no domain or no dot after it, and a number too
 * short to be a phone number anywhere.
 *
 * The same shape as src/lib/age.ts: one rule, one file, used by the screens
 * that ask, so two screens cannot disagree about what counts.
 */

export type ContactKind = 'email' | 'phone' | 'neither'

/** The fewest digits any national number has, dialled locally. */
const MIN_DIGITS = 7

/** What she appears to have typed — an email, a phone number, or neither yet. */
export function contactKind(raw: string): ContactKind {
  const value = raw.trim()
  if (!value) return 'neither'
  if (value.includes('@')) return 'email'
  // A phone number is digits, and the punctuation people put between them.
  if (/^[+()\-.\s\d]+$/.test(value)) return 'phone'
  return 'neither'
}

export function looksReachable(raw: string): boolean {
  const value = raw.trim()
  switch (contactKind(value)) {
    case 'email': {
      // one @, something before it, and a dotted domain after it
      const parts = value.split('@')
      if (parts.length !== 2) return false
      const [name, domain] = parts
      if (!name || /\s/.test(value)) return false
      const dot = domain.lastIndexOf('.')
      return dot > 0 && domain.length - dot > 2
    }
    case 'phone':
      return (value.match(/\d/g) ?? []).length >= MIN_DIGITS
    default:
      return false
  }
}

/** What to say when it cannot be reached, in the terms she was typing in. */
export function contactProblem(raw: string): string | null {
  if (looksReachable(raw)) return null
  switch (contactKind(raw)) {
    case 'email':
      return 'That email looks unfinished — check the part after the @.'
    case 'phone':
      return 'That number looks short. The whole thing, with the area code.'
    default:
      return 'An email or a phone number, whichever you would rather we used.'
  }
}
