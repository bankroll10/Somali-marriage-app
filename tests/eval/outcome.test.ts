import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ARTIFACT,
  NOT_MEASURED,
  REQUIRES,
  RESULTS,
  SUITES,
  applicability,
  decide,
  emptyTally,
  matchesRule,
  notEvaluated,
  notRequired,
  outcomeOf,
  validateOutcome,
  verdict,
  type Gates,
  type Outcome,
  type PathRule,
  type Suite,
  type Tally,
} from './outcome'

/**
 * The outcome logic, pinned directly (docs/GUIDE-EVAL.md, "Outcomes"): what a
 * tally earns, what a file must look like to be believed, which changes
 * require which suite, and what the check says. The harnesses' own tests
 * (tests/guide-eval-live.test.ts, tests/judgment-live.test.ts) drive the same
 * logic end to end with stand-in models.
 */

const NONE: Gates = { regressions: [], calibrationMisses: [] }
const full = (n: number, over: Partial<Tally> = {}): Tally => ({ expected: n, started: n, completed: n, answered: n, declined: 0, unavailable: 0, judged: n, requests: 2 * n, succeeded: 2 * n, stopped: null, ...over })

describe('what a run earns', () => {
  it('passes only a complete run with every gate clean', () => {
    expect(decide(full(10), NONE)).toMatchObject({ outcome: 'evaluated-pass' })
    expect(decide(full(10, { declined: 2 }), NONE).outcome).toBe('evaluated-pass')
  })

  it('an empty case set fails, whatever else is true', () => {
    expect(decide(emptyTally(0), NONE)).toMatchObject({ outcome: 'evaluated-fail', reason: expect.stringMatching(/empty/) })
  })

  it('no successful request is not-evaluated, naming why', () => {
    expect(decide({ ...emptyTally(10), stopped: { kind: 'credentials', message: 'no key', requests: 0 } }, NONE)).toMatchObject({ outcome: 'not-evaluated', reason: expect.stringMatching(/credentials: no key/) })
    expect(decide({ ...emptyTally(10), started: 1, completed: 1, unavailable: 1, requests: 1, stopped: { kind: 'billing', message: 'credit', requests: 1 } }, NONE).outcome).toBe('not-evaluated')
    expect(decide({ ...emptyTally(10), started: 1, completed: 1, unavailable: 1, requests: 3 }, NONE, [{ item: 'a', stage: 'guide', kind: 'transient', status: 500, message: 'down', attempt: 3 }])).toMatchObject({ outcome: 'not-evaluated', reason: expect.stringMatching(/transient: down/) })
  })

  it('an incomplete run fails, and says every way it is incomplete', () => {
    const stopped = decide(full(10, { started: 5, completed: 5, answered: 4, unavailable: 1, judged: 4, stopped: { kind: 'billing', message: 'credit', requests: 9 } }), NONE)
    expect(stopped.outcome).toBe('evaluated-fail')
    expect(stopped.reason).toMatch(/stopped after 5 of 10 \(billing: credit\)/)
    expect(stopped.reason).toMatch(/1 case fell back to the offline voice/)
    expect(stopped.reason).toMatch(/1 case not judged/)
    expect(decide(full(10, { started: 8, completed: 8, answered: 8, judged: 8 }), NONE).reason).toMatch(/2 cases never started/)
    expect(decide(full(10, { unavailable: 1, answered: 9 }), NONE).reason).toMatch(/unavailable/)
    expect(decide(full(10, { judged: 9 }), NONE).reason).toMatch(/1 case not judged/)
    expect(decide(full(10, { completed: 9, answered: 9, judged: 9 }), NONE).reason).toMatch(/1 case started and never recorded/)
  })

  it('infrastructure fallback never counts as coverage, even when every gate is clean', () => {
    expect(decide(full(10, { answered: 9, unavailable: 1, judged: 9 }), NONE).outcome).toBe('evaluated-fail')
  })

  it('gates fail a complete run: the judge’s calibration first, then the suite’s own', () => {
    expect(decide(full(3), { regressions: [], calibrationMisses: ['a', 'b'] }).outcome).toBe('evaluated-pass')
    expect(decide(full(3), { regressions: [], calibrationMisses: ['a', 'b', 'c'] })).toMatchObject({ outcome: 'evaluated-fail', reason: expect.stringMatching(/missed 3 calibration lines/) })
    expect(decide(full(3), { regressions: ['hard gate — x', 'judge tone: 5 → 4'], calibrationMisses: [] })).toMatchObject({ outcome: 'evaluated-fail', reason: expect.stringMatching(/2 quality gate failures: hard gate — x; …/) })
  })

  it('incompleteness outranks a clean gate: a partial run with no regressions still fails', () => {
    expect(decide(full(10, { started: 9, completed: 9, answered: 9, judged: 9 }), NONE).outcome).toBe('evaluated-fail')
  })
})

