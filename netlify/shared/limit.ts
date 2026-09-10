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

/**
 * How long a counter lasts. `h` resets every hour, `d` every day.
 *
 * The period is in the key, not just in its length, and that is load-bearing:
 * an hourly stamp (`2026-09-10T21`) has a daily one (`2026-09-10`) as its
 * prefix, so a single `${bucket}-` listing would return both — and `sweep`
 * deletes everything in a listing except the key it was given. The hour would
 * therefore delete the day's counter every hour and a daily cap would never
 * bind. Keying as `${bucket}-${period}-${stamp}` keeps the two listings
 * disjoint, and each sweep scoped to its own period's prefix.
 */
export type Period = 'h' | 'd'

/** Hours are the first thirteen characters of an ISO day-and-time; days, ten. */
const STAMP: Record<Period, number> = { h: 13, d: 10 }

function periodKey(bucket: string, period: Period, ms: number = Date.now()): string {
  return `${bucket}-${period}-${new Date(ms).toISOString().slice(0, STAMP[period])}`
}

type Store = ReturnType<typeof getStore>

/**
 * The hour before is never read again once a new one has begun, so the first
 * write of each hour clears the bucket's other keys. That keeps the store at
 * one live key per bucket rather than eight thousand a year, and nothing here
 * is worth a scheduled job. Failing is harmless: old hours linger, unread.
 */
async function sweep(store: Store, bucket: string, period: Period, keep: string): Promise<void> {
  try {
    const { blobs } = await store.list({ prefix: `${bucket}-${period}-` })
    await Promise.all(blobs.filter(({ key }) => key !== keep).map(({ key }) => store.delete(key)))
  } catch (err) {
    console.error(`[niyyah] limit: ${bucket}/${period} sweep failed; old periods linger`, err)
  }
}

/**
 * True while `bucket` has room left in the current period. Increments on every
 * call that returns true, so callers must call this once per attempt, not
 * once per allowed attempt.
 */
export async function underLimit(bucket: string, cap: number, period: Period = 'h'): Promise<boolean> {
  const store = getStore({ name: 'limits', consistency: 'strong' })
  const key = periodKey(bucket, period)
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
        // A new period began: the ones before it are done with.
        if (!current?.etag) await sweep(store, bucket, period, key)
        return true
      }
    }
    // Lost the race three times under real concurrency — let it through rather
    // than block a legitimate call over a counting glitch.
    console.error(`[niyyah] limit: ${bucket}/${period} lost the count three times in a row; allowing the call`)
    return true
  } catch (err) {
    console.error(`[niyyah] limit: ${bucket}/${period} check failed; allowing the call`, err)
    return true
  }
}

/**
 * The variable a bucket reads its cap from. A bucket name may carry a hyphen
 * (`couple-read`), and a hyphen is not a character an environment variable
 * name can hold — so it becomes an underscore, and `couple-read` reads
 * `COUPLE_READ_HOURLY_CAP`, the name docs/DEPLOY.md has always given it.
 * Until this existed the function looked for `COUPLE-READ_HOURLY_CAP`, which
 * nothing can set, so the documented variable silently never bound.
 */
export function envName(bucket: string, period: 'HOURLY' | 'DAILY'): string {
  return `${bucket.toUpperCase().replace(/-/g, '_')}_${period}_CAP`
}

/**
 * The cap for a bucket is `<BUCKET>_HOURLY_CAP` — `COHORT_HOURLY_CAP`,
 * `GUIDE_HOURLY_CAP` — read per call so a change takes effect on the next
 * request, falling back to the function's own default. True when this call
 * would take the bucket past it.
 */
export async function overHourlyCap(bucket: string, fallback: number): Promise<boolean> {
  const cap = Number(process.env[envName(bucket, 'HOURLY')]) || fallback
  return !(await underLimit(bucket, cap, 'h'))
}

/**
 * The same, by the day — `<BUCKET>_DAILY_CAP`.
 *
 * An hourly cap alone bounds an hour and nothing longer: it resets seven
 * hundred and twenty times a month, so "the worst hour is survivable" and "the
 * worst month is survivable" are different claims and only the first was true.
 * That gap costs nothing where a bucket spends storage, which is why the Scale
 * pass did not need this. It costs money on the one bucket that calls a model,
 * so the guide carries both — see the arithmetic in `netlify/functions/guide.ts`.
 *
 * Callers that use both must check the day first: the hour's counter should not
 * be spent by a call the day was going to refuse anyway.
 */
export async function overDailyCap(bucket: string, fallback: number): Promise<boolean> {
  const cap = Number(process.env[envName(bucket, 'DAILY')]) || fallback
  return !(await underLimit(bucket, cap, 'd'))
}

/**
 * The refusal. The same 503 shape every client already treats as "nothing to
 * show, try again later" — a member sees exactly what she sees when storage
 * is unreachable, which is to say nothing that looks like a wall.
 */
export function rateLimited(): Response {
  return Response.json({ error: 'rate_limited' }, { status: 503 })
}
