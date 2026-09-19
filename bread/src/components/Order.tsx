import { useEffect, useMemo, useRef, useState } from 'react'
import { PICKUP_PLACE, PICKUP_PLACE_NOTE, PICKUP_PLACE_WHERE, PRODUCTS, SHOP_NAME, TAGLINE, TIMEZONE, formatMoney, type ProductId } from '../../shared/config.ts'
import { formatPhone, normalisePhone } from '../../shared/phone.ts'
import type { DayAvailability, PublicProduct, Qty } from '../../shared/types.ts'
import { addDays, formatYmd, weekdayOf, ymdInZone } from '../../shared/zoned.ts'
import { ApiError, cancelCheckout, getAvailability, startCheckout } from '../lib/api.ts'
import { ERROR_COPY, dayState, daysThatFit, deadlineCopy, fit, hasBread, linesCopy, longDate, productState, reduceToFit, selectable, shortCopy, type DayState, type Short } from '../lib/cart.ts'
import { loadDraft, saveDraft } from '../lib/draft.ts'
import { PICKUP_PREFERRED, PICKUP_WINDOW } from '../lib/format.ts'
import { ProductArt } from './art.tsx'
import { Button, Field, Notice, Page, Section, Spinner, Title, inputClass } from './ui.tsx'

type Load = { state: 'loading' } | { state: 'error'; code: string } | { state: 'ready'; days: DayAvailability[]; products: PublicProduct[]; today: string; at: number }
type Step = 'bread' | 'day' | 'details'
type FitIssue = { date: string; short: Short[] }
/** What became of the checkout the customer just backed out of — the server's word, never assumed. */
type Canceled = { id: string; state: 'checking' | 'released' | 'unsure' }

/** Stripe sends a customer who backs out of its page to /?canceled=<order id>. */
function readCanceled(): string | null {
  const id = new URLSearchParams(window.location.search).get('canceled')
  return id && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : null
}

/** Until the server has answered, the prices and capacities are the configured ones; after, the server's. */
const CONFIGURED: PublicProduct[] = PRODUCTS.map((p) => ({ id: p.id, name: p.name, blurb: p.blurb, priceCents: p.priceCents, capacityPerDay: p.capacityPerDay }))
const imageOf = (id: ProductId) => PRODUCTS.find((p) => p.id === id)?.image

function weekLabel(date: string, today: string): string {
  const monday = (d: string) => addDays(d, -((weekdayOf(d) + 6) % 7))
  const thisMonday = monday(today)
  const thatMonday = monday(date)
  if (thatMonday === thisMonday) return 'This week'
  if (thatMonday === addDays(thisMonday, 7)) return 'Next week'
  return `Week of ${formatYmd(thatMonday, { month: 'short', day: 'numeric' })}`
}

/** Digits as the customer types them, shown the way a US number is written. */
function prettyPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').replace(/^1(?=\d{10})/, '').slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

