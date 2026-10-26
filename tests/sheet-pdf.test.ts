// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The Download PDF button on the money conversation sheet.
 *
 * The real page, the real generator script and the real jsPDF are loaded, a person's answers are typed
 * in, the button is pressed, and the PDF it hands over is read back. What this holds:
 *  - every question and both people's answers are in the file, in full, across as many pages as they need;
 *  - the names, the date and the footer are in it, and the file is money-conversation-<NameA>-<NameB>-<date>.pdf;
 *  - the subjects follow one another with no page left nearly empty, and an empty closing box is ruled to write on;
 *  - nothing is sent and nothing is stored while it is made.
 * The picture-of-the-page fallback for scripts the PDF's own fonts cannot draw (Arabic, say) needs a
 * real canvas, so it is exercised in a browser, not here (docs/ASSETS.md).
 */

const PAGE = readFileSync('public/niyyah-money-conversation-sheet.html', 'utf8')
const GENERATOR = readFileSync('public/niyyah-money-conversation-sheet-pdf.js', 'utf8')
const JSPDF = readFileSync('public/vendor/jspdf.umd.min.js', 'utf8')

const flat = (s: string) => s.replace(/\s+/g, ' ').trim()

/** How the PDF's own fonts store the punctuation a sheet is full of: Windows-1252 bytes, not Unicode. */
const WIN1252: Record<string, string> = { '\u2018': '\u0091', '\u2019': '\u0092', '\u201C': '\u0093', '\u201D': '\u0094', '\u2022': '\u0095', '\u2013': '\u0096', '\u2014': '\u0097', '\u2026': '\u0085' }
const win1252 = (s: string) => s.replace(/[\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u2026]/g, (c) => WIN1252[c])

