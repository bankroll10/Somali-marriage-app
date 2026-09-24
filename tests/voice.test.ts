import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BANNED } from './voice-rules'

/**
 * The voice, held as a list of things it does not say (docs/DESIGN.md).
 *
 * Every phrase here was live in the product on 2026-09-20, most of them
 * dozens of times. They fall into five habits: the verbal tic ("actually" —
 * sixty occurrences), announcing sincerity ("genuinely", "on purpose"),
 * therapy vocabulary outside the one voice allowed it, startup nouns
 * ("founding cohort", "platform"), and the phrase docs/PROTOCOL.md ("Exaggerated") names
 * as its example of an exaggerated cultural claim. A word that earns its
 * place goes on the allowlist with a reason; nothing else does.
 *
 * Scanned line by line, comments skipped. The same scan holds the promises
 * the code cannot keep, which had their own copy of it until 2026-09-24.
 */

const ROOT = join(import.meta.dirname, '..', 'src')
const DIRS = ['components', 'data', 'lib']


/**
 * Authority the product has not earned, said to a member (docs/PRODUCT.md).
 * No introduction has been made and nothing here has been measured against
 * an outcome, so no screen predicts, ranks a difference as light, or quotes
 * a statistic about other couples. Copy only: the guide may say that nobody
 * can predict a marriage, and its grader should not flag that.
 */
const OVERCLAIMS: [RegExp, string][] = [
  [/\bpredicts?\b/i, 'a prediction nothing here has measured'],
  [/carry the most weight/i, 'ranks one difference above another'],
  [/most couples never/i, 'a statistic about other couples we do not have'],
  [/rarer than you would think/i, 'a statistic we do not have'],
  [/Grounded and ready/, 'a verdict of "ready"'],
  [/We’ll look for someone|will find you someone/i, 'an introduction nobody makes'],
  // docs/RESEARCH.md, the evidence ledger (decision 20). A frequency nobody
  // counted (L9, L10), a date on a future (L12), similarity as the outcome
  // (L13), the eleven as what breaks marriages (L5).
  [/\bmost (of (us|our|this)|people|couples|parents|first-year)\b/i, 'a count we do not have (L9, L10)'],
  [/\bmany (of us|people|couples)\b/i, 'a count we do not have (L9, L10)'],
  [/\bmore common than\b|\bmost common\b|\bthe rarest\b|\bname most\b/i, 'a count we do not have (L10)'],
  [/\brarer than\b|\brarely (have|talked|admit)\b/i, 'a count we do not have (L10)'],
  [/\bended the most\b|\bthan any other answer\b/i, 'a count we do not have (L10)'],
  [/\byear (two|three|ten)\b/i, 'a date on a future nobody can see (L12)'],
  [/keeps you married|strongest marriages/i, 'similarity as the outcome, against the evidence (L13)'],
  [/marriages? (break|breaks) on\b/i, 'the eleven as what breaks marriages: class F (L5)'],
]

/**
 * Promises the code cannot keep. Until 2026-09-17 four screens said "the day
 * someone fits your map, we write to you" with no matching and no outbound
 * channel anywhere, and the sample introduction promised photos and a guided
 * conversation, both refused permanently (docs/PRODUCT.md §6). Every one was
 * warm, well written and false. A screen says what exists.
 */
const PROMISES: [RegExp, string][] = [
  [/photos? (are|is|will be|get) shown/i, 'photos — declined permanently'],
  [/conversation opens/i, 'messaging — off-platform, on purpose'],
  [/\bwe (will |can )?write to\b/i, 'no outbound channel exists'],
  [/\byou (will )?hear from us\b/i, 'no outbound channel exists'],
  [/\bwhen your city opens\b/i, 'nothing decides who meets whom'],
  [/\btell you when your (city|pool) opens\b/i, 'no outbound channel exists'],
  [/\band blocking\b|report-and-block/i, 'there is no blocking of any kind here'],
  [/powered by ai/i, 'the model adds a sentence; it is never the reason'],
]

const RULES = [...BANNED, ...OVERCLAIMS, ...PROMISES]

/** Lines that keep a banned word, each with the reason it earns its place. */
const ALLOWED: [RegExp, string][] = [
  [/Actually, it’s something else/, 'a button in the person’s own voice, correcting us'],
  [/navigator\.platform|process\.platform/, 'code, not copy'],
  [/^\s*\/\\b\(/, 'a routing regex reads what she typed; it is not something we say'],
  // Man-only lines wait for ten men (decision 4); each is ledgered with its
  // rewrite in docs/RESEARCH.md ("Deferred, by name").
  [/the answer that comes back in year two/, 'decision 4: a man-only variant, deferred (L12)'],
  [/the one that becomes a fight in year two — and the same is true of hers/, 'decision 4: a man-only variant, deferred (L12)'],
  [/Asked for their part, most parents give it/, 'decision 4: a man-only script, deferred (L9)'],
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
        for (const [re, why] of RULES) {
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
    const multiword = RULES.filter(([re]) => / /.test(re.source))
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
