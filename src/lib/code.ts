/**
 * What a code is, on this side of the wire.
 *
 * The server mints them (netlify/shared/code.ts) from an alphabet chosen so
 * that nothing in it can be misread off a screen or misheard down a phone: no
 * B against 8, no O or 0, no I or 1, no S against 5. That is a good decision
 * and it was invisible to the one person who has to type a code — the field
 * accepted every letter and digit, so `BOO12` was enterable, cost a network
 * round trip, and came back "No map found for that code", which blamed her
 * code for characters no code can contain (docs/DESIGN.md).
 *
 * So the rule lives here too, and the field enforces it as she types. The
 * alphabet is asserted equal to the server's by tests/vocab-sync.test.ts, the
 * same way every other closed set in this product is held in step — there used
 * to be a second private copy of it in src/lib/progress.ts, which is now this
 * one.
 */

/** Unambiguous by design: no B, I, L, O, S, U, V, Z, and no 0, 1, 2, 5, 6. */
export const ALPHABET = 'ACDEFGHJKMNPQRTWXY34789'

/**
 * A map code, a couple code, an install id — eight characters since
 * 2026-09-23, six before (netlify/shared/code.ts says why: six let one patient
 * script find about 14% of kept maps a year; docs/SECURITY.md, O8). A code
 * kept at six still works everywhere.
 */
export const CODE_LENGTH = 8
export const LEGACY_CODE_LENGTH = 6

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
  const n = cleanCode(raw).length
  return n === CODE_LENGTH || n === LEGACY_CODE_LENGTH
}

/**
 * A code as a person reads it: eight characters as two groups of four, which
 * is what makes eight no harder to say down a phone than six. A six stays as
 * it always was. Display only — `cleanCode` drops the space on the way back.
 */
export function formatCode(code: string): string {
  return code.length === CODE_LENGTH ? `${code.slice(0, 4)} ${code.slice(4)}` : code
}

/**
 * An example for a placeholder. Drawn from the real alphabet, so the shape a
 * person is shown is a shape a code can have. It used to read `ABC123`, three
 * characters of which are impossible.
 */
export const EXAMPLE_CODE = 'HJKM47QR'

/**
 * A fresh code of `length`, drawn on this phone: the install id (a map code's
 * length, a different code) and a first keep's once key (ten).
 *
 * Rejection-sampled, like the server's generator (netlify/shared/code.ts).
 * `ALPHABET[b % 23]` is biased: 256 is not a multiple of 23, so A, C and D
 * came up 12 times in 256 and every other symbol 11 (docs/SECURITY.md, O11).
 * The once key still drew that way until 2026-09-24; there is one generator
 * on each side now.
 */
const LIMIT = 256 - (256 % ALPHABET.length)
export function newCode(length: number = CODE_LENGTH): string {
  const out: string[] = []
  while (out.length < length) {
    for (const b of crypto.getRandomValues(new Uint8Array(length))) {
      if (b >= LIMIT) continue
      out.push(ALPHABET[b % ALPHABET.length])
      if (out.length === length) break
    }
  }
  return out.join('')
}
