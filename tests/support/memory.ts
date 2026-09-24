/**
 * A plain in-memory Netlify Blobs for the function tests.
 *
 * Each store is a Map of key → the raw string written, so a test seeds and
 * reads it directly (`stores.get('maps')!.get(code)`). The version of a value
 * is the value itself: enough for `onlyIfMatch` to lose when something else
 * wrote first, and for `onlyIfNew` to refuse a key that exists.
 *
 * Nine test files each carried their own copy of this until 2026-09-24, with
 * small differences nobody chose — one `setJSON` ignored its conditions and
 * returned nothing. tests/support/blobs.ts is the other double, for the tests
 * that break things on purpose: real etags, injected failures and races.
 *
 * A file that uses this mocks the store with it:
 *   vi.mock('@netlify/blobs', async () => (await import('./support/memory')).memoryModule)
 */

type Conditions = { onlyIfMatch?: string; onlyIfNew?: boolean }

export const stores = new Map<string, Map<string, string>>()

export function memStore(name: string) {
  const m = stores.get(name) ?? new Map<string, string>()
  stores.set(name, m)
  const write = (key: string, value: string, opts?: Conditions) => {
    if (opts?.onlyIfNew && m.has(key)) return { modified: false }
    if (opts?.onlyIfMatch && opts.onlyIfMatch !== m.get(key)) return { modified: false }
    m.set(key, value)
    return { modified: true, etag: value }
  }
  return {
    list: async ({ prefix = '' }: { prefix?: string } = {}) => ({
      blobs: [...m.entries()].filter(([k]) => k.startsWith(prefix)).map(([key, v]) => ({ key, etag: v })),
      directories: [],
    }),
    get: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key) ?? null
      return v !== null && opts?.type === 'json' ? JSON.parse(v) : v
    },
    getMetadata: async (key: string) => (m.has(key) ? { etag: m.get(key)!, metadata: {} } : null),
    getWithMetadata: async (key: string, opts?: { type?: string }) => {
      const v = m.get(key) ?? null
      return v === null ? null : { data: opts?.type === 'json' ? JSON.parse(v) : v, etag: v, metadata: {} }
    },
    set: async (key: string, value: string, opts?: Conditions) => write(key, value, opts),
    setJSON: async (key: string, value: unknown, opts?: Conditions) => write(key, JSON.stringify(value), opts),
    delete: async (key: string) => void m.delete(key),
  }
}

/** For `vi.mock('@netlify/blobs', …)`. */
export const memoryModule = {
  getStore: (arg: string | { name: string }) => memStore(typeof arg === 'string' ? arg : arg.name),
}
