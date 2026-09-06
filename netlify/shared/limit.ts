import { getStore } from '@netlify/blobs'

/**
 * A circuit breaker, not a business rule.
 *
 * The guide is budgeted per member on the client (src/lib/budget.ts), but that
 * budget lives in her browser and nothing on the server enforces it — a script
 * that replays the same POST bypasses it completely, and the founder would not
 * see a bill spike until the statement arrived. Thirty days of that, unwatched,
 * is a real amount of money. That was the first cap, on the guide.
 *
 * The rest followed in the Scale pass (docs/SCALE.md), for a reason the guide
 * did not have: every other public write lands in storage on a free plan, and
 * the door became the unit that opens a marketplace. A `keep` loop is the
 * cheapest way to spend the plan's storage; a `progress` loop the cheapest way
 * to make the founder's readout time out; a `cohort` loop the cheapest way to
 * walk a door toward forty. A cap does not stop a patient script — the
 * kept-map requirement and the founder's judgement do — but it makes inflation
 * slow and visible, and it bounds every write against limits nobody can see.
 *
 * One shared counter per bucket per hour, with no identity attached to it at
 * all — not an IP, not an install id, nothing that could turn a cost control
 * into a second place this product tracks a person. It exists to make "someone
 * left a loop running against this endpoint for a month" survivable, not to
 * shape how any real member uses anything. Every default sits well above any
 * real hour this product has seen; a launch day is the one time to raise them
 * (docs/DEPLOY.md names the variables).
 *
 * Conditional writes lose a race now and then under real concurrency; a few
 * retries cover it, and exhausting them fails open. A rate limiter that could
 * itself take a function down on a blob hiccup would be a worse bug than the
 * one it exists to prevent.
 */

const ATTEMPTS = 3

function hourKey(bucket: string, ms: number = Date.now()): string {
  return `${bucket}-${new Date(ms).toISOString().slice(0, 13)}`
}

type Store = ReturnType<typeof getStore>

/**
 * The hour before is never read again once a new one has begun, so the first
 * write of each hour clears the bucket's other keys. That keeps the store at
 * one live key per bucket rather than eight thousand a year, and nothing here
 * is worth a scheduled job. Failing is harmless: old hours linger, unread.
 */
async function sweep(store: Store, bucket: string, keep: string): Promise<void> {
  try {
    const { blobs } = await store.list({ prefix: `${bucket}-` })
    await Promise.all(blobs.filter(({ key }) => key !== keep).map(({ key }) => store.delete(key)))
  } catch (err) {
    console.error(`[niyyah] limit: ${bucket} sweep failed; old hours linger`, err)
  }
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
      if (result.modified) {
        // A new hour began: the hours before it are done with.
        if (!current?.etag) await sweep(store, bucket, key)
        return true
      }
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

/**
 * The cap for a bucket is `<BUCKET>_HOURLY_CAP` — `COHORT_HOURLY_CAP`,
 * `GUIDE_HOURLY_CAP` — read per call so a change takes effect on the next
 * request, falling back to the function's own default. True when this call
 * would take the bucket past it.
 */
export async function overHourlyCap(bucket: string, fallback: number): Promise<boolean> {
  const cap = Number(process.env[`${bucket.toUpperCase()}_HOURLY_CAP`]) || fallback
  return !(await underHourlyLimit(bucket, cap))
}

/**
 * The refusal. The same 503 shape every client already treats as "nothing to
 * show, try again later" — a member sees exactly what she sees when storage
 * is unreachable, which is to say nothing that looks like a wall.
 */
export function rateLimited(): Response {
  return Response.json({ error: 'rate_limited' }, { status: 503 })
}
