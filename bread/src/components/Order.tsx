import { useEffect, useMemo, useRef, useState } from 'react'
import { PICKUP_PLACE, PRODUCTS, SHOP_NAME, TIMEZONE, formatMoney, totalCents, type ProductId } from '../../shared/config.ts'
import { normalisePhone } from '../../shared/phone.ts'
import type { DayAvailability, Qty } from '../../shared/types.ts'
import { zeroQty } from '../../shared/types.ts'
import { addDays, formatInstant, formatYmd, weekdayOf, ymdInZone } from '../../shared/zoned.ts'
import { ApiError, getAvailability, startCheckout } from '../lib/api.ts'
import { PICKUP_LINE, PICKUP_PREFERRED } from '../lib/format.ts'
import { Button, Field, Notice, Page, Section, Spinner, Title, inputClass } from './ui.tsx'

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; days: DayAvailability[]; today: string }

const ERRORS: Record<string, string> = {
  sold_out: 'Sorry — that just sold out for the date you picked. The list below is fresh; choose another date.',
  blocked: 'That date is no longer available. Please pick another.',
  closed: 'Orders for that date have closed. Please pick another.',
  offline: 'Could not reach the server. Check your connection and try again.',
  busy: 'Very busy right now — please try again in a moment.',
}

function weekLabel(date: string, today: string): string {
  const monday = (d: string) => addDays(d, -((weekdayOf(d) + 6) % 7))
  const thisMonday = monday(today)
  const thatMonday = monday(date)
  if (thatMonday === thisMonday) return 'This week'
  if (thatMonday === addDays(thisMonday, 7)) return 'Next week'
  return `Week of ${formatYmd(thatMonday, { month: 'short', day: 'numeric' })}`
}

