// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The PDFs the money conversation sheet makes: one person's answers, and the combined one.
 *
 * The real page, its own script, the real jsPDF and the real generator are loaded; answers are typed in,
 * a partner's answers are added the way a person adds them, a button is pressed, and the PDF it hands
 * over is read back. What this holds:
 *  - every question is in the file, with each person's answers in full, across as many pages as they need;
 *  - the combined PDF opens with what to talk about: a different yes or no, a different choice, a Not sure
 *    yet or amounts far apart are marked Talk about this, the same choice or a near amount Likely agree,
 *    and nothing anyone wrote in their own words is marked;
 *  - a No that hides a section prints one line instead, and each section ends with lines for notes;
 *  - both people get the same file, named money-conversation-<Person 1>-<Person 2>-<date>.pdf;
 *  - nothing is sent while it is made.
 * The picture-of-the-page fallback for scripts the PDF's own fonts cannot draw (Arabic, say) needs a
 * real canvas, so it is exercised in a browser, not here (docs/DECISIONS.md).
 */

const PAGE = readFileSync('public/niyyah-money-conversation-sheet.html', 'utf8')
const PAGE_SCRIPT = readFileSync('public/niyyah-money-conversation-sheet.js', 'utf8')
const GENERATOR = readFileSync('public/niyyah-money-conversation-sheet-pdf.js', 'utf8')
const JSPDF = readFileSync('public/vendor/jspdf.umd.min.js', 'utf8')
const QR = readFileSync('public/vendor/qrcode.js', 'utf8')

const flat = (s: string) => s.replace(/\s+/g, ' ').trim()

/** How the PDF's own fonts store the punctuation a sheet is full of: Windows-1252 bytes, not Unicode. */
const WIN1252: Record<string, string> = { '‘': '\u0091', '’': '\u0092', '“': '\u0093', '”': '\u0094', '•': '\u0095', '–': '\u0096', '—': '\u0097', '…': '\u0085' }
const win1252 = (s: string) => s.replace(/[‘’“”•–—…]/g, (c) => WIN1252[c])

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

  it('carries both libraries’ licences with them', () => {
    expect(JSPDF.slice(0, 200)).toContain('@license')
    expect(readFileSync('public/vendor/jspdf-LICENSE.txt', 'utf8')).toContain('Permission is hereby granted')
    expect(QR.slice(0, 600)).toMatch(/Licensed under the MIT license/i)
    expect(readFileSync('public/vendor/qrcode-LICENSE.txt', 'utf8')).toContain('Permission is hereby granted')
  })
})

describe('the buttons', () => {
  const buttons = [...PAGE.matchAll(/<button([^>]*data-pdf-button[^>]*)>([^<]*)<\/button>/g)]

  it('are two: only my answers, under Finish, and the combined PDF, under your partner’s answers, which starts switched off', () => {
    expect(buttons.map((m) => m[2])).toEqual(['Download only my answers', 'Download our combined PDF'])
    for (const [, attrs] of buttons) expect(attrs).toContain('type="button"')
    expect(buttons[0][1]).toContain('data-pdf="mine"')
    expect(buttons[1][1]).toContain('data-pdf="combined"')
    expect(buttons[1][1]).toContain('disabled')
    expect(PAGE.indexOf('data-pdf="mine"')).toBeGreaterThan(PAGE.indexOf('id="finish"'))
    expect(PAGE.indexOf('data-pdf="combined"')).toBeGreaterThan(PAGE.indexOf('id="partner"'))
    expect(PAGE.match(/class="pdf-status" role="status" aria-live="polite"/g)).toHaveLength(2)
  })

  it('and every message either script can show use no dash', () => {
    const messages = [...`${GENERATOR}\n${PAGE_SCRIPT}`.matchAll(/'([A-Z][^'\n]* [^'\n]*)'|"([A-Z][^"\n]* [^"\n]*)"/g)].map((m) => m[1] ?? m[2])
    expect(messages.length).toBeGreaterThan(20)
    for (const text of messages) expect(text).not.toMatch(/\\u201[34]|[–—]|--/)
  })
})

// ── Running it ────────────────────────────────────────────────────────────────

