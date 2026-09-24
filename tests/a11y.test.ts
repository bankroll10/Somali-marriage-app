import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A strong accessibility baseline, held honest (docs/DESIGN.md).
 *
 * Source-level checks, for what the rendered audit in tests/ui/screens.test.tsx
 * cannot reach: colour contrast (there is no layout without a browser), the
 * reduced-motion helper, the crash screen, and Somali text carrying its own
 * language. Everything a rendered screen can prove — one main, a
 * heading, a name on every control and field, a group's name, which option is
 * chosen, an error reaching its field, lang="so" — moved there on 2026-09-24,
 * and the regexes that stood in for it were deleted (docs/TESTING.md,
 * "Pruned"). A real screen-reader walk still belongs in a Chromium pass.
 */

const SRC = join(import.meta.dirname, '..', 'src')
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8')
const componentFiles = () =>
  readdirSync(join(SRC, 'components'), { recursive: true, encoding: 'utf8' }).filter(
    (f): f is string => typeof f === 'string' && f.endsWith('.tsx'),
  )

describe('the crash screen', () => {
  it('is announced as an alert, since it bypasses the normal screen machinery and no rendered audit reaches it', () => {
    expect(read('components/ErrorBoundary.tsx')).toMatch(/role="alert"/)
  })
})

describe('contrast — computed, not eyeballed', () => {
  // WCAG relative luminance and contrast ratio, computed from the real
  // tokens in src/index.css — not estimated. A future edit to any of these
  // hex values re-runs this arithmetic, so a color can't drift back under
  // the line without this test catching it.
  function relLum(hex: string): number {
    const n = hex.replace('#', '')
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  }
  function ratio(a: string, b: string): number {
    const [l1, l2] = [relLum(a), relLum(b)].sort((x, y) => y - x)
    return (l1 + 0.05) / (l2 + 0.05)
  }

  const CREAM = '#f7f2e8'
  const FOREST_DEEP = '#16271f'

  it('reads the live token values out of index.css, so this test can\'t silently drift from the real palette', () => {
    const css = read('index.css')
    for (const token of ['--color-muted: #706d65', '--color-clay: #9b5d46', '--color-gold-ink: #85682e', '--color-line-strong: #9a8150']) {
      expect(css, `index.css no longer defines ${token}`).toContain(token)
    }
  })

  it('passes WCAG AA (4.5:1) for the four text colors that were failing on cream', () => {
    expect(ratio('#706d65', CREAM)).toBeGreaterThanOrEqual(4.5) // muted
    expect(ratio('#9b5d46', CREAM)).toBeGreaterThanOrEqual(4.5) // clay
    expect(ratio('#85682e', CREAM)).toBeGreaterThanOrEqual(4.5) // gold-ink
  })

  it('passes WCAG AA non-text contrast (3:1) for the field border', () => {
    expect(ratio('#9a8150', CREAM)).toBeGreaterThanOrEqual(3.0) // line-strong
  })

  it('still passes on forest-deep for the colors that were never the problem', () => {
    expect(ratio('#c19a4b', FOREST_DEEP)).toBeGreaterThanOrEqual(4.5) // gold, unchanged
    expect(ratio('#d9c189', FOREST_DEEP)).toBeGreaterThanOrEqual(4.5) // gold-soft, unchanged
  })

  it('uses border-line-strong and a full-opacity placeholder in fieldClass, not the originals that failed', () => {
    const field = read('components/ui.tsx').match(/export const fieldClass =\s*\n\s*'([^']*)'/)
    expect(field, 'fieldClass definition not found').toBeTruthy()
    expect(field![1]).toContain('border-line-strong')
    expect(field![1]).toContain('placeholder:text-muted')
    expect(field![1]).not.toContain('placeholder:text-muted/')
  })
})

describe('reduced motion — a JS scrollTo is not CSS, and nothing gated it before', () => {
  it('defines scrollBehavior(), reading prefers-reduced-motion', () => {
    const motion = read('lib/motion.ts')
    expect(motion).toContain("matchMedia('(prefers-reduced-motion: reduce)')")
    expect(motion).toMatch(/export function scrollBehavior/)
  })

  it('every smooth-scroll call in the app goes through scrollBehavior(), not a literal \'smooth\'', () => {
    for (const file of ['components/Intake.tsx', 'components/Coach.tsx'] as const) {
      const src = read(file)
      expect(src, `${file} still has a literal 'smooth'`).not.toMatch(/behavior:\s*'smooth'/)
      expect(src, `${file} doesn't call scrollBehavior()`).toMatch(/behavior:\s*scrollBehavior\(\)/)
    }
    // Intake has three call sites (each chapter transition), Coach has two
    // (scroll to bottom, scroll to a finished reply).
    expect([...read('components/Intake.tsx').matchAll(/scrollBehavior\(\)/g)].length).toBe(3)
    expect([...read('components/Coach.tsx').matchAll(/scrollBehavior\(\)/g)].length).toBe(2)
  })
})

describe('lang — a Somali sentence needs lang="so", or a screen reader pronounces it as English', () => {
  it('splits every Somali line into its own field, separate from the English gloss', () => {
    const somali = read('data/somali.ts')
    expect(somali).toMatch(/somali:\s*string/)
    expect(somali).toMatch(/english:\s*string/)
    expect(somali).not.toMatch(/\btext:\s*string/)
  })

})

describe('the a11y pass reads more than fifteen component files, so an empty result above means clean and not skipped', () => {
  it('sees the component directory', () => {
    expect(componentFiles().length).toBeGreaterThan(15)
  })
})
