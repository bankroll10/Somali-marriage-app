import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { describe, expect, it } from 'vitest'
import { guideRequest } from '../netlify/functions/guide'
import { localReply } from '../src/lib/coach'
import { readUpstreamOutcome } from './eval/artifacts'
import { validateOutcome } from './eval/outcome'
import { authError, billingError, connectionError, failAll, failOn, serverError, standInClient, type Params } from './eval/stand-in'
import { CASES } from './guide-eval/cases'
import { GOLD } from './guide-eval/exemplars'
import { JUDGED, RUBRIC } from './guide-eval/judge'
import { type Report, guideSuite, markdown, regressions, runLive } from './guide-eval/live'

/**
 * The Guide against the live model (docs/GUIDE-EVAL.md).
 *
 * The first blocks run every time, with a stand-in for the model: they prove
 * the harness sends exactly what production sends, falls back the way
 * production does, fails a run that regresses, and — through the whole suite
 * end to end, files included — earns exactly one of the four outcomes for
 * every way a run can go (tests/eval/outcome.ts). The last block runs only
 * with GUIDE_EVAL_LIVE=1 — `npm run eval:guide` — and spends real money
 * (about $4 a run; the report says what it cost). Without a key it records
 * not-evaluated and fails, because a live run was asked for and did not
 * happen.
 */

const INTENDED = process.env.GUIDE_EVAL_LIVE === '1'
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))

/** A stand-in model: the gold answer where one is written, a plain good one otherwise, and a decline on one case. */
function standIn(opts: { declineOn?: string; emptyOn?: string; judgeScore?: number; malformedJudgeOn?: string; fail?: Parameters<typeof standInClient>[1] } = {}) {
  const usage = { input_tokens: 1000, output_tokens: 200 }
  return standInClient((params: Params) => {
    const message = (params.messages[params.messages.length - 1].content as string) ?? ''
    if (params.system === RUBRIC) {
      const graded = message.match(/THE MEMBER'S MESSAGE: (.*)\n/)?.[1]
      if (opts.malformedJudgeOn && CASES.find((x) => x.id === opts.malformedJudgeOn)?.message === graded) {
        return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }], usage }
      }
      const scores = Object.fromEntries(JUDGED.map((d) => [d, { score: opts.judgeScore ?? 5, reason: 'fine' }]))
      return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(scores) }], usage }
    }
    const c = CASES.find((x) => x.message === message)!
    if (c.id === opts.declineOn) return { stop_reason: 'refusal', content: [], usage }
    if (c.id === opts.emptyOn) return { stop_reason: 'end_turn', content: [], usage }
    const gold = GOLD.find((g) => g.caseId === c.id)?.answer
    return { stop_reason: 'end_turn', content: [{ type: 'text', text: gold ?? localReply(c.message, c.context as never, c.mode).text }], usage }
  }, opts.fail)
}

/** The guide request for one case, as the stand-in sees it. */
const isGuideCallFor = (id: string) => (p: Params) => p.system !== RUBRIC && (p.messages[p.messages.length - 1].content as string) === CASES.find((x) => x.id === id)!.message

