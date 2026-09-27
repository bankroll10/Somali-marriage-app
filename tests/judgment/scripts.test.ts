import { describe, expect, it } from 'vitest'
import { wordsMessage } from '../../src/lib/words'
import { CALIBRATION, MUST_PASS } from './calibration'
import { contractions, hedges, PROPERTIES, scriptFindings, wordCount, type PropertyId } from './properties'
import { exempt, EXEMPT, registry, undeclared, VOICE_QUOTES, voiceQuotes } from './scripts'
import { tellsLeak } from './invariants'

/**
 * Script judgment (docs/GUIDE-EVAL.md, "Relationship judgment", C).
 *
 * Every set of words the product hands someone, read against the properties a
 * rule can see: no accusation, no therapy-speak, no written register, no
 * reading of the listener carried in the words, no gloss or asserted custom;
 * and the shape each was declared to have. What a rule cannot see —
 * whether a Somali woman would say this to her father — is the judge's
 * (./judge.ts) and, above it, the sessions' (docs/PROTOCOL.md).
 *
 * The detectors are calibrated before they are trusted: every line a Part
 * removed for how it sounds must be caught, and the line that replaced it
 * must pass (./calibration.ts).
 */

const ALL = registry()

describe('the registry', () => {
  it('declares a shape for every script the product can hand over', () => {
    expect(undeclared, 'a new script, Guide reply or voice quotation needs a shape in tests/judgment/scripts.ts').toEqual([])
  })

  it('reaches every source, for both genders', () => {
    for (const g of ['woman', 'man'] as const) {
      const mine = ALL.filter((e) => e.gender === g)
      expect(mine.filter((e) => e.source === 'read')).toHaveLength(8)
      expect(mine.filter((e) => e.source === 'eleven')).toHaveLength(15)
      expect(mine.filter((e) => e.source === 'families').length).toBeGreaterThanOrEqual(7)
      expect(mine.filter((e) => e.source === 'guide').length).toBeGreaterThanOrEqual(10)
      expect(mine.filter((e) => e.source === 'voice').length).toBeGreaterThanOrEqual(5)
    }
  })

  it('classifies no voice quotation the voices no longer say', () => {
    const said = new Set([...voiceQuotes('woman'), ...voiceQuotes('man')])
    expect(Object.keys(VOICE_QUOTES).filter((q) => !said.has(q))).toEqual([])
  })

  it('exempts only scripts that exist, each with a reason', () => {
    const ids = new Set(ALL.map((e) => e.id))
    for (const [id, list] of Object.entries(EXEMPT)) {
      expect(ids.has(id), id).toBe(true)
      for (const x of list) {
        expect(x.property in PROPERTIES, `${id}: ${x.property}`).toBe(true)
        expect(x.why.length, `${id}: an exemption says why`).toBeGreaterThan(40)
      }
    }
  })
})

describe('the detectors are calibrated on lines this product removed', () => {
  it('catches every removed line on the property it broke', () => {
    for (const c of CALIBRATION.filter((c) => c.by === 'detector')) {
      const found = scriptFindings(c.bad).map((f) => f.property)
      expect(found, `${c.from}: "${c.bad}"`).toContain(c.breaks)
    }
  })

  it('passes every line that replaced one', () => {
    // The register rules are about speech; a sentence the app says to her is
    // not held to them (the calibration line's `said`).
    for (const c of CALIBRATION)
      expect(
        scriptFindings(c.good).filter((f) => c.said !== 'copy' || f.property !== 'NATURAL_REGISTER'),
        `${c.from}: "${c.good}"`,
      ).toEqual([])
  })

  it('passes the lines a careless pattern would catch', () => {
    for (const [line, why] of MUST_PASS) expect(scriptFindings(line), `${why}: "${line}"`).toEqual([])
  })

  it('names a real property for every calibration line, and leaves some to the judge', () => {
    for (const c of CALIBRATION) expect(c.breaks in PROPERTIES, c.bad).toBe(true)
    // Not everything is a pattern. If every line were caught by a rule, the
    // corpus would be measuring the rules, not the judgment.
    expect(CALIBRATION.filter((c) => c.by === 'judge').length).toBeGreaterThanOrEqual(5)
  })
})

describe('every script, against the floors', () => {
  const violations = (property: PropertyId) =>
    ALL.flatMap((e) =>
      scriptFindings(e.words, e.why)
        .filter((f) => f.property === property && !exempt(e, property))
        .map((f) => `${e.id}: ${f.why}${f.match ? ` ("${f.match}")` : ''}`),
    )

  it.each(['NO_ACCUSATION', 'NO_MOTIVE', 'NO_THERAPY_SPEAK', 'NATURAL_REGISTER', 'NO_HIDDEN_INTERPRETATION', 'SOMALI_NATURAL'] as PropertyId[])(
    '%s holds',
    (property) => {
      expect(violations(property)).toEqual([])
    },
  )

  it('sounds spoken across the whole set: the contraction ratio does not fall', () => {
    // Ratcheted, not gated per script: an elder may be spoken to without them
    // (EXEMPT). Measured 2026-09-26 at 0.955 over both genders. Raise it when
    // the copy gets more natural; never lower it to pass.
    let c = 0
    let u = 0
    for (const e of ALL) {
      const n = contractions(e.words)
      c += n.contracted
      u += n.uncontracted
    }
    expect(c / (c + u)).toBeGreaterThanOrEqual(0.95)
  })
})

describe('every script has the shape it was declared to have', () => {
  it('an ask carries a question the listener can answer', () => {
    expect(ALL.filter((e) => e.shape === 'ask' && !e.words.includes('?')).map((e) => e.id)).toEqual([])
  })

  it('a close asks nothing, and is short', () => {
    for (const e of ALL.filter((e) => e.shape === 'close')) {
      expect(e.words, e.id).not.toMatch(/\?/)
      expect(wordCount(e.words), e.id).toBeLessThanOrEqual(50)
    }
  })

  it('words for a confidant are not a question to put to the person she is careful around', () => {
    for (const e of ALL.filter((e) => e.shape === 'confide')) {
      expect(e.to, e.id).toBe('confidant')
      expect(e.words, e.id).toMatch(/\bthey\b|\bsomeone\b/i)
    }
  })

  it('only a fill-in has blanks, and nothing has a placeholder', () => {
    for (const e of ALL) {
      expect(/———/.test(e.words), e.id).toBe(e.shape === 'fill-in')
      expect(e.words, e.id).not.toMatch(/\[[^\]]+\]|\{[a-zA-Z]+\}|\bNAME\b|<[^>]+>/)
    }
  })

  it('is direct: at most one softener, and short enough to say in one go', () => {
    for (const e of ALL) {
      expect(hedges(e.words), e.id).toBeLessThanOrEqual(1)
      expect(wordCount(e.words), e.id).toBeLessThanOrEqual(80)
    }
  })
})

describe('the reading of the reply never travels with the words', () => {
  const sentences = (t: string) => t.split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter((s) => wordCount(s) >= 6)

  it('no sentence of `tells` is in the words', () => {
    expect(ALL.flatMap((e) => tellsLeak(e).map((s) => `${e.id}: ${s}`))).toEqual([])
  })

  it('what she sends carries the words and why, and not one sentence of `tells`', () => {
    for (const e of ALL.filter((e) => e.tells)) {
      const { text } = wordsMessage({ words: e.words, why: e.why, tells: e.tells }, 'read')
      for (const s of sentences(e.tells)) if (!e.words.includes(s) && !e.why.includes(s)) expect(text, e.id).not.toContain(s)
    }
  })
})
