import Anthropic from '@anthropic-ai/sdk'
import type { Client } from './session'

/**
 * Failures a stand-in model can throw, built from the SDK's own error classes
 * so the session classifies exactly what a real client would throw. The
 * billing message is the one the API returns, word for word, when an account
 * has no credit (docs/GUIDE-EVAL.md, "The first live run").
 */
export const apiError = (status: number, message: string) => new Anthropic.APIError(status, { type: 'error', message }, message, new Headers())
export const authError = () => apiError(401, 'invalid x-api-key')
export const billingError = () => apiError(400, 'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.')
export const modelError = () => apiError(404, 'model: claude-nowhere')
export const serverError = () => apiError(500, 'Internal server error')
export const overloadedError = () => apiError(529, 'Overloaded')
export const connectionError = () => new Anthropic.APIConnectionError({ message: 'Connection error.' })

export type Params = Parameters<Client['messages']['create']>[0]

/** A plan for what the nth request (1-based) does instead of answering. */
export type FailurePlan = (params: Params, n: number) => Error | undefined

/**
 * Wrap a stand-in's `answer` function into a client: counts calls, applies
 * the failure plan first, and records every request. `sleep` is a no-op
 * clock for the session's backoff, with the waits recorded.
 */
export function standInClient(answer: (params: Params, n: number) => unknown, fail: FailurePlan = () => undefined) {
  const calls: Params[] = []
  const waits: number[] = []
  const client = {
    messages: {
      create: async (params: Params) => {
        calls.push(params)
        const n = calls.length
        const err = fail(params, n)
        if (err) throw err
        return answer(params, n)
      },
    },
  } as unknown as Client
  const sleep = async (ms: number) => {
    waits.push(ms)
  }
  return { client, calls, waits, session: { sleep } }
}

/** Fail the request numbered `n` (1-based, across guide and judge calls alike), once or for every attempt. */
export const failOn =
  (n: number, make: () => Error, times = 1): FailurePlan =>
  (_p, i) => (i >= n && i < n + times ? make() : undefined)

/** Fail every request. */
export const failAll =
  (make: () => Error): FailurePlan =>
  () =>
    make()
