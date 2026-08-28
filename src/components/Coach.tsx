import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { Answers, CoachMessage, Identity, ModeId } from '../types'
import { getMode, modes, defaultModeFor, type CoachContext } from '../data/coach'
import { askCoach } from '../lib/coach'
import { FREE_REPLIES } from '../data/plus'
import { nextId } from '../lib/id'
import {
  ArrowRight,
  BackButton,
  CrescentGlyph,
  HeartGlyph,
  PenGlyph,
  PeopleGlyph,
  ScreenHeader,
  SeedGlyph,
  SparkGlyph,
  TypingDots,
  fieldClass,
} from './ui'

/** Mode glyphs are stroke icons, never emoji. */
function ModeGlyph({ id, className }: { id: string; className?: string }) {
  switch (id) {
    case 'people':
      return <PeopleGlyph className={className} />
    case 'heart':
      return <HeartGlyph className={className} />
    case 'crescent':
      return <CrescentGlyph className={className} />
    case 'spark':
      return <SparkGlyph className={className} />
    case 'pen':
      return <PenGlyph className={className} />
    default:
      return <SeedGlyph className={className} />
  }
}

type Threads = Partial<Record<ModeId, CoachMessage[]>>

interface Props {
  identity: Identity
  answers: Answers
  /** Live app state — the guide knows who you're connected with. */
  matchedNames: string[]
  pendingNames: string[]
  passedIds: string[]
  /** Threads live in app state so the guide remembers across navigation. */
  threads: Threads
  onThreadsChange: Dispatch<SetStateAction<Threads>>
  /** Continuity from today's check-in — woven into the greeting. */
  moodLine?: string
  /** Open straight into a voice — used when the map hands over a topic. */
  initialMode?: ModeId | null
  /** A question captured on Home, asked automatically on arrival. */
  initialAsk?: { text: string; why: string } | null
  onAskConsumed?: () => void
  /** Niyyah+ state. Members have no counter; everyone else can see theirs. */
  plusActive: boolean
  repliesLeft: number
  onSpendReply: () => void
  onOpenPlus: () => void
  onBack: () => void
}

// Accents stay inside the brand palette — no foreign hues.
const accentText: Record<string, string> = {
  gold: 'text-gold',
  forest: 'text-forest',
  clay: 'text-clay',
  sky: 'text-forest-soft',
}
const accentSoft: Record<string, string> = {
  gold: 'bg-gold/10',
  forest: 'bg-forest/10',
  clay: 'bg-clay/10',
  sky: 'bg-forest-soft/10',
}

