import type { AdminAction, AdminDay, AdminOrder, AdminResponse, AvailabilityResponse, CheckoutRequest, OrderSummary } from '../../shared/types.ts'

export class ApiError extends Error {
  code: string
  status: number
  constructor(code: string, status: number) {
    super(code)
    this.code = code
    this.status = status
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(init.headers ?? {}) } })
  } catch {
    throw new ApiError('offline', 0)
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new ApiError(body.error ?? 'failed', res.status)
  return body as T
}

export const getAvailability = () => call<AvailabilityResponse>('/api/availability')

export const startCheckout = (req: CheckoutRequest) =>
  call<{ url: string; orderId: string }>('/api/checkout', { method: 'POST', body: JSON.stringify(req) })

export const getOrder = (sessionId: string) => call<OrderSummary>(`/api/order?session_id=${encodeURIComponent(sessionId)}`)

export const cancelCheckout = (sessionId: string) =>
  call<{ status: string }>(`/api/cancel?session_id=${encodeURIComponent(sessionId)}`, { method: 'POST' })

const bearer = (password: string) => ({ authorization: `Bearer ${password}` })

export const adminList = (password: string, range?: { from: string; to: string }) =>
  call<AdminResponse>(`/api/admin${range ? `?from=${range.from}&to=${range.to}` : ''}`, { headers: bearer(password) })

export const adminAct = <A extends AdminAction>(password: string, action: A) =>
  call<A extends { action: 'pickedUp' } ? AdminOrder : AdminDay>('/api/admin', {
    method: 'POST',
    body: JSON.stringify(action),
    headers: bearer(password),
  })
