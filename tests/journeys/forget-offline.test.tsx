// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { seedDemo } from '../../src/lib/demo'
import { Phone, onPhone, reload } from '../support/device'
import { mount } from '../support/render'
import { residue } from '../support/residue'
import { blobs, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * JOURNEY — she taps Forget me while the server cannot be reached, and it
 * still finishes.
 *
 * The one control that makes every privacy sentence enforceable, on the one
 * path where it used to fail silently: the phone was wiped, the retry had no
 * code left to send, and her map stayed on the server for a year
 * (docs/INTEGRITY.md). Here, through the real screens: she keeps her map,
 * opens Trust from her profile, and forgets while the network is down. Trust
 * must say what is still held and show her the code to write in with; her
 * phone must keep nothing but that; and the next time Niyyah opens with the
 * network back, the delete must land on its own — nothing of hers left on the
 * server or the phone but the tombstone that says the code is closed.
 */

let server: Served
beforeEach(() => {
  blobs.reset()
  server = serve()
})
afterEach(() => {
  reload()
  vi.unstubAllGlobals()
})

const PENDING = 'niyyah.forget.pending.v1'

describe('forget me, with the server down', () => {
  it('names the code, keeps only it, and finishes the next time Niyyah opens', async () => {
    const phone = onPhone(new Phone('hers'))
    seedDemo()

    // Keep the map, the way she would.
    const home = await mount(<App />)
    await home.press(/^Your map/)
    await home.press(/Keep this map/)
    const code = home.text().match(/Your map is kept.*?([A-Z2-9]{4}) ([A-Z2-9]{4})/)!.slice(1).join('')
    await home.until(() => phone.storage.get('niyyah.intake.v1')?.includes('Hodan'), 'her map saved')
    home.unmount()
    reload()
    expect(blobs.read('maps', code), 'kept on the server').not.toBeNull()

    // Trust, from Home. Then the network goes.
    const m = await mount(<App />)
    await m.press(/^Your privacy/)
    expect(m.text()).toContain('Forget me')
    server.down(true)
    await m.press(/^Forget me$/)
    await m.press('Yes, delete everything')

    // Trust says what is still held, and shows the code to write in with.
    const said = m.text()
    expect(said).toContain('This phone is cleared.')
    expect(said).toContain('your kept map')
    expect(said).toContain(`with the code ${code}`)
    // The phone keeps the codes it needs to finish, and nothing of hers.
    expect(phone.storage.has(PENDING)).toBe(true)
    expect(residue(['Hodan'], [phone]).filter((l) => l.startsWith('phone'))).toEqual([])
    // The page is not replaced on this path, so the app is still holding
    // everything it just erased — and its autosave used to write it all back
    // on the next change to anything (docs/FAIL.md). Change something, wait
    // past the autosave, and look again.
    await m.press(/^Keep the Guide on this device/)
    await new Promise((r) => setTimeout(r, 400))
    expect(residue(['Hodan', code], [phone]).filter((l) => l.startsWith('phone') && !l.includes(PENDING))).toEqual([])
    m.unmount()
    reload()

    // The next time Niyyah opens, with the network back.
    server.down(false)
    const next = await mount(<App />)
    await next.until(() => !phone.storage.has(PENDING), 'the pending forget is sent')
    expect(next.text()).not.toContain('Hodan')
    next.unmount()

    // Nothing of hers anywhere but the tombstone that closes her code.
    const left = residue([code, 'Hodan'], [phone]).filter((line) => !line.startsWith(`maps:ended/${code} `))
    expect(left).toEqual([])
    expect(blobs.read('maps', `ended/${code}`)).toMatchObject({ why: 'forgotten' })
  })
})
