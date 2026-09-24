import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A strong accessibility baseline, held honest (docs/ACCESS.md).
 *
 * Source-level checks, for what the rendered audit in tests/ui/screens.test.tsx
 * cannot reach: colour contrast (there is no layout without a browser), the
 * reduced-motion helper, the crash screen, and the few components no rendered
 * screen shows yet. Everything a rendered screen can prove — one main, a
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

describe('structure — every screen has a heading, and focus follows it', () => {
  it('gives App.tsx a mechanism that moves focus to the new screen\'s heading', () => {
    const hook = read('hooks/useFocusHeading.ts')
    expect(hook).toMatch(/querySelector<HTMLElement>\('h1, h2'\)/)
    expect(hook).toMatch(/\.focus\(\{ preventScroll: true \}\)/)
    expect(read('App.tsx')).toMatch(/useFocusHeading\(screenRef, n\.screen\)/)
  })

  it('gives Vouch.tsx the same fix locally, since its phases are local state App.tsx\'s screen-swap effect never sees', () => {
    expect(read('components/Vouch.tsx')).toMatch(/useFocusHeading\(mainRef, phase\)/)
  })

  it('gives every previously headingless screen a real h1 or h2', () => {
    for (const [file, needle] of [
      ['components/ShortMap.tsx', '<h1 className="font-display text-[1.05rem] font-medium text-ink">Being counted</h1>'],
      ['components/Intake.tsx', '<h2 className="text-[0.82rem] font-semibold uppercase tracking-[0.16em] text-gold-ink">'],
    ] as const) {
      expect(read(file), `${file} is missing its heading`).toContain(needle)
    }
  })

  it('turns Home\'s three visually-styled section labels into real headings', () => {
    for (const [file, tag] of [
      ['components/home/FollowUp.tsx', 'Since last time'],
      ['components/home/WorkCard.tsx', 'Your work'],
      ['components/home/StageBand.tsx', 'Where you are · {st.label}'],
    ] as const) {
      const lines = read(file).split('\n')
      const at = lines.findIndex((l) => l.includes(tag))
      expect(at, `${file} no longer has "${tag}"`).toBeGreaterThanOrEqual(0)
      const nearby = lines.slice(Math.max(0, at - 1), at + 1).join('\n')
      expect(nearby, `${file} lost its "${tag}" heading`).toMatch(/<h2\b/)
    }
  })
})

describe('landmarks — one main per screen, even the ones that had none', () => {

  it('announces the crash screen as an alert, since it bypasses the normal screen machinery', () => {
    expect(read('components/ErrorBoundary.tsx')).toMatch(/role="alert"/)
  })
})

