import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { DESCRIPTION, OG_ALT, TAGLINE, TITLE } from './src/data/brand.js'
import { TOOLS, toolPath } from './src/data/tools.js'
import { sitemapXml, toolPageHtml } from './src/lib/toolPages.js'

/** Must match DEFAULT_SITE_HOST in src/lib/site.ts. */
const DEFAULT_SITE_HOST = 'joinniyyah.com'

/**
 * The brand strings index.html carries, filled from src/data/brand.ts at
 * build time so the community's name has one home (docs/BACKWARD.md's
 * institution rule, made enforceable — see that file).
 */
const BRAND: Record<string, string> = {
  '%BRAND_TITLE%': TITLE,
  '%BRAND_DESCRIPTION%': DESCRIPTION,
  '%BRAND_TAGLINE%': TAGLINE,
  '%BRAND_OG_ALT%': OG_ALT,
}

/**
 * What the crawler is told, and why it is told anything at all.
 *
 * The app is one document, plus one page per tool written from it below —
 * every other path Netlify serves is index.html, and the only things behind
 * it are the functions, which are an API and not pages. Nothing a member keeps
 * is ever rendered into HTML — a map lives under a code nobody can guess — so
 * there is no page here that needs hiding, and the cost of hiding was real
 * (see the note in netlify.toml).
 */
function robots(host: string): string {
  return [
    '# Niyyah is one document, and a page per tool written from it at build',
    '# (src/data/tools.ts); each names its own canonical. The functions are an API.',
    'User-agent: *',
    'Allow: /',
    'Disallow: /.netlify/',
    '',
    `Sitemap: https://${host}/sitemap.xml`,
    '',
  ].join('\n')
}

/** The pages there are: the root, and the tools at their own addresses. */
const PAGES = ['/', ...TOOLS.map((t) => toolPath(t.slug))]

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The social-card tags need an absolute URL, which means the host has to be
  // known at build time. Reading it here keeps index.html free of a hostname
  // we do not own — see the note in src/lib/site.ts.
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const host = env.VITE_SITE_HOST || DEFAULT_SITE_HOST

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'niyyah-site-host',
        transformIndexHtml: (html: string) =>
          Object.entries(BRAND).reduce((out, [key, value]) => out.replaceAll(key, value), html.replaceAll('%SITE_HOST%', host)),
        // robots.txt and sitemap.xml both have to name the host absolutely —
        // a Sitemap: line and a <loc> cannot be relative — so they are written
        // here rather than kept in public/, where they would be the only files
        // in the repository carrying an address we might not own tomorrow
        // (src/lib/site.ts). Build only; dev has no crawler.
        generateBundle() {
          this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots(host) })
          this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(host, PAGES) })
        },
        // One HTML document per tool, derived from the built index.html so the
        // hashed asset tags are the same and only the head differs — title,
        // description, social card, canonical. Written in writeBundle, when
        // index.html is final whatever the plugin order; see src/lib/toolPages.ts.
        writeBundle(options, bundle) {
          const index = bundle['index.html']
          if (!index || index.type !== 'asset') throw new Error('tool pages: index.html is not in the bundle')
          const html = typeof index.source === 'string' ? index.source : new TextDecoder().decode(index.source)
          const dir = options.dir ?? 'dist'
          for (const tool of TOOLS) {
            const folder = join(dir, 'tools', tool.slug)
            mkdirSync(folder, { recursive: true })
            writeFileSync(join(folder, 'index.html'), toolPageHtml(html, tool, host))
          }
        },
      },
    ],
  }
})
