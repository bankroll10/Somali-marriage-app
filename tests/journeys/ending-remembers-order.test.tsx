// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { seedDemo } from '../../src/lib/demo'
import { Phone, onPhone, reload } from '../support/device'
import { mount } from '../support/render'
import { blobs, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * JOURNEY — a courtship ends, and her phone notes whether a conversation came
 * first. One bit, never a date (docs/DECISIONS.md Part 15): the readout can
 * then tell an ending over something she found after talking from one that
 * came before any conversation here.
 */

const KEY = 'niyyah.intake.v1'
const saved = (p: Phone) => JSON.parse(p.storage.get(KEY) ?? '{}')

beforeEach(() => {
  blobs.reset()
  serve()
})
afterEach(() => {
  reload()
  vi.unstubAllGlobals()
})

async function endIt(talkedFirst: boolean) {
  const phone = onPhone(new Phone(talkedFirst ? 'talked' : 'not-yet'))
  seedDemo()
  const s = saved(phone)
  s.stage = 'talking'
  s.followups = [
    { id: 'f1', source: 'beforeYes', topic: 'money-home', at: '2026-01-01T00:00:00.000Z', ...(talkedFirst ? { outcome: 'asked', outcomeAt: '2026-01-08T00:00:00.000Z' } : {}) },
  ]
  phone.storage.set(KEY, JSON.stringify(s))

  const m = await mount(<App entry={null} />)
  await m.settle()
  await m.press(/^This changed$/)
  await m.press(/^Preparing$/)
  await m.until(() => (saved(phone).endings ?? []).length === 1, 'the ending written')
  const ending = saved(phone).endings[0]
  m.unmount()
  return ending
}

describe('the ending remembers whether a conversation came first', () => {
  it('after a conversation she confirmed: talked', async () => {
    const e = await endIt(true)
    expect(e).toMatchObject({ from: 'talking', talked: true })
  })

  it('before any: not talked, and still no date beyond its own moment', async () => {
    const e = await endIt(false)
    expect(e).toMatchObject({ from: 'talking', talked: false })
    expect(Object.keys(e).sort()).toEqual(['at', 'from', 'talked'])
  })
})
