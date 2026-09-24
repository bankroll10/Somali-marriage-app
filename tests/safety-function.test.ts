import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The one place a member can name a real person. These tests check the
 * boundary as hard as the value inside it: a report can only be raised
 * against a couple code that actually exists, every closed field is really
 * closed, the founder's queue is age-sorted, and resolving one deletes it —
 * nothing here is a tally or a record that outlives being acted on.
 */

const stores = new Map<string, Map<string, string>>()

function memStore(name: string) {
  const m = stores.get(name) ?? new Map<string, string>()
  stores.set(name, m)
  return {
    get: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key) ?? null
      return v !== null && opts?.type === 'json' ? JSON.parse(v) : v
    },
    getMetadata: async (key: string) => (m.has(key) ? { etag: 'x', metadata: {} } : null),
    getWithMetadata: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key) ?? null
      if (v === null) return null
      return { data: opts?.type === 'json' ? JSON.parse(v) : v, etag: v, metadata: {} }
    },
    // Conditional writes behave like the real store's, so the hourly cap in
    // shared/limit.ts counts here the way it does in production.
    setJSON: async (key: string, value: unknown, opts?: { onlyIfMatch?: string; onlyIfNew?: boolean }) => {
      if (opts?.onlyIfNew && m.has(key)) return { modified: false }
      if (opts?.onlyIfMatch && opts.onlyIfMatch !== m.get(key)) return { modified: false }
      m.set(key, JSON.stringify(value))
      return { modified: true }
    },
    delete: async (key: string) => void m.delete(key),
    list: async () => ({ blobs: [...m.keys()].map((key) => ({ key })) }),
  }
}
vi.mock('@netlify/blobs', () => ({ getStore: (arg: string | { name: string }) => memStore(typeof arg === 'string' ? arg : arg.name) }))

const { default: handler } = await import('../netlify/functions/safety')
const { TOKEN } = await import('../netlify/shared/code')

const CODE = 'ACDEFG'
const post = (body: unknown) => handler(new Request('http://x/.netlify/functions/safety', { method: 'POST', body: JSON.stringify(body) }))
const get = (headers: Record<string, string> = {}) => handler(new Request('http://x/.netlify/functions/safety', { headers }))
const del = (params: string, headers: Record<string, string> = {}) =>
  handler(new Request(`http://x/.netlify/functions/safety?${params}`, { method: 'DELETE', headers }))

function seedCouple(code: string) {
  stores.set('couples', new Map([[code, JSON.stringify({ creator: 'woman', first: {}, createdAt: '2026-01-01', expiresAt: '2099-01-01' })]]))
}

beforeEach(() => {
  stores.clear()
  seedCouple(CODE)
})
afterEach(() => vi.unstubAllEnvs())

