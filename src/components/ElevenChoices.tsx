import { useEffect, useRef, useState } from 'react'
import { FIRST_CHOICES, isDifference } from '../data/beforeYes'

/**
 * The answer to one of the eleven, on either phone.
 *
 * Four answers first. "We've talked, and we don't agree" does not end the
 * question: it opens a second one — where that leaves it — because a
 * difference that is still open, one the two of them have worked out how to
 * live with, and one that is a line for her are three different things, and
 * recording all three as "differ" told a couple who had arranged theirs to
 * reopen it ahead of everything they had never said (docs/DECISIONS.md
 * Part 8). Nothing is recorded until the second answer is chosen, so leaving
 * half way resumes on this question.
 *
 * Shared by BeforeYes.tsx and Couple.tsx, which each pass the outcomes their
 * side offers.
 */

export interface DifferOutcome {
  id: string
  label: string
  hint?: string
}

export default function ElevenChoices({
  topicId,
  labelledBy,
  chosen,
  chosenOutcome,
  outcomes,
  disabled = false,
  onChoose,
  onOutcome,
}: {
  topicId: string
  labelledBy?: string
  /** The state already recorded for this topic, if any. */
  chosen: string | undefined
  /** Which difference outcome that state came from, when it is a difference. */
  chosenOutcome?: string
  outcomes: DifferOutcome[]
  disabled?: boolean
  /** One of the three answers that is not a difference. */
  onChoose: (stateId: string) => void
  /** Where a difference stands. */
  onOutcome: (outcomeId: string) => void
}) {
  // Open when she taps "don't agree", and already open when she comes back
  // to a question she answered with a difference, so she can see which one.
  const [open, setOpen] = useState(() => isDifference(chosen))
  const subHeading = useRef<HTMLParagraphElement>(null)
  const opened = useRef(false)

  useEffect(() => {
    // Only when she opened it just now — not on coming back to an answered
    // question, where focus belongs to the screen's own heading.
    if (open && opened.current) subHeading.current?.focus()
  }, [open])

  function first(id: string) {
    if (disabled) return
    if (id === 'differ') {
      opened.current = true
      setOpen(true)
      return
    }
    setOpen(false)
    onChoose(id)
  }

  const isChecked = (id: string) => (id === 'differ' ? open || isDifference(chosen) : !open && chosen === id)
  const subId = `eleven-sub-${topicId}`

  return (
    <>
      <div role="radiogroup" aria-labelledby={labelledBy} className="mt-6 flex flex-col gap-2.5">
        {FIRST_CHOICES.map((s, i) => (
          <Choice
            key={s.id}
            label={s.label}
            hint={s.hint}
            checked={isChecked(s.id)}
            disabled={disabled}
            delay={i * 40}
            onClick={() => first(s.id)}
          />
        ))}
      </div>

      {open && (
        <div className="mt-5 border-t border-line pt-5">
          <p id={subId} ref={subHeading} tabIndex={-1} className="text-[0.95rem] font-medium text-ink outline-none">
            Where does that leave it?
          </p>
          <p className="mt-1 text-[0.83rem] leading-snug text-muted text-pretty">
            Not agreeing is an answer too. Say which kind of difference it is.
          </p>
          <div role="radiogroup" aria-labelledby={subId} className="mt-3 flex flex-col gap-2.5">
            {outcomes.map((o, i) => (
              <Choice
                key={o.id}
                label={o.label}
                hint={o.hint}
                checked={chosenOutcome === o.id}
                disabled={disabled}
                delay={i * 40}
                onClick={() => !disabled && onOutcome(o.id)}
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function Choice({
  label,
  hint,
  checked,
  disabled,
  delay,
  onClick,
}: {
  label: string
  hint?: string
  checked: boolean
  disabled: boolean
  delay: number
  onClick: () => void
}) {
  return (
    <button
      role="radio"
      aria-checked={checked}
      onClick={onClick}
      // `disabled` guards his eleventh answer while it sends (Couple.tsx): the
      // tap that fires a network write has to look different from the ten
      // before it, or it gets tapped twice (docs/DESIGN.md).
      disabled={disabled}
      style={{ animationDelay: `${delay}ms` }}
      className={`animate-rise group flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200 disabled:opacity-60 ${
        checked ? 'border-forest bg-forest text-cream shadow-lift' : 'border-line bg-white/50 text-ink hover:border-forest/40 hover:bg-white'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border ${
          checked ? 'border-gold-soft bg-gold-soft/20' : 'border-line group-hover:border-forest/40'
        }`}
      />
      <span className="min-w-0">
        <span className="block text-[0.98rem] font-medium leading-snug">{label}</span>
        {hint && <span className={`mt-1 block text-[0.83rem] leading-snug ${checked ? 'text-cream/70' : 'text-muted'}`}>{hint}</span>}
      </span>
    </button>
  )
}
