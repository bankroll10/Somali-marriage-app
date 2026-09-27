import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { describe, expect, it } from 'vitest'
import { localReply } from '../src/lib/coach'
import { readUpstreamOutcome } from './eval/artifacts'
import { validateOutcome } from './eval/outcome'
import { billingError, failAll, serverError, standInClient, type Params } from './eval/stand-in'
import { CASES } from './guide-eval/cases'
import { CALIBRATION } from './judgment/calibration'
import { THEMES } from './judgment/guide-map'
import { HELD_OUT } from './judgment/heldout'
import { PROPERTIES, type PropertyId } from './judgment/properties'
import { registry } from './judgment/scripts'
import type { LockEntry } from './judgment/lock'
import { judgmentSuite, type JudgmentInput } from './judgment/live'
import {
  PROPERTY_RUBRIC,
  calibrate,
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
 * The first blocks run every time, with a stand-in for the model: they pin
 * the evidence rule, the gates, the calibration wiring, and — through the
 * whole suite end to end — the outcome every kind of run earns
 * (tests/eval/outcome.ts). The last block runs only with JUDGMENT_LIVE=1 —
 * `npm run eval:judgment` — and spends real money: the judge is calibrated
 * first, then judges the live Guide on every themed case and every held-out
 * message, and every script the content lock says has not been judged since
 * it last changed. Without a key it records not-evaluated and fails.
 */

const INTENDED = process.env.JUDGMENT_LIVE === '1'
const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const LOCK = here('./judgment/content.lock.json')

type Decide = (text: string, property: PropertyId) => { verdict: string; evidence: string }

/** The properties a judge request asks about, read back from its input. */
const propertiesAsked = (input: string) => (Object.keys(PROPERTIES) as PropertyId[]).filter((p) => input.includes(`\n${p} (`) || input.startsWith(`THE PROPERTIES:\n${p} (`))

/** A stand-in judge: answers each property with what `decide` returns for the text. A guide request gets the offline voice. */
function standIn(decide: Decide, fail?: Parameters<typeof standInClient>[1]) {
  return standInClient((params: Params) => {
    const usage = { input_tokens: 500, output_tokens: 100 }
    const last = params.messages[params.messages.length - 1].content as string
    if (params.system === PROPERTY_RUBRIC) {
      const text = last.split('THE TEXT:\n')[1] ?? ''
      const out = Object.fromEntries(propertiesAsked(last).map((p) => [p, decide(text, p)]))
      return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(out) }], usage }
    }
    const c = [...CASES, ...HELD_OUT].find((x) => x.message === last)!
    return { stop_reason: 'end_turn', content: [{ type: 'text', text: localReply(c.message, c.context as never, c.mode).text }], usage }
  }, fail)
}

const HOLDS: Decide = () => ({ verdict: 'holds', evidence: 'fine' })
const BAD = new Set(CALIBRATION.map((c) => c.bad))
/** A judge that knows the removed lines when it sees them, quoting them. */
const SHARP: Decide = (text) => (BAD.has(text) ? { verdict: 'violated', evidence: text.slice(0, 20) } : HOLDS(text, 'NO_MOTIVE'))

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
    const { calls, client } = standIn(HOLDS)
    await judgeProperties(client, 'An answer.', 'A context.', props)
    expect(calls[0].system).toBe(PROPERTY_RUBRIC)
  })

  it('sends every themed case its theme’s properties', async () => {
    const { client, calls } = standIn(HOLDS)
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
    expect((await calibrate(standIn(HOLDS).client)).length).toBeGreaterThanOrEqual(10)
    // A judge that knows which is which, quoting the removed line, misses nothing.
    expect(await calibrate(standIn(SHARP).client)).toEqual([])
  })
})

