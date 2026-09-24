import type { getStore } from '@netlify/blobs'

type Store = ReturnType<typeof getStore>

/**
 * Add to a number in a store, without losing a count to a concurrent writer.
 *
 * Netlify Blobs has no increment, so this reads the number with its version
 * and writes it back only if nobody wrote in between (`onlyIfMatch`), or only
 * if it is still absent (`onlyIfNew`). A lost race is retried; three lost in a
 * row is reported as `lost` rather than retried for ever. Shared by the rate
 * limiter (shared/limit.ts), which refuses at a cap, and the operations count
 * (shared/ops.ts), which has none.
 *
 *  - `over`: the number had already reached `cap`, and nothing was written.
 *  - `counted`: it went up by `by`. `fresh` when this write created the key.
 *  - `lost`: three writes in a row were overtaken.
 *
 * Throws when the store does: callers decide what an outage means for them.
 */
export type Bumped = { state: 'over' } | { state: 'counted'; fresh: boolean } | { state: 'lost' }

const ATTEMPTS = 3

export async function bump(store: Store, key: string, by = 1, cap = Infinity): Promise<Bumped> {
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const current = (await store.getWithMetadata(key, { type: 'json' })) as { data: number; etag?: string } | null
    const count = typeof current?.data === 'number' ? current.data : 0
    if (count >= cap) return { state: 'over' }
    const result = current?.etag
      ? await store.setJSON(key, count + by, { onlyIfMatch: current.etag })
      : await store.setJSON(key, count + by, { onlyIfNew: true })
    if (result.modified) return { state: 'counted', fresh: !current?.etag }
  }
  return { state: 'lost' }
}
