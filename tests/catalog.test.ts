import { existsSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOG, CATEGORIES, INVARIANTS, SOURCE_FILES_AT_MOST, VISUAL_ABSENT, type Invariant } from './catalog'

/**
 * The catalogue stays true (tests/catalog.ts, docs/TESTING.md).
 *
 * The architecture of a test suite is not something a single test can hold;
 * this is the nearest thing. Every test file is on the map, every invariant
 * has a suite behind it that exists, every kind of test the founder named is
 * present but the one that is absent on purpose, and the number of files that
 * test source text instead of behaviour can only go down.
 */

const ROOT = join(import.meta.dirname, '..')

function testFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue
      const full = join(dir, e.name)
      if (e.isDirectory()) walk(full)
      else if (/\.test\.tsx?$/.test(e.name)) out.push(relative(ROOT, full))
    }
  }
  walk(ROOT)
  return out.sort()
}

describe('the catalogue', () => {
  it('names every test file in the repository, and no file that is not there', () => {
    const files = testFiles()
    expect(files.length).toBeGreaterThan(50)
    expect(files.filter((f) => !(f in CATALOG)), 'add these to tests/catalog.ts').toEqual([])
    expect(Object.keys(CATALOG).filter((f) => !files.includes(f)), 'these are catalogued but gone').toEqual([])
  })

  it('gives every file at least one real category', () => {
    for (const [file, e] of Object.entries(CATALOG)) {
      expect(e.categories.length, file).toBeGreaterThan(0)
      for (const c of e.categories) expect(CATEGORIES, `${file}: ${c}`).toContain(c)
    }
  })

  it('has every kind of test but the one that is absent on purpose — and says why that one is', () => {
    const used = new Set(Object.values(CATALOG).flatMap((e) => e.categories))
    for (const c of CATEGORIES.filter((c) => c !== 'visual')) expect(used.has(c), c).toBe(true)
    expect(used.has('visual')).toBe(false)
    expect(VISUAL_ABSENT.length).toBeGreaterThan(80)
  })

  it('holds every invariant with at least one suite named for it, and a second layer behind it', () => {
    for (const inv of Object.keys(INVARIANTS) as Invariant[]) {
      const suites = Object.entries(CATALOG).filter(([, e]) => e.invariants?.includes(inv)).map(([f]) => f)
      expect(suites.some((f) => f.startsWith('tests/invariants/')), `${inv} has no invariant suite`).toBe(true)
      expect(suites.length, `${inv} rests on one file`).toBeGreaterThanOrEqual(2)
      for (const f of suites) expect(existsSync(join(ROOT, f)), f).toBe(true)
    }
  })

  it('files every suite in tests/invariants under an invariant, and every journey as end-to-end', () => {
    for (const [file, e] of Object.entries(CATALOG)) {
      if (file.startsWith('tests/invariants/')) expect(e.invariants?.length, file).toBeGreaterThan(0)
      if (file.startsWith('tests/journeys/')) expect(e.categories, file).toContain('e2e')
    }
  })

  it('lets the number of files that test source text only go down', () => {
    const source = Object.entries(CATALOG).filter(([, e]) => e.kind === 'source').map(([f]) => f)
    expect(source.length, source.join('\n')).toBeLessThanOrEqual(SOURCE_FILES_AT_MOST)
  })
})
