// @vitest-environment happy-dom
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Coach from '../../src/components/Coach'
import { CRISIS_REPLY, SAFETY_REPLY, localReply } from '../../src/lib/coach'
import type { CoachMessage, ModeId } from '../../src/types'
import { mount } from '../support/render'

/**
 * The floor under the guide's budget: whatever she hands it, something answers.
 *
 * The reply budget refills with progress, and past it the guide stops
 * answering live. Until 2026-09-24 it stopped answering at all: `send()`
 * returned on `locked`, and a message typed on Home ("I want to die", "he
 * threatened me") was marked handed over and vanished under the wall, while
 * the phone's own crisis and safety replies — which cost nothing — never ran
 * (docs/DECISIONS.md, the completion review, B1). Past the budget the answer
 * now comes from the phone, and nothing is charged or sent.
 */

type Threads = Partial<Record<ModeId, CoachMessage[]>>

function Locked({ ask, onSpend }: { ask: string; onSpend: () => void }) {
  const [threads, setThreads] = useState<Threads>({})
  return (
    <Coach
      identity={{ gender: 'woman', adult: true }}
      answers={{}}
      threads={threads}
      onThreadsChange={setThreads}
      initialMode="auntie"
      initialAsk={{ text: ask, why: '' }}
      repliesLeft={0}
      onSpendReply={onSpend}
      onCommit={() => {}}
      onBack={() => {}}
    />
  )
}

const firstLine = (text: string) => text.split('\n')[0]

let fetchSpy: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchSpy = vi.fn(async () => new Response('{}', { status: 500 }))
  vi.stubGlobal('fetch', fetchSpy)
})
afterEach(() => vi.unstubAllGlobals())

describe('the guide past its budget', () => {
  it('answers a crisis with the crisis reply and the help line, and spends nothing', async () => {
    const onSpend = vi.fn()
    const m = await mount(<Locked ask="I want to die" onSpend={onSpend} />)
    await m.until(() => m.text().includes(firstLine(CRISIS_REPLY)), 'the crisis reply')
    expect(m.text()).toContain('I want to die')
    expect(m.text()).toMatch(/crisis line/i)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(onSpend).not.toHaveBeenCalled()
    m.unmount()
  })

  it('answers a threat with the safety reply and the emergency line', async () => {
    const m = await mount(<Locked ask="he threatened me" onSpend={() => {}} />)
    await m.until(() => m.text().includes(firstLine(SAFETY_REPLY)), 'the safety reply')
    expect(m.text()).toContain('If you are in danger now, call')
    expect(fetchSpy).not.toHaveBeenCalled()
    m.unmount()
  })

  it('keeps an ordinary message on screen and answers it from the phone, under the wall', async () => {
    const m = await mount(<Locked ask="He only texts me late at night" onSpend={() => {}} />)
    const expected = localReply('He only texts me late at night', { identity: { gender: 'woman', adult: true }, answers: {} }, 'auntie')
    await m.until(() => m.text().includes(firstLine(expected.text).slice(0, 60)), 'the offline answer')
    expect(m.text()).toContain('He only texts me late at night')
    expect(m.text()).toContain('The guide has said what it can, for now')
    expect(m.text()).not.toMatch(/Ask again in a moment for the fuller one/)
    expect(fetchSpy).not.toHaveBeenCalled()
    m.unmount()
  })
})
