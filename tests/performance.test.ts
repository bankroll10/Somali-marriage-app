import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The performance pass, held honest (docs/PERFORMANCE.md).
 *
 * Structural only — scanned source, no jsdom, in the shape of
 * tests/mobile.test.ts and tests/load.test.ts. What it guards is the one
 * thing a future change is most likely to quietly undo: every screen past
 * Welcome loading lazily, and a streaming reply never forcing more than one
 * render per frame. Both were measured, not assumed — the numbers are in
 * docs/PERFORMANCE.md.
 */

const SRC = join(import.meta.dirname, '..', 'src')
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8')

describe('screens past Welcome load lazily', () => {
  const app = read('App.tsx')

  // Every screen file the switch in AppScreen can reach, by its filename
  // under src/components — kept as one list so a new screen added to the
  // switch without a matching lazy() import fails loudly here rather than
  // growing the initial bundle silently.
  const SCREEN_FILES = [
    'Identity',
    'Situation',
    'Hook',
    'Intake',
    'Reflection',
    'Home',
    'Coach',
    'Trust',
    'Philosophy',
    'Profile',
    'SampleIntroduction',
    'Read',
    'Door',
    'BeforeYes',
    'Families',
    'Couple',
    'Vouch',
    'Plus',
    'Ending',
    'Ended',
    'ShortMap',
    'Cohort',
  ]

  it('imports Welcome eagerly — the one screen almost every session paints first', () => {
    expect(app).toMatch(/^import Welcome from '\.\/components\/Welcome'$/m)
  })

  it('imports every other screen behind lazy(), not a static import', () => {
    for (const file of SCREEN_FILES) {
      expect(app, `./components/${file} should be lazy-loaded`).toMatch(
        new RegExp(`lazy\\(\\(\\) => import\\('\\./components/${file}'\\)`),
      )
    }
    // A static (non-lazy) import of any screen component, besides Welcome,
    // would put it back in the eager bundle — this is the regression the
    // list above exists to catch.
    const staticScreenImports = [...app.matchAll(/^import \w+(?:, \{[^}]*\})? from '\.\/components\/(\w+)'$/gm)]
      .map((m) => m[1])
      .filter((name) => name !== 'Welcome')
    expect(staticScreenImports).toEqual([])
  })

  it('wraps the active screen in Suspense, so a lazy chunk has somewhere to resolve into', () => {
    expect(app).toContain('<Suspense')
    expect(app).toContain('<AppScreen n={n} />')
  })
})

describe('a streaming reply never forces more than one render per frame', () => {
  const coach = read('components/Coach.tsx')

  it('coalesces onChunk writes through requestAnimationFrame rather than writing every chunk', () => {
    expect(coach).toContain('requestAnimationFrame(flushPending)')
    // The callback itself must not call writeReply directly — that was the
    // shape that re-parsed the whole answer-so-far in RichText on every
    // single network delta.
    const onChunk = coach.match(/askCoach\([^)]*\(soFar\) => \{([\s\S]*?)\n    \}\)/)
    expect(onChunk, 'could not find the onChunk callback passed to askCoach').toBeTruthy()
    expect(onChunk![1]).not.toContain('writeReply(soFar)')
  })

  it('still flushes the latest text once the stream ends, so a cut-off reply never drops a character', () => {
    // flushPending must be called between the awaited call resolving and the
    // decision to show the answer or the cut-off notice — otherwise the last
    // coalesced frame could be left un-rendered on a mid-stream drop.
    const askIndex = coach.indexOf('const reply = await askCoach(')
    const flushIndex = coach.indexOf('flushPending()', askIndex)
    const decisionIndex = coach.indexOf('if (reply.live) onSpendReply()', askIndex)
    expect(askIndex).toBeGreaterThan(-1)
    expect(flushIndex).toBeGreaterThan(askIndex)
    expect(flushIndex).toBeLessThan(decisionIndex)
  })
})
