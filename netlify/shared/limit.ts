import { getStore } from '@netlify/blobs'
import { bump } from './counter'
import { failed, note } from './ops'

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
 * did not have: every other public write lands in storage on a free plan. A
 * `keep` loop is the cheapest way to spend the plan's storage; a `progress`
 * loop the cheapest way to make the founder's readout time out. A cap does
 * not stop a patient script, but it makes inflation slow and visible, and it
 * bounds every write against limits nobody can see.
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
    await failed('limit', `${bucket}/${period} sweep failed; old periods linger`, err)
  }
}

/**
 * Where `bucket` stands in the current period, counting this attempt:
 * `under` (and the count went up), `over` (the cap is met, nothing written),
 * or `unknown` (the store could not be read or written, so nothing at all is
 * known about the count). Callers decide what `unknown` means for them —
 * see `underLimit` and `overCapOrUnknown` below.
 */
export type CapState = 'under' | 'over' | 'unknown'

export async function capState(bucket: string, cap: number, period: Period = 'h'): Promise<CapState> {
  try {
    // Inside the try, not above it. Opening a store can throw on its own — a
    // missing Blobs environment, a bad site context — and almost every caller
    // awaits this *outside* its own try, so a throw here was an unhandled
    // rejection and a platform 500 with a non-JSON body, on every capped
    // endpoint at once. That is precisely the failure the note above says a
    // rate limiter must never cause (docs/FAIL.md).
    const store = getStore({ name: 'limits', consistency: 'strong' })
    const key = periodKey(bucket, period)
    const counted = await bump(store, key, 1, cap)
    if (counted.state === 'over') {
      // Counted where the founder can see it — by kind of cap, never by what
      // the call was about (docs/OPS.md). The refusal itself writes nothing here.
      await note(capSignal(bucket, period))
      return 'over'
    }
    if (counted.state === 'counted') {
      // A new period began: the ones before it are done with.
      if (counted.fresh) await sweep(store, bucket, period, key)
      return 'under'
    }
    // Lost the race three times under real concurrency — the store answered
    // every time, so this is a counting glitch, not an outage: let it through
    // rather than block a legitimate call.
    console.error(`[niyyah] limit: ${bucket}/${period} lost the count three times in a row; allowing the call`)
    return 'under'
  } catch (err) {
    await failed('limit', `${bucket}/${period} check failed; the caller decides`, err)
    return 'unknown'
  }
}

/**
 * The operations signal a refusal is counted under (shared/ops.ts): the kind
 * of cap, and nothing more. The guide's two caps are told apart, because only
 * the day's means the guide is offline until midnight.
 */
export function capSignal(bucket: string, period: Period): string {
  if (bucket === 'guide') return `cap.guide-${period}`
  return `cap.${bucket}`
}

/**
 * True while `bucket` has room left in the current period. Increments on every
 * call that returns true, so callers must call this once per attempt, not
 * once per allowed attempt.
 *
 * Fails open: a counter that cannot be read never refuses a write that costs
 * storage and nothing else. The one route that costs money on every call must
 * not use this — it uses `overCapOrUnknown`.
 */
export async function underLimit(bucket: string, cap: number, period: Period = 'h'): Promise<boolean> {
  return (await capState(bucket, cap, period)) !== 'over'
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
 * The cap for a bucket is `<BUCKET>_HOURLY_CAP` — `KEEP_HOURLY_CAP`,
 * `GUIDE_HOURLY_CAP` — read per call so a change takes effect on the next
 * request, falling back to the function's own default. True when this call
 * would take the bucket past it.
 */
export async function overHourlyCap(bucket: string, fallback: number): Promise<boolean> {
  const cap = Number(process.env[envName(bucket, 'HOURLY')]) || fallback
  return !(await underLimit(bucket, cap, 'h'))
}

/**
 * The strict twin of `overHourlyCap`, for a bucket that spends money: true
 * when the cap is met **or when the count cannot be known**, by the hour or by
 * the day. An hourly cap alone bounds an hour and nothing longer — it resets
 * seven hundred and twenty times a month — so the guide, the one bucket that
 * calls a model, checks the day first and then the hour (see the arithmetic in
 * `netlify/functions/guide.ts`). A
 * storage outage under the guide used to mean every call went through and the
 * only bound left was a console spend limit nobody had written down
 * (docs/RISKS.md R5). The member sees the same 503 as at the cap, and the
 * offline voice answers her.
 */
export async function overCapOrUnknown(bucket: string, fallback: number, period: Period): Promise<boolean> {
  const cap = Number(process.env[envName(bucket, period === 'h' ? 'HOURLY' : 'DAILY')]) || fallback
  return (await capState(bucket, cap, period)) !== 'under'
}

/**
 * The refusal. The same 503 shape every client already treats as "nothing to
 * show, try again later" — a member sees exactly what she sees when storage
 * is unreachable, which is to say nothing that looks like a wall.
 */
export function rateLimited(): Response {
  return Response.json({ error: 'rate_limited' }, { status: 503 })
}
