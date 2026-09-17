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
      for (const gender of [undefined, 'woman', 'man'] as const) {
        const link = inviteLink(source, gender)
        expect(link, `${source} ${gender}`).toMatch(
          /(\?(read|eleven)&via=(words|eleven|couple)|\/tools\/(is-he-serious|is-she-serious|before-you-say-yes)\?via=(words|eleven))$/,
        )
        expect(link).not.toMatch(/code|map=|name/)
      }
    }
  })

  it('sends a friend the read for her side, at its own address', () => {
    // The side in the path is the friend's — the same side as the sender, as
    // the words already are — and it says nothing about the sender.
    expect(inviteLink('read', 'woman')).toMatch(/\/tools\/is-he-serious\?via=words$/)
    expect(inviteLink('read', 'man')).toMatch(/\/tools\/is-she-serious\?via=words$/)
    expect(inviteLink('profile', 'woman')).toMatch(/\/tools\/is-he-serious\?via=words$/)
    // Without a known side the read asks on arrival, as it always did.
    expect(inviteLink('read')).toMatch(/\?read&via=words$/)
    expect(inviteLink('beforeYes')).toMatch(/\/tools\/before-you-say-yes\?via=eleven$/)
    // From a couple to a couple: the couple's link, unchanged.
    expect(inviteLink('couple')).toMatch(/\?eleven&via=couple$/)
  })
})
