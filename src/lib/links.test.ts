import { describe, expect, it } from 'vitest'
import { entryFromUrl } from './entry'
import { instrumentLink, withVia } from './links'
import { coupleLink } from './couple'
import { vouchLink } from './vouch'
import { SITE_URL } from './site'

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
    const vouch = new URL(withVia(vouchLink('ACDEFG', SITE_URL), 'family'))
    expect(entryFromUrl(vouch.search)).toEqual({ kind: 'vouch', code: 'ACDEFG', via: 'family' })
  })

  it('never carries a person', () => {
    for (const url of [instrumentLink('read', 'door'), withVia(coupleLink('HJKMNP', SITE_URL), 'couple')]) {
      expect(url).not.toMatch(/install|from=|ref=|by=/)
    }
  })
})
