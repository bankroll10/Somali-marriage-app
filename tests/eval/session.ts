import type Anthropic from '@anthropic-ai/sdk'
import { FATAL, type ErrorKind, type RecordedError, type Stop } from './outcome'

/**
 * Every request a live suite sends goes through a session (docs/GUIDE-EVAL.md,
 * "Outcomes"). The session:
 *
 *   - counts requests and responses, so the outcome's numbers are the truth
 *     and not an estimate — the SDK's own retries are turned off by the
 *     callers (`new Anthropic({ maxRetries: 0 })`) so nothing is sent that
 *     the session did not count;
 *   - classifies every failure (./outcome.ts `ErrorKind`), redacts anything
 *     that looks like a key, and records it against the case it was for;
 *   - retries a transient failure a bounded number of times, waiting between
 *     attempts through an injectable `sleep`, so a stand-in can prove the
 *     policy without waiting;
 *   - on a fatal failure — the key refused, the account out of credit, the
 *     model unknown — stops: no further request is sent by any worker, the
 *     ones already in flight finish and are recorded as what they were.
 *
 * It never swallows an error. The caller records what the failure means for
 * that case (unavailable, unjudged) and moves on or stops.
 */

export type Client = Pick<Anthropic, 'messages'>

export interface Classified {
  kind: ErrorKind
  status: number | null
  message: string
  retryable: boolean
  fatal: boolean
}

const KEY_LIKE = /sk-ant-[A-Za-z0-9_-]{8,}/g

/** Error text as it may be written into a report: no key, bounded length. */
export function redact(message: unknown): string {
  return String(message ?? '')
    .replace(KEY_LIKE, '[redacted key]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}

/** What kind of failure this is. Duck-typed on `status` and `message`, so the SDK's errors and a stand-in's plain objects classify alike. */
export function classify(err: unknown): Classified {
  const e = (typeof err === 'object' && err !== null ? err : {}) as { status?: unknown; message?: unknown }
  const status = typeof e.status === 'number' ? e.status : null
  const message = redact(e.message ?? err)
  const is = (kind: ErrorKind, retryable = false) => ({ kind, status, message, retryable, fatal: FATAL.includes(kind) })
  if (status === 401 || status === 403) return is('auth')
  if (status === 402) return is('billing')
  if (status === 400 && /credit balance|billing|purchase credits/i.test(message)) return is('billing')
  if (status === 404) return is('model')
  if (status === null) return is('transient', true) // no response at all: the connection, a timeout
  if (status === 408 || status === 409 || status === 429 || status >= 500) return is('transient', true)
  return is('other')
}

/** Thrown by the session's client after the failure has been recorded. */
export class SessionError extends Error {
  readonly recorded: RecordedError
  readonly fatal: boolean
  constructor(recorded: RecordedError, fatal: boolean) {
    super(`${recorded.kind}${recorded.status ? ` ${recorded.status}` : ''}: ${recorded.message}`)
    this.name = 'SessionError'
    this.recorded = recorded
    this.fatal = fatal
  }
}

export interface SessionOptions {
  /** Attempts per request, the first included. */
  attempts?: number
  sleep?: (ms: number) => Promise<void>
  /** Milliseconds before attempt n+1, n from 1. */
  backoff?: (attempt: number) => number
}

export interface Session {
  requests: number
  succeeded: number
  readonly errors: RecordedError[]
  stopped: Stop | null
  /** A client bound to one item and one stage, so every failure is recorded against what it was for. */
  as(item: string, stage: RecordedError['stage']): Client
  /** Stop scheduling: no request after this one is sent. Used by the session itself on a fatal failure, and by a harness whose judge failed calibration. */
  stop(kind: Stop['kind'], message: string): void
}

const DEFAULT_ATTEMPTS = 3
const defaultBackoff = (attempt: number) => 1000 * 4 ** (attempt - 1)
const realSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function openSession(client: Client, opts: SessionOptions = {}): Session {
  const attempts = opts.attempts ?? DEFAULT_ATTEMPTS
  const sleep = opts.sleep ?? realSleep
  const backoff = opts.backoff ?? defaultBackoff
  const session: Session = {
    requests: 0,
    succeeded: 0,
    errors: [],
    stopped: null,
    stop(kind, message) {
      if (!session.stopped) session.stopped = { kind, message: redact(message), requests: session.requests }
    },
    as(item, stage) {
      const create = async (params: Parameters<Client['messages']['create']>[0]) => {
        for (let attempt = 1; ; attempt++) {
          if (session.stopped) {
            const recorded: RecordedError = { item, stage, kind: 'not-sent', status: null, message: `not sent: the run had stopped (${session.stopped.kind})`, attempt }
            session.errors.push(recorded)
            throw new SessionError(recorded, false)
          }
          session.requests++
          try {
            const res = await client.messages.create(params)
            session.succeeded++
            return res
          } catch (err) {
            const c = classify(err)
            const recorded: RecordedError = { item, stage, kind: c.kind, status: c.status, message: c.message, attempt }
            session.errors.push(recorded)
            if (c.fatal) {
              session.stop(c.kind, c.message)
              throw new SessionError(recorded, true)
            }
            if (c.retryable && attempt < attempts) {
              await sleep(backoff(attempt))
              continue
            }
            throw new SessionError(recorded, false)
          }
        }
      }
      return { messages: { create } } as unknown as Client
    },
  }
  return session
}

/**
 * Run `work` over `items`, `width` at a time, and stop handing out items the
 * moment the session stops. Returns how many items were started; the rest
 * were never begun and the tally says so. `work` must record its own item —
 * it is called for every item that starts, and a throw from it is a harness
 * bug, not a model failure, so it is not caught here.
 */
export async function pool<T>(session: Session, items: readonly T[], width: number, work: (item: T, index: number) => Promise<void>): Promise<number> {
  let next = 0
  let started = 0
  async function worker() {
    while (next < items.length && !session.stopped) {
      const i = next++
      started++
      await work(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(width, items.length)) }, worker))
  return started
}
