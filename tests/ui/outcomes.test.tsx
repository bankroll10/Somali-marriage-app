// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import Ended from '../../src/components/Ended'
import Ending from '../../src/components/Ending'
import { SinceLastTime } from '../../src/components/home/FollowUp'
import { buildEnding } from '../../src/lib/ending'
import { openFollowUp } from '../../src/lib/followup'
import { mount, type Mounted } from '../support/render'

/**
 * Decision quality, not outcome quality (docs/DECISIONS.md Part 15).
 *
 * A conversation that happened counts however it went, and nobody is told
 * their outcome was a success or a failure: a marriage is not proof the
 * reasoning was good, and an ending is not proof it was bad.
 */

let screen: Mounted | undefined
afterEach(() => {
  screen?.unmount()
  screen = undefined
})

const NOW = Date.parse('2026-06-01T12:00:00.000Z')
const ask = () =>
  openFollowUp([{ id: 'f1', source: 'beforeYes', topic: 'money-home', at: new Date(NOW - 5 * 864e5).toISOString() }], 'woman', NOW)!

describe('a conversation that happened counts, however it went', () => {
  it('"It went differently", then "I said it", is a conversation had', async () => {
    const onAnswer = vi.fn()
    const onAskGuide = vi.fn()
    screen = await mount(<SinceLastTime ask={ask()} onAnswer={onAnswer} onAskGuide={onAskGuide} />)
    await screen.press('It went differently')
    expect(onAnswer).not.toHaveBeenCalled()
    await screen.press('I said it')
    expect(onAnswer).toHaveBeenCalledWith('f1', 'asked')
    expect(onAskGuide.mock.calls[0][0]).toMatch(/^I talked to them about .*went differently\.$/)
    // No card inviting her to send on words that just went badly.
    expect(screen.text()).not.toMatch(/You had it/)
  })

  it('"I couldn’t say it" is not counted as had, and carries no blame', async () => {
    const onAnswer = vi.fn()
    const onAskGuide = vi.fn()
    screen = await mount(<SinceLastTime ask={ask()} onAnswer={onAnswer} onAskGuide={onAskGuide} />)
    await screen.press('It went differently')
    await screen.press('I couldn’t say it')
    expect(onAnswer).toHaveBeenCalledWith('f1', 'differently')
    expect(onAskGuide.mock.calls[0][0]).toMatch(/^I was going to talk to them about .*went differently\.$/)
  })

  it('every place it lands after "we talked" is counted the same', async () => {
    for (const landed of ['We agree', 'It’s still open', 'It’s a line for me']) {
      const onAnswer = vi.fn()
      screen = await mount(<SinceLastTime ask={ask()} onAnswer={onAnswer} onAskGuide={() => {}} />)
      await screen.press('We talked about it')
      await screen.press(landed)
      expect(onAnswer.mock.calls[0][1], landed).toBe('asked')
      screen.unmount()
      screen = undefined
    }
  })
})

describe('neither ending grades the outcome', () => {
  const GRADES = /\bsuccess|\bsucceed|\bfailure\b|worked out|didn[’']t work|congratulat|\bwell done\b|\bthe right choice\b/i

  it('the married screen honours how she decided, not that she married', async () => {
    const ending = buildEnding(
      { gender: 'woman', answers: {}, mapHistory: [], read: null, beforeYes: null, couple: null, followups: [], completed: true },
      '2026-09-24',
    )
    screen = await mount(
      <Ending identity={{ firstName: 'Hodan', gender: 'woman', adult: true }} ending={ending} didEleven={false} saved={null} onSave={() => {}} onForget={async () => ({ map: true, progress: true, couple: true })} onBack={() => {}} />,
    )
    expect(screen.text()).not.toMatch(GRADES)
  })

  it('the ended screen, from either stage, never calls it a failure or a win', async () => {
    for (const from of ['talking', 'deciding'] as const) {
      screen = await mount(<Ended identity={{ firstName: 'Hodan', gender: 'woman', adult: true }} from={from} saved={null} onSave={() => {}} onDone={() => {}} />)
      expect(screen.text(), from).not.toMatch(GRADES)
      screen.unmount()
      screen = undefined
    }
  })
})
