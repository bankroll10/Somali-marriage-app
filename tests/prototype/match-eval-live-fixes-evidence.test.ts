import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CASES } from './match-eval/cases'
import { journalPath } from './match-eval/live/journal'
import { buildLivePacket } from './match-eval/live/packet'
import type { MemoryStore } from './match-eval/live/store'
import { clock, messageBody, ok, paidFixture, scriptedOutput, type GenScript } from './match-eval-live-support'

/**
 * MATCH-05 Stage 1a correction pass, item 5: a self-contained fake evidence packet. Approvals, count report, raw
 * responses and manifests, journal, result, reconciliation status and review files travel together with checksums, every
 * reference in the review tables resolves and verifies, and everything is marked as test material.
 */

const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const good = (id: string, counted: number) => ok(messageBody({ text: JSON.stringify(scriptedOutput(CASES.find((c) => c.id === id)!)), input: counted, output: 90 }))
const HALT: GenScript = (n, _r, id, counted) => (n === 5 ? { status: 500, headers: { 'request-id': 'req_FAKE_TEST_MATERIAL' }, body: '<html>FAKE upstream error</html>' } : good(id, counted))

type Evidence = {
  buildEvidence: (i: unknown) => Record<string, string>
  verifyEvidence: (files: Record<string, string>) => string[]
  writeEvidence: (dir: string, files: Record<string, string>) => void
  readEvidence: (dir: string) => Record<string, string>
}
const load = async () => (await import('./match-eval/live/evidence')) as unknown as Evidence

async function evidenceFor(script?: GenScript, reconcileSeq?: number) {
  const ev = await load()
  const f = await paidFixture({ script, fake: true } as never)
  const res = await f.run()
  if (res.status !== 'completed' && res.status !== 'stopped') throw new Error('the fake run did not run')
  if (reconcileSeq !== undefined) {
    const { reconcile } = await import('./match-eval/live/journal')
    ;(reconcile as unknown as (s: MemoryStore, a: unknown, c: () => string) => unknown)(f.store, { runId: f.approval.runId, seq: reconcileSeq, determinedMicros: 0, note: 'FAKE TEST: pretend the Console showed nothing.', by: 'FAKE TEST FIXTURE' }, clock)
  }
  const { readJournal } = await import('./match-eval/live/journal')
  const packet = buildLivePacket({ runId: f.approval.runId, seed: 'fake-run', cases: CASES, slots: res.slots, samples: 3, stoppedReason: res.reason, fake: true, entries: readJournal(f.store, journalPath(f.approval.runId)).entries } as never)
  const countApproval = JSON.parse(f.store.read(`counts/${f.approval.countRunId}/start.json`) as string).approval
  const files = ev.buildEvidence({ store: f.store, countRunId: f.approval.countRunId, runId: f.approval.runId, countApproval, paidApproval: f.approval, packetFiles: packet.files, fake: true })
  return { ev, f, res, files }
}

const rawRefs = (runTable: string) => runTable.split('\n').filter((l) => /^\| \d{1,2} \| S\d{2} \| [123] \| /.test(l)).map((l) => l.split(' | ').pop()!.replace(/ \|$/, '').trim()).filter((p) => p.startsWith('runs/'))

