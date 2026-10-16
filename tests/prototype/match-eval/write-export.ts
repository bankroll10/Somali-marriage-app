import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CASES } from './cases'
import { buildReviewExport } from './export'
import { scoreSheet } from './scoring'

/**
 * Writes the review export, its key and the score sheet into a folder (docs/MATCH-EVAL.md). Offline. The review export
 * goes to the reviewer; the key and the score sheet do not.
 */
export function writeExport(dir: string, seed = 'stage-0'): void {
  const { text, key } = buildReviewExport(CASES, { seed })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'review-export.md'), text)
  writeFileSync(join(dir, 'review-key.json'), JSON.stringify({ seed, key }, null, 2) + '\n')
  writeFileSync(join(dir, 'score-sheet.md'), scoreSheet(CASES, key))
}
