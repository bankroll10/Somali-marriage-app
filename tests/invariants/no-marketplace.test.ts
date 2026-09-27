import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * INVARIANT — the old marketplace stays evidence, not code (docs/DECISIONS.md
 * decision 35, Part 23).
 *
 * Introductions came back on 2026-09-27 as a name put down and a founder who
 * makes each introduction by hand. The machinery deleted on 2026-09-24 — the
 * invented candidates, the sample introduction, the public count, the pool
 * readout and its gate, weighted fit, profiles, Plus, the token vouch — is
 * kept in git at 43295a4 as a record of what was tried, and restored from
 * there by nobody. A later step that needs one of these ideas meets this test
 * and the decision it names first.
 */

const RETIRED = [
  'src/data/candidates.ts',
  'src/components/SampleIntroduction.tsx',
  'src/components/Profile.tsx',
  'src/components/Plus.tsx',
  'src/components/Cohort.tsx',
  'src/components/Door.tsx',
  'src/components/Vouch.tsx',
  'src/components/VouchRow.tsx',
  'src/components/ShortMap.tsx',
  'src/data/plus.ts',
  'src/data/vouch.ts',
  'src/data/shortMap.ts',
  'src/lib/matching.ts',
  'src/lib/cohort.ts',
  'src/lib/vouch.ts',
  'src/lib/ledger.ts',
  'src/lib/waitlist.ts',
  'netlify/functions/pool.ts',
  'netlify/functions/cohort.ts',
  'netlify/functions/vouch.ts',
  'netlify/shared/gate.ts',
  'docs/atomic-sim.mjs',
]

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

describe('the old marketplace stays in git', () => {
  it.each(RETIRED)('%s is not back', (path) => {
    expect(existsSync(path)).toBe(false)
  })

  it('no source defines a door target, a candidate list or a fit score', () => {
    const found: string[] = []
    for (const file of [...sources('src'), ...sources('netlify')]) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/^\s*(\/\/|\*|\/\*)/.test(line)) return
          if (/\b(COHORT_TARGET|candidates\s*[:=]|fitScore|compatibilityScore|matchScore)\b/.test(line)) found.push(`${file}:${i + 1}`)
        })
    }
    expect(found).toEqual([])
  })
})
