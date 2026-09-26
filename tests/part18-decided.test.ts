import { describe, expect, it } from 'vitest'
import { beforeYesTopics } from '../src/data/beforeYes'
import { familyScript } from '../src/data/families'
import { getMode } from '../src/data/coach'
import { momentsFor } from '../src/data/moments'
import { readQuestions } from '../src/data/read'
import { PRESSURE_REPLY, localReply } from '../src/lib/coach'
import { GUIDE } from '../src/data/tools'
import { guideHtml, sampleHtml } from '../src/lib/guidePages'

/**
 * Part 18's "needs user review", decided on the founder's delegation
 * (docs/DECISIONS.md Part 18, "Decided"). The man-only lines say no more than
 * their class allows; the founder fact the docs could not verify is gone; the
 * men have the same family-pressure chip the women do.
 */
const COUNTS = /\b(most|many|often|usually|rarely) (parents|men|women|families|people)\b|\b(parents|families) (often|usually|rarely)\b/i
const DATED = /\byear (two|three|ten)\b|\bfifty years\b/i
const MIND = /\bmore afraid to ask\b|\bshe is the one carrying\b|\bbecome a man in their eyes\b|\bprovide and protect\b/i

describe('the man-only lines, calibrated', () => {
  it('carry no count, no dated future and no read of her mind', () => {
    const texts: string[] = []
    for (const t of beforeYesTopics('man')) texts.push(t.why, t.prompt, t.script.why, t.script.words, t.script.tells)
    for (const q of readQuestions('man')) texts.push(q.prompt, q.helper ?? '', ...q.options.flatMap((o) => [o.label, o.hint ?? '', o.note ?? '']))
    for (const id of ['tell-family-online', 'approach-her-family']) {
      const s = familyScript(id, 'man')!.script
      texts.push(s.why, s.words, s.tells)
    }
    const brother = getMode('brother')
    for (const i of brother.intents) texts.push(i.respond({ identity: { gender: 'man' }, answers: {} } as never))
    for (const t of texts) {
      expect(t).not.toMatch(COUNTS)
      expect(t).not.toMatch(DATED)
      expect(t).not.toMatch(MIND)
    }
  })

  it('the men have a family-pressure chip, and it reaches the pressure answer', () => {
    const chip = momentsFor('man').find((m) => /family is pushing/i.test(m.label))
    expect(chip).toBeDefined()
    expect(localReply(chip!.prompt, { identity: { gender: 'man' }, answers: {} } as never, chip!.mode).text).toBe(PRESSURE_REPLY)
  })
})

describe('the shared lines, decided', () => {
  it('children are asked about as a question, not assumed', () => {
    const t = beforeYesTopics('woman').find((x) => x.id === 'children')!
    expect(t.prompt).toMatch(/whether you want them/)
    expect(t.script.words).toMatch(/do you want them/)
  })

  it('qabiil is raised without asserting a rule about what may be asked', () => {
    const t = beforeYesTopics('woman').find((x) => x.id === 'qabiil')!
    expect(t.script.words).not.toMatch(/supposed to ask/)
  })

  it('the pressure answer offers a parent updates rather than a schedule', () => {
    expect(PRESSURE_REPLY).not.toMatch(/once a month/)
    expect(PRESSURE_REPLY).toMatch(/come to you with where I am/)
  })

  it('the printed guide makes no claim about who built it', () => {
    for (const html of [guideHtml(GUIDE, { host: 'example.test' }), sampleHtml(GUIDE, { host: 'example.test' })]) {
      expect(html).not.toMatch(/built by a Somali/i)
      expect(html).toMatch(/for the Somali diaspora/)
    }
  })
})
