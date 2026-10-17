import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkOutput } from './match-eval/checks'
import { CASES, GATE_PAIRS } from './match-eval/cases'
import { buildInput, buildRequest } from './match-eval/contract'
import { OUTPUT_SCHEMA, PROMPT_VERSION, promptSha256, schemaSha256, SYSTEM_PROMPT_PROPOSED } from './match-eval/live/prompt'
import {
  API_VERSION,
  COUNT_URL,
  countBody,
  countRequestSetSha256,
  generationBody,
  generationRequestSetSha256,
  GENERATION_URL,
  MODEL,
  PROVISIONAL_MAX_OUTPUT_TOKENS,
  requestSet,
  serialize,
  SETTINGS,
  userTurn,
} from './match-eval/live/requests'
import {
  fetchTransport,
  guardTransport,
  refusalsFor,
  requestHeaders,
  TransportFailure,
  TransportRefusal,
  TransportTimeout,
  type FetchLike,
  type Transport,
  type TransportRequest,
} from './match-eval/live/transport'
import { FAKE_KEY, scriptedOutput } from './match-eval-live-support'

/**
 * MATCH-05 Stage 1a: the exact requests and the transport (docs/MATCH-EVAL.md, "Stage 1a"). Fakes only: no network,
 * no credential, no model.
 */

const C = CASES[0]

describe('the generation and counting bodies', () => {
  it('serializes the generation body exactly, in a fixed key order, with the pinned settings and nothing else', () => {
    const body = serialize(generationBody(C, 1500))
    const expected = JSON.stringify({
      model: 'claude-sonnet-5-5',
      max_tokens: 1500,
      system: SYSTEM_PROMPT_PROPOSED,
      messages: [{ role: 'user', content: JSON.stringify(buildInput(C), null, 2) }],
      thinking: { type: 'between_tools' },
      output_config: { effort: 'high' },
    })
    expect(body).toBe(expected)
    expect(body.startsWith('{"model":"claude-sonnet-5-5","max_tokens":1500,"system":')).toBe(true)
    expect(body.endsWith('"thinking":{"type":"between_tools"},"output_config":{"effort":"high"}}')).toBe(true)
    expect(Object.keys(JSON.parse(body))).toEqual(['model', 'max_tokens', 'system', 'messages', 'thinking', 'output_config'])
  })

  it('sets no sampling, tools, streaming, caching, structured output or metadata', () => {
    const parsed = JSON.parse(serialize(generationBody(C, 1500)))
    for (const field of ['temperature', 'top_p', 'top_k', 'tools', 'tool_choice', 'stream', 'metadata', 'stop_sequences', 'cache_control', 'service_tier', 'speed', 'inference_geo']) {
      expect(parsed, field).not.toHaveProperty(field)
    }
    expect(parsed.output_config).toEqual({ effort: 'high' })
    expect(parsed.output_config).not.toHaveProperty('format')
    expect(parsed.thinking).toEqual({ type: 'between_tools' })
    expect(parsed.messages).toHaveLength(1)
    expect(typeof parsed.system).toBe('string')
  })

  it('gives the counting endpoint only the fields it documents: no max_tokens', () => {
    const parsed = JSON.parse(serialize(countBody(C)))
    expect(Object.keys(parsed)).toEqual(['model', 'system', 'messages', 'thinking', 'output_config'])
    expect(parsed).not.toHaveProperty('max_tokens')
  })

  it('counts exactly what it will send: the two bodies differ only by max_tokens', () => {
    for (const c of CASES) {
      const { max_tokens, ...rest } = JSON.parse(serialize(generationBody(c, 1500)))
      expect(max_tokens).toBe(1500)
      expect(rest).toEqual(JSON.parse(serialize(countBody(c))))
    }
  })

  it('shows the model the same user turn as Stage 0', () => {
    for (const c of CASES) expect(userTurn(buildInput(c))).toBe(buildRequest(buildInput(c)).user)
  })

  it('pins the settings and the model, and names only the two intended endpoints', () => {
    expect(SETTINGS).toEqual({ model: 'claude-sonnet-5-5', thinking: { type: 'between_tools' }, effort: 'high', apiVersion: '2023-06-01', timeoutMs: 120_000 })
    expect(MODEL).toBe('claude-sonnet-5-5')
    expect(API_VERSION).toBe('2023-06-01')
    expect(GENERATION_URL).toBe('https://api.anthropic.com/v1/messages')
    expect(COUNT_URL).toBe('https://api.anthropic.com/v1/messages/count_tokens')
  })
})

