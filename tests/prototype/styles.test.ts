import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ROOT } from './support'

/**
 * STYLES — the prototype looks like the app without being able to change it
 * (docs/MATCH-PROTOTYPE.md).
 *
 * Tailwind reads every file under the project root. So the app's own
 * stylesheet names three paths it must not read (`@source not`), and the
 * prototype, which would otherwise inherit that, has a stylesheet of its own
 * that carries a verbatim copy of the app's typefaces, theme and base styles.
 * What the build does with the result is held by tests/prototype/build.test.ts;
 * here the copies are held equal to their originals, so they cannot drift.
 */

const app = readFileSync(join(ROOT, 'src/index.css'), 'utf8')
const proto = readFileSync(join(ROOT, 'src/prototype/match/prototype.css'), 'utf8')

/** From `start` to its balanced closing brace. */
function block(css: string, start: string): string {
  const i = css.indexOf(start)
  if (i < 0) throw new Error(`no ${start}`)
  let depth = 0
  for (let j = css.indexOf('{', i); j < css.length; j++) {
    if (css[j] === '{') depth++
    if (css[j] === '}' && --depth === 0) return css.slice(i, j + 1)
  }
  throw new Error(`unbalanced ${start}`)
}
const flat = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim()

describe('the app’s stylesheet', () => {
  it('keeps the prototype, its page and its tests out of what Tailwind reads', () => {
    for (const path of ['./prototype', '../match.html', '../tests/prototype']) expect(app).toContain(`@source not "${path}";`)
  })
})

describe('the prototype’s stylesheet', () => {
  it('does not import the app’s, which would hand it the exclusions above', () => {
    expect(proto).not.toMatch(/@import\s+['"][^'"]*index\.css['"]/)
    expect(proto).toContain("@import 'tailwindcss' source(none);")
  })

  it('reads only the prototype, its page and the one shared component file', () => {
    expect([...proto.matchAll(/^@source\s+'([^']+)';/gm)].map((m) => m[1])).toEqual(['.', '../../../match.html', '../../components/ui.tsx'])
  })

  it('carries the app’s theme and base styles unchanged', () => {
    expect(flat(block(proto, '@theme {'))).toBe(flat(block(app, '@theme {')))
    expect(flat(block(proto, '@layer base {'))).toBe(flat(block(app, '@layer base {')))
  })

  it('carries the app’s four typeface declarations, with the path from its own folder', () => {
    const faces = (css: string) => [...css.matchAll(/@font-face\s*\{[\s\S]*?\n\}/g)].map((m) => flat(m[0]))
    expect(faces(app)).toHaveLength(4)
    expect(faces(proto)).toEqual(faces(app).map((f) => f.replace("url('./assets/", "url('../../assets/")))
  })
})
