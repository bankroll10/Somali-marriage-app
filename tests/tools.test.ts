import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DESCRIPTION, OG_ALT, TAGLINE, TITLE } from '../src/data/brand'
import { READER_OF, TOOLS, toolFor, toolFromPath, toolPath } from '../src/data/tools'
import { VIAS } from '../src/lib/entry'
import { sitemapXml, toolPageHtml } from '../src/lib/toolPages'

/**
 * The tools at their own addresses, and the pages written for them.
 *
 * Three things have to agree without anyone remembering: the table in
 * src/data/tools.ts, the parser in src/lib/entry.ts that recognises the paths,
 * and the build in vite.config.ts that writes one HTML document per row. The
 * table is import-free so the build can load it, which is exactly why it needs
 * a test to hold it to the rest of the app.
 */

const HOST = 'example.test'

/** index.html as the build leaves it, without running the build. */
function builtIndex(): string {
  const raw = readFileSync('index.html', 'utf8')
  const brand: Record<string, string> = {
    '%BRAND_TITLE%': TITLE,
    '%BRAND_DESCRIPTION%': DESCRIPTION,
    '%BRAND_TAGLINE%': TAGLINE,
    '%BRAND_OG_ALT%': OG_ALT,
  }
  return Object.entries(brand).reduce((out, [k, v]) => out.replaceAll(k, v), raw.replaceAll('%SITE_HOST%', HOST))
}

describe('the table', () => {
  it('names the five tools, and nothing else', () => {
    expect(TOOLS.map((t) => t.slug).sort()).toEqual([
      'before-you-say-yes',
      'door',
      'families',
      'is-he-serious',
      'is-she-serious',
    ])
    for (const t of TOOLS) {
      expect(t.slug).toMatch(/^[a-z-]+$/)
      expect(t.title.length).toBeGreaterThan(10)
      expect(t.description.length).toBeGreaterThan(40)
      expect(t.share.length).toBeGreaterThan(40)
      // Copy about the tool, never a link inside it: the link is minted by src/lib/links.ts.
      expect(`${t.title} ${t.description} ${t.share}`).not.toMatch(/https?:|\?via=|joinniyyah/)
    }
  })

  it('says who each read is about, and asks for the eleven', () => {
    expect(TOOLS.find((t) => t.slug === 'is-he-serious')).toMatchObject({ kind: 'read', about: 'man' })
    expect(TOOLS.find((t) => t.slug === 'is-she-serious')).toMatchObject({ kind: 'read', about: 'woman' })
    const eleven = TOOLS.find((t) => t.slug === 'before-you-say-yes')!
    expect(eleven.kind).toBe('eleven')
    expect(eleven.about).toBeUndefined()
  })

  it('the door and the family words are about the person who arrives, not someone else', () => {
    const door = TOOLS.find((t) => t.slug === 'door')!
    expect(door.kind).toBe('door')
    expect(door.about).toBeUndefined()
    const families = TOOLS.find((t) => t.slug === 'families')!
    expect(families.kind).toBe('families')
    expect(families.about).toBeUndefined()
  })

  it('shares under a via the ladder already knows', () => {
    for (const t of TOOLS) expect(VIAS).toContain(t.via)
  })

  it('reads the reader as the other side, and finds the tool for a screen', () => {
    expect(READER_OF.man).toBe('woman')
    expect(READER_OF.woman).toBe('man')
    expect(toolFor('read', 'woman')?.slug).toBe('is-he-serious')
    expect(toolFor('read', 'man')?.slug).toBe('is-she-serious')
    expect(toolFor('read', undefined)).toBeUndefined()
    expect(toolFor('eleven')?.slug).toBe('before-you-say-yes')
  })

  it('recognises its own paths and no others', () => {
    for (const t of TOOLS) {
      expect(toolFromPath(toolPath(t.slug))?.slug).toBe(t.slug)
      expect(toolFromPath(`${toolPath(t.slug)}/`)?.slug).toBe(t.slug)
    }
    expect(toolFromPath('/')).toBeUndefined()
    expect(toolFromPath('/tools')).toBeUndefined()
    expect(toolFromPath('/tools/')).toBeUndefined()
    expect(toolFromPath('/tools/is-he-serious/anything')).toBeUndefined()
  })
})

describe('the page written for a tool', () => {
  const index = builtIndex()

  for (const tool of TOOLS) {
    it(`${tool.slug} carries its own head and the same body`, () => {
      const page = toolPageHtml(index, tool, HOST)
      const url = `https://${HOST}/tools/${tool.slug}`
      expect(page).toContain(`<title>${tool.title.replaceAll('&', '&amp;')}</title>`)
      expect(page).toContain(`<meta property="og:title" content="${tool.title}" />`)
      expect(page).toContain(`<meta name="twitter:title" content="${tool.title}" />`)
      expect(page).toContain(`<meta name="description" content="${tool.description}" />`)
      expect(page).toContain(`<meta property="og:description" content="${tool.description}" />`)
      expect(page).toContain(`<meta name="twitter:description" content="${tool.description}" />`)
      expect(page).toContain(`<link rel="canonical" href="${url}" />`)
      expect(page).toContain(`<meta property="og:url" content="${url}" />`)
      // The root's own canonical and title are gone — one page, one canonical.
      expect(page).not.toContain(`href="https://${HOST}/"`)
      expect(page).not.toContain(`<title>${TITLE}</title>`)
      // Everything else is untouched: the same image, the same app.
      expect(page).toContain(`https://${HOST}/og.png`)
      expect(page).toContain('<div id="root"></div>')
    })
  }

  it('refuses an index.html it does not recognise, rather than shipping the wrong preview', () => {
    const noCanonical = index.replace(/<link\s+rel="canonical"[^>]*>/, '')
    expect(() => toolPageHtml(noCanonical, TOOLS[0], HOST)).toThrow(/canonical/)
    const twoTitles = index.replace('</head>', '<title>x</title></head>')
    expect(() => toolPageHtml(twoTitles, TOOLS[0], HOST)).toThrow(/<title>/)
  })
})

describe('what the build is wired to do', () => {
  const vite = readFileSync('vite.config.ts', 'utf8')

  it('writes a page per tool from the final index.html, and lists them in the sitemap', () => {
    expect(vite).toContain("from './src/data/tools.js'")
    expect(vite).toContain("from './src/lib/toolPages.js'")
    expect(vite).toContain('writeBundle(')
    expect(vite).toContain('toolPageHtml(html, tool, host)')
    expect(vite).toContain('sitemapXml(host, PAGES)')
  })

  it('names every page once in the sitemap', () => {
    const xml = sitemapXml(HOST, ['/', ...TOOLS.map((t) => toolPath(t.slug))])
    expect(xml.match(/<loc>/g)).toHaveLength(1 + TOOLS.length)
    expect(xml).toContain(`<loc>https://${HOST}/</loc>`)
    for (const t of TOOLS) expect(xml).toContain(`<loc>https://${HOST}/tools/${t.slug}</loc>`)
    expect(xml).not.toContain('lastmod')
  })
})
