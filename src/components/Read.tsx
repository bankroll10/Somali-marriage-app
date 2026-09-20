import { useState } from 'react'
import { answeredOf, clearDraft, loadDraft, resumeIndex, saveDraft } from '../lib/draft'
import type { Gender, Identity, ReadRecord } from '../types'
import { EXAMPLE_ANSWERS, readQuestions } from '../data/read'
import { buildRead, type DimensionState, type ReadResult } from '../lib/read'
import { track } from '../lib/analytics'
import ScriptCard from './ScriptCard'
import { familyScriptsLine } from '../data/families'
import InviteRow from './InviteRow'
import { ArrowRight, Button, Disclose, ScreenHeader, TextButton, Words , NotSaving} from './ui'

interface Props {
  identity: Identity
  /** False when this browser refuses to persist — the draft on this screen will not survive the tab. */
  saveOk?: boolean
  /** Her last read, if she has taken one — offered rather than reopened. */
  saved: ReadRecord | null
  onSave: (record: ReadRecord) => void
  /** Learned here when she arrives without onboarding. */
  onSetGender: (g: Gender) => void
  /**
   * The reader's side when the address said who the read is about
   * (`/tools/is-he-serious`), so the chooser is not asked twice. Never used
   * over a side she has already told us; committed to identity when she
   * starts, not on arrival.
   */
  presetGender?: Gender
  /** The read was begun — the denominator for whether it gets finished. */
  onBegan: () => void
  /** Talk the result through in the voice best suited to it. */
  onAskGuide: (text: string) => void
  /** Offered after the result — never before it. */
  onBuildMap: () => void
  hasMap: boolean
  onOpenFamilies: () => void
  /** The eleven — and, from there, asking them to answer their own side. */
  onOpenBeforeYes: () => void
  onBack: () => void
  /** What leaves the phone and what never does — Trust, one tap from a public tool (docs/RISKS.md R4). */
  onTrust?: () => void
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
 * Deliberately reachable without the intake. Making a woman answer sixteen
 * questions about herself before we will help her with tonight is the toll gate
 * this product kept mistaking for an onboarding.
 *
 * We never ask his name. There is no person stored here, only a pattern.
 */
export default function Read({
  identity,
  saved,
  onSave,
  onBegan,
  onSetGender,
  presetGender,
  onAskGuide,
  onBuildMap,
  hasMap,
  onOpenFamilies,
  onOpenBeforeYes,
  onBack,
  onTrust,
  saveOk = true,
}: Props) {
  const [gender, setGender] = useState<Gender | undefined>(identity.gender ?? presetGender)
  // The address guessed who she is. Say so, and let her correct it in one tap.
  const guessed = !identity.gender && !!presetGender
  const [phase, setPhase] = useState<Phase>('intro')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [index, setIndex] = useState(0)
  // Answers from a run she was pulled out of. Read once, on the way in, and
  // never mentioned anywhere else — see src/lib/draft.ts for why.
  const [draft] = useState(() => loadDraft('read'))

  const questions = readQuestions(gender ?? 'woman')
  const subject = gender === 'man' ? 'her' : 'him'
  /** The subject pronoun. Kept apart from `subject` — "what him has done" read
      as broken English in both directions, on the very first screen. */
  const they = gender === 'man' ? 'she' : 'he'

  function begin(fresh: boolean) {
    track('read_started', { again: !fresh })
    // A side the address supplied becomes hers on the same act the chooser
    // would have committed it — starting — never on page load.
    if (!identity.gender && gender) onSetGender(gender)
    onBegan()
    // Starting is starting: a fresh run drops whatever the last one left.
    clearDraft('read')
    setAnswers(fresh ? {} : (saved?.answers ?? {}))
    setIndex(0)
    setPhase('asking')
  }

  /** Back in at the first question she never answered. */
  function resume() {
    if (!draft) return
    track('read_started', { again: false })
    if (!identity.gender && draft.gender) onSetGender(draft.gender)
    setGender(draft.gender)
    onBegan()
    setAnswers(draft.answers)
    setIndex(resumeIndex(readQuestions(draft.gender).map((q) => q.id), draft.answers))
    setPhase('asking')
  }

  function choose(optionId: string) {
    const q = questions[index]
    const next = { ...answers, [q.id]: optionId }
    setAnswers(next)
    if (index + 1 < questions.length) {
      // Every answer, written down, so leaving costs nothing.
      saveDraft('read', next, gender ?? 'woman')
      setIndex(index + 1)
      return
    }
    clearDraft('read')
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
{!saveOk && <NotSaving what="your answers" className="mb-6" />}
          <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold">
            About ninety seconds
          </p>
          <h1 className="animate-rise mt-4 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.3rem]">
            Is {they} serious?
          </h1>
          {/* Where she left off, above the explanation she has already read —
              she was one tap from the thing she came for, and the product used
              to throw every answer away (docs/FOGG.md). Offered here and
              nowhere else: no badge, no reminder, nothing that counts the
              things anybody has not finished. */}
          {draft && (
            <div className="animate-rise mt-6 rounded-card border border-gold/30 bg-gold/[0.07] p-5">
              <Button onClick={resume} className="group">
                Pick up where you left off
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
              <p className="mt-2.5 text-[0.85rem] text-muted">
                You answered {answeredOf(readQuestions(draft.gender).map((q) => q.id), draft.answers)} of{' '}
                {readQuestions(draft.gender).length}.{' '}
                <button
                  onClick={() => begin(true)}
                  className="font-medium text-forest underline-offset-4 hover:underline"
                >
                  Start again instead
                </button>
              </p>
            </div>
          )}
          <p className="animate-rise mt-4 text-[1.02rem] leading-relaxed text-ink-soft text-pretty">
 Eleven questions about what {they} has <em>done</em> — not
            how you feel, and not what {they} has
            promised. At the end you get a read and the one question worth
            asking {subject} next, word for word.
          </p>
          {guessed && (
            <p className="animate-fade mt-3 text-[0.88rem] text-muted">
              Reading about {gender === 'man' ? 'a woman' : 'a man'}.{' '}
              <button
                onClick={() => setGender(gender === 'man' ? 'woman' : 'man')}
                className="font-medium text-forest underline-offset-4 hover:underline"
              >
                Reading about {gender === 'man' ? 'a man' : 'a woman'} instead?
              </button>
            </p>
          )}

          <ul className="animate-rise mt-6 flex flex-col gap-2.5 border-l-2 border-gold/40 pl-4">
            {[
              'We never ask their name, and we will not tell you what kind of person they are. We have not met them.',
              'No account. Your answers stay on this phone unless you keep your map.',
            ].map((line) => (
              <li key={line} className="text-[0.92rem] leading-snug text-muted text-pretty">
                {line}
              </li>
            ))}
          </ul>
          {onTrust && (
            <TextButton
              onClick={onTrust}
              className="animate-rise mt-3 text-[0.85rem] font-medium text-forest hover:underline"
            >
              What leaves your phone, and what never does →
            </TextButton>
          )}

          <div className="mt-8">
            <Button onClick={() => begin(true)} className="group">
              Start the read
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>

          <Example gender={gender ?? 'woman'} subject={subject} />

          <div className="mt-8">
            <InviteRow
              source="read"
              gender={gender}
              title="Share this tool"
              body="The blank read, at its own address. Nothing you answer travels with it."
            />
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
          onOpenFamilies={onOpenFamilies}
          onOpenBeforeYes={onOpenBeforeYes}
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
    <div className="min-h-dvh bg-cream pb-16 pt-safe">
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
  onOpenFamilies,
  onOpenBeforeYes,
}: {
  result: ReadResult
  subject: string
  hasMap: boolean
  onAgain: () => void
  onAskGuide: (text: string) => void
  onBuildMap: () => void
  onOpenFamilies: () => void
  onOpenBeforeYes: () => void
}) {
  const they = subject === 'him' ? 'he' : 'she'
  return (
    <div className="py-8">
      <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold">
        What {they} has shown you
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
          <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-clay">
            Please read this one twice
          </h2>
          <p className="mt-2.5 text-[1rem] leading-relaxed text-ink text-pretty">{result.caution}</p>
        </div>
      )}

