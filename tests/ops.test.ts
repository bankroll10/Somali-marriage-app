import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FOUNDER, blobs, call, serve } from './support/server'
import { residue } from './support/residue'
import { note } from '../netlify/shared/ops'
import { OPS_SIGNALS } from '../netlify/shared/vocab'
import { capSignal } from '../netlify/shared/limit'
import { day } from '../netlify/shared/day'

vi.mock('@netlify/blobs', async () => (await import('./support/blobs')).blobsModule)

/**
 * The founder's smoke alarm, proved by setting things on fire (docs/OPS.md).
 *
 * Each of the nine questions /health answers is made true here — a route's
 * storage failing, a cap refusing, Claude refusing the key or spending more
 * than it should, a report waiting, a backup overdue, a sweep stopped, a phone
 * crashing — and /health must say so, on the cadence it says it will. And the
 * other half, which matters as much: nothing it counts or returns is about a
 * person, and counting can never take down what it counts.
 */

// ── Claude, scripted ─────────────────────────────────────────────────────────
const sdk = vi.hoisted(() => {
  class APIError extends Error {
    status = 500
  }
  class RateLimitError extends APIError {}
  class AuthenticationError extends APIError {}
  const state: { events: unknown[]; throws: Error | null } = { events: [], throws: null }
  class Anthropic {
    static APIError = APIError
    static RateLimitError = RateLimitError
    static AuthenticationError = AuthenticationError
    messages = {
      create: async () => ({ stop_reason: 'end_turn' }),
      stream: () => ({
        abort() {},
        async *[Symbol.asyncIterator]() {
          if (state.throws) throw state.throws
          for (const e of state.events) yield e
        },
      }),
    }
  }
  return { Anthropic, APIError, RateLimitError, AuthenticationError, state }
})
vi.mock('@anthropic-ai/sdk', () => ({ default: sdk.Anthropic }))

