// @vitest-environment happy-dom
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { inviteLink } from '../../src/data/invite'
import { entryFromUrl, VIAS } from '../../src/lib/entry'
import { instrumentLink, toolLink, withVia } from '../../src/lib/links'
import { coupleLink } from '../../src/lib/couple'
import { restoreLink } from '../../src/lib/keep'
import { vouchLink } from '../../src/lib/vouch'
import { wordsLink } from '../../src/lib/words'
import { marriedShares } from '../../src/lib/ending'
import { sheet } from '../support/arbitrary'
import { Phone, onPhone } from '../support/device'
import { mount } from '../support/render'
import { blobs, call, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * INVARIANT — a link opens the thing it was sent for, for the person it was
 * sent to (docs/TESTING.md, docs/LINKS.md).
 *
 * Every link here is built by the product's own builders — the ones the share
 * buttons call — and followed the whole way: the URL is parsed as main.tsx
 * parses it, and the real App is mounted on it. It must land on the
 * instrument the link was for, and a tool path that names who is being read
 * must ask about that person: a man sent `/tools/is-she-serious` is asked
 * about her. The parser was tested; where a parsed link went was not — the
 * kind→screen map in useNiyyah had no test at all.
 */

/** What is on screen, in words only that screen has. */
const LANDS = {
  readChooser: /who are you reading\?/i,
  readAboutHim: /Is he serious\?/,
  readAboutHer: /Is she serious\?/,
  eleven: /Before you say yes/,
  families: /Bringing the families in/,
  door: /The door/,
}

async function landOn(url: string): Promise<string> {
  const u = new URL(url)
  const entry = entryFromUrl(u.search, u.pathname)
  onPhone(new Phone('recipient'))
  const m = await mount(<App entry={entry} />)
  const text = m.text()
  m.unmount()
  return text
}

beforeEach(() => {
  blobs.reset()
  serve()
})
afterEach(() => vi.unstubAllGlobals())

describe('every link the product hands out opens its instrument', () => {
  const cases: [string, string, RegExp][] = [
    ['the read, sent with no side known', instrumentLink('read', 'words'), LANDS.readChooser],
    ['a woman’s invite to the read — her friend reads a man', inviteLink('read', 'woman'), LANDS.readAboutHim],
    ['a man’s invite to the read — his friend reads a woman', inviteLink('read', 'man'), LANDS.readAboutHer],
    ['/tools/is-he-serious', toolLink('is-he-serious', 'words'), LANDS.readAboutHim],
    ['/tools/is-she-serious', toolLink('is-she-serious', 'words'), LANDS.readAboutHer],
    ['the eleven, from an invite', inviteLink('beforeYes'), LANDS.eleven],
    ['the eleven, from a couple invite', inviteLink('couple'), LANDS.eleven],
    ['words from the eleven', wordsLink('eleven'), LANDS.eleven],
    ['the families’ words', wordsLink('family'), LANDS.families],
    ['the door, from the door', toolLink('door', 'door'), LANDS.door],
    ['the eleven, shared at the end', marriedShares({ scene: 'twin-cities' }).eleven.url, LANDS.eleven],
    ['the door, shared at the end', marriedShares({ scene: 'twin-cities' }).door.url, LANDS.door],
  ]
  it.each(cases)('%s', async (_what, url, lands) => {
    expect(await landOn(url)).toMatch(lands)
  })

  it('the eleven she sends him opens her sheet, for him to answer', async () => {
    const [hers] = fc.sample(sheet, 1)
    const { code } = await (await call('couple', 'POST', 'couple', { side: 'first', gender: 'woman', states: hers })).json()
    const text = await landOn(withVia(coupleLink(code, 'https://niyyah.test'), 'couple'))
    expect(text).toMatch(LANDS.eleven)
    expect(text).not.toMatch(/isn’t working/)
  })

  it('her family’s link opens the vouch for her map', async () => {
    blobs.put('maps', 'HJKMNPQR', { snapshot: { identity: { firstName: 'Hodan' } }, createdAt: '2026-09-01', expiresAt: '2099-01-01', v: 1 })
    const { token } = await (await call('vouch', 'POST', 'vouch', { side: 'ask', code: 'HJKMNPQR' })).json()
    const text = await landOn(withVia(vouchLink(token, 'https://niyyah.test'), 'family'))
    expect(text).toMatch(/A family request/)
    expect(text).not.toMatch(/isn’t working/)
  })

  it('her restore link names her map, and nothing else', () => {
    const u = new URL(restoreLink('HJKMNPQR', 'https://niyyah.test'))
    expect(entryFromUrl(u.search, u.pathname)).toEqual({ kind: 'map', code: 'HJKMNPQR' })
  })
})

describe('a mangled link never opens something it was not', () => {
  const KEYS = ['map', 'couple', 'vouch', 'read', 'eleven', 'families', 'door', 'via', 'x', 'code']
  const junk = fc.oneof(fc.constant(''), fc.string({ maxLength: 12 }), fc.constantFrom('HJKMNPQR', 'acdefghj', '----', '%00'))
  const query = fc.array(fc.tuple(fc.constantFrom(...KEYS), junk), { maxLength: 5 })

  it('the kind it opens is one the link actually names — and a map only with a code', () => {
    fc.assert(
      fc.property(query, (pairs) => {
        const search = `?${pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`
        const entry = entryFromUrl(search, '/')
        if (!entry) return
        const named = new Set(pairs.map(([k]) => k))
        expect(named.has(entry.kind)).toBe(true)
        if (entry.kind === 'map' || entry.kind === 'couple' || entry.kind === 'vouch') expect(entry.code).toMatch(/^[A-Z0-9]+$/)
        if (entry.via !== undefined) expect(VIAS).toContain(entry.via)
      }),
      { numRuns: 1000 },
    )
  })
})
