import { useState } from 'react'
import type { Answers, Gender, Identity, ReadRecord } from '../types'
import { BEFORE_YES_COUNT, STATES, beforeYesTopics } from '../data/beforeYes'
import { buildBeforeYes, type BeforeYesResult, type TopicReading } from '../lib/beforeYes'
import { somali } from '../data/somali'
import { track } from '../lib/analytics'
import ScriptCard from './ScriptCard'
import InviteRow from './InviteRow'
import { ArrowRight, Button, ScreenHeader } from './ui'

interface Props {
  identity: Identity
  /** Her own map, so "your side" can be read back where it already knows it. */
  answers: Answers
  saved: ReadRecord | null
  onSave: (record: ReadRecord) => void
  onSetGender: (g: Gender) => void
  onAskGuide: (text: string) => void
  onOpenFamilies: () => void
  onBuildMap: () => void
  hasMap: boolean
  onBack: () => void
}

type Phase = 'intro' | 'asking' | 'result'

/**
 * Before you say yes.
 *
 * "We discovered too late that…" — the things that actually break Somali
 * marriages are found out after the families are involved. This asks them in
 * month two, about the real man she is talking to, and records only one thing
 * per conversation: whether the two of them have had it.
 *
 * It never scores him. It never scores them. It hands her the one to open next,
 * and the words.
 */
