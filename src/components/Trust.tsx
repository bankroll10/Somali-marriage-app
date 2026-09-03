import { type ReactNode } from 'react'
import type { Identity } from '../types'
import type { LedgerEntry } from '../lib/ledger'
import { BackButton, CheckIcon, LockGlyph, Logo } from './ui'

interface Props {
  identity: Identity
  /** What she has actually done here — see src/lib/ledger.ts. */
  ledger: LedgerEntry[]
  guideOnDevice: boolean
  onGuideOnDevice: (on: boolean) => void
  onBack: () => void
}

/**
 * Trust, made honest.
 *
 * This screen used to carry a trust score and five switches — an identity
 * "verification" that recorded a pledge, a serious-intention badge,
 * wali-friendly, blur photos, a privacy shield. Nothing enforced any of them.
 * A screen full of protections that do not exist is the opposite of trust.
 *
 * What is here now is true by construction: the ledger of what she has done
 * (which cannot be tapped), the one control that does what it says, and the
 * exact account of where her answers live.
 */
export default function Trust({ identity, ledger, guideOnDevice, onGuideOnDevice, onBack }: Props) {
  const isWoman = identity.gender === 'woman'

  return (
    <div className="min-h-dvh bg-cream pb-20">
      <header className="border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <BackButton onClick={onBack} />
          <Logo className="text-ink" />
          <span className="text-xs uppercase tracking-[0.2em] text-muted">Trust</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6">
        <section className="py-10">
          <p className="animate-fade text-xs font-medium uppercase tracking-[0.22em] text-gold">
            What you’ve done here
          </p>
          <h1 className="animate-rise mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-ink text-balance sm:text-[2.4rem]">
            This is what a serious person looks like here.
          </h1>
          <p className="animate-rise mt-4 max-w-lg text-[1.04rem] leading-relaxed text-ink-soft text-pretty">
            Not a badge you tap. The things you have actually done — each costs a
            little time and a little honesty, and none can be faked. When your city
            opens, this decides who you meet, and who meets you.
            {isWoman ? ' Sister, every one of these is yours to do or not.' : ''}
          </p>

          {/* The ledger. Facts, in order; no number anywhere. */}
          <ul className="animate-rise mt-8 divide-y divide-line overflow-hidden rounded-card border border-line bg-white/60">
            {ledger.map((e) => (
              <li key={e.id} className="flex items-start gap-3.5 px-5 py-4">
                <span
                  className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border ${
                    e.done ? 'border-forest bg-forest text-cream' : 'border-line bg-cream'
                  }`}
                  aria-hidden
                >
                  {e.done && <CheckIcon size={12} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[0.98rem] font-medium ${e.done ? 'text-ink' : 'text-ink-soft'}`}>
                    {e.label}
                  </span>
                  <span className="mt-0.5 block text-[0.85rem] leading-snug text-muted text-pretty">{e.line}</span>
                </span>
                <span className="sr-only">{e.done ? 'done' : 'not yet'}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* The one control that does what it says. */}
        <Control
          title="Keep the Guide on this device"
          desc="Your guide answers from your phone alone. Answers are shorter and less tailored, and nothing you write to it ever leaves — not your question, not your map."
          icon={<LockGlyph />}
        >
          <Toggle on={guideOnDevice} label="Keep the Guide on this device" onClick={() => onGuideOnDevice(!guideOnDevice)} />
        </Control>

        {/* Where the data lives — the skeptic's first question, answered plainly.
            Every sentence here must match the code that sends something. */}
        <section className="mt-6 flex items-start gap-4 rounded-card border border-line bg-white/50 p-5">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-sand text-ink-soft">
            <LockGlyph />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[1.08rem] font-medium text-ink">Where your answers live</h3>
            <p className="mt-1 text-[0.88rem] leading-snug text-muted text-pretty">
              Your reflection, your check-ins and every answer you gave are stored
              on this device — not on our servers, and no one at Niyyah can read
              them. That includes a read you take on someone, and Before you say
              yes: those answers stay here too, and we never ask their name in the
              first place. Three things can change that, and only if you choose
              them.
            </p>
            <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
              <span className="font-medium text-ink">Keeping your map.</span> If you
              ask us to keep it, everything on this device — your answers, your
              map, and any read or Before you say yes you’ve done — is copied to our
              server so your code can find it again on another phone. No name is
              attached to that code, and without it nobody can reach it.
            </p>
            <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
              <span className="font-medium text-ink">Joining the founding cohort.</span>{' '}
              If you ask to be counted, your map is kept as above, and we record
              your city, who you’re seeking, the hardest part you named, your
              overall number, which guide voices you’ve used, and which of the
              things above you’ve done — under that same code, with no name on it.
              Your email or phone goes separately to the founder, so we can write
              to you when someone fits; it is never stored next to your answers.
            </p>
            <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
              The Guide is the other exception, and here is exactly what it sends
              when you ask it something: your message, and a summary of your map —
              your first name, city, timeline, where you are in your practice, how
              central faith is, family’s role, children, your non-negotiables, and
              what you named as the hardest part, which stage you said you’re at,
              and — if you’ve taken a read, or been through Before you say yes —
              one line saying how each came out. Never their name; we don’t have
              it. It goes to Claude, made by Anthropic, which writes the reply. We
              don’t store it. If you would rather none of that left your phone, turn
              on <span className="font-medium text-ink">Keep the Guide on this device</span>{' '}
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

function Control({ title, desc, icon, children }: { title: string; desc: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-4 rounded-card border border-line bg-white/50 p-5">
      <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-sand text-ink-soft">{icon}</span>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-[1.08rem] font-medium text-ink">{title}</h3>
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
      aria-label={label}
      className={`relative h-7 w-12 flex-none rounded-full transition-colors duration-200 ${on ? 'bg-forest' : 'bg-sand'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-cream shadow transition-all duration-200 ${on ? 'left-6' : 'left-1'}`} />
    </button>
  )
}
