import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LEXICON, terms, type TermId } from '../src/data/lexicon'

/**
 * Progressive disclosure, held honest.
 *
 * The cognitive-load pass (docs/LOAD.md) moved a great deal of prose behind
 * `<Disclose>` rows. That is only an improvement while the prose is still
 * *there* — a collapse is one refactor away from a deletion, and the deletion
 * would be invisible on screen, because a closed row looks the same whether it
 * holds nine paragraphs or none.
 *
 * So two floors. The lexicon has to cover every word a screen claims to
 * define, and Trust's six disclosures have to keep holding what they were
 * given. Neither test cares how the words are arranged; both fail loudly if
 * any of them stop existing.
 */

const COMPONENTS = join(import.meta.dirname, '..', 'src', 'components')
const files = readdirSync(COMPONENTS).filter((f) => f.endsWith('.tsx'))
const source = new Map(files.map((f) => [f, readFileSync(join(COMPONENTS, f), 'utf8')]))

describe('the lexicon', () => {
  it('has a unique id for every term', () => {
    const ids = LEXICON.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('defines every id a screen asks <Words> for', () => {
    const known = new Set<string>(LEXICON.map((t) => t.id))
    const asked: string[] = []
    for (const [, src] of source) {
      for (const m of src.matchAll(/<Words\s+ids=\{\[([^\]]*)\]\}/g)) {
        for (const raw of m[1].split(',')) {
          const id = raw.trim().replace(/^['"]|['"]$/g, '')
          if (id) asked.push(id)
        }
      }
    }
    // The point of the module: no screen can name a word it cannot define.
    expect(asked.length).toBeGreaterThan(0)
    for (const id of asked) expect(known, `<Words> asks for "${id}"`).toContain(id)
  })

  it('defines only words the product actually says', () => {
    // A definition for a word nobody uses is clutter; this is the other half
    // of the rule in src/data/lexicon.ts.
    const copy = [...source.values()].join('\n').toLowerCase()
    for (const t of LEXICON) {
      const head = t.term.toLowerCase().split(/[,\s]+/).filter((w) => w.length > 3)[0] ?? t.term.toLowerCase()
      expect(copy, `nothing says "${t.term}"`).toContain(head)
    }
  })

  it('returns the terms a screen asks for, in order, dropping nothing known', () => {
    const ids: TermId[] = ['eleven', 'map', 'read']
    expect(terms(ids).map((t) => t.id)).toEqual(ids)
  })
})

describe('Trust keeps what it collapsed', () => {
  const trust = source.get('Trust.tsx') ?? ''

  // The screen says "Six things can change that". These are the six.
  const SIX = [
    'Keeping your map',
    'Asking to be counted',
    'Asking {him} to do the eleven too',
    'Asking your family to vouch',
    'The steps you reach',
    'The Guide',
  ]

  it('still names all six exceptions it promises', () => {
    for (const summary of SIX) {
      // Either form: a plain label, or one resolved through speak() for
      // whoever is reading — the pronoun in "Asking {him}" is theirs.
      const plain = trust.includes(`summary="${summary}"`)
      const spoken = trust.includes(`summary={fix('${summary}')}`)
      expect(plain || spoken, `Trust no longer discloses "${summary}"`).toBe(true)
    }
  })

  it('still holds the sentences that were the hardest to say', () => {
    // One clause from each of the two paragraphs that were 562 and 536 words,
    // plus the three that a person is most entitled to find. If a later
    // refactor empties a disclosure, this is what notices.
    for (const clause of [
      'the founder’s\n                backup does not include it',
      'a breakdown that would come back as one or two comes back blank instead',
      'never how far you got, never how long you spent',
      'It goes to Claude, made by Anthropic',
      'the whole thing expires after ninety days',
    ]) {
      expect(trust.includes(clause), `Trust lost: ${clause.slice(0, 48)}…`).toBe(true)
    }
  })

  it('gets shorter as the product holds less — the promise moves with the data (docs/PRIVACY.md)', () => {
    // Privacy by Design: minimize, then say less. The second copy of the
    // contact at the form service took a paragraph here and a clause in "the
    // two things it cannot reach"; once the form stopped carrying it, both
    // went. 2,176 words before that pass. A new disclosure should come from a
    // new collection, and the first question about a new collection is whether
    // the product can do without it.
    const body = trust.slice(trust.indexOf('return (', trust.indexOf('export default function Trust')))
    const visible = body
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ')
      .replace(/className=(\{[^}]*\}|"[^"]*")/g, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/[{}()]/g, ' ')
      .replace(/\s+/g, ' ')
    const words = visible.split(' ').filter((w) => /[A-Za-z’']/.test(w)).length
    // 2,050 until 2026-09-24, when the crash count began to leave the phone
    // (src/lib/crash.ts) and Trust said so in one clause: a new collection,
    // a new disclosure, and the budget raised by exactly its words.
    expect(words).toBeLessThanOrEqual(2_060)
    expect(visible).not.toMatch(/form service|second copy/)
    expect(visible).not.toMatch(/nothing that leads back to you|no one at Niyyah can read them/)
  })

  it('keeps a real account behind every one of the six rows', () => {
    // Until 2026-09-20 this was a floor of 1,800 words on the whole file,
    // set when the collapse promised "no word deleted" (docs/LOAD.md). The
    // voice pass (docs/VOICE.md) cut what Trust said twice, so the floor
    // moved to where the risk is: each of the six rows must still hold an
    // account of its own, not a heading over nothing. Sixty words is under
    // half of the shortest row today.
    const rows = [...trust.matchAll(/<Disclose summary=(?:"([^"]*)"|\{fix\('([^']*)'\)\})[^>]*>([\s\S]*?)<\/Disclose>/g)]
      .map(([, plain, spoken, inner]) => ({ summary: plain ?? spoken, inner }))
      .filter(({ summary }) => SIX.includes(summary))
    expect(rows.map((r) => r.summary).sort()).toEqual([...SIX].sort())
    for (const { summary, inner } of rows) {
      const words = inner
        .replace(/className=(\{[^}]*\}|"[^"]*")/g, ' ')
        .replace(/<[^>]*>/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
      expect(words.length, `"${summary}" has thinned to ${words.length} words`).toBeGreaterThan(60)
    }
  })
})

describe('the disclosure primitive', () => {
  const ui = source.get('ui.tsx') ?? ''

  it('is the only place a details element is hand-rolled', () => {
    // Read.tsx had two by hand with slightly different chevron plumbing; one
    // primitive is what keeps the affordance identical on every screen.
    for (const [name, src] of source) {
      if (name === 'ui.tsx') continue
      expect(src.includes('<details'), `${name} hand-rolls a <details>`).toBe(false)
    }
    expect(ui).toContain('<details')
  })

  it('strips the native marker and rotates a chevron, because a phone has no hover', () => {
    expect(ui).toContain('[&::-webkit-details-marker]:hidden')
    expect(ui).toContain('group-open/d:rotate-90')
  })
})
