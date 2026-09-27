import { appendFileSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { classify, parseRequired, verdictFrom, type ChangeEvent } from './artifacts.ts'
import { ARTIFACT, SUITES, type DispatchSuites } from './outcome.ts'

/**
 * The workflow's two commands (.github/workflows/guide-eval.yml). Runs under
 * plain Node with type stripping and no dependencies, so it works before
 * `npm ci` and after a step that failed:
 *
 *   node --experimental-strip-types tests/eval/check.ts applicability \
 *        --event pull_request --changed changed.txt [--github-output "$GITHUB_OUTPUT"]
 *   node --experimental-strip-types tests/eval/check.ts applicability \
 *        --event dispatch --suites both|guide|judgment [--github-output "$GITHUB_OUTPUT"]
 *   node --experimental-strip-types tests/eval/check.ts verdict \
 *        --guide required|not-required --judgment required|not-required
 *
 * `applicability` says which suites the change requires, writes
 * `not-required` for the others, and prints one `suite=required|not-required`
 * line per suite (also to the GitHub outputs file when given). `verdict`
 * reads both outcome files and exits 1 unless every required suite is
 * evaluated-pass and nothing is missing, malformed or contradictory
 * (tests/eval/outcome.ts). Whether that blocks a merge is branch protection's
 * decision (docs/GUIDE-EVAL.md, "What a red check means").
 */

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

export function applicabilityCommand(args: string[], root = process.cwd()): { lines: string[]; outputs: string[]; exit: number } {
  const kind = flag(args, 'event')
  let event: ChangeEvent
  if (kind === 'pull_request') {
    const file = flag(args, 'changed')
    if (!file) return { lines: ['applicability: --changed <file> is required for a pull request'], outputs: [], exit: 2 }
    const changed = readFileSync(file, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    event = { kind: 'pull_request', changed }
  } else if (kind === 'dispatch') {
    const suites = flag(args, 'suites') ?? 'both'
    if (!['both', 'guide', 'judgment'].includes(suites)) return { lines: [`applicability: --suites must be both, guide or judgment, not ${JSON.stringify(suites)}`], outputs: [], exit: 2 }
    event = { kind: 'dispatch', suites: suites as DispatchSuites }
  } else {
    return { lines: [`applicability: --event must be pull_request or dispatch, not ${JSON.stringify(kind)}`], outputs: [], exit: 2 }
  }
  const result = classify(root, event)
  const outputs = SUITES.map((s) => `${s}=${result[s].required ? 'required' : 'not-required'}`)
  const lines = SUITES.map((s) => `${s}: ${result[s].required ? 'required' : 'not required'} — ${result[s].reason}${result[s].required ? '' : ` (written to ${ARTIFACT[s]})`}`)
  return { lines, outputs, exit: 0 }
}

export function verdictCommand(args: string[], root = process.cwd()): { lines: string[]; exit: number } {
  const v = verdictFrom(root, { guide: parseRequired(flag(args, 'guide')), judgment: parseRequired(flag(args, 'judgment')) })
  const lines = [
    '## Live evaluation — the outcome',
    ...v.lines.map((l) => `- ${l}`),
    '',
    ...(v.ok ? ['Every required suite is evaluated-pass; nothing is missing or contradictory.'] : ['**This check fails:**', ...v.failures.map((f) => `- ${f}`)]),
    '',
    'A failed check blocks a merge only if branch protection requires it; see docs/GUIDE-EVAL.md, "What a red check means".',
  ]
  return { lines, exit: v.ok ? 0 : 1 }
}

function main(argv: string[]) {
  const [command, ...args] = argv
  if (command === 'applicability') {
    const r = applicabilityCommand(args)
    for (const l of r.lines) console.log(l)
    const out = flag(args, 'github-output')
    if (out) appendFileSync(out, r.outputs.map((o) => `${o}\n`).join(''))
    else for (const o of r.outputs) console.log(o)
    process.exit(r.exit)
  }
  if (command === 'verdict') {
    const r = verdictCommand(args)
    for (const l of r.lines) console.log(l)
    const summary = process.env.GITHUB_STEP_SUMMARY
    if (summary) appendFileSync(summary, `${r.lines.join('\n')}\n`)
    if (r.exit) console.log(`::error::${r.lines.filter((l) => l.startsWith('- ')).join(' ')}`)
    process.exit(r.exit)
  }
  console.log('usage: check.ts applicability|verdict …')
  process.exit(2)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2))
