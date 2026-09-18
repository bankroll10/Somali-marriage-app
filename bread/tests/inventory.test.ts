import { beforeEach, describe, expect, it } from 'vitest'
import { resetStores } from './memstore.ts'
import { breadStore, readDay } from '../netlify/lib/store.ts'
import { confirm, release, remaining, reserve, setBlocked } from '../netlify/lib/inventory.ts'
import type { Hold } from '../shared/types.ts'

const NOW = Date.UTC(2026, 8, 18, 12)
const later = new Date(NOW + 30 * 60_000).toISOString()
const hold = (orderId: string, sourdough: number, banana = 0, expiresAt = later): Hold => ({ orderId, qty: { sourdough, banana }, expiresAt })

beforeEach(resetStores)

describe('inventory', () => {
  it('starts with full capacity and counts holds and sales against it', async () => {
    const store = breadStore()
    expect(remaining((await readDay(store, '2026-09-21')).value, NOW)).toEqual({ sourdough: 3, banana: 4 })
    expect((await reserve(store, '2026-09-21', hold('a', 2, 1), NOW)).ok).toBe(true)
    expect(remaining((await readDay(store, '2026-09-21')).value, NOW)).toEqual({ sourdough: 1, banana: 3 })
    expect(await confirm(store, '2026-09-21', 'a', { sourdough: 2, banana: 1 }, NOW)).toMatchObject({ ok: true })
    const day = (await readDay(store, '2026-09-21')).value
    expect(day.sold).toEqual({ sourdough: 2, banana: 1 })
    expect(day.holds).toEqual([])
    expect(day.orderIds).toEqual(['a'])
  })

  it('refuses a hold that would oversell, and only that one', async () => {
    const store = breadStore()
    expect((await reserve(store, '2026-09-21', hold('a', 3), NOW)).ok).toBe(true)
    expect(await reserve(store, '2026-09-21', hold('b', 1), NOW)).toEqual({ ok: false, reason: 'sold_out' })
    expect((await reserve(store, '2026-09-21', hold('c', 0, 4), NOW)).ok).toBe(true)
    expect(await reserve(store, '2026-09-21', hold('d', 0, 1), NOW)).toEqual({ ok: false, reason: 'sold_out' })
  })

  it('never oversells under ten simultaneous checkouts', async () => {
    const store = breadStore()
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => reserve(store, '2026-09-23', hold(`o${i}`, 1, 1), NOW)))
    const won = results.filter((r) => r.ok)
    expect(won).toHaveLength(3)
    expect(results.filter((r) => !r.ok && r.reason === 'sold_out')).toHaveLength(7)
    const day = (await readDay(store, '2026-09-23')).value
    expect(day.holds).toHaveLength(3)
    expect(remaining(day, NOW)).toEqual({ sourdough: 0, banana: 1 })
  })

  it('ignores expired holds and drops them on the next write', async () => {
    const store = breadStore()
    const stale = new Date(NOW - 1000).toISOString()
    expect((await reserve(store, '2026-09-21', hold('a', 3, 4, stale), NOW - 60_000)).ok).toBe(true)
    expect(remaining((await readDay(store, '2026-09-21')).value, NOW)).toEqual({ sourdough: 3, banana: 4 })
    expect((await reserve(store, '2026-09-21', hold('b', 1), NOW)).ok).toBe(true)
    expect((await readDay(store, '2026-09-21')).value.holds.map((h) => h.orderId)).toEqual(['b'])
  })

  it('releases and confirms idempotently', async () => {
    const store = breadStore()
    await reserve(store, '2026-09-21', hold('a', 1), NOW)
    await release(store, '2026-09-21', 'a', NOW)
    await release(store, '2026-09-21', 'a', NOW)
    expect(remaining((await readDay(store, '2026-09-21')).value, NOW)).toEqual({ sourdough: 3, banana: 4 })
    await reserve(store, '2026-09-21', hold('b', 1), NOW)
    await confirm(store, '2026-09-21', 'b', { sourdough: 1, banana: 0 }, NOW)
    await confirm(store, '2026-09-21', 'b', { sourdough: 1, banana: 0 }, NOW)
    const day = (await readDay(store, '2026-09-21')).value
    expect(day.sold.sourdough).toBe(1)
    expect(day.orderIds).toEqual(['b'])
  })

  it('still records a sale whose hold had expired — the money was taken', async () => {
    const store = breadStore()
    await reserve(store, '2026-09-21', hold('slow', 3), NOW)
    const much = NOW + 60 * 60_000
    await reserve(store, '2026-09-21', hold('fast', 3), much)
    await confirm(store, '2026-09-21', 'slow', { sourdough: 3, banana: 0 }, much)
    const day = (await readDay(store, '2026-09-21')).value
    expect(day.sold.sourdough).toBe(3)
    // The later hold still stands; remaining floors at zero and admin shows 6 to bake.
    expect(remaining(day, much).sourdough).toBe(0)
  })

  it('blocks a date so nothing new can be held', async () => {
    const store = breadStore()
    expect((await setBlocked(store, '2026-09-21', true, NOW)).ok).toBe(true)
    expect(await reserve(store, '2026-09-21', hold('a', 1), NOW)).toEqual({ ok: false, reason: 'blocked' })
    await setBlocked(store, '2026-09-21', false, NOW)
    expect((await reserve(store, '2026-09-21', hold('a', 1), NOW)).ok).toBe(true)
  })
})
