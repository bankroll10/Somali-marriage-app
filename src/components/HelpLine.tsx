import { useId, useState } from 'react'
import { CRISIS_ANYWHERE, EMERGENCY_ANYWHERE, HELP, dial, helpFor } from '../data/help'
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
  className?: string
}

/** The countries that have a line to show — Somalia and "somewhere else" do not. */
const WITH_A_LINE = countries.filter((c) => HELP[c.id]?.line)

/**
 * The line for when it cannot wait — see src/data/help.ts. Her country comes
 * from what this phone already holds. Where it holds none, or none with a
 * line, an urgent abuse line asks her where she is, in place, and shows that
 * country's line; the answer lives in this component only — not stored, not
 * sent, not put on her identity (docs/DECISIONS.md Part 26). The answerer on
 * a couple link has told us nothing, and gets the same question.
 */
export default function HelpLine({ urgent = false, kind = 'abuse', lineOnly = false, className = '' }: Props) {
  const identity = loadProgress()?.identity
  const known = helpFor(identity ? countryFor(identity) : undefined)
  const [picked, setPicked] = useState('')
  const field = useId()
  // Someone who came in through a tool has never told us where she is, so the
  // urgent line used to be dropped and she was left with emergency numbers for
  // four regions and no one to call.
  const asks = urgent && kind === 'abuse' && !lineOnly && !known.line
  const help = asks && picked ? helpFor(picked) : known
  const line = kind === 'crisis' ? help.crisis : help.line
  const words = (
    <p className={`text-[0.82rem] leading-relaxed text-ink-soft text-pretty ${asks ? '' : className}`}>
      {!lineOnly && (
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
      {(urgent || kind === 'crisis') && line && (
        <>
          {' '}
          {/* Only the abuse lines were checked as free and round-the-clock (src/data/help.ts); a crisis line may charge, or keep hours. */}
          {kind === 'crisis' ? 'To talk to someone:' : 'To talk to someone now, free:'} {line.name},{' '}
          <a href={dial(line.number)} className="font-medium text-ink underline underline-offset-2">
            {line.number}
          </a>
          {'hours' in line && line.hours ? ` (${line.hours})` : ''}.
        </>
      )}
      {kind === 'crisis' && !line && <> A crisis line, where there is one: {CRISIS_ANYWHERE}.</>}
    </p>
  )
  if (!asks) return words
  return (
    <div className={className}>
      {words}
      <div className="mt-2.5">
        <label htmlFor={field} className="block text-[0.82rem] font-medium text-ink">
          Where are you? We will show a free line to call.
        </label>
        <select
          id={field}
          value={picked}
          onChange={(e) => setPicked(e.target.value)}
          className="mt-1.5 min-h-11 w-full max-w-xs rounded-xl border border-line bg-white/70 px-3 text-[0.9rem] text-ink"
        >
          <option value="">Choose a country</option>
          {WITH_A_LINE.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[0.78rem] leading-snug text-muted text-pretty">
          Only used to show the number. It is not saved and not sent.
        </p>
      </div>
    </div>
  )
}
