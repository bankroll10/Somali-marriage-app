import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { CountApproval, PaidRunApproval } from './approval'
import { sha256 } from './hash'
import { chargeReport, chargeRows, journalPath, JournalCorrupt, readJournal } from './journal'
import { memoryStore, type Store } from './store'

/**
 * A self-contained evidence packet (docs/MATCH-EVAL.md, "Stage 1a"): the approvals, the count run's start record, report,
 * raw responses and manifest, the paid run's approval record, journal, raw responses, manifest and result, the
 * reconciliation status and the review files, with a checksum for every file. Every path the review tables name resolves
 * inside it, relative to its root, and `verifyEvidence` checks that it does.
 *
 * A packet built from a fake run says so, on its own page and in the names and marks of everything it holds.
 */

export type EvidenceFiles = Record<string, string>

export interface EvidenceInput {
  store: Store
  countRunId: string
  runId: string
  countApproval: CountApproval
  paidApproval: PaidRunApproval
  /** The review packet's files (README, review export, appendix, run table, key). They go under `review/`. */
  packetFiles: Record<string, string>
  fake: boolean
}

const FAKE_DOC = `# FAKE TEST MATERIAL

Everything in this folder was produced by a test, with a fake transport and a temporary store.

- **No model was called.** Every "response" was scripted by the test and returned by a fake.
- **No credential was read and nothing was spent.** The key used was a dummy string that appears in no file.
- **The approvals are test fixtures.** They are signed "FAKE TEST FIXTURE", name a workspace that does not exist, and are not
  approvals of anything. The pricing in them is not a confirmed price.
- **The outputs are scripted and deliberately plain.** They say nothing about how any model behaves. Some are broken on
  purpose, to show how a failed slot appears.

What it is for: to let a reviewer check that the evidence of a run, including a run that stopped, holds together. Every file is
listed in \`SHA256SUMS\`, every raw response named in \`review/run-table.md\` is here, and the journal, the manifests, the count
report and the approvals agree with one another.

Paths in the review files are relative to this folder.
`

const hashOnly = (name: string): boolean => name === 'SHA256SUMS' || /report\.sha256$/.test(name) || /manifest\.json$/.test(name)

function sums(files: EvidenceFiles): string {
  return (
    Object.keys(files)
      .filter((n) => n !== 'SHA256SUMS')
      .sort()
      .map((n) => `${sha256(files[n])}  ${n}`)
      .join('\n') + '\n'
  )
}

function statusMarkdown(r: ReturnType<typeof chargeReport>, fake: boolean): string {
  const row = (x: { runId: string; seq: number; caseId: string; sample: number; reservedMicros: number; determinedMicros?: number; by?: string; note?: string }) =>
    `- run ${x.runId}, call ${x.seq} (${x.caseId}, sample ${x.sample}): reserved ${x.reservedMicros} micro-dollars${x.determinedMicros === undefined ? '' : `; determined ${x.determinedMicros} by ${x.by}`}`
  const list = (title: string, rows: Parameters<typeof row>[0][]) => [title, ...(rows.length === 0 ? ['- none'] : rows.map(row)), '']
  return [
    ...(fake ? ['> FAKE TEST MATERIAL. These are fake runs; no Console was checked and nothing was billed.', ''] : []),
    '# Reconciliation status',
    '',
    ...list('Held charges **pending reconciliation** (recorded as uncertain, not yet checked against the Console):', r.heldPending),
    ...list('Held charges **reconciled** (a person checked the Console; the original lines are unchanged):', r.heldReconciled),
    ...list('Reservations with **no outcome recorded**, pending (these block the next start):', r.unresolved),
    ...list('Reservations with no outcome recorded, **reconciled**:', r.unmatchedReconciled),
    `Totals (micro-dollars): settled ${r.totals.settledMicros}; held and pending ${r.totals.heldPendingMicros}; held and reconciled, reserved ${r.totals.heldReconciledReservedMicros}, determined ${r.totals.heldReconciledDeterminedMicros}.`,
    '',
    'Reconciling releases nothing and resumes nothing. The run stays single-use.',
    '',
  ].join('\n')
}

export function buildEvidence(i: EvidenceInput): EvidenceFiles {
  const files: EvidenceFiles = {}
  const take = (path: string) => {
    const t = i.store.read(path)
    if (t !== null) files[path] = t
  }
  for (const n of ['start.json', 'stopped.json', 'report.json', 'report.sha256']) take(`counts/${i.countRunId}/${n}`)
  for (const n of i.store.list(`counts/${i.countRunId}/raw`)) take(`counts/${i.countRunId}/raw/${n}`)
  for (const n of ['approval.json', 'journal.jsonl', 'result.json']) take(`runs/${i.runId}/${n}`)
  for (const n of i.store.list(`runs/${i.runId}/raw`)) take(`runs/${i.runId}/raw/${n}`)
  files['approvals/count-approval.json'] = JSON.stringify(i.countApproval, null, 2) + '\n'
  files['approvals/paid-run-approval.json'] = JSON.stringify(i.paidApproval, null, 2) + '\n'
  const report = chargeReport(i.store)
  files['reconciliation-status.json'] = JSON.stringify({ fake: i.fake, note: i.fake ? 'FAKE TEST MATERIAL' : undefined, ...report }, null, 2) + '\n'
  files['reconciliation-status.md'] = statusMarkdown(report, i.fake)
  for (const [name, text] of Object.entries(i.packetFiles)) files[`review/${name}`] = text
  if (i.fake) files['FAKE-TEST-MATERIAL.md'] = FAKE_DOC
  files['SHA256SUMS'] = sums(files)
  return files
}

