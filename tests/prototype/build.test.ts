import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PROTOTYPE, ROOT, walk } from './support'

/**
 * BUILD OUTPUT — the demo is its own build, and the app is unchanged by it
 * (docs/MATCH-PROTOTYPE.md, docs/DECISIONS.md release R4).
 *
 * Three real Vite builds into temporary folders: the app alone, as it was
 * before the demo; the app followed by the demo, as `npm run build` does; and
 * the pair is compared. The classes matter as much as the files: Tailwind reads
 * every file under the project, so without src/index.css's `@source not` the
 * demo's utility classes would be generated into the app's stylesheet.
 */

const out = { alone: '', both: '' }
const DEMO_DIRS = ['demo', 'demo-assets']

const files = (dir: string, accept = /./): string[] => walk(dir, accept)
const rel = (dir: string, f: string) => f.slice(dir.length + 1)
const texts = (dir: string) => files(dir, /\.(html|js|css|json|txt|xml|webmanifest)$/).map((f) => ({ f: rel(dir, f), text: readFileSync(f, 'utf8') }))
const inDemo = (name: string) => DEMO_DIRS.some((d) => name.startsWith(`${d}/`))

/** Words that exist only in the demo's source. */
const MARKERS = ['Demo example', 'Try another scenario', 'A first look at how meeting someone could work', 'MatchPrototype', 'prototype/match', 'What’s real here?']

/** Nothing of the evaluation work, the network or the browser's storage may be in the demo's files. */
const FORBIDDEN = [/match-eval/i, /MATCH_EVAL/, /anthropic/i, /x-api-key/i, /sk-ant-/, /\.netlify/, /localStorage/, /sessionStorage/, /indexedDB/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /EventSource/, /document\.cookie/, /serviceWorker/]

beforeAll(async () => {
  out.alone = mkdtempSync(join(tmpdir(), 'niyyah-app-'))
  out.both = mkdtempSync(join(tmpdir(), 'niyyah-both-'))
  await build({ root: ROOT, logLevel: 'silent', build: { outDir: out.alone, emptyOutDir: true } })
  await build({ root: ROOT, logLevel: 'silent', build: { outDir: out.both, emptyOutDir: true } })
  await build({ root: ROOT, configFile: join(ROOT, 'vite.demo.config.ts'), logLevel: 'silent', build: { outDir: out.both, emptyOutDir: false } })
}, 240_000)

afterAll(() => {
  for (const d of Object.values(out)) if (d) rmSync(d, { recursive: true, force: true })
})

