import { useEffect, useState } from 'react'
import { PICKUP_PLACE, SHOP_NAME, TIMEZONE, formatMoney } from '../../shared/config.ts'
import type { OrderSummary } from '../../shared/types.ts'
import { formatInstant, formatYmd } from '../../shared/zoned.ts'
import { ApiError, getOrder } from '../lib/api.ts'
import { PICKUP_PREFERRED, PICKUP_WINDOW, describeQty } from '../lib/format.ts'
import { Button, Notice, Page, Spinner, Title } from './ui.tsx'

type State = { kind: 'loading' } | { kind: 'missing' } | { kind: 'error' } | { kind: 'order'; order: OrderSummary }

/** How long to keep quietly checking whether she's marked the order paid, while this tab stays open. */
const POLL_MS = (attempt: number) => (attempt < 12 ? 5_000 : 30_000) // ~1 min quick, then every 30s
const MAX_POLLS = 200 // roughly the length of a hold window

/** Where the order page sends the customer after reserving — /thanks?order=<id>. */
export default function Thanks() {
  const [orderId] = useState(() => new URLSearchParams(window.location.search).get('order'))
  const [state, setState] = useState<State>(orderId ? { kind: 'loading' } : { kind: 'missing' })

  useEffect(() => {
    if (!orderId) return
    let attempts = 0
    let timer: number | undefined
    let cancelled = false
    const tick = async () => {
      try {
        const order = await getOrder(orderId)
        if (cancelled) return
        setState({ kind: 'order', order })
        if (order.status === 'pending' && attempts < MAX_POLLS) timer = window.setTimeout(tick, POLL_MS(attempts++))
      } catch (err) {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) setState({ kind: 'missing' })
        else if (attempts++ < 3) timer = window.setTimeout(tick, 2000)
        else setState({ kind: 'error' })
      }
    }
    tick()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [orderId])

  if (state.kind === 'loading') {
    return (
      <Page>
        <Spinner label="Loading your order…" />
      </Page>
    )
  }
  if (state.kind === 'missing' || state.kind === 'error') {
    return (
      <Page>
        <Title>{state.kind === 'missing' ? 'No order to show' : 'Could not load your order'}</Title>
        <Notice tone="info">
          {state.kind === 'missing'
            ? 'This link does not point at an order. If you just reserved, use the link the order page sent you to.'
            : 'Could not reach the server just now. Reload in a moment.'}
        </Notice>
        <div className="mt-6">
          <Button variant="secondary" onClick={() => window.location.assign('/')}>
            Back to ordering
          </Button>
        </div>
      </Page>
    )
  }

  const { order } = state
  if (order.status === 'expired') {
    return (
      <Page>
        <Title kicker="Reservation lapsed">This hold has expired</Title>
        <Notice tone="info">
          Your bread was held for a while, but no payment was confirmed in time, so it's been released back into the
          pool. If you'd still like it, please order again.
        </Notice>
        <div className="mt-6">
          <Button onClick={() => window.location.assign('/')}>Order again</Button>
        </div>
      </Page>
    )
  }

  const firstName = order.name.split(' ')[0]
  const paid = order.status === 'paid'
  return (
    <Page>
      <Title
        kicker={paid ? 'Order confirmed' : 'Reserved — pay by Zelle'}
        sub={
          paid
            ? `Thank you, ${firstName}. Your bread is reserved and paid for.`
            : `Send the Zelle below and your order confirms itself — this page updates on its own once she's marked it received.`
        }
      >
        {paid ? "You're all set" : "You're holding your bread"}
      </Title>

      {!paid && (
        <div className="mb-5 rounded-2xl border border-crust/30 bg-crust/5 p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-crust-dark">Send by Zelle</p>
          <p className="font-display text-[24px] font-semibold text-cocoa">{formatMoney(order.amountCents)}</p>
          <dl className="mt-3 space-y-1.5 text-[14px] text-cocoa">
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-cocoa-soft">To</dt>
              <dd className="font-medium">{order.zelle.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-cocoa-soft">At</dt>
              <dd className="font-medium">{order.zelle.handle}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-cocoa-soft">Memo</dt>
              <dd className="font-mono font-medium tracking-wider">{order.shortId}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[13px] leading-relaxed text-crust-dark">
            Include the memo code above so your payment is easy to match. Your bread is held until{' '}
            {formatInstant(Date.parse(order.holdExpiresAt), TIMEZONE)} — if it isn't confirmed by then, the
            reservation lapses.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-white p-5">
        <Row label="Order">
          <span className="font-mono text-[15px] font-semibold tracking-wider">{order.shortId}</span>
        </Row>
        <Row label="Bread">{describeQty(order.qty)}</Row>
        <Row label="Pick up">
          <span className="font-semibold">{formatYmd(order.date, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          <br />
          {PICKUP_WINDOW} at {PICKUP_PLACE}, {PICKUP_PREFERRED}
        </Row>
        <Row label={paid ? 'Paid' : 'Total'} last>
          <span className="font-semibold">{formatMoney(order.amountCents)}</span>
          {paid && <span className="ml-2 rounded-full bg-sage/10 px-2 py-0.5 text-[12px] font-semibold text-sage">Paid</span>}
        </Row>
      </div>

      <p className="mt-4 text-[14px] leading-relaxed text-cocoa-soft">
        {paid
          ? "Give your name at the front desk when you come for it — screenshot this page if you like."
          : 'Keep this page open, or come back to it any time — it will show "Paid" once your Zelle is confirmed.'}
      </p>

      <div className="mt-8">
        <Button variant="secondary" onClick={() => window.location.assign('/')}>
          Order more from {SHOP_NAME}
        </Button>
      </div>
    </Page>
  )
}

function Row({ label, children, last = false }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex gap-4 py-3 ${last ? '' : 'border-b border-line'}`}>
      <span className="w-20 shrink-0 text-[13px] font-medium uppercase tracking-wide text-cocoa-soft">{label}</span>
      <span className="text-[15px] leading-relaxed text-cocoa">{children}</span>
    </div>
  )
}
