// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import Talking from '../../src/components/Talking'
import { CAREFUL_SCRIPT, readQuestions } from '../../src/data/read'
import { familyScriptsLine } from '../../src/data/families'
import { buildRead } from '../../src/lib/read'
import { entryFromUrl } from '../../src/lib/entry'
import { Phone, onPhone, reload } from '../support/device'
import { mount, type Mounted } from '../support/render'
import { blobs, serve } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * Where a read's result leads into the family words (docs/DECISIONS.md Part 27).
 *
 * A result with `caution` or `careful` does not offer the eleven or the family
 * words: those include words for the other person and for advancing the
 * relationship, and the destination does not know what the result said. The
 * ordinary result is unchanged. Nothing here is about the family words being
 * reachable elsewhere — they are, from Home and from Talking.
 */

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
let screen: Mounted | undefined

beforeEach(() => {
  blobs.reset()
  serve()
  onPhone(new Phone('handoff'))
})
afterEach(() => {
  screen?.unmount()
  screen = undefined
  reload()
  vi.unstubAllGlobals()
})

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
  return buildRead(want, side)!
}

const wordsCard = () =>
  [...screen!.container.querySelectorAll('p')].find((p) => /^(The one question to ask next|The words for one person who knows you)$/i.test(p.textContent ?? ''))?.textContent ?? null

const moreSummary = () =>
  [...screen!.container.querySelectorAll('summary')].find((s) => /More you can do here/.test(s.textContent ?? ''))?.textContent ?? ''

// The nine result types the review walked (BATCH-04), each with what the engine must say about it.
const RESULTS: { name: string; change: Record<string, string>; caution: boolean; careful: boolean; script: 'careful' | 'other' }[] = [
  { name: 'ordinary', change: {}, caution: false, careful: false, script: 'other' },
  { name: 'ordinary, too early', change: { duration: 'weeks-0' }, caution: false, careful: false, script: 'other' },
  { name: 'careful only', change: { hard: 'careful' }, caution: false, careful: true, script: 'careful' },
  { name: 'early and careful', change: { duration: 'weeks-0', hard: 'careful' }, caution: false, careful: true, script: 'careful' },
  { name: 'money caution', change: { money: 'yes' }, caution: true, careful: false, script: 'other' },
  { name: 'money caution and careful', change: { money: 'yes', hard: 'careful' }, caution: true, careful: false, script: 'careful' },
  { name: 'hidden caution (blamed)', change: { secret: 'explicit', hard: 'blames' }, caution: true, careful: false, script: 'other' },
  { name: 'hidden caution (nobody knows)', change: { secret: 'explicit', known: 'nobody' }, caution: true, careful: false, script: 'other' },
  { name: 'hidden caution and careful', change: { secret: 'explicit', hard: 'careful' }, caution: true, careful: false, script: 'careful' },
]

describe('the handoff from a read result', () => {
  describe.each(['woman', 'man'] as const)('%s reading', (side) => {
    const him = side === 'woman' ? 'him' : 'her'

    it.each(RESULTS)('$name', async ({ change, caution, careful, script }) => {
      const built = await takeRead(side, change)
      // The engine says what the test assumes it says.
      expect(!!built.caution).toBe(caution)
      expect(!!built.careful).toBe(careful || false)
      expect(built.script === CAREFUL_SCRIPT).toBe(script === 'careful')

      const guarded = !!built.caution || !!built.careful
      const hint = moreSummary()

      if (guarded) {
        // Neither the eleven nor the family words, above the fold or inside the disclosure.
        expect(screen!.has(/^Before you say yes/)).toBe(false)
        expect(screen!.has(/^The words for your family/)).toBe(false)
        expect(screen!.text()).not.toContain('For telling the people who know you')
        expect(hint).toContain('Your guide, a friend')
        expect(hint).not.toContain('your family')
        // What stays: the caution or careful box with its support line, and the words card.
        expect(screen!.text()).toMatch(/Please read this one twice|careful about what you raise/i)
        expect(screen!.text()).toMatch(/If you are in danger now|local emergency number/i)
        expect(wordsCard()).not.toBeNull()
      } else {
        // The ordinary result is as it was: the eleven first, the family words inside the disclosure.
        expect(screen!.has(/^Before you say yes/)).toBe(true)
        expect(screen!.has(/^The words for your family/)).toBe(true)
        expect(screen!.text()).toContain(familyScriptsLine(side))
        expect(hint).toContain('Your guide, your family, a friend')
        expect(wordsCard()).toBe('The one question to ask next')
      }

      // BATCH-03, exactly: the title and preface follow the SCRIPT, not the band.
      if (script === 'careful') {
        expect(wordsCard()).toBe('The words for one person who knows you')
        expect(screen!.text()).toContain(`These are not for ${him}.`)
        expect(screen!.text()).not.toContain('The conversation above comes first')
      } else if (caution) {
        expect(wordsCard()).toBe('The one question to ask next')
        expect(screen!.text()).toContain(`The conversation above comes first. If you do decide to ask ${him} something after it, this is the thing worth asking.`)
        expect(screen!.text()).not.toContain(`These are not for ${him}.`)
      } else {
        expect(screen!.text()).not.toContain('These are not for')
        expect(screen!.text()).not.toContain('The conversation above comes first')
      }
    })
  })
})

describe('Talking’s third card', () => {
  it('keeps its title and says who the sentences are for', async () => {
    const go = { onRead: vi.fn(), onBeforeYes: vi.fn(), onFamilies: vi.fn(), onLooking: vi.fn(), onBack: vi.fn() }
    screen = await mount(<Talking {...go} />)
    const text = screen.text()
    expect(text).toContain('The families are coming in')
    expect(text).toContain('Word-for-word sentences to say aloud — to your own family, to the other person, and for when the families meet.')
    expect(text).not.toContain('Words to say to your own family')
    await screen.press(/The families are coming in/)
    expect(go.onFamilies).toHaveBeenCalledTimes(1)
  })
})
