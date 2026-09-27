import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { classify, readOutcome, readUpstreamOutcome, writeOutcome } from './artifacts'
import { applicabilityCommand, verdictCommand } from './check'
import { ARTIFACT, RESULTS, notEvaluated, notRequired, outcomeOf, type Outcome, type Suite, type Tally } from './outcome'

/**
 * The workflow's side of the outcome (docs/GUIDE-EVAL.md, "Outcomes"): the
 * two commands .github/workflows/guide-eval.yml runs, driven here against a
 * temporary root, and the shape of the workflow itself — that it runs on
 * every pull request, ends on the verdict whatever came before, and no
 * longer greps a log to turn a failure into a pass.
 */

const at = '2026-09-27T12:00:00.000Z'
const full = (n: number): Tally => ({ expected: n, started: n, completed: n, answered: n, declined: 0, unavailable: 0, judged: n, requests: 2 * n, succeeded: 2 * n, responses: { needed: 2 * n, accounted: 2 * n }, stopped: null })
const pass = (s: Suite) => outcomeOf(s, at, full(3), { regressions: [], calibrationMisses: [] }, [], 'live-x.json')

/** A report that supports `outcome` row for row, written where the check looks for it. Guide texts only, so both suites take two responses per row. */
function writeReport(root: string, outcome: Outcome, over: Record<string, unknown> = {}): string {
  const run = outcome.run!
  const rows = Array.from({ length: run.completed }, () => (outcome.suite === 'guide' ? { source: 'live', judge: {} } : { kind: 'guide', source: 'live', judgement: {} }))
  const report =
    outcome.suite === 'guide'
      ? { suite: 'guide', at: outcome.at, expected: run.expected, started: run.started, requests: run.requests, succeeded: run.succeeded, stopped: run.stopped, cases: rows, ...over }
      : { suite: 'judgment', at: outcome.at, intended: { pairs: 0, guide: run.expected, scripts: 0 }, expected: run.expected, started: run.started, requests: run.requests, succeeded: run.succeeded, stopped: run.stopped, results: rows, ...over }
  const path = join(root, RESULTS[outcome.suite], outcome.report!)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(report))
  return path
}
const root = () => mkdtempSync(join(tmpdir(), 'niyyah-eval-root-'))

