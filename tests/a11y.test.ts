import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A strong accessibility baseline, held honest (docs/ACCESS.md).
 *
 * Source-level checks, no jsdom, in the shape of tests/mobile.test.ts and
 * tests/voice.test.ts. A real screen-reader/keyboard walk still belongs in a
 * Chromium pass — these are the regressions a source scan can actually catch:
 * a heading disappearing, a label being dropped, a live region losing its
 * role, a selection state losing its aria-pressed.
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
      ['components/Coach.tsx', '<h1 className="font-display text-[1.05rem] font-medium leading-tight text-ink">'],
      ['components/Reflection.tsx', '<h1 className="sr-only">Building your map</h1>'],
      ['components/Intake.tsx', '<h2 className="text-[0.82rem] font-semibold uppercase tracking-[0.16em] text-gold">'],
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
  it('gives every previously mainless screen a <main> or role="main"', () => {
    for (const [file, needle] of [
      ['components/Situation.tsx', '<main className="flex flex-1 flex-col justify-center py-10">'],
      ['components/Hook.tsx', '<main className="flex flex-1 flex-col justify-center py-10">'],
      ['components/Identity.tsx', '<main className="flex flex-1 flex-col justify-center py-10">'],
      ['components/Coach.tsx', '<main className="mx-auto max-w-2xl px-5 py-9">'],
      ['components/Coach.tsx', 'role="main"'],
    ] as const) {
      expect(read(file), `${file} is missing ${needle}`).toContain(needle)
    }
  })

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

  it('gives Identity\'s gender chooser a group label, even though it has no visible one', () => {
    expect(read('components/Identity.tsx')).toContain('id="identity-gender-label"')
  })
})

describe('selection state — a screen reader has to be told what is chosen, not just shown', () => {
  it('gives every single-select "big card" component a role and aria-checked, not just a color change', () => {
    for (const file of [
      'components/Read.tsx',
      'components/BeforeYes.tsx',
      'components/Identity.tsx',
      'components/ReportConcern.tsx',
    ] as const) {
      const src = read(file)
      expect(src, `${file} is missing role="radio"`).toContain('role="radio"')
      expect(src, `${file} is missing aria-checked`).toMatch(/aria-checked=/)
    }
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

  it('gives RestoreMap\'s code field an id-linked error and aria-invalid, not just a visible message', () => {
    const src = read('components/RestoreMap.tsx')
    expect(src).toContain('id="restore-code-status"')
    expect(src).toMatch(/aria-describedby=\{state !== 'idle' && state !== 'checking' \? 'restore-code-status' : undefined\}/)
    expect(src).toMatch(/aria-invalid=\{state !== 'idle' && state !== 'checking'\}/)
  })
})

describe('the a11y pass reads more than fifteen component files, so an empty result above means clean and not skipped', () => {
  it('sees the component directory', () => {
    expect(componentFiles().length).toBeGreaterThan(15)
  })
})
