import { chmodSync, closeSync, fsyncSync, mkdirSync, openSync, readdirSync, readFileSync, writeSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'

/**
 * Where a live run keeps what it must not lose (docs/MATCH-EVAL.md, "Stage 1a"): the journal, the raw response bodies
 * and the reports. It is an interface so every persistence path is tested with a fake that can fail on demand.
 *
 * - `createExclusive` fails if the file exists. Nothing is ever overwritten.
 * - `append` adds one line and flushes it to disk before it returns.
 * - Any failure throws `StoreError`; the caller stops the run and keeps the reservation.
 */

export class StoreError extends Error {}

export interface Store {
  createExclusive(path: string, data: string): void
  append(path: string, line: string): void
  read(path: string): string | null
  /** The names directly under `dir` (files or folders), sorted; empty when it does not exist. */
  list(dir: string): string[]
  /** Makes a finished file read-only. */
  seal(path: string): void
}

/** A relative path of plain segments: no absolute paths, no `..`, no backslash, no empty or NUL-bearing segment. */
export function safePath(p: string): string {
  if (typeof p !== 'string' || p === '' || p.startsWith('/') || p.includes('\\') || p.includes('\0')) throw new StoreError(`not a safe relative path: ${JSON.stringify(p)}`)
  for (const seg of p.split('/')) if (seg === '' || seg === '.' || seg === '..') throw new StoreError(`not a safe relative path: ${JSON.stringify(p)}`)
  return p
}

export function nodeStore(root: string): Store {
  const base = resolve(root)
  const full = (p: string): string => {
    const f = resolve(join(base, safePath(p)))
    if (f !== base && !f.startsWith(base + sep)) throw new StoreError('path escapes the store root')
    return f
  }
  const write = (path: string, flag: 'wx' | 'a', data: string): void => {
    try {
      const f = full(path)
      mkdirSync(dirname(f), { recursive: true })
      const fd = openSync(f, flag, 0o644)
      try {
        writeSync(fd, data)
        fsyncSync(fd)
      } finally {
        closeSync(fd)
      }
    } catch (e) {
      throw e instanceof StoreError ? e : new StoreError(`could not write ${path}: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }
  return {
    createExclusive: (path, data) => write(path, 'wx', data),
    append: (path, line) => write(path, 'a', `${line}\n`),
    read: (path) => {
      try {
        return readFileSync(full(path), 'utf8')
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw new StoreError(`could not read ${path}`)
      }
    },
    list: (dir) => {
      try {
        return readdirSync(full(dir)).sort()
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
        throw new StoreError(`could not list ${dir}`)
      }
    },
    seal: (path) => {
      try {
        chmodSync(full(path), 0o444)
      } catch {
        throw new StoreError(`could not seal ${path}`)
      }
    },
  }
}

export type StoreOp = 'create' | 'append' | 'seal'

/** An in-memory store for tests. It logs every operation in order and can be told to fail one. */
export interface MemoryStore extends Store {
  readonly ops: string[]
  readonly files: Map<string, string>
  readonly sealed: Set<string>
  /** A copy of the files as they are now, as a crash would leave them. */
  snapshot(): Map<string, string>
}

export function memoryStore(o: { fail?: (op: StoreOp, path: string, count: number) => boolean; files?: Map<string, string> } = {}): MemoryStore {
  const files = new Map<string, string>(o.files ?? [])
  const sealed = new Set<string>()
  const ops: string[] = []
  let count = 0
  const gate = (op: StoreOp, path: string): void => {
    count++
    if (o.fail?.(op, path, count)) throw new StoreError(`injected failure on ${op} ${path}`)
  }
  return {
    ops,
    files,
    sealed,
    snapshot: () => new Map(files),
    createExclusive(path, data) {
      safePath(path)
      gate('create', path)
      if (files.has(path)) throw new StoreError(`${path} already exists`)
      files.set(path, data)
      ops.push(`create ${path}`)
    },
    append(path, line) {
      safePath(path)
      gate('append', path)
      if (sealed.has(path)) throw new StoreError(`${path} is read-only`)
      files.set(path, (files.get(path) ?? '') + line + '\n')
      ops.push(`append ${path}`)
    },
    read: (path) => files.get(safePath(path)) ?? null,
    list(dir) {
      safePath(dir)
      const names = new Set<string>()
      for (const k of files.keys()) if (k.startsWith(dir + '/')) names.add(k.slice(dir.length + 1).split('/')[0])
      return [...names].sort()
    },
    seal(path) {
      safePath(path)
      gate('seal', path)
      sealed.add(path)
      ops.push(`seal ${path}`)
    },
  }
}
