import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CRITERIA, FIRMNESS } from '../../src/prototype/match/criteria'
import { BANNED } from '../voice-rules'
import { PROTOTYPE, ROOT, codeLines, walk } from './support'

/**
 * COPY — what the matching prototype says, held to the product's voice and to
 * the promises it must not make (docs/MATCH-PROTOTYPE.md).
 *
 * The product's voice list applies here as it does to the app. The rest is this
 * prototype's own: no number that reads as a compatibility, no word that makes
 * the list a feed or a deck, nothing that claims a person reviewed, removed or
 * deleted anything, and nothing that invites real details.
 */

const files = walk(join(ROOT, PROTOTYPE), /\.tsx?$/)

const SCORE_WORDS: [RegExp, string][] = [
  [/\d\s?%|\bpercent\b/i, 'a percentage'],
  [/compatib/i, 'compatibility'],
  [/\bswip(e|ing)\b|\bfeed\b|\bdeck\b|\bleaderboard\b/i, 'a feed, a deck or a swipe'],
  [/soulmate|perfect match|best match|top match|\bmatch score\b|\b\d+\s+matches\b|likes you|who liked/i, 'a match claim'],
  [/\bscor(e|ed|ing)\b|\branking?\b|\branked\b/i, 'a score or ranking, except in the one sentence that denies it'],
]
const DENIES_SCORE = /There is no score and no ranking|no score|nobody is ranked|not ranked/i

const PROMISES: [RegExp, string][] = [
  [/we will (review|remove|delete|investigate|ban|act)/i, 'a promise of moderation'],
  [/has been (reviewed|removed|deleted|escalated|reported to)/i, 'a claim of moderation'],
  [/\bmoderators?\b|\bour (team|staff|support)\b|\btrust (and|&) safety\b/i, 'someone behind it'],
  [/permanently deleted|erased from our/i, 'a deletion claim'],
  [/type real answers|use your real|your real (name|photo|details)/i, 'an invitation to real details'],
  [/founder|made by hand|speaks? with you first|introduction pilot|Meet someone serious/i, 'the retired founder-led promise (release R3)'],
]

function scan(rules: [RegExp, string][], allow?: RegExp) {
  const found: string[] = []
  for (const f of files) {
    for (const { n, line } of codeLines(readFileSync(f, 'utf8'))) {
      for (const [re, why] of rules) if (re.test(line) && !(allow && allow.test(line))) found.push(`${f.slice(ROOT.length + 1)}:${n} (${why}): ${line.trim().slice(0, 110)}`)
    }
  }
  return found
}

describe('the prototype’s copy', () => {
  it('keeps to the product’s voice', () => {
    expect(scan(BANNED)).toEqual([])
  })

  it('has no score, percentage, feed or match claim', () => {
    // `no score` is the sentence that says there is none; it may name the word.
    expect(scan(SCORE_WORDS, DENIES_SCORE)).toEqual([])
  })

  it('claims no moderation, deletion or person behind it, and does not invite real details', () => {
    expect(scan(PROMISES)).toEqual([])
  })

  it('says “saved” only in the banner that says nothing is', () => {
    expect(scan([[/\bsaved\b|\bsaving\b/i, 'durable saving']], /saved or sent/)).toEqual([])
  })

  it('draws the Prototype fixture label in one component, and fixed text is read only through it', () => {
    const labelled = files.filter((f) => /Prototype fixture/.test(readFileSync(f, 'utf8'))).map((f) => f.slice(ROOT.length + 1))
    // The component, and the notes page that explains the label.
    expect(labelled.sort()).toEqual([`${PROTOTYPE}/Fixture.tsx`, `${PROTOTYPE}/screens/Notes.tsx`].sort())
    const readers = files.filter((f) => /\.text\.(summary|questions)/.test(readFileSync(f, 'utf8')))
    expect(readers.map((f) => f.slice(ROOT.length + 1))).toEqual([`${PROTOTYPE}/screens/Browse.tsx`])
    // And in that file, only inside the block that carries the label.
    const browse = readFileSync(readers[0], 'utf8')
    expect([...browse.matchAll(/<FixtureBlock/g)]).toHaveLength(1)
    expect(browse).not.toMatch(/pairTextFor|PAIR_TEXT/)
  })

  it('never reads a pair text for a person without going through the scenario check', () => {
    const users = files.filter((f) => /pairTextFor|PAIR_TEXT/.test(readFileSync(f, 'utf8'))).map((f) => f.slice(ROOT.length + 1))
    expect(users.sort()).toEqual([`${PROTOTYPE}/fixtures.ts`, `${PROTOTYPE}/suggest.ts`].sort())
  })
  // MATCH-03: a partner-side answer says so, and says the same thing as the option it stands for.
  it('words the partner side as “a partner”, and leaves the options, their order and the first-person answers as they were', () => {
    // The ids and their order carry the meaning and the eligibility rules; the first-person labels are the person’s own answer.
    expect(CRITERIA.map((c) => [c.id, c.options.map((o) => [o.id, o.label])])).toEqual([
      ['timeline', [['t-year', 'Within a year'], ['t-two', 'In one to two years'], ['t-later', 'Later than that'], ['t-unsure', 'I am not sure yet']]],
      ['children', [['c-want', 'I want children'], ['c-open', 'I am open to them, and would decide together'], ['c-none', 'I do not want children']]],
      ['practice', [['p-steady', 'Prayer is steady and central to my days'], ['p-build', 'I am building the habit'], ['p-occasional', 'I practise occasionally']]],
      ['city', [['mpls', 'Minneapolis–St. Paul'], ['london', 'London'], ['toronto', 'Toronto']]],
      ['work', [['w-work', 'I plan to work'], ['w-either', 'I am open to either'], ['w-home', 'I plan to be at home']]],
      ['household', [['h-own', 'Our own home'], ['h-open', 'Open to living with family for a time'], ['h-family', 'With family']]],
    ])
    for (const c of CRITERIA) {
      for (const o of c.options) {
        expect(o.partner, `${c.id}/${o.id}`).toMatch(/^A partner (who|whose) /)
        expect(o.partner).not.toMatch(/\b(I|my|me)\b/)
        expect(o.partner).not.toBe(o.label)
      }
      expect(new Set(c.options.map((o) => o.partner)).size).toBe(c.options.length)
    }
    // The wording the founder approved, word for word, where it was adjusted.
    const partner = (id: string, option: string) => CRITERIA.find((c) => c.id === id)!.options.find((o) => o.id === option)!.partner
    expect(partner('timeline', 't-later')).toBe('A partner who wants to marry more than two years from now')
    expect(partner('work', 'w-either')).toBe('A partner who is open to working or staying at home')
    expect(partner('practice', 'p-build')).toBe('A partner who is building the habit of prayer')
  })

  it('defines each firmness once, in full and in short, and says nothing that steers toward one', () => {
    expect(FIRMNESS.map((f) => f.id)).toEqual(['requirement', 'preference', 'any'])
    expect(FIRMNESS.find((f) => f.id === 'any')!.short).toBe('Not used for this topic.')
    for (const f of FIRMNESS) {
      expect(f.short.length).toBeLessThan(f.full.length)
      expect(f.short.length).toBeLessThanOrEqual(40)
      expect(`${f.short} ${f.full}`).not.toMatch(/not sure|we suggest|recommend|safer|gentler|best/i)
    }
  })
})
