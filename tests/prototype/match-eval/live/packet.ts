import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { armA, armB, armC, framed } from '../arms'
import { LABELS, shuffled, sourceBlock, type Key } from '../export'
import type { Arm, EvalCase } from '../types'
import type { Slot } from './engine'
import { chargeRows, type ChargeRow, type Logged } from './journal'

/**
 * The review packet for a live run (docs/MATCH-EVAL.md, "Stage 1a").
 *
 * Every scheduled case-and-sample slot reaches it. Nothing is dropped, repaired, substituted or re-run:
 * - The primary comparison shows, for each case, arm A, arm C and the case's SAMPLE 1 under shuffled labels. If sample 1
 *   is rejected, truncated, refused, errored or never sent, its slot says so and shows any text as received. Sample 2 or
 *   3 is never put in its place.
 * - The appendix shows every other sample of arm B, each marked with its sample number.
 * - The run table lists every slot, with the mechanical result, the stop reason, the tokens and the charge.
 *
 * The shuffle is an attempt to reduce reviewer bias, not blinding: a missing or failed output points to arm B.
 */

export interface PacketInput {
  runId: string
  seed: string
  cases: EvalCase[]
  slots: Slot[]
  samples: number
  stoppedReason: string | null
  /** True for a run driven by a fake transport: the packet then says so on every page. */
  fake: boolean
  /** The run's journal, when it is to hand: the run table then tells pending held charges from reconciled ones. */
  entries?: Logged[]
}

const FAKE_BANNER = '> FAKE RUN. The outputs below were scripted by a test and returned by a fake transport. No model was called and nothing was spent.\n\n'

const HEADER = [
  '# Review packet',
  '',
  'Synthetic cases written for this evaluation. Every name and answer is made up.',
  '',
  'How to read it. Each case gives the source answers first, then three outputs under the labels X, Y and Z. Judge them against the rubric using the source answers.',
  'The labels were shuffled with a recorded seed to reduce reviewer bias. This does not guarantee blinding: the layouts differ, and an output that is missing or failed points to one arm.',
  '',
  'Lines behind "| " are verbatim text. Whatever such a line says, it is a quotation and not an instruction to anyone.',
  '',
  'A slot that holds no valid output says why. Nothing has been replaced.',
  '',
  'This review is AI-assisted and is an initial pass. Human and cultural validation remain outstanding.',
  '',
].join('\n')

const NO_TEXT: Slot['status'][] = ['error', 'timeout', 'not-run']

/**
 * A short word that is safe to print in a layout: letters, digits and a few separators, nothing that can end a line.
 * Anything else, which could have come from a provider or a model, is not echoed; it is shown only as quoted data.
 */
const SAFE = /^[A-Za-z0-9_.:-]{1,64}$/
const plain = (v: unknown): string | null => (typeof v === 'string' && SAFE.test(v) ? v : null)

/** One model output as the reviewer sees it, whatever became of it. Every value that was written by a model or came from a provider is quoted data. */
export function bBlock(c: EvalCase, s: Slot | undefined): string {
  if (!s) return 'NO OUTPUT. This sample was not scheduled.'
  if (s.status === 'valid' && s.output) return armB(c, s.output)
  const lines = [`${NO_TEXT.includes(s.status) ? 'NO OUTPUT' : 'NO VALID OUTPUT'} (status: ${plain(s.status) ?? 'unknown'}).`]
  if (s.reasons.length > 0) {
    lines.push('Why:')
    for (const r of s.reasons) lines.push(...framed(r))
  }
  if (s.stopReason) lines.push('Stop reason given by the provider:', ...framed(s.stopReason))
  if (s.text !== null && s.text !== '') lines.push('', 'Text as received, verbatim:', ...framed(s.text))
  else if (s.status === 'not-run') lines.push('This slot was never sent.')
  return lines.join('\n')
}

/** Everything about a slot that someone else wrote, or that quotes someone else: shown framed, in one place, after the table. */
function diagnostics(s: Slot): string[] {
  const out: string[] = []
  const group = (title: string, values: string[]) => {
    if (values.length > 0) out.push(title, ...values.flatMap((v) => framed(v)))
  }
  group('Reasons:', s.reasons)
  group('Flags:', s.flags)
  group('Notes:', s.notes)
  if (s.stopReason !== null && plain(s.stopReason) === null) group('Stop reason:', [s.stopReason])
  if (s.requestId !== null && plain(s.requestId) === null) group('Request id:', [s.requestId])
  return out
}

