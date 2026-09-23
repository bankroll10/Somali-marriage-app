import { EMERGENCY_ANYWHERE, dial, helpFor } from '../data/help'
import { countryFor } from '../data/scenes'
import { loadProgress } from '../lib/storage'

interface Props {
  /** Also name the helpline, not only the emergency number. */
  urgent?: boolean
  className?: string
}

/**
 * The line for when it cannot wait — see src/data/help.ts. Her country comes
 * from what this phone already holds; the answerer on a couple link has told
 * us nothing, and gets the numbers for the places the diaspora lives.
 */
export default function HelpLine({ urgent = false, className = '' }: Props) {
  const identity = loadProgress()?.identity
  const help = helpFor(identity ? countryFor(identity) : undefined)
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
      {urgent && help.line && (
        <>
          {' '}
          To talk it through, free and at any hour: {help.line.name},{' '}
          <a href={dial(help.line.number)} className="font-medium text-ink underline underline-offset-2">
            {help.line.number}
          </a>
          .
        </>
      )}
    </p>
  )
}