/** The text strings drawn on each page, read back out of the PDF's own streams. */
function pdfText(bytes: Uint8Array): { pages: number; text: string; pageTexts: string[]; lows: number[]; rules: number } {
  const raw = Buffer.from(bytes).toString('latin1')
  const pages = (raw.match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length
  let text = ''
  const pageTexts: string[] = []
  // For each page's content stream, the lowest line of text above the footer, in PDF points from the bottom.
  const lows: number[] = []
  // Thin horizontal strokes: the lines left to write notes on.
  let rules = 0
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let body: string
    try {
      body = inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1')
    } catch {
      continue
    }
    if (!/Tj/.test(body)) continue
    const ys = [...body.matchAll(/([\d.]+) ([\d.]+) Td/g)].map((t) => Number(t[2])).filter((y) => y > 50)
    if (ys.length) lows.push(Math.min(...ys))
    rules += [...body.matchAll(/0\.5 w\n[\d.]+ ([\d.]+) m\n[\d.]+ \1 l\nS/g)].length
    let page = ''
    for (const s of body.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
      page += `${s[1].replace(/\\([()\\])/g, '$1').replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))}\n`
    }
    pageTexts.push(page)
    text += page
  }
  return { pages, text, pageTexts, lows, rules }
}

let made: Blob | null = null
let downloadName: string | null = null
const sent: string[] = []

/** The page as a browser shows it: markup, then the page script, jsPDF and the generator. */
function load() {
  document.documentElement.innerHTML = PAGE.replace(/<script[\s\S]*?<\/script>/g, '')
  ;(0, eval)(PAGE_SCRIPT)
  ;(0, eval)(JSPDF)
  ;(0, eval)(GENERATOR)
}

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as unknown as T
function write(id: string, value: string) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
function choose(name: string, value: string) {
  const el = $<HTMLInputElement>(`input[name="${name}"][value="${value}"]`)
  el.checked = true
  el.dispatchEvent(new Event('change', { bubbles: true }))
}
const settle = async () => {
  for (let i = 0; i < 50; i++) await new Promise((r) => process.nextTick(r))
}
const press = (which: 'mine' | 'combined') => $<HTMLButtonElement>(`[data-pdf="${which}"]`).click()
const status = (which: 'mine' | 'combined') => flat($(which === 'mine' ? '#finish .pdf-status' : '#partner .pdf-status').textContent ?? '')
const words = (stem: string, n: number) => Array.from({ length: n }, (_, i) => `${stem}${i + 1}`).join(' ')

/** Who you are, on this device. */
function me(person: '1' | '2', name = '', date = '') {
  choose('role', person)
  if (name) write('my-name', name)
  if (date) write('sheet-date', date)
}

/** Your partner's answers, added by pasting what they sent. */
async function partnerSent(person: 1 | 2, name: string, answers: Record<string, string>, date = '') {
  write('partner-code', JSON.stringify({ format: 'niyyah-money-conversation', v: 1, person, name, date, day: '2026-10-27', answers }))
  $<HTMLButtonElement>('[data-import]').click()
  await settle()
  expect(flat($('.import-status').textContent ?? '')).toMatch(/^Answers from /)
}

