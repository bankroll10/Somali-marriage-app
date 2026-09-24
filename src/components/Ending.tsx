import { useState } from 'react'
import type { EndingRecord, Identity } from '../types'
import type { Ending } from '../lib/ending'
import { endingHeadline, marriedShares } from '../lib/ending'
import { ADVICE_PLACEHOLDER, ADVICE_PROMPT, endingQuestions } from '../data/ending'
import { speak } from '../data/read'
import { shareOrCopy } from '../lib/share'
import { Announce, CheckIcon, Logo, TextButton, fieldClass } from './ui'
import ForgetMe, { type Forgot } from './ForgetMe'

interface Props {
  identity: Identity
  /** Her record, built from what she actually did. See src/lib/ending.ts. */
  ending: Ending
  /** She did the eleven — her own, or the two-sided one — so the share may say so. */
  didEleven: boolean
  saved: EndingRecord | null
  onSave: (record: EndingRecord) => void
  /** Everything kept on our server, deleted — the half of "you can delete the app" an uninstall cannot do. */
  onForget: Forgot
  onBack: () => void
}

/**
 * The ending.
 *
 * This is the screen a product in this category is never allowed to build,
 * because it tells a member the thing every other app is structured to prevent:
 * you are finished, and you can delete this now. It is the whole thesis in one
 * page — success is departure, and a departure that is designed is worth more
 * to everyone than one that is quietly discouraged.
 *
 * The order is deliberate and it is not negotiable: she is given her record
 * first, told she owes nothing and can leave, and only then — below all of it,
 * skippable in a scroll — asked the four questions this company needs and the
 * one thing it would like. Nothing on this page is required to finish, and
 * nothing on it is required to leave.
 */
