/**
 * The outcome of a live evaluation suite, as a structured record
 * (docs/GUIDE-EVAL.md, "Outcomes").
 *
 * Two suites spend money against the model: the Guide eval
 * (tests/guide-eval-live.test.ts) and relationship judgment
 * (tests/judgment-live.test.ts). Each run of either ends in exactly one of
 * four outcomes, written to its own file so neither can overwrite the other:
 *
 *   evaluated-pass   every intended case answered by the live model, every
 *                    one judged, every quality gate passed;
 *   evaluated-fail   the model was reached but the run cannot pass — a gate
 *                    failed, or the run is incomplete (a case fell back to the
 *                    offline voice because inference was unavailable, a judge
 *                    call failed, the run stopped early);
 *   not-evaluated    no request to the model succeeded — no key, a fatal
 *                    authentication or billing failure before the first case;
 *   not-required     the change under review does not touch what the suite
 *                    measures, so it was not run.
 *
 * The workflow's last step (./check.ts) reads both files and fails closed on
 * anything missing, malformed or contradictory. This module has no imports so
 * that step can run under plain Node before `npm ci`.
 *
 * Everything here is pure; tests/eval/outcome.test.ts pins it. The counting
 * happens in ./session.ts and the two harnesses.
 */

export type Suite = 'guide' | 'judgment'
export const SUITES: readonly Suite[] = ['guide', 'judgment']

export type OutcomeKind = 'evaluated-pass' | 'evaluated-fail' | 'not-evaluated' | 'not-required'
export const OUTCOMES: readonly OutcomeKind[] = ['evaluated-pass', 'evaluated-fail', 'not-evaluated', 'not-required']

/** Where each suite writes its runs. Gitignored; CI uploads them. */
export const RESULTS: Record<Suite, string> = {
  guide: 'tests/guide-eval/results',
  judgment: 'tests/judgment/results',
}

/** The outcome file: one per suite, in its own directory, so neither suite can overwrite the other's. */
export const OUTCOME_FILE = 'outcome.json'
export const ARTIFACT: Record<Suite, string> = {
  guide: `${RESULTS.guide}/${OUTCOME_FILE}`,
  judgment: `${RESULTS.judgment}/${OUTCOME_FILE}`,
}

/**
 * How a request to the model failed.
 *   auth       401/403: the key is wrong or not allowed. Fatal.
 *   billing    402, or the 400 the API returns when the account has no credit. Fatal.
 *   model      404: the model id is unknown. Every case would fail the same way. Fatal.
 *   transient  408/409/429/5xx/529 or no connection: retried, then given up on for that case.
 *   other      any other 4xx: not retried, not fatal; the case records it.
 *   not-sent   the run had already stopped when this request was due; it was never sent.
 */
export type ErrorKind = 'auth' | 'billing' | 'model' | 'transient' | 'other' | 'not-sent'
export const FATAL: readonly ErrorKind[] = ['auth', 'billing', 'model']

export interface RecordedError {
  /** The case, script or calibration line the request was for. */
  item: string
  /** Which request: the guide's answer, or the judge. */
  stage: 'guide' | 'judge'
  kind: ErrorKind
  status: number | null
  /** The error's own message, with anything that looks like a key redacted. */
  message: string
  attempt: number
}

/** Why the run stopped scheduling requests, if it did. */
export interface Stop {
  kind: ErrorKind | 'judge' | 'credentials'
  message: string
  /** Requests sent before the run stopped, the failing one included. */
  requests: number
}

/** What a run did, in numbers. Every field is a count of items unless it says otherwise. */
export interface Tally {
  /** Items the suite intended to evaluate. */
  expected: number
  /** Items a worker picked up. `expected - started` never began. */
  started: number
  /** Items with a recorded row, whatever happened to them. Always equals `started` at the end of a run. */
  completed: number
  /** Items where the live model answered — with text, or by declining. */
  answered: number
  /** Of those, the model declined (stop_reason `refusal`) and the offline voice was graded, as production would show it. */
  declined: number
  /** Items where live inference failed and the offline voice was graded instead. Not live coverage. */
  unavailable: number
  /** Items whose judging completed with a usable verdict. */
  judged: number
  /** Requests sent to the model, retries included. */
  requests: number
  /** Requests that returned a response. */
  succeeded: number
  stopped: Stop | null
}

