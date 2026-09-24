import { useCallback, useEffect, useState } from 'react'
import { PRODUCTS, SHOP_NAME, TIMEZONE, formatMoney } from '../../../shared/config.ts'
import type { AdminBlockResult, AdminDay, AdminOrder, AdminResponse, AdminSession, Qty } from '../../../shared/types.ts'
import { addDays, formatYmd, ymdInZone } from '../../../shared/zoned.ts'
import { ApiError, adminAct, adminList } from '../../lib/api.ts'
import { describeQty } from '../../lib/format.ts'
import { Button, Notice, Page, Spinner, Title } from '../ui.tsx'
import DayView, { PrintSheet } from './DayView.tsx'
import GoLive from './GoLive.tsx'
import type { OrderActions } from './OrderCard.tsx'
import { clearSession, loadSession, saveSession } from './session.ts'
import Share from './Share.tsx'
import { BlockSheet, CancelPaidSheet } from './Sheets.tsx'
import SignIn from './SignIn.tsx'

const EXCEPTION_COPY: Record<string, string> = {
  amount_mismatch: 'Stripe reports a different amount than this order. Stock is held until you decide.',
  currency_mismatch: 'Stripe reports a payment in another currency.',
  order_mismatch: 'The Stripe payment does not reference this order.',
  mode_mismatch: 'The Stripe session was not a one-off payment.',
  livemode_mismatch: 'A test-mode payment reached a live deploy, or the reverse.',
  paid_after_release: 'This payment landed after the bread had been released — it was taken again, over capacity if needed.',
  duplicate_payment: 'A card payment arrived for an order already marked paid another way. A refund is probably due.',
  expire_uncertain: 'Stripe would not confirm this abandoned session is dead. The bread stays held; try again later.',
  session_unrecoverable: 'This customer never got a payment page (Stripe could not be reached) and the hold is past its time. Nothing at Stripe can pay it: Cancel it to free the bread, or wait for the next automatic try.',
}

/** "3 min ago", "2 h ago", "never". */
function ago(iso: string | null, now: number): string {
  if (!iso) return 'never'
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 48) return `${h} h ago`
  return `${Math.round(h / 24)} days ago`
}

type Load =
  | { state: 'loading' }
  | { state: 'error'; code: string }
  | { state: 'ready'; days: AdminDay[]; today: string; now: number; nextPickupDate: string; ops: AdminResponse['ops'] }

type Sheet = { kind: 'block'; date: string } | { kind: 'cancelPaid'; orderId: string } | null

