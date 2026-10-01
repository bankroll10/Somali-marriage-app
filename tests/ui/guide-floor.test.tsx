// @vitest-environment happy-dom
import { act, useState } from 'react'
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

describe('the line at the foot of the guide', () => {
  // Part 21: the thread's help lines need a word or a shape the voice knows,
  // and held-out messages show it will not know every one. This one is there
  // whatever she wrote, and past the budget too.
  const unplaced = 'I keep thinking everyone would be fine if I just wasn’t around anymore.'

  it('is there under a message no list recognises, and opens to the emergency and crisis lines', async () => {
    const m = await mount(<Locked ask={unplaced} onSpend={() => {}} />)
    await m.until(() => m.text().includes(unplaced), 'her message')
    const floor = m.container.querySelector('details') as HTMLDetailsElement
    expect(floor.textContent).toBe('Not safe, or not okay?')
    floor.open = true
    floor.dispatchEvent(new Event('toggle'))
    await m.until(() => /crisis line/i.test(floor.textContent ?? ''), 'the crisis line')
    // No country on this phone: the numbers for the places the diaspora lives.
    expect(floor.textContent).toContain('If you are in danger now, call your local emergency number')
    expect(floor.textContent).toMatch(/A crisis line, where there is one: 988/)
    expect(fetchSpy).not.toHaveBeenCalled()
    m.unmount()
  })
})

describe('the line at the foot of the guide, with one country question for both lines', () => {
  // Part 29: the abuse line and the crisis line in the floor share one temporary
  // choice. The blocks in the thread, one per answer, are separate and unchanged.
  const unplaced = 'I keep thinking everyone would be fine if I just wasn’t around anymore.'
  const KEY = 'niyyah.intake.v1'
  afterEach(() => localStorage.removeItem(KEY))

  const toggle = (floor: HTMLDetailsElement, open: boolean) =>
    act(async () => {
      floor.open = open
      floor.dispatchEvent(new Event('toggle'))
    })
  const tels = (el: Element) => [...el.querySelectorAll('a')].map((a) => a.getAttribute('href')).filter((h) => h?.startsWith('tel:'))
  async function choose(select: HTMLSelectElement, value: string) {
    await act(async () => {
      select.value = value
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }

  it('opens to one selector; choosing a country updates both lines; closing and reopening asks again; nothing is sent', async () => {
    const m = await mount(<Locked ask={unplaced} onSpend={() => {}} />)
    await m.until(() => m.text().includes(unplaced), 'her message')
    const floor = m.container.querySelector('details') as HTMLDetailsElement
    await toggle(floor, true)
    await m.until(() => floor.querySelector('select'), 'the question')
    expect(floor.querySelectorAll('select')).toHaveLength(1)

    let select = floor.querySelector('select') as HTMLSelectElement
    await choose(select, 'uk')
    expect(floor.textContent).toContain('call 999')
    expect(floor.textContent).toContain('National Domestic Abuse Helpline, 0808 2000 247')
    expect(floor.textContent).toContain('To talk to someone: Samaritans, 116 123.')
    expect(tels(floor)).toEqual(['tel:999', 'tel:08082000247', 'tel:116123'])

    await choose(select, 'so')
    expect(tels(floor)).toEqual([])
    expect(floor.textContent).not.toContain('Samaritans')
    expect(floor.textContent).toContain('We don’t have a local support line listed for this location.')
    expect(floor.textContent).toMatch(/A crisis line, where there is one: 988 in the US and Canada, 116 123 in the UK\./)

    await choose(select, 'dk')
    expect(floor.textContent).toContain('Livslinien, 70 201 201 (daily, 09:00–05:00)')

    // Leaving and returning: the floor unmounts its blocks, so the choice goes with them.
    await toggle(floor, false)
    await m.until(() => !floor.querySelector('select'), 'the floor closed')
    await toggle(floor, true)
    await m.until(() => floor.querySelector('select'), 'the question again')
    select = floor.querySelector('select') as HTMLSelectElement
    expect(select.value).toBe('')
    expect(tels(floor)).toEqual([])
    expect(floor.textContent).not.toContain('Livslinien')
    expect(fetchSpy).not.toHaveBeenCalled()
    m.unmount()
  })

  it('a phone that knows her country has no question, and both lines are hers', async () => {
    localStorage.setItem(KEY, JSON.stringify({ identity: { scene: 'twin-cities', gender: 'woman' }, stage: 'talking', situated: true }))
    const m = await mount(<Locked ask={unplaced} onSpend={() => {}} />)
    await m.until(() => m.text().includes(unplaced), 'her message')
    const floor = m.container.querySelector('details') as HTMLDetailsElement
    await toggle(floor, true)
    await m.until(() => /988/.test(floor.textContent ?? ''), 'her lines')
    expect(floor.querySelector('select')).toBeNull()
    expect(tels(floor)).toEqual(['tel:911', 'tel:18007997233', 'tel:988'])
    m.unmount()
  })

  it('the blocks in the thread keep their own, independent question', async () => {
    const m = await mount(<Locked ask="he threatened me" onSpend={() => {}} />)
    await m.until(() => m.text().includes('If you are in danger now, call'), 'the safety reply and its line')
    const floor = m.container.querySelector('details') as HTMLDetailsElement
    await toggle(floor, true)
    await m.until(() => floor.querySelector('select'), 'the floor’s question')
    const [inThread, inFloor] = [...m.container.querySelectorAll('select')] as HTMLSelectElement[]
    expect(m.container.querySelectorAll('select')).toHaveLength(2)
    expect(floor.contains(inThread)).toBe(false)
    expect(floor.contains(inFloor)).toBe(true)
    // Unchanged by Part 29: a choice in one is not a choice in the other.
    await choose(inThread, 'uk')
    expect(inFloor.value).toBe('')
    expect(tels(floor)).toEqual([])
    m.unmount()
  })
})

