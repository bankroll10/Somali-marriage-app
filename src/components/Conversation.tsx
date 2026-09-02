import { useEffect, useRef, useState } from 'react'
import type { ConvMessage } from '../types'
import type { Candidate } from '../data/candidates'
import { candidateReply, guidedPrompts, guideTip, opener } from '../data/conversation'
import { nextId } from '../lib/id'
import { BackButton, InitialAvatar, SeedGlyph, TypingDots, fieldClass } from './ui'

interface Props {
  candidate: Candidate
  userName?: string
  waliEligible: boolean
  messages: ConvMessage[]
  /** "What stood out" chosen when expressing interest — anchors the opening. */
  note?: string
  onAppend: (msgs: ConvMessage[]) => void
  onReport: () => void
  onBack: () => void
}

export default function Conversation({
  candidate,
  userName,
  waliEligible,
  messages,
  note,
  onAppend,
  onReport,
  onBack,
}: Props) {
  const [input, setInput] = useState('')
  const [confirmReport, setConfirmReport] = useState(false)
  const [typing, setTyping] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const seeded = useRef(false)

  const familyInvited = messages.some((m) => m.from === 'system')

  // Seed the opener once.
  useEffect(() => {
    if (!seeded.current && messages.length === 0) {
      seeded.current = true
      onAppend([{ id: nextId(), from: 'them', text: opener(candidate, userName) }])
    }
  }, [messages.length, candidate, userName, onAppend])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing, guideOpen])

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || typing) return
    onAppend([{ id: nextId(), from: 'me', text: trimmed }])
    setInput('')
    setGuideOpen(false)
    setTyping(true)
    window.setTimeout(
      () => {
        onAppend([{ id: nextId(), from: 'them', text: candidateReply(candidate, trimmed, userName) }])
        setTyping(false)
      },
      // People don't reply in under a second — pacing carries the realism.
      1700 + Math.random() * 1500,
    )
  }

  function involveFamily() {
    if (familyInvited) return
    onAppend([
      {
        id: nextId(),
        from: 'system',
        text: `You invited your wali to oversee this conversation. ${candidate.name} welcomes it — this is now a family-aware connection.`,
      },
    ])
  }

  const showPrompts = guideOpen || messages.length <= 1

  return (
    <div className="flex h-dvh flex-col bg-cream">
      {/* Header */}
      <header className="flex flex-none items-center gap-3 border-b border-line/70 bg-cream/85 px-5 py-3 backdrop-blur-md">
        <BackButton onClick={onBack} />
        <InitialAvatar name={candidate.name} />
        <div className="flex-1">
          <p className="font-display text-[1.05rem] font-medium leading-tight text-ink">
            {candidate.name}, {candidate.age}
          </p>
          <p className="text-[0.76rem] text-muted">
            {familyInvited ? 'Family-aware · ' : ''}guided by Niyyah · private
          </p>
        </div>
        <button
          onClick={() => setConfirmReport(true)}
          className="rounded-full border border-line px-3 py-1.5 text-[0.75rem] font-medium text-muted transition hover:border-clay/50 hover:text-clay"
        >
          Report
        </button>
      </header>

      {confirmReport && (
        <div className="animate-rise flex-none border-b border-clay/30 bg-clay/[0.06] px-5 py-3">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <p className="text-[0.85rem] leading-snug text-ink">
              Report and block {candidate.name}? This ends the connection and removes
              them completely. Reports will reach our team when the city opens.
            </p>
            <div className="flex flex-none gap-2">
              <button
                onClick={onReport}
                className="rounded-full bg-clay px-3.5 py-1.5 text-[0.78rem] font-medium text-cream transition hover:opacity-90"
              >
                Report &amp; block
              </button>
              <button
                onClick={() => setConfirmReport(false)}
                className="rounded-full border border-line px-3.5 py-1.5 text-[0.78rem] font-medium text-ink-soft transition hover:bg-sand"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div
          role="log"
          aria-live="polite"
          aria-label={`Conversation with ${candidate.name}`}
          className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-6"
        >
          <div className="rounded-2xl border border-gold/25 bg-gold/[0.07] px-4 py-3 text-center text-[0.85rem] leading-relaxed text-ink-soft">
            {note
              ? `You both expressed serious interest — and you said ${candidate.name}’s answer to “${note}” stood out. A good place to begin.`
              : `You both expressed serious interest — the point where a real connection opens. Keep it meaningful; Niyyah is here if you need it.`}
          </div>
          {/* Said once, at the top of the thread. Someone practising a real
              conversation deserves to know who is on the other end of it. */}
          <p className="text-center text-[0.76rem] leading-relaxed text-muted/80 text-pretty">
            Founding preview — {candidate.name} is an illustrative member, so these
            replies are written by Niyyah, not a person.
          </p>

          {messages.map((m) =>
            m.from === 'system' ? (
              <p
                key={m.id}
                className="mx-auto max-w-sm rounded-xl bg-forest/10 px-4 py-2.5 text-center text-[0.85rem] leading-relaxed text-forest"
              >
                {m.text}
              </p>
            ) : (
              <Bubble key={m.id} message={m} name={candidate.name} />
            ),
          )}
          {typing && <Typing name={candidate.name} />}
        </div>
      </div>

      {/* Guide rail + composer */}
      <div className="flex-none border-t border-line/70 bg-cream/90 backdrop-blur-md">
        {showPrompts && (
          <div className="mx-auto max-w-xl px-5 pt-4">
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <div className="flex items-center gap-2">
                <SeedGlyph className="h-4.5 w-4.5 text-forest" />
                <p className="text-[0.82rem] font-medium text-forest">Niyyah suggests asking</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {guidedPrompts.slice(0, 4).map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="rounded-full border border-line bg-cream px-3.5 py-1.5 text-left text-[0.85rem] font-medium text-ink-soft transition hover:border-forest/40 hover:text-ink"
                  >
                    {p}
                  </button>
                ))}
              </div>
              {guideOpen && (
                <p className="mt-3 border-t border-line/70 pt-3 text-[0.85rem] leading-relaxed text-muted text-pretty">
                  {guideTip}
                </p>
              )}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="mx-auto max-w-xl px-5 py-3.5"
        >
          <div className="mb-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGuideOpen((v) => !v)}
              className={`rounded-full border px-3 py-1.5 text-[0.78rem] font-medium transition ${
                guideOpen
                  ? 'border-forest bg-forest text-cream'
                  : 'border-line text-ink-soft hover:bg-sand'
              }`}
            >
              Ask your guide
            </button>
            {waliEligible && (
              <button
                type="button"
                onClick={involveFamily}
                disabled={familyInvited}
                className="rounded-full border border-line px-3 py-1.5 text-[0.78rem] font-medium text-ink-soft transition hover:bg-sand disabled:opacity-50"
              >
                {familyInvited ? 'Family involved' : 'Involve family'}
              </button>
            )}
          </div>
          <div className="flex items-end gap-2.5">
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
              placeholder={`Message ${candidate.name}…`}
              className={`max-h-32 min-h-[3rem] flex-1 resize-none bg-white/70 px-4 py-3 text-[1rem] leading-relaxed ${fieldClass}`}
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              aria-label="Send"
              className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-forest text-cream transition-all hover:bg-forest-deep disabled:opacity-30"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Bubble({ message, name }: { message: ConvMessage; name: string }) {
  if (message.from === 'me') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] rounded-2xl rounded-br-md bg-forest px-4 py-3 text-[0.98rem] leading-relaxed text-cream">
          {message.text}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3">
      <InitialAvatar name={name} size="sm" />
      <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-line bg-white/70 px-4 py-3 text-[0.98rem] leading-relaxed text-ink-soft">
        {message.text.split(/\n\n+/).map((p, i) => (
          <p key={i} className={i > 0 ? 'mt-2' : ''}>
            {p}
          </p>
        ))}
      </div>
    </div>
  )
}

function Typing({ name }: { name: string }) {
  return (
    <div className="flex items-start gap-3">
      <InitialAvatar name={name} size="sm" />
      <div className="rounded-2xl rounded-tl-md border border-line bg-white/70 px-4 py-4">
        <TypingDots />
      </div>
    </div>
  )
}
