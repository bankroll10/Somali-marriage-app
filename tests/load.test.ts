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

  it('still names all six exceptions it promises', () => {
    // The screen says "Six things can change that". These are the six.
    for (const summary of [
      'Keeping your map',
      'Joining the founding cohort',
      'Asking {him} to do the eleven too',
      'Asking your family to vouch',
      'Being counted in the ladder',
      'The Guide',
    ]) {
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
      'the founder’s\n                backup deliberately does not include it',
      'a breakdown that would come back as one or two comes back blank instead',
      'That copy is the one thing\n                Forget me cannot reach on its own',
      'never how far you got, never how long you spent',
      'It goes to Claude, made by Anthropic',
      'the whole thing expires after ninety days',
    ]) {
      expect(trust.includes(clause), `Trust lost: ${clause.slice(0, 48)}…`).toBe(true)
    }
  })

  it('carries at least as much prose as it did before it was collapsed', () => {
    // 2,366 rendered words on 2026-09-18, measured in Chromium at 400px
    // (docs/LOAD.md). Counted here on the JSX text, which is a different and
    // rougher number — so the floor is deliberately well under it. It exists
    // to catch a deletion, not to police an edit.
    const prose = trust
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/className=(\{`[^`]*`\}|"[^"]*"|\{[^}]*\})/g, ' ')
      .replace(/<[^>]*>/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
    expect(prose.length).toBeGreaterThan(1800)
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
