import { useEffect, useState } from 'react'
import type { Gender } from '../types'
import { STATES, beforeYesTopics } from '../data/beforeYes'
import { answerCouple, coupleReading, readCouple, type CoupleView } from '../lib/couple'
import { track } from '../lib/analytics'
import ScriptCard from './ScriptCard'
import InviteRow from './InviteRow'
import ReportConcern from './ReportConcern'
import { ArrowRight, Button, Logo } from './ui'

interface Props {
  code: string
  /**
   * True when this is the link *this device* sent — she has tapped her own
   * link, which is the first thing most people do after sending one. Without
   * it this screen greeted her as him and, one tap later, had her answering
   * the eleven as him: her answers became his side, the joint sheet became her
   * answers against her own, and it could not be undone (docs/NIELSEN.md N1).
   */
  yours?: boolean
  /** His eleven, kept on his own device as his own Before you say yes. */
  onAnswered: (states: Record<string, string>, gender: Gender) => void
  /**
   * He began her eleven. The one instrument whose abandonment was invisible on
   * both devices — see src/data/instruments.ts and docs/EXPERIMENTS.md.
   */
  onBegan: () => void
  onRead: () => void
  onBuildMap: () => void
  onHome: () => void
}

type Phase = 'loading' | 'dead' | 'answered-already' | 'intro' | 'asking' | 'joint'

/**
 * His screen.
 *
 * He arrives with a link and no account. Nobody asks his name. He is told
 * exactly one thing before he starts: she never sees his answers, only where
 * they match. That sentence is what makes his answers honest, and honest
 * answers are the entire value of the instrument.
 *
 * When he finishes he sees the same joint she will, and he is offered the two
 * things that make him a member: a read on her, and his own map. That is how
 * the scarce side of this marketplace arrives — through the side we already have.
 */
