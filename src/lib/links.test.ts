import { describe, expect, it } from 'vitest'
import { entryFromUrl } from './entry'
import { instrumentLink, withVia } from './links'
import { coupleLink } from './couple'
import { restoreLink } from './keep'
import { vouchLink } from './vouch'
import { DEFAULT_SITE_HOST, SITE_HOST, SITE_URL } from './site'

describe('the links this product hands out', () => {
  it('opens an instrument, and says what carried it', () => {
    expect(instrumentLink('read', 'words')).toBe(`${SITE_URL}/?read&via=words`)
    expect(instrumentLink('eleven', 'couple', 'https://x.test')).toBe('https://x.test/?eleven&via=couple')
    expect(instrumentLink('door', 'door')).toBe(`${SITE_URL}/?door&via=door`)
  })

  it('round-trips through the parser', () => {
    const url = new URL(instrumentLink('families', 'family'))
    expect(entryFromUrl(url.search)).toEqual({ kind: 'families', via: 'family' })
  })

  it('keeps a coded link working when a via is attached', () => {
    const couple = new URL(withVia(coupleLink('HJKMNP', SITE_URL), 'couple'))
    expect(entryFromUrl(couple.search)).toEqual({ kind: 'couple', code: 'HJKMNP', via: 'couple' })
    const vouch = new URL(withVia(vouchLink('ACDEFG', SITE_URL), 'family'))
    expect(entryFromUrl(vouch.search)).toEqual({ kind: 'vouch', code: 'ACDEFG', via: 'family' })
  })

  it('never carries a person', () => {
    for (const url of [instrumentLink('read', 'door'), withVia(coupleLink('HJKMNP', SITE_URL), 'couple')]) {
      expect(url).not.toMatch(/install|from=|ref=|by=/)
    }
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
    expect(vouchLink('ACDEFGHJ', SITE_URL)).toBe(`${SITE_URL}/?vouch=ACDEFGHJ`)
    expect(instrumentLink('eleven', 'words')).toContain(SITE_URL)
  })

})
