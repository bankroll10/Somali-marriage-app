// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCAL_KEYS } from '../src/lib/forget'

/**
 * The money conversation sheet's own script (public/niyyah-money-conversation-sheet.js), on the real page.
 *
 * Two people each fill the sheet on their own device, as Person 1 and Person 2, and neither sees the
 * other's answers on the page. What this holds:
 *  - your answers are kept on this device under one key, put back on a reload, removed 14 days after the
 *    last change, by Clear my answers, or by the app's Forget me;
 *  - a yes/no that hides its section's questions hides them, and leaves them out of what is sent;
 *  - Finish makes a link (the answers after #, which no server sees) and a file, and an import reads
 *    either, strictly, keeps it only while the page is open, and never shows it;
 *  - the combined PDF waits until both have answers and you have finished yours;
 *  - nothing is sent anywhere.
 * Growing the boxes and the QR code need a real browser, and are checked there (docs/DECISIONS.md).
 */

const PAGE = readFileSync('public/niyyah-money-conversation-sheet.html', 'utf8')
const SCRIPT = readFileSync('public/niyyah-money-conversation-sheet.js', 'utf8')
const KEY = 'niyyah.moneysheet.v1'
const NOW = new Date('2026-10-27T10:00:00Z')
const DAY = 24 * 60 * 60 * 1000

const sent: string[] = []
let saved: { name: string } | null = null

/** The page as a browser would show it on arrival: markup, then the script. */
function open(hash = '') {
  ;(window as unknown as { happyDOM?: { setURL(url: string): void } }).happyDOM?.setURL(`https://joinniyyah.com/niyyah-money-conversation-sheet.html${hash}`)
  document.documentElement.innerHTML = PAGE.replace(/<script[\s\S]*?<\/script>/g, '')
  ;(0, eval)(SCRIPT)
}

const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector(sel) as unknown as T
const field = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement
/** Type the way a person does: the value changes, then the page hears about it. */
function type(id: string, value: string) {
  const el = field(id)
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
function choose(name: string, value: string) {
  const el = $<HTMLInputElement>(`input[name="${name}"][value="${value}"]`)
  el.checked = true
  el.dispatchEvent(new Event('change', { bubbles: true }))
}
const press = (sel: string) => $<HTMLButtonElement>(sel).click()
const text = (sel: string) => ($(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim()
const stored = () => JSON.parse(localStorage.getItem(KEY) ?? 'null')
const visible = (sel: string) => {
  let el: HTMLElement | null = $(sel)
  while (el) {
    if (el.hidden) return false
    el = el.parentElement
  }
  return true
}
const leave = () => {
  const e = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(e)
  return e.defaultPrevented
}
type Api = { mine(): { answers: Record<string, string> }; partner(): { name: string; date: string; answers: Record<string, string> } | null }
const api = () => (window as unknown as { NiyyahMoneySheet: Api }).NiyyahMoneySheet
/** Let the page finish what it started: compression and decompression run on promises. */
const settle = async () => {
  for (let i = 0; i < 50; i++) await new Promise((r) => process.nextTick(r))
}

function stubNetwork() {
  vi.stubGlobal('fetch', (...a: unknown[]) => {
    sent.push(`fetch ${String(a[0])}`)
    return Promise.reject(new Error('the sheet must not use the network'))
  })
}

/** Someone fills in some answers and taps Finish; returns the link they would send. */
async function finishAs(person: '1' | '2', name: string, fill: () => void) {
  open()
  choose('role', person)
  type('my-name', name)
  fill()
  vi.advanceTimersByTime(500)
  press('[data-finish]')
  await settle()
  const copied: string[] = []
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t: string) => (copied.push(t), Promise.resolve()) } })
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
  press('[data-copy-link]')
  await settle()
  return copied[0]
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  vi.setSystemTime(NOW)
  localStorage.clear()
  sent.length = 0
  saved = null
  stubNetwork()
  // happy-dom's streams do not settle; the deflated link is checked in Chromium (docs/DECISIONS.md).
  vi.stubGlobal('CompressionStream', undefined)
  vi.stubGlobal('DecompressionStream', undefined)
  URL.createObjectURL = () => 'blob:made-here'
  URL.revokeObjectURL = () => {}
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    saved = { name: this.download }
  })
  open()
})

