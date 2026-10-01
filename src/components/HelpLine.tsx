import { useId, useState } from 'react'
import { CRISIS_ANYWHERE, EMERGENCY_ANYWHERE, dial, helpFor } from '../data/help'
import { countries } from '../data/countries'
import { countryFor } from '../data/scenes'
import { loadProgress } from '../lib/storage'

interface Props {
  /** Also name the helpline, not only the emergency number. */
  urgent?: boolean
  /**
   * Which line: abuse in a relationship, or a crisis — thoughts of suicide or
   * self-harm (docs/GUIDE-EVAL.md). A crisis always names its line.
   */
  kind?: 'abuse' | 'crisis'
  /** Only the line, without the emergency sentence: for a second HelpLine under a first. */
  lineOnly?: boolean
  /**
   * With an abuse line: also show the crisis line beneath it, from the same
   * country, under the one question. The Guide's foot shows both together.
   */
  withCrisis?: boolean
  className?: string
}

/**
 * The line for when it cannot wait — see src/data/help.ts. Her country comes
 * from what this phone already holds. Where it holds none, or none with a
 * line, an urgent abuse line asks her where she is, in place, from the whole
 * country list — Somalia and "somewhere else" included, so she is never made
 * to pick a country that is not hers — and shows that country's line, or says
 * plainly that none is listed; the answer lives in this component only: not
 * stored, not sent, not put on her identity (docs/DECISIONS.md Part 26). The
 * answerer on a couple link has told us nothing, and gets the same question.
 *
 * Where the abuse line and the crisis line are shown together (`withCrisis`,
 * the foot of the Guide) one HelpLine renders both from the one choice, so a
 * country she names applies to both and the question is asked once. The choice
 * goes when the blocks do (docs/DECISIONS.md Part 29).
 */
export default function HelpLine({ urgent = false, kind = 'abuse', lineOnly = false, withCrisis = false, className = '' }: Props) {
  const identity = loadProgress()?.identity
  const known = helpFor(identity ? countryFor(identity) : undefined)
  const [picked, setPicked] = useState('')
  const field = useId()
  // Someone who came in through a tool has never told us where she is, so the
  // urgent line used to be dropped and she was left with emergency numbers for
  // four regions and no one to call.
  const asks = urgent && kind === 'abuse' && !lineOnly && !known.line
  const help = asks && picked ? helpFor(picked) : known
  const pair = withCrisis && kind === 'abuse'
  // The wrapper, where there is one, carries the class; a lone sentence carries its own.
  const wrapped = asks || pair
  const block = (of: 'abuse' | 'crisis', only: boolean, spacing = '') => {
    const line = of === 'crisis' ? help.crisis : help.line
    return (
      <p className={`text-[0.82rem] leading-relaxed text-ink-soft text-pretty ${wrapped ? spacing : className}`}>
        {!only && (
          <>
            If you are in danger now, call{' '}
            {help.emergency ? (
              <a href={dial(help.emergency)} className="font-medium text-ink underline underline-offset-2">
                {help.emergency}
              </a>
            ) : (
              <>your local emergency number ({EMERGENCY_ANYWHERE})</>
            )}
            .
          </>
        )}
        {(urgent || of === 'crisis') && line && (
          <>
            {' '}
            {/* Only the abuse lines were checked as free and round-the-clock (src/data/help.ts); a crisis line may charge, or keep hours. */}
            {of === 'crisis' ? 'To talk to someone:' : 'To talk to someone now, free:'} {line.name},{' '}
            <a href={dial(line.number)} className="font-medium text-ink underline underline-offset-2">
              {line.number}
            </a>
            {'hours' in line && line.hours ? ` (${line.hours})` : ''}.
          </>
        )}
        {of === 'crisis' && !line && <> A crisis line, where there is one: {CRISIS_ANYWHERE}.</>}
        {of === 'abuse' && asks && picked && !line && <> We don’t have a local support line listed for this location.</>}
      </p>
    )
  }
  const words = (
    <>
      {block(kind, lineOnly)}
      {pair && block('crisis', true, 'mt-1.5')}
    </>
  )
  if (!wrapped) return words
  return (
    <div className={className}>
      {words}
      {asks && (
        <div className="mt-2.5">
          <label htmlFor={field} className="block text-[0.82rem] font-medium text-ink">
            Choose your country to see available support.
          </label>
          <select
            id={field}
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            className="mt-1.5 min-h-11 w-full max-w-xs rounded-xl border border-line bg-white/70 px-3 text-[0.9rem] text-ink"
          >
            <option value="">Choose a country</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[0.78rem] leading-snug text-muted text-pretty">
            Only used to show what is listed here. It is not saved and not sent.
          </p>
        </div>
      )}
    </div>
  )
}
