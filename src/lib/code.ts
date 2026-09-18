/**
 * What a code is, on this side of the wire.
 *
 * The server mints them (netlify/shared/code.ts) from an alphabet chosen so
 * that nothing in it can be misread off a screen or misheard down a phone: no
 * B against 8, no O or 0, no I or 1, no S against 5. That is a good decision
 * and it was invisible to the one person who has to type a code — the field
 * accepted every letter and digit, so `BOO12` was enterable, cost a network
 * round trip, and came back "No map found for that code", which blamed her
 * code for characters no code can contain (docs/NORMAN.md).
 *
 * So the rule lives here too, and the field enforces it as she types. The
 * alphabet is asserted equal to the server's by tests/vocab-sync.test.ts, the
 * same way every other closed set in this product is held in step — there used
 * to be a second private copy of it in src/lib/progress.ts, which is now this
 * one.
 */

/** Unambiguous by design: no B, I, L, O, S, U, V, Z, and no 0, 1, 2, 5, 6. */
export const ALPHABET = 'ACDEFGHJKMNPQRTWXY34789'

/** A map code, a couple code, an install id. */
export const CODE_LENGTH = 6

const NOT_IN_ALPHABET = new RegExp(`[^${ALPHABET}]`, 'g')

/**
 * Everything a code cannot contain, removed. Upper-cases first, so typing in
 * lower case works, and drops spaces, dashes and the characters the alphabet
 * leaves out — which is what makes this a forcing function rather than a
 * validation message: the impossible input cannot be entered.
 */
export function cleanCode(raw: string): string {
  return raw.toUpperCase().replace(NOT_IN_ALPHABET, '')
}

/** Could this be a code at all? Not whether a map exists under it. */
export function isCode(raw: string): boolean {
  return cleanCode(raw).length === CODE_LENGTH
}

/**
 * An example for a placeholder. Drawn from the real alphabet, so the shape a
 * person is shown is a shape a code can have. It used to read `ABC123`, three
 * characters of which are impossible.
 */
export const EXAMPLE_CODE = 'HJKM47'
