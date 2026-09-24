import { useEffect, useState } from 'react'
import type { Gender } from '../types'
import { STATES, beforeYesTopics } from '../data/beforeYes'
import { answerCouple, coupleReading, readCoupleDetail, type CoupleView, type Joint } from '../lib/couple'
import type { Why } from '../lib/net'
import { answeredOf, clearDraft, loadDraft, resumeIndex, saveDraft } from '../lib/draft'
import ScriptCard from './ScriptCard'
import InviteRow from './InviteRow'
import ReportConcern from './ReportConcern'
import { ArrowRight, Button, Logo , NotSaving, Spinner, TextButton} from './ui'

interface Props {
  code: string
  /** False when this browser refuses to persist — the draft on this screen will not survive the tab. */
  saveOk?: boolean
  /**
   * True when this is the link *this device* sent — she has tapped her own
   * link, which is the first thing most people do after sending one. Without
   * it this screen greeted her as him and, one tap later, had her answering
   * the eleven as him: her answers became his side, the joint sheet became her
   * answers against her own, and it could not be undone (docs/DESIGN.md N1).
   */
  yours?: boolean
  /**
   * His eleven, kept on his own device as his own Before you say yes — and the
   * joint he was just shown, so his Home knows there is a pair.
   */
  onAnswered: (states: Record<string, string>, gender: Gender, joint?: Record<string, Joint>) => void
  /**
   * He began her eleven. The one instrument whose abandonment was invisible on
   * both devices — see src/data/instruments.ts and docs/RESEARCH.md.
   */
  onBegan: () => void
  onRead: () => void
  onBuildMap: () => void
  onHome: () => void
}

