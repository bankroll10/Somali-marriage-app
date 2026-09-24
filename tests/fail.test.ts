import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * What must not drift back, after the failure-state pass.
 *
 * Read from the source. Each of these is a defect that existed and was
 * shipped, so each one is a thing somebody could reasonably re-introduce
 * without noticing (docs/FAIL.md). What a test can *cause* — a limiter whose
 * store will not open, a body cut off mid-upload, two answers landing at once, the autosave after a
 * failed forget — moved to tests/failure-modes.test.ts and
 * tests/journeys/forget-offline.test.tsx on 2026-09-24, where it is proved by
 * making it happen (docs/TESTING.md, "Pruned"). What is left here is what no
 * request can reach: which helper every call goes through, and the crash
 * screen.
 */

const ROOT = join(import.meta.dirname, '..')
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8')

function sources(dir: string): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = []
  const walk = (at: string) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const full = join(at, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
        out.push({ file: full.slice(join(ROOT, dir).length + 1), text: readFileSync(full, 'utf8') })
      }
    }
  }
  walk(join(ROOT, dir))
  return out
}

describe('every call to the server has a clock', () => {
  it('goes through the one helper, with the guide as the only exception', () => {
    // withTimeout was copy-pasted byte-identical into five files, hand-rolled
    // in two more, and missing from both waitlist posts — so a hung form post
    // spun for ever on the one screen that takes someone's contact details.
    const raw = sources('src').filter(
      ({ file, text }) => file !== 'lib/net.ts' && /(?:await |= )fetch\(/.test(text),
    )
    // The guide streams, and its clock runs only to the first character — it
    // is cleared there, which is not what `send` does. It still carries a
    // signal of its own.
    expect(raw.map((s) => s.file)).toEqual(['lib/coach.ts'])
    expect(raw[0].text).toMatch(/signal: [a-z]+\.signal/)
  })

  it('defines the helper exactly once', () => {
    const defs = sources('src').filter(({ text }) => text.includes('async function withTimeout('))
    expect(defs).toHaveLength(0)
    expect(read('src/lib/net.ts')).toMatch(/export async function send\(/)
  })
})

describe('a failure keeps its reason', () => {
  it('names the reasons apart, and says which are worth another try', () => {
    const net = read('src/lib/net.ts')
    for (const why of ['unreachable', 'refused', 'not-a-code', 'not-found', 'expired', 'taken', 'garbled']) {
      expect(net).toContain(`'${why}'`)
    }
    // Retrying a lapsed record or a malformed code is futile, and a screen
    // that offers it is lying twice.
    expect(net).toMatch(/why === 'unreachable' \|\| why === 'refused'/)
  })

  it('does not tell someone their link is broken when the network is', () => {
    // The eleventh tap of eleven used to land on "This link isn't working —
    // it may have expired, or been copied wrong" for a two-second blip, and
    // threw away every answer he had given.
    const couple = read('src/components/Couple.tsx')
    expect(couple).toMatch(/result === 'not-found' \|\| result === 'expired' \|\| result === 'not-a-code'/)
    expect(couple).toMatch(/setPhase\('unreachable'\)|: 'unreachable'/)
  })
})

describe('nothing is written back after forget me', () => {
  it('clears every key from the error screen too', () => {
    // The autosave half of this — the hook writing back what forget me had
    // just erased — is proved by causing it, in
    // tests/journeys/forget-offline.test.tsx. The crash screen is not a
    // screen a test can tap its way to, so its half stays a source check.
    // "Start completely fresh" called clearProgress alone, leaving the kept
    // code behind — the irreversible-overwrite path startFresh documents.
    const boundary = read('src/components/ErrorBoundary.tsx')
    expect(boundary).toMatch(/clearEverything\(\)/)
    expect(boundary).not.toMatch(/clearProgress\(\)/)
  })

})

describe('the guide', () => {
  it('never replaces words that arrived with words that did not', () => {
    const coach = read('src/components/Coach.tsx')
    expect(coach).toMatch(/if \(!reply\.live && streamed && streamedText\.trim\(\)\)/)
    // And a fallback costs nothing, which the comment there has always said.
    expect(coach).toMatch(/if \(reply\.live\) onSpendReply\(\)/)
  })
})
