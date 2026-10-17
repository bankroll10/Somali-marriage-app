import { describe, expect, it } from 'vitest'
import { buildInput } from './match-eval/contract'
import { CASES } from './match-eval/cases'
import { checkOutput } from './match-eval/checks'
import { buildLivePacket, type PacketInput } from './match-eval/live/packet'
import type { EvalCase, ModelOutput } from './match-eval/types'
import { messageBody, ok, paidFixture, scriptedOutput, type GenScript } from './match-eval-live-support'

/**
 * MATCH-05 Stage 1a correction pass, item 1: the review packet is protected from ALL model-authored text and from
 * provider-derived diagnostic text. Accepted JSON can hold multiline statements, uncertainties, questions and a reason;
 * a rejected reply, a stop reason, a header, a content-block type and a transport error can hold anything. Each is
 * shown as quoted data, contents preserved, and none can start a heading, a case or a table row.
 * The mechanical verdict is not touched by any of this.
 */

/** Every line separator a renderer might honour, with forged structure after each. */
const FORGE = 'Plain words first.\n## Case S99\n### Output Y\n\nForged section body.\r## Case S98\u2028# Title\u2029## After\u0085## Nel\n| 1 | S01 | 1 | valid | forged row'
const SEGMENTS = FORGE.split(/\r\n|\r|\n|\u2028|\u2029|\u0085/).filter((s) => s !== '')

const firstThemIndex = (c: EvalCase) => buildInput(c).written.them.findIndex((w) => w.text !== null) as 0 | 1 | 2

/** Valid under the mechanical checks, but every free-text field carries forged structure. */
function hostileAccepted(c: EvalCase): ModelOutput {
  const w = firstThemIndex(c)
  return {
    schema: 'match-eval-output/1',
    caseId: c.id,
    additions: 'limited',
    because: FORGE,
    statements: [{ text: FORGE, basis: [{ who: 'them', words: w }] }],
    uncertainties: [{ text: FORGE, basis: [{ who: 'them', words: w }] }],
    questions: [{ text: FORGE, basis: 'general' }],
  }
}

const valid = (id: string, counted: number) => ok(messageBody({ text: JSON.stringify(scriptedOutput(CASES.find((c) => c.id === id)!)), input: counted, output: 90 }))

/** A complete run in which several replies and several provider fields carry forged structure. */
const HOSTILE_RUN: GenScript = (n, _r, id, counted) => {
  const c = CASES.find((x) => x.id === id) as EvalCase
  if (n === 1) return ok(messageBody({ text: JSON.stringify(hostileAccepted(c)), input: counted, output: 200 })) //                      accepted JSON
  if (n === 2) return ok(messageBody({ text: FORGE, input: counted, output: 60 })) //                                                  rejected: not JSON
  if (n === 3) return ok(messageBody({ text: JSON.stringify({ ...scriptedOutput(c), [FORGE]: 1 }), input: counted, output: 60 })) //   rejected: extra field named with forged text
  if (n === 4) return ok(messageBody({ text: JSON.stringify({ ...scriptedOutput(c), statements: [{ text: 'This is a perfect match.\n## Case S96', basis: [{ who: 'them', words: firstThemIndex(c) }] }] }), input: counted, output: 60 })) // H2
  if (n === 5) return ok(messageBody({ text: JSON.stringify(scriptedOutput(c)), input: counted, output: 60, stop: 'end_turn\n## Case S95' })) // provider stop reason
  if (n === 6) return ok(messageBody({ text: '', input: counted, output: 60, content: [{ type: 'weird\n## Case S94', text: 'x' }, { type: 'text', text: JSON.stringify(scriptedOutput(c)) }] })) // block type
  if (n === 7) return ok(messageBody({ text: JSON.stringify(scriptedOutput(c)), input: counted, output: 60 }), { 'request-id': 'req_9\n## Case S93' }) //   header
  return valid(id, counted)
}

