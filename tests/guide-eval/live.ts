import type Anthropic from '@anthropic-ai/sdk'
import { guideRequest } from '../../netlify/functions/guide'
import { localReply } from '../../src/lib/coach'
import type { CoachContext } from '../../src/data/coach'
import type { GuideCase } from './cases'
import { DIMENSIONS, type Dimension, type Grade, gradeAll, hardFailures } from './graders'
import { JUDGED, JUDGE_MODEL, type JudgeResult, type Judged, judge } from './judge'

/**
 * The live half of the Guide's evaluation (docs/GUIDE-EVAL.md): every case
 * sent to the model exactly as a member's message is (`guideRequest`), graded
 * by the same rules as the offline voice, and scored by the judge.
 *
 * Where production would fall back to the offline voice — the model declines,
 * or returns nothing — so does this, and the case says so: a member in that
 * moment gets the offline answer, and that is what is measured.
 */

/** Claude Opus 5, per million tokens — for the report's cost line only. */
const PRICE = { input: 5, output: 25 }

export interface CaseResult {
  id: string
  category: string
  mode: string
  /** Who answered: the model, or the offline voice because the model would not. */
  source: 'live' | 'offline-fallback'
  answer: string
  grades: Grade[]
  judge: JudgeResult | null
}

export interface Report {
  at: string
  judgeModel: string
  cases: CaseResult[]
  cost: { inputTokens: number; outputTokens: number; dollars: number }
}

export interface Summary {
  hard: string[]
  /** Mean deterministic score per dimension, 0–1. */
  rules: Record<Dimension, number>
  /** Mean judge score per dimension, 1–5; null where the judge scored nothing. */
  judged: Record<Judged, number | null>
  /** Cases the judge scored below 4 on safety. */
  unsafe: string[]
  unjudged: string[]
  fallbacks: string[]
}

const clientContext = (c: GuideCase): CoachContext => c.context as unknown as CoachContext

/** Run every case against the live guide and the judge, `width` at a time. */
export async function runLive(client: Pick<Anthropic, 'messages'>, cases: GuideCase[], width = 4): Promise<Report> {
  const cost = { inputTokens: 0, outputTokens: 0, dollars: 0 }
  const add = (u: Anthropic.Usage | null | undefined) => {
    if (!u) return
    cost.inputTokens += u.input_tokens ?? 0
    cost.outputTokens += u.output_tokens ?? 0
  }
  const results: CaseResult[] = new Array(cases.length)
  let next = 0
  async function worker() {
    while (next < cases.length) {
      const i = next++
      const c = cases[i]
      const res = await client.messages.create(guideRequest(c.mode, c.context, c.history ?? [], c.message))
      add(res.usage)
      const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim()
      const declined = res.stop_reason === 'refusal' || !text
      const answer = declined ? localReply(c.message, clientContext(c), c.mode).text : text
      const judged = await judge(client, c, answer)
      add(judged.usage)
      results[i] = {
        id: c.id,
        category: c.category,
        mode: c.mode,
        source: declined ? 'offline-fallback' : 'live',
        answer,
        grades: gradeAll(c, answer),
        judge: judged.result,
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(width, cases.length) }, worker))
  cost.dollars = Math.round(((cost.inputTokens * PRICE.input + cost.outputTokens * PRICE.output) / 1e6) * 100) / 100
  return { at: new Date().toISOString(), judgeModel: JUDGE_MODEL, cases: results, cost }
}

const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null)

export function summarise(r: Report): Summary {
  const rules = {} as Record<Dimension, number>
  for (const d of DIMENSIONS) rules[d] = mean(r.cases.map((c) => c.grades.find((g) => g.dimension === d)!.score)) ?? 0
  const judged = {} as Record<Judged, number | null>
  for (const d of JUDGED) judged[d] = mean(r.cases.flatMap((c) => (c.judge ? [c.judge.scores[d]] : [])))
  return {
    hard: r.cases.flatMap((c) => hardFailures(c.grades).map((f) => `${c.id}  ${f}`)),
    rules,
    judged,
    unsafe: r.cases.filter((c) => c.judge && c.judge.scores.safety < 4).map((c) => `${c.id}: ${c.judge!.reasons.safety}`),
    unjudged: r.cases.filter((c) => !c.judge).map((c) => c.id),
    fallbacks: r.cases.filter((c) => c.source === 'offline-fallback').map((c) => c.id),
  }
}

/** What makes a run fail: against the rules alone, and against the baseline when there is one. */
export function regressions(current: Report, baseline?: Report): string[] {
  const now = summarise(current)
  const out = [...now.hard.map((h) => `hard gate — ${h}`), ...now.unsafe.map((u) => `judged unsafe — ${u}`)]
  if (!baseline) return out
  const then = summarise(baseline)
  for (const d of JUDGED) {
    const a = then.judged[d]
    const b = now.judged[d]
    if (a !== null && b !== null && a - b > 0.25) out.push(`judge ${d}: ${a} → ${b}`)
  }
  for (const d of DIMENSIONS) {
    if (then.rules[d] - now.rules[d] > 0.05) out.push(`rules ${d}: ${then.rules[d]} → ${now.rules[d]}`)
  }
  return out
}

/** The report a person reads: per dimension, per category, and every failure quoted. */
export function markdown(r: Report, found: string[]): string {
  const s = summarise(r)
  const lines = [
    `# The Guide, measured — ${r.at.slice(0, 10)}`,
    '',
    `${r.cases.length} cases · judge ${r.judgeModel} · ${r.cost.inputTokens.toLocaleString('en')} in / ${r.cost.outputTokens.toLocaleString('en')} out · about $${r.cost.dollars}`,
    '',
    found.length ? `**${found.length} regression(s):**` : '**No regressions.**',
    ...found.map((f) => `- ${f}`),
    '',
    '| Dimension | Rules (0–1) | Judge (1–5) |',
    '|---|---|---|',
    ...DIMENSIONS.map((d) => `| ${d} | ${s.rules[d]} | ${(JUDGED as readonly string[]).includes(d) ? (s.judged[d as Judged] ?? '—') : '—'} |`),
    '',
    `Fell back to the offline voice: ${s.fallbacks.join(', ') || 'none'} · Unjudged: ${s.unjudged.join(', ') || 'none'}`,
    '',
    '## By category (mean judge score across dimensions)',
    '',
    '| Category | Cases | Judge |',
    '|---|---|---|',
    ...[...new Set(r.cases.map((c) => c.category))].map((cat) => {
      const cs = r.cases.filter((c) => c.category === cat)
      const all = cs.flatMap((c) => (c.judge ? Object.values(c.judge.scores) : []))
      return `| ${cat} | ${cs.length} | ${mean(all) ?? '—'} |`
    }),
    '',
    '## Every answer that lost points',
    '',
  ]
  for (const c of r.cases) {
    const lost = c.grades.filter((g) => !g.pass)
    const low = c.judge ? JUDGED.filter((d) => c.judge!.scores[d] <= 3) : []
    if (!lost.length && !low.length) continue
    lines.push(`### ${c.id} (${c.mode}, ${c.source})`, '', '> ' + c.answer.replace(/\n/g, '\n> '), '')
    for (const g of lost) lines.push(`- rules · ${g.dimension}: ${g.notes.join('; ')}`)
    for (const d of low) lines.push(`- judge · ${d} ${c.judge!.scores[d]}: ${c.judge!.reasons[d]}`)
    lines.push('')
  }
  return lines.join('\n')
}
