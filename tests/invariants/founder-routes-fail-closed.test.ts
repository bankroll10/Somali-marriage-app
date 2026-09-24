import { readdirSync, readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FOUNDER_KEY, blobs, call } from '../support/server'

vi.mock('@netlify/blobs', async () => (await import('../support/blobs')).blobsModule)

/**
 * INVARIANT — every founder route fails closed (docs/TESTING.md).
 *
 * A readout that answers without the founder's key publishes the door's
 * tally, the pool's shape, the ladder, every open report in her own words,
 * and the backup. Each function's own tests checked some of this, route by
 * route; nothing said *every* gated route was covered, so a new readout
 * written without the gate would have passed the whole suite.
 *
 * So the table below is checked against the code: every founder check in
 * netlify/functions must have a row, and every row must still be gated.
 * Each row is refused, with nothing of anyone's in the body, under every way
 * of almost having the key — and answers with the key, so the table is not
 * refusing for some other reason.
 */

interface Row {
  fn: string
  method: string
  path: string
}

const ROWS: Row[] = [
  { fn: 'cohort', method: 'GET', path: 'cohort' },
  { fn: 'couple', method: 'GET', path: 'couple' },
  { fn: 'export', method: 'GET', path: 'export' },
  { fn: 'guide', method: 'GET', path: 'guide' },
  { fn: 'pool', method: 'GET', path: 'pool?scene=twin-cities' },
  { fn: 'progress', method: 'GET', path: 'progress' },
  { fn: 'safety', method: 'GET', path: 'safety' },
  { fn: 'safety', method: 'DELETE', path: 'safety?code=TWXY3478&side=woman&id=ACDEFGHJKM&outcome=no-action' },
  { fn: 'vouch', method: 'GET', path: 'vouch' },
]

/** Things only a member wrote. Any of them in a refused reply is a leak. */
const NEEDLES = ['Zqfounderleakname', 'zqleak@example.com', 'Zq her own words about him', 'Zq his father says so']

function seed() {
  blobs.put('maps', 'HJKMNPQR', { snapshot: { identity: { firstName: NEEDLES[0], age: 27 }, stage: 'preparing', answers: {} }, createdAt: '2026-09-01', expiresAt: '2099-01-01', v: 1 })
  blobs.put('cohort', 'us/twin-cities/woman/city/serious/HJKMNPQR', { at: '2026-09-01', ledger: ['map'], v: 1 })
  blobs.put('cohort', 'index/HJKMNPQR', 'us/twin-cities/woman/city/serious/HJKMNPQR')
  blobs.put('contacts', 'HJKMNPQR', { contact: NEEDLES[1], scene: 'twin-cities', country: 'us', at: '2026-09-01', v: 1 })
  blobs.put('couples', 'TWXY3478', { creator: 'woman', owner: 'CDEFGHJKMN', first: {}, createdAt: '2026-09-01', expiresAt: '2099-01-01', v: 1 })
  blobs.put('reports', 'TWXY3478-woman-ACDEFGHJKM', { id: 'ACDEFGHJKM', code: 'TWXY3478', side: 'woman', reason: 'threats', details: NEEDLES[2], at: '2026-09-02', v: 1 })
  blobs.put('vouches', 'HJKMNPQR', { relationship: 'father', firstName: 'Abdi', sentence: NEEDLES[3], at: '2026-09-02', v: 1 })
  blobs.put('progress', 'CDEFGHJK', { first: { arrived: '2026-09-01' }, expiresAt: '2099-01-01', v: 1 })
}

/** Every way of almost holding the key. */
const ALMOST: [string, Record<string, string>][] = [
  ['no header at all', {}],
  ['a wrong key', { authorization: 'Bearer not-the-key' }],
  ['the key less its last character', { authorization: `Bearer ${FOUNDER_KEY.slice(0, -1)}` }],
  ['the key and one more', { authorization: `Bearer ${FOUNDER_KEY}x` }],
  ['the key in the wrong case', { authorization: `Bearer ${FOUNDER_KEY.toUpperCase()}` }],
  ['the right key under the wrong scheme', { authorization: `Basic ${FOUNDER_KEY}` }],
  ['a scheme and no key', { authorization: 'Bearer ' }],
]

beforeEach(() => {
  blobs.reset()
  seed()
  vi.stubEnv('FOUNDER_KEY', FOUNDER_KEY)
})
afterEach(() => vi.unstubAllEnvs())

describe('the table covers every founder check in the code', () => {
  const dir = new URL('../../netlify/functions/', import.meta.url)
  const checks = Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .map((f) => [f.replace(/\.ts$/, ''), (readFileSync(new URL(f, dir), 'utf8').match(/(?:isFounder|requireFounder)\(req\)/g) ?? []).length])
      .filter(([, n]) => (n as number) > 0),
  ) as Record<string, number>

  it('has a row for every function that checks for the founder, and as many rows as it has checks', () => {
    const rows: Record<string, number> = {}
    for (const r of ROWS) rows[r.fn] = (rows[r.fn] ?? 0) + 1
    expect(Object.keys(rows).sort()).toEqual(Object.keys(checks).sort())
    for (const [fn, n] of Object.entries(checks)) expect(rows[fn], `${fn} has ${n} founder checks`).toBeGreaterThanOrEqual(n)
  })
})

describe.each(ROWS)('$method /$path', (row) => {
  it.each(ALMOST)('refuses %s, and says nothing of anyone', async (_why, headers) => {
    const res = await call(row.fn, row.method, row.path, undefined, headers)
    expect(res.status).toBe(401)
    const body = await res.text()
    for (const n of NEEDLES) expect(body).not.toContain(n)
    expect(body).not.toContain(FOUNDER_KEY)
  })

  it('refuses even the right key when no key is set on the server — closed, not open', async () => {
    vi.stubEnv('FOUNDER_KEY', '')
    const res = await call(row.fn, row.method, row.path, undefined, { authorization: `Bearer ${FOUNDER_KEY}` })
    expect(res.status).toBe(401)
  })

  it('answers the founder — so the refusals above are the gate, not something else', async () => {
    const res = await call(row.fn, row.method, row.path, undefined, { authorization: `Bearer ${FOUNDER_KEY}` })
    expect(res.status).toBe(200)
  })
})
