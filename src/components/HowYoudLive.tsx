import type { AnswerValue, Answers } from '../types'
import { livingQuestions } from '../data/intake'

interface Props {
  answers: Answers
  onAnswer: (questionId: string, value: AnswerValue) => void
}

/**
 * How you'd live — three questions, chips not cards, asked where the answer
 * changes something she can see. On the sample introduction the reasons update
 * as she taps; on Profile they sit with the rest of what defines her.
 *
 * Optional, always. An unanswered one is neutral to the engine and says nothing
 * about her.
 */
export default function HowYoudLive({ answers, onAnswer }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {livingQuestions.map((q) => {
        const chosen = answers[q.id]
        return (
          <div key={q.id}>
            <p id={`living-${q.id}`} className="text-[0.92rem] font-medium text-ink">
              {q.prompt}
            </p>
            {q.helper && <p className="mt-0.5 text-[0.82rem] text-muted text-pretty">{q.helper}</p>}
            <div role="group" aria-labelledby={`living-${q.id}`} className="mt-2 flex flex-wrap gap-2">
              {q.options?.map((o) => {
                const on = chosen === o.id
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => onAnswer(q.id, on ? '' : o.id)}
                    aria-pressed={on}
                    title={o.hint}
                    className={`rounded-full border px-3.5 py-1.5 text-[0.85rem] font-medium transition-all ${
                      on
                        ? 'border-forest bg-forest text-cream'
                        : 'border-line bg-white/50 text-ink-soft hover:border-forest/40 hover:bg-white'
                    }`}
                  >
                    {o.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
