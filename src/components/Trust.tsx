import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Identity, TrustSettings } from '../types'
import { trustScore } from '../lib/trust'
import {
  BackButton,
  CheckIcon,
  EyeOffGlyph,
  LockGlyph,
  Logo,
  PeopleGlyph,
  RingGlyph,
  ShieldGlyph,
  Spinner,
} from './ui'

interface Props {
  identity: Identity
  trust: TrustSettings
  onChange: (value: TrustSettings | ((prev: TrustSettings) => TrustSettings)) => void
  onBack: () => void
}

export default function Trust({ identity, trust, onChange, onBack }: Props) {
  const [verifying, setVerifying] = useState(false)
  const score = trustScore(trust)
  const isWoman = identity.gender === 'woman'

  // Cleared on unmount — leaving the screen mid-check must not resolve later.
  const verifyTimer = useRef<number | null>(null)
  useEffect(() => () => {
    if (verifyTimer.current !== null) window.clearTimeout(verifyTimer.current)
  }, [])

  function set<K extends keyof TrustSettings>(key: K, value: TrustSettings[K]) {
    onChange((prev) => ({ ...prev, [key]: value }))
  }

  function verify() {
    if (trust.identityVerified || verifying) return
    setVerifying(true)
    // Simulated verification — a real build would run an ID/liveness check here.
    verifyTimer.current = window.setTimeout(() => {
      verifyTimer.current = null
      set('identityVerified', true)
      setVerifying(false)
    }, 1600)
  }

  const band = score >= 80 ? 'Highly trusted' : score >= 50 ? 'Building trust' : 'Getting started'

  return (
    <div className="min-h-dvh bg-cream pb-20">
      <header className="border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <BackButton onClick={onBack} />
          <Logo className="text-ink" />
          <span className="text-xs uppercase tracking-[0.2em] text-muted">Protections</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6">
        <section className="py-10">
          <p className="animate-fade text-xs font-medium uppercase tracking-[0.22em] text-gold">
            Your protections
          </p>
          <h1 className="animate-rise mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
            Built to feel safe.
          </h1>
          <p className="animate-rise mt-4 max-w-lg text-[1.04rem] leading-relaxed text-ink-soft text-pretty">
            No time-wasters, no creeps in the shadows, and every member verified
            before your city opens. These are the controls that protect you — and
            signal to others that you’re here for something real.{' '}
            {isWoman ? 'Sister, these are yours to set.' : ''}
          </p>

          {/* Trust score */}
          <div className="animate-rise mt-8 overflow-hidden rounded-card border border-line bg-white/60 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                  Your trust score
                </p>
                <p className="mt-1 font-display text-[1.4rem] font-medium text-ink">{band}</p>
              </div>
              <span className="font-display text-4xl font-medium text-forest tabular-nums">{score}</span>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-forest transition-all duration-700"
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="mt-3 text-[0.85rem] text-muted">
              These are what a serious person looks like here. When your city opens, they decide who you meet and who meets you.
            </p>
          </div>
        </section>

        {/* Controls */}
        <div className="space-y-3">
          <Control
            title="Verify your identity"
            desc="A one-time check that you are who you say you are — the single biggest trust signal. In this founding preview it records your pledge; the full ID and liveness check arrives at launch."
            icon={<ShieldGlyph />}
          >
            {trust.identityVerified ? (
              <span className="animate-rise inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-2 text-[0.82rem] font-semibold text-cream">
                <CheckIcon /> Verified
              </span>
            ) : (
              <button
                onClick={verify}
                disabled={verifying}
                className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-[0.85rem] font-medium text-cream transition hover:bg-forest-deep disabled:opacity-70"
              >
                {verifying && <Spinner />}
                {verifying ? 'Verifying…' : 'Verify'}
              </button>
            )}
          </Control>

          <Control
            title="Serious-intention badge"
            desc="Publicly mark that you’re here for marriage, not for passing time. It tells the unserious to keep scrolling."
            icon={<RingGlyph />}
          >
            <Toggle
              on={trust.seriousIntention}
              label="Serious-intention badge"
              onClick={() => set('seriousIntention', !trust.seriousIntention)}
            />
          </Control>

          <Control
            title="Wali-friendly"
            desc="Welcome family or a wali into the process from the start. A green flag for those who take this the honourable way."
            icon={<PeopleGlyph />}
          >
            <Toggle
              on={trust.waliFriendly}
              label="Wali-friendly"
              onClick={() => set('waliFriendly', !trust.waliFriendly)}
            />
          </Control>

          <Control
            title="Blur photos until mutual interest"
            desc="When photos arrive, yours stay private until you both choose to connect. Set it now and it holds from your first day."
            icon={<EyeOffGlyph />}
            recommended={isWoman}
          >
            <Toggle
              on={trust.blurPhotos}
              label="Blur photos until mutual interest"
              onClick={() => set('blurPhotos', !trust.blurPhotos)}
            />
          </Control>

          <Control
            title="Keep the Guide on this device"
            desc="Your guide answers from your phone alone. Answers are shorter and less tailored, and nothing you write to it ever leaves — not your question, not your map."
            icon={<LockGlyph />}
          >
            <Toggle
              on={trust.guideOnDevice}
              label="Keep the Guide on this device"
              onClick={() => set('guideOnDevice', !trust.guideOnDevice)}
            />
          </Control>

          <Control
            title="Privacy shield"
            desc="Stay hidden from anyone outside your criteria, and from people you might know — the fear that keeps most of us off these apps. Recorded now, enforced the day your city opens."
            icon={<LockGlyph />}
            recommended={isWoman}
          >
            <Toggle
              on={trust.privacyShield}
              label="Privacy shield"
              onClick={() => set('privacyShield', !trust.privacyShield)}
            />
          </Control>
        </div>

        {/* Where the data lives — the skeptic's first question, answered plainly.
            True today by construction: everything persists in local storage only. */}
        <section className="mt-10 flex items-start gap-4 rounded-card border border-line bg-white/50 p-5">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-sand text-ink-soft">
            <LockGlyph />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[1.08rem] font-medium text-ink">
              Where your answers live
            </h3>
            <p className="mt-1 text-[0.88rem] leading-snug text-muted text-pretty">
              Your reflection, your check-ins and every answer you gave are stored
              on this device — not on our servers, and no one at Niyyah can read
              them. That includes any read you take on someone: those eleven
              answers stay here, and we never ask their name in the first place.
              Three things can change that, and only if you choose them.
            </p>
            <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
              <span className="font-medium text-ink">Keeping your map.</span> If you
              ask us to keep it, your answers and your map are copied to our server
              so your code can find them again on another phone. No name is
              attached to that code, and without it nobody can reach them.
            </p>
            <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
              <span className="font-medium text-ink">Joining the founding cohort.</span>{' '}
              If you ask to be counted, your map is kept as above, and we record
              your city, who you’re seeking, the hardest part you named, your
              overall number and which guide voices you’ve used — under that same
              code, with no name on it. Your email or phone goes separately to
              the founder, so we can write to you when someone fits; it is never
              stored next to your answers.
            </p>
            <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
              The Guide is the other exception, and here is exactly what it sends
              when you ask it something: your message, and a summary of your map —
              your first name, city, timeline, where you are in your practice, how
              central faith is, family’s role, children, your non-negotiables, and
              what you named as the hardest part, which stage you said you’re at,
              and — if you’ve taken a read — one line saying how it came out. Never
              their name; we don’t have it. It goes to Claude, made by Anthropic,
              which writes the reply. We don’t store it. If you would
              rather none of that left your phone, turn on
              <span className="font-medium text-ink"> Keep the Guide on this device</span>{' '}
              above — the guide then answers offline, and nothing is sent at all.
            </p>
          </div>
        </section>

        {/* Community promise */}
        <section className="mt-6 rounded-card bg-forest p-6 text-cream">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-soft">Our promise</p>
          <p className="mt-3 text-[1rem] leading-relaxed text-cream/90 text-pretty">
            Every member will be held to the same standard. Reports are meant to
            have real consequences — players, liars, and creeps removed, not
            warned. That is the promise this opens with, and what we’ll be judged
            on. What’s built in the light, with dignity, is what we protect.
          </p>
        </section>
      </main>
    </div>
  )
}

function Control({
  title,
  desc,
  icon,
  recommended,
  children,
}: {
  title: string
  desc: string
  icon: ReactNode
  recommended?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-4 rounded-card border border-line bg-white/50 p-5">
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-sand text-ink-soft">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-[1.08rem] font-medium text-ink">{title}</h3>
          {recommended && (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-gold">
              Recommended
            </span>
          )}
        </div>
        <p className="mt-1 text-[0.88rem] leading-snug text-muted text-pretty">{desc}</p>
      </div>
      <div className="flex-none pt-0.5">{children}</div>
    </div>
  )
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      // Without this the control announces as "switch, off" with no name —
      // the surrounding title is not associated with it.
      aria-label={label}
      className={`relative h-7 w-12 flex-none rounded-full transition-colors duration-200 ${
        on ? 'bg-forest' : 'bg-sand'
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-cream shadow transition-all duration-200 ${
          on ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  )
}
