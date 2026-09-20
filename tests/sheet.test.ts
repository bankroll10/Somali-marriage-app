import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * N3 — the money conversation sheet.
 *
 * A printable handed to a couple by someone who will never meet us, opened
 * from an attachment with the network off. Every rule it ships under is a
 * rule someone could quietly break later: a font pulled from a CDN, a helpful
 * "typical mahr" range, a second link that looks like a Niyyah page and is
 * not. So each one is pinned here rather than kept in a brief.
 *
 * docs/ASSETS.md carries the row; docs/SHEET.md carries the reasoning.
 */

const HTML = readFileSync('public/niyyah-money-conversation-sheet.html', 'utf8')
const TXT = readFileSync('public/niyyah-money-conversation-sheet.txt', 'utf8')
const CATALOG = readFileSync('docs/ASSETS.md', 'utf8')

const flat = (s: string) => s.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()

const QUESTIONS = [...HTML.matchAll(/<p class="q"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => flat(m[1]))
const CSS = HTML.match(/<style>([\s\S]*?)<\/style>/)![1]

describe('it opens from disk, with the network off', () => {
  it('fetches nothing: no script, no external font, stylesheet, image or frame', () => {
    for (const forbidden of ['<script', '<iframe', '<img', '<link ', '@import', 'src=', 'srcset', 'url(', 'integrity=', 'crossorigin']) {
      expect(HTML, forbidden).not.toContain(forbidden)
    }
  })

  it('carries exactly one link, and it is the one address we own', () => {
    const anchors = [...HTML.matchAll(/<a\s[^>]*href="([^"]*)"/g)].map((m) => m[1])
    expect(anchors).toEqual(['https://joinniyyah.com/'])
    // No second URL hiding in a comment, a meta tag or the CSS either.
    const urls = HTML.match(/https?:\/\/[^\s"'<>)]+/g) ?? []
    expect(urls).toEqual(['https://joinniyyah.com/'])
    expect(TXT.match(/https?:\/\/[^\s]+/g)).toEqual(['https://joinniyyah.com/'])
  })

  it('saves nothing and sends nothing — there is no form to submit', () => {
    for (const forbidden of ['localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'XMLHttpRequest', 'navigator.send', '<form', 'action=', 'method=', 'type="submit"', 'formaction', 'onsubmit', 'onchange', 'oninput']) {
      expect(HTML, forbidden).not.toContain(forbidden)
    }
    expect(HTML).toContain('Nothing on this page is saved or sent')
  })
})

describe('the four subjects stay four subjects', () => {
  const HEADINGS = [...HTML.matchAll(/<h2 id="s\d-h">([^<]*)<\/h2>/g)].map((m) => flat(m[1]))

  it('is four sections, numbered, in the order the sheet promises', () => {
    expect(HEADINGS).toEqual([
      '1. Mahr',
      '2. The wedding — one-time expenses',
      '3. Debt either of you already carries',
      '4. Ongoing obligations to family',
    ])
  })

  it('gives each one a single framing sentence, no advice attached', () => {
    const framings = [...HTML.matchAll(/<p class="framing">([\s\S]*?)<\/p>/g)].map((m) => flat(m[1]))
    expect(framings).toHaveLength(4)
    for (const f of framings) {
      expect(f.match(/[.?]/g) ?? [], f).toHaveLength(f.startsWith('This section is about the one-time') ? 2 : 1)
      expect(f).toMatch(/^This section is about/)
    }
  })

  it('asks five open questions per section, twenty in all', () => {
    expect([...HTML.matchAll(/<ol class="qs">[\s\S]*?<\/ol>/g)].map((m) => (m[0].match(/<li>/g) ?? []).length)).toEqual([5, 5, 5, 5])
    expect(QUESTIONS).toHaveLength(20)
    // A question, never an instruction. Four of them add a clarifier after
    // the question mark ("Write your own ceiling, not a guess") — the ask is
    // still the question; what is banned is a line that only tells.
    for (const q of QUESTIONS) expect(q, q).toContain('?')
    for (const q of QUESTIONS) expect(q, q).toMatch(/^(What|Who|Which|How|If|Is|After|Of)\b/)
  })

  it('closes each section with the two-box landing, and nothing scored', () => {
    const boxes = [...HTML.matchAll(/<div class="box">[\s\S]*?<\/div>\s*<\/div>/g)]
    expect(boxes).toHaveLength(4)
    for (const [box] of boxes.map((m) => [m[0]])) {
      expect(box).toContain('>What we agree on<')
      expect(box).toContain('>What we’re still deciding<')
    }
    for (const scored of ['score', 'Score', 'total out of', 'points', 'result']) {
      expect(HTML, scored).not.toContain(scored)
    }
  })
})

describe('what it refuses to say', () => {
  const PROSE = flat(HTML.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' '))
  const BOTH = `${PROSE} ${flat(TXT)}`

  it('gives no ruling and cites no source', () => {
    for (const word of ['fiqh', 'madhhab', 'hadith', 'ayah', 'ayat', 'Quran', "Qur'an", 'Sunnah', 'scholar', 'sheikh', 'imam', 'halal', 'haram', 'sharia', 'permissible', 'obligatory', 'correct amount']) {
      expect(BOTH.toLowerCase(), word).not.toContain(word.toLowerCase())
    }
  })

  it('names no figure, range, average or benchmark', () => {
    expect(BOTH).not.toMatch(/[$€£]/)
    // Any sum. The version line's date is the one run of digits on either
    // page, and it is not a figure about money.
    expect(BOTH.replace(/v1\.0 — 2026-09-20/g, '')).not.toMatch(/\b\d[\d,]{2,}\b/)
    for (const word of ['average', 'typical', 'median', 'benchmark', 'most couples', 'many couples', 'research', 'studies show', 'divorce rate', 'statistics']) {
      expect(BOTH.toLowerCase(), word).not.toContain(word.toLowerCase())
    }
  })

  it('tells the reader nothing to decide — no advice, no reassurance, no hype', () => {
    for (const word of ['you should', 'we recommend', 'make sure you', 'it is important to', 'the best way', 'experts', 'don’t worry', "don't worry", 'journey', 'empower', 'unlock']) {
      expect(BOTH.toLowerCase(), word).not.toContain(word.toLowerCase())
    }
  })

  it('names no organisation but Niyyah, and quotes nobody', () => {
    expect(BOTH.match(/Niyyah/g)).toHaveLength(2) // one in the HTML footer, one in the txt
    expect(BOTH).not.toMatch(/&quot;|“|”/)
  })

  it('uses only the terms the reader already uses, and explains no culture to them', () => {
    // mahr, nikah, walima and nothing else in Somali or Arabic; no lang= switch,
    // because there is no second language on the page to switch into.
    expect(HTML).not.toContain('lang="so"')
    expect(BOTH).not.toMatch(/\bSomali\b|\bin our culture\b|\btraditionally\b|\bin the community\b/i)
    for (const term of ['mahr', 'nikah', 'walima']) expect(BOTH.toLowerCase()).toContain(term)
  })
})

describe('the two versions ask the same twenty questions', () => {
  it('carries every HTML question in the pasteable text, word for word', () => {
    const txt = flat(TXT)
    for (const q of QUESTIONS) expect(txt, q).toContain(q)
  })

  it('carries the same footer, note and version line in both', () => {
    for (const [name, text] of [['html', flat(HTML)], ['txt', flat(TXT)]] as const) {
      expect(text, name).toContain('Published by Niyyah —')
      expect(text, name).toContain('This sheet is for conversation. It is not religious or legal advice, and it is not a substitute for guidance from someone you trust.')
      expect(text, name).toContain('v1.0 — 2026-09-20')
    }
  })
})

describe('on paper', () => {
  const PRINT = CSS.slice(CSS.indexOf('@media print'))

  it('starts each subject on its own page — the separation is the point', () => {
    expect(PRINT).toMatch(/section \+ section \{[^}]*break-before: page/)
    expect(PRINT).toMatch(/page-break-before: always/)
    expect(CSS).toMatch(/ol\.qs > li \{[\s\S]*?break-inside: avoid/)
  })

  it('fits US Letter and A4 both, by declaring no paper size at all', () => {
    expect(PRINT).toContain('@page')
    expect(PRINT).not.toMatch(/@page\s*\{[^}]*size:/)
  })

  it('prints black on white with lines to write on, not fills to soak up toner', () => {
    expect(PRINT).toMatch(/background: #fff/)
    expect(PRINT).toMatch(/color: #000/)
    expect(PRINT).toMatch(/background: transparent/)
    expect(PRINT).toMatch(/min-height: 11\.5mm/)
    expect(PRINT).toMatch(/\.box textarea \{[^}]*min-height: 15mm/)
  })
})

describe('on a phone, and to a screen reader', () => {
  it('drops to one column below 700px, and nothing scrolls sideways', () => {
    expect(CSS).toContain('@media (max-width: 700px)')
    expect(CSS).toMatch(/@media \(max-width: 700px\) \{[\s\S]*?\.cols,\s*\.box \{\s*display: block/)
    expect(CSS).toContain('min-width: 0')
  })

  it('keeps every field at the 16px floor that stops iOS zooming on focus', () => {
    // docs/MOBILE.md's rule, carried onto a page that shares none of its CSS.
    expect(CSS.match(/font-size: 1rem; \/\* 16px floor/g)).toHaveLength(2)
  })

  it('labels every field for real, with no orphaned for= and no bare column', () => {
    const fors = [...HTML.matchAll(/<label for="([^"]+)"/g)].map((m) => m[1])
    const ids = new Set([...HTML.matchAll(/<(?:textarea|input)[^>]*\sid="([^"]+)"/g)].map((m) => m[1]))
    expect(fors).toHaveLength(20 * 2 + 4 * 2 + 3) // questions, agree boxes, the two names and the date
    for (const f of fors) expect(ids, f).toContain(f)
    expect(new Set(fors).size).toBe(fors.length)
  })

  it('labels the two columns without naming a gender or a role', () => {
    expect(HTML.match(/>Person A</g)).toHaveLength(20 + 1) // one per question, plus the name field
    expect(HTML.match(/>Person B</g)).toHaveLength(20 + 1)
    for (const word of ['husband', 'wife', 'groom', 'bride', 'his ', 'her ', 'he ', 'she ']) {
      expect(flat(HTML).toLowerCase(), word).not.toContain(` ${word.trim()} `)
    }
  })

  it('is one main, four labelled sections and a visible focus ring', () => {
    expect(HTML.match(/<main/g)).toHaveLength(1)
    expect(HTML.match(/<h1/g)).toHaveLength(1)
    expect(HTML.match(/<section aria-labelledby="s\d-h">/g)).toHaveLength(4)
    expect(CSS).toContain(':focus-visible')
    expect(HTML).toContain('<html lang="en">')
  })
})

describe('the catalog knows it', () => {
  // docs/ASSETS.md's own rule: an address not in the table as live and checked
  // is not an address to put in a pitch. N3 sat there as proposed for three
  // days; shipping it without moving the row is how a placeholder URL goes out.
  it('carries N3 with the real path and a status that is not proposed', () => {
    const row = CATALOG.split('\n').find((l) => l.startsWith('| **N3**'))!
    expect(row).toContain('niyyah-money-conversation-sheet.html')
    expect(row).not.toContain('proposed')
  })
})
