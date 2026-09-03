import { useState } from 'react'
import type { Gender, Identity, ReadRecord } from '../types'
import { readQuestions } from '../data/read'
import { buildRead, type DimensionState, type ReadResult } from '../lib/read'
import { track } from '../lib/analytics'
import { ArrowRight, Button, CheckIcon, ScreenHeader } from './ui'

interface Props {
  identity: Identity
  /** Her last read, if she has taken one — offered rather than reopened. */
  saved: ReadRecord | null
  onSave: (record: ReadRecord) => void
  /** Learned here when she arrives without onboarding. */
  onSetGender: (g: Gender) => void
  /** Talk the result through in the voice best suited to it. */
  onAskGuide: (text: string) => void
  /** Offered after the result — never before it. */
  onBuildMap: () => void
  hasMap: boolean
  onBack: () => void
}

type Phase = 'intro' | 'asking' | 'result'

/**
 * "Is he serious?"
 *
 * The highest-pain question we can answer today, for a woman who already has
 * the man — she met him at a wedding, through a cousin, on another app. She
 * does not need us to introduce her to anyone. She needs to stop re-reading
 * messages at 1am and start reading behaviour.
 *
 * Deliberately reachable without the intake. Making a woman answer thirteen
 * questions about herself before we will help her with tonight is the toll gate
 * this product kept mistaking for an onboarding.
 *
 * We never ask his name. There is no person stored here, only a pattern.
 */