describe('list semantics', () => {
  it('renders Philosophy\'s bridges and principles as <ul>/<li>, matching its own creed list', () => {
    const src = read('components/Philosophy.tsx')
    expect(src).toMatch(/<ul className="space-y-3">\s*\{bridges\.map/)
    expect(src).toMatch(/<ul className="mt-6 space-y-4">\s*\{principles\.map/)
  })
})

describe('names — the three fields that had only a placeholder', () => {
  it('gives Coach\'s and ReportConcern\'s textareas an accessible name', () => {
    expect(read('components/Coach.tsx')).toMatch(/aria-label=\{`Tell your \$\{activeMode\.label\.toLowerCase\(\)\} what's going on`\}/)
    expect(read('components/ReportConcern.tsx')).toContain('aria-label="Anything else it helps to know"')
  })

  it('labels the intake\'s free-text answer from its own visible question prompt', () => {
    const src = read('components/QuestionCard.tsx')
    expect(src).toMatch(/id=\{`question-\$\{question\.id\}`\}/)
    expect(src).toMatch(/aria-labelledby=\{`question-\$\{question\.id\}`\}/)
  })
})

describe('group semantics — a picker\'s buttons need a name for the group, not just each other', () => {
  it('wraps every previously-ungrouped chip picker in role="group" with aria-labelledby', () => {
    for (const [file, count] of [
      ['components/Situation.tsx', 3],
      ['components/Door.tsx', 2],
      ['components/Cohort.tsx', 1],
    ] as const) {
      const hits = [...read(file).matchAll(/role="(?:group|radiogroup)" aria-labelledby=/g)].length
      expect(hits, `${file} has ${hits} grouped pickers, expected at least ${count}`).toBeGreaterThanOrEqual(count)
    }
  })

})

describe('selection state — a screen reader has to be told what is chosen, not just shown', () => {
  it('gives ReportConcern\'s reason cards a role and aria-checked, not just a color change', () => {
    // The read's, the eleven's and Identity's cards are checked on the
    // rendered screen now (tests/ui/screens.test.tsx); ReportConcern is not
    // on a screen that suite reaches yet.
    const src = read('components/ReportConcern.tsx')
    expect(src).toContain('role="radio"')
    expect(src).toMatch(/aria-checked=/)
    // QuestionCard's OptionRow backs both a single-select and a genuine
    // multi-select, so its role is computed per kind rather than a literal.
    expect(read('components/QuestionCard.tsx')).toMatch(/aria-checked=\{selected\}/)
  })

  it('gives QuestionCard\'s multi-select a checkbox role, since it genuinely allows more than one', () => {
    expect(read('components/QuestionCard.tsx')).toContain("role={kind === 'radio' ? 'radio' : 'checkbox'}")
  })
})

describe('live-region announcements — a silent text swap is a silent success or failure', () => {
  it('announces the five clipboard/share confirmations that previously swapped text with no live region', () => {
    for (const file of [
      'components/VouchRow.tsx',
      'components/InviteRow.tsx',
      'components/home/FollowUp.tsx',
      'components/Ending.tsx',
    ] as const) {
      const src = read(file)
      expect(src, `${file} doesn't import Announce`).toMatch(/\bAnnounce\b/)
      expect(src, `${file} doesn't render <Announce`).toContain('<Announce message=')
    }
    // Ending has two separate confirmations (keep, and the two shares).
    expect([...read('components/Ending.tsx').matchAll(/<Announce message=/g)].length).toBeGreaterThanOrEqual(2)
  })

  it('gives every comparable submit-error message role="status", matching its sibling elsewhere in the app', () => {
    for (const [file, needle] of [
      ['components/Cohort.tsx', "role=\"status\" className=\"text-[0.85rem] text-clay text-pretty\">\n              That didn"],
      ['components/BeforeYes.tsx', 'role="status" className="mt-3 text-[0.85rem] text-clay text-pretty"'],
      ['components/Vouch.tsx', 'role="status" className="mt-3 text-[0.85rem] text-clay"'],
      ['components/ReportConcern.tsx', 'role="status" className="mt-6 text-[0.85rem] leading-relaxed text-muted text-pretty"'],
      ['components/ReportConcern.tsx', 'role="status" className="text-[0.82rem] text-clay"'],
    ] as const) {
      expect(read(file), `${file} is missing ${needle.slice(0, 40)}`).toContain(needle)
    }
  })
})

describe('form validation — the error text has to reach the field, not just the screen', () => {
  it('marks Cohort\'s contact field aria-invalid when its own hint is showing', () => {
    expect(read('components/Cohort.tsx')).toMatch(/aria-invalid=\{!!contactHint\}/)
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

describe('gold on a light background is gold-ink, not gold', () => {
  it('uses gold-ink wherever a kicker label sits on cream or a light card, and leaves the dark-hero sites alone', () => {
    // The dark surfaces where plain gold/gold-soft already pass and must
    // stay unchanged: Welcome and Philosophy's dark heroes, ScriptCard (a
    // forest-deep card throughout), RestoreMap (rendered inside Welcome's
    // hero), Trust's "Our promise" section (bg-forest), and the two dark
    // hero sections each in Ending/Home/Reflection.
    const darkSitesKeepPlainGold: [string, string][] = [
      ['components/Welcome.tsx', 'text-gold-soft'],
      ['components/ScriptCard.tsx', 'text-gold-soft'],
      ['components/RestoreMap.tsx', 'text-gold-soft'],
      ['components/Trust.tsx', 'text-gold-soft'],
    ]
    for (const [file, needle] of darkSitesKeepPlainGold) {
      expect(read(file), `${file} lost its plain ${needle}`).toContain(needle)
    }
    // A sample of the light-background sites that had to move.
    const lightSitesUseGoldInk: [string, string][] = [
      ['components/BeforeYes.tsx', 'text-gold-ink'],
      ['components/Read.tsx', 'text-gold-ink'],
      ['components/Situation.tsx', 'text-gold-ink'],
      ['components/home/StageBand.tsx', 'text-gold-ink'],
      ['components/home/FollowUp.tsx', 'text-gold-ink'],
      ['components/Intake.tsx', 'text-gold-ink'],
    ]
    for (const [file, needle] of lightSitesUseGoldInk) {
      expect(read(file), `${file} is missing ${needle}`).toContain(needle)
    }
  })

  it('never doubles the suffix (the regex-ordering bug this pass found and fixed)', () => {
    for (const f of componentFiles()) {
      expect(read(`components/${f}`), `${f} has a doubled gold-ink suffix`).not.toMatch(/gold-ink-ink/)
    }
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
