import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * N3-so / N3-1page-so — the Somali translation of the money conversation
 * sheet, reviewed and approved by the founder (2026-09-20). This file pins
 * structural parity with the English sheets (tests/sheet.test.ts) rather
 * than re-checking Somali content rules — assessing whether a Somali
 * sentence is neutral, natural or accurate is a language judgment, and the
 * founder's own review is that judgment. What a regex over English keywords
 * cannot do is guard against, and what this file does guard: that no
 * script, storage, form or second link ever finds its way in; that the
 * structure (sections, questions, fields, labels) still matches the
 * English sheets exactly; and that the approved wording
 * (internal/translations/money-conversation-sheet.so.md) hasn't drifted.
 */

const HTML = readFileSync('public/niyyah-money-conversation-sheet-so.html', 'utf8')
const ONE_PAGE = readFileSync('public/niyyah-money-conversation-sheet-1page-so.html', 'utf8')
const TXT = readFileSync('public/niyyah-money-conversation-sheet-so.txt', 'utf8')
const REF = readFileSync('internal/translations/money-conversation-sheet.so.md', 'utf8')


describe('both files open from disk, with the network off', () => {
  for (const [name, doc] of [['four-page', HTML], ['one-page', ONE_PAGE]] as const) {
    it(`${name}: fetches nothing, saves nothing, no script`, () => {
      for (const forbidden of ['<script', '<iframe', '<img', '<link ', '@import', 'src=', 'localStorage', 'sessionStorage', '<form', 'action=', 'type="submit"']) {
        expect(doc, forbidden).not.toContain(forbidden)
      }
      const anchors = [...doc.matchAll(/<a\s[^>]*href="([^"]*)"/g)].map((m) => m[1])
      expect(anchors, name).toEqual(['https://joinniyyah.com/'])
      const urls = doc.match(/https?:\/\/[^\s"'<>)]+/g) ?? []
      expect(urls, name).toEqual(['https://joinniyyah.com/'])
    })

    it(`${name}: declares lang="so" and names Niyyah in its own <title>`, () => {
      expect(doc).toContain('<html lang="so">')
      const title = doc.match(/<title>([^<]*)<\/title>/)?.[1]
      expect(title, name).toContain('Niyyah')
    })
  }

  it('the .txt carries the one link and nothing else, same as the HTML twins', () => {
    expect(TXT.match(/https?:\/\/[^\s]+/g)).toEqual(['https://joinniyyah.com/'])
  })
})

describe('structure matches the English sheets exactly', () => {
  it('four-page: four sections, twenty questions, four two-box landings, one main/h1', () => {
    expect(HTML.match(/<section aria-labelledby="s\d-h">/g)).toHaveLength(4)
    expect(HTML.match(/<p class="q" id="q\d[a-e]">/g)).toHaveLength(20)
    expect(HTML.match(/<textarea id="q\d[a-e]-[ab]"/g)).toHaveLength(40)
    expect(HTML.match(/<textarea id="s\d-(agree|open)"/g)).toHaveLength(8)
    expect(HTML.match(/<main/g)).toHaveLength(1)
    expect(HTML.match(/<h1/g)).toHaveLength(1)
    // Each subject still starts its own printed page.
    expect(HTML.match(/<p class="print-footer">/g)).toHaveLength(4)
  })

  it('one-page: same twenty questions as single ruled lines, box textareas kept, one legend', () => {
    expect(ONE_PAGE.match(/<section aria-labelledby="s\d-h">/g)).toHaveLength(4)
    expect(ONE_PAGE.match(/<input id="q\d[a-e]-[ab]" type="text"/g)).toHaveLength(40)
    expect(ONE_PAGE).not.toMatch(/<textarea id="q\d/)
    expect(ONE_PAGE.match(/<textarea id="s\d-(agree|open)"/g)).toHaveLength(8)
    expect(ONE_PAGE.match(/class="legend"/g)).toHaveLength(1)
  })

  it('every field in both files is still labelled for real', () => {
    for (const [name, doc] of [['four-page', HTML], ['one-page', ONE_PAGE]] as const) {
      const fors = [...doc.matchAll(/<label for="([^"]+)"/g)].map((m) => m[1])
      const ids = new Set([...doc.matchAll(/<(?:textarea|input)[^>]*\sid="([^"]+)"/g)].map((m) => m[1]))
      expect(fors, name).toHaveLength(20 * 2 + 4 * 2 + 3)
      for (const f of fors) expect(ids, `${name}:${f}`).toContain(f)
    }
  })

  it('both keep every field at the 16px screen floor and print resize:none', () => {
    for (const [name, doc] of [['four-page', HTML], ['one-page', ONE_PAGE]] as const) {
      expect(doc.match(/font-size: 1rem; \/\* 16px floor/g)?.length, name).toBeGreaterThanOrEqual(2)
      const css = doc.match(/<style>([\s\S]*?)<\/style>/)![1]
      const print = css.slice(css.indexOf('@media print'))
      expect(print, name).toMatch(/textarea \{\s*resize: none;/)
      expect(print, name).toMatch(/textarea::-webkit-resizer \{\s*display: none;/)
    }
  })
})

describe('the wording matches the approved reference, not a re-drafted version', () => {
  // These are spot checks against internal/translations/…so.md, not a full
  // re-transcription — the point is to catch the wording drifting out from
  // under the approval, not to duplicate the whole table here.
  const approvedPairs: Array<[id: string, somali: string]> = [
    ['s1-h', '1. Meherka'],
    ['q3a-debt-direction', "lagugu leeyahay"],
    ['q1e-representation', 'magacaaga ku hadlaya'],
    ['s1-agree', 'Waxa aynu isku raacsan nahay'],
    ['s1-open', "Waxa aynaan weli go'aan ka gaarin"],
    ['footer-note', 'Xaashidan waxaa loogu talagalay wada hadal'],
  ]

  it('the approved reference itself contains each spot-checked phrase', () => {
    for (const [id, phrase] of approvedPairs) expect(REF, id).toContain(phrase)
  })

  it('both built files carry the same phrases the reference approved', () => {
    for (const [name, doc] of [['four-page', HTML], ['one-page', ONE_PAGE]] as const) {
      for (const [id, phrase] of approvedPairs) expect(doc, `${name}:${id}`).toContain(phrase)
    }
  })

  it('the debt-direction fix reaches every affected row, not just one', () => {
    // The one correction the review called most important: q3a and
    // s3-framing both had the direction backwards in the first draft.
    for (const doc of [HTML, ONE_PAGE]) {
      expect(doc).toContain('deymaha hadda lagugu leeyahay')
      expect(doc).toContain('weli lagu leeyahay')
    }
  })

  it('Qofka A / Qofka B replace every Person A / Person B, in both files', () => {
    for (const doc of [HTML, ONE_PAGE]) {
      expect(doc).not.toContain('Person A')
      expect(doc).not.toContain('Person B')
      expect(doc.match(/Qofka A/g)?.length).toBeGreaterThanOrEqual(20)
      expect(doc.match(/Qofka B/g)?.length).toBeGreaterThanOrEqual(20)
    }
  })
})

describe('printed length — measured elsewhere, pinned here', () => {
  // The real page-count and bottom-slack numbers come from headless-Chrome
  // PDF renders (docs/SHEET.md), not from vitest — jsdom has no print
  // layout engine. What's pinned here is that the print rules that made
  // those measurements true are still present in the source.
  it('four-page: each subject still starts its own printed page', () => {
    const css = HTML.match(/<style>([\s\S]*?)<\/style>/)![1]
    const print = css.slice(css.indexOf('@media print'))
    expect(print).toMatch(/section \+ section \{[^}]*break-before: page/)
  })

  it('one-page: still splits into two print columns, no page break between subjects', () => {
    const css = ONE_PAGE.match(/<style>([\s\S]*?)<\/style>/)![1]
    const print = css.slice(css.indexOf('@media print'))
    expect(print).not.toMatch(/break-before: page/)
    expect(print).toMatch(/\.content \{[\s\S]*?columns: 2/)
  })
})

describe('the catalog and the reference agree on where this lives', () => {
  const catalog = readFileSync('docs/ASSETS.md', 'utf8')

  it('N3-so and N3-1page-so both have rows with the real filenames', () => {
    const n3so = catalog.split('\n').find((l) => l.startsWith('| **N3-so**'))!
    expect(n3so).toContain('niyyah-money-conversation-sheet-so.html')
    const n3p1so = catalog.split('\n').find((l) => l.startsWith('| **N3-1page-so**'))!
    expect(n3p1so).toContain('niyyah-money-conversation-sheet-1page-so.html')
  })

  it('the catalog points to the same reference file this test reads', () => {
    expect(catalog).toContain('internal/translations/money-conversation-sheet.so.md')
  })
})
