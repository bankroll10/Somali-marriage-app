import { CRISIS_ANYWHERE, EMERGENCY_ANYWHERE, dial, helpFor } from '../data/help'
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
  className?: string
}

/**
 * The line for when it cannot wait — see src/data/help.ts. Her country comes
 * from what this phone already holds; the answerer on a couple link has told
 * us nothing, and gets the numbers for the places the diaspora lives.
 */
export default function HelpLine({ urgent = false, kind = 'abuse', className = '' }: Props) {
  const identity = loadProgress()?.identity
  const help = helpFor(identity ? countryFor(identity) : undefined)
  const line = kind === 'crisis' ? help.crisis : help.line
  return (
    <p className={`text-[0.82rem] leading-relaxed text-ink-soft text-pretty ${className}`}>
      If you are in danger now, call{' '}
      {help.emergency ? (
        <a href={dial(help.emergency)} className="font-medium text-ink underline underline-offset-2">
          {help.emergency}
        </a>
      ) : (
        <>your local emergency number ({EMERGENCY_ANYWHERE})</>
      )}
      .
      {(urgent || kind === 'crisis') && line && (
        <>
          {' '}
          To talk to someone now, free: {line.name},{' '}
          <a href={dial(line.number)} className="font-medium text-ink underline underline-offset-2">
            {line.number}
          </a>
          {'hours' in line && line.hours ? ` (${line.hours})` : ''}.
        </>
      )}
      {kind === 'crisis' && !line && <> A crisis line, where there is one: {CRISIS_ANYWHERE}.</>}
    </p>
  )
}