async function finish() {
  $<HTMLButtonElement>('[data-finish]').click()
  await settle()
  expect(flat($('.finish-status').textContent ?? '')).toMatch(/^Done\./)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  localStorage.clear()
  made = null
  downloadName = null
  sent.length = 0
  vi.stubGlobal('fetch', (...a: unknown[]) => {
    sent.push(`fetch ${String(a[0])}`)
    return Promise.reject(new Error('the sheet must not use the network'))
  })
  // happy-dom's streams do not settle; the deflated link is checked in Chromium (docs/DECISIONS.md).
  vi.stubGlobal('CompressionStream', undefined)
  vi.stubGlobal('DecompressionStream', undefined)
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
  expect(sent).toEqual([])
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

async function read() {
  expect(made).not.toBeNull()
  const b = new Uint8Array(await made!.arrayBuffer())
  expect(Buffer.from(b.subarray(0, 5)).toString()).toBe('%PDF-')
  return pdfText(b)
}

describe('only my answers', () => {
  it('downloads money-conversation.pdf when no name or date was given, made on this device', async () => {
    me('1')
    press('mine')
    expect(downloadName).toBe('money-conversation.pdf')
    expect(made!.type).toBe('application/pdf')
    await read()
    expect(status('mine')).toContain('Your PDF was made on this device')
  })

  it('holds all twenty questions and the yes or no questions, one column, no marks, and lines for notes after each section', async () => {
    me('1', 'Amina', '2026-11-02')
    choose('g1', 'yes')
    write('a-q1a', 'Gold and a sum of money.')
    press('mine')
    const { text, pages, lows, rules } = await read()
    const flatText = flat(text.replace(/\n/g, ' '))
    const questions = [...PAGE.matchAll(/<p class="q"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => flat(m[1]))
    expect(questions).toHaveLength(20)
    // Questions wrap, so each is read as the words it is made of, in order, across its lines.
    for (const q of questions) for (const word of q.split(' ')) expect(flatText, word).toContain(win1252(word))
    expect(flatText).toContain('Have the two of you discussed the mahr amount yet? Yes.')
    expect(flatText).toContain('Do you have any debts right now? Not answered.')
    expect(flatText).toContain('Gold and a sum of money.')
    for (const mark of ['Likely agree', 'Talk about this', 'Compare in session', 'What to talk about']) expect(text).not.toContain(mark)
    expect(text.match(/NOTES FROM THE SESSION/g)).toHaveLength(4)
    expect(rules).toBeGreaterThanOrEqual(4 * 5)
    // The subjects follow one another: every page but the last carries text into its lower half.
    expect(lows).toHaveLength(pages)
    for (const low of lows.slice(0, -1)) expect(low).toBeLessThan(792 / 2)
    expect(text).toContain('This sheet is for conversation.')
    expect(text).toContain('Amina')
    expect(text).toContain('November 2, 2026')
    expect(downloadName).toBe('money-conversation-Amina-2026-11-02.pdf')
    expect(text.match(/Niyyah, joinniyyah\.com/g)).toHaveLength(pages)
    for (let n = 1; n <= pages; n++) expect(text, `page ${n}`).toContain(`Page ${n} of ${pages}`)
  })

  it('prints one line for a section a No hid, and leaves out what had been typed there', async () => {
    me('1', 'Amina')
    choose('g3', 'yes')
    write('a-q3a', 'A CAR LOAN THAT WAS HIDDEN')
    choose('g3', 'no')
    press('mine')
    const { text } = await read()
    const flatText = flat(text.replace(/\n/g, ' '))
    expect(flatText).toContain('Do you have any debts right now? No. No debts.')
    expect(text).not.toContain('CAR LOAN')
    expect(text).not.toContain('Do you currently have any debts')
  })

  it.each([
    [{ 'my-name': '  Amina  Yusuf ' }, 'money-conversation-Amina-Yusuf.pdf'],
    // Accented Latin stays as typed. (A name in Arabic script is checked in a browser: it needs a canvas.)
    [{ 'my-name': 'Ladan Café' }, 'money-conversation-Ladan-Café.pdf'],
    [{ 'my-name': 'A'.repeat(80) }, `money-conversation-${'A'.repeat(40)}.pdf`],
    [{ 'my-name': '../../etc/a\\b:c*d' }, 'money-conversation-etc-a-b-c-d.pdf'],
    [{ 'sheet-date': '2026-10-31' }, 'money-conversation-2026-10-31.pdf'],
  ])('names the file from what was typed: %o', async (typed, name) => {
    me('1')
    for (const [id, value] of Object.entries(typed)) write(id, value as string)
    press('mine')
    expect(downloadName).toBe(name)
  })

  it('carries a long answer in full, in order, across pages, and a long single word too, and never loses the end', async () => {
    me('1')
    write('a-q1a', `First paragraph.\n\n${words('alpha', 260)} END-A`)
    write('a-q2d', `${words('beta', 700)} END-C`)
    write('a-q1b', `${'x'.repeat(400)} END-E`)
    write('a-q4d', `${words('open', 160)} END-G`)
    press('mine')
    const { text, pages } = await read()
    expect(pages).toBeGreaterThan(5)
    for (const [stem, n] of [['alpha', 260], ['beta', 700], ['open', 160]] as const) {
      const found = [...text.matchAll(new RegExp(`\\b${stem}(\\d+)\\b`, 'g'))].map((m) => Number(m[1]))
      expect(found, stem).toEqual(Array.from({ length: n }, (_, i) => i + 1))
    }
    for (const end of ['END-A', 'END-C', 'END-E', 'END-G']) expect(text, end).toContain(end)
    // The 400-letter word was wrapped to the column, every letter kept.
    expect([...text.matchAll(/\bx+\b/g)].map((m) => m[0].length).reduce((a, b) => a + b, 0)).toBe(400)
    expect(text).toContain('Question 4, continued')
  })

  it('does not leave a nearly empty page when an answer spills over: the next subject carries on there', async () => {
    me('1')
    write('a-q1e', `${words('spill', 300)} END-SPILL`)
    press('mine')
    const { text, pages, lows } = await read()
    expect(text).toContain('END-SPILL')
    expect(text).toContain('Question 5, continued')
    expect(lows).toHaveLength(pages)
    for (const low of lows.slice(0, -1)) expect(low, String(lows)).toBeLessThan(792 / 2)
  })

  it('never starts a page with a section’s notes, however long the last answer before them is', async () => {
    me('1')
    for (let n = 0; n <= 240; n += 12) {
      write('a-q2e', words('w', n))
      made = null
      press('mine')
      const { pageTexts } = await read()
      for (const [k, page] of pageTexts.entries()) expect(page, `${n} words, page ${k + 1}`).not.toMatch(/^The money conversation\n(?:[^\n]*\n)?NOTES FROM THE SESSION/)
    }
  })

  it('keeps line breaks the person typed, curly quotes, dashes and accents', async () => {
    me('1')
    choose('g3', 'yes')
    write('a-q3a', 'Line one\nLine two\n\n\nLine five café — “quoted” naïve')
    press('mine')
    const { text } = await read()
    expect(text).toContain('Line one')
    expect(text).toContain('Line two')
    expect(text).toContain('Line five café \u0097 \u0093quoted\u0094 naïve')
  })

  it('says so, and does not pretend, if the PDF maker did not load', () => {
    me('1')
    delete (window as { jspdf?: unknown }).jspdf
    press('mine')
    expect(made).toBeNull()
    expect(status('mine')).toContain('did not load')
    expect(status('mine')).toContain('Save as PDF')
  })
})

describe('the combined PDF', () => {
  // Amina is Person 1, Omar Person 2. They differ on four things: whether the mahr was discussed, when it
  // is given, whether there are debts and the wedding budget; they are near on the mahr amount and
  // agree on who pays, though each put it in their own words ("Me" and "My partner").
  const AMINA = { g1: 'yes', 'n-q1a': '5,000', 'c-q1c': 'part', q1a: 'Gold and a sum of money.', 'c-pay': 'me', 'n-q2d': '20000', g3: 'yes', q3a: 'A car loan.', 'c-q3d': 'mine', g4: 'no' }
  const OMAR = { g1: 'no', 'n-q1a': '4800', 'c-q1c': 'all-later', q1a: 'Gold and a sum of money.', 'c-pay': 'partner', 'n-q2d': '12000', g3: 'no', g4: 'no' }

  async function aminaWithOmar() {
    me('1', 'Amina', '2026-11-02')
    for (const [k, v] of Object.entries(AMINA)) {
      if (/^[gc]/.test(k)) choose(k, v)
      else write(k.startsWith('n-') ? k : `a-${k}`, v)
    }
    await finish()
    await partnerSent(2, 'Omar', OMAR)
  }

  it('is made only once you have finished yours and your partner’s answers are in', async () => {
    me('1', 'Amina')
    expect($<HTMLButtonElement>('[data-pdf="combined"]').disabled).toBe(true)
    // Pressed anyway, the generator still asks for the partner's answers first.
    $<HTMLButtonElement>('[data-pdf="combined"]').disabled = false
    press('combined')
    expect(made).toBeNull()
    expect(status('combined')).toBe("Add your partner's answers first.")
    await aminaWithOmar()
    expect($<HTMLButtonElement>('[data-pdf="combined"]').disabled).toBe(false)
    press('combined')
    await read()
    expect(status('combined')).toContain('Your PDF was made on this device')
  })

  it('opens with what to talk about, then what you likely agree on, then what to read together', async () => {
    await aminaWithOmar()
    press('combined')
    const { pageTexts } = await read()
    const first = flat(pageTexts[0])
    expect(first).toContain('What to talk about')
    expect(first).toMatch(/PERSON 1 Amina PERSON 2 Omar/)
    const talk = first.indexOf('Talk about this (4)')
    const agree = first.indexOf('Likely agree (2)')
    const compare = first.indexOf('Compare in session')
    expect(talk).toBeGreaterThan(0)
    expect(agree).toBeGreaterThan(talk)
    expect(compare).toBeGreaterThan(agree)
    const talkPart = first.slice(talk, agree)
    for (const line of [
      '1. Mahr amount discussed: Amina: Yes. Omar: No.',
      '1. Mahr at the nikah or deferred: Amina:',
      '2. Most to spend on the wedding: Amina: 20000. Omar: 12000.',
      '3. Has debts: Amina: Yes. Omar: No.',
    ]) expect(talkPart, line).toContain(line)
    const agreePart = first.slice(agree, compare)
    expect(agreePart).toContain('1. Mahr amount: Amina: 5,000. Omar: 4800.')
    expect(agreePart).toContain('2. Who pays for most of the wedding: Amina: Me (Amina). Omar: My partner (Amina).')
    // Both said No to sending money to family: nothing to flag.
    expect(first).not.toContain('Sends money to family')
    // Free text is never guessed at, even word for word the same: it is counted, not marked.
    expect(first).toContain('1. Mahr: 1 question with written answers')
    expect(first).toMatch(/3\. Debt either of you already carries: 1 question with written answers/)
    // A section with questions to answer and none written in says so plainly; one both closed with a No, that.
    expect(first).toMatch(/2\. The wedding [^:]*: no written answers/)
    expect(first).toContain('4. Ongoing obligations to family: both answered No')
    expect(first).not.toContain('nothing written')
    expect(first).toContain('How the marks are made')
  })

  it('puts the answers side by side, marks each, and prints one line, not a column of blanks, for whoever said No', async () => {
    await aminaWithOmar()
    press('combined')
    const { text, pageTexts } = await read()
    const rest = flat(pageTexts.slice(1).join(' '))
    expect(rest).toContain('Have the two of you discussed the mahr amount yet? Amina: Yes. Omar: No. Talk about this')
    expect(rest).toMatch(/Amina Omar Chose: Part at the nikah/)
    expect(rest).toContain('Amount: 5,000 Amount: 4800')
    expect(rest).toContain(
      'Do you have any debts right now? Amina: Yes. Omar: No. Talk about this Omar: No debts. Only Amina answered the questions below. 1. What do you owe right now',
    )
    expect(rest).toContain('A car loan.')
    // What Amina left blank there is listed once, without a column of "Not answered" for anyone.
    const debt = rest.slice(rest.indexOf('Do you have any debts right now?'), rest.indexOf('4. Ongoing obligations to family'))
    expect(debt).not.toContain('Not answered')
    // (The list may carry over a page, under the running header, so it is read in order rather than as one run.)
    const listed = debt.slice(debt.indexOf('Amina left these blank:'))
    expect(listed.indexOf('2. What are you paying toward it each month')).toBeGreaterThan(0)
    expect(listed.indexOf('3. Who already knows about it')).toBeGreaterThan(listed.indexOf('2. What are you paying'))
    expect(listed.indexOf('5. Is there anything here')).toBeGreaterThan(listed.indexOf('3. Who already knows'))
    expect(listed).not.toContain('1. What do you owe')
    expect(debt).toMatch(/Chose: Stays mine to pay/)
    expect(rest).toContain('Do you send money to family regularly? Amina: No. Omar: No. Amina: Does not send money to family. Omar: Does not send money to family.')
    // Section 4 had no questions to show, so it goes straight to its notes.
    expect(rest).toMatch(/Omar: Does not send money to family\. NOTES FROM THE SESSION/)
    expect(text.match(/NOTES FROM THE SESSION/g)).toHaveLength(4)
    // A question nobody touched gets no mark at all.
    expect(rest).toMatch(/Who have you said that to so far[^?]*\? Amina Omar Not answered Not answered/)
  })

  it('says so in one line when the one who said Yes answered none of the questions after it', async () => {
    me('1', 'Amina')
    choose('g3', 'yes')
    write('a-q1a', 'Gold.')
    await finish()
    await partnerSent(2, 'Omar', { g3: 'no', q1a: 'Money.' })
    press('combined')
    const { pageTexts } = await read()
    const rest = flat(pageTexts.slice(1).join(' '))
    const debt = rest.slice(rest.indexOf('Do you have any debts right now?'), rest.indexOf('4. Ongoing obligations to family'))
    expect(debt).toMatch(/^Do you have any debts right now\? Amina: Yes\. Omar: No\. Talk about this Omar: No debts\. Amina answered Yes and left these questions blank: 1\. What do you owe/)
    expect(debt).not.toContain('Only Amina answered')
    expect(debt).not.toContain('Not answered')
  })

  it('never starts a page with a section’s notes: they stay with the end of their section', async () => {
    // These answers once left the notes of the wedding and of debt alone at the top of the next page.
    me('1', 'Amina', '2026-11-02')
    for (const [k, v] of Object.entries({ ...AMINA, q1a: 'Gold and a sum of money, agreed with my family.', q1c: 'Half at the nikah.', q3a: 'A car loan, about two years left.' })) {
      if (/^[gc]/.test(k)) choose(k, v)
      else write(k.startsWith('n-') ? k : `a-${k}`, v)
    }
    await finish()
    await partnerSent(2, 'Omar', { ...OMAR, q1a: 'Money, the amount is for the families to agree.', g4: 'yes', q4a: 'My mother, every month.', 'c-q4e': 'same' })
    press('combined')
    const { pageTexts } = await read()
    expect(pageTexts.join('').match(/NOTES FROM THE SESSION/g)).toHaveLength(4)
    for (const [n, page] of pageTexts.entries()) expect(page, `page ${n + 1}`).not.toMatch(/^The money conversation\n(?:[^\n]*\n)?NOTES FROM THE SESSION/)
  })

  it('is the same file, with the same name, from either phone: Person 1 is always on the left', async () => {
    await aminaWithOmar()
    press('combined')
    const fromAmina = (await read()).text
    const nameOnAmina = downloadName

    localStorage.clear()
    made = null
    load()
    me('2', 'Omar')
    for (const [k, v] of Object.entries(OMAR)) {
      if (/^[gc]/.test(k)) choose(k, v)
      else write(k.startsWith('n-') ? k : `a-${k}`, v)
    }
    await finish()
    await partnerSent(1, 'Amina', Object.fromEntries(Object.entries(AMINA)), '2026-11-02')
    press('combined')
    const fromOmar = (await read()).text
    expect(downloadName).toBe(nameOnAmina)
    expect(downloadName).toBe('money-conversation-Amina-Omar-2026-11-02.pdf')
    expect(fromOmar).toBe(fromAmina)
  })

  it('calls you Person 1 and Person 2 when no names were given, and copes with two people choosing the same number', async () => {
    me('2')
    write('a-q1a', 'Mine.')
    await finish()
    await partnerSent(2, '', { q1a: 'Theirs.' })
    press('combined')
    const { pageTexts } = await read()
    expect(flat(pageTexts[0])).toMatch(/PERSON 1 Person 1 PERSON 2 Person 2/)
    expect(downloadName).toBe('money-conversation.pdf')
  })

  it('names the file from both names, cleaned the same way', async () => {
    me('1', '  Amina  Yusuf ')
    write('a-q1a', 'x')
    await finish()
    await partnerSent(2, "O'Brien / Omar", { q1a: 'y' })
    press('combined')
    expect(downloadName).toBe('money-conversation-Amina-Yusuf-O-Brien-Omar.pdf')
  })
})