describe('what the generator is allowed to do', () => {
  const CODE = GENERATOR.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('calls no network and no storage, and builds no HTML from what a person typed', () => {
    for (const forbidden of [
      'fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie',
      'BroadcastChannel', 'serviceWorker', 'import(', 'eval(', 'new Function', 'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'location.',
    ]) {
      expect(CODE, forbidden).not.toContain(forbidden)
    }
    expect(CODE).not.toMatch(/https?:\/\//)
  })

  it('is plain ASCII, with every other character written as an escape, so nothing invisible can hide in it', () => {
    expect(GENERATOR).toMatch(/^[\x00-\x7F]*$/)
  })

  it('names the file from money-conversation and signs every page Niyyah, joinniyyah.com', () => {
    expect(CODE).toContain("var FILE_STEM = 'money-conversation'")
    expect(CODE).toContain("'Niyyah, joinniyyah.com'")
  })

  it('carries the library’s licence with it', () => {
    expect(JSPDF.slice(0, 200)).toContain('@license')
    expect(readFileSync('public/vendor/jspdf-LICENSE.txt', 'utf8')).toContain('Permission is hereby granted')
  })
})

describe('the buttons', () => {
  const buttons = [...PAGE.matchAll(/<button[^>]*data-pdf-button[^>]*>([^<]*)<\/button>/g)]

  it('are two, both labelled Download PDF, one near the top and one at the bottom, never printed', () => {
    expect(buttons.map((m) => m[1])).toEqual(['Download PDF', 'Download PDF'])
    for (const [tag] of buttons) expect(tag).toContain('type="button"')
    const at = (i: number) => PAGE.indexOf('data-pdf-button', i)
    const first = at(0)
    const second = at(first + 1)
    expect(first).toBeLessThan(PAGE.indexOf('<!-- 1 -->'))
    expect(second).toBeGreaterThan(PAGE.indexOf('<!-- 4 -->'))
    expect(second).toBeLessThan(PAGE.indexOf('<footer>'))
    // Each sits in a block that is hidden until the script runs and is screen-only.
    expect([...PAGE.matchAll(/<div class="pdf-actions screen-only" hidden>/g)]).toHaveLength(2)
    expect(PAGE.match(/class="pdf-status" role="status" aria-live="polite"/g)).toHaveLength(2)
  })

  it('use no dash in any new words', () => {
    // Every block of words this work added to the page, and every message either script can show.
    const blocks = [
      /<div class="privacy screen-only"[\s\S]*?<\/div>/,
      /<aside class="howto[\s\S]*?<\/aside>/,
      /<nav class="jump[\s\S]*?<\/nav>/,
      /Names and the date are optional[\s\S]*?<\/p>/,
      /Also: <a[\s\S]*?<\/p>/,
    ].map((re) => PAGE.match(re)![0].replace(/<[^>]+>/g, ' '))
    const actions = [...PAGE.matchAll(/class="pdf-actions[\s\S]*?<\/div>/g)].map((m) => m[0].replace(/<[^>]+>/g, ' '))
    expect(actions).toHaveLength(2)
    const sections = PAGE.match(/Section \d of 4/g) ?? []
    expect(sections).toHaveLength(4)
    const PAGE_SCRIPT = readFileSync('public/niyyah-money-conversation-sheet.js', 'utf8')
    const messages = [...`${GENERATOR}\n${PAGE_SCRIPT}`.matchAll(/(?:say\((?:status, )?|confirm\()'([^']*)'/g)].map((m) => m[1])
    expect(messages.length).toBeGreaterThan(5)
    for (const text of [...blocks, ...actions, ...sections, ...messages]) expect(text).not.toMatch(/[\u2013\u2014]|--/)
  })
})

// ── Running it ────────────────────────────────────────────────────────────────

/** The text strings drawn on each page, read back out of the PDF's own streams. */
function pdfText(bytes: Uint8Array): { pages: number; text: string; lows: number[]; rules: number } {
  const raw = Buffer.from(bytes).toString('latin1')
  const pages = (raw.match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length
  let text = ''
  // For each page's content stream, the lowest line of text above the footer, in PDF points from the bottom.
  const lows: number[] = []
  // Thin horizontal strokes: the lines left to write on in an empty closing box.
  let rules = 0
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let body: string
    try {
      body = inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1')
    } catch {
      continue
    }
    const ys = [...body.matchAll(/([\d.]+) ([\d.]+) Td/g)].map((t) => Number(t[2])).filter((y) => y > 50)
    if (ys.length) lows.push(Math.min(...ys))
    rules += [...body.matchAll(/0\.5 w\n[\d.]+ ([\d.]+) m\n[\d.]+ \1 l\nS/g)].length
    for (const s of body.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
      text += `${s[1].replace(/\\([()\\])/g, '$1').replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))}\n`
    }
  }
  return { pages, text, lows, rules }
}

let made: Blob | null = null
let downloadName: string | null = null
const touched: string[] = []

function load() {
  document.documentElement.innerHTML = PAGE.replace(/<script[\s\S]*?<\/script>/g, '')
  ;(0, eval)(JSPDF)
  ;(0, eval)(GENERATOR)
}

const write = (id: string, value: string) => {
  ;(document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement).value = value
}
const press = (which: 'first' | 'last' = 'first') => {
  const all = document.querySelectorAll<HTMLButtonElement>('[data-pdf-button]')
  ;(which === 'first' ? all[0] : all[all.length - 1]).click()
}
const words = (stem: string, n: number) => Array.from({ length: n }, (_, i) => `${stem}${i + 1}`).join(' ')

beforeEach(() => {
  made = null
  downloadName = null
  touched.length = 0
  vi.stubGlobal('fetch', (...a: unknown[]) => {
    touched.push(`fetch ${String(a[0])}`)
    return Promise.reject(new Error('the sheet must not use the network'))
  })
  for (const m of ['getItem', 'setItem', 'removeItem', 'clear', 'key'] as const) {
    vi.spyOn(Storage.prototype, m).mockImplementation(() => {
      touched.push(`Storage.${m}`)
      return null as never
    })
  }
  URL.createObjectURL = (b: Blob) => {
    made = b
    return 'blob:made-in-the-page'
  }
  URL.revokeObjectURL = () => {}
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloadName = this.download
  })
  load()
})

afterEach(() => {
  expect(touched).toEqual([])
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function bytes() {
  expect(made).not.toBeNull()
  return new Uint8Array(await made!.arrayBuffer())
}

describe('pressing Download PDF', () => {
  it('shows the buttons only once the script has run, and downloads money-conversation.pdf when no name or date was given', async () => {
    for (const block of document.querySelectorAll('.pdf-actions')) expect((block as HTMLElement).hidden).toBe(false)
    press()
    expect(downloadName).toBe('money-conversation.pdf')
    const b = await bytes()
    expect(Buffer.from(b.subarray(0, 5)).toString()).toBe('%PDF-')
    expect(made!.type).toBe('application/pdf')
    expect(document.querySelector('.pdf-status')!.textContent).toContain('Your PDF was made on this device')
  })

  it('works from the button at the bottom as well, and is the same file', async () => {
    press('last')
    expect(downloadName).toBe('money-conversation.pdf')
    expect(Buffer.from((await bytes()).subarray(0, 5)).toString()).toBe('%PDF-')
    expect(document.querySelectorAll('.pdf-status')[1].textContent).toContain('Your PDF was made on this device')
  })

  it('holds all twenty questions, says “Not answered” where a column is empty, and leaves empty closing boxes ruled to write on', async () => {
    press()
    const { text, pages, lows, rules } = pdfText(await bytes())
    const questions = [...PAGE.matchAll(/<p class="q"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => flat(m[1]))
    expect(questions).toHaveLength(20)
    for (const q of questions) {
      // Questions wrap, so each is read as the words it is made of, in order, across its lines.
      const flatText = flat(text.replace(/\n/g, ' '))
      for (const word of q.split(' ')) expect(flatText, word).toContain(win1252(word))
    }
    // Two columns for each of the twenty questions. The closing boxes say nothing: they are ruled.
    expect(text.match(/Not answered/g)).toHaveLength(20 * 2)
    expect(rules).toBeGreaterThanOrEqual(4 * 2 * 4) // four subjects, two boxes, about four lines each
    // The subjects follow one another: every page but the last carries text into its lower half.
    expect(pages).toBeLessThanOrEqual(4)
    expect(lows).toHaveLength(pages)
    for (const low of lows.slice(0, -1)) expect(low).toBeLessThan(792 / 2)
    for (const heading of ['1. Mahr', '4. Ongoing obligations to family']) expect(text).toContain(heading)
    expect(text).toContain('What we agree on')
    expect(text).toContain('This sheet is for conversation.')
  })

  it('puts the names and the session date in the header, and Niyyah, joinniyyah.com and the page number on every page', async () => {
    write('name-a', 'Amina')
    write('name-b', 'Omar')
    write('sheet-date', '2026-10-31')
    press()
    const { text, pages } = pdfText(await bytes())
    expect(text).toContain('Amina')
    expect(text).toContain('Omar')
    expect(text).toContain('October 31, 2026')
    // The columns carry the names, as on the page, not Person A and Person B.
    const lines = text.split('\n')
    expect(lines.filter((l) => l === 'Amina').length).toBeGreaterThanOrEqual(20)
    expect(lines.filter((l) => l === 'Omar').length).toBeGreaterThanOrEqual(20)
    expect(lines).not.toContain('Person A')
    expect(downloadName).toBe('money-conversation-Amina-Omar-2026-10-31.pdf')
    expect(text.match(/Niyyah, joinniyyah\.com/g)).toHaveLength(pages)
    for (let n = 1; n <= pages; n++) expect(text, `page ${n}`).toContain(`Page ${n} of ${pages}`)
  })

  it('leaves the header out when no name or date was given, rather than printing blanks', async () => {
    press()
    const { text } = pdfText(await bytes())
    expect(text).not.toContain('SESSION DATE')
    expect(text).not.toContain('PERSON A')
  })

  it.each([
    [{ 'sheet-date': '2026-10-31' }, 'money-conversation-2026-10-31.pdf'],
    [{ 'name-a': 'Amina' }, 'money-conversation-Amina.pdf'],
    [{ 'name-a': '  Amina  Yusuf ', 'name-b': "O'Brien / Omar" }, 'money-conversation-Amina-Yusuf-O-Brien-Omar.pdf'],
    // Accented Latin stays as typed. (A name in Arabic script is checked in a browser: it needs a canvas.)
    [{ 'name-a': 'Ladan Café', 'name-b': 'Çelik' }, 'money-conversation-Ladan-Café-Çelik.pdf'],
    [{ 'name-a': 'A'.repeat(80) }, `money-conversation-${'A'.repeat(40)}.pdf`],
    [{ 'name-a': '../../etc', 'name-b': 'a\\b:c*d' }, 'money-conversation-etc-a-b-c-d.pdf'],
  ])('names the file from what was typed: %o', async (typed, name) => {
    for (const [id, value] of Object.entries(typed)) write(id, value as string)
    press()
    expect(downloadName).toBe(name)
  })

  it('carries a long answer in full, in order, across pages, and a long single word too, and never loses the end', async () => {
    const long = `${words('alpha', 260)} END-A`
    write('q1a-a', `First paragraph.\n\n${long}`)
    write('q1a-b', 'A short one. END-B')
    write('q2d-a', `${words('beta', 700)} END-C`)
    write('q2d-b', `${words('gamma', 120)} END-D`)
    write('q1b-a', `${'x'.repeat(400)} END-E`)
    write('s1-agree', `${words('agree', 90)} END-F`)
    write('s4-open', `${words('open', 160)} END-G`)
    press()
    const { text, pages } = pdfText(await bytes())
    // More pages than the blank sheet needs: the answers carried over rather than being cut.
    expect(pages).toBeGreaterThan(6)
    for (const [stem, n] of [['alpha', 260], ['beta', 700], ['gamma', 120], ['agree', 90], ['open', 160]] as const) {
      const found = [...text.matchAll(new RegExp(`\\b${stem}(\\d+)\\b`, 'g'))].map((m) => Number(m[1]))
      expect(found, stem).toEqual(Array.from({ length: n }, (_, i) => i + 1))
    }
    for (const end of ['END-A', 'END-B', 'END-C', 'END-D', 'END-E', 'END-F', 'END-G']) expect(text, end).toContain(end)
    // The 400-letter word was wrapped to the column, every letter kept.
    expect([...text.matchAll(/\bx+\b/g)].map((m) => m[0].length).reduce((a, b) => a + b, 0)).toBe(400)
    // The first answer filled its page and ran on; the fourth question of the second subject did too.
    expect(text).toContain('Question 1, continued')
    expect(text).toContain('Question 4, continued')
  })

  it('does not leave a nearly empty page when an answer spills over: the next subject carries on there', async () => {
    // The last answer of the first subject runs onto a new page. One page a subject would have left that
    // page holding a few lines and nothing else; now the wedding starts on it.
    write('q1e-a', `${words('spill', 140)} END-SPILL`)
    press()
    const { text, pages, lows } = pdfText(await bytes())
    expect(text).toContain('END-SPILL')
    expect(text).toContain('Question 5, continued')
    expect(lows).toHaveLength(pages)
    for (const low of lows.slice(0, -1)) expect(low, String(lows)).toBeLessThan(792 / 2)
  })

  it('keeps line breaks the person typed, curly quotes, dashes and accents', async () => {
    write('q3a-a', 'Line one\nLine two\n\n\nLine five café — “quoted” naïve')
    press()
    const { text } = pdfText(await bytes())
    expect(text).toContain('Line one')
    expect(text).toContain('Line two')
    expect(text).toContain('Line five café \u0097 \u0093quoted\u0094 naïve')
  })

  it('says so, and does not pretend, if the PDF maker did not load', () => {
    delete (window as { jspdf?: unknown }).jspdf
    press()
    expect(made).toBeNull()
    expect(document.querySelector('.pdf-status')!.textContent).toContain('did not load')
    expect(document.querySelector('.pdf-status')!.textContent).toContain('Save as PDF')
  })
})
