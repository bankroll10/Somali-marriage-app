import { useState } from 'react'
import type { AnswerValue, Answers, Identity, Reflection, WaitlistState, VouchState } from '../types'
import { MAX_AGE, MIN_AGE } from '../types'
import { getScene, scenes } from '../data/scenes'
import Cohort from './Cohort'
import InviteRow from './InviteRow'
import VouchRow from './VouchRow'
import type { LedgerEntry } from '../lib/ledger'
import HowYoudLive from './HowYoudLive'
import { CheckIcon, ScreenHeader, ShieldGlyph, fieldClass } from './ui'

interface Props {
  identity: Identity
  answers: Answers
  /** Null for a member with a Home but no map yet. */
  reflection: Reflection | null
  /** What she has done here — shown as a row that opens Trust. */
  ledger: LedgerEntry[]
  /** A family member's vouch, once given. */
  vouch: VouchState | null
  onKept: (code: string) => void
  onChangeIdentity: (updater: (prev: Identity) => Identity) => void
  /** False when the browser refuses to persist — never claim "Saved" then. */
  saveOk: boolean
  onOpenTrust: () => void
  onOpenPlus: () => void
  waitlist: WaitlistState | null
  onJoinWaitlist: (s: WaitlistState) => void
  /** Optional answers about how she'd live, read by the alignment engine. */
  onAnswer: (questionId: string, value: AnswerValue) => void
  /** Reflect again — keeps every record. */
  onRetake: () => void
  onBack: () => void
}

/**
 * What decides who you meet.
 *
 * This was a profile: a banner, an avatar with a "No photo yet" badge and no
 * way to add one, a bio textarea, "Add your age and community →", and the line
 * "This is how members will see you when your city opens." A marketplace
 * profile for a room with nobody in it, teaching her that presentation is the
 * work. The product's thesis is that it is not.
 *
 * What is here now is what will actually decide who meets whom when a city
 * opens: what she has done here, what she will not compromise on, how she
 * would live, and whether her family has vouched. A bio is asked for when a
 * real introduction needs one, and not before.
 */
