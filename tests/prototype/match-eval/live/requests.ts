import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isEligible, judge } from '../../../../src/prototype/match/suggest'
import { personOf, selfOf } from '../cases'
import { buildInput } from '../contract'
import type { EvalCase, ModelInput } from '../types'
import { hashOf, sha256 } from './hash'
import { SYSTEM_PROMPT_PROPOSED } from './prompt'

/**
 * The exact requests a live run would send, as two different bodies (docs/MATCH-EVAL.md, "Stage 1a").
 *
 * The generation endpoint and the counting endpoint document different fields, so each gets its own body. The counting
 * body carries every field of the generation body that the counting endpoint documents and leaves out `max_tokens`,
 * which it does not document. Both are serialized once, here, and the same text is what is hashed and what is sent.
 *
 * Nothing here sends anything or reads a credential.
 */

/** The model recommended in the plan. NOT approved: the approval records name the model, and a mismatch refuses. */
export const MODEL = 'claude-sonnet-5-5'
export const API_VERSION = '2023-06-01'

/** The only two destinations a transport may reach. */
export const GENERATION_URL = 'https://api.anthropic.com/v1/messages'
export const COUNT_URL = 'https://api.anthropic.com/v1/messages/count_tokens'

/** Settings that are written down so they cannot drift. They go into the settings hash in both approvals. */
export const SETTINGS = {
  model: MODEL,
  thinking: { type: 'between_tools' },
  effort: 'high',
  apiVersion: API_VERSION,
  /** Non-streaming; the ceiling is far below the 10-minute guidance for long requests. */
  timeoutMs: 120_000,
} as const

export const settingsSha256 = (): string => hashOf(SETTINGS)

/** Provisional. There is no finite maximal reply under the contract, so this is a cost ceiling and not a validity bound. */
export const PROVISIONAL_MAX_OUTPUT_TOKENS = 1_500

export interface GenerationBody {
  model: string
  max_tokens: number
  system: string
  messages: [{ role: 'user'; content: string }]
  thinking: { type: 'between_tools' }
  output_config: { effort: 'high' }
}

export interface CountBody {
  model: string
  system: string
  messages: [{ role: 'user'; content: string }]
  thinking: { type: 'between_tools' }
  output_config: { effort: 'high' }
}

/** What the model is shown: the same text `buildRequest` gives in Stage 0. */
export const userTurn = (input: ModelInput): string => JSON.stringify(input, null, 2)

export function generationBody(c: EvalCase, maxTokens: number): GenerationBody {
  return {
    model: SETTINGS.model,
    max_tokens: maxTokens,
    system: SYSTEM_PROMPT_PROPOSED,
    messages: [{ role: 'user', content: userTurn(buildInput(c)) }],
    thinking: { type: SETTINGS.thinking.type },
    output_config: { effort: SETTINGS.effort },
  }
}

export function countBody(c: EvalCase): CountBody {
  return {
    model: SETTINGS.model,
    system: SYSTEM_PROMPT_PROPOSED,
    messages: [{ role: 'user', content: userTurn(buildInput(c)) }],
    thinking: { type: SETTINGS.thinking.type },
    output_config: { effort: SETTINGS.effort },
  }
}

/** The one serialization. Compact, in the key order above. */
export const serialize = (body: GenerationBody | CountBody | { model: string; messages: unknown[] }): string => JSON.stringify(body)

export interface PlannedRequest {
  caseId: string
  /** The user turn, which is unique per case; the engine looks counts up by it. */
  user: string
  generation: string
  generationSha256: string
  count: string
  countSha256: string
}

/** Only eligible pairs get a request: an ineligible pair is never counted or sent. */
export function requestSet(cases: EvalCase[], maxTokens: number): PlannedRequest[] {
  return cases
    .filter((c) => isEligible(judge(selfOf(c), personOf(c))))
    .map((c) => {
      const generation = serialize(generationBody(c, maxTokens))
      const count = serialize(countBody(c))
      return { caseId: c.id, user: userTurn(buildInput(c)), generation, generationSha256: sha256(generation), count, countSha256: sha256(count) }
    })
}

/** Independent of the ceiling, so the count approval can bind it before any ceiling is chosen. */
export const countRequestSetSha256 = (set: PlannedRequest[]): string => hashOf(set.map((r) => [r.caseId, r.countSha256]))
export const generationRequestSetSha256 = (set: PlannedRequest[]): string => hashOf(set.map((r) => [r.caseId, r.generationSha256]))

/** The exact bytes of the frozen cases file (pinned in the Stage 0 tests), so an approval names the cases it covers. */
export function casesFileSha256(): string {
  return createHash('sha256').update(readFileSync(join(import.meta.dirname, '..', 'cases.ts'))).digest('hex')
}
