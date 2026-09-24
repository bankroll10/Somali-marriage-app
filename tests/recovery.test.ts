import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FOUNDER, FOUNDER_KEY, HANDLERS, blobs, call, serve } from './support/server'
import { Phone, onPhone } from './support/device'
import { restore, NotABackup } from '../netlify/shared/restore'
import { blobsModule } from './support/blobs'
import { keepMap, rememberedCode } from '../src/lib/keep'
import { joinCohort } from '../src/lib/cohort'
import { askFamily } from '../src/lib/vouch'
import { reportRungs, resetReported } from '../src/lib/progress'
import { day } from '../netlify/shared/day'

vi.mock('@netlify/blobs', async () => (await import('./support/blobs')).blobsModule)

/**
 * Disaster-recovery drills (docs/RECOVERY.md).
 *
 * Each scenario the review names that can be simulated safely is simulated
 * here, on every PR: a store lost, a store corrupted, a backup restored, a
 * secret lost or rotated, and every record shape the code has ever written
 * read by the code as it is now. A recovery procedure that is only written
 * down is a guess about the worst day; these are the ones that are run.
 */

const open = (name: string) => blobsModule.getStore(name) as never

/** A phone with a whole member on it, kept, counted and at the door. */
async function member(name = 'hers') {
  const phone = onPhone(new Phone(name))
  phone.storage.set(
    'niyyah.intake.v1',
    JSON.stringify({ answers: { timeline: '1-2' }, identity: { firstName: 'Hodan', gender: 'woman', adult: true, age: 29, scene: 'twin-cities' }, completed: true, stage: 'preparing' }),
  )
  const code = (await keepMap())!
  resetReported()
  await reportRungs(['arrived', 'mapped', 'kept'], 'twin-cities')
  await joinCohort({ scene: 'twin-cities', gender: 'woman', contact: 'hodan@example.com', age: 29 })
  return { phone, code }
}

const exported = async () => {
  const res = await call('export', 'GET', 'export', undefined, FOUNDER)
  expect(res.status).toBe(200)
  const { at: _at, ...rest } = (await res.json()) as Record<string, unknown>
  return rest
}

function wipe(store: string) {
  for (const k of blobs.keys(store)) blobs.stores.get(store)!.delete(k)
}

beforeEach(() => {
  blobs.reset()
  serve()
})

describe('deleted data: the learning record, restored from its backup', () => {
  it('comes back whole — export, lose it, restore, export again, and nothing differs', async () => {
    await member('a')
    await member('b')
    const before = await exported()
    expect(Object.keys(before.progress as object)).toHaveLength(2)

    wipe('progress')
    wipe('tallies')
    const backup = JSON.parse(JSON.stringify({ ...before, at: 'x' }))
    const report = await restore(backup, open, { write: true })
    expect(report).toMatchObject({ wrote: true, progress: { restored: 2, alreadyThere: 0, refused: 0 } })
    expect(await exported()).toEqual(before)
  })

  it('a dry run says what it would do, and writes nothing', async () => {
    await member()
    const backup = { ...(await exported()), at: 'x' }
    wipe('progress')
    const report = await restore(backup, open)
    expect(report.wrote).toBe(false)
    expect(report.progress.restored).toBe(1)
    expect(blobs.keys('progress')).toEqual([])
  })

  it('never writes over a record that came back on its own', async () => {
    const { phone } = await member()
    const backup = { ...(await exported()), at: 'x' }
    // She came back after the loss and reported again: hers is newer.
    wipe('progress')
    onPhone(phone)
    resetReported()
    await reportRungs(['arrived', 'mapped', 'kept', 'counted'], 'twin-cities')
    const newer = JSON.stringify([...blobs.stores.get('progress')!.values()].map((b) => b.value))
    const report = await restore(backup, open, { write: true })
    expect(report.progress).toMatchObject({ restored: 0, alreadyThere: 1 })
    expect(JSON.stringify([...blobs.stores.get('progress')!.values()].map((b) => b.value))).toBe(newer)
  })

  it('refuses what is not a backup, and anything a backup could not hold', async () => {
    await expect(restore({ version: 1, progress: {} }, open)).rejects.toThrow(NotABackup)
    await expect(restore('nonsense', open)).rejects.toThrow(NotABackup)
    const report = await restore({ version: 2, progress: { 'not a code': { first: {} }, CDFGHJKM: { nope: 1 } }, joint: null, door: {} }, open, { write: true })
    expect(report.progress).toMatchObject({ restored: 0, refused: 2 })
    expect(blobs.keys('progress')).toEqual([])
  })

  it('reports the door it cannot rebuild, so the gap is seen', async () => {
    await member()
    const report = await restore({ ...(await exported()), at: 'x' }, open)
    expect(report.door).toEqual({ cities: 1, women: 1, men: 0 })
  })
})

