import { useEffect, useState } from 'react'
import type { Gender } from '../types'
import { STATES, beforeYesTopics } from '../data/beforeYes'
import { answerCouple, coupleReading, readCouple, type CoupleView } from '../lib/couple'
import { track } from '../lib/analytics'
import ScriptCard from './ScriptCard'
import { ArrowRight, Button, Logo } from './ui'

interface Props {
  code: string
  /** His eleven, kept on his own device as his own Before you say yes. */
  onAnswered: (states: Record<string, string>, gender: Gender) => void
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
export default function Couple({ code, onAnswered, onRead, onBuildMap, onHome }: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
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
    const t = topics[index]
    const next = { ...picked, [t.id]: stateId }
    setPicked(next)
    if (index + 1 < topics.length) {
      setIndex(index + 1)
      return
    }
    const result = await answerCouple(code, next)
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

        {phase === 'intro' && (
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
            <div className="mt-8">
              <Button onClick={() => { track('couple_started'); setPhase('asking') }} className="group">
                Start
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
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
              </div>
              <p className="mt-8 text-[0.8rem] leading-relaxed text-muted text-pretty">
                Your answers were sent once, under this code, with no name. {sender} sees only this same list.
              </p>
            </div>
          )
        })()}
      </main>
    </div>
  )
}
