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

describe('tap targets', () => {
  const ui = read('components/ui.tsx')

  it('defines TextButton with a real min-height floor, sizing left to the caller', () => {
    const m = ui.match(/export function TextButton\([^)]*\)\s*{[\s\S]*?^}/m)
    expect(m, 'TextButton is missing from ui.tsx').toBeTruthy()
    expect(m![0]).toMatch(/min-h-11/)
  })

  it('is used at every real text-link action found in the audit', () => {
    const sites: [string, number][] = [
      ['components/Door.tsx', 2],
      ['components/Cohort.tsx', 2],
      ['components/ReportConcern.tsx', 2],
      ['components/Read.tsx', 2],
      ['components/BeforeYes.tsx', 2],
      ['components/ForgetMe.tsx', 1],
      ['components/Profile.tsx', 2],
      ['components/Ended.tsx', 1],
      ['components/Ending.tsx', 2],
      ['components/home/FollowUp.tsx', 1],
      ['components/home/StageBand.tsx', 2],
      ['components/home/WorkCard.tsx', 2],
      ['components/Vouch.tsx', 2],
      ['components/Couple.tsx', 2],
      ['components/Home.tsx', 2],
      ['components/Coach.tsx', 1],
    ]
    for (const [file, min] of sites) {
      const src = read(file)
      expect(src, `${file} doesn't import TextButton`).toMatch(/\bTextButton\b/)
      const uses = [...src.matchAll(/<TextButton\b/g)].length
      expect(uses, `${file} has ${uses} TextButton uses, expected at least ${min}`).toBeGreaterThanOrEqual(min)
    }
  })

  it('makes the whole privacy-toggle row the switch, not just the 28px track', () => {
    const trust = read('components/Trust.tsx')
    // Control is the row; it now owns role="switch" and the click handler.
    expect(trust).toMatch(/role="switch"[\s\S]{0,80}className="flex w-full items-start/)
    // Toggle is decorative only — no click handler, no switch role of its own.
    const toggleFn = trust.match(/function Toggle\([^)]*\)\s*{[\s\S]*?^}/m)
    expect(toggleFn, 'Toggle is missing from Trust.tsx').toBeTruthy()
    expect(toggleFn![0]).not.toMatch(/onClick|role=/)
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

  it("Cohort's contact field no longer forces the @ keyboard for a field that also takes a phone number", () => {
    expect(read('components/Cohort.tsx')).not.toContain('inputMode="email"')
  })

  it('sets enterKeyHint on the three forms with more than one field', () => {
    for (const file of ['components/Cohort.tsx', 'components/Vouch.tsx', 'components/RestoreMap.tsx'] as const) {
      expect(read(file), `${file} sets no enterKeyHint`).toMatch(/enterKeyHint=/)
    }
  })
})

describe('textareas cap unbounded growth', () => {
  it('gives the four textareas that grew without a limit a max-h, matching the pattern Coach/Home already used', () => {
    for (const [file, needle] of [
      ['components/Vouch.tsx', 'max-h-40'],
      ['components/QuestionCard.tsx', 'max-h-64'],
      ['components/Ending.tsx', 'max-h-40'],
      ['components/ReportConcern.tsx', 'max-h-40'],
    ] as const) {
      expect(read(file), `${file} is missing ${needle}`).toContain(needle)
    }
  })
})

describe('loading states — the one silent button the audit found', () => {
  it('gives ReportConcern a Spinner and a label change while sending, matching KeepMap/Cohort', () => {
    const src = read('components/ReportConcern.tsx')
    expect(src).toMatch(/Spinner/)
    expect(src).toMatch(/Sending…/)
  })

  it('gives RestoreMap a text label beside its spinner, matching KeepMap', () => {
    expect(read('components/RestoreMap.tsx')).toMatch(/Checking…/)
  })
})

describe('text wrapping — a variable label beside a fixed-shape badge', () => {
  it('gives Read and Reflection\'s StateTag rows a wrap boundary on the label, like Disclose already has', () => {
    for (const file of ['components/Read.tsx', 'components/Reflection.tsx'] as const) {
      const src = read(file)
      const line = src.split('\n').find((l) => l.includes('{d.label}'))
      expect(line, `${file} has no {d.label} line`).toMatch(/min-w-0 flex-1/)
    }
  })

  it('wraps Coach\'s quick-reply chip label so a long one can\'t push the arrow onto its own line', () => {
    const src = read('components/Coach.tsx')
    expect(src).toMatch(/<span className="min-w-0 flex-1 text-left">\{s\.label\}<\/span>/)
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
