import type { Tool } from '../data/tools.js'

/**
 * The tool pages, written from index.html at build time.
 *
 * The app is one document, and every path Netlify serves is that document —
 * except the three tools in src/data/tools.ts, which need a preview of their
 * own: a link to `/tools/is-he-serious` pasted into a group chat should show
 * "Is he serious?" and what it is, not the homepage's title, and a search
 * result for it should say the same. A messaging app and a crawler read the
 * HTML and run nothing, so the words have to be in the file.
 *
 * So vite.config.ts takes the built index.html — hashed asset tags in, brand
 * placeholders filled — and writes one copy per tool at `tools/<slug>/index.html`
 * with only the head changed: title, description, the social-card title and
 * description, and the canonical and `og:url` pointing at the tool's own
 * address. Netlify serves an existing file before the single-page rewrite, so
 * a fresh visit, a reload and a preview all get the tool's own head; the app
 * that then loads is the same one, and src/lib/entry.ts reads the path.
 *
 * Every replacement here must match exactly once. A tag this file expects and
 * cannot find is a build failure, not a silent fall-through — the alternative
 * is shipping the homepage's preview on every tool route the day someone
 * reorders index.html.
 *
 * Pure: no DOM, no `import.meta.env`, `.js` on the relative import — this is
 * loaded by vite.config.ts under tsconfig.node.json.
 */

function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

/** Replace exactly one match, or refuse. */
function once(html: string, pattern: RegExp, replacement: string, what: string): string {
  const matches = html.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'))
  if (!matches || matches.length !== 1) {
    throw new Error(`toolPageHtml: expected exactly one ${what}, found ${matches?.length ?? 0}`)
  }
  return html.replace(pattern, replacement)
}

/** `<meta name|property="…" content="…">` with whatever whitespace Vite left between the attributes. */
function meta(attr: 'name' | 'property', key: string): RegExp {
  return new RegExp(`<meta\\s+${attr}="${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}"\\s+content="[^"]*"\\s*/?>`)
}

export function toolPageHtml(indexHtml: string, tool: Tool, host: string): string {
  const url = `https://${host}/tools/${tool.slug}`
  const title = escapeHtml(tool.title)
  const description = escapeHtml(tool.description)
  let html = indexHtml
  html = once(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`, '<title>')
  html = once(html, meta('name', 'description'), `<meta name="description" content="${description}" />`, 'meta description')
  html = once(html, meta('property', 'og:title'), `<meta property="og:title" content="${title}" />`, 'og:title')
  html = once(html, meta('property', 'og:description'), `<meta property="og:description" content="${description}" />`, 'og:description')
  html = once(html, meta('name', 'twitter:title'), `<meta name="twitter:title" content="${title}" />`, 'twitter:title')
  html = once(html, meta('name', 'twitter:description'), `<meta name="twitter:description" content="${description}" />`, 'twitter:description')
  html = once(html, meta('property', 'og:url'), `<meta property="og:url" content="${url}" />`, 'og:url')
  html = once(
    html,
    new RegExp(`<link\\s+rel="canonical"\\s+href="https://${host.replace(/\./g, '\\.')}/"\\s*/?>`),
    `<link rel="canonical" href="${url}" />`,
    'canonical',
  )
  return html
}

/**
 * One `<loc>` per page. No lastmod: it would change on every deploy whether
 * or not anything a reader cares about did, and a sitemap that cries wolf is
 * worth less than one that says nothing.
 */
export function sitemapXml(host: string, paths: string[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.flatMap((p) => ['  <url>', `    <loc>https://${host}${p}</loc>`, '    <changefreq>weekly</changefreq>', '  </url>']),
    '</urlset>',
    '',
  ].join('\n')
}
