import { useEffect, useRef, useState } from 'react'
import type { Answers, Identity, Reflection, TrustSettings, WaitlistState } from '../types'
import { MAX_AGE, MIN_AGE } from '../types'
import { getScene, scenes } from '../data/scenes'
import { shareOrCopy } from '../lib/share'
import Waitlist from './Waitlist'
import { CheckIcon, ScreenHeader, ShieldGlyph, fieldClass } from './ui'

const INVITE_TEXT = `Salaam — I’ve been using Niyyah, a marriage platform actually built for us: serious, wali-friendly, no swiping. It starts with an honest readiness reflection, not photos. I think you’d get it. niyyah.app`

interface Props {
  identity: Identity
  answers: Answers
  reflection: Reflection
  trust: TrustSettings
  onChangeBio: (bio: string) => void
  onChangeIdentity: (updater: (prev: Identity) => Identity) => void
  /** False when the browser refuses to persist — never claim "Saved" then. */
  saveOk: boolean
  onOpenTrust: () => void
  onOpenPlus: () => void
  /** Niyyah+ state, so this row never misdescribes what they have. */
  plusActive: boolean
  trialDaysLeft: number
  waitlist: WaitlistState | null
  onJoinWaitlist: (s: WaitlistState) => void
  /** Reflect again — keeps every check-in, connection, and milestone. */
  onRetake: () => void
  onBack: () => void
}