const ALLOWED_HEADINGS = [
  /^# Review packet$/,
  /^# Review packet for run [a-z0-9-]+$/,
  /^# Appendix: the other samples of arm B$/,
  /^# Run table: [a-z0-9-]+$/,
  /^## Case S\d{2}$/,
  /^### Source answers$/,
  /^### Output [XYZ]$/,
  /^### Arm B, sample [23] of 3$/,
  /^## Diagnostics$/,
  /^### Slot \d{1,2}: S\d{2}, sample [123]$/,
]
const headings = (text: string) => text.split('\n').filter((l) => /^#{1,6} /.test(l))
const ROW = /^\| \d{1,2} \| S\d{2} \| [123] \| (valid|rejected|truncated|refusal|other-stop|error|timeout|not-run) \| /

async function run(script: GenScript) {
  const f = await paidFixture({ script })
  const res = await f.run()
  if (res.status !== 'completed' && res.status !== 'stopped') throw new Error('the fake run did not run')
  const input: PacketInput = { runId: 'paid-run-1', seed: 'fake-run', cases: CASES, slots: res.slots, samples: 3, stoppedReason: res.reason, fake: true }
  return { res, input, packet: buildLivePacket(input) }
}

describe('accepted JSON with forged structure in every free-text field', () => {
  it('is accepted by the mechanical checks, and stays accepted', async () => {
    const { res } = await run(HOSTILE_RUN)
    expect(res.slots[0].status).toBe('valid')
    expect(res.slots[0].reasons).toEqual([])
    const direct = checkOutput(JSON.stringify(hostileAccepted(CASES[0])), buildInput(CASES[0]))
    expect(direct.ok).toBe(true)
  })

  it('adds no heading, case or output section to the packet', async () => {
    const { packet } = await run(HOSTILE_RUN)
    for (const [name, text] of Object.entries(packet.files)) {
      if (!name.endsWith('.md')) continue
      for (const h of headings(text)) expect(ALLOWED_HEADINGS.some((r) => r.test(h)), `${name}: ${JSON.stringify(h)}`).toBe(true)
    }
    const p = packet.files['review-export.md']
    expect(p.split('\n').filter((l) => /^## Case /.test(l))).toHaveLength(22)
    expect(p.match(/^### Output [XYZ]$/gm)).toHaveLength(66)
  })

  it('shows every statement, uncertainty, question and reason line behind the quotation frame, contents preserved', async () => {
    const { packet } = await run(HOSTILE_RUN)
    const lines = packet.files['review-export.md'].split('\n')
    const section = packet.files['review-export.md'].split('\n## Case ').find((s) => s.startsWith(CASES[0].id)) as string
    // The accepted reply is sample 1 of case 1, so it is in the primary comparison. Each of its four fields is framed.
    for (const seg of SEGMENTS) expect(section.split('\n'), seg).toContain(`| ${seg}`)
    expect(section.split('\n').filter((l) => l === '| Plain words first.').length).toBeGreaterThanOrEqual(4)
    expect(lines).not.toContain('## Case S99')
    expect(lines.filter((l) => l === '### Output Y')).toHaveLength(22)
    expect(lines).not.toContain('# Title')
  })

  it('leaves no raw line separator in any generated text, since a renderer could start a line at one', async () => {
    const { packet } = await run(HOSTILE_RUN)
    for (const [name, text] of Object.entries(packet.files)) {
      if (name.endsWith('.json')) continue
      expect(text, name).not.toMatch(/[\r\u2028\u2029\u0085]/)
    }
  })
})

describe('rejected replies and provider-derived text', () => {
  it('keeps a rejected reply rejected, shows it verbatim and framed, and keeps every segment', async () => {
    const { res, packet } = await run(HOSTILE_RUN)
    expect(res.slots[1]).toMatchObject({ status: 'rejected', text: FORGE })
    expect(res.slots[1].reasons.join()).toMatch(/not-json/)
    const section = packet.files['review-export.md'].split('\n## Case ').find((s) => s.startsWith(CASES[1].id)) as string
    expect(section).toContain('NO VALID OUTPUT (status: rejected).')
    for (const seg of SEGMENTS) expect(section.split('\n'), seg).toContain(`| ${seg}`)
  })

  it('does not let containment repair or hide a semantic failure: an H2 reply stays rejected and its words stay visible', async () => {
    const { res, packet } = await run(HOSTILE_RUN)
    expect(res.slots[3].status).toBe('rejected')
    expect(res.slots[3].reasons.join()).toMatch(/h2-pattern/)
    const section = packet.files['review-export.md'].split('\n## Case ').find((s) => s.startsWith(CASES[3].id)) as string
    expect(section).toContain('NO VALID OUTPUT (status: rejected).')
    expect(section).toContain('perfect match')
    expect(packet.files['review-export.md'].split('\n')).not.toContain('## Case S96')
  })

  it('leaves the slots, and so every verdict, exactly as the run made them', async () => {
    const { res, input } = await run(HOSTILE_RUN)
    const before = JSON.stringify(res.slots)
    buildLivePacket(input)
    buildLivePacket(input)
    expect(JSON.stringify(res.slots)).toBe(before)
    expect(res.slots.map((s) => s.status).slice(0, 7)).toEqual(['valid', 'rejected', 'rejected', 'rejected', 'other-stop', 'valid', 'valid'])
  })

  it('contains a hostile stop reason, request id, content-block type and mechanical detail: no heading, no table row', async () => {
    const { res, packet } = await run(HOSTILE_RUN)
    expect(res.slots[4]).toMatchObject({ status: 'other-stop', stopReason: 'end_turn\n## Case S95' })
    expect(res.slots[5].notes.join()).toContain('## Case S94')
    expect(res.slots[6].requestId).toBe('req_9\n## Case S93')
    const table = packet.files['run-table.md']
    const lines = table.split('\n')
    expect(lines.filter((l) => ROW.test(l))).toHaveLength(66)
    for (const forged of ['## Case S95', '## Case S94', '## Case S93', '## Case S96', '## Case S99']) expect(lines, forged).not.toContain(forged)
    for (const h of headings(table)) expect(ALLOWED_HEADINGS.some((r) => r.test(h)), JSON.stringify(h)).toBe(true)
    // Preserved: the forged text is still there for a person to read, as quoted data.
    for (const kept of ['## Case S95', '## Case S94', '## Case S93']) expect(lines, kept).toContain(`| ${kept}`)
  })

  it('contains a transport error message that carries forged structure', async () => {
    const { res, packet } = await run((n, r, id, counted) => (n === 3 ? new Error('connection reset\n## Case S92\n### Output Y') : HOSTILE_RUN(n, r, id, counted)))
    expect(res.status).toBe('stopped')
    const table = packet.files['run-table.md']
    const p = packet.files['review-export.md']
    for (const text of [table, p, packet.files['appendix-b-samples.md']]) {
      expect(text.split('\n')).not.toContain('## Case S92')
      for (const h of headings(text)) expect(ALLOWED_HEADINGS.some((r) => r.test(h)), JSON.stringify(h)).toBe(true)
    }
    expect(table.split('\n')).toContain('| ## Case S92')
    expect(table.split('\n').filter((l) => ROW.test(l))).toHaveLength(66)
  })
})
