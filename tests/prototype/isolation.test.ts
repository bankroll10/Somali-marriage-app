import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PROTOTYPE, ROOT, codeLines, importClosure, walk } from './support'

/**
 * ISOLATION — the demo cannot reach the app, and the app cannot reach the demo
 * (docs/MATCH-PROTOTYPE.md, docs/DECISIONS.md release R4).
 *
 * The demo is a second HTML entry, built by its own config into its own folder.
 * These hold it apart by reading the source: what it imports, what those
 * modules do, and who refers to it. The built output is checked separately
 * (tests/prototype/build.test.ts), and the headers and routes in
 * tests/demo-site.test.ts.
 */

const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')
const ENTRY = `${PROTOTYPE}/main.tsx`

describe('what the demo imports', () => {
  const { files, packages } = importClosure(ENTRY)
  const inside = files.filter((f) => f.startsWith(`${PROTOTYPE}/`))
  const outside = files.filter((f) => !f.startsWith(`${PROTOTYPE}/`))

  it('reaches only three presentation and data modules outside itself, and not the app’s stylesheet', () => {
    // The transitive closure, not just the direct imports: a shared component that quietly pulled in storage would show here.
    expect(outside).toEqual(['src/components/ui.tsx', 'src/data/help.ts', 'src/hooks/useFocusHeading.ts'].sort())
    expect(inside).toContain(`${PROTOTYPE}/prototype.css`)
    expect(packages).toEqual(['react', 'react-dom/client'])
  })

  it('reaches nothing under tests, netlify or scripts, and none of the Guide, the private tools, Forget me, the introduction or storage modules', () => {
    for (const f of files) {
      expect(f, f).not.toMatch(/^(tests|netlify|scripts|internal|\.github)\//)
      expect(f, f).not.toMatch(/src\/lib\/|src\/components\/(Coach|Read|BeforeYes|Couple|Families|Intake|Trust|Looking|ForgetMe|Home|Welcome)/)
    }
  })

  it('nothing in the closure reads or writes storage, uses the network, or reads the build environment', () => {
    const forbidden = /\b(localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon|WebSocket|EventSource|BroadcastChannel)\b|\bfetch\s*\(|document\.cookie|navigator\.serviceWorker|import\.meta\.env|process\.env|\.netlify/
    const found: string[] = []
    for (const f of files.filter((x) => /\.(ts|tsx)$/.test(x))) {
      for (const { n, line } of codeLines(read(f))) if (forbidden.test(line)) found.push(`${f}:${n}: ${line.trim()}`)
    }
    expect(found).toEqual([])
    expect(inside.length).toBeGreaterThan(10)
  })

  it('names no evaluation work, vendor or credential anywhere in the demo’s source or the three modules it borrows', () => {
    const found: string[] = []
    for (const f of [...walk(join(ROOT, PROTOTYPE), /\.(tsx?|css)$/).map((p) => p.slice(ROOT.length + 1)), ...outside]) {
      if (/match-eval|MATCH_EVAL|anthropic|x-api-key|sk-ant|api\.anthropic/i.test(read(f))) found.push(f)
    }
    expect(found).toEqual([])
  })

  it('writes no key a later Forget me would have to know about', () => {
    for (const f of walk(join(ROOT, PROTOTYPE), /\.tsx?$/)) expect(readFileSync(f, 'utf8')).not.toMatch(/'niyyah\.[a-z.]+v\d+'/)
  })
})

describe('who refers to the demo, and what builds it', () => {
  it('nothing outside it, its tests, its config and its page refers to it', () => {
    const offenders: string[] = []
    for (const dir of ['src', 'netlify', 'tests', 'scripts']) {
      if (!existsSync(join(ROOT, dir))) continue
      for (const f of walk(join(ROOT, dir), /\.(ts|tsx|mjs|js|json|html)$/)) {
        const rel = f.slice(ROOT.length + 1)
        if (rel.startsWith('src/prototype/') || rel.startsWith('tests/prototype/')) continue
        if (/prototype\/match|MatchPrototype/.test(readFileSync(f, 'utf8'))) offenders.push(rel)
      }
    }
    expect(offenders).toEqual([])
  })

  it('index.html, the app’s build config and the app’s entry points do not mention it', () => {
    for (const f of ['index.html', 'vite.config.ts', 'src/main.tsx', 'src/App.tsx', 'src/lib/entry.ts']) {
      expect(read(f), f).not.toMatch(/prototype\/match|MatchPrototype|demo\/index|demo-assets/)
    }
  })

  it('the app’s build has no extra input, so the demo is built only by its own config', () => {
    expect(read('vite.config.ts')).not.toMatch(/rollupOptions|build\s*:\s*\{|\binput\s*:/)
    expect(read('vite.demo.config.ts')).toContain("input: 'demo/index.html'")
  })

  it('the entry page is not indexable, registers nothing and loads one module', () => {
    const html = read('demo/index.html').replace(/<!--[\s\S]*?-->/g, '')
    expect(html).toContain('noindex')
    expect(html).not.toMatch(/manifest|serviceWorker|analytics|<script src=|https?:\/\//)
    expect(html.match(/<script[^>]*>/g)).toEqual(['<script type="module" src="/src/prototype/match/main.tsx">'])
  })
})

describe('what the simulated other person is allowed to be read as', () => {
  it('only the “Try another scenario” controls read what the made-up people have chosen', () => {
    const readers: string[] = []
    for (const f of walk(join(ROOT, PROTOTYPE), /\.tsx$/)) {
      if (/interestedInYou|\.they\b|s\.they\[/.test(codeLines(readFileSync(f, 'utf8')).map((l) => l.line).join('\n'))) readers.push(f.slice(ROOT.length + 1))
    }
    // Connect.tsx reads the one thing that becomes visible by design: a photo the other person has chosen to share.
    expect(readers.sort()).toEqual([`${PROTOTYPE}/ControlsPanel.tsx`, `${PROTOTYPE}/screens/Connect.tsx`].sort())
    const connect = codeLines(readFileSync(join(ROOT, PROTOTYPE, 'screens/Connect.tsx'), 'utf8')).map((l) => l.line).join('\n')
    expect(connect).not.toMatch(/interestedInYou/)
    expect([...connect.matchAll(/s\.they\[[^\]]+\]\??\.(\w+)/g)].map((m) => m[1])).toEqual(['sharePhoto'])
  })
})