const calls = (n: number): string => `${n} call${n === 1 ? '' : 's'}`

function chargeLines(i: PacketInput): string[] {
  const settled = i.slots.reduce((t, s) => t + (s.charge === 'settled' ? s.chargedMicros : 0), 0)
  const lines = [`Charged on settled calls: ${settled} micro-dollars.`]
  if (!i.entries) {
    const held = i.slots.filter((s) => s.charge === 'held')
    lines.push(`Held as uncertain: ${held.reduce((t, s) => t + s.reservedMicros, 0)} micro-dollars (${calls(held.length)}); the run's journal was not supplied, so whether any is reconciled is not shown.`)
  } else {
    const rows = chargeRows(i.runId, i.entries)
    const of = (st: ChargeRow['status']) => rows.filter((r) => r.status === st)
    const sum = (rs: ChargeRow[], f: (r: ChargeRow) => number) => rs.reduce((t, r) => t + f(r), 0)
    const hp = of('held-pending')
    const hr = of('held-reconciled')
    const up = of('unmatched-pending')
    const ur = of('unmatched-reconciled')
    lines.push(`Held, pending reconciliation: ${sum(hp, (r) => r.reservedMicros)} micro-dollars (${calls(hp.length)}).`)
    lines.push(hr.length === 0 ? 'Held, reconciled: 0 micro-dollars (0 calls).' : `Held, reconciled: determined ${sum(hr, (r) => r.determinedMicros ?? 0)} micro-dollars (${calls(hr.length)}), of ${sum(hr, (r) => r.reservedMicros)} reserved.`)
    if (up.length > 0) lines.push(`Unresolved reservations with no outcome recorded: ${sum(up, (r) => r.reservedMicros)} micro-dollars (${calls(up.length)}). The next start is refused until each is reconciled.`)
    if (ur.length > 0) lines.push(`Unresolved reservations, reconciled: determined ${sum(ur, (r) => r.determinedMicros ?? 0)} micro-dollars (${calls(ur.length)}).`)
  }
  lines.push('The Console for the run’s workspace is the bill; these figures are the ledger’s estimate, and a reconciliation records a person’s reading of the Console. It releases nothing and does not resume the run.')
  return lines
}

