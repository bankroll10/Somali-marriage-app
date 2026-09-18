import { useCallback, useEffect, useState } from 'react'
import { PRODUCTS, SHOP_NAME, TIMEZONE, formatMoney } from '../../shared/config.ts'
import { formatPhone } from '../../shared/phone.ts'
import type { AdminDay, AdminOrder, Qty } from '../../shared/types.ts'
import { addDays, formatInstant, formatYmd, ymdInZone } from '../../shared/zoned.ts'
import { ApiError, adminAct, adminList } from '../lib/api.ts'
import { describeQty } from '../lib/format.ts'
import { Button, Field, Notice, Page, Spinner, Title, inputClass } from './ui.tsx'

const KEY = 'bread-admin'

type Load = { state: 'idle' } | { state: 'loading' } | { state: 'error'; code: string } | { state: 'ready'; days: AdminDay[]; today: string; now: number }

/** Her page. The password never leaves this tab's session storage. */
export default function Admin() {
  const [password, setPassword] = useState<string>(() => {
    try {
      return sessionStorage.getItem(KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [typed, setTyped] = useState('')
  const [load, setLoad] = useState<Load>(() => (password ? { state: 'loading' } : { state: 'idle' }))
  const [showPast, setShowPast] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  /** orderId → the remaining counts a markPaid was refused over, so she can choose to force it. */
  const [overCapacity, setOverCapacity] = useState<Record<string, Qty>>({})

  /** Fetch and show. Only ever sets state after the network round-trip. */
  const fetchDays = useCallback(async (pw: string) => {
    try {
      const now = Date.now()
      const today = ymdInZone(now, TIMEZONE)
      const res = await adminList(pw, { from: addDays(today, -28), to: addDays(today, 42) })
      const serverNow = Date.parse(res.now)
      setLoad({ state: 'ready', days: res.days, today: ymdInZone(serverNow, TIMEZONE), now: serverNow })
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'offline'
      if (code === 'unauthorized') {
        setPassword('')
        try {
          sessionStorage.removeItem(KEY)
        } catch {
          /* private mode */
        }
      }
      setLoad({ state: 'error', code })
    }
  }, [])

  const refresh = useCallback(
    (pw: string) => {
      setLoad({ state: 'loading' })
      return fetchDays(pw)
    },
    [fetchDays],
  )

  useEffect(() => {
    if (password) fetchDays(password)
  }, [password, fetchDays])

  function signIn() {
    const pw = typed.trim()
    if (!pw) return
    try {
      sessionStorage.setItem(KEY, pw)
    } catch {
      /* private mode: works for this page load only */
    }
    setTyped('')
    setLoad({ state: 'loading' })
    setPassword(pw)
  }

  function signOut() {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
    setPassword('')
    setLoad({ state: 'idle' })
  }

  function patchDay(day: AdminDay) {
    setLoad((l) => (l.state === 'ready' ? { ...l, days: l.days.map((d) => (d.date === day.date ? day : d)) } : l))
  }
  function patchOrder(order: AdminOrder) {
    setLoad((l) =>
      l.state === 'ready' ? { ...l, days: l.days.map((d) => (d.date === order.date ? { ...d, orders: d.orders.map((o) => (o.id === order.id ? order : o)) } : d)) } : l,
    )
  }

  async function toggleBlock(day: AdminDay) {
    setBusy(day.date)
    try {
      patchDay(await adminAct(password, { action: day.blocked ? 'unblock' : 'block', date: day.date }))
    } catch {
      refresh(password)
    } finally {
      setBusy(null)
    }
  }

  async function togglePicked(order: AdminOrder) {
    setBusy(order.id)
    try {
      patchOrder(await adminAct(password, { action: 'pickedUp', orderId: order.id, pickedUp: !order.pickedUpAt }))
    } catch {
      refresh(password)
    } finally {
      setBusy(null)
    }
  }

  function clearWarning(orderId: string) {
    setOverCapacity((m) => {
      if (!(orderId in m)) return m
      const next = { ...m }
      delete next[orderId]
      return next
    })
  }

  /** She's seen the Zelle land. Confirming can change what's left to bake for the day, so it reloads the list. */
  async function markPaid(order: AdminOrder, force = false) {
    setBusy(order.id)
    try {
      await adminAct(password, { action: 'markPaid', orderId: order.id, force })
      clearWarning(order.id)
      await refresh(password)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'would_exceed_capacity') {
        setOverCapacity((m) => ({ ...m, [order.id]: err.detail.remaining as Qty }))
      } else {
        refresh(password)
      }
    } finally {
      setBusy(null)
    }
  }

  async function cancelOrder(order: AdminOrder) {
    setBusy(order.id)
    try {
      await adminAct(password, { action: 'cancel', orderId: order.id })
      clearWarning(order.id)
      await refresh(password)
    } catch {
      refresh(password)
    } finally {
      setBusy(null)
    }
  }

  if (!password) {
    return (
      <Page>
        <Title kicker={SHOP_NAME}>Orders</Title>
        {load.state === 'error' && load.code === 'unauthorized' && (
          <div className="mb-4">
            <Notice tone="error">That password was not right.</Notice>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            signIn()
          }}
          className="space-y-4"
        >
          <Field label="Admin password">
            <input className={inputClass} type="password" autoComplete="current-password" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
          </Field>
          <Button type="submit" disabled={!typed.trim()}>
            Open orders
          </Button>
        </form>
      </Page>
    )
  }

  if (load.state === 'error') {
    return (
      <Page width="max-w-2xl">
        <Title kicker={SHOP_NAME}>Orders</Title>
        <Notice tone="error">
          {load.code === 'admin_not_configured'
            ? 'No admin password is set yet. Add ADMIN_PASSWORD in Netlify and redeploy.'
            : 'Could not load orders. Check your connection and try again.'}
        </Notice>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={() => refresh(password)}>
            Try again
          </Button>
          <Button variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </Page>
    )
  }

  if (load.state !== 'ready') {
    return (
      <Page width="max-w-2xl">
        <Spinner label="Loading orders…" />
      </Page>
    )
  }

  const upcoming = load.days.filter((d) => d.date >= load.today)
  const past = load.days.filter((d) => d.date < load.today && d.orders.length > 0).reverse()
  const shown = showPast ? past : upcoming

  return (
    <Page width="max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-3">
        <Title kicker={SHOP_NAME} sub={`Today is ${formatYmd(load.today, { weekday: 'long', month: 'long', day: 'numeric' })}.`}>
          Orders
        </Title>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" onClick={() => refresh(password)} aria-label="Refresh">
            ↻
          </Button>
          <Button variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </div>

      <div className="mb-5 flex gap-2">
        <Button variant={showPast ? 'secondary' : 'primary'} className="px-4" onClick={() => setShowPast(false)}>
          Upcoming
        </Button>
        <Button variant={showPast ? 'primary' : 'secondary'} className="px-4" onClick={() => setShowPast(true)}>
          Past ({past.length})
        </Button>
      </div>

      {shown.length === 0 && <Notice tone="info">{showPast ? 'No past pickup days with orders yet.' : 'No upcoming pickup days.'}</Notice>}

      <div className="space-y-4">
        {shown.map((day) => (
          <DayCard
            key={day.date}
            day={day}
            today={load.today}
            now={load.now}
            busy={busy}
            overCapacity={overCapacity}
            onBlock={() => toggleBlock(day)}
            onPicked={togglePicked}
            onMarkPaid={markPaid}
            onCancel={cancelOrder}
          />
        ))}
      </div>
    </Page>
  )
}

function DayCard({
  day,
  today,
  now,
  busy,
  overCapacity,
  onBlock,
  onPicked,
  onMarkPaid,
  onCancel,
}: {
  day: AdminDay
  today: string
  now: number
  busy: string | null
  overCapacity: Record<string, Qty>
  onBlock: () => void
  onPicked: (o: AdminOrder) => void
  onMarkPaid: (o: AdminOrder, force?: boolean) => void
  onCancel: (o: AdminOrder) => void
}) {
  const isToday = day.date === today
  const closed = Date.parse(day.cutoffAt) <= now
  const nothing = PRODUCTS.every((p) => day.toBake[p.id] === 0)
  return (
    <section className={`rounded-2xl border bg-white ${isToday ? 'border-crust' : 'border-line'}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="font-display text-[20px] font-semibold text-cocoa">
            {formatYmd(day.date, { weekday: 'long', month: 'short', day: 'numeric' })}
            {isToday && <span className="ml-2 rounded-full bg-crust px-2 py-0.5 align-middle text-[11px] font-bold uppercase tracking-wide text-cream">Today</span>}
            {day.blocked && <span className="ml-2 rounded-full bg-berry/10 px-2 py-0.5 align-middle text-[11px] font-bold uppercase tracking-wide text-berry">Blocked</span>}
          </h2>
          <p className="mt-0.5 text-[13px] text-cocoa-soft">
            {closed ? 'Orders closed' : `Orders close ${formatInstant(Date.parse(day.cutoffAt), TIMEZONE)}`}
            {' · '}
            {PRODUCTS.map((p) => `${day.remaining[p.id]} ${p.name.toLowerCase()} left`).join(', ')}
          </p>
        </div>
        <Button variant={day.blocked ? 'secondary' : 'danger'} className="px-3 text-[13px]" disabled={busy === day.date} onClick={onBlock}>
          {day.blocked ? 'Unblock date' : 'Block date'}
        </Button>
      </header>

      <div className="px-4 py-3">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-cocoa-soft">To bake</p>
        <p className="font-display text-[22px] font-semibold text-cocoa">{nothing ? 'Nothing yet' : describeQty(day.toBake)}</p>
        {day.blocked && day.orders.length > 0 && <p className="mt-1 text-[13px] text-berry">Blocked, but these orders already hold this date — they still expect their bread or a refund.</p>}
      </div>

      {day.orders.length > 0 && (
        <ul className="divide-y divide-line border-t border-line">
          {day.orders.map((o) =>
            o.status === 'paid' ? (
              <PaidRow key={o.id} order={o} busy={busy === o.id} onPicked={onPicked} />
            ) : (
              <PendingRow key={o.id} order={o} busy={busy === o.id} warning={overCapacity[o.id]} onMarkPaid={onMarkPaid} onCancel={onCancel} />
            ),
          )}
        </ul>
      )}
    </section>
  )
}

function PaidRow({ order: o, busy, onPicked }: { order: AdminOrder; busy: boolean; onPicked: (o: AdminOrder) => void }) {
  return (
    <li className={`flex items-start gap-3 px-4 py-3 ${o.pickedUpAt ? 'opacity-55' : ''}`}>
      <input type="checkbox" className="mt-1 size-5 shrink-0 accent-sage" checked={!!o.pickedUpAt} disabled={busy} onChange={() => onPicked(o)} aria-label={`${o.name} picked up`} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-cocoa">
          {o.name} <span className="ml-1 font-mono text-[12px] font-medium text-cocoa-soft">{o.shortId}</span>
        </p>
        <p className="text-[14px] text-cocoa">{describeQty(o.qty)}</p>
        <a className="text-[14px] text-crust-dark underline-offset-2 hover:underline" href={`tel:${o.phone}`}>
          {formatPhone(o.phone)}
        </a>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[15px] font-semibold text-cocoa">{formatMoney(o.amountCents)}</p>
        <p className="text-[12px] font-semibold uppercase tracking-wide text-sage">paid</p>
        {o.pickedUpAt && <p className="text-[11px] text-cocoa-soft">picked up</p>}
      </div>
    </li>
  )
}

/** Reserved and awaiting her Zelle — or lapsed / cancelled, still confirmable if the money did arrive. */
function PendingRow({
  order: o,
  busy,
  warning,
  onMarkPaid,
  onCancel,
}: {
  order: AdminOrder
  busy: boolean
  warning: Qty | undefined
  onMarkPaid: (o: AdminOrder, force?: boolean) => void
  onCancel: (o: AdminOrder) => void
}) {
  const live = o.status === 'reserved'
  const label = live ? 'awaiting zelle' : o.status === 'cancelled' ? 'cancelled' : 'hold lapsed'
  return (
    <li className={`px-4 py-3 ${live ? '' : 'opacity-70'}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 size-5 shrink-0 rounded-full ${live ? 'bg-amber-400' : 'bg-line'}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-cocoa">
            {o.name} <span className="ml-1 font-mono text-[12px] font-medium text-cocoa-soft">{o.shortId}</span>
          </p>
          <p className="text-[14px] text-cocoa">{describeQty(o.qty)}</p>
          <a className="text-[14px] text-crust-dark underline-offset-2 hover:underline" href={`tel:${o.phone}`}>
            {formatPhone(o.phone)}
          </a>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-semibold text-cocoa">{formatMoney(o.amountCents)}</p>
          <p className={`text-[12px] font-semibold uppercase tracking-wide ${live ? 'text-amber-700' : 'text-cocoa-soft'}`}>{label}</p>
        </div>
      </div>
      {!live && <p className="mt-1 text-[12px] text-cocoa-soft">Its bread went back into the pool. Mark paid only if her Zelle did arrive.</p>}
      {warning ? (
        <div className="mt-2 rounded-xl bg-berry/10 p-3">
          <p className="text-[13px] text-berry">
            This would exceed capacity — only {PRODUCTS.map((p) => `${warning[p.id]} ${p.name.toLowerCase()}`).join(', ')} left. Confirm anyway?
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="danger" className="px-3 text-[13px]" disabled={busy} onClick={() => onMarkPaid(o, true)}>
              Confirm anyway
            </Button>
            <Button variant="ghost" className="px-3 text-[13px]" disabled={busy} onClick={() => onCancel(o)}>
              Cancel order
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <Button className="px-3 text-[13px]" disabled={busy} onClick={() => onMarkPaid(o)}>
            Mark paid
          </Button>
          {live && (
            <Button variant="ghost" className="px-3 text-[13px]" disabled={busy} onClick={() => onCancel(o)}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </li>
  )
}