      {/* Five things, in words. Never a score on a human being. */}
      <div className="animate-rise mt-8">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted">The five that matter</h2>
        <ul className="mt-3.5 flex flex-col">
          {result.dimensions.map((d) => (
            <li
              key={d.dimension}
              className="flex items-center justify-between gap-4 border-b border-line py-2.5 last:border-b-0"
            >
              <span className="min-w-0 flex-1 text-[0.95rem] text-ink-soft">{d.label}</span>
              <StateTag state={d.state} />
            </li>
          ))}
        </ul>
      </div>

      {result.shown.length > 0 && (
 <Panel title={`What ${subject === 'him' ? 'he' : 'she'} has done`}>
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
      <ScriptCard
        script={result.script}
        title="The one question to ask next"
        source="read"
        travel="read"
        preface={
          result.caution
            ? `The conversation above comes first. If you do decide to ask ${subject} something after it, this is the thing worth asking.`
            : undefined
        }
      />

      {/* Where she can go from here. Two things above the fold — the words to
          send, in the card above, and the eleven — and the rest behind one
          disclosure. This screen carried eight calls to action and nearly six
          hundred words before anyone outside the founder had reached it
          (docs/RISKS.md R2). */}
      <div className="mt-9 flex flex-col gap-3">
        {/* The natural next thing after being told what {they} has not shown:
            the eleven, and from there the two-sided version {they} answers. */}
        <button
          onClick={onOpenBeforeYes}
          className="group flex items-center gap-4 rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
        >
          <span className="flex-1">
            <span className="font-display text-[1.15rem] font-medium text-ink">
              Before you say yes
            </span>
            <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">
              Eleven conversations most couples have too late. You can send them to
              {' '}{subject} too — {they} answers on {subject === 'him' ? 'his' : 'her'} own phone, and
              neither of you sees the other’s answers, only where you match.
            </span>
          </span>
          <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
        </button>

        {/* The chevron affordance this screen worked out by hand is now
            `<Disclose>` in ui.tsx, used by every screen (docs/LOAD.md). */}
        <Disclose summary="More you can do here" hint="Your guide, your family, a friend" divided={false}>
          <div className="flex flex-col gap-3">
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


          <button
            onClick={onOpenFamilies}
            className="group flex items-center gap-4 rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
          >
            <span className="flex-1">
              <span className="font-display text-[1.15rem] font-medium text-ink">The words for your family</span>
              <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">
                {familyScriptsLine(subject === 'him' ? 'woman' : 'man')}
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
 That was about {subject}. Two minutes on you — what you need, and what you
                  will not compromise on. It makes every read after this one sharper.
                </span>
              </span>
              <ArrowRight className="flex-none text-gold transition-transform group-hover:translate-x-0.5" />
            </button>
          )}

