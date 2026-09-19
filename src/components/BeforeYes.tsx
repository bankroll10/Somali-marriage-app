import { useEffect, useState } from 'react'
import { answeredOf, clearDraft, loadDraft, resumeIndex, saveDraft } from '../lib/draft'
import type { Answers, CoupleState, Gender, Identity, ReadRecord } from '../types'
import { BEFORE_YES_COUNT, STATES, beforeYesTopics } from '../data/beforeYes'
import { buildBeforeYes, type BeforeYesResult, type TopicReading } from '../lib/beforeYes'
import { somali } from '../data/somali'
import { coupleLink, coupleReading, createCouple, readCouple, type CoupleView } from '../lib/couple'
import { shareOrCopy } from '../lib/share'
import { withVia } from '../lib/links'
import { SITE_URL } from '../lib/site'
import { track } from '../lib/analytics'
import ScriptCard from './ScriptCard'
import { familyScriptsLine } from '../data/families'
import InviteRow from './InviteRow'
import ReportConcern from './ReportConcern'
import { ArrowRight, Button, Disclose, ScreenHeader, Words } from './ui'

interface Props {
  identity: Identity
  /** Her own map, so "your side" can be read back where it already knows it. */
  answers: Answers
  saved: ReadRecord | null
  onSave: (record: ReadRecord) => void
  /** The eleven were begun — the denominator for whether they get finished. */
  onBegan: () => void
  onSetGender: (g: Gender) => void
  onAskGuide: (text: string) => void
  onOpenFamilies: () => void
  onBuildMap: () => void
  hasMap: boolean
  /** The two-sided version: the code her pair lives under, once she has asked him. */
  couple: CoupleState | null
  onCouple: (state: CoupleState) => void
  onBack: () => void
  /** Trust, one tap from a public tool (docs/RISKS.md R4). */
  onTrust?: () => void
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
  onBegan,
  onSetGender,
  onAskGuide,
  onOpenFamilies,
  onBuildMap,
  hasMap,
  couple,
  onCouple,
  onBack,
  onTrust,
}: Props) {
  const [gender, setGender] = useState<Gender | undefined>(identity.gender)
  const [phase, setPhase] = useState<Phase>('intro')
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [index, setIndex] = useState(0)
  // A run she was pulled out of. Read on the way in, and nowhere else.
  const [draft] = useState(() => loadDraft('eleven'))

  const topics = beforeYesTopics(gender ?? 'woman')
  const pronoun = gender === 'man' ? 'her' : 'him'
  // Before she has said which side she is on, the copy says "them" rather than
  // guessing at a person it has not been told about.
  const them = gender ? pronoun : 'them'

  function begin() {
    track('before_yes_started')
    onBegan()
    // Starting is starting: a fresh run drops whatever the last one left.
    clearDraft('eleven')
    setPicked({})
    setIndex(0)
    setPhase('asking')
  }

  /** Back in at the first conversation she never answered for. */
  function resume() {
    if (!draft) return
    track('before_yes_started')
    setGender(draft.gender)
    if (!identity.gender) onSetGender(draft.gender)
    onBegan()
    setPicked(draft.answers)
    setIndex(resumeIndex(beforeYesTopics(draft.gender).map((t) => t.id), draft.answers))
    setPhase('asking')
  }

  /**
   * Start, and say who this is about in the same tap.
   *
   * This used to be a screen of its own, asked before the page had said what it
   * was: one blocking decision spent with no reason yet to care. The read had
   * already solved the same problem by carrying the side in its address
   * (src/data/tools.ts) — the eleven's address has no side to carry, so it
   * explains itself first and folds the question into starting, rather than
   * guessing at anybody (docs/VALUE.md).
   */
  function startAbout(g: Gender) {
    setGender(g)
    onSetGender(g)
    begin()
  }

  function choose(stateId: string) {
    const t = topics[index]
    const next = { ...picked, [t.id]: stateId }
    setPicked(next)
    if (index + 1 < topics.length) {
      // Every answer, written down, so leaving costs nothing.
      saveDraft('eleven', next, gender ?? 'woman')
      setIndex(index + 1)
      return
    }
    clearDraft('eleven')
    const built = buildBeforeYes(next, gender ?? 'woman')
    track('before_yes_completed', { open: built?.open.id, differ: built?.counts.differ })
    onSave({ at: new Date().toISOString(), answers: next })
    setPhase('result')
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
          {/* Where she left off, above the explanation she has already read.
              It sat below it at first, which put it 910 px down a 860 px
              screen — a returning person had to scroll past two hundred words
              to get back to the thing she was four answers into. Offered here
              and nowhere else: no badge, no reminder, nothing counting what
              anyone has not finished (docs/FOGG.md). */}
          {draft && (
            <div className="animate-rise mt-6 rounded-card border border-gold/30 bg-gold/[0.07] p-5">
              <Button onClick={resume} className="group">
                Pick up where you left off
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
              <p className="mt-2.5 text-[0.85rem] text-muted">
                You answered {answeredOf(beforeYesTopics(draft.gender).map((t) => t.id), draft.answers)} of{' '}
                {beforeYesTopics(draft.gender).length}.{' '}
                <button
                  onClick={() => (gender ? begin() : startAbout(draft.gender))}
                  className="font-medium text-forest underline-offset-4 hover:underline"
                >
                  Start again instead
                </button>
              </p>
            </div>
          )}
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
              `No account, no sign-in. Your answers stay on this phone unless you keep your map, or ask ${them} to answer too.`,
            ].map((line) => (
              <li key={line} className="text-[0.92rem] leading-snug text-muted text-pretty">{line}</li>
            ))}
          </ul>
          {onTrust && (
            <button
              onClick={onTrust}
              className="animate-rise mt-3 text-[0.85rem] font-medium text-forest underline-offset-4 hover:underline"
            >
              What leaves your phone, and what never does →
            </button>
          )}
          {gender ? (

            <div className="mt-8">
              <Button onClick={begin} className="group">
                Start
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            </div>
          ) : (
            <div className="mt-8">
              <p className="text-[0.88rem] text-muted text-pretty">
                Who are you deciding about? Only so the questions read properly — we never ask their name.
              </p>
              <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                {([{ id: 'woman' as Gender, label: 'Start — about him' }, { id: 'man' as Gender, label: 'Start — about her' }]).map((opt) => (
                  <Button key={opt.id} onClick={() => startAbout(opt.id)} className="group">
                    {opt.label}
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </Button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-8">
            <InviteRow
              source="beforeYes"
              gender={gender}
              title="Share this tool"
              body="The blank eleven, at its own address. Nothing you answer travels with it."
            />
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
          // The same default `topics` above reads under, so the result and its
          // pronouns agree. Only reachable by resuming a saved eleven on a phone
          // that never told us a side; starting always sets one.
          gender={gender ?? 'woman'}
          picked={picked}
          hasMap={hasMap}
          couple={couple}
          onCouple={onCouple}
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
  gender,
  picked,
  hasMap,
  couple,
  onCouple,
  onAgain,
  onAskGuide,
  onOpenFamilies,
  onBuildMap,
}: {
  result: BeforeYesResult
  pronoun: string
  gender: Gender
  picked: Record<string, string>
  hasMap: boolean
  couple: CoupleState | null
  onCouple: (state: CoupleState) => void
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

      <ScriptCard script={result.open.script} title={title} source="beforeYes" travel="eleven" />

      <Together gender={gender} pronoun={pronoun} picked={picked} couple={couple} onCouple={onCouple} />

      {/* Where she can go from here — one thing, and then a disclosure.
          This screen offered eight next actions at once, under one heading,
          at the moment a person has just been told which marriage
          conversations she and he have never had (docs/LOAD.md). The read's
          result had the same problem and was collapsed to three in
          docs/VALUE.md; this is the same shape. Nothing is removed: the
          primary is whichever of the two genuinely comes next, and the rest
          are one tap away, named. */}
      <div className="mt-9 flex flex-col gap-3">
        {!hasMap ? (
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
        ) : (
          <button
            onClick={onOpenFamilies}
            className="group flex items-center gap-4 rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
          >
            <span className="flex-1">
              <span className="font-display text-[1.15rem] font-medium text-ink">The words for your family</span>
              <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">
                {familyScriptsLine(gender ?? 'woman')}
              </span>
            </span>
            <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
          </button>
        )}

        <Disclose summary="More you can do here" hint="Your guide, your family, a friend">
          <div className="flex flex-col gap-3">
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

            {/* The one the primary slot did not take. */}
            {!hasMap ? (
              <button
                onClick={onOpenFamilies}
                className="group flex items-center gap-4 rounded-card border border-line bg-white/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-forest/40"
              >
                <span className="flex-1">
                  <span className="font-display text-[1.15rem] font-medium text-ink">The words for your family</span>
                  <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">
                    {familyScriptsLine(gender ?? 'woman')}
                  </span>
                </span>
                <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : null}

            <InviteRow
              source="beforeYes"
              gender={pronoun === 'him' ? 'woman' : 'man'}
              title={pronoun === 'him' ? 'Send the eleven to a sister who’s deciding' : 'Send the eleven to a brother who’s deciding'}
              body="Whose house, money home, a second wife — which ones they’ve had, and the words for the one that matters. No account."
            />

            <button onClick={onAgain} className="mt-1 self-start text-[0.85rem] font-medium text-muted underline-offset-4 transition hover:text-ink hover:underline">
              Go through it again
            </button>
          </div>
        </Disclose>

        {/* This screen says the eleven, a read, your map and the door. */}
        <Words ids={['eleven', 'read', 'map']} />
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
      {/* A heading. 434 rendered words under one <h1> until 2026-09-18
          (docs/LOAD.md). */}
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted">{title}</h2>
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

/**
 * The two-sided version.
 *
 * Her eleven go up under a code; he opens a link and answers without an
 * account; both then see only where they match. Her side is frozen the moment
 * he answers, his after once — so neither can flip a topic and read the other.
 * The joint here is read from the server, never from her live local answers.
 */
function Together({
  gender,
  pronoun,
  picked,
  couple,
  onCouple,
}: {
  gender: Gender
  pronoun: string
  picked: Record<string, string>
  couple: CoupleState | null
  onCouple: (state: CoupleState) => void
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle')
  const [view, setView] = useState<CoupleView | null>(null)
  const [shared, setShared] = useState(false)
  const he = pronoun === 'him' ? 'he' : 'she'

  useEffect(() => {
    if (!couple) return
    let live = true
    readCouple(couple.code).then((v) => {
      if (live) setView(v)
    })
    return () => {
      live = false
    }
  }, [couple])

  async function share(code: string) {
    const result = await shareOrCopy(
      {
        text: `I’ve been through the eleven conversations on Niyyah — would you do them too? You answer on your own; I never see your answers, only where we match.`,
        url: withVia(coupleLink(code, SITE_URL), 'couple'),
      },
      'couple_shared',
    )
    if (result !== 'cancelled' && result !== 'failed') {
      setShared(true)
      setTimeout(() => setShared(false), 2400)
    }
  }

  async function ask() {
    setState('sending')
    const code = await createCouple(picked, gender)
    if (!code) {
      setState('error')
      return
    }
    track('couple_created')
    onCouple({ code, at: new Date().toISOString() })
    setState('idle')
    void share(code)
  }

  if (couple && view?.status === 'joint') {
    const r = coupleReading(view.joint, gender)
    return (
      <div className="animate-rise mt-9 rounded-card border border-forest/25 bg-forest/[0.05] p-6">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-forest">Where the two of you stand</p>
        <p className="mt-2 font-display text-[1.25rem] font-medium leading-snug tracking-tight text-ink text-balance">{r.headline}</p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {r.lines.map((l) => (
            <li key={l.id} className="flex gap-2.5 text-[0.95rem] leading-snug text-ink-soft text-pretty">
              <span className={`mt-[0.5rem] h-1.5 w-1.5 flex-none rounded-full ${l.kind === 'both-agree' ? 'bg-forest' : l.kind === 'one-thinks-talked' || l.kind === 'differ-somewhere' ? 'bg-clay' : 'bg-gold'}`} />
              <span>{l.line}</span>
            </li>
          ))}
        </ul>
        {r.open && <ScriptCard script={r.open.script} title="The one to open together" source="couple" travel="couple" />}
        <p className="mt-4 text-[0.8rem] leading-relaxed text-muted text-pretty">
          {he === 'he' ? 'He' : 'She'} saw this same list, and nothing else. Your answers were frozen the moment {he} answered; {he === 'he' ? 'his' : 'hers'} were sent once.
        </p>
        <ReportConcern code={couple.code} side={gender} />
      </div>
    )
  }

  return (
    <div className="animate-rise mt-9 rounded-card border border-gold/30 bg-gold/[0.07] p-6">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold">
        {couple ? `Waiting for ${pronoun}` : `Ask ${pronoun} to do this too`}
      </p>
      <p className="mt-2 font-display text-[1.25rem] font-medium leading-snug tracking-tight text-ink text-balance">
        {couple ? `${he === 'he' ? 'He' : 'She'} hasn’t answered yet.` : 'See where the two of you actually stand.'}
      </p>
      <p className="mt-2.5 text-[0.92rem] leading-relaxed text-muted text-pretty">
        {couple
          ? `When ${he} does, you both see only where you match — and where one of you thinks a conversation happened and the other doesn’t. Send the link again if it got lost.`
          : `Send ${pronoun} a link. ${he === 'he' ? 'He' : 'She'} answers the same eleven on ${he === 'he' ? 'his' : 'her'} own — no account, no name — and ${he} never sees your answers. Neither of you sees the other’s. You both see only where you match, and which conversation one of you thinks you’ve had that the other doesn’t.`}
      </p>
      <button
        onClick={() => (couple ? share(couple.code) : ask())}
        disabled={state === 'sending'}
        className="group mt-4 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-[0.9rem] font-medium text-cream transition hover:bg-forest-deep disabled:opacity-50"
      >
        {state === 'sending' ? 'One moment…' : shared ? 'Link ready to send' : couple ? 'Send the link again' : `Ask ${pronoun}`}
        {state !== 'sending' && <ArrowRight className="transition-transform group-hover:translate-x-0.5" />}
      </button>
      {state === 'error' && (
        <p className="mt-3 text-[0.85rem] text-clay text-pretty">That didn’t go through — nothing is lost. Try again in a moment.</p>
      )}
      <p className="mt-3 text-[0.78rem] leading-relaxed text-muted text-pretty">
        Your eleven answers go to our server under a code with no name on it, and are frozen the moment {he} answers. The link lasts ninety days.
      </p>
    </div>
  )
}
