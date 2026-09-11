import { MAX_AGE, MIN_AGE } from '../types'

/**
 * An age, as a person typed it — or nothing.
 *
 * Below the gate is not a valid age here: someone who confirmed 18 or older
 * at the door cannot type her way under it. Above ninety-nine is a slip, not a
 * person. One rule, shared by Profile and the door, so the two screens that
 * ask cannot disagree about what counts.
 */
export function parseAge(raw: string | number | undefined): number | undefined {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10)
  return Number.isFinite(n) && n >= MIN_AGE && n <= MAX_AGE ? n : undefined
}
