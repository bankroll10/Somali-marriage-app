import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SHORT_MAP_IDS, shortMapQuestions } from '../src/data/shortMap'

/**
 * The short map asks exactly what the pool reads, and nothing the pool does
 * not. `netlify/functions/pool.ts` names the five fields it reads from a kept
 * map; age is asked at the door and the stage is the situation question, so
 * the short map is the other three — and if the pool starts reading a sixth,
 * this test says the door must start asking it (docs/BOARD.md, decision 3).
 */
describe('the short map', () => {
  it('asks the three answers the pool reads', () => {
    const pool = readFileSync('netlify/functions/pool.ts', 'utf8')
    for (const id of SHORT_MAP_IDS) expect(pool).toMatch(new RegExp(`answers\\?\\.${id}|${id}\\?: unknown`))
    // The pool reads `answers.{practice, children, dealbreakers}` — no more.
    const read = [...pool.matchAll(/answers\?: \{([^}]*)\}/g)].flatMap((m) => m[1].match(/\w+(?=\?)/g) ?? [])
    expect(read.sort()).toEqual([...SHORT_MAP_IDS].sort())
  })

  it('reuses the intake’s own questions, so an answer is never given twice', () => {
    const qs = shortMapQuestions()
    expect(qs.map((q) => q.id)).toEqual([...SHORT_MAP_IDS])
    for (const q of qs) expect(q.options?.length ?? 0).toBeGreaterThan(1)
  })
})