export default function Read({
  identity,
  saved,
  onSave,
  onSetGender,
  onAskGuide,
  onBuildMap,
  hasMap,
  onBack,
}: Props) {
  const [gender, setGender] = useState<Gender | undefined>(identity.gender)
  const [phase, setPhase] = useState<Phase>('intro')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [index, setIndex] = useState(0)

  const questions = readQuestions(gender ?? 'woman')
  const subject = gender === 'man' ? 'her' : 'him'

  function begin(fresh: boolean) {
    track('read_started', { again: !fresh })
    setAnswers(fresh ? {} : (saved?.answers ?? {}))
    setIndex(0)
    setPhase('asking')
  }

  function choose(optionId: string) {
    const q = questions[index]
    const next = { ...answers, [q.id]: optionId }
    setAnswers(next)
    if (index + 1 < questions.length) {
      setIndex(index + 1)
      return
    }
    const record: ReadRecord = { at: new Date().toISOString(), answers: next }
    const built = buildRead(next, gender ?? 'woman')
    track('read_completed', { band: built?.band, thin: built?.thin })
    onSave(record)
    setPhase('result')
  }

  // ── Who are we reading? ────────────────────────────────────────────────────
  if (!gender) {
    return (
      <Shell onBack={onBack} title="A read on someone">
        <div className="py-10">
          <h1 className="animate-rise font-display text-[1.9rem] font-medium leading-tight tracking-tight text-ink text-balance">
            Before we start — who are you reading?
          </h1>
          <p className="animate-rise mt-3 text-[0.98rem] leading-relaxed text-muted text-pretty">
            Only so the questions read properly. We never ask their name.
          </p>
          <div className="mt-7 flex flex-col gap-2.5">
            {(
              [
                { id: 'woman' as Gender, label: 'A man' },
                { id: 'man' as Gender, label: 'A woman' },
              ]
            ).map((opt, i) => (
              <button
                key={opt.id}
                onClick={() => {
                  setGender(opt.id)
                  onSetGender(opt.id)
                }}
                style={{ animationDelay: `${i * 45}ms` }}
                className="animate-rise flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-white/50 p-4 text-left text-[0.98rem] font-medium text-ink transition-all hover:border-forest/40 hover:bg-white"
              >
                {opt.label}
                <ArrowRight className="h-4 w-4 flex-none text-gold" />
              </button>
            ))}
          </div>
        </div>
      </Shell>
    )
  }

  // ── The offer ──────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <Shell onBack={onBack} title="A read on someone">
        <div className="py-9">
          <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold">
            About ninety seconds
          </p>
          <h1 className="animate-rise mt-4 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.3rem]">
            Is {subject === 'him' ? 'he' : 'she'} serious?
          </h1>
          <p className="animate-rise mt-4 text-[1.02rem] leading-relaxed text-ink-soft text-pretty">
            Eleven questions about what {subject} has actually <em>done</em> — not
            how you feel, and not what {subject === 'him' ? 'he' : 'she'} has
            promised. At the end you get an honest read and the one question worth
            asking {subject} next, word for word.
          </p>

          <ul className="animate-rise mt-6 flex flex-col gap-2.5 border-l-2 border-gold/40 pl-4">
            {[
              'We never ask their name. Nothing here identifies anyone.',
              'We will not tell you what kind of person they are. We have not met them.',
              'You will get something you can actually say this week.',
            ].map((line) => (
              <li key={line} className="text-[0.92rem] leading-snug text-muted text-pretty">
                {line}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <Button onClick={() => begin(true)} className="group">
              Start the read
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
          {saved && (
            <button
              onClick={() => {
                setAnswers(saved.answers)
                setPhase('result')
              }}
              className="animate-fade mt-4 text-sm font-medium text-forest underline-offset-4 transition hover:underline"
            >
              See the read you took before
            </button>
          )}
        </div>
      </Shell>
    )
  }

  // ── The result ─────────────────────────────────────────────────────────────
  if (phase === 'result') {
    const result = buildRead(answers, gender)
    if (!result) return null
    return (
      <Shell onBack={onBack} title="Your read">
        <Result
          result={result}
          subject={subject}
          hasMap={hasMap}
          onAgain={() => begin(true)}
          onAskGuide={onAskGuide}
          onBuildMap={onBuildMap}
        />
      </Shell>
    )
  }

  // ── One question at a time ─────────────────────────────────────────────────
  const q = questions[index]
  const chosen = answers[q.id]
  return (
    <Shell
      onBack={() => (index === 0 ? setPhase('intro') : setIndex(index - 1))}
      title={`${index + 1} of ${questions.length}`}
    >
      <div className="h-1 w-full overflow-hidden rounded-full bg-sand">
        <div
          className="h-full rounded-full bg-forest transition-all duration-500"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div key={q.id} className="animate-rise py-8">
        <h2 className="font-display text-[1.6rem] font-medium leading-snug tracking-tight text-ink text-balance sm:text-[1.85rem]">
          {q.prompt}
        </h2>
        {q.helper && (
          <p className="mt-2.5 text-[0.95rem] leading-relaxed text-muted text-pretty">{q.helper}</p>
        )}
        <div className="mt-7 flex flex-col gap-2.5">
          {q.options.map((opt, i) => (
            <button
              key={opt.id}
              onClick={() => choose(opt.id)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`animate-rise group flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200 ${
                chosen === opt.id
                  ? 'border-forest bg-forest text-cream shadow-lift'
                  : 'border-line bg-white/50 text-ink hover:border-forest/40 hover:bg-white'
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border ${
                  chosen === opt.id
                    ? 'border-gold-soft bg-gold-soft/20'
                    : 'border-line group-hover:border-forest/40'
                }`}
              />
              <span className="min-w-0">
                <span className="block text-[0.98rem] font-medium leading-snug">{opt.label}</span>
                {opt.hint && (
                  <span
                    className={`mt-1 block text-[0.83rem] leading-snug ${
                      chosen === opt.id ? 'text-cream/70' : 'text-muted'
                    }`}
                  >
                    {opt.hint}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Shell>
  )
}

function Shell({
  children,
  onBack,
  title,
}: {
  children: React.ReactNode
  onBack: () => void
  title: string
}) {
  return (
    <div className="min-h-dvh bg-cream pb-16">
      <ScreenHeader onBack={onBack}>
        <p className="font-display text-[1.05rem] font-medium text-ink">{title}</p>
      </ScreenHeader>
      <main className="mx-auto max-w-xl px-6">{children}</main>
    </div>
  )
}

function Result({
  result,
  subject,
  hasMap,
  onAgain,
  onAskGuide,
  onBuildMap,
}: {
  result: ReadResult
  subject: string
  hasMap: boolean
  onAgain: () => void
  onAskGuide: (text: string) => void
  onBuildMap: () => void
}) {
  const [copied, setCopied] = useState(false)

  async function copyWords() {
    try {
      await navigator.clipboard.writeText(result.script.words)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      /* clipboard refused — the words are on screen */
    }
  }

  return (
    <div className="py-8">
      <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold">
        What {subject === 'him' ? 'he' : 'she'} has shown you
      </p>
      <h1 className="animate-rise mt-3 font-display text-[1.85rem] font-medium leading-tight tracking-tight text-ink text-balance">
        {result.headline}
      </h1>
      <p className="animate-rise mt-4 text-[1.02rem] leading-relaxed text-ink-soft text-pretty">
        {result.summary}
      </p>

      {/* The one pattern we decline to coach. Sits above everything else. */}
      {result.caution && (
        <div className="animate-rise mt-6 rounded-card border border-clay/40 bg-clay/[0.07] p-6">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-clay">
            Please read this one twice
          </p>
          <p className="mt-2.5 text-[1rem] leading-relaxed text-ink text-pretty">{result.caution}</p>
        </div>
      )}

      {/* Five things, in words. Never a score on a human being. */}
      <div className="animate-rise mt-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">The five that matter</p>
        <ul className="mt-3.5 flex flex-col">
          {result.dimensions.map((d) => (
            <li
              key={d.dimension}
              className="flex items-center justify-between gap-4 border-b border-line py-2.5 last:border-b-0"
            >
              <span className="text-[0.95rem] text-ink-soft">{d.label}</span>
              <StateTag state={d.state} />
            </li>
          ))}
        </ul>
      </div>

      {result.shown.length > 0 && (
        <Panel title={`What ${subject === 'him' ? 'he' : 'she'} has actually done`}>
          {result.shown.slice(0, 5).map((n) => (
            <Line key={n} text={n} tone="forest" />
          ))}
        </Panel>
      )}
      {result.missing.length > 0 && (
        <Panel title="What is not there">
          {result.missing.slice(0, 5).map((n) => (
            <Line key={n} text={n} tone="clay" />
          ))}
        </Panel>
      )}

      {result.watch && (
        <Panel title="What to watch for over the next month">
          {result.watch.map((w) => (
            <Line key={w} text={w} tone="muted" />
          ))}
        </Panel>
      )}

      {/* The point of the whole instrument. */}
      <div className="animate-rise mt-9 overflow-hidden rounded-card bg-forest-deep text-cream">
        <div className="p-7">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-soft">
            The one question to ask next
          </p>
          {/* We have just told her this is not a question for an app. Leaving a
              script as the last thing she reads would quietly undo that. */}
          {result.caution && (
            <p className="mt-3 text-[0.9rem] leading-relaxed text-gold-soft/90 text-pretty">
              The conversation above comes first. If you do decide to ask him
              something after it, this is the thing worth asking.
            </p>
          )}
          <p className="mt-3 text-[0.95rem] leading-relaxed text-cream/70 text-pretty">
            {result.script.why}
          </p>
          <blockquote className="mt-5 border-l-2 border-gold-soft pl-4">
            <p className="font-display text-[1.22rem] font-medium leading-relaxed text-cream text-pretty">
              “{result.script.words}”
            </p>
          </blockquote>
          <button
            onClick={copyWords}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-cream/30 px-4 py-2 text-[0.85rem] font-medium text-cream transition hover:bg-cream/10"
          >
            {copied ? (
              <>
                <CheckIcon size={13} /> Copied
              </>
            ) : (
              'Copy the words'
            )}
          </button>
          <div className="mt-6 border-t border-cream/15 pt-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold-soft">
              What the answer tells you
            </p>
            <p className="mt-2 text-[0.98rem] leading-relaxed text-cream/85 text-pretty">
              {result.script.tells}
            </p>
          </div>
        </div>
      </div>

      {/* Where she can go from here. */}
      <div className="mt-9 flex flex-col gap-3">
        <button
          onClick={() =>
            onAskGuide(
              `I just did a read on someone. ${result.headline} The thinnest part is ${result.dimensions
                .find((d) => d.dimension === result.thin)
                ?.label.toLowerCase()}. Help me think it through.`,
            )
          }
          className="group flex items-center gap-4 rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
        >
          <span className="flex-1">
            <span className="font-display text-[1.15rem] font-medium text-ink">
              Talk it through with your guide
            </span>
            <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">
              It already knows what this read said. Ask it the thing you did not want to ask a friend.
            </span>
          </span>
          <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
        </button>

        {!hasMap && (
          <button
            onClick={onBuildMap}
            className="group flex items-center gap-4 rounded-card border border-gold/30 bg-gold/[0.07] p-5 text-left transition-all hover:-translate-y-0.5"
          >
            <span className="flex-1">
              <span className="font-display text-[1.15rem] font-medium text-ink">
                Now the other half of it
              </span>
              <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">
                That was about {subject}. Two minutes on you — what you actually need, and what you
                will not compromise on. It makes every read after this one sharper.
              </span>
            </span>
            <ArrowRight className="flex-none text-gold transition-transform group-hover:translate-x-0.5" />
          </button>
        )}

        <button
          onClick={onAgain}
          className="mt-1 self-start text-[0.85rem] font-medium text-muted underline-offset-4 transition hover:text-ink hover:underline"
        >
          Take the read again
        </button>
      </div>

      <p className="mt-8 text-[0.8rem] leading-relaxed text-muted text-pretty">
        This reads what you told us about behaviour over time. It cannot read a
        heart, and it is not a verdict on anyone — including you. Your answers
        stay on this device.
      </p>
    </div>
  )
}

function StateTag({ state }: { state: DimensionState }) {
  const map: Record<DimensionState, { label: string; className: string }> = {
    shown: { label: 'Shown', className: 'bg-forest/10 text-forest' },
    partly: { label: 'Partly', className: 'bg-gold/15 text-gold' },
    'not-yet': { label: 'Not yet', className: 'bg-clay/10 text-clay' },
  }
  const { label, className } = map[state]
  return (
    <span
      className={`flex-none rounded-full px-2.5 py-1 text-[0.72rem] font-semibold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="animate-rise mt-7">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">{title}</p>
      <ul className="mt-3 flex flex-col gap-2">{children}</ul>
    </div>
  )
}

function Line({ text, tone }: { text: string; tone: 'forest' | 'clay' | 'muted' }) {
  const dot =
    tone === 'forest' ? 'bg-forest' : tone === 'clay' ? 'bg-clay' : 'bg-gold'
  return (
    <li className="flex gap-2.5 text-[0.95rem] leading-snug text-ink-soft text-pretty">
      <span className={`mt-[0.5rem] h-1.5 w-1.5 flex-none rounded-full ${dot}`} />
      <span>{text.charAt(0).toUpperCase() + text.slice(1)}</span>
    </li>
  )
}