describe('deleted data: the maps lost, the phones put them back', () => {
  it('her next keep re-keeps the whole map from her phone, under a new code', async () => {
    const { phone, code } = await member()
    wipe('maps')
    onPhone(phone)
    const again = await keepMap()
    expect(again).toMatch(/^[A-Z2-9]{8}$/)
    expect(again).not.toBe(code)
    expect(rememberedCode()).toBe(again)
    const kept = blobs.read('maps', again!) as { snapshot: { identity: { firstName: string } } }
    expect(kept.snapshot.identity.firstName).toBe('Hodan')
  })

  it('the door join keeps it again and counts her', async () => {
    const { phone } = await member()
    wipe('maps')
    wipe('cohort')
    onPhone(phone)
    expect(await joinCohort({ scene: 'twin-cities', gender: 'woman' })).not.toBeNull()
  })

  it('the family’s vouch ask keeps it again, instead of failing for ever', async () => {
    const { phone } = await member()
    wipe('maps')
    onPhone(phone)
    const asked = await askFamily()
    expect(asked?.token).toMatch(/^[A-Z2-9]{10}$/)
    expect(blobs.read('vouches', `asked/${asked!.code}`)).toBe(asked!.token)
  })

  it('/health says a store was lost, the day it happens', async () => {
    for (const n of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) await member(n)
    const yesterday = day(Date.now() - 86_400_000)
    const first = await (await call('health', 'GET', 'health', undefined, FOUNDER)).json()
    const sizes = (first as { checks: { id: string; numbers: Record<string, number> }[] }).checks.find((c) => c.id === 'data')!.numbers
    // Move today's count to yesterday, as a run yesterday would have left it.
    blobs.put('ops', `sizes/${yesterday}`, { maps: sizes.maps, progress: sizes.progress, door: sizes.door, contacts: sizes.contacts, reports: sizes.reports })
    await blobs.store('ops').delete(`sizes/${day()}`)
    wipe('maps')
    const h = (await (await call('health', 'GET', 'health', undefined, FOUNDER)).json()) as { checks: { id: string; state: string; summary: string }[] }
    const data = h.checks.find((c) => c.id === 'data')!
    expect(data.state).toBe('fail')
    expect(data.summary).toMatch(/maps 8 → 0/)
  })

  it('a lost safety queue is red even when it held two reports', async () => {
    blobs.put('ops', `sizes/${day(Date.now() - 86_400_000)}`, { maps: 0, progress: 0, door: 0, contacts: 0, reports: 2 })
    const h = (await (await call('health', 'GET', 'health', undefined, FOUNDER)).json()) as { checks: { id: string; state: string }[] }
    expect(h.checks.find((c) => c.id === 'data')?.state).toBe('fail')
  })
})

