import { describe, expect, it } from 'vitest'
import { entryFromUrl, pathFor } from './entry'
import { instrumentLink, toolLink, withVia } from './links'
import { coupleLink } from './couple'
import { restoreLink } from './keep'
import { DEFAULT_SITE_HOST, SITE_HOST, SITE_URL } from './site'

describe('the links this product hands out', () => {
  it('opens an instrument, and says what carried it', () => {
    expect(instrumentLink('read', 'words')).toBe(`${SITE_URL}/?read&via=words`)
    expect(instrumentLink('eleven', 'couple', 'https://x.test')).toBe('https://x.test/?eleven&via=couple')
  })

  it('round-trips through the parser', () => {
    const url = new URL(instrumentLink('families', 'family'))
    expect(entryFromUrl(url.search)).toEqual({ kind: 'families', via: 'family' })
  })

  it('keeps a coded link working when a via is attached', () => {
    const couple = new URL(withVia(coupleLink('HJKMNP', SITE_URL), 'couple'))
    expect(entryFromUrl(couple.search)).toEqual({ kind: 'couple', code: 'HJKMNP', via: 'couple' })
  })

  it('never carries a person', () => {
    for (const url of [
      instrumentLink('read', 'words'),
      withVia(coupleLink('HJKMNP', SITE_URL), 'couple'),
      toolLink('is-he-serious', 'words'),
      toolLink('before-you-say-yes', 'eleven'),
      toolLink('families', 'family'),
    ]) {
      expect(url).not.toMatch(/install|from=|ref=|by=|code|answer|name/)
    }
  })

  describe('a tool at its own address', () => {
    it('is the path and what carried it, nothing more', () => {
      expect(toolLink('is-he-serious', 'words')).toBe(`${SITE_URL}/tools/is-he-serious?via=words`)
      expect(toolLink('is-she-serious', 'words', 'https://x.test')).toBe('https://x.test/tools/is-she-serious?via=words')
      expect(toolLink('before-you-say-yes', 'eleven')).toBe(`${SITE_URL}/tools/before-you-say-yes?via=eleven`)
    })

    it('round-trips through the parser, side included', () => {
      const url = new URL(toolLink('is-she-serious', 'words'))
      expect(entryFromUrl(url.search, url.pathname)).toEqual({ kind: 'read', about: 'woman', via: 'words' })
    })

    it('is what the address bar shows while the tool is open, and only then', () => {
      expect(pathFor('read', 'woman', '/')).toBe('/tools/is-he-serious')
      expect(pathFor('read', 'man', '/')).toBe('/tools/is-she-serious')
      // The reader is not known yet: leave the bar alone rather than guess.
      expect(pathFor('read', undefined, '/')).toBeUndefined()
      expect(pathFor('beforeYes', undefined, '/')).toBe('/tools/before-you-say-yes')
      // Leaving a tool returns the bar to the root — and any other screen
      // change, anywhere else in the app, touches nothing.
      expect(pathFor('home', 'woman', '/tools/is-he-serious')).toBe('/')
      expect(pathFor('home', 'woman', '/')).toBeUndefined()
      expect(pathFor('coach', undefined, '/')).toBeUndefined()
    })

    it('the family words have one slug, and no chooser to wait on', () => {
      expect(toolLink('families', 'family')).toBe(`${SITE_URL}/tools/families?via=family`)
      const families = new URL(toolLink('families', 'family'))
      expect(entryFromUrl(families.search, families.pathname)).toEqual({ kind: 'families', via: 'family' })
      expect(pathFor('families', undefined, '/')).toBe('/tools/families')
      expect(pathFor('home', undefined, '/tools/families')).toBe('/')
    })
  })
})

describe('the host is a setting, not a literal', () => {
  it('every link a person sends is built from one place, so a domain change is one variable', () => {
    // The default is today's host; VITE_SITE_HOST replaces it everywhere at once.
    expect(SITE_URL).toBe(`https://${SITE_HOST}`)
    expect(SITE_HOST).toBe(import.meta.env.VITE_SITE_HOST || DEFAULT_SITE_HOST)
    // Every builder that mints a link for someone else reads it.
    expect(restoreLink('ACDEFG', SITE_URL)).toBe(`${SITE_URL}/?map=ACDEFG`)
    expect(coupleLink('ACDEFG', SITE_URL)).toBe(`${SITE_URL}/?couple=ACDEFG`)
    expect(instrumentLink('eleven', 'words')).toContain(SITE_URL)
  })

})
