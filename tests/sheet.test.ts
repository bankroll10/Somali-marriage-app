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
const ONE_PAGE = readFileSync('public/niyyah-money-conversation-sheet-1page.html', 'utf8')
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

  it('warns, on screen only, that a printed copy can clip a long typed answer', () => {
    // No script is allowed to auto-grow a textarea for print, so the honest
    // fix is telling the reader, not pretending the box will always be
    // enough. Print never shows it — .screen-only is display:none there —
    // because by then it's too late to matter.
    expect(HTML).toContain('Print this and write on it')
    expect(HTML).toContain('long answers may')
    expect(HTML).toMatch(/screen-only[\s\S]*?\{\s*display: none;/)
  })

  it('points, in plain text, to the one-page twin — without adding a second link', () => {
    expect(HTML).toContain('niyyah-money-conversation-sheet-1page.html')
    // Named, not linked: still exactly one <a> on the page.
    expect([...HTML.matchAll(/<a\s[^>]*href=/g)]).toHaveLength(1)
  })
})

describe('it says what it is, on its own', () => {
  it('carries "Niyyah" in its own <title>, so a printed or shared page identifies itself', () => {
    const title = HTML.match(/<title>([^<]*)<\/title>/)?.[1]
    expect(title).toContain('Niyyah')
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
    // <title> (1), the footer's "Published by Niyyah" (1), one print-footer
    // per section (4, so the name is on every printed page — see 'on paper'
    // below), and the .txt footer (1).
    expect(BOTH.match(/Niyyah/g)).toHaveLength(7)
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

  it('opens with the same lede in both, "numbers" not "involved"', () => {
    // The founder's own correction: the families are involved either way —
    // what this sheet is for is having the numbers settled before they are.
    const lede = "A sheet for two adults considering marriage, to work through before the families discuss numbers. Each of you answers in your own column."
    expect(flat(HTML)).toContain(lede)
    expect(flat(TXT)).toContain(lede)
    expect(flat(HTML)).not.toContain('families are involved')
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

  it('draws no resize handle — a diagonal mark in the corner with nothing to grab on paper', () => {
    expect(PRINT).toMatch(/textarea \{\s*resize: none;/)
    expect(PRINT).toMatch(/textarea::-webkit-resizer \{\s*display: none;/)
  })

  it('carries the name on every printed page, not only the last one', () => {
    // Chrome (every engine, in fact) ignores @page margin-box content, so a
    // running footer has to be a real element repeated in the flow — one per
    // section, since each section is a page here. Plain text, not a link:
    // the sheet's one clickable <a> stays the one in the real footer.
    const footers = [...HTML.matchAll(/<p class="print-footer">([\s\S]*?)<\/p>/g)].map((m) => flat(m[1]))
    expect(footers).toHaveLength(4)
    for (const f of footers) {
      expect(f).toContain('Niyyah — joinniyyah.com')
      expect(f).toContain('v1.0 — 2026-09-20')
    }
    expect(PRINT).toMatch(/\.print-footer \{\s*display: block/)
    expect(CSS).toMatch(/^\s*\.print-footer \{\s*display: none;/m)
    // No extra <a>: repeating the name four times must not repeat the link.
    expect([...HTML.matchAll(/<a\s[^>]*href=/g)]).toHaveLength(1)
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

describe('the one-page variant', () => {
  // Same twenty questions, same four subjects, same content rules — a
  // second file rather than a mode of the first, because the print CSS
  // that makes it one page (single ruled lines, two print columns) is a
  // different document, not a toggle. Every content rule above is pinned
  // against the four-page file only; the checks here are the ones that
  // would actually differ if this file drifted from that one.
  const O_QUESTIONS = [...ONE_PAGE.matchAll(/<p class="q"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => flat(m[1]))
  const O_CSS = ONE_PAGE.match(/<style>([\s\S]*?)<\/style>/)![1]
  const O_PRINT = O_CSS.slice(O_CSS.indexOf('@media print'))

  it('fetches nothing and saves nothing, the same as the four-page file', () => {
    for (const forbidden of ['<script', '<iframe', '<img', '<link ', '@import', 'src=', 'localStorage', 'sessionStorage', '<form', 'action=', 'type="submit"']) {
      expect(ONE_PAGE, forbidden).not.toContain(forbidden)
    }
    const anchors = [...ONE_PAGE.matchAll(/<a\s[^>]*href="([^"]*)"/g)].map((m) => m[1])
    expect(anchors).toEqual(['https://joinniyyah.com/'])
  })

  it('carries "Niyyah" in its own <title>', () => {
    const title = ONE_PAGE.match(/<title>([^<]*)<\/title>/)?.[1]
    expect(title).toContain('Niyyah')
  })

  it('asks the same twenty questions, word for word, as the four-page file', () => {
    expect(O_QUESTIONS).toHaveLength(20)
    expect(O_QUESTIONS).toEqual(QUESTIONS)
  })

  it('gives every question a single ruled line per person, not a paragraph box', () => {
    // The one real content-level difference from the full sheet: a
    // <textarea> becomes an <input>. The agree/still-deciding boxes stay
    // textareas, per the founder's brief ("keep the agree/still-deciding
    // boxes").
    expect([...ONE_PAGE.matchAll(/<div class="cols">[\s\S]*?<\/div>\s*<\/div>/g)]).toHaveLength(20)
    expect(ONE_PAGE.match(/<input id="q\d[a-e]-[ab]" type="text"/g)).toHaveLength(40)
    expect(ONE_PAGE).not.toMatch(/<textarea id="q\d/)
    expect(ONE_PAGE.match(/<textarea id="s\d-(agree|open)"/g)).toHaveLength(8)
  })

  it('still labels every field for real, even with the visible label hidden', () => {
    const fors = [...ONE_PAGE.matchAll(/<label for="([^"]+)"/g)].map((m) => m[1])
    const ids = new Set([...ONE_PAGE.matchAll(/<(?:textarea|input)[^>]*\sid="([^"]+)"/g)].map((m) => m[1]))
    expect(fors).toHaveLength(20 * 2 + 4 * 2 + 3)
    for (const f of fors) expect(ids, f).toContain(f)
    // Visually hidden via clip-to-1px, not display:none — the standard
    // sr-only technique, so a screen reader still reads it.
    const colsLabelRule = O_CSS.match(/\.cols label \{[\s\S]*?\}/)![0]
    expect(colsLabelRule).toContain('clip: rect(0, 0, 0, 0)')
    expect(colsLabelRule).not.toContain('display: none')
  })

  it('says the column order once instead of twenty times, and prints small', () => {
    // "First/second" described a stacked, single-column reading order; on
    // paper the two columns sit side by side, so the legend says left/right
    // instead — what the founder actually sees on the printed page.
    expect(ONE_PAGE).toContain('Each question below: Person A on the left, Person B on the right.')
    expect(ONE_PAGE).not.toContain('line first')
    expect(ONE_PAGE.match(/class="legend"/g)).toHaveLength(1)
  })

  it('gives the agree/still-deciding boxes labels short enough to stay on one line', () => {
    // "What we agree on" / "What we're still deciding" (the four-page
    // file's labels) wrapped the second one to two lines in this file's
    // narrower print column, which dropped its rule below the first one.
    // Shortened labels keep both on one line and both rules aligned —
    // verified in Chromium: both labels render at the same height and both
    // textareas' top edge lands at the same y (docs/SHEET.md).
    for (const n of [1, 2, 3, 4]) {
      expect(ONE_PAGE).toContain(`<label for="s${n}-agree">Agreed</label>`)
      expect(ONE_PAGE).toContain(`<label for="s${n}-open">Still deciding</label>`)
    }
    expect(ONE_PAGE).not.toContain('What we agree on')
    expect(ONE_PAGE).not.toContain('still deciding</label>')
  })

  it('splits into two print columns instead of one page per subject', () => {
    // The one page/four page split itself: no break-before here, and a
    // real multi-column layout instead.
    expect(O_PRINT).not.toMatch(/break-before: page/)
    expect(O_PRINT).toMatch(/\.content \{[\s\S]*?columns: 2/)
  })

  it('keeps every print field at the 9pt floor the founder set for this variant', () => {
    expect(O_PRINT).toMatch(/font-size: 9pt; \/\* the floor this variant was asked to keep \*\//)
    // The bug this guards: a screen-only rule with higher specificity
    // (`.cols input[type='text']`) silently overrode the print min-height
    // once, because 1.9rem recomputes against print's 9pt root instead of
    // being ignored outside its own media query. Any print min-height on an
    // answer input has to be re-stated at equal-or-greater specificity
    // inside @media print, not just on the bare element selector. The exact
    // height has grown since (docs/SHEET.md — measured bottom slack, not a
    // round number); what this guards is the override existing at all.
    expect(O_PRINT).toMatch(/\.cols input\[type='text'\] \{\s*min-height: 5\.9mm/)
  })

  it('spends the printed page’s bottom slack on taller write-in lines', () => {
    // 3mm/4mm (the first cut, purely for one-page-ness) was too short to
    // write on. Grown until Letter's measured bottom slack — the printed
    // page height minus everything actually on it — came down to ~5mm,
    // verified by rendering, not by reading these numbers back out of the
    // CSS (docs/SHEET.md has the measurement).
    expect(O_PRINT).toMatch(/min-height: 5\.9mm;\s*height: 5\.9mm;/)
    expect(O_PRINT).toMatch(/\.box textarea \{[^}]*min-height: 6\.9mm/)
  })

  it('draws no resize handle in print, the same guard as the four-page file', () => {
    expect(O_PRINT).toMatch(/textarea \{\s*resize: none;/)
    expect(O_PRINT).toMatch(/textarea::-webkit-resizer \{\s*display: none;/)
  })

  it('carries the same footer, note and version line as the four-page file', () => {
    const text = flat(ONE_PAGE)
    expect(text).toContain('Published by Niyyah —')
    expect(text).toContain('This sheet is for conversation. It is not religious or legal advice, and it is not a substitute for guidance from someone you trust.')
    expect(text).toContain('v1.0 — 2026-09-20')
  })

  it('warns on screen that this version is short lines, and points to the other file', () => {
    expect(ONE_PAGE).toContain('every answer is a single line')
    expect(ONE_PAGE).toContain('use the four-page version instead')
  })

  it('still drops to one column below 700px, with no field under the 16px floor', () => {
    expect(O_CSS).toContain('@media (max-width: 700px)')
    expect(O_CSS.match(/font-size: 1rem; \/\* 16px floor/g)?.length).toBeGreaterThanOrEqual(2)
  })
})

describe('the catalog knows both files', () => {
  // docs/ASSETS.md's own rule: an address not in the table as live and
  // checked is not an address to put in a pitch. N3 sat there as proposed
  // for three days; shipping it without moving the row is how a
  // placeholder URL goes out.
  it('carries N3 with the real path and a status that is not proposed', () => {
    const row = CATALOG.split('\n').find((l) => l.startsWith('| **N3**') && !l.startsWith('| **N3-1page**'))!
    expect(row).toContain('niyyah-money-conversation-sheet.html')
    expect(row).not.toContain('niyyah-money-conversation-sheet-1page.html')
    expect(row).not.toContain('proposed')
  })

  it('carries N3-1page as its own row, not folded into N3’s', () => {
    const row = CATALOG.split('\n').find((l) => l.startsWith('| **N3-1page**'))!
    expect(row).toContain('niyyah-money-conversation-sheet-1page.html')
    expect(row).not.toContain('proposed')
  })
})
