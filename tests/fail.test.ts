import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * What must not drift back, after the failure-state pass.
 *
 * Read from the source, because this repository has no jsdom. Each of these
 * is a defect that existed and was shipped, so each one is a thing somebody
 * could reasonably re-introduce without noticing (docs/FAIL.md).
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

  it('does not open the vouch form when the server could not be reached', () => {
    // A father filled in his name, a sentence about his daughter and his
    // phone number before finding out.
    const vouch = read('src/components/Vouch.tsx')
    expect(vouch).toMatch(/readVouchDetail/)
    expect(vouch).toMatch(/if \(v === 'none'\) return setPhase\('form'\)/)
  })
})

describe('the limiter cannot take down what it protects', () => {
  it('opens its store inside the try', () => {
    // It was above it, and nearly every caller awaits this outside its own
    // try — so a Blobs hiccup was an unhandled rejection and a platform 500
    // with a non-JSON body, on every capped endpoint at once.
    const limit = read('netlify/shared/limit.ts')
    const fn = limit.slice(limit.indexOf('export async function capState'))
    const open = fn.indexOf("getStore({ name: 'limits'")
    const tryAt = fn.indexOf('try {')
    expect(tryAt).toBeGreaterThan(-1)
    expect(tryAt).toBeLessThan(open)
  })

  it('leaves no body read unguarded', () => {
    // progress.ts was the only one of seven without a try, so a truncated
    // upload produced whatever the platform emits rather than a 400.
    for (const { file, text } of sources('netlify/functions')) {
      const reads = [...text.matchAll(/await req\.text\(\)/g)]
      for (const m of reads) {
        const before = text.slice(Math.max(0, m.index! - 200), m.index!)
        expect(before, `${file} reads the body without a try`).toMatch(/try \{/)
      }
    }
  })
})

describe('a write that matters is conditional', () => {
  it('holds the couple sheet against the side that did not make it', () => {
    const couple = read('netlify/functions/couple.ts')
    // Anyone holding the six characters she texted him could replace her
    // eleven answers, or destroy his, and be told 200. The first guard here
    // compared a gender the request *states*, which he could simply state
    // (docs/SECURITY.md, O6); the sheet is now hers by the key she was handed.
    expect(couple).toMatch(/existing\.owner \? sameSecret\(key, existing\.owner\)/)
    expect([...couple.matchAll(/onlyIfMatch: held\.etag/g)].length).toBeGreaterThanOrEqual(2)
  })

  it('lets only the first vouch win, for real', () => {
    const vouch = read('netlify/functions/vouch.ts')
    expect(vouch).toMatch(/setJSON\(code, stamp\(record\), \{ onlyIfNew: true \}\)/)
    // `asked/` is claimed before the pointer is written, because forget me
    // finds the token by reading it — one written first could never be swept.
    const ask = vouch.slice(vouch.indexOf("side === 'ask'"))
    expect(ask.indexOf('`asked/${code}`, token, { onlyIfNew: true }')).toBeGreaterThan(-1)
    expect(ask.indexOf('`asked/${code}`, token, { onlyIfNew: true }')).toBeLessThan(
      ask.indexOf('`token/${mine}`, code, { onlyIfNew: true }'),
    )
  })
})

describe('nothing is written back after forget me', () => {
  it('stops the autosave, and clears every key from the error screen too', () => {
    // On partial failure the page is deliberately not replaced, so the hook
    // stayed mounted holding what had just been erased and wrote it all back.
    const hook = read('src/hooks/useNiyyah.ts')
    expect(hook).toMatch(/if \(forgotten\.current\) return/)
    expect(hook).toMatch(/forgotten\.current = true/)
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