describe('the live harness, with a stand-in model', () => {
  it('sends each case exactly as production sends a member’s message', async () => {
    const { client, calls } = standIn()
    await runLive(client, CASES.slice(0, 5), 1)
    const guideCalls = calls.filter((p) => p.system !== RUBRIC)
    CASES.slice(0, 5).forEach((c, i) => {
      expect(guideCalls[i]).toEqual(guideRequest(c.mode, c.context, c.history ?? [], c.message))
    })
  })

  it('grades the offline voice where the model declines — what the member would get — and counts it as the model’s answer', async () => {
    const { client } = standIn({ declineOn: 'crisis-01' })
    const report = await runLive(client, CASES.filter((c) => c.category === 'crisis'))
    const r = report.cases.find((c) => c.id === 'crisis-01')!
    expect(r.source).toBe('declined')
    expect(r.answer).toBe(localReply(CASES.find((c) => c.id === 'crisis-01')!.message, {} as never, 'therapist').text)
    expect(r.judge).not.toBeNull()
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

  it('reports what it cost, and every request it sent', async () => {
    const r = await runLive(standIn().client, CASES.slice(0, 2))
    expect(r.cost.inputTokens).toBe(4000)
    expect(r.cost.dollars).toBeGreaterThan(0)
    expect(r.requests).toBe(4)
    expect(r.succeeded).toBe(4)
  })
})

describe('the Guide suite, end to end, earns one outcome per way a run can go', () => {
  const FEW = CASES.slice(0, 6)
  const dir = () => mkdtempSync(join(tmpdir(), 'niyyah-guide-eval-'))
  const run = (opts: Partial<Omit<Parameters<typeof guideSuite>[0], 'client'>> & { stand?: ReturnType<typeof standIn> }) => {
    const { stand, cases, results: given, baseline, width, ...rest } = opts
    const results = given ?? dir()
    return guideSuite({
      client: stand ? stand.client : null,
      cases: cases ?? FEW,
      results,
      baseline: baseline ?? join(results, 'baseline.live.json'),
      width: width ?? 1,
      session: stand?.session,
      ...rest,
    })
  }
  const outcomeFile = (results: string) => validateOutcome(JSON.parse(readFileSync(join(results, 'outcome.json'), 'utf8')), 'guide')

  it('a complete passing run: evaluated-pass, every file written, and the first baseline recorded from it', async () => {
    const results = dir()
    const { outcome, files } = await run({ stand: standIn(), results })
    expect(outcome.outcome).toBe('evaluated-pass')
    expect(outcome.run).toMatchObject({ expected: 6, started: 6, completed: 6, answered: 6, declined: 0, unavailable: 0, judged: 6, requests: 12, succeeded: 12, stopped: null })
    expect(outcome.errors).toEqual([])
    expect(readdirSync(results).sort()).toEqual(expect.arrayContaining(['baseline.live.json', 'outcome.json']))
    expect(files.some((f) => f.endsWith('.md'))).toBe(true)
    // The file on disk is the outcome, validated as the workflow validates it.
    expect(outcomeFile(results)).toEqual(outcome)
  })

  it('a complete failing run: evaluated-fail on the quality gates, the report kept, and no baseline written or moved', async () => {
    const results = dir()
    const first = await run({ stand: standIn(), results })
    const before = readFileSync(join(results, 'baseline.live.json'), 'utf8')
    const { outcome, report } = await run({ stand: standIn({ judgeScore: 3 }), results, update: true })
    expect(outcome.outcome).toBe('evaluated-fail')
    expect(outcome.reason).toMatch(/quality gate failure/)
    expect(outcome.gates!.regressions.length).toBeGreaterThan(0)
    expect(report!.cases).toHaveLength(6)
    expect(readFileSync(join(results, 'baseline.live.json'), 'utf8')).toBe(before)
    expect(first.outcome.outcome).toBe('evaluated-pass')
  })

  it('missing credentials: not-evaluated, nothing sent, and the file still written', async () => {
    const results = dir()
    const { outcome, report } = await run({ results })
    expect(outcome).toMatchObject({ outcome: 'not-evaluated', run: { expected: 6, started: 0, requests: 0, stopped: { kind: 'credentials' } } })
    expect(outcome.reason).toMatch(/ANTHROPIC_API_KEY is not set/)
    expect(report).toBeNull()
    expect(existsSync(join(results, 'baseline.live.json'))).toBe(false)
    expect(outcomeFile(results).outcome).toBe('not-evaluated')
  })

  it('a billing failure before the first case: not-evaluated, one request, nothing else scheduled', async () => {
    const stand = standIn({ fail: failAll(billingError) })
    const { outcome } = await run({ stand })
    expect(outcome.outcome).toBe('not-evaluated')
    expect(outcome.reason).toMatch(/billing/)
    expect(outcome.run).toMatchObject({ started: 1, completed: 1, answered: 0, unavailable: 1, requests: 1, succeeded: 0 })
    expect(outcome.run!.stopped).toMatchObject({ kind: 'billing', requests: 1 })
    expect(stand.calls).toHaveLength(1)
    expect(outcome.errors[0]).toMatchObject({ item: FEW[0].id, stage: 'guide', kind: 'billing', status: 400, attempt: 1 })
    // Not retried: a billing failure is fatal, not transient.
    expect(stand.waits).toEqual([])
  })

  it('an authentication failure is fatal too, and the key never appears in what is written', async () => {
    const stand = standIn({ fail: failAll(() => Object.assign(authError(), { message: 'invalid x-api-key sk-ant-api03-SECRETSECRETSECRET' })) })
    const results = dir()
    const { outcome } = await run({ stand, results })
    expect(outcome.outcome).toBe('not-evaluated')
    expect(outcome.run!.stopped!.kind).toBe('auth')
    const written = readdirSync(results).map((f) => readFileSync(join(results, f), 'utf8')).join('\n')
    expect(written).not.toContain('SECRETSECRET')
    expect(written).toContain('[redacted key]')
  })

  it('in flight when the run stops: what was already sent is recorded as sent, and what never started is counted as never started', async () => {
    // Width 4: four guide requests leave together; the first answer back is the
    // billing failure. Nothing after that is sent; the other three were sent.
    const stand = standIn({ fail: (p, n) => (p.system !== RUBRIC && n <= 4 ? billingError() : undefined) })
    const { outcome } = await run({ stand, width: 4 })
    expect(outcome.outcome).toBe('not-evaluated')
    expect(outcome.run!.started).toBe(4)
    expect(outcome.run!.requests).toBe(4)
    expect(outcome.run!.completed).toBe(4)
    expect(outcome.run!.expected - outcome.run!.started).toBe(2)
    expect(outcome.errors.filter((e) => e.kind === 'billing')).toHaveLength(4)
    expect(outcome.errors.filter((e) => e.kind === 'not-sent')).toHaveLength(0)
  })

  it('a billing failure after partial completion: evaluated-fail, the partial report kept, no baseline', async () => {
    const results = dir()
    // Requests go guide, judge, guide, judge…: the 9th is the fifth case's guide call.
    const stand = standIn({ fail: failOn(9, billingError, 99) })
    const { outcome, report } = await run({ stand, results })
    expect(outcome.outcome).toBe('evaluated-fail')
    expect(outcome.reason).toMatch(/incomplete — stopped after 5 of 6 \(billing/)
    expect(outcome.run).toMatchObject({ expected: 6, started: 5, completed: 5, answered: 4, unavailable: 1, judged: 4, requests: 9, succeeded: 8 })
    expect(report!.cases).toHaveLength(5)
    expect(report!.cases[4]).toMatchObject({ id: FEW[4].id, source: 'unavailable', judge: null })
    expect(existsSync(outcome.report!)).toBe(true)
    expect(existsSync(join(results, 'baseline.live.json'))).toBe(false)
  })

  it('a transient server error is retried, waited on, recorded, and does not stop a run that then passes', async () => {
    const stand = standIn({ fail: failOn(3, serverError) })
    const { outcome } = await run({ stand })
    expect(outcome.outcome).toBe('evaluated-pass')
    expect(outcome.run).toMatchObject({ requests: 13, succeeded: 12 })
    expect(outcome.errors).toEqual([{ item: FEW[1].id, stage: 'guide', kind: 'transient', status: 500, message: '500 Internal server error', attempt: 1 }])
    expect(stand.waits).toEqual([1000])
  })

  it('a connection error counts as transient in the same way', async () => {
    const stand = standIn({ fail: failOn(1, connectionError) })
    const { outcome } = await run({ stand })
    expect(outcome.outcome).toBe('evaluated-pass')
    expect(outcome.errors[0]).toMatchObject({ kind: 'transient', status: null })
  })

  it('infrastructure fallback: a case whose live call keeps failing is graded on the offline voice, is not live coverage, and the run cannot pass', async () => {
    const target = FEW[2]
    let attempts = 0
    const stand = standIn({ fail: (p) => (isGuideCallFor(target.id)(p) && ++attempts <= 3 ? serverError() : undefined) })
    const { outcome, report } = await run({ stand })
    expect(outcome.outcome).toBe('evaluated-fail')
    expect(outcome.reason).toMatch(/1 case fell back to the offline voice because live inference was unavailable/)
    const row = report!.cases.find((c) => c.id === target.id)!
    expect(row.source).toBe('unavailable')
    expect(row.answer).toBe(localReply(target.message, target.context as never, target.mode).text)
    expect(row.judge).toBeNull()
    expect(outcome.run).toMatchObject({ completed: 6, answered: 5, unavailable: 1, judged: 5 })
    expect(outcome.errors.filter((e) => e.item === target.id).map((e) => e.attempt)).toEqual([1, 2, 3])
    expect(stand.waits).toEqual([1000, 4000])
  })

  it('a decline is the model’s own answer and counts as coverage; an empty response is not', async () => {
    const declined = await run({ stand: standIn({ declineOn: FEW[0].id }) })
    expect(declined.outcome.outcome).toBe('evaluated-pass')
    expect(declined.outcome.run).toMatchObject({ answered: 6, declined: 1, unavailable: 0 })
    const empty = await run({ stand: standIn({ emptyOn: FEW[0].id }) })
    expect(empty.outcome.outcome).toBe('evaluated-fail')
    expect(empty.outcome.run).toMatchObject({ answered: 5, unavailable: 1 })
    expect(empty.report!.cases[0].error).toMatch(/returned no text/)
  })

  it('missing judging: a judge that returns nothing usable leaves the case unjudged, and the run cannot pass', async () => {
    const { outcome, report } = await run({ stand: standIn({ malformedJudgeOn: FEW[3].id }) })
    expect(outcome.outcome).toBe('evaluated-fail')
    expect(outcome.reason).toMatch(/1 case not judged/)
    expect(outcome.run).toMatchObject({ answered: 6, judged: 5 })
    expect(report!.cases[3].error).toMatch(/judge declined or returned nothing usable/)
  })

  it('a judge call that keeps failing is a missing judgement, recorded against the judge stage', async () => {
    let attempts = 0
    const stand = standIn({ fail: (p) => (p.system === RUBRIC && ++attempts <= 3 ? serverError() : undefined) })
    const { outcome } = await run({ stand })
    expect(outcome.outcome).toBe('evaluated-fail')
    expect(outcome.run).toMatchObject({ answered: 6, judged: 5 })
    expect(outcome.errors.every((e) => e.stage === 'judge' && e.item === FEW[0].id)).toBe(true)
  })

  it('an empty case set is a defect, not a pass', async () => {
    const stand = standIn()
    const { outcome } = await run({ stand, cases: [] })
    expect(outcome.outcome).toBe('evaluated-fail')
    expect(outcome.reason).toMatch(/intended case set is empty/)
    expect(stand.calls).toHaveLength(0)
  })

  it('a fatal stop carried from the suite before it: not-evaluated and nothing sent', async () => {
    const results = dir()
    const earlier = (await run({ stand: standIn({ fail: failAll(billingError) }), results })).outcome
    const stand = standIn()
    const { outcome } = await run({ stand, upstream: earlier })
    expect(outcome.outcome).toBe('not-evaluated')
    expect(outcome.reason).toMatch(/earlier suite in this run stopped on billing/)
    expect(stand.calls).toHaveLength(0)
    // A stop that was not fatal for the account — a judge that failed calibration, say — is not carried.
    const stopped = { ...earlier, run: { ...earlier.run!, stopped: { kind: 'judge' as const, message: 'calibration', requests: 3 } } }
    expect((await run({ stand: standIn(), upstream: stopped })).outcome.outcome).toBe('evaluated-pass')
  })

  it('UPDATE moves the baseline only from a run that passed', async () => {
    const results = dir()
    await run({ stand: standIn(), results })
    const before = readFileSync(join(results, 'baseline.live.json'), 'utf8')
    await run({ stand: standIn({ fail: failOn(9, billingError, 99) }), results, update: true })
    expect(readFileSync(join(results, 'baseline.live.json'), 'utf8')).toBe(before)
    await run({ stand: standIn({ declineOn: FEW[0].id }), results, update: true })
    const after = JSON.parse(readFileSync(join(results, 'baseline.live.json'), 'utf8')) as Report
    expect(after.cases[0].source).toBe('declined')
  })
})

describe.skipIf(!INTENDED)('the live guide', () => {
  it(
    'meets every hard gate, does not regress against its baseline, and is evaluated in full',
    async () => {
      const { outcome, files } = await guideSuite({
        // The session owns the retry policy, so every request is counted (tests/eval/session.ts).
        client: process.env.ANTHROPIC_API_KEY ? new Anthropic({ maxRetries: 0 }) : null,
        cases: CASES,
        results: here('./guide-eval/results/'),
        baseline: here('./guide-eval/baseline.live.json'),
        update: process.env.UPDATE_GUIDE_BASELINE === '1',
        upstream: readUpstreamOutcome(process.env.EVAL_UPSTREAM_OUTCOME),
      })
      expect(outcome.outcome, `\n${outcome.reason}\n\nWritten:\n${files.map((f) => `  ${f}`).join('\n')}\n`).toBe('evaluated-pass')
    },
    40 * 60 * 1000,
  )
})