export default function Profile({
  identity,
  answers,
  reflection,
  ledger,
  vouch,
  onKept,
  onChangeIdentity,
  saveOk,
  onOpenTrust,
  onOpenPlus,
  waitlist,
  onJoinWaitlist,
  onAnswer,
  onRetake,
  onBack,
}: Props) {
  const name = identity.firstName?.trim()
  const scene = getScene(identity.scene)
  const done = ledger.filter((e) => e.done)

  // Age and community are the two facts an introduction cannot do without.
  // Asked here, plainly, and only while one is missing.
  const [detailsOpen, setDetailsOpen] = useState(false)
  const detailsMissing = !identity.age || !identity.scene

  return (
    <div className="min-h-dvh bg-cream pb-20">
      <ScreenHeader onBack={onBack}>
        <p className="font-display text-[1.05rem] font-medium text-ink">What decides who you meet</p>
      </ScreenHeader>

      <main className="mx-auto max-w-2xl px-6">
        <section className="py-8">
          <h1 className="animate-rise font-display text-[1.9rem] font-medium leading-tight tracking-tight text-ink text-balance">
            {name ? `${name}, this is what will decide it.` : 'This is what will decide it.'}
          </h1>
          <p className="animate-rise mt-3 text-[0.98rem] leading-relaxed text-ink-soft text-pretty">
            Not a photo, not a bio, not a number. When your city opens, who you meet is decided by what
            you have actually done here, what you will not compromise on, and how you would live. All of
            it is yours to do or not — and none of it can be tapped into being.
          </p>
          {!saveOk && (
            <p className="mt-3 text-[0.85rem] font-medium text-clay text-pretty">
              This browser isn’t saving — private browsing or full storage will do that.
            </p>
          )}
        </section>

        {/* What she has done here — the ledger, which cannot be tapped. */}
        <button
          onClick={onOpenTrust}
          className="group flex w-full items-center gap-3 rounded-card border border-line bg-white/60 px-5 py-4 text-left transition-all hover:border-forest/40 hover:bg-white"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-forest/10 text-forest">
            <ShieldGlyph className="h-[18px] w-[18px]" />
          </span>
          <span className="flex-1">
            <span className="block text-[0.95rem] font-medium text-ink">What you’ve done here</span>
            <span className="block text-[0.8rem] text-muted text-pretty">
              {done.length === 0
                ? 'Nothing yet — and nothing here can be tapped into being.'
                : done.map((e) => e.label.toLowerCase()).join(' · ')}
            </span>
          </span>
          <span className="text-[0.85rem] font-medium text-forest">See →</span>
        </button>

        {/* Vouched by family — the only verification we claim. Or the ask. */}
        <VouchRow vouch={vouch} onKept={onKept} />

        {/* What she will not compromise on — hard gates before anything is weighed. */}
        {reflection && reflection.nonNegotiables.length > 0 && (
          <section className="mt-5 rounded-card border border-line bg-white/60 p-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">
              What you won’t compromise on
            </p>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-muted text-pretty">
              Checked first, before anything else about a person is weighed. Someone who fails one of
              these is never introduced, however much else fits.
            </p>
            <ul className="mt-3 space-y-1.5">
              {reflection.nonNegotiables.map((n) => (
                <li key={n} className="flex items-start gap-2.5 text-[0.95rem] text-ink-soft">
                  <span className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-gold" />
                  {n}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* How you'd live — the three grounds Somali marriages break on. */}
        <section className="mt-5 rounded-card border border-line bg-white/60 p-5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">How you’d live</p>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-muted text-pretty">
            Whose house, work, and money home. Read by the alignment engine when your city opens;
            nobody sees the answers themselves.
          </p>
          <div className="mt-4">
            <HowYoudLive answers={answers} onAnswer={onAnswer} />
          </div>
        </section>

        {/* What you carry — from the map, for her; not a headline for anyone else. */}
        {reflection && reflection.coreValues.length > 0 && (
          <section className="mt-5 rounded-card border border-line bg-white/60 p-5">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">What you carry</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {reflection.coreValues.map((v) => (
                <span
                  key={v}
                  className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-[0.85rem] font-medium text-forest"
                >
                  {v}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* The two facts an introduction cannot do without. */}
        <section className="mt-5 rounded-card border border-line bg-white/60 p-5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">The facts an introduction needs</p>
          <p className="mt-2 text-[0.95rem] text-ink-soft">
            {identity.age ? `${identity.age}` : 'Age not given'}
            {' · '}
            {scene ? scene.label : 'Community not given'}
          </p>
          {detailsMissing && !detailsOpen && (
            <button
              onClick={() => setDetailsOpen(true)}
              className="mt-3 rounded-full border border-dashed border-forest/40 px-3 py-1.5 text-[0.8rem] font-medium text-forest transition hover:bg-forest/5"
            >
              {!identity.age && !identity.scene
                ? 'Add your age and community'
                : !identity.age
                  ? 'Add your age'
                  : 'Add your community'}
            </button>
          )}
          {detailsOpen && (
            <div className="mt-4">
              <div className="flex items-end gap-3">
                <div className="w-24 flex-none">
                  <label htmlFor="profile-age" className="mb-2 block text-sm font-medium text-ink-soft">
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
                      onChangeIdentity((prev) => ({ ...prev, age: valid ? n : undefined }))
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
              <p id="profile-scene-label" className="mb-2 mt-4 block text-sm font-medium text-ink-soft">
                Where’s your community?
              </p>
              <div role="group" aria-labelledby="profile-scene-label" className="flex flex-wrap gap-2">
                {scenes.map((s) => {
                  const selected = identity.scene === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onChangeIdentity((prev) => ({ ...prev, scene: selected ? undefined : s.id }))}
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
        </section>

        {/* What's free and what isn't — a plain row, no badge. */}
        <button
          onClick={onOpenPlus}
          className="group mt-5 flex w-full items-center gap-3 rounded-card border border-line bg-white/60 px-5 py-4 text-left transition-colors hover:border-forest/40"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gold/15 text-gold">
            <CheckIcon size={15} />
          </span>
          <span className="flex-1">
            <span className="text-[0.95rem] font-medium text-ink">What’s free, and what isn’t</span>
            <span className="mt-0.5 block text-[0.8rem] text-muted">
              Almost everything, forever. Nothing here is priced by the reply or the month.
            </span>
          </span>
          <span className="text-[0.85rem] font-medium text-forest">View →</span>
        </button>

        <div className="mt-3.5">
          <InviteRow source="profile" gender={identity.gender} title="Invite one serious person" />
        </div>

        <div className="mt-5">
          <Cohort
            identity={identity}
            hookId={answers['hardest-part'] as string | undefined}
            ledger={done.map((e) => e.id)}
            joined={waitlist}
            onJoined={onJoinWaitlist}
            onScene={(scene) => onChangeIdentity((prev) => ({ ...prev, scene }))}
            compact
          />
        </div>

        <div className="mt-5 text-center">
          <p className="text-[0.82rem] text-muted text-pretty">
            {reflection
              ? 'What you won’t compromise on comes from your map.'
              : 'Build your map and what you won’t compromise on appears here.'}
          </p>
          <button
            onClick={onRetake}
            className="mt-2 text-[0.85rem] font-medium text-forest underline-offset-4 transition hover:underline"
          >
            Something changed — answer again
          </button>
        </div>
      </main>
    </div>
  )
}
