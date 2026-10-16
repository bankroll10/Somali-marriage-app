import type { ProviderRequest } from './types'

/**
 * The only provider in Stage 0 is a fake. It makes no network call, imports no SDK and reads no credential; it records
 * what it was sent and returns what a test scripted. A real provider behind this interface is listed as unresolved
 * in ledger.ts and does not exist.
 */

export interface Completion {
  text: string
  /** Absent when a provider does not report it. The ledger then keeps the whole reservation. */
  usage?: { inputTokens: number; outputTokens: number }
}

export interface Provider {
  complete(req: ProviderRequest): Promise<Completion>
}

export class ProviderTimeout extends Error {}

/** What the fake answers for the nth request: a completion, or `'timeout'`. */
export type Script = (req: ProviderRequest, n: number) => Completion | 'timeout'

export class FakeProvider implements Provider {
  readonly calls: ProviderRequest[] = []
  private readonly script: Script
  constructor(script: Script) {
    this.script = script
  }

  async complete(req: ProviderRequest): Promise<Completion> {
    this.calls.push(req)
    const out = this.script(req, this.calls.length - 1)
    if (out === 'timeout') throw new ProviderTimeout('the fake provider timed out')
    return out
  }
}
