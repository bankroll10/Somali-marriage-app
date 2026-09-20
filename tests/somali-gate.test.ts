import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SOMALI, somali } from '../src/data/somali'

/**
 * The gate is a test, not a promise. No Somali sentence reaches a screen
 * until the founder has read it, and the marker that says "not yet" cannot
 * survive next to the flag that says "yes".
 */
const source = readFileSync(new URL('../src/data/somali.ts', import.meta.url), 'utf8')
const entries = source.split('\n').filter((l) => /^\s+'[a-z.]+':\s*\{/i.test(l))

describe('the Somali gate', () => {
  it('has one entry per line, so the marker and the flag can be read together', () => {
    expect(entries.length).toBe(Object.keys(SOMALI).length)
  })
  it('marks every unapproved line VERIFY', () => {
    for (const line of entries.filter((l) => l.includes('approved: false'))) expect(line).toContain('// VERIFY')
  })
  it('never lets an approved line keep its VERIFY marker', () => {
    for (const line of entries.filter((l) => l.includes('approved: true'))) expect(line).not.toContain('VERIFY')
  })
  it('returns nothing for an unapproved line, and the line for an approved one', () => {
    for (const [key, line] of Object.entries(SOMALI)) {
      expect(somali(key)).toEqual(line.approved ? line : null)
    }
    expect(somali('nope')).toBeNull()
  })
  it('pairs every Somali sentence with its own English gloss, as two fields, so an unread line is never a wall', () => {
    // Two fields rather than one string with a full stop between them
    // (docs/ACCESS.md) — so a caller can mark just the Somali span lang="so"
    // without a screen reader trying to pronounce the English as Somali too.
    for (const [key, { somali: line, english }] of Object.entries(SOMALI)) {
      expect(line.length, key).toBeGreaterThan(3)
      expect(english, key).toMatch(/^[A-Z][^.]{10,}/)
    }
  })
})
