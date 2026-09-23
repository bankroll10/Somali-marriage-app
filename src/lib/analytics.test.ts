import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * docs/PRIVACY.md, C6: the event log is a hallway-test aid, read by nothing in
 * the product. On the phone it was an activity diary — "safety_reported",
 * "stage_changed: married", "door_hesitated", each to the millisecond — that
 * anyone holding the phone could read. It lives for the session now.
 */

function installStorage(seed: Record<string, string> = {}) {
  const store = new Map(Object.entries(seed))
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
  })
  return store
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('what the event log leaves on the phone', () => {
  it('nothing: events are kept for the session, not written to storage', async () => {
    const store = installStorage()
    const { track, sessionEvents } = await import('./analytics')
    track('safety_reported')
    track('stage_changed', { stage: 'married' })
    expect(store.size).toBe(0)
    expect(sessionEvents()).toHaveLength(2)
  })

  it('and the diary an older version wrote is cleared on the next visit', async () => {
    const store = installStorage({ 'niyyah.events.v1': '[{"event":"safety_reported","t":1}]' })
    await import('./analytics')
    expect(store.has('niyyah.events.v1')).toBe(false)
  })
})