describe('the outcome file', () => {
  const at = '2026-09-27T12:00:00.000Z'
  const pass = outcomeOf('guide', at, full(4), NONE, [], 'tests/guide-eval/results/live-x.json')

  it('round-trips through JSON as itself', () => {
    expect(validateOutcome(JSON.parse(JSON.stringify(pass)), 'guide')).toEqual(pass)
    const nr = notRequired('judgment', at, 'nothing changed')
    expect(validateOutcome(JSON.parse(JSON.stringify(nr)), 'judgment')).toEqual(nr)
    const ne = notEvaluated('guide', at, 4, { kind: 'credentials', message: 'no key', requests: 0 })
    expect(validateOutcome(JSON.parse(JSON.stringify(ne)), 'guide')).toEqual(ne)
  })

  it('refuses what is missing or malformed, naming the field', () => {
    const bad = (mutate: (o: Record<string, unknown>) => void, suite: Suite = 'guide') => {
      const o = JSON.parse(JSON.stringify(pass)) as Record<string, unknown>
      mutate(o)
      return () => validateOutcome(o, suite)
    }
    expect(() => validateOutcome(undefined, 'guide')).toThrow(/not an object/)
    expect(() => validateOutcome('pass', 'guide')).toThrow(/not an object/)
    expect(bad((o) => (o.version = 2))).toThrow(/version/)
    expect(bad(() => undefined, 'judgment')).toThrow(/suite is "guide", expected "judgment"/)
    expect(bad((o) => (o.at = 'yesterday'))).toThrow(/at is not a date/)
    expect(bad((o) => (o.outcome = 'passed'))).toThrow(/outcome is "passed"/)
    expect(bad((o) => (o.reason = ' '))).toThrow(/reason is empty/)
    expect(bad((o) => delete o.run)).toThrow(/run is missing/)
    expect(bad((o) => ((o.run as Record<string, unknown>).judged = -1))).toThrow(/judged is not a count/)
    expect(bad((o) => ((o.run as Record<string, unknown>).judged = 1.5))).toThrow(/judged is not a count/)
    expect(bad((o) => delete o.gates)).toThrow(/gates is missing/)
    expect(bad((o) => (o.errors = 'none'))).toThrow(/errors is not an array/)
    expect(bad((o) => (o.errors = [{ item: 'a' }]))).toThrow(/errors\[0\] is malformed/)
    expect(bad((o) => (o.errors = [{ item: 'a', stage: 'model', kind: 'auth', status: 401, message: 'm', attempt: 1 }]))).toThrow(/stage/)
    expect(bad((o) => (o.errors = [{ item: 'a', stage: 'guide', kind: 'oops', status: 401, message: 'm', attempt: 1 }]))).toThrow(/kind/)
    expect(bad((o) => (o.report = 7))).toThrow(/report/)
    expect(bad((o) => ((o.run as Record<string, unknown>).stopped = 'billing'))).toThrow(/stopped is malformed/)
  })

  it('refuses numbers that cannot be true', () => {
    const tally = (over: Partial<Tally>) => () => validateOutcome(JSON.parse(JSON.stringify({ ...pass, run: { ...pass.run!, ...over } })), 'guide')
    expect(tally({ started: 5 })).toThrow(/started exceeds expected/)
    expect(tally({ completed: 5, started: 4 })).toThrow(/completed exceeds started/)
    expect(tally({ unavailable: 1 })).toThrow(/answered \+ unavailable exceeds completed/)
    expect(tally({ declined: 5 })).toThrow(/declined exceeds answered/)
    expect(tally({ judged: 5 })).toThrow(/judged exceeds completed/)
    expect(tally({ succeeded: 9 })).toThrow(/succeeded exceeds requests/)
  })

  it('refuses a file that contradicts its own numbers', () => {
    const claim = (outcome: Outcome['outcome'], over: Partial<Tally> = {}, gates = NONE) => () =>
      validateOutcome(JSON.parse(JSON.stringify({ ...pass, outcome, run: { ...pass.run!, ...over }, gates })), 'guide')
    expect(claim('evaluated-pass', { judged: 3 })).toThrow(/says evaluated-pass but its own numbers earn evaluated-fail/)
    expect(claim('evaluated-pass', { answered: 3, unavailable: 1 })).toThrow(/earn evaluated-fail/)
    expect(claim('evaluated-pass', {}, { regressions: ['hard gate — x'], calibrationMisses: [] })).toThrow(/earn evaluated-fail/)
    expect(claim('evaluated-fail')).toThrow(/says evaluated-fail but its own numbers earn evaluated-pass/)
    expect(claim('not-evaluated')).toThrow(/earn evaluated-pass/)
    expect(claim('evaluated-pass', { ...emptyTally(4), stopped: { kind: 'billing', message: 'x', requests: 1 } })).toThrow(/earn not-evaluated/)
    // A not-required file cannot carry a run, gates or errors.
    expect(() => validateOutcome({ ...notRequired('guide', at, 'x'), run: pass.run }, 'guide')).toThrow(/not-required outcome records a run/)
    expect(() => validateOutcome({ ...notRequired('guide', at, 'x'), errors: pass.errors.concat([{ item: 'a', stage: 'guide', kind: 'auth', status: 401, message: 'm', attempt: 1 }]) }, 'guide')).toThrow(/records errors/)
  })

  it('has its own path per suite, under that suite’s results directory', () => {
    expect(ARTIFACT.guide).not.toBe(ARTIFACT.judgment)
    for (const s of SUITES) expect(ARTIFACT[s]).toBe(`${RESULTS[s]}/outcome.json`)
    expect(dirname(ARTIFACT.guide)).not.toBe(dirname(ARTIFACT.judgment))
    // Both directories are gitignored: runs are never committed (docs/GUIDE-EVAL.md).
    const ignore = readFileSync('.gitignore', 'utf8')
    for (const s of SUITES) expect(ignore).toContain(`${RESULTS[s]}/`)
  })
})

