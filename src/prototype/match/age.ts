import type { AgeAsk } from './types'

/**
 * The ages the demo supports. These are demo constraints, not launch policy: they keep every made-up
 * age an adult age and every range a small, checkable thing. The real service's rules (identity,
 * age verification, who may be introduced to whom) are not decided here (docs/MATCH-PROTOTYPE.md).
 */
export const AGE_MIN = 18
export const AGE_MAX = 99

/**
 * A whole number of years from AGE_MIN to AGE_MAX, written plainly, or null. Surrounding spaces are
 * ignored; a sign, a decimal point, an exponent, a leading zero, another script's digits and anything
 * else are not. A fractional or out-of-range age is refused, never rounded or clipped into range.
 */
export function parseAge(text: string): number | null {
  const t = text.trim()
  if (!/^[1-9][0-9]{1,2}$/.test(t)) return null
  const n = Number(t)
  return n >= AGE_MIN && n <= AGE_MAX ? n : null
}

/** Whether `age` is outside what the ask allows. An ask that does not matter allows every age. */
export const outsideAges = (ask: AgeAsk, age: number): boolean => ask.firm !== 'any' && (age < ask.min || age > ask.max)