export default function BeforeYes({
  identity,
  answers,
  saved,
  onSave,
  onSetGender,
  onAskGuide,
  onOpenFamilies,
  onBuildMap,
  hasMap,
  onBack,
}: Props) {
  const [gender, setGender] = useState<Gender | undefined>(identity.gender)
  const [phase, setPhase] = useState<Phase>('intro')
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [index, setIndex] = useState(0)

  const topics = beforeYesTopics(gender ?? 'woman')
  const pronoun = gender === 'man' ? 'her' : 'him'

  function begin() {
    track('before_yes_started')
    setPicked({})
    setIndex(0)
    setPhase('asking')
  }

  function choose(stateId: string) {
    const t = topics[index]
    const next = { ...picked, [t.id]: stateId }
    setPicked(next)
    if (index + 1 < topics.length) {
      setIndex(index + 1)
      return
    }
    const built = buildBeforeYes(next, gender ?? 'woman')
    track('before_yes_completed', { open: built?.open.id, differ: built?.counts.differ })
    onSave({ at: new Date().toISOString(), answers: next })
    setPhase('result')
  }

  if (!gender) {
    return (
      <Shell onBack={onBack} title="Before you say yes">
        <div className="py-10">
          <h1 className="animate-rise font-display text-[1.9rem] font-medium leading-tight tracking-tight text-ink text-balance">
            Before we start — who are you deciding about?
          </h1>
          <p className="animate-rise mt-3 text-[0.98rem] leading-relaxed text-muted text-pretty">
            Only so the questions read properly. We never ask their name.
          </p>
          <div className="mt-7 flex flex-col gap-2.5">
            {([{ id: 'woman' as Gender, label: 'A man' }, { id: 'man' as Gender, label: 'A woman' }]).map((opt, i) => (
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

  if (phase === 'intro') {
    const intro = somali('beforeYes.intro')
    return (
      <Shell onBack={onBack} title="Before you say yes">
        <div className="py-9">
          <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold">About two minutes</p>
          <h1 className="animate-rise mt-4 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.3rem]">
            {intro ?? 'The conversations most of us have too late.'}
          </h1>
          <p className="animate-rise mt-4 text-[1.02rem] leading-relaxed text-ink-soft text-pretty">
            {BEFORE_YES_COUNT === 11 ? 'Eleven' : String(BEFORE_YES_COUNT)} things that decide a Somali
            marriage and almost never get asked before the families are involved — where you’d live,
            money sent home, hooyo in the house, a second wife. For each one you say only whether the
            two of you have talked about it. At the end you get the one to open this week, and the
            words.
          </p>
          <ul className="animate-rise mt-6 flex flex-col gap-2.5 border-l-2 border-gold/40 pl-4">
            {[
              'This does not score anyone. It records which conversations have happened.',
              'We take no position on any of them — qabiil and a second wife included.',
              'You will leave with something you can actually say.',
            ].map((line) => (
              <li key={line} className="text-[0.92rem] leading-snug text-muted text-pretty">{line}</li>
            ))}
          </ul>
          <div className="mt-8">
            <Button onClick={begin} className="group">
              Start
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
          {saved && (
            <button
              onClick={() => {
                setPicked(saved.answers)
                setPhase('result')
              }}
              className="animate-fade mt-4 text-sm font-medium text-forest underline-offset-4 transition hover:underline"
            >
              See where you left it
            </button>
          )}
        </div>
      </Shell>
    )
  }

  if (phase === 'result') {
    const result = buildBeforeYes(picked, gender)
    if (!result) return null
    return (
      <Shell onBack={onBack} title="Before you say yes">
        <Result
          result={result}
          pronoun={pronoun}
          hasMap={hasMap}
          onAgain={begin}
          onAskGuide={onAskGuide}
          onOpenFamilies={onOpenFamilies}
          onBuildMap={onBuildMap}
        />
      </Shell>
    )
  }

  const t = topics[index]
  const chosen = picked[t.id]
  const side = t.yourSide ? t.yourSide.lines[String(answers[t.yourSide.question] ?? '')] : undefined
  return (
    <Shell onBack={() => (index === 0 ? setPhase('intro') : setIndex(index - 1))} title={`${index + 1} of ${topics.length}`}>
      <div className="h-1 w-full overflow-hidden rounded-full bg-sand">
        <div className="h-full rounded-full bg-forest transition-all duration-500" style={{ width: `${((index + 1) / topics.length) * 100}%` }} />
      </div>
      <div key={t.id} className="animate-rise py-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">{t.label}</p>
        <h2 className="mt-2 font-display text-[1.5rem] font-medium leading-snug tracking-tight text-ink text-balance sm:text-[1.75rem]">
          Have the two of you talked about this?
        </h2>
        <p className="mt-2.5 text-[0.98rem] leading-relaxed text-ink-soft text-pretty">{t.prompt}</p>
        {side && (
          <p className="mt-3 rounded-2xl border border-gold/25 bg-gold/[0.07] px-4 py-2.5 text-[0.88rem] leading-snug text-ink-soft text-pretty">
            <span className="font-medium text-ink">Your side, from your map: </span>
            {side}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2.5">
          {STATES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => choose(s.id)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`animate-rise group flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200 ${
                chosen === s.id
                  ? 'border-forest bg-forest text-cream shadow-lift'
                  : 'border-line bg-white/50 text-ink hover:border-forest/40 hover:bg-white'
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border ${
                  chosen === s.id ? 'border-gold-soft bg-gold-soft/20' : 'border-line group-hover:border-forest/40'
                }`}
              />
              <span className="min-w-0">
                <span className="block text-[0.98rem] font-medium leading-snug">{s.label}</span>
                {s.hint && (
                  <span className={`mt-1 block text-[0.83rem] leading-snug ${chosen === s.id ? 'text-cream/70' : 'text-muted'}`}>
                    {s.hint}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-[0.82rem] leading-relaxed text-muted text-pretty">{t.why}</p>
      </div>
    </Shell>
  )
}

function Shell({ children, onBack, title }: { children: React.ReactNode; onBack: () => void; title: string }) {
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
  pronoun,
  hasMap,
  onAgain,
  onAskGuide,
  onOpenFamilies,
  onBuildMap,
}: {
  result: BeforeYesResult
  pronoun: string
  hasMap: boolean
  onAgain: () => void
  onAskGuide: (text: string) => void
  onOpenFamilies: () => void
  onBuildMap: () => void
}) {
  const allAgreed = result.counts.agree === Object.values(result.counts).reduce((a, b) => a + b, 0)
  const title = allAgreed
    ? 'The one to go back over'
    : result.open.state === 'unknown'
      ? 'Start with your own answer'
      : 'The one to open this week'

  return (
    <div className="py-8">
      <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold">The conversations you have had</p>
      <h1 className="animate-rise mt-3 font-display text-[1.85rem] font-medium leading-tight tracking-tight text-ink text-balance">
        {result.headline}
      </h1>
      <p className="animate-rise mt-4 text-[1.02rem] leading-relaxed text-ink-soft text-pretty">{result.summary}</p>

      <List title="Where you don’t agree" items={result.byState.differ} tone="clay" />
      <List title="Not talked about yet" items={result.byState['not-talked']} tone="gold" />
      <List title="Where you don’t know your own answer yet" items={result.byState.unknown} tone="gold" />
      <List title="Talked about, and agreed" items={result.byState.agree} tone="forest" />

      <ScriptCard script={result.open.script} title={title} source="beforeYes" />

      <div className="mt-9 flex flex-col gap-3">
        <button
          onClick={() =>
            onAskGuide(
              `I just went through Before you say yes. ${result.headline} The one to open is ${result.open.label.toLowerCase()}. Help me think about how to raise it with ${pronoun}.`,
            )
          }
          className="group flex items-center gap-4 rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
        >
          <span className="flex-1">
            <span className="font-display text-[1.15rem] font-medium text-ink">Talk it through with your guide</span>
            <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">It already knows which conversations you’ve had.</span>
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
              Telling your wali, the first conversation with hooyo, opening mahr — word for word.
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
              <span className="font-display text-[1.15rem] font-medium text-ink">Now your own map</span>
              <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">
                Two minutes on what you actually need. Your side of these conversations gets clearer.
              </span>
            </span>
            <ArrowRight className="flex-none text-gold transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
        <InviteRow source="beforeYes" gender={pronoun === 'him' ? 'woman' : 'man'} />

        <button onClick={onAgain} className="mt-1 self-start text-[0.85rem] font-medium text-muted underline-offset-4 transition hover:text-ink hover:underline">
          Go through it again
        </button>
      </div>

      <p className="mt-8 text-[0.8rem] leading-relaxed text-muted text-pretty">
        This records which conversations you have had. It takes no position on any of them, and it is
        not a verdict on anyone. Your answers stay on this device.
      </p>
    </div>
  )
}

function List({ title, items, tone }: { title: string; items: TopicReading[]; tone: 'forest' | 'clay' | 'gold' }) {
  if (!items.length) return null
  const dot = tone === 'forest' ? 'bg-forest' : tone === 'clay' ? 'bg-clay' : 'bg-gold'
  return (
    <div className="animate-rise mt-7">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">{title}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((x) => (
          <li key={x.id} className="flex gap-2.5 text-[0.95rem] leading-snug text-ink-soft text-pretty">
            <span className={`mt-[0.5rem] h-1.5 w-1.5 flex-none rounded-full ${dot}`} />
            <span>{x.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
