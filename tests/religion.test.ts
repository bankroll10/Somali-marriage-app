import { describe, expect, it } from 'vitest'
import { familyScript } from '../src/data/families'
import { readQuestions } from '../src/data/read'
import { beforeYesTopics } from '../src/data/beforeYes'
import { buildSystemPrompt } from '../netlify/shared/prompt'

/**
 * Niyyah is not an imam, a mufti or a fiqh service (docs/DECISIONS.md Part 17).
 * Its own copy describes; it does not rule, it does not call a courtship
 * halal, it does not score a Muslim's "inshaAllah" as evasion, and it keeps
 * the mahr's principle apart from the family's custom.
 */
describe('the app’s own copy stays inside its authority', () => {
  it('never labels a courtship halal', () => {
    expect(familyScript('end-it-kindly', 'woman')?.script.why ?? '').not.toMatch(/\bhalal\b/i)
  })

  it('never reads inshaAllah on its own as talking around marriage', () => {
    for (const q of readQuestions('woman')) {
      for (const o of q.options) {
        if (/inshaAllah/i.test(o.hint ?? '')) expect(o.hint, `${q.id}/${o.id}`).toMatch(/attached/)
      }
    }
  })

  it('keeps the mahr’s principle apart from the wedding’s custom, for either reader', () => {
    for (const g of ['woman', 'man'] as const) {
      const t = beforeYesTopics(g).find((x) => x.id === 'aroos-mahr')!
      expect(t.why, g).toMatch(/The mahr is the bride’s/)
    }
  })

  it('the live prompt says where the schools differ, and that custom is not law', () => {
    const p = buildSystemPrompt('islamic', { gender: 'woman' } as never)
    expect(p).toMatch(/say that they differ rather than picking one/)
    expect(p).toMatch(/Never present Somali custom .* as Islamic law/)
    expect(p).toMatch(/defer fiqh rulings to a trusted scholar/)
  })
})
