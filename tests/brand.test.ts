import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DESCRIPTION, HEADLINE, OG_ALT, OG_IMAGE, SOCIAL_TITLE, TAGLINE, TITLE } from '../src/data/brand'

/**
 * The brand's first sentences live in one file — docs/PRODUCT.md's
 * institution rule, for the strings it can be enforced on. index.html reads
 * them at build time; the manifest is static and is held equal here; the
 * components import them. tests/voice.test.ts holds "powered by AI" out.
 */

describe('the brand strings', () => {
  it('index.html carries placeholders, never the literals', () => {
    const html = readFileSync('index.html', 'utf8')
    for (const key of ['%BRAND_TITLE%', '%BRAND_DESCRIPTION%', '%BRAND_TAGLINE%', '%BRAND_OG_ALT%', '%BRAND_SOCIAL_TITLE%', '%BRAND_OG_IMAGE%']) {
      expect(html).toContain(key)
    }
    expect(html).not.toMatch(/Somali/)
    expect(html).not.toMatch(/og\.png|og-pilot/)
  })

  it('the manifest says what brand.ts says', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as { description: string }
    expect(manifest.description).toBe(DESCRIPTION)
  })

  it('the headline is the homepage’s, and the social title and the page title lead with it', () => {
    expect(readFileSync('src/components/Welcome.tsx', 'utf8')).toContain(HEADLINE)
    expect(SOCIAL_TITLE).toBe(HEADLINE)
    expect(TITLE).toContain(HEADLINE)
  })

  it('says both paths, and the pilot’s city, and promises nothing about outcomes', () => {
    for (const text of [DESCRIPTION, TAGLINE]) {
      expect(text).toMatch(/introduction pilot/)
      expect(text).toMatch(/Minneapolis–St\. Paul/)
      expect(text).toMatch(/considering someone for marriage/)
      expect(text).not.toMatch(/guarantee|match(es|ed)? you|find your|within|days|\d{2,}/i)
    }
    expect(OG_ALT).toContain(HEADLINE)
    expect(OG_ALT).toMatch(/Minneapolis–St\. Paul/)
    expect(OG_ALT).not.toMatch(/What’s in your way/)
  })

  it('keeps title and description within what a result or a chat preview shows', () => {
    expect(TITLE.length).toBeLessThanOrEqual(65)
    expect(DESCRIPTION.length).toBeLessThanOrEqual(170)
    expect(TAGLINE.length).toBeLessThanOrEqual(170)
  })
})

describe('the social card', () => {
  it('is a 1200×630 PNG under public/, at the name brand.ts gives it', () => {
    const path = `public/${OG_IMAGE}`
    expect(existsSync(path), path).toBe(true)
    const png = readFileSync(path)
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    expect(png.readUInt32BE(16)).toBe(1200)
    expect(png.readUInt32BE(20)).toBe(630)
  })

  it('has an editable source that says what OG_ALT says it says', () => {
    const source = readFileSync('scripts/og/og.html', 'utf8')
    expect(source).toContain('Meet someone serious.')
    expect(source).toContain('Think marriage through.')
    expect(source).toContain('Introductions beginning in Minneapolis–St. Paul.')
    expect(source).toContain('Tools for people considering someone for marriage.')
    expect(readFileSync('package.json', 'utf8')).toContain('"og": "node scripts/og/render.mjs"')
  })

  it('the retired card is gone, so nothing can still point at the old words', () => {
    expect(existsSync('public/og.png')).toBe(false)
  })
})
