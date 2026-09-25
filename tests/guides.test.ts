import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TOPICS } from '../src/data/eleven'
import { GUIDE, TOOLS } from '../src/data/tools'
import { SOMALI } from '../src/data/somali'
import { SOMALI_INTRO, guideHtml, neutral, sampleHtml } from '../src/lib/guidePages'

/**
 * The eleven as a page, and what the page promises.
 *
 * A mosque or a counselling service will hand this to a couple. So the tests
 * are about what the page says of itself — who made it, what it records,
 * what the app version does — and that every one of the eleven is on it in
 * a voice for two readers, with nothing half-resolved.
 */

const HOST = 'example.test'
const full = guideHtml(GUIDE, { host: HOST })
const sample = sampleHtml(GUIDE, { host: HOST, cssHref: '/assets/index-abc.css' })
const strip = (html: string) => html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<script>[\s\S]*?<\/script>/, '').replace(/<[^>]+>/g, ' ')

describe('the voice for two readers', () => {
  it('resolves every token read.ts knows, longest first', () => {
    expect(neutral('{He} said {his} mother knows about {him}; {His} word, {Him}, {he}, {himself}.')).toBe(
      'They said their mother knows about them; Their word, Them, they, themselves.',
    )
  })

  it('leaves no token and no single-reader pronoun on either page', () => {
    for (const html of [full, sample]) {
      const text = strip(html)
      expect(text).not.toMatch(/\{[A-Za-z]+\}/)
      // Two lines name a side by role ("the wife", "she keeps working") — the
      // observation, not a pronoun about the reader's partner — and one "her"
      // is the partner's mother ("with their mother, near her"). Everything
      // else that looks like a single-reader pronoun is a leak.
      const scan = text.replace(/near her\b/g, 'near them')
      const leaks = scan.match(/\b(he|him|his|she|her|hers)\b/gi) ?? []
      const allowed = new Set(['she'])
      expect(leaks.filter((w) => !allowed.has(w.toLowerCase()))).toEqual([])
    }
  })
})

describe('the full guide', () => {
  it('carries all eleven, numbered, each with why, words and what to listen for', () => {
    expect(TOPICS).toHaveLength(11)
    for (const [i, t] of TOPICS.entries()) {
      expect(full).toContain(`<span class="n">${i + 1}.</span>${neutral(t.label).replaceAll('’', '’')}`)
      expect(full).toContain(neutral(t.script.words).replaceAll('"', '&quot;'))
      expect(full).toContain(neutral(t.script.tells).replaceAll('"', '&quot;'))
      expect(full).toContain(neutral(t.why).replaceAll('"', '&quot;'))
    }
    expect(full.match(/class="talk"/g)).toHaveLength(11)
  })

  it('says on page one who made it and what it does and does not record', () => {
    const text = strip(full).replace(/\s+/g, ' ')
    expect(text).toMatch(/Made by Niyyah/)
    expect(text).toMatch(/free, needs no account/)
    expect(text).toMatch(/nothing you read or decide here is recorded/)
    expect(text).toMatch(/opening this page counts nothing/)
    expect(text).toMatch(/keeps your answers on your own phone unless you choose to send the two-sided sheet/)
    expect(text).toMatch(/a guide that uses an AI model; this page does not/)
    expect(text).toMatch(/include qabiil and a second wife, named as such/)
    expect(text).toMatch(/We take no position on any of them/)
  })

  it('carries the approved Somali line, and no unapproved one', () => {
    expect(SOMALI['beforeYes.intro'].approved).toBe(true)
    expect(SOMALI['beforeYes.intro'].somali).toBe(SOMALI_INTRO)
    expect(full).toContain(`lang="so">${SOMALI_INTRO}`)
    expect(full).toContain('The important conversations, before the families have them for you.')
  })

  it('has its own head: title, description, canonical, social card', () => {
    expect(full).toContain(`<title>${GUIDE.title}</title>`)
    expect(full).toContain(`<link rel="canonical" href="https://${HOST}${GUIDE.path}" />`)
    expect(full).toContain(`<meta property="og:url" content="https://${HOST}${GUIDE.path}" />`)
    expect(full).toContain(`<meta property="og:image" content="https://${HOST}/og.png" />`)
    expect(full).toContain('<meta property="og:type" content="article" />')
    // The host is a setting: nothing but the one passed in.
    expect(full).not.toContain('joinniyyah')
  })

  it('ends with the two closers and one link into the app', () => {
    expect(full).toContain('When you don’t know your own answer yet')
    expect(full).toContain('When you have had them all')
    expect(full.match(/<a [^>]*data-app/g)).toHaveLength(2) // the interactive-version link in the preface, and the closing button
    expect(full).toContain(`href="/tools/${GUIDE.toolSlug}" data-app`)
  })
})

