/**
 * One in-memory Netlify Blobs, for the tests that break things on purpose
 * (tests/integrity.test.ts, docs/INTEGRITY.md).
 *
 * What the real store does that the per-file doubles elsewhere only
 * approximate: an etag that changes on every write, so `onlyIfMatch` can
 * actually lose; `onlyIfNew` that refuses an existing key; a `list` by prefix.
 * And two things the real store does to us in production that no test could
 * make it do until now:
 *
 *   - **fail on a chosen call** — `failOn({ op: 'delete', key: 'index/…' })`
 *     throws on exactly that call, so "what if step 3 fails after steps 1
 *     and 2 succeeded" is a test, not a thought experiment;
 *   - **interleave** — `before('delete', key, fn)` runs `fn` (a competing
 *     request) at exactly that point, so a race is deterministic.
 */

type Op = 'get' | 'getMetadata' | 'getWithMetadata' | 'set' | 'setJSON' | 'delete' | 'list'

interface Rule {
  store?: string
  op: Op
  key?: string
  prefix?: string
  /** Which matching call to hit, counting from 1. Default: the first. */
  nth?: number
  seen: number
  fn?: () => unknown | Promise<unknown>
  error?: Error
  once: boolean
  spent: boolean
}

export interface Blob {
  value: string
  etag: string
}

/** One call a route made, for asserting what it read — not only what it returned. */
export interface Call {
  store: string
  op: Op
  key: string
}

export class Blobs {
  readonly stores = new Map<string, Map<string, Blob>>()
  /** Every call, in order, since the last reset. */
  readonly log: Call[] = []
  private rules: Rule[] = []
  private clock = 0
  /** Stores that cannot even be opened — `getStore` itself throws. */
  private unopenable = new Set<string>()

  reset() {
    this.stores.clear()
    this.rules = []
    this.log.length = 0
    this.unopenable.clear()
  }

  /** Make opening a store throw, as Blobs does when its context is missing or the platform is down. */
  failOpen(name: string) {
    this.unopenable.add(name)
  }

  private data(name: string) {
    let m = this.stores.get(name)
    if (!m) this.stores.set(name, (m = new Map()))
    return m
  }

  /** Throw on a chosen call. */
  failOn(r: { store?: string; op: Op; key?: string; prefix?: string; nth?: number; error?: Error }) {
    this.rules.push({ ...r, seen: 0, once: true, spent: false, error: r.error ?? new Error(`injected ${r.op} failure`) })
  }

  /** Run a competing request just before a chosen call. */
  before(op: Op, key: string, fn: () => unknown | Promise<unknown>, store?: string) {
    this.rules.push({ op, key, store, fn, seen: 0, once: true, spent: false })
  }

  private async hit(store: string, op: Op, key: string) {
    this.log.push({ store, op, key })
    for (const r of this.rules) {
      if (r.spent || r.op !== op) continue
      if (r.store && r.store !== store) continue
      if (r.key !== undefined && r.key !== key) continue
      if (r.prefix !== undefined && !key.startsWith(r.prefix)) continue
      r.seen += 1
      if (r.seen !== (r.nth ?? 1)) continue
      if (r.once) r.spent = true
      if (r.fn) await r.fn()
      if (r.error) throw r.error
    }
  }

  /** Raw access for assertions and seeding. */
  put(store: string, key: string, value: unknown) {
    this.data(store).set(key, { value: typeof value === 'string' ? value : JSON.stringify(value), etag: `e${++this.clock}` })
  }
  read(store: string, key: string): unknown {
    const b = this.data(store).get(key)
    if (!b) return null
    try {
      return JSON.parse(b.value)
    } catch {
      return b.value
    }
  }
  keys(store: string): string[] {
    return [...this.data(store).keys()].sort()
  }

  store(name: string) {
    if (this.unopenable.has(name)) throw new Error(`injected: the ${name} store cannot be opened`)
    const m = () => this.data(name)
    const write = async (op: Op, key: string, value: string, opts?: { onlyIfNew?: boolean; onlyIfMatch?: string }) => {
      await this.hit(name, op, key)
      const existing = m().get(key)
      if (opts?.onlyIfNew && existing) return { modified: false }
      if (opts?.onlyIfMatch !== undefined && existing?.etag !== opts.onlyIfMatch) return { modified: false }
      const etag = `e${++this.clock}`
      m().set(key, { value, etag })
      return { modified: true, etag }
    }
    const parse = (b: Blob | undefined, type?: string) => {
      if (!b) return null
      return type === 'json' ? JSON.parse(b.value) : b.value
    }
    return {
      list: async ({ prefix = '' }: { prefix?: string } = {}) => {
        await this.hit(name, 'list', prefix)
        return {
          blobs: [...m().entries()].filter(([k]) => k.startsWith(prefix)).map(([key, b]) => ({ key, etag: b.etag })),
          directories: [],
        }
      },
      get: async (key: string, opts?: { type?: string }) => {
        await this.hit(name, 'get', key)
        return parse(m().get(key), opts?.type)
      },
      getMetadata: async (key: string) => {
        await this.hit(name, 'getMetadata', key)
        const b = m().get(key)
        return b ? { etag: b.etag, metadata: {} } : null
      },
      getWithMetadata: async (key: string, opts?: { type?: string }) => {
        await this.hit(name, 'getWithMetadata', key)
        const b = m().get(key)
        return b ? { data: parse(b, opts?.type), etag: b.etag, metadata: {} } : null
      },
      set: (key: string, value: string, opts?: { onlyIfNew?: boolean; onlyIfMatch?: string }) => write('set', key, value, opts),
      setJSON: (key: string, value: unknown, opts?: { onlyIfNew?: boolean; onlyIfMatch?: string }) =>
        write('setJSON', key, JSON.stringify(value), opts),
      delete: async (key: string) => {
        await this.hit(name, 'delete', key)
        m().delete(key)
      },
    }
  }
}

/** The one instance a test file mocks `@netlify/blobs` with. */
export const blobs = new Blobs()

/** For `vi.mock('@netlify/blobs', () => blobsModule)`. */
export const blobsModule = {
  getStore: (arg: string | { name: string }) => blobs.store(typeof arg === 'string' ? arg : arg.name),
}