export interface Gates {
  /** The suite's own gate failures: hard gates, judged-unsafe cases, drops against the baseline, violated properties. */
  regressions: string[]
  /** Relationship judgment only: calibration lines the judge got wrong. */
  calibrationMisses: string[]
}

export interface Outcome {
  version: 1
  suite: Suite
  at: string
  outcome: OutcomeKind
  /** One sentence a person can act on. */
  reason: string
  /** The run's numbers; null when nothing ran (`not-required`). */
  run: Tally | null
  gates: Gates | null
  errors: RecordedError[]
  /** Where the full report (every answer, every grade) was written; null when there is none. */
  report: string | null
}

export const emptyTally = (expected: number): Tally => ({
  expected,
  started: 0,
  completed: 0,
  answered: 0,
  declined: 0,
  unavailable: 0,
  judged: 0,
  requests: 0,
  succeeded: 0,
  stopped: null,
})

/** The judge's calibration is a gate on the judge, not on the product; more than this many misses and the run is not trusted. */
export const CALIBRATION_MISSES_ALLOWED = 2

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/**
 * The outcome a run's numbers and gates earn. Pure: the same tally always
 * gives the same answer, which is how ./check.ts detects a file that
 * contradicts itself.
 */
export function decide(run: Tally, gates: Gates, errors: RecordedError[] = []): { outcome: OutcomeKind; reason: string } {
  if (run.expected === 0) return { outcome: 'evaluated-fail', reason: 'the intended case set is empty, so nothing could be evaluated; that is a defect in the suite, not a pass' }

  if (run.succeeded === 0) {
    const why = run.stopped ? `${run.stopped.kind}: ${run.stopped.message}` : errors[0] ? `${errors[0].kind}: ${errors[0].message}` : 'no request to the model succeeded'
    return { outcome: 'not-evaluated', reason: `no case was answered by the live model (${why})` }
  }

  const incomplete: string[] = []
  if (run.stopped) incomplete.push(`stopped after ${run.completed} of ${run.expected} (${run.stopped.kind}: ${run.stopped.message})`)
  const notStarted = run.expected - run.started
  if (notStarted > 0 && !run.stopped) incomplete.push(`${plural(notStarted, 'case')} never started`)
  if (run.started > run.completed) incomplete.push(`${plural(run.started - run.completed, 'case')} started and never recorded`)
  if (run.unavailable > 0) incomplete.push(`${plural(run.unavailable, 'case')} fell back to the offline voice because live inference was unavailable`)
  const unjudged = run.completed - run.judged
  if (unjudged > 0) incomplete.push(`${plural(unjudged, 'case')} not judged`)
  if (incomplete.length) return { outcome: 'evaluated-fail', reason: `incomplete — ${incomplete.join('; ')}` }

  if (gates.calibrationMisses.length > CALIBRATION_MISSES_ALLOWED) {
    return { outcome: 'evaluated-fail', reason: `the judge missed ${gates.calibrationMisses.length} calibration lines (${CALIBRATION_MISSES_ALLOWED} allowed), so its verdicts are not trusted` }
  }
  if (gates.regressions.length) {
    return { outcome: 'evaluated-fail', reason: `${plural(gates.regressions.length, 'quality gate failure')}: ${gates.regressions[0]}${gates.regressions.length > 1 ? '; …' : ''}` }
  }
  return { outcome: 'evaluated-pass', reason: `all ${run.expected} cases answered by the live model and judged; every gate passed` }
}

export function outcomeOf(suite: Suite, at: string, run: Tally, gates: Gates, errors: RecordedError[], report: string | null): Outcome {
  return { version: 1, suite, at, ...decide(run, gates, errors), run, gates, errors, report }
}

/** The suite was not run because the change does not touch it. */
export function notRequired(suite: Suite, at: string, reason: string): Outcome {
  return { version: 1, suite, at, outcome: 'not-required', reason, run: null, gates: null, errors: [], report: null }
}

/** The suite was due and could not send a request: no key, or a fatal stop carried from the suite before it. */
export function notEvaluated(suite: Suite, at: string, expected: number, stop: Stop): Outcome {
  const run = { ...emptyTally(expected), stopped: stop }
  return outcomeOf(suite, at, run, { regressions: [], calibrationMisses: [] }, [], null)
}