describe('corruption: a record that is not what it should be', () => {
  const GARBAGE = ['not json {', '"a string where a record goes"', '[1, 2, 3]', 'null', '{"first": 7}']

  it('the backup leaves out what it cannot read, says so, and still arrives', async () => {
    await member()
    blobs.put('progress', 'CDFGHJKM', 'not json {')
    blobs.put('cohort', 'us/twin-cities/woman/city/none/CDFGHJKM', 'not json {')
    const res = await call('export', 'GET', 'export', undefined, FOUNDER)
    expect(res.status).toBe(200)
    const b = (await res.json()) as { skipped: number; progress: object; door: { us: { 'twin-cities': { women: number } } } }
    expect(b.skipped).toBe(2)
    expect(Object.keys(b.progress)).toHaveLength(1)
    // The entry is still counted — its count is its key; only its ledger was unreadable.
    expect(b.door.us['twin-cities'].women).toBe(2)
  })

  it.each(GARBAGE)('no route crashes on a record that reads as %s', async (junk) => {
    const { code } = await member()
    for (const store of ['maps', 'progress', 'vouches', 'couples', 'reports', 'contacts', 'tallies']) {
      blobs.put(store, code, junk)
      blobs.put(store, 'joint', junk)
    }
    blobs.put('cohort', `us/twin-cities/woman/city/none/${code}`, junk)
    const requests: [string, string, string, unknown?, Record<string, string>?][] = [
      ['keep', 'GET', `keep?code=${code}`],
      ['vouch', 'GET', `vouch?code=${code}`],
      ['couple', 'GET', `couple?code=${code}`],
      ['cohort', 'GET', 'cohort?scene=twin-cities'],
      ['cohort', 'POST', 'cohort', { code, scene: 'twin-cities', gender: 'woman' }],
      ['vouch', 'POST', 'vouch', { side: 'ask', code }],
      ['progress', 'POST', 'progress', { id: code, rungs: ['arrived'] }],
      ['export', 'GET', 'export', undefined, FOUNDER],
      ['progress', 'GET', 'progress', undefined, FOUNDER],
      ['vouch', 'GET', 'vouch', undefined, FOUNDER],
      ['couple', 'GET', 'couple', undefined, FOUNDER],
      ['cohort', 'GET', 'cohort', undefined, FOUNDER],
      ['pool', 'GET', 'pool?scene=twin-cities', undefined, FOUNDER],
      ['safety', 'GET', 'safety', undefined, FOUNDER],
      ['health', 'GET', 'health', undefined, FOUNDER],
      ['sweep', 'POST', 'sweep'],
    ]
    for (const [fn, method, path, body, headers] of requests) {
      const res = await call(fn, method, path, body, headers)
      const text = await res.text()
      expect(res.status, `${method} ${path} → ${text.slice(0, 80)}`).not.toBe(500)
      expect(() => JSON.parse(text), `${method} ${path}`).not.toThrow()
    }
  })
})

