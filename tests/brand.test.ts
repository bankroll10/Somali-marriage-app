import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DESCRIPTION } from '../src/data/brand'

/**
 * The brand's first sentences live in one file — docs/PRODUCT.md's
 * institution rule, for the strings it can be enforced on. index.html reads
 * them at build time; the manifest is static and is held equal here; the
 * components import them. tests/voice.test.ts holds "powered by AI" out.
 */

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
})
