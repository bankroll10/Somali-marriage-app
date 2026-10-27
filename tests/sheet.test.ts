import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * N3 — the money conversation sheet.
 *
 * A printable handed to a couple by someone who will never meet us, opened
 * from an attachment with the network off. Every rule it ships under is a
 * rule someone could quietly break later: a font pulled from a CDN, a helpful
 * "typical mahr" range, a second link that looks like a Niyyah page and is
 * not. So each one is pinned here rather than kept in a brief. The exact
 * print measurements are not: they were set by rendering, and a number read
 * back out of the CSS proves nothing about the page (docs/ASSETS.md).
 */

const HTML = readFileSync('public/niyyah-money-conversation-sheet.html', 'utf8')
const TXT = readFileSync('public/niyyah-money-conversation-sheet.txt', 'utf8')
const ONE_PAGE = readFileSync('public/niyyah-money-conversation-sheet-1page.html', 'utf8')
const NOTE = readFileSync('public/niyyah-money-conversation-sheet-facilitator-note.html', 'utf8')
const NOTE_TXT = readFileSync('public/niyyah-money-conversation-sheet-facilitator-note.txt', 'utf8')

const flat = (s: string) => s.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim()

const QUESTIONS = [...HTML.matchAll(/<p class="q"[^>]*>([\s\S]*?)<\/p>/g)].map((m) => flat(m[1]))
const CSS = HTML.match(/<style>([\s\S]*?)<\/style>/)![1]