export default function Coach({
  identity,
  answers,
  matchedNames,
  pendingNames,
  passedIds,
  threads,
  onThreadsChange: setThreads,
  moodLine,
  initialMode,
  initialAsk,
  onAskConsumed,
  plusActive,
  repliesLeft,
  onSpendReply,
  onOpenPlus,
  onBack,
}: Props) {
  const ctx: CoachContext = {
    identity,
    answers,
    social: { matchedNames, pendingNames, passedIds },
  }
  const [mode, setMode] = useState<ModeId | null>(initialMode ?? null)
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  // Next actions offered after the latest reply — the thread never dead-ends.
  const [followUps, setFollowUps] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  const messages = mode ? threads[mode] ?? [] : []
  const activeMode = mode ? getMode(mode) : null
  const showStarters = !!activeMode && messages.length <= 1 && !thinking

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  // A question asked from Home arrives already typed: seed the voice's greeting
  // if this is a first meeting, then send it. The ref guards against React's
  // double-invoked effects sending it twice.
  const askFired = useRef(false)
  const [askedWhy, setAskedWhy] = useState<string | null>(null)
  useEffect(() => {
    if (!initialAsk || !mode || askFired.current) return
    askFired.current = true
    setAskedWhy(initialAsk.why || null)
    setThreads((prev) => {
      if (prev[mode]) return prev
      const greeting = getMode(mode).greeting(ctx) + (moodLine ? `\n\n${moodLine}` : '')
      return { ...prev, [mode]: [{ id: nextId(), role: 'coach', text: greeting }] }
    })
    void send(initialAsk.text)
    onAskConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAsk, mode])

  function openMode(id: ModeId) {
    setMode(id)
    setInput('')
    setFollowUps([])
    setThreads((prev) => {
      if (prev[id]) return prev
      const greeting = getMode(id).greeting(ctx) + (moodLine ? `\n\n${moodLine}` : '')
      return { ...prev, [id]: [{ id: nextId(), role: 'coach', text: greeting }] }
    })
  }

  // Out of allowance. The word "locked" is doing real work here: nothing that
  // already exists is taken away — every past conversation stays readable, and
  // the wall renders under the last answer rather than over it.
  const locked = !plusActive && repliesLeft <= 0

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || thinking || !mode || locked) return
    onSpendReply()
    const userMsg: CoachMessage = { id: nextId(), role: 'user', text: trimmed }
    setThreads((prev) => ({ ...prev, [mode]: [...(prev[mode] ?? []), userMsg] }))
    setInput('')
    setFollowUps([])
    setThinking(true)
    // The thread so far, so the live guide picks up mid-conversation instead of
    // meeting them fresh on every message.
    const reply = await askCoach(trimmed, ctx, mode, threads[mode] ?? [])
    setThreads((prev) => ({
      ...prev,
      [mode]: [...(prev[mode] ?? []), { id: nextId(), role: 'coach', text: reply.text }],
    }))
    setFollowUps(reply.followUps)
    setThinking(false)
  }

  // ── Mode picker ────────────────────────────────────────────────────────────
  if (!activeMode) {
    const recommended = defaultModeFor(identity.gender)
    return (
      <div className="min-h-dvh bg-cream">
        <ScreenHeader onBack={onBack}>
          <p className="font-display text-[1.05rem] font-medium text-ink">Your guide</p>
        </ScreenHeader>

        <div className="mx-auto max-w-2xl px-5 py-9">
          <p className="animate-fade text-xs font-medium uppercase tracking-[0.22em] text-gold">
            Choose your guide
          </p>
          <h1 className="animate-rise mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
            Six guides. One you.
          </h1>
          <p className="animate-rise mt-3 max-w-md text-[1.02rem] leading-relaxed text-ink-soft text-pretty">
            Different moments need different wisdom. Pick the voice you need right
            now — you can switch any time.
          </p>

          <div className="mt-8 grid gap-3.5 sm:grid-cols-2">
            {modes.map((m, i) => (
              <button
                key={m.id}
                onClick={() => openMode(m.id)}
                style={{ animationDelay: `${i * 50}ms` }}
                className="animate-rise group flex items-start gap-4 rounded-card border border-line bg-white/50 p-5 text-left transition-all duration-200 hover:border-forest/40 hover:bg-white hover:-translate-y-0.5"
              >
                <span
                  className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl ${accentSoft[m.accent]} ${accentText[m.accent]}`}
                >
                  <ModeGlyph id={m.glyph} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-display text-[1.15rem] font-medium text-ink">{m.label}</span>
                    {m.id === recommended && (
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide text-gold">
                        For you
                      </span>
                    )}
                  </span>
                  <span className={`mt-0.5 block text-[0.82rem] font-medium ${accentText[m.accent]}`}>
                    {m.tagline}
                  </span>
                  <span className="mt-1.5 block text-[0.88rem] leading-snug text-muted text-pretty">
                    {m.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-dvh flex-col bg-cream">
      <header className="flex flex-none items-center gap-3 border-b border-line/70 bg-cream/85 px-5 py-3 backdrop-blur-md">
        <BackButton onClick={() => setMode(null)} label="Switch guide" />
        <span
          className={`flex h-10 w-10 flex-none items-center justify-center rounded-2xl ${accentSoft[activeMode.accent]} ${accentText[activeMode.accent]}`}
        >
          <ModeGlyph id={activeMode.glyph} />
        </span>
        <div className="flex-1">
          <p className="font-display text-[1.05rem] font-medium leading-tight text-ink">
            {activeMode.label}
          </p>
          <p className="text-[0.78rem] text-muted">{activeMode.tagline} · private</p>
          {/* Shown from halfway, not from the first message. A counter that's
              always on your screen is a pressure gauge; one that appears when it
              starts to matter is just honesty. */}
          {!plusActive && repliesLeft <= FREE_REPLIES / 2 && repliesLeft > 0 && (
            <button
              onClick={onOpenPlus}
              className="text-[0.75rem] text-gold underline-offset-4 hover:underline"
            >
              {repliesLeft} {repliesLeft === 1 ? 'reply' : 'replies'} left this month
            </button>
          )}
        </div>
        <button
          onClick={() => setMode(null)}
          className="rounded-full border border-line px-3 py-1.5 text-[0.78rem] font-medium text-ink-soft transition hover:bg-sand"
        >
          Switch
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div
          role="log"
          aria-live="polite"
          aria-label={`Conversation with ${activeMode.label}`}
          className="mx-auto flex max-w-xl flex-col gap-5 px-5 py-7"
        >
          {/* Why this voice. Routing you didn't ask for has to be legible, and
              reversible in one tap — otherwise it's just the app deciding. */}
          {askedWhy && (
            <p className="animate-fade text-center text-[0.8rem] text-muted text-pretty">
              <span className="font-medium text-ink-soft">{activeMode.label}</span> — {askedWhy}.{' '}
              <button
                onClick={() => setMode(null)}
                className="font-medium text-forest underline-offset-4 hover:underline"
              >
                Switch
              </button>{' '}
              if that’s not it.
            </p>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} glyph={activeMode.glyph} accent={activeMode.accent} />
          ))}
          {thinking && <Thinking glyph={activeMode.glyph} accent={activeMode.accent} />}

          {!thinking && followUps.length > 0 && (
            <div className="animate-fade flex flex-wrap gap-2 pl-12">
              {followUps.map((f) => (
                <button
                  key={f}
                  onClick={() => send(f)}
                  className="rounded-full border border-line bg-white/60 px-3.5 py-1.5 text-[0.85rem] font-medium text-ink-soft transition hover:border-forest/40 hover:text-ink"
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {/* The wall lives in the thread, below the answer she just got — never
              a sheet over the top of it. Whatever she came here for, she keeps. */}
          {locked && (
            <div className="animate-rise mt-2 rounded-card border border-gold/30 bg-gold/[0.07] p-6">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold">
                That’s this month’s {FREE_REPLIES} replies
              </p>
              <p className="mt-2.5 font-display text-[1.3rem] font-medium leading-snug tracking-tight text-ink text-balance">
                Your guide will be here on the 1st.
              </p>
              <p className="mt-2.5 text-[0.92rem] leading-relaxed text-muted text-pretty">
                Every conversation above stays yours to re-read, and everything
                else in Niyyah is untouched — your map, your work, your
                protections, and answering anyone who’s serious about you.
              </p>
              <p className="mt-2.5 text-[0.92rem] leading-relaxed text-muted text-pretty">
                Niyyah+ lifts the counter. Seven days free, and we don’t take a
                card to start it.
              </p>
              <button
                onClick={onOpenPlus}
                className="group mt-4 inline-flex items-center gap-1.5 rounded-full bg-forest px-5 py-2.5 text-[0.88rem] font-medium text-cream transition hover:bg-forest-deep"
              >
                See what Niyyah+ is
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          )}

          {showStarters && !locked && (
            <div className="mt-2 animate-fade">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted">
                Or start here
              </p>
              <div className="flex flex-col gap-2.5">
                {activeMode.starters.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => send(s.prompt)}
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/60 px-4 py-3 text-left text-[0.95rem] font-medium text-ink transition-all hover:border-forest/40 hover:bg-white"
                  >
                    {s.label}
                    <span className={`${accentText[activeMode.accent]} transition-transform group-hover:translate-x-0.5`}>→</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-none border-t border-line/70 bg-cream/90 backdrop-blur-md">
        {locked ? (
          <div className="mx-auto max-w-xl px-5 py-4 text-center">
            <p className="text-[0.85rem] text-muted text-pretty">
              Your replies come back on the 1st — or start seven free days, no card.
            </p>
          </div>
        ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="mx-auto flex max-w-xl items-end gap-2.5 px-5 py-4"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            rows={1}
            placeholder={`Tell your ${activeMode.label.toLowerCase()} what’s going on…`}
            className={`max-h-32 min-h-[3rem] flex-1 resize-none bg-white/70 px-4 py-3 text-[1rem] leading-relaxed ${fieldClass}`}
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            aria-label="Send"
            className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-forest text-cream transition-all hover:bg-forest-deep disabled:opacity-30"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
        )}
      </div>
    </div>
  )
}

function ModeMark({ glyph, accent }: { glyph: string; accent: string }) {
  return (
    <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-full ${accentSoft[accent]} ${accentText[accent]}`}>
      <ModeGlyph id={glyph} className="h-[18px] w-[18px]" />
    </span>
  )
}

function MessageBubble({ message, glyph, accent }: { message: CoachMessage; glyph: string; accent: string }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] animate-rise rounded-2xl rounded-br-md bg-forest px-4 py-3 text-[0.98rem] leading-relaxed text-cream">
          {message.text}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3">
      <ModeMark glyph={glyph} accent={accent} />
      <div className="max-w-[85%] animate-rise rounded-2xl rounded-tl-md border border-line bg-white/70 px-4 py-3.5 text-[0.98rem] leading-relaxed text-ink-soft">
        <RichText text={message.text} />
      </div>
    </div>
  )
}

