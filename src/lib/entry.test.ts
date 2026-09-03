import { describe, expect, it } from 'vitest'
import { entryFromUrl } from './entry'

describe('links into Niyyah', () => {
  it('recognises each kind and cleans the code', () => {
    expect(entryFromUrl('?map=acd-efg')).toEqual({ kind: 'map', code: 'ACDEFG' })
    expect(entryFromUrl('?couple=hjkmnp')).toEqual({ kind: 'couple', code: 'HJKMNP' })
    expect(entryFromUrl('?vouch= qrt wxy ')).toEqual({ kind: 'vouch', code: 'QRTWXY' })
  })
  it('ignores everything else', () => {
    expect(entryFromUrl('')).toBeNull()
    expect(entryFromUrl('?demo')).toBeNull()
    expect(entryFromUrl('?couple=')).toBeNull()
    expect(entryFromUrl('?couple=---')).toBeNull()
  })
  it('takes the first kind present when a link is mangled into two', () => {
    expect(entryFromUrl('?map=ACDEFG&couple=HJKMNP')?.kind).toBe('map')
  })
})
