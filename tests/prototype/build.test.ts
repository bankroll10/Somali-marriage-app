import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PROTOTYPE, ROOT, walk } from './support'

/**
 * BUILD OUTPUT — production contains nothing of the matching prototype
 * (docs/MATCH-PROTOTYPE.md).
 *
 * Two real Vite builds into temporary folders. One is the app, built as it is
 * deployed. The other is the prototype's own page, built only here, as a
 * positive control: it proves the markers and classes this test looks for are
 * real, so their absence from the app's build means something. The classes
 * matter as much as the files: Tailwind reads every file under the project, so
 * without src/index.css's `@source not` the prototype's utility classes would be
 * generated into the app's stylesheet and change production's output.
 */

const out: { app: string; prototype: string } = { app: '', prototype: '' }

const files = (dir: string, accept = /./): string[] => walk(dir, accept)
const texts = (dir: string) => files(dir, /\.(html|js|css|json|txt|xml|webmanifest)$/).map((f) => ({ f: f.slice(dir.length + 1), text: readFileSync(f, 'utf8') }))

/** Markers that exist only in the prototype's source. */
const MARKERS = ['Prototype fixture', 'Prototype controls', 'A first look at how meeting someone could work', 'MatchPrototype', 'prototype/match', 'What is real here']

beforeAll(async () => {
  out.app = mkdtempSync(join(tmpdir(), 'niyyah-app-'))
  out.prototype = mkdtempSync(join(tmpdir(), 'niyyah-proto-'))
  await build({ root: ROOT, logLevel: 'silent', build: { outDir: out.app, emptyOutDir: true } })
  await build({
    root: ROOT,
    configFile: false,
    logLevel: 'silent',
    plugins: [react(), tailwindcss()],
    build: { outDir: out.prototype, emptyOutDir: true, rollupOptions: { input: join(ROOT, 'match.html') } },
  })
}, 120_000)

afterAll(() => {
  for (const d of [out.app, out.prototype]) if (d) rmSync(d, { recursive: true, force: true })
})

/** Utility-like tokens in the prototype's sources that no other file in the app uses. */
function prototypeOnlyClasses(): string[] {
  const tokens = (text: string) => text.split(/[\s"'`{}()<>,;=]+/).filter((t) => /^[!a-z][\w:./%[\]#!-]*$/i.test(t) && /[-[\]:]/.test(t))
  const inPrototype = new Set(files(join(ROOT, PROTOTYPE), /\.tsx?$/).flatMap((f) => tokens(readFileSync(f, 'utf8'))).concat(tokens(readFileSync(join(ROOT, 'match.html'), 'utf8'))))
  const elsewhere = new Set<string>()
  for (const dir of ['src', 'tests', 'netlify']) {
    for (const f of files(join(ROOT, dir), /\.(tsx?|css|html)$/)) {
      if (f.startsWith(join(ROOT, PROTOTYPE)) || f.startsWith(join(ROOT, 'tests', 'prototype'))) continue
      for (const t of tokens(readFileSync(f, 'utf8'))) elsewhere.add(t)
    }
  }
  for (const t of tokens(readFileSync(join(ROOT, 'index.html'), 'utf8'))) elsewhere.add(t)
  return [...inPrototype].filter((t) => !elsewhere.has(t))
}

const selectorOf = (token: string) => `.${token.replace(/[^a-zA-Z0-9_-]/g, '\\$&')}`

describe('the app as built', () => {
  it('has no prototype page, no module of it and none of its words', () => {
    const names = files(out.app).map((f) => f.slice(out.app.length + 1))
    expect(names.filter((n) => /match|prototype/i.test(n))).toEqual([])
    const found = texts(out.app).flatMap(({ f, text }) => MARKERS.filter((m) => text.includes(m)).map((m) => `${f}: ${m}`))
    expect(found).toEqual([])
  })

  it('has none of the utility classes only the prototype uses, so its stylesheet is unchanged by the prototype’s presence', () => {
    const only = prototypeOnlyClasses()
    // The set must be real, or this proves nothing. (Written in pieces: this file is itself kept out of the app's stylesheet.)
    expect(only).toEqual(expect.arrayContaining([`min-h-${28}`, `aspect-[${4}/${3}]`, `max-w-[${22}rem]`]))
    const css = texts(out.app).filter((t) => t.f.endsWith('.css')).map((t) => t.text).join('\n')
    expect(css.length).toBeGreaterThan(10_000)
    const leaked = only.filter((t) => new RegExp(`${selectorOf(t).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}(?![\\w-])`).test(css))
    expect(leaked).toEqual([])
  })
})

describe('the prototype’s own build, as the positive control', () => {
  it('contains its page, its words and its classes', () => {
    const names = files(out.prototype).map((f) => f.slice(out.prototype.length + 1))
    expect(names).toContain('match.html')
    const all = texts(out.prototype)
    for (const marker of ['Prototype fixture', 'Prototype controls', 'A first look at how meeting someone could work']) {
      expect(all.some((t) => t.text.includes(marker)), marker).toBe(true)
    }
    const css = all.filter((t) => t.f.endsWith('.css')).map((t) => t.text).join('\n')
    for (const token of [`min-h-${28}`, `aspect-[${4}/${3}]`, `max-w-[${22}rem]`]) expect(css, token).toContain(selectorOf(token))
    expect(statSync(join(out.prototype, 'match.html')).size).toBeGreaterThan(200)
    expect(readdirSync(out.prototype).length).toBeGreaterThan(1)
  })
})
