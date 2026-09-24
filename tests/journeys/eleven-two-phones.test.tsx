// @vitest-environment happy-dom
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { inviteLink } from '../../src/data/invite'
import { STATES, beforeYesTopics } from '../../src/data/beforeYes'
import { entryFromUrl } from '../../src/lib/entry'
import { coupleReading } from '../../src/lib/couple'
import { joint, type YesState } from '../../netlify/functions/couple'
import type { Gender } from '../../src/types'
import { beforeYesAnswers } from '../support/arbitrary'
import { Phone, onPhone, reload, shareSheet } from '../support/device'
import { mount, type Mounted } from '../support/render'
import { blobs, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * JOURNEY — the eleven, answered on two phones.
 *
 * She answers the eleven about him and taps "Ask him"; her phone's share
 * sheet gets a link. He opens only that link, on his own phone, and answers
 * his side. Each then sees where the two of them stand — the joint, in the
 * same words — and nothing that says what the other one answered. The couple
 * route's privacy is proved over generated sheets in
 * tests/invariants/private-sheets.test.ts; this proves the screens keep it:
 * the only way anything crosses from one phone to the other is the link she
 * shared.
 */

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const saved = (p: Phone) => JSON.parse(p.storage.get('niyyah.intake.v1') ?? '{}')

const open = (url: string) => {
  const u = new URL(url)
  return <App entry={entryFromUrl(u.search, u.pathname)} />
}

async function answerEleven(m: Mounted, g: Gender, states: Record<string, string>) {
  for (const t of beforeYesTopics(g)) {
    const label = STATES.find((s) => s.id === states[t.id])!.label
    await m.press(new RegExp(`^${label}`))
  }
}

beforeEach(() => {
  blobs.reset()
  serve()
})
afterEach(() => {
  reload()
  vi.unstubAllGlobals()
})

describe('the eleven, on two phones', () => {
  // Two generated pairs: each walk renders twenty-two answers on two phones.
  const pairs = fc.sample(fc.tuple(beforeYesAnswers('woman'), beforeYesAnswers('man')), { numRuns: 2, seed: 20260924 })

  it.each(pairs.map((p, i) => [i + 1, ...p] as const))('pair %i: each sees the joint, and never the other’s sheet', async (_i, hers, his) => {
    const ids = beforeYesTopics('woman').map((t) => t.id)
    const joints = Object.fromEntries(ids.map((t) => [t, joint(hers[t] as YesState, his[t] as YesState)]))
    const expected = { woman: coupleReading(joints, 'woman'), man: coupleReading(joints, 'man') }
    const sheet = shareSheet()

    // Her phone: the eleven, from an invite, then "Ask him".
    const herPhone = onPhone(new Phone('hers'))
    const her = await mount(open(inviteLink('beforeYes')))
    await her.press('Start — about him')
    await answerEleven(her, 'woman', hers)
    await her.press(/^Ask him/)
    const link = sheet.sent.at(-1)?.url
    expect(link, 'the link she sent').toMatch(/[?&]couple=/)
    await her.until(() => saved(herPhone).couple, 'her sheet is saved on her phone')
    her.unmount()
    reload()

    // Before he answers: Home's card says "where you left it", and opens her
    // result — not the eleven's front page.
    onPhone(herPhone)
    const waiting = await mount(<App />)
    await waiting.press(/where you left it/)
    expect(waiting.text()).toContain('The conversations you have had')
    expect(waiting.has('See where you left it')).toBe(false)
    waiting.unmount()
    reload()

    // His phone: nothing on it but the link she sent.
    onPhone(new Phone('his'))
    const him = await mount(open(link!))
    expect(him.text()).toContain('She’s asked you to do this too.')
    await him.press(/^Start$/)
    await answerEleven(him, 'man', his)
    await him.until(() => him.text().includes(expected.man.lines[0].line), 'his joint')
    const hisScreen = him.text()
    him.unmount()
    reload()

    // Her phone again, later.
    onPhone(herPhone)
    const later = await mount(<App />)
    expect(later.text()).toContain('He answered')
    await later.press(/Where the two of you stand/)
    // The card opens the joint itself, at the top — before her own result.
    // It used to open the eleven's front page, one tap short.
    await later.until(() => later.text().includes(expected.woman.lines[0].line), 'her joint')
    const herScreen = later.text()
    expect(herScreen.indexOf(expected.woman.headline)).toBeLessThan(herScreen.indexOf('The conversations you have had'))
    expect(later.container.querySelector('h1, h2')?.textContent).toBe(expected.woman.headline)
    later.unmount()

    // Both see the same joint, in the same words.
    for (const [screen, g] of [[herScreen, 'woman'], [hisScreen, 'man']] as const) {
      expect(screen).toContain(expected[g].headline)
      for (const l of expected[g].lines) expect(screen).toContain(l.line)
    }
    expect(expected.man.headline).toBe(expected.woman.headline)
    // And neither sees the other's sheet. Where the two answered differently,
    // the other side's own note for that topic ("you have talked about where
    // you'd live, and you agree") must be nowhere on this screen.
    const note = (g: Gender, id: string, state: string) =>
      STATES.find((x) => x.id === state)!.note.replace('{topic}', lowerFirst(beforeYesTopics(g).find((t) => t.id === id)!.label)).toLowerCase()
    for (const id of ids.filter((t) => hers[t] !== his[t])) {
      expect(hisScreen.toLowerCase(), `her ${id} on his screen`).not.toContain(note('woman', id, hers[id]))
      expect(herScreen.toLowerCase(), `his ${id} on her screen`).not.toContain(note('man', id, his[id]))
    }
    // The server agrees: nothing either phone can fetch carries a side.
    expect(JSON.stringify(saved(herPhone).couple)).not.toMatch(/"first"|"second"/)
  })

  it('the pair loop closes on both phones: his Home, one conversation to ask about, and a joint that outlives the link', async () => {
    const [hers, his] = fc.sample(fc.tuple(beforeYesAnswers('woman'), beforeYesAnswers('man')), { numRuns: 1, seed: 20260925 })[0]
    const ids = beforeYesTopics('woman').map((t) => t.id)
    const joints = Object.fromEntries(ids.map((t) => [t, joint(hers[t] as YesState, his[t] as YesState)]))
    const expected = { woman: coupleReading(joints, 'woman'), man: coupleReading(joints, 'man') }
    const sheet = shareSheet()

    const herPhone = onPhone(new Phone('hers'))
    const her = await mount(open(inviteLink('beforeYes')))
    await her.press('Start — about him')
    await answerEleven(her, 'woman', hers)
    await her.press(/^Ask him/)
    const link = sheet.sent.at(-1)!.url!
    await her.until(() => saved(herPhone).couple, 'her pair is saved')
    her.unmount()
    reload()

    // His side. The joint he is shown is kept on his phone, and his Home
    // knows there is a pair — it used to know nothing.
    const hisPhone = onPhone(new Phone('his'))
    const him = await mount(open(link))
    await him.press(/^Start$/)
    await answerEleven(him, 'man', his)
    await him.until(() => him.text().includes(expected.man.headline), 'his joint')
    await him.until(() => saved(hisPhone).couple?.joint, 'the joint is kept on his phone')
    him.unmount()
    reload()
    const hisHome = await mount(<App />)
    expect(hisHome.text()).toContain('You both answered')
    await hisHome.press(/Where the two of you stand/)
    await hisHome.until(() => hisHome.text().includes(expected.man.headline), 'his joint, from Home')
    expect(hisHome.has(/^Ask her/)).toBe(false)
    hisHome.unmount()
    reload()

    // Her phone sees the answer and keeps the joint too.
    onPhone(herPhone)
    const herHome = await mount(<App />)
    await herHome.until(() => saved(herPhone).couple?.joint, 'the joint is kept on her phone')
    herHome.unmount()
    reload()

    // Days later, both are asked about the same conversation — the one the
    // two of them should open together.
    const open1 = expected.woman.open!
    expect(expected.man.open!.id).toBe(open1.id)
    for (const [p, g] of [[herPhone, 'woman'], [hisPhone, 'man']] as const) {
      later(p, 4)
      onPhone(p)
      const home = await mount(<App />)
      const label = beforeYesTopics(g).find((t) => t.id === open1.id)!.label
      expect(home.text(), `${g}’s follow-up`).toContain(`the one to open was ${label.charAt(0).toLowerCase()}${label.slice(1)}`)
      home.unmount()
      reload()
    }

    // Ninety days on, the server has forgotten the pair. Her screen shows
    // what she saw, not "we couldn't check — that is us".
    const code = new URL(link).searchParams.get('couple')!
    blobs.stores.get('couples')?.delete(code)
    onPhone(herPhone)
    const gone = await mount(<App />)
    await gone.press(/Where the two of you stand/)
    await gone.until(() => gone.text().includes(expected.woman.headline), 'the kept joint')
    expect(gone.text()).not.toMatch(/couldn’t check/)
    gone.unmount()
  })

  it('she goes through it again before he answers, and he is compared with the sheet she has now', async () => {
    const [first, second, his] = fc.sample(
      fc.tuple(beforeYesAnswers('woman'), beforeYesAnswers('woman'), beforeYesAnswers('man')),
      { numRuns: 1, seed: 20260926 },
    )[0]
    const ids = beforeYesTopics('woman').map((t) => t.id)
    const expected = coupleReading(Object.fromEntries(ids.map((t) => [t, joint(second[t] as YesState, his[t] as YesState)])), 'man')
    const sheet = shareSheet()

    const herPhone = onPhone(new Phone('hers'))
    const her = await mount(open(inviteLink('beforeYes')))
    await her.press('Start — about him')
    await answerEleven(her, 'woman', first)
    await her.press(/^Ask him/)
    const link = sheet.sent.at(-1)!.url!
    await her.until(() => saved(herPhone).couple?.key, 'her owner key is kept on her phone')
    await her.press('Go through it again')
    await answerEleven(her, 'woman', second)
    const code = new URL(link).searchParams.get('couple')!
    await her.until(() => {
      const held = blobs.read('couples', code) as { first?: Record<string, string> } | undefined
      return held?.first && ids.every((t) => held.first![t] === second[t])
    }, 'her new sheet reached the server')
    her.unmount()
    reload()

    onPhone(new Phone('his'))
    const him = await mount(open(link))
    await him.press(/^Start$/)
    await answerEleven(him, 'man', his)
    await him.until(() => him.text().includes(expected.headline), 'his joint, against her second sheet')
    for (const l of expected.lines) expect(him.text()).toContain(l.line)
    him.unmount()
  })
})

/** Move everything this phone was told to do `days` into the past. */
function later(p: Phone, days: number) {
  const s = saved(p)
  const back = (iso?: string) => (iso ? new Date(Date.parse(iso) - days * 24 * 60 * 60 * 1000).toISOString() : iso)
  s.followups = (s.followups ?? []).map((f: { at: string; outcomeAt?: string }) => ({ ...f, at: back(f.at), ...(f.outcomeAt ? { outcomeAt: back(f.outcomeAt) } : {}) }))
  p.storage.set('niyyah.intake.v1', JSON.stringify(s))
}
