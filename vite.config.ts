import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { DESCRIPTION, OG_ALT, TAGLINE, TITLE } from './src/data/brand.js'

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
 * The app is one document: every path Netlify serves is index.html, and the
 * only things behind it are the functions, which are an API and not pages.
 * Nothing a member keeps is ever rendered into HTML — a map lives under a code
 * nobody can guess — so there is no page here that needs hiding, and the cost
 * of hiding was real (see the note in netlify.toml).
 */
function robots(host: string): string {
  return [
    '# Niyyah is a single-page app: every path below serves the same document,',
    '# and index.html names the canonical one. The functions are an API.',
    'User-agent: *',
    'Allow: /',
    'Disallow: /.netlify/',
    '',
    `Sitemap: https://${host}/sitemap.xml`,
    '',
  ].join('\n')
}

/**
 * One URL, because there is one page. No lastmod: it would change on every
 * deploy whether or not anything a reader cares about did, and a sitemap that
 * cries wolf is worth less than one that says nothing.
 */
function sitemap(host: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>https://${host}/</loc>`,
    '    <changefreq>weekly</changefreq>',
    '  </url>',
    '</urlset>',
    '',
  ].join('\n')
}

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
          this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap(host) })
        },
      },
    ],
  }
})
