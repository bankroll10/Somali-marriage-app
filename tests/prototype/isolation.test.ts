import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PROTOTYPE, ROOT, codeLines, importClosure, walk } from './support'

/**
 * ISOLATION — the matching prototype cannot reach production (docs/MATCH-PROTOTYPE.md).
 *
 * It is a second HTML entry that `vite build` never bundles. These hold it
 * apart by reading the source: what it imports, what those modules do, and who
 * imports it. The built output is checked separately, by comparing a build with
 * and without it (docs/MATCH-PROTOTYPE.md, "Verification").
 */

const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')
const ENTRY = `${PROTOTYPE}/main.tsx`

describe('what the prototype imports', () => {
  const { files, packages } = importClosure(ENTRY)
  const inside = files.filter((f) => f.startsWith(`${PROTOTYPE}/`))
  const outside = files.filter((f) => !f.startsWith(`${PROTOTYPE}/`))

  it('reaches only three presentation and data modules outside itself, and not the app’s stylesheet', () => {
    // The transitive closure, not just the direct imports: a shared component that quietly pulled in storage would show here.
    expect(outside).toEqual(['src/components/ui.tsx', 'src/data/help.ts', 'src/hooks/useFocusHeading.ts'].sort())
    expect(inside).toContain(`${PROTOTYPE}/prototype.css`)
    expect(packages).toEqual(['react', 'react-dom/client'])
  })

  it('none of the Guide, the private tools, Forget me, the introduction or storage modules are imported', () => {
    for (const f of files) {
      expect(f, f).not.toMatch(/src\/lib\/|src\/components\/(Coach|Read|BeforeYes|Couple|Families|Intake|Trust|Looking|ForgetMe|Home|Welcome)/)
    }
  })

  it('nothing in the closure reads or writes storage, uses the network, or reads the build environment', () => {
    const forbidden = /\b(localStorage|sessionStorage|indexedDB|XMLHttpRequest|sendBeacon|WebSocket|EventSource|BroadcastChannel)\b|\bfetch\s*\(|document\.cookie|navigator\.serviceWorker|import\.meta\.env|\.netlify/
    const found: string[] = []
    for (const f of files.filter((x) => /\.(ts|tsx)$/.test(x))) {
      for (const { n, line } of codeLines(read(f))) if (forbidden.test(line)) found.push(`${f}:${n}: ${line.trim()}`)
    }
    expect(found).toEqual([])
    expect(inside.length).toBeGreaterThan(10)
  })

  it('writes no key a later Forget me would have to know about', () => {
    for (const f of walk(join(ROOT, PROTOTYPE), /\.tsx?$/)) expect(readFileSync(f, 'utf8')).not.toMatch(/'niyyah\.[a-z.]+v\d+'/)
  })
})

describe('who imports the prototype, and what builds it', () => {
  it('nothing outside it and its tests refers to it', () => {
    const offenders: string[] = []
    for (const dir of ['src', 'netlify', 'tests', 'scripts']) {
      if (!existsSync(join(ROOT, dir))) continue
      for (const f of walk(join(ROOT, dir), /\.(ts|tsx|mjs|js|json|html)$/)) {
        const rel = f.slice(ROOT.length + 1)
        if (rel.startsWith('src/prototype/') || rel.startsWith('tests/prototype/')) continue
        if (/prototype\/match|match\.html/.test(readFileSync(f, 'utf8'))) offenders.push(rel)
      }
    }
    expect(offenders).toEqual([])
  })

  it('index.html, the build config, the deploy config and the package scripts do not mention it', () => {
    for (const f of ['index.html', 'vite.config.ts', 'netlify.toml', 'package.json', 'src/main.tsx', 'src/App.tsx', 'src/lib/entry.ts']) {
      expect(read(f), f).not.toMatch(/prototype\/match|match\.html|MatchPrototype/)
    }
  })

  it('the build has no extra input, so match.html is not bundled', () => {
    const config = read('vite.config.ts')
    expect(config).not.toMatch(/rollupOptions|build\s*:\s*\{|\binput\s*:/)
    expect(existsSync(join(ROOT, 'match.html'))).toBe(true)
  })

  it('the entry page is not indexable and registers nothing', () => {
    const html = read('match.html').replace(/<!--[\s\S]*?-->/g, '')
    expect(html).toContain('noindex')
    expect(html).not.toMatch(/manifest|serviceWorker|analytics|<script src=|https?:\/\//)
    expect(html.match(/<script[^>]*>/g)).toEqual(['<script type="module" src="/src/prototype/match/main.tsx">'])
  })
})

describe('what the simulated other person is allowed to be read as', () => {
  it('only the Prototype controls read what the made-up people have chosen', () => {
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