function Thinking({ glyph, accent }: { glyph: string; accent: string }) {
  return (
    <div className="flex items-start gap-3">
      <ModeMark glyph={glyph} accent={accent} />
      <div className="animate-fade rounded-2xl rounded-tl-md border border-line bg-white/70 px-4 py-4">
        <TypingDots />
      </div>
    </div>
  )
}

/** Renders inline *emphasis* and **bold** as a subtle highlight. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i} className="font-medium not-italic text-ink">{part.slice(1, -1)}</em>
    }
    return <span key={i}>{part}</span>
  })
}

/** A suggested script — quoted words the user can copy and send. */
function ScriptCard({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  // The card holds ONLY the words inside the quotes; commentary follows below.
  const body = text.replace(/^Try:\s*/i, '')
  const match = body.match(/^[“"]([\s\S]*?)[”"]\s*([\s\S]*)$/)
  const script = (match ? match[1] : body).trim()
  const commentary = match ? match[2].trim() : ''
  return (
    <>
      <div className="mt-2 rounded-xl border border-gold/30 bg-gold/[0.08] p-3.5">
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-gold">
          Words you could use
        </p>
        <p className="mt-1.5 font-display text-[1.02rem] leading-relaxed text-ink">“{script}”</p>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(script).catch(() => {})
            setCopied(true)
            window.setTimeout(() => setCopied(false), 2000)
          }}
          className="mt-2 text-[0.8rem] font-medium text-forest underline-offset-4 hover:underline"
        >
          {copied ? '✓ Copied — make it yours before you send it' : 'Copy'}
        </button>
      </div>
      {commentary && <p className="mt-3 text-pretty">{commentary}</p>}
    </>
  )
}

/** Renders coach text: paragraphs separated by blank lines, with "• " bullets. */
function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/)
  return (
    <>
      {blocks.map((block, bi) => {
        if (/^Try:/i.test(block.trim())) return <ScriptCard key={bi} text={block.trim()} />
        const lines = block.split('\n')
        const leading = lines.filter((l) => !l.trim().startsWith('•'))
        const bullets = lines.filter((l) => l.trim().startsWith('•'))
        return (
          <div key={bi} className={bi > 0 ? 'mt-3' : ''}>
            {leading.length > 0 && <p className="text-pretty">{inline(leading.join(' '))}</p>}
            {bullets.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {bullets.map((b, i) => (
                  <li key={i} className="flex gap-2.5 text-pretty">
                    <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold" />
                    <span>{inline(b.replace(/^\s*•\s*/, ''))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </>
  )
}
