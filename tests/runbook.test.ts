import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The introduction pilot runs by hand, so its safety is a written process,
 * not a screen (docs/DECISIONS.md decision 33). Before the first identifying
 * introduction the runbook in docs/OPS.md must say each of these; a runbook
 * that loses one is caught here, not on the day it was needed. The founder's
 * tabletop drill tests the process itself.
 */

const ops = readFileSync('docs/OPS.md', 'utf8')
const start = ops.indexOf('## The introduction pilot runbook')
const runbook = start < 0 ? '' : ops.slice(start, ops.indexOf('\n## ', start + 5) < 0 ? undefined : ops.indexOf('\n## ', start + 5))

const MUST: [string, RegExp][] = [
  // Decision 33: the eight things safety needs before introduction 1.
  ['the monitored report channel', /report channel/i],
  ['the do-not-pair record', /do-not-pair/i],
  ['incident recording', /incident record/i],
  ['what pauses introductions', /pauses? (all |new )?introductions/i],
  ['harassment', /harassment/i],
  ['coercion', /coercion/i],
  ['first-meeting safety language', /first meeting/i],
  ['how withdrawal works', /withdraw/i],
  ['telling a person what was done', /told what (was done|action was taken)/i],
  // Decision 30: who the first twenty are for, and the reference.
  ['eligibility: 18 or older', /18 or older/i],
  ['engaged people are outside the pilot', /engaged/i],
  ['the married rule is a pilot constraint, not doctrine', /pilot constraint/i],
  ['one reference, discarded after the check', /reference[^.]*discarded|discarded[^.]*reference/i],
  // Decision 31: what the operator log keeps.
  ['identity_checked', /identity_checked/],
  ['reference_checked', /reference_checked/],
  ['the one approved summary', /approved[^.]*summary|summary[^.]*approved/i],
  // Decision 29: the consent invariant.
  ['non-identifying before, identifying only after two yeses', /non-identifying[\s\S]*two yeses/i],
  // Decision 32, 34, 27.
  ['180 days', /180 days/],
  ['legal review required before', /legal review required before/i],
  ['M0, M1 and M2', /M0[\s\S]*M1[\s\S]*M2/],
  ['the tabletop drill before introduction 1', /tabletop drill/i],
]

describe('the introduction pilot runbook', () => {
  it('exists in docs/OPS.md', () => {
    expect(runbook.length).toBeGreaterThan(500)
  })

  it.each(MUST)('says %s', (_what, pattern) => {
    expect(runbook).toMatch(pattern)
  })

  it('never restores forty and forty as a gate, a milestone or a target', () => {
    expect(runbook).not.toMatch(/\b(forty|40) (women|men|each|a side)\b/i)
  })
})
