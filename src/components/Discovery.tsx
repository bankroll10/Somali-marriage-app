import { useMemo, useState } from 'react'
import type { Answers, Identity, TrustSettings } from '../types'
import { candidatesFor, type Candidate } from '../data/candidates'
import { getScene } from '../data/scenes'
import { alignment, type Alignment } from '../lib/matching'
import { BackButton, Button, LockGlyph, ScreenHeader, ShieldGlyph, SparkGlyph } from './ui'

interface Props {
  identity: Identity
  answers: Answers
  trust: TrustSettings
  matched: string[]
  pendingInterest: string[]
  passed: string[]
  interestNotes: Record<string, string>
  onExpressInterest: (id: string) => void
  onPass: (id: string) => void
  onSetNote: (id: string, note: string) => void
  onReport: (id: string) => void
  onOpenConversation: (id: string) => void
  onVerify: () => void
  onBack: () => void
}

interface Ranked {
  candidate: Candidate
  align: Alignment
}

export default function Discovery({
  identity,
  answers,
  trust,
  matched,
  pendingInterest,
  passed,
  interestNotes,
  onExpressInterest,
  onPass,
  onSetNote,
  onReport,
  onOpenConversation,
  onVerify,
  onBack,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const userScene = identity.scene

  const ranked = useMemo<Ranked[]>(() => {
    return candidatesFor(identity.gender)
      .filter((candidate) => !passed.includes(candidate.id))
      .map((candidate) => ({ candidate, align: alignment(answers, candidate) }))
      .sort((a, b) => {
        // Same-scene first, then by alignment.
        const aScene = a.candidate.scene === userScene ? 1 : 0
        const bScene = b.candidate.scene === userScene ? 1 : 0
        if (aScene !== bScene) return bScene - aScene
        return b.align.score - a.align.score
      })
  }, [identity.gender, answers, userScene, passed])

  // ── Trust gate ───────────────────────────────────────────────────────────
  if (!trust.identityVerified) {
    return (
      <div className="relative flex min-h-dvh flex-col items-center justify-center bg-forest-deep px-6 text-center text-cream">
        <div className="bg-geo absolute inset-0 opacity-40" aria-hidden />
        <BackButton onClick={onBack} tone="light" className="absolute left-5 top-5" />
        <div className="relative max-w-md">
          <ShieldGlyph className="mx-auto h-10 w-10 text-gold-soft" />
          <h1 className="mt-5 font-display text-[2rem] font-medium leading-tight tracking-tight text-balance">
            This room is for the verified.
          </h1>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-cream/75 text-pretty">
            Everyone you meet in your scene is verified and serious — which only
            works if you are too. Verify once, and the door opens.
          </p>
          <div className="mt-8">
            <Button onClick={onVerify} variant="soft" className="bg-gold-soft text-forest-deep hover:bg-gold">
              Verify to enter
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Candidate detail ───────────────────────────────────────────────────────
  const detail = ranked.find((r) => r.candidate.id === selected)
  if (detail) {
    return (
      <CandidateDetail
        ranked={detail}
        matched={matched.includes(detail.candidate.id)}
        pending={pendingInterest.includes(detail.candidate.id)}
        note={interestNotes[detail.candidate.id] ?? ''}
        onSetNote={(n) => onSetNote(detail.candidate.id, n)}
        onReport={() => {
          onReport(detail.candidate.id)
          setSelected(null)
        }}
        onExpress={() => onExpressInterest(detail.candidate.id)}
        onPass={() => {
          onPass(detail.candidate.id)
          setSelected(null)
        }}
        onOpenConversation={() => onOpenConversation(detail.candidate.id)}
        onBack={() => setSelected(null)}
      />
    )
  }

  // ── Discovery list ───────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-cream pb-16">
      <ScreenHeader onBack={onBack}>
        <p className="font-display text-[1.05rem] font-medium text-ink">People in your scene</p>
      </ScreenHeader>

      <main className="mx-auto max-w-2xl px-6">
        <section className="py-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Today’s introductions
          </p>
          <h1 className="mt-2 font-display text-[1.9rem] font-medium leading-tight tracking-tight text-ink text-balance">
            Chosen by alignment — not looks.
          </h1>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-muted text-pretty">
            A few serious people, ranked by how your lives actually fit. No endless
            feed, no swiping. Photos stay private until you both choose to connect.
          </p>
        </section>

        <div className="space-y-4">
          {ranked.map(({ candidate, align }, i) => (
            <button
              key={candidate.id}
              onClick={() => setSelected(candidate.id)}
              className={`group flex w-full gap-4 rounded-card border p-5 text-left transition-all hover:-translate-y-0.5 ${
                i === 0
                  ? 'border-gold/40 bg-gold/[0.08] hover:bg-gold/[0.12]'
                  : 'border-line bg-white/60 hover:border-forest/40'
              }`}
            >
              <Avatar name={candidate.name} />
              <div className="min-w-0 flex-1">
                {i === 0 && (
                  <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold">
                    Today’s introduction
                  </p>
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-[1.2rem] font-medium text-ink">
                    {candidate.name}, {candidate.age}
                  </p>
                  <AlignBadge label={align.headline} />
                </div>
                <p className="text-[0.88rem] text-muted">
                  {candidate.occupation} ·{' '}
                  {getScene(candidate.scene)?.label ?? '—'}
                  {candidate.scene === userScene && (
                    <span className="ml-1 font-medium text-forest">· in your scene</span>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {candidate.trust.verified && <MiniBadge>✓ Verified</MiniBadge>}
                  {candidate.trust.seriousIntention && <MiniBadge>Serious</MiniBadge>}
                  {candidate.trust.waliFriendly && <MiniBadge>Wali-friendly</MiniBadge>}
                </div>
                {align.reasons.length > 0 && (
                  <p className="mt-2.5 text-[0.9rem] leading-snug text-ink-soft text-pretty">
                    <span className="font-medium text-forest">Why:</span>{' '}
                    {align.reasons.join(', ')}.
                  </p>
                )}
                {matched.includes(candidate.id) ? (
                  <p className="mt-2 text-[0.82rem] font-medium text-forest">
                    Connected — conversation open
                  </p>
                ) : pendingInterest.includes(candidate.id) ? (
                  <p className="mt-2 text-[0.82rem] font-medium text-muted">
                    Interest sent — waiting to hear back
                  </p>
                ) : null}
              </div>
            </button>
          ))}
        </div>

        {ranked.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <SparkGlyph className="h-8 w-8 text-gold" />
            <h2 className="mt-5 font-display text-[1.5rem] font-medium tracking-tight text-ink">
              You’ve met everyone for now.
            </h2>
            <p className="mt-2 max-w-sm text-[0.95rem] leading-relaxed text-muted text-pretty">
              Passing on people who don’t fit is part of choosing well — it’s not
              pickiness, it’s clarity. New introductions arrive as your scene grows.
            </p>
            <button
              onClick={onBack}
              className="mt-6 text-sm font-medium text-forest underline-offset-4 hover:underline"
            >
              Back to your space
            </button>
          </div>
        ) : (
          <div className="mt-8 text-center">
            <p className="text-[0.85rem] text-muted text-pretty">
              That’s today’s introductions. We’d rather show you a few people who truly
              fit than a thousand who don’t.
            </p>
            {/* Honesty over illusion: these profiles are illustrative until the
                real community opens. Said quietly, but said. */}
            <p className="mx-auto mt-3 max-w-sm text-[0.78rem] leading-relaxed text-muted/80 text-pretty">
              Founding preview — these profiles show how introductions work while
              your city’s community opens. Every real member will be verified.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

function CandidateDetail({
  ranked,
  matched,
  pending,
  note,
  onSetNote,
  onReport,
  onExpress,
  onPass,
  onOpenConversation,
  onBack,
}: {
  ranked: Ranked
  matched: boolean
  pending: boolean
  note: string
  onSetNote: (note: string) => void
  onReport: () => void
  onExpress: () => void
  onPass: () => void
  onOpenConversation: () => void
  onBack: () => void
}) {
  const { candidate: c, align } = ranked
  const [confirmReport, setConfirmReport] = useState(false)
  // "What stood out" — interest anchored to something specific, not a blanket like.
  const noteOptions = c.prompts.map((p) => p.q)
  return (
    <div className="min-h-dvh bg-cream pb-28">
      <ScreenHeader onBack={onBack} sticky>
        <p className="font-display text-[1.05rem] font-medium text-ink">{c.name}</p>
      </ScreenHeader>

      <main className="mx-auto max-w-2xl px-6">
        <div className="flex items-center gap-5 py-7">
          <Avatar name={c.name} large />
          <div>
            <h1 className="font-display text-[1.8rem] font-medium tracking-tight text-ink">
              {c.name}, {c.age}
            </h1>
            <p className="text-[0.95rem] text-muted">
              {c.occupation} · {getScene(c.scene)?.label}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.trust.verified && <MiniBadge>✓ Verified</MiniBadge>}
              {c.trust.seriousIntention && <MiniBadge>Serious</MiniBadge>}
              {c.trust.waliFriendly && <MiniBadge>Wali-friendly</MiniBadge>}
            </div>
          </div>
        </div>

        {/* Alignment */}
        <div className="rounded-card bg-forest p-6 text-cream">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold-soft">
            Why you align
          </p>
          <p className="mt-2 font-display text-[1.2rem] font-medium">{align.headline}</p>
          {align.reasons.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {align.reasons.map((r) => (
                <li key={r} className="flex gap-2.5 text-[0.95rem] text-cream/85">
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold-soft" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bio */}
        <p className="mt-7 text-[1.05rem] leading-relaxed text-ink-soft text-pretty">{c.bio}</p>

        {/* Prompts */}
        <div className="mt-6 space-y-4">
          {c.prompts.map((p) => (
            <div key={p.q} className="rounded-card border border-line bg-white/60 p-5">
              <p className="text-[0.82rem] font-medium uppercase tracking-[0.14em] text-muted">
                {p.q}
              </p>
              <p className="mt-2 text-[1rem] leading-relaxed text-ink text-pretty">“{p.a}”</p>
            </div>
          ))}
        </div>

        {/* Anchor the interest to something specific — likes with a reason. */}
        {!matched && !pending && (
          <div className="mt-6">
            <p className="text-[0.82rem] font-medium uppercase tracking-[0.14em] text-muted">
              What stood out? <span className="normal-case tracking-normal">(optional — it opens the conversation)</span>
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {noteOptions.map((q) => (
                <button
                  key={q}
                  onClick={() => onSetNote(note === q ? '' : q)}
                  className={`rounded-full border px-3.5 py-1.5 text-[0.85rem] font-medium transition-all ${
                    note === q
                      ? 'border-forest bg-forest text-cream'
                      : 'border-line bg-white/50 text-ink-soft hover:border-forest/40 hover:bg-white'
                  }`}
                >
                  “{q}”
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-[0.85rem] text-muted">
          Faces stay private here until interest is mutual — on both sides.
        </p>

        {/* The disclosure belongs here too, not only under the list. This is
            the screen where someone decides to reach for a person. */}
        <p className="mx-auto mt-3 max-w-sm text-center text-[0.78rem] leading-relaxed text-muted/80 text-pretty">
          Founding preview — {c.name} is an illustrative profile showing how
          introductions work while your city’s community opens.
        </p>

        {/* Report & block — the promise on the trust screen, made real. */}
        <div className="mt-4 pb-2 text-center">
          {confirmReport ? (
            <div className="animate-rise mx-auto max-w-sm rounded-card border border-clay/40 bg-clay/[0.06] p-4">
              <p className="text-[0.9rem] font-medium text-ink">
                Report and block {c.name}?
              </p>
              <p className="mt-1 text-[0.82rem] leading-snug text-muted">
                They’re removed completely and can’t see you. Reports will reach our
                team when the city opens.
              </p>
              <div className="mt-3 flex justify-center gap-2">
                <button
                  onClick={onReport}
                  className="rounded-full bg-clay px-4 py-2 text-[0.82rem] font-medium text-cream transition hover:opacity-90"
                >
                  Report &amp; block
                </button>
                <button
                  onClick={() => setConfirmReport(false)}
                  className="rounded-full border border-line px-4 py-2 text-[0.82rem] font-medium text-ink-soft transition hover:bg-sand"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReport(true)}
              className="text-xs text-muted/70 underline-offset-4 transition hover:text-clay hover:underline"
            >
              Report or block {c.name}
            </button>
          )}
        </div>
      </main>

      {/* Action bar */}
      <div className="fixed inset-x-0 bottom-0 border-t border-line/70 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-6 py-4">
          {/* The mutual panel below is the highest-stakes moment on this screen,
              and the one place a person could form a false belief about someone
              who does not exist. It says what a mutual connection *will* be, in
              the future tense, rather than announcing one that just happened —
              small print elsewhere cannot undo a sentence read here. */}
          {matched ? (
            <div className="animate-rise rounded-card bg-forest/10 px-5 py-4 text-center">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-gold">
                How a connection will work
              </p>
              <p className="mt-1.5 font-display text-[1.1rem] font-medium text-forest">
                When it’s mutual, this is where you’d meet.
              </p>
              <p className="mt-1 text-[0.88rem] text-muted text-pretty">
                Photos are revealed to each other, and a guided conversation
                opens. {c.name} is an illustrative member, so what follows is a
                walkthrough of that — not a real reply.
              </p>
              <button
                onClick={onOpenConversation}
                className="mt-3 inline-flex items-center justify-center rounded-full bg-forest px-6 py-3 text-[0.95rem] font-medium text-cream transition hover:bg-forest-deep"
              >
                Start the conversation →
              </button>
            </div>
          ) : pending ? (
            <div className="animate-rise rounded-card border border-line bg-white/70 px-5 py-4 text-center">
              <p className="font-display text-[1.05rem] font-medium text-ink">
                Interest sent, with your serious intention.
              </p>
              {/* Future tense on purpose: nobody is deciding on the other end
                  of this yet, and saying otherwise would be the lie. */}
              <p className="mt-1 text-[0.88rem] text-muted text-pretty">
                When your city opens, this is where you’d hear back — here and in
                your connections, only if they feel the same. No pressure, no
                chasing, and nothing you have to do next.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button onClick={onExpress} className="flex-1">
                Express serious interest
              </Button>
              <Button variant="outline" onClick={onPass}>
                Not for me
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  const size = large ? 'h-20 w-20 text-2xl' : 'h-16 w-16 text-xl'
  return (
    <div className={`relative flex-none ${large ? 'h-20 w-20' : 'h-16 w-16'}`}>
      <div
        className={`flex ${size} items-center justify-center rounded-full bg-forest`}
      >
        <span className="font-display font-medium text-cream/40 blur-[1px]">
          {name.charAt(0)}
        </span>
      </div>
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-cream px-1.5 py-1 text-muted shadow">
        <LockGlyph className="h-3 w-3" />
      </span>
    </div>
  )
}

function AlignBadge({ label }: { label: string }) {
  return (
    <span className="flex-none rounded-full bg-gold/15 px-2.5 py-1 text-[0.78rem] font-semibold text-forest">
      {label}
    </span>
  )
}

function MiniBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-sand px-2 py-0.5 text-[0.72rem] font-medium text-ink-soft">
      {children}
    </span>
  )
}