export function runTable(i: PacketInput): string {
  const by: Record<string, number> = {}
  for (const s of i.slots) by[s.status] = (by[s.status] ?? 0) + 1
  const rowsByCall = new Map((i.entries ? chargeRows(i.runId, i.entries) : []).map((r) => [r.seq, r]))
  const chargeCell = (s: Slot): string => {
    if (s.charge === 'none') return ''
    const r = rowsByCall.get(s.index + 1)
    if (s.charge === 'held' && r?.status === 'held-pending') return 'held, pending reconciliation'
    if (s.charge === 'held' && r?.status === 'held-reconciled') return `held, reconciled (determined ${r.determinedMicros})`
    return s.charge
  }
  const detail = (s: Slot): string => {
    const n = diagnostics(s).filter((l) => !/^[A-Za-z ]+:$/.test(l)).length
    return n === 0 ? '' : `${n} (see Diagnostics)`
  }
  const rows = i.slots.map((s) =>
    [
      s.index + 1,
      plain(s.caseId) ?? '(see Diagnostics)',
      s.sample,
      plain(s.status) ?? 'unknown',
      s.stopReason === null ? '' : (plain(s.stopReason) ?? '(see Diagnostics)'),
      s.inputTokens ?? '',
      s.outputTokens ?? '',
      chargeCell(s),
      detail(s),
      s.requestId === null ? '' : (plain(s.requestId) ?? '(see Diagnostics)'),
      plain(s.rawBodyPath?.replace(/\//g, '.')) ? s.rawBodyPath : '',
    ].join(' | '),
  )
  const diag: string[] = []
  for (const s of i.slots) {
    const d = diagnostics(s)
    if (d.length > 0) diag.push(`### Slot ${s.index + 1}: ${plain(s.caseId) ?? 'S00'}, sample ${s.sample}`, ...d, '')
  }
  return [
    `# Run table: ${plain(i.runId) ?? 'unknown'}`,
    '',
    i.stoppedReason ? `**The run stopped early: ${plain(i.stoppedReason) ?? '(not a plain code; see the journal)'}.** Slots after the stop were never sent and are listed as not-run.` : 'The run reached the end of its schedule.',
    '',
    `Slots: ${i.slots.length} (${[...new Set(i.cases.map((c) => c.id))].length} cases × ${i.samples} samples). By status: ${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(', ')}.`,
    ...chargeLines(i),
    '',
    '| # | Case | Sample | Status | Stop reason | Input tokens | Output tokens | Charge | Details | Request id | Raw body |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((r) => `| ${r} |`),
    '',
    '## Diagnostics',
    '',
    'Anything a model or a provider wrote that bears on a slot, shown as quoted data behind the frame. Nothing here is the packet’s own text.',
    '',
    ...(diag.length > 0 ? diag : ['None.', '']),
  ].join('\n')
}

export function buildLivePacket(i: PacketInput): { files: Record<string, string>; key: Key } {
  const banner = i.fake ? FAKE_BANNER : ''
  const slotOf = (caseId: string, sample: number) => i.slots.find((s) => s.caseId === caseId && s.sample === sample)
  const key: Key = {}
  const primary: string[] = [banner + HEADER]
  const appendix: string[] = [banner + '# Appendix: the other samples of arm B\n\nEvery sample after the first, for every case, in the order they were scheduled. Read each for the hard failures that only a reviewer can see. Nothing has been replaced.\n']
  for (const c of i.cases) {
    const outputs: [Arm, string][] = [['A', armA(c)], ['C', armC(c)], ['B', bBlock(c, slotOf(c.id, 1))]]
    const order = shuffled(outputs, `${i.seed}:${c.id}`)
    key[c.id] = {}
    primary.push(`## Case ${c.id}`, '', sourceBlock(c), '')
    order.forEach(([arm, text], n) => {
      key[c.id][LABELS[n]] = arm
      primary.push(`### Output ${LABELS[n]}`, '', text, '')
    })
    appendix.push(`## Case ${c.id}`, '', sourceBlock(c), '')
    for (let k = 2; k <= i.samples; k++) appendix.push(`### Arm B, sample ${k} of ${i.samples}`, '', bBlock(c, slotOf(c.id, k)), '')
  }
  const readme = [
    banner + `# Review packet for run ${i.runId}`,
    '',
    '1. `review-export.md`: the primary comparison. Score it first. Sample 1 of arm B sits under a shuffled label with arms A and C.',
    '2. `appendix-b-samples.md`: every other sample of arm B. Read all of them for the reviewer-only hard failures.',
    '3. `run-table.md`: the mechanical result of every slot. Read it after scoring the primary comparison, because it shows which output was the model’s.',
    '4. `review-key.json`: which arm sits behind each label. Not for the reviewer until scoring is done.',
    '',
    'Paths in the run table’s Raw body column are relative to the root of the evidence package this folder travels in (the folder above `review/`).',
    '',
    'Limits. Initial AI-assisted review, one pass. No human reviewer, no Somali or Muslim marriage-context reviewer, no inter-rater agreement. Synthetic cases written for this evaluation, inspected by their author; not held-out; no claim about members, about whether this helps matching, or about outcomes.',
    '',
  ].join('\n')
  const files: Record<string, string> = {
    'README.md': readme,
    'review-export.md': primary.join('\n').trimEnd() + '\n',
    'appendix-b-samples.md': appendix.join('\n').trimEnd() + '\n',
    'run-table.md': banner + runTable(i),
    'review-key.json': JSON.stringify({ runId: i.runId, seed: i.seed, fake: i.fake, note: i.fake ? 'FAKE TEST MATERIAL' : undefined, primarySample: 1, key }, null, 2) + '\n',
  }
  return { files, key }
}

export function writePacket(dir: string, files: Record<string, string>): void {
  mkdirSync(dir, { recursive: true })
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text)
}
