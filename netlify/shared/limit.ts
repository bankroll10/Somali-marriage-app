import { getStore } from '@netlify/blobs'

/**
 * A circuit breaker, not a business rule.
 *
 * The guide is already budgeted per member on the client (src/lib/budget.ts),
 * but that budget lives in her browser and nothing on the server enforces it —
 * a script that replays the same POST bypasses it completely, and the founder
 * would not see a bill spike until the statement arrived. Thirty days of that,
 * unwatched, is a real amount of money.
 *
 * This is the backstop under that gap: one shared counter per hour, with no
 * identity attached to it at all — not an IP, not an install id, nothing that
 * could turn a cost control into a second place this product tracks a person.
 * It exists to make "someone left a loop running against this endpoint for a
 * month" survivable, not to shape how any real member uses the guide.
 *
 * Conditional writes lose a race now and then under real concurrency; a few
 * retries cover it, and exhausting them fails open. A rate limiter that could
 * itself take the guide down on a blob hiccup would be a worse bug than the
 * one it exists to prevent.
 */

const ATTEMPTS = 3

function hourKey(bucket: string, ms: number = Date.now()): string {
  return `${bucket}-${new Date(ms).toISOString().slice(0, 13)}`
}

/**
 * True while `bucket` has room left in the current hour. Increments on every
 * call that returns true, so callers must call this once per attempt, not
 * once per allowed attempt.
 */
export async function underHourlyLimit(bucket: string, cap: number): Promise<boolean> {
  const store = getStore({ name: 'limits', consistency: 'strong' })
  const key = hourKey(bucket)
  try {
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const current = (await store.getWithMetadata(key, { type: 'json' })) as { data: number; etag?: string } | null
      const count = current?.data ?? 0
      if (count >= cap) return false
      const next = count + 1
      const result = current?.etag
        ? await store.setJSON(key, next, { onlyIfMatch: current.etag })
        : await store.setJSON(key, next, { onlyIfNew: true })
      if (result.modified) return true
    }
    // Lost the race three times under real concurrency — let it through rather
    // than block a legitimate call over a counting glitch.
    console.error(`[niyyah] limit: ${bucket} lost the count three times in a row; allowing the call`)
    return true
  } catch (err) {
    console.error(`[niyyah] limit: ${bucket} check failed; allowing the call`, err)
    return true
  }
}
