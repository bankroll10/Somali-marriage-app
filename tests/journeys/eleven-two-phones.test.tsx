// @vitest-environment happy-dom
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { inviteLink } from '../../src/data/invite'
import { beforeYesTopics, isDifference, LINE, sayTheLine, SHEET_OUTCOMES, STATES } from '../../src/data/beforeYes'
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

/** A difference is two taps: "we don't agree", then where it stands (src/components/ElevenChoices.tsx). */
async function answerEleven(m: Mounted, g: Gender, states: Record<string, string>) {
  for (const t of beforeYesTopics(g)) {
    const state = states[t.id]
    if (isDifference(state)) {
      await m.press(new RegExp(`^${STATES.find((s) => s.id === 'differ')!.label}`))
      await m.press(new RegExp(`^${SHEET_OUTCOMES.find((o) => o.id === state)!.label}`))
      continue
    }
    await m.press(new RegExp(`^${STATES.find((s) => s.id === state)!.label}`))
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
    // Answering her link is not a decision to marry. He is talking to
    // someone; "Deciding together" is only ever his own tap
    // (src/lib/inferStage.ts, docs/DECISIONS.md, the commitment audit).
    expect(saved(hisPhone).stage).toBe('talking')
    expect(hisHome.text()).toContain('Getting to know someone')
    expect(hisHome.text()).not.toContain('Deciding together')
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

  it('a line she names stays on her phone: the link carries it as a difference, nothing more', async () => {
    const ids = beforeYesTopics('woman').map((t) => t.id)
    const hers = { ...Object.fromEntries(ids.map((t) => [t, 'agree'])), 'second-wife': LINE, work: 'differ' }
    const sheet = shareSheet()
    const herPhone = onPhone(new Phone('hers'))
    const her = await mount(open(inviteLink('beforeYes')))
    await her.press('Start — about him')
    await answerEleven(her, 'woman', hers)

    // Her own result names it as hers, never offers it as the one to open,
    // and gives the words for saying it plainly.
    expect(her.text()).toContain('You’ve named one line the two of you don’t share.')
    expect(her.text()).toContain('A line for you')
    expect(her.text()).toContain('The one to open this week is whether you’d work.')
    expect(her.text()).toContain(sayTheLine('woman').words)
    // Whether a conversation can be had at all is not a difference to work
    // out (docs/SECURITY.md, "Afraid to raise it").
    expect(her.text()).toContain('If raising any of these feels unsafe rather than hard')
    expect(her.text()).toContain('because of how he reacts')
    await her.until(() => saved(herPhone).beforeYes, 'her sheet is saved on her phone')
    expect(saved(herPhone).beforeYes.lines).toEqual(['second-wife'])
    expect(saved(herPhone).beforeYes.answers['second-wife']).toBe('differ')

    await her.press(/^Ask him/)
    const code = new URL(sheet.sent.at(-1)!.url!).searchParams.get('couple')!
    await her.until(() => blobs.read('couples', code), 'her sheet reached the server')
    const held = blobs.read('couples', code) as { first: Record<string, string> }
    expect(held.first['second-wife']).toBe('differ')
    expect(JSON.stringify(held)).not.toMatch(/"line"|lines/)
    her.unmount()
    reload()

    // Days later she is asked about the one she was told to open. Not
    // agreeing is an answer, in three kinds, and none is drawn as the lesser
    // one; she says this one is a line too, and her first line stays.
    later(herPhone, 4)
    onPhone(herPhone)
    const home = await mount(<App />)
    expect(home.text()).toContain('the one to open was whether you’d work')
    await home.press(/^We talked about it/)
    for (const l of ['We agree', 'We see it differently, and we’ve worked out how', 'It’s still open']) expect(home.has(l)).toBe(true)
    await home.press(/^It’s a line for me/)
    await home.until(() => saved(herPhone).beforeYes.lines?.length === 2, 'both lines are kept')
    expect(saved(herPhone).beforeYes.answers.work).toBe('differ')
    expect([...saved(herPhone).beforeYes.lines].sort()).toEqual(['second-wife', 'work'])
    home.unmount()
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
