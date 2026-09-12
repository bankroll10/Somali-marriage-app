import { describe, expect, it } from 'vitest'
import { inviteLink, inviteText, type InviteSource } from './invite'

const SOURCES: InviteSource[] = ['profile', 'read', 'beforeYes', 'couple']

describe('the invitation', () => {
  it('never says the sender is looking, or using a marriage product', () => {
    // docs/PRODUCT.md §9: nothing that says "I am looking" gets forwarded, and
    // in this community "I've been using Niyyah" says exactly that.
    for (const source of SOURCES) {
      for (const gender of ['woman', 'man'] as const) {
        const text = inviteText(source, gender)
        expect(text, source).not.toMatch(/I[’']ve been using|I use|I[’']m using|I am using|my map|I[’']m looking/i)
      }
    }
  })

  it('opens the instrument it talks about, and says only what kind of link it is', () => {
    for (const source of SOURCES) {
      const link = inviteLink(source)
      expect(link).toMatch(/\?(read|eleven)&via=(words|eleven|couple)$/)
      expect(link).not.toMatch(/code|map=|name/)
    }
  })
})
