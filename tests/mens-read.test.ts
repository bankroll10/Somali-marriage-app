import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Gender } from '../src/types'
import { familyScripts } from '../src/data/families'
import { readQuestions, scriptFor } from '../src/data/read'
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

  it('still names the combination we do not coach, from either side', () => {
    for (const gender of ['woman', 'man'] as const) {
      expect(buildRead(BANDS.caution, gender)!.band).toBe('caution')
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

describe('the questions a man is asked', () => {
  const his = readQuestions('man')
  const hers = readQuestions('woman')
  const q = (list: typeof his, id: string) => list.find((x) => x.id === id)!
  const opt = (list: typeof his, id: string, o: string) => q(list, id).options.find((x) => x.id === o)!

  it('offers the same answers to both sides, so a kept read stays readable', () => {
    expect(his.map((x) => x.id)).toEqual(hers.map((x) => x.id))
    for (const [i, x] of his.entries()) {
      expect(x.options.map((o) => o.id), x.id).toEqual(hers[i].options.map((o) => o.id))
      expect(x.dimension, x.id).toBe(hers[i].dimension)
    }
  })

  it('never grades him on the step the product gives him', () => {
    // The product's own family scripts: a serious man asks how to approach
    // HER family, and she asks him to send his people. Her read asks whether
    // he did that. His read cannot be the same sentence — it would mark him
    // down for her waiting on the step that is his to take.
    const families = readFileSync('src/data/families.ts', 'utf8')
    expect(families).toContain('asked how to approach you')
    expect(families).toContain('send your people to my family')

    expect(q(hers, 'family').prompt).toMatch(/asked about your family/i)
    expect(q(his, 'family').prompt).not.toBe(q(hers, 'family').prompt)

    // What earns full marks on his side is her handing him the step.
    const best = q(his, 'family').options.find((o) => o.weight === 1)!
    expect(best.note).toMatch(/her family/i)
    expect(best.note).not.toMatch(/your family/i)

    // And the words the read hands him say it in the right direction.
    expect(scriptFor('family', 'man').words).toMatch(/approach your family/i)
    expect(scriptFor('family', 'woman').words).toMatch(/approach my family/i)
  })

  it('hands him the words for the step it tells him is his', () => {
    // The read now sends a man at her family. Something has to give him the
    // sentences: until 2026-09-12 two family scripts were women-only and none
    // was his, so a man reached the ask with nothing behind it.
    for (const gender of ['woman', 'man'] as const) {
      expect(familyScripts(gender).some((s) => s.for === gender), gender).toBe(true)
    }
    expect(familyScripts('man').map((s) => s.id)).toContain('approach-her-family')
    expect(familyScripts('woman').map((s) => s.id)).not.toContain('approach-her-family')
  })

  it('does not read her restraint as his red flag', () => {
    // Never texting first, and asking for discretion before the families have
    // met, are both ordinary on her side. They are the two sharpest signals
    // there are on his.
    expect(opt(his, 'initiative', 'silence').weight).toBeGreaterThan(0)
    expect(opt(his, 'secret', 'explicit').weight).toBeGreaterThan(0)
    expect(opt(hers, 'initiative', 'silence').weight).toBe(0)
    expect(opt(hers, 'secret', 'explicit').weight).toBe(0)
  })
})