export default function Couple({ code, yours = false, onAnswered, onBegan, onRead, onBuildMap, onHome }: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  // The eleventh answer is a network write. Without this a second tap fired it
  // twice, the second came back 409, and the screen went blank (docs/NORMAN.md).
  const [sending, setSending] = useState(false)
  const [answerFor, setAnswerFor] = useState<Gender>('man')
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [index, setIndex] = useState(0)
  const [view, setView] = useState<CoupleView | null>(null)

  useEffect(() => {
    let live = true
    readCouple(code).then((v) => {
      if (!live) return
      if (!v) setPhase('dead')
      else if (v.status === 'joint') {
        setView(v)
        setPhase('answered-already')
      } else {
        setAnswerFor(v.answerFor)
        setPhase('intro')
      }
    })
    return () => {
      live = false
    }
  }, [code])

  const topics = beforeYesTopics(answerFor)
  // The person who sent it — the opposite of who is answering.
  const sender = answerFor === 'man' ? 'She' : 'He'
  const senderObj = answerFor === 'man' ? 'her' : 'him'

  async function choose(stateId: string) {
    if (sending) return
    const t = topics[index]
    const next = { ...picked, [t.id]: stateId }
    setPicked(next)
    if (index + 1 < topics.length) {
      setIndex(index + 1)
      return
    }
    setSending(true)
    const result = await answerCouple(code, next)
    setSending(false)
    if (result === 'answered') {
      setPhase('answered-already')
      return
    }
    if (!result) {
      setPhase('dead')
      return
    }
    track('couple_answered')
    onAnswered(next, answerFor)
    setView(result)
    setPhase('joint')
  }

  return (
    <div className="min-h-dvh bg-cream pb-16">
      <header className="border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center justify-between px-6 py-4">
          <Logo className="text-ink" />
          <span className="text-xs uppercase tracking-[0.2em] text-muted">Before you say yes</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-6">
        {phase === 'loading' && <p className="py-16 text-center text-[0.95rem] text-muted">One moment.</p>}

        {phase === 'dead' && (
          <div className="py-12">
            <h1 className="font-display text-[1.8rem] font-medium leading-tight tracking-tight text-ink text-balance">
              This link isn’t working.
            </h1>
            <p className="mt-3 text-[0.98rem] leading-relaxed text-muted text-pretty">
              It may have expired — they last ninety days — or been copied wrong. Ask {senderObj} to send it again.
            </p>
            <Button onClick={onHome} variant="outline" className="mt-7">
              What Niyyah is
            </Button>
          </div>
        )}

        {/* Her own link, and he has not answered yet. The joint case needs no
            branch of its own: the server returns it as answered, and the sheet
            below is the same one both of them see. */}
        {yours && phase === 'intro' && (
          <div className="py-12">
            <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold">Your link</p>
            <h1 className="animate-rise mt-3 font-display text-[1.8rem] font-medium leading-tight tracking-tight text-ink text-balance">
              This is the link you sent.
            </h1>
            <p className="animate-rise mt-3 text-[0.98rem] leading-relaxed text-ink-soft text-pretty">
              It works — this is what {senderObj === 'her' ? 'he' : 'she'} sees when {senderObj === 'her' ? 'he' : 'she'} opens
              it. {senderObj === 'her' ? 'He' : 'She'} has not answered yet. When {senderObj === 'her' ? 'he' : 'she'} does,
              your space will say so, and you will both see where you match — never each other’s answers.
            </p>
            <p className="animate-rise mt-3 text-[0.92rem] leading-relaxed text-muted text-pretty">
              Answering it here yourself would put your own answers on {senderObj === 'her' ? 'his' : 'her'} side of the
              sheet, so this screen does not offer that.
            </p>
            <Button onClick={onHome} variant="outline" className="mt-7">
              Back to your space
            </Button>
          </div>
        )}

        {!yours && phase === 'intro' && (
          <div className="py-10">
            <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold">About two minutes</p>
            <h1 className="animate-rise mt-4 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance">
              {sender}’s asked you to do this too.
            </h1>
            <p className="animate-rise mt-4 text-[1.02rem] leading-relaxed text-ink-soft text-pretty">
              Eleven conversations that decide a Somali marriage — where you’d live, money sent home, a
              second wife. For each one, say only whether the two of you have talked about it.
            </p>
            <ul className="animate-rise mt-6 flex flex-col gap-2.5 border-l-2 border-gold/40 pl-4">
              {[
                `${sender} never sees your answers. Neither of you sees the other’s — only where you match.`,
                'No account. Nobody asks your name.',
                'Answer honestly. The only thing this can do is show you both which conversation to have next.',
              ].map((line) => (
                <li key={line} className="text-[0.92rem] leading-snug text-muted text-pretty">{line}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button onClick={() => { track('couple_started'); onBegan(); setPhase('asking') }} className="group">
                Start
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
              {/* Someone sent him this. Being able to say no to a stranger's
                  link is the least this screen owes him. */}
              <button
                onClick={onHome}
                className="px-2 py-2 text-[0.88rem] font-medium text-muted underline underline-offset-4 transition hover:text-ink"
              >
                What Niyyah is
              </button>
            </div>
          </div>
        )}

        {phase === 'asking' && (() => {
          const t = topics[index]
          const chosen = picked[t.id]
          return (
            <div>
              <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-sand">
                <div className="h-full rounded-full bg-forest transition-all duration-500" style={{ width: `${((index + 1) / topics.length) * 100}%` }} />
              </div>
              <div key={t.id} className="animate-rise py-8">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">{t.label}</p>
                <h2 className="mt-2 font-display text-[1.5rem] font-medium leading-snug tracking-tight text-ink text-balance">
                  Have the two of you talked about this?
                </h2>
                <p className="mt-2.5 text-[0.98rem] leading-relaxed text-ink-soft text-pretty">{t.prompt}</p>
                <div className="mt-6 flex flex-col gap-2.5">
                  {STATES.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => choose(s.id)}
                      style={{ animationDelay: `${i * 40}ms` }}
                      className={`animate-rise group flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200 ${
                        chosen === s.id ? 'border-forest bg-forest text-cream shadow-lift' : 'border-line bg-white/50 text-ink hover:border-forest/40 hover:bg-white'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border ${chosen === s.id ? 'border-gold-soft bg-gold-soft/20' : 'border-line group-hover:border-forest/40'}`} />
                      <span className="min-w-0">
                        <span className="block text-[0.98rem] font-medium leading-snug">{s.label}</span>
                        {s.hint && <span className={`mt-1 block text-[0.83rem] leading-snug ${chosen === s.id ? 'text-cream/70' : 'text-muted'}`}>{s.hint}</span>}
                      </span>
                    </button>
                  ))}
                </div>
                {index > 0 && (
                  <button onClick={() => setIndex(index - 1)} className="mt-5 text-sm font-medium text-muted underline-offset-4 hover:underline">
                    Back
                  </button>
                )}
              </div>
            </div>
          )
        })()}

        {/* Answered, but the joint sheet did not come back — a second tap, a
            second device, or the read failing. This branch rendered nothing at
            all before (docs/NORMAN.md). */}
        {phase === 'answered-already' && view?.status !== 'joint' && (
          <div className="py-16">
            <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold">Already answered</p>
            <h1 className="animate-rise mt-3 font-display text-[1.7rem] font-medium leading-snug tracking-tight text-ink text-balance">
              This one has been answered.
            </h1>
            <p className="animate-rise mt-3 text-[0.98rem] leading-relaxed text-muted text-pretty">
              Your answers are in. {sender} can see where the two of you stand — and neither of
              you sees the other’s answers, only where you match. Nothing more to do here.
            </p>
            <Button onClick={onHome} variant="outline" className="mt-7">
              What Niyyah is
            </Button>
          </div>
        )}

        {(phase === 'joint' || phase === 'answered-already') && view?.status === 'joint' && (() => {
          const r = coupleReading(view.joint, answerFor)
          return (
            <div className="py-8">
              <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold">
                {phase === 'answered-already' ? 'This one has been answered' : 'Where the two of you stand'}
              </p>
              <h1 className="animate-rise mt-3 font-display text-[1.85rem] font-medium leading-tight tracking-tight text-ink text-balance">{r.headline}</h1>
              <ul className="animate-rise mt-6 flex flex-col gap-2.5">
                {r.lines.map((l) => (
                  <li key={l.id} className="flex gap-2.5 text-[0.95rem] leading-snug text-ink-soft text-pretty">
                    <span className={`mt-[0.5rem] h-1.5 w-1.5 flex-none rounded-full ${l.kind === 'both-agree' ? 'bg-forest' : l.kind === 'one-thinks-talked' || l.kind === 'differ-somewhere' ? 'bg-clay' : 'bg-gold'}`} />
                    <span>{l.line}</span>
                  </li>
                ))}
              </ul>
              {r.open && <ScriptCard script={r.open.script} title="The one to open together" source="couple" travel="couple" />}
              <div className="mt-9 flex flex-col gap-3">
                <button onClick={onRead} className="group flex items-center gap-4 rounded-card border border-forest/25 bg-forest/[0.05] p-5 text-left transition-all hover:-translate-y-0.5">
                  <span className="flex-1">
                    <span className="font-display text-[1.15rem] font-medium text-ink">Is {senderObj === 'her' ? 'she' : 'he'} serious? Get your own read.</span>
                    <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">Ninety seconds on what {senderObj === 'her' ? 'she' : 'he'} has actually done, and the one question to ask next.</span>
                  </span>
                  <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
                </button>
                <button onClick={onBuildMap} className="group flex items-center gap-4 rounded-card border border-gold/30 bg-gold/[0.07] p-5 text-left transition-all hover:-translate-y-0.5">
                  <span className="flex-1">
                    <span className="font-display text-[1.15rem] font-medium text-ink">Your own map</span>
                    <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">Two minutes on what you actually need. Nothing here is shared with anyone.</span>
                  </span>
                  <ArrowRight className="flex-none text-gold transition-transform group-hover:translate-x-0.5" />
                </button>
                {/* Couples tell couples. He has just done the thing; the friend
                    who is about to get engaged is the person he would tell. */}
                <InviteRow
                  source="couple"
                  title="Send the eleven to a friend who’s about to get engaged"
                  body="Two minutes, the conversations most of us have too late. They answer on their own phone. No account."
                />
              </div>
              <p className="mt-8 text-[0.8rem] leading-relaxed text-muted text-pretty">
                Your answers were sent once, under this code, with no name. {sender} sees only this same list.
              </p>
              <ReportConcern code={code} side={answerFor} />
            </div>
          )
        })()}
      </main>
    </div>
  )
}