describe('the outcome files on disk', () => {
  it('writes each suite to its own path and reads it back validated', () => {
    const r = root()
    expect(writeOutcome(r, pass('guide'))).toBe(join(r, ARTIFACT.guide))
    writeReport(r, pass('guide'))
    expect(writeOutcome(r, notRequired('judgment', at, 'x'))).toBe(join(r, ARTIFACT.judgment))
    expect(readOutcome(r, 'guide')).toEqual(pass('guide'))
    expect(readOutcome(r, 'judgment')).toMatchObject({ outcome: 'not-required' })
  })

  it('returns an Error, never throws, for a file that is missing, not JSON, malformed or for the other suite', () => {
    const r = root()
    expect(readOutcome(r, 'guide')).toBeInstanceOf(Error)
    expect((readOutcome(r, 'guide') as Error).message).toMatch(/was not written/)
    writeOutcome(r, pass('guide'))
    writeReport(r, pass('guide'))
    writeFileSync(join(r, ARTIFACT.guide), '{not json')
    expect((readOutcome(r, 'guide') as Error).message).toMatch(/is not JSON/)
    writeFileSync(join(r, ARTIFACT.guide), JSON.stringify({ ...pass('guide'), outcome: 'evaluated-fail' }))
    expect((readOutcome(r, 'guide') as Error).message).toMatch(/says evaluated-fail but its own numbers earn evaluated-pass/)
    writeFileSync(join(r, ARTIFACT.guide), JSON.stringify(pass('judgment')))
    expect((readOutcome(r, 'guide') as Error).message).toMatch(/suite is "judgment"/)
  })

  it('a pass is believed only with its report behind it: missing, unreadable, another suite’s, another run’s or a report that does not add up is refused', () => {
    const r = root()
    writeOutcome(r, pass('guide'))
    expect((readOutcome(r, 'guide') as Error).message).toMatch(/names tests\/guide-eval\/results\/live-x.json, which was not written/)
    const path = writeReport(r, pass('guide'))
    expect(readOutcome(r, 'guide')).toEqual(pass('guide'))
    writeFileSync(path, '{')
    expect((readOutcome(r, 'guide') as Error).message).toMatch(/live-x.json is not JSON/)
    writeReport(r, pass('guide'), { suite: 'judgment' })
    expect((readOutcome(r, 'guide') as Error).message).toMatch(/belongs to "judgment", not to the guide suite/)
    writeReport(r, pass('guide'), { at: '2026-09-26T12:00:00.000Z' })
    expect((readOutcome(r, 'guide') as Error).message).toMatch(/not from this outcome's run/)
    writeReport(r, pass('guide'), { cases: [{ source: 'live', judge: {} }, { source: 'live', judge: {} }, { source: 'live', judge: null }] })
    expect((readOutcome(r, 'guide') as Error).message).toMatch(/does not support the outcome: judged 3 in the outcome, 2 in the report; responses.accounted 6 in the outcome, 5 in the report/)
    writeReport(r, pass('guide'), { cases: [{ source: 'live', judge: {} }] })
    expect((readOutcome(r, 'guide') as Error).message).toMatch(/completed 3 in the outcome, 1 in the report/)
    writeReport(r, pass('guide'), { cases: 'none' })
    expect((readOutcome(r, 'guide') as Error).message).toMatch(/report.cases is not an array/)
    writeReport(r, pass('guide'), { succeeded: 5 })
    expect((readOutcome(r, 'guide') as Error).message).toMatch(/succeeded 6 in the outcome, 5 in the report/)
    // A pass whose file says report: null is refused before the report is even looked for.
    writeFileSync(join(r, ARTIFACT.guide), JSON.stringify({ ...pass('guide'), report: null }))
    expect((readOutcome(r, 'guide') as Error).message).toMatch(/names no report/)
    // A report name that is a path is refused: reports live in the suite's results directory and nowhere else.
    writeFileSync(join(r, ARTIFACT.guide), JSON.stringify({ ...pass('guide'), report: '../../../etc/passwd' }))
    expect((readOutcome(r, 'guide') as Error).message).toMatch(/neither a report file name/)
    // The judgment suite's report is recounted by its own arithmetic.
    writeOutcome(r, pass('judgment'))
    writeReport(r, pass('judgment'))
    expect(readOutcome(r, 'judgment')).toEqual(pass('judgment'))
    writeReport(r, pass('judgment'), { intended: { pairs: 0, guide: 2, scripts: 1 } })
    expect((readOutcome(r, 'judgment') as Error).message).toMatch(/responses.needed 6 in the outcome, 5 in the report/)
    writeReport(r, pass('judgment'), { results: [{ kind: 'calibration', judgement: {} }, { kind: 'guide', source: 'live', judgement: {} }, { kind: 'script', judgement: {} }] })
    expect((readOutcome(r, 'judgment') as Error).message).toMatch(/responses.accounted 6 in the outcome, 5 in the report/)
    unlinkSync(join(r, RESULTS.judgment, 'live-x.json'))
    expect((readOutcome(r, 'judgment') as Error).message).toMatch(/was not written/)
  })

  it('an upstream outcome is read only when it is whole; anything else is treated as none', () => {
    const r = root()
    expect(readUpstreamOutcome(undefined)).toBeNull()
    expect(readUpstreamOutcome(join(r, 'nothing.json'))).toBeNull()
    const path = writeOutcome(r, notEvaluated('guide', at, 3, 6, { kind: 'billing', message: 'credit', requests: 1 }))
    expect(readUpstreamOutcome(path)).toMatchObject({ run: { stopped: { kind: 'billing' } } })
    writeFileSync(path, '{}')
    expect(readUpstreamOutcome(path)).toBeNull()
  })

  it('classifying a change writes not-required for the suites it does not need, and nothing for those it does', () => {
    const r = root()
    const a = classify(r, { kind: 'pull_request', changed: ['netlify/shared/prompt.ts'] }, at)
    expect(a).toMatchObject({ guide: { required: true }, judgment: { required: true } })
    expect(existsSync(join(r, ARTIFACT.guide))).toBe(false)
    expect(existsSync(join(r, ARTIFACT.judgment))).toBe(false)
    const b = classify(r, { kind: 'pull_request', changed: ['tests/guide-eval/exemplars.ts'] }, at)
    expect(b.judgment.required).toBe(false)
    expect(readOutcome(r, 'judgment')).toMatchObject({ outcome: 'not-required', at, reason: b.judgment.reason })
    expect(existsSync(join(r, ARTIFACT.guide))).toBe(false)
  })
})

describe('the two commands the workflow runs', () => {
  it('applicability, for a pull request, reads the changed files and prints one output per suite', () => {
    const r = root()
    const changed = join(r, 'changed.txt')
    writeFileSync(changed, 'docs/OPS.md\nsrc/data/read.ts\n\n')
    const out = applicabilityCommand(['--event', 'pull_request', '--changed', changed], r)
    expect(out.exit).toBe(0)
    expect(out.outputs).toEqual(['guide=not-required', 'judgment=required'])
    expect(out.lines[0]).toMatch(/^guide: not required — none of the 2 changed files/)
    expect(out.lines[1]).toMatch(/^judgment: required — the change touches src\/data\/read.ts/)
    expect(readOutcome(r, 'guide')).toMatchObject({ outcome: 'not-required' })
    expect(readOutcome(r, 'judgment')).toBeInstanceOf(Error)
  })

  it('applicability, for a manual run, requires what was asked and refuses what it does not understand', () => {
    const r = root()
    expect(applicabilityCommand(['--event', 'dispatch', '--suites', 'guide'], r).outputs).toEqual(['guide=required', 'judgment=not-required'])
    expect(applicabilityCommand(['--event', 'dispatch'], root()).outputs).toEqual(['guide=required', 'judgment=required'])
    expect(applicabilityCommand(['--event', 'dispatch', '--suites', 'everything'], root()).exit).toBe(2)
    expect(applicabilityCommand(['--event', 'push'], root()).exit).toBe(2)
    expect(applicabilityCommand(['--event', 'pull_request'], root()).exit).toBe(2)
  })

  it('verdict passes only when every required suite passed, and prints what each did', () => {
    const r = root()
    writeOutcome(r, pass('guide'))
    writeReport(r, pass('guide'))
    writeOutcome(r, notRequired('judgment', at, 'unrelated'))
    const ok = verdictCommand(['--guide', 'required', '--judgment', 'not-required'], r)
    expect(ok.exit).toBe(0)
    expect(ok.lines.join('\n')).toMatch(/guide: evaluated-pass/)
    expect(ok.lines.join('\n')).toMatch(/branch protection/)
    const missing = verdictCommand(['--guide', 'required', '--judgment', 'required'], r)
    expect(missing.exit).toBe(1)
    expect(missing.lines.join('\n')).toMatch(/judgment was required .* and is not-required/)
    expect(verdictCommand(['--guide', 'required'], r).exit).toBe(1)
    expect(verdictCommand(['--guide', 'required', '--judgment', 'maybe'], r).exit).toBe(1)
    expect(verdictCommand(['--guide', 'required', '--judgment', 'not-required'], root()).exit).toBe(1)
  })

  it('runs under plain Node with no dependencies, as the workflow runs it before npm ci', () => {
    const r = root()
    const changed = join(r, 'changed.txt')
    writeFileSync(changed, 'README.md\n')
    const out = join(r, 'outputs.txt')
    const node = (...args: string[]) =>
      execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', join(process.cwd(), 'tests/eval/check.ts'), ...args], { cwd: r, encoding: 'utf8', env: { PATH: process.env.PATH } })
    expect(node('applicability', '--event', 'pull_request', '--changed', changed, '--github-output', out)).toMatch(/guide: not required/)
    expect(readFileSync(out, 'utf8')).toBe('guide=not-required\njudgment=not-required\n')
    expect(node('verdict', '--guide', 'not-required', '--judgment', 'not-required')).toMatch(/Every required suite is evaluated-pass/)
    let failed: { status: number; stdout: string } | null = null
    try {
      node('verdict', '--guide', 'required', '--judgment', 'not-required')
    } catch (err) {
      failed = err as { status: number; stdout: string }
    }
    expect(failed?.status).toBe(1)
    expect(failed?.stdout).toMatch(/::error::/)
  })
})

describe('the workflow', () => {
  const yml = readFileSync('.github/workflows/guide-eval.yml', 'utf8')
  const code = yml
    .split('\n')
    .filter((l) => !l.trim().startsWith('#'))
    .join('\n')

  it('runs on every pull request, so a check exists for every one, and decides applicability itself', () => {
    expect(code).toMatch(/\n  pull_request:\s*\n/)
    expect(code).not.toMatch(/pull_request:\s*\n\s+paths:/)
    expect(code).toContain('check.ts applicability')
    expect(code).toContain('--event pull_request --changed')
    expect(code).toContain('--event dispatch --suites')
    expect(code).toMatch(/workflow_dispatch:\s*\n\s+inputs:\s*\n\s+suites:/)
  })

  it('ends on the verdict, which runs whatever came before and reads what the first step decided', () => {
    const steps = code.split(/\n\s+- (?:name|uses):/).slice(1)
    const last = steps[steps.length - 1]
    expect(last).toMatch(/if: always\(\)/)
    expect(last).toContain('check.ts verdict')
    expect(last).toContain('--guide "${{ steps.which.outputs.guide }}"')
    expect(last).toContain('--judgment "${{ steps.which.outputs.judgment }}"')
  })

  it('no longer turns a credit failure into a pass by reading the log', () => {
    expect(code).not.toMatch(/grep .*credit/)
    expect(code).not.toContain('exit 0')
    expect(code).not.toMatch(/::warning::/)
  })

  it('spends only when a suite is required, and the second suite reads the first’s outcome before sending anything', () => {
    expect(code).toMatch(/npm ci[\s\S]*?/)
    expect(code).toMatch(/if: steps\.which\.outputs\.guide == 'required' \|\| steps\.which\.outputs\.judgment == 'required'\s*\n\s+run: npm ci/)
    expect(code).toMatch(/if: steps\.which\.outputs\.guide == 'required'\s*\n\s+env:[\s\S]*?run: npm run eval:guide/)
    expect(code).toMatch(/steps\.which\.outputs\.judgment == 'required'[\s\S]*?EVAL_UPSTREAM_OUTCOME: tests\/guide-eval\/results\/outcome\.json[\s\S]*?run: npm run eval:judgment/)
    // The SDK's own retries are off in the suites, so every request is the session's to count.
    for (const file of ['tests/guide-eval-live.test.ts', 'tests/judgment-live.test.ts']) expect(readFileSync(file, 'utf8')).toContain('new Anthropic({ maxRetries: 0 })')
  })

  it('reads the repository and nothing else, and uploads both results directories', () => {
    expect(code).toMatch(/permissions:\s*\n\s+contents: read/)
    for (const s of ['guide-eval', 'judgment']) expect(code).toContain(`tests/${s}/results/`)
    expect(code).toContain('tests/guide-eval/results/outcome.json')
    expect(code).toContain('tests/judgment/results/outcome.json')
  })
})