export default function Profile({
  identity,
  answers,
  reflection,
  trust,
  onChangeBio,
  onChangeIdentity,
  saveOk,
  onOpenTrust,
  onOpenPlus,
  plusActive,
  trialDaysLeft,
  waitlist,
  onJoinWaitlist,
  onRetake,
  onBack,
}: Props) {
  const name = identity.firstName?.trim() || 'You'
  const scene = getScene(identity.scene)
  const initial = name.charAt(0).toUpperCase()
  const bioSuggestion = (answers['bring'] as string | undefined)?.trim()
  const protections = Object.values(trust).filter(Boolean).length

  // Quiet autosave feedback — edits persist automatically; say so, briefly.
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setSaveState('saving')
    const t1 = window.setTimeout(() => setSaveState('saved'), 600)
    const t2 = window.setTimeout(() => setSaveState('idle'), 2600)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [identity.bio, identity.age, identity.scene])

  // Inviting someone: the native share sheet on a phone, clipboard on desktop.
  const [invited, setInvited] = useState(false)
  async function handleInvite() {
    const result = await shareOrCopy(
      { text: INVITE_TEXT, url: 'https://niyyah.app' },
      'invite_copied',
    )
    if (result === 'copied') {
      setInvited(true)
      window.setTimeout(() => setInvited(false), 2400)
    }
  }

  // Age + community are asked here — where their value on the card is visible —
  // not during onboarding. Expander shows only while something is missing.
  const [detailsOpen, setDetailsOpen] = useState(false)
  const detailsMissing = !identity.age || !identity.scene

  return (
    <div className="min-h-dvh bg-cream pb-20">
      <ScreenHeader onBack={onBack}>
        <p className="font-display text-[1.05rem] font-medium text-ink">Your profile</p>
      </ScreenHeader>

      <main className="mx-auto max-w-2xl px-6">
        <p className="animate-fade py-6 text-[0.95rem] leading-relaxed text-muted text-pretty">
          This is how serious, verified members will see you — depth first. No one
          sees your photo until you both choose to connect.
        </p>

        {/* Profile card */}
        <div className="animate-rise overflow-hidden rounded-card border border-line bg-white/60">
          {/* Banner */}
          <div className="relative h-28 bg-forest-deep">
            <div className="bg-geo absolute inset-0 opacity-30" aria-hidden />
          </div>

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="-mt-12 flex items-end justify-between">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-cream bg-sand">
                  <span className="font-display text-3xl font-medium text-forest">{initial}</span>
                </div>
                <span className="absolute -bottom-1 -right-1 rounded-full bg-cream px-2 py-0.5 text-[0.62rem] font-medium text-muted shadow">
                  Blurred
                </span>
              </div>
            </div>

            <h1 className="mt-4 font-display text-[1.7rem] font-medium tracking-tight text-ink">
              {name}
              {identity.age ? `, ${identity.age}` : ''}
            </h1>
            {scene && <p className="mt-0.5 text-[0.95rem] text-muted">{scene.label}</p>}

            {detailsMissing && !detailsOpen && (
              <button
                onClick={() => setDetailsOpen(true)}
                className="mt-3 rounded-full border border-dashed border-forest/40 px-3 py-1.5 text-[0.8rem] font-medium text-forest transition hover:bg-forest/5"
              >
                {!identity.age && !identity.scene
                  ? 'Add your age and community →'
                  : !identity.age
                    ? 'Add your age →'
                    : 'Add your community →'}
              </button>
            )}
            {detailsOpen && (
              <div className="mt-4 rounded-2xl border border-line bg-white/50 p-4">
                <div className="flex items-end gap-3">
                  <div className="w-24 flex-none">
                    <label
                      htmlFor="profile-age"
                      className="mb-2 block text-sm font-medium text-ink-soft"
                    >
                      Age
                    </label>
                    <input
                      id="profile-age"
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={identity.age ?? ''}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10)
                        // Below the gate is not a valid age here — someone who
                        // confirmed 18+ at the door cannot type their way under it.
                        const valid = Number.isFinite(n) && n >= MIN_AGE && n <= MAX_AGE
                        onChangeIdentity((prev) => ({
                          ...prev,
                          age: valid ? n : undefined,
                        }))
                      }}
                      placeholder="—"
                      aria-describedby="profile-age-hint"
                      className={`w-full px-4 py-2.5 text-center text-[1rem] ${fieldClass}`}
                    />
                    <p id="profile-age-hint" className="mt-1.5 text-[0.7rem] text-muted">
                      {MIN_AGE}–{MAX_AGE}
                    </p>
                  </div>
                  <button
                    onClick={() => setDetailsOpen(false)}
                    className="ml-auto pb-2.5 text-[0.85rem] font-medium text-forest underline-offset-4 hover:underline"
                  >
                    Done
                  </button>
                </div>
                {/* A heading for a group of choices, not a field label — so it
                    names the group rather than pointing at a single control. */}
                <p
                  id="profile-scene-label"
                  className="mb-2 mt-4 block text-sm font-medium text-ink-soft"
                >
                  Where’s your community?
                </p>
                <div
                  role="group"
                  aria-labelledby="profile-scene-label"
                  className="flex flex-wrap gap-2"
                >
                  {scenes.map((s) => {
                    const selected = identity.scene === s.id
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          onChangeIdentity((prev) => ({
                            ...prev,
                            scene: selected ? undefined : s.id,
                          }))
                        }
                        aria-pressed={selected}
                        className={`rounded-full border px-3.5 py-1.5 text-[0.85rem] font-medium transition-all ${
                          selected
                            ? 'border-forest bg-forest text-cream'
                            : 'border-line bg-white/50 text-ink-soft hover:border-forest/40 hover:bg-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Trust badges */}
            <div className="mt-4 flex flex-wrap gap-2">
              {trust.identityVerified ? (
                <Badge tone="forest">✓ Verified</Badge>
              ) : (
                <button
                  onClick={onOpenTrust}
                  className="rounded-full border border-dashed border-clay/50 px-3 py-1.5 text-[0.8rem] font-medium text-clay transition hover:bg-clay/5"
                >
                  Verify your identity →
                </button>
              )}
              {trust.seriousIntention && <Badge tone="gold">Serious about marriage</Badge>}
              {trust.waliFriendly && <Badge tone="sand">Wali-friendly</Badge>}
            </div>

            {/* Protections — trust settings live with the profile they protect. */}
            <button
              onClick={onOpenTrust}
              className="group mt-4 flex w-full items-center gap-3 rounded-2xl border border-line bg-white/50 px-4 py-3 text-left transition-all hover:border-forest/40 hover:bg-white"
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-forest/10 text-forest">
                <ShieldGlyph className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1">
                <span className="block text-[0.95rem] font-medium text-ink">Your protections</span>
                <span className="block text-[0.8rem] text-muted">
                  {protections} of 5 set —{' '}
                  {protections >= 4 ? 'you’re well protected' : 'worth finishing'}
                </span>
              </span>
              <span className="text-[0.85rem] font-medium text-forest">Manage →</span>
            </button>

            {/* Readiness (dignified — no public number) */}
            <div className="mt-5 rounded-2xl bg-sand/40 px-4 py-3">
              <p className="text-[0.78rem] font-medium uppercase tracking-[0.16em] text-muted">
                Marriage readiness
              </p>
              <p className="mt-1 font-display text-[1.1rem] font-medium text-forest">
                {reflection.headline}
              </p>
            </div>

            {/* Bio */}
            <div className="mt-5">
              <div className="mb-2 flex items-baseline justify-between">
                <label className="block text-[0.78rem] font-medium uppercase tracking-[0.16em] text-muted">
                  In your words
                </label>
                {/* Never claim "Saved" when the browser rejected the write. */}
                {saveOk ? (
                  <span
                    className={`inline-flex items-center gap-1 text-[0.72rem] transition-opacity duration-300 ${
                      saveState === 'idle' ? 'opacity-0' : 'opacity-100'
                    } ${saveState === 'saved' ? 'text-forest' : 'text-muted'}`}
                    aria-live="polite"
                  >
                    {saveState === 'saved' && <CheckIcon size={10} />}
                    {saveState === 'saving' ? 'Saving…' : 'Saved'}
                  </span>
                ) : (
                  <span className="text-[0.72rem] font-medium text-clay" aria-live="polite">
                    Not saved — this browser blocks storage
                  </span>
                )}
              </div>
              <textarea
                value={identity.bio ?? ''}
                onChange={(e) => onChangeBio(e.target.value)}
                rows={3}
                placeholder={
                  bioSuggestion ? `e.g. ${bioSuggestion}` : 'A few honest, warm lines about you…'
                }
                className={`w-full resize-none bg-white/70 p-3.5 text-[0.98rem] leading-relaxed ${fieldClass}`}
              />
              {bioSuggestion && !identity.bio && (
                <button
                  onClick={() => onChangeBio(bioSuggestion)}
                  className="mt-2 text-[0.82rem] font-medium text-forest underline-offset-4 hover:underline"
                >
                  Use what you wrote in your reflection
                </button>
              )}
            </div>

            {/* Values */}
            {reflection.coreValues.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-[0.78rem] font-medium uppercase tracking-[0.16em] text-muted">
                  What you carry
                </p>
                <div className="flex flex-wrap gap-2">
                  {reflection.coreValues.map((v) => (
                    <span
                      key={v}
                      className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-[0.85rem] font-medium text-forest"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Non-negotiables */}
            {reflection.nonNegotiables.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-[0.78rem] font-medium uppercase tracking-[0.16em] text-muted">
                  What matters most
                </p>
                <ul className="space-y-1.5">
                  {reflection.nonNegotiables.map((n) => (
                    <li key={n} className="flex items-start gap-2.5 text-[0.95rem] text-ink-soft">
                      <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold" />
                      {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Niyyah+ — founding-member badge that opens the subscription screen. */}
        <button
          onClick={onOpenPlus}
          className="group mt-5 flex w-full items-center gap-3 rounded-card border border-gold/30 bg-gold/[0.07] px-5 py-4 text-left transition-colors hover:bg-gold/[0.12]"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gold/15 text-gold">
            <CheckIcon size={15} />
          </span>
          <span className="flex-1">
            <span className="flex items-center gap-2">
              <span className="text-[0.95rem] font-medium text-ink">Niyyah+</span>
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-gold">
                {plusActive ? 'Trial' : 'Founding member'}
              </span>
            </span>
            <span className="mt-0.5 block text-[0.8rem] text-muted">
              {plusActive
                ? `${trialDaysLeft} ${trialDaysLeft === 1 ? 'day' : 'days'} left — no card on file, nothing to cancel.`
                : 'What’s free forever, and what isn’t.'}
            </span>
          </span>
          <span className="text-[0.85rem] font-medium text-forest">View →</span>
        </button>

        {/* Inviting someone lives here, not on Home. It's an occasional act, not
            a daily one — and Home belongs to the work. */}
        <button
          onClick={handleInvite}
          className="mt-3.5 flex w-full items-center gap-3 rounded-card border border-line bg-white/60 px-5 py-4 text-left transition-colors hover:border-forest/40"
        >
          <span className="flex-1">
            <span className="block text-[0.95rem] font-medium text-ink">
              Invite one serious person
            </span>
            <span className="mt-0.5 block text-[0.8rem] text-muted">
              A sister, a brother, that friend who’s tired of the apps. Niyyah+
              free for their first year.
            </span>
          </span>
          <span className="inline-flex flex-none items-center gap-1.5 text-[0.85rem] font-medium text-forest">
            {invited ? (
              <>
                <CheckIcon size={12} /> Copied
              </>
            ) : (
              'Copy invite'
            )}
          </span>
        </button>

        {/* Findable forever, nagging never — Home stays clean. */}
        <div className="mt-5">
          <Waitlist
            identity={identity}
            hookId={answers['hardest-part'] as string | undefined}
            overall={reflection.overall}
            joined={waitlist}
            onJoined={onJoinWaitlist}
            compact
          />
        </div>

        <div className="mt-5 text-center">
          <p className="text-[0.82rem] text-muted text-pretty">
            Your values and readiness come from your reflection.
          </p>
          <button
            onClick={onRetake}
            className="mt-2 text-[0.85rem] font-medium text-forest underline-offset-4 transition hover:underline"
          >
            Reflect again — your answers are kept
          </button>
        </div>
      </main>
    </div>
  )
}

function Badge({ tone, children }: { tone: 'forest' | 'gold' | 'sand'; children: React.ReactNode }) {
  const tones = {
    forest: 'bg-forest text-cream',
    gold: 'bg-gold/15 text-forest border border-gold/30',
    sand: 'bg-sand text-ink-soft',
  }
  return (
    <span className={`rounded-full px-3 py-1.5 text-[0.8rem] font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