/** Every problem found; empty when the packet is whole. Reads only the files it is given. */
export function verifyEvidence(files: EvidenceFiles): string[] {
  const problems: string[] = []
  const get = (p: string): string | undefined => files[p]

  // 1. The checksum list covers every file, once, and each hash is right.
  const listed = new Map<string, string>()
  for (const line of (get('SHA256SUMS') ?? '').split('\n').filter(Boolean)) {
    const m = /^([0-9a-f]{64}) {2}(.+)$/.exec(line)
    if (!m) problems.push(`SHA256SUMS has a line that is not a checksum: ${JSON.stringify(line)}`)
    else if (listed.has(m[2])) problems.push(`SHA256SUMS lists ${m[2]} twice`)
    else listed.set(m[2], m[1])
  }
  if (get('SHA256SUMS') === undefined) problems.push('there is no SHA256SUMS')
  for (const [name, hash] of listed) {
    if (files[name] === undefined) problems.push(`${name} is listed in SHA256SUMS and missing`)
    else if (sha256(files[name]) !== hash) problems.push(`${name} does not match its checksum`)
  }
  for (const name of Object.keys(files)) if (name !== 'SHA256SUMS' && !listed.has(name)) problems.push(`${name} is not listed in SHA256SUMS`)

  // 2. Every raw folder: the manifest lists every file and each hash is right; every meta file agrees with its body.
  const rawDirs = Object.keys(files).map((n) => /^((?:counts|runs)\/[^/]+\/raw)\//.exec(n)?.[1]).filter((d): d is string => !!d)
  for (const dir of [...new Set(rawDirs)]) {
    const manifestText = get(`${dir}/manifest.json`)
    if (manifestText === undefined) {
      problems.push(`${dir} has no manifest`)
      continue
    }
    let manifest: { files: { name: string; sha256: string }[] }
    try {
      manifest = JSON.parse(manifestText)
    } catch {
      problems.push(`${dir}/manifest.json is not JSON`)
      continue
    }
    const inManifest = new Set(manifest.files.map((f) => f.name))
    for (const f of manifest.files) {
      const text = get(`${dir}/${f.name}`)
      if (text === undefined) problems.push(`${dir}/${f.name} is in the manifest and missing`)
      else if (sha256(text) !== f.sha256) problems.push(`${dir}/${f.name} does not match the manifest`)
    }
    for (const name of Object.keys(files)) {
      const m = name.startsWith(`${dir}/`) ? name.slice(dir.length + 1) : null
      if (m && m !== 'manifest.json' && !inManifest.has(m)) problems.push(`${name} is not in the manifest`)
    }
    for (const name of Object.keys(files).filter((n) => n.startsWith(`${dir}/`) && n.endsWith('.meta.json'))) {
      try {
        const meta = JSON.parse(files[name]) as { bodySha256: string | null }
        const body = get(name.replace(/\.meta\.json$/, '.body'))
        if (meta.bodySha256 === null ? body !== undefined : body === undefined || sha256(body) !== meta.bodySha256) problems.push(`${name} disagrees with its body`)
      } catch {
        problems.push(`${name} is not JSON`)
      }
    }
  }

  // 3. Every raw reference in the review tables resolves.
  const table = get('review/run-table.md')
  if (table === undefined) problems.push('there is no review/run-table.md')
  else {
    for (const line of table.split('\n')) {
      if (!/^\| \d{1,2} \| S\d{2} \| [123] \| /.test(line)) continue
      const ref = line.replace(/ \|$/, '').split(' | ').pop()?.trim() ?? ''
      if (ref !== '' && get(ref) === undefined) problems.push(`the run table names ${ref}, which is not in the packet`)
    }
  }

  // 4. The approvals, the count report and the run record agree.
  let paid: PaidRunApproval | undefined
  let count: CountApproval | undefined
  try {
    paid = JSON.parse(get('approvals/paid-run-approval.json') ?? '') as PaidRunApproval
    count = JSON.parse(get('approvals/count-approval.json') ?? '') as CountApproval
  } catch {
    problems.push('an approval record is missing or is not JSON')
  }
  if (paid && count) {
    const report = get(`counts/${paid.countRunId}/report.json`)
    if (report === undefined) problems.push(`the paid approval names count run ${paid.countRunId}, which has no report in the packet`)
    else {
      if (sha256(report) !== paid.countReportSha256) problems.push('the paid approval’s count report hash does not match the report')
      if ((get(`counts/${paid.countRunId}/report.sha256`) ?? '').trim() !== sha256(report)) problems.push('the report does not match its hash file')
      try {
        const parsed = JSON.parse(report) as { items: { caseId: string; rawBodySha256: string }[]; probes: { rawBodySha256: string }[] }
        ;[...parsed.items, ...parsed.probes].forEach((item, n) => {
          const body = get(`counts/${paid!.countRunId}/raw/${String(n + 1).padStart(3, '0')}.body`)
          if (body === undefined || sha256(body) !== item.rawBodySha256) problems.push(`count ${n + 1} does not match its raw response`)
        })
      } catch {
        problems.push('the count report is not JSON')
      }
    }
    try {
      const start = JSON.parse(get(`counts/${count.countRunId}/start.json`) ?? '') as { approval: unknown }
      if (JSON.stringify(start.approval) !== JSON.stringify(count)) problems.push('the count start record holds a different approval from the one in the packet')
    } catch {
      problems.push('the count start record is missing or is not JSON')
    }
    const runApproval = get(`runs/${paid.runId}/approval.json`)
    if (runApproval !== get('approvals/paid-run-approval.json')) problems.push('the run’s saved approval is not the approval in the packet')

    // 5. The journal chains, starts from this approval, agrees with the result, and the reconciliation status is what it computes to.
    const mem = memoryStore({ files: new Map(Object.entries(files)) })
    try {
      const entries = readJournal(mem, journalPath(paid.runId)).entries
      const first = entries[0]
      if (!first || first.t !== 'started' || runApproval === undefined || first.approvalSha256 !== sha256(runApproval)) problems.push('the journal does not start from the saved approval')
      try {
        const written = JSON.parse(get('reconciliation-status.json') ?? '') as Record<string, unknown>
        delete written.fake
        delete written.note
        if (JSON.stringify(written) !== JSON.stringify(chargeReport(mem))) problems.push('the reconciliation status does not match the journal')
      } catch {
        problems.push('the reconciliation status is missing or is not JSON')
      }
      const result = get(`runs/${paid.runId}/result.json`)
      try {
        const slots = (JSON.parse(result ?? '') as { slots: { index: number; charge: string; chargedMicros: number; rawBodyPath: string | null; status: string }[] }).slots
        const rows = new Map(chargeRows(paid.runId, entries).map((r) => [r.seq, r]))
        for (const s of slots) {
          const r = rows.get(s.index + 1)
          if (s.charge === 'settled' && (r?.status !== 'settled' || r.settledMicros !== s.chargedMicros)) problems.push(`slot ${s.index + 1} disagrees with the journal about its charge`)
          if (s.charge === 'none' && r) problems.push(`slot ${s.index + 1} was never sent but the journal reserved it`)
          if (s.rawBodyPath && get(s.rawBodyPath) === undefined) problems.push(`slot ${s.index + 1} names ${s.rawBodyPath}, which is not in the packet`)
        }
      } catch {
        problems.push('the result is missing or is not JSON')
      }
    } catch (e) {
      problems.push(e instanceof JournalCorrupt ? `the journal is damaged: ${e.message}` : 'the journal is missing or unreadable')
    }
  }

  // 6. A fake packet is marked everywhere it should be.
  let fake = false
  try {
    fake = (JSON.parse(get('review/review-key.json') ?? '{}') as { fake?: boolean }).fake === true
  } catch {
    fake = false
  }
  if (fake) {
    if (get('FAKE-TEST-MATERIAL.md') === undefined) problems.push('a fake packet has no FAKE-TEST-MATERIAL.md')
    for (const name of Object.keys(files)) {
      if (hashOnly(name) || /\/raw\/\d{3}\.body$/.test(name)) continue
      const authored = name === 'FAKE-TEST-MATERIAL.md' || name.startsWith('approvals/') || name.startsWith('review/') || name.startsWith('reconciliation-status')
      if (!(authored ? /FAKE/ : /fake/i).test(files[name])) problems.push(`${name} is not marked as test material`)
    }
  }
  return problems
}

export function writeEvidence(dir: string, files: EvidenceFiles): void {
  for (const [name, text] of Object.entries(files)) {
    const path = join(dir, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, text)
  }
}

export function readEvidence(dir: string): EvidenceFiles {
  const out: EvidenceFiles = {}
  const walk = (rel: string) => {
    for (const name of readdirSync(join(dir, rel)).sort()) {
      const r = rel === '' ? name : `${rel}/${name}`
      if (statSync(join(dir, r)).isDirectory()) walk(r)
      else out[r] = readFileSync(join(dir, r), 'utf8')
    }
  }
  walk('')
  return out
}
