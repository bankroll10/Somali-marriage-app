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
  it('returns nothing for an unapproved line, and the text for an approved one', () => {
    for (const [key, line] of Object.entries(SOMALI)) {
      expect(somali(key)).toBe(line.approved ? line.text : null)
    }
    expect(somali('nope')).toBeNull()
  })
  it('pairs every Somali sentence with English, so an unread line is never a wall', () => {
    for (const [key, { text }] of Object.entries(SOMALI)) {
      // A gloss follows the Somali: a full stop, then at least one English clause.
      expect(text, key).toMatch(/\.\s+[A-Z][^.]{10,}/)
    }
  })
})
