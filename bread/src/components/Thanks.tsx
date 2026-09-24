import { useEffect, useState } from 'react'
import { CONTACT_PHONE, CONTACT_PHONE_SMS, CONTACT_PHONE_TEL, MISSED_PICKUP, PICKUP_LOCATION, SHOP_NAME, TIMEZONE, formatMoney } from '../../shared/config.ts'
import type { OrderSummary } from '../../shared/types.ts'
import { formatInstant, ymdInZone } from '../../shared/zoned.ts'
import { ApiError, getOrder } from '../lib/api.ts'
import { longDate } from '../lib/cart.ts'
import { clearDraft } from '../lib/draft.ts'
import { PICKUP_PREFERRED, PICKUP_WINDOW, describeQty } from '../lib/format.ts'
import { Button, Notice, Page, Spinner, Title } from './ui.tsx'

type State = { kind: 'loading' } | { kind: 'missing' } | { kind: 'error' } | { kind: 'order'; order: OrderSummary; stalled?: boolean }

/**
 * While a card payment is being verified, each poll is a server-side check
 * with Stripe — refreshing this page is always safe and never doubles
 * anything. Quick at first, then patient, then it asks the customer to
 * refresh rather than polling forever.
 */
const POLL_MS = (attempt: number) => (attempt < 6 ? 2_000 : attempt < 18 ? 5_000 : 30_000)
const MAX_POLLS = 40

/** Her number, on every page a customer might have a question on. */
const Contact = ({ className = 'mt-4' }: { className?: string }) => (
  <p className={`${className} text-[14px] text-cocoa-soft`}>
    Questions?{' '}
    <a className="font-semibold text-crust-dark underline underline-offset-2" href={CONTACT_PHONE_TEL}>
      Call or text {CONTACT_PHONE}
    </a>
  </p>
)

const Back = ({ label = 'Back to ordering', variant = 'secondary' }: { label?: string; variant?: 'primary' | 'secondary' }) => (
  <div className="mt-8">
    <Button variant={variant} onClick={() => window.location.assign('/')}>
      {label}
    </Button>
  </div>
)