          <InviteRow source="read" gender={subject === 'him' ? 'woman' : 'man'} />

          <TextButton
            onClick={onAgain}
            className="mt-1 self-start text-[0.85rem] font-medium text-muted hover:text-ink hover:underline"
          >
            Take the read again
          </TextButton>
          </div>
        </Disclose>

        {/* This screen says a read, thin, the eleven and your map — and the
            definitions of all four lived on a different screen. */}
        <Words ids={['read', 'thin', 'eleven', 'map']} />
      </div>

      <p className="mt-8 text-[0.8rem] leading-relaxed text-muted text-pretty">
        This reads what you told us about behaviour over time. It cannot read a
        heart, and it is not a verdict on anyone — including you. Your answers
        stay on this device.
      </p>
    </div>
  )
}

/**
 * One worked result, so a stranger knows what she is about to get before she
 * gives it ninety seconds. Built by the real engine from a fixed, made-up set
 * of answers (src/data/read.ts), so it can never promise something the read
 * would not say — and labelled as an example, because a result about nobody
 * must not read as a result about someone.
 */
function Example({ gender, subject }: { gender: Gender; subject: string }) {
  const example = buildRead(EXAMPLE_ANSWERS, gender)
  if (!example) return null
  const unresolved = example.dimensions.find((d) => d.dimension === example.thin)?.label
  return (
    <Disclose summary="See an example result" hint="What you get at the end" className="animate-fade mt-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
          An example, not a verdict
        </p>
        <p className="mt-1 text-[0.85rem] leading-snug text-muted text-pretty">
          One possible read, from made-up answers about nobody. Yours will be built the same way,
          from what you say {subject === 'him' ? 'he' : 'she'} has done.
        </p>
        <dl className="mt-4 flex flex-col gap-3.5">
          <div>
            <dt className="text-[0.8rem] font-medium uppercase tracking-wide text-muted">What was reported</dt>
            <dd className="mt-1 text-[0.95rem] leading-snug text-ink text-pretty">
              {example.shown.slice(0, 2).map((s, i) => (
                <span key={s}>
                  {i > 0 && ' '}
                  {s.charAt(0).toUpperCase() + s.slice(1)}.
                </span>
              ))}
            </dd>
          </div>
          <div>
            <dt className="text-[0.8rem] font-medium uppercase tracking-wide text-muted">What is still unresolved</dt>
            <dd className="mt-1 text-[0.95rem] leading-snug text-ink text-pretty">{unresolved}</dd>
          </div>
          <div>
            <dt className="text-[0.8rem] font-medium uppercase tracking-wide text-muted">The next question</dt>
            <dd className="mt-1 border-l-2 border-gold/40 pl-3 text-[0.95rem] italic leading-snug text-ink text-pretty">
              “{example.script.words}”
            </dd>
          </div>
        </dl>
      </div>
    </Disclose>
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
      {/* A heading, not a styled paragraph. This screen carried 483 rendered
          words under a single <h1> — the heaviest thing a person reads here
          arriving as one undifferentiated column (docs/LOAD.md). */}
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted">{title}</h2>
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