/** Her page: one day at a time, the next pickup first. */
export default function Admin() {
  const [session, setSession] = useState<AdminSession | null>(() => loadSession())
  const [signInReason, setSignInReason] = useState<'expired' | 'signed_out' | null>(null)
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [selected, setSelected] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'info' | 'warn' | 'ok' | 'error'; text: string } | null>(null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [view, setView] = useState<'orders' | 'golive' | 'share'>('orders')
  /** orderId → the remaining counts a markPaid was refused over, so she can choose to force it. */
  const [overCapacity, setOverCapacity] = useState<Record<string, Qty>>({})

  const token = session?.token ?? null

  const endSession = useCallback((reason: 'expired' | 'signed_out') => {
    clearSession()
    setSession(null)
    setSignInReason(reason)
    setSheet(null)
  }, [])

  /** Only ever sets state after the network round-trip. A dead session sends her back to the door. */
  const fetchDays = useCallback(
    async (tok: string) => {
      try {
        const today = ymdInZone(Date.now(), TIMEZONE)
        const res = await adminList(tok, { from: addDays(today, -28), to: addDays(today, 42) })
        const serverNow = Date.parse(res.now)
        setLoad({ state: 'ready', days: res.days, today: res.today, now: serverNow, nextPickupDate: res.nextPickupDate, ops: res.ops })
        setSelected((cur) => cur ?? res.nextPickupDate)
      } catch (err) {
        const code = err instanceof ApiError ? err.code : 'offline'
        if (code === 'unauthorized' || code === 'session_expired') {
          endSession('expired')
          return
        }
        setLoad({ state: 'error', code })
      }
    },
    [endSession],
  )

  const refresh = useCallback(() => (token ? fetchDays(token) : Promise.resolve()), [token, fetchDays])

  useEffect(() => {
    if (token) fetchDays(token)
  }, [token, fetchDays])

  function patchDay(day: AdminDay) {
    setLoad((l) => (l.state === 'ready' ? { ...l, days: l.days.map((d) => (d.date === day.date ? day : d)) } : l))
  }
  function patchOrder(order: AdminOrder) {
    setLoad((l) =>
      l.state === 'ready' ? { ...l, days: l.days.map((d) => (d.date === order.date ? { ...d, orders: d.orders.map((o) => (o.id === order.id ? order : o)) } : d)) } : l,
    )
  }

  /** Every action goes through here: one busy marker, one place a dead session is caught. */
  async function run<T>(key: string, fn: (tok: string) => Promise<T>, after?: (result: T) => void | Promise<void>): Promise<void> {
    if (!token) return
    setBusy(key)
    setNotice(null)
    try {
      const result = await fn(token)
      if (after) await after(result)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'offline'
      if (code === 'unauthorized' || code === 'session_expired') return endSession('expired')
      if (code === 'would_exceed_capacity' && err instanceof ApiError) {
        setOverCapacity((m) => ({ ...m, [key]: err.detail.remaining as Qty }))
        return
      }
      setNotice({ tone: code === 'offline' ? 'error' : 'warn', text: explain(code) })
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  function explain(code: string): string {
    switch (code) {
      case 'already_paid':
        return 'That customer had already paid by card — the order is now confirmed as paid.'
      case 'payment_uncertain':
        return 'Stripe could not be reached or gave an unclear answer, so nothing was changed. Try again in a minute.'
      case 'payments_not_configured':
        return 'Stripe is not configured on this deploy, so card orders cannot be settled from here.'
      case 'not_paid':
        return 'That order is not paid, so it cannot be picked up or cancelled this way.'
      case 'already_cancelled':
        return 'That order was already cancelled.'
      case 'busy':
        return 'Someone was ordering that date at the same moment. Nothing changed — try again.'
      case 'offline':
        return 'No connection. Nothing changed. Check your signal and try again.'
      default:
        return 'That did not go through. Nothing changed — try again.'
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

  const actions: OrderActions = {
    onPicked: (o, pickedUp) => run(o.id, (t) => adminAct(t, { action: 'pickedUp', orderId: o.id, pickedUp }), (order) => patchOrder(order)),
    onMarkPaid: (o, force = false) =>
      run(
        o.id,
        (t) => adminAct(t, { action: 'markPaid', orderId: o.id, force }),
        async () => {
          clearWarning(o.id)
          await refresh()
        },
      ),
    onCancelReservation: (o) =>
      run(
        o.id,
        (t) => adminAct(t, { action: 'cancel', orderId: o.id }),
        async () => {
          clearWarning(o.id)
          await refresh()
        },
      ),
    onCancelPaid: (o) => setSheet({ kind: 'cancelPaid', orderId: o.id }),
    onCheckRefund: (o) =>
      run(o.id, (t) => adminAct(t, { action: 'syncRefund', orderId: o.id }), (order) => {
        patchOrder(order)
        setNotice({ tone: 'ok', text: order.refundedCents > 0 || order.refundPendingCents > 0 ? `Stripe shows ${formatMoney(order.refundedCents)} refunded${order.refundPendingCents > 0 ? ` and ${formatMoney(order.refundPendingCents)} pending` : ''}.` : 'Stripe shows no refund on this payment.' })
      }),
  }

  function confirmCancelPaid(order: AdminOrder, restock: boolean, note: string) {
    setSheet(null)
    run(
      order.id,
      (t) => adminAct(t, { action: 'cancelPaid', orderId: order.id, restock, note: note || undefined }),
      async ({ resellable }) => {
        setNotice({
          tone: 'ok',
          text: restock
            ? resellable
              ? `${order.name}'s bread is back on sale.`
              : `${order.name}'s order is cancelled and recorded as restocked — but this date is blocked or closed, so no one can buy it.`
            : `${order.name}'s order is cancelled. The bread stays off sale.`,
        })
        await refresh()
      },
    )
  }

  function confirmBlock(day: AdminDay, reason: string) {
    setSheet(null)
    run(
      day.date,
      (t) => adminAct(t, { action: 'block', date: day.date, reason: reason || undefined }),
      ({ day: updated, affected }: AdminBlockResult) => {
        patchDay(updated)
        const parts = [`${formatYmd(day.date, { weekday: 'long', month: 'short', day: 'numeric' })} is blocked.`]
        if (affected.owed.length) parts.push(`${affected.owed.length} paid customer${affected.owed.length === 1 ? '' : 's'} still get their bread.`)
        if (affected.holds.length) parts.push(`${affected.holds.length} checkout${affected.holds.length === 1 ? '' : 's'} in progress kept their hold.`)
        setNotice({ tone: 'ok', text: parts.join(' ') })
      },
    )
  }

  function unblock(day: AdminDay) {
    run(day.date, (t) => adminAct(t, { action: 'unblock', date: day.date }), ({ day: updated }: AdminBlockResult) => {
      patchDay(updated)
      setNotice({ tone: 'ok', text: `${formatYmd(day.date, { weekday: 'long', month: 'short', day: 'numeric' })} is open for orders again.` })
    })
  }

  function resolveException(order: AdminOrder, exceptionId: number) {
    run(order.id, (t) => adminAct(t, { action: 'resolveException', orderId: order.id, exceptionId }), () => refresh())
  }

  // ── Screens ──────────────────────────────────────────────────────────────

  if (!session) {
    return (
      <SignIn
        reason={signInReason}
        onSignedIn={(s) => {
          saveSession(s)
          setSignInReason(null)
          setLoad({ state: 'loading' })
          setSession(s)
        }}
      />
    )
  }

  if (load.state === 'error') {
    return (
      <Page width="max-w-2xl">
        <Title kicker={SHOP_NAME}>Orders</Title>
        <Notice tone="error">
          {load.code === 'admin_not_configured'
            ? 'No admin password is set on this site yet. Add ADMIN_PASSWORD in Netlify and redeploy.'
            : load.code === 'offline'
              ? 'No connection. Check your signal and try again.'
              : 'Could not load orders right now. Try again in a moment.'}
        </Notice>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={() => { setLoad({ state: 'loading' }); refresh() }}>
            Try again
          </Button>
          <Button variant="ghost" onClick={() => endSession('signed_out')}>
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

  if (view === 'golive' && token) {
    return (
      <GoLive
        token={token}
        ops={load.ops}
        onBack={() => {
          setView('orders')
          setLoad({ state: 'loading' })
          refresh()
        }}
        onSessionEnded={() => endSession('expired')}
      />
    )
  }

  if (view === 'share') return <Share onBack={() => setView('orders')} />

  const upcoming = load.days.filter((d) => d.date >= load.today)
  const past = load.days.filter((d) => d.date < load.today && d.orders.length > 0).reverse()
  const strip = showPast ? past : upcoming
  const day = load.days.find((d) => d.date === selected) ?? strip[0] ?? null
  const flagged = load.days.flatMap((d) => d.orders.filter((o) => o.exceptions.length > 0))
  const sheetOrder = sheet?.kind === 'cancelPaid' ? load.days.flatMap((d) => d.orders).find((o) => o.id === sheet.orderId) : undefined
  const sheetDay = sheet?.kind === 'block' ? load.days.find((d) => d.date === sheet.date) : undefined

  return (
    <>
      <Page width="max-w-2xl">
        <div className="no-print">
          <div className="mb-4 flex items-start justify-between gap-3">
            <Title kicker={SHOP_NAME} sub={`Today is ${formatYmd(load.today, { weekday: 'long', month: 'long', day: 'numeric' })}.`}>
              Orders
            </Title>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" onClick={() => { setLoad({ state: 'loading' }); refresh() }} aria-label="Refresh">
                ↻
              </Button>
              <Button variant="ghost" onClick={() => endSession('signed_out')}>
                Sign out
              </Button>
            </div>
          </div>

          {load.ops.livemode !== true && (
            <div className="mb-4">
              <Notice tone="warn">
                {load.ops.livemode === false
                  ? 'TEST MODE — Stripe is on its test keys. Orders here are practice orders and no real money moves. Card 4242 4242 4242 4242 pays.'
                  : 'Stripe is not configured on this site, so nobody can pay by card yet.'}
              </Notice>
            </div>
          )}
          <div className="mb-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setView('share')}>
              QR code &amp; link →
            </Button>
            {load.ops.mode !== 'live' && (
              <Button variant="secondary" onClick={() => setView('golive')}>
                Going live →
              </Button>
            )}
          </div>
          <p className="mb-3 text-[12px] text-cocoa-soft" title="The site checks abandoned card sessions with Stripe every half hour on its own; Stripe also sends the site a message about each payment, which is what normally frees held bread within the hour.">
            Automatic check ran {ago(load.ops.lastReconcileAt, load.now)} · last message from Stripe {ago(load.ops.lastWebhookAt, load.now)}
          </p>

          <div className="mb-3 flex gap-2">
            <Button variant={showPast ? 'secondary' : 'primary'} className="px-4" onClick={() => { setShowPast(false); setSelected(load.nextPickupDate) }}>
              Upcoming
            </Button>
            <Button variant={showPast ? 'primary' : 'secondary'} className="px-4" onClick={() => { setShowPast(true); setSelected(past[0]?.date ?? null) }}>
              Past ({past.length})
            </Button>
          </div>

          {strip.length > 0 && (
            <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label={showPast ? 'Past pickup days' : 'Upcoming pickup days'}>
              {strip.map((d) => {
                const on = day?.date === d.date
                const bake = PRODUCTS.map((p) => d.toBake[p.id]).reduce((a, b) => a + b, 0)
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setSelected(d.date)}
                    className={`min-w-[5.5rem] shrink-0 rounded-2xl border px-3 py-2 text-left transition-colors ${on ? 'border-crust bg-crust text-cream' : d.blocked ? 'border-berry/40 bg-berry/5 text-cocoa' : 'border-line bg-white text-cocoa'}`}
                  >
                    <span className={`block text-[11px] font-semibold uppercase tracking-wide ${on ? 'text-cream/80' : 'text-cocoa-soft'}`}>{formatYmd(d.date, { weekday: 'short' })}</span>
                    <span className="block text-[17px] font-semibold">{formatYmd(d.date, { month: 'short', day: 'numeric' })}</span>
                    <span className={`block text-[12px] ${on ? 'text-cream/90' : 'text-cocoa-soft'}`}>{d.blocked ? 'blocked' : bake ? `${bake} to bake` : d.activeCheckouts ? `${d.activeCheckouts} in checkout` : 'nothing yet'}</span>
                  </button>
                )
              })}
            </nav>
          )}

          {notice && (
            <div className="mb-4">
              <Notice tone={notice.tone}>{notice.text}</Notice>
            </div>
          )}

          {flagged.length > 0 && (
            <section className="mb-4 rounded-2xl border border-berry/40 bg-berry/5 p-4">
              <h2 className="text-[15px] font-semibold text-berry">Payments that need a look</h2>
              <ul className="mt-2 space-y-3">
                {flagged.map((o) => (
                  <li key={o.id} className="text-[14px] text-cocoa">
                    <p className="font-semibold">
                      {o.name} <span className="font-mono text-[12px] text-cocoa-soft">{o.shortId}</span> · {formatYmd(o.date)} · {describeQty(o.qty)} · {formatMoney(o.amountCents)}
                    </p>
                    {o.exceptions.map((x) => (
                      <div key={x.id} className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-[13px]">{EXCEPTION_COPY[x.kind] ?? x.kind}</span>
                        <Button variant="ghost" className="min-h-9 px-2 text-[12px]" disabled={busy === o.id} onClick={() => resolveException(o, x.id)}>
                          Mark resolved
                        </Button>
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] text-cocoa-soft">Check the payment in Stripe first. Refunds are done there, then show here.</p>
            </section>
          )}

          {!day && <Notice tone="info">{showPast ? 'No past pickup days with orders yet.' : 'No upcoming pickup days.'}</Notice>}
          {day && (
            <DayView
              day={day}
              today={load.today}
              now={load.now}
              busy={busy}
              overCapacity={overCapacity}
              actions={actions}
              onBlock={() => setSheet({ kind: 'block', date: day.date })}
              onUnblock={() => unblock(day)}
              onPrint={() => window.print()}
            />
          )}
        </div>
        {day && <PrintSheet day={day} />}
      </Page>

      {sheetDay && <BlockSheet day={sheetDay} busy={busy === sheetDay.date} onBlock={(reason) => confirmBlock(sheetDay, reason)} onClose={() => setSheet(null)} />}
      {sheetOrder && <CancelPaidSheet order={sheetOrder} busy={busy === sheetOrder.id} onConfirm={(restock, note) => confirmCancelPaid(sheetOrder, restock, note)} onClose={() => setSheet(null)} />}
    </>
  )
}
