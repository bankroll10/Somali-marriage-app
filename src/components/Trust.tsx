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
  countMe: boolean
  onCountMe: (on: boolean) => void
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
export default function Trust({ identity, ledger, guideOnDevice, onGuideOnDevice, countMe, onCountMe, onBack }: Props) {
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

        {/* The two controls that do what they say. Each gates the call itself. */}
        <div className="space-y-4">
          <Control
            title="Keep the Guide on this device"
            desc="Your guide answers from your phone alone. Answers are shorter and less tailored, and nothing you write to it ever leaves — not your question, not your map."
            icon={<LockGlyph />}
          >
            <Toggle on={guideOnDevice} label="Keep the Guide on this device" onClick={() => onGuideOnDevice(!guideOnDevice)} />
          </Control>

          <Control
            title="Count me"
            desc="When you do one of the things above, we count that it happened — the step, the date, and for a few steps how it came out, in a word from a list we wrote — under a random code that is not your map code. No answer in your words, no name, nothing that leads back to you. It is how we find out whether any of this actually helps anyone. Turn it off and nothing is sent."
            icon={<LockGlyph />}
          >
            <Toggle on={countMe} label="Count me" onClick={() => onCountMe(!countMe)} />
          </Control>
        </div>

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
              first place. Six things can change that, and only if you choose
              them.
            </p>
            <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
              <span className="font-medium text-ink">Keeping your map.</span> If you
              ask us to keep it, what the app needs to bring you back is copied to
              our server under your code: the first name you gave and your age, your
              answers and every reading of your map, where you said you are and the
              work you took on, any read or Before you say yes you’ve done, your
              couple code, your family’s vouch, that you asked to be counted, and —
              if you’ve married — what you told us on the way out. Three things are
              left out on purpose: your email or phone, your conversations with the
              guide, and anything the guide handed you to say. Those never leave this
              phone under your code. The code itself is registered to nobody, and
              without it nobody can reach the map.
            </p>
            <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
              <span className="font-medium text-ink">Joining the founding cohort.</span>{' '}
              If you ask to be counted, your map is kept as above, and we record
              your city, who you’re seeking, the hardest part you named, and
              which of the things above you’ve done — under that same code, with
              no name on it. Nothing about how your map read, and nothing about
              how you use the app, goes anywhere.
              Your email or phone goes separately to the founder, so we can write
              to you when someone fits; it is never stored next to your answers.
            </p>
            <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
              <span className="font-medium text-ink">Asking him to do the eleven too.</span>{' '}
              If you send him the link, your eleven answers go to our server under a
              code with no name on it, and his go there when he answers. The server
              sends back only where you match — never your sheet to him, never his
              to you. From your own answer you can still tell whether he thinks a
              conversation happened; that is the point, and he can tell the same
              about you. Your answers are frozen the moment he answers, his after
              once, and the whole thing expires after ninety days. Once he has
              answered, your pair is also added to a count of how pairs come out on
              each of the eleven — both agree, neither has raised it, one thinks it
              was talked about — with no code and no side attached, so we can learn
              which conversations couples here most often miss.
            </p>
            <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
              <span className="font-medium text-ink">Asking your family to vouch.</span>{' '}
              If you send a family member the link, your map is kept as above. The
              link carries a token made for them, not your code, so nobody holding it
              can open your map. What they write — who they are to you, their first
              name, one sentence, and a phone number if they leave one — is stored
              under your code. It
              stays exactly as long as your map does, and goes when your map goes. Only
              their first name and who they are to you ever come back to any screen.
              Their sentence and their number are read by the founder alone, who may
              call to confirm, and are never shown to anyone you meet.
            </p>
            <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
              <span className="font-medium text-ink">Being counted in the ladder.</span>{' '}
              While <span className="font-medium text-ink">Count me</span> is on, each
              time you first reach one of the steps above — you said what was
              happening, you built a map, you took a read, you went through the
              eleven, you asked him, he answered, you had the conversation, your
              family vouched, you were counted, you’re deciding, you’re married —
              that step and the date reach us, along with your city if you gave
              one. A few of those steps also say, in a word, how they came out:
              which of your map’s seven grounds read thin, steady or strong; how
              the read came out and which ground it found thinnest; how many of
              the eleven you had agreed on, differed on, not had, or did not yet
              know your own answer to, and which one it told you to open; which
              conversation you later confirmed you had; and, at the end, the three
              things you tap on the way out — who you married, what decided it,
              and what here you used. Every one of those is a choice from a list
              we wrote. Never an answer in your words, never the line you write
              for the next person, never a word the guide said or you said to it,
              and never a name — his, yours or your family’s. If you opened Niyyah
              from a link someone sent you, it also says what kind of link that
              was — words, the eleven, a couple’s link, the door, a family link,
              or a link from someone this worked for — and never who sent it. It
              goes under a code this phone made up for itself, which is not your
              map code — nothing links the two by name, and every date is a day,
              never a time. Nothing about how long you spent here or how often
              you opened it. Turn the
              control off and none of it is sent.
            </p>
            <p className="mt-2.5 text-[0.88rem] leading-snug text-muted text-pretty">
              The Guide is the last exception, and here is exactly what it sends
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