/** A fatal stop an earlier suite in the same job recorded, which the next suite must not repeat: the key refused, or no credit. A judge that failed calibration is that suite's alone. */
export function fatalUpstream(upstream: Outcome | null | undefined): Stop | null {
  const s = upstream?.run?.stopped
  return s && (s.kind === 'auth' || s.kind === 'billing') ? s : null
}

// ── Validation ───────────────────────────────────────────────────────────────

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Read an outcome file's contents strictly. Throws, naming the field, on
 * anything malformed, and on a record whose stated outcome is not what its
 * own numbers earn — a file that says "pass" over an incomplete tally is a
 * contradiction, never a pass.
 */
export function validateOutcome(raw: unknown, suite: Suite): Outcome {
  if (!isRecord(raw)) throw new Error('outcome is not an object')
  if (raw.version !== 1) throw new Error(`outcome.version is ${JSON.stringify(raw.version)}, expected 1`)
  if (raw.suite !== suite) throw new Error(`outcome.suite is ${JSON.stringify(raw.suite)}, expected ${JSON.stringify(suite)}`)
  if (typeof raw.at !== 'string' || Number.isNaN(Date.parse(raw.at))) throw new Error('outcome.at is not a date')
  if (!OUTCOMES.includes(raw.outcome as OutcomeKind)) throw new Error(`outcome.outcome is ${JSON.stringify(raw.outcome)}`)
  if (typeof raw.reason !== 'string' || !raw.reason.trim()) throw new Error('outcome.reason is empty')
  if (!Array.isArray(raw.errors)) throw new Error('outcome.errors is not an array')
  for (const [i, e] of raw.errors.entries()) {
    if (!isRecord(e) || typeof e.item !== 'string' || typeof e.message !== 'string' || !isInt(e.attempt)) throw new Error(`outcome.errors[${i}] is malformed`)
    if (e.stage !== 'guide' && e.stage !== 'judge') throw new Error(`outcome.errors[${i}].stage is ${JSON.stringify(e.stage)}`)
    if (!(['auth', 'billing', 'model', 'transient', 'other', 'not-sent'] as ErrorKind[]).includes(e.kind as ErrorKind)) throw new Error(`outcome.errors[${i}].kind is ${JSON.stringify(e.kind)}`)
    if (e.status !== null && !isInt(e.status)) throw new Error(`outcome.errors[${i}].status is malformed`)
  }
  if (raw.report !== null && typeof raw.report !== 'string') throw new Error('outcome.report is neither a path nor null')
  const errors = raw.errors as RecordedError[]
  const outcome = raw.outcome as OutcomeKind

  if (outcome === 'not-required') {
    if (raw.run !== null || raw.gates !== null) throw new Error('a not-required outcome records a run; it cannot have one')
    if (errors.length) throw new Error('a not-required outcome records errors; it cannot have any')
    return { version: 1, suite, at: raw.at, outcome, reason: raw.reason, run: null, gates: null, errors: [], report: raw.report as string | null }
  }

  const run = raw.run
  if (!isRecord(run)) throw new Error('outcome.run is missing')
  for (const k of ['expected', 'started', 'completed', 'answered', 'declined', 'unavailable', 'judged', 'requests', 'succeeded'] as const) {
    if (!isInt(run[k])) throw new Error(`outcome.run.${k} is not a count`)
  }
  const t = run as unknown as Tally
  if (t.started > t.expected) throw new Error('outcome.run.started exceeds expected')
  if (t.completed > t.started) throw new Error('outcome.run.completed exceeds started')
  if (t.answered + t.unavailable > t.completed) throw new Error('outcome.run: answered + unavailable exceeds completed')
  if (t.declined > t.answered) throw new Error('outcome.run.declined exceeds answered')
  if (t.judged > t.completed) throw new Error('outcome.run.judged exceeds completed')
  if (t.succeeded > t.requests) throw new Error('outcome.run.succeeded exceeds requests')
  if (run.stopped !== null) {
    if (!isRecord(run.stopped) || typeof run.stopped.kind !== 'string' || typeof run.stopped.message !== 'string' || !isInt(run.stopped.requests)) {
      throw new Error('outcome.run.stopped is malformed')
    }
  }
  const gates = raw.gates
  if (!isRecord(gates) || !Array.isArray(gates.regressions) || !Array.isArray(gates.calibrationMisses)) throw new Error('outcome.gates is missing')
  if (![...gates.regressions, ...gates.calibrationMisses].every((s) => typeof s === 'string')) throw new Error('outcome.gates holds something other than strings')
  const g = gates as unknown as Gates

  const earned = decide(t, g, errors)
  if (earned.outcome !== outcome) {
    throw new Error(`outcome says ${outcome} but its own numbers earn ${earned.outcome} (${earned.reason})`)
  }
  return { version: 1, suite, at: raw.at, outcome, reason: raw.reason, run: t, gates: g, errors, report: raw.report as string | null }
}