describe('it opens from disk, with the network off', () => {
  it('fetches nothing: no external font, stylesheet, image or frame, and no script but the four that run the page, the QR code and the PDF', () => {
    for (const forbidden of ['<iframe', '<img', '<link ', '@import', 'srcset', 'url(', 'integrity=', 'crossorigin']) {
      expect(HTML, forbidden).not.toContain(forbidden)
    }
    // The page script (keeping answers on this device, the names on the columns, growing boxes:
    // tests/sheet-page.test.ts) and the Download PDF button (tests/sheet-pdf.test.ts) are the only code.
    // All three are files on this site, named relative to the page, and nothing is written inline, so
    // what runs is exactly what those files contain and nothing is pulled from anywhere else.
    const scripts = [...HTML.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    expect(scripts.map((m) => m[1].match(/\ssrc="([^"]*)"/)?.[1])).toEqual(['niyyah-money-conversation-sheet.js', 'vendor/qrcode.js', 'vendor/jspdf.umd.min.js', 'niyyah-money-conversation-sheet-pdf.js'])
    for (const [, attrs, body] of scripts) {
      expect(body.trim(), 'no inline script').toBe('')
      expect(attrs).toContain('defer')
    }
    expect(HTML.match(/\ssrc=/g)).toHaveLength(4)
  })

  it('carries exactly one absolute link, and it is the one address we own', () => {
    // The version switcher adds two more <a> tags, but both are relative —
    // this file still reaches outside itself in exactly one place.
    const urls = HTML.match(/https?:\/\/[^\s"'<>)]+/g) ?? []
    expect(urls).toEqual(['https://joinniyyah.com/'])
    expect(TXT.match(/https?:\/\/[^\s]+/g)).toEqual(['https://joinniyyah.com/'])
  })

  it('the version switcher is the only other link, and every href is relative', () => {
    // In-page jump links (#s1-h …) open nothing outside this file; they are held by their own test below.
    const anchors = [...HTML.matchAll(/<a\s[^>]*href="([^"]*)"/g)].map((m) => m[1]).filter((h) => !h.startsWith('#'))
    expect(anchors).toEqual([
      'niyyah-money-conversation-sheet-1page.html',
      'niyyah-money-conversation-sheet-so.html',
      'https://joinniyyah.com/',
    ])
    for (const href of anchors.filter((h) => h !== 'https://joinniyyah.com/')) {
      expect(href, href).not.toMatch(/^https?:|^\//)
    }
  })

  it('saves nothing and sends nothing — there is no form to submit', () => {
    for (const forbidden of ['localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'XMLHttpRequest', 'navigator.send', '<form', 'action=', 'method=', 'type="submit"', 'formaction', 'onsubmit', 'onchange', 'oninput']) {
      expect(HTML, forbidden).not.toContain(forbidden)
    }
    expect(HTML).toContain('Nothing on this page is saved or sent')
  })

  it('says, in a box near the top, that answers are saved only on this device and nothing is sent', () => {
    // The founder's change of 2026-10-26: answers are kept in this browser so a couple can come back to
    // them. The promise is now "saved only on this device", and it is in a box of its own, not small print.
    const box = HTML.match(/<div class="privacy screen-only" id="privacy" hidden>([\s\S]*?)<\/div>/)![1]
    expect(flat(box)).toContain('Saved only on this device')
    expect(flat(box)).toContain('What you type is saved in this browser on this device, so you can close the page and come back to it. Nothing on this page is sent anywhere, and the PDF is made here too.')
    expect(flat(box)).toContain('Saved answers are removed from this device 14 days after the last change. On a shared or public device, tap Clear my answers when you finish.')
    expect(box).toContain('data-clear-answers')
    expect(box).toMatch(/class="restored" role="status"/)
    // Before the how-to and before the first question: the first thing after the two introductory paragraphs.
    expect(HTML.indexOf('id="privacy"')).toBeLessThan(HTML.indexOf('class="howto'))
  })

  it('without its script, keeps nothing and says exactly that, and the saved-on-this-device box stays hidden', () => {
    // The box is hidden in the markup and shown by the script that does the saving, so the page never
    // claims to keep what it is not keeping.
    expect(HTML).toMatch(/<p class="note screen-only" data-without-script>\s*Nothing on this page is saved or sent\./)
    expect(HTML).toMatch(/<div class="privacy screen-only" id="privacy" hidden>/)
  })

  it('no longer warns that long answers are cut off, or tells anyone to print only to write by hand', () => {
    expect(HTML).not.toContain('cut off')
    expect(HTML).not.toContain('long answers may')
    expect(HTML).not.toContain('Print this page only')
    expect(HTML).not.toContain('only to write on it by hand')
    expect(HTML).toMatch(/screen-only[\s\S]*?\{\s*display: none;/)
  })

  it('explains how to use it in a short box at the top', () => {
    const howto = flat(HTML.match(/<aside class="howto screen-only" aria-labelledby="howto-h">([\s\S]*?)<\/aside>/)![1].replace(/<[^>]+>/g, ' '))
    for (const line of [
      'How to use this',
      'Each of you opens this page on your own phone and chooses Person 1 or Person 2. It does not matter who is which.',
      'Answer on your own, without showing each other. It takes about 30 to 40 minutes, and you can skip any question.',
      'Tap Finish at the end. Send the link it gives you to your partner by text, or save the file and send that.',
      "When your partner's link or file arrives, open it on this page. You get one PDF with both of your answers side by side, and a first page listing what to talk about.",
      'Bring that PDF to your session with the imam.',
      'Sharing one phone? The first person taps Finish, saves the file, then taps Clear my answers so the second person can start.',
    ]) {
      expect(howto, line).toContain(line)
    }
    expect(howto).not.toMatch(/[\u2013\u2014]/)
  })

  it('jumps to the four sections, and says which of the four each one is', () => {
    const jumps = [...HTML.matchAll(/<a href="(#[^"]+)">([^<]+)<\/a>/g)].map((m) => [m[1], m[2]])
    expect(jumps).toEqual([
      ['#s1-h', '1. Mahr'],
      ['#s2-h', '2. The wedding'],
      ['#s3-h', '3. Debt'],
      ['#s4-h', '4. Family obligations'],
      ['#finish-h', 'Finish and share'],
    ])
    for (const [href] of jumps) expect(HTML).toContain(`id="${href.slice(1)}"`)
    expect(HTML).toMatch(/<nav class="jump screen-only" aria-label="Sections">/)
    for (const n of [1, 2, 3, 4]) expect(HTML).toMatch(new RegExp(`<section aria-labelledby="s${n}-h">\\s*<p class="section-of">Section ${n} of 4</p>`))
  })

  it('introduces the four subjects without counting them as three', () => {
    // It used to say "the four subjects", then "none of the three", which read as a mistake.
    expect(flat(HTML)).toContain('The four subjects are kept apart on purpose. Mahr is not the wedding. The wedding is not a debt either of you already carries. And the money you send to family every month, at home or abroad, is a subject of its own.')
    expect(HTML).not.toContain('none of the three')
  })

  it('asks for the session date with a date picker', () => {
    expect(HTML).toContain('<input id="sheet-date" data-key="date" type="date" autocomplete="off" />')
  })

  it('keeps the version and the disclaimer in a quiet footer', () => {
    expect(CSS).toMatch(/footer \{[^}]*border-top: 1px solid var\(--rule\)[^}]*color: #4a564f;/)
    expect(CSS).toMatch(/footer p \{[^}]*font-size: 0\.8rem;/)
  })

  it('points to the one-page twin as a real relative link, never as a bare file name in the text', () => {
    expect(HTML).toContain('<a href="niyyah-money-conversation-sheet-1page.html">the one-page version</a>')
    const prose = HTML.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ')
    expect(prose).not.toContain('niyyah-money-conversation-sheet-1page.html')
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
    expect([...HTML.matchAll(/<ol class="qs">[\s\S]*?<\/ol>/g)].map((m) => (m[0].match(/<li class="qitem"/g) ?? []).length)).toEqual([5, 5, 5, 5])
    expect(QUESTIONS).toHaveLength(20)
    // A question, never an instruction. Four of them add a clarifier after
    // the question mark ("Write your own ceiling, not a guess") — the ask is
    // still the question; what is banned is a line that only tells.
    for (const q of QUESTIONS) expect(q, q).toContain('?')
    for (const q of QUESTIONS) expect(q, q).toMatch(/^(What|Who|Which|How|If|Is|After|Of)\b/)
  })

  it('has no closing boxes any more: the combined PDF’s first page lists what to talk about, and each subject ends with lines for notes', () => {
    // Removed at the imam's request (2026-10-27): with two people answering apart, nobody fills a shared
    // box. The PDF works out what lines up from the answers (tests/sheet-pdf.test.ts).
    expect(HTML).not.toContain('class="box"')
    expect(HTML).not.toContain('What we agree on')
    expect(HTML).not.toContain('still deciding')
    for (const scored of ['score', 'Score', 'total out of', 'points', 'result']) {
      expect(HTML, scored).not.toContain(scored)
    }
  })

  it('asks three yes or no questions, and two of them hide their subject’s questions on a No', () => {
    const gates = [...HTML.matchAll(/<fieldset class="gate" data-kind="gate" data-key="(g\d)" data-short="([^"]*)"( data-hides="true")?( data-no-line="([^"]*)")?>\s*<legend>([^<]*)<\/legend>/g)].map((m) => ({
      key: m[1],
      hides: !!m[3],
      noLine: m[5] ?? '',
      ask: m[6],
    }))
    expect(gates).toEqual([
      // Mahr: a No hides nothing, because a couple who have not discussed it is who the sheet is for.
      { key: 'g1', hides: false, noLine: '', ask: 'Have the two of you discussed the mahr amount yet?' },
      { key: 'g3', hides: true, noLine: 'No debts', ask: 'Do you have any debts right now?' },
      { key: 'g4', hides: true, noLine: 'Does not send money to family', ask: 'Do you send money to family regularly?' },
    ])
    // Each is a Yes and a No, nothing preselected, inside the section it belongs to.
    for (const { key } of gates) {
      expect(HTML.match(new RegExp(`name="${key}" value="(yes|no)"`, 'g'))).toHaveLength(2)
      expect(HTML).not.toMatch(new RegExp(`name="${key}"[^>]*checked`))
    }
    // What a No hides is the rest of its own section, and only that.
    for (const n of [3, 4]) {
      const sec = HTML.match(new RegExp(`<section aria-labelledby="s${n}-h">[\\s\\S]*?</section>`))![0]
      expect(sec).toMatch(new RegExp(`<div class="follow" data-follows="g${n}">\\s*<ol class="qs">`))
    }
  })

  it('adds a choice or a number only where both people state an expectation, attached to the question that already asks it', () => {
    const extra = (q: string) => HTML.match(new RegExp(`<li class="qitem" data-q="${q}">[\\s\\S]*?</li>`))![0]
    expect(extra('q1a')).toContain('data-kind="number" data-key="n-q1a"')
    expect(extra('q2d')).toContain('data-kind="number" data-key="n-q2d"')
    expect(extra('q1c')).toMatch(/data-kind="choice" data-key="c-q1c"[\s\S]*All at the nikah[\s\S]*Part at the nikah, part deferred[\s\S]*All deferred[\s\S]*Not sure yet/)
    expect(extra('q3d')).toMatch(/data-kind="choice" data-key="c-q3d"[\s\S]*Stays mine to pay[\s\S]*Something we both handle[\s\S]*Not sure yet/)
    expect(extra('q4e')).toMatch(/data-kind="choice" data-key="c-q4e"[\s\S]*Stay the same[\s\S]*Go up[\s\S]*Come down[\s\S]*Not sure yet/)
    // And one question of its own, before the wedding's five.
    expect(HTML).toMatch(/<fieldset class="ask-block" data-kind="choice" data-key="c-pay"[^>]*>\s*<legend>Who do you expect to pay for most of the wedding\?<\/legend>/)
    // Every choice offers Not sure yet, so nobody has to pretend to an answer.
    for (const key of ['c-q1c', 'c-q3d', 'c-q4e', 'c-pay']) expect(HTML).toContain(`name="${key}" value="unsure"`)
    // Nothing else: nine extra fields in all, three gates, four choices, two numbers.
    expect(HTML.match(/data-kind="(gate|choice|number)"/g)).toHaveLength(9)
  })

  it('lets each person say who they are, and keeps the partner’s answers for the PDF only', () => {
    expect(HTML).toMatch(/name="role" value="1" data-key="role" \/> I am Person 1/)
    expect(HTML).toMatch(/name="role" value="2" data-key="role" \/> I am Person 2/)
    const partner = flat(HTML.match(/<div class="partner screen-only" id="partner" hidden>([\s\S]*?)<\/div>\s*<footer>/)![1].replace(/<[^>]+>/g, ' '))
    expect(partner).toContain("They are not shown on this page and not saved on this device")
    // The partner's link box is not one of the answers: nothing marks it to be kept.
    expect(HTML).toMatch(/<textarea id="partner-code" rows="3" autocomplete="off" spellcheck="false"><\/textarea>/)
  })

  it('uses no dash in any of its new words', () => {
    for (const re of [/<aside class="howto[\s\S]*?<\/aside>/, /<div class="setup"[\s\S]*?<\/div>\s*<nav/, /<div class="finish[\s\S]*?<div class="partner/, /<div class="partner[\s\S]*?<footer>/]) {
      const block = HTML.match(re)![0].replace(/<[^>]+>/g, ' ')
      expect(block, String(re)).not.toMatch(/[\u2013\u2014]/)
    }
    for (const m of HTML.matchAll(/<(?:legend|label class="option"[^>]*)>([^<]*)</g)) expect(m[1]).not.toMatch(/[\u2013\u2014]/)
  })
})

describe('what it refuses to say', () => {
  const PROSE = flat(HTML.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' '))
  const BOTH = `${PROSE} ${flat(TXT)}`

  it('gives no ruling and cites no source', () => {
    for (const word of ['fiqh', 'madhhab', 'hadith', 'ayah', 'ayat', 'Quran', "Qur'an", 'Sunnah', 'scholar', 'sheikh', 'halal', 'haram', 'sharia', 'permissible', 'obligatory', 'correct amount']) {
      expect(BOTH.toLowerCase(), word).not.toContain(word.toLowerCase())
    }
    // One exception, at the founder's request (2026-10-26), for couples sent by an imam at Dar Al-Hijrah:
    // the how-to says to bring the PDF to "your session with the imam". It names where the sheet goes,
    // not anyone's ruling, and it is the only mention.
    expect(BOTH.toLowerCase().match(/\bimam\b/g)).toHaveLength(1)
    expect(BOTH).toContain('Bring that PDF to your session with the imam.')
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
    // mahr, nikah, walima and nothing else in Somali or Arabic; no lang=
    // switch, because this document itself is never bilingual — "Somali"
    // appears exactly once, as the version switcher's link to the separate
    // Somali document, not as an explanation folded into this page's prose.
    expect(HTML).not.toContain('lang="so"')
    expect(HTML.match(/\bSomali\b/g)).toHaveLength(1)
    expect(HTML).toContain('<a href="niyyah-money-conversation-sheet-so.html">in Somali</a>')
    expect(BOTH).not.toMatch(/\bin our culture\b|\btraditionally\b|\bin the community\b/i)
    expect(TXT).not.toMatch(/\bSomali\b/i)
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
    const lede = 'A sheet for two adults considering marriage, to work through before the families discuss numbers.'
    expect(flat(HTML)).toContain(lede)
    expect(flat(TXT)).toContain(lede)
    // The second sentence says how this page is answered now; the pasteable text, a separate page, is unchanged.
    expect(flat(HTML)).toContain("Each of you answers on your own phone, and neither sees the other's answers until you have both finished.")
    expect(flat(HTML)).not.toContain('families are involved')
  })
})

describe('on paper', () => {
  const PRINT = CSS.slice(CSS.indexOf('@media print'))

  it('starts each subject on its own page, on any paper, black on white', () => {
    expect(PRINT).toMatch(/section \+ section \{[^}]*break-before: page/)
    expect(CSS).toMatch(/ol\.qs > li \{[\s\S]*?break-inside: avoid/)
    // US Letter and A4 both, by declaring no paper size at all.
    expect(PRINT).not.toMatch(/@page\s*\{[^}]*size:/)
    expect(PRINT).toMatch(/background: #fff/)
    expect(PRINT).toMatch(/color: #000/)
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
    // No extra <a>: repeating the name four times must not repeat the link,
    // and the version switcher's two links stay screen-only, so print never
    // shows more than the one clickable address in the real footer.
    expect([...HTML.matchAll(/<a\s[^>]*href="(?!#)/g)]).toHaveLength(3)
    const switcher = HTML.match(/<p class="note screen-only">\s*Also:[\s\S]*?<\/p>/)![0]
    expect(switcher).toMatch(/class="note screen-only"/)
  })
})

describe('on a phone, and to a screen reader', () => {
  it('is one column for one person, with Yes and No large enough to tap, and nothing scrolls sideways', () => {
    // One person a device: there are no side-by-side columns left to stack (checked at 375 px in a browser).
    expect(HTML).not.toContain('class="cols"')
    expect(CSS).toContain('@media (max-width: 700px)')
    expect(CSS).toMatch(/\.option \{[^}]*min-height: 2\.75rem;/)
    expect(CSS).toContain('min-width: 0')
  })

  it('keeps every field at the 16px floor that stops iOS zooming on focus', () => {
    // docs/DESIGN.md's rule, carried onto a page that shares none of its CSS.
    expect(CSS.match(/font-size: 1rem; \/\* 16px floor/g)).toHaveLength(2)
  })

  it('labels every field for real, with no orphaned for= and no bare column', () => {
    const fors = [...HTML.matchAll(/<label[^>]*\sfor="([^"]+)"/g)].map((m) => m[1])
    const ids = new Set([...HTML.matchAll(/<(?:textarea|input)[^>]*\sid="([^"]+)"/g)].map((m) => m[1]))
    expect(fors).toHaveLength(20 + 2 + 2 + 1) // an answer to each question, the two amounts, your name and the date, the partner's link
    // Every Yes, No and choice is a real input inside its own label.
    for (const m of HTML.matchAll(/<input type="radio"[^>]*>/g)) expect(HTML).toContain(`<label class="option">${m[0]}`)
    for (const f of fors) expect(ids, f).toContain(f)
    expect(new Set(fors).size).toBe(fors.length)
  })

  it('names the two people without a gender or a role: Person 1 and Person 2, or their own names', () => {
    expect(HTML).not.toMatch(/>Person [AB]</)
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
    expect(anchors).toEqual([
      'niyyah-money-conversation-sheet.html',
      'niyyah-money-conversation-sheet-1page-so.html',
      'https://joinniyyah.com/',
    ])
    for (const href of anchors.filter((h) => h !== 'https://joinniyyah.com/')) {
      expect(href, href).not.toMatch(/^https?:|^\//)
    }
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
    // textareas' top edge lands at the same y (docs/ASSETS.md).
    for (const n of [1, 2, 3, 4]) {
      expect(ONE_PAGE).toContain(`<label for="s${n}-agree">Agreed</label>`)
      expect(ONE_PAGE).toContain(`<label for="s${n}-open">Still deciding</label>`)
    }
    expect(ONE_PAGE).not.toContain('What we agree on')
    expect(ONE_PAGE).not.toContain('still deciding</label>')
  })

  it('prints as two columns on one page, at the 9pt floor the founder set', () => {
    expect(O_PRINT).not.toMatch(/break-before: page/)
    expect(O_PRINT).toMatch(/\.content \{[\s\S]*?columns: 2/)
    expect(O_PRINT).toMatch(/font-size: 9pt; \/\* the floor this variant was asked to keep \*\//)
    // A screen rule with higher specificity (`.cols input[type='text']`) once
    // overrode the print height of every answer line, because 1.9rem
    // recomputes against print's 9pt root. The print rule has to be restated
    // at that specificity; what it is set to is docs/ASSETS.md's measurement.
    expect(O_PRINT).toMatch(/\.cols input\[type='text'\] \{\s*min-height:/)
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

  it('carries a version switcher with real relative links to its two counterparts', () => {
    expect(ONE_PAGE).toContain('<a href="niyyah-money-conversation-sheet.html">the four-page version</a>')
    expect(ONE_PAGE).toContain('<a href="niyyah-money-conversation-sheet-1page-so.html">in Somali</a>')
  })

  it('still drops to one column below 700px, with no field under the 16px floor', () => {
    expect(O_CSS).toContain('@media (max-width: 700px)')
    expect(O_CSS.match(/font-size: 1rem; \/\* 16px floor/g)?.length).toBeGreaterThanOrEqual(2)
  })
})

describe('the facilitator note', () => {
  // N3-note. Not a worksheet — nobody fills it in — so it carries none of
  // the twenty-question content rules above. What it needs instead: the
  // same no-network guarantee as the two sheets, and the three things a
  // coordinator actually asked "how" about.

  it('fetches nothing, and reaches outside itself only at the one address we own', () => {
    for (const forbidden of ['<script', '<iframe', '<img', '<link ', '@import', 'src=', 'localStorage', 'sessionStorage', '<form', 'action=', 'type="submit"']) {
      expect(NOTE, forbidden).not.toContain(forbidden)
    }
    const urls = NOTE.match(/https?:\/\/[^\s"'<>)]+/g) ?? []
    expect(urls).toEqual(['https://joinniyyah.com/'])
  })

  it('links each of the four sheet files by their real, relative filename', () => {
    const anchors = [...NOTE.matchAll(/<a\s[^>]*href="([^"]*)"/g)].map((m) => m[1])
    // One page before four pages, in the Somali pair as in the English
    // pair above it — the order the labels now claim.
    expect(anchors).toEqual([
      'niyyah-money-conversation-sheet-1page.html',
      'niyyah-money-conversation-sheet.html',
      'niyyah-money-conversation-sheet-1page-so.html',
      'niyyah-money-conversation-sheet-so.html',
      'https://joinniyyah.com/',
    ])
    for (const href of anchors.filter((h) => h !== 'https://joinniyyah.com/')) {
      expect(href, href).not.toMatch(/^https?:|^\//)
    }
  })

  it('carries "Niyyah" in its own <title>', () => {
    const title = NOTE.match(/<title>([^<]*)<\/title>/)?.[1]
    expect(title).toContain('Niyyah')
  })

  it('answers the three questions a coordinator actually asked', () => {
    const text = flat(NOTE)
    // When.
    expect(text).toMatch(/When to hand it out/)
    // How — separately, then compared.
    expect(text).toContain('fills their own column separately')
    expect(text).toMatch(/compare afterward, together/)
    // What happens to it after.
    expect(text).toContain('Nobody collects it')
  })

  it('names both sheet files by their real filename, not a paraphrase', () => {
    expect(NOTE).toContain('niyyah-money-conversation-sheet-1page.html')
    expect(NOTE).toContain('niyyah-money-conversation-sheet.html')
  })

  it('tells a coordinator the Somali versions exist, and which is which', () => {
    // Both Somali files were once named by an elided "…-so.html" /
    // "…-1page-so.html", listed four-page-first while the English pair
    // above them ran one-page-first. The hrefs were right; the labels
    // read backwards. Full filenames, and the page count said in words.
    expect(NOTE).toMatch(/Somali/)
    expect(NOTE).not.toContain('…-so.html')
    expect(NOTE).not.toContain('…-1page-so.html')
    expect(NOTE).toContain('niyyah-money-conversation-sheet-1page-so.html')
    expect(NOTE).toContain('niyyah-money-conversation-sheet-so.html')
    for (const doc of [NOTE, NOTE_TXT]) {
      // flat(): the .txt wraps mid-phrase at 78 columns, so the sentence
      // only exists as one string once the line breaks are collapsed.
      expect(flat(doc)).toMatch(/Somali/)
      expect(flat(doc)).toMatch(/for the one-page version/)
      expect(flat(doc)).toMatch(/for the four-page/)
    }
  })

  it('carries the same footer and version line as the two sheets', () => {
    const text = flat(NOTE)
    expect(text).toContain('Published by Niyyah —')
    expect(text).toContain('v1.0 — 2026-09-20')
  })

  it('has a plain-text twin that says the same three things', () => {
    // The .txt uses all-caps section headers, same convention as the two
    // sheets' own plain-text twins — the body sentences match case for case.
    for (const phrase of ['WHEN TO HAND IT OUT', 'fills their own column separately', 'compare afterward, together', 'Nobody collects it', 'Published by Niyyah —']) {
      expect(NOTE_TXT, phrase).toContain(phrase)
    }
    expect(NOTE_TXT.match(/https?:\/\/[^\s]+/g)).toEqual(['https://joinniyyah.com/'])
  })
})

describe('the link graph across the whole N3 family', () => {
  // Checked as a graph, not as five separate string matches, because the
  // failure this guards is always a mismatch *between* two files: a link
  // whose label says one thing and whose href opens another, or two links
  // in a section quietly sharing a target. Both still return 200, so
  // nothing downstream notices.
  const FOUR_EN = 'niyyah-money-conversation-sheet.html'
  const ONE_EN = 'niyyah-money-conversation-sheet-1page.html'
  const FOUR_SO = 'niyyah-money-conversation-sheet-so.html'
  const ONE_SO = 'niyyah-money-conversation-sheet-1page-so.html'

  const SO_HTML = readFileSync(`public/${FOUR_SO}`, 'utf8')
  const ONE_SO_HTML = readFileSync(`public/${ONE_SO}`, 'utf8')

  /** Every link on the page that points at another file here, label included. */
  const rel = (doc: string) =>
    [...doc.matchAll(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)]
      .map((m) => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() }))
      .filter((l) => !/^https?:/.test(l.href) && !l.href.startsWith('#'))

  const SHEETS = [
    [FOUR_EN, HTML, [ONE_EN, FOUR_SO]],
    [ONE_EN, ONE_PAGE, [FOUR_EN, ONE_SO]],
    [FOUR_SO, SO_HTML, [ONE_SO, FOUR_EN]],
    [ONE_SO, ONE_SO_HTML, [FOUR_SO, ONE_EN]],
  ] as const

  it('every sheet page links to exactly its two counterparts, and never to itself', () => {
    for (const [name, doc, targets] of SHEETS) {
      const hrefs = rel(doc).map((l) => l.href)
      expect(hrefs, name).toEqual([...targets])
      expect(new Set(hrefs).size, name).toBe(hrefs.length)
      expect(hrefs, name).not.toContain(name)
    }
  })

  it('the length link keeps the language, and the language link keeps the length', () => {
    // One link per axis. Crossing both at once — a four-page English sheet
    // offering the *one-page* Somali — is the silent mis-wiring that a
    // per-file string check would sail straight past.
    const isSomali = (f: string) => f.endsWith('-so.html')
    const isOnePage = (f: string) => f.includes('-1page')
    for (const [self, doc] of SHEETS) {
      const [lengthLink, languageLink] = rel(doc).map((l) => l.href)
      expect(isSomali(lengthLink), `${self}: length link changed language`).toBe(isSomali(self))
      expect(isOnePage(lengthLink), `${self}: length link did not change length`).toBe(!isOnePage(self))
      expect(isSomali(languageLink), `${self}: language link did not change language`).toBe(!isSomali(self))
      expect(isOnePage(languageLink), `${self}: language link changed length`).toBe(isOnePage(self))
    }
  })

  it('the facilitator note links all four sheets, each label naming the file it opens', () => {
    const links = rel(NOTE)
    expect(links.map((l) => l.href)).toEqual([ONE_EN, FOUR_EN, ONE_SO, FOUR_SO])
    expect(new Set(links.map((l) => l.href)).size).toBe(4)
    // The label *is* the filename in this section, so a label pointing at
    // the wrong file is mechanically detectable rather than a reading job.
    for (const l of links) expect(l.text, `label "${l.text}" opens ${l.href}`).toBe(l.href)
  })

  it('every href in the family is a bare relative filename, resolving beside the page', () => {
    for (const [name, doc] of [...SHEETS.map(([n, d]) => [n, d] as const), ['the note', NOTE] as const]) {
      for (const l of rel(doc)) {
        expect(l.href, `${name}: ${l.href}`).not.toMatch(/^https?:|^\/|^\.\.\//)
        expect(l.href, `${name}: ${l.href}`).toMatch(/^niyyah-money-conversation-sheet[a-z0-9-]*\.html$/)
      }
    }
  })
})

describe('every sheet has its PDF twin', () => {
  // A pitch offered "print-ready PDFs" before any existed (docs/ASSETS.md,
  // rule 6). Each is rendered from its HTML on Letter and shipped beside it;
  // a change to the HTML re-renders the PDF in the same PR.
  const PAGES: Record<string, number> = {
    'niyyah-money-conversation-sheet': 4,
    'niyyah-money-conversation-sheet-1page': 1,
    'niyyah-money-conversation-sheet-facilitator-note': 1,
    'niyyah-money-conversation-sheet-so': 4,
    'niyyah-money-conversation-sheet-1page-so': 1,
  }
  for (const [name, pages] of Object.entries(PAGES)) {
    it(`${name}.pdf exists, is a PDF, and has ${pages} page${pages === 1 ? '' : 's'}`, () => {
      const path = `public/${name}.pdf`
      expect(existsSync(path), path).toBe(true)
      const pdf = readFileSync(path)
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
      // Page objects, not the page tree that holds them.
      const count = (pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g) ?? []).length
      expect(count).toBe(pages)
    })
  }
})
