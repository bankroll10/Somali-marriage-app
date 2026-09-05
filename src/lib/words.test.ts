import { describe, expect, it } from 'vitest'
import { wordsLink, wordsMessage, type WordsSource } from './words'
import { entryFromUrl } from './entry'

const script = {
  why: 'A person who is serious about you lets you exist in their life.',
  words: 'Does anyone in your life know about me?',
  tells: 'A month is an answer.',
}

describe('the words, as they travel', () => {
  it('carries the words verbatim, the why, and the product as a footnote', () => {
    const m = wordsMessage(script, 'read')
    expect(m.text).toContain('“Does anyone in your life know about me?”')
    expect(m.text).toContain(script.why)
    expect(m.text).not.toContain(script.tells)
    expect(m.text.indexOf('Niyyah')).toBeGreaterThan(m.text.indexOf(script.words))
  })

  it('leaves out the why when there is none — the guide’s words carry only the words', () => {
    const m = wordsMessage({ ...script, why: '' }, 'guide')
    expect(m.text.split('\n\n')).toHaveLength(2)
  })

  it('has no digit and no reward in it', () => {
    for (const source of ['read', 'guide', 'eleven', 'couple', 'family'] as WordsSource[]) {
      const m = wordsMessage(script, source)
      expect(m.text).not.toMatch(/\d/)
      expect(m.text.toLowerCase()).not.toMatch(/invite|reward|unlock|free month|referr/)
    }
  })

  it('lands the recipient on the instrument the words came from', () => {
    const cases: [WordsSource, string, string][] = [
      ['read', 'read', 'words'],
      ['guide', 'read', 'words'],
      ['eleven', 'eleven', 'eleven'],
      ['couple', 'eleven', 'couple'],
      ['family', 'families', 'family'],
    ]
    for (const [source, kind, via] of cases) {
      const url = new URL(wordsLink(source))
      expect(entryFromUrl(url.search), source).toEqual({ kind, via })
    }
  })
})