type Phase = 'loading' | 'dead' | 'unreachable' | 'answered-already' | 'intro' | 'asking' | 'joint'

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
export default function Couple({ code, yours = false, onAnswered, onBegan, onRead, onBuildMap, onHome, saveOk = true }: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  // The eleventh answer is a network write. Without this a second tap fired it
  // twice, the second came back 409, and the screen went blank (docs/DESIGN.md).
  const [sending, setSending] = useState(false)
  const [answerFor, setAnswerFor] = useState<Gender>('man')
  // Read once, on the way in. His answers used to live only here, so a reload
  // or a backgrounded tab cost him all of them (docs/DESIGN.md).
  const [draft] = useState(() => loadDraft('couple'))
  const [picked, setPicked] = useState<Record<string, string>>(() => draft?.answers ?? {})
  const [index, setIndex] = useState(0)
  const [view, setView] = useState<CoupleView | null>(null)
  // Why the last send did not go — kept apart from the link being dead.
  const [sendFailed, setSendFailed] = useState<Why | null>(null)

  useEffect(() => {
    let live = true
    readCoupleDetail(code).then((v) => {
      if (!live) return
      // Only the server actually saying there is nothing there makes a link
      // dead. Everything else is us.
      if (typeof v === 'string') setPhase(v === 'not-found' || v === 'expired' || v === 'not-a-code' ? 'dead' : 'unreachable')
      else if (v.status === 'joint') {
        // Which side answered, so a report from here is filed as that side —
        // it defaulted to "man" for everyone (docs/SECURITY.md).
        if (v.answerFor) setAnswerFor(v.answerFor)
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
      saveDraft('couple', next, answerFor)
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
    if (typeof result === 'string') {
      // A timeout is not a dead link. This used to drop him on "This link
      // isn't working — it may have expired, or been copied wrong" and throw
      // away all eleven answers, on the eleventh tap, for a two-second blip
      // on someone else's phone (docs/DESIGN.md). His answers are still in
      // `picked`; he stays exactly where he is and taps again.
      if (result === 'not-found' || result === 'expired' || result === 'not-a-code') {
        setPhase('dead')
        return
      }
      setSendFailed(result)
      return
    }
    setSendFailed(null)
    clearDraft('couple')
    onAnswered(next, answerFor, result.status === 'joint' ? result.joint : undefined)
    setView(result)
    setPhase('joint')
  }

  return (
    <div className="min-h-dvh bg-cream pb-16 pt-safe">
      <header className="border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center justify-between px-6 py-4">
          <Logo className="text-ink" />
          <span className="text-xs uppercase tracking-[0.2em] text-muted">Before you say yes</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-6">
        {!saveOk && <NotSaving what="your answers" className="mt-6" />}
        {phase === 'loading' && <p className="py-16 text-center text-[0.95rem] text-muted">One moment.</p>}

        {phase === 'unreachable' && (
          <div className="py-12">
            <h1 className="font-display text-[1.8rem] font-medium leading-tight tracking-tight text-ink text-balance">
              We couldn’t open this just now.
            </h1>
            <p className="mt-3 text-[0.98rem] leading-relaxed text-muted text-pretty">
              That is us, not the link — it may be perfectly good. Nothing has been lost. Try again in a moment, and if
              it keeps happening, ask {senderObj} to send it again.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button onClick={() => window.location.reload()}>Try again</Button>
              <TextButton
                onClick={onHome}
                className="text-[0.88rem] font-medium text-muted underline hover:text-ink"
              >
                What Niyyah is
              </TextButton>
            </div>
          </div>
        )}

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
            <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold-ink">Your link</p>
            <h1 className="animate-rise mt-3 font-display text-[1.8rem] font-medium leading-tight tracking-tight text-ink text-balance">
              This is the link you sent.
            </h1>
            <p className="animate-rise mt-3 text-[0.98rem] leading-relaxed text-ink-soft text-pretty">
              It works — this is what {senderObj === 'her' ? 'he' : 'she'} sees when {senderObj === 'her' ? 'he' : 'she'} opens
              it. {senderObj === 'her' ? 'He' : 'She'} has not answered yet. When {senderObj === 'her' ? 'he' : 'she'} does,
              Home will say so, and you will both see where you match — not each other’s answers.
            </p>
            <p className="animate-rise mt-3 text-[0.92rem] leading-relaxed text-muted text-pretty">
              Answering it here yourself would put your own answers on {senderObj === 'her' ? 'his' : 'her'} side of the
              sheet, so this screen does not offer that.
            </p>
            <Button onClick={onHome} variant="outline" className="mt-7">
              Back home
            </Button>
          </div>
        )}

        {!yours && phase === 'intro' && (
          <div className="py-10">
            <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold-ink">About two minutes</p>
            <h1 className="animate-rise mt-4 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance">
              {sender}’s asked you to do this too.
            </h1>
            <p className="animate-rise mt-4 text-[1.02rem] leading-relaxed text-ink-soft text-pretty">
              Eleven conversations couples rarely have before the families do — where you’d live, money sent home, a
              second wife. For each one, say only whether the two of you have talked about it.
            </p>
            <ul className="animate-rise mt-6 flex flex-col gap-2.5 border-l-2 border-gold/40 pl-4">
              {[
                `${sender} never sees your answers. Neither of you sees the other’s — only where you match.`,
                'No account. Nobody asks your name.',
                'Your answers are kept under this link’s code, with no name, for ninety days — then deleted.',
                'Answer honestly. The only thing this can do is show you both which conversation to have next.',
              ].map((line) => (
                <li key={line} className="text-[0.92rem] leading-snug text-muted text-pretty">{line}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => {
                  onBegan()
                  // Back to the first he has not answered, never a count.
                  setIndex(resumeIndex(topics.map((t) => t.id), picked))
                  setPhase('asking')
                }}
                className="group"
              >
                {answeredOf(topics.map((t) => t.id), picked) > 0 ? 'Pick up where you left off' : 'Start'}
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
              {/* Someone sent him this. Being able to say no to a stranger's
                  link is the least this screen owes him. */}
              <TextButton
                onClick={onHome}
                className="text-[0.88rem] font-medium text-muted underline hover:text-ink"
              >
                What Niyyah is
              </TextButton>
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
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-ink">{t.label}</p>
                <h2 className="mt-2 font-display text-[1.5rem] font-medium leading-snug tracking-tight text-ink text-balance">
                  Have the two of you talked about this?
                </h2>
                <p className="mt-2.5 text-[0.98rem] leading-relaxed text-ink-soft text-pretty">{t.prompt}</p>
                <div className="mt-6 flex flex-col gap-2.5">
                  {STATES.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => choose(s.id)}
                      // `sending` guarded the eleventh answer and was never
                      // rendered — no spinner, no disabled state — so the tap
                      // that fires a ten-second network write looked exactly
                      // like the ten before it. That missing feedback is what
                      // produced the second tap the guard exists for
                      // (docs/DESIGN.md).
                      disabled={sending}
                      style={{ animationDelay: `${i * 40}ms` }}
                      className={`animate-rise group flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200 disabled:opacity-60 ${
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
                {sending && (
                  <p role="status" className="mt-5 flex items-center gap-2 text-[0.88rem] text-muted">
                    <Spinner /> Sending your answers…
                  </p>
                )}
                {sendFailed && (
                  <p role="status" className="mt-4 text-[0.88rem] leading-relaxed text-clay text-pretty">
                    That didn’t send — the link is fine and your answers are still here. Tap your answer again in a
                    moment.
                  </p>
                )}
                {/* Back existed from question two, so tapping Start committed
                    him to eleven questions with no way back to what the screen
                    had just told him. Read.tsx steps back to its intro from
                    question one; this now does the same (docs/DESIGN.md). */}
                <button
                  onClick={() => (index > 0 ? setIndex(index - 1) : setPhase('intro'))}
                  className="mt-5 text-sm font-medium text-muted underline-offset-4 hover:underline"
                >
                  Back
                </button>
              </div>
            </div>
          )
        })()}

        {/* Answered, but the joint sheet did not come back — a second tap, a
            second device, or the read failing. This branch rendered nothing at
            all before (docs/DESIGN.md). */}
        {phase === 'answered-already' && view?.status !== 'joint' && (
          <div className="py-16">
            <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold-ink">Already answered</p>
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
              <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold-ink">
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
              {r.open && <ScriptCard script={r.open.script} title="The one to open together" travel="couple" />}
              <div className="mt-9 flex flex-col gap-3">
                <button onClick={onRead} className="group flex items-center gap-4 rounded-card border border-forest/25 bg-forest/[0.05] p-5 text-left transition-all hover:-translate-y-0.5">
                  <span className="flex-1">
                    <span className="font-display text-[1.15rem] font-medium text-ink">Is {senderObj === 'her' ? 'she' : 'he'} serious? Get your own read.</span>
 <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">Ninety seconds on what {senderObj === 'her' ? 'she' : 'he'} has done, and the one question to ask next.</span>
                  </span>
                  <ArrowRight className="flex-none text-forest transition-transform group-hover:translate-x-0.5" />
                </button>
                <button onClick={onBuildMap} className="group flex items-center gap-4 rounded-card border border-gold/30 bg-gold/[0.07] p-5 text-left transition-all hover:-translate-y-0.5">
                  <span className="flex-1">
                    <span className="font-display text-[1.15rem] font-medium text-ink">Your own map</span>
 <span className="mt-0.5 block text-[0.88rem] text-muted text-pretty">Two minutes on what you need. Nothing here is shared with anyone.</span>
                  </span>
                  <ArrowRight className="flex-none text-gold-ink transition-transform group-hover:translate-x-0.5" />
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