/** A whole answer that cost `input` tokens in and `output` out. */
function answers(input: number, output: number) {
  sdk.state.throws = null
  sdk.state.events = [
    { type: 'message_start', message: { usage: { input_tokens: input, cache_read_input_tokens: 0 } } },
    { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Salaam. ' } },
    { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Ask him this week.' } },
    { type: 'message_delta', usage: { output_tokens: output } },
  ]
}

const ask = async () => {
  const res = await call('guide', 'POST', 'guide', { message: 'He went quiet.', mode: 'auntie' })
  await res.text() // the counting finishes with the stream
  return res
}

interface Check {
  id: string
  state: 'ok' | 'warn' | 'fail'
  cadence: 'now' | 'daily' | 'weekly'
  summary: string
  numbers: Record<string, unknown>
}
async function health(): Promise<{ status: string; checks: Check[]; days: Record<string, Record<string, number>> }> {
  const res = await call('health', 'GET', 'health', undefined, FOUNDER)
  expect(res.status).toBe(200)
  return res.json()
}
const check = async (id: string) => (await health()).checks.find((c) => c.id === id)!

const TODAY = () => day()
const daysAgo = (n: number) => day(Date.now() - n * 86_400_000)

async function keptCode(name = 'Hodan'): Promise<string> {
  const res = await call('keep', 'POST', 'keep', { snapshot: { answers: {}, identity: { firstName: name, age: 27 } } })
  return ((await res.json()) as { code: string }).code
}

beforeEach(() => {
  blobs.reset()
  serve()
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test'
  delete process.env.OPS_COST_ALERT_USD
  // A healthy baseline: a backup and a sweep this week.
  blobs.put('ops', 'last/export', { day: daysAgo(3) })
  blobs.put('ops', 'last/sweep', { day: daysAgo(2), errors: 0 })
})

describe('a quiet day reads as a quiet day', () => {
  it('is all ok, and costs no call to Claude', async () => {
    const h = await health()
    expect(h.status).toBe('ok')
    expect(h.checks.map((c) => c.id).sort()).toEqual(
      ['backup', 'claude', 'client', 'cost', 'data', 'functions', 'limits', 'safety', 'safety-urgent', 'storage', 'sweep'].sort(),
    )
    for (const c of h.checks) expect(c.summary.length, c.id).toBeGreaterThan(10)
  })
})

describe('are functions — and storage — failing?', () => {
  it('counts a route whose storage fails, by route, and warns, then fails at five', async () => {
    const code = await keptCode()
    blobs.failOn({ store: 'maps', op: 'getWithMetadata', key: code })
    expect((await call('keep', 'GET', `keep?code=${code}`)).status).toBe(503)
    let fx = await check('functions')
    expect(fx.state).toBe('warn')
    expect(fx.numbers).toMatchObject({ today: 1, keep: 1 })

    for (let i = 0; i < 4; i++) {
      blobs.failOn({ store: 'vouches', op: 'get', prefix: 'token/' })
      expect((await call('vouch', 'GET', 'vouch?code=ACDEFGHJKM')).status).toBe(503)
    }
    fx = await check('functions')
    expect(fx.state).toBe('fail')
    expect(fx.numbers).toMatchObject({ today: 5, keep: 1, vouch: 4 })
    expect(fx.cadence).toBe('now')
  })

  it('fails when errors come two days running, even a few', async () => {
    blobs.put('ops', `day/${daysAgo(1)}/fail.vouch`, 1)
    blobs.put('ops', `day/${TODAY()}/fail.vouch`, 1)
    expect((await check('functions')).state).toBe('fail')
  })

  it('says storage is failing when it cannot write, read and delete — and still answers', async () => {
    blobs.failOn({ store: 'ops', op: 'setJSON', key: `probe/${TODAY()}` })
    const h = await health()
    expect(h.checks.find((c) => c.id === 'storage')).toMatchObject({ state: 'fail', cadence: 'now' })
    expect(h.status).toBe('fail')
  })

  it('answers even when the counts cannot be read at all', async () => {
    blobs.failOn({ store: 'ops', op: 'list', prefix: 'day/' })
    const h = await health()
    expect(h.checks.find((c) => c.id === 'functions')?.state).toBe('fail')
    expect(h.status).toBe('fail')
  })
})

describe('are rate limits being hit?', () => {
  it('counts a refusal by the kind of cap, never by what it was about', async () => {
    process.env.DOOR_CITY_HOURLY_CAP = '1'
    const code = await keptCode()
    const join = () => call('cohort', 'POST', 'cohort', { code, scene: 'twin-cities', gender: 'woman' })
    expect((await join()).status).toBe(200)
    expect((await join()).status).toBe(503)
    delete process.env.DOOR_CITY_HOURLY_CAP

    const limits = await check('limits')
    expect(limits.state).toBe('warn')
    expect(limits.numbers).toMatchObject({ refused: 1, 'door-city': 1 })
    // The city is never counted, nor returned.
    expect(blobs.keys('ops').join('\n')).not.toMatch(/twin-cities/)
    expect(JSON.stringify(await health())).not.toMatch(/twin-cities/)
  })

  it('fails when the guide’s daily cap is reached — members are on the offline voice', async () => {
    process.env.GUIDE_DAILY_CAP = '1'
    answers(10, 10)
    expect((await ask()).status).toBe(200)
    expect((await ask()).status).toBe(503)
    delete process.env.GUIDE_DAILY_CAP
    expect(await check('limits')).toMatchObject({ state: 'fail', cadence: 'now' })
  })

  it('has a signal for every cap in netlify/functions', () => {
    for (const [bucket, period] of [
      ['guide', 'h'],
      ['guide', 'd'],
      ['door-city-london', 'h'],
      ['keep', 'h'],
      ['restore', 'h'],
      ['forget', 'h'],
      ['couple-answer', 'h'],
      ['vouch-read', 'h'],
      ['safety-probe', 'h'],
      ['progress-forget', 'h'],
      ['health', 'h'],
    ] as const) {
      expect(OPS_SIGNALS.has(capSignal(bucket, period)), bucket).toBe(true)
    }
  })
})

describe('is Claude failing, and are costs abnormal?', () => {
  it('counts whole answers and what they cost', async () => {
    answers(2_000, 500)
    await ask()
    await ask()
    const h = await health()
    expect(h.days[TODAY()]).toMatchObject({ 'claude.ok': 2, 'claude.in': 4_000, 'claude.out': 1_000 })
    expect(h.checks.find((c) => c.id === 'claude')?.state).toBe('ok')
    // 4k in at $5/M and 1k out at $25/M: about four and a half cents.
    expect(h.checks.find((c) => c.id === 'cost')?.numbers.todayUsd).toBe(0.05)
  })

  it('fails the moment Anthropic refuses the key', async () => {
    sdk.state.throws = new sdk.AuthenticationError('bad key')
    expect((await ask()).status).toBe(503)
    expect(await check('claude')).toMatchObject({ state: 'fail', cadence: 'now' })
  })

  it('warns when calls fail often, and names how', async () => {
    answers(10, 10)
    await ask()
    sdk.state.throws = new sdk.RateLimitError('slow down')
    for (let i = 0; i < 3; i++) await ask()
    const c = await check('claude')
    expect(c.state).toBe('warn')
    expect(c.numbers).toMatchObject({ calls: 4, ok: 1, rate_limited: 3 })
  })

  it('warns when the key is gone and the guide is on its offline voice', async () => {
    delete process.env.ANTHROPIC_API_KEY
    expect((await ask()).status).toBe(503)
    expect((await check('claude')).state).toBe('warn')
  })

  it('warns on a day far above the week, and fails at the alert line', async () => {
    for (let d = 1; d <= 7; d++) blobs.put('ops', `day/${daysAgo(d)}/claude.out`, 40_000) // $1 a day
    answers(0, 200_000) // $5 today
    await ask()
    expect(await check('cost')).toMatchObject({ state: 'warn', cadence: 'now' })
    process.env.OPS_COST_ALERT_USD = '4'
    expect((await check('cost')).state).toBe('fail')
  })
})

describe('are safety reports waiting?', () => {
  const report = (id: string, reason: string, at: string) =>
    blobs.put('reports', `TWXY3478-woman-${id}`, { id, code: 'TWXY3478', side: 'woman', reason, details: 'Zq private words', at, v: 1 })

  it('warns on an open report, and fails only on Monday’s run', async () => {
    report('ACDEFGHJKM', 'harassment', daysAgo(2))
    const h = await health()
    expect(h.checks.find((c) => c.id === 'safety')).toMatchObject({ state: 'warn', cadence: 'weekly' })
    expect(h.checks.find((c) => c.id === 'safety-urgent')?.state).toBe('ok')
  })

  it('fails the daily run on a threat or something explicit', async () => {
    report('ACDEFGHJKM', 'threats', TODAY())
    expect(await check('safety-urgent')).toMatchObject({ state: 'fail', cadence: 'daily' })
  })

  it('fails when a report has waited more than a week', async () => {
    report('ACDEFGHJKM', 'other', daysAgo(9))
    const c = await check('safety')
    expect(c.state).toBe('fail')
    expect(c.numbers).toMatchObject({ open: 1, oldestDays: 9 })
  })

  it('never returns a word of a report, its code or its id', async () => {
    report('ACDEFGHJKM', 'threats', TODAY())
    const body = JSON.stringify(await health())
    for (const leak of ['Zq private words', 'TWXY3478', 'ACDEFGHJKM', 'woman']) expect(body).not.toContain(leak)
  })
})

describe('did the backup fail? is the sweep running?', () => {
  it('knows a backup was taken the moment /export answers', async () => {
    blobs.put('ops', 'last/export', { day: daysAgo(40) })
    expect(await check('backup')).toMatchObject({ state: 'fail', cadence: 'weekly' })
    expect((await call('export', 'GET', 'export', undefined, FOUNDER)).status).toBe(200)
    expect(await check('backup')).toMatchObject({ state: 'ok', numbers: { daysSince: 0 } })
  })

  it('fails when no backup was ever taken', async () => {
    blobs.read('ops', 'last/export') // present from the baseline
    await blobs.store('ops').delete('last/export')
    expect((await check('backup')).state).toBe('fail')
  })

  it('fails when the sweep has not run for more than a week, and is ok once it has', async () => {
    blobs.put('ops', 'last/sweep', { day: daysAgo(10), errors: 0 })
    expect(await check('sweep')).toMatchObject({ state: 'fail', cadence: 'weekly' })
    expect((await call('sweep', 'POST', 'sweep')).status).toBe(200)
    expect(await check('sweep')).toMatchObject({ state: 'ok', numbers: { daysSince: 0 } })
  })

  it('the sweep deletes counts older than thirty-five days, and keeps the rest', async () => {
    blobs.put('ops', `day/${daysAgo(36)}/fail.keep`, 3)
    blobs.put('ops', `day/${daysAgo(34)}/fail.keep`, 2)
    await call('sweep', 'POST', 'sweep')
    expect(blobs.keys('ops').filter((k) => k.startsWith('day/'))).toEqual([`day/${daysAgo(34)}/fail.keep`])
  })
})

describe('is the app breaking on phones?', () => {
  it('counts a crash and a missing screen, and nothing else', async () => {
    for (const event of ['crash', 'crash', 'chunk']) {
      expect((await call('health', 'POST', 'health', { event })).status).toBe(204)
    }
    expect((await call('health', 'POST', 'health', { event: 'crash', screen: 'home' })).status).toBe(204)
    expect((await call('health', 'POST', 'health', { event: 'TypeError: x is undefined at Home.tsx' })).status).toBe(400)
    const c = await check('client')
    expect(c).toMatchObject({ state: 'warn', numbers: { crash: 3, chunk: 1 } })
    // Whatever else was sent went nowhere.
    expect(JSON.stringify(blobs.stores.get('ops') ? [...blobs.stores.get('ops')!.entries()] : [])).not.toMatch(/home|TypeError/)
  })

  it('is capped, like every public write', async () => {
    process.env.HEALTH_HOURLY_CAP = '2'
    const codes = []
    for (let i = 0; i < 4; i++) codes.push((await call('health', 'POST', 'health', { event: 'crash' })).status)
    delete process.env.HEALTH_HOURLY_CAP
    expect(codes).toEqual([204, 204, 503, 503])
  })
})

describe('what it counts is never about a person', () => {
  it('drops any signal not on the closed list', async () => {
    await note('fail.keep')
    await note('fail.HJKMNPQR')
    await note('member.Hodan')
    await note('cap.door-city-twin-cities')
    expect(blobs.keys('ops')).toEqual(['last/export', 'last/sweep', `day/${TODAY()}/fail.keep`].sort())
  })

  it('holds nothing of anyone, after a life has run through every route that counts', async () => {
    const NAME = 'Zqopsnamexyz'
    const CONTACT = 'zqops@example.com'
    const code = await keptCode(NAME)
    await call('cohort', 'POST', 'cohort', { code, scene: 'twin-cities', gender: 'woman', contact: CONTACT })
    blobs.failOn({ store: 'maps', op: 'getWithMetadata', key: code })
    await call('keep', 'GET', `keep?code=${code}`)
    answers(100, 100)
    await ask()
    await call('health', 'POST', 'health', { event: 'crash' })
    const body = JSON.stringify(await health())
    expect(residue([code, NAME, CONTACT, 'twin-cities']).filter((l) => l.startsWith('ops:'))).toEqual([])
    for (const n of [code, NAME, CONTACT, 'twin-cities', 'He went quiet']) expect(body).not.toContain(n)
    // And every date in it is a day.
    expect(body).not.toMatch(/T\d{2}:\d{2}/)
  })
})

describe('counting never breaks what it counts', () => {
  it('every route still answers when the ops store cannot even be opened', async () => {
    blobs.failOpen('ops')
    const code = await keptCode()
    expect(code).toMatch(/^[A-Z2-9]{8}$/)
    expect((await call('cohort', 'POST', 'cohort', { code, scene: 'twin-cities', gender: 'woman' })).status).toBe(200)
    answers(10, 10)
    expect((await ask()).status).toBe(200)
    expect((await call('health', 'POST', 'health', { event: 'crash' })).status).toBe(204)
    // And /health says storage is failing, rather than throwing.
    const h = await health()
    expect(h.checks.find((c) => c.id === 'storage')?.state).toBe('fail')
  })
})
