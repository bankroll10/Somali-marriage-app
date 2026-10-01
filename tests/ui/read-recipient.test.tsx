// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { CAREFUL_SCRIPT, readQuestions } from '../../src/data/read'
import { buildRead } from '../../src/lib/read'
import { entryFromUrl } from '../../src/lib/entry'
import { Phone, onPhone, reload } from '../support/device'
import { mount, type Mounted } from '../support/render'
import { blobs, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * Who the words on a read's result are for (docs/DECISIONS.md Part 26).
 *
 * The engine chooses CAREFUL_SCRIPT — words for one person who knows her — for
 * anyone careful what she raises, including inside a caution. A caution result
 * carries no `careful` line, so its card was titled "The one question to ask
 * next" and prefaced "If you do decide to ask him something…" over words that
 * were never for him. The card now follows the script, not the band.
 */

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
let screen: Mounted | undefined

beforeEach(() => {
  blobs.reset()
  serve()
  onPhone(new Phone('recipient'))
})
afterEach(() => {
  screen?.unmount()
  screen = undefined
  reload()
  vi.unstubAllGlobals()
})

// The plainest answers (the first option of each), with the named ones changed.
const base: Record<string, string> = {
  duration: 'months-plus', named: 'early', timeline: 'dated', known: 'family', secret: 'no', family: 'how',
  initiative: 'same-day', 'in-person': 'several', plans: 'never', money: 'no', nonneg: 'straight', hard: 'listens',
}

async function takeRead(side: 'woman' | 'man', change: Record<string, string>) {
  const want = { ...base, ...change }
  const path = side === 'woman' ? '/tools/is-he-serious' : '/tools/is-she-serious'
  screen = await mount(<App entry={entryFromUrl('', path)} />)
  await screen.press('Start the read')
  for (const q of readQuestions(side)) {
    const option = q.options.find((o) => o.id === want[q.id])!
    await screen.press(new RegExp(`^${escape(option.label)}`))
  }
  return { want, built: buildRead(want, side)! }
}

const card = () => {
  const root = screen!.container
  const title = [...root.querySelectorAll('p')].find((p) => /^(The one question to ask next|The words for one person who knows you)$/i.test(p.textContent ?? ''))
  return title?.textContent ?? null
}

describe('the card over the words, on a read that has been taken', () => {
  it.each(['woman', 'man'] as const)('%s: a caution in which they are careful what they raise is titled for the one person it is for', async (side) => {
    const him = side === 'woman' ? 'him' : 'her'
    const { built } = await takeRead(side, { secret: 'explicit', hard: 'careful', known: 'nobody' })
    // The case this holds: a caution, with the confidante's words.
    expect(built.caution).toBeTruthy()
    expect(built.careful).toBeUndefined()
    expect(built.script).toBe(CAREFUL_SCRIPT)
    expect(card()).toBe('The words for one person who knows you')
    expect(screen!.text()).toContain(`These are not for ${him}.`)
    expect(screen!.text()).not.toContain('If you do decide to ask')
    expect(screen!.text()).not.toContain('The one question to ask next')
    expect(screen!.text()).toContain(CAREFUL_SCRIPT.words.slice(0, 40))
  })

  it('a money request while she is careful is the same', async () => {
    const { built } = await takeRead('woman', { money: 'yes', hard: 'careful' })
    expect(built.concern).toBe('money')
    expect(built.script).toBe(CAREFUL_SCRIPT)
    expect(card()).toBe('The words for one person who knows you')
    expect(screen!.text()).toContain('These are not for him.')
  })

  it('careful alone, with no caution, is as it was', async () => {
    const { built } = await takeRead('woman', { hard: 'careful' })
    expect(built.caution).toBeUndefined()
    expect(built.careful).toBeTruthy()
    expect(card()).toBe('The words for one person who knows you')
    expect(screen!.text()).toContain('These are not for him.')
  })

  it('a caution whose words ARE for him keeps its title and its "after the conversation above" preface', async () => {
    const { built } = await takeRead('woman', { money: 'yes' })
    expect(built.caution).toBeTruthy()
    expect(built.script).not.toBe(CAREFUL_SCRIPT)
    expect(card()).toBe('The one question to ask next')
    expect(screen!.text()).toContain('The conversation above comes first. If you do decide to ask him something after it, this is the thing worth asking.')
    expect(screen!.text()).not.toContain('These are not for him.')
  })

  it('an ordinary read keeps its title and has no preface', async () => {
    await takeRead('man', { known: 'friends', timeline: 'soft' })
    expect(card()).toBe('The one question to ask next')
    expect(screen!.text()).not.toContain('These are not for her.')
    expect(screen!.text()).not.toContain('The conversation above comes first')
  })
})
