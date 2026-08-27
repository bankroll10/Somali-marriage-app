import { useEffect, useMemo, useState } from 'react'
import { chapters, chapterInsight } from '../data/intake'
import type { AnswerValue, Answers, Chapter, Question } from '../types'
import QuestionCard from './QuestionCard'
import { BackButton, Button, Logo, ArrowRight } from './ui'

/** Long enough to see the choice register, short enough to feel instant. */
const AUTO_ADVANCE_MS = 300

interface FlatQuestion {
  q: Question
  chapter: Chapter
  chapterIndex: number
  isFirstInChapter: boolean
}

interface Props {
  answers: Answers
  onAnswer: (questionId: string, value: AnswerValue) => void
  onComplete: () => void
  onExit: () => void
  startIndex?: number
  /** Skip the first chapter's intro (the hook insight already previewed it). */
  skipFirstIntro?: boolean
}

export default function Intake({ answers, onAnswer, onComplete, onExit, startIndex = 0, skipFirstIntro = false }: Props) {
  const flat = useMemo<FlatQuestion[]>(
    () =>
      chapters.flatMap((chapter, chapterIndex) =>
        chapter.questions.map((q, qi) => ({
          q,
          chapter,
          chapterIndex,
          isFirstInChapter: qi === 0,
        })),
      ),
    [],
  )

  const total = flat.length
  const [index, setIndex] = useState(Math.min(startIndex, total - 1))
  // Show the chapter interstitial when arriving at a chapter's first question.
  const [showIntro, setShowIntro] = useState(
    flat[Math.min(startIndex, total - 1)].isFirstInChapter && !skipFirstIntro,
  )
  // A one-line reading shown after finishing a chapter, before the next intro.
  const [insight, setInsight] = useState<string | null>(null)

  // A tapped single choice is a finished answer — advancing for them removes a
  // tap on 16 of the 23 questions. Set only by a real tap, so returning to an
  // answered question never fires it and traps you moving forward.
  const [advancing, setAdvancing] = useState(false)

  const current = flat[index]
  const value = answers[current.q.id]

  const isAnswered = (() => {
    if (current.q.optional) return true
    if (current.q.type === 'multi') return Array.isArray(value) && value.length > 0
    if (current.q.type === 'text') return typeof value === 'string' && value.trim().length > 0
    return value !== undefined && value !== ''
  })()

  const progress = Math.round(((index + (showIntro ? 0 : 1)) / total) * 100)

  /**
   * Record an answer. For an unambiguous choice (single / scale) we move on
   * ourselves after a beat — long enough to see the selection land, short
   * enough that it never feels like waiting. Changing your mind inside that
   * beat resets it; the final question always waits for a deliberate tap.
   */
  function handleAnswer(questionId: string, v: AnswerValue) {
    onAnswer(questionId, v)
    const auto = current.q.type === 'single' || current.q.type === 'scale'
    if (auto && index < total - 1) setAdvancing(true)
  }

  // Runs after `answers` has updated, so chapter insights read the fresh answer.
  useEffect(() => {
    if (!advancing) return
    const t = window.setTimeout(() => {
      setAdvancing(false)
      goNext()
    }, AUTO_ADVANCE_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancing, answers])

  function goNext() {
    if (index >= total - 1) {
      onComplete()
      return
    }
    const next = index + 1
    // Finished a chapter? Pause on its insight before the next intro.
    if (flat[next].isFirstInChapter) {
      const reading = chapterInsight(current.chapter.id, answers)
      if (reading) {
        setInsight(reading)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
    }
    setIndex(next)
    setShowIntro(flat[next].isFirstInChapter)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function continueFromInsight() {
    // The insight screen already previews the next chapter — go straight to its
    // first question instead of a second interstitial.
    setInsight(null)
    const next = index + 1
    setIndex(next)
    setShowIntro(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    if (insight) {
      // From an insight, step back to the chapter's last question.
      setInsight(null)
      return
    }
    if (showIntro && index > 0) {
      // From a chapter intro, step back into the previous chapter's last question.
      const prev = index - 1
      setIndex(prev)
      setShowIntro(false)
      return
    }
    if (showIntro && index === 0) {
      onExit()
      return
    }
    if (current.isFirstInChapter) {
      // From the first question of a chapter, back shows that chapter's intro.
      setShowIntro(true)
      return
    }
    setIndex(index - 1)
    setShowIntro(false)
  }

  return (
    <div className="relative min-h-dvh bg-cream">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center gap-4 px-5 py-3.5">
          <BackButton onClick={goBack} />
          <div className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-forest transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <Logo className="hidden text-ink sm:inline-flex" />
        </div>
      </div>

      <div className="mx-auto max-w-xl px-5 pb-32 pt-8 sm:pt-12">
        {insight ? (
          <ChapterInsight
            key={`insight-${current.chapter.id}`}
            chapter={current.chapter}
            nextChapter={flat[Math.min(index + 1, total - 1)].chapter}
            insight={insight}
            done={current.chapterIndex + 1}
            totalChapters={chapters.length}
            onContinue={continueFromInsight}
          />
        ) : showIntro ? (
          <ChapterIntro key={current.chapter.id} chapter={current.chapter} onContinue={() => setShowIntro(false)} />
        ) : (
          <div key={current.q.id} className="animate-fade">
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.22em] text-gold">
              {current.chapter.kicker}
            </p>
            <QuestionCard
              question={current.q}
              value={value}
              onChange={(v) => handleAnswer(current.q.id, v)}
            />
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {!showIntro && !insight && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line/70 bg-cream/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-xl items-center justify-between px-5 py-4">
            <span className="text-sm text-muted">
              Chapter {current.chapterIndex + 1} of {chapters.length}
            </span>
            <Button onClick={goNext} disabled={!isAnswered} className="group">
              {index >= total - 1 ? 'Show me my map' : current.q.optional && !isAnswered ? 'Skip' : 'Continue'}
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ChapterInsight({
  chapter,
  nextChapter,
  insight,
  done,
  totalChapters,
  onContinue,
}: {
  chapter: Chapter
  nextChapter: Chapter
  insight: string
  done: number
  totalChapters: number
  onContinue: () => void
}) {
  return (
    <div className="animate-rise flex min-h-[60dvh] flex-col justify-center">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-gold">
        {chapter.kicker} · complete
      </p>
      <div className="mt-6 rounded-card border border-gold/25 bg-gold/[0.07] p-6">
        <div className="flex items-center gap-2.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12.5 10 17.5 19 6.5"
              stroke="var(--color-gold)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-[0.82rem] font-semibold uppercase tracking-[0.16em] text-gold">
            What this tells us
          </p>
        </div>
        <p className="mt-4 font-display text-[1.35rem] font-medium leading-snug tracking-tight text-ink text-pretty">
          {insight}
        </p>
      </div>
      {/* The next chapter is previewed here — one interstitial, not two. */}
      <div className="mt-6 border-t border-line/70 pt-5">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Up next · {nextChapter.kicker} · {done} of {totalChapters} done
        </p>
        <p className="mt-2 font-display text-[1.3rem] font-medium tracking-tight text-ink">
          {nextChapter.title}
        </p>
        <p className="mt-1 text-[0.85rem] text-muted">
          {nextChapter.questions.length} questions · about a minute
        </p>
      </div>
      <div className="mt-7">
        <Button onClick={onContinue} className="group">
          Keep going
          <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </div>
  )
}

function ChapterIntro({ chapter, onContinue }: { chapter: Chapter; onContinue: () => void }) {
  return (
    <div className="animate-rise flex min-h-[60dvh] flex-col justify-center">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-gold">{chapter.kicker}</p>
      <h2 className="mt-4 font-display text-[2.3rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.7rem]">
        {chapter.title}
      </h2>
      <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-ink-soft text-pretty">
        {chapter.intro}
      </p>
      <p className="mt-4 text-[0.82rem] font-medium text-muted">
        {chapter.questions.length} questions · about a minute
      </p>
      <div className="mt-9">
        <Button onClick={onContinue} className="group">
          Begin this chapter
          <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
        </Button>
      </div>
    </div>
  )
}
