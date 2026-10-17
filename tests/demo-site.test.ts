import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The public demo's routes, headers and build wiring (docs/DECISIONS.md,
 * release R4). The demo is a second build at /demo/; this holds every place
 * that has to agree about it.
 */

const toml = readFileSync('netlify.toml', 'utf8')
const live = toml
  .split('\n')
  .filter((l) => !l.trim().startsWith('#'))
  .join('\n')
/** The `[[headers]]` or `[[redirects]]` tables, each with its own sub-table (`[headers.values]`), as text. */
function blocks(kind: 'headers' | 'redirects'): string[] {
  const out: string[] = []
  let current: string[] | null = null
  for (const line of live.split('\n')) {
    const table = line.trim().match(/^\[\[?([a-z.]+)\]\]?$/)
    if (table) {
      if (line.trim() === `[[${kind}]]`) {
        current = []
        out.push('')
      } else if (!table[1].startsWith(`${kind}.`)) current = null
    }
    if (current) out[out.length - 1] += `${line}\n`
  }
  return out
}
const valueOf = (block: string, key: string) => block.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, 'm'))?.[1]

describe('the build', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }

  it('builds the app first (it empties dist), then the demo into the same folder', () => {
    expect(pkg.scripts.build).toBe('tsc -b && vite build && vite build --config vite.demo.config.ts')
  })

  it('verify and the deploy command are unchanged: Netlify still runs verify then build', () => {
    expect(pkg.scripts.verify).toBe('npm run typecheck && npm run lint && npm test')
    expect(live).toContain('command = "npm run verify && npm run build"')
  })

  it('the demo config is type-checked with the other Node-side config', () => {
    expect(readFileSync('tsconfig.node.json', 'utf8')).toMatch(/"include": \["vite\.config\.ts", "vite\.demo\.config\.ts"\]/)
  })

  it('the demo config writes to /demo/ and /demo-assets/, empties nothing and copies no public files', () => {
    const cfg = readFileSync('vite.demo.config.ts', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(cfg).toContain("input: 'demo/index.html'")
    expect(cfg).toContain("assetsDir: 'demo-assets'")
    expect(cfg).toContain('emptyOutDir: false')
    expect(cfg).toContain('publicDir: false')
    expect(cfg).not.toMatch(/niyyah-site-host|serviceWorkerJs|sitemap|robots/)
  })

  it('the app’s config is not the demo’s: it does not mention it, so the sitemap, robots.txt and worker stay the app’s', () => {
    expect(readFileSync('vite.config.ts', 'utf8')).not.toMatch(/demo/i)
  })
})

describe('the route', () => {
  it('sends /demo to /demo/ before the single-page catch-all can answer it', () => {
    const redirects = blocks('redirects')
    const at = (from: string) => redirects.findIndex((b) => valueOf(b, 'from') === from)
    expect(at('/demo')).toBeGreaterThanOrEqual(0)
    expect(at('/*')).toBeGreaterThan(at('/demo'))
    const r = redirects[at('/demo')]
    expect(valueOf(r, 'to')).toBe('/demo/')
    expect(r).toMatch(/status\s*=\s*301/)
  })

  it('keeps the catch-all for everything else', () => {
    const catchAll = blocks('redirects').find((b) => valueOf(b, 'from') === '/*')!
    expect(valueOf(catchAll, 'to')).toBe('/index.html')
    expect(catchAll).toMatch(/status\s*=\s*200/)
  })
})

describe('the demo’s headers', () => {
  const block = blocks('headers').find((b) => valueOf(b, 'for') === '/demo/*')
  const csp = (block && valueOf(block, 'Content-Security-Policy')) ?? ''
  const directives = Object.fromEntries(csp.split(';').map((d) => d.trim()).filter(Boolean).map((d) => [d.split(' ')[0], d.split(' ').slice(1).join(' ')]))

  it('exist, for the page and everything under it', () => {
    expect(block).toBeDefined()
  })

  it('send nothing anywhere: connect-src is none, and forms, base, objects and framing are shut', () => {
    expect(directives['connect-src']).toBe("'none'")
    expect(directives['default-src']).toBe("'none'")
    expect(directives['form-action']).toBe("'none'")
    expect(directives['base-uri']).toBe("'none'")
    expect(directives['object-src']).toBe("'none'")
    expect(directives['frame-ancestors']).toBe("'none'")
  })

  it('run only the demo’s own script and style, and load nothing from elsewhere', () => {
    expect(directives['script-src']).toBe("'self'")
    expect(directives['style-src']).toBe("'self'")
    expect(csp).not.toMatch(/unsafe-|\*|https?:|blob:|wss?:/)
  })

  it('leave the whole-site floor of headers alone', () => {
    const floor = blocks('headers').find((b) => valueOf(b, 'for') === '/*')!
    expect(floor).toContain(`Content-Security-Policy = "frame-ancestors 'none'"`)
  })

  it('say nothing about indexing: the page tells the crawler itself, as the rest of the site does (docs/OPS.md)', () => {
    expect(live).not.toMatch(/X-Robots-Tag|noindex/i)
    expect(readFileSync('demo/index.html', 'utf8')).toContain('<meta name="robots" content="noindex, nofollow" />')
  })
})

describe('the way in', () => {
  it('the homepage links to the demo at the path the route serves', () => {
    expect(readFileSync('src/components/Welcome.tsx', 'utf8')).toContain('href="/demo/"')
  })
})
