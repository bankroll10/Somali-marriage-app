import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCAL_KEYS } from '../src/lib/forget'

/**
 * Forget me clears every key the app writes, held by reading the source: a
 * hand-written list cannot notice a key added somewhere else. It lives here
 * because it reads files and `src/` compiles without node types.
 */

const SRC = join(import.meta.dirname, '..', 'src')

function sources(): { file: string; text: string }[] {
  const out: { file: string; text: string }[] = []
  const walk = (at: string) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const full = join(at, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
        out.push({ file: full.slice(SRC.length + 1), text: readFileSync(full, 'utf8') })
      }
    }
  }
  walk(SRC)
  return out
}

describe('Forget me clears every key the app writes', () => {
  it('finds no key in src/ that LOCAL_KEYS does not name', () => {
    // Forget me's whole promise is "this phone is cleared". It is worth exactly
    // as much as this list is complete, and a hand-written list cannot notice a
    // key added somewhere else — which is what happened when drafts arrived.
    const found = new Set<string>()
    for (const { text } of sources()) {
      for (const m of text.matchAll(/'(niyyah\.[a-z.]+v\d+)'/g)) found.add(m[1])
    }
    expect(found.size).toBeGreaterThan(5)
    // One key outlives the wipe, on purpose: a forget the server did not
    // receive, holding only the codes still to delete. It is Forget me's own
    // unfinished instruction, and it goes the moment the server has done it
    // (src/lib/forget.ts, docs/INTEGRITY.md).
    const outlives = new Set(['niyyah.forget.pending.v1'])
    for (const key of found) {
      if (outlives.has(key)) continue
      expect(LOCAL_KEYS, `Forget me does not clear ${key}`).toContain(key)
    }
  })
})
