import { existsSync, readdirSync, readFileSync } from 'node:fs'
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

describe('the money conversation sheet’s Somali draft stays internal', () => {
  // The same gate as above, for a document instead of a code flag: a
  // machine-drafted Somali translation of N3 exists (internal/translations),
  // and nothing here promotes it to a reader until a native speaker has
  // reviewed it. Three separate failure modes, three separate checks — a
  // fix to one doesn't quietly cover for the other two.
  const DRAFT_PATH = 'internal/translations/money-conversation-sheet.so-DRAFT.md'
  const draft = readFileSync(DRAFT_PATH, 'utf8')

  it('the draft says plainly, at the top, that it is unreviewed and must not be published', () => {
    expect(draft).toMatch(/^# UNREVIEWED/)
    expect(draft).toContain('DO NOT PUBLISH')
    expect(draft).toContain('DO NOT LINK')
    expect(draft).toMatch(/machine-drafted/i)
    expect(draft).toMatch(/has \*\*not\*\* been checked/i)
  })

  it('records an AI editorial pass accurately as AI work, not as human or native-speaker approval', () => {
    // A second pass (an AI editorial review against the English source)
    // landed the same day as the first draft. It reads more confident than
    // a first draft, which is exactly why the gate has to say — in words a
    // skim can't miss — that neither pass is the human review this still
    // needs.
    expect(draft).toMatch(/No human or native-speaker approval is[\s>]+recorded/i)
    expect(draft).toContain('AI editorial review')
    expect(draft).not.toMatch(/native.speaker[- ]approved/i)
  })

  it('lives outside public/, where Vite’s publicDir can never pick it up and serve it', () => {
    expect(DRAFT_PATH.startsWith('internal/')).toBe(true)
    expect(DRAFT_PATH.startsWith('public/')).toBe(false)
    const vite = readFileSync('vite.config.ts', 'utf8')
    // No override pointing publicDir somewhere that would sweep internal/ in,
    // and no reference to the internal/ tree at all.
    expect(vite).not.toContain('publicDir')
    expect(vite).not.toContain('internal/')
  })

  it('has not been promoted: no public Somali sheet file, and no catalog row for one', () => {
    const publicFiles = readdirSync('public')
    expect(publicFiles.some((f) => /-so\.html$/.test(f) || /-so\.txt$/.test(f))).toBe(false)
    expect(existsSync('public/niyyah-money-conversation-sheet-so.html')).toBe(false)

    // docs/ASSETS.md's own rule: a URL goes in the catalog only once a
    // person has opened it with no session. A Somali sheet has never been
    // built, so it must not have a row yet either — the same discipline
    // that stopped N3 itself from shipping before its gate opened.
    const catalog = readFileSync('docs/ASSETS.md', 'utf8')
    expect(catalog.toLowerCase()).not.toMatch(/n3-so\b/)
    expect(catalog).not.toContain('niyyah-money-conversation-sheet-so')
  })
})
