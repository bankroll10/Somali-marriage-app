import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, normalize, relative } from 'node:path'

/** Shared by the prototype's source-reading tests. */

export const ROOT = join(import.meta.dirname, '..', '..')
export const PROTOTYPE = 'src/prototype/match'

export function walk(dir: string, accept: RegExp, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, accept, out)
    else if (accept.test(name)) out.push(path)
  }
  return out
}

/** The lines of a source file that are code or copy, with comment lines (and block comments) dropped. */
export function codeLines(text: string): { n: number; line: string }[] {
  const out: { n: number; line: string }[] = []
  let inBlock = false
  text.split('\n').forEach((line, i) => {
    const t = line.trim()
    if (inBlock) {
      if (t.includes('*/')) inBlock = false
      return
    }
    if (t.startsWith('//')) return
    if (t.startsWith('/*')) {
      if (!t.includes('*/')) inBlock = true
      return
    }
    out.push({ n: i + 1, line })
  })
  return out
}

/** Every local file reachable from `entry` by import or dynamic import, as repo-relative paths. External packages are returned apart. */
export function importClosure(entry: string): { files: string[]; packages: string[] } {
  const files = new Set<string>()
  const packages = new Set<string>()
  const visit = (file: string) => {
    const rel = relative(ROOT, file)
    if (files.has(rel)) return
    files.add(rel)
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
      const spec = m[1]
      if (!spec.startsWith('.')) {
        packages.add(spec)
        continue
      }
      const base = normalize(join(dirname(file), spec))
      const hit = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')].find((p) => existsSync(p) && statSync(p).isFile())
      if (hit) {
        if (/\.(ts|tsx)$/.test(hit)) visit(hit)
        else files.add(relative(ROOT, hit))
      } else throw new Error(`cannot resolve ${spec} from ${rel}`)
    }
  }
  visit(join(ROOT, entry))
  return { files: [...files].sort(), packages: [...packages].sort() }
}