describe('the one-page sample', () => {
  it('carries exactly the three the outreach asked for, in order, and points at the full guide', () => {
    expect(GUIDE.sample).toEqual(['live', 'his-family-in-home', 'money-home'])
    expect(sample.match(/class="talk"/g)).toHaveLength(3)
    for (const [i, id] of GUIDE.sample.entries()) {
      const t = TOPICS.find((x) => x.id === id)!
      expect(sample).toContain(`<span class="n">${i + 1}.</span>${neutral(t.label)}`)
    }
    expect(sample).toContain('The other eight')
    expect(sample).toContain(`href="${GUIDE.path}"`)
    expect(sample).toContain(`<link rel="canonical" href="https://${HOST}${GUIDE.samplePath}" />`)
    expect(sample).toContain(`<title>${GUIDE.sampleTitle}</title>`)
    expect(sample).toContain('<link rel="stylesheet" href="/assets/index-abc.css" />')
  })

  it('makes the same promises as the full guide', () => {
    const text = strip(sample).replace(/\s+/g, ' ')
    for (const line of ['Made by Niyyah', 'needs no account', 'nothing you read or decide here is recorded', 'uses an AI model; this page does not', 'qabiil and a second wife']) {
      expect(text).toContain(line)
    }
  })

  it('refuses a sample that names a topic the eleven does not have', () => {
    expect(() => sampleHtml({ ...GUIDE, sample: ['live', 'not-a-topic'] }, { host: HOST })).toThrow(/sample names a topic/)
  })
})

describe('the two pages are not mistakeable for each other', () => {
  // The founder opened both and asked whether they were the same link. Above
  // the fold on a phone they were: one eyebrow, headings two words apart, the
  // same Somali line, the same first conversation. A reviewer handed the
  // sample could take it for the whole resource.
  const above = (html: string) => strip(html.slice(0, html.indexOf('class="talks"'))).replace(/\s+/g, ' ')

  it('says which one it is in the first line read', () => {
    expect(above(full)).toContain('Before you say yes')
    expect(above(full)).not.toContain('three of the eleven')
    expect(above(sample)).toContain('Before you say yes · three of the eleven')
  })

  it('offers the full guide before the conversations, not only after them', () => {
    expect(above(sample)).toContain('A sample.')
    expect(above(sample)).toContain('The full guide has all eleven')
    expect(sample.slice(0, sample.indexOf('class="talks"'))).toContain(`href="${GUIDE.path}" data-guide`)
    // The full guide has no such line — it is the full guide. (The script's
    // selector names the attribute on every page; what matters is that no
    // anchor here carries it.)
    expect(above(full)).not.toContain('A sample.')
    expect(full.match(/<a [^>]*data-guide/g)).toBeNull()
  })
})

describe('space to mark each conversation, on paper', () => {
  // The distribution playbook's spec for these cards: a question, a
  // follow-up, and somewhere to record where it stands. A difference has
  // three boxes of its own — worked out, still open, a line — never only
  // "still discussing" (docs/DECISIONS.md Part 8).
  // A coordinator putting this in a nikah packet is handing over a worksheet,
  // not a leaflet.
  it('gives every card where it stands, on both pages', () => {
    for (const [name, html, count] of [['guide', full, 11], ['sample', sample, 3]] as const) {
      const rows = html.match(/<p class="mark">.*?<\/p>/g) ?? []
      expect(rows, name).toHaveLength(count)
      for (const row of rows) {
        for (const box of ['Agreed', 'Worked out', 'Still open', 'A line', 'Need help']) expect(row).toContain(`<span>${box}</span>`)
        expect(row).not.toContain('Still discussing')
      }
    }
  })

  it('shows it only in print, because on screen the app records the state', () => {
    const css = full.match(/<style>([\s\S]*?)<\/style>/)![1]
    expect(css).toContain('.mark{display:none}')
    const print = css.slice(css.indexOf('@media print'))
    expect(print).toMatch(/\.mark\{display:flex;flex-wrap:wrap/)
    // The boxes are drawn, not typed: no glyph to go missing in a PDF.
    expect(print).toMatch(/\.mark span::before\{content:""/)
  })
})

describe('the only script on the page', () => {
  it('forwards a via to the links into the app, and touches nothing else', () => {
    const script = full.match(/<script>([\s\S]*?)<\/script>/)![1]
    expect(script).toContain("get('via')")
    expect(script).toContain('a[data-app],a[data-guide]')
    expect(script).toMatch(/\/\^\[a-z\]\+\$\//) // only a plain lowercase id is ever forwarded
    expect(script).not.toMatch(/fetch|XMLHttpRequest|localStorage|navigator\.send|Image\(/)
    expect(full.match(/<script/g)).toHaveLength(1)
  })
})

describe('the catalogue knows every asset', () => {
  // Three pitches went out carrying placeholder URLs because no single file
  // said which addresses were verified. docs/ASSETS.md is that file, and a
  // new asset must not ship without a row in it.
  const catalog = readFileSync('docs/ASSETS.md', 'utf8')

  it('lists every tool and both guide pages, with a live URL', () => {
    for (const t of TOOLS) {
      expect(catalog, t.slug).toContain(`https://joinniyyah.com/tools/${t.slug}`)
    }
    expect(catalog).toContain(`https://joinniyyah.com${GUIDE.path}`)
    expect(catalog).toContain(`https://joinniyyah.com${GUIDE.samplePath}`)
  })
})

describe('what the build is wired to do', () => {
  it('writes the guide and the sample from the final bundle, and lists both pages', () => {
    const vite = readFileSync('vite.config.ts', 'utf8')
    expect(vite).toContain("from './src/lib/guidePages.js'")
    expect(vite).toContain('GUIDE.path, GUIDE.samplePath]')
    expect(vite).toContain('[GUIDE.path, guideHtml]')
    expect(vite).toContain('[GUIDE.samplePath, sampleHtml]')
  })
})
