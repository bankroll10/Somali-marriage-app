import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ANALYSIS, RUBRIC } from './analysis'
import { hashOf } from './hash'
import { casesFileSha256 } from './requests'

/**
 * What a paid-run approval binds besides the requests (docs/MATCH-EVAL.md, "Stage 1a"): the frozen cases, the version 2
 * expectations, the review rubric and the preregistered analysis. Hashes only. The expectations file is read as bytes and
 * never imported, so no live module can see its notes, and none of this reaches a request.
 */

const fileSha = (name: string): string => createHash('sha256').update(readFileSync(join(import.meta.dirname, '..', name))).digest('hex')

export { casesFileSha256 }
/** The bytes of `expectations.ts`, version 2. The version 1 baseline is a different file and is not bound. */
export const expectationsFileSha256 = (): string => fileSha('expectations.ts')
export const rubricSha256 = (): string => hashOf(RUBRIC)
export const analysisSha256 = (): string => hashOf(ANALYSIS)