describe('a broken migration: every record shape ever written, read by the code as it is now', () => {
  // tests/fixtures/records: v1 was written by the real routes (a whole life:
  // kept, counted, vouched, the eleven sent and answered, a report filed and
  // one resolved, a code changed, a member forgotten). v0 is the same records
  // as they were before versioning — no `v`, no `rev`, timestamps to the
  // millisecond. A change that cannot read one of these fails here first
  // (docs/RECOVERY.md, "A broken migration"; docs/INTEGRITY.md).
  for (const version of ['v0', 'v1']) {
    it(`reads ${version} without a crash on any route`, async () => {
      const corpus = JSON.parse(readFileSync(`tests/fixtures/records/${version}.json`, 'utf8')) as Record<string, Record<string, unknown>>
      for (const [store, records] of Object.entries(corpus)) {
        for (const [key, value] of Object.entries(records)) blobs.put(store, key, value)
      }
      const maps = Object.keys(corpus.maps).filter((k) => /^[A-Z2-9]{8}$/.test(k))
      const couples = Object.keys(corpus.couples).filter((k) => /^[A-Z2-9]{8}$/.test(k))
      expect(maps.length).toBeGreaterThan(0)
      const requests: [string, string, string, unknown?, Record<string, string>?][] = [
        ...maps.flatMap((c) => [
          ['keep', 'GET', `keep?code=${c}`] as [string, string, string],
          ['vouch', 'GET', `vouch?code=${c}`] as [string, string, string],
        ]),
        ...couples.map((c) => ['couple', 'GET', `couple?code=${c}`] as [string, string, string]),
        ['cohort', 'GET', 'cohort?scene=twin-cities'],
        ['export', 'GET', 'export', undefined, FOUNDER],
        ['progress', 'GET', 'progress', undefined, FOUNDER],
        ['vouch', 'GET', 'vouch', undefined, FOUNDER],
        ['couple', 'GET', 'couple', undefined, FOUNDER],
        ['cohort', 'GET', 'cohort', undefined, FOUNDER],
        ['pool', 'GET', 'pool?scene=twin-cities', undefined, FOUNDER],
        ['safety', 'GET', 'safety', undefined, FOUNDER],
        ['health', 'GET', 'health', undefined, FOUNDER],
        ['sweep', 'POST', 'sweep'],
      ]
      for (const [fn, method, path, body, headers] of requests) {
        const res = await call(fn, method, path, body, headers)
        const text = await res.text()
        expect(res.status, `${version}: ${method} ${path} → ${text.slice(0, 120)}`).toBeLessThan(500)
      }
      // And a kept map of either version restores whole.
      const restored = (await (await call('keep', 'GET', `keep?code=${maps[0]}`)).json()) as { snapshot?: { identity?: { firstName?: string } } }
      expect(restored.snapshot?.identity?.firstName).toBe('Fixture')
    })
  }
})

describe('a lost or compromised secret', () => {
  it('without FOUNDER_KEY every readout is closed — and /health says so to the workflow as a 401', async () => {
    delete process.env.FOUNDER_KEY
    for (const fn of ['health', 'export', 'progress', 'safety']) {
      expect((await call(fn, 'GET', fn, undefined, FOUNDER)).status, fn).toBe(401)
    }
  })

  it('a rotated founder key: the old one is refused everywhere at once, the new one works', async () => {
    process.env.FOUNDER_KEY = 'a-brand-new-founder-key-of-real-length-000'
    for (const fn of Object.keys(HANDLERS).filter((f) => ['health', 'export', 'progress', 'safety', 'vouch', 'couple', 'cohort'].includes(f))) {
      expect((await call(fn, 'GET', fn, undefined, { authorization: `Bearer ${FOUNDER_KEY}` })).status, fn).toBe(401)
      expect((await call(fn, 'GET', fn, undefined, { authorization: `Bearer ${process.env.FOUNDER_KEY}` })).status, fn).toBe(200)
    }
  })

  it('without the Anthropic key the guide answers offline, and /health says so', async () => {
    const key = process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    expect((await call('guide', 'POST', 'guide', { message: 'salaam', mode: 'auntie' })).status).toBe(503)
    const h = (await (await call('health', 'GET', 'health', undefined, FOUNDER)).json()) as { checks: { id: string; state: string }[] }
    expect(h.checks.find((c) => c.id === 'claude')?.state).toBe('warn')
    if (key) process.env.ANTHROPIC_API_KEY = key
  })
})

describe('the domain lost: the site can move to another address', () => {
  // docs/RECOVERY.md, "Domain failure". Built with VITE_SITE_HOST set to the
  // fallback, only the printed sheets (fixed on paper by design) and the
  // contact address (mail lives on the domain) may still name the old one.
  it('the guide and its sample carry the configured host, and never the old one', async () => {
    const { guideHtml, sampleHtml } = await import('../src/lib/guidePages')
    const { GUIDE } = await import('../src/data/tools')
    for (const render of [guideHtml, sampleHtml]) {
      const html = render(GUIDE, { host: 'getniyyah.netlify.app' })
      expect(html).toContain('getniyyah.netlify.app')
      expect(html).not.toContain('joinniyyah.com')
    }
  })
})
