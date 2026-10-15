import { useEffect, useRef, useState, type Dispatch } from 'react'
import { Button, fieldClass, TextButton } from '../../../components/ui'
import { CRISIS_ANYWHERE, EMERGENCY_ANYWHERE } from '../../../data/help'
import { fill } from '../fixtures'
import type { Action, Session } from '../flow'
import type { Person } from '../types'

/**
 * Disconnect, block and report, visible wherever a person can be: on a
 * suggestion and in a conversation. In this prototype each one changes
 * this tab's state and nothing else. The copy says so, and never says that
 * anything was reviewed, removed, enforced or deleted.
 */

const REASONS = ['Harassment or threats', 'Pressure to share photos or contact details', 'A fake or misleading profile', 'Something else']

export function SafetyRow({ s, dispatch, person, canDisconnect }: { s: Session; dispatch: Dispatch<Action>; person: Person; canDisconnect: boolean }) {
  const sheet = s.sheet && s.sheet.person === person.id ? s.sheet.kind : null
  // When a sheet closes without leaving the screen, focus goes back to the button that opened it.
  const row = useRef<HTMLDivElement>(null)
  const was = useRef<string | null>(null)
  useEffect(() => {
    if (was.current && !sheet) row.current?.querySelector<HTMLElement>(`[data-safety="${was.current}"]`)?.focus()
    was.current = sheet
  }, [sheet])
  const reported = s.reports.some((r) => r.person === person.id)
  return (
    <section aria-label="Safety" className="mt-8 rounded-card border border-line bg-white/50 px-4 py-4">
      <p className="text-[0.88rem] font-medium text-ink">Safety</p>
      <div ref={row} className="mt-2 flex flex-wrap gap-2">
        {canDisconnect && (
          <Button variant="outline" className="!px-5 !py-2.5" data-safety="disconnect" onClick={() => dispatch({ type: 'openSheet', kind: 'disconnect', person: person.id })}>
            Disconnect
          </Button>
        )}
        <Button variant="outline" className="!px-5 !py-2.5" data-safety="block" onClick={() => dispatch({ type: 'openSheet', kind: 'block', person: person.id })}>
          Block
        </Button>
        <Button variant="outline" className="!px-5 !py-2.5" data-safety="report" onClick={() => dispatch({ type: 'openSheet', kind: 'report', person: person.id })}>
          Report
        </Button>
      </div>
      <div role="status">
        {reported && !sheet && (
          <p className="mt-3 text-[0.9rem] leading-snug text-ink-soft text-pretty">
            Report recorded in this prototype. Nobody received it and nobody will review it. If you are in danger now: {EMERGENCY_ANYWHERE}. In a crisis: {CRISIS_ANYWHERE}.
          </p>
        )}
      </div>
      {sheet && <Sheet kind={sheet} dispatch={dispatch} person={person} />}
    </section>
  )
}

function Sheet({ kind, dispatch, person }: { kind: 'disconnect' | 'block' | 'report'; dispatch: Dispatch<Action>; person: Person }) {
  const heading = useRef<HTMLHeadingElement>(null)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  useEffect(() => heading.current?.focus(), [])
  const t = (x: string) => fill(x, person.side, person.firstName)
  const close = () => dispatch({ type: 'closeSheet' })
  return (
    <div className="mt-4 rounded-2xl border border-clay/40 bg-clay/[0.07] px-4 py-4">
      <h2 ref={heading} tabIndex={-1} className="font-display text-[1.1rem] font-medium text-ink">
        {kind === 'disconnect' && t('Disconnect from {name}?')}
        {kind === 'block' && t('Block {name}?')}
        {kind === 'report' && t('Report {name}')}
      </h2>
      {kind === 'disconnect' && (
        <>
          <p className="mt-2 text-[0.92rem] leading-snug text-ink-soft text-pretty">
            {t(
              'This ends the conversation. In a product, {name} would be told it has ended. Here that notification is simulated and nothing is delivered. Photos stop being shown and the messages are hidden. Nothing is deleted anywhere, because nothing was ever stored.',
            )}
          </p>
          <Actions>
            <Button onClick={() => dispatch({ type: 'disconnect', person: person.id })}>Disconnect</Button>
            <TextButton className="text-forest underline" onClick={close}>
              Cancel
            </TextButton>
          </Actions>
        </>
      )}
      {kind === 'block' && (
        <>
          <p className="mt-2 text-[0.92rem] leading-snug text-ink-soft text-pretty">
            {t(
              '{name} is removed and will not be suggested to you again in this tab. {He} is not told. Nothing is enforced beyond this tab: there is no one behind it and nothing is stored.',
            )}
          </p>
          <Actions>
            <Button onClick={() => dispatch({ type: 'block', person: person.id })}>{t('Block {name}')}</Button>
            <TextButton className="text-forest underline" onClick={close}>
              Cancel
            </TextButton>
          </Actions>
        </>
      )}
      {kind === 'report' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!reason) {
              setError('Choose a reason first.')
              return
            }
            dispatch({ type: 'report', person: person.id, reason, note })
          }}
        >
          <p className="mt-2 text-[0.92rem] leading-snug text-ink-soft text-pretty">
            Prototype: no one will receive this and no one will review it. It is kept in this tab only.
          </p>
          <fieldset className="mt-3">
            <legend className="text-[0.9rem] font-medium text-ink-soft">What happened?</legend>
            <div className="mt-2 grid gap-2">
              {REASONS.map((r) => (
                <label key={r} className="flex min-h-11 items-center gap-3 rounded-2xl border border-line bg-white/60 px-4 py-2.5 text-[0.93rem] text-ink-soft">
                  <input type="radio" name="reason" className="h-4 w-4 accent-forest" checked={reason === r} onChange={() => setReason(r)} />
                  {r}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="mt-3 block text-[0.9rem] font-medium text-ink-soft" htmlFor="report-note">
            Anything else? (made-up text only)
          </label>
          <textarea id="report-note" className={`${fieldClass} mt-1.5 block min-h-20 w-full px-4 py-3 text-base`} value={note} maxLength={400} onChange={(e) => setNote(e.target.value)} />
          <div role="status" className="min-h-[1.25rem] text-[0.88rem] text-clay">
            {error}
          </div>
          <Actions>
            <Button type="submit">Record this report</Button>
            <TextButton className="text-forest underline" onClick={close}>
              Cancel
            </TextButton>
          </Actions>
        </form>
      )}
    </div>
  )
}

const Actions = ({ children }: { children: React.ReactNode }) => <div className="mt-4 flex flex-wrap items-center gap-3">{children}</div>