// ── Applicability ────────────────────────────────────────────────────────────

/** A path rule: a file, or a directory when it ends in `/`. */
export interface PathRule {
  path: string
  why: string
}

/** Files both suites depend on: the harness layer, the workflow, and what the Guide is sent. */
const BOTH: PathRule[] = [
  { path: '.github/workflows/guide-eval.yml', why: 'the workflow that runs the suites' },
  { path: 'package.json', why: 'the eval scripts and the SDK version range' },
  { path: 'tests/eval/', why: 'the outcome, session and applicability layer both suites run through' },
  { path: 'netlify/functions/guide.ts', why: 'guideRequest: the model, the limits and the message shape the Guide is sent' },
  { path: 'netlify/shared/prompt.ts', why: 'the system prompt' },
  { path: 'netlify/shared/vocab.ts', why: 'the vocabulary the prompt is built from' },
  { path: 'src/lib/coach.ts', why: 'the offline voice, graded wherever the model declines' },
  { path: 'src/data/coach.ts', why: 'the voices and the map the offline voice and the prompt read' },
  { path: 'tests/voice-rules.ts', why: 'the banned vocabulary the graders and the properties share' },
  { path: 'tests/guide-eval/cases.ts', why: 'the cases both suites send' },
  { path: 'tests/guide-eval/graders.ts', why: 'the rule graders; relationship judgment imports its notes' },
  { path: 'tests/guide-eval/judge.ts', why: 'the judge model and the Guide rubric' },
]

/**
 * What requires each suite. A change to any listed path requires the suite;
 * a change to nothing listed does not. tests/eval/outcome.test.ts holds these
 * lists to the suites' real import graphs, so a new dependency cannot go
 * unlisted, and the workflow (.github/workflows/guide-eval.yml) reads them
 * through ./check.ts.
 */
export const REQUIRES: Record<Suite, PathRule[]> = {
  guide: [
    ...BOTH,
    { path: 'tests/guide-eval-live.test.ts', why: 'the live suite itself' },
    { path: 'tests/guide-eval/', why: 'the cases, exemplars, graders, judge, harness and the live baseline' },
  ],
  judgment: [
    ...BOTH,
    { path: 'tests/judgment-live.test.ts', why: 'the live suite itself' },
    { path: 'tests/judgment/', why: 'the properties, calibration, themes, held-out set, scripts registry, content lock and live baseline' },
    { path: 'src/data/read.ts', why: 'the Read’s scripts, judged as words' },
    { path: 'src/data/beforeYes.ts', why: 'the Eleven’s scripts, judged as words' },
    { path: 'src/data/eleven.ts', why: 'the Eleven’s topics the scripts are built from' },
    { path: 'src/data/families.ts', why: 'the family scripts, judged as words' },
  ],
}

/**
 * Imported by a suite and yet not part of what it measures: handler plumbing
 * `guideRequest` never reads. A change here does not require a paid run. The
 * test checks that every import is either required or named here, with a
 * reason, so the list is a decision and not an omission.
 */
export const NOT_MEASURED: Record<Suite, PathRule[]> = {
  guide: [
    { path: 'netlify/shared/body.ts', why: 'request-body parsing in the handler; the suite calls guideRequest directly' },
    { path: 'netlify/shared/counter.ts', why: 'usage counters' },
    { path: 'netlify/shared/day.ts', why: 'the day key for counters' },
    { path: 'netlify/shared/founder.ts', why: 'the founder key check on the handler' },
    { path: 'netlify/shared/limit.ts', why: 'rate limits and caps on the handler' },
    { path: 'netlify/shared/ops.ts', why: 'operational notes on the handler' },
    { path: 'netlify/shared/secret.ts', why: 'constant-time comparison for the founder key' },
    { path: 'tests/guide-eval/results/', why: 'written by runs, never read as input' },
  ],
  judgment: [
    { path: 'netlify/shared/body.ts', why: 'request-body parsing in the handler; the suite calls guideRequest directly' },
    { path: 'netlify/shared/counter.ts', why: 'usage counters' },
    { path: 'netlify/shared/day.ts', why: 'the day key for counters' },
    { path: 'netlify/shared/founder.ts', why: 'the founder key check on the handler' },
    { path: 'netlify/shared/limit.ts', why: 'rate limits and caps on the handler' },
    { path: 'netlify/shared/ops.ts', why: 'operational notes on the handler' },
    { path: 'netlify/shared/secret.ts', why: 'constant-time comparison for the founder key' },
    { path: 'tests/judgment/results/', why: 'written by runs, never read as input' },
  ],
}

