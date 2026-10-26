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
 *  - the name, the date and the footer are in it, the file is called niyyah-money-conversation.pdf;
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

  it('is called niyyah-money-conversation.pdf and signs every page Niyyah, joinniyyah.com', () => {
    expect(CODE).toContain("'niyyah-money-conversation.pdf'")
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
    const copy = [...PAGE.matchAll(/class="pdf-actions[\s\S]*?<\/div>/g)].map((m) => m[0].replace(/<[^>]+>/g, ' ')).join(' ')
    const notes = flat(PAGE).match(/Nothing on this page is saved or sent[^<]*?own device\.|To keep what you type[^<]*?by hand\.|Names and a session date are optional[^<]*?PDF\./g) ?? []
    expect(notes).toHaveLength(3)
    for (const text of [copy, ...notes, ...(GENERATOR.match(/say\(status, '[^']*'/g) ?? [])]) expect(text).not.toMatch(/[–—]|--/)
  })
})

// ── Running it ────────────────────────────────────────────────────────────────

/** The text strings drawn on each page, read back out of the PDF's own streams. */
function pdfText(bytes: Uint8Array): { pages: number; text: string } {
  const raw = Buffer.from(bytes).toString('latin1')
  const pages = (raw.match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length
  let text = ''
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let body: string
    try {
      body = inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1')
    } catch {
      continue
    }
    for (const s of body.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
      text += `${s[1].replace(/\\([()\\])/g, '$1').replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))}\n`
    }
  }
  return { pages, text }
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
  it('shows the buttons only once the script has run, and downloads a PDF called niyyah-money-conversation.pdf', async () => {
    for (const block of document.querySelectorAll('.pdf-actions')) expect((block as HTMLElement).hidden).toBe(false)
    press()
    expect(downloadName).toBe('niyyah-money-conversation.pdf')
    const b = await bytes()
    expect(Buffer.from(b.subarray(0, 5)).toString()).toBe('%PDF-')
    expect(made!.type).toBe('application/pdf')
    expect(document.querySelector('.pdf-status')!.textContent).toContain('Your PDF was made on this device')
  })

  it('works from the button at the bottom as well, and is the same file', async () => {
    press('last')
    expect(downloadName).toBe('niyyah-money-conversation.pdf')
    expect(Buffer.from((await bytes()).subarray(0, 5)).toString()).toBe('%PDF-')
    expect(document.querySelectorAll('.pdf-status')[1].textContent).toContain('Your PDF was made on this device')
  })

  it('holds all twenty questions, and says “Not answered” where a column is empty, on a blank sheet', async () => {
    press()
    const { text, pages } = pdfText(await bytes())
    const questions = [...PAGE.matchAll(/<p class="q"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => flat(m[1]))
    expect(questions).toHaveLength(20)
    for (const q of questions) {
      // Questions wrap, so each is read as the words it is made of, in order, across its lines.
      const flatText = flat(text.replace(/\n/g, ' '))
      for (const word of q.split(' ')) expect(flatText, word).toContain(win1252(word))
    }
    // Two columns for each of the twenty questions, and the two closing boxes of each of the four subjects.
    expect(text.match(/Not answered/g)).toHaveLength(20 * 2 + 4 * 2)
    expect(pages).toBeGreaterThanOrEqual(4)
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
    expect(text).toContain('Person A · Amina'.replace('·', '\\267') === '' ? '' : 'Person A')
    expect(text.match(/Niyyah, joinniyyah\.com/g)).toHaveLength(pages)
    for (let n = 1; n <= pages; n++) expect(text, `page ${n}`).toContain(`Page ${n} of ${pages}`)
  })

  it('leaves the header out when no name or date was given, rather than printing blanks', async () => {
    press()
    const { text } = pdfText(await bytes())
    expect(text).not.toContain('SESSION DATE')
    expect(text).not.toContain('PERSON A')
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