describe('which changes require which suite', () => {
  const root = process.cwd()

  /** Every file a module reaches through value imports, relative to the repository. Type-only imports are erased and change nothing at runtime. */
  function importGraph(entry: string): string[] {
    const seen = new Set<string>()
    const stack = [resolve(root, entry)]
    while (stack.length) {
      const file = stack.pop()!
      if (seen.has(file)) continue
      seen.add(file)
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(/(?:import|export)(?!\s+type\b)[^'"]*?from\s+['"](\.[^'"]+)['"]|import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
        const spec = m[1] ?? m[2]
        const base = resolve(dirname(file), spec)
        const found = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find((c) => existsSync(c) && statSync(c).isFile())
        if (!found) throw new Error(`${relative(root, file)} imports ${spec}, which does not resolve`)
        stack.push(found)
      }
    }
    return [...seen].map((f) => relative(root, f)).sort()
  }

  const ENTRY: Record<Suite, string> = { guide: 'tests/guide-eval-live.test.ts', judgment: 'tests/judgment-live.test.ts' }
  const covered = (rules: PathRule[], path: string) => rules.some((r) => matchesRule(r, path))

  for (const suite of SUITES) {
    it(`${suite}: every file the suite actually imports is either required or named as not measured, with a reason`, () => {
      const graph = importGraph(ENTRY[suite])
      const unlisted = graph.filter((f) => !covered(REQUIRES[suite], f) && !covered(NOT_MEASURED[suite], f))
      expect(unlisted, `add each to REQUIRES.${suite} or NOT_MEASURED.${suite} in tests/eval/outcome.ts`).toEqual([])
      const both = graph.filter((f) => covered(REQUIRES[suite], f) && covered(NOT_MEASURED[suite], f))
      expect(both, 'a file cannot be both required and not measured').toEqual([])
      for (const r of [...REQUIRES[suite], ...NOT_MEASURED[suite]]) {
        expect(r.why.length, r.path).toBeGreaterThan(8)
        if (!r.path.endsWith('results/')) expect(existsSync(join(root, r.path)), `${r.path} does not exist`).toBe(true)
      }
    })
  }

  it('the workflow, the eval scripts, the live test files and the outcome layer require both suites', () => {
    for (const path of ['.github/workflows/guide-eval.yml', 'package.json', 'tests/eval/outcome.ts', 'tests/eval/check.ts']) {
      const a = applicability({ kind: 'pull_request', changed: [path] })
      expect(a.guide.required, path).toBe(true)
      expect(a.judgment.required, path).toBe(true)
    }
    expect(applicability({ kind: 'pull_request', changed: ['tests/guide-eval-live.test.ts'] })).toMatchObject({ guide: { required: true }, judgment: { required: false } })
    expect(applicability({ kind: 'pull_request', changed: ['tests/judgment-live.test.ts'] })).toMatchObject({ guide: { required: false }, judgment: { required: true } })
  })

  it('what the Guide is sent requires both; relationship content requires judgment only; Guide exemplars require the Guide only', () => {
    for (const path of ['netlify/shared/prompt.ts', 'netlify/functions/guide.ts', 'src/lib/coach.ts', 'tests/guide-eval/cases.ts']) {
      expect(applicability({ kind: 'pull_request', changed: [path] }), path).toMatchObject({ guide: { required: true }, judgment: { required: true } })
    }
    for (const path of ['src/data/read.ts', 'src/data/beforeYes.ts', 'src/data/families.ts', 'tests/judgment/heldout.ts', 'tests/judgment/content.lock.json']) {
      expect(applicability({ kind: 'pull_request', changed: [path] }), path).toMatchObject({ guide: { required: false }, judgment: { required: true } })
    }
    expect(applicability({ kind: 'pull_request', changed: ['tests/guide-eval/exemplars.ts'] })).toMatchObject({ guide: { required: true }, judgment: { required: false } })
  })

  it('an unrelated change requires neither, and says so', () => {
    const a = applicability({ kind: 'pull_request', changed: ['src/screens/Looking.tsx', 'docs/OPS.md', 'netlify/functions/introduce.ts', 'netlify/shared/limit.ts', 'package-lock.json'] })
    expect(a.guide).toEqual({ required: false, reason: 'none of the 5 changed files is one the guide suite measures' })
    expect(a.judgment.required).toBe(false)
    expect(applicability({ kind: 'pull_request', changed: [] }).guide.required).toBe(false)
  })

  it('names the files that required a suite', () => {
    const a = applicability({ kind: 'pull_request', changed: ['README.md', 'netlify/shared/prompt.ts'] })
    expect(a.guide.reason).toBe('the change touches netlify/shared/prompt.ts (the system prompt)')
  })

  it('a manual run has no diff: it requires the suites it was started for', () => {
    expect(applicability({ kind: 'dispatch', suites: 'both' })).toMatchObject({ guide: { required: true }, judgment: { required: true } })
    const g = applicability({ kind: 'dispatch', suites: 'guide' })
    expect(g.guide).toMatchObject({ required: true })
    expect(g.judgment).toEqual({ required: false, reason: 'run by hand, asking for the guide suite only' })
  })

  it('a directory rule matches its files and nothing beside them', () => {
    const rule = { path: 'tests/judgment/', why: 'x' }
    expect(matchesRule(rule, 'tests/judgment/judge.ts')).toBe(true)
    expect(matchesRule(rule, 'tests/judgment-live.test.ts')).toBe(false)
    expect(matchesRule({ path: 'package.json', why: 'x' }, 'package.json.bak')).toBe(false)
  })
})

