import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import Anthropic from '@anthropic-ai/sdk'
import { describe, expect, it } from 'vitest'
import { CASES } from './guide-eval/cases'
import { THEMES } from './judgment/guide-map'
import { HELD_OUT } from './judgment/heldout'
import { PROPERTIES, type PropertyId } from './judgment/properties'
import { registry } from './judgment/scripts'
import type { LockEntry } from './judgment/lock'
import {
  COPY_PROPERTIES,
  PROPERTY_RUBRIC,
  calibrate,
  copyContext,
  judgeGuideCase,
  judgeInput,
  judgeProperties,
  holdRates,
  propertyFailures,
  propertyRegressions,
  verify,
  type JudgedText,
} from './judgment/judge'

/**
 * Relationship judgment against the live model (docs/GUIDE-EVAL.md,
 * "Relationship judgment", E).
 *
 * The first block runs every time, with a stand-in for the model: it pins the
 * evidence rule, the gates and the calibration wiring. The second runs only
 * with JUDGMENT_LIVE=1 and a key — `npm run eval:judgment` — and spends real
 * money: the judge is calibrated first, then judges the live Guide on every
 * themed case and every held-out message, and every script the content lock
 * says has not been judged since it last changed.
 */

const LIVE = process.env.JUDGMENT_LIVE === '1' && !!process.env.ANTHROPIC_API_KEY
const RESULTS = new URL('./judgment/results/', import.meta.url)
const LOCK = new URL('./judgment/content.lock.json', import.meta.url)
const BASELINE = new URL('./judgment/baseline.live.json', import.meta.url)

type Params = Parameters<Anthropic['messages']['create']>[0]

/** A stand-in judge: answers each property with what `decide` returns for the text. */
function standIn(decide: (text: string, property: PropertyId) => { verdict: string; evidence: string }) {
  const calls: Params[] = []
  const client = {
    messages: {
      create: async (params: Params) => {
        calls.push(params)
        const input = params.messages[0].content as string
        const text = input.split('THE TEXT:\n')[1] ?? ''
        const props = (Object.keys(PROPERTIES) as PropertyId[]).filter((p) => input.includes(`\n${p} (`) || input.startsWith(`THE PROPERTIES:\n${p} (`))
        const out = Object.fromEntries(props.map((p) => [p, decide(text, p)]))
        return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(out) }], usage: { input_tokens: 500, output_tokens: 100 } }
      },
    },
  }
  return { client: client as unknown as Pick<Anthropic, 'messages'>, calls }
}

