// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { seedDemo } from '../../src/lib/demo'
import { toolLink } from '../../src/lib/links'
import { entryFromUrl } from '../../src/lib/entry'
import { readQuestions } from '../../src/data/read'
import { buildRead } from '../../src/lib/read'
import { Phone, onPhone, reload } from '../support/device'
import { mount } from '../support/render'
import { blobs, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * DRILL — Netlify is down (docs/RECOVERY.md).
 *
 * Every function and every store unreachable, from the first tap. The claim
 * this product makes for that day is local-first: what a member does lives on
 * her phone, so an outage costs her the things that need a server — keeping a
 * map, the door, the eleven on two phones — and nothing she has. Here it is
 * walked: a stranger takes a whole read, and a member opens her space and
 * tries to keep her map, with nothing on the other end.
 */

let server: Served
beforeEach(() => {
  blobs.reset()
  server = serve()
  server.down(true)
})
afterEach(() => {
  reload()
  vi.unstubAllGlobals()
})

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

describe('with Netlify down from the first tap', () => {
  it('a stranger takes a whole read, gets her result, and keeps it on her phone', async () => {
    const phone = onPhone(new Phone('stranger'))
    const u = new URL(toolLink('is-he-serious', 'words'))
    const m = await mount(<App entry={entryFromUrl(u.search, u.pathname)} />)
    await m.press('Start the read')
    const want: Record<string, string> = {}
    for (const q of readQuestions('woman')) {
      want[q.id] = q.options[0].id
      await m.press(new RegExp(`^${esc(q.options[0].label)}`))
    }
    expect(m.text()).toContain(buildRead(want, 'woman')!.headline)
    await m.until(() => JSON.parse(phone.storage.get('niyyah.intake.v1') ?? '{}').read, 'the read is saved on her phone')
    m.unmount()
  })

  it('a member opens her space as it was, and keeping her map fails honestly, losing nothing', async () => {
    const phone = onPhone(new Phone('hers'))
    seedDemo()
    const before = phone.storage.get('niyyah.intake.v1')
    const m = await mount(<App />)
    expect(m.text()).toContain('Salaam, Hodan.')
    await m.press(/^Your map/)
    await m.press(/Keep this map/)
    expect(m.text()).toMatch(/That didn’t save — nothing is lost/)
    // Her map is on her phone exactly as it was, and no code was invented.
    // (The first keep's once key stays until a keep succeeds, so the retry
    // below is the same first keep, never a second map — docs/INTEGRITY.md.)
    expect(JSON.parse(phone.storage.get('niyyah.intake.v1')!).answers).toEqual(JSON.parse(before!).answers)
    expect(phone.storage.has('niyyah.keep.code.v1')).toBe(false)
    m.unmount()

    // Netlify comes back: the same tap works, with no repair on her side.
    server.down(false)
    reload()
    const again = await mount(<App />)
    await again.press(/^Your map/)
    await again.press(/Keep this map/)
    expect(again.text()).toContain('Your map is kept')
    again.unmount()
  })
})
