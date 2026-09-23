/**
 * Ages as ranges — the grain every reader here actually needs.
 *
 * The founder's pool readout (netlify/functions/pool.ts) counts a pool's shape
 * by these five bands, and since 2026-09-23 the guide is told a band rather
 * than an age (netlify/shared/prompt.ts, docs/PRIVACY.md C5): "25-29" carries
 * everything the advice needs, and an exact age beside a city and a practice
 * is most of the way to a person. One definition, so the two can never drift.
 */
export const AGE_BANDS = ['18-24', '25-29', '30-34', '35-39', '40+'] as const
export type AgeBand = (typeof AGE_BANDS)[number]

export function bandOf(age: number): AgeBand {
  return age < 25 ? '18-24' : age < 30 ? '25-29' : age < 35 ? '30-34' : age < 40 ? '35-39' : '40+'
}
