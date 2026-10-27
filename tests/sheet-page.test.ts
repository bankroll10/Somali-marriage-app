// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCAL_KEYS } from '../src/lib/forget'

/**
 * The money conversation sheet's own script (public/niyyah-money-conversation-sheet.js), on the real page.
 *
 * What it promises the people filling it in, and what this holds:
 *  - what they type is kept in this browser, on this device, under one key, and put back on a reload,
 *    with a note that says so;
 *  - "Clear my answers" removes it from the page and from the device, and so does the app's Forget me;
 *  - on its own it goes 14 days after the last change, and the page says so;
 *  - leaving asks first only if the browser would not keep the answers;
 *  - the two names go on the columns in place of Person A and Person B;
 *  - nothing is sent anywhere.
 * Growing the boxes needs real layout, so that is checked in a browser (docs/DECISIONS.md).
 */

const PAGE = readFileSync('public/niyyah-money-conversation-sheet.html', 'utf8')
const SCRIPT = readFileSync('public/niyyah-money-conversation-sheet.js', 'utf8')
const KEY = 'niyyah.moneysheet.v1'

const sent: string[] = []

/** The page as a browser would show it on arrival: markup, then the script. */
function open() {
  document.documentElement.innerHTML = PAGE.replace(/<script[\s\S]*?<\/script>/g, '')
  ;(0, eval)(SCRIPT)
}

const field = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement
/** Type the way a person does: the value changes, then the page hears about it. */
function type(id: string, value: string) {
  const el = field(id)
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
const restoredNote = () => document.querySelector('#privacy .restored')!.textContent ?? ''
const problemNote = () => document.querySelector('#privacy .save-problem') as HTMLElement
const columnLabel = (forId: string) => document.querySelector(`label[for="${forId}"]`)!.textContent
const saved = () => JSON.parse(localStorage.getItem(KEY) ?? 'null')
const leave = () => {
  const e = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(e)
  return e.defaultPrevented
}

const NOW = new Date('2026-10-27T10:00:00Z')
const DAY = 24 * 60 * 60 * 1000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  localStorage.clear()
  sent.length = 0
  vi.stubGlobal('fetch', (...a: unknown[]) => {
    sent.push(`fetch ${String(a[0])}`)
    return Promise.reject(new Error('the sheet must not use the network'))
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

  it('touches the network not at all, builds no HTML, and is plain ASCII', () => {
    for (const forbidden of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'indexedDB', 'document.cookie', 'sessionStorage', 'innerHTML', 'outerHTML', 'insertAdjacentHTML', 'eval(', 'new Function', 'import(']) {
      expect(CODE, forbidden).not.toContain(forbidden)
    }
    expect(CODE).not.toMatch(/https?:\/\//)
    expect(SCRIPT).toMatch(/^[\x00-\x7F]*$/)
  })

  it('keeps everything under the one key, and the app’s Forget me clears that key', () => {
    expect([...CODE.matchAll(/'(niyyah\.[a-z.]+v\d+)'/g)].map((m) => m[1])).toEqual([KEY])
    // "Forget me … clears this phone" (src/components/ForgetMe.tsx): the sheet is on this site, so it is on the phone.
    expect(LOCAL_KEYS).toContain(KEY)
  })
})

describe('on arrival', () => {
  it('shows the saved-on-this-device box and hides the note that says nothing is kept', () => {
    expect((document.getElementById('privacy') as HTMLElement).hidden).toBe(false)
    expect((document.querySelector('[data-without-script]') as HTMLElement).hidden).toBe(true)
    expect(restoredNote()).toBe('')
    expect(problemNote().hidden).toBe(true)
  })

  it('keeps nothing until something is typed', () => {
    vi.advanceTimersByTime(1000)
    expect(localStorage.length).toBe(0)
  })
})

describe('keeping the answers on this device', () => {
  it('saves what is typed, a moment later, under the one key and nowhere else', () => {
    type('q1a-a', 'What I expect, in my own words.')
    expect(localStorage.getItem(KEY)).toBeNull() // not on every keystroke
    vi.advanceTimersByTime(500)
    // The day, and never the time.
    expect(saved()).toEqual({ v: 1, at: '2026-10-27', fields: { 'q1a-a': 'What I expect, in my own words.' } })
    expect(Object.keys(localStorage)).toEqual([KEY])
  })

  it('keeps names, the date, both columns and the closing boxes, and nothing that was left empty', () => {
    type('name-a', 'Amina')
    type('name-b', 'Omar')
    type('sheet-date', '2026-10-31')
    type('q3b-b', 'Two years left.')
    type('s4-agree', 'We send the same.')
    vi.advanceTimersByTime(500)
    expect(saved().fields).toEqual({ 'name-a': 'Amina', 'name-b': 'Omar', 'sheet-date': '2026-10-31', 'q3b-b': 'Two years left.', 's4-agree': 'We send the same.' })
  })

  it('puts the answers back on a reload, and says so', () => {
    type('name-a', 'Amina')
    type('q1a-a', 'First line\nSecond line')
    type('s2-open', 'The guest list.')
    vi.advanceTimersByTime(500)
    open() // the same tab, reloaded
    expect(field('name-a').value).toBe('Amina')
    expect(field('q1a-a').value).toBe('First line\nSecond line')
    expect(field('s2-open').value).toBe('The guest list.')
    expect(restoredNote()).toBe('We restored your answers on this device.')
    // The names went back on the columns too.
    expect(columnLabel('q1a-a')).toBe('Amina')
  })

  it('says nothing about restoring when there was nothing to put back', () => {
    open()
    expect(restoredNote()).toBe('')
  })

  it('forgets the key entirely once every field is empty again, rather than keeping an empty record', () => {
    type('q1a-a', 'Something')
    vi.advanceTimersByTime(500)
    type('q1a-a', '')
    vi.advanceTimersByTime(500)
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('ignores a stored record it does not recognise instead of pouring it into the page', () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 9, fields: { 'q1a-a': 'from a future version' } }))
    open()
    expect(field('q1a-a').value).toBe('')
    localStorage.setItem(KEY, '{not json')
    open()
    expect(field('q1a-a').value).toBe('')
  })

  it('saves straight away when the page is hidden or closed, so a fast exit loses nothing', () => {
    type('q2a-a', 'The walima.')
    window.dispatchEvent(new Event('pagehide'))
    expect(saved().fields['q2a-a']).toBe('The walima.')
  })
})

