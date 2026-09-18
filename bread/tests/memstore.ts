import { vi } from 'vitest'

/**
 * An in-memory Netlify Blobs store that honours the parts the app relies on:
 * etags, `onlyIfMatch`, `onlyIfNew`, and `list` by prefix. Writes are
 * serialised through a microtask so concurrent `set` calls interleave the
 * way real requests do — a test that fires ten reservations at once would
 * prove nothing if the mock could not race.
 */
export const stores = new Map<string, Map<string, { body: string; etag: string }>>()

let counter = 0
const nextEtag = () => `"e${++counter}"`

function memStore(name: string) {
  const m = stores.get(name) ?? new Map<string, { body: string; etag: string }>()
  stores.set(name, m)
  const parse = (body: string, type?: string) => (type === 'json' ? JSON.parse(body) : body)
  return {
    get: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key)
      return v ? parse(v.body, opts?.type) : null
    },
    getWithMetadata: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key)
      return v ? { data: parse(v.body, opts?.type), etag: v.etag, metadata: {} } : null
    },
    set: async (key: string, body: string, opts?: { onlyIfMatch?: string; onlyIfNew?: boolean }) => {
      // Yield so a batch of concurrent callers all read before any writes.
      await new Promise((r) => setTimeout(r, 0))
      const current = m.get(key)
      if (opts?.onlyIfNew && current) return { modified: false }
      if (opts?.onlyIfMatch && current?.etag !== opts.onlyIfMatch) return { modified: false }
      const etag = nextEtag()
      m.set(key, { body, etag })
      return { modified: true, etag }
    },
    setJSON: async (key: string, value: unknown) => {
      m.set(key, { body: JSON.stringify(value), etag: nextEtag() })
      return { modified: true }
    },
    delete: async (key: string) => void m.delete(key),
    list: async (opts?: { prefix?: string }) => ({
      blobs: [...m.entries()].filter(([k]) => !opts?.prefix || k.startsWith(opts.prefix)).map(([key, v]) => ({ key, etag: v.etag })),
      directories: [],
    }),
  }
}

vi.mock('@netlify/blobs', () => ({ getStore: (opts: string | { name: string }) => memStore(typeof opts === 'string' ? opts : opts.name) }))

export const resetStores = () => stores.clear()
