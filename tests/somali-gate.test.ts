import { existsSync, readFileSync } from 'node:fs'
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

describe('the money conversation sheet’s Somali translation', () => {
  // internal/translations holds the reference record — what each line says
  // and why — for the approved Somali sheet. The founder reviewed and
  // approved it directly (2026-09-20); this describe block checks the
  // record is accurate and that the built files it describes actually
  // exist, rather than checking for an absence.
  const REF_PATH = 'internal/translations/money-conversation-sheet.so.md'
  const ref = readFileSync(REF_PATH, 'utf8')

  it('records that the founder reviewed and approved it, plainly, at the top', () => {
    expect(ref).toMatch(/^# Somali translation/)
    expect(ref).toMatch(/Reviewed and approved by the founder/)
  })

  it('the reference record itself still lives outside public/, where Vite’s publicDir can’t serve it', () => {
    // The built HTML is the public artifact; this table is documentation
    // about it, same as docs/SHEET.md is for the English sheet — it isn't
    // meant to be served on its own either way.
    expect(REF_PATH.startsWith('internal/')).toBe(true)
    expect(REF_PATH.startsWith('public/')).toBe(false)
    const vite = readFileSync('vite.config.ts', 'utf8')
    expect(vite).not.toContain('publicDir')
    expect(vite).not.toContain('internal/')
  })

  it('carries all 49 approved rows, one ID each, no duplicates or gaps', () => {
    const ID = /^(title|h1|lede-1|lede-2|note-1|note-2|who-a|who-b|who-date|s[1-4]-h|s[1-4]-framing|q[1-4][a-e]|s[1-4]-agree|s[1-4]-open|legend|footer-pub|footer-note|version)$/
    const ids = [...ref.matchAll(/^\| ([a-z0-9-]+) \|/gm)].map((m) => m[1]).filter((id) => ID.test(id))
    expect(ids).toHaveLength(49)
    expect(new Set(ids).size).toBe(49)
  })

  it('has been built: the public Somali files exist, and are readable text', () => {
    for (const f of [
      'public/niyyah-money-conversation-sheet-so.html',
      'public/niyyah-money-conversation-sheet-1page-so.html',
      'public/niyyah-money-conversation-sheet-so.txt',
    ]) {
      expect(existsSync(f), f).toBe(true)
    }
  })

  it('has a catalog row for each built file — docs/ASSETS.md’s own rule for a real asset', () => {
    const catalog = readFileSync('docs/ASSETS.md', 'utf8')
    expect(catalog).toContain('N3-so')
    expect(catalog).toContain('niyyah-money-conversation-sheet-so.html')
    expect(catalog).toContain('N3-1page-so')
    expect(catalog).toContain('niyyah-money-conversation-sheet-1page-so.html')
    // Still not claimed as live and checked — docs/ASSETS.md's rule (a
    // person has to open it on a session-less device first) applies here
    // exactly as it does to every other asset in the table.
    const n3so = catalog.split('\n').find((l) => l.startsWith('| **N3-so**'))!
    const n3p1so = catalog.split('\n').find((l) => l.startsWith('| **N3-1page-so**'))!
    expect(n3so).not.toMatch(/live and checked/)
    expect(n3p1so).not.toMatch(/live and checked/)
  })
})
