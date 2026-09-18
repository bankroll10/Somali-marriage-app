import { pickupDates, cutoffFor, isOrderable } from '../../shared/schedule.ts'
import type { AvailabilityResponse, DayAvailability } from '../../shared/types.ts'
import { remaining } from '../lib/inventory.ts'
import { error, json } from '../lib/http.ts'
import { breadStore, readDay } from '../lib/store.ts'

/** GET /api/availability — every pickup date a customer may see, with what is left. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') return error('method_not_allowed', 405)
  const now = Date.now()
  const store = breadStore()
  try {
    const days: DayAvailability[] = await Promise.all(
      pickupDates(now).map(async (date) => {
        const { value } = await readDay(store, date)
        return {
          date,
          blocked: value.blocked,
          cutoffAt: new Date(cutoffFor(date)).toISOString(),
          open: isOrderable(date, now),
          remaining: remaining(value, now),
        }
      }),
    )
    const body: AvailabilityResponse = { now: new Date(now).toISOString(), days }
    return json(body)
  } catch (err) {
    console.error('[bread] availability failed', err)
    return error('unavailable', 503)
  }
}
