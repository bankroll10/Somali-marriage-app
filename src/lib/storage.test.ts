import { afterEach, describe, expect, it, vi } from 'vitest'
import { THREAD_LIMIT, loadProgress, saveProgress } from './storage'

/** docs/PRIVACY.md, R6: the guide's threads are the most sensitive words on the phone. */
describe('what the phone keeps of a conversation with the guide', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('the last forty messages per voice, not every one ever written', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
    const thread = Array.from({ length: 100 }, (_, i) => ({ id: String(i), role: 'user' as const, text: `message ${i}` }))
    saveProgress({ answers: {}, identity: {}, coachThreads: { auntie: thread } } as never)
    const kept = loadProgress()!.coachThreads.auntie!
    expect(kept).toHaveLength(THREAD_LIMIT)
    expect(kept[0].text).toBe('message 60')
    expect(kept.at(-1)!.text).toBe('message 99')
  })
})