export const matchesRule = (rule: PathRule, path: string): boolean => (rule.path.endsWith('/') ? path.startsWith(rule.path) : path === rule.path)

export interface Applicability {
  required: boolean
  reason: string
}

export type DispatchSuites = 'both' | Suite

/**
 * Which suites a change requires.
 *
 * A pull request is classified by the files it changes. A manual run has no
 * pull request behind it and no diff to read: it is required by the person
 * who started it, for the suites they asked for.
 */
export function applicability(
  event: { kind: 'pull_request'; changed: string[] } | { kind: 'dispatch'; suites: DispatchSuites },
): Record<Suite, Applicability> {
  const out = {} as Record<Suite, Applicability>
  for (const suite of SUITES) {
    if (event.kind === 'dispatch') {
      const asked = event.suites === 'both' || event.suites === suite
      out[suite] = asked
        ? { required: true, reason: `run by hand${event.suites === 'both' ? '' : `, asking for the ${suite} suite`}` }
        : { required: false, reason: `run by hand, asking for the ${event.suites} suite only` }
      continue
    }
    const hits = event.changed.flatMap((path) => {
      const rule = REQUIRES[suite].find((r) => matchesRule(r, path))
      return rule ? [`${path} (${rule.why})`] : []
    })
    out[suite] = hits.length
      ? { required: true, reason: `the change touches ${hits.slice(0, 3).join('; ')}${hits.length > 3 ? `; and ${hits.length - 3} more` : ''}` }
      : { required: false, reason: `none of the ${event.changed.length} changed files is one the ${suite} suite measures` }
  }
  return out
}

// ── The verdict ──────────────────────────────────────────────────────────────

export interface Verdict {
  ok: boolean
  /** One line per suite, then anything that failed the check. */
  lines: string[]
  failures: string[]
}

/**
 * The check's answer, from what each suite was required to do and what its
 * file says it did. A file that is missing or malformed arrives as an Error.
 *
 *   required     → anything but evaluated-pass fails;
 *   not required → not-required or evaluated-pass is fine, not-evaluated is
 *                  reported and does not fail, evaluated-fail still fails: a
 *                  run that found a regression is never swallowed because it
 *                  was optional.
 *
 * Whether a failed check blocks a merge is branch protection's decision, not
 * this file's (docs/GUIDE-EVAL.md, "What a red check means").
 */
export function verdict(required: Record<Suite, Applicability | null>, outcomes: Record<Suite, Outcome | Error>): Verdict {
  const lines: string[] = []
  const failures: string[] = []
  for (const suite of SUITES) {
    const need = required[suite]
    const got = outcomes[suite]
    if (got instanceof Error) {
      lines.push(`${suite}: no usable outcome (${got.message})`)
      failures.push(`${suite}: the outcome file is missing or malformed — ${got.message}`)
      continue
    }
    lines.push(`${suite}: ${got.outcome} — ${got.reason}${got.run ? ` [${got.run.answered}/${got.run.expected} answered, ${got.run.judged} judged, ${got.run.unavailable} unavailable, ${got.run.requests} requests]` : ''}`)
    if (!need) {
      failures.push(`${suite}: the check could not tell whether this suite was required, so it fails closed`)
      continue
    }
    if (need.required) {
      if (got.outcome !== 'evaluated-pass') failures.push(`${suite} was required (${need.reason}) and is ${got.outcome}: ${got.reason}`)
    } else {
      if (got.outcome === 'evaluated-fail') failures.push(`${suite} was not required and ran anyway, and failed: ${got.reason}`)
      if (got.outcome === 'not-evaluated') lines.push(`${suite}: not required, and not evaluated (${got.reason}) — nothing here is claimed either way`)
    }
  }
  return { ok: failures.length === 0, lines, failures }
}