describe('the property judge, with a stand-in model', () => {
  it('counts a violation only when its evidence is in the text, word for word', () => {
    const text = 'I can see you are worried. He is not serious about you, so move on.'
    const quoted = verify(text, { NO_MOTIVE: { verdict: 'violated', evidence: 'He is not serious about you' } }, ['NO_MOTIVE'])
    expect(quoted?.verdicts.NO_MOTIVE?.verdict).toBe('violated')
    // A paraphrase the judge made up is its error, not the text's.
    const paraphrased = verify(text, { NO_MOTIVE: { verdict: 'violated', evidence: 'he does not want to marry you' } }, ['NO_MOTIVE'])
    expect(paraphrased?.verdicts.NO_MOTIVE).toBeUndefined()
    expect(paraphrased?.unverified).toEqual(['NO_MOTIVE'])
    // Curly or straight apostrophes, and spacing, do not decide it.
    expect(verify('He isn’t  serious.', { NO_MOTIVE: { verdict: 'violated', evidence: "He isn't serious" } }, ['NO_MOTIVE'])?.verdicts.NO_MOTIVE?.verdict).toBe('violated')
  })

  it('returns nothing usable when a property it was asked about is missing', () => {
    expect(verify('text', {}, ['NO_MOTIVE'])).toBeNull()
  })

  it('shows the judge every property it asks about, with its rule and rubric, and nothing to copy from', async () => {
    const props: PropertyId[] = ['NO_MOTIVE', 'NO_FIQH']
    const input = judgeInput('An answer.', 'A context.', props)
    for (const p of props) {
      expect(input).toContain(PROPERTIES[p].rule)
      expect(input).toContain(PROPERTIES[p].rubric)
    }
    const { calls, client } = standIn(() => ({ verdict: 'holds', evidence: 'fine' }))
    await judgeProperties(client, 'An answer.', 'A context.', props)
    expect(calls[0].system).toBe(PROPERTY_RUBRIC)
  })

  it('sends every themed case its theme’s properties', async () => {
    const { client, calls } = standIn(() => ({ verdict: 'holds', evidence: 'fine' }))
    for (const [theme, t] of Object.entries(THEMES)) {
      const c = CASES.find((x) => x.id === t.cases[0])!
      await judgeGuideCase(client, c, 'guide').catch(() => undefined)
      const judged = calls.filter((p) => p.system === PROPERTY_RUBRIC).pop()!
      for (const p of t.properties) expect(judged.messages[0].content as string, `${theme}: ${p}`).toContain(`${p} (`)
    }
  })

  it('fails a run on a hard property violated, and on a soft one that falls', () => {
    const run = (verdict: 'holds' | 'violated', p: PropertyId): JudgedText[] => [
      { id: 'x', kind: 'script', properties: [p], text: 't', judgement: { verdicts: { [p]: { verdict, evidence: 't' } }, unverified: [] } },
    ]
    expect(propertyFailures(run('violated', 'NO_ACCUSATION'))).toHaveLength(1)
    expect(propertyFailures(run('violated', 'NATURAL_REGISTER'))).toEqual([])
    expect(propertyRegressions(run('violated', 'NATURAL_REGISTER'), run('holds', 'NATURAL_REGISTER'))).toEqual(['NATURAL_REGISTER holds 1 → 0'])
    expect(holdRates(run('holds', 'DIRECT')).DIRECT).toBe(1)
  })

  it('calibrates the judge on the lines this product removed: a judge that cannot tell them apart is caught', async () => {
    // A judge that calls everything fine misses every removed line.
    const lazy = standIn(() => ({ verdict: 'holds', evidence: 'fine' }))
    expect((await calibrate(lazy.client)).length).toBeGreaterThanOrEqual(10)
    // A judge that knows which is which, quoting the removed line, misses nothing.
    const { CALIBRATION } = await import('./judgment/calibration')
    const bad = new Set(CALIBRATION.map((c) => c.bad))
    const sharp = standIn((text) => (bad.has(text) ? { verdict: 'violated', evidence: text.slice(0, 20) } : { verdict: 'holds', evidence: 'fine' }))
    expect(await calibrate(sharp.client)).toEqual([])
  })
})

describe.skipIf(!LIVE)('relationship judgment, live', () => {
  it(
    'calibrates, then judges the Guide, the held-out set, and every script not yet judged',
    async () => {
      const client = new Anthropic()
      const misses = await calibrate(client)
      const results: JudgedText[] = []
      const themed = new Set(Object.values(THEMES).flatMap((t) => t.cases))
      for (const c of CASES.filter((c) => themed.has(c.id))) results.push(await judgeGuideCase(client, c, 'guide'))
      for (const h of HELD_OUT) results.push(await judgeGuideCase(client, h, 'held-out'))
      const lock: Record<string, LockEntry> = JSON.parse(readFileSync(LOCK, 'utf8'))
      for (const e of registry().filter((e) => !lock[`script ${e.id}`]?.judged)) {
        const { judgement } = await judgeProperties(client, e.words, copyContext(e), COPY_PROPERTIES)
        results.push({ id: e.id, kind: 'script', properties: COPY_PROPERTIES, text: e.words, judgement })
      }
      mkdirSync(RESULTS, { recursive: true })
      const at = new Date().toISOString()
      writeFileSync(new URL(`live-${at.replace(/[:.]/g, '-')}.json`, RESULTS), JSON.stringify({ at, misses, results }, null, 2))
      const baseline = existsSync(BASELINE) ? (JSON.parse(readFileSync(BASELINE, 'utf8')).results as JudgedText[]) : undefined
      expect(misses.length, `the judge missed its calibration:\n${misses.join('\n')}`).toBeLessThanOrEqual(2)
      expect(propertyRegressions(results, baseline)).toEqual([])
      if (process.env.UPDATE_JUDGMENT_LOCK === '1') {
        const judged = new Set(results.filter((r) => r.kind === 'script' && r.judgement && propertyFailures([r]).length === 0).map((r) => `script ${r.id}`))
        for (const k of judged) lock[k] = { ...lock[k], judged: true }
        writeFileSync(LOCK, `${JSON.stringify(lock, null, 2)}\n`)
      }
    },
    60 * 60 * 1000,
  )
})
