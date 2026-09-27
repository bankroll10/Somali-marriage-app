// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { seedDemo } from '../../src/lib/demo'
import { day } from '../../netlify/shared/day'
import { Phone, onPhone, reload } from '../support/device'
import { mount, type Mounted } from '../support/render'
import { residue } from '../support/residue'
import { blobs, serve, type Served } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * JOURNEY — the two doors (docs/DECISIONS.md Part 22).
 *
 * A stranger on Welcome is looking for someone serious. She walks through the
 * first door, puts her name down, and is told it is down only once the
 * server has it — with exactly the six things the screen says, under a code
 * her phone keeps, and nothing about her anywhere else: not the ladder, not a
 * map, not the phone's saved state. With the server gone, she is told the
 * truth and her words stay in the form. She can take her name off from the
 * same screen. And the second door lands on each of the three instruments
 * built for someone already talking to a person.
 */

const CONTACT = 'zq.sagal.looking@example.test'
const INTRO_KEY = 'niyyah.intro.v1'

let server: Served
beforeEach(() => {
  blobs.reset()
  server = serve()
})
afterEach(() => {
  reload()
  vi.unstubAllGlobals()
})

/** Through the first door, and the form filled in — everything but the button. */
async function fillIn(m: Mounted) {
  await m.press(/I’m looking for someone serious/)
  expect(m.text()).toContain('Put my name down')
  await m.press(/^I am a woman/)
  await m.press(/^Minneapolis/)
  await m.press(/^Anywhere in the US/)
  await m.type('Your first name', 'Sagal')
  await m.type('Email or phone', CONTACT)
  await m.press(/I confirm I am 18/)
}

describe('looking for someone', () => {
  it('her name is down only once the server has it, with what the screen says and nothing else about her', async () => {
    const phone = onPhone(new Phone('hers'))
    const m = await mount(<App />)
    // Both doors, in her words, before anything else.
    expect(m.text()).toContain('I’m looking for someone serious.')
    expect(m.text()).toContain('I’m already talking to someone.')
    await fillIn(m)
    // Filling the form sends nothing.
    expect(blobs.keys('introductions')).toEqual([])
    expect(m.text()).not.toContain('Your name is down')

    await m.press(/^Put my name down/)
    await m.until(() => m.text().includes('Your name is down.'), 'the server said saved')

    // Exactly the six fields, under a minted code.
    const codes = blobs.keys('introductions')
    expect(codes).toHaveLength(1)
    expect(blobs.read('introductions', codes[0])).toEqual({
      contact: CONTACT,
      firstName: 'Sagal',
      gender: 'woman',
      scene: 'twin-cities',
      country: 'us',
      reach: 'country',
      at: day(),
      v: 1,
    })
    // Her phone holds the code and the day — never the contact.
    expect(JSON.parse(phone.storage.get(INTRO_KEY)!)).toEqual({ code: codes[0], at: day() })
    // And the way to reach her is nowhere else: not on the ladder, not in a map, not in her saved state.
    expect(residue([CONTACT], [phone]).filter((l) => !l.startsWith('introductions:'))).toEqual([])
    for (const k of blobs.keys('progress')) expect(JSON.stringify(blobs.read('progress', k))).not.toMatch(/intro|looking|Sagal/)
    // What she told the form, the rest of the app knows: no second asking.
    const identity = () => JSON.parse(phone.storage.get('niyyah.intake.v1') ?? '{}').identity as Record<string, unknown> | undefined
    await m.until(() => identity()?.gender === 'woman', 'her side saved')
    expect(identity()).toMatchObject({ gender: 'woman', scene: 'twin-cities', firstName: 'Sagal', adult: true })
    // The screen says what happens now, and promises nothing it cannot do.
    const said = m.text()
    expect(said).toContain('before you say yes')
    expect(said).not.toMatch(/we will (write|find)|you will hear|opens on|your city opens/i)
    m.unmount()
  })

  it('with the server gone, she is told the truth, nothing is saved, and her words stay in the form', async () => {
    const phone = onPhone(new Phone('hers'))
    const m = await mount(<App />)
    await fillIn(m)
    server.down(/introduce/)
    await m.press(/^Put my name down/)
    await m.until(() => m.text().includes('did not reach us'), 'told it did not go through')
    expect(m.text()).not.toContain('Your name is down')
    expect(blobs.keys('introductions')).toEqual([])
    expect(phone.storage.has(INTRO_KEY)).toBe(false)
    expect((m.container.querySelector('#looking-contact') as HTMLInputElement).value).toBe(CONTACT)
    // The server back, the same tap saves it.
    server.down(false)
    await m.press(/^Put my name down/)
    await m.until(() => m.text().includes('Your name is down.'), 'saved on the retry')
    expect(blobs.keys('introductions')).toHaveLength(1)
    m.unmount()
  })

  it('she can take her name off from the same screen, and then nothing of hers is held there', async () => {
    const phone = onPhone(new Phone('hers'))
    const m = await mount(<App />)
    await fillIn(m)
    await m.press(/^Put my name down/)
    await m.until(() => m.text().includes('Your name is down.'), 'saved')
    await m.press(/^Take my name off/)
    await m.until(() => m.text().includes('Your name is off the list'), 'taken off')
    expect(blobs.keys('introductions')).toEqual([])
    expect(phone.storage.has(INTRO_KEY)).toBe(false)
    expect(residue([CONTACT], [phone])).toEqual([])
    m.unmount()
  })

  it('a member with a Home finds the list from Home, and Home says when her name is down', async () => {
    const phone = onPhone(new Phone('hers'))
    seedDemo()
    const home = await mount(<App />)
    expect(home.text()).toContain('Looking for someone serious?')
    await home.press(/^Looking for someone serious\?/)
    expect(home.text()).toContain('Put my name down')
    home.unmount()
    reload()
    phone.storage.set(INTRO_KEY, JSON.stringify({ code: 'HJKMNPQR', at: '2026-09-27' }))
    const again = await mount(<App />)
    expect(again.text()).toContain('Your name is down for an introduction')
    expect(again.text()).not.toContain('Looking for someone serious?')
    again.unmount()
  })
})

describe('already talking to someone', () => {
  const doors: [RegExp, RegExp][] = [
    [/^I can’t tell what they mean yet/, /Are they serious\?/],
    [/^We’re getting serious/, /Before you say yes/],
    [/^The families are coming in/, /Bringing the families in/],
  ]

  it.each(doors)('%s lands on its instrument', async (door, lands) => {
    onPhone(new Phone('theirs'))
    const m = await mount(<App />)
    await m.press(/I’m already talking to someone/)
    expect(m.text()).toContain('Where are you with it?')
    await m.press(door)
    expect(m.text()).toMatch(lands)
    m.unmount()
  })

  it('and the other door is one tap away from each', async () => {
    onPhone(new Phone('theirs'))
    const m = await mount(<App />)
    await m.press(/I’m already talking to someone/)
    await m.press(/Put your name down for an introduction/)
    expect(m.text()).toContain('Put my name down')
    await m.press(/Start there instead/)
    expect(m.text()).toContain('Where are you with it?')
    m.unmount()
  })
})