describe('removed on their own, 14 days after the last change', () => {
  /** Answers saved now, then the page opened `days` later. */
  function after(days: number, hours = 0) {
    type('q1a-a', 'Kept for a while')
    vi.advanceTimersByTime(500)
    vi.setSystemTime(new Date(NOW.getTime() + days * DAY + hours * 60 * 60 * 1000))
    open()
  }

  it('are still there 14 days later', () => {
    after(14)
    expect(field('q1a-a').value).toBe('Kept for a while')
    expect(restoredNote()).toBe('We restored your answers on this device.')
  })

  it('are gone from the page and the device on the 15th day, and the page says why', () => {
    after(15)
    expect(field('q1a-a').value).toBe('')
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(restoredNote()).toBe('Answers saved on this device more than 14 days ago were removed.')
    // And it does not say so again next time: there is nothing left to remove.
    open()
    expect(restoredNote()).toBe('')
  })

  it('count from the last change, so a couple still working on it keeps it', () => {
    type('q1a-a', 'Started')
    vi.advanceTimersByTime(500)
    vi.setSystemTime(new Date(NOW.getTime() + 10 * DAY))
    open()
    type('q1b-a', 'Added ten days later')
    vi.advanceTimersByTime(500)
    expect(saved().at).toBe('2026-11-06')
    vi.setSystemTime(new Date(NOW.getTime() + 20 * DAY))
    open()
    expect(field('q1a-a').value).toBe('Started')
    expect(field('q1b-a').value).toBe('Added ten days later')
  })

  it('start counting for answers kept before this rule, instead of keeping them forever', () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, fields: { 'q1a-a': 'Saved before the 14 days' } }))
    open()
    expect(field('q1a-a').value).toBe('Saved before the 14 days')
    expect(saved().at).toBe('2026-10-27')
    vi.setSystemTime(new Date(NOW.getTime() + 15 * DAY))
    open()
    expect(field('q1a-a').value).toBe('')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('treat a record with a day that cannot be read as past its time', () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, at: 'someday', fields: { 'q1a-a': 'Unreadable day' } }))
    open()
    expect(field('q1a-a').value).toBe('')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('are said on the page, beside Clear my answers', () => {
    expect(document.getElementById('privacy')!.textContent!.replace(/\s+/g, ' ')).toContain('Saved answers are removed from this device 14 days after the last change.')
  })
})

