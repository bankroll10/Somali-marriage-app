import { describe, expect, it } from 'vitest'
import type { Gender } from '../src/types'
import { readQuestions } from '../src/data/read'
import { buildRead, readSummary, type ReadResult } from '../src/lib/read'

/**
 * The read speaks to whoever is reading it.
 *
 * `buildRead` has always taken a gender and resolved the *questions* through
 * `speak()`. Its own result copy did not: on 2026-09-12 a man who finished the
 * read on the live site was told "we cannot tell you what he intends", that
 * this was "the shape that leaves women without anyone to compare notes with",
 * and to go and tell "an older woman you trust" — about the woman he is
 * deciding on. Nine strings and two dimension labels were hardcoded from her
 * side (docs/BOARD.md, "What the founder's own walk found").
 *
 * This test reads every band, on both sides, and fails if a result names the
 * wrong one. It is the test that would have caught it.
 */

/** Every word a result can put on the screen, in one string. */
function everything(r: ReadResult): string {
  return [
    r.headline,
    r.summary,
    r.caution ?? '',
    ...(r.watch ?? []),
    ...r.shown,
    ...r.missing,
    ...r.dimensions.map((d) => d.label),
    r.script.why,
    r.script.words,
    r.script.tells,
  ].join('\n')
}

/** `pick(i)` chooses an option index per question; `over` pins ids by hand. */
function answers(gender: Gender, pick: number, over: Record<string, string> = {}): Record<string, string> {
  const out: Record<string, string> = {}
  for (const q of readQuestions(gender)) {
    out[q.id] = over[q.id] ?? (q.options[pick] ?? q.options[q.options.length - 1]).id
  }
  return out
}

/** One answer set per band the engine can return. */
const BANDS: Record<string, Record<string, string>> = {
  early: answers('woman', 0, { duration: 'weeks-0' }),
  caution: answers('woman', 3, { duration: 'months-plus', secret: 'explicit', hard: 'blames' }),
  strong: answers('woman', 0, { duration: 'months-plus' }),
  thin: answers('woman', 3, { duration: 'months-plus', secret: 'no', hard: 'quiet' }),
  mixed: answers('woman', 1, { duration: 'months-3', secret: 'no' }),
}

/** Words that belong to the other side. Not "man"/"woman" alone — the
 *  confidante is a brother for him and a sister for her, on purpose. */
const WRONG: Record<Gender, RegExp> = {
  man: /\b(he|him|his|women|sister)\b/i,
  woman: /\b(she|her|hers)\b/i,
}

describe('the read speaks to whoever is reading', () => {
  for (const [name, set] of Object.entries(BANDS)) {
    for (const gender of ['woman', 'man'] as const) {
      it(`names only the right side in the ${name} band, read by a ${gender}`, () => {
        const r = buildRead(set, gender)
        expect(r, 'every question answered').not.toBeNull()
        const text = everything(r!)
        const hit = WRONG[gender].exec(text)
        expect(hit?.[0] ?? null, `${text}`).toBeNull()
      })
    }
  }

  it('gives the guide a line that names the right side', () => {
    for (const gender of ['woman', 'man'] as const) {
      for (const set of Object.values(BANDS)) {
        const r = buildRead(set, gender)!
        expect(WRONG[gender].exec(readSummary(r, gender))?.[0] ?? null).toBeNull()
      }
    }
  })

  it('reaches every band, so the sweep above is not vacuous', () => {
    const bands = Object.entries(BANDS).map(([name, set]) => [name, buildRead(set, 'woman')!.band])
    expect(Object.fromEntries(bands)).toEqual({
      early: 'early',
      caution: 'caution',
      strong: 'strong',
      thin: 'thin',
      mixed: 'mixed',
    })
  })
})
