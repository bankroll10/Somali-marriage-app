import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCAL_KEYS } from '../src/lib/forget'

/**
 * Two promises this pass makes, held by reading the source.
 *
 * Both are about what must *not* drift. Behaviour is tested beside the code it
 * belongs to; these are the structural rules, and they live here because they
 * read files and `src/` compiles without node types.
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
    // key added somewhere else — which is what happened when drafts arrived
    // (docs/FOGG.md).
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

describe('a draft is an obstacle removed, not a hook', () => {
  it('is read on the way into an instrument and nowhere else', () => {
    // If this fails, some screen is about to show a person a count of the
    // things they have not finished. That is the line this pass does not
    // cross: the draft exists so leaving costs nothing, never so that leaving
    // is punished (src/lib/draft.ts, docs/FOGG.md).
    const ALLOWED = new Set(['lib/draft.ts', 'components/Read.tsx', 'components/BeforeYes.tsx', 'components/Couple.tsx', 'hooks/useNiyyah.ts'])
    const readers = sources()
      .filter(({ text }) => /from '\.\.?\/(lib\/)?draft'/.test(text))
      .map(({ file }) => file.replace(/\\/g, '/'))
    expect(readers.length).toBeGreaterThan(0)
    for (const file of readers) {
      expect(ALLOWED, `${file} reads drafts — is it about to nudge somebody?`).toContain(file)
    }
  })

  it('never reaches the server, so the Trust account of what leaves the phone stays true', () => {
    const keep = sources().find(({ file }) => file.replace(/\\/g, '/') === 'lib/keep.ts')
    expect(keep).toBeDefined()
    expect(keep?.text).not.toContain('draft')
  })
})
