import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  ARTIFACT,
  RESULTS,
  SUITES,
  applicability,
  notRequired,
  recount,
  tallyDifferences,
  validateOutcome,
  verdict,
  type Applicability,
  type DispatchSuites,
  type Outcome,
  type Suite,
  type Verdict,
} from './outcome.ts'

/**
 * The outcome files on disk, and the three things the workflow does with
 * them (./check.ts): decide which suites a change requires and write
 * `not-required` for the rest; read a suite's outcome so the next suite can
 * refuse to repeat a fatal stop; and give the final verdict. Pure logic is in
 * ./outcome.ts; this file only touches paths under `root`.
 */

export function writeOutcome(root: string, outcome: Outcome): string {
  const path = join(root, ARTIFACT[outcome.suite])
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(outcome, null, 2)}\n`)
  return path
}

/**
 * A suite's outcome, validated and — when it names a report — held to that
 * report: the file must exist inside the suite's own results directory, be
 * JSON, be this suite's, carry the outcome's time, and recount to the same
 * numbers row by row. An Error (never a throw) when anything is missing or
 * unusable, so the verdict can name it.
 */
export function readOutcome(root: string, suite: Suite): Outcome | Error {
  const path = join(root, ARTIFACT[suite])
  if (!existsSync(path)) return new Error(`${ARTIFACT[suite]} was not written`)
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    return new Error(`${ARTIFACT[suite]} is not JSON (${(err as Error).message})`)
  }
  let outcome: Outcome
  try {
    outcome = validateOutcome(raw, suite)
  } catch (err) {
    return new Error(`${ARTIFACT[suite]}: ${(err as Error).message}`)
  }
  if (outcome.report === null) return outcome
  const where = `${RESULTS[suite]}/${outcome.report}`
  const reportPath = join(root, RESULTS[suite], outcome.report)
  if (!existsSync(reportPath)) return new Error(`${ARTIFACT[suite]} names ${where}, which was not written`)
  let report: unknown
  try {
    report = JSON.parse(readFileSync(reportPath, 'utf8'))
  } catch (err) {
    return new Error(`${where} is not JSON (${(err as Error).message})`)
  }
  const r = report as { suite?: unknown; at?: unknown }
  if (r.suite !== suite) return new Error(`${where} belongs to ${JSON.stringify(r.suite)}, not to the ${suite} suite`)
  if (r.at !== outcome.at) return new Error(`${where} is from ${JSON.stringify(r.at)}, not from this outcome's run (${outcome.at})`)
  let recounted
  try {
    recounted = recount(suite, report)
  } catch (err) {
    return new Error(`${where}: ${(err as Error).message}`)
  }
  const differences = tallyDifferences(outcome.run!, recounted)
  if (differences.length) return new Error(`${where} does not support the outcome: ${differences.join('; ')}`)
  return outcome
}

/**
 * The outcome a suite that ran earlier in the same job wrote, for the next
 * suite to read before it sends anything (EVAL_UPSTREAM_OUTCOME in the
 * workflow). Null when there is none or it cannot be read: the next suite
 * then runs on its own account, and the verdict deals with the file.
 */
export function readUpstreamOutcome(path: string | undefined): Outcome | null {
  if (!path || !existsSync(path)) return null
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { suite?: unknown }
    const suite = SUITES.find((s) => s === raw.suite)
    return suite ? validateOutcome(raw, suite) : null
  } catch {
    return null
  }
}

export type ChangeEvent = { kind: 'pull_request'; changed: string[] } | { kind: 'dispatch'; suites: DispatchSuites }

/**
 * Classify the change and write `not-required` for every suite it does not
 * need, so the verdict finds a file for each suite whatever ran. Returns the
 * classification for the workflow's outputs.
 */
export function classify(root: string, event: ChangeEvent, at = new Date().toISOString()): Record<Suite, Applicability> {
  const out = applicability(event)
  for (const suite of SUITES) if (!out[suite].required) writeOutcome(root, notRequired(suite, at, out[suite].reason))
  return out
}

/** The applicability the workflow passed back in, as the verdict needs it: an unknown value fails closed. */
export function parseRequired(value: string | undefined): Applicability | null {
  if (value === 'required') return { required: true, reason: 'the applicability step said so' }
  if (value === 'not-required') return { required: false, reason: 'the applicability step said so' }
  return null
}

export function verdictFrom(root: string, required: Record<Suite, Applicability | null>): Verdict {
  return verdict(required, { guide: readOutcome(root, 'guide'), judgment: readOutcome(root, 'judgment') })
}
