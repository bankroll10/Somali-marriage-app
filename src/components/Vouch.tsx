import { useEffect, useState } from 'react'
import type { VouchState } from '../types'
import { relationshipOptions } from '../data/vouch'
import { readVouch, sendVouch } from '../lib/vouch'
import { track } from '../lib/analytics'
import { ArrowRight, Button, Logo, fieldClass } from './ui'

interface Props {
  code: string
  onDone: () => void
}

type Phase = 'loading' | 'form' | 'sending' | 'done' | 'already' | 'dead' | 'error'

/**
 * The family member's screen.
 *
 * Written for a Somali father reading it cold on his phone, sent by his
 * daughter. It says who is asking, exactly what he is confirming, and that
 * nothing more will ever be asked of him. It claims nothing about Niyyah beyond
 * what is true, and it never asks for an account.
 */
export default function Vouch({ code, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [existing, setExisting] = useState<VouchState | null>(null)
  const [relationship, setRelationship] = useState('')
  const [firstName, setFirstName] = useState('')
  const [sentence, setSentence] = useState('')
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<VouchState | null>(null)

  useEffect(() => {
    let live = true
    readVouch(code).then((v) => {
      if (!live) return
      if (v) {
        setExisting(v)
        setPhase('already')
      } else setPhase('form')
    })
    return () => {
      live = false
    }
  }, [code])

  const options = relationshipOptions('woman')
  const ready = !!relationship && firstName.trim().length > 0 && sentence.trim().length > 0

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || phase === 'sending') return
    setPhase('sending')
    const r = await sendVouch(code, { relationship, firstName: firstName.trim(), sentence: sentence.trim(), phone: phone.trim() || undefined })
    if (r === 'already') {
      setPhase('already')
      return
    }
    if (r === 'no_map') {
      setPhase('dead')
      return
    }
    if (!r) {
      setPhase('error')
      return
    }
    track('vouch_given', { relationship })
    setResult(r)
    setPhase('done')
  }

  return (
    <div className="min-h-dvh bg-cream pb-16">
      <header className="border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-xl items-center justify-between px-6 py-4">
          <Logo className="text-ink" />
          <span className="text-xs uppercase tracking-[0.2em] text-muted">A family request</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-6">
        {phase === 'loading' && <p className="py-16 text-center text-[0.95rem] text-muted">One moment.</p>}

        {(phase === 'form' || phase === 'sending' || phase === 'error') && (
          <form onSubmit={submit} className="py-10">
            <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold">From someone who trusts you</p>
            <h1 className="animate-rise mt-4 font-display text-[1.9rem] font-medium leading-tight tracking-tight text-ink text-balance">
              Someone in your family is seeking marriage, and has asked you to vouch for them.
            </h1>
            <p className="animate-rise mt-4 text-[1rem] leading-relaxed text-ink-soft text-pretty">
              Niyyah is a marriage platform built for the Somali diaspora. Before anyone here is introduced
              to anyone, we ask that a family member confirm two things: that this person is who they say
              they are, and that they are seeking marriage. That is all you are being asked. There is no
              account, and nothing more will be asked of you afterward.
            </p>

            <div className="mt-8">
              <p id="vouch-rel" className="text-[0.92rem] font-medium text-ink">Who are you to them?</p>
              <div role="group" aria-labelledby="vouch-rel" className="mt-2.5 flex flex-wrap gap-2">
                {options.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRelationship(r.id)}
                    aria-pressed={relationship === r.id}
                    className={`rounded-full border px-3.5 py-1.5 text-[0.88rem] font-medium transition-all ${
                      relationship === r.id ? 'border-forest bg-forest text-cream' : 'border-line bg-white/50 text-ink-soft hover:border-forest/40 hover:bg-white'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="vouch-name" className="block text-[0.92rem] font-medium text-ink">Your first name</label>
              <input id="vouch-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={40} autoComplete="given-name" className={`mt-2 w-full bg-white/70 px-4 py-3 text-[1rem] ${fieldClass}`} />
            </div>

            <div className="mt-6">
              <label htmlFor="vouch-sentence" className="block text-[0.92rem] font-medium text-ink">One sentence about them</label>
              <p className="mt-0.5 text-[0.82rem] text-muted">Only the founder reads this. It is never shown to anyone they meet.</p>
              <textarea id="vouch-sentence" value={sentence} onChange={(e) => setSentence(e.target.value)} maxLength={280} rows={3} placeholder="e.g. She is my sister, and she means this." className={`mt-2 w-full resize-none bg-white/70 px-4 py-3 text-[1rem] leading-relaxed ${fieldClass}`} />
            </div>

            <div className="mt-6">
              <label htmlFor="vouch-phone" className="block text-[0.92rem] font-medium text-ink">
                Your phone <span className="font-normal text-muted">(optional)</span>
              </label>
              <p className="mt-0.5 text-[0.82rem] text-muted">So the founder can confirm it is really you. Never shared, never shown.</p>
              <input id="vouch-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} inputMode="tel" autoComplete="tel" className={`mt-2 w-full bg-white/70 px-4 py-3 text-[1rem] ${fieldClass}`} />
            </div>

            <div className="mt-8">
              <Button type="submit" disabled={!ready || phase === 'sending'} className="group">
                {phase === 'sending' ? 'Sending…' : 'I vouch for them'}
                {phase !== 'sending' && <ArrowRight className="transition-transform group-hover:translate-x-0.5" />}
              </Button>
            </div>
            {phase === 'error' && <p className="mt-3 text-[0.85rem] text-clay">That didn’t go through. Please try again in a moment.</p>}
            <p className="mt-5 text-[0.8rem] leading-relaxed text-muted text-pretty">
              They will see your first name and that you are {relationship ? options.find((r) => r.id === relationship)?.label.toLowerCase() : 'family'}. Your
              sentence and your number are seen only by the founder of Niyyah, and by nobody they are ever introduced to.
            </p>
          </form>
        )}

        {phase === 'done' && result && (
          <div className="py-12">
            <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold">Thank you</p>
            <h1 className="animate-rise mt-4 font-display text-[1.9rem] font-medium leading-tight tracking-tight text-ink text-balance">
              They are vouched for.
            </h1>
            <p className="animate-rise mt-4 text-[1rem] leading-relaxed text-ink-soft text-pretty">
              They will see that {result.firstName}, {options.find((r) => r.id === result.relationship)?.label.toLowerCase() ?? 'family'}, has vouched for them. Nothing more is asked of you — and you have our thanks for taking a minute for someone who trusts you.
            </p>
            <button onClick={onDone} className="mt-8 text-sm font-medium text-forest underline-offset-4 hover:underline">
              What Niyyah is
            </button>
          </div>
        )}

        {phase === 'already' && (
          <div className="py-12">
            <h1 className="animate-rise font-display text-[1.9rem] font-medium leading-tight tracking-tight text-ink text-balance">
              Someone has already vouched for them.
            </h1>
            <p className="animate-rise mt-4 text-[1rem] leading-relaxed text-ink-soft text-pretty">
              {existing ? `${existing.firstName} has already done this.` : 'This has already been done.'} One vouch is all that is asked. Thank you.
            </p>
            <button onClick={onDone} className="mt-8 text-sm font-medium text-forest underline-offset-4 hover:underline">
              What Niyyah is
            </button>
          </div>
        )}

        {phase === 'dead' && (
          <div className="py-12">
            <h1 className="animate-rise font-display text-[1.9rem] font-medium leading-tight tracking-tight text-ink text-balance">
              This link isn’t working.
            </h1>
            <p className="animate-rise mt-4 text-[1rem] leading-relaxed text-ink-soft text-pretty">
              It may have been copied wrong. Please ask them to send it again.
            </p>
            <button onClick={onDone} className="mt-8 text-sm font-medium text-forest underline-offset-4 hover:underline">
              What Niyyah is
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
