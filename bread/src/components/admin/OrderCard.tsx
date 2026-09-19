import { PRODUCTS, formatMoney } from '../../../shared/config.ts'
import { formatPhone } from '../../../shared/phone.ts'
import type { AdminOrder, Qty } from '../../../shared/types.ts'
import { describeQty } from '../../lib/format.ts'
import { Button } from '../ui.tsx'

export interface OrderActions {
  onPicked: (o: AdminOrder, pickedUp: boolean) => void
  onMarkPaid: (o: AdminOrder, force?: boolean) => void
  onCancelReservation: (o: AdminOrder) => void
  onCancelPaid: (o: AdminOrder) => void
  onCheckRefund: (o: AdminOrder) => void
}

function Chip({ tone, children }: { tone: 'sage' | 'amber' | 'berry' | 'muted' | 'cocoa'; children: string }) {
  const tones = {
    sage: 'bg-sage/10 text-sage',
    amber: 'bg-amber-100 text-amber-800',
    berry: 'bg-berry/10 text-berry',
    muted: 'bg-cream-2 text-cocoa-soft',
    cocoa: 'bg-cocoa/10 text-cocoa',
  }
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${tones[tone]}`}>{children}</span>
}

/** What happened to the money. */
function paymentChip(o: AdminOrder) {
  if (o.status === 'paid') {
    if (o.refundedCents >= o.amountCents) return <Chip tone="berry">refunded</Chip>
    if (o.refundedCents > 0) return <Chip tone="berry">{`${formatMoney(o.refundedCents)} refunded`}</Chip>
    if (o.refundPendingCents > 0) return <Chip tone="amber">refund pending</Chip>
    return <Chip tone="sage">paid</Chip>
  }
  if (o.status === 'reserved') return <Chip tone="amber">{o.provider === 'stripe' ? 'paying by card' : 'awaiting zelle'}</Chip>
  if (o.status === 'cancelled') return <Chip tone="muted">cancelled</Chip>
  return <Chip tone="muted">{o.provider === 'stripe' ? 'payment page closed' : 'hold lapsed'}</Chip>
}

/** What happened to the bread. Only meaningful once paid. */
function fulfillmentChip(o: AdminOrder) {
  if (o.status !== 'paid') return null
  if (o.fulfillment === 'picked_up') return <Chip tone="cocoa">picked up</Chip>
  if (o.fulfillment === 'cancelled') return <Chip tone="muted">{o.restockedAt ? 'cancelled · restocked' : 'cancelled · kept off sale'}</Chip>
  return <Chip tone="sage">owed</Chip>
}

/** One customer on the day: who, what, how to reach them, and what she can do about it. */
export default function OrderCard({ order: o, busy, warning, actions }: { order: AdminOrder; busy: boolean; warning: Qty | undefined; actions: OrderActions }) {
  const paid = o.status === 'paid'
  const owed = paid && o.fulfillment === 'owed'
  const done = (paid && o.fulfillment !== 'owed') || o.status === 'expired' || o.status === 'cancelled'
  const live = o.status === 'reserved'
  return (
    <li className={`px-4 py-3 ${done ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-3">
        {owed ? (
          <input type="checkbox" className="mt-1 size-6 shrink-0 accent-sage" checked={false} disabled={busy} onChange={() => actions.onPicked(o, true)} aria-label={`${o.name} picked up`} />
        ) : (
          <span className={`mt-1.5 size-5 shrink-0 rounded-full ${live ? 'bg-amber-400' : paid && o.fulfillment === 'picked_up' ? 'bg-sage' : 'bg-line'}`} aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold text-cocoa">
            {o.name} <span className="ml-1 font-mono text-[12px] font-medium text-cocoa-soft">{o.shortId}</span>
          </p>
          <p className="text-[15px] text-cocoa">{describeQty(o.qty)}</p>
          <a className="inline-block min-h-8 py-1 text-[15px] text-crust-dark underline-offset-2 hover:underline" href={`tel:${o.phone}`}>
            {formatPhone(o.phone)}
          </a>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {paymentChip(o)}
            {fulfillmentChip(o)}
            {o.forced && <Chip tone="berry">over capacity</Chip>}
          </div>
          {o.fulfillmentNote && <p className="mt-1 text-[13px] text-cocoa-soft">“{o.fulfillmentNote}”</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[16px] font-semibold text-cocoa">{formatMoney(o.amountCents)}</p>
          <p className="text-[11px] text-cocoa-soft">{paid ? 'paid' : 'not paid'}</p>
        </div>
      </div>

      {live && o.provider === 'stripe' && <p className="mt-1 text-[12px] text-cocoa-soft">On Stripe's page, or left it. Cancel ends that session at Stripe first; Mark paid is for cash at the desk.</p>}
      {!live && !paid && <p className="mt-1 text-[12px] text-cocoa-soft">Its bread went back into the pool. Mark paid only if the money did arrive.</p>}

      {warning ? (
        <div className="mt-2 rounded-xl bg-berry/10 p-3">
          <p className="text-[13px] text-berry">
            This would exceed capacity — only {PRODUCTS.map((p) => `${warning[p.id]} ${p.name.toLowerCase()}`).join(', ')} left. Confirm anyway?
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="danger" className="px-3 text-[13px]" disabled={busy} onClick={() => actions.onMarkPaid(o, true)}>
              Confirm anyway
            </Button>
            <Button variant="ghost" className="px-3 text-[13px]" disabled={busy} onClick={() => actions.onCancelReservation(o)}>
              Cancel order
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {paid && o.fulfillment === 'picked_up' && (
            <Button variant="ghost" className="px-3 text-[13px]" disabled={busy} onClick={() => actions.onPicked(o, false)}>
              Undo pickup
            </Button>
          )}
          {owed && (
            <Button variant="ghost" className="px-3 text-[13px] text-berry" disabled={busy} onClick={() => actions.onCancelPaid(o)}>
              Cancel order…
            </Button>
          )}
          {!paid && (
            <Button className="px-3 text-[13px]" disabled={busy} onClick={() => actions.onMarkPaid(o)}>
              Mark paid
            </Button>
          )}
          {live && (
            <Button variant="ghost" className="px-3 text-[13px]" disabled={busy} onClick={() => actions.onCancelReservation(o)}>
              Cancel
            </Button>
          )}
          {o.stripeUrl && (
            <a className="inline-flex min-h-11 items-center rounded-xl px-3 text-[13px] font-semibold text-crust-dark hover:bg-cream-2" href={o.stripeUrl} target="_blank" rel="noreferrer">
              View in Stripe ↗
            </a>
          )}
          {paid && o.provider === 'stripe' && (
            <Button variant="ghost" className="px-3 text-[13px]" disabled={busy} onClick={() => actions.onCheckRefund(o)}>
              Check refund
            </Button>
          )}
        </div>
      )}
    </li>
  )
}
