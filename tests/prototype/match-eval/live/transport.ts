import { API_VERSION, COUNT_URL, GENERATION_URL } from './requests'

/**
 * The only way a live run reaches the network (docs/MATCH-EVAL.md, "Stage 1a"), and it is injected.
 *
 * - `Transport` is a function a caller passes in. Nothing in this folder reads the global `fetch`, so a test, which
 *   passes a fake, cannot reach a network by accident.
 * - `guardTransport` refuses, before the inner transport is called, any request that is not exactly one of the two
 *   intended Anthropic endpoints, with exactly the three expected headers, a string body and a bounded timeout.
 * - `fetchTransport` turns an injected fetch-like function into a `Transport` with an explicit timeout, no retries and
 *   no redirects. It never puts a header, and so never the credential, into an error message.
 * - A transport is called once per request. Nothing here retries.
 */

export interface TransportRequest {
  url: string
  method: 'POST'
  headers: Record<string, string>
  body: string
  timeoutMs: number
}

export interface TransportResponse {
  status: number
  /** Lower-case names. */
  headers: Record<string, string>
  body: string
}

export type Transport = (req: TransportRequest) => Promise<TransportResponse>

export class TransportRefusal extends Error {
  readonly reasons: string[]
  constructor(reasons: string[]) {
    super(`The request was refused before it was sent: ${reasons.join('; ')}.`)
    this.reasons = reasons
  }
}
export class TransportTimeout extends Error {}
export class TransportFailure extends Error {}

/** `count` may reach only the counting endpoint; `generate` only the generation endpoint. */
export type Scope = 'count' | 'generate'

const URLS: Record<Scope, string> = { count: COUNT_URL, generate: GENERATION_URL }
const HEADER_NAMES = ['anthropic-version', 'content-type', 'x-api-key'] as const
const MAX_BODY_BYTES = 1_000_000
const MAX_TIMEOUT_MS = 600_000

export function requestHeaders(key: string): Record<string, string> {
  return { 'content-type': 'application/json', 'anthropic-version': API_VERSION, 'x-api-key': key }
}

/** Every reason the request must not be sent; empty when it may be. */
export function refusalsFor(req: TransportRequest, scope: Scope): string[] {
  const reasons: string[] = []
  const want = URLS[scope]
  if (typeof req.url !== 'string') reasons.push('the url is not a string')
  else {
    let u: URL | null = null
    try {
      u = new URL(req.url)
    } catch {
      reasons.push('the url does not parse')
    }
    if (u) {
      if (u.protocol !== 'https:') reasons.push('the url is not https')
      if (u.hostname !== 'api.anthropic.com') reasons.push('the host is not api.anthropic.com')
      if (u.port !== '') reasons.push('the url names a port')
      if (u.username !== '' || u.password !== '') reasons.push('the url carries credentials')
      if (u.search !== '' || u.hash !== '') reasons.push('the url has a query or a fragment')
    }
    if (req.url !== want) reasons.push(`the url is not ${want}`)
  }
  if (req.method !== 'POST') reasons.push('the method is not POST')
  if (typeof req.body !== 'string') reasons.push('the body is not a string')
  else if (Buffer.byteLength(req.body, 'utf8') > MAX_BODY_BYTES) reasons.push('the body is over 1,000,000 bytes')
  if (!Number.isSafeInteger(req.timeoutMs) || req.timeoutMs < 1 || req.timeoutMs > MAX_TIMEOUT_MS) reasons.push('the timeout must be a whole number of milliseconds from 1 to 600,000')
  const h = req.headers as Record<string, unknown> | null
  if (!h || typeof h !== 'object') reasons.push('the headers are missing')
  else {
    const names = Object.keys(h).sort()
    if (names.join(',') !== [...HEADER_NAMES].join(',')) reasons.push(`the headers must be exactly ${HEADER_NAMES.join(', ')}`)
    if (h['content-type'] !== 'application/json') reasons.push('content-type must be application/json')
    if (h['anthropic-version'] !== API_VERSION) reasons.push(`anthropic-version must be ${API_VERSION}`)
    const key = h['x-api-key']
    if (typeof key !== 'string' || key.length === 0 || [...key].some((ch) => ch.charCodeAt(0) <= 32 || ch.charCodeAt(0) === 127)) reasons.push('x-api-key must be a non-empty string without whitespace or control characters')
  }
  return reasons
}

function wellFormed(res: unknown): res is TransportResponse {
  const r = res as Partial<TransportResponse> | null
  return !!r && Number.isSafeInteger(r.status) && (r.status as number) >= 100 && (r.status as number) <= 599 && typeof r.body === 'string' && !!r.headers && typeof r.headers === 'object'
}

export function guardTransport(inner: Transport, scope: Scope): Transport {
  return async (req) => {
    const reasons = refusalsFor(req, scope)
    if (reasons.length > 0) throw new TransportRefusal(reasons)
    const res = await inner(req)
    if (!wellFormed(res)) throw new TransportFailure('the transport returned something that is not a response')
    return res
  }
}

/** The part of the platform's fetch that is used. Passing it in is what keeps this folder away from the network in tests. */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; redirect: 'error'; signal: AbortSignal },
) => Promise<{ status: number; headers: { forEach(cb: (value: string, key: string) => void): void }; text(): Promise<string> }>

export function fetchTransport(fetchImpl: FetchLike): Transport {
  return async (req) => {
    const ctl = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        ctl.abort()
        reject(new TransportTimeout(`no complete response within ${req.timeoutMs} ms`))
      }, req.timeoutMs)
    })
    const work = (async (): Promise<TransportResponse> => {
      const res = await fetchImpl(req.url, { method: req.method, headers: req.headers, body: req.body, redirect: 'error', signal: ctl.signal })
      const body = await res.text()
      const headers: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value
      })
      return { status: res.status, headers, body }
    })()
    work.catch(() => undefined)
    try {
      return await Promise.race([work, deadline])
    } catch (e) {
      if (e instanceof TransportTimeout) throw e
      if (ctl.signal.aborted) throw new TransportTimeout(`no complete response within ${req.timeoutMs} ms`)
      // The error's name only: a message could echo a header, and the key is a header.
      throw new TransportFailure(`the request failed (${e instanceof Error ? e.name : 'unknown'})`)
    } finally {
      if (timer !== undefined) clearTimeout(timer)
      deadline.catch(() => undefined)
    }
  }
}
