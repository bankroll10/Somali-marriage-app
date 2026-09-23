import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import Anthropic from '@anthropic-ai/sdk'
import { describe, expect, it } from 'vitest'
import { guideRequest } from '../netlify/functions/guide'
import { localReply } from '../src/lib/coach'
import { CASES } from './guide-eval/cases'
import { GOLD } from './guide-eval/exemplars'
import { JUDGED, RUBRIC } from './guide-eval/judge'
import { type Report, markdown, regressions, runLive } from './guide-eval/live'

/**
 * The Guide against the live model (docs/GUIDE-EVAL.md).
 *
 * The first block runs every time, with a stand-in for the model: it proves
 * the harness sends exactly what production sends, falls back the way
 * production does, and fails a run that regresses. The second runs only with
 * GUIDE_EVAL_LIVE=1 and a key — `npm run eval:guide` — and spends real money
 * (about $4 a run; the report says what it cost).
 */

const LIVE = process.env.GUIDE_EVAL_LIVE === '1' && !!process.env.ANTHROPIC_API_KEY
const RESULTS = new URL('./guide-eval/results/', import.meta.url)
const BASELINE = new URL('./guide-eval/baseline.live.json', import.meta.url)

type Params = Parameters<Anthropic['messages']['create']>[0]

/** A stand-in model: the gold answer where one is written, a plain good one otherwise, and a decline on one case. */
function standIn(opts: { declineOn?: string; judgeScore?: number } = {}) {
  const calls: Params[] = []
  const client = {
    messages: {
      create: async (params: Params) => {
        calls.push(params)
        const usage = { input_tokens: 1000, output_tokens: 200 }
        if (params.system === RUBRIC) {
          const scores = Object.fromEntries(JUDGED.map((d) => [d, { score: opts.judgeScore ?? 5, reason: 'fine' }]))
          return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(scores) }], usage }
        }
        const message = (params.messages[params.messages.length - 1].content as string) ?? ''
        const c = CASES.find((x) => x.message === message)!
        if (c.id === opts.declineOn) return { stop_reason: 'refusal', content: [], usage }
        const gold = GOLD.find((g) => g.caseId === c.id)?.answer
        return { stop_reason: 'end_turn', content: [{ type: 'text', text: gold ?? localReply(c.message, c.context as never, c.mode).text }], usage }
      },
    },
  }
  return { client: client as unknown as Pick<Anthropic, 'messages'>, calls }
}

describe('the live harness, with a stand-in model', () => {
  it('sends each case exactly as production sends a member’s message', async () => {
    const { client, calls } = standIn()
    await runLive(client, CASES.slice(0, 5), 1)
    const guideCalls = calls.filter((p) => p.system !== RUBRIC)
    CASES.slice(0, 5).forEach((c, i) => {
      expect(guideCalls[i]).toEqual(guideRequest(c.mode, c.context, c.history ?? [], c.message))
    })
  })

  it('grades the offline voice where the model declines — what the member would get', async () => {
    const { client } = standIn({ declineOn: 'crisis-01' })
    const report = await runLive(client, CASES.filter((c) => c.category === 'crisis'))
    const r = report.cases.find((c) => c.id === 'crisis-01')!
    expect(r.source).toBe('offline-fallback')
    expect(r.answer).toBe(localReply(CASES.find((c) => c.id === 'crisis-01')!.message, {} as never, 'therapist').text)
  })

  it('passes a clean run, and fails one that drops against its baseline', async () => {
    const good = await runLive(standIn().client, CASES)
    expect(regressions(good)).toEqual([])
    const worse = await runLive(standIn({ judgeScore: 4 }).client, CASES)
    const found = regressions(worse, good)
    expect(found.some((f) => f.startsWith('judge tone: 5 → 4'))).toBe(true)
    expect(markdown(worse, found)).toMatch(/regression/)
  })

  it('fails any run where the judge calls an answer unsafe, baseline or not', async () => {
    const r = await runLive(standIn({ judgeScore: 3 }).client, CASES.slice(0, 2))
    expect(regressions(r).filter((f) => f.startsWith('judged unsafe')).length).toBe(2)
  })

  it('reports what it cost', async () => {
    const r = await runLive(standIn().client, CASES.slice(0, 2))
    expect(r.cost.inputTokens).toBe(4000)
    expect(r.cost.dollars).toBeGreaterThan(0)
  })
})

describe.skipIf(!LIVE)('the live guide', () => {
  it(
    'meets every hard gate, and does not regress against its baseline',
    async () => {
      const report = await runLive(new Anthropic(), CASES)
      const baseline = existsSync(BASELINE) ? (JSON.parse(readFileSync(BASELINE, 'utf8')) as Report) : undefined
      const found = regressions(report, baseline)
      mkdirSync(RESULTS, { recursive: true })
      const stamp = report.at.replace(/[:.]/g, '-')
      writeFileSync(new URL(`live-${stamp}.json`, RESULTS), `${JSON.stringify(report, null, 2)}\n`)
      writeFileSync(new URL(`live-${stamp}.md`, RESULTS), markdown(report, found))
      if (process.env.UPDATE_GUIDE_BASELINE === '1' || !baseline) writeFileSync(BASELINE, `${JSON.stringify(report, null, 2)}\n`)
      expect(found, `\n${found.join('\n')}\n\nThe full report is in tests/guide-eval/results/live-${stamp}.md\n`).toEqual([])
    },
    40 * 60 * 1000,
  )
})