/** Where the order page sends the customer after reserving — /thanks?order=<id>. */
export default function Thanks() {
  const [orderId] = useState(() => new URLSearchParams(window.location.search).get('order'))
  const [state, setState] = useState<State>(orderId ? { kind: 'loading' } : { kind: 'missing' })
  const [today] = useState(() => ymdInZone(Date.now(), TIMEZONE))

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
        if (order.status === 'paid') clearDraft() // the cart did its job
        if (order.checking && attempts < MAX_POLLS) timer = window.setTimeout(tick, POLL_MS(attempts++))
        else if (order.checking) setState({ kind: 'order', order, stalled: true })
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

  useEffect(() => {
    const o = state.kind === 'order' ? state.order : null
    document.title = o?.status === 'paid' ? `Order confirmed — ${SHOP_NAME}` : o?.checking ? `Checking your payment — ${SHOP_NAME}` : `Your order — ${SHOP_NAME}`
  }, [state])

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
        <Notice tone="info" role="status">
          {state.kind === 'missing'
            ? 'This link does not point at an order. If you just reserved, use the link the order page sent you to.'
            : 'No connection to the server just now. Nothing is lost — reload in a moment.'}
        </Notice>
        <Back />
      </Page>
    )
  }

  const { order } = state
  const where = (
    <>
      {PICKUP_WINDOW}, {PICKUP_PREFERRED}
      <br />
      {PICKUP_LOCATION}
    </>
  )

  if (order.attention) {
    return (
      <Page>
        <div aria-live="polite">
          <Title kicker="Payment received — one check pending">We're looking at your payment</Title>
        </div>
        <Notice tone="warn" role="status">
          Stripe reported your payment, but something about it needs a person to look before the order is confirmed.
          Nothing more is needed from you; I have this flagged and will sort it out. Keep your order code{' '}
          <span className="font-mono font-semibold">{order.shortId}</span> handy.
        </Notice>
        <Contact />
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Check again
          </Button>
          <Button variant="ghost" onClick={() => window.location.assign('/')}>
            Back to ordering
          </Button>
        </div>
      </Page>
    )
  }
  if (order.checking) {
    return (
      <Page>
        <div aria-live="polite" aria-atomic="true">
          <Title kicker="Checking your payment" sub="We're confirming with Stripe. This usually takes a few seconds.">
            One moment…
          </Title>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <Row label="Order">
            <span className="font-mono text-[15px] font-semibold tracking-wider">{order.shortId}</span>
          </Row>
          <Row label="Bread">{describeQty(order.qty)}</Row>
          <Row label="Pick up" last>
            {longDate(order.date, today, 'always')}
          </Row>
        </div>
        <p className="mt-4 text-[14px] leading-relaxed text-cocoa-soft" role="status">
          {state.stalled
            ? 'Still waiting on Stripe. It is safe to refresh this page — checking again never charges you twice. If you closed the payment page without paying, your bread is released automatically.'
            : 'It is safe to refresh this page or close it and come back: nothing here can charge you twice.'}
        </p>
        <Contact />
        {state.stalled && (
          <div className="mt-6">
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Check again
            </Button>
          </div>
        )}
      </Page>
    )
  }
  if (order.status === 'expired' || order.status === 'cancelled') {
    return (
      <Page>
        <div aria-live="polite">
          <Title kicker={order.status === 'cancelled' ? 'Reservation cancelled' : 'Reservation lapsed'}>
            {order.status === 'cancelled' ? 'This order was cancelled' : 'This hold has expired'}
          </Title>
        </div>
        <Notice tone="info" role="status">
          {order.status === 'cancelled'
            ? 'This reservation was cancelled, so the bread went back into the pool. No payment was taken.'
            : 'The payment page closed without a payment, so the bread went back into the pool. Nothing was charged.'}{' '}
          Your choices are still on the order page if you would like to try again.
        </Notice>
        <Contact />
        <Back label="Order again" variant="primary" />
      </Page>
    )
  }

  const firstName = order.name.split(' ')[0]
  const paid = order.status === 'paid'
  return (
    <Page>
      <div aria-live="polite" aria-atomic="true">
        <Title
          kicker={paid ? 'Order confirmed' : 'Reserved — pay by Zelle'}
          sub={
            paid
              ? `Thank you, ${firstName}. Your payment went through and your bread is reserved.`
              : `Send the Zelle below and your order confirms itself — this page updates on its own once I've marked it received.`
          }
        >
          {paid ? "You're all set" : "You're holding your bread"}
        </Title>
      </div>

      {!paid && order.provider === 'zelle' && (
        <div className="mb-5 rounded-2xl border border-crust/30 bg-crust/5 p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-crust-dark">Send by Zelle</p>
          <p className="font-display text-[24px] font-semibold text-cocoa">{formatMoney(order.amountCents)}</p>
          <dl className="mt-3 space-y-1.5 text-[14px] text-cocoa">
            {order.zelle?.name && (
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 text-cocoa-soft">To</dt>
                <dd className="font-medium">{order.zelle.name}</dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 text-cocoa-soft">At</dt>
              <dd className="font-medium">{order.zelle?.handle}</dd>
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
          <span className="font-semibold">{longDate(order.date, today, 'always')}</span>
          <br />
          {where}
        </Row>
        <Row label={paid ? 'Paid' : 'Total'} last>
          <span className="font-semibold">{formatMoney(order.amountCents)}</span>
          {paid && <span className="ml-2 rounded-full bg-sage/10 px-2 py-0.5 text-[12px] font-semibold text-sage">Paid</span>}
        </Row>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-cocoa-soft">
        Text{' '}
        <a className="font-semibold text-crust-dark underline underline-offset-2" href={CONTACT_PHONE_SMS}>
          {CONTACT_PHONE}
        </a>{' '}
        for the pickup location.
      </p>

      <p className="mt-4 text-[14px] leading-relaxed text-cocoa-soft">
        {paid
          ? `This page is your confirmation — screenshot it if you like, and give your name and order code when you pick it up. If Stripe sends a receipt, it goes to the email you gave on the payment page.`
          : 'Keep this page open, or come back to it any time — it will show "Paid" once your Zelle is confirmed.'}
      </p>
      {paid && <p className="mt-3 text-[14px] leading-relaxed text-cocoa-soft">{MISSED_PICKUP}</p>}
      <Contact className="mt-3" />

      <Back label={`Order more from ${SHOP_NAME}`} />
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
