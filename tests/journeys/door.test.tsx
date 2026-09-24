// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { seedDemo } from '../../src/lib/demo'
import { cohortCount, joinCohort } from '../../src/lib/cohort'
import { Phone, onPhone, reload } from '../support/device'
import { mount } from '../support/render'
import { blobs, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * JOURNEY — she walks through the door, and the door counts her once.
 *
 * The number on the door is the product's one public promise about
 * liquidity, and every other screen quotes it (docs/LIQUIDITY.md). A person
 * counted twice is a door that lies. Here, through the real map screen and
 * the real cohort route: she leaves a way to reach her and taps Count me in,
 * and her city goes from none to one woman. Then everything that could
 * count her again — saying she would travel, a join sent twice, a move to
 * another city — must move her, never add her.
 */

/** Every place the door counts her, by her code. */
const entries = (code: string) => blobs.keys('cohort').filter((k) => !k.startsWith('index/') && k.endsWith(`/${code}`))

beforeEach(() => {
  blobs.reset()
  serve()
  // The join form shows only where the founder's form is configured, as it is live.
  vi.stubEnv('VITE_WAITLIST_FORM', 'waitlist')
})
afterEach(() => {
  reload()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('the door', () => {
  it('counts her once, and moves her rather than counting her again', async () => {
    const phone = onPhone(new Phone('hers'))
    seedDemo()
    const m = await mount(<App />)
    await m.press(/^Your map/)
    expect(m.text()).toContain('Minneapolis–St. Paul today: 0 women, 0 men.')
    await m.type('Email or phone', 'hodan@example.com')
    await m.press(/^Count me in/)

    // Counted, in her city, once.
    expect(m.text()).toContain('You’re counted')
    expect(m.text()).toContain('Minneapolis–St. Paul today: one woman, 0 men.')
    const code = m.text().match(/Your map is kept under ([A-Z2-9]{8})/)![1]
    expect(entries(code)).toHaveLength(1)
    expect(entries(code)[0]).toMatch(/^us\/twin-cities\/woman\/city\//)

    // She would travel. She is still one woman in her city — `here` is
    // everyone there — and now also one of the women across the country who
    // would travel. Her entry is replaced, not added to.
    await m.press(/^I’d travel within the US/)
    expect(m.text()).toContain('Minneapolis–St. Paul today: one woman, 0 men.')
    expect(m.text()).toContain('Across the US, one woman and 0 men would travel')
    expect(entries(code)).toHaveLength(1)
    await m.until(() => JSON.parse(phone.storage.get('niyyah.intake.v1')!).waitlist, 'her place is saved')
    m.unmount()

    // The same join, sent again — a retry after a lost reply.
    const again = { scene: 'twin-cities', gender: 'woman', country: 'us', reach: 'country', age: 27 } as const
    expect(await joinCohort(again)).not.toBeNull()
    expect(entries(code)).toHaveLength(1)

    // She moves to Columbus. Her code is the same; her place moves with her.
    expect(await joinCohort({ ...again, scene: 'columbus', reach: 'city' })).not.toBeNull()
    expect(entries(code)).toEqual([expect.stringMatching(/^us\/columbus\/woman\/city\//)])
    expect(await cohortCount('twin-cities', 'us')).toMatchObject({ here: { women: 0, men: 0 }, across: { women: 0, men: 0 } })
    expect(await cohortCount('columbus', 'us')).toMatchObject({ here: { women: 1, men: 0 } })

    // And the door she sees on her phone agrees.
    reload()
    const back = await mount(<App />)
    await back.press(/^Your map/)
    expect(back.text()).toContain('Minneapolis–St. Paul today: 0 women, 0 men.')
    back.unmount()
  })
})
