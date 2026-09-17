import { describe, expect, it } from 'vitest'
import { entryFromUrl } from './entry'

describe('links into Niyyah', () => {
  it('recognises each coded kind and cleans the code', () => {
    expect(entryFromUrl('?map=acd-efg')).toEqual({ kind: 'map', code: 'ACDEFG' })
    expect(entryFromUrl('?couple=hjkmnp')).toEqual({ kind: 'couple', code: 'HJKMNP' })
    expect(entryFromUrl('?vouch= qrt wxy ')).toEqual({ kind: 'vouch', code: 'QRTWXY' })
  })

  it('opens an instrument with no code at all', () => {
    expect(entryFromUrl('?read')).toEqual({ kind: 'read' })
    expect(entryFromUrl('?read=1')).toEqual({ kind: 'read' })
    expect(entryFromUrl('?eleven')).toEqual({ kind: 'eleven' })
    expect(entryFromUrl('?families')).toEqual({ kind: 'families' })
    expect(entryFromUrl('?door')).toEqual({ kind: 'door' })
  })

  it('ignores everything else', () => {
    expect(entryFromUrl('')).toBeNull()
    expect(entryFromUrl('?demo')).toBeNull()
    expect(entryFromUrl('?fresh')).toBeNull()
    expect(entryFromUrl('?couple=')).toBeNull()
    expect(entryFromUrl('?couple=---')).toBeNull()
  })

  it('takes the first kind present when a link is mangled into two, coded kinds first', () => {
    expect(entryFromUrl('?map=ACDEFG&couple=HJKMNP')?.kind).toBe('map')
    expect(entryFromUrl('?map=ACDEFG&read')?.kind).toBe('map')
    expect(entryFromUrl('?map=ACDEFG&door')?.kind).toBe('map')
  })

  describe('a tool at its own address', () => {
    it('opens the tool the path names, and says who it is about', () => {
      expect(entryFromUrl('', '/tools/is-he-serious')).toEqual({ kind: 'read', about: 'man' })
      expect(entryFromUrl('', '/tools/is-she-serious')).toEqual({ kind: 'read', about: 'woman' })
      expect(entryFromUrl('', '/tools/before-you-say-yes')).toEqual({ kind: 'eleven' })
    })

    it('tolerates the one thing a host adds, and nothing else', () => {
      expect(entryFromUrl('', '/tools/is-he-serious/')).toEqual({ kind: 'read', about: 'man' })
      expect(entryFromUrl('', '/tools/is-he-serious/extra')).toBeNull()
      expect(entryFromUrl('', '/tools/nope')).toBeNull()
      expect(entryFromUrl('', '/tools')).toBeNull()
      expect(entryFromUrl('', '/tools/')).toBeNull()
      expect(entryFromUrl('', '/TOOLS/is-he-serious')).toBeNull()
    })

    it('carries a via like any other link', () => {
      expect(entryFromUrl('?via=group', '/tools/is-she-serious')).toEqual({ kind: 'read', about: 'woman', via: 'group' })
      expect(entryFromUrl('?via=instagram', '/tools/before-you-say-yes')).toEqual({ kind: 'eleven' })
    })

    it('wins over a stray query, because no minted link puts a code on a tool path', () => {
      expect(entryFromUrl('?couple=HJKMNP', '/tools/is-he-serious')).toEqual({ kind: 'read', about: 'man' })
    })

    it('leaves every query-string link exactly as it was', () => {
      expect(entryFromUrl('?read&via=words', '/')).toEqual({ kind: 'read', via: 'words' })
      expect(entryFromUrl('?read&via=words')).toEqual({ kind: 'read', via: 'words' })
      expect(entryFromUrl('', '/')).toBeNull()
    })
  })

  describe('what kind of link it was', () => {
    it('rides along with any kind, and never names a person', () => {
      expect(entryFromUrl('?eleven&via=eleven')).toEqual({ kind: 'eleven', via: 'eleven' })
      expect(entryFromUrl('?couple=HJKMNP&via=couple')).toEqual({ kind: 'couple', code: 'HJKMNP', via: 'couple' })
      expect(entryFromUrl('?read&via=door')).toEqual({ kind: 'read', via: 'door' })
      expect(entryFromUrl('?door&via=group')).toEqual({ kind: 'door', via: 'group' })
    })

    it('drops a via it does not know', () => {
      expect(entryFromUrl('?read&via=instagram')).toEqual({ kind: 'read' })
      expect(entryFromUrl('?read&via=ACDEFG')).toEqual({ kind: 'read' })
    })

    it('is nothing on its own', () => {
      expect(entryFromUrl('?via=words')).toBeNull()
    })
  })
})