const NO_DAYS: DayAvailability[] = []

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export default function Order() {
  const [canceled] = useState(readCanceled)
  const [draft] = useState(loadDraft)
  const [load, setLoad] = useState<Load>({ state: 'loading' })
  const [qty, setQty] = useState<Qty>(draft.qty)
  const [date, setDate] = useState<string | null>(draft.date)
  const [name, setName] = useState(draft.name)
  const [phone, setPhone] = useState('')
  const [touched, setTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fitIssue, setFitIssue] = useState<FitIssue | null>(null)
  const [notice, setNotice] = useState<{ tone: 'info' | 'error' | 'warn'; text: string; alert?: boolean } | null>(null)
  const [cancelled, setCancelled] = useState<Canceled | null>(canceled ? { id: canceled, state: 'checking' } : null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [fallbackToday] = useState(() => ymdInZone(Date.now(), TIMEZONE))
  const inFlight = useRef(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)

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
      const at = Date.now()
      setNowMs(at)
      setLoad({ state: 'ready', days: res.days, products: res.products, today: ymdInZone(Date.parse(res.now), TIMEZONE), at })
      return res.days
    } catch (err) {
      // No counts are shown from a failed request: nothing is invented.
      setLoad({ state: 'error', code: err instanceof ApiError ? err.code : 'offline' })
      return null
    }
  }

  useEffect(() => {
    document.title = `${SHOP_NAME} — pre-order for pickup`
    if (canceled) {
      window.history.replaceState(null, '', '/')
      // Backing out is not proof the payment cannot still land: the server
      // ends the session at Stripe and releases only on Stripe's word — and
      // if the payment had in fact gone through first, the customer is
      // taken to their confirmed order rather than told nothing was paid.
      cancelCheckout(canceled)
        .then(({ state }) => {
          if (state === 'paid') {
            window.location.replace(`/thanks?order=${canceled}`)
            return
          }
          setCancelled({ id: canceled, state: state === 'released' || state === 'not_reserved' || state === 'not_found' ? 'released' : 'unsure' })
        })
        .catch(() => setCancelled({ id: canceled, state: 'unsure' }))
        .finally(refresh)
    } else {
      refresh()
    }
    // Counts go stale while the tab is in the background; re-read them when
    // the customer comes back to it, and keep the "updated … ago" honest.
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.clearInterval(timer)
    }
  }, [canceled])

  // Whatever they have chosen survives a trip to Stripe and Back. Never the phone.
  useEffect(() => {
    saveDraft({ qty, date, name })
  }, [qty, date, name])

  const days = load.state === 'ready' ? load.days : NO_DAYS
  const products = load.state === 'ready' ? load.products : CONFIGURED
  const today = load.state === 'ready' ? load.today : fallbackToday
  const selectedDay = days.find((d) => d.date === date) ?? null
  const selectedState: DayState | null = selectedDay ? dayState(selectedDay, qty) : null
  const daySelectable = selectedState !== null && selectable(selectedState)
  const cartFit = selectedDay && daySelectable ? fit(selectedDay, qty) : null
  const cartFits = cartFit?.ok === true

  const bread = hasBread(qty)
  const nameOk = name.trim().length > 0
  const phoneOk = normalisePhone(phone) !== null
  // Prices are the server's: what it will charge is what the page shows.
  const total = products.reduce((sum, p) => sum + (qty[p.id] ?? 0) * p.priceCents, 0)
  const nextStep: Step | null = !bread ? 'bread' : !cartFits ? 'day' : !nameOk || !phoneOk ? 'details' : null
  const readyToPay = nextStep === null && load.state === 'ready' && !fitIssue && !submitting

  // A chosen day the cart no longer fits — after a refresh, or after the
  // server said so — is explained, never trimmed.
  useEffect(() => {
    if (!selectedDay || !bread) {
      setFitIssue(null)
      return
    }
    const f = fit(selectedDay, qty)
    setFitIssue(f.ok ? null : { date: selectedDay.date, short: f.short })
  }, [selectedDay, qty, bread])

  const groups = useMemo(() => {
    const out: { label: string; days: DayAvailability[] }[] = []
    for (const d of days) {
      const label = weekLabel(d.date, today)
      const last = out[out.length - 1]
      if (last?.label === label) last.days.push(d)
      else out.push({ label, days: [d] })
    }
    return out
  }, [days, today])

  const anyFit = bread ? daysThatFit(days, qty) : days
  const nearestSmaller = useMemo(() => {
    if (!bread || anyFit.length > 0) return []
    return days
      .filter((d) => selectable(dayState(d, { sourdough: 0, banana: 0 })))
      .map((d) => ({ day: d, reduced: reduceToFit(qty, d) }))
      .filter((x) => hasBread(x.reduced))
      .slice(0, 3)
  }, [bread, anyFit.length, days, qty])

  function chooseDay(d: DayAvailability) {
    setDate(d.date)
    setNotice((n) => (n?.tone === 'info' ? null : n))
    setCancelled((c) => (c?.state === 'released' ? null : c))
  }

  function setLine(id: ProductId, n: number) {
    setQty((q) => ({ ...q, [id]: n }))
  }

  function continueToNext() {
    setTouched(true)
    if (nextStep === 'bread') scrollTo('step-bread')
    else if (nextStep === 'day') scrollTo('step-day')
    else if (nextStep === 'details') {
      scrollTo('step-details')
      ;(nameOk ? phoneRef : nameRef).current?.focus({ preventScroll: true })
    }
  }

  async function reserve() {
    if (inFlight.current) return
    setTouched(true)
    if (!readyToPay || !selectedDay) return continueToNext()
    inFlight.current = true
    setSubmitting(true)
    setNotice(null)
    try {
      // Last look before committing: the counts may have moved while they decided.
      const fresh = await refresh()
      if (!fresh) {
        setNotice({ tone: 'error', text: ERROR_COPY.offline, alert: true })
        return
      }
      const day = fresh.find((d) => d.date === selectedDay.date)
      const state = day ? dayState(day, qty) : 'closed'
      if (!day || !selectable(state)) {
        setNotice({ tone: 'error', text: ERROR_COPY[state === 'blocked' ? 'blocked' : state === 'closed' ? 'closed' : 'sold_out'], alert: true })
        return
      }
      const f = fit(day, qty)
      if (!f.ok) {
        setFitIssue({ date: day.date, short: f.short })
        return
      }
      const checkoutKey = keyFor(JSON.stringify({ date: day.date, qty, name: name.trim(), phone }))
      const { orderId, url } = await startCheckout({ date: day.date, qty, name: name.trim(), phone, checkoutKey })
      // Stripe's hosted page takes the card; this site never sees it. The
      // draft stays so Back from Stripe lands them here with everything kept.
      window.location.assign(url ?? `/thanks?order=${orderId}`)
      return // leave the button disabled while the browser navigates
    } catch (err) {
      const code = err instanceof ApiError ? err.code : 'offline'
      if (code === 'sold_out' && err instanceof ApiError && err.detail.remaining) {
        // The server's count is fresher than ours: show it on the day, so the
        // explanation and the chip both tell the truth until the refresh lands.
        const remaining = err.detail.remaining as Qty
        setLoad((l) => (l.state === 'ready' ? { ...l, days: l.days.map((d) => (d.date === selectedDay.date ? { ...d, remaining } : d)) } : l))
        setNotice({ tone: 'warn', text: ERROR_COPY.sold_out, alert: true })
      } else {
        setNotice({ tone: 'error', text: ERROR_COPY[code] ?? ERROR_COPY.unavailable, alert: true })
      }
      if (['sold_out', 'blocked', 'closed', 'closing_soon', 'bad_date'].includes(code)) refresh()
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  const updatedAgo = load.state === 'ready' ? Math.max(0, Math.round((nowMs - load.at) / 60_000)) : null

  return (
    <Page width="max-w-lg">
      <a className="skip-link" href="#step-bread">
        Skip to ordering
      </a>
      <Title kicker="Pre-order · pay now · pick up" sub={TAGLINE}>
        {SHOP_NAME}
      </Title>
      <p className="-mt-3 mb-6 text-[14px] leading-relaxed text-cocoa-soft">
        Pickup {PICKUP_WINDOW} on Mondays, Wednesdays and Thursdays, {PICKUP_PREFERRED}, at {PICKUP_PLACE} — {PICKUP_PLACE_WHERE}. {PICKUP_PLACE_NOTE}
      </p>

      <div aria-live="polite">
        {cancelled && (
          <div className="mb-5">
            <Notice tone={cancelled.state === 'unsure' ? 'warn' : 'info'} role="status">
              {cancelled.state === 'checking' && 'You left the payment page. Checking with Stripe whether anything was paid…'}
              {cancelled.state === 'released' && 'No payment was made and your bread has been released. Your choices are still here — pay whenever you are ready.'}
              {cancelled.state === 'unsure' && (
                <>
                  You left the payment page, and Stripe could not be reached to confirm what happened. If you did pay, your order page will show it:{' '}
                  <a className="font-semibold underline underline-offset-2" href={`/thanks?order=${cancelled.id}`}>
                    check my order
                  </a>
                  . If not, nothing was charged and the bread is released once Stripe confirms.
                </>
              )}
            </Notice>
          </div>
        )}
        {notice && (
          <div className="mb-5">
            <Notice tone={notice.tone} role={notice.alert ? 'alert' : 'status'}>
              {notice.text}
            </Notice>
          </div>
        )}
      </div>

      {/* ── 1 ── */}
      <div id="step-bread" className="scroll-mt-4">
        <Section step={1} title="Choose your bread">
          <ul className="space-y-3">
            {products.map((p) => {
              const state = selectedDay && daySelectable ? productState(selectedDay, p.id, p.capacityPerDay) : null
              const free = selectedDay && daySelectable ? selectedDay.remaining[p.id] : p.capacityPerDay
              const max = Math.max(free, qty[p.id])
              const image = imageOf(p.id)
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
                  {image ? (
                    <img src={image} alt={p.name} className="size-20 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <ProductArt id={p.id} className="size-20 shrink-0 rounded-xl" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold text-cocoa">{p.name}</p>
                    <p className="text-[13px] text-cocoa-soft">{p.blurb}</p>
                    <p className="mt-0.5 text-[16px] font-semibold text-cocoa">{formatMoney(p.priceCents)}</p>
                    {state?.kind === 'sold_out' && <p className="mt-1 text-[12px] font-bold uppercase tracking-wide text-berry">Sold out for {formatYmd(selectedDay!.date)}</p>}
                    {state?.kind === 'held' && (
                      <p className="mt-1 text-[12px] font-medium text-crust-dark">
                        None free right now — {state.held} being paid for. Check back in an hour.
                      </p>
                    )}
                    {state?.kind === 'low' && (
                      <p className="mt-1 text-[12px] font-medium text-crust-dark">
                        Only {state.free} left for {formatYmd(selectedDay!.date)}
                      </p>
                    )}
                  </div>
                  <Stepper value={qty[p.id]} max={max} label={p.name} onChange={(n) => setLine(p.id, n)} />
                </li>
              )
            })}
          </ul>
          {touched && !bread && (
            <p className="mt-2 text-[13px] font-medium text-berry" role="alert">
              Choose at least one loaf to start.
            </p>
          )}
        </Section>
      </div>

      {/* ── 2 ── */}
      <div id="step-day" className="scroll-mt-4">
        <Section step={2} title="Pick a day" aside={PICKUP_PLACE}>
          {load.state === 'loading' && <Spinner label="Checking what's available…" />}
          {load.state === 'error' && (
            <Notice tone="error" role="alert">
              Couldn't check what's available{load.code === 'offline' ? ' — no connection' : ''}. No counts are shown until it works.{' '}
              <button type="button" className="font-semibold underline underline-offset-2" onClick={refresh}>
                Try again
              </button>
            </Notice>
          )}
          {load.state === 'ready' && (
            <div className="space-y-4">
              <div ref={gridRef} role="radiogroup" aria-label="Pickup day" onKeyDown={(e) => moveFocus(e, gridRef.current)} className="space-y-4">
                {groups.map((g) => (
                  <div key={g.label}>
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-cocoa-soft">{g.label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {g.days.map((d) => (
                        <DayChip key={d.date} day={d} qty={qty} today={today} selected={d.date === date} tabbable={d.date === date || (!date && d.date === anyFit[0]?.date)} onSelect={() => chooseDay(d)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div aria-live="polite">
                {fitIssue && selectedDay && (
                  <div className="rounded-2xl border border-crust/40 bg-crust/5 p-4">
                    <p className="text-[15px] font-semibold text-cocoa">{longDate(selectedDay.date, today)} can't take your whole order.</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-cocoa">
                      It has {shortCopy(fitIssue.short)}. Nothing in your order has been changed.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {hasBread(reduceToFit(qty, selectedDay)) && (
                        <Button
                          className="px-4"
                          onClick={() => {
                            setQty(reduceToFit(qty, selectedDay))
                            setNotice({ tone: 'info', text: `Your order is now ${linesCopy(reduceToFit(qty, selectedDay))} for ${longDate(selectedDay.date, today)}.` })
                          }}
                        >
                          Reduce to what fits
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        className="px-4"
                        onClick={() => {
                          setDate(null)
                          gridRef.current?.querySelector<HTMLElement>('[role=radio]:not([aria-disabled=true])')?.focus()
                        }}
                      >
                        Choose another day
                      </Button>
                    </div>
                  </div>
                )}
                {bread && !fitIssue && anyFit.length === 0 && days.length > 0 && (
                  <div className="rounded-2xl border border-crust/40 bg-crust/5 p-4">
                    <p className="text-[15px] font-semibold text-cocoa">No day can take {linesCopy(qty)} right now.</p>
                    {nearestSmaller.length > 0 ? (
                      <>
                        <p className="mt-1 text-[14px] text-cocoa">A smaller order would fit:</p>
                        <ul className="mt-2 space-y-2">
                          {nearestSmaller.map(({ day, reduced }) => (
                            <li key={day.date} className="flex flex-wrap items-center justify-between gap-2 text-[14px] text-cocoa">
                              <span>
                                <b>{formatYmd(day.date)}</b> — {linesCopy(reduced)}
                              </span>
                              <Button
                                variant="secondary"
                                className="min-h-10 px-3 text-[13px]"
                                onClick={() => {
                                  setQty(reduced)
                                  setDate(day.date)
                                }}
                              >
                                Take that
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="mt-1 text-[14px] text-cocoa">Everything in the next four weeks is spoken for. Please check back — held bread comes back when a payment is not completed.</p>
                    )}
                  </div>
                )}
                {selectedDay && daySelectable && !fitIssue && (
                  <p className="text-[14px] leading-relaxed text-cocoa">
                    <b>{longDate(selectedDay.date, today)}</b>, {PICKUP_WINDOW} ({PICKUP_PREFERRED}), at {PICKUP_PLACE}, {PICKUP_PLACE_WHERE}.
                    <br />
                    <span className="text-cocoa-soft">Order by {deadlineCopy(selectedDay.cutoffAt, today)}.</span>
                  </p>
                )}
                {selectedDay && !daySelectable && (
                  <Notice tone="warn" role="status">
                    {longDate(selectedDay.date, today)} is {selectedState === 'blocked' ? 'closed by the baker' : selectedState === 'closed' ? 'past its ordering deadline' : 'sold out'} now. Please pick another day.
                  </Notice>
                )}
              </div>

              <p className="text-[12px] text-cocoa-soft">
                Availability updated {updatedAgo === 0 ? 'just now' : `${updatedAgo} min ago`} ·{' '}
                <button type="button" className="font-semibold underline underline-offset-2" onClick={refresh}>
                  Refresh
                </button>
              </p>
            </div>
          )}
        </Section>
      </div>

      {/* ── 3 ── */}
      <div id="step-details" className="scroll-mt-4">
        <Section step={3} title="Your details">
          <div className="space-y-4">
            <Field label="Name" error={touched && !nameOk ? ERROR_COPY.bad_name : undefined} hint="So she knows whose bread this is.">
              {(a) => <input {...a} ref={nameRef} className={inputClass} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} enterKeyHint="next" />}
            </Field>
            <Field label="Phone" error={touched && !phoneOk ? ERROR_COPY.bad_phone : undefined} hint="Only used if there is a question about your order.">
              {(a) => (
                <input
                  {...a}
                  ref={phoneRef}
                  className={inputClass}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(prettyPhone(e.target.value))}
                  placeholder="(612) 555-0199"
                  enterKeyHint="done"
                />
              )}
            </Field>
          </div>
        </Section>
      </div>

      {/* ── 4 ── */}
      <div id="step-review" className="scroll-mt-4">
        <Section step={4} title="Review & pay">
          {nextStep !== null || !selectedDay ? (
            <p className="text-[14px] text-cocoa-soft">
              {nextStep === 'bread' ? 'Choose your bread to see your order here.' : nextStep === 'day' ? 'Pick a day that can take your order.' : 'Add your name and phone number.'}
            </p>
          ) : (
            <div className="rounded-2xl border border-line bg-white">
              <ul className="divide-y divide-line px-4">
                {products.filter((p) => qty[p.id] > 0).map((p) => (
                  <li key={p.id} className="flex items-baseline justify-between gap-3 py-3 text-[15px] text-cocoa">
                    <span>
                      {qty[p.id]} × {p.name} <span className="text-cocoa-soft">· {formatMoney(p.priceCents)} each</span>
                    </span>
                    <span className="font-semibold">{formatMoney(qty[p.id] * p.priceCents)}</span>
                  </li>
                ))}
                <li className="flex items-baseline justify-between gap-3 py-3 text-[17px] font-semibold text-cocoa">
                  <span>Total</span>
                  <span>{formatMoney(total)}</span>
                </li>
              </ul>
              <dl className="space-y-2 border-t border-line px-4 py-3 text-[14px] text-cocoa">
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 text-cocoa-soft">Pick up</dt>
                  <dd>
                    <b>{longDate(selectedDay.date, today, 'always')}</b>, {PICKUP_WINDOW} — {PICKUP_PREFERRED}
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 text-cocoa-soft">Where</dt>
                  <dd>
                    {PICKUP_PLACE}, {PICKUP_PLACE_WHERE}. <span className="text-cocoa-soft">{PICKUP_PLACE_NOTE}</span>
                  </dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 text-cocoa-soft">Deadline</dt>
                  <dd>Order by {deadlineCopy(selectedDay.cutoffAt, today)}.</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="w-16 shrink-0 text-cocoa-soft">For</dt>
                  <dd>
                    {name.trim()} · {formatPhone(normalisePhone(phone) ?? '')}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-[13px]">
                {(['bread', 'day', 'details'] as const).map((s) => (
                  <button key={s} type="button" className="min-h-9 font-semibold text-crust-dark underline-offset-2 hover:underline" onClick={() => scrollTo(`step-${s}`)}>
                    Edit {s === 'bread' ? 'bread' : s === 'day' ? 'day' : 'details'}
                  </button>
                ))}
              </div>
              <div className="border-t border-line p-4">
                <Button className="w-full" onClick={reserve} disabled={!readyToPay}>
                  {submitting ? 'Opening payment…' : `Pay ${formatMoney(total)} by card`}
                </Button>
              </div>
            </div>
          )}
          <p className="mt-4 text-[13px] leading-relaxed text-cocoa-soft">
            Paying holds your bread and opens a secure Stripe page for your card — Apple Pay or Google Pay appear there on phones and browsers that support them.
            Your order is confirmed the moment the payment goes through. If you back out, nothing is charged and your choices stay here.
          </p>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-cream/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] text-cocoa-soft">
              {!bread ? 'Choose your bread to start' : `${linesCopy(qty)}${selectedDay && cartFits ? ` · ${formatYmd(selectedDay.date)}` : ''}`}
            </p>
            <p className="font-display text-[22px] leading-tight font-semibold text-cocoa">{formatMoney(total)}</p>
          </div>
          {readyToPay ? (
            <Button onClick={reserve} disabled={submitting} className="shrink-0 px-6">
              {submitting ? 'Opening payment…' : `Pay ${formatMoney(total)}`}
            </Button>
          ) : (
            <Button variant="secondary" onClick={continueToNext} disabled={submitting || load.state === 'loading'} className="shrink-0 px-6">
              {submitting ? 'Opening payment…' : 'Continue'}
            </Button>
          )}
        </div>
      </div>
    </Page>
  )
}

function Stepper({ value, max, label, onChange }: { value: number; max: number; label: string; onChange: (n: number) => void }) {
  const round = 'grid size-11 place-items-center rounded-full text-[20px] font-semibold transition-colors disabled:opacity-30'
  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`${label} quantity`}>
      <button type="button" className={`${round} bg-cream-2 text-cocoa hover:bg-line`} onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0} aria-label={`One fewer ${label}`}>
        −
      </button>
      <span className="w-7 text-center text-[18px] font-semibold tabular-nums text-cocoa" aria-live="polite" aria-atomic="true">
        {value}
      </span>
      <button type="button" className={`${round} bg-cocoa text-cream hover:bg-cocoa-soft`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`One more ${label}`}>
        +
      </button>
    </div>
  )
}

/** Arrow keys move between the days that can be chosen; Tab leaves the group. */
function moveFocus(e: React.KeyboardEvent, root: HTMLDivElement | null) {
  if (!root) return
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End']
  if (!keys.includes(e.key)) return
  const radios = Array.from(root.querySelectorAll<HTMLElement>('[role=radio]:not([aria-disabled=true])'))
  if (radios.length === 0) return
  const i = radios.indexOf(document.activeElement as HTMLElement)
  let next = i
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % radios.length
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + radios.length) % radios.length
  else if (e.key === 'Home') next = 0
  else next = radios.length - 1
  e.preventDefault()
  radios[next]?.focus()
}

function DayChip({ day, qty, today, selected, tabbable, onSelect }: { day: DayAvailability; qty: Qty; today: string; selected: boolean; tabbable: boolean; onSelect: () => void }) {
  const state = dayState(day, qty)
  const ok = selectable(state)
  const withCart = hasBread(qty)
  const line =
    state === 'blocked'
      ? 'Closed by the baker'
      : state === 'closed'
        ? 'Ordering closed'
        : state === 'sold_out'
          ? 'Sold out'
          : state === 'held_only'
            ? 'None free right now'
            : state === 'short'
              ? 'Not enough for your order'
              : withCart
                ? 'Fits your order'
                : PRODUCTS.map((p) => {
                    const short = p.id === 'banana' ? 'banana' : p.name.toLowerCase()
                    if (day.remaining[p.id] > 0) return `${day.remaining[p.id]} ${short}`
                    return day.held[p.id] > 0 ? `${short}: none free now` : `${short} sold out`
                  }).join(' · ')
  const [weekday, rest] = formatYmd(day.date).split(', ')
  const look = selected
    ? 'border-crust-dark bg-crust-dark text-cream'
    : !ok
      ? 'border-line bg-cream-2 text-cocoa-soft'
      : state === 'short'
        ? 'border-crust/50 bg-white text-cocoa'
        : 'border-line bg-white text-cocoa hover:border-crust'
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={!ok}
      aria-label={`${longDate(day.date, today)} — ${line}`}
      tabIndex={tabbable ? 0 : -1}
      onClick={() => ok && onSelect()}
      className={`min-h-[76px] rounded-2xl border px-2 py-2.5 text-left transition-colors ${look} ${!ok ? 'cursor-not-allowed' : ''}`}
    >
      <span className="block text-[12px] font-semibold uppercase tracking-wide opacity-80">{weekday}</span>
      <span className="block text-[17px] font-semibold leading-tight">{rest}</span>
      <span className={`mt-1 block text-[11px] leading-tight ${selected ? 'text-cream/85' : !ok ? 'font-semibold text-berry/90' : state === 'short' ? 'font-semibold text-crust-dark' : 'text-cocoa-soft'}`}>{line}</span>
    </button>
  )
}