export default function Order() {
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [qty, setQty] = useState<Qty>(zeroQty)
  const [date, setDate] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ tone: 'info' | 'error'; text: string } | null>(null)

  // One key per distinct attempt: a retried request replays the same
  // reservation instead of making a second one, but editing the cart makes
  // it a new attempt with a new key.
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null)
  function keyFor(fingerprint: string): string {
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() }
    return attempt.current.key
  }

  async function refresh(): Promise<DayAvailability[] | null> {
    try {
      const res = await getAvailability()
      setLoad({ state: 'ready', days: res.days, today: ymdInZone(Date.parse(res.now), TIMEZONE) })
      return res.days
    } catch {
      setLoad({ state: 'error' })
      return null
    }
  }

  useEffect(() => {
    refresh()
    // Counts go stale while the tab is in the background; re-read them when
    // the customer comes back to it.
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [])

  const days = load.state === 'ready' ? load.days : []
  // A chosen date that has since closed or been blocked is no choice at all.
  const selected = days.find((d) => d.date === date && d.open && !d.blocked) ?? null

  const cap = (id: ProductId): number => (selected ? selected.remaining[id] : PRODUCTS.find((p) => p.id === id)!.capacityPerDay)

  function choose(d: DayAvailability) {
    setDate(d.date)
    const clamped = { ...qty }
    let clampedAny = false
    for (const p of PRODUCTS) {
      if (clamped[p.id] > d.remaining[p.id]) {
        clamped[p.id] = d.remaining[p.id]
        clampedAny = true
      }
    }
    if (clampedAny) {
      setQty(clamped)
      setMessage({ tone: 'info', text: `Only ${PRODUCTS.filter((p) => qty[p.id] > d.remaining[p.id]).map((p) => `${d.remaining[p.id]} ${p.name.toLowerCase()}`).join(' and ')} left for ${formatYmd(d.date)} — your order was adjusted.` })
    } else if (message?.tone === 'info') {
      setMessage(null)
    }
  }

  const groups = useMemo(() => {
    if (load.state !== 'ready') return []
    const out: { label: string; days: DayAvailability[] }[] = []
    for (const d of load.days) {
      const label = weekLabel(d.date, load.today)
      const last = out[out.length - 1]
      if (last?.label === label) last.days.push(d)
      else out.push({ label, days: [d] })
    }
    return out
  }, [load])

  const total = totalCents(qty)
  const anyBread = PRODUCTS.some((p) => qty[p.id] > 0)
  const phoneOk = normalisePhone(phone) !== null
  const nameOk = name.trim().length > 0
  const missing = !anyBread ? 'Choose your bread to start' : !selected ? 'Now pick a pickup date' : !nameOk || !phoneOk ? 'Add your name and phone number' : null

  async function reserve() {
    setTouched(true)
    if (missing || !selected) return
    setSubmitting(true)
    setMessage(null)
    // Last look before committing: if the date sold down while the customer
    // was deciding, trim the cart and say so instead of failing at the server.
    const fresh = await refresh()
    const day = fresh?.find((d) => d.date === selected.date)
    if (day && (!day.open || day.blocked || PRODUCTS.some((p) => qty[p.id] > day.remaining[p.id]))) {
      choose(day)
      if (!day.open || day.blocked) setMessage({ tone: 'error', text: ERRORS[day.blocked ? 'blocked' : 'closed'] })
      setSubmitting(false)
      return
    }
    try {
      const checkoutKey = keyFor(JSON.stringify({ date: selected.date, qty, name: name.trim(), phone }))
      const { orderId } = await startCheckout({ date: selected.date, qty, name: name.trim(), phone, checkoutKey })
      window.location.assign(`/thanks?order=${orderId}`)
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'offline'
      setMessage({ tone: 'error', text: ERRORS[code] ?? 'Something went wrong. Please try again.' })
      setSubmitting(false)
      if (code === 'sold_out' || code === 'blocked' || code === 'closed') refresh()
    }
  }

  return (
    <Page>
      <Title kicker="Pre-order · pay by Zelle · pick up" sub={<>Baked to order. Pick up {PICKUP_LINE} on Mondays, Wednesdays and Thursdays — {PICKUP_PREFERRED}.</>}>
        {SHOP_NAME}
      </Title>

      {message && (
        <div className="mb-5">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}

      <Section step={1} title="Choose your bread">
        <div className="space-y-3">
          {PRODUCTS.map((p) => {
            const max = cap(p.id)
            const soldOut = selected !== null && max === 0
            return (
              <div key={p.id} className={`flex items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 ${soldOut ? 'opacity-60' : ''}`}>
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold text-cocoa">{p.name}</p>
                  <p className="text-[13px] text-cocoa-soft">
                    {p.blurb} · <span className="font-medium text-cocoa">{formatMoney(p.priceCents)}</span>
                  </p>
                  {soldOut ? (
                    <p className="mt-1 text-[12px] font-bold uppercase tracking-wide text-berry">Sold out for {formatYmd(selected.date)}</p>
                  ) : selected && max < p.capacityPerDay ? (
                    <p className="mt-1 text-[12px] font-medium text-crust-dark">Only {max} left for {formatYmd(selected.date)}</p>
                  ) : null}
                </div>
                <Stepper value={qty[p.id]} max={max} label={p.name} onChange={(n) => setQty({ ...qty, [p.id]: n })} />
              </div>
            )
          })}
        </div>
      </Section>

      <Section step={2} title="Pick up on" aside={load.state === 'ready' ? PICKUP_PLACE : undefined}>
        {load.state === 'loading' && <Spinner label="Checking what's available…" />}
        {load.state === 'error' && (
          <Notice tone="error">
            Could not load the pickup dates.{' '}
            <button type="button" className="font-semibold underline" onClick={refresh}>
              Try again
            </button>
          </Notice>
        )}
        {load.state === 'ready' && (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.label}>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-cocoa-soft">{g.label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {g.days.map((d) => (
                    <DateChip key={d.date} day={d} selected={d.date === date} onSelect={() => choose(d)} />
                  ))}
                </div>
              </div>
            ))}
            {selected && (
              <p className="text-[13px] text-cocoa-soft">
                Orders for {formatYmd(selected.date)} close {formatInstant(Date.parse(selected.cutoffAt), TIMEZONE)}.
              </p>
            )}
          </div>
        )}
      </Section>

      <Section step={3} title="Your details">
        <div className="space-y-4">
          <Field label="Name">
            <input className={inputClass} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="So she knows whose bread this is" maxLength={80} aria-invalid={touched && !nameOk} />
          </Field>
          <Field label="Phone" hint={touched && phone && !phoneOk ? 'Please enter a 10-digit US number.' : 'In case there is a question about your order.'}>
            <input className={inputClass} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(612) 555-0199" aria-invalid={touched && !phoneOk} />
          </Field>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-cocoa-soft">
          Reserving holds your bread. You'll get her Zelle details on the next page — your bread is confirmed once
          she's received your payment.
        </p>
      </Section>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-cream/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-md items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] text-cocoa-soft">{missing ?? `${describe(qty)} · ${formatYmd(selected!.date)}`}</p>
            <p className="font-display text-[22px] font-semibold leading-tight text-cocoa">{formatMoney(total)}</p>
          </div>
          <Button onClick={reserve} disabled={submitting || load.state !== 'ready'} className="shrink-0 px-6">
            {submitting ? 'Reserving…' : total > 0 ? `Reserve — ${formatMoney(total)}` : 'Reserve'}
          </Button>
        </div>
      </div>
    </Page>
  )
}

