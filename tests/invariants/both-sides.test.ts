import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Gender } from '../../src/types'
import { SCRIPTS, scriptFor, type ReadDimension, type Script } from '../../src/data/read'
import { beforeYesTopics } from '../../src/data/beforeYes'
import { candidatesFor } from '../../src/data/candidates'
import { buildRead, readSummary, type ReadResult } from '../../src/lib/read'
import { buildBeforeYes, beforeYesSummary } from '../../src/lib/beforeYes'
import { coupleReading, type Joint } from '../../src/lib/couple'
import { alignment } from '../../src/lib/matching'
import { beforeYesAnswers, intake, readAnswers } from '../support/arbitrary'

/**
 * INVARIANT — the man's path and the woman's path stay semantically correct.
 *
 * Every instrument is read by one side about the other. A man reading a woman
 * must never be told what "he" intends; a woman must never be handed a script
 * about "her". It happened on the live site on 2026-09-12 (docs/BOARD.md), and
 * tests/mens-read.test.ts caught that one by sweeping fixed answers through the
 * read and the eleven. This generalises it: *generated* answers, on both
 * sides, through every engine that writes prose about the other person — the
 * read, Before you say yes, the couple reading, the sample introduction's
 * alignment and every script — so a new band, topic, gate or template that
 * speaks from the wrong side fails here the day it is written.
 *
 * The rules are mens-read's, and so is the allowlist: the confidante is a
 * brother for him and a sister for her, on purpose, and "near her" in the
 * eleven is his mother, on both sides.
 */

/** Words about the other person that belong to the reader's own side. */
const WRONG: Record<Gender, RegExp> = {
  man: /\b(he|him|his|himself|women|sister)\b/i,
  woman: /\b(she|her|hers|herself)\b/i,
}
/** The eleven's looser rule: "her mother", "her side" are his family on both sides. */
const WRONG_SIDE: Record<Gender, RegExp> = {
  man: /\b(he|him|his|himself)\b/i,
  woman: /\b(she|hers|herself)\b|\bher\b(?! mother| side)/i,
}

const scriptText = (s: Script) => [s.why, s.words, s.tells].join('\n')

function readText(r: ReadResult): string {
  return [
    r.headline,
    r.summary,
    r.caution ?? '',
    ...(r.watch ?? []),
    ...r.shown,
    ...r.missing,
    ...r.dimensions.map((d) => d.label),
    scriptText(r.script),
  ].join('\n')
}

/** Fails with the offending word and the sentence around it, not a wall of text. */
function clean(text: string, rule: RegExp, what: string) {
  const hit = rule.exec(text)
  const around = hit ? text.slice(Math.max(0, hit.index - 60), hit.index + 60) : null
  expect(around, `${what}: "${hit?.[0]}"`).toBeNull()
  expect(text, `${what} leaves a {token}`).not.toMatch(/\{[a-z]+\}/)
}

const GENDERS: Gender[] = ['woman', 'man']
const RUNS = { numRuns: 300 }

describe('the read, on generated answers', () => {
  for (const g of GENDERS) {
    it(`never names the other person from the ${g}’s own side`, () => {
      fc.assert(
        fc.property(readAnswers(g), (answers) => {
          const r = buildRead(answers, g)
          expect(r, 'every question answered').not.toBeNull()
          clean(readText(r!), WRONG[g], `read by a ${g}`)
          clean(readSummary(r!, g), WRONG[g], `the guide’s line, read by a ${g}`)
        }),
        RUNS,
      )
    })
  }
})

describe('Before you say yes, on generated answers', () => {
  for (const g of GENDERS) {
    it(`never names the other person from the ${g}’s own side`, () => {
      fc.assert(
        fc.property(beforeYesAnswers(g), (answers) => {
          const r = buildBeforeYes(answers, g)
          expect(r, 'every topic answered').not.toBeNull()
          const notes = Object.values(r!.byState).flatMap((list) => list.map((t) => `${t.label}\n${t.note}`))
          const text = [r!.headline, r!.summary, r!.open.label, r!.open.why, scriptText(r!.open.script), ...notes, beforeYesSummary(r!)]
            .join('\n')
            .replace(/near her/g, '')
          clean(text, WRONG_SIDE[g], `Before you say yes, read by a ${g}`)
        }),
        RUNS,
      )
    })
  }

  it('has the same topics, in the same order, on both sides', () => {
    expect(beforeYesTopics('man').map((t) => t.id)).toEqual(beforeYesTopics('woman').map((t) => t.id))
  })
})

describe('the couple reading, on generated joints', () => {
  const JOINTS: Joint[] = ['both-agree', 'both-not-talked', 'one-thinks-talked', 'differ-somewhere', 'unknown-somewhere']
  const joint = fc.record(Object.fromEntries(beforeYesTopics('woman').map((t) => [t.id, fc.constantFrom(...JOINTS)]))) as fc.Arbitrary<
    Record<string, Joint>
  >
  for (const g of GENDERS) {
    it(`never names the other person from the ${g}’s own side`, () => {
      fc.assert(
        fc.property(joint, (j) => {
          const r = coupleReading(j, g)
          const text = [r.headline, ...r.lines.flatMap((l) => [l.label, l.line]), r.open?.label ?? '', r.open ? scriptText(r.open.script) : '']
            .join('\n')
            .replace(/near her/g, '')
          clean(text, WRONG_SIDE[g], `the couple reading, read by a ${g}`)
        }),
        RUNS,
      )
    })
  }
})

describe('the sample introduction’s alignment, on generated intakes', () => {
  for (const g of GENDERS) {
    const sample = candidatesFor(g)
    it(`reads a ${g} the other side, and never names them from the ${g}’s own`, () => {
      // Which side is shown is itself the first half of the invariant.
      expect(sample.length).toBeGreaterThan(0)
      for (const c of sample) expect(c.gender, c.id).not.toBe(g)
      // Alignment writes only pronouns, not "women" or "sister", so the plain
      // pronoun rule is the honest one here.
      const rule = g === 'man' ? /\b(he|him|his|himself)\b/i : /\b(she|her|hers|herself)\b/i
      // And it does name them — so the rule is tested against real pronouns.
      expect(alignment({}, sample[0]).ask).toMatch(g === 'man' ? /\bher\b/ : /\bhim\b/)
      fc.assert(
        fc.property(intake, fc.constantFrom(...sample), (answers, c) => {
          const a = alignment(answers as never, c)
          const text = [a.ask, a.blocked ?? '', ...a.same, ...a.differ, ...a.unknown].join('\n')
          clean(text, rule, `alignment with ${c.id}, read by a ${g}`)
        }),
        { numRuns: 500 },
      )
    })
  }
})

describe('every script, both sides', () => {
  for (const g of GENDERS) {
    it(`speaks to a ${g} about the other side`, () => {
      for (const key of Object.keys(SCRIPTS) as (ReadDimension | 'early')[]) {
        clean(scriptText(scriptFor(key, g)), WRONG[g], `the ${key} script, for a ${g}`)
      }
      for (const t of beforeYesTopics(g)) {
        const text = [t.label, t.prompt, t.why, scriptText(t.script)].join('\n').replace(/near her/g, '')
        clean(text, WRONG_SIDE[g], `the eleven’s ${t.id}, for a ${g}`)
      }
    })
  }
})
