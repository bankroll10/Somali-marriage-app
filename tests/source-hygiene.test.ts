import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * No control characters in source. A script that wrote "\b" into a regex once
 * left a backspace byte in its place: four eval checks could never fire, from
 * 2026-09-24 until they were found (docs/DECISIONS.md Part 17). Nothing else
 * would have caught it, because a check that never fires never fails.
 */
const ROOTS = ['src', 'netlify', 'tests', 'docs']
const EXT = /\.(ts|tsx|md)$/
const CONTROL = /[\x00-\x08\x0b\x0c\x0e-\x1f]/

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (EXT.test(name)) out.push(p)
  }
  return out
}

describe('source hygiene', () => {
  it('no source or doc file holds a control character', () => {
    const bad = ROOTS.flatMap((r) => walk(r)).filter((f) => CONTROL.test(readFileSync(f, 'utf8')))
    expect(bad).toEqual([])
  })
})