describe('the judgment suite, end to end, earns one outcome per way a run can go', () => {
  const themed = new Set(Object.values(THEMES).flatMap((t) => t.cases))
  const input: JudgmentInput = {
    calibration: CALIBRATION.slice(0, 3),
    cases: CASES.filter((c) => themed.has(c.id)).slice(0, 3),
    heldOut: HELD_OUT.slice(0, 2),
    scripts: registry().slice(0, 2),
  }
  const EXPECTED = 3 + 3 + 2 + 2
  // Requests: 6 for calibration, 2 per Guide text (guide, judge), 1 per script.
  const REQUESTS = 6 + 5 * 2 + 2
  const answerOf = (c: (typeof CASES)[number]) => localReply(c.message, c.context as never, c.mode).text

  const dir = () => mkdtempSync(join(tmpdir(), 'niyyah-judgment-eval-'))
  const lockCopy = (results: string) => {
    const lock: Record<string, LockEntry> = JSON.parse(readFileSync(LOCK, 'utf8'))
    for (const e of input.scripts) lock[`script ${e.id}`] = { ...lock[`script ${e.id}`], judged: false }
    const path = join(results, 'content.lock.json')
    writeFileSync(path, JSON.stringify(lock, null, 2))
    return path
  }
  const run = (opts: Partial<Omit<Parameters<typeof judgmentSuite>[0], 'client'>> & { stand?: ReturnType<typeof standIn> }) => {
    const { stand, results: given, baseline, width, ...rest } = opts
    const results = given ?? dir()
    return judgmentSuite({ client: stand ? stand.client : null, input, results, baseline: baseline ?? join(results, 'baseline.live.json'), width: width ?? 1, session: stand?.session, ...rest })
  }
  const outcomeFile = (results: string) => validateOutcome(JSON.parse(readFileSync(join(results, 'outcome.json'), 'utf8')), 'judgment')

  it('a complete passing run: calibration, the Guide, the held-out set and the scripts, all judged; the baseline and the lock written', async () => {
    const results = dir()
    const lock = lockCopy(results)
    const { outcome, report } = await run({ stand: standIn(SHARP), results, lock: { path: lock, update: true } })
    expect(outcome.outcome).toBe('evaluated-pass')
    expect(outcome.run).toMatchObject({ expected: EXPECTED, started: EXPECTED, completed: EXPECTED, answered: EXPECTED, unavailable: 0, judged: EXPECTED, requests: REQUESTS, succeeded: REQUESTS, stopped: null })
    expect(outcome.gates).toEqual({ regressions: [], calibrationMisses: [] })
    expect(report!.results.map((r) => r.kind)).toEqual(['calibration', 'calibration', 'calibration', 'guide', 'guide', 'guide', 'held-out', 'held-out', 'script', 'script'])
    expect(existsSync(join(results, 'baseline.live.json'))).toBe(true)
    const after: Record<string, LockEntry> = JSON.parse(readFileSync(lock, 'utf8'))
    for (const e of input.scripts) expect(after[`script ${e.id}`].judged).toBe(true)
    expect(outcomeFile(results)).toEqual(outcome)
  })

  it('without UPDATE_JUDGMENT_LOCK the lock is left alone, even by a pass', async () => {
    const results = dir()
    const lock = lockCopy(results)
    const before = readFileSync(lock, 'utf8')
    await run({ stand: standIn(SHARP), results, lock: { path: lock, update: false } })
    expect(readFileSync(lock, 'utf8')).toBe(before)
  })

  it('a judge that fails calibration stops the run there: nothing further is spent, and the run fails on the judge', async () => {
    const stand = standIn(HOLDS)
    const { outcome } = await run({ stand })
    expect(outcome.outcome).toBe('evaluated-fail')
    expect(outcome.reason).toMatch(/incomplete — stopped after 3 of 10 \(judge: the judge missed 3 calibration lines/)
    expect(outcome.gates!.calibrationMisses).toHaveLength(3)
    expect(outcome.run).toMatchObject({ started: 3, completed: 3, judged: 3, requests: 6, succeeded: 6 })
    expect(stand.calls).toHaveLength(6)
  })

  it('a complete failing run: a hard property violated on the Guide fails the gates; the baseline is not written', async () => {
    const results = dir()
    const target = input.cases[1]
    const decide: Decide = (text, p) => (text === answerOf(target) && p === 'NO_MOTIVE' ? { verdict: 'violated', evidence: text.slice(0, 15) } : SHARP(text, p))
    const { outcome } = await run({ stand: standIn(decide), results })
    expect(outcome.outcome).toBe('evaluated-fail')
    expect(outcome.reason).toMatch(/quality gate failure/)
    expect(outcome.gates!.regressions[0]).toMatch(new RegExp(`hard property — ${target.id} NO_MOTIVE`))
    expect(outcome.run).toMatchObject({ completed: EXPECTED, judged: EXPECTED })
    expect(existsSync(join(results, 'baseline.live.json'))).toBe(false)
  })

  it('missing credentials: not-evaluated, nothing sent', async () => {
    const results = dir()
    const { outcome } = await run({ results })
    expect(outcome).toMatchObject({ outcome: 'not-evaluated', run: { expected: EXPECTED, requests: 0, stopped: { kind: 'credentials' } } })
    expect(outcomeFile(results).outcome).toBe('not-evaluated')
  })

  it('a billing failure before the first calibration line: not-evaluated, one request', async () => {
    const stand = standIn(SHARP, failAll(billingError))
    const { outcome } = await run({ stand })
    expect(outcome.outcome).toBe('not-evaluated')
    expect(outcome.run).toMatchObject({ started: 1, completed: 1, judged: 0, requests: 1, succeeded: 0 })
    expect(outcome.run!.stopped).toMatchObject({ kind: 'billing', requests: 1 })
    expect(outcome.errors[0]).toMatchObject({ item: 'calibration-01', stage: 'judge', kind: 'billing' })
  })

  it('a billing failure after calibration: evaluated-fail with the partial results kept', async () => {
    // Request 7 is the first Guide call.
    let n = 0
    const stand = standIn(SHARP, () => (++n >= 7 ? billingError() : undefined))
    const { outcome, report } = await run({ stand })
    expect(outcome.outcome).toBe('evaluated-fail')
    expect(outcome.reason).toMatch(/stopped after 4 of 10 \(billing/)
    expect(outcome.run).toMatchObject({ started: 4, completed: 4, answered: 3, unavailable: 1, judged: 3, requests: 7, succeeded: 6 })
    expect(report!.results[3]).toMatchObject({ kind: 'guide', source: 'unavailable', judgement: null })
    expect(existsSync(outcome.report!)).toBe(true)
  })

  it('a transient error is retried and does not stop a run that then passes', async () => {
    let n = 0
    const stand = standIn(SHARP, () => (++n === 2 ? serverError() : undefined))
    const { outcome } = await run({ stand })
    expect(outcome.outcome).toBe('evaluated-pass')
    expect(outcome.run).toMatchObject({ requests: REQUESTS + 1, succeeded: REQUESTS })
    expect(stand.waits).toEqual([1000])
  })

  it('infrastructure fallback: a Guide answer that cannot be fetched is not judged in the offline voice’s place, and the run cannot pass', async () => {
    const target = input.heldOut[0]
    let attempts = 0
    const stand = standIn(SHARP, (p) => (p.system !== PROPERTY_RUBRIC && (p.messages[p.messages.length - 1].content as string) === target.message && ++attempts <= 3 ? serverError() : undefined))
    const { outcome, report } = await run({ stand })
    expect(outcome.outcome).toBe('evaluated-fail')
    expect(outcome.reason).toMatch(/fell back to the offline voice because live inference was unavailable/)
    const row = report!.results.find((r) => r.id === target.id)!
    expect(row).toMatchObject({ source: 'unavailable', judgement: null, text: '' })
    expect(outcome.run).toMatchObject({ completed: EXPECTED, answered: EXPECTED - 1, unavailable: 1, judged: EXPECTED - 1, requests: REQUESTS + 2 - 1 })
  })

  it('missing judging: a verdict outside the schema leaves the text unjudged', async () => {
    const target = input.cases[0]
    const decide: Decide = (text, p) => (text === answerOf(target) ? { verdict: 'maybe', evidence: '' } : SHARP(text, p))
    const { outcome, report } = await run({ stand: standIn(decide) })
    expect(outcome.outcome).toBe('evaluated-fail')
    expect(outcome.reason).toMatch(/1 case not judged/)
    expect(report!.results.find((r) => r.id === target.id)!.error).toMatch(/nothing usable/)
  })

  it('an empty set is a defect, not a pass', async () => {
    const stand = standIn(SHARP)
    const { outcome } = await judgmentSuite({ client: stand.client, input: { calibration: [], cases: [], heldOut: [], scripts: [] }, results: dir(), baseline: join(dir(), 'b.json') })
    expect(outcome.outcome).toBe('evaluated-fail')
    expect(stand.calls).toHaveLength(0)
  })

  it('a fatal stop carried from the Guide suite: not-evaluated and nothing sent', async () => {
    const guide = { version: 1 as const, suite: 'guide' as const, at: new Date().toISOString(), outcome: 'not-evaluated' as const, reason: 'x', run: null, gates: null, errors: [], report: null }
    const stand = standIn(SHARP)
    const { outcome } = await run({ stand, upstream: { ...guide, run: { expected: 1, started: 1, completed: 1, answered: 0, declined: 0, unavailable: 1, judged: 0, requests: 1, succeeded: 0, stopped: { kind: 'billing', message: 'no credit', requests: 1 } } } })
    expect(outcome.outcome).toBe('not-evaluated')
    expect(outcome.reason).toMatch(/earlier suite in this run stopped on billing/)
    expect(stand.calls).toHaveLength(0)
  })
})

describe.skipIf(!INTENDED)('relationship judgment, live', () => {
  it(
    'calibrates, then judges the Guide, the held-out set, and every script not yet judged, in full',
    async () => {
      const themed = new Set(Object.values(THEMES).flatMap((t) => t.cases))
      const lock: Record<string, LockEntry> = JSON.parse(readFileSync(LOCK, 'utf8'))
      const { outcome, files } = await judgmentSuite({
        client: process.env.ANTHROPIC_API_KEY ? new Anthropic({ maxRetries: 0 }) : null,
        input: {
          calibration: CALIBRATION,
          cases: CASES.filter((c) => themed.has(c.id)),
          heldOut: HELD_OUT,
          scripts: registry().filter((e) => !lock[`script ${e.id}`]?.judged),
        },
        results: here('./judgment/results/'),
        baseline: here('./judgment/baseline.live.json'),
        update: process.env.UPDATE_JUDGMENT_BASELINE === '1',
        lock: { path: LOCK, update: process.env.UPDATE_JUDGMENT_LOCK === '1' },
        upstream: readUpstreamOutcome(process.env.EVAL_UPSTREAM_OUTCOME),
      })
      expect(outcome.outcome, `\n${outcome.reason}\n\nWritten:\n${files.map((f) => `  ${f}`).join('\n')}\n`).toBe('evaluated-pass')
    },
    60 * 60 * 1000,
  )
})
