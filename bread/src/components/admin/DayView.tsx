import { PICKUP_PLACE, PRODUCTS, TIMEZONE } from '../../../shared/config.ts'
import { formatPhone } from '../../../shared/phone.ts'
import type { AdminDay, AdminOrder, Qty } from '../../../shared/types.ts'
import { formatInstant, formatYmd } from '../../../shared/zoned.ts'
import { describeQty } from '../../lib/format.ts'
import { Button, Notice } from '../ui.tsx'
import OrderCard, { type OrderActions } from './OrderCard.tsx'

const longDate = (ymd: string) => formatYmd(ymd, { weekday: 'long', month: 'long', day: 'numeric' })
const nothingIn = (q: Qty) => PRODUCTS.every((p) => q[p.id] === 0)

/** One day, the way she needs it during the shift. */
export default function DayView({
  day,
  today,
  now,
  busy,
  overCapacity,
  actions,
  onBlock,
  onUnblock,
  onPrint,
}: {
  day: AdminDay
  today: string
  now: number
  busy: string | null
  overCapacity: Record<string, Qty>
  actions: OrderActions
  onBlock: () => void
  onUnblock: () => void
  onPrint: () => void
}) {
  const isToday = day.date === today
  const past = day.date < today
  const closed = Date.parse(day.cutoffAt) <= now
  const dayBusy = busy === day.date
  return (
    <section className={`rounded-2xl border bg-white ${isToday ? 'border-crust' : 'border-line'}`}>
      <header className="border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-[22px] font-semibold text-cocoa">
              {longDate(day.date)}
              {isToday && <span className="ml-2 rounded-full bg-crust px-2 py-0.5 align-middle text-[11px] font-bold uppercase tracking-wide text-cream">Today</span>}
            </h2>
            <p className="mt-0.5 text-[13px] text-cocoa-soft">
              {past ? 'Past' : day.blocked ? 'Blocked — no new orders' : closed ? 'Orders closed' : `Orders close ${formatInstant(Date.parse(day.cutoffAt), TIMEZONE)}`}
              {day.activeCheckouts > 0 && ` · ${day.activeCheckouts} in checkout now`}
            </p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" className="px-3 text-[13px]" onClick={onPrint} disabled={dayBusy}>
              Print list
            </Button>
            {!past && (
              <Button variant={day.blocked ? 'secondary' : 'danger'} className="px-3 text-[13px]" disabled={dayBusy} onClick={day.blocked ? onUnblock : onBlock}>
                {day.blocked ? 'Unblock' : 'Block date…'}
              </Button>
            )}
          </div>
        </div>
        {day.blocked && (
          <div className="mt-3">
            <Notice tone="warn">
              Blocked{day.blockedReason ? ` — ${day.blockedReason}` : ''}. Customers cannot order this date.
              {day.orders.some((o) => o.status === 'paid' && o.fulfillment === 'owed') && ' The paid orders below still get their bread.'}
            </Notice>
          </div>
        )}
      </header>

      <div className="grid gap-3 px-4 py-3 sm:grid-cols-2">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-cocoa-soft">To bake</p>
          <p className="font-display text-[26px] leading-tight font-semibold text-cocoa">{nothingIn(day.toBake) ? 'Nothing yet' : describeQty(day.toBake)}</p>
          <p className="mt-0.5 text-[12px] text-cocoa-soft">Paid orders still owed. Holds and cancelled orders are not counted.</p>
        </div>
        <ul className="space-y-1.5 text-[14px]">
          {PRODUCTS.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between gap-2 rounded-xl bg-cream-2 px-3 py-2">
              <span className="font-medium text-cocoa">{p.name}</span>
              <span className="text-right text-[13px] text-cocoa-soft">
                <b className="text-sage">{day.toBake[p.id]} paid</b> · <b className="text-amber-700">{day.held[p.id]} held</b> · <b className="text-cocoa">{day.remaining[p.id]} free</b>
                <span className="text-cocoa-soft"> of {day.capacity[p.id]}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {day.orders.length === 0 ? (
        <p className="border-t border-line px-4 py-6 text-center text-[14px] text-cocoa-soft">No orders for this day yet.</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {day.orders.map((o) => (
            <OrderCard key={o.id} order={o} busy={busy === o.id} warning={overCapacity[o.id]} actions={actions} />
          ))}
        </ul>
      )}
    </section>
  )
}

/** The sheet that goes to paper: what to bake and who is coming, nothing else. */
export function PrintSheet({ day }: { day: AdminDay }) {
  const owed = day.orders.filter((o: AdminOrder) => o.status === 'paid' && o.fulfillment !== 'cancelled')
  return (
    <section className="print-only">
      <h1 style={{ fontSize: '20pt', margin: '0 0 4pt' }}>{longDate(day.date)}</h1>
      <p style={{ margin: '0 0 12pt', fontSize: '11pt' }}>Pickup 5–11 PM at {PICKUP_PLACE} · best after 9 PM</p>
      <h2 style={{ fontSize: '14pt', margin: '0 0 4pt' }}>To bake</h2>
      <p style={{ fontSize: '16pt', margin: '0 0 12pt' }}>{nothingIn(day.toBake) ? 'Nothing' : PRODUCTS.map((p) => `${day.toBake[p.id]} ${p.name.toLowerCase()}`).join(' · ')}</p>
      <h2 style={{ fontSize: '14pt', margin: '0 0 6pt' }}>Orders ({owed.length})</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11pt' }}>
        <thead>
          <tr>
            {['', 'Name', 'Phone', 'Bread', 'Paid'].map((h) => (
              <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid #000', padding: '4pt 6pt 4pt 0' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {owed.map((o) => (
            <tr key={o.id}>
              <td style={{ padding: '4pt 6pt 4pt 0', borderBottom: '1px solid #ccc' }}>☐</td>
              <td style={{ padding: '4pt 6pt 4pt 0', borderBottom: '1px solid #ccc' }}>
                {o.name} <span style={{ fontFamily: 'monospace', fontSize: '9pt' }}>{o.shortId}</span>
                {o.fulfillment === 'picked_up' ? ' (picked up)' : ''}
              </td>
              <td style={{ padding: '4pt 6pt 4pt 0', borderBottom: '1px solid #ccc' }}>{formatPhone(o.phone)}</td>
              <td style={{ padding: '4pt 6pt 4pt 0', borderBottom: '1px solid #ccc' }}>{describeQty(o.qty)}</td>
              <td style={{ padding: '4pt 6pt 4pt 0', borderBottom: '1px solid #ccc' }}>{o.refundedCents >= o.amountCents ? 'refunded' : 'yes'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {owed.length === 0 && <p>No orders.</p>}
    </section>
  )
}