describe('reporting a concern', () => {
  it('needs a couple code that actually exists', async () => {
    const res = await post({ code: 'HJKMNP', side: 'woman', reason: 'harassment' })
    expect(res.status).toBe(404)
  })

  it('refuses a code shaped wrong, a side off the list, and a reason off the list', async () => {
    expect((await post({ code: 'nope', side: 'woman', reason: 'harassment' })).status).toBe(400)
    expect((await post({ code: CODE, side: 'x', reason: 'harassment' })).status).toBe(400)
    expect((await post({ code: CODE, side: 'woman', reason: 'made-up' })).status).toBe(400)
  })

  it('accepts a real report, with details capped and optional', async () => {
    const res = await post({ code: CODE, side: 'woman', reason: 'threats', details: 'x'.repeat(900) })
    expect(res.status).toBe(200)
    const answer = await res.json()
    expect(answer.received).toBe(true)

    const stored = JSON.parse([...stores.get('reports')!.values()][0])
    // Nothing comes back that could take it back (docs/ABUSE.md, coercion).
    expect(answer).toEqual({ received: true })
    expect(stored.reason).toBe('threats')
    expect(stored.details.length).toBe(500)
    expect(stored.at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(stored.id).toMatch(TOKEN)

    const bare = await post({ code: CODE, side: 'man', reason: 'other' })
    expect(bare.status).toBe(200)
    const hisKey = [...stores.get('reports')!.keys()].find((k) => k.includes('-man-'))!
    expect(JSON.parse(stores.get('reports')!.get(hisKey)!).details).toBeUndefined()
  })

  it('refuses an oversized body before parsing it', async () => {
    const big = new Request('http://x/.netlify/functions/safety', { method: 'POST', body: 'x'.repeat(3000) })
    expect((await handler(big)).status).toBe(413)
  })
})

describe('the founder\'s queue', () => {
  /** Every open report in the store, as the founder would receive them. */
  const openReports = () =>
    [...stores.get('reports')!.entries()]
      .filter(([k]) => !k.startsWith('resolved/'))
      .map(([, v]) => JSON.parse(v))

  it('refuses outright until a key is set — this queue fails closed', async () => {
    // Every other readout here fails open, so a missing variable never locks
    // the founder out of her own numbers. That trade is wrong for free text
    // naming a specific person: one misconfigured deploy publishes it, and
    // unlike a tally it cannot be un-published. docs/HARD.md.
    await post({ code: CODE, side: 'woman', reason: 'harassment' })
    expect((await get()).status).toBe(401)

    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    expect((await get()).status).toBe(401)
    expect((await get({ authorization: 'Bearer nope' })).status).toBe(401)
    expect((await get({ authorization: 'Bearer open-sesame' })).status).toBe(200)
  })

  it('hands back the open ones oldest first, a person may be waiting', async () => {
    await post({ code: CODE, side: 'woman', reason: 'harassment' })
    seedCouple('HJKMNP')
    await post({ code: 'HJKMNP', side: 'man', reason: 'sexual' })

    // Give the two reports distinct days so the sort is meaningful.
    const reports = stores.get('reports')!
    for (const [key, value] of reports.entries()) {
      const r = JSON.parse(value)
      r.at = r.code === CODE ? '2026-01-01' : '2026-06-01'
      reports.set(key, JSON.stringify(r))
    }

    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    const queue = await get({ authorization: 'Bearer open-sesame' })
    // The most sensitive body in the product, even behind the key.
    expect(queue.headers.get('cache-control')).toBe('no-store')
    const body = await queue.json()
    expect(body.reports.map((r: { code: string }) => r.code)).toEqual([CODE, 'HJKMNP'])
  })

  /**
   * The report used to be written to `${code}-${side}` with a plain setJSON,
   * and nothing here can validate that the caller is the side they claim — the
   * couple code is shared with the other person by design. So the reported man
   * held the exact key needed to POST as her and overwrite her report with a
   * blank one.
   */
  it('cannot be overwritten by the person it is about', async () => {
    await post({ code: CODE, side: 'woman', reason: 'threats', details: 'He said he would come to my work.' })

    // Him, holding the same code, posting as her.
    await post({ code: CODE, side: 'woman', reason: 'other', details: 'nothing happened' })

    const open = openReports()
    expect(open).toHaveLength(2)
    // Hers survives, word for word.
    expect(open.some((r) => r.details === 'He said he would come to my work.')).toBe(true)
  })

  it('keeps every report when the same person reports twice — the escalation is the point', async () => {
    await post({ code: CODE, side: 'woman', reason: 'harassment' })
    await post({ code: CODE, side: 'woman', reason: 'threats' })
    expect(openReports().map((r) => r.reason).sort()).toEqual(['harassment', 'threats'])
  })
})

describe('resolving a report', () => {
  const resolve = (report: { code: string; side: string; id: string }, outcome: string) =>
    del(`code=${report.code}&side=${report.side}&id=${report.id}&outcome=${outcome}`, {
      authorization: 'Bearer open-sesame',
    })

  it('expunges her words and keeps the lesson — the reason, the day, what was done', async () => {
    await post({ code: CODE, side: 'woman', reason: 'threats', details: 'He said he would come to my work.' })
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    const report = JSON.parse([...stores.get('reports')!.values()][0])

    expect((await del(`code=${CODE}&side=woman&id=${report.id}&outcome=no-action`)).status).toBe(401)
    expect((await resolve(report, 'told-the-family')).status).toBe(200)

    const keys = [...stores.get('reports')!.keys()]
    expect(keys).toEqual([`resolved/${report.id}`])
    const stub = JSON.parse(stores.get('reports')!.get(keys[0])!)
    expect(stub).toEqual({ reason: 'threats', at: report.at, resolvedAt: expect.any(String), outcome: 'told-the-family', v: 1 })
    // Nothing of hers, and nothing that points at anyone.
    const serialised = JSON.stringify(stub)
    for (const gone of ['He said he would come to my work.', CODE, 'woman']) {
      expect(serialised).not.toContain(gone)
    }
  })

  it('counts the resolved ones by kind of harm and by what was done', async () => {
    // The taxonomy docs/GAPS.md names as its own test, which deleting made
    // permanently uncomputable.
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    for (const reason of ['threats', 'threats', 'harassment']) {
      await post({ code: CODE, side: 'woman', reason })
      const open = [...stores.get('reports')!.entries()].find(([k]) => !k.startsWith('resolved/'))!
      await resolve(JSON.parse(open[1]), 'spoke-to-them')
    }
    const body = await (await get({ authorization: 'Bearer open-sesame' })).json()
    expect(body.reports).toEqual([])
    expect(body.resolved.byReason).toEqual({ threats: 2, harassment: 1 })
    expect(body.resolved.byOutcome).toEqual({ 'spoke-to-them': 3 })
  })

  it('needs an outcome from the list, and a report that is really there', async () => {
    await post({ code: CODE, side: 'woman', reason: 'harassment' })
    vi.stubEnv('FOUNDER_KEY', 'open-sesame')
    const report = JSON.parse([...stores.get('reports')!.values()][0])

    expect((await resolve(report, 'made-it-up')).status).toBe(400)
    expect((await resolve({ ...report, id: 'HJKMNP' }, 'no-action')).status).toBe(404)
    expect((await resolve(report, 'no-action')).status).toBe(200)
  })
})

describe('nobody but the founder takes a report back', () => {
  it('a delete without the founder’s key moves nothing — there is no withdrawal', async () => {
    await post({ code: CODE, side: 'woman', reason: 'threats', details: 'her words' })
    const [key] = [...stores.get('reports')!.keys()]
    const id = key.split('-').pop()!
    // Everything a person holding the pair's code, her side and the id could send.
    expect((await del(`code=${CODE}&side=woman&id=${id}`)).status).toBe(401)
    expect((await del(`code=${CODE}&side=woman&id=${id}&outcome=no-action`)).status).toBe(401)
    expect([...stores.get('reports')!.keys()]).toEqual([key])
  })
})
