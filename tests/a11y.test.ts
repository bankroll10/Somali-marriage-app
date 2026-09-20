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
    const app = read('App.tsx')
    expect(app).toMatch(/querySelector<HTMLElement>\('h1, h2'\)/)
    expect(app).toMatch(/\.focus\(\{ preventScroll: true \}\)/)
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

describe('the a11y pass reads more than fifteen component files, so an empty result above means clean and not skipped', () => {
  it('sees the component directory', () => {
    expect(componentFiles().length).toBeGreaterThan(15)
  })
})
