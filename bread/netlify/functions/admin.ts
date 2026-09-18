import { TIMEZONE, WEEKS_AHEAD } from '../../shared/config.ts'
import { cutoffFor, isPickupDay } from '../../shared/schedule.ts'
import type { AdminAction, AdminDay, AdminOrder, AdminResponse } from '../../shared/types.ts'
import { shortId } from '../../shared/types.ts'
import { addDays, isYmd, ymdInZone } from '../../shared/zoned.ts'
import { checkAdmin } from '../lib/auth.ts'
import { env, error, json, readJson } from '../lib/http.ts'
import { remaining, setBlocked } from '../lib/inventory.ts'
import { breadStore, readDay, readOrder, writeOrder, type BreadStore } from '../lib/store.ts'

/**
 * /api/admin — her private view. Every request carries the admin password as
 * a bearer token; without one configured the whole endpoint is closed.
 */
export default async function handler(req: Request): Promise<Response> {
  const auth = checkAdmin(req, env.adminPassword)
  if (auth === 'unconfigured') return error('admin_not_configured', 503)
  if (auth === 'denied') return error('unauthorized', 401)

  const store = breadStore()
  try {
    if (req.method === 'GET') return await list(req, store)
    if (req.method === 'POST') return await act(req, store)
    return error('method_not_allowed', 405)
  } catch (err) {
    console.error('[bread] admin failed', err)
    return error('unavailable', 503)
  }
}

async function adminDay(store: BreadStore, date: string, now: number): Promise<AdminDay> {
  const { value: day } = await readDay(store, date)
  const orders = (await Promise.all(day.orderIds.map((id) => readOrder(store, id))))
    .filter((o): o is NonNullable<typeof o> => o !== null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((o): AdminOrder => ({ ...o, shortId: shortId(o.id) }))
  return {
    date,
    blocked: day.blocked,
    cutoffAt: new Date(cutoffFor(date)).toISOString(),
    toBake: day.sold,
    remaining: remaining(day, now),
    orders,
  }
}

/** GET ?from=YYYY-MM-DD&to=YYYY-MM-DD — defaults to last week through the customer window. */
async function list(req: Request, store: BreadStore): Promise<Response> {
  const now = Date.now()
  const today = ymdInZone(now, TIMEZONE)
  const params = new URL(req.url).searchParams
  const from = params.get('from') ?? addDays(today, -7)
  const to = params.get('to') ?? addDays(today, WEEKS_AHEAD * 7)
  if (!isYmd(from) || !isYmd(to) || from > to) return error('bad_range', 400)
  const dates: string[] = []
  for (let d = from; d <= to && dates.length < 120; d = addDays(d, 1)) if (isPickupDay(d)) dates.push(d)
  const days = await Promise.all(dates.map((d) => adminDay(store, d, now)))
  const body: AdminResponse = { now: new Date(now).toISOString(), days }
  return json(body)
}

async function act(req: Request, store: BreadStore): Promise<Response> {
  const body = await readJson<Partial<AdminAction>>(req)
  if (body instanceof Response) return body
  const now = Date.now()

  if (body.action === 'block' || body.action === 'unblock') {
    if (!isYmd(body.date)) return error('bad_date', 400)
    const result = await setBlocked(store, body.date, body.action === 'block', now)
    if (!result.ok) return error('busy', 503)
    return json(await adminDay(store, body.date, now))
  }

  if (body.action === 'pickedUp') {
    if (typeof body.orderId !== 'string' || typeof body.pickedUp !== 'boolean') return error('bad_request', 400)
    const order = await readOrder(store, body.orderId)
    if (!order) return error('not_found', 404)
    if (body.pickedUp) order.pickedUpAt = new Date(now).toISOString()
    else delete order.pickedUpAt
    await writeOrder(store, order)
    return json({ ...order, shortId: shortId(order.id) } satisfies AdminOrder)
  }

  return error('bad_action', 400)
}
