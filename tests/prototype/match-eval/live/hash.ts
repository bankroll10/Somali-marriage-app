import { createHash } from 'node:crypto'

/** Hashing for the approval records, the count report and the saved files (docs/MATCH-EVAL.md, "Stage 1a"). */

export const sha256 = (data: string): string => createHash('sha256').update(data, 'utf8').digest('hex')

/** JSON with sorted keys and no spaces: the same value always gives the same text, so the same hash. */
export function canonical(value: unknown): string {
  if (value === undefined) return 'null'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const o = value as Record<string, unknown>
  const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort()
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`
}

export const hashOf = (value: unknown): string => sha256(canonical(value))
