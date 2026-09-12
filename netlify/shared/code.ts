/**
 * Every code this product mints, from one place.
 *
 * There used to be four copies of the same twelve lines — `keep.ts`,
 * `couple.ts`, `vouch.ts` and the client's install id — each with its own
 * spelling of the alphabet and its own regex. Four copies of a security
 * primitive is three chances to fix a bug in only some of them, so this is the
 * one that stays. (Two more regex copies survived that consolidation, in
 * `cohort.ts` and `progress.ts`; docs/BOARD.md found them and they now import
 * `CODE` from here. The client keeps its own twin in `src/lib/progress.ts`,
 * because the browser bundle does not reach into `netlify/`; the length lives
 * in one place on each side.)
 *
 * **The alphabet.** Twenty-three symbols, unambiguous over the phone and in a
 * text message: no O/0, no I/1/l, no U/V. She may well be reading this to a
 * friend or typing it on a cracked screen.
 *
 * **Why rejection sampling.** The old generator did `ALPHABET[b % 23]` over a
 * random byte. 256 = 11×23 + 3, so the first three symbols — A, C and D — came
 * up 12 times in 256 while the other twenty came up 11: a 9% bias, in four
 * places, in the only secret this product has. The entropy cost was negligible;
 * the point is that a biased generator is a thing you fix while it is eight
 * lines rather than after it is load-bearing. Bytes at or above 253 are thrown
 * away and drawn again, so every symbol is exactly as likely as every other.
 *
 * **What a code is worth.** Six symbols is 23⁶ ≈ 148 million, about 27 bits —
 * roughly an eight-digit PIN, and the *sole* authenticator for a kept map. That
 * is a deliberate trade for having no accounts (`docs/CONTROL.md`), and it is
 * why minting must never overwrite (see `mint` below) and why the routes that
 * redeem a code are rate limited (`netlify/shared/limit.ts`).
 */

export const ALPHABET = 'ACDEFGHJKMNPQRTWXY34789'

/** A map code, a couple code, an install id. */
export const CODE_LENGTH = 6
/** A vouch token. Eight, never six: a token is not a code and cannot be mistaken for one. */
export const TOKEN_LENGTH = 8

export const CODE = /^[ACDEFGHJKMNPQRTWXY34789]{6}$/
export const TOKEN = /^[ACDEFGHJKMNPQRTWXY34789]{8}$/

/** The largest multiple of the alphabet that fits in a byte. Above it, draw again. */
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

/** What a human or a messaging app did to a code, undone. */
export function normalise(raw: unknown): string {
  return typeof raw === 'string' ? raw.toUpperCase().replace(/[^A-Z0-9]/g, '') : ''
}

/**
 * How many codes to try before giving up. A collision is a coin-flip at ~14,300
 * kept maps and a certainty well before a hundred thousand, so this is not a
 * theoretical guard — but two collisions in a row is not a scale this product
 * will ever see, and if it does, a 503 is the right answer rather than a write.
 */
export const MINT_ATTEMPTS = 5

/**
 * Mint a code nobody else holds, and write under it.
 *
 * **This is the whole reason this file exists.** `keep.ts` used to mint a code
 * and write the member's entire map with a bare `setJSON(code, kept)` — no
 * uniqueness check, no conditional write, no retry. Two members drawing the
 * same six characters is a birthday problem over 148 million: about 0.3% at a
 * thousand kept maps, 29% at ten thousand, and an even chance by 14,300. The
 * loser's map — thirteen honest answers and every reading she has ever had,
 * with no other server copy — is silently replaced by a stranger's, and both
 * of them restore the same data afterwards with nothing anywhere recording
 * that it happened.
 *
 * `onlyIfNew` was already in this codebase twice (`netlify/shared/limit.ts`,
 * `netlify/functions/couple.ts`) before anyone reached for it here.
 *
 * Returns the code, or null when every attempt collided — which the caller
 * turns into a 503, because failing to save is recoverable and overwriting
 * somebody is not.
 */
export async function mint<T>(
  write: (code: string, value: T) => Promise<{ modified: boolean }>,
  value: T,
  length: number = CODE_LENGTH,
): Promise<string | null> {
  for (let i = 0; i < MINT_ATTEMPTS; i++) {
    const code = newCode(length)
    const { modified } = await write(code, value)
    if (modified) return code
  }
  return null
}
