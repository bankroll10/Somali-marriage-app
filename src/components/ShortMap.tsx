import { useState } from 'react'
import type { AnswerValue, Answers, Gender } from '../types'
import { shortMapQuestions } from '../data/shortMap'
import QuestionCard from './QuestionCard'
import { ArrowRight, Button, ScreenHeader } from './ui'

interface Props {
  answers: Answers
  gender?: Gender
  onAnswer: (questionId: string, value: AnswerValue) => void
  /** All three answered; the door asks for her age and a way to reach her next. */
  onDone: () => void
  onBack: () => void
}

/**
 * Three questions, then the door.
 *
 * The pool reads exactly these from a kept map (src/data/shortMap.ts), so
 * these are what being counted costs — not the sixteen. Each is the same
 * question, the same card and the same stored answer as in the full map, so a
 * person who builds the rest of the map later never answers one twice.
 */
export default function ShortMap({ answers, gender, onAnswer, onDone, onBack }: Props) {
  const questions = shortMapQuestions()
  const [index, setIndex] = useState(0)
  const q = questions[index]
  const value = answers[q.id]
  const answered = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== ''
  const last = index >= questions.length - 1
  const seeking = gender === 'man' ? 'her' : 'him'

  return (
    <div className="min-h-dvh bg-cream pb-28">
      <ScreenHeader onBack={() => (index === 0 ? onBack() : setIndex(index - 1))} sticky>
        <h1 className="font-display text-[1.05rem] font-medium text-ink">Being counted</h1>
      </ScreenHeader>
      <main className="mx-auto max-w-xl px-6">
        <div className="py-8">
          {index === 0 && (
            <p className="animate-fade mb-6 text-[0.92rem] leading-relaxed text-muted text-pretty">
              Three things the pool is read by, then your age and a way to reach you. That is all being
              counted takes; the rest of your map can wait, and nobody is shown to {seeking} on the strength
              of it.
            </p>
          )}
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.22em] text-gold">
            {index + 1} of {questions.length}
          </p>
          <div key={q.id} className="animate-fade">
            <QuestionCard question={q} value={value} onChange={(v) => onAnswer(q.id, v)} />
          </div>
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line/70 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center justify-end px-5 pt-4 pb-safe-bar">
          <Button onClick={() => (last ? onDone() : setIndex(index + 1))} disabled={!answered} className="group">
            {last ? 'Your age, and how to reach you' : 'Continue'}
            <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