function describe(qty: Qty): string {
  return PRODUCTS.filter((p) => qty[p.id] > 0)
    .map((p) => `${qty[p.id]} ${p.name.toLowerCase()}`)
    .join(' + ')
}

function Stepper({ value, max, label, onChange }: { value: number; max: number; label: string; onChange: (n: number) => void }) {
  const round = 'grid size-11 place-items-center rounded-full text-[20px] font-semibold transition-colors disabled:opacity-30'
  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`${label} quantity`}>
      <button type="button" className={`${round} bg-cream-2 text-cocoa hover:bg-line`} onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0} aria-label={`One fewer ${label}`}>
        −
      </button>
      <span className="w-7 text-center text-[18px] font-semibold tabular-nums text-cocoa" aria-live="polite">
        {value}
      </span>
      <button type="button" className={`${round} bg-cocoa text-cream hover:bg-cocoa-soft`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`One more ${label}`}>
        +
      </button>
    </div>
  )
}

function DateChip({ day, selected, onSelect }: { day: DayAvailability; selected: boolean; onSelect: () => void }) {
  const soldOut = PRODUCTS.every((p) => day.remaining[p.id] === 0)
  const state = day.blocked ? 'Unavailable' : !day.open ? 'Closed' : soldOut ? 'Sold out' : null
  const disabled = state !== null
  const [weekday, rest] = formatYmd(day.date).split(', ')
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`min-h-[76px] rounded-2xl border px-2 py-2.5 text-left transition-colors ${
        selected ? 'border-crust bg-crust text-cream' : disabled ? 'border-line bg-cream-2 text-cocoa-soft' : 'border-line bg-white text-cocoa hover:border-crust'
      }`}
    >
      <span className="block text-[12px] font-semibold uppercase tracking-wide opacity-80">{weekday}</span>
      <span className="block text-[17px] font-semibold leading-tight">{rest}</span>
      <span className={`mt-1 block text-[11px] leading-tight ${selected ? 'text-cream/85' : disabled ? 'font-bold uppercase tracking-wide text-berry/80' : 'text-cocoa-soft'}`}>
        {state ?? PRODUCTS.map((p) => `${day.remaining[p.id]} ${p.id === 'banana' ? 'banana' : p.name.toLowerCase()}`).join(' · ')}
      </span>
    </button>
  )
}
