import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Promises the code cannot keep, and the two things this product has sworn
 * never to build, held out of every screen and every data file the same way
 * tests/brand.test.ts holds "powered by AI" out (docs/RISKS.md R3).
 *
 * Until 2026-09-17 four screens said "the day someone fits your map, we write
 * to you" with no matching over kept maps and no outbound channel anywhere;
 * seven said "when your city opens, this decides who you meet" with nothing
 * deciding; and the sample introduction promised photos and a guided
 * conversation, both refused permanently in docs/STRATEGY.md §6. Every one
 * was warm, well written, and false. The rule now: a screen says what exists,
 * and says "nobody is introduced yet" in as many words.
 */
const FORBIDDEN: [RegExp, string][] = [
  [/photos? (are|is|will be|get) shown/i, 'photos — declined permanently (docs/BETS.md B19, docs/STRATEGY.md §6)'],
  [/conversation opens/i, 'messaging — off-platform, on purpose (docs/MACHINE.md, docs/LEARNING.md)'],
  [/\bwe (will |can )?write to\b/i, 'no outbound channel exists (docs/TIME.md)'],
  [/\byou (will )?hear from us\b/i, 'no outbound channel exists (docs/TIME.md)'],
  [/\bwhen your city opens\b/i, 'nothing decides who meets whom yet; say so'],
  [/\btell you when your (city|pool) opens\b/i, 'no outbound channel exists'],
  [/\bbefore the public launch\b/i, 'the free year is bounded to those counted before their pool opens (docs/BOARD.md decision 0)'],
  [/\band blocking\b|report-and-block/i, 'there is no blocking of any kind here (docs/HARD.md #8)'],
]

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : []
  })
}

describe('no screen promises what the code cannot do', () => {
  const files = [...walk(join(process.cwd(), 'src/components')), ...walk(join(process.cwd(), 'src/data'))]

  it('reads every component and every data file', () => {
    expect(files.length).toBeGreaterThan(40)
  })

  for (const [pattern, why] of FORBIDDEN) {
    it(`never says ${pattern.source} — ${why}`, () => {
      const hits: string[] = []
      for (const file of files) {
        const lines = readFileSync(file, 'utf8').split('\n')
        lines.forEach((line, i) => {
          if (pattern.test(line)) hits.push(`${file.replace(process.cwd() + '/', '')}:${i + 1}  ${line.trim().slice(0, 90)}`)
        })
      }
      expect(hits, hits.join('\n')).toEqual([])
    })
  }
})