export default function Ending({ identity, ending, didEleven, saved, onSave, onForget, onBack }: Props) {
  const name = identity.firstName?.trim()
  const gender = identity.gender ?? 'woman'
  const questions = endingQuestions(gender)
  const fix = speak(gender)
  const [answers, setAnswers] = useState<EndingRecord>(saved ?? { at: new Date().toISOString() })
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState<'eleven' | 'door' | null>(null)

  function put(patch: Partial<EndingRecord>) {
    const next = { ...answers, ...patch, at: answers.at }
    setAnswers(next)
    onSave(next)
  }

  function toggleUsed(id: string) {
    const used = answers.used ?? []
    put({ used: used.includes(id) ? used.filter((x) => x !== id) : [...used, id] })
  }

  /** The record, as plain text, so it survives leaving. */
  const asText = [
    name ? `${name} — how you chose` : 'How you chose',
    ending.span ? `${ending.span}, start to finish.` : '',
    '',
    ...ending.lines.map((l) => `· ${l.text}`),
    '',
    endingHeadline(ending),
  ]
    .filter((l) => l !== undefined)
    .join('\n')

  async function keep() {
    try {
      await navigator.clipboard.writeText(asText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2400)
    } catch {
      /* clipboard refused — the record is on screen to keep by hand */
    }
  }

  /**
   * The two things only a married person can send — see `marriedShares` in
   * src/lib/ending.ts for why there are two, and why the second is the one
   * that reaches the side the marketplace is short of.
   */
  async function tell(kind: 'eleven' | 'door') {
    const shares = marriedShares(identity, answers.advice, { eleven: didEleven })
    const result = await shareOrCopy(shares[kind], kind === 'eleven' ? 'married_told' : 'married_door')
    if (result === 'copied') {
      setShared(kind)
      window.setTimeout(() => setShared(null), 2400)
    }
  }

  return (
    <div className="min-h-dvh bg-cream pb-20 pt-safe">
      <header className="border-b border-line/70 bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Logo className="text-ink" />
          <TextButton onClick={onBack} className="text-[0.85rem] font-medium text-muted hover:underline">
            Close
          </TextButton>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6">
        {/* The record. Given first, before anything is asked. */}
        <section className="animate-rise relative mt-8 overflow-hidden rounded-card bg-forest-deep p-7 text-cream sm:p-9">
          <div className="bg-geo pointer-events-none absolute inset-0 opacity-30" aria-hidden />
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold-soft">
              {name ? `${name} · how you chose` : 'How you chose'}
            </p>
            <h1 className="mt-3 font-display text-[2rem] font-medium leading-tight tracking-tight text-balance sm:text-[2.4rem]">
              {endingHeadline(ending)}
            </h1>
            {ending.span && (
              <p className="mt-3 text-[0.95rem] text-cream/70">{ending.span}, start to finish.</p>
            )}

            {ending.lines.length > 0 ? (
              <ul className="mt-7 space-y-3.5 border-t border-cream/15 pt-6">
                {ending.lines.map((l) => (
                  <li key={l.text} className="flex gap-3 text-[0.98rem] leading-relaxed text-cream/85 text-pretty">
                    <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-gold-soft" />
                    <span>{l.text}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-[0.98rem] leading-relaxed text-cream/75 text-pretty">
                You did not leave much of a trail here, and that is completely fine. The decision was
                yours and you made it.
              </p>
            )}

            <Announce message={copied ? 'Copied — paste it somewhere you keep things.' : ''} />
            <button
              onClick={keep}
              className="mt-7 inline-flex items-center gap-2 rounded-full border border-cream/30 px-5 py-2.5 text-[0.88rem] font-medium text-cream transition hover:bg-cream/10"
            >
              {copied ? (
                <>
                  <CheckIcon size={13} /> Copied — paste it somewhere you keep things
                </>
              ) : (
                'Keep this'
              )}
            </button>
          </div>
        </section>

        {/* The goodbye. Said plainly, before any ask, because it is true. */}
        <section className="mt-8 rounded-card border border-line bg-white/60 p-6">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">You’re done here</p>
          <p className="mt-2.5 font-display text-[1.4rem] font-medium leading-snug tracking-tight text-ink text-balance">
            You can delete the app.
          </p>
          <p className="mt-3 text-[0.98rem] leading-relaxed text-ink-soft text-pretty">
            We mean it plainly. There is nothing left to finish, no streak to lose, nobody waiting, and
            nothing that will be charged. If the first year gets hard, the words for two families and
            the guide are here — and if they are not needed, better still. Barakallahu lakuma wa baraka
            alaykuma wa jama’a baynakuma fi khayr: may Allah bless you both, and join you in good.
          </p>
          <p className="mt-3 text-[0.9rem] leading-relaxed text-muted text-pretty">
            Deleting the app clears this phone, not our server. The last thing on this page, Forget me,
            does that too — after you have kept your record, if you want it.
          </p>
        </section>

        {/* The one thing only a married person can say. */}
        <section className="mt-5 rounded-card border border-gold/30 bg-gold/[0.07] p-6">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-gold-ink">
            Before you go, if you want to
          </p>
          <p className="mt-2.5 font-display text-[1.25rem] font-medium leading-snug tracking-tight text-ink text-balance">
            You can say this now in a way you never could before.
          </p>
          <p className="mt-2.5 text-[0.95rem] leading-relaxed text-muted text-pretty">
            While you were looking, forwarding anything about it meant admitting you were looking. That
            is over.{' '}
            {didEleven
              ? '“Before we said yes, we had these eleven conversations”'
              : '“There are eleven conversations most of us have too late”'}{' '}
            is a thing a married {gender === 'man' ? 'man' : 'woman'} can say to anyone — a cousin, a
            friend, the one at the wedding who is where you were.
          </p>
          <Announce message={shared ? 'Copied to send.' : ''} />
          <button
            onClick={() => tell('eleven')}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-[0.9rem] font-medium text-cream transition hover:bg-forest-deep"
          >
            {shared === 'eleven' ? (
              <>
                <CheckIcon size={13} /> Copied to send
              </>
            ) : (
              'Send the eleven to someone'
            )}
          </button>

          {/* The second share, and the one that turns the flywheel on the side
              the marketplace is short of. Every other loop here reaches a man
              already attached to the woman who sent it; a married couple can
              reach an unattached one through the spouse, and nobody has to
              admit they are looking — docs/FLYWHEEL.md. */}
          <p className="mt-5 border-t border-gold/20 pt-4 text-[0.95rem] leading-relaxed text-muted text-pretty">
            {fix(
              'And you two are the one pair in the room who can reach someone serious without anyone admitting they are looking. If {he} knows one who is — a brother, a cousin, the friend from the wedding — send {him} the door: the honest count for your city, and the map as the way in.',
            )}
          </p>
          <button
            onClick={() => tell('door')}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-forest/30 px-5 py-2.5 text-[0.9rem] font-medium text-forest transition hover:bg-forest/[0.06]"
          >
            {shared === 'door' ? (
              <>
                <CheckIcon size={13} /> Copied to send
              </>
            ) : (
              'Send the door to someone who is looking'
            )}
          </button>
        </section>

        {/* Everything below here is optional, and comes after the gift. */}
        <section className="mt-10">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted">
            If you have two more minutes
          </p>
          <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-soft text-pretty">
 Four questions, and then we stop. Nobody has ever told us what decides this, and
            without knowing we are guessing at what to build for the next person. Skip any of them.
            If you are telling us which steps you reach, the options you tap here reach us under the same
            random code as your steps. The line you write below never does — it is yours.
          </p>

          <div className="mt-6 flex flex-col gap-6">
            {questions.map((q) => (
              <div key={q.id}>
                <p id={`q-${q.id}`} className="font-display text-[1.15rem] font-medium text-ink text-pretty">
                  {q.prompt}
                </p>
                {q.helper && <p className="mt-1 text-[0.85rem] text-muted text-pretty">{q.helper}</p>}
                <div role="group" aria-labelledby={`q-${q.id}`} className="mt-3 flex flex-wrap gap-2">
                  {q.options.map((o) => {
                    const selected = q.multi
                      ? (answers.used ?? []).includes(o.id)
                      : answers[q.id === 'who' ? 'who' : 'mattered'] === o.id
                    return (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          q.multi ? toggleUsed(o.id) : put(q.id === 'who' ? { who: o.id } : { mattered: o.id })
                        }
                        className={`rounded-full border px-3.5 py-2 text-[0.88rem] font-medium transition-all ${
                          selected
                            ? 'border-forest bg-forest text-cream'
                            : 'border-line bg-white/60 text-ink-soft hover:border-forest/40 hover:bg-white'
                        }`}
                      >
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <div>
              <label htmlFor="ending-advice" className="font-display text-[1.15rem] font-medium text-ink">
                {ADVICE_PROMPT}
              </label>
              <p className="mt-1 text-[0.85rem] text-muted text-pretty">
                It stays on this phone, and goes only in a message you send yourself.
              </p>
              <textarea
                id="ending-advice"
                rows={3}
                value={answers.advice ?? ''}
                onChange={(e) => put({ advice: e.target.value })}
                placeholder={ADVICE_PLACEHOLDER}
                className={`mt-3 max-h-40 w-full resize-none bg-white/70 p-3.5 text-[1rem] leading-relaxed ${fieldClass}`}
              />
            </div>
          </div>
        </section>

        {/* The ending asks for nothing. It used to close on "Sponsor a place for
            someone else" — money for a place that costs nothing, with no stated
            use, on the one screen the outcome is measured on. Removed by the
            monetization audit (docs/MONETIZATION.md, sponsor-a-place). */}

        {/* What "you can delete the app" needs to be true: the server half.
            Last, after the record and the questions, because it clears them. */}
        <ForgetMe gender={identity.gender} onForget={onForget} className="mt-8" />

        <div className="mt-10 text-center">
          <TextButton onClick={onBack} className="text-[0.88rem] font-medium text-forest hover:underline">
            Close
          </TextButton>
        </div>
      </main>
    </div>
  )
}