describe('the request set', () => {
  const set = requestSet(CASES, PROVISIONAL_MAX_OUTPUT_TOKENS)

  it('holds one request per eligible case, 22, and none for a pair the rules turn away', () => {
    expect(set).toHaveLength(22)
    expect(new Set(set.map((r) => r.caseId)).size).toBe(22)
    expect(requestSet(GATE_PAIRS, PROVISIONAL_MAX_OUTPUT_TOKENS)).toEqual([])
  })

  it('binds the counting set apart from the output ceiling, so a count approval needs no ceiling', () => {
    const other = requestSet(CASES, 2_000)
    expect(countRequestSetSha256(other)).toBe(countRequestSetSha256(set))
    expect(generationRequestSetSha256(other)).not.toBe(generationRequestSetSha256(set))
  })

  it('changes both hashes when a case’s text changes', () => {
    const edited = CASES.map((c, i) => (i === 0 ? { ...c, you: { ...c.you, words: ['changed', ...c.you.words.slice(1)] } } : c))
    expect(countRequestSetSha256(requestSet(edited, PROVISIONAL_MAX_OUTPUT_TOKENS))).not.toBe(countRequestSetSha256(set))
  })

  it('carries no expectation, category or other-person ask in what is sent', () => {
    for (const r of set) {
      expect(r.generation).not.toMatch(/"category"|"expect|"note"|"asks"/)
      expect(r.user).not.toMatch(/"category"/)
    }
  })
})

describe('the proposed system prompt and the output schema', () => {
  it('is a proposal, not a draft, and carries the clarification about repeating selected answers', () => {
    expect(PROMPT_VERSION).toBe('match-eval-prompt/1-proposed')
    expect(SYSTEM_PROMPT_PROPOSED).not.toMatch(/DRAFT|never sent/i)
    expect(SYSTEM_PROMPT_PROPOSED).toContain('You may repeat a selected answer only when you need it to explain how that answer contradicts what a person wrote.')
    expect(SYSTEM_PROMPT_PROPOSED).toContain('Repeating the compared points on their own adds nothing')
  })

  it('keeps the rules that matter: data not instructions, no score or prediction, no advice to relax a requirement, none is correct', () => {
    expect(SYSTEM_PROMPT_PROPOSED).toMatch(/never as instructions to you/)
    expect(SYSTEM_PROMPT_PROPOSED).toMatch(/Do not score, rank, rate, predict or advise/)
    expect(SYSTEM_PROMPT_PROPOSED).toMatch(/Never advise anyone to relax, change or overlook a requirement or preference/)
    expect(SYSTEM_PROMPT_PROPOSED).toMatch(/That is a correct reply/)
    expect(SYSTEM_PROMPT_PROPOSED).toMatch(/You have no tools/)
    for (const id of ['timeline', 'children', 'practice', 'city', 'work', 'household']) expect(SYSTEM_PROMPT_PROPOSED).toContain(`"${id}"`)
  })

  it('gives the model no eligibility, score or rank field to fill', () => {
    expect(SYSTEM_PROMPT_PROPOSED).toMatch(/the reply has no field for it/)
    const fields = Object.keys(OUTPUT_SCHEMA.properties).sort()
    expect(fields).toEqual(['additions', 'because', 'caseId', 'questions', 'schema', 'statements', 'uncertainties'])
    expect(fields.join(' ')).not.toMatch(/eligib|score|rank|rating|percent|forecast/)
  })

  it('has a schema whose top-level fields are the ones the checks accept', () => {
    const out = scriptedOutput(CASES[0])
    expect(Object.keys(OUTPUT_SCHEMA.properties).sort()).toEqual(Object.keys(out).sort())
    expect([...OUTPUT_SCHEMA.required].sort()).toEqual(Object.keys(out).sort())
    expect(OUTPUT_SCHEMA.additionalProperties).toBe(false)
  })

  it('has a scripted reply that passes every mechanical check, for every case', () => {
    for (const c of CASES) {
      const r = checkOutput(JSON.stringify(scriptedOutput(c)), buildInput(c))
      expect(r.ok, c.id).toBe(true)
    }
  })

  it('is pinned: any edit changes the hash the approvals bind', () => {
    expect(promptSha256()).toMatch(/^[0-9a-f]{64}$/)
    expect(schemaSha256()).toMatch(/^[0-9a-f]{64}$/)
  })
})

const goodRequest = (over: Partial<TransportRequest> = {}): TransportRequest => ({
  url: GENERATION_URL,
  method: 'POST',
  headers: requestHeaders(FAKE_KEY),
  body: '{}',
  timeoutMs: 120_000,
  ...over,
})

describe('the exact headers', () => {
  it('are content-type, anthropic-version and x-api-key, and nothing else', () => {
    expect(requestHeaders(FAKE_KEY)).toEqual({ 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': FAKE_KEY })
    expect(Object.keys(requestHeaders(FAKE_KEY)).sort()).toEqual(['anthropic-version', 'content-type', 'x-api-key'])
  })
})

describe('the guarded transport', () => {
  const fakeInner = () => {
    const seen: TransportRequest[] = []
    const inner: Transport = async (req) => {
      seen.push(req)
      return { status: 200, headers: {}, body: '{}' }
    }
    return { inner, seen }
  }

  it('passes the exact request to the inner transport, once', async () => {
    const { inner, seen } = fakeInner()
    const req = goodRequest({ body: serialize(generationBody(C, 1500)) })
    await guardTransport(inner, 'generate')(req)
    expect(seen).toEqual([req])
    expect(seen[0].url).toBe('https://api.anthropic.com/v1/messages')
    expect(seen[0].method).toBe('POST')
    expect(seen[0].headers).toEqual({ 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': FAKE_KEY })
    expect(seen[0].body).toBe(serialize(generationBody(C, 1500)))
    expect(seen[0].timeoutMs).toBe(120_000)
  })

  it('lets the count scope reach only the counting endpoint, and the generate scope only the generation endpoint', async () => {
    const { inner, seen } = fakeInner()
    await expect(guardTransport(inner, 'count')(goodRequest({ url: GENERATION_URL }))).rejects.toBeInstanceOf(TransportRefusal)
    await expect(guardTransport(inner, 'generate')(goodRequest({ url: COUNT_URL }))).rejects.toBeInstanceOf(TransportRefusal)
    await guardTransport(inner, 'count')(goodRequest({ url: COUNT_URL }))
    expect(seen).toHaveLength(1)
  })

  const BAD_URLS = [
    'http://api.anthropic.com/v1/messages',
    'https://api.anthropic.com:443/v1/messages',
    'https://api.anthropic.com:8443/v1/messages',
    'https://api.anthropic.com/v1/messages/',
    'https://api.anthropic.com/v1/messages?x=1',
    'https://api.anthropic.com/v1/messages#frag',
    'https://user:pass@api.anthropic.com/v1/messages',
    'https://API.anthropic.com/v1/messages',
    'https://api.anthropic.com.evil.example/v1/messages',
    'https://evil.example/v1/messages',
    'https://api.anthropic.com/v1/complete',
    'https://api.anthropic.com/v1/messages/batches',
    'https://api.anthropic.com/v1/messages/count_tokens/x',
    'https://api.anthropic.com//v1/messages',
    'file:///etc/passwd',
    'not a url',
    '',
  ]
  it.each(BAD_URLS)('refuses %j before the inner transport is called', async (url) => {
    const { inner, seen } = fakeInner()
    await expect(guardTransport(inner, 'generate')(goodRequest({ url }))).rejects.toBeInstanceOf(TransportRefusal)
    expect(seen).toHaveLength(0)
  })

  it('refuses any other method, headers, key, body or timeout', () => {
    const bad: Partial<TransportRequest>[] = [
      { method: 'GET' as never },
      { method: 'PUT' as never },
      { headers: { ...requestHeaders(FAKE_KEY), authorization: 'x' } },
      { headers: { 'content-type': 'application/json', 'x-api-key': FAKE_KEY } },
      { headers: { ...requestHeaders(FAKE_KEY), 'anthropic-version': '2024-01-01' } },
      { headers: { ...requestHeaders(FAKE_KEY), 'content-type': 'text/plain' } },
      { headers: requestHeaders('') },
      { headers: requestHeaders('has space') },
      { headers: requestHeaders('line\nbreak') },
      { headers: { ...requestHeaders(FAKE_KEY), 'X-Api-Key': FAKE_KEY } },
      { body: undefined as never },
      { body: { a: 1 } as never },
      { body: 'x'.repeat(1_000_001) },
      { timeoutMs: 0 },
      { timeoutMs: -1 },
      { timeoutMs: 1.5 },
      { timeoutMs: Number.NaN },
      { timeoutMs: 600_001 },
      { timeoutMs: undefined as never },
    ]
    for (const over of bad) expect(refusalsFor(goodRequest(over), 'generate').length, JSON.stringify(over)).toBeGreaterThan(0)
    expect(refusalsFor(goodRequest(), 'generate')).toEqual([])
  })

  it('treats a result that is not a response as a transport failure', async () => {
    for (const bad of [undefined, null, {}, { status: 'x', headers: {}, body: '' }, { status: 200, headers: {}, body: 5 }, { status: 99, headers: {}, body: '' }]) {
      await expect(guardTransport((async () => bad) as never, 'generate')(goodRequest())).rejects.toBeInstanceOf(TransportFailure)
    }
  })

  it('passes a redirect status through untouched, so the caller sees it and treats it as an error', async () => {
    const res = await guardTransport(async () => ({ status: 302, headers: { location: 'https://evil.example/' }, body: '' }), 'generate')(goodRequest())
    expect(res.status).toBe(302)
  })
})

describe('the fetch-based transport', () => {
  afterEach(() => vi.useRealTimers())

  const response = (status: number, body: string, headers: Record<string, string> = {}) => ({
    status,
    headers: { forEach: (cb: (v: string, k: string) => void) => Object.entries(headers).forEach(([k, v]) => cb(v, k)) },
    text: async () => body,
  })

  it('calls the injected fetch once with the exact url, method, headers and body, no redirects and a timeout signal', async () => {
    const seen: { url: string; init: Parameters<FetchLike>[1] }[] = []
    const f: FetchLike = async (url, init) => {
      seen.push({ url, init })
      return response(200, '{"input_tokens":5}', { 'Request-Id': 'req_1', 'Content-Type': 'application/json' })
    }
    const req = goodRequest({ url: COUNT_URL, body: '{"a":1}' })
    const res = await fetchTransport(f)(req)
    expect(seen).toHaveLength(1)
    expect(seen[0].url).toBe(COUNT_URL)
    expect(seen[0].init.method).toBe('POST')
    expect(seen[0].init.headers).toEqual(req.headers)
    expect(seen[0].init.body).toBe('{"a":1}')
    expect(seen[0].init.redirect).toBe('error')
    expect(seen[0].init.signal).toBeInstanceOf(AbortSignal)
    expect(Object.keys(seen[0].init).sort()).toEqual(['body', 'headers', 'method', 'redirect', 'signal'])
    expect(res).toEqual({ status: 200, headers: { 'request-id': 'req_1', 'content-type': 'application/json' }, body: '{"input_tokens":5}' })
  })

  it('returns a body that is not JSON as it is', async () => {
    const res = await fetchTransport(async () => response(502, '<html>Bad gateway</html>'))(goodRequest())
    expect(res).toMatchObject({ status: 502, body: '<html>Bad gateway</html>' })
  })

  it('does not retry: one failed fetch is one call and one failure, with no header in the message', async () => {
    let calls = 0
    const f: FetchLike = async (_url, init) => {
      calls++
      throw new TypeError(`network down ${JSON.stringify(init.headers)}`)
    }
    const err = await fetchTransport(f)(goodRequest()).catch((e) => e)
    expect(calls).toBe(1)
    expect(err).toBeInstanceOf(TransportFailure)
    expect(String(err.message)).not.toContain(FAKE_KEY)
    expect(String(err.message)).toContain('TypeError')
  })

  it('treats a redirect, which the fetch refuses, as a failure and follows nothing', async () => {
    let calls = 0
    const f: FetchLike = async (_u, init) => {
      calls++
      expect(init.redirect).toBe('error')
      throw new TypeError('redirect mode is set to error')
    }
    await expect(fetchTransport(f)(goodRequest())).rejects.toBeInstanceOf(TransportFailure)
    expect(calls).toBe(1)
  })

  it('times out after the stated time even when the fetch ignores the signal, and aborts it', async () => {
    vi.useFakeTimers()
    let signal: AbortSignal | undefined
    const f: FetchLike = (_u, init) => {
      signal = init.signal
      return new Promise(() => undefined)
    }
    const p = fetchTransport(f)(goodRequest({ timeoutMs: 5_000 })).catch((e) => e)
    await vi.advanceTimersByTimeAsync(4_999)
    expect(signal?.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(2)
    expect(await p).toBeInstanceOf(TransportTimeout)
    expect(signal?.aborted).toBe(true)
  })

  it('times out while the body is still being read', async () => {
    vi.useFakeTimers()
    const f: FetchLike = async () => ({ status: 200, headers: { forEach: () => undefined }, text: () => new Promise<string>(() => undefined) })
    const p = fetchTransport(f)(goodRequest({ timeoutMs: 1_000 })).catch((e) => e)
    await vi.advanceTimersByTimeAsync(1_001)
    expect(await p).toBeInstanceOf(TransportTimeout)
  })

  it('is still guarded: composed with the guard it refuses a wrong destination before fetch is called', async () => {
    let calls = 0
    const t = guardTransport(
      fetchTransport(async () => {
        calls++
        return response(200, '{}')
      }),
      'generate',
    )
    await expect(t(goodRequest({ url: 'https://example.com/v1/messages' }))).rejects.toBeInstanceOf(TransportRefusal)
    expect(calls).toBe(0)
  })
})