describe('Clear my answers', () => {
  const press = () => (document.querySelector('[data-clear-answers]') as HTMLButtonElement).click()

  it('asks first, then empties every field and removes them from this device', () => {
    const ask = vi.fn(() => true)
    vi.stubGlobal('confirm', ask)
    type('name-a', 'Amina')
    type('q1a-a', 'An answer')
    vi.advanceTimersByTime(500)
    press()
    expect(ask).toHaveBeenCalledOnce()
    expect(field('name-a').value).toBe('')
    expect(field('q1a-a').value).toBe('')
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(restoredNote()).toBe('Your answers were cleared from this device.')
    expect(columnLabel('q1a-a')).toBe('Person A')
    // And it stays cleared: a reload brings nothing back.
    open()
    expect(field('q1a-a').value).toBe('')
  })

  it('changes nothing if the person says no', () => {
    vi.stubGlobal('confirm', () => false)
    type('q1a-a', 'Keep this')
    vi.advanceTimersByTime(500)
    press()
    expect(field('q1a-a').value).toBe('Keep this')
    expect(saved().fields['q1a-a']).toBe('Keep this')
  })

  it('also clears a save still waiting to happen, so it cannot write the answers back a moment later', () => {
    vi.stubGlobal('confirm', () => true)
    type('q1a-a', 'Typed just now')
    press()
    vi.advanceTimersByTime(1000)
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})

describe('leaving the page', () => {
  it('does not ask when the answers are kept', () => {
    type('q1a-a', 'Saved')
    vi.advanceTimersByTime(500)
    expect(leave()).toBe(false)
  })

  it('does not ask when nothing was typed', () => {
    expect(leave()).toBe(false)
  })

  it('saves a waiting answer on the way out instead of asking', () => {
    type('q1a-a', 'Just typed')
    expect(leave()).toBe(false)
    expect(saved().fields['q1a-a']).toBe('Just typed')
  })

  it('asks, and says why on the page, when the browser will not keep them', () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    type('q1a-a', 'Not kept')
    vi.advanceTimersByTime(500)
    expect(problemNote().hidden).toBe(false)
    expect(problemNote().textContent!.replace(/\s+/g, ' ')).toContain('Download the PDF before you close or reload it')
    expect(leave()).toBe(true)
  })
})

describe('the names on the columns', () => {
  it('replace Person A and Person B on every question as they are typed, and come back when cleared', () => {
    type('name-a', '  Amina  ')
    type('name-b', 'Omar')
    for (const id of ['q1a', 'q2c', 'q4e']) {
      expect(columnLabel(`${id}-a`)).toBe('Amina')
      expect(columnLabel(`${id}-b`)).toBe('Omar')
    }
    expect(document.querySelectorAll('.cols label')).toHaveLength(40)
    type('name-a', '')
    expect(columnLabel('q1a-a')).toBe('Person A')
    expect(columnLabel('q1a-b')).toBe('Omar')
  })

  it('leave the name fields and the shared closing boxes labelled as they were', () => {
    type('name-a', 'Amina')
    expect(columnLabel('name-a')).toBe('Person A’s name')
    expect(columnLabel('s1-agree')).toBe('What we agree on')
    expect(columnLabel('s1-open')).toBe('What we’re still deciding')
  })

  it('keep each column’s label tied to its own box, so a screen reader still hears whose answer it is', () => {
    type('name-b', 'Omar')
    const label = document.querySelector('label[for="q2b-b"]')!
    expect(label.closest('.cols > div')!.querySelector('textarea')!.id).toBe('q2b-b')
  })
})

describe('the session date', () => {
  it('marks an empty date so that print leaves a blank line instead of mm/dd/yyyy', () => {
    expect(field('sheet-date').classList.contains('is-empty')).toBe(true)
    type('sheet-date', '2026-10-31')
    expect(field('sheet-date').classList.contains('is-empty')).toBe(false)
  })
})
