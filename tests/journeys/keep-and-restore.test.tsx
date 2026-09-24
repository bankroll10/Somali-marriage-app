// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { seedDemo } from '../../src/lib/demo'
import { Phone, onPhone, reload } from '../support/device'
import { mount, type Mounted } from '../support/render'
import { blobs, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * JOURNEY — she keeps her map, loses her phone, and gets it back.
 *
 * The promise on the keep card is "a short code that brings it back
 * anywhere". Until now it was proved in halves: keep-function.test.ts proved
 * the server stores and returns a snapshot, keep.test.ts that the client
 * sends and adopts one. Nothing proved that a person who presses *Keep this
 * map* on one phone and types what she was shown into another sees her own
 * map again. This does, through the real screens, the real client and the
 * real handler.
 */

/** The map as she reads it: open it from Home and take the words. */
async function readMap(m: Mounted): Promise<string> {
  await m.press(/^Your map/)
  return m.text()
}

beforeEach(() => {
  blobs.reset()
  serve()
})
afterEach(() => {
  reload()
  vi.unstubAllGlobals()
})

describe('keep, then a new phone', () => {
  it('brings back the same map, from the code she was shown', async () => {
    // Her phone: a whole member, kept by pressing the button.
    onPhone(new Phone('hers'))
    seedDemo()
    const first = await mount(<App />)
    expect(first.text()).toContain('Salaam, Hodan.')
    const before = await readMap(first)
    await first.press(/Keep this map/)
    expect(first.text()).toContain('Your map is kept')
    const shown = first.text().match(/Your map is kept.*?([A-Z2-9]{4} [A-Z2-9]{4})/)?.[1]
    expect(shown, 'a code on screen').toBeTruthy()
    first.unmount()

    // A new phone: nothing on it, so Welcome.
    onPhone(new Phone('new'))
    const welcome = await mount(<App />)
    expect(welcome.text()).not.toContain('Hodan')
    await welcome.press(/Already have a code/)
    await welcome.type('Your code', shown!)
    await welcome.press(/^Restore$/)
    welcome.unmount()
    // RestoreMap reloads the page; a reload is a fresh mount on the same phone.
    reload()

    const back = await mount(<App />)
    expect(back.text()).toContain('Salaam, Hodan.')
    // Her map, word for word — not a map, hers. The keep card is the one
    // thing that differs: it now shows the code instead of offering one.
    const strip = (t: string) => t.replace(/(Right now this lives only here|Your map is kept).*$/, '')
    expect(strip(await readMap(back))).toBe(strip(before))
    back.unmount()
  })

  it('says which thing is wrong with a code that opens nothing, and adopts nothing', async () => {
    const phone = onPhone(new Phone('new'))
    const m = await mount(<App />)
    await m.press(/Already have a code/)
    await m.type('Your code', 'CDFG')
    await m.press(/^Restore$/)
    expect(m.text()).toMatch(/A code is 8 characters/)
    await m.type('Your code', 'CDFGHJKM')
    await m.press(/^Restore$/)
    expect(m.text()).toContain('No map is kept under that code')
    // Still her Welcome, and still no code remembered on this phone.
    const held = JSON.parse(phone.storage.get('niyyah.intake.v1') ?? '{}')
    expect(held.answers ?? {}).toEqual({})
    expect(held.identity ?? {}).toEqual({})
    expect(phone.keys().filter((k) => k.startsWith('niyyah.keep'))).toEqual([])
    m.unmount()
  })
})
