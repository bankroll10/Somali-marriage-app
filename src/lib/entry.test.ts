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
  })

  describe('what kind of link it was', () => {
    it('rides along with any kind, and never names a person', () => {
      expect(entryFromUrl('?eleven&via=eleven')).toEqual({ kind: 'eleven', via: 'eleven' })
      expect(entryFromUrl('?couple=HJKMNP&via=couple')).toEqual({ kind: 'couple', code: 'HJKMNP', via: 'couple' })
      expect(entryFromUrl('?read&via=door')).toEqual({ kind: 'read', via: 'door' })
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
