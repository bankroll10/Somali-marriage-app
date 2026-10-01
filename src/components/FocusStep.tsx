import { useRef, type ReactNode } from 'react'
import { FocusHeading } from '../hooks/useFocusHeading'

/**
 * One step inside a screen: a question, or a result.
 *
 * A screen change moves focus to its heading (`App`, `FocusHeading`). The next
 * question and the result are not screen changes — the read stays "the read" —
 * so the tap that answered the last question removed the button that had
 * focus, and focus fell to `<body>`: a keyboard or screen-reader user was told
 * nothing had changed, on every one of twelve questions and again at the
 * result (docs/DECISIONS.md Part 26).
 *
 * Give each step its own `key`. The step mounts when it appears, and that is
 * the only time it looks at focus: if focus was lost it goes to the step's
 * heading; if it is on something that survived (the header's Back), or the
 * person is typing or tabbing around the step, it is left alone. Nothing is
 * stored, nothing about the answers is touched, and re-rendering the same step
 * never moves focus.
 */
export default function FocusStep({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} className={className}>
      <FocusHeading within={ref} onlyIfLost />
      {children}
    </div>
  )
}
