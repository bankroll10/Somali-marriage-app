import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DESCRIPTION, EYEBROW, OG_ALT, TAGLINE, TITLE } from '../src/data/brand'

/**
 * The brand's first sentences live in one file — docs/BACKWARD.md's
 * institution rule, for the strings it can be enforced on. index.html reads
 * them at build time; the manifest is static and is held equal here; the
 * components import them. And "powered by AI" is gone from every surface,
 * as docs/DURABLE.md has said since 2026-09-07 (docs/BOARD.md).
 */

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

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

  it('Welcome reads its eyebrow from brand.ts rather than spelling it', () => {
    const welcome = readFileSync('src/components/Welcome.tsx', 'utf8')
    expect(welcome).toContain('{EYEBROW}')
    expect(welcome).not.toContain(`'${EYEBROW}'`)
    expect(welcome).not.toMatch(/>\s*Built for the Somali diaspora\s*</)
  })

  it('nothing says "powered by AI" — the model adds a sentence, it is never the reason', () => {
    const files = [...walk('src'), ...walk('public'), 'index.html', 'README.md']
    for (const file of files) {
      if (!/\.(tsx?|html|json|webmanifest|md)$/.test(file)) continue
      // brand.ts names the phrase once, to say it is gone.
      if (file.endsWith('src/data/brand.ts')) continue
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/powered by ai/i)
    }
    for (const s of [TITLE, DESCRIPTION, TAGLINE, OG_ALT]) expect(s).not.toMatch(/powered by ai/i)
  })
})
