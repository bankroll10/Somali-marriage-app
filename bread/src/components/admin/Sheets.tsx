import { useState, type ReactNode } from 'react'
import { formatMoney } from '../../../shared/config.ts'
import type { AdminDay, AdminOrder } from '../../../shared/types.ts'
import { formatYmd } from '../../../shared/zoned.ts'
import { describeQty } from '../../lib/format.ts'
import { Button, Field, Notice, inputClass } from '../ui.tsx'

/** A decision, put in front of her on the phone before it is taken. */
function Sheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="no-print fixed inset-0 z-20 flex items-end justify-center bg-cocoa/40 sm:items-center" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream p-5 pb-8 shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-[22px] font-semibold text-cocoa">{title}</h2>
        {children}
      </div>
    </div>
  )
}

const names = (orders: AdminOrder[]) => orders.map((o) => `${o.name} (${describeQty(o.qty, 'short')})`).join(', ')

/** Closing a date: what is already on it is shown and left exactly as it is. */
export function BlockSheet({ day, busy, onBlock, onClose }: { day: AdminDay; busy: boolean; onBlock: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const owed = day.orders.filter((o) => o.status === 'paid' && o.fulfillment !== 'cancelled')
  const holds = day.orders.filter((o) => o.status === 'reserved')
  return (
    <Sheet title={`Block ${formatYmd(day.date, { weekday: 'long', month: 'short', day: 'numeric' })}?`} onClose={onClose}>
      <p className="mt-2 text-[15px] leading-relaxed text-cocoa">No one new can order this date until you unblock it.</p>
      <div className="mt-4 space-y-3 text-[14px] leading-relaxed text-cocoa">
        {owed.length > 0 ? (
          <p>
            <strong>{owed.length} paid</strong> and still expecting bread: {names(owed)}. They keep their orders — nothing here cancels or refunds anyone.
          </p>
        ) : (
          <p>No paid orders on this date yet.</p>
        )}
        {holds.length > 0 && (
          <p>
            <strong>{holds.length} in checkout</strong> right now: {names(holds)}. Their hold stands; if they finish paying, that order counts.
          </p>
        )}
      </div>
      <div className="mt-4">
        <Field label="Why (optional)" hint="Only you see this.">
          <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Out of town" />
        </Field>
      </div>
      <div className="mt-5 flex gap-2">
        <Button variant="danger" disabled={busy} onClick={() => onBlock(reason)}>
          {busy ? 'Blocking…' : 'Block date'}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onClose}>
          Keep open
        </Button>
      </div>
    </Sheet>
  )
}

/** A paid customer will not be getting bread: her call, recorded, separate from any refund. */
export function CancelPaidSheet({ order, busy, onConfirm, onClose }: { order: AdminOrder; busy: boolean; onConfirm: (restock: boolean, note: string) => void; onClose: () => void }) {
  const [restock, setRestock] = useState(order.resellableIfRestocked)
  const [note, setNote] = useState('')
  const refunded = order.refundedCents > 0 || order.refundPendingCents > 0
  return (
    <Sheet title={`Cancel ${order.name}'s order?`} onClose={onClose}>
      <p className="mt-2 text-[15px] text-cocoa">
        {describeQty(order.qty)} · {formatMoney(order.amountCents)} paid
        {order.refundedCents > 0 && ` · ${formatMoney(order.refundedCents)} refunded`}
        {order.refundPendingCents > 0 && ` · ${formatMoney(order.refundPendingCents)} refund pending`}
      </p>
      <p className="mt-3 text-[14px] leading-relaxed text-cocoa">
        This takes their bread off your list. It does <strong>not</strong> move any money
        {order.stripeUrl ? (
          <>
            {' '}
            — refunds are done in Stripe:{' '}
            <a className="text-crust-dark underline" href={order.stripeUrl} target="_blank" rel="noreferrer">
              open this payment
            </a>
            .
          </>
        ) : (
          '.'
        )}
        {!refunded && order.provider === 'stripe' && ' Nothing has been refunded yet.'}
      </p>
      <fieldset className="mt-4 space-y-2">
        <legend className="mb-1 text-[14px] font-medium text-cocoa">The bread</legend>
        <label className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
          <input type="radio" className="mt-1 accent-crust" checked={restock} onChange={() => setRestock(true)} />
          <span className="text-[14px] leading-relaxed text-cocoa">
            <strong>Put it back on sale.</strong>
            {order.resellableIfRestocked ? ' Someone else can order it.' : ' This date is blocked or closed, so no one can actually buy it — but your decision is recorded.'}
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
          <input type="radio" className="mt-1 accent-crust" checked={!restock} onChange={() => setRestock(false)} />
          <span className="text-[14px] leading-relaxed text-cocoa">
            <strong>Keep it off sale.</strong> The day stays as full as it was.
          </span>
        </label>
      </fieldset>
      <div className="mt-4">
        <Field label="Note (optional)">
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Customer asked to cancel" />
        </Field>
      </div>
      {refunded && (
        <div className="mt-3">
          <Notice tone="info">The refund stays as it is in Stripe. This only changes the bread.</Notice>
        </div>
      )}
      <div className="mt-5 flex gap-2">
        <Button variant="danger" disabled={busy} onClick={() => onConfirm(restock, note)}>
          {busy ? 'Cancelling…' : 'Cancel order'}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onClose}>
          Keep order
        </Button>
      </div>
    </Sheet>
  )
}
