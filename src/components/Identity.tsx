import type { Gender, Identity } from '../types'
import { MIN_AGE } from '../types'
import { BackButton, Button, CheckIcon, ArrowRight, fieldClass } from './ui'

interface Props {
  identity: Identity
  onChange: (identity: Identity) => void
  onContinue: () => void
  onBack: () => void
}

const options: { gender: Gender; label: string; sub: string }[] = [
  { gender: 'woman', label: 'I am a woman', sub: 'seeking a husband' },
  { gender: 'man', label: 'I am a man', sub: 'seeking a wife' },
]

export default function IdentityStep({ identity, onChange, onContinue, onBack }: Props) {
  return (
    <div className="relative min-h-dvh bg-cream">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-6 pb-12 pt-6">
        <BackButton onClick={onBack} className="self-start" />

        <div className="flex flex-1 flex-col justify-center py-10">
          <p className="animate-fade text-xs font-medium uppercase tracking-[0.24em] text-gold">
            First, the basics
          </p>
          <h1 className="animate-rise mt-4 font-display text-[2.3rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.7rem]">
            Let’s start with you.
          </h1>
          <p className="animate-rise mt-4 max-w-md text-[1.05rem] leading-relaxed text-ink-soft text-pretty">
            Ten seconds — then your first insight.
          </p>

          {/* Gender — the one required choice, so it comes first. */}
          <div className="animate-rise mt-9 grid gap-3 sm:grid-cols-2" style={{ animationDelay: '60ms' }}>
            {options.map((opt) => {
              const selected = identity.gender === opt.gender
              return (
                <button
                  key={opt.gender}
                  type="button"
                  onClick={() => onChange({ ...identity, gender: opt.gender })}
                  className={`rounded-card border p-5 text-left transition-all duration-200 ${
                    selected
                      ? 'border-forest bg-forest text-cream shadow-lift'
                      : 'border-line bg-white/50 text-ink hover:border-forest/40 hover:bg-white'
                  }`}
                >
                  <span className="font-display text-[1.25rem] font-medium">{opt.label}</span>
                  <span className={`mt-1 block text-[0.9rem] ${selected ? 'text-cream/70' : 'text-muted'}`}>
                    {opt.sub}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Name only — age and community wait until the profile, where their
              value is visible. Nothing else stands between here and the insight. */}
          <div className="animate-rise mt-6" style={{ animationDelay: '120ms' }}>
            <label
              htmlFor="identity-first-name"
              className="mb-2 block text-sm font-medium text-ink-soft"
            >
              What should we call you?{' '}
              <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="identity-first-name"
              type="text"
              value={identity.firstName ?? ''}
              onChange={(e) => onChange({ ...identity, firstName: e.target.value })}
              placeholder="Your first name"
              autoComplete="given-name"
              className={`w-full px-4 py-3.5 text-[1rem] ${fieldClass}`}
            />
          </div>

          {/* The age gate. Marriage is an adults-only process, so this is a
              deliberate tap rather than a line buried in terms nobody reads. */}
          <div className="animate-rise mt-6" style={{ animationDelay: '150ms' }}>
            <button
              type="button"
              role="checkbox"
              aria-checked={!!identity.adult}
              onClick={() => onChange({ ...identity, adult: !identity.adult })}
              className={`flex w-full items-center gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                identity.adult
                  ? 'border-forest/40 bg-forest/[0.06]'
                  : 'border-line bg-white/50 hover:border-forest/30 hover:bg-white'
              }`}
            >
              <span
                className={`flex h-6 w-6 flex-none items-center justify-center rounded-lg border transition-all ${
                  identity.adult
                    ? 'border-forest bg-forest text-cream'
                    : 'border-line bg-cream'
                }`}
              >
                {identity.adult && <CheckIcon size={13} />}
              </span>
              <span className="text-[0.92rem] leading-snug text-ink-soft text-pretty">
                I confirm I am {MIN_AGE} or older.
              </span>
            </button>
          </div>

          <div className="animate-rise mt-9" style={{ animationDelay: '180ms' }}>
            <Button
              onClick={onContinue}
              disabled={!identity.gender || !identity.adult}
              className="group"
            >
              Continue
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
            <p
              className={`mt-3 text-xs text-muted transition-opacity duration-300 ${
                identity.gender && identity.adult ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {!identity.gender
                ? 'Choose who you are to continue.'
                : `Confirm you are ${MIN_AGE} or older to continue.`}
            </p>
          </div>
          <p className="animate-fade mt-4 text-xs text-muted" style={{ animationDelay: '240ms' }}>
            Nothing you share here is visible to anyone — no profile exists until you choose.
          </p>
        </div>
      </div>
    </div>
  )
}
