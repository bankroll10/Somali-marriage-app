import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BANNED } from './voice-rules'

/**
 * The voice, held as a list of things it does not say (docs/VOICE.md).
 *
 * Every phrase here was live in the product on 2026-09-20, most of them
 * dozens of times. They fall into five habits: the verbal tic ("actually" —
 * sixty occurrences), announcing sincerity ("genuinely", "on purpose"),
 * therapy vocabulary outside the one voice allowed it, startup nouns
 * ("founding cohort", "platform"), and the phrase docs/PROTOCOL.md:386 names
 * as its example of an exaggerated cultural claim. A word that earns its
 * place goes on the allowlist with a reason; nothing else does.
 *
 * Scanned line by line, comments skipped, in the shape of promises.test.ts.
 */

const ROOT = join(import.meta.dirname, '..', 'src')
const DIRS = ['components', 'data', 'lib']


/** Lines that keep a banned word, each with the reason it earns its place. */
const ALLOWED: [RegExp, string][] = [
  [/Actually, it’s something else/, 'a button in the person’s own voice, correcting us'],
  [/navigator\.platform|process\.platform/, 'code, not copy'],
  [/^\s*\/\\b\(/, 'a routing regex reads what she typed; it is not something we say'],
]

/** Comment lines, including the continuation lines of a block comment, which carry no marker of their own. */
function commentLines(lines: string[]): Set<number> {
  const out = new Set<number>()
  let inBlock = false
  lines.forEach((line, i) => {
    const t = line.trim()
    if (inBlock) {
      out.add(i)
      if (t.includes('*/')) inBlock = false
      return
    }
    if (t.startsWith('//') || t.startsWith('*')) out.add(i)
    const open = t.indexOf('/*')
    if (open !== -1) {
      out.add(i)
      if (!t.slice(open).includes('*/')) inBlock = true
    }
  })
  return out
}

function files(): { file: string; lines: string[] }[] {
  const out: { file: string; lines: string[] }[] = []
  const walk = (at: string, rel: string) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      const full = join(at, entry.name)
      const r = `${rel}/${entry.name}`
      if (entry.isDirectory()) walk(full, r)
      else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
        out.push({ file: r, lines: readFileSync(full, 'utf8').split('\n') })
      }
    }
  }
  for (const d of DIRS) walk(join(ROOT, d), d)
  return out
}

describe('the voice', () => {
  it('says none of the things it stopped saying', () => {
    const hits: string[] = []
    for (const { file, lines } of files()) {
      const skip = commentLines(lines)
      lines.forEach((line, i) => {
        if (skip.has(i)) return
        if (ALLOWED.some(([re]) => re.test(line))) return
        for (const [re, why] of BANNED) {
          if (re.test(line)) hits.push(`${file}:${i + 1}  ${why}\n      ${line.trim().slice(0, 110)}`)
        }
      })
    }
    expect(hits, `\n${hits.length} lines say something the voice does not:\n\n${hits.join('\n')}\n`).toEqual([])
  })

  it('says none of them across a line break either', () => {
    // JSX wraps prose at the column, so "decide a Somali\n marriage" passes the
    // line scan. Read each file again with its comment lines out and its
    // whitespace folded, for the phrases that have a space in them.
    const multiword = BANNED.filter(([re]) => / /.test(re.source))
    const hits: string[] = []
    for (const { file, lines } of files()) {
      const skip = commentLines(lines)
      const text = lines
        .filter((line, i) => !skip.has(i) && !ALLOWED.some(([re]) => re.test(line)))
        .join(' ')
        .replace(/\s+/g, ' ')
      for (const [re, why] of multiword) {
        const m = text.match(re)
        if (m) hits.push(`${file}  ${why}\n      …${text.slice(Math.max(0, m.index! - 40), m.index! + 60)}…`)
      }
    }
    expect(hits, `\n${hits.length} files say something the voice does not, across a line break:\n\n${hits.join('\n')}\n`).toEqual([])
  })

  it('reads more than forty files, so an empty result means clean and not skipped', () => {
    expect(files().length).toBeGreaterThan(40)
  })
})
