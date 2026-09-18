import type { AdminAction, AdminDay, AdminOrder, AdminResponse, AvailabilityResponse, CheckoutRequest, CheckoutResponse, OrderSummary } from '../../shared/types.ts'

export class ApiError extends Error {
  code: string
  status: number
  /** Extra fields the error body carried — e.g. `remaining` on `would_exceed_capacity`. */
  detail: Record<string, unknown>
  constructor(code: string, status: number, detail: Record<string, unknown> = {}) {
    super(code)
    this.code = code
    this.status = status
    this.detail = detail
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } })
  } catch {
    throw new ApiError('offline', 0)
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>
  if (!res.ok) {
    const { error: code, ...detail } = body
    throw new ApiError(code ?? 'failed', res.status, detail)
  }
  return body as T
}

export const getAvailability = () => call<AvailabilityResponse>('/api/availability')

export const startCheckout = (req: CheckoutRequest) =>
  call<CheckoutResponse>('/api/checkout', { method: 'POST', body: JSON.stringify(req) })

export const getOrder = (orderId: string) => call<OrderSummary>(`/api/order?order=${encodeURIComponent(orderId)}`)

/** The customer backed out of Stripe's page: end the session there, then let the server release on Stripe's word. */
export const cancelCheckout = (orderId: string) => call<{ state: string }>(`/api/cancel?order=${encodeURIComponent(orderId)}`, { method: 'POST' })

const bearer = (password: string) => ({ authorization: `Bearer ${password}` })

export const adminList = (password: string, range?: { from: string; to: string }) =>
  call<AdminResponse>(`/api/admin${range ? `?from=${range.from}&to=${range.to}` : ''}`, { headers: bearer(password) })

type AdminActResult<A> = A extends { action: 'block' | 'unblock' } ? AdminDay : AdminOrder

export const adminAct = <A extends AdminAction>(password: string, action: A) =>
  call<AdminActResult<A>>('/api/admin', { method: 'POST', body: JSON.stringify(action), headers: bearer(password) })