/** Utility-like tokens in the demo's sources that no other file in the app uses. */
function demoOnlyClasses(): string[] {
  const tokens = (text: string) => text.split(/[\s"'`{}()<>,;=]+/).filter((t) => /^[!a-z][\w:./%[\]#!-]*$/i.test(t) && /[-[\]:]/.test(t))
  const inDemoSource = new Set(files(join(ROOT, PROTOTYPE), /\.tsx?$/).flatMap((f) => tokens(readFileSync(f, 'utf8'))).concat(tokens(readFileSync(join(ROOT, 'demo/index.html'), 'utf8'))))
  const elsewhere = new Set<string>()
  for (const dir of ['src', 'tests', 'netlify']) {
    for (const f of files(join(ROOT, dir), /\.(tsx?|css|html)$/)) {
      if (f.startsWith(join(ROOT, PROTOTYPE)) || f.startsWith(join(ROOT, 'tests', 'prototype'))) continue
      for (const t of tokens(readFileSync(f, 'utf8'))) elsewhere.add(t)
    }
  }
  for (const t of tokens(readFileSync(join(ROOT, 'index.html'), 'utf8'))) elsewhere.add(t)
  return [...inDemoSource].filter((t) => !elsewhere.has(t))
}

const selectorOf = (token: string) => `.${token.replace(/[^a-zA-Z0-9_-]/g, '\\$&')}`

describe('the demo, as built after the app', () => {
  it('is a page at /demo/ with its assets under /demo-assets/, and nothing of it anywhere else', () => {
    const names = files(out.both).map((f) => rel(out.both, f))
    expect(names).toContain('demo/index.html')
    expect(names.filter((n) => n.startsWith('demo-assets/') && n.endsWith('.js')).length).toBeGreaterThanOrEqual(1)
    expect(names.filter((n) => n.startsWith('demo-assets/') && n.endsWith('.css')).length).toBeGreaterThanOrEqual(1)
    expect(names.filter((n) => !inDemo(n) && /match|prototype|demo/i.test(n))).toEqual([])
    const html = readFileSync(join(out.both, 'demo/index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '')
    expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"/)
    expect(html).toMatch(/<title>Niyyah demo \(fictional\)<\/title>/)
    expect([...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('/demo-assets/') && u !== '/favicon.svg')).toEqual([])
    expect(html).not.toMatch(/manifest|\/assets\/|<script(?![^>]*type="module")[^>]*>/)
  })

  it('carries its own words and classes (the positive control for every absence below)', () => {
    const all = texts(out.both).filter((t) => t.f.startsWith('demo-assets/'))
    for (const marker of ['Demo example', 'Try another scenario', 'A first look at how meeting someone could work']) {
      expect(all.some((t) => t.text.includes(marker)), marker).toBe(true)
    }
    const css = all.filter((t) => t.f.endsWith('.css')).map((t) => t.text).join('\n')
    // Written in pieces: this file is itself kept out of the app's stylesheet.
    for (const token of [`min-h-${28}`, `aspect-[${4}/${3}]`, `max-w-[${22}rem]`]) expect(css, token).toContain(selectorOf(token))
  })

  it('contains no evaluation code, no credential, no network or storage API and no service worker', () => {
    const found = texts(out.both)
      .filter((t) => t.f.startsWith('demo-assets/') || t.f === 'demo/index.html')
      .flatMap(({ f, text }) => FORBIDDEN.filter((re) => re.test(text)).map((re) => `${f}: ${re}`))
    expect(found).toEqual([])
  })
})

describe('the app, with the demo built after it', () => {
  it('is byte for byte the app built alone: the demo build adds files and changes none', () => {
    const app = (dir: string) => files(dir).map((f) => rel(dir, f)).filter((n) => !inDemo(n)).sort()
    expect(app(out.both)).toEqual(app(out.alone))
    const changed = app(out.alone).filter((n) => !readFileSync(join(out.alone, n)).equals(readFileSync(join(out.both, n))))
    expect(changed).toEqual([])
  })

  it('has no demo page, module or word, and the worker names no demo file', () => {
    const found = texts(out.both)
      .filter((t) => !inDemo(t.f))
      .flatMap(({ f, text }) => MARKERS.filter((m) => text.includes(m)).map((m) => `${f}: ${m}`))
    expect(found).toEqual([])
    const sw = readFileSync(join(out.both, 'sw.js'), 'utf8')
    // The worker names the folder it leaves alone, but none of the demo's files.
    expect(sw).not.toMatch(/demo-assets\/[\w-]+\.\w+/)
  })

  it('leaves the demo out of the sitemap and does not disallow it in robots.txt (the page says noindex itself)', () => {
    expect(readFileSync(join(out.both, 'sitemap.xml'), 'utf8')).not.toMatch(/demo/)
    expect(readFileSync(join(out.both, 'robots.txt'), 'utf8')).not.toMatch(/demo/)
  })

  it('has none of the utility classes only the demo uses, so its stylesheet is unchanged by the demo’s presence', () => {
    const only = demoOnlyClasses()
    // The set must be real, or this proves nothing.
    expect(only).toEqual(expect.arrayContaining([`min-h-${28}`, `aspect-[${4}/${3}]`, `max-w-[${22}rem]`]))
    const css = texts(out.both).filter((t) => !inDemo(t.f) && t.f.endsWith('.css')).map((t) => t.text).join('\n')
    expect(css.length).toBeGreaterThan(10_000)
    const leaked = only.filter((t) => new RegExp(`${selectorOf(t).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}(?![\\w-])`).test(css))
    expect(leaked).toEqual([])
  })
})
