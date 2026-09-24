// @vitest-environment happy-dom
import fc from 'fast-check'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { toolLink } from '../../src/lib/links'
import { entryFromUrl } from '../../src/lib/entry'
import { readQuestions } from '../../src/data/read'
import { buildRead } from '../../src/lib/read'
import { readAnswers } from '../support/arbitrary'
import { Phone, onPhone, reload } from '../support/device'
import { mount } from '../support/render'
import { blobs, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * JOURNEY — a man is sent `/tools/is-she-serious`, and reads her.
 *
 * The path names who is being read. He arrives with nothing on his phone,
 * starts, answers twelve questions by tapping, and gets a read. Every step of
 * that has a unit test; none of them had ever been taken in order. What this
 * holds: he is asked about *her* from the first screen to the last, the answers
 * he tapped are the answers the engine read, the band on screen is the band
 * the engine gives them, and the read is kept on his phone as his.
 */

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

beforeEach(() => {
  blobs.reset()
  serve()
})
afterEach(() => {
  reload()
  vi.unstubAllGlobals()
})

describe('/tools/is-she-serious, walked', () => {
  // Three generated reads rather than one fixed one: each walk is a second of
  // rendering, and three different bands' worth of copy is the point.
  const walks = fc.sample(readAnswers('man'), { numRuns: 3, seed: 20260924 })

  it.each(walks.map((a, i) => [i + 1, a] as const))('read %i: asked about her, read as the engine reads it', async (_i, want) => {
    const phone = onPhone(new Phone('his'))
    const u = new URL(toolLink('is-she-serious', 'words'))
    const m = await mount(<App entry={entryFromUrl(u.search, u.pathname)} />)
    expect(m.text()).toContain('Is she serious?')
    expect(m.text()).toContain('Reading about a woman.')
    await m.press('Start the read')

    const questions = readQuestions('man')
    for (const [i, q] of questions.entries()) {
      expect(m.text(), `question ${i + 1}`).toContain(`${i + 1} of ${questions.length}`)
      // He is asked about her — never about "him" (tests/invariants/both-sides).
      expect(q.prompt).not.toMatch(/\b(he|him|his)\b/i)
      expect(m.text()).toContain(q.prompt)
      const option = q.options.find((o) => o.id === want[q.id])!
      await m.press(new RegExp(`^${escape(option.label)}`))
    }

    // The band on screen is the one the engine gives what he tapped.
    const expected = buildRead(want, 'man')!
    const screen = m.text()
    expect(screen).toContain(expected.headline)
    expect(screen).toContain(expected.script.words)

    // And the phone kept exactly what he tapped, and who he is.
    const kept = () => JSON.parse(phone.storage.get('niyyah.intake.v1') ?? '{}')
    await m.until(() => kept().read, 'the read is saved')
    expect(kept().read.answers).toEqual(want)
    expect(kept().identity.gender).toBe('man')
    m.unmount()
  })
})
