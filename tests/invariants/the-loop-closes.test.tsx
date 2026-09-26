// @vitest-environment happy-dom
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { toolLink } from '../../src/lib/links'
import { entryFromUrl } from '../../src/lib/entry'
import { wordsLink } from '../../src/lib/words'
import { readQuestions, scriptFor, SCRIPTS, speak, type ReadDimension } from '../../src/data/read'
import { buildRead } from '../../src/lib/read'
import { MIN_AGE_DAYS, NOT_YET_AGAIN_DAYS, openFollowUp, resolveFollowUp } from '../../src/lib/followup'
import { familyScripts } from '../../src/data/families'
import { beforeYesTopics } from '../../src/data/beforeYes'
import type { FollowUp, Gender } from '../../src/types'
import { readAnswers } from '../support/arbitrary'
import { Phone, onPhone, reload, shareSheet } from '../support/device'
import { mount, type Mounted } from '../support/render'
import { audit } from '../support/a11y'
import { residue } from '../support/residue'
import { seedDemo } from '../../src/lib/demo'
import { blobs, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * INVARIANT — the loop closes.
 *
 * Every result ends in words to say, and a few days later asks whether they
 * were said — on the right side, and, for a pair, about the same conversation
 * on both phones. This is what docs/PRODUCT.md names as the thing a
 * competitor copying our homepage would not have: a read or the eleven, the
 * words, "did you say them?", the two of you blind, the Ending. Each link of
 * it was broken somewhere before 2026-09-24 — a man asked about her script,
 * "not yet" closed for good, a stranger never asked at all. Walked here by
 * taps, over the real client and handlers, with the days advanced by moving
 * the follow-ups back in time on the phone.
 */

const DAY = 24 * 60 * 60 * 1000
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const saved = (p: Phone) => JSON.parse(p.storage.get('niyyah.intake.v1') ?? '{}')

/** Move everything this phone was told to do `days` into the past. */
function later(p: Phone, days: number) {
  const s = saved(p)
  const back = (iso?: string) => (iso ? new Date(Date.parse(iso) - days * DAY).toISOString() : iso)
  s.followups = (s.followups ?? []).map((f: FollowUp) => ({ ...f, at: back(f.at), ...(f.outcomeAt ? { outcomeAt: back(f.outcomeAt) } : {}) }))
  p.storage.set('niyyah.intake.v1', JSON.stringify(s))
}

function open(url: string) {
  const u = new URL(url)
  return <App entry={entryFromUrl(u.search, u.pathname)} />
}

async function takeRead(m: Mounted, reader: Gender, want: Record<string, string>) {
  await m.press('Start the read')
  for (const q of readQuestions(reader)) {
    const option = q.options.find((o) => o.id === want[q.id])!
    await m.press(new RegExp(`^${escape(option.label)}`))
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

describe('the read: words, then the question, on the reader’s own side', () => {
  const cases = (['woman', 'man'] as const).flatMap((reader) =>
    fc.sample(readAnswers(reader), { numRuns: 2, seed: 20260924 }).map((a, i) => [reader, i + 1, a] as const),
  )

  it.each(cases)('%s, read %i', async (reader, _i, want) => {
    const phone = onPhone(new Phone(reader))
    const m = await mount(open(toolLink(reader === 'woman' ? 'is-he-serious' : 'is-she-serious', 'words')))
    await takeRead(m, reader, want)
    const result = buildRead(want, reader)!
    // Words on the screen, whatever the band.
    expect(m.text()).toContain(result.script.words)
    // After a caution, nothing primary on the screen is for sending to them —
    // and the loop does not close on a question for them: the caution's own
    // instruction is "tell one person", so no follow-up is written and the
    // screen does not promise one (docs/DECISIONS.md Part 16).
    if (result.caution) expect(m.has(/^Before you say yes/)).toBe(false)
    if (result.caution && !result.careful) {
      expect(m.text()).not.toMatch(/In three days, the next time you open Niyyah/)
      expect(m.text()).not.toContain('Words for the other gaps')
      await m.settle()
      expect(saved(phone).followups ?? []).toEqual([])
      m.unmount()
      return
    }
    // The promise to come back — once.
    expect(m.text()).toMatch(/In three days, the next time you open Niyyah, it asks whether you asked it/)
    // Every other gap has its own words, not only the thinnest — unless she
    // is careful what she raises, when none of the words are for them.
    if (result.careful) expect(m.text()).not.toContain('Words for the other gaps')
    if (result.band !== 'early' && !result.caution && !result.careful && result.dimensions.some((d) => d.state !== 'shown' && d.dimension !== result.thin))
      expect(m.text()).toContain('Words for the other gaps')
    await m.until(() => saved(phone).followups?.length, 'the follow-up is written down')
    m.unmount()
    reload()

    // Not yet asked: too soon.
    const soon = await mount(<App />)
    expect(soon.text()).not.toContain('Since last time')
    soon.unmount()
    reload()

    later(phone, MIN_AGE_DAYS + 1)
    const home = await mount(<App />)
    const other = reader === 'woman' ? 'him' : 'her'
    expect(home.text()).toContain(`Last time, this was the question to put to ${other}. Have you asked it?`)
    // "Not yet" shows the words again — this side's words, never the other's.
    await home.press('Not yet')
    const key = result.band === 'early' ? 'early' : result.thin
    expect(home.text()).toContain(scriptFor(key, reader).words)
    await home.press('Ask me again in a week')
    await home.until(() => saved(phone).followups[0].outcome === 'not-yet', 'not yet is recorded')
    home.unmount()
    reload()

    // A week later it is asked once more; "we talked" then closes it, and
    // what the answer tells you comes back.
    later(phone, NOT_YET_AGAIN_DAYS + 1)
    const again = await mount(<App />)
    expect(again.text()).toContain('Have you asked it?')
    await again.press('We talked about it')
    expect(again.text()).toContain('What the answer tells you')
    expect(again.text()).toContain(scriptFor(key, reader).tells)
    await again.until(() => saved(phone).followups[0].outcome === 'asked', 'we talked is recorded')
    expect(audit(again.container), 'the follow-up card').toEqual([])
    again.unmount()
  })
})

describe('the read, where it must not push, and where it remembers', () => {
  const first = (reader: Gender): Record<string, string> => Object.fromEntries(readQuestions(reader).map((q) => [q.id, q.options[0].id]))

  it('after a money caution, nothing primary is for sending to him', async () => {
    onPhone(new Phone('hers'))
    const m = await mount(open(toolLink('is-he-serious', 'words')))
    await takeRead(m, 'woman', { ...first('woman'), money: 'yes', duration: 'months-3' })
    expect(m.text()).toContain('Please read this one twice')
    // The eleven — "you can send them to him too" — is not offered here.
    expect(m.has(/^Before you say yes/)).toBe(false)
    expect(m.text()).toContain('Nothing on this screen is for sending to him.')
    m.unmount()
  })

  it('a second read says what moved since the first', async () => {
    const phone = onPhone(new Phone('hers'))
    const before: Record<string, string> = { ...first('woman'), duration: 'months-3', family: readQuestions('woman').find((q) => q.id === 'family')!.options.at(-1)!.id }
    const m = await mount(open(toolLink('is-he-serious', 'words')))
    await takeRead(m, 'woman', before)
    await m.until(() => saved(phone).read, 'the first read is saved')
    await m.press('Take the read again')
    const after: Record<string, string> = { ...before, family: readQuestions('woman').find((q) => q.id === 'family')!.options[0].id }
    for (const q of readQuestions('woman')) {
      const option = q.options.find((o) => o.id === after[q.id])!
      await m.press(new RegExp(`^${escape(option.label)}`))
    }
    const was = buildRead(before, 'woman')!.dimensions.find((d) => d.dimension === 'family')!.state
    const now = buildRead(after, 'woman')!.dimensions.find((d) => d.dimension === 'family')!.state
    expect(was).not.toBe(now)
    expect(m.text()).toMatch(/Since \d{1,2} \w+/)
    expect(m.text()).toContain('Moving toward family:')
    // The read before stays on this phone — never in what a kept map sends.
    await m.until(() => saved(phone).read?.previous, 'the previous read is kept on the phone')
    m.unmount()
  })
})

describe('a stranger who took the family words is asked, with no Home', () => {
  it.each(['woman', 'man'] as const)('%s', async (side) => {
    const phone = onPhone(new Phone(`${side} stranger`))
    const sheet = shareSheet()
    const m = await mount(open(wordsLink('family')))
    // Whose side, before any words — a man was handed "telling your wali".
    expect(m.text()).toContain('Whose side are these words for?')
    await m.press(side === 'woman' ? 'Mine — I’m a woman' : 'Mine — I’m a man')
    const mine = familyScripts(side)
    const theirs = familyScripts(side === 'woman' ? 'man' : 'woman').filter((s) => !mine.some((x) => x.id === s.id))
    for (const s of theirs) expect(m.text(), `${s.title} is the other side’s`).not.toContain(s.title)
    const first = mine[0]
    await m.press(new RegExp(`^${escape(first.title)}`))
    await m.press(/Send these words/)
    expect(sheet.sent.length).toBe(1)
    expect(m.text()).toMatch(/it asks whether you had that conversation/)
    await m.until(() => saved(phone).followups?.length, 'the words taken are written down')
    m.unmount()
    reload()

    later(phone, MIN_AGE_DAYS + 1)
    const back = await mount(<App />)
    const label = speak(side)(first.title).charAt(0).toLowerCase() + first.title.slice(1)
    expect(back.text()).toContain(`Last time, you took the words for ${label}`)
    await back.press('We talked about it')
    expect(back.text()).toContain('You had it.')
    back.unmount()
  })
})

describe('every source reads as a sentence, on either side', () => {
  const old = new Date(Date.now() - (MIN_AGE_DAYS + 1) * DAY).toISOString()
  const topics = beforeYesTopics('woman').map((t) => t.id)
  const sources: FollowUp[] = [
    ...(['public', 'intent', 'family', 'consistency', 'pressure', 'early'] as const).map((t) => ({ id: `read:${t}`, source: 'read' as const, topic: t, at: old })),
    ...topics.map((t) => ({ id: `eleven:${t}`, source: 'beforeYes' as const, topic: t, at: old })),
    ...topics.map((t) => ({ id: `couple:${t}`, source: 'couple' as const, topic: t, at: old })),
    { id: 'guide:x', source: 'guide', topic: 'x', at: old, words: 'Can we talk about where we would live?' },
  ]

  it.each(['woman', 'man'] as const)('%s', (g) => {
    for (const f of sources) {
      const ask = openFollowUp([f], g)
      expect(ask, `${f.id} is asked`).not.toBeNull()
      // Reads after "about", in the Ending's record and in her voice to the guide.
      expect(ask!.label, f.id).not.toMatch(/you were going to|gave me the words/)
      expect(`You had the conversation about ${ask!.label}.`).not.toMatch(/\{|\}/)
      expect(ask!.script.words.length, f.id).toBeGreaterThan(0)
    }
    for (const s of familyScripts(g)) {
      expect(openFollowUp([{ id: s.id, source: 'family', topic: s.id, at: old }], g), s.id).not.toBeNull()
    }
  })

  it('a man’s read follow-up carries his words, not hers', () => {
    const f: FollowUp = { id: 'read:family', source: 'read', topic: 'family', at: old }
    const his = openFollowUp([f], 'man')!.script
    expect(his).toEqual(scriptFor('family', 'man'))
    expect(his.words).not.toBe(SCRIPTS.family.words)
  })

  it('"not yet" is asked once more, and then not again', () => {
    const f: FollowUp = { id: 'read:public', source: 'read', topic: 'public' as ReadDimension, at: old }
    const now = Date.now()
    let list = resolveFollowUp([f], f.id, 'not-yet', new Date(now).toISOString())
    expect(openFollowUp(list, 'woman', now)).toBeNull()
    const aWeek = now + (NOT_YET_AGAIN_DAYS + 1) * DAY
    expect(openFollowUp(list, 'woman', aWeek)).not.toBeNull()
    list = resolveFollowUp(list, f.id, 'not-yet', new Date(aWeek).toISOString())
    expect(openFollowUp(list, 'woman', aWeek + 30 * DAY)).toBeNull()
    // Put away the first time: never asked again.
    const put = resolveFollowUp([f], f.id, 'not-yet', new Date(now).toISOString(), true)
    expect(openFollowUp(put, 'woman', now + 60 * DAY)).toBeNull()
  })
})

describe('the Ending lets her go — and takes itself off our server', () => {
  it('Forget me is on the Ending, and it leaves nothing of hers but the closed code', async () => {
    const phone = onPhone(new Phone('hers'))
    seedDemo()
    const home = await mount(<App />)
    await home.press(/^Your map/)
    await home.press(/Keep this map/)
    const code = home.text().match(/Your map is kept.*?([A-Z2-9]{4}) ([A-Z2-9]{4})/)!.slice(1).join('')
    await home.until(() => phone.storage.get('niyyah.intake.v1')?.includes('Hodan'), 'her map saved')
    home.unmount()
    reload()
    expect(blobs.read('maps', code), 'kept on the server').not.toBeNull()

    // Married. Home hides the profile, and still reaches Trust.
    const s = saved(phone)
    phone.storage.set('niyyah.intake.v1', JSON.stringify({ ...s, stage: 'married', ending: { at: new Date().toISOString() } }))
    const married = await mount(<App />)
    expect(married.has(/Your privacy/)).toBe(true)
    await married.press(/^How you chose/)
    expect(married.text()).toContain('You can delete the app.')
    expect(married.text()).toContain('Deleting the app clears this phone, not our server.')
    expect(audit(married.container), 'the Ending').toEqual([])
    await married.press(/^Forget me$/)
    await married.press('Yes, delete everything')
    await married.until(() => !blobs.read('maps', code), 'her kept map is gone')
    married.unmount()
    expect(residue([code, 'Hodan'], [phone]).filter((l) => !l.startsWith(`maps:ended/${code} `))).toEqual([])
  })
})