afterEach(() => {
  expect(sent).toEqual([])
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('what the script may do', () => {
  const CODE = SCRIPT.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('touches the network not at all, builds no HTML from anyone’s answers, and is plain ASCII', () => {
    for (const forbidden of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'indexedDB', 'document.cookie', 'sessionStorage', 'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'eval(', 'new Function', 'import(']) {
      expect(CODE, forbidden).not.toContain(forbidden)
    }
    expect(CODE).not.toMatch(/https?:\/\//)
    expect(SCRIPT).toMatch(/^[\x00-\x7F]*$/)
  })

  it('keeps everything under the one key, and the app’s Forget me clears that key', () => {
    expect([...CODE.matchAll(/'(niyyah\.[a-z.]+v\d+)'/g)].map((m) => m[1])).toEqual([KEY])
    expect(LOCAL_KEYS).toContain(KEY)
  })
})

describe('who is filling it in', () => {
  it('waits for Person 1 or Person 2 before showing the questions, Finish or the partner’s block', () => {
    expect(visible('#s1-h')).toBe(false)
    expect(visible('#finish')).toBe(false)
    expect(visible('#partner')).toBe(false)
    expect(visible('#privacy')).toBe(true)
    expect(visible('[data-without-script]')).toBe(false)
    choose('role', '2')
    for (const sel of ['#s1-h', '#s4-h', '#finish', '#partner', '.jump']) expect(visible(sel), sel).toBe(true)
  })

  it('chooses nothing for anyone: no person and no yes or no is preselected', () => {
    expect([...document.querySelectorAll<HTMLInputElement>('input[type="radio"]')].filter((r) => r.checked)).toEqual([])
  })
})

describe('keeping your answers on this device', () => {
  it('saves what is typed, a moment later, with who you are and the day, never a time', () => {
    choose('role', '1')
    type('a-q1a', 'Gold and a sum of money.')
    vi.advanceTimersByTime(500)
    expect(stored()).toEqual({ v: 2, at: '2026-10-27', finished: '', fields: { role: '1', q1a: 'Gold and a sum of money.' } })
    expect(Object.keys(localStorage)).toEqual([KEY])
  })

  it('puts them back on a reload, with the questions showing, and says so', () => {
    choose('role', '1')
    choose('g3', 'yes')
    type('a-q3a', 'A car loan.')
    type('n-q1a', '5,000')
    vi.advanceTimersByTime(500)
    open()
    expect(visible('#s1-h')).toBe(true)
    expect(field('a-q3a').value).toBe('A car loan.')
    expect(field('n-q1a').value).toBe('5,000')
    expect($<HTMLInputElement>('input[name="g3"][value="yes"]').checked).toBe(true)
    expect(text('#privacy .restored')).toBe('We restored your answers on this device.')
  })

  it('are removed 14 days after the last change, and the page says so; a change restarts the 14 days', () => {
    choose('role', '1')
    type('a-q1a', 'Kept for a while')
    vi.advanceTimersByTime(500)
    vi.setSystemTime(new Date(NOW.getTime() + 14 * DAY))
    open()
    expect(field('a-q1a').value).toBe('Kept for a while')
    type('a-q1b', 'Added on day 14')
    vi.advanceTimersByTime(500)
    vi.setSystemTime(new Date(NOW.getTime() + 28 * DAY))
    open()
    expect(field('a-q1b').value).toBe('Added on day 14')
    vi.setSystemTime(new Date(NOW.getTime() + 30 * DAY))
    open()
    expect(field('a-q1a').value).toBe('')
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(text('#privacy .restored')).toBe('Answers saved on this device more than 14 days ago were removed.')
  })

  it('removes a record whose day cannot be read, and ignores one it does not recognise', () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 2, at: 'someday', fields: { role: '1', q1a: 'x' } }))
    open()
    expect(localStorage.getItem(KEY)).toBeNull()
    localStorage.setItem(KEY, JSON.stringify({ v: 9, at: '2026-10-27', fields: { q1a: 'from a future version' } }))
    open()
    expect(field('a-q1a').value).toBe('')
  })

  it('brings over what the earlier two-column sheet kept, for whichever person this turns out to be', () => {
    // The sheet of 2026-10-26 kept both people's answers on one page, as Person A and Person B.
    localStorage.setItem(KEY, JSON.stringify({ v: 1, at: '2026-10-26', fields: { 'name-a': 'Amina', 'name-b': 'Omar', 'sheet-date': '2026-11-02', 'q1a-a': 'Hers', 'q1a-b': 'His', 's1-agree': 'Shared box' } }))
    open()
    expect(field('a-q1a').value).toBe('')
    choose('role', '2')
    expect(field('a-q1a').value).toBe('His')
    expect(field('my-name').value).toBe('Omar')
    expect(field('sheet-date').value).toBe('2026-11-02')
    expect(text('#privacy .restored')).toContain('saved for Person B on the earlier version of this sheet')
    expect(stored().v).toBe(2)
    expect(JSON.stringify(stored())).not.toContain('Hers')
  })

  it('asks before leaving only when the browser would not keep the answers', () => {
    choose('role', '1')
    type('a-q1a', 'Saved')
    vi.advanceTimersByTime(500)
    expect(leave()).toBe(false)
    const full = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    type('a-q1a', 'Not kept')
    vi.advanceTimersByTime(500)
    expect(visible('#privacy .save-problem')).toBe(true)
    expect(leave()).toBe(true)
    full.mockRestore()
  })
})

describe('the yes or no questions', () => {
  it('a No on debts or on money to family hides the rest of that section, and a Yes brings it back', () => {
    choose('role', '1')
    choose('g3', 'no')
    expect(visible('#a-q3a')).toBe(false)
    expect(visible('#a-q4a')).toBe(true)
    choose('g3', 'yes')
    expect(visible('#a-q3a')).toBe(true)
    choose('g4', 'no')
    expect(visible('#a-q4e')).toBe(false)
  })

  it('a No on the mahr discussion hides nothing', () => {
    choose('role', '1')
    choose('g1', 'no')
    for (const id of ['a-q1a', 'n-q1a', 'a-q1e']) expect(visible(`#${id}`), id).toBe(true)
  })

  it('what a No hid is left out of what is sent, but kept on the device in case the answer changes back', () => {
    choose('role', '1')
    choose('g3', 'yes')
    type('a-q3a', 'A car loan.')
    choose('c-q3d', 'mine')
    choose('g3', 'no')
    vi.advanceTimersByTime(500)
    expect(api().mine().answers).toEqual({ g3: 'no' })
    expect(stored().fields['q3a']).toBe('A car loan.')
  })
})

describe('Finish and share', () => {
  it('asks for a person first, and for at least one answer', () => {
    press('[data-finish]')
    expect(text('.finish-status')).toBe('Choose Person 1 or Person 2 at the top first.')
    choose('role', '1')
    press('[data-finish]')
    expect(text('.finish-status')).toBe('There are no answers to send yet.')
  })

  it('makes a link to this page with the answers after the #, and remembers that you finished', async () => {
    const link = await finishAs('1', 'Amina', () => type('a-q1a', 'Gold.'))
    expect(link).toMatch(/^https:\/\/joinniyyah\.com\/niyyah-money-conversation-sheet\.html#a=1[zj]\.[A-Za-z0-9_-]+$/)
    expect(text('.finish-status')).toMatch(/^Done\. Send the link to your partner by text/)
    expect(stored().finished).toBe('2026-10-27')
  })

  it('says Copied on the button when the link is copied, then goes back to Copy the link', async () => {
    await finishAs('1', 'Amina', () => type('a-q1a', 'Gold.'))
    const button = $<HTMLButtonElement>('[data-copy-link]')
    expect(button.textContent).toBe('Copied')
    expect(button.classList.contains('is-copied')).toBe(true)
    expect(text('.share-status')).toBe('Copied. Paste the link into a message to your partner.')
    vi.advanceTimersByTime(2600)
    expect(button.textContent).toBe('Copy the link')
    expect(button.classList.contains('is-copied')).toBe(false)
  })

  it('shows the link to copy by hand where the browser cannot copy it', async () => {
    await finishAs('1', 'Amina', () => type('a-q1a', 'Gold.'))
    vi.advanceTimersByTime(2600)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    ;(document as unknown as { execCommand: () => boolean }).execCommand = () => false
    press('[data-copy-link]')
    expect($<HTMLTextAreaElement>('textarea.link-out').value).toMatch(/#a=1j\./)
    expect(text('.share-status')).toBe('Copy the link below and send it to your partner.')
    expect($('[data-copy-link]').textContent).toBe('Copy the link')
  })

  it('says the link is out of date when an answer changes after Finish', async () => {
    await finishAs('1', 'Amina', () => type('a-q1a', 'Gold.'))
    type('a-q1b', 'My mother.')
    expect(text('.finish-status')).toBe('You changed an answer after tapping Finish. Tap Finish again to send the new version.')
  })

  it('saves a small file named after you, holding your answers and who you are', async () => {
    await finishAs('1', 'Amina Yusuf', () => type('a-q1a', 'Gold.'))
    let blob: Blob | null = null
    URL.createObjectURL = (b: Blob) => ((blob = b), 'blob:x')
    press('[data-save-file]')
    expect(saved!.name).toBe('money-conversation-Amina-Yusuf-person1.json')
    const obj = JSON.parse(await blob!.text())
    expect(obj).toMatchObject({ format: 'niyyah-money-conversation', v: 1, person: 1, name: 'Amina Yusuf', answers: { q1a: 'Gold.' } })
  })
})

describe('your partner’s answers', () => {
  async function partnerLink() {
    return finishAs('2', 'Omar', () => {
      choose('g3', 'yes')
      type('a-q3a', 'A STUDENT LOAN, PRIVATE TO OMAR')
      type('n-q1a', '4800')
    })
  }

  it('are read from their link, kept only in memory, and never shown on the page', async () => {
    const link = await partnerLink()
    localStorage.clear()
    open()
    choose('role', '1')
    type('a-q1a', 'Gold.')
    vi.advanceTimersByTime(500)
    type('partner-code', link)
    press('[data-import]')
    await settle()
    expect(text('.import-status')).toMatch(/^Answers from Omar are ready\. They are kept only while this page is open\./)
    expect(document.body.textContent).not.toContain('STUDENT LOAN')
    vi.advanceTimersByTime(1000)
    expect(JSON.stringify(localStorage)).not.toContain('STUDENT LOAN')
    expect(JSON.stringify(localStorage)).not.toContain('Omar')
    // The box the link was pasted into is emptied, and was never one of the answers kept.
    expect(field('partner-code').value).toBe('')
    // A reload, and they are gone.
    open()
    expect(api().partner()).toBeNull()
  })

  it('arriving with the link, the page reads it, takes it out of the address bar, and says so', async () => {
    const link = await partnerLink()
    localStorage.clear()
    open(link.slice(link.indexOf('#')))
    await settle()
    expect(location.hash).toBe('')
    expect(visible('.arrived')).toBe(true)
    expect(text('.arrived')).toContain("Your partner's answers came with this link. They are not shown here.")
    expect(document.body.textContent).not.toContain('STUDENT LOAN')
    expect(api().partner()!.name).toBe('Omar')
  })

  it('wait for you to finish yours before the combined PDF can be made', async () => {
    const link = await partnerLink()
    localStorage.clear()
    open()
    choose('role', '1')
    type('partner-code', link)
    press('[data-import]')
    await settle()
    const button = $<HTMLButtonElement>('[data-pdf="combined"]')
    expect(button.disabled).toBe(true)
    expect(text('.import-status')).toContain('Fill in yours and tap Finish, then download your combined PDF.')
    type('a-q1a', 'Gold.')
    vi.advanceTimersByTime(500)
    press('[data-finish]')
    await settle()
    expect(button.disabled).toBe(false)
  })

  it('say so when you both chose the same number, and still work', async () => {
    const link = await partnerLink()
    localStorage.clear()
    open()
    choose('role', '2')
    type('partner-code', link)
    press('[data-import]')
    await settle()
    expect(text('.import-status')).toContain('You both chose Person 2.')
  })

  it('can come as a file', async () => {
    await partnerLink()
    let blob: Blob | null = null
    URL.createObjectURL = (b: Blob) => ((blob = b), 'blob:x')
    press('[data-save-file]')
    const fileText = await blob!.text()
    localStorage.clear()
    open()
    choose('role', '1')
    const input = field('partner-file') as HTMLInputElement
    Object.defineProperty(input, 'files', { configurable: true, value: [new File([fileText], 'money-conversation-Omar-person2.json', { type: 'application/json' })] })
    input.dispatchEvent(new Event('change'))
    vi.useRealTimers()
    await vi.waitFor(() => expect(text('.import-status')).toMatch(/^Answers from Omar are ready/))
  })

  it.each([
    ['a link to somewhere else', 'https://example.com/#b=1z.abc'],
    ['a broken code', 'https://joinniyyah.com/niyyah-money-conversation-sheet.html#a=1z.notdeflate'],
    ['plain text', 'hello'],
    ['a file from something else', JSON.stringify({ format: 'other', v: 1, person: 1, answers: {} })],
    ['a later version', JSON.stringify({ format: 'niyyah-money-conversation', v: 2, person: 1, answers: {} })],
    ['no person', JSON.stringify({ format: 'niyyah-money-conversation', v: 1, person: 3, answers: {} })],
  ])('are refused, plainly, when they are %s', async (_, input) => {
    choose('role', '1')
    type('partner-code', input)
    press('[data-import]')
    await settle()
    expect(text('.import-status')).toMatch(/^That does not look like a link from this sheet/)
    expect($<HTMLButtonElement>('[data-pdf="combined"]').disabled).toBe(true)
  })

  it('keep only the answers this sheet asks, as text of a sensible length', async () => {
    choose('role', '1')
    const crafted = { format: 'niyyah-money-conversation', v: 1, person: 2, name: ` ${'N'.repeat(100)} `, date: 'not a date', answers: { q1a: 'Fine', unknown: 'dropped', role: '1', q1b: 'x'.repeat(7000), q1c: 42 } }
    type('partner-code', JSON.stringify(crafted))
    press('[data-import]')
    await settle()
    const partner = api().partner()!
    expect(partner.answers).toEqual({ q1a: 'Fine' })
    expect(partner.name).toHaveLength(60)
    expect(partner.date).toBe('')
  })
})

describe('Clear my answers', () => {
  it('asks first, then removes your answers and your partner’s, and starts over at who you are', async () => {
    vi.stubGlobal('confirm', () => true)
    choose('role', '1')
    type('a-q1a', 'An answer')
    vi.advanceTimersByTime(500)
    type('partner-code', JSON.stringify({ format: 'niyyah-money-conversation', v: 1, person: 2, answers: { q1a: 'His' } }))
    press('[data-import]')
    await settle()
    expect(api().partner()).not.toBeNull()
    press('[data-clear-answers]')
    expect(field('a-q1a').value).toBe('')
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(text('#privacy .restored')).toBe('Your answers were cleared from this device.')
    expect(visible('#s1-h')).toBe(false)
    expect(api().partner()).toBeNull()
  })

  it('changes nothing if the person says no', () => {
    vi.stubGlobal('confirm', () => false)
    choose('role', '1')
    type('a-q1a', 'Keep this')
    vi.advanceTimersByTime(500)
    press('[data-clear-answers]')
    expect(field('a-q1a').value).toBe('Keep this')
  })
})
