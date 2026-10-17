import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DESCRIPTION, OG_ALT, TAGLINE } from '../src/data/brand'

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

  // Release R4: the first sentences say what the homepage says — the direction, the place and the demo — and
  // nothing the product cannot do. A link preview is the first thing a stranger reads.
  it('say the direction, the place and the demo, in the homepage’s own words', () => {
    expect(DESCRIPTION).toContain('Somali singles')
    expect(DESCRIPTION).toContain('Minneapolis–St. Paul')
    expect(DESCRIPTION).toMatch(/\bdemo\b/)
    expect(TAGLINE).toMatch(/Somali singles/)
    expect(TAGLINE).toMatch(/demo/)
    expect(OG_ALT).toContain('Meet with marriage in mind.')
    expect(OG_ALT).toContain('Somali')
  })

  it('claim no members, no open introductions, no working AI and no date', () => {
    for (const text of [DESCRIPTION, TAGLINE, OG_ALT]) {
      expect(text).not.toMatch(/\bAI\b|algorithm|your matches|matched with|available (members|singles|people)|members (near|in|you)|waitlist|sign up|find someone|find your/i)
      expect(text).not.toMatch(/\b(soon|opens|launch|coming)\b/i)
      expect(text).not.toMatch(/What’s in your way|Already talking to someone\?/)
    }
    // Being built is not being open: the description says so in the present continuous, once.
    expect(DESCRIPTION).toMatch(/is being built/)
  })

  it('the share card is the size the tags say, 1200 by 630', () => {
    const png = readFileSync('public/og.png')
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    expect(png.readUInt32BE(16)).toBe(1200)
    expect(png.readUInt32BE(20)).toBe(630)
    const html = readFileSync('index.html', 'utf8')
    expect(html).toContain('<meta property="og:image:width" content="1200" />')
    expect(html).toContain('<meta property="og:image:height" content="630" />')
  })
})