describe('the verdict', () => {
  const at = '2026-09-27T12:00:00.000Z'
  const pass = (s: Suite) => outcomeOf(s, at, full(4), NONE, [], null)
  const fail = (s: Suite) => outcomeOf(s, at, full(4), { regressions: ['hard gate — x'], calibrationMisses: [] }, [], null)
  const none = (s: Suite) => notEvaluated(s, at, 4, { kind: 'credentials', message: 'no key', requests: 0 })
  const nr = (s: Suite) => notRequired(s, at, 'unrelated')
  const req = { required: true, reason: 'touches the prompt' }
  const not = { required: false, reason: 'unrelated' }

  it('passes when every required suite passed and the rest are not required', () => {
    expect(verdict({ guide: req, judgment: req }, { guide: pass('guide'), judgment: pass('judgment') }).ok).toBe(true)
    expect(verdict({ guide: req, judgment: not }, { guide: pass('guide'), judgment: nr('judgment') }).ok).toBe(true)
    const v = verdict({ guide: not, judgment: not }, { guide: nr('guide'), judgment: nr('judgment') })
    expect(v.ok).toBe(true)
    expect(v.lines[0]).toBe('guide: not-required — unrelated')
  })

  it('a required suite that is anything but evaluated-pass fails the check', () => {
    for (const got of [fail('guide'), none('guide'), nr('guide')]) {
      const v = verdict({ guide: req, judgment: not }, { guide: got, judgment: nr('judgment') })
      expect(v.ok, got.outcome).toBe(false)
      expect(v.failures[0]).toMatch(new RegExp(`guide was required \\(touches the prompt\\) and is ${got.outcome}`))
    }
  })

  it('a suite that was not required: not-evaluated is visible and does not fail; evaluated-fail still fails', () => {
    const quiet = verdict({ guide: not, judgment: not }, { guide: none('guide'), judgment: nr('judgment') })
    expect(quiet.ok).toBe(true)
    expect(quiet.lines.some((l) => l.includes('not required, and not evaluated'))).toBe(true)
    const loud = verdict({ guide: not, judgment: not }, { guide: fail('guide'), judgment: nr('judgment') })
    expect(loud.ok).toBe(false)
    expect(loud.failures[0]).toMatch(/not required and ran anyway, and failed/)
    expect(verdict({ guide: not, judgment: not }, { guide: pass('guide'), judgment: nr('judgment') }).ok).toBe(true)
  })

  it('fails closed on a missing or malformed file, and on an applicability it cannot read', () => {
    const missing = verdict({ guide: req, judgment: req }, { guide: pass('guide'), judgment: new Error('tests/judgment/results/outcome.json was not written') })
    expect(missing.ok).toBe(false)
    expect(missing.failures[0]).toMatch(/judgment: the outcome file is missing or malformed — .*was not written/)
    const unknown = verdict({ guide: null, judgment: not }, { guide: pass('guide'), judgment: nr('judgment') })
    expect(unknown.ok).toBe(false)
    expect(unknown.failures[0]).toMatch(/could not tell whether this suite was required/)
    // Even a suite that was not required must have a file: a missing one is a broken run, not a quiet one.
    expect(verdict({ guide: not, judgment: not }, { guide: nr('guide'), judgment: new Error('gone') }).ok).toBe(false)
  })

  it('reports the numbers beside each outcome', () => {
    const v = verdict({ guide: req, judgment: not }, { guide: pass('guide'), judgment: nr('judgment') })
    expect(v.lines[0]).toMatch(/guide: evaluated-pass — .* \[4\/4 answered, 4 judged, 0 unavailable, 8 requests\]/)
  })
})
