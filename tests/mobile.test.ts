import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The mobile-craft pass, held honest (docs/DESIGN.md).
 *
 * Structural/behavioral only — nothing here touches copy, so nothing here
 * should ever conflict with tests/voice.test.ts or tests/load.test.ts's
 * pinned content. Scanned source, no jsdom, in the shape of those two.
 */

const SRC = join(import.meta.dirname, '..', 'src')
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8')

describe('safe-area insets', () => {
  const css = read('index.css')

  it('defines the four safe-area utilities, each falling back to 0px', () => {
    for (const cls of ['.pt-safe', '.pt-safe-6', '.pt-safe-8', '.pt-safe-sticky', '.pb-safe-bar']) {
      expect(css, `index.css is missing ${cls}`).toContain(cls)
    }
    // Every declaration must fall back to 0px so a device without the
    // feature renders exactly as it did before this pass.
    const envUses = [...css.matchAll(/env\(safe-area-inset-\w+(?:,\s*([^)]*))?\)/g)]
    expect(envUses.length).toBeGreaterThan(0)
    for (const [, fallback] of envUses) expect(fallback?.trim()).toBe('0px')
  })

  it('is the only place a raw env(safe-area-inset…) is written', () => {
    // Everything else goes through the named utilities, so the mechanism
    // stays centralized and this test is the one place that has to know
    // the real property.
    const files = readdirSync(join(SRC, 'components')).filter((f) => f.endsWith('.tsx'))
    for (const f of files) {
      expect(read(`components/${f}`), `${f} writes env(safe-area…) directly`).not.toMatch(/env\(safe-area-inset/)
    }
  })

})

describe('forms — the 16px floor, so a phone does not zoom in on focus', () => {
  it('renders no input, select or textarea under 1rem', () => {
    // iOS Safari zooms the viewport on focus into any field under 16px.
    // Every field in the app was already meant to share fieldClass, so the
    // bug was always a text-size class living beside it, not a field
    // without one — this greps for exactly that shape.
    const files = readdirSync(join(SRC, 'components'), { recursive: true, encoding: 'utf8' }).filter(
      (f): f is string => typeof f === 'string' && f.endsWith('.tsx'),
    )
    const under16 = /text-\[0\.(?:[1-8]\d?|9[0-9])rem\][^`]*\$\{fieldClass\}|\$\{fieldClass\}[^`]*text-\[0\.(?:[1-8]\d?|9[0-9])rem\]/
    for (const f of files) {
      const src = read(`components/${f}`)
      expect(src, `${f} has a field under 1rem`).not.toMatch(under16)
    }
  })

})

describe('viewport meta and browser chrome', () => {
  const html = readFileSync(join(import.meta.dirname, '..', 'index.html'), 'utf8')

  it('no longer blocks pinch-zoom, now that every field clears the 16px floor', () => {
    const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]*)"/)
    expect(viewport, 'no viewport meta tag').toBeTruthy()
    expect(viewport![1]).not.toMatch(/maximum-scale/)
    expect(viewport![1]).toMatch(/viewport-fit=cover/)
  })

  it('tints the OS chrome the same forest color under system dark mode, not a mismatched default', () => {
    expect([...html.matchAll(/<meta name="theme-color"/g)].length).toBe(2)
    expect(html).toMatch(/media="\(prefers-color-scheme: dark\)"/)
  })
})

describe('the mobile-craft pass reads more than fifteen component files, so an empty result above means clean and not skipped', () => {
  it('sees the component directory', () => {
    const files = readdirSync(join(SRC, 'components')).filter((f) => f.endsWith('.tsx'))
    expect(files.length).toBeGreaterThan(15)
  })
})
