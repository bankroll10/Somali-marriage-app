import { useEffect, useState } from 'react'
import { PICKUP_PLACE, SHOP_NAME, formatMoney } from '../../shared/config.ts'
import type { OrderSummary } from '../../shared/types.ts'
import { formatYmd } from '../../shared/zoned.ts'
import { ApiError, getOrder } from '../lib/api.ts'
import { PICKUP_PREFERRED, PICKUP_WINDOW, describeQty } from '../lib/format.ts'
import { Button, Notice, Page, Spinner, Title } from './ui.tsx'

type State = { kind: 'loading' } | { kind: 'missing' } | { kind: 'error' } | { kind: 'order'; order: OrderSummary }

/** Where Stripe sends the customer after paying. Polls briefly if the payment is still settling. */
export default function Thanks() {
  const [sid] = useState(() => new URLSearchParams(window.location.search).get('session_id'))
  const [state, setState] = useState<State>(sid ? { kind: 'loading' } : { kind: 'missing' })

  useEffect(() => {
    if (!sid) return
    let attempts = 0
    let timer: number | undefined
    const tick = async () => {
      try {
        const order = await getOrder(sid)
        setState({ kind: 'order', order })
        if (order.status === 'pending' && attempts++ < 8) timer = window.setTimeout(tick, 1500)
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) setState({ kind: 'missing' })
        else if (attempts++ < 3) timer = window.setTimeout(tick, 2000)
        else setState({ kind: 'error' })
      }
    }
    tick()
    return () => window.clearTimeout(timer)
  }, [sid])

  if (state.kind === 'loading') {
    return (
      <Page>
        <Spinner label="Confirming your order…" />
      </Page>
    )
  }
  if (state.kind === 'missing' || state.kind === 'error') {
    return (
      <Page>
        <Title>{state.kind === 'missing' ? 'No order to show' : 'Could not load your order'}</Title>
        <Notice tone="info">
          {state.kind === 'missing'
            ? 'This link does not point at an order. If you just paid, check your email for the Stripe receipt — the order went through if the receipt did.'
            : 'Your payment is safe with Stripe. Reload in a moment, or check your email for the receipt.'}
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
  const firstName = order.name.split(' ')[0]
  const paid = order.status === 'paid'
  return (
    <Page>
      <Title kicker={paid ? 'Order confirmed' : 'Almost there'} sub={paid ? `Thank you, ${firstName}. Your bread is reserved and paid for.` : 'Your payment is still settling — this page will update on its own.'}>
        {paid ? "You're all set" : 'Confirming payment…'}
      </Title>

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
        {paid ? 'Stripe has emailed your receipt. ' : ''}Give your name at the front desk when you come for it — screenshot this page if you like.
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
