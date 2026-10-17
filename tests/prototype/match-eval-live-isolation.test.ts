import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RETENTION_SOURCES } from './match-eval/live/approval'
import { PROTOTYPE, ROOT, codeLines, walk } from './support'

/**
 * MATCH-05 Stage 1a stays contained (docs/MATCH-EVAL.md, "Stage 1a"). The live-path modules sit in their own folder.
 * The Stage 0 folder's own isolation test, which scans its files for the network, the environment and any credential,
 * is not relaxed: it still reads every Stage 0 file and none of them may import the live folder.
 */

const EVAL = join(ROOT, 'tests/prototype/match-eval')
const LIVE = join(EVAL, 'live')
const read = (p: string) => readFileSync(p, 'utf8')
const liveFiles = readdirSync(LIVE).filter((f) => f.endsWith('.ts')).sort()
const live = liveFiles.map((f) => [f, read(join(LIVE, f))] as const)
const code = (src: string) => codeLines(src).map((l) => l.line).join('\n')

describe('the live folder is a fixed, named set of files', () => {
  it('holds exactly these modules, so adding one is a deliberate change', () => {
    expect(liveFiles).toEqual(['analysis.ts', 'approval.ts', 'bindings.ts', 'count.ts', 'dispatch.ts', 'engine.ts', 'evidence.ts', 'hash.ts', 'journal.ts', 'packet.ts', 'probes.ts', 'prompt.ts', 'raw.ts', 'requests.ts', 'store.ts', 'transport.ts'])
  })

  it('has no entry point: nothing reads the command line, the environment or the global scope', () => {
    for (const [f, src] of live) {
      const c = code(src)
      expect(c, f).not.toMatch(/process\.|globalThis|\bwindow\b|\bglobal\b|import\.meta\.env|#!\/|\brequire\s*\(|\bimport\s*\(/)
    }
  })
})

describe('what the live modules may touch', () => {
  it('imports only its own modules, a few Stage 0 modules, the rules’ eligibility code and node file, path and hash helpers', () => {
    const ALLOWED = [
      /^\.\/[a-z]+$/,
      /^\.\.\/(cases|checks|contract|ledger|types|arms|export)$/,
      /^\.\.\/\.\.\/\.\.\/\.\.\/src\/prototype\/match\/suggest$/,
      /^node:(fs|path|crypto)$/,
    ]
    for (const [f, src] of live) {
      for (const m of src.matchAll(/from '([^']+)'/g)) expect(ALLOWED.some((r) => r.test(m[1])), `${f} imports ${m[1]}`).toBe(true)
    }
  })

  it('has no SDK, no http, net, tls or child-process module, no browser network API and no global fetch call', () => {
    for (const [f, src] of live) {
      const c = code(src)
      expect(c, f).not.toMatch(/@anthropic-ai|from 'node:(http|https|http2|net|tls|dgram|child_process|dns|worker_threads|vm)'|XMLHttpRequest|WebSocket|EventSource|sendBeacon|\bfetch\s*\(|\bnavigator\b/)
    }
  })

  it('does file work only in the store, the packet and evidence writers and the two places that hash the cases and expectations files', () => {
    const usesFs = live.filter(([, src]) => /from 'node:fs'/.test(src)).map(([f]) => f)
    expect(usesFs).toEqual(['bindings.ts', 'evidence.ts', 'packet.ts', 'requests.ts', 'store.ts'])
  })

  it('names the two endpoints in one place each, and nowhere else', () => {
    const files = live.filter(([, src]) => /api\.anthropic\.com/.test(code(src))).map(([f]) => f)
    expect(files).toEqual(['requests.ts', 'transport.ts'])
    expect(code(read(join(LIVE, 'requests.ts'))).match(/https:\/\/api\.anthropic\.com\/[a-z0-9_/]+/g)).toEqual(['https://api.anthropic.com/v1/messages', 'https://api.anthropic.com/v1/messages/count_tokens'])
    expect(code(read(join(LIVE, 'transport.ts'))).match(/https:\/\/api\.anthropic\.com\/[a-z0-9_/]+/g)).toBeNull()
  })

  it('holds a credential only as a name and as a header, never as a value, and never the Guide’s variable', () => {
    for (const [f, src] of live) {
      expect(src, f).not.toMatch(/sk-ant-|sk-[A-Za-z0-9]{20,}/)
      expect(src, f).not.toMatch(/(?<!MATCH_EVAL_)ANTHROPIC_API_KEY/)
    }
    expect(live.filter(([, src]) => /x-api-key/.test(code(src))).map(([f]) => f)).toEqual(['requests.ts', 'transport.ts'].filter((f) => /x-api-key/.test(code(read(join(LIVE, f))))))
    expect(live.filter(([, src]) => /MATCH_EVAL_ANTHROPIC_API_KEY/.test(code(src))).map(([f]) => f)).toEqual(['approval.ts'])
  })
})

describe('who can reach the live folder', () => {
  it('no Stage 0 module imports it', () => {
    for (const f of readdirSync(EVAL).filter((x) => x.endsWith('.ts'))) expect(read(join(EVAL, f)), f).not.toMatch(/from '\.\/live/)
  })

  it('no Stage 0 test imports it, so the Stage 0 tests run without any live module', () => {
    for (const f of ['match-eval.test.ts', 'match-eval-corrections.test.ts']) expect(read(join(ROOT, 'tests/prototype', f)), f).not.toMatch(/match-eval\/live|match-eval-live/)
  })

  it('nothing outside the live folder and the live tests refers to it', () => {
    const offenders: string[] = []
    for (const dir of ['src', 'netlify', 'tests', 'scripts', '.github']) {
      let files: string[] = []
      try {
        files = walk(join(ROOT, dir), /\.(ts|tsx|mjs|js|json|yml|yaml|html)$/)
      } catch {
        continue
      }
      for (const f of files) {
        const rel = f.slice(ROOT.length + 1)
        if (rel.startsWith('tests/prototype/match-eval/live/') || /^tests\/prototype\/match-eval-live[a-z-]*(\.test)?\.ts$/.test(rel)) continue
        if (/match-eval\/live|match-eval-live/.test(read(f))) offenders.push(rel)
      }
    }
    expect(offenders).toEqual([])
  })

  it('no package script, workflow, build or deploy config runs it', () => {
    for (const f of ['package.json', 'vite.config.ts', 'netlify.toml', 'index.html']) expect(read(join(ROOT, f)), f).not.toMatch(/match-eval|MATCH_EVAL/)
    for (const f of readdirSync(join(ROOT, '.github/workflows'))) expect(read(join(ROOT, '.github/workflows', f)), f).not.toMatch(/match-eval|MATCH_EVAL/)
  })

  it('the production source tree has no mention of it', () => {
    for (const f of walk(join(ROOT, 'src'), /\.(ts|tsx)$/)) {
      if (f.includes(PROTOTYPE)) continue
      expect(read(f), f).not.toMatch(/match-eval/)
    }
  })
})

describe('the protocol document says what Stage 1a is and is not', () => {
  const doc = read(join(ROOT, 'docs/MATCH-EVAL.md'))
  const section = doc.slice(doc.indexOf('## Stage 1a'), doc.indexOf('## What this could and could not establish'))

  it('has a Stage 1a section that says built, never run, nothing approved, and three approvals pending', () => {
    expect(section.length).toBeGreaterThan(5000)
    expect(section).toMatch(/built; never run; nothing approved/)
    expect(section).toMatch(/three separate\s+approvals and all three are pending/)
    expect(section).toMatch(/\*\*model, prompt and spending\*\*/)
  })

  it('cites both official retention sources and carries the conservative assumption', () => {
    for (const url of RETENTION_SOURCES) expect(section).toContain(url)
    expect(section).toMatch(/up to 30\s+days, and up to 2 years/)
    expect(section).toMatch(/could not be fetched/)
  })

  it('separates the count approval from the paid-run approval and avoids the circle', () => {
    expect(section).toMatch(/Two commands, two approvals, no circle/)
    expect(section).toMatch(/names no report hash and no ceiling/)
    expect(section).toMatch(/does not count again/)
  })

  it('says the count is an estimate, the ceiling is provisional and the contract has no finite maximal reply', () => {
    expect(section).toMatch(/documented as an estimate/)
    expect(section).toMatch(/no finite maximal reply/)
    expect(section).toMatch(/1,500 is\s+proposed and stays provisional/)
    expect(section).toMatch(/On every response/)
  })

  it('corrects the ordering claim: sample-by-sample order does not guarantee a complete first sample', () => {
    expect(section).toMatch(/does \*\*not\*\* guarantee a complete\s+first sample/)
    expect(doc).not.toMatch(/leaves a complete first sample|guarantees a complete first sample/)
  })

  it('names every live module and the no-retry, no-redirect and exclusive-create rules', () => {
    for (const f of liveFiles) expect(doc, f).toContain(f)
    expect(section).toMatch(/There are no retries anywhere/)
    expect(section).toMatch(/redirect: 'error'/)
    expect(section).toMatch(/exclusive/)
  })

  it('documents the correction pass: containment, the durable start, reconciliation, the dispatcher and the evidence packet', () => {
    for (const phrase of [/quoted data/, /durably single-use before anything is sent/, /start record/, /incomplete/, /held, pending reconciliation/, /held, reconciled/, /releases nothing and does not\s+resume the run/, /dispatch/, /never invokes it|never invokes the credential/, /No real executable wrapper exists/, /version 2 expectations file, the review\s+rubric and the preregistered analysis/, /self-contained/, /verifyEvidence/])
      expect(section, String(phrase)).toMatch(phrase)
    expect(section).toMatch(/sixteen modules/)
  })

  it('says repeating the rules block earns no added value', () => {
    expect(doc).toMatch(/Repeating the rules block on its own earns no added value/)
  })
})
