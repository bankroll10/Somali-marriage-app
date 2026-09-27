import { describe, expect, it } from 'vitest'
import { SessionError, classify, openSession, pool, redact } from './session'
import { apiError, authError, billingError, connectionError, modelError, overloadedError, serverError, standInClient } from './stand-in'

/**
 * The session's policy, pinned on its own (docs/GUIDE-EVAL.md, "Outcomes"):
 * how each failure is classified, when a request is retried, what stops the
 * run, and that every request is counted once.
 */

describe('classifying a failure', () => {
  it('knows the SDK’s errors by status', () => {
    expect(classify(authError())).toMatchObject({ kind: 'auth', status: 401, fatal: true, retryable: false })
    expect(classify(apiError(403, 'forbidden'))).toMatchObject({ kind: 'auth', fatal: true })
    expect(classify(billingError())).toMatchObject({ kind: 'billing', status: 400, fatal: true, retryable: false })
    expect(classify(apiError(402, 'payment required'))).toMatchObject({ kind: 'billing', fatal: true })
    expect(classify(modelError())).toMatchObject({ kind: 'model', status: 404, fatal: true })
    for (const e of [serverError(), overloadedError(), apiError(429, 'rate limited'), apiError(408, 'timeout'), apiError(409, 'conflict'), connectionError()]) {
      expect(classify(e), e.message).toMatchObject({ kind: 'transient', retryable: true, fatal: false })
    }
    expect(classify(apiError(400, 'messages: text content blocks must be non-empty'))).toMatchObject({ kind: 'other', retryable: false, fatal: false })
    expect(classify(apiError(422, 'unprocessable'))).toMatchObject({ kind: 'other' })
  })

  it('treats anything without a status as a connection failure, and reads a plain object the same as an SDK error', () => {
    expect(classify(new Error('fetch failed'))).toMatchObject({ kind: 'transient', status: null })
    expect(classify({ status: 401, message: 'nope' })).toMatchObject({ kind: 'auth' })
    expect(classify(undefined)).toMatchObject({ kind: 'transient', message: '' })
  })

  it('never carries a key into a record', () => {
    expect(redact('bad key sk-ant-api03-abcdefghijklmnop rejected')).toBe('bad key [redacted key] rejected')
    expect(redact('x'.repeat(500))).toHaveLength(300)
    expect(classify(Object.assign(authError(), { message: 'sk-ant-api03-abcdefghijklmnop' })).message).toBe('[redacted key]')
  })
})

describe('a session', () => {
  const ok = () => standInClient(() => ({ stop_reason: 'end_turn', content: [], usage: null }))
  const params = { model: 'm', max_tokens: 1, messages: [{ role: 'user' as const, content: 'hi' }] }

  it('counts every request and every response once', async () => {
    const stand = ok()
    const s = openSession(stand.client, stand.session)
    await s.as('a', 'guide').messages.create(params)
    await s.as('b', 'judge').messages.create(params)
    expect(s).toMatchObject({ requests: 2, succeeded: 2, errors: [], stopped: null })
  })

  it('retries a transient failure with backoff, records each attempt, and gives up after the allowed attempts', async () => {
    let n = 0
    const flaky = standInClient(() => ({ stop_reason: 'end_turn', content: [] }), () => (++n <= 2 ? serverError() : undefined))
    const s = openSession(flaky.client, flaky.session)
    await s.as('a', 'guide').messages.create(params)
    expect(s).toMatchObject({ requests: 3, succeeded: 1 })
    expect(s.errors.map((e) => e.attempt)).toEqual([1, 2])
    expect(flaky.waits).toEqual([1000, 4000])

    const down = standInClient(() => ({}), () => serverError())
    const t = openSession(down.client, down.session)
    await expect(t.as('a', 'guide').messages.create(params)).rejects.toBeInstanceOf(SessionError)
    expect(t).toMatchObject({ requests: 3, succeeded: 0, stopped: null })
    expect(t.errors).toHaveLength(3)
    // Bounded by the caller when it says so.
    const once = standInClient(() => ({}), () => serverError())
    const u = openSession(once.client, { ...once.session, attempts: 1 })
    await expect(u.as('a', 'guide').messages.create(params)).rejects.toBeInstanceOf(SessionError)
    expect(u.requests).toBe(1)
    expect(once.waits).toEqual([])
  })

  it('does not retry what is not transient', async () => {
    const bad = standInClient(() => ({}), () => apiError(400, 'malformed'))
    const s = openSession(bad.client, bad.session)
    await expect(s.as('a', 'guide').messages.create(params)).rejects.toMatchObject({ recorded: { kind: 'other' }, fatal: false })
    expect(s).toMatchObject({ requests: 1, stopped: null })
  })

  it('a fatal failure stops the session: nothing after it is sent, and each refusal to send is recorded as not sent', async () => {
    const broke = standInClient(() => ({}), () => billingError())
    const s = openSession(broke.client, broke.session)
    await expect(s.as('a', 'guide').messages.create(params)).rejects.toMatchObject({ fatal: true })
    expect(s.stopped).toEqual({ kind: 'billing', message: expect.stringMatching(/credit balance/), requests: 1 })
    await expect(s.as('b', 'guide').messages.create(params)).rejects.toMatchObject({ recorded: { kind: 'not-sent', item: 'b' } })
    expect(s.requests).toBe(1)
    expect(broke.calls).toHaveLength(1)
    // The first stop stands; a later one does not overwrite it.
    s.stop('judge', 'later')
    expect(s.stopped!.kind).toBe('billing')
  })

  it('the pool hands out no item after the session stops, and says how many it started', async () => {
    const stand = standInClient(() => ({ stop_reason: 'end_turn', content: [] }), (_p, n) => (n === 3 ? authError() : undefined))
    const s = openSession(stand.client, stand.session)
    const seen: number[] = []
    const started = await pool(s, [1, 2, 3, 4, 5, 6], 1, async (item) => {
      seen.push(item)
      await s.as(String(item), 'guide').messages.create(params).catch(() => undefined)
    })
    expect(started).toBe(3)
    expect(seen).toEqual([1, 2, 3])
    expect(s.stopped!.kind).toBe('auth')
  })

  it('the pool runs `width` items at once and every item exactly once', async () => {
    const stand = ok()
    const s = openSession(stand.client, stand.session)
    let running = 0
    let peak = 0
    const done: number[] = []
    await pool(s, Array.from({ length: 10 }, (_, i) => i), 4, async (item) => {
      running++
      peak = Math.max(peak, running)
      await s.as(String(item), 'guide').messages.create(params)
      running--
      done.push(item)
    })
    expect(peak).toBe(4)
    expect(done.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(await pool(s, [], 4, async () => undefined)).toBe(0)
  })
})
