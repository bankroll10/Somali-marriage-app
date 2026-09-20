import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The mobile-craft pass, held honest (docs/MOBILE.md).
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

  it('applies pt-safe to every screen root with no top padding of its own', () => {
    for (const [file, needle] of [
      ['components/Door.tsx', 'pb-16 pt-safe'],
      ['components/BeforeYes.tsx', 'pb-16 pt-safe'],
      ['components/Read.tsx', 'pb-16 pt-safe'],
      ['components/SampleIntroduction.tsx', 'pb-16 pt-safe'],
      ['components/Families.tsx', 'pb-16 pt-safe'],
      ['components/Plus.tsx', 'pb-16 pt-safe'],
      ['components/Couple.tsx', 'pb-16 pt-safe'],
      ['components/Vouch.tsx', 'pb-16 pt-safe'],
      ['components/Home.tsx', 'pb-16 pt-safe'],
      ['components/Trust.tsx', 'pb-20 pt-safe'],
      ['components/Ending.tsx', 'pb-20 pt-safe'],
      ['components/Ended.tsx', 'pb-20 pt-safe'],
      ['components/Reflection.tsx', 'pb-24 pt-safe'],
      ['components/Coach.tsx', 'pb-16 pt-safe'],
    ] as const) {
      expect(read(file), `${file} is missing "${needle}"`).toContain(needle)
    }
  })

  it('replaces a screen root that already had its own pt-6/pt-8 with the matching safe variant, not a bare pt-safe', () => {
    // A bare env()-only class on top of an existing pt-6/pt-8 would fight
    // the same CSS property rather than add to it — this is the bug this
    // pass found and the reason pt-safe-6/pt-safe-8 exist at all.
    for (const [file, needle] of [
      ['components/Welcome.tsx', 'pt-safe-8'],
      ['components/Situation.tsx', 'pt-safe-6'],
      ['components/Hook.tsx', 'pt-safe-6'],
      ['components/Identity.tsx', 'pt-safe-6'],
      ['components/Philosophy.tsx', 'pt-safe-6'],
    ] as const) {
      const src = read(file)
      expect(src, `${file} is missing ${needle}`).toContain(needle)
      expect(src, `${file} still has a bare pt-6/pt-8`).not.toMatch(/\bpt-[68]\b/)
    }
  })

  it('gives the two sticky top bars pt-safe-sticky, and the non-sticky ScreenHeader py-3.5 unchanged', () => {
    const ui = read('components/ui.tsx')
    expect(ui).toMatch(/sticky \? 'pb-3\.5 pt-safe-sticky' : 'py-3\.5'/)
    expect(read('components/Intake.tsx')).toContain('pb-3.5 pt-safe-sticky')
  })

  it('gives every fixed or flex-pinned bottom bar pb-safe-bar', () => {
    for (const file of ['components/ShortMap.tsx', 'components/Intake.tsx'] as const) {
      expect(read(file), `${file} is missing pb-safe-bar`).toContain('pb-safe-bar')
    }
    // Coach's composer has two branches (locked, and the live form) that
    // both sit at the same visual bottom edge — both need it.
    const coach = read('components/Coach.tsx')
    expect([...coach.matchAll(/pb-safe-bar/g)].length).toBeGreaterThanOrEqual(2)
  })
})

describe('the mobile-craft pass reads more than fifteen component files, so an empty result above means clean and not skipped', () => {
  it('sees the component directory', () => {
    const files = readdirSync(join(SRC, 'components')).filter((f) => f.endsWith('.tsx'))
    expect(files.length).toBeGreaterThan(15)
  })
})
