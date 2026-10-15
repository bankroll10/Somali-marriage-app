import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DESCRIPTION, TAGLINE, TITLE } from '../src/data/brand'

/**
 * The brand's first sentences live in one file — docs/PRODUCT.md's
 * institution rule, for the strings it can be enforced on. index.html reads
 * them at build time; the manifest is static and is held equal here; the
 * components import them. tests/voice.test.ts holds "powered by AI" out.
 */

/** sha256 of the BATCH-02B card ("Introductions beginning in Minneapolis–St. Paul"), which the released card replaced. */
const FOUNDER_LED_CARD = '6b7a8b97369aabf77287736b4cc372c12826dbf46e2e5c8b46346371eeb13daa'

describe('the brand strings', () => {
  it('index.html carries placeholders, never the literals', () => {
    const html = readFileSync('index.html', 'utf8')
    for (const key of ['%BRAND_TITLE%', '%BRAND_DESCRIPTION%', '%BRAND_TAGLINE%', '%BRAND_OG_ALT%']) {
      expect(html).toContain(key)
    }
    expect(html).not.toMatch(/Somali/)
  })

  it('the manifest says what brand.ts says', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as { description: string }
    expect(manifest.description).toBe(DESCRIPTION)
  })
  it('keeps title and description within what a result or a chat preview shows', () => {
    expect(TITLE.length).toBeLessThanOrEqual(65)
    expect(DESCRIPTION.length).toBeLessThanOrEqual(170)
    expect(TAGLINE.length).toBeLessThanOrEqual(170)
  })

  it('ships the released card, and no founder-led one (docs/DECISIONS.md, release R3 and its integration)', () => {
    // The held branch's BATCH-02B card said "Introductions beginning in
    // Minneapolis–St. Paul". It is superseded: the card at og.png is the one
    // released, and nothing here names or builds another.
    expect(existsSync('public/og.png')).toBe(true)
    // The retired card, by content: the file was renamed og-pilot.png on that branch, but the same bytes also sat at og.png.
    expect(createHash('sha256').update(readFileSync('public/og.png')).digest('hex')).not.toBe(FOUNDER_LED_CARD)
    expect(existsSync('public/og-pilot.png')).toBe(false)
    expect(existsSync('scripts/og')).toBe(false)
    expect(readFileSync('package.json', 'utf8')).not.toContain('scripts/og')
    for (const file of ['index.html', 'src/lib/guidePages.ts']) expect(readFileSync(file, 'utf8')).toContain('og.png')
    for (const text of [DESCRIPTION, TAGLINE, readFileSync('public/manifest.webmanifest', 'utf8')]) {
      expect(text).not.toMatch(/founder-led|introduction pilot|Minneapolis|made by hand|Put your name down/)
    }
  })
})
