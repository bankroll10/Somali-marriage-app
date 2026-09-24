import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { memStore, stores } from './support/memory'

/**
 * The abuse cases in docs/ABUSE.md that a server can answer, each written
 * against the code before it was fixed and watched fail.
 */

vi.mock('@netlify/blobs', async () => (await import('./support/memory')).memoryModule)

const { default: safety } = await import('../netlify/functions/safety')
const { default: couple } = await import('../netlify/functions/couple')
const { default: keep } = await import('../netlify/functions/keep')
const { sweepExpired } = await import('../netlify/functions/sweep')
type Swept = Parameters<typeof sweepExpired>[0]
/** The sweep takes the stores the way netlify/functions/sweep.ts's handler gets them. */
const sweepAll = (now?: number) => sweepExpired(memStore('couples') as unknown as Swept, memStore('progress') as unknown as Swept, now)

const store = (name: string) => {
  if (!stores.has(name)) stores.set(name, new Map())
  return stores.get(name)!
}
const PAIR = 'HJKM47QR'
const MAP = 'ACDEFG34'
const sheet = (expiresAt = '2099-01-01', second?: Record<string, string>) =>
  JSON.stringify({ v: 1, creator: 'man', first: { money: 'agree' }, ...(second ? { second } : {}), createdAt: '2026-01-01', expiresAt })

const report = (code = PAIR) =>
  safety(new Request('http://x/.netlify/functions/safety', { method: 'POST', body: JSON.stringify({ code, side: 'woman', reason: 'threats' }) }))
const coupleDelete = (code = PAIR) => couple(new Request(`http://x/.netlify/functions/couple?code=${code}`, { method: 'DELETE' }))
const coupleGet = (code = PAIR) => couple(new Request(`http://x/.netlify/functions/couple?code=${code}`))

beforeEach(() => {
  stores.clear()
  store('couples').set(PAIR, sheet())
})

describe('a report outlives the sheet it is about', () => {
  // The reported man holds the couple code too. Deleting the sheet was one
  // request, and every report after it was a 404 — shown to her as "Didn't
  // send — try again".
  it('after the other side deletes the sheet', async () => {
    expect((await coupleDelete()).status).toBe(200)
    expect((await report()).status).toBe(200)
  })

  it('after a forget-me cascade takes the sheet with the map', async () => {
    store('maps').set(MAP, JSON.stringify({ snapshot: { couple: { code: PAIR } }, createdAt: '2026-01-01', expiresAt: '2099-01-01' }))
    expect((await keep(new Request(`http://x/.netlify/functions/keep?code=${MAP}`, { method: 'DELETE' }))).status).toBe(200)
    expect((await report()).status).toBe(200)
  })

  it('after the sheet runs out its ninety days and is swept', async () => {
    // Ran out two days ago; the window runs ninety days from then.
    store('couples').set(PAIR, sheet(new Date(Date.now() - 2 * 86_400_000).toISOString()))
    await sweepAll()
    expect(store('couples').has(PAIR)).toBe(false)
    expect((await report()).status).toBe(200)
  })

  it('what is left behind is a date and nothing else, and reads as gone', async () => {
    await coupleDelete()
    const left = [...store('couples').entries()]
    expect(left).toHaveLength(1)
    expect(Object.keys(JSON.parse(left[0][1]))).toEqual(['expiresAt'])
    expect((await coupleGet()).status).toBe(404)
  })

  it('and ends: past its own window the sweep takes it, and a report is refused', async () => {
    await coupleDelete()
    await sweepAll(Date.now() + 91 * 86_400_000)
    expect(store('couples').size).toBe(0)
    expect((await report()).status).toBe(404)
  })

  it('a code that never named a sheet leaves nothing behind when a snapshot claims it', async () => {
    store('maps').set(MAP, JSON.stringify({ snapshot: { couple: { code: 'WXYQRT78' } }, createdAt: '2026-01-01', expiresAt: '2099-01-01' }))
    await keep(new Request(`http://x/.netlify/functions/keep?code=${MAP}`, { method: 'DELETE' }))
    expect((await report('WXYQRT78')).status).toBe(404)
  })
})

describe('a report is filed as the side that files it', () => {
  // The answered-already screen never learned which side it was answering
  // for, so every report from it said "man" — a woman who answered a man's
  // eleven reported herself.
  it('the joint names the side that answered', async () => {
    store('couples').set(PAIR, sheet('2099-01-01', { money: 'agree' }))
    const body = await (await coupleGet()).json()
    expect(body.status).toBe('joint')
    expect(body.answerFor).toBe('woman')
  })
})

describe('an urgent report does not wait for Monday', () => {
  // The only alert was a job that ran on Mondays. "Threatened me" filed on a
  // Tuesday was read six days later at best (docs/ABUSE.md). The rule now
  // lives in /health, where it is tested as behaviour (tests/ops.test.ts:
  // urgent fails the daily run, anything open fails Monday's); what is left
  // here is that the job still runs through the 09:00 hour every day, and
  // fails on the cadence /health gives each check.
  const watch = readFileSync(new URL('../.github/workflows/watch.yml', import.meta.url), 'utf8')

  it('runs through 09:00 every day, and fails each check on its own cadence', () => {
    expect(watch).toMatch(/cron: '0 \*\/3 \* \* \*'/)
    expect(watch).toMatch(/\.cadence == "daily" and \$daily/)
    expect(watch).toMatch(/\.cadence == "weekly" and \$weekly/)
    expect(watch).toMatch(/"\$hour" = "09" \] && \[ "\$dow" = "1"/)
  })
})

describe('changing a code someone has seen', () => {
  // Possession is the authority (docs/HARD.md), so a code seen over her
  // shoulder, or taken from her phone, let its holder read her map and
  // overwrite it. The only remedy was forget me, which cost her the map
  // (docs/THREAT.md, T8).
  const rotate = (code = MAP) => keep(new Request(`http://x/.netlify/functions/keep?code=${code}`, { method: 'PUT' }))

  beforeEach(() => {
    store('maps').set(MAP, JSON.stringify({ v: 1, snapshot: { identity: { firstName: 'Hodan' } }, createdAt: '2026-09-01', expiresAt: '2099-01-01' }))
  })

  it('hands back a new code, and the old one opens nothing', async () => {
    const res = await rotate()
    expect(res.status).toBe(200)
    const { code } = await res.json()
    expect(code).toMatch(/^[A-Z0-9]{8}$/)
    expect(code).not.toBe(MAP)
    // It opens nothing, and says why: moved (docs/INTEGRITY.md) — never where to.
    const old = await keep(new Request(`http://x/.netlify/functions/keep?code=${MAP}`))
    expect(old.status).toBe(410)
    expect(await old.json()).toEqual({ error: 'moved' })
    expect(JSON.parse(store('maps').get(code)!).snapshot.identity.firstName).toBe('Hodan')
  })

  it('leaves nothing under the old code', async () => {
    await rotate()
    // The tombstone that closes the old code is not hers: a reason and a date.
    expect([...store('maps').keys()].filter((k) => k.includes(MAP) && k !== `ended/${MAP}`)).toEqual([])
  })

  it('a code with nothing under it is a 404, and a bad one a 400', async () => {
    expect((await rotate('WXYQRT78')).status).toBe(404)
    expect((await rotate('nope')).status).toBe(400)
  })
})