describe('a complete fake evidence packet', () => {
  it('holds every kind of evidence, with checksums', async () => {
    const { files } = await evidenceFor()
    const id = 'fake-test-paid-run'
    const cid = 'fake-test-count-run'
    for (const p of [
      'FAKE-TEST-MATERIAL.md',
      'SHA256SUMS',
      'approvals/count-approval.json',
      'approvals/paid-run-approval.json',
      `counts/${cid}/start.json`,
      `counts/${cid}/report.json`,
      `counts/${cid}/report.sha256`,
      `counts/${cid}/raw/manifest.json`,
      `counts/${cid}/raw/001.body`,
      `counts/${cid}/raw/001.meta.json`,
      `runs/${id}/approval.json`,
      `runs/${id}/journal.jsonl`,
      `runs/${id}/result.json`,
      `runs/${id}/raw/manifest.json`,
      `runs/${id}/raw/001.body`,
      `runs/${id}/raw/066.meta.json`,
      'reconciliation-status.json',
      'reconciliation-status.md',
      'review/README.md',
      'review/review-export.md',
      'review/appendix-b-samples.md',
      'review/run-table.md',
      'review/review-key.json',
    ]) expect(Object.keys(files), p).toContain(p)
    expect(Object.keys(files).filter((p) => /^counts\/[^/]+\/raw\/\d{3}\.body$/.test(p))).toHaveLength(27)
    expect(Object.keys(files).filter((p) => /^runs\/[^/]+\/raw\/\d{3}\.body$/.test(p))).toHaveLength(66)
  })

  it('verifies end to end', async () => {
    const { ev, files } = await evidenceFor()
    expect(ev.verifyEvidence(files)).toEqual([])
  })

  it('resolves and verifies every raw reference in the review tables, checked here without the verifier', async () => {
    const { files } = await evidenceFor()
    const refs = rawRefs(files['review/run-table.md'])
    expect(refs).toHaveLength(66)
    for (const ref of refs) {
      expect(files[ref], ref).toBeDefined()
      const meta = JSON.parse(files[ref.replace(/\.body$/, '.meta.json')])
      expect(meta.bodySha256, ref).toBe(sha(files[ref]))
      const sums = files['SHA256SUMS'].split('\n').find((l) => l.endsWith(`  ${ref}`))
      expect(sums?.split('  ')[0], ref).toBe(sha(files[ref]))
    }
    const manifest = JSON.parse(files['runs/fake-test-paid-run/raw/manifest.json'])
    for (const m of manifest.files) expect(sha(files[`runs/fake-test-paid-run/raw/${m.name}`])).toBe(m.sha256)
  })

  it('ties the approval to the report, the report to its raw counts, and the journal to the approval', async () => {
    const { files } = await evidenceFor()
    const paid = JSON.parse(files['approvals/paid-run-approval.json'])
    expect(paid.countReportSha256).toBe(sha(files['counts/fake-test-count-run/report.json']))
    expect(paid.countReportSha256).toBe(files['counts/fake-test-count-run/report.sha256'].trim())
    const report = JSON.parse(files['counts/fake-test-count-run/report.json'])
    report.items.forEach((item: { rawBodySha256: string }, i: number) => expect(item.rawBodySha256).toBe(sha(files[`counts/fake-test-count-run/raw/${String(i + 1).padStart(3, '0')}.body`])))
    const first = JSON.parse(files['runs/fake-test-paid-run/journal.jsonl'].split('\n')[0])
    expect(first.t).toBe('started')
    expect(first.approvalSha256).toBe(sha(files['runs/fake-test-paid-run/approval.json']))
  })

  it('detects each kind of damage', async () => {
    const { ev, files } = await evidenceFor()
    const damage: [string, (f: Record<string, string>) => void][] = [
      ['a missing raw body', (f) => delete f['runs/fake-test-paid-run/raw/007.body']],
      ['a changed raw body', (f) => (f['runs/fake-test-paid-run/raw/007.body'] += ' ')],
      ['a missing meta file', (f) => delete f['runs/fake-test-paid-run/raw/007.meta.json']],
      ['a missing manifest', (f) => delete f['runs/fake-test-paid-run/raw/manifest.json']],
      ['a changed count report', (f) => (f['counts/fake-test-count-run/report.json'] += ' ')],
      ['a changed approval', (f) => (f['approvals/paid-run-approval.json'] = f['approvals/paid-run-approval.json'].replace('"samples": 3', '"samples": 4'))],
      ['a dropped checksum line', (f) => (f['SHA256SUMS'] = f['SHA256SUMS'].split('\n').slice(1).join('\n'))],
      ['an unlisted file', (f) => (f['extra.txt'] = 'FAKE')],
      ['a run table pointing at nothing', (f) => (f['review/run-table.md'] = f['review/run-table.md'].replace('runs/fake-test-paid-run/raw/003.body', 'runs/fake-test-paid-run/raw/999.body'))],
      ['an edited journal line', (f) => (f['runs/fake-test-paid-run/journal.jsonl'] = f['runs/fake-test-paid-run/journal.jsonl'].replace('"sample":1', '"sample":2'))],
      ['a changed result', (f) => (f['runs/fake-test-paid-run/result.json'] = f['runs/fake-test-paid-run/result.json'].replace('"valid"', '"error"'))],
    ]
    for (const [label, mutate] of damage) {
      const copy = { ...files }
      mutate(copy)
      expect(ev.verifyEvidence(copy).length, label).toBeGreaterThan(0)
    }
  })

  it('is marked as test material on every page, approval and output', async () => {
    const { files } = await evidenceFor()
    expect(files['FAKE-TEST-MATERIAL.md']).toMatch(/FAKE TEST MATERIAL/)
    expect(files['FAKE-TEST-MATERIAL.md']).toMatch(/No model was called/)
    for (const name of ['approvals/count-approval.json', 'approvals/paid-run-approval.json']) {
      const a = JSON.parse(files[name])
      expect(JSON.stringify(a), name).toMatch(/FAKE TEST FIXTURE/)
      expect(a.workspaceName, name).toMatch(/^FAKE-TEST-WORKSPACE/)
      expect(a.countRunId ?? a.runId).toMatch(/^fake-test-/)
    }
    expect(JSON.parse(files['approvals/paid-run-approval.json']).pricing.confirmedBy).toMatch(/FAKE TEST FIXTURE/)
    // Files the packet authors carry the capitalised marker; files the commands wrote carry the fake ids or the fake request id.
    const authored = (n: string) => n === 'FAKE-TEST-MATERIAL.md' || n.startsWith('approvals/') || n.startsWith('review/') || n.startsWith('reconciliation-status')
    const hashOnly = (n: string) => n === 'SHA256SUMS' || /report\.sha256$/.test(n) || /manifest\.json$/.test(n)
    for (const [name, text] of Object.entries(files)) {
      if (hashOnly(name) || /\/raw\/\d{3}\.body$/.test(name)) continue
      expect(text, name).toMatch(authored(name) ? /FAKE/ : /fake/i)
    }
    for (const [name, text] of Object.entries(files)) if (/^runs\/.*\/raw\/\d{3}\.body$/.test(name)) expect(text, name).toMatch(/FAKE_TEST_MATERIAL/)
    for (const name of Object.keys(files).filter((n) => n.startsWith('review/') && n.endsWith('.md'))) expect(files[name].startsWith('> FAKE RUN.'), name).toBe(true)
    expect(Object.values(files).join('\n')).not.toMatch(/sk-ant-|DUMMY-KEY|fake-credential-for-tests-only/)
  })

  it('round-trips through a real folder and still verifies, and notices a changed byte on disk', async () => {
    const { ev, files } = await evidenceFor()
    const dir = mkdtempSync(join(tmpdir(), 'match-eval-evidence-'))
    try {
      ev.writeEvidence(dir, files)
      const back = ev.readEvidence(dir)
      expect(back).toEqual(files)
      expect(ev.verifyEvidence(back)).toEqual([])
      writeFileSync(join(dir, 'runs/fake-test-paid-run/raw/010.body'), readFileSync(join(dir, 'runs/fake-test-paid-run/raw/010.body'), 'utf8') + ' ')
      expect(ev.verifyEvidence(ev.readEvidence(dir)).length).toBeGreaterThan(0)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('a halted fake evidence packet', () => {
  it('keeps every slot, resolves every reference and shows the held charge as pending', async () => {
    const { ev, files, res } = await evidenceFor(HALT)
    expect(res.status).toBe('stopped')
    expect(ev.verifyEvidence(files)).toEqual([])
    const refs = rawRefs(files['review/run-table.md'])
    expect(refs).toHaveLength(5)
    for (const ref of refs) expect(files[ref], ref).toBeDefined()
    expect(files['review/run-table.md'].split('\n').filter((l) => /^\| \d{1,2} \| S\d{2} \| [123] \| /.test(l))).toHaveLength(66)
    const status = JSON.parse(files['reconciliation-status.json'])
    expect(status.heldPending).toHaveLength(1)
    expect(status.heldReconciled).toEqual([])
    expect(files['reconciliation-status.md']).toMatch(/pending reconciliation/)
  })

  it('shows the same charge as reconciled, with the determined charge and the original history intact', async () => {
    const { ev, files } = await evidenceFor(HALT, 5)
    expect(ev.verifyEvidence(files)).toEqual([])
    const status = JSON.parse(files['reconciliation-status.json'])
    expect(status.heldPending).toEqual([])
    expect(status.heldReconciled).toHaveLength(1)
    expect(status.heldReconciled[0]).toMatchObject({ seq: 5, determinedMicros: 0 })
    const kinds = files['runs/fake-test-paid-run/journal.jsonl'].split('\n').filter(Boolean).map((l) => JSON.parse(l).t)
    expect(kinds.slice(-3)).toEqual(['held', 'halted', 'reconciled'])
    expect(files['reconciliation-status.md']).toMatch(/reconciled/)
  })
})

describe('writing the fake evidence packets', () => {
  it('writes a complete, a halted and a halted-and-reconciled packet, each verifying from disk (set MATCH_EVAL_LIVE_FAKE_DIR to keep them)', async () => {
    const keep = process.env.MATCH_EVAL_LIVE_FAKE_DIR
    const dir = keep ?? mkdtempSync(join(tmpdir(), 'match-eval-evidence-'))
    try {
      const ev = await load()
      const sets = { 'complete-run': await evidenceFor(), 'halted-run': await evidenceFor(HALT), 'halted-run-reconciled': await evidenceFor(HALT, 5) }
      for (const [name, set] of Object.entries(sets)) {
        ev.writeEvidence(join(dir, name), set.files)
        const back = ev.readEvidence(join(dir, name))
        expect(ev.verifyEvidence(back), name).toEqual([])
        expect(back['FAKE-TEST-MATERIAL.md'], name).toMatch(/FAKE TEST MATERIAL/)
      }
      const status = (n: string) => JSON.parse(readFileSync(join(dir, n, 'reconciliation-status.json'), 'utf8'))
      expect(status('complete-run').heldPending).toEqual([])
      expect(status('halted-run').heldPending).toHaveLength(1)
      expect(status('halted-run-reconciled').heldReconciled).toHaveLength(1)
    } finally {
      if (!keep) rmSync(dir, { recursive: true, force: true })
    }
  }, 120_000)
})
