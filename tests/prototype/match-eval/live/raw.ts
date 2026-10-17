import { sha256 } from './hash'
import { StoreError, type Store } from './store'

/**
 * Raw responses, saved before anything parses them (docs/MATCH-EVAL.md, "Stage 1a").
 *
 * The body file holds the response body exactly as received, JSON or not (an HTML page from a proxy is saved too).
 * Beside it a small meta file records what is needed to read it later. Both are created exclusively, so a second write
 * to the same path fails and the first stays as it was. Request headers, and so the credential, are never saved.
 */

export class RawWriteError extends Error {}

/** Response headers worth keeping. Nothing else is saved. */
const KEEP = /^(request-id|content-type|retry-after|date|x-should-retry|anthropic-ratelimit-[a-z-]+)$/

export interface RawMeta {
  kind: 'generation' | 'count'
  seq: number
  caseId: string
  sample: number | null
  requestSha256: string
  /** `null` when no response arrived (a timeout or a network error). */
  httpStatus: number | null
  headers: Record<string, string>
  error: string | null
  bodySha256: string | null
  savedAt: string
}

const pad = (n: number): string => String(n).padStart(3, '0')
export const rawBodyPath = (dir: string, seq: number): string => `${dir}/${pad(seq)}.body`
export const rawMetaPath = (dir: string, seq: number): string => `${dir}/${pad(seq)}.meta.json`

export function keptHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of Object.keys(headers).sort()) if (KEEP.test(k.toLowerCase())) out[k.toLowerCase()] = headers[k]
  return out
}

/**
 * Saves the body, then the meta. Throws `RawWriteError` if either fails; the caller stops the run and keeps the
 * reservation. `body` is `null` when nothing arrived; then only the meta is written.
 */
export function saveRaw(store: Store, dir: string, meta: Omit<RawMeta, 'bodySha256'>, body: string | null): RawMeta {
  const full: RawMeta = { ...meta, headers: keptHeaders(meta.headers), bodySha256: body === null ? null : sha256(body) }
  try {
    if (body !== null) store.createExclusive(rawBodyPath(dir, meta.seq), body)
    store.createExclusive(rawMetaPath(dir, meta.seq), JSON.stringify(full, null, 2) + '\n')
  } catch (e) {
    throw new RawWriteError(e instanceof StoreError ? e.message : 'the raw response could not be saved')
  }
  return full
}

export interface Manifest {
  files: { name: string; sha256: string }[]
}

/** Written once at the end of a run or a count; lists every raw file with its hash. */
export function writeManifest(store: Store, dir: string): Manifest {
  const names = store.list(dir).filter((n) => n !== 'manifest.json')
  const files = names.map((name) => ({ name, sha256: sha256(store.read(`${dir}/${name}`) ?? '') }))
  const manifest: Manifest = { files }
  try {
    store.createExclusive(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n')
    store.seal(`${dir}/manifest.json`)
  } catch (e) {
    throw new RawWriteError(e instanceof StoreError ? e.message : 'the manifest could not be written')
  }
  return manifest
}

export function verifyManifest(store: Store, dir: string): string[] {
  const text = store.read(`${dir}/manifest.json`)
  if (text === null) return ['there is no manifest']
  const problems: string[] = []
  const manifest = JSON.parse(text) as Manifest
  const listed = new Set(manifest.files.map((f) => f.name))
  for (const f of manifest.files) {
    const body = store.read(`${dir}/${f.name}`)
    if (body === null) problems.push(`${f.name} is missing`)
    else if (sha256(body) !== f.sha256) problems.push(`${f.name} has changed`)
  }
  for (const n of store.list(dir)) if (n !== 'manifest.json' && !listed.has(n)) problems.push(`${n} is not in the manifest`)
  return problems
}
